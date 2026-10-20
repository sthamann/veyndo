//! Shopware 6 catalogue projection preserves identities and refuses unresolved inheritance, prices or options.
use super::*;
pub fn product(c: &Context, v: &Value) -> Result<Vec<Record>> {
    let source_id = id(v, &["id"])?;
    let price = v["_veyndoPrice"].clone();
    let amount = c.money(&price)?;
    if amount.minor < 0 {
        return Err("Negative Shopware product price requires review".into());
    }
    let name = field(v, &["translated.name", "name"]);
    if !name.as_str().is_some_and(|s| !s.trim().is_empty()) {
        return Err("Shopware product translation unresolved".into());
    }
    let stock = v["stock"]
        .as_i64()
        .filter(|n| *n >= 0 && *n <= i32::MAX.into())
        .ok_or("Shopware product stock unresolved")?;
    let mut options = serde_json::Map::new();
    for option in list(&v["options"]) {
        let group = text(&field(&option, &["group.translated.name", "group.name"]));
        let value = text(&field(&option, &["translated.name", "name"]));
        if group.is_empty() || value.is_empty() || options.insert(group, json!(value)).is_some() {
            return Err("Shopware variant options require complete unique group labels".into());
        }
    }
    if options.len() > 40 {
        return Err("Shopware variant option limit exceeded".into());
    }
    let active = match &v["active"] {
        Value::Bool(false) => Some(false),
        Value::Bool(true) => None,
        _ => return Err("Shopware active flag unresolved".into()),
    };
    let images = list(&v["media"])
        .into_iter()
        .map(|m| m["media"].clone())
        .collect::<Vec<_>>();
    let group = v["childCount"]
        .as_u64()
        .ok_or("Shopware product child count required")?
        > 0;
    let parent = v["parentId"].clone();
    if !parent.is_null() && !parent.as_str().is_some_and(|s| !s.is_empty()) {
        return Err("Shopware parent identity unresolved".into());
    }
    let mut row = Record::new(
        c,
        "products",
        source_id,
        json!({"name":c.text(text(&name)),"description":c.text(text(&field(v,&["translated.description","description"]))),"sku":v["productNumber"],"price":amount,"priceDisplay":amount.decimal(),"priceBasis":"gross","sourceTaxRate":v["tax"]["taxRate"],"stock":stock,"parentSourceId":parent,"variantGroup":group,"options":options,"sourceImages":images,"categorySourceIds":list(&v["categories"]).iter().map(|r|r["id"].clone()).collect::<Vec<_>>(),"catalogActive":active}),
    )?;
    row.warnings
        .push("source_tax_and_sales_channel_rules_require_review".into());
    Ok(vec![row])
}
