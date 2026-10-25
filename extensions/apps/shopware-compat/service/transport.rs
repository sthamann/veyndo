//! Fixed-origin original Shopware Admin API transport; no redirects, ambient proxies, arbitrary paths or error bodies.
use super::*;
pub async fn read(mut r: reqwest::Response) -> Result<Value> {
    let status = r.status();
    let mut bytes = Vec::new();
    while let Some(chunk) = r.chunk().await.map_err(|_| {
        error(
            StatusCode::BAD_GATEWAY,
            "Runtime response interrupted; inspect before retrying a change",
        )
    })? {
        if bytes.len() + chunk.len() > 512 * 1024 {
            return Err(error(
                StatusCode::BAD_GATEWAY,
                "Runtime response exceeded its limit",
            ));
        }
        bytes.extend_from_slice(&chunk);
    }
    if !status.is_success() {
        return Err(error(
            if status.is_client_error() {
                StatusCode::CONFLICT
            } else {
                StatusCode::BAD_GATEWAY
            },
            "Shopware rejected the operation; inspect its private log and current extension state",
        ));
    }
    if bytes.is_empty() {
        return Ok(json!({}));
    }
    serde_json::from_slice(&bytes)
        .map_err(|_| error(StatusCode::BAD_GATEWAY, "Invalid Shopware JSON response"))
}
pub async fn token(a: &App, c: &config::Cell) -> Result<String> {
    let r=a.http.post(format!("{}/api/oauth/token",c.url)).json(&json!({"grant_type":"client_credentials","client_id":c.client_id,"client_secret":c.client_secret})).send().await.map_err(|_|error(StatusCode::BAD_GATEWAY,"Shopware cell unavailable"))?;
    read(r).await?["access_token"]
        .as_str()
        .filter(|s| !s.is_empty() && s.len() < 8192)
        .map(str::to_owned)
        .ok_or_else(|| error(StatusCode::BAD_GATEWAY, "Shopware authentication failed"))
}
pub async fn request(
    a: &App,
    c: &config::Cell,
    token: &str,
    method: reqwest::Method,
    path: &str,
    body: Value,
) -> Result<Value> {
    let r = a
        .http
        .request(method, format!("{}{path}", c.url))
        .bearer_auth(token)
        .header("accept", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|_| {
            error(
                StatusCode::BAD_GATEWAY,
                "Shopware result unknown; inspect the cell before another change",
            )
        })?;
    read(r).await
}
