//! Every queued flow step rehydrates current membership; stored definitions never preserve revoked privileges.
use super::*;
pub(crate) async fn headers(a: &App, t: &str, actor: Option<&str>) -> Result<RequestContext> {
    headers_on(&a.db, t, actor).await
}
/// App admission already holds configuration locks; reuse that connection for current grants.
pub(super) async fn headers_on<'e>(
    db: impl sqlx::Executor<'e, Database = sqlx::Postgres>,
    t: &str,
    actor: Option<&str>,
) -> Result<RequestContext> {
    let mut h = RequestContext::new();
    h.insert(
        "x-tenant",
        t.parse().map_err(|_| bad("Invalid flow tenant"))?,
    );
    h.insert("x-rac-tenant", t.parse().unwrap());
    let actor = actor.ok_or(bad("Flow actor required"))?;
    h.insert(
        "x-rac-user",
        actor.parse().map_err(|_| bad("Invalid flow actor"))?,
    );
    if actor == "bootstrap" {
        h.insert("x-rac-role", "owner".parse().unwrap());
    } else {
        let r=sqlx::query("SELECT role,permissions FROM membership_grants WHERE tenant=COALESCE((SELECT live_tenant FROM shop_environments WHERE tenant=$1),$1) AND user_id=$2 AND active").bind(t).bind(actor).fetch_optional(db).await?.ok_or(Error(StatusCode::FORBIDDEN,"Flow owner lost access".into()))?;
        h.insert(
            "x-rac-role",
            r.get::<String, _>("role")
                .parse()
                .map_err(|_| bad("Invalid flow role"))?,
        );
        let permissions: Value = r.get("permissions");
        if !permissions.is_null() {
            h.insert(
                "x-rac-permissions",
                permissions
                    .to_string()
                    .parse()
                    .map_err(|_| bad("Invalid flow permissions"))?,
            );
        }
    }
    auth::permit(&h, "automation.manage")?;
    Ok(h)
}

/// A scheduled proposal uses current Flow rights, never a synthetic personal session.
pub(crate) async fn proposal_headers(
    a: &App,
    t: &str,
    actor: Option<&str>,
    job: &str,
) -> Result<RequestContext> {
    let mut h = headers(a, t, actor).await?;
    h.insert(
        "x-rac-flow-job",
        job.parse().map_err(|_| bad("Invalid Flow job"))?,
    );
    agent::assistant_access(&h)?;
    auth::permit(&h, "catalog.write")?;
    auth::permit(&h, "knowledge.read")?;
    let row=sqlx::query("SELECT t.status,t.agents_stopped,e.preview_owner,e.preview_until>now() AS valid FROM tenants t LEFT JOIN shop_environments e ON e.tenant=$1 WHERE t.id=coalesce(e.live_tenant,$1)")
        .bind(t).fetch_one(&a.db).await?;
    if row.get::<bool, _>("agents_stopped")
        || row.get::<String, _>("status") != "active"
        || row
            .get::<Option<String>, _>("preview_owner")
            .is_some_and(|owner| {
                Some(owner.as_str()) != actor || row.get::<Option<bool>, _>("valid") != Some(true)
            })
    {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Flow agent or workspace is unavailable".into(),
        ));
    }
    Ok(h)
}
