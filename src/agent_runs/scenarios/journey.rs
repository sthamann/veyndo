//! Each fictional customer has an independent durable provider journal and an authoritative native journey.
use super::*;
const PROMPT: &str = include_str!("../../../crates/cognition/prompts/customer-scenario.v1.txt");
fn action_schema() -> Value {
    json!({"type":"object","additionalProperties":false,"required":["action","productId","quantity","query","reason"],"properties":{
        "action":{"type":"string","enum":["search","detail","add","checkout","finish"]},"productId":{"type":"string","maxLength":160},
        "quantity":{"type":"integer","minimum":1,"maximum":10},"query":{"type":"string","maxLength":200},"reason":{"type":"string","maxLength":800}}})
}
pub(crate) async fn execute(
    a: &App,
    t: &str,
    id: &str,
    h: &RequestContext,
    request: &Value,
) -> Result<Value> {
    admit(a, h).await?;
    let profile = &request["scenario"]["profile"];
    let mut customer = profile.clone();
    let currency = veyndo::money::Currency::new(
        request["scenario"]["currency"].as_str().unwrap_or(""),
        request["scenario"]["scale"].as_u64().unwrap_or(255) as u8,
    )
    .map_err(bad)?;
    customer
        .as_object_mut()
        .ok_or(bad("Invalid customer profile"))?
        .remove("budgetMinor");
    customer["budgetAmount"] = json!(
        veyndo::money::Money::new(profile["budgetMinor"].as_i64().unwrap_or(0), currency).decimal()
    );
    customer["budgetCurrency"] = request["scenario"]["currency"].clone();
    let choice = agent::choice(request)?;
    let mut state = if let Some(saved) = checkpoint::load(a, "scenario-state").await? {
        saved
    } else {
        let guest = shopper::headers(t, request, None)?;
        let cart = shopper::call(
            a,
            &guest,
            "cart.create",
            &json!({"session":format!("scenario-{id}")}),
        )
        .await?;
        let products = shopper::products(a, &guest, "").await?;
        let (settings, revision) =
            commerce::scoped_config(a, t, request["channel"].as_str().unwrap_or("default")).await?;
        let extensions: String = sqlx::query_scalar("SELECT md5(coalesce(string_agg(stamp,'|' ORDER BY stamp),'')) FROM (SELECT 'app:'||id||':'||digest||':'||revision||':'||active AS stamp FROM app_packages WHERE tenant=$1 UNION ALL SELECT 'rule:'||id||':'||revision FROM commerce_rules WHERE tenant=$1 UNION ALL SELECT 'flow:'||id||':'||revision FROM commerce_flows WHERE tenant=$1 UNION ALL SELECT 'promotion:'||id||':'||revision FROM commerce_promotions WHERE tenant=$1 UNION ALL SELECT 'channel:'||id||':'||revision FROM sales_channels WHERE tenant=$1) versions")
            .bind(t).fetch_one(&a.db).await?;
        let state = json!({"token":cart["token"],"products":products,"snapshotDigest":hash(&json!({"products":products,"settings":settings,"revision":revision,"extensions":extensions}).to_string()),"steps":[],"outcome":"step_limit","orderId":null,"totalMinor":null});
        checkpoint::save(a, "scenario-state", &state).await?;
        state
    };
    let guest = shopper::headers(t, request, state["token"].as_str())?;
    let start = state["steps"].as_array().map_or(0, Vec::len);
    for index in start..8 {
        if state["outcome"] != "step_limit" {
            break;
        }
        checkpoint::authorize(a).await?;
        admit(a, h).await?;
        let cart = shopper::call(a, &guest, "cart.quote", &json!({})).await?;
        let prompt = json!({"instruction":request["instruction"],"profile":customer,"currency":request["scenario"]["currency"],"minorUnitScale":request["scenario"]["scale"],"products":state["products"],"steps":state["steps"],"cart":shopper::observation(&cart)}).to_string();
        let action_key = format!("scenario-action-{index}");
        let output: veyndo::inference::Output =
            if let Some(saved) = checkpoint::load(a, &action_key).await? {
                serde_json::from_value(saved).map_err(|_| bad("Invalid saved shopper action"))?
            } else {
                let output = checkpoint::model(
                    a,
                    h,
                    choice.as_ref(),
                    PROMPT,
                    &prompt,
                    &action_schema(),
                    false,
                )
                .await?;
                apps::validate_native_input(&action_schema(), &output.value)?;
                checkpoint::save(a, &action_key, &json!(output)).await?;
                output
            };
        let action = &output.value;
        checkpoint::authorize(a).await?;
        let run = CURRENT
            .try_with(Clone::clone)
            .map_err(|_| bad("Scenario requires worker admission"))?;
        let admitted = sqlx::query("UPDATE tasks SET run_pending=$4 WHERE tenant=$1 AND id=$2 AND run_state='running' AND run_lease=$3 AND run_until>now()")
            .bind(t).bind(id).bind(&run.lease).bind(format!("scenario-step-{index}")).execute(&a.db).await?.rows_affected();
        if admitted != 1 {
            return Err(conflict("Customer simulation stopped"));
        }
        let result = perform(
            a,
            &guest,
            profile,
            action,
            &state,
            &format!("scenario-{id}-{index}"),
        )
        .await;
        // Do not publish late evidence after cancellation or a permission change.
        checkpoint::authorize(a).await?;
        let mut step = json!({"index":index,"action":action["action"],"reason":action["reason"],"model":output.model,"provider":output.provider});
        let mut done = false;
        match result {
            Ok(value) => {
                step["observation"] = value.clone();
                match action["action"].as_str() {
                    Some("search") => {
                        let known = state["products"]
                            .as_array_mut()
                            .ok_or(bad("Invalid observed catalogue"))?;
                        for product in value.as_array().into_iter().flatten() {
                            if let Some(old) = known.iter_mut().find(|p| p["id"] == product["id"]) {
                                *old = product.clone();
                            } else {
                                known.push(product.clone());
                            }
                        }
                    }
                    Some("checkout") => {
                        state["outcome"] = json!("purchased");
                        state["orderId"] = value["orderId"].clone();
                        state["totalMinor"] = value["totalMinor"].clone();
                        done = true;
                    }
                    Some("finish") => {
                        state["outcome"] = json!("stopped_by_customer");
                        done = true;
                    }
                    _ => {}
                }
            }
            Err(error) => {
                step["error"] = json!({"status":error.0.as_u16(),"detail":error.1.chars().take(300).collect::<String>()});
                state["outcome"] = json!("blocked");
                done = true;
            }
        }
        state["steps"]
            .as_array_mut()
            .ok_or(bad("Invalid scenario journal"))?
            .push(step);
        checkpoint::save(a, "scenario-state", &state).await?;
        if done {
            break;
        }
    }
    let report = json!({"scenario":{"title":request["scenario"]["title"],"group":request["scenario"]["group"],"profile":profile,"inputDigest":request["scenario"]["inputDigest"],"comparisonDigest":request["scenario"]["comparisonDigest"],"currency":request["scenario"]["currency"],"scale":request["scenario"]["scale"],"snapshotDigest":state["snapshotDigest"],"steps":state["steps"],"outcome":state["outcome"],"orderId":state["orderId"],"totalMinor":state["totalMinor"],"synthetic":true,"execution":"native-commerce-api","prompt":veyndo_cognition::prompts::evidence(PROMPT)}});
    checkpoint::authorize(a).await?;
    let run = CURRENT
        .try_with(Clone::clone)
        .map_err(|_| bad("Scenario requires worker admission"))?;
    let changed = sqlx::query("UPDATE tasks SET proposal=$4,applied=true,run_state='ready',run_pending=NULL,run_lease=NULL,run_until=NULL,run_revision=run_revision+1,run_updated=now() WHERE tenant=$1 AND id=$2 AND run_state='running' AND run_lease=$3 AND run_until>now()")
        .bind(t).bind(id).bind(&run.lease).bind(&report).execute(&a.db).await?.rows_affected();
    if changed != 1 {
        return Err(conflict("Scenario completion lost its lease"));
    }
    Ok(report)
}
async fn perform(
    a: &App,
    h: &RequestContext,
    profile: &Value,
    action: &Value,
    state: &Value,
    key: &str,
) -> Result<Value> {
    let product = action["productId"].as_str().unwrap_or("");
    if matches!(action["action"].as_str(), Some("detail" | "add"))
        && !state["products"]
            .as_array()
            .is_some_and(|ps| ps.iter().any(|p| p["id"].as_str() == Some(product)))
    {
        return Err(bad(
            "Customer selected a product outside its observed catalogue",
        ));
    }
    match action["action"].as_str() {
        Some("search") => shopper::products(a, h, action["query"].as_str().unwrap_or("")).await,
        Some("detail") => {
            let value =
                shopper::call(a, h, "catalog.detail", &json!({"productId":product})).await?;
            Ok(
                json!({"id":product,"name":value["product"]["name"],"description":value["product"]["description"].as_str().unwrap_or("").chars().take(800).collect::<String>(),"price":value["product"]["price"]}),
            )
        }
        Some("add") => {
            let cart = load_cart(a, h).await?;
            let quote = shopper::call(a, h, "cart.quote", &json!({})).await?;
            let mut items: Vec<Value> = quote["lineItems"]
                .as_array()
                .into_iter()
                .flatten()
                .filter(|p| p["id"].as_str() != Some(product))
                .map(|p| json!({"id":p["id"],"quantity":p["quantity"]}))
                .collect();
            // Set this product's exact quantity while retaining the rest of the
            // basket. A lost acknowledgement cannot increment it a second time.
            items.push(json!({"id":product,"quantity":action["quantity"]}));
            let value = shopper::call(
                a,
                h,
                "cart.replace",
                &json!({"revision":cart.revision,"items":items}),
            )
            .await?;
            Ok(shopper::observation(&value))
        }
        Some("checkout") => {
            let order = shopper::purchase(a, h, profile, key).await?;
            let cart = load_cart(a, h).await?;
            let q = cart.data.order.as_ref().unwrap_or(&order);
            Ok(
                json!({"orderId":order["id"],"totalMinor":q["cart"]["price"]["totalMinor"].as_str().and_then(|s|s.parse::<i64>().ok()),"simulated":true}),
            )
        }
        Some("finish") => Ok(json!({"stopped":true})),
        _ => Err(bad("Unsupported customer action")),
    }
}
