//! Read-only Shopware Admin OAuth/search intake; currency and language are resolved explicitly before product paging.
use super::*;
pub async fn page(
    c: &config::Connection,
    id: &str,
    kind: &str,
    cursor: Option<&str>,
    fixture: bool,
) -> Result<Value> {
    if kind != "products" {
        return Err("Shopware 6 direct intake currently supports products; use a reviewed export for other domains".into());
    }
    let page = match cursor {
        None => 1,
        Some(s) => s
            .strip_prefix("page:")
            .and_then(|n| n.parse::<u32>().ok())
            .filter(|n| *n > 0 && *n <= 1000000)
            .ok_or("Invalid Shopware page cursor")?,
    };
    if c.username.is_empty() || c.token.is_empty() {
        return Err("Shopware integration access ID and secret required".into());
    }
    let client = transport::client(&c.origin, fixture).await?;
    let base = c.origin.trim_end_matches('/');
    let (auth, _) = transport::json(client.post(format!("{base}/api/oauth/token")).json(
        &json!({"grant_type":"client_credentials","client_id":c.username,"client_secret":c.token}),
    ))
    .await?;
    let token = auth["access_token"]
        .as_str()
        .filter(|s| !s.is_empty())
        .ok_or("Shopware access token missing")?;
    let currency = lookup(&client, base, token, "currency", "isoCode", &c.currency).await?;
    let language = lookup(&client, base, token, "language", "locale.code", &c.locale).await?;
    let criteria = json!({"limit":50,"page":page,"total-count-mode":1,"sort":[{"field":"id","order":"ASC"}],"associations":{"media":{"associations":{"media":{}}},"categories":{},"options":{"associations":{"group":{}}},"tax":{}}});
    let (value, _) = transport::json(
        client
            .post(format!("{base}/api/search/product"))
            .bearer_auth(token)
            .header("sw-language-id", language)
            .header("sw-inheritance", "1")
            .json(&criteria),
    )
    .await?;
    let mut rows = value["data"]
        .as_array()
        .cloned()
        .ok_or("Shopware search must return data rows")?;
    let total = value["total"]
        .as_u64()
        .ok_or("Shopware search total missing")?;
    if rows.len() as u64 != total.saturating_sub(u64::from(page - 1) * 50).min(50)
        || rows.len() > 50
        || (page > 1 && u64::from(page - 1) * 50 >= total)
    {
        return Err("Shopware page counts changed; cursor not advanced".into());
    }
    for row in &mut rows {
        let prices = row["price"]
            .as_array()
            .ok_or("Shopware product price inheritance unresolved")?;
        let selected = prices
            .iter()
            .filter(|p| p["currencyId"] == currency)
            .collect::<Vec<_>>();
        if selected.len() != 1 || selected[0]["gross"].is_null() {
            return Err("Shopware product needs one explicit price in the selected currency; no implicit FX".into());
        }
        row["_veyndoPrice"] = selected[0]["gross"].clone();
    }
    extract::finish(
        c,
        id,
        kind,
        rows,
        (u64::from(page) * 50 < total).then(|| format!("page:{}", page + 1)),
    )
}
async fn lookup(
    client: &reqwest::Client,
    base: &str,
    token: &str,
    entity: &str,
    field: &str,
    value: &str,
) -> Result<String> {
    let (v, _) = transport::json(
        client
            .post(format!("{base}/api/search/{entity}"))
            .bearer_auth(token)
            .json(&json!({"limit":2,"filter":[{"type":"equals","field":field,"value":value}]})),
    )
    .await?;
    let rows = v["data"]
        .as_array()
        .filter(|r| r.len() == 1)
        .ok_or("Shopware language/currency mapping must resolve uniquely")?;
    rows[0]["id"]
        .as_str()
        .filter(|s| s.len() == 32 && s.bytes().all(|b| b.is_ascii_hexdigit()))
        .map(str::to_owned)
        .ok_or("Invalid Shopware language/currency ID".into())
}
