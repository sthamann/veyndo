//! Immutable export manifests bind bounded original source pages to their context, counts and exact bytes.
use super::*;
use serde::{Deserialize, Serialize};
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Page {
    pub path: String,
    pub sha256: String,
    pub bytes: usize,
    pub source_records: usize,
    pub normalized_records: usize,
}
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Manifest {
    pub format_version: u8,
    pub source: Value,
    pub kind: String,
    pub source_records: usize,
    pub normalized_records: usize,
    pub pages: Vec<Page>,
}
pub fn source(c: &config::Connection) -> Value {
    json!({"system":c.system,"origin":c.origin.trim_end_matches('/'),"version":c.version,"currency":c.currency,"scale":c.scale,"locale":c.locale,"languages":c.languages,"timezone":c.timezone})
}
pub fn digest(bytes: &[u8]) -> String {
    use sha2::Digest;
    format!("{:x}", sha2::Sha256::digest(bytes))
}
pub fn valid_digest(s: &str) -> bool {
    s.len() == 64
        && s.bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}
impl Manifest {
    pub fn validate(&self, c: &config::Connection, kind: &str) -> Result<()> {
        if self.format_version != 1 || self.source != source(c) || self.kind != kind {
            return Err(
                "Export format, original source context or domain differs from reviewed settings"
                    .into(),
            );
        }
        if self.pages.len() > 10_000
            || self.source_records > 500_000
            || self.normalized_records > 2_000_000
        {
            return Err("Export exceeds the bounded package profile".into());
        }
        let mut raw = 0usize;
        let mut normalized = 0usize;
        let mut paths = std::collections::HashSet::new();
        for (index, page) in self.pages.iter().enumerate() {
            let path = format!("page-{:06}-{}.json", index + 1, page.sha256);
            if !valid_digest(&page.sha256)
                || page.path != path
                || !paths.insert(&page.path)
                || page.bytes == 0
                || page.bytes > 1_048_576
                || !(1..=50).contains(&page.source_records)
                || page.normalized_records == 0
                || page.normalized_records > 5000
            {
                return Err("Invalid immutable export page identity, size or count".into());
            }
            raw = raw
                .checked_add(page.source_records)
                .ok_or("Export count overflow")?;
            normalized = normalized
                .checked_add(page.normalized_records)
                .ok_or("Export count overflow")?;
        }
        if raw != self.source_records || normalized != self.normalized_records {
            return Err("Export manifest totals do not match its complete page list".into());
        }
        Ok(())
    }
}
