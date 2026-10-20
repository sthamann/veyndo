//! A reviewed grid view contains only native filter criteria; current domain and PII rights are checked before persistence.
use super::*;
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct View {
    pub entity: String,
    pub criteria: Value,
}
pub(crate) fn schema() -> Value {
    let variants=["orders","customers","products"].iter().map(|entity| json!({"type":"object","properties":{"entity":{"type":"string","enum":[entity]},"criteria":operations::grid_schema::schema(entity).unwrap()},"required":["entity","criteria"],"additionalProperties":false})).collect::<Vec<_>>();
    json!({"anyOf":variants.into_iter().chain(std::iter::once(json!({"type":"null"}))).collect::<Vec<_>>()})
}
pub(crate) async fn admit(a: &App, h: &RequestContext, view: &mut View) -> Result<()> {
    auth::permit(
        h,
        match view.entity.as_str() {
            "orders" => "orders.read",
            "customers" => "customers.read",
            "products" => "catalog.read",
            _ => return Err(bad("Unknown agent grid")),
        },
    )?;
    if view.entity != "products" {
        auth::permit(h, "customers.pii")?;
    }
    view.criteria = operations::grid_schema::validate(&view.entity, &view.criteria)?;
    if let Some(filter) = view.criteria["appFilter"].as_str() {
        let object = match view.entity.as_str() {
            "orders" => apps::core_extensions::Object::Order,
            "customers" => apps::core_extensions::Object::Customer,
            _ => apps::core_extensions::Object::Product,
        };
        apps::extension_filter::admit(a, h, object, filter).await?;
    }
    Ok(())
}
