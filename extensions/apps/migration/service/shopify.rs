//! Shopify GraphQL preserves scope errors and nested pagination instead of dropping undisclosed records.
use super::*;
pub async fn page(
    c: &config::Connection,
    id: &str,
    kind: &str,
    cursor: Option<&str>,
    fixture: bool,
) -> Result<Value> {
    if cursor
        .is_some_and(|s| s.len() > 1000 || s.contains("://") || s.chars().any(char::is_control))
    {
        return Err("invalid Shopify cursor".into());
    }
    let (connection,fields)=match kind {
        "products"=>("products","id title descriptionHtml variants(first:100){nodes{id title sku price selectedOptions{name value} inventory_quantity:inventoryQuantity} pageInfo{hasNextPage}} images(first:100){nodes{url altText} pageInfo{hasNextPage}}"),
        "customers"=>("customers","id email first_name:firstName last_name:lastName default_address:defaultAddress{address1 address2 city countryCodeV2 provinceCode zip company}"),
        "orders"=>("orders","id name currency:currencyCode totalPriceSet{shopMoney{amount currencyCode}} financial_status:displayFinancialStatus fulfillment_status:displayFulfillmentStatus created_at:createdAt customer{id} lineItems(first:100){nodes{id title quantity originalUnitPriceSet{shopMoney{amount currencyCode}}} pageInfo{hasNextPage}}"),
        "pages"=>("pages","id title handle body_html:body"),
        "categories"=>("collections","id title handle descriptionHtml"),
        _=>return Err("unsupported Shopify direct domain; use an explicit app export for reviews, discounts or custom data".into())
    };
    if c.version.len() != 7
        || !c.version.bytes().enumerate().all(|(i, b)| {
            if i == 4 {
                b == b'-'
            } else {
                b.is_ascii_digit()
            }
        })
    {
        return Err("Shopify API version must be explicitly pinned as YYYY-MM".into());
    }
    let client = transport::client(&c.origin, fixture).await?;
    let query = format!(
        "query MigrationPage($after:String){{{connection}(first:50,after:$after){{nodes{{{fields}}} pageInfo{{hasNextPage endCursor}}}}}}"
    );
    let (value, _) = transport::json(
        client
            .post(format!(
                "{}/admin/api/{}/graphql.json",
                c.origin.trim_end_matches('/'),
                c.version
            ))
            .header("X-Shopify-Access-Token", &c.token)
            .json(&serde_json::json!({"query":query,"variables":{"after":cursor}})),
    )
    .await?;
    if value
        .get("errors")
        .and_then(Value::as_array)
        .is_some_and(|xs| !xs.is_empty())
    {
        return Err("Shopify rejected fields or access scope; check protected customer/all-order access before retrying".into());
    }
    let data = &value["data"][connection];
    let mut nodes = data["nodes"]
        .as_array()
        .cloned()
        .ok_or("Shopify profile returned no node connection")?;
    if nodes.len() > 50 {
        return Err("Shopify page exceeded requested limit".into());
    }
    for n in &mut nodes {
        for nested in ["variants", "images", "lineItems"] {
            if n[nested]["pageInfo"]["hasNextPage"] == true {
                return Err(format!(
                    "Shopify nested {nested} exceeds this page profile; use a bulk export, no record was dropped"
                ));
            }
        }
        if kind == "orders" {
            n["total_price"] = n["totalPriceSet"]["shopMoney"]["amount"].clone();
            n["line_items"] = n["lineItems"]["nodes"].clone();
        }
    }
    let next = if data["pageInfo"]["hasNextPage"] == true {
        Some(
            data["pageInfo"]["endCursor"]
                .as_str()
                .filter(|s| !s.is_empty() && Some(*s) != cursor)
                .ok_or("Shopify cursor did not advance")?
                .into(),
        )
    } else {
        None
    };
    extract::finish(c, id, kind, nodes, next)
}
