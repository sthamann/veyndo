//! One leased product per step: keyset traversal, bounded inference and resumable provider errors.
use super::*;
pub(crate) async fn once(a: &App) -> Result<bool> {
    // A linked task must explicitly authorize another possibly charged call after a dead worker.
    sqlx::query("UPDATE translation_jobs SET status='failed',error_code='call_interrupted',error='Translation call interrupted; explicitly resume the parent task',lease=NULL,lease_until=NULL WHERE (tenant,id) IN (SELECT tenant,id FROM translation_jobs WHERE run_task IS NOT NULL AND status='processing' AND lease_until<now() ORDER BY created_at LIMIT 20 FOR UPDATE SKIP LOCKED)").execute(&a.db).await?;
    let lease = Uuid::new_v4().to_string();
    let row=sqlx::query("UPDATE translation_jobs SET status='processing',lease=$1,lease_until=now()+interval '15 minutes' WHERE (tenant,id)=(SELECT tenant,id FROM translation_jobs WHERE (status='queued' OR (status='processing' AND run_task IS NULL AND lease_until<now())) AND EXISTS(SELECT 1 FROM tenants t WHERE t.id=coalesce((SELECT live_tenant FROM shop_environments WHERE tenant=translation_jobs.tenant),translation_jobs.tenant) AND t.status='active') ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *").bind(&lease).fetch_optional(&a.db).await?;
    let Some(job) = row else {
        return Ok(false);
    };
    let t: String = job.get("tenant");
    let id: String = job.get("id");
    let result = authorized_step(a, &job, &lease).await;
    if let Err(e) = result {
        sqlx::query("UPDATE translation_jobs SET status='failed',error=$1,lease=NULL,lease_until=NULL WHERE tenant=$2 AND id=$3 AND lease=$4").bind(e.1).bind(t).bind(id).bind(lease).execute(&a.db).await?;
    }
    // Notify only after the child transaction is closed: parent admission locks task before job.
    if let Some(task) = job.get::<Option<String>, _>("run_task") {
        sqlx::query("UPDATE tasks SET run_after=now() WHERE tenant=$1 AND id=$2 AND run_state='queued' AND EXISTS(SELECT 1 FROM translation_jobs j WHERE j.tenant=$1 AND j.run_task=$2 AND j.status IN ('ready','failed','cancelled'))")
            .bind(job.get::<String,_>("tenant")).bind(task).execute(&a.db).await?;
    }
    Ok(true)
}
async fn authorized_step(a: &App, job: &sqlx::postgres::PgRow, lease: &str) -> Result<()> {
    if let Some(task) = job.get::<Option<String>, _>("run_task") {
        let t: String = job.get("tenant");
        let (h, trace) = agent_runs::translation::context(a, &t, &task).await?;
        let scope = if h.principal.personal_session {
            veyndo::tenant_scope::Scope::Personal {
                tenant: t,
                actor: h.principal.user.clone().unwrap_or_default(),
            }
        } else {
            veyndo::tenant_scope::Scope::Actor {
                tenant: t,
                actor: h.principal.user.clone().unwrap_or_default(),
            }
        };
        let authority = agent_runs::controls::model_authority(a, &h).await;
        return veyndo::trace::scoped(
            trace,
            veyndo::tenant_scope::scoped(
                scope,
                veyndo::inference::budget::scoped(authority, step(a, job, lease)),
            ),
        )
        .await;
    }
    step(a, job, lease).await
}
async fn step(a: &App, job: &sqlx::postgres::PgRow, lease: &str) -> Result<()> {
    let t: String = job.get("tenant");
    let id: String = job.get("id");
    let source: String = job.get("source_locale");
    let target: String = job.get("target_locale");
    let row=sqlx::query("SELECT p.*,s.name AS translated_name,s.description AS translated_description,tt.name AS target_name FROM products p LEFT JOIN product_translations s ON s.tenant=p.tenant AND s.product_id=p.id AND s.language_id=(SELECT id FROM languages WHERE locale=$4) LEFT JOIN product_translations tt ON tt.tenant=p.tenant AND tt.product_id=p.id AND tt.language_id=(SELECT id FROM languages WHERE locale=$5) WHERE p.tenant=$1 AND p.id>$2 AND p.id<=$3 AND ($6::text[] IS NULL OR p.id=ANY($6)) ORDER BY p.id LIMIT 1").bind(&t).bind(job.get::<String,_>("cursor")).bind(job.get::<String,_>("highwater")).bind(&source).bind(&target).bind(job.get::<Option<Vec<String>>, _>("product_ids")).fetch_optional(&a.db).await?;
    let Some(row) = row else {
        if job.get::<Option<Vec<String>>, _>("product_ids").is_some()
            && job.get::<i64, _>("processed") != job.get::<i64, _>("total")
        {
            return Err(conflict(
                "Selected products changed during translation; review the collection",
            ));
        }
        sqlx::query("UPDATE translation_jobs SET status='ready',lease=NULL,lease_until=NULL WHERE tenant=$1 AND id=$2 AND lease=$3").bind(t).bind(id).bind(lease).execute(&a.db).await?;
        return Ok(());
    };
    let (settings, _) = commerce::config(a, &t).await?;
    if !settings.locales.contains(&target) || settings.main_locale != source {
        return Err(conflict("Shop languages changed during translation"));
    }
    let source_key = fields::key(&source, &settings.locales);
    let target_key = fields::key(&target, &settings.locales);
    let src = fields::source(&row, &source_key, &source_key);
    let extra: Value = row.get("extra");
    // Never skip a partial target: missing description/SEO/specs/rich text must still be translated.
    let complete=row.get::<Option<String>,_>("target_name").is_some()
        && sqlx::query_scalar::<_,bool>("SELECT EXISTS(SELECT 1 FROM product_translations WHERE tenant=$1 AND product_id=$2 AND language_id=(SELECT id FROM languages WHERE locale=$3) AND description IS NOT NULL)").bind(&t).bind(row.get::<String,_>("id")).bind(&target).fetch_one(&a.db).await?
        && ["seo","specifications","richDescription"].iter().all(|k|src[*k].is_null() || extra[*k].get(&target_key).is_some());
    let skip = complete && !job.get::<bool, _>("overwrite");
    let (result, evidence) = if skip {
        (Value::Null, None)
    } else {
        let texts = fields::texts(&src)
            .iter()
            .map(|(path, text)| json!({"path":path,"text":text}))
            .collect::<Vec<_>>();
        if texts.len() > 500 || src.to_string().len() > 64000 {
            return Err(bad("Product exceeds translation chunk limits"));
        }
        let choice: Choice = serde_json::from_value(job.get("choice"))
            .map_err(|_| bad("Invalid translation provider"))?;
        let schema = json!({"type":"object","properties":{"translations":{"type":"array","items":{"type":"object","properties":{"path":{"type":"string"},"text":{"type":"string"}},"required":["path","text"],"additionalProperties":false}}},"required":["translations"],"additionalProperties":false});
        let _slot = a
            .inference_slots
            .acquire()
            .await
            .map_err(|_| bad("Inference unavailable"))?;
        let _cluster = crate::performance::cluster_lease::Lease::acquire(a, &t, "model", 2).await?;
        let output = a
            .inference
            .structured(
                Some(&choice),
                include_str!("../../crates/cognition/prompts/catalogue-translation.v1.txt"),
                &json!({"sourceLocale":source,"targetLocale":target,"texts":texts}).to_string(),
                &schema,
            )
            .await
            .map_err(bad)?;
        let evidence = json!({"provider":output.provider,"model":output.model,"prompt":output.usage["prompt"],"inputTokens":output.usage["input_tokens"].as_u64(),"outputTokens":output.usage["output_tokens"].as_u64()});
        (fields::translated(&src, &output.value)?, Some(evidence))
    };
    if let Some(task) = job.get::<Option<String>, _>("run_task") {
        agent_runs::translation::headers(a, &t, &task).await?;
    }
    let mut tx = a.db.begin().await?;
    let current:Option<String>=sqlx::query_scalar("SELECT lease FROM translation_jobs WHERE tenant=$1 AND id=$2 AND status='processing' FOR UPDATE").bind(&t).bind(&id).fetch_optional(&mut *tx).await?.flatten();
    if current.as_deref() != Some(lease) {
        return Ok(());
    }
    sqlx::query("INSERT INTO translation_items(tenant,job_id,product_id,revision,source,result,status,evidence) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING").bind(&t).bind(&id).bind(row.get::<String,_>("id")).bind(row.get::<i64,_>("revision")).bind(src).bind(result).bind(if skip {"skipped"}else{"ready"}).bind(evidence).execute(&mut *tx).await?;
    sqlx::query("UPDATE translation_jobs SET cursor=$1,processed=processed+1,status='queued',lease=NULL,lease_until=NULL WHERE tenant=$2 AND id=$3 AND lease=$4").bind(row.get::<String,_>("id")).bind(&t).bind(&id).bind(lease).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(())
}
