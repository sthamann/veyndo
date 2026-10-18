//! Shared address classification, pinned DNS, disabled proxies/redirects and bounded streamed source responses.
use super::*;
use std::time::Duration;
pub fn admit_url(origin: &str, fixture: bool) -> Result<reqwest::Url> {
    let u = reqwest::Url::parse(origin).map_err(|_| "invalid source URL")?;
    let local = fixture && u.scheme() == "http" && u.host_str() == Some("127.0.0.1");
    if (u.scheme() != "https" && !local)
        || u.host_str().is_none()
        || !u.username().is_empty()
        || u.password().is_some()
        || u.query().is_some()
        || u.fragment().is_some()
    {
        return Err("source requires credential-free HTTPS origin; local readers need explicit operator configuration".into());
    }
    Ok(u)
}
pub async fn client(origin: &str, fixture: bool) -> Result<reqwest::Client> {
    let u = admit_url(origin, fixture)?;
    let host = u.host_str().ok_or("source hostname required")?;
    let addresses = tokio::time::timeout(
        Duration::from_secs(3),
        tokio::net::lookup_host((
            host,
            u.port_or_known_default().ok_or("source port required")?,
        )),
    )
    .await
    .map_err(|_| "source DNS timed out")?
    .map_err(|_| "source DNS unavailable")?
    .collect::<Vec<_>>();
    if addresses.is_empty()
        || addresses.len() > 16
        || addresses.iter().any(|a| {
            !(veyndo_runtime::network_policy::public_address(a.ip())
                || fixture && host == "127.0.0.1" && a.ip().is_loopback())
        })
    {
        return Err("source resolves to a disallowed address".into());
    }
    reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .resolve_to_addrs(host, &addresses)
        .timeout(Duration::from_secs(20))
        .connect_timeout(Duration::from_secs(3))
        .build()
        .map_err(|_| "source transport unavailable".into())
}
pub async fn json(request: reqwest::RequestBuilder) -> Result<(Value, reqwest::header::HeaderMap)> {
    let (body, headers) = bytes(request).await?;
    Ok((
        serde_json::from_slice(&body).map_err(|_| "source returned invalid JSON")?,
        headers,
    ))
}
pub async fn bytes(
    request: reqwest::RequestBuilder,
) -> Result<(Vec<u8>, reqwest::header::HeaderMap)> {
    let mut r = request
        .send()
        .await
        .map_err(|_| "source request unavailable; no cursor advanced")?;
    if r.status() == reqwest::StatusCode::TOO_MANY_REQUESTS {
        return Err("source rate limit; wait before continuing the same cursor".into());
    }
    if !r.status().is_success() {
        return Err(format!(
            "source rejected request (HTTP {}); check source permissions and API profile",
            r.status().as_u16()
        ));
    }
    let headers = r.headers().clone();
    let mut body = vec![];
    if r.content_length().is_some_and(|n| n > 4 * 1024 * 1024) {
        return Err("source page exceeds 4 MiB; narrow the profile".into());
    }
    while let Some(chunk) = r
        .chunk()
        .await
        .map_err(|_| "source response interrupted; no cursor advanced")?
    {
        if body.len() + chunk.len() > 4 * 1024 * 1024 {
            return Err("source page exceeds 4 MiB".into());
        }
        body.extend_from_slice(&chunk);
    }
    Ok((body, headers))
}
