//! App flow dispatch uses the same permission/schema gateway as HTTP/MCP, with a stable job key.
use super::*;
pub(super) fn validate_manifest_flow(
    h: &RequestContext,
    f: &flows::Flow,
    m: &apps::Manifest,
) -> Result<()> {
    auth::permit(h, "apps.manage")?;
    let target = f
        .app_action
        .as_ref()
        .ok_or(bad("Flow app action required"))?;
    let act = m
        .actions
        .iter()
        .find(|x| x.name == target.action)
        .ok_or(bad("Unknown flow app action"))?;
    eligible(act)?;
    auth::permit(h, act.permission.as_deref().unwrap_or("catalog"))?;
    apps::additional_permissions(h, act)?;
    if let Some(entity) = m
        .entities
        .iter()
        .find(|e| Some(&e.name) == act.entity.as_ref())
    {
        apps::core_extensions::access(entity, h, act.handler == "save")?;
    }
    validate_contract(f, m)
}
fn validate_contract(f: &flows::Flow, m: &apps::Manifest) -> Result<()> {
    let target = f
        .app_action
        .as_ref()
        .ok_or(bad("Flow app action required"))?;
    let act = m
        .actions
        .iter()
        .find(|a| a.name == target.action)
        .ok_or(conflict(
            "Upgrade would remove an action used by an active flow",
        ))?;
    eligible(act)?;
    let args = arguments(
        act,
        &target.arguments,
        "schema-check",
        "schema-check",
        &if ["order.", "delivery.", "document.", "payment.", "pos."]
            .iter()
            .any(|prefix| f.event.starts_with(prefix))
        {
            json!({"orderId":"00000000000000000000000000000000"})
        } else {
            json!({})
        },
        &f.event,
    );
    apps::validate_input(&act.input_schema, &args)?;
    if act.handler == "save" {
        let entity = m
            .entities
            .iter()
            .find(|e| Some(&e.name) == act.entity.as_ref())
            .ok_or(bad("Flow app model missing"))?;
        apps::data::fields(entity, &args["fields"])?;
    }
    Ok(())
}
/// Configuration save and app replacement inspect the same pipeline app steps.
pub(super) fn steps(f: &flows::Flow) -> Vec<flows::Flow> {
    let mut steps = vec![];
    if f.action == "app_action" {
        steps.push(f.clone());
    }
    if let Some(p) = &f.pipeline {
        for node in &p.nodes {
            if let pipeline::Node::Action { action, config, .. } = node
                && (action == "app_action" || action == "action.mail.send")
            {
                let mut step = f.clone();
                step.action = "app_action".into();
                step.app_action = Some(flows::AppFlowAction {
                    app: config["app"].as_str().unwrap_or("email").into(),
                    action: config["action"].as_str().unwrap_or("send_order").into(),
                    arguments: if action == "action.mail.send" {
                        json!({"locale":&f.locale[..2],"dryRun":false})
                    } else {
                        config["arguments"].clone()
                    },
                });
                steps.push(step);
            }
        }
    }
    steps
}
/// Called under the existing automation lock, on every installation transport and release.
pub(crate) async fn validate_replacement(
    conn: &mut sqlx::PgConnection,
    t: &str,
    m: &apps::Manifest,
) -> Result<()> {
    let rows =
        sqlx::query("SELECT data FROM commerce_flows WHERE tenant=$1 AND data->>'active'='true'")
            .bind(t)
            .fetch_all(&mut *conn)
            .await?;
    for row in rows {
        let f: flows::Flow =
            serde_json::from_value(row.get("data")).map_err(|_| bad("Invalid stored flow"))?;
        for step in steps(&f) {
            if step.app_action.as_ref().is_some_and(|a| a.app == m.id) {
                let h = super::flow_access::headers_on(&mut *conn, t, f.actor.as_deref()).await
                    .map_err(|_| conflict("Upgrade would invalidate an active flow; update its action and arguments first"))?;
                validate_manifest_flow(&h, &step, m).map_err(|_| conflict("Upgrade would invalidate an active flow; update its action and arguments first"))?;
            }
        }
    }
    Ok(())
}
fn arguments(
    action: &apps::Action,
    base: &Value,
    key: &str,
    instruction: &str,
    event: &Value,
    kind: &str,
) -> Value {
    let mut args = base.clone();
    let props = &action.input_schema["properties"];
    // Native order-bound events supply their canonical ID; explicit non-empty
    // merchant arguments remain unchanged. No string interpolation or AI identity.
    if props.get("orderId").is_some()
        && args["orderId"].as_str().is_none_or(str::is_empty)
        && let Some(id) = event["orderId"].as_str().filter(|id| !id.is_empty())
    {
        args["orderId"] = json!(id);
    }
    if props.get("kind").is_some() {
        args["kind"] = json!(kind);
    }
    if props.get("requestKey").is_some() {
        args["requestKey"] = json!(key);
    }
    if props.get("event").is_some() {
        args["event"] = event.clone();
    }
    if props.get("template").is_some() && args.get("template").is_none() {
        args["template"] = json!(instruction);
    }
    args
}
pub(crate) async fn execute_app_flow(
    a: &App,
    t: &str,
    f: &flows::Flow,
    id: &str,
    instruction: &str,
    definition: &Value,
) -> Result<Value> {
    let target = f
        .app_action
        .as_ref()
        .ok_or(bad("Flow app action required"))?;
    let mut h = super::flow_access::headers(a, t, f.actor.as_deref()).await?;
    h.insert(
        "idempotency-key",
        format!("flow-{id}")
            .parse()
            .map_err(|_| bad("Invalid flow job identity"))?,
    );
    auth::permit(&h, "automation.manage")?;
    auth::permit(&h, "apps.manage")?;
    let m = apps::package(a, t, &target.app, true).await?;
    let act = m
        .actions
        .iter()
        .find(|x| x.name == target.action)
        .ok_or(bad("Unknown flow app action"))?;
    eligible(act)?;
    let event = if definition["orderId"]
        .as_str()
        .is_some_and(|s| !s.is_empty())
    {
        json!({"order":definition["orderSnapshot"],"orderId":definition["orderId"]})
    } else {
        definition["eventContext"].clone()
    };
    let args = arguments(act, &target.arguments, id, instruction, &event, &f.event);
    apps::invoke_app(a, &h, &target.app, &target.action, &args).await
}

fn eligible(action: &apps::Action) -> Result<()> {
    if !veyndo::verified_kernel::app_flow_admissible(
        action.flow_allowed,
        action.read_only,
        action.public,
    ) {
        return Err(bad("Action is not eligible for flows"));
    }
    Ok(())
}
