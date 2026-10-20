//! Search projections contain explicit catalogue fields only; commerce remains authoritative in Veyndo.
use super::*;
pub fn prepare(s: &Value, key: &str, v: &Value) -> Result<Call> {
    secret(key)?;
    let app = identifier(s, "applicationId")?;
    let index = identifier(s, "index")?;
    checked(
        v.as_object()
            .is_some_and(|o| o.keys().all(|k| k == "records")),
        "Only catalogue records are accepted",
    )?;
    let rows = v["records"]
        .as_array()
        .ok_or(Error::Invalid("Catalogue records required"))?;
    checked(
        !rows.is_empty() && rows.len() <= 50 && v.to_string().len() <= 40000,
        "Index at most 50 bounded records per request",
    )?;
    let mut ids = std::collections::HashSet::new();
    for r in rows {
        checked(
            r.as_object().is_some_and(|o| {
                o.keys().all(|k| {
                    ["objectID", "name", "description", "url", "image", "locale"]
                        .contains(&k.as_str())
                })
            }),
            "Search projection contains unsupported or private fields",
        )?;
        let id = short(r, "objectID", 200)?;
        short(r, "name", 1000)?;
        checked(
            ids.insert(id)
                && r.as_object()
                    .unwrap()
                    .values()
                    .all(|v| v.as_str().is_some_and(|s| s.len() <= 12000)),
            "Invalid or duplicate search record",
        )?;
    }
    let base = network::integration_origin("algolia", &format!("https://{app}.algolia.net"))?;
    Ok(Call {
        url: format!("{base}/1/indexes/{index}/batch"),
        headers: vec![
            ("x-algolia-api-key", key.into()),
            ("x-algolia-application-id", app),
        ],
        body: Some(
            json!({"requests":rows.iter().map(|r|json!({"action":"addObject","body":r})).collect::<Vec<_>>()}),
        ),
    })
}
pub fn receipt(_: u16, v: &Value) -> Result<Value> {
    checked(
        v["taskID"].as_u64().is_some() && v["objectIDs"].is_array(),
        "Algolia did not return an indexing task",
    )?;
    Ok(
        json!({"state":"accepted","taskId":v["taskID"],"recordCount":v["objectIDs"].as_array().unwrap().len(),"indexingConfirmed":false}),
    )
}
