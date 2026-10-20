//! Vercel Deploy Hooks accept a deployment request; they do not prove deployment success.
use super::*;
pub fn prepare(_: &Value, key: &str, v: &Value) -> Result<Call> {
    secret(key)?;
    checked(
        v.as_object().is_some_and(|o| o.is_empty()),
        "Deploy hook takes no operation fields",
    )?;
    let u = reqwest::Url::parse(key).map_err(|_| Error::Invalid("Invalid Vercel deploy hook"))?;
    checked(
        u.scheme() == "https"
            && u.host_str() == Some("api.vercel.com")
            && u.port().is_none()
            && u.username().is_empty()
            && u.password().is_none()
            && u.query().is_none()
            && u.fragment().is_none()
            && regex::Regex::new(r"^/v1/integrations/deploy/[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+$")
                .unwrap()
                .is_match(u.path()),
        "Use a Vercel Deploy Hook from the project's Git settings",
    )?;
    let base = network::endpoint("vercel")?;
    Ok(Call {
        url: format!("{base}{}", u.path()),
        body: Some(json!({})),
        headers: vec![],
    })
}
pub fn receipt(_: u16, v: &Value) -> Result<Value> {
    checked(
        v["job"]["id"]
            .as_str()
            .is_some_and(|s| !s.is_empty() && s.len() <= 200),
        "Vercel did not return a job receipt",
    )?;
    Ok(json!({"state":"accepted","providerJobId":v["job"]["id"],"deploymentConfirmed":false}))
}
