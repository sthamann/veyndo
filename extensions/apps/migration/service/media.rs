//! Source media descriptors remain app-owned; review freezes bounded image digests and imports refetch identical bytes without forwarding source credentials.
use super::*;
use sha2::Digest;
pub fn descriptors(mut page: Value, fixture: bool) -> Result<Value> {
    let products = page["records"]
        .as_array()
        .ok_or("Source products missing")?;
    let mut records = vec![];
    for product in products {
        if !product["data"]["parentSourceId"].is_null() {
            continue;
        }
        let value = &product["data"]["sourceImages"];
        if value.is_null() {
            continue;
        }
        let images = value
            .as_array()
            .or_else(|| value["nodes"].as_array())
            .ok_or("Source image collection needs an explicit image profile before migration")?;
        if images.len() > 20 {
            return Err("Source product exceeds 20 images; review its image profile".into());
        }
        for (position, image) in images.iter().enumerate() {
            let url = field(image, &["src", "url", "originalSrc", "path", "media.path"]);
            let url = url
                .as_str()
                .ok_or("Source image needs an explicit public URL mapping before migration")?;
            image_url(url, fixture)?;
            let mut record = product.clone();
            record["kind"] = json!("assets");
            record["sourceId"] = json!(format!(
                "image:{:x}",
                sha2::Sha256::digest(format!("{}:{position}", product["sourceId"]).as_bytes())
            ));
            record["data"] = json!({"productSourceId":product["sourceId"],"url":url,"title":product["data"]["name"],"position":position});
            records.push(record);
        }
    }
    page["records"] = json!(records);
    page["kind"] = json!("assets");
    refresh(&mut page)?;
    Ok(page)
}
fn image_url(raw: &str, fixture: bool) -> Result<reqwest::Url> {
    let u = reqwest::Url::parse(raw).map_err(|_| "Invalid source image URL")?;
    if u.fragment().is_some()
        || u.query_pairs().any(|(k, v)| {
            !matches!(k.as_ref(), "v" | "width" | "height" | "quality" | "format")
                || v.len() > 32
                || !v.bytes().all(|b| b.is_ascii_alphanumeric())
        })
    {
        return Err("Source image URL contains unsupported signed/query parameters; use an explicit image export".into());
    }
    let mut origin = u.clone();
    origin.set_query(None);
    origin.set_path("/");
    transport::admit_url(origin.as_str(), fixture)?;
    Ok(u)
}
pub async fn bytes(record: &Value, fixture: bool) -> Result<(Vec<u8>, String)> {
    let raw = record["data"]["url"]
        .as_str()
        .ok_or("Source image URL missing")?;
    let u = image_url(raw, fixture)?;
    let mut origin = u.clone();
    origin.set_query(None);
    origin.set_path("/");
    let client = transport::client(origin.as_str(), fixture).await?;
    // Deliberately no source token, cookies or proxy. CDN access is public and separately pinned.
    let mut response = client
        .get(u)
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
        .map_err(|_| "Source image unavailable; retry this exact review")?;
    if !response.status().is_success() {
        return Err("Source image rejected; no image was imported".into());
    }
    let mime = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|h| h.to_str().ok())
        .unwrap_or("")
        .split(';')
        .next()
        .unwrap_or("")
        .to_owned();
    if !["image/png", "image/jpeg", "image/webp"].contains(&mime.as_str()) {
        return Err("Source image must be PNG, JPEG or WebP".into());
    }
    if response
        .content_length()
        .is_some_and(|n| n > 8 * 1024 * 1024)
    {
        return Err("Source image exceeds 8 MiB".into());
    }
    let mut bytes = vec![];
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| "Source image interrupted")?
    {
        if bytes.len() + chunk.len() > 8 * 1024 * 1024 {
            return Err("Source image exceeds 8 MiB".into());
        }
        bytes.extend_from_slice(&chunk);
    }
    if bytes.is_empty() {
        return Err("Source image is empty".into());
    }
    Ok((bytes, mime))
}
pub async fn prepare(page: &mut Value, fixture: bool) -> Result<()> {
    let mut pending = tokio::task::JoinSet::new();
    let rows = page["records"].as_array().ok_or("Source images missing")?;
    for (index, row) in rows.iter().cloned().enumerate() {
        pending.spawn(async move {
            let (bytes, mime) = bytes(&row, fixture).await?;
            let digest = format!("{:x}", sha2::Sha256::digest(&bytes));
            let ext = match mime.as_str() {
                "image/png" => "png",
                "image/jpeg" => "jpg",
                _ => "webp",
            };
            let mut row = row;
            row["data"]["byteLength"] = json!(bytes.len());
            row["data"]["digest"] = json!(digest);
            row["data"]["mime"] = json!(mime);
            row["data"]["filename"] = json!(format!(
                "source-{}.{ext}",
                row["data"]["position"]
                    .as_u64()
                    .ok_or("Source image position missing")?
            ));
            Ok::<_, String>((index, row))
        });
    }
    let mut rows = rows.clone();
    while let Some(value) = pending.join_next().await {
        let (index, row) = value.map_err(|_| "Source image review interrupted")??;
        rows[index] = row;
    }
    page["records"] = json!(rows);
    refresh(page)
}
fn refresh(page: &mut Value) -> Result<()> {
    let records = page["records"]
        .as_array()
        .ok_or("Source image records missing")?;
    page["recordDigests"] = json!(
        records
            .iter()
            .map(|r| format!("{:x}", sha2::Sha256::digest(r.to_string())))
            .collect::<Vec<_>>()
    );
    page["sourceKeys"] = json!(
        page["records"]
            .as_array()
            .unwrap()
            .iter()
            .map(|r| r["sourceId"].clone())
            .collect::<Vec<_>>()
    );
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn unsupported_image_collections_cannot_look_like_an_empty_success() {
        let page =
            |images: Value| json!({"records":[{"sourceId":"p","data":{"sourceImages":images}}]});
        assert!(descriptors(page(json!({"privateCollection":"hidden"})), false).is_err());
        assert_eq!(
            descriptors(page(json!({"nodes":[]})), false).unwrap()["records"],
            json!([])
        );
        assert_eq!(
            descriptors(page(Value::Null), false).unwrap()["records"],
            json!([])
        );
    }
}
