//! Selected products publish before their image assets and in native parent-before-variant order, without copying stock.
use super::*;
pub(super) async fn publish(
    tx: &mut Tx<'_>,
    live: &str,
    current: &Value,
    keys: &[String],
) -> Result<()> {
    let mut remaining = keys
        .iter()
        .filter(|s| s.starts_with("product:"))
        .cloned()
        .collect::<Vec<_>>();
    while !remaining.is_empty() {
        let mut progressed = false;
        for key in remaining.clone() {
            let value = &current[&key];
            if let Some(parent) = value["parent_id"].as_str() {
                if remaining.iter().any(|k| k == &format!("product:{parent}")) {
                    continue;
                }
                let exists: bool = sqlx::query_scalar(
                    "SELECT EXISTS(SELECT 1 FROM products WHERE tenant=$1 AND id=$2)",
                )
                .bind(live)
                .bind(parent)
                .fetch_one(&mut **tx)
                .await?;
                if !exists {
                    return Err(conflict(
                        "Publish the variant's parent product in the same release first",
                    ));
                }
            }
            product_content(tx, live, value).await?;
            remaining.retain(|k| k != &key);
            progressed = true;
        }
        if !progressed {
            return Err(conflict("Selected product parents form a cycle"));
        }
    }
    Ok(())
}
