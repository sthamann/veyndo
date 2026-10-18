//! Reviewed source image intake resolves its native product and delegates immutable binary storage and media edits to their existing owners.
use super::*;
use base64::{Engine as _, engine::general_purpose::STANDARD};
pub(super) async fn import(
    a: &App,
    h: &RequestContext,
    r: &SourceRecord,
    chunks: &Value,
) -> Result<Value> {
    auth::permit(h, "catalog.write")?;
    auth::permit(h, "catalog.read")?;
    let t = merchant(a, h)?;
    if staging::parent(a, &t).await?.is_none() {
        return Err(bad("Image migration requires a private preview"));
    }
    let chunks = chunks
        .as_array()
        .filter(|xs| !xs.is_empty() && xs.len() <= 172)
        .ok_or(bad("Bounded asset chunks required"))?;
    let mut encoded = String::new();
    for chunk in chunks {
        let s = chunk
            .as_str()
            .filter(|s| s.len() <= 65536)
            .ok_or(bad("Invalid asset chunk"))?;
        if encoded.len() + s.len() > 11_184_812 {
            return Err(bad("Imported image exceeds 8 MiB"));
        }
        encoded.push_str(s);
    }
    let bytes = STANDARD
        .decode(encoded)
        .map_err(|_| bad("Invalid asset encoding"))?;
    if bytes.is_empty()
        || bytes.len() > 8 * 1024 * 1024
        || r.data["byteLength"].as_u64() != Some(bytes.len() as u64)
        || r.data["digest"] != hash_bytes(&bytes)
    {
        return Err(bad("Image bytes differ from reviewed source digest"));
    }
    let namespace = super::identity_namespace(a, &t).await?;
    let product = super::relations::identity(
        r,
        &namespace,
        "products",
        r.data["productSourceId"]
            .as_str()
            .ok_or(bad("Source product required"))?,
    )?;
    let id = r.identity(&namespace);
    let position = r.data["position"]
        .as_u64()
        .filter(|p| *p < 20)
        .ok_or(bad("Reviewed source image position must be 0..19"))?;
    let group = hash(&json!([r.source, r.source_shop, r.data["productSourceId"]]).to_string());
    let mut media = crate::assets::import_image(a, h, &product, &id, &r.data, bytes).await?;
    media["importGroup"] = json!(group);
    media["importPosition"] = json!(position);
    let Json(mut editor) =
        commerce::product_editor(State(a.clone()), h.clone(), Path(product.clone())).await?;
    let items = editor["commerce"]["media"]
        .as_array_mut()
        .ok_or(bad("Native media unavailable"))?;
    if let Some(existing) = items.iter().find(|x| x["id"] == id) {
        if existing != &media {
            return Err(conflict(
                "Imported media association was edited; review it before continuing",
            ));
        }
        return Ok(json!({"id":id,"replayed":true}));
    }
    items.push(media);
    // Reorder only this source group's slots. Manual media retain their positions and content.
    let mut imported = items
        .iter()
        .filter(|m| m["importGroup"] == group)
        .cloned()
        .collect::<Vec<_>>();
    imported.sort_by_key(|m| m["importPosition"].as_u64().unwrap_or(u64::MAX));
    let mut ordered = imported.into_iter();
    for item in items.iter_mut().filter(|m| m["importGroup"] == group) {
        *item = ordered.next().unwrap();
    }
    // Omit stock so adding an image never restores a quantity observed before a concurrent native writer.
    editor["commerce"].as_object_mut().unwrap().remove("stock");
    let payload = json!({"revision":editor["revision"],"contentRevision":editor["contentRevision"],"translations":editor["translations"],"extra":editor["extra"],"catalog":editor["catalog"],"commerce":editor["commerce"]});
    let _ =
        commerce::edit_product(State(a.clone()), h.clone(), Path(product), Json(payload)).await?;
    Ok(json!({"id":id,"replayed":false}))
}
fn hash_bytes(bytes: &[u8]) -> String {
    use sha2::Digest;
    format!("{:x}", sha2::Sha256::digest(bytes))
}
