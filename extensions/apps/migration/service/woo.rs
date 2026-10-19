//! Bounded parallel WooCommerce variant reads use fixed source paths, pinned transport and exact parent-declared IDs.
use super::*;
pub async fn enrich(c: &config::Connection, rows: &mut [Value], fixture: bool) -> Result<()> {
    let client = transport::client(&c.origin, fixture).await?;
    let indices = rows
        .iter()
        .enumerate()
        .filter(|(_, row)| row["type"] == "variable")
        .map(|(index, _)| index)
        .collect::<Vec<_>>();
    let mut bytes = rows.iter().map(|row| row.to_string().len()).sum::<usize>();
    for chunk in indices.chunks(4) {
        let mut tasks = tokio::task::JoinSet::new();
        for &index in chunk {
            let c = c.clone();
            let client = client.clone();
            let row = rows[index].clone();
            tasks.spawn(async move { fetch(&c, &client, row).await.map(|row| (index, row)) });
        }
        while let Some(result) = tasks.join_next().await {
            let (index, row) =
                result.map_err(|_| "Variation read interrupted; no source cursor advanced")??;
            bytes = bytes.saturating_sub(rows[index].to_string().len()) + row.to_string().len();
            if bytes > 8 * 1024 * 1024 {
                return Err(
                    "Expanded variation source page exceeds 8 MiB; narrow the export".into(),
                );
            }
            rows[index] = row;
        }
    }
    Ok(())
}
async fn fetch(c: &config::Connection, client: &reqwest::Client, mut row: Value) -> Result<Value> {
    let expected = adapters::woo::expected(&row)?;
    let parent = row["id"]
        .as_u64()
        .filter(|n| *n > 0)
        .ok_or("Invalid source parent identity")?;
    let pages = expected.len().div_ceil(50);
    let mut variants = vec![];
    for page in 1..=pages {
        let url = format!(
            "{}/wp-json/wc/v3/products/{parent}/variations",
            c.origin.trim_end_matches('/')
        );
        let request = client.get(url).query(&[
            ("page", page.to_string()),
            ("per_page", "50".into()),
            ("orderby", "id".into()),
            ("order", "asc".into()),
        ]);
        let request = if c.username.is_empty() {
            request.bearer_auth(&c.token)
        } else {
            request.basic_auth(&c.username, Some(&c.token))
        };
        let (value, headers) = transport::json(request).await?;
        if let Some(total) = headers.get("x-wp-totalpages") {
            let total = total
                .to_str()
                .ok()
                .and_then(|s| s.parse::<usize>().ok())
                .ok_or("Invalid variation page count")?;
            if total != pages {
                return Err("Variation page count changed; review the parent again".into());
            }
        }
        let values = value
            .as_array()
            .filter(|xs| xs.len() <= 50)
            .ok_or("Invalid bounded variation page")?;
        variants.extend(values.clone());
    }
    row["_migrationVariations"] = json!(variants);
    adapters::woo::variants(&row)?;
    Ok(row)
}
