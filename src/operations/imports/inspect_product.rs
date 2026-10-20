//! Explicit catalogue-only preview: whitelist current mapped/native fields, bound text/media, reuse native money formatting.
use super::*;
pub(super) fn projection(value: &Value, scale: u8) -> Result<Value> {
    let code = value["extra"]["priceCurrency"].as_str().unwrap_or("EUR");
    let currency =
        veyndo::money::Currency::new(code, scale).map_err(|_| bad("Invalid product currency"))?;
    let amount = veyndo::money::Money::rounded(&value["commerce"]["price"].to_string(), currency)
        .map_err(|_| bad("Invalid native product price"))?
        .decimal();
    let mut translations = serde_json::Map::new();
    for (locale, fields) in value["translations"]
        .as_object()
        .into_iter()
        .flatten()
        .take(16)
    {
        translations.insert(
            locale.clone(),
            json!({"name":text(&fields["name"]),"description":text(&fields["description"])}),
        );
    }
    let media: Vec<Value> = value["commerce"]["media"]
        .as_array()
        .into_iter()
        .flatten()
        .take(8)
        .map(|item| json!({"url":text(&item["url"])}))
        .collect();
    Ok(
        json!({"translations":translations,"sku":text(&value["catalog"]["productNumber"]),"active":value["catalog"]["active"],"parentId":value["catalog"]["parentId"],"options":value["catalog"]["options"],"price":{"amount":amount,"currency":code},"taxRate":value["commerce"]["taxRate"],"media":media}),
    )
}
fn text(v: &Value) -> String {
    v.as_str().unwrap_or("").chars().take(4000).collect()
}
