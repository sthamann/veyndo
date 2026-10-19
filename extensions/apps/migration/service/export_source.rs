//! Same-origin authenticated export reads verify the pinned manifest and each bounded page before native review.
use super::*;
use export_manifest::{Manifest, digest, valid_digest};
pub async fn page(
    c: &config::Connection,
    id: &str,
    kind: &str,
    cursor: Option<&str>,
    fixture: bool,
) -> Result<Value> {
    let url = c
        .export_manifest
        .as_deref()
        .ok_or("Export manifest URL required")?;
    let expected = c
        .export_digest
        .as_deref()
        .filter(|s| valid_digest(s))
        .ok_or("Pin the exact export manifest SHA-256 before inspection")?;
    let index = match cursor {
        None => 0,
        Some(s) => s
            .strip_prefix(&format!("export:{expected}:"))
            .and_then(|s| s.parse::<usize>().ok())
            .filter(|n| *n > 0 && *n < 10_000)
            .ok_or("Export cursor belongs to another frozen package or is invalid")?,
    };
    let client = transport::client(url, fixture).await?;
    let (body, _) = transport::bytes(authorized(client.get(url), c)?).await?;
    if digest(&body) != expected {
        return Err(
            "Export manifest changed; re-review and pin the original package before continuing"
                .into(),
        );
    }
    let manifest: Manifest =
        serde_json::from_slice(&body).map_err(|_| "Invalid source export manifest")?;
    manifest.validate(c, kind)?;
    let rows = if manifest.pages.is_empty() && index == 0 {
        vec![]
    } else {
        let page = manifest
            .pages
            .get(index)
            .ok_or("Export cursor exceeds frozen package")?;
        let base = transport::admit_url(url, fixture)?;
        let page_url = base
            .join(&page.path)
            .map_err(|_| "Invalid fixed export page path")?;
        if page_url.origin() != base.origin() {
            return Err("Export page escaped pinned origin".into());
        }
        let (body, _) = transport::bytes(authorized(client.get(page_url), c)?).await?;
        if body.len() != page.bytes || digest(&body) != page.sha256 {
            return Err("Export page bytes changed or are incomplete; no cursor advanced".into());
        }
        let rows: Vec<Value> =
            serde_json::from_slice(&body).map_err(|_| "Invalid original export page")?;
        if rows.len() != page.source_records {
            return Err("Export page record count differs from frozen manifest".into());
        }
        rows
    };
    let context = Context {
        source: c.system,
        shop: c.origin.clone(),
        currency: c.currency.clone(),
        scale: c.scale,
        locale: c.locale.clone(),
        languages: c.languages.clone(),
        timezone: c.timezone.clone(),
    };
    for row in &rows {
        export_readiness::validate(&context, kind, row)?;
    }
    let next =
        (index + 1 < manifest.pages.len()).then(|| format!("export:{expected}:{}", index + 1));
    let mut value = extract::finish(c, id, kind, rows, next)?;
    if manifest.pages.get(index).is_some_and(|page| {
        value["records"].as_array().map(Vec::len) != Some(page.normalized_records)
    }) {
        return Err("Normalized export count differs from frozen adapter profile".into());
    }
    value["sourceExport"] = json!({"digest":expected,"sourceRecords":manifest.source_records,"normalizedRecords":manifest.normalized_records,"pages":manifest.pages.len(),"page":index,"scope":"domain-export"});
    Ok(value)
}

/// Public examples deliberately send no authorization; protected exports remain the default.
fn authorized(
    request: reqwest::RequestBuilder,
    c: &config::Connection,
) -> Result<reqwest::RequestBuilder> {
    if c.export_public {
        Ok(request)
    } else {
        Ok(request.bearer_auth(
            c.export_token
                .as_deref()
                .ok_or("Separate export read credential required")?,
        ))
    }
}
