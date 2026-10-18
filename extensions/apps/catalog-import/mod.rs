//! Inbound provider formats belong to this app; reviewed creation and publication remain native Veyndo operations.
use super::*;
mod shop_mcp;
mod shopify_csv;
pub(super) use shop_mcp::prepare as shop_mcp;
pub(super) use shopify_csv::parse as shopify_csv;
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Source {
    pub provider: String,
    pub external_id: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub url: String,
}
/// Provider HTML is content only. Skip executable/style content; return plain bounded text, never rendered HTML.
fn plain(html: &str) -> String {
    let mut text = String::new();
    let mut tag = String::new();
    let mut inside = false;
    let mut hidden = false;
    for ch in html.chars() {
        if ch == '<' {
            inside = true;
            tag.clear();
        } else if ch == '>' && inside {
            inside = false;
            let name = tag.trim().to_ascii_lowercase();
            if name.starts_with("script") || name.starts_with("style") {
                hidden = true;
            }
            if name.starts_with("/script") || name.starts_with("/style") {
                hidden = false;
            }
            if !hidden {
                text.push(' ');
            }
        } else if inside {
            tag.push(ch);
        } else if !hidden {
            text.push(ch);
        }
    }
    text.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

impl Source {
    pub(crate) fn validate(&self) -> Result<()> {
        if !matches!(self.provider.as_str(), "shopify_csv" | "shop_mcp")
            || self.external_id.is_empty()
            || self.external_id.len() > 500
            || self.url.len() > 2000
        {
            return Err(bad("Invalid import provenance"));
        }
        if !self.url.is_empty() {
            let url = reqwest::Url::parse(&self.url).map_err(|_| bad("Invalid supplier URL"))?;
            if url.scheme() != "https"
                || !url.username().is_empty()
                || url.password().is_some()
                || url.host_str().is_none()
            {
                return Err(bad(
                    "Supplier provenance requires a credential-free HTTPS URL",
                ));
            }
        }
        Ok(())
    }
}
