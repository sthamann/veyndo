//! Discover the versioned B2B extension and intersect opt-in platform profiles through bounded public HTTPS.
use super::*;
pub(super) const B2B: &str = "ai.veyndo.app.shopping.b2b_negotiation";
pub(super) const VERSION: &str = "2026-10-13";
const CHECKOUT: &str = "dev.ucp.shopping.checkout";
const SCHEMA: &str = "https://app.veyndo.ai/ucp/2026-10-13/b2b-negotiation.json";
pub(crate) fn ucp_meta() -> Value {
    json!({"version":UCP_VERSION,"capabilities":{CHECKOUT:[{"version":UCP_VERSION}]}})
}
pub(crate) async fn schema() -> Json<Value> {
    Json(serde_json::from_str(include_str!("b2b-negotiation.json")).expect("Versioned UCP schema"))
}
pub(crate) async fn ucp_profile(h: RequestContext) -> Result<Json<Value>> {
    let mut url = reqwest::Url::parse(
        shop_domains::links(&tenant(&h)?)["studioUrl"]
            .as_str()
            .unwrap(),
    )
    .map_err(|_| bad("Invalid Studio origin"))?;
    url.set_path("/ucp/v1");
    url.set_fragment(None);
    // Retain tenant query in discovery; callers also send x-tenant and channel headers.
    let mut meta = ucp_meta();
    meta["services"] = json!({"dev.ucp.shopping":[{"version":UCP_VERSION,"spec":"https://ucp.dev/2026-08-25/specification/overview/","transport":"rest","schema":"https://ucp.dev/2026-08-25/services/shopping/rest.openapi.json","endpoint":url.as_str()}]});
    meta["capabilities"][CHECKOUT][0]["spec"] =
        json!("https://ucp.dev/2026-08-25/specification/shopping/checkout/");
    meta["capabilities"][CHECKOUT][0]["schema"] =
        json!("https://ucp.dev/2026-08-25/schemas/shopping/checkout.json");
    meta["capabilities"][B2B] = json!([{"version":VERSION,"extends":[CHECKOUT],"schema":SCHEMA,"spec":"https://sthamann.github.io/veyndo/docs/b2b-ucp-negotiation.html"}]);
    meta["capabilities"][cart::CAPABILITY] = json!([{"version":UCP_VERSION,"spec":"https://ucp.dev/2026-08-25/specification/shopping/cart/","schema":"https://ucp.dev/2026-08-25/schemas/shopping/cart.json"}]);
    meta["capabilities"][consent::CAPABILITY] = json!([{"version":UCP_VERSION,"extends":[CHECKOUT,cart::CAPABILITY],"schema":"https://ucp.dev/2026-08-25/schemas/shopping/buyer_consent.json","spec":"https://ucp.dev/2026-08-25/specification/buyer-consent/"}]);
    meta["payment_handlers"] = json!({});
    Ok(Json(json!({"ucp":meta})))
}
/// An advertised profile grants protocol compatibility only, never customer or merchant authority.
#[derive(Clone, Copy)]
pub(super) struct Selection {
    pub b2b: bool,
    pub consent: bool,
}
pub(super) async fn select(h: &RequestContext, cart_only: bool) -> Result<Selection> {
    let inline = header(h, "x-veyndo-ucp-b2b-version");
    let agent = header(h, "ucp-agent");
    let consent = header(h, "x-veyndo-ucp-consent-version");
    if consent.is_some_and(|v| v != UCP_VERSION) {
        return Err(conflict(
            "capabilities_incompatible: unsupported buyer consent version",
        ));
    }
    if (inline.is_some() || consent.is_some()) && agent.is_some() {
        return Err(bad(
            "Choose UCP-Agent profile or pre-negotiated Veyndo extension version",
        ));
    }
    if let Some(v) = inline {
        return if v == VERSION {
            Ok(Selection {
                b2b: true,
                consent: consent.is_some(),
            })
        } else {
            Err(conflict(
                "capabilities_incompatible: unsupported Veyndo B2B version",
            ))
        };
    }
    let Some(agent) = agent else {
        return Ok(Selection {
            b2b: false,
            consent: consent.is_some(),
        });
    };
    let url = profile_url(agent)?;
    let client = apps::public_https_client(&url).await?;
    // No inherited Authorization, tenant, cart or customer headers. Redirects/proxies/private DNS are denied.
    let mut response = client.get(url).send().await.map_err(|_| {
        Error(
            StatusCode::BAD_GATEWAY,
            "UCP platform profile could not be fetched".into(),
        )
    })?;
    if !response.status().is_success() || response.content_length().is_some_and(|n| n > 32768) {
        return Err(bad(
            "UCP platform profile must be a successful bounded JSON response",
        ));
    }
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| bad("UCP platform profile read failed"))?
    {
        if bytes.len() + chunk.len() > 32768 {
            return Err(bad("UCP platform profile exceeds 32 KiB"));
        }
        bytes.extend_from_slice(&chunk);
    }
    let profile: Value =
        serde_json::from_slice(&bytes).map_err(|_| bad("UCP platform profile is not JSON"))?;
    intersect(&profile, cart_only)
}
fn profile_url(value: &str) -> Result<reqwest::Url> {
    let raw = value
        .strip_prefix("profile=\"")
        .and_then(|s| s.strip_suffix('"'))
        .filter(|s| s.len() <= 2048)
        .ok_or(bad("UCP-Agent requires profile=\"https://…\""))?;
    let url = reqwest::Url::parse(raw).map_err(|_| bad("Invalid UCP profile URL"))?;
    if url.scheme() != "https"
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.fragment().is_some()
    {
        return Err(bad("UCP profiles require credential-free public HTTPS"));
    }
    Ok(url)
}
fn supports(p: &Value, name: &str, version: &str) -> bool {
    p["ucp"]["capabilities"][name]
        .as_array()
        .is_some_and(|entries| entries.iter().any(|e| e["version"] == version))
}
fn intersect(p: &Value, cart_only: bool) -> Result<Selection> {
    let base = if cart_only {
        cart::CAPABILITY
    } else {
        CHECKOUT
    };
    if p["ucp"]["version"] != UCP_VERSION || !supports(p, base, UCP_VERSION) {
        return Err(conflict(
            "capabilities_incompatible: requires the requested UCP 2026-08-25 base capability",
        ));
    }
    let selected = supports(p, B2B, VERSION);
    if selected
        && !p["ucp"]["capabilities"][B2B]
            .as_array()
            .unwrap()
            .iter()
            .any(|e| {
                e["version"] == VERSION
                    && e["schema"] == SCHEMA
                    && e["extends"] == json!([CHECKOUT])
            })
    {
        return Err(bad(
            "Veyndo B2B schema authority or parent capability mismatch",
        ));
    }
    Ok(Selection {
        b2b: selected && !cart_only,
        consent: supports(p, consent::CAPABILITY, UCP_VERSION),
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn intersection_requires_exact_parent_version_and_vendor_authority() {
        let mut p = json!({"ucp":{"version":UCP_VERSION,"capabilities":{CHECKOUT:[{"version":UCP_VERSION}],B2B:[{"version":VERSION,"schema":SCHEMA,"extends":[CHECKOUT]}]}}});
        assert!(intersect(&p, false).unwrap().b2b);
        p["ucp"]["capabilities"][B2B][0]["schema"] = json!("https://evil.example/schema.json");
        assert!(intersect(&p, false).is_err());
        p["ucp"]["capabilities"]
            .as_object_mut()
            .unwrap()
            .remove(B2B);
        assert!(!intersect(&p, false).unwrap().b2b);
        p["ucp"]["capabilities"]
            .as_object_mut()
            .unwrap()
            .remove(CHECKOUT);
        assert!(intersect(&p, false).is_err());
    }
    #[test]
    fn cart_only_platform_and_optional_consent_intersect_independently() {
        let mut p = json!({"ucp":{"version":UCP_VERSION,"capabilities":{cart::CAPABILITY:[{"version":UCP_VERSION}]}}});
        assert!(!intersect(&p, true).unwrap().consent);
        assert!(intersect(&p, false).is_err());
        p["ucp"]["capabilities"][consent::CAPABILITY] = json!([{"version":UCP_VERSION}]);
        assert!(intersect(&p, true).unwrap().consent);
    }
    #[test]
    fn profiles_cannot_smuggle_credentials_or_alternate_schemes() {
        for v in [
            "profile=\"http://example.test/x\"",
            "profile=\"https://user:secret@example.test\"",
            "profile=\"https://example.test/#secret\"",
            "profile=\"https://example.test/\"; role=merchant",
        ] {
            assert!(profile_url(v).is_err());
        }
        assert!(profile_url("profile=\"https://agent.example/profile.json\"").is_ok());
    }
}
