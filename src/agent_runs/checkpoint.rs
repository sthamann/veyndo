//! Bounded journal of prepared context and completed inference calls; ambiguous calls require explicit continuation.
use super::*;
/// Join a native mutation's commit to its durable run. A cancellation that wins
/// while commerce waits on another row rolls the entire mutation back; a later
/// cancellation waits for this admitted commit rather than accepting a late write.
pub(crate) async fn fence_commit(
    a: &App,
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
) -> Result<()> {
    let Some(run) = CURRENT.try_with(Clone::clone).ok() else {
        return Ok(());
    };
    let row = sqlx::query("SELECT * FROM tasks WHERE tenant=$1 AND id=$2 AND run_state='running' AND run_lease=$3 AND run_until>statement_timestamp() FOR UPDATE")
        .bind(&run.tenant).bind(&run.id).bind(&run.lease).fetch_optional(&mut **tx).await?
        .ok_or(conflict("Agent run stopped before commerce commit"))?;
    if a.db.has_separate_authority() {
        // The signed runtime has a separate, restricted system pool. Never
        // reread this task through the tenant pool while its tx is held.
        authority::headers(a, &row).await?;
    } else {
        // Legacy development uses one pool. Reuse the connection under the
        // native owner's legacy scope; signed tickets are never changed here.
        let previous: String = sqlx::query_scalar("SELECT current_setting('rac.system',true)")
            .fetch_one(&mut **tx)
            .await?;
        sqlx::query("SELECT set_config('rac.system','on',true)")
            .execute(&mut **tx)
            .await?;
        let result = authority::headers_on(&mut *tx, &row).await;
        sqlx::query("SELECT set_config('rac.system',$1,true)")
            .bind(previous)
            .execute(&mut **tx)
            .await?;
        result?;
    }
    // Row-lock and authority waits may cross the lease deadline. A fresh
    // statement checks time after those waits while we still own the task lock.
    let current: bool = sqlx::query_scalar(
        "SELECT run_until>statement_timestamp() FROM tasks WHERE tenant=$1 AND id=$2",
    )
    .bind(&run.tenant)
    .bind(&run.id)
    .fetch_one(&mut **tx)
    .await?;
    if !current {
        return Err(conflict("Agent lease expired before commerce commit"));
    }
    Ok(())
}
pub(crate) async fn authorize(a: &App) -> Result<()> {
    let Some(run) = CURRENT.try_with(Clone::clone).ok() else {
        return Ok(());
    };
    let row=sqlx::query("SELECT * FROM tasks WHERE tenant=$1 AND id=$2 AND run_state='running' AND run_lease=$3 AND run_until>now()")
        .bind(&run.tenant).bind(&run.id).bind(&run.lease).fetch_optional(&a.db).await?.ok_or(conflict("Agent run cancelled or lease lost"))?;
    let h = authority::headers(a, &row).await?;
    let saved: Value = row.get("run_checkpoint");
    if let Some(context) = saved.get("context") {
        planner::validate_context(
            a,
            &run.tenant,
            &h,
            &row.get::<Value, _>("run_request"),
            context,
        )
        .await?;
    }
    Ok(())
}
pub(crate) async fn load(a: &App, key: &str) -> Result<Option<Value>> {
    let Some(run) = CURRENT.try_with(Clone::clone).ok() else {
        return Ok(None);
    };
    authorize(a).await?;
    Ok(sqlx::query_scalar("SELECT run_checkpoint->$4 FROM tasks WHERE tenant=$1 AND id=$2 AND run_lease=$3 AND run_state='running' AND run_until>now()")
        .bind(&run.tenant).bind(&run.id).bind(&run.lease).bind(key).fetch_optional(&a.db).await?.flatten())
}
pub(crate) async fn save(a: &App, key: &str, value: &Value) -> Result<()> {
    let Some(run) = CURRENT.try_with(Clone::clone).ok() else {
        return Ok(());
    };
    if value.to_string().len() > 524288 {
        return Err(bad("Agent checkpoint exceeds its bounded budget"));
    }
    authorize(a).await?;
    let changed=sqlx::query("UPDATE tasks SET run_checkpoint=jsonb_set(run_checkpoint,ARRAY[$4],$5,true),run_pending=NULL,run_revision=run_revision+1,run_updated=now(),run_until=now()+interval '240 seconds' WHERE tenant=$1 AND id=$2 AND run_lease=$3 AND run_state='running' AND run_until>now()")
        .bind(&run.tenant).bind(&run.id).bind(&run.lease).bind(key).bind(value).execute(&a.db).await?.rows_affected();
    if changed != 1 {
        return Err(conflict("Agent run cancelled or lease lost"));
    }
    Ok(())
}
#[tracing::instrument(skip_all,fields(trace_id=%veyndo::trace::current()))]
pub(crate) async fn model(
    a: &App,
    h: &RequestContext,
    choice: Option<&Choice>,
    system: &str,
    prompt: &str,
    schema: &Value,
    public: bool,
) -> Result<veyndo::inference::Output> {
    let key = format!(
        "model-{}",
        hash(&json!([system, prompt, schema, choice]).to_string())
    );
    if let Some(value) = load(a, &key).await? {
        return serde_json::from_value(value).map_err(|_| bad("Invalid saved model checkpoint"));
    }
    if let Ok(run) = CURRENT.try_with(Clone::clone) {
        authorize(a).await?;
        let changed=sqlx::query("UPDATE tasks SET run_pending=$4,run_updated=now(),run_until=now()+interval '240 seconds' WHERE tenant=$1 AND id=$2 AND run_lease=$3 AND run_state='running' AND run_until>now()")
            .bind(&run.tenant).bind(&run.id).bind(&run.lease).bind(&key).execute(&a.db).await?.rows_affected();
        if changed != 1 {
            return Err(conflict("Agent lease lost before inference"));
        }
    }
    agent::assistant_access(h).or_else(|e| if public { Ok(()) } else { Err(e) })?;
    let authority = super::controls::model_authority(a, h).await;
    let output = veyndo::inference::budget::scoped(
        authority,
        Box::pin(a.inference.structured_for(
            if public { "concierge" } else { "planner" },
            choice,
            system,
            prompt,
            schema,
        )),
    )
    .await
    .map_err(Error::from)?;
    save(a, &key, &json!(output)).await?;
    Ok(output)
}
