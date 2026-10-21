//! App-owned block admission with bounded field paths; never echo untrusted content in errors.
use super::*;

fn invalid(index: usize, field: &str, rule: &str) -> Error {
    bad(format!("content.blocks[{index}].{field}: {rule}"))
}

pub(super) fn validate(blocks: &[Block]) -> Result<()> {
    let mut ids = std::collections::HashSet::new();
    for (i, b) in blocks.iter().enumerate() {
        if !identifier(&b.id) {
            return Err(invalid(
                i,
                "id",
                "use 1–32 lowercase ASCII letters, digits or underscores; start with a letter",
            ));
        }
        if !ids.insert(&b.id) {
            return Err(invalid(i, "id", "must be unique within this page"));
        }
        if ![
            "hero", "text", "products", "image", "form", "articles", "app",
        ]
        .contains(&b.kind.as_str())
        {
            return Err(invalid(
                i,
                "kind",
                "use hero, text, products, image, form, articles or app",
            ));
        }
        if (b.kind == "app") != b.extension.is_some() {
            return Err(invalid(
                i,
                "extension",
                "required only for kind=app; omit it for other kinds",
            ));
        }
        if b.extension.as_ref().is_some_and(|e| {
            !identifier(&e.app) || !identifier(&e.surface) || e.app == "site_builder"
        }) {
            return Err(invalid(
                i,
                "extension",
                "use valid app and surface identifiers from an installed app other than site_builder",
            ));
        }
        if b.text.len() > 100
            || b.text.iter().any(|(k, v)| {
                !commerce::valid_locale_key(k) || v.as_ref().is_some_and(|s| s.len() > 2000)
            })
        {
            return Err(invalid(
                i,
                "text",
                "use a locale-to-string/null map, at most 100 locales and 2000 UTF-8 bytes per value",
            ));
        }
        if b.product_mode
            .as_deref()
            .is_some_and(|m| !["all", "selected"].contains(&m))
        {
            return Err(invalid(i, "productMode", "use all or selected, or omit it"));
        }
        if b.products.len() > 24 || b.products.iter().any(|s| s.len() > 100) {
            return Err(invalid(
                i,
                "products",
                "use at most 24 owned product IDs, each at most 100 bytes",
            ));
        }
        if b.fields.len() > 12 {
            return Err(invalid(i, "fields", "use at most 12 form fields"));
        }
        if !b.rich.is_null() {
            assets::validate_rich(&b.rich).map_err(|e| invalid(i, "rich", &e.1))?;
        }
        if !b.image.is_empty() && !safe_image(&b.image) {
            return Err(invalid(
                i,
                "image",
                "use a public product-media path or HTTPS URL",
            ));
        }
        let mut fields = std::collections::HashSet::new();
        for (j, f) in b.fields.iter().enumerate() {
            if !identifier(&f.id) || !fields.insert(&f.id) {
                return Err(invalid(
                    i,
                    &format!("fields[{j}].id"),
                    "use a unique identifier: lowercase letter followed by lowercase letters, digits or underscores; at most 32 bytes",
                ));
            }
            if !["text", "email", "textarea", "checkbox", "number"].contains(&f.kind.as_str()) {
                return Err(invalid(
                    i,
                    &format!("fields[{j}].kind"),
                    "use text, email, textarea, checkbox or number",
                ));
            }
            if f.label.is_empty()
                || f.label.len() > 100
                || f.label
                    .iter()
                    .any(|(l, s)| !commerce::valid_locale_key(l) || s.len() > 100)
            {
                return Err(invalid(
                    i,
                    &format!("fields[{j}].label"),
                    "use 1–100 locale-to-string entries, each at most 100 UTF-8 bytes",
                ));
            }
        }
    }
    Ok(())
}
