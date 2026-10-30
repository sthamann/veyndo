//! A customer test can reference only its actor's completed, applied native proposal in this sandbox.
use super::*;

pub(super) async fn resolve(a: &App, h: &RequestContext, id: &str) -> Result<Value> {
    let run = Box::pin(contract::invoke(
        a,
        h,
        "merchant.run.status",
        &json!({"id":id}),
    ))
    .await?;
    if run["state"] != "ready" || run["approvalRequired"] != false || !run["scenario"].is_null() {
        return Err(conflict(
            "Apply the completed agent proposal in this sandbox before testing it",
        ));
    }
    if run["channel"].as_str().unwrap_or("default") != marketing::channel_id(h) {
        return Err(conflict(
            "Open the source proposal's sales channel before testing it",
        ));
    }
    Ok(
        json!({"taskId":id,"revision":run["revision"],"proposalDigest":hash(&run["preview"].to_string())}),
    )
}

pub(super) async fn recheck(a: &App, h: &RequestContext, source: &Value) -> Result<()> {
    if let Some(id) = source["taskId"].as_str()
        && resolve(a, h, id).await? != *source
    {
        return Err(conflict(
            "The source proposal changed; start a new customer test",
        ));
    }
    Ok(())
}
