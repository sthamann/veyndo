//! Source-neutral category intake preserves stable hierarchy and uses the revisioned native category owner privately.
use super::*;
pub(super) async fn import(
    a: &App,
    h: &RequestContext,
    r: &SourceRecord,
    options: &Value,
) -> Result<Value> {
    auth::permit(h, "catalog.write")?;
    let t = merchant(a, h)?;
    if staging::parent(a, &t).await?.is_none() {
        return Err(bad("Category migration requires a private preview"));
    }
    let namespace = super::identity_namespace(a, &t).await?;
    let id = r.identity(&namespace);
    let digest = hash(&json!({"record":r,"options":options}).to_string());
    if let Some(data) =
        sqlx::query_scalar::<_, Value>("SELECT data FROM categories WHERE tenant=$1 AND id=$2")
            .bind(&t)
            .bind(&id)
            .fetch_optional(&a.db)
            .await?
    {
        if data["importSource"]["digest"] == digest {
            return Ok(json!({"id":id,"replayed":true}));
        }
        return Err(conflict(
            "Source category already has a different reviewed snapshot",
        ));
    }
    let (settings, _) = commerce::config(a, &t).await?;
    let names = r.data["title"]
        .as_object()
        .ok_or(bad("Translated category names required"))?;
    let translations:serde_json::Map<String,Value>=names.iter().map(|(locale,name)|(commerce::product_language_key(locale,&settings),json!({"name":name,"description":r.data["body"][locale],"slug":r.data["slug"][locale]}))).collect();
    let parent = r
        .data
        .get("parentSourceId")
        .filter(|v| !v.is_null())
        .map(|v| {
            v.as_str()
                .ok_or(bad("Category source parent must be text"))
                .and_then(|id| super::relations::identity(r, &namespace, "categories", id))
        })
        .transpose()?;
    let payload = json!({"revision":0,"parentId":parent,"position":0,"data":{"active":true,"visible":true,"type":"page","translations":translations,"importSource":{"digest":digest,"source":r.source,"shop":r.source_shop,"id":r.source_id}}});
    let Json(value) = crate::categories::import(a.clone(), h.clone(), id, payload).await?;
    Ok(json!({"id":value["id"],"replayed":false}))
}
