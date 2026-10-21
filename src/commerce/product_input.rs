//! Admit native product edits and expand explicit category-only changes through the same revisioned editor.
use super::*;
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CategoryEdit {
    revision: i64,
    #[serde(default)]
    content_revision: Option<i64>,
    category_ids: Vec<String>,
}
fn category_edit(v: &Value) -> Result<CategoryEdit> {
    let edit: CategoryEdit = serde_json::from_value(v.clone())
        .map_err(|_| bad("Category-only product edit requires revision and categoryIds; do not mix full product fields"))?;
    if edit.revision < 0
        || edit.content_revision.is_some_and(|n| n < 0)
        || edit.category_ids.len() > 100
        || edit.category_ids.iter().any(|id| {
            id.is_empty()
                || id.len() > 160
                || !id
                    .bytes()
                    .all(|c| c.is_ascii_alphanumeric() || matches!(c, b'_' | b'-'))
        })
        || edit
            .category_ids
            .iter()
            .collect::<std::collections::HashSet<_>>()
            .len()
            != edit.category_ids.len()
    {
        return Err(bad("Invalid category-only product revision or selection"));
    }
    Ok(edit)
}
pub(crate) fn admit_product_write(v: &Value, create: bool) -> Result<()> {
    if v.get("categoryIds").is_some() {
        if create {
            return Err(bad("New products require full product metadata"));
        }
        category_edit(v)?;
    } else {
        let edit: super::product_metadata::Edit = serde_json::from_value(v.clone())
            .map_err(|_| bad("Product edit requires revision, translations and extra; category-only edits use revision and categoryIds"))?;
        if let Some(catalog) = edit.catalog {
            catalog.validate()?;
        }
        if let Some(commerce) = edit.commerce {
            commerce.validate()?;
        }
    }
    Ok(())
}
pub(crate) fn product_write_guidance() -> Value {
    json!({"categoryOnly":{"example":{"revision":1,"categoryIds":["selected_category"]},"semantics":"Replace only category assignments. Preserve existing category IDs when adding one. Read merchant.product.content first and use its original revision; optionally include its contentRevision. No translations, prices, inventory, media, identity or channel fields are changed. Cannot be combined with full product fields."},"fullEdit":"Read merchant.product.content; preserve revision, translations, extra and untouched catalog fields. Omit commerce for content-only changes. Product creation requires full metadata including catalog. Never invent metadata or refresh a reviewed revision."})
}
pub(super) async fn expand_category_edit(
    a: &App,
    h: &RequestContext,
    id: &str,
    v: Value,
) -> Result<Value> {
    if v.get("categoryIds").is_none() {
        return Ok(v);
    }
    auth::permit(h, "catalog")?;
    let edit = category_edit(&v)?;
    let current =
        super::product_edit::product_editor(State(a.clone()), h.clone(), Path(id.to_owned()))
            .await?
            .0;
    // The native writer checks this original clock again under its product lock.
    // Do not substitute the freshly read revision and silently accept stale input.
    let (clock, expected) = edit
        .content_revision
        .map_or(("revision", edit.revision), |n| ("contentRevision", n));
    if current[clock].as_i64() != Some(expected) {
        return Err(Error::revision_at(
            current[clock].as_i64().unwrap_or(0),
            &format!("/{clock}"),
            "Product changed",
        ));
    }
    let mut result = json!({"revision":edit.revision,"translations":current["translations"],"extra":current["extra"],"catalog":current["catalog"]});
    if let Some(revision) = edit.content_revision {
        result["contentRevision"] = json!(revision);
    }
    result["catalog"]["categoryIds"] = json!(edit.category_ids);
    // Keep channel writes out of an assignment-only operation as well as commerce.
    result["catalog"]
        .as_object_mut()
        .unwrap()
        .remove("salesChannelIds");
    Ok(result)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn category_only_edits_are_explicit_and_bounded() {
        assert!(
            admit_product_write(&json!({"revision":2,"categoryIds":["collection"]}), false).is_ok()
        );
        for v in [
            json!({"revision":2}),
            json!({"revision":2,"categoryIds":["collection"],"commerce":{"stock":999}}),
            json!({"revision":2,"categoryIds":["x","x"]}),
            json!({"revision":-1,"categoryIds":[]}),
            json!({"revision":2,"categoryIds":["../foreign"]}),
        ] {
            assert!(admit_product_write(&v, false).is_err(), "{v}");
        }
        assert!(admit_product_write(&json!({"revision":2,"categoryIds":[]}), true).is_err());
    }
}
