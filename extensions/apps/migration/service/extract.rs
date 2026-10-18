//! Versioned source pages keep cursors separate from URLs; unsupported plugin domains remain explicit.
pub use super::slices::page;
use super::*;
pub async fn source_page(
    c: &config::Connection,
    source_id: &str,
    kind: &str,
    cursor: Option<&str>,
    fixture: bool,
) -> Result<Value> {
    if c.system == Source::Shopify {
        return super::shopify::page(c, source_id, kind, cursor, fixture).await;
    }
    let page = match cursor {
        None => 1,
        Some(s) => s
            .strip_prefix("page:")
            .and_then(|n| n.parse::<u32>().ok())
            .filter(|n| *n > 0 && *n <= 1_000_000)
            .ok_or("invalid source cursor; it must not contain a URL")?,
    };
    let path = match (c.system, kind) {
        (Source::Woocommerce, "pages") => "wp-json/wp/v2/pages".into(),
        (Source::Woocommerce, "reviews") => "wp-json/wc/v3/products/reviews".into(),
        (Source::Woocommerce, "categories") => "wp-json/wc/v3/products/categories".into(),
        (Source::Woocommerce, "products" | "customers" | "orders" | "coupons") => {
            format!("wp-json/wc/v3/{kind}")
        }
        (Source::Prestashop, "products" | "customers" | "orders" | "categories") => {
            format!("api/{kind}")
        }
        (Source::Prestashop, "pages") => "api/content_management_system".into(),
        (Source::Prestashop, "coupons") => "api/cart_rules".into(),
        (Source::Magento2, "products" | "orders") => format!("rest/V1/{kind}"),
        (Source::Magento2, "customers") => "rest/V1/customers/search".into(),
        (Source::Magento2, "categories") => "rest/V1/categories/list".into(),
        (Source::Magento2, "pages") => "rest/V1/cmsPage/search".into(),
        (Source::Shopware5, "products") => "api/articles".into(),
        (Source::Shopware5, "customers" | "orders" | "categories") => format!("api/{kind}"),
        _ => return Err(
            "unsupported direct API domain; use the source export profile and review its coverage"
                .into(),
        ),
    };
    let client = transport::client(&c.origin, fixture).await?;
    let mut u = reqwest::Url::parse(&format!("{}/{path}", c.origin.trim_end_matches('/')))
        .map_err(|_| "invalid fixed source path")?;
    match c.system {
        Source::Woocommerce => {
            u.query_pairs_mut()
                .append_pair("page", &page.to_string())
                .append_pair("per_page", "50")
                .append_pair("orderby", "id")
                .append_pair("order", "asc");
        }
        Source::Prestashop => {
            u.query_pairs_mut()
                .append_pair("output_format", "JSON")
                .append_pair("display", "full")
                .append_pair("sort", "[id_ASC]")
                .append_pair("limit", &format!("{},50", (page - 1) * 50));
        }
        Source::Magento2 => {
            u.query_pairs_mut()
                .append_pair("searchCriteria[currentPage]", &page.to_string())
                .append_pair("searchCriteria[pageSize]", "50")
                .append_pair("searchCriteria[sortOrders][0][field]", "entity_id")
                .append_pair("searchCriteria[sortOrders][0][direction]", "ASC");
        }
        Source::Shopware5 => {
            u.query_pairs_mut()
                .append_pair("start", &((page - 1) * 50).to_string())
                .append_pair("limit", "50");
        }
        _ => {}
    }
    let request = client.get(u);
    let request = match c.system {
        Source::Prestashop => request.basic_auth(&c.token, Some("")),
        Source::Shopware5 => request.basic_auth(&c.username, Some(&c.token)),
        Source::Woocommerce if !c.username.is_empty() => {
            request.basic_auth(&c.username, Some(&c.token))
        }
        _ => request.bearer_auth(&c.token),
    };
    let (value, headers) = transport::json(request).await?;
    let mut list = if let Some(xs) = value.as_array() {
        xs.clone()
    } else {
        value
            .get("items")
            .or_else(|| value.get("data"))
            .or_else(|| value.get(kind))
            .or_else(|| match kind {
                "pages" => value.get("content_management_system"),
                "coupons" => value.get("cart_rules"),
                _ => None,
            })
            .and_then(Value::as_array)
            .cloned()
            .ok_or("source page shape differs from API profile; cursor not advanced")?
    };
    if list.len() > 50 {
        return Err("source ignored requested page limit".into());
    }
    let more = if let Some(n) = headers
        .get("x-wp-totalpages")
        .and_then(|v| v.to_str().ok())
        .and_then(|n| n.parse::<u32>().ok())
    {
        page < n
    } else if let Some(n) = value
        .get("total_count")
        .or_else(|| value.get("total"))
        .and_then(Value::as_u64)
    {
        u64::from(page) * 50 < n
    } else {
        list.len() == 50
    };
    if c.system == Source::Woocommerce && kind == "products" {
        super::woo::enrich(c, &mut list, fixture).await?;
    }
    finish(
        c,
        source_id,
        kind,
        list,
        more.then(|| format!("page:{}", page + 1)),
    )
}
pub fn finish(
    c: &config::Connection,
    id: &str,
    kind: &str,
    values: Vec<Value>,
    cursor: Option<String>,
) -> Result<Value> {
    let context = Context {
        source: c.system,
        shop: c.origin.trim_end_matches('/').into(),
        currency: c.currency.clone(),
        scale: c.scale,
        locale: c.locale.clone(),
        languages: c.languages.clone(),
        timezone: c.timezone.clone(),
    };
    let mut records = vec![];
    let mut bytes = 0;
    for row in &values {
        for record in adapters::normalize(&context, kind, row)? {
            bytes += serde_json::to_vec(&record)
                .map_err(|_| "Invalid normalized record")?
                .len();
            if bytes > 8 * 1024 * 1024 {
                return Err("Expanded source page exceeds 8 MiB; narrow the export".into());
            }
            records.push(record);
        }
    }
    Ok(
        serde_json::json!({"source":c.system,"sourceName":c.system.name(),"sourceId":id,"sourceVersion":c.version,"adapterVersion":1,"kind":kind,"recordDigests":records.iter().map(Record::digest).collect::<Vec<_>>(),"sourceKeys":records.iter().map(|r|r.identity("source-snapshot")).collect::<Vec<_>>(),"records":records,"nextCursor":cursor,"pageComplete":true,"snapshotConsistent":false,"cutoverReady":false}),
    )
}
