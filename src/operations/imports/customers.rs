//! Historical CRM import reuses native validation and addresses, without credentials or ordinary new-customer events.
use super::*;
pub(super) async fn import(
    a: &App,
    h: &RequestContext,
    r: &SourceRecord,
    options: &Value,
) -> Result<Value> {
    auth::permit(h, "customers.write")?;
    auth::permit(h, "customers.pii")?;
    let t = merchant(a, h)?;
    if staging::parent(a, &t).await?.is_some() {
        return Err(bad(
            "Historical customer data is not a configuration release unit",
        ));
    }
    let d = &r.data;
    let first = d["firstName"].as_str().unwrap_or("");
    let last = d["lastName"].as_str().unwrap_or("");
    let address = &d["billingAddress"];
    let id = r.identity(&t);
    let payload = json!({"email":d["email"],"profile":{"name":format!("{first} {last}"),"firstName":first,"lastName":last},"customerGroup":options["customerGroup"],"billingAddress":address,"requestKey":format!("migration:{id}")});
    let provenance = json!({"source":r.source,"sourceShop":r.source_shop,"sourceId":r.source_id,"fingerprint":hash(&json!(r).to_string())});
    let Json(result) =
        super::super::customer_create::import(a, h, &id, payload, &provenance).await?;
    Ok(json!({"id":result["id"],"created":true,"credentialMigrated":false}))
}
