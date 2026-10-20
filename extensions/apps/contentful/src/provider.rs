//! Contentful reads a bounded, explicitly paged source into the existing knowledge export path.
use super::*;
pub fn prepare(s: &Value, key: &str, v: &Value) -> Result<Call> {
    secret(key)?;
    let space = identifier(s, "space")?;
    let environment = identifier(s, "environment")?;
    checked(
        v.as_object()
            .is_some_and(|o| o.keys().all(|k| k == "offset")),
        "Only a bounded content offset is accepted",
    )?;
    let offset = match v.get("offset") {
        None => 0,
        Some(v) => v
            .as_u64()
            .filter(|n| *n <= 1000000)
            .ok_or(Error::Invalid("Invalid content offset"))?,
    };
    let locale = text(s, "locale");
    checked(
        locale.is_empty()
            || regex::Regex::new(r"^[a-zA-Z0-9-]{1,35}$")
                .unwrap()
                .is_match(&locale),
        "Invalid content locale",
    )?;
    let region = text(s, "region");
    checked(
        ["", "global", "eu"].contains(&region.as_str()),
        "Select global or EU Contentful delivery",
    )?;
    let base = network::endpoint(if region == "eu" {
        "contentful_eu"
    } else {
        "contentful"
    })?;
    let mut url = reqwest::Url::parse(&format!(
        "{base}/spaces/{space}/environments/{environment}/entries"
    ))
    .map_err(|_| Error::Invalid("Invalid content endpoint"))?;
    url.query_pairs_mut()
        .append_pair("limit", "50")
        .append_pair("skip", &offset.to_string())
        .append_pair("order", "sys.id")
        .append_pair("include", "0");
    if !locale.is_empty() {
        url.query_pairs_mut().append_pair("locale", &locale);
    }
    Ok(Call {
        url: url.into(),
        headers: bearer(key),
        body: None,
    })
}
pub fn receipt(_: u16, v: &Value) -> Result<Value> {
    let items = v["items"]
        .as_array()
        .ok_or(Error::Invalid("Contentful entries missing"))?;
    let skip = v["skip"]
        .as_u64()
        .ok_or(Error::Invalid("Contentful page offset missing"))?;
    let total = v["total"]
        .as_u64()
        .ok_or(Error::Invalid("Contentful total missing"))?;
    checked(
        items.len() <= 50
            && skip <= total
            && items.len() as u64 == total.saturating_sub(skip).min(50),
        "Contentful page is incomplete; do not advance",
    )?;
    let next = skip + items.len() as u64;
    Ok(
        json!({"state":"imported","entryCount":items.len(),"nextOffset":(next<total).then_some(next),"snapshotConsistent":false,"publishedToStorefront":false}),
    )
}
pub fn sources(v: &Value, s: &Value) -> Result<Vec<Value>> {
    v["items"].as_array().ok_or(Error::Invalid("Contentful entries missing"))?.iter().map(|r| {
        let id = identifier(&r["sys"], "id")?;
        let body = serde_json::to_string(&r["fields"]).map_err(|_| Error::Invalid("Invalid content fields"))?;
        checked(r["fields"].is_object() && body.len() <= 12000, "Contentful entry exceeds source limit")?;
        let title=r["fields"]["title"].as_str().filter(|s|!s.trim().is_empty() && s.len()<=300).unwrap_or(&id);
        Ok(json!({
            "id":format!("contentful:{}",digest(format!("{}:{}:{id}",text(s,"space"),text(s,"environment")).as_bytes())),
            "sourceUrl":format!("https://cdn.contentful.com/spaces/{}/environments/{}/entries/{id}",text(s,"space"),text(s,"environment")),
            "kind":"document", "title":title, "text":body,
            "metadata":{"provider":"contentful","locale":s["locale"],"entryId":id,"publishedToStorefront":false}
        }))
    }).collect()
}
