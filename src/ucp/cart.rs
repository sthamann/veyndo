//! UCP cart transfer adapts the native cart and single-use browser handoff; supplier totals and return URLs are never trusted.
use super::*;
pub(super) const CAPABILITY: &str = "dev.ucp.shopping.cart";
pub(super) async fn create(
    State(a): State<App>,
    h: RequestContext,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    let mut doc = create_session(a.clone(), h.clone(), v, true).await?.0;
    let mut scoped = h;
    scoped.insert(
        "sw-context-token",
        doc["context_token"].as_str().unwrap().parse().unwrap(),
    );
    let c = load_cart(&a, &scoped).await?;
    let transfer = checkout_handoff::issue(State(a), scoped, Json(json!({"revision":c.revision})))
        .await?
        .0;
    let origin = shop_domains::links(&c.tenant)["studioUrl"]
        .as_str()
        .unwrap()
        .to_owned();
    let url = reqwest::Url::parse(&origin)
        .and_then(|u| u.join(transfer["checkoutPath"].as_str().unwrap()))
        .map_err(|_| bad("Invalid cart continuation URL"))?;
    for field in ["context_token", "payment", "status", "order"] {
        doc.as_object_mut().unwrap().remove(field);
    }
    doc["ucp"]["capabilities"]
        .as_object_mut()
        .unwrap()
        .remove("dev.ucp.shopping.checkout");
    doc["ucp"]["capabilities"][CAPABILITY] = json!([{"version":UCP_VERSION}]);
    doc["continue_url"] = json!(url.as_str());
    doc["expires_at"] = json!((chrono::Utc::now() + chrono::Duration::minutes(10)).to_rfc3339());
    Ok(Json(doc))
}
