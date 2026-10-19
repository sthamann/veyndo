//! Shopware list summaries omit historical positions and addresses; bounded detail reads retain original identity.
use super::*;
pub async fn enrich(
    c: &config::Connection,
    kind: &str,
    rows: &mut [Value],
    fixture: bool,
) -> Result<()> {
    if !["customers", "orders"].contains(&kind) {
        return Err("Unsupported Shopware detail resource".into());
    }
    let client = transport::client(&c.origin, fixture).await?;
    let mut bytes = rows.iter().map(|row| row.to_string().len()).sum::<usize>();
    for start in (0..rows.len()).step_by(4) {
        let mut tasks = tokio::task::JoinSet::new();
        for (offset, row) in rows[start..rows.len().min(start + 4)].iter().enumerate() {
            let id = row["id"]
                .as_u64()
                .filter(|n| *n > 0)
                .ok_or("Shopware summary needs a positive original identity")?;
            let c = c.clone();
            let client = client.clone();
            let kind = kind.to_owned();
            tasks.spawn(async move {
                let request = client.get(format!(
                    "{}/api/{kind}/{id}",
                    c.origin.trim_end_matches('/')
                ));
                let request = if c.username.is_empty() {
                    request.bearer_auth(&c.token)
                } else {
                    request.basic_auth(&c.username, Some(&c.token))
                };
                let (value, _) = transport::json(request).await?;
                let data = &value["data"];
                if value["success"] == false || !data.is_object() || data["id"].as_u64() != Some(id)
                {
                    return Err(
                        "Shopware detail identity differs from its summary; no cursor advanced"
                            .into(),
                    );
                }
                Ok::<_, String>((start + offset, data.clone()))
            });
        }
        while let Some(result) = tasks.join_next().await {
            let (index, row) =
                result.map_err(|_| "Source detail read interrupted; no cursor advanced")??;
            bytes = bytes.saturating_sub(rows[index].to_string().len()) + row.to_string().len();
            if bytes > 8 * 1024 * 1024 {
                return Err("Expanded historical page exceeds 8 MiB; narrow the export".into());
            }
            rows[index] = row;
        }
    }
    Ok(())
}
