//! Deterministic Shopify product-export adapter; image-only rows are not products and variant prices/SKUs remain distinct.
use super::*;
pub(crate) fn parse(source: &str) -> Result<Vec<Draft>> {
    let mut rows = csv::rows(source)?;
    let headers = rows.remove(0);
    let mut seen = std::collections::HashSet::new();
    if headers.iter().any(|h| !seen.insert(h))
        || !["Handle", "Title", "Variant Price"]
            .iter()
            .all(|h| headers.iter().any(|k| k == h))
    {
        return Err(bad(
            "Shopify export requires unique Handle, Title and Variant Price columns",
        ));
    }
    let mut parents: HashMap<String, (String, String, String)> = HashMap::new();
    let mut drafts = vec![];
    for row in rows {
        if row.len() != headers.len() {
            return Err(bad("Shopify CSV row has the wrong number of columns"));
        }
        let get = |key: &str| {
            headers
                .iter()
                .position(|h| h == key)
                .map(|i| row[i].trim())
                .unwrap_or("")
        };
        let handle = get("Handle");
        if handle.is_empty() {
            return Err(bad("Shopify CSV handle is required"));
        }
        let parent = parents.entry(handle.into()).or_default();
        if !get("Title").is_empty() {
            parent.0 = get("Title").into();
        }
        if !get("Body (HTML)").is_empty() {
            parent.1 = plain(get("Body (HTML)"));
        }
        if !get("Image Src").is_empty() && parent.2.is_empty() {
            parent.2 = get("Image Src").into();
        }
        if get("Variant Price").is_empty() {
            continue;
        }
        let price = get("Variant Price")
            .parse::<f64>()
            .map_err(|_| bad("Invalid Shopify variant price"))?;
        let options = ["Option1 Value", "Option2 Value", "Option3 Value"]
            .iter()
            .map(|key| get(key))
            .filter(|v| !v.is_empty() && *v != "Default Title")
            .collect::<Vec<_>>();
        let name = if options.is_empty() {
            parent.0.clone()
        } else {
            format!("{} · {}", parent.0, options.join(" / "))
        };
        let source = Source {
            provider: "shopify_csv".into(),
            external_id: format!("{handle}:{}", options.join("/")),
            url: String::new(),
        };
        let draft = Draft {
            name,
            description: parent.1.clone(),
            price,
            product_number: get("Variant SKU").into(),
            image_url: if get("Variant Image").is_empty() {
                parent.2.clone()
            } else {
                get("Variant Image").into()
            },
            source: Some(source),
        };
        draft.validate()?;
        drafts.push(draft);
        if drafts.len() > 50 {
            return Err(bad("Review at most 50 imported variants per batch"));
        }
    }
    if drafts.is_empty() {
        return Err(bad("No priced Shopify variants were found"));
    }
    Ok(drafts)
}
