//! One checkpointed correction of rejected output; original evidence, budget and native review remain authoritative.
use super::*;
pub(super) async fn once(
    a: &App,
    h: &RequestContext,
    choice: Option<&Choice>,
    prepared: &Value,
    trace: &[Value],
    output: &veyndo::inference::Output,
    error: &Error,
) -> Result<veyndo::inference::Output> {
    if output.value.to_string().len() > 32768 {
        return Err(bad("Rejected proposal exceeds the repair context limit"));
    }
    let t = merchant(a, h)?;
    let mut ids = Vec::new();
    if let Some(id) = output.value["app_action"]["app"].as_str() {
        ids.push(id.to_owned());
    }
    for step in output.value["operations"].as_array().into_iter().flatten() {
        if let Some(name) = step["name"].as_str().and_then(|n| n.strip_prefix("app."))
            && let Some((id, _)) = name.split_once('.')
            && !ids.iter().any(|v| v == id)
        {
            ids.push(id.to_owned());
        }
    }
    let contracts = if ids.is_empty() {
        json!([])
    } else {
        apps::planning_contracts(a, &t, h, &ids).await?
    };
    let context = json!({"originalContext":prepared["prompt"],"nativeReadTranscript":trace,"rejectedCandidate":output.value,"validationError":error.1,"managedSaveContracts":contracts});
    if context.to_string().len() > 131072 {
        return Err(bad("Proposal repair context exceeds its limit"));
    }
    let system = format!(
        "{}\n{}\n{}",
        prepared["system"].as_str().unwrap_or(""),
        cognition::SOURCE_POLICY,
        include_str!("../../crates/cognition/prompts/merchant-repair.v1.txt")
    );
    agent_runs::checkpoint::model(
        a,
        h,
        choice,
        &system,
        &context.to_string(),
        &prepared["schema"],
        false,
    )
    .await
}
