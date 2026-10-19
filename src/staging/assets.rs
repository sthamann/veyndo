//! Binary assets are immutable, staged independently through metadata/digest units; paid entitlements never clone.
use super::*;
pub(crate) async fn snapshot_assets(
    tx: &mut Tx<'_>,
    t: &str,
    result: &mut serde_json::Map<String, Value>,
) -> Result<()> {
    let rows=sqlx::query("SELECT to_jsonb(a)-'tenant'-'content'-'created_at' AS data FROM product_assets a WHERE tenant=$1 ORDER BY id FOR UPDATE").bind(t).fetch_all(&mut **tx).await?;
    for r in rows {
        let v: Value = r.get("data");
        result.insert(format!("asset:{}", v["id"].as_str().unwrap()), v);
    }
    Ok(())
}
pub(crate) async fn publish_asset(
    tx: &mut Tx<'_>,
    live: &str,
    stage: &str,
    id: &str,
) -> Result<()> {
    let product:Option<String>=sqlx::query_scalar("SELECT p.id FROM product_assets a JOIN products p ON p.tenant=$1 AND p.id=a.product_id WHERE a.tenant=$2 AND a.id=$3 FOR SHARE OF p").bind(live).bind(stage).bind(id).fetch_optional(&mut **tx).await?;
    if product.is_none() {
        return Err(conflict("Publish this asset together with its product"));
    }
    sqlx::query("INSERT INTO product_assets(tenant,id,product_id,title,filename,mime,kind,public,content,digest) SELECT $1,id,product_id,title,filename,mime,kind,public,content,digest FROM product_assets WHERE tenant=$2 AND id=$3 ON CONFLICT(tenant,id) DO UPDATE SET public=EXCLUDED.public,title=EXCLUDED.title").bind(live).bind(stage).bind(id).execute(&mut **tx).await?;
    Ok(())
}

/// A selected product must not publish an image URL whose private bytes were omitted from the same release.
pub(super) async fn validate_product_media(
    tx: &mut Tx<'_>,
    live: &str,
    keys: &[String],
) -> Result<()> {
    for id in keys.iter().filter_map(|s| s.strip_prefix("product:")) {
        let media: Value =
            sqlx::query_scalar("SELECT media FROM products WHERE tenant=$1 AND id=$2")
                .bind(live)
                .bind(id)
                .fetch_one(&mut **tx)
                .await?;
        for item in media
            .as_array()
            .ok_or(bad("Product media must be an array"))?
        {
            let Some(url) = item["url"]
                .as_str()
                .filter(|s| s.starts_with("/store-api/assets/"))
            else {
                continue;
            };
            let url = reqwest::Url::parse(&format!("https://local{url}"))
                .map_err(|_| bad("Invalid local asset URL"))?;
            let asset = url
                .path()
                .strip_prefix("/store-api/assets/")
                .filter(|s| !s.is_empty() && s.len() <= 100)
                .ok_or(bad("Invalid local asset identity"))?;
            let exists: Option<bool> = sqlx::query_scalar(
                "SELECT true FROM product_assets WHERE tenant=$1 AND id=$2 AND public AND kind='attachment' FOR SHARE",
            )
            .bind(live)
            .bind(asset)
            .fetch_optional(&mut **tx)
            .await?;
            if exists != Some(true) {
                return Err(conflict(&format!(
                    "Product {id} needs its image asset {asset}; include that asset in this release"
                )));
            }
        }
    }
    Ok(())
}
