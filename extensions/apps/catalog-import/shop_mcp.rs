//! Read-only Shop MCP catalogue connector. Never calls foreign carts, checkout, account, wallet or purchase tools.
use super::*;
pub(crate) async fn prepare(
    query: &str,
    shop: Option<&str>,
    count: usize,
    settings: &commerce::Settings,
) -> Result<Vec<Draft>> {
    if query.trim().is_empty() || query.len() > 2000 {
        return Err(bad("A bounded product search is required"));
    }
    let mut catalog = json!({"query":query,"context":{"currency":settings.currencies.base_currency},"pagination":{"limit":count}});
    catalog["context"]["language"] = json!(settings.main_locale);
    if let Some(country) = settings.countries.first() {
        catalog["context"]["address_country"] = json!(country);
    }
    if let Some(shop) = shop.filter(|s| !s.is_empty()) {
        if shop.len() > 253
            || !shop.contains('.')
            || !shop
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'.' | b'-'))
        {
            return Err(bad(
                "Shop filter must be a domain without credentials or a path",
            ));
        }
        catalog["filters"] = json!({"shops":[shop]});
    }
    let url = reqwest::Url::parse("https://mcp.shop.com/").unwrap();
    let client = public_client(&url).await?;
    let mut response=client.post(url).header("Accept","application/json, text/event-stream").header("MCP-Protocol-Version","2026-07-28").header("Mcp-Method","tools/call").header("Mcp-Name","search_catalog").json(&json!({"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_catalog","arguments":{"catalog":catalog},"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientInfo":{"name":"veyndo-catalog-import","version":"1.0.0"},"io.modelcontextprotocol/clientCapabilities":{}}}})).send().await.map_err(|_|bad("Shop catalogue is unavailable; retry explicitly or upload an export"))?;
    if !response.status().is_success() || response.content_length().is_some_and(|n| n > 1_000_000) {
        return Err(bad(
            "Shop catalogue returned an unsuccessful or oversized response",
        ));
    }
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| bad("Shop catalogue read failed"))?
    {
        if bytes.len() + chunk.len() > 1_000_000 {
            return Err(bad("Shop catalogue exceeds 1 MB"));
        }
        bytes.extend_from_slice(&chunk);
    }
    let document: Value =
        serde_json::from_slice(&bytes).map_err(|_| bad("Shop catalogue returned invalid JSON"))?;
    parse(&document, count, &settings.currencies.base_currency)
}
fn parse(document: &Value, count: usize, currency: &str) -> Result<Vec<Draft>> {
    if document.get("error").is_some() || document["result"]["isError"] == true {
        return Err(bad("Shop catalogue rejected the search"));
    }
    let content = &document["result"]["structuredContent"];
    if content["messages"]
        .as_array()
        .is_some_and(|messages| messages.iter().any(|m| m["type"] == "warning"))
    {
        return Err(bad(
            "Shop catalogue returned warnings; review directly with the supplier or upload an export",
        ));
    }
    let products = content["products"]
        .as_array()
        .filter(|v| !v.is_empty() && v.len() <= count)
        .ok_or(bad("No bounded Shop catalogue result"))?;
    products.iter().map(|product|{
        let variant=product["variants"].as_array().and_then(|v|v.first()).ok_or(bad("Shop result has no priced variant"))?;
        if variant["price"]["currency"]!=currency {return Err(bad("Supplier price currency differs from the Veyndo shop; upload explicitly converted prices instead"));}
        let minor=variant["price"]["amount"].as_i64().filter(|n|*n>=0).ok_or(bad("Invalid supplier price"))?;
        let scale=crate::currencies::scale(currency).ok_or(bad("Unknown supplier currency"))?;
        let external_id=variant["id"].as_str().filter(|s|!s.is_empty() && s.len()<=500).ok_or(bad("Supplier variant identity required"))?;
        let url=variant["url"].as_str().filter(|s|s.len()<=2000).ok_or(bad("Supplier product URL required"))?;
        let title=product["title"].as_str().unwrap_or_default();
        let labels=variant["options"].as_array().filter(|v|v.len()<=10).map(|v|v.iter().filter_map(|o|o["label"].as_str()).filter(|v|*v!="Default Title").collect::<Vec<_>>()).unwrap_or_default();
        let name=if labels.is_empty(){title.to_owned()}else{format!("{title} · {}",labels.join(" / "))};
        let draft=Draft{name,description:plain(product["description"]["plain"].as_str().unwrap_or_default()),price:minor as f64/10_f64.powi(scale as i32),product_number:format!("SHOP-{}",&hash(external_id)[..16]),image_url:product["media"][0]["url"].as_str().unwrap_or_default().into(),source:Some(Source{provider:"shop_mcp".into(),external_id:external_id.into(),url:url.into()})};
        draft.validate()?; Ok(draft)
    }).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    fn result(currency: &str) -> Value {
        json!({"result":{"structuredContent":{"products":[{"title":"Filter","description":{"plain":"<p>Ceramic</p><script>steal()</script>"},"media":[],"variants":[{"id":"variant-1","url":"https://supplier.example/products/filter?variant=1","options":[{"name":"Color","label":"Blue"}],"price":{"amount":1299,"currency":currency}}]}]}}})
    }
    #[test]
    fn imports_one_selected_variant_and_rejects_currency_error_and_credential_urls() {
        let draft = parse(&result("EUR"), 2, "EUR").unwrap().remove(0);
        assert_eq!(draft.name, "Filter · Blue");
        assert_eq!(draft.description, "Ceramic");
        assert_eq!(draft.price, 12.99);
        assert!(parse(&result("USD"), 2, "EUR").is_err());
        assert!(parse(&json!({"error":{"message":"unavailable"}}), 2, "EUR").is_err());
        let mut bad_url = result("EUR");
        bad_url["result"]["structuredContent"]["products"][0]["variants"][0]["url"] =
            json!("https://user:secret@supplier.example/product");
        assert!(parse(&bad_url, 2, "EUR").is_err());
        assert!(parse(&result("EUR"), 0, "EUR").is_err());
    }
}
