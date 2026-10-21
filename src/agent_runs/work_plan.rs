//! Reviewed work binds bounded native configuration commands and managed app saves before any worker effect.
use super::*;
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct Step {
    pub name: String,
    pub label: String,
    pub arguments_json: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub binding: Option<apps::AppChange>,
}
const NATIVE: &[&str] = &[
    "merchant.product.create",
    "merchant.product.save",
    "merchant.category.create",
    "merchant.category.save",
    "automation.save",
    "merchant.translations.create",
];
pub(crate) fn schema() -> Value {
    json!({"type":"array","maxItems":12,"items":{"type":"object","required":["name","label","arguments_json"],"additionalProperties":false,"properties":{"name":{"type":"string","maxLength":160},"label":{"type":"string","minLength":1,"maxLength":200},"arguments_json":{"type":"string","maxLength":8192}}}})
}
pub(crate) fn catalogue(a: &App, h: &RequestContext) -> Vec<Value> {
    capabilities::OPERATIONS
        .iter()
        .filter(|o| NATIVE.contains(&o.name) && o.admitted(a, h))
        .map(|o| json!({"name":o.name,"inputSchema":o.input_schema()}))
        .collect()
}
pub(crate) async fn bind(a: &App, t: &str, h: &RequestContext, steps: &mut [Step]) -> Result<()> {
    if steps.is_empty() {
        return Ok(());
    }
    if steps.len() > 12 || json!(steps).to_string().len() > 16384 {
        return Err(bad("Work plan exceeds 12 steps or 16 KiB"));
    }
    if staging::parent(a, t).await?.is_none() {
        return Err(bad("Agent configuration work requires a private workspace"));
    }
    let mut created_products: Vec<String> = Vec::new();
    for step in steps.iter_mut() {
        step.binding = None;
        if step.label.is_empty() || step.label.len() > 200 || step.arguments_json.len() > 8192 {
            return Err(bad("Invalid work step"));
        }
        let args: Value = serde_json::from_str(&step.arguments_json)
            .map_err(|_| bad("Work arguments must be JSON"))?;
        if let Some(target) = step.name.strip_prefix("app.") {
            let (app, action) = target
                .split_once('.')
                .ok_or(bad("Invalid work app action"))?;
            let mut change = apps::AppChange {
                app: app.into(),
                action: action.into(),
                arguments_json: step.arguments_json.clone(),
                expected_app_revision: 0,
            };
            apps::bind_change(a, t, &mut change, h).await?;
            step.arguments_json = change.arguments_json.clone();
            step.binding = Some(change);
        } else {
            let op = capabilities::OPERATIONS
                .iter()
                .find(|op| op.name == step.name && NATIVE.contains(&op.name) && op.admitted(a, h))
                .ok_or(bad(
                    "Operation is not admitted for private configuration work",
                ))?;
            apps::validate_native_input(&op.input_schema(), &args)?;
            if step.name == "merchant.translations.create" {
                translation::validate(a, t, &args, &created_products).await?;
                continue;
            }
            if step.name.starts_with("merchant.category.") {
                categories::admit_configuration(
                    a,
                    t,
                    &args["category"],
                    step.name.ends_with(".create"),
                )
                .await?;
            }
            if step.name.ends_with(".create") {
                let key = if step.name == "merchant.product.create" {
                    "product"
                } else {
                    "category"
                };
                let id = args[key]["id"]
                    .as_str()
                    .filter(|id| apps::identifier(id) || Uuid::parse_str(id).is_ok())
                    .ok_or(bad("Work creation needs an explicit stable identifier"))?;
                let exists: bool = if key == "product" {
                    sqlx::query_scalar(
                        "SELECT EXISTS(SELECT 1 FROM products WHERE tenant=$1 AND id=$2)",
                    )
                    .bind(t)
                    .bind(id)
                    .fetch_one(&a.db)
                    .await?
                } else {
                    sqlx::query_scalar(
                        "SELECT EXISTS(SELECT 1 FROM categories WHERE tenant=$1 AND id=$2)",
                    )
                    .bind(t)
                    .bind(id)
                    .fetch_one(&a.db)
                    .await?
                };
                if key == "product" {
                    if created_products.iter().any(|existing| existing == id) {
                        return Err(bad("Duplicate product create in reviewed work"));
                    }
                    created_products.push(id.to_owned());
                }
                if exists {
                    return Err(conflict("Planned create target already exists"));
                }
            } else if step.name == "merchant.product.save" {
                if args["product"]["revision"].as_i64().is_none()
                    && args["product"]["contentRevision"].as_i64().is_none()
                {
                    return Err(bad("Planned product edit needs its original revision"));
                }
            } else if step.name == "merchant.category.save" {
                if args["category"]["revision"].as_i64().is_none() {
                    return Err(bad("Planned category edit needs its original revision"));
                }
            } else if args["revision"].as_i64().is_none() {
                return Err(bad("Planned edit needs its original revision"));
            }
        }
    }
    if json!(steps).to_string().len() > 24576 {
        return Err(bad("Bound work exceeds 24 KiB"));
    }
    Ok(())
}
pub(crate) async fn approve(a: &App, t: &str, id: &str, h: &RequestContext) -> Result<Value> {
    if !h.principal.personal_session && header(h, "x-rac-user") != Some("bootstrap") {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Personal approval required for work execution".into(),
        ));
    }
    // Rebinding uses native owners which acquire their own connection. Do not hold
    // a transaction while calling them: transaction poolers may have one backend.
    let row = sqlx::query("SELECT * FROM tasks WHERE tenant=$1 AND id=$2")
        .bind(t)
        .bind(id)
        .fetch_one(&a.db)
        .await?;
    if row.get::<bool, _>("applied") {
        return Ok(json!({"taskId":id,"applied":true,"replayed":true}));
    }
    if row.get::<String, _>("run_actor") != header(h, "x-rac-user").unwrap_or("") {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Only the original actor may approve work".into(),
        ));
    }
    let ceiling: Value = row.get("run_scopes");
    if ceiling.as_array().is_none_or(|scopes| {
        scopes
            .iter()
            .any(|scope| scope.as_str().is_none_or(|scope| !auth::allowed(h, scope)))
    }) {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Current permissions no longer cover the reviewed work".into(),
        ));
    }
    let mut request: Value = row.get("run_request");
    if request.get("execution").is_some() {
        let state: String = row.get("run_state");
        if !["queued", "running"].contains(&state.as_str()) {
            return Err(conflict(
                "Work is stopped; use its explicit continuation or cancellation controls",
            ));
        }
        return Ok(json!({"taskId":id,"applied":false,"queued":true,"replayed":true}));
    }
    if row.get::<Option<String>, _>("run_state").as_deref() != Some("ready") {
        return Err(conflict("Work proposal is not ready"));
    }
    let evidence: Value = row.get("proposal");
    let mut steps: Vec<Step> = serde_json::from_value(evidence["proposal"]["operations"].clone())
        .map_err(|_| bad("Invalid saved work plan"))?;
    if steps.is_empty() {
        return Err(bad("Work plan has no steps"));
    }
    // Rebinding may only confirm the exact original review, never refresh stale revisions silently.
    let reviewed = json!(steps);
    bind(a, t, h, &mut steps).await?;
    if reviewed != json!(steps) {
        return Err(conflict("Work targets changed after review"));
    }
    // The native coordinator reads the live-shop stop flag outside the private
    // tenant's SQL visibility, as enqueue/resume do. Actor-scoped reads and exact
    // rebinding above authorize this one task. Lock live control before its task,
    // matching the global-stop owner and never widening the worker's data scope.
    let mut tx = a.db.begin_privileged().await?;
    let stopped:bool=sqlx::query_scalar("SELECT agents_stopped FROM tenants WHERE id=coalesce((SELECT live_tenant FROM shop_environments WHERE tenant=$1),$1) FOR NO KEY UPDATE").bind(t).fetch_one(&mut *tx).await?;
    if stopped {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Shop agents are stopped by an administrator".into(),
        ));
    }
    let revision: i64 =
        sqlx::query_scalar("SELECT run_revision FROM tasks WHERE tenant=$1 AND id=$2 FOR UPDATE")
            .bind(t)
            .bind(id)
            .fetch_one(&mut *tx)
            .await?;
    if revision != row.get::<i64, _>("run_revision") {
        return Err(conflict(
            "Work changed while checking approval; reload its current state",
        ));
    }
    if let Some(conversation) = row.get::<Option<String>, _>("conversation_id") {
        contract::claim_conversation(&mut tx, t, &conversation, id).await?;
    }
    request["execution"] = json!(steps);
    request["history"] = Value::Null;
    let credential = header(h, "authorization")
        .and_then(|s| s.strip_prefix("Bearer "))
        .map(hash);
    sqlx::query("UPDATE tasks SET run_request=$3,run_credential=$4,run_personal=$5,run_checkpoint='{}',run_state='queued',run_revision=run_revision+1,run_updated=now(),run_lease=NULL,run_until=NULL WHERE tenant=$1 AND id=$2").bind(t).bind(id).bind(request).bind(credential).bind(h.principal.personal_session).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(json!({"taskId":id,"applied":false,"queued":true}))
}
