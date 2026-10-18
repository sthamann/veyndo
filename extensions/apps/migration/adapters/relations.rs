//! Provider relation shapes become explicit source IDs and native option labels, never guessed target IDs.
use super::*;
pub fn options(v: &Value) -> Result<Value> {
    let mut out = serde_json::Map::new();
    let values = list(&field(
        v,
        &["selectedOptions", "attributes", "configuratorOptions"],
    ));
    if values.len() > 40 {
        return Err("Too many variant options".into());
    }
    for value in values {
        let name = text(&field(&value, &["name", "group.name"]));
        let option = text(&field(&value, &["value", "option", "name"]));
        if name.is_empty() || option.is_empty() || out.insert(name, json!(option)).is_some() {
            return Err("Variant option names/values are incomplete or duplicated".into());
        }
    }
    if out.is_empty() {
        let title = text(&v["title"]);
        if !title.is_empty() {
            out.insert("Variant".into(), json!(title));
        }
    }
    Ok(Value::Object(out))
}
pub fn categories(c: &Context, v: &Value) -> Result<Vec<String>> {
    let mut out = vec![];
    if c.source == Source::Prestashop {
        let id = text(&v["id_category_default"]);
        if !id.is_empty() && id != "0" {
            out.push(id);
        }
    } else {
        for value in list(&v["categories"]) {
            let id = id(&value, &["id"])?;
            out.push(id);
        }
        if c.source == Source::Magento2 {
            for value in list(&v["extension_attributes"]["category_links"]) {
                out.push(id(&value, &["category_id"])?);
            }
        }
    }
    out.sort();
    out.dedup();
    if out.len() > 100 {
        return Err("Too many source category references".into());
    }
    Ok(out)
}
