//! Canonical import references resolve to tenant-bound native IDs; the existing product owner validates every relation.
use super::*;
pub(super) fn identity(r: &SourceRecord, t: &str, kind: &str, source_id: &str) -> Result<String> {
    if source_id.is_empty() || source_id.len() > 200 || source_id.chars().any(char::is_control) {
        return Err(bad("Invalid source relation identity"));
    }
    Ok(SourceRecord {
        version: r.version,
        source: r.source.clone(),
        source_shop: r.source_shop.clone(),
        kind: kind.into(),
        source_id: source_id.into(),
        data: json!({}),
        warnings: vec![],
    }
    .identity(t))
}
pub(super) fn product(r: &SourceRecord, t: &str) -> Result<Value> {
    let parent = r
        .data
        .get("parentSourceId")
        .filter(|v| !v.is_null())
        .map(|v| {
            v.as_str()
                .ok_or(bad("Invalid source parent identity"))
                .and_then(|s| identity(r, t, "products", s))
        })
        .transpose()?;
    let mut categories = vec![];
    if let Some(values) = r.data.get("categorySourceIds") {
        let values = values
            .as_array()
            .filter(|xs| xs.len() <= 100)
            .ok_or(bad("Invalid source category references"))?;
        for value in values {
            categories.push(identity(
                r,
                t,
                "categories",
                value
                    .as_str()
                    .ok_or(bad("Category source ID must be text"))?,
            )?);
        }
    }
    if categories.is_empty() {
        categories.push("catalog-root".into());
    }
    let options = r.data.get("options").cloned().unwrap_or(json!({}));
    if !options.is_object() {
        return Err(bad("Variant options must be a canonical object"));
    }
    Ok(json!({"parentId":parent,"categoryIds":categories,"options":options}))
}
