//! Versioned generic review records resolve native product identity and preserve source claims outside native purchase authority.
use super::*;
pub(super) async fn import(a: &App, h: &RequestContext, r: &SourceRecord) -> Result<Value> {
    let t = merchant(a, h)?;
    if !r.data["sourceVerified"].is_null() && !r.data["sourceVerified"].is_boolean() {
        return Err(bad("Source verification claim must be boolean or null"));
    }
    let product = super::relations::identity(
        r,
        &t,
        "products",
        r.data["productSourceId"]
            .as_str()
            .ok_or(bad("Source product required"))?,
    )?;
    let source = json!({"version":r.version,"source":r.source,"sourceShop":r.source_shop,"sourceId":r.source_id,"recordDigest":hash(&json!(r).to_string()),"sourceVerified":r.data["sourceVerified"]});
    commerce::import_review(a, h, &r.identity(&t), &product, &r.data, &source).await
}
