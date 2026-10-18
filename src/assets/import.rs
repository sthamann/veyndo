//! Immutable imported product images reuse the native asset table, product lock, byte validation and publication lifecycle.
use super::*;
pub(crate) async fn image(
    a: &App,
    h: &RequestContext,
    product: &str,
    id: &str,
    metadata: &Value,
    bytes: Vec<u8>,
) -> Result<Value> {
    let t = merchant(a, h)?;
    auth::permit(h, "catalog.write")?;
    let mime = metadata["mime"]
        .as_str()
        .filter(|m| ["image/png", "image/jpeg", "image/webp"].contains(m))
        .ok_or(bad("Imported image format unavailable"))?;
    super::upload::validate_bytes(mime, &bytes)?;
    let filename = metadata["filename"]
        .as_str()
        .filter(|n| !n.is_empty() && n.len() <= 180 && !n.contains(['/', '\\', '\r', '\n', '"']))
        .ok_or(bad("Invalid imported image filename"))?;
    let (settings, _) = commerce::config(a, &t).await?;
    commerce::validate_names(&metadata["title"], &settings, 200)?;
    let digest = format!("{:x}", Sha256::digest(&bytes));
    if metadata["digest"] != digest {
        return Err(bad("Imported image digest differs"));
    }
    let mut tx = a.db.begin().await?;
    sqlx::query("SELECT id FROM products WHERE tenant=$1 AND id=$2 FOR UPDATE")
        .bind(&t)
        .bind(product)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or(bad("Import the referenced product before its images"))?;
    let previous =
        sqlx::query("SELECT product_id,digest,mime,filename,title,public FROM product_assets WHERE tenant=$1 AND id=$2")
            .bind(&t)
            .bind(id)
            .fetch_optional(&mut *tx)
            .await?;
    if let Some(previous) = previous {
        if previous.get::<String, _>("product_id") != product
            || previous.get::<String, _>("digest") != digest
            || previous.get::<String, _>("mime") != mime
            || previous.get::<String, _>("filename") != filename
            || previous.get::<Value, _>("title") != metadata["title"]
            || !previous.get::<bool, _>("public")
        {
            return Err(conflict(
                "Imported image identity already has different bytes",
            ));
        }
    } else {
        let count: i64 = sqlx::query_scalar(
            "SELECT count(*) FROM product_assets WHERE tenant=$1 AND product_id=$2",
        )
        .bind(&t)
        .bind(product)
        .fetch_one(&mut *tx)
        .await?;
        if count >= 50 {
            return Err(bad("Maximum 50 assets per product"));
        }
        sqlx::query("INSERT INTO product_assets(tenant,id,product_id,title,filename,mime,kind,public,content,digest) VALUES($1,$2,$3,$4,$5,$6,'attachment',true,$7,$8)").bind(&t).bind(id).bind(product).bind(&metadata["title"]).bind(filename).bind(mime).bind(bytes).bind(digest).execute(&mut *tx).await?;
    }
    tx.commit().await?;
    Ok(
        json!({"id":id,"url":format!("/store-api/assets/{id}?shop={t}"),"view":"","alt":metadata["title"]}),
    )
}
