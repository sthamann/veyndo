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
    // Inference may outlive a membership/permission change. Never publish evidence
    // with the old grant or widen it to permissions gained during that call.
    let current = marketing::flow_proposal_headers(a, t, Some(actor)).await?;
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
    let request = json!({"instruction":evidence["instruction"],"locale":evidence["locale"],"channel":marketing::channel_id(original),"source":"flow"});
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
    // No credential, queued state or execution is manufactured. The existing
    // approval owner binds a real current personal session before any worker write.
    sqlx::query("INSERT INTO tasks(id,tenant,proposal,run_state,run_actor,run_scopes,run_request) VALUES($1,$2,$3,'ready',$4,$5,$6)")
        .bind(id).bind(t).bind(evidence).bind(actor).bind(json!(scopes)).bind(request).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(())
}
