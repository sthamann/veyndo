//! PrestaShop keeps address/country/currency references separate; resolve exact owned records before normalization.
use super::*;
fn id(value: &Value) -> Result<u64> {
    contract::text(value)
        .parse::<u64>()
        .ok()
        .filter(|n| *n > 0)
        .ok_or("PrestaShop reference needs a positive original ID".into())
}
async fn get(
    c: &config::Connection,
    client: &reqwest::Client,
    resource: &str,
    key: u64,
) -> Result<Value> {
    let (value, _) = transport::json(
        client
            .get(format!(
                "{}/api/{resource}/{key}",
                c.origin.trim_end_matches('/')
            ))
            .query(&[("output_format", "JSON")])
            .basic_auth(&c.token, Some("")),
    )
    .await?;
    let singular = match resource {
        "addresses" => "address",
        "countries" => "country",
        "currencies" => "currency",
        "states" => "state",
        _ => return Err("Unsupported PrestaShop reference resource".into()),
    };
    let row = &value[singular];
    if !row.is_object() || id(&row["id"])? != key {
        return Err("PrestaShop reference identity differs; no cursor advanced".into());
    }
    Ok(row.clone())
}
async fn address(
    c: &config::Connection,
    client: &reqwest::Client,
    mut row: Value,
    customer: u64,
) -> Result<Value> {
    if id(&row["id_customer"])? != customer {
        return Err("PrestaShop address belongs to another source customer".into());
    }
    let country = get(c, client, "countries", id(&row["id_country"])?).await?;
    row["country_code"] = country["iso_code"].clone();
    if !row["id_state"].is_null() && contract::text(&row["id_state"]) != "0" {
        let state = get(c, client, "states", id(&row["id_state"])?).await?;
        if state["id_country"] != row["id_country"]
            && id(&state["id_country"])? != id(&row["id_country"])?
        {
            return Err("PrestaShop state differs from address country".into());
        }
        row["provinceCode"] = state["iso_code"].clone();
    }
    Ok(row)
}
async fn enrich_one(
    c: &config::Connection,
    client: &reqwest::Client,
    kind: &str,
    mut row: Value,
) -> Result<Value> {
    if kind == "orders" {
        let currency = get(c, client, "currencies", id(&row["id_currency"])?).await?;
        if currency["iso_code"].as_str() != Some(c.currency.as_str()) {
            return Err("PrestaShop order currency differs from selected source currency".into());
        }
        if !currency["precision"].is_null()
            && contract::text(&currency["precision"]) != c.scale.to_string()
        {
            return Err("PrestaShop currency precision differs from reviewed source scale".into());
        }
        let customer = id(&row["id_customer"])?;
        for (reference, field) in [
            ("id_address_invoice", "billing_address"),
            ("id_address_delivery", "shipping_address"),
        ] {
            let value = get(c, client, "addresses", id(&row[reference])?).await?;
            row[field] = address(c, client, value, customer).await?;
        }
    } else if kind == "customers" {
        let customer = id(&row["id"])?;
        let (value, _) = transport::json(
            client
                .get(format!("{}/api/addresses", c.origin.trim_end_matches('/')))
                .query(&[
                    ("output_format", "JSON".to_owned()),
                    ("display", "full".into()),
                    ("filter[id_customer]", format!("[{customer}]")),
                    ("filter[deleted]", "[0]".into()),
                    ("sort", "[id_ASC]".into()),
                    ("limit", "0,51".into()),
                ])
                .basic_auth(&c.token, Some("")),
        )
        .await?;
        let addresses = value["addresses"]
            .as_array()
            .filter(|xs| xs.len() <= 50)
            .ok_or("PrestaShop address book is incomplete or exceeds 50 entries")?;
        let mut resolved = vec![];
        let mut identities = std::collections::HashSet::new();
        for value in addresses {
            if !identities.insert(id(&value["id"])?)
                || (!value["deleted"].is_null() && contract::text(&value["deleted"]) != "0")
            {
                return Err(
                    "PrestaShop returned duplicate or deleted addresses; no cursor advanced".into(),
                );
            }
            resolved.push(address(c, client, value.clone(), customer).await?);
        }
        row["addresses"] = json!(resolved);
    }
    Ok(row)
}
pub async fn enrich(
    c: &config::Connection,
    kind: &str,
    rows: &mut [Value],
    fixture: bool,
) -> Result<()> {
    let client = transport::client(&c.origin, fixture).await?;
    let mut bytes = rows.iter().map(|row| row.to_string().len()).sum::<usize>();
    for start in (0..rows.len()).step_by(4) {
        let mut tasks = tokio::task::JoinSet::new();
        for (offset, row) in rows[start..rows.len().min(start + 4)].iter().enumerate() {
            let (c, client, kind, row) = (c.clone(), client.clone(), kind.to_owned(), row.clone());
            tasks.spawn(async move {
                enrich_one(&c, &client, &kind, row)
                    .await
                    .map(|row| (start + offset, row))
            });
        }
        while let Some(result) = tasks.join_next().await {
            let (index, row) = result
                .map_err(|_| "PrestaShop reference read interrupted; no cursor advanced")??;
            bytes = bytes.saturating_sub(rows[index].to_string().len()) + row.to_string().len();
            if bytes > 8 * 1024 * 1024 {
                return Err("Expanded source history exceeds 8 MiB; narrow the export".into());
            }
            rows[index] = row;
        }
    }
    Ok(())
}
