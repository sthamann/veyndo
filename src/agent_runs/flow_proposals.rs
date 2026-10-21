//! Scheduled Flow results become native reviewable tasks; only personal approval supplies execution authority.
use super::*;

pub(super) async fn persist(
    a: &App,
    t: &str,
    id: &str,
    evidence: &Value,
    original: &RequestContext,
) -> Result<()> {
    let actor = header(original, "x-rac-user").ok_or(bad("Flow actor required"))?;
    let job = header(original, "x-rac-flow-job").ok_or(bad("Flow job required"))?;
    // Inference may outlive a membership/permission change. Never publish evidence
    // with the old grant or widen it to permissions gained during that call.
    let current = marketing::flow_proposal_headers(a, t, Some(actor), job).await?;
    let scopes = auth::SCOPES
        .iter()
        .filter(|s| auth::allowed(original, s))
        .copied()
        .collect::<Vec<_>>();
    if scopes.iter().any(|scope| !auth::allowed(&current, scope)) {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Flow owner permissions changed during planning".into(),
        ));
    }
    let request = json!({"instruction":evidence["instruction"],"locale":evidence["locale"],"channel":marketing::channel_id(original),"source":"flow","sourceJobId":job});
    let mut tx = a.db.begin_privileged().await?;
    // The same live-shop lock as enqueue/approval fences completion against stop.
    let stopped:bool=sqlx::query_scalar("SELECT agents_stopped FROM tenants WHERE id=coalesce((SELECT live_tenant FROM shop_environments WHERE tenant=$1),$1) FOR NO KEY UPDATE")
        .bind(t).fetch_one(&mut *tx).await?;
    if stopped {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Shop agents are stopped by an administrator".into(),
        ));
    }
    // Serialize with recovery. A late provider response cannot publish a ready
    // task once the original worker lost its lease, even before recovery runs.
    let held:Option<bool>=sqlx::query_scalar("WITH held AS MATERIALIZED (SELECT state,lease_until FROM flow_jobs WHERE tenant=$1 AND id=$2 FOR UPDATE) SELECT state='running' AND lease_until>clock_timestamp() FROM held")
        .bind(t).bind(job).fetch_optional(&mut *tx).await?;
    if held != Some(true) {
        return Err(conflict("Flow worker lost its lease"));
    }
    if let Some(limit) = evidence["flowTemplateLimit"].as_u64() {
        // Preparation uses no model call. Bound its saved review queue under the
        // same live-shop lock; concurrent workers cannot each spend the last slot.
        if !(1..=100).contains(&limit) {
            return Err(bad("Invalid template limit"));
        }
        let count:i64=sqlx::query_scalar("SELECT count(*) FROM tasks task JOIN flow_jobs source ON source.tenant=task.tenant AND source.id=task.run_request->>'sourceJobId' WHERE task.tenant=$1 AND source.flow=(SELECT flow FROM flow_jobs WHERE tenant=$1 AND id=$2) AND task.created_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'")
            .bind(t).bind(job).fetch_one(&mut *tx).await?;
        if count >= limit as i64 {
            return Err(Error(
                StatusCode::TOO_MANY_REQUESTS,
                "Flow review limit reached for today (UTC)".into(),
            ));
        }
        let pending:i64=sqlx::query_scalar("SELECT count(*) FROM tasks WHERE tenant=$1 AND proposal ? 'templateSource' AND created_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'")
            .bind(t).fetch_one(&mut *tx).await?;
        if pending >= 100 {
            return Err(Error(
                StatusCode::TOO_MANY_REQUESTS,
                "Workspace review limit reached for today (UTC)".into(),
            ));
        }
    }
    // No credential, queued state or execution is manufactured. The existing
    // approval owner binds a real current personal session before any worker write.
    sqlx::query("INSERT INTO tasks(id,tenant,proposal,run_state,run_actor,run_scopes,run_request) VALUES($1,$2,$3,'ready',$4,$5,$6)")
        .bind(id).bind(t).bind(evidence).bind(actor).bind(json!(scopes)).bind(request).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(())
}
