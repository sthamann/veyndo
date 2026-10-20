//! Klaviyo event ingestion uses a stable unique ID and never enrolls a profile into marketing.
use super::*;
pub fn prepare(_: &Value, key: &str, v: &Value) -> Result<Call> {
    secret(key)?;
    checked(
        v.as_object().is_some_and(|o| {
            o.keys()
                .all(|k| ["email", "metric", "eventId", "properties"].contains(&k.as_str()))
        }),
        "Unknown event field",
    )?;
    let email = config::address(&short(v, "email", 254)?)?;
    let metric = short(v, "metric", 100)?;
    let id = short(v, "eventId", 200)?;
    let properties = v.get("properties").cloned().unwrap_or(json!({}));
    checked(
        properties.is_object() && properties.to_string().len() <= 12000,
        "Event properties exceed limit",
    )?;
    Ok(Call {
        url: format!("{}/api/events", network::endpoint("klaviyo")?),
        headers: vec![
            ("authorization", format!("Klaviyo-API-Key {key}")),
            ("revision", "2026-10-15".into()),
        ],
        body: Some(
            json!({"data":{"type":"event","attributes":{"unique_id":id,"metric":{"data":{"type":"metric","attributes":{"name":metric}}},"profile":{"data":{"type":"profile","attributes":{"email":email}}},"properties":properties}}}),
        ),
    })
}
pub fn receipt(code: u16, _: &Value) -> Result<Value> {
    checked(code == 202, "Klaviyo did not return event acceptance")?;
    Ok(json!({"state":"accepted","processingConfirmed":false}))
}
