//! Bounded callbacks use only configured Core origins and per-tenant revocable app identities.
use super::*;
#[derive(Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Callback {
    pub core_url: String,
    pub token: String,
}
pub async fn callback(
    c: &Callback,
    tenant: &str,
    operation: &str,
    v: &Value,
    fixture: bool,
) -> Result<Value> {
    let client = transport::client(&c.core_url, fixture).await?;
    let url = format!(
        "{}/api/apps/migration/core/{operation}",
        c.core_url.trim_end_matches('/')
    );
    let (result, _) = transport::json(
        client
            .post(url)
            .bearer_auth(&c.token)
            .header("x-tenant", tenant)
            .json(v),
    )
    .await?;
    Ok(result)
}
