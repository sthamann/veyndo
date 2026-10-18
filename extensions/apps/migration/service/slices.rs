//! Variant-expanded source pages are sliced into native-sized immutable batches; changed parent pages cannot shift offsets silently.
use super::*;
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Cursor {
    source_cursor: Option<String>,
    offset: usize,
    digest: String,
}
pub async fn page(
    c: &config::Connection,
    id: &str,
    kind: &str,
    cursor: Option<&str>,
    fixture: bool,
) -> Result<Value> {
    let size = if kind == "assets" { 10 } else { 100 };
    let slice = cursor
        .and_then(|s| s.strip_prefix("slice:"))
        .map(|s| {
            if s.len() > 4000 {
                return Err("Oversized slice cursor".to_owned());
            }
            let raw = URL_SAFE_NO_PAD
                .decode(s)
                .map_err(|_| "Invalid slice cursor")?;
            let value: Cursor = serde_json::from_slice(&raw).map_err(|_| "Invalid slice cursor")?;
            if value.offset == 0
                || value.offset > 5000
                || value.digest.len() != 64
                || !value.digest.bytes().all(|b| b.is_ascii_hexdigit())
                || value
                    .source_cursor
                    .as_deref()
                    .is_some_and(|s| s.starts_with("slice:"))
            {
                return Err("Invalid slice identity".into());
            }
            Ok(value)
        })
        .transpose()?;
    let source_cursor = slice
        .as_ref()
        .and_then(|s| s.source_cursor.as_deref())
        .or(if slice.is_none() { cursor } else { None });
    let mut value = if kind == "assets" {
        media::descriptors(
            extract::source_page(c, id, "products", source_cursor, fixture).await?,
            fixture,
        )?
    } else {
        extract::source_page(c, id, kind, source_cursor, fixture).await?
    };
    let digest = format!(
        "{:x}",
        sha2::Sha256::digest(value["recordDigests"].to_string().as_bytes())
    );
    if slice.as_ref().is_some_and(|s| s.digest != digest) {
        return Err(
            "Source page changed between variant batches; re-inspect before continuing".into(),
        );
    }
    let offset = slice.as_ref().map_or(0, |s| s.offset);
    let rows = value["records"]
        .as_array()
        .ok_or("Missing normalized source rows")?;
    if offset > rows.len() {
        return Err("Slice no longer exists in source page".into());
    }
    let mut end = offset;
    let mut bytes = 0;
    for row in rows.iter().skip(offset).take(size) {
        let cost = row.to_string().len() + 200;
        if bytes + cost > 20 * 1024 {
            break;
        }
        bytes += cost;
        end += 1;
    }
    if end == offset && offset < rows.len() {
        return Err("A source record exceeds the bounded review result; split its content/export before continuing".into());
    }
    if end < rows.len() {
        let next = Cursor {
            source_cursor: source_cursor.map(str::to_owned),
            offset: end,
            digest,
        };
        value["nextCursor"] = json!(format!(
            "slice:{}",
            URL_SAFE_NO_PAD.encode(serde_json::to_vec(&next).map_err(|_| "Slice encoding failed")?)
        ));
    }
    for key in ["records", "recordDigests", "sourceKeys"] {
        value[key] = json!(&value[key].as_array().ok_or("Source projection missing")?[offset..end]);
    }
    if kind == "assets" {
        media::prepare(&mut value, fixture).await?;
    }
    if value.to_string().len() > 28 * 1024 {
        return Err("Reviewed batch exceeds the bounded native job result; use a narrower source/export profile".into());
    }
    Ok(value)
}
use sha2::Digest;
