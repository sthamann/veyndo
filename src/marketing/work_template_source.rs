//! Templates reference actor-private task evidence; configuration/history/release never copy its inputs.
use super::*;

pub(super) async fn load(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    t: &str,
    h: &RequestContext,
    template: &work_template::WorkTemplate,
) -> Result<Vec<agent_runs::work_plan::Step>> {
    template.validate()?;
    let actor = header(h, "x-rac-user").ok_or(bad("Work template actor required"))?;
    if !h.principal.personal_session
        && header(h, "x-rac-flow-job").is_none()
        && actor != "bootstrap"
    {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Personal task access required".into(),
        ));
    }
    let row = sqlx::query("SELECT task.proposal,task.run_scopes FROM tasks task JOIN shop_environments e ON e.tenant=task.tenant WHERE task.tenant=$1 AND task.id=$2 AND task.run_actor=$3 AND task.applied AND task.run_state='ready' AND task.run_request ? 'execution' AND (e.preview_owner IS NULL OR (e.preview_owner=$3 AND e.preview_until>now()))")
        .bind(t).bind(&template.task_id).bind(actor).fetch_optional(&mut **tx).await?
        .ok_or(Error(StatusCode::FORBIDDEN, "Choose your completed work in this private workspace; source tasks cannot be published or copied across workspaces".into()))?;
    let scopes: Value = row.get("run_scopes");
    if scopes.as_array().is_none_or(|values| {
        values
            .iter()
            .any(|v| v.as_str().is_none_or(|scope| !auth::allowed(h, scope)))
    }) {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Source task requires its original permissions".into(),
        ));
    }
    let evidence: Value = row.get("proposal");
    let mut steps: Vec<agent_runs::work_plan::Step> =
        serde_json::from_value(evidence["proposal"]["operations"].clone())
            .map_err(|_| bad("Source task has no native work"))?;
    if steps.is_empty() || steps.len() > 12 {
        return Err(bad("Source task needs 1..12 reviewed steps"));
    }
    // Completed evidence is immutable. Bindings are execution grants and are
    // deliberately rebuilt by the native owner before the new review.
    for step in &mut steps {
        step.binding = None;
    }
    // Validate targets without resolving absent future event values.
    for binding in &template.bindings {
        let args: Value = serde_json::from_str(
            &steps
                .get(binding.step)
                .ok_or(bad("Unknown template step"))?
                .arguments_json,
        )
        .map_err(|_| bad("Invalid source work arguments"))?;
        if args.pointer(&binding.pointer).is_none_or(|v| {
            if binding.source == "event.revision" {
                !v.is_number()
            } else {
                !v.is_string()
            }
        }) {
            return Err(bad(
                "Map an existing text or number field in the source task",
            ));
        }
    }
    Ok(steps)
}
