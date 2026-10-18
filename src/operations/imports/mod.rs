//! Generic source-record admission; adapters own source formats, native domain owners retain every write.
use crate::*;
mod assets;
mod categories;
mod customers;
mod historical_orders;
mod products;
mod relations;
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct SourceRecord {
    pub version: u8,
    pub source: String,
    pub source_shop: String,
    pub kind: String,
    pub source_id: String,
    pub data: Value,
    pub warnings: Vec<String>,
}
impl SourceRecord {
    fn validate(&self) -> Result<()> {
        if self.version != 1
            || [&self.source, &self.source_shop, &self.source_id]
                .iter()
                .any(|s| s.is_empty() || s.len() > 200 || s.chars().any(char::is_control))
            || !self.data.is_object()
            || self.data.to_string().len() > 512 * 1024
            || self.warnings.len() > 20
        {
            return Err(bad("Invalid versioned import identity or record"));
        }
        Ok(())
    }
    pub(super) fn identity(&self, t: &str) -> String {
        use sha2::Digest;
        let bytes = sha2::Sha256::digest(
            serde_json::to_vec(&(
                t,
                &self.source,
                &self.source_shop,
                &self.kind,
                &self.source_id,
            ))
            .unwrap(),
        );
        let mut id = [0; 16];
        id.copy_from_slice(&bytes[..16]);
        Uuid::from_bytes(id).to_string()
    }
}
pub(super) async fn identity_namespace(a: &App, t: &str) -> Result<String> {
    Ok(staging::parent(a, t).await?.unwrap_or_else(|| t.into()))
}
pub(crate) fn schema(name: &str) -> Option<Value> {
    (name=="merchant.import.record").then(||json!({"type":"object","properties":{"assetChunks":{"type":"array","maxItems":172,"items":{"type":"string","maxLength":65536}},"approve":{"type":"boolean"},"record":{"type":"object","properties":{"version":{"type":"integer","enum":[1]},"source":{"type":"string","minLength":1,"maxLength":200},"sourceShop":{"type":"string","minLength":1,"maxLength":200},"kind":{"type":"string","enum":["products","categories","pages","customers","orders","assets"]},"sourceId":{"type":"string","minLength":1,"maxLength":200},"data":{"type":"object"},"warnings":{"type":"array","maxItems":20,"items":{"type":"string","maxLength":2000}}},"required":["version","source","sourceShop","kind","sourceId","data","warnings"],"additionalProperties":false},"options":{"type":"object","properties":{"channelId":{"type":"string","maxLength":100},"taxRate":{"type":"number","minimum":0,"maximum":50},"customerGroup":{"type":"string","maxLength":100},"locale":{"type":"string","maxLength":35},"destinationDigest":{"type":"string","minLength":64,"maxLength":64},"acknowledgedWarnings":{"type":"array","maxItems":20,"items":{"type":"string","maxLength":2000}}},"additionalProperties":false}},"required":["approve","record","options"],"additionalProperties":false}))
}
pub(crate) async fn route(
    State(a): State<App>,
    h: RequestContext,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    invoke(&a, &h, &v).await.map(Json)
}
pub(crate) async fn invoke(a: &App, h: &RequestContext, v: &Value) -> Result<Value> {
    merchant(a, h)?;
    auth::permit(h, "apps.manage")?;
    // Binary chunks have the existing asset byte budget, separate from the unchanged 64 KiB native metadata budget.
    let mut metadata = v.clone();
    metadata
        .as_object_mut()
        .ok_or(bad("Import object required"))?
        .remove("assetChunks");
    apps::validate_native_input(&schema("merchant.import.record").unwrap(), &metadata)?;
    if v.get("assetChunks").is_some() && v["record"]["kind"] != "assets" {
        return Err(bad("Binary import requires an asset record"));
    }
    if v["approve"] != true {
        return Err(bad("Review and explicitly approve the source record"));
    }
    let record: SourceRecord =
        serde_json::from_value(v["record"].clone()).map_err(|_| bad("Invalid source record"))?;
    record.validate()?;
    if !record.warnings.is_empty() && v["options"]["acknowledgedWarnings"] != json!(record.warnings)
    {
        return Err(bad("Review all source limitations before importing"));
    }
    match record.kind.as_str() {
        "assets" => assets::import(a, h, &record, &v["assetChunks"]).await,
        "pages" => {
            apps::import_record(
                a,
                h,
                &record.identity(&identity_namespace(a, &merchant(a, h)?).await?),
                &record.data["destination"],
                v["options"]["destinationDigest"]
                    .as_str()
                    .ok_or(bad("Reviewed destination package digest required"))?,
            )
            .await
        }
        "categories" => categories::import(a, h, &record, &v["options"]).await,
        "products" => products::import(a, h, &record, &v["options"]).await,
        "customers" => customers::import(a, h, &record, &v["options"]).await,
        "orders" => historical_orders::import(a, h, &record, &v["options"]).await,
        _ => Err(bad(
            "Unsupported native import domain; no target data changed",
        )),
    }
}
