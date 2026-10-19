//! Imported promotions use the ordinary revisioned owner and retain immutable provenance until a merchant reviews activation.
use super::*;
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct PromotionImport {
    pub version: u8,
    pub source: String,
    pub source_shop: String,
    pub source_id: String,
    pub currency: String,
    pub record_digest: String,
    pub activation_reviewed: bool,
}
pub(crate) fn preserve_import(previous: &Value, next: &Value) -> Result<()> {
    if let Some(old) = previous.get("sourceImport").filter(|v| !v.is_null()) {
        let mut old = old.clone();
        let mut new = next["sourceImport"].clone();
        old.as_object_mut()
            .ok_or(bad("Invalid promotion provenance"))?
            .remove("activationReviewed");
        if let Some(fields) = new.as_object_mut() {
            fields.remove("activationReviewed");
        }
        if old != new {
            return Err(conflict(
                "Imported promotion provenance cannot be removed or changed",
            ));
        }
    }
    Ok(())
}
pub(crate) async fn import_promotion(
    a: &App,
    h: &RequestContext,
    id: &str,
    data: &Value,
) -> Result<Value> {
    let t = merchant(a, h)?;
    auth::permit(h, "automation.manage")?;
    if staging::parent(a, &t).await?.is_some() {
        return Err(bad(
            "Coupon migration needs its live workspace; activation remains separate",
        ));
    }
    if data["active"] != false || data["sourceImport"]["activationReviewed"] != false {
        return Err(bad("Imported coupons must start inactive and unreviewed"));
    }
    let previous: Option<Value> =
        sqlx::query_scalar("SELECT data FROM commerce_promotions WHERE tenant=$1 AND id=$2")
            .bind(&t)
            .bind(id)
            .fetch_optional(&a.db)
            .await?;
    if let Some(previous) = previous {
        let incoming = &data["sourceImport"];
        let stored = &previous["sourceImport"];
        preserve_import(&previous, data)?;
        if stored.is_null() || stored["recordDigest"] != incoming["recordDigest"] {
            return Err(conflict(
                "Imported coupon source changed; review its conflict",
            ));
        }
        return Ok(json!({"id":id,"replayed":true}));
    }
    let _ = routes::save(
        State(a.clone()),
        h.clone(),
        Path(("promotions".into(), id.into())),
        Json(json!({"data":data,"revision":0})),
    )
    .await?;
    Ok(json!({"id":id,"replayed":false,"active":false}))
}
