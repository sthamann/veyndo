//! Translation child work reuses native draft storage, original authority and the existing task scheduler.
use super::*;

fn request(v: &Value) -> Result<(String, Choice, bool, Option<Vec<String>>)> {
    Ok((
        v["targetLocale"]
            .as_str()
            .ok_or(bad("Target language required"))?
            .into(),
        serde_json::from_value(
            v.get("inference")
                .cloned()
                .unwrap_or(json!({"provider":"platform","model":null})),
        )
        .map_err(|_| bad("Invalid translation provider"))?,
        v["overwrite"].as_bool().unwrap_or(false),
        translations::selection::parse(v.get("productIds"))?,
    ))
}

pub(crate) async fn validate(a: &App, t: &str, v: &Value, created: &[String]) -> Result<()> {
    let (target, choice, _, products) = request(v)?;
    translations::admit_provider(a, &choice).await?;
    // Collection work must never silently expand to a whole catalogue.
    if products.is_none() {
        return Err(bad(
            "Collection work requires an explicit product selection",
        ));
    }
    let (s, _) = commerce::config(a, t).await?;
    if target == s.main_locale || !s.locales.contains(&target) {
        return Err(bad("Select an enabled translation target"));
    }
    let existing = products
        .unwrap()
        .into_iter()
        .filter(|id| !created.contains(id))
        .collect::<Vec<_>>();
    if existing.is_empty() {
        return Ok(());
    }
    let mut tx = a.db.begin().await?;
    translations::selection::admit(&mut tx, t, Some(&existing)).await
}

pub(crate) async fn headers(a: &App, t: &str, task: &str) -> Result<RequestContext> {
    Ok(context(a, t, task).await?.0)
}
pub(crate) async fn context(a: &App, t: &str, task: &str) -> Result<(RequestContext, String)> {
    let row = sqlx::query("SELECT * FROM tasks WHERE tenant=$1 AND id=$2 AND run_state IN ('queued','running') AND run_request ? 'execution'")
        .bind(t).bind(task).fetch_optional(&a.db).await?.ok_or(conflict("Parent work is stopped"))?;
    let h = authority::headers(a, &row).await?;
    auth::permit(&h, "catalog.write")?;
    Ok((h, row.get("run_trace")))
}

pub(crate) async fn advance(
    a: &App,
    t: &str,
    task: &str,
    h: &RequestContext,
    run: &Run,
    index: usize,
    step: &work_plan::Step,
) -> Result<bool> {
    let key = format!("operation-{index}");
    let job_id = format!("work-{task}-{index}");
    let v: Value =
        serde_json::from_str(&step.arguments_json).map_err(|_| bad("Invalid translation work"))?;
    let (target, choice, overwrite, products) = request(&v)?;
    let (settings, _) = commerce::config(a, t).await?;
    let mut tx = a.db.begin().await?;
    let locked = sqlx::query("SELECT id FROM tasks WHERE tenant=$1 AND id=$2 AND run_state='running' AND run_lease=$3 AND run_until>now() FOR UPDATE")
        .bind(t).bind(task).bind(&run.lease).fetch_optional(&mut *tx).await?;
    if locked.is_none() {
        return Err(conflict("Translation work lost its task lease"));
    }
    let job = sqlx::query("SELECT status,error,error_code FROM translation_jobs WHERE tenant=$1 AND id=$2 AND run_task=$3 FOR UPDATE")
        .bind(t).bind(&job_id).bind(task).fetch_optional(&mut *tx).await?;
    let status = if let Some(job) = job {
        let state: String = job.get("status");
        if state == "failed"
            && job.get::<Option<String>, _>("error_code").as_deref() == Some("call_interrupted")
        {
            sqlx::query("UPDATE tasks SET run_pending=$3 WHERE tenant=$1 AND id=$2")
                .bind(t)
                .bind(task)
                .bind(format!("translation-{index}"))
                .execute(&mut *tx)
                .await?;
            tx.commit().await?;
            return Err(conflict(
                "Translation call may already have been processed or charged; review before explicitly continuing",
            ));
        }
        if ["failed", "cancelled"].contains(&state.as_str()) {
            return Err(conflict(
                "Translation drafts stopped; inspect the linked job and explicitly resume this task",
            ));
        }
        state
    } else {
        auth::permit(h, "catalog.write")?;
        translations::enqueue(
            a,
            &mut tx,
            t,
            &job_id,
            &settings,
            (&target, &choice, overwrite, products.as_deref()),
        )
        .await?;
        sqlx::query("UPDATE translation_jobs SET run_task=$3 WHERE tenant=$1 AND id=$2")
            .bind(t)
            .bind(&job_id)
            .bind(task)
            .execute(&mut *tx)
            .await?;
        "queued".into()
    };
    sqlx::query("UPDATE tasks SET run_checkpoint=jsonb_set(run_checkpoint,ARRAY[$3],$4,true) WHERE tenant=$1 AND id=$2")
        .bind(t).bind(task).bind(format!("translation-{index}")).bind(json!(job_id)).execute(&mut *tx).await?;
    if status == "ready" {
        let receipt = json!({"index":index,"name":step.name,"label":step.label,"completed":true,"translationJobId":job_id});
        sqlx::query("UPDATE tasks SET run_checkpoint=jsonb_set(run_checkpoint,ARRAY[$3],$4,true),run_revision=run_revision+1,run_updated=now(),run_until=now()+interval '240 seconds' WHERE tenant=$1 AND id=$2 AND run_state='running' AND run_until>now() AND run_lease=$5")
            .bind(t).bind(task).bind(&key).bind(receipt).bind(&run.lease).execute(&mut *tx).await?;
    } else {
        // Yield the existing worker instead of holding a connection or busy-waiting.
        sqlx::query("UPDATE tasks SET run_state='queued',run_after=now()+interval '5 seconds',run_lease=NULL,run_until=NULL,run_revision=run_revision+1,run_updated=now() WHERE tenant=$1 AND id=$2 AND run_state='running' AND run_until>now() AND run_lease=$3")
            .bind(t).bind(task).bind(&run.lease).execute(&mut *tx).await?;
    }
    tx.commit().await?;
    Ok(status == "ready")
}
