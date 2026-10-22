//! A closed shopper adapter uses native carts and exact reviewed totals; no model-supplied authority or payment mode.
use super::*;
pub(super) fn headers(t: &str, request: &Value, token: Option<&str>) -> Result<RequestContext> {
    let mut h = RequestContext::new();
    for (key, value) in [
        ("x-tenant", t),
        (
            "x-commerce-locale",
            request["locale"].as_str().unwrap_or("en-GB"),
        ),
        (
            "sw-sales-channel-id",
            request["channel"].as_str().unwrap_or("default"),
        ),
        (
            "x-commerce-currency",
            request["scenario"]["currency"].as_str().unwrap_or(""),
        ),
    ] {
        h.insert(
            key,
            value.parse().map_err(|_| bad("Invalid scenario context"))?,
        );
    }
    if let Some(token) = token {
        h.insert(
            "sw-context-token",
            token.parse().map_err(|_| bad("Invalid private cart"))?,
        );
    }
    Ok(h)
}
pub(super) async fn call(a: &App, h: &RequestContext, name: &str, v: &Value) -> Result<Value> {
    Box::pin(capabilities::invoke(a, h, name, v)).await
}
pub(super) fn observation(v: &Value) -> Value {
    // Positive projection: nested customer/configuration payloads and capabilities
    // never enter model input or reports, including after a completed checkout.
    json!({"revision":v["revision"],"status":v["status"],"price":v["price"],"selectionNeedsConfirmation":v["selectionNeedsConfirmation"],
        "items":v["lineItems"].as_array().map(|items|items.iter().map(|i|json!({"id":i["id"],"name":i["label"],"quantity":i["quantity"],"price":i["price"],"stock":i["stock"]})).collect::<Vec<_>>())})
}
pub(super) async fn purchase(
    a: &App,
    h: &RequestContext,
    profile: &Value,
    key: &str,
) -> Result<Value> {
    let cart = load_cart(a, h).await?;
    if cart.status == "completed" {
        return cart
            .data
            .order
            .clone()
            .ok_or(bad("Completed cart has no order"));
    }
    let (config, _) = commerce::scoped_config(a, &cart.tenant, &cart.data.sales_channel).await?;
    let country = profile["country"]
        .as_str()
        .ok_or(bad("Profile country required"))?;
    let payment = config
        .payments
        .iter()
        .find(|p| p.active && p.mode == "simulated" && !p.business_only && p.available_in(country))
        .ok_or(bad(
            "No simulated payment is configured for this customer country",
        ))?;
    let shipping = config
        .shipping
        .iter()
        .find(|s| s.active && s.countries.iter().any(|c| c == country))
        .ok_or(bad(
            "No shipping method is configured for this customer country",
        ))?;
    let region = commerce::company_countries(&config)
        .into_iter()
        .find(|c| c.code == country)
        .and_then(|c| c.states.first().map(|s| s.code.clone()))
        .unwrap_or_default();
    let address = json!({"firstName":"Scenario","lastName":"Shopper","street":"Teststrasse 1","zipcode":"10115","city":"Test City","country":country,"countryStateId":region});
    let quote = call(a,h,"checkout.select",&json!({"revision":cart.revision,"checkout":{"country":country,"shippingMethodId":shipping.id,"paymentMethodId":payment.id,"address":address,"billingAddress":address,"customerEmail":"scenario@example.test"}})).await?;
    let minor = quote["price"]["totalMinor"]
        .as_str()
        .and_then(|s| s.parse::<i64>().ok())
        .ok_or(bad("Native quote has no exact total"))?;
    if minor > profile["budgetMinor"].as_i64().unwrap_or(0) {
        return Err(bad("Native checkout total exceeds this customer's budget"));
    }
    let policy = call(a, h, "privacy.policy", &json!({})).await?;
    call(
        a,
        h,
        "legal.accept",
        &json!({"policyVersion":policy["policyVersion"],"terms":true,"digitalImmediate":true}),
    )
    .await?;
    let mut reviewed = h.clone();
    reviewed.insert(
        "x-commerce-cart-revision",
        quote["revision"]
            .to_string()
            .parse()
            .map_err(|_| bad("Invalid cart revision"))?,
    );
    reviewed.insert(
        "x-commerce-total-minor",
        minor
            .to_string()
            .parse()
            .map_err(|_| bad("Invalid exact total"))?,
    );
    call(
        a,
        &reviewed,
        "checkout.complete",
        &json!({"idempotency_key":key}),
    )
    .await
}
pub(super) async fn products(a: &App, h: &RequestContext, query: &str) -> Result<Value> {
    let found = call(a, h, "catalog.search", &json!({"query":query,"limit":12})).await?;
    let rows = found["elements"]
        .as_array()
        .or_else(|| found["products"].as_array());
    Ok(json!(rows.into_iter().flatten().map(|p|json!({"id":p["id"],"name":p["name"],"description":p["description"].as_str().unwrap_or("").chars().take(800).collect::<String>(),"price":p["price"],"stock":p["stock"]})).collect::<Vec<_>>()))
}
