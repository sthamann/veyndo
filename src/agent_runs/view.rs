//! A reviewed grid view contains only native filter criteria; current domain and PII rights are checked before persistence.
use super::*;
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct View {
    pub entity: String,
    pub criteria: Value,
    #[serde(default = "default_components")]
    pub components: Vec<String>,
}
fn default_components() -> Vec<String> {
    vec!["records".into()]
}
pub(crate) fn validate_components(entity: &str, components: &[String]) -> Result<()> {
    if !["products", "customers", "orders"].contains(&entity)
        || components.is_empty()
        || components.len() > 3
        || !components.iter().any(|c| c == "records")
        || components
            .iter()
            .collect::<std::collections::HashSet<_>>()
            .len()
            != components.len()
        || components.iter().any(|c| {
            !matches!(c.as_str(), "records" | "details" | "intake")
                || (c == "intake" && entity != "products")
        })
    {
        return Err(bad("Invalid agent workspace components"));
    }
    Ok(())
}
pub(crate) fn schema() -> Value {
    let variants=["orders","customers","products"].iter().map(|entity| json!({"type":"object","properties":{"entity":{"type":"string","enum":[entity]},"criteria":operations::grid_schema::schema(entity).unwrap(),"components":{"type":"array","minItems":1,"maxItems":3,"items":{"type":"string","enum":if *entity=="products"{vec!["records","details","intake"]}else{vec!["records","details"]}}}},"required":["entity","criteria","components"],"additionalProperties":false})).collect::<Vec<_>>();
    json!({"anyOf":variants.into_iter().chain(std::iter::once(json!({"type":"null"}))).collect::<Vec<_>>()})
}
pub(crate) async fn admit(a: &App, h: &RequestContext, view: &mut View) -> Result<()> {
    validate_components(&view.entity, &view.components)?;
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn composition_contains_only_registered_components_for_the_native_entity() {
        assert!(
            validate_components(
                "products",
                &["records".into(), "details".into(), "intake".into()]
            )
            .is_ok()
        );
        for (entity, components) in [
            ("products", vec!["records", "sql"]),
            ("orders", vec!["records", "intake"]),
            ("products", vec!["records", "records"]),
            ("customers", vec!["details"]),
            ("foreign", vec!["records"]),
        ] {
            assert!(
                validate_components(
                    entity,
                    &components
                        .into_iter()
                        .map(str::to_owned)
                        .collect::<Vec<_>>()
                )
                .is_err()
            );
        }
    }

    #[test]
    fn legacy_views_get_a_native_directory_and_cannot_carry_authority_or_data() {
        let value = json!({"entity":"products","criteria":{"active":true}});
        let view: View = serde_json::from_value(value.clone()).unwrap();
        assert_eq!(view.components, vec!["records"]);
        for key in ["tenant", "rows", "permissions", "script", "request"] {
            let mut forged = value.clone();
            forged[key] = json!("foreign");
            assert!(serde_json::from_value::<View>(forged).is_err());
        }
    }
}
