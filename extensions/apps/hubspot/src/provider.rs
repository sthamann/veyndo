//! Explicit bounded CRM contact upsert; no subscriptions, bulk customer reads or implicit opt-ins.
use super::*;
pub fn prepare(_: &Value, key: &str, v: &Value) -> Result<Call> {
    secret(key)?;
    checked(
        v.as_object().is_some_and(|o| {
            o.keys()
                .all(|k| ["email", "firstName", "lastName"].contains(&k.as_str()))
        }),
        "Unknown contact field",
    )?;
    let email = config::address(&short(v, "email", 254)?)?;
    let first = short(v, "firstName", 100)?;
    let last = short(v, "lastName", 100)?;
    Ok(Call {
        url: format!(
            "{}/crm/v3/objects/contacts/batch/upsert",
            network::endpoint("hubspot")?
        ),
        headers: bearer(key),
        body: Some(
            json!({"inputs":[{"id":email,"idProperty":"email","properties":{"email":email,"firstname":first,"lastname":last}}]}),
        ),
    })
}
pub fn receipt(code: u16, v: &Value) -> Result<Value> {
    checked(
        code == 200
            && v["status"] == "COMPLETE"
            && v["numErrors"].as_u64().unwrap_or(0) == 0
            && v.get("errors")
                .is_none_or(|e| e.as_array().is_some_and(Vec::is_empty))
            && v["results"].as_array().is_some_and(|r| {
                r.len() == 1
                    && r[0]["id"]
                        .as_str()
                        .is_some_and(|s| !s.is_empty() && s.len() <= 200)
            }),
        "HubSpot did not confirm a complete contact upsert",
    )?;
    Ok(json!({"state":"confirmed","contactId":v["results"][0]["id"]}))
}
