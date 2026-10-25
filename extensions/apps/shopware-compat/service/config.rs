//! Operator-owned cell identities: one isolated original runtime per shop/environment, no caller destinations.
use std::collections::{HashMap, HashSet};
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Cell {
    pub url: String,
    pub client_id: String,
    pub client_secret: String,
    pub version: String,
    pub image_digest: String,
    pub environment: String,
}
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Tenant {
    pub core_url: String,
    pub callback_token: String,
    pub cells: HashMap<String, Cell>,
}
pub struct Config {
    pub gateway: String,
    pub tenants: HashMap<String, Tenant>,
}
fn origin(raw: &str, local: bool) -> bool {
    let Ok(u) = reqwest::Url::parse(raw) else {
        return false;
    };
    (u.scheme() == "https"
        || (local && u.scheme() == "http" && matches!(u.host_str(), Some("127.0.0.1" | "[::1]"))))
        && u.host_str().is_some()
        && u.path() == "/"
        && u.username().is_empty()
        && u.password().is_none()
        && u.query().is_none()
        && u.fragment().is_none()
}
fn shopware_version(v: &str) -> bool {
    let parts = v.split('.').collect::<Vec<_>>();
    parts.len() == 4
        && parts.iter().all(|p| {
            !p.is_empty() && p.bytes().all(|b| b.is_ascii_digit()) && p.parse::<u32>().is_ok()
        })
}
impl Config {
    pub fn load() -> std::result::Result<Self, Box<dyn std::error::Error>> {
        let config = Self {
            gateway: std::env::var("APP_TOKEN")?,
            tenants: serde_json::from_str(&std::env::var("SHOPWARE_COMPAT_TENANTS")?)?,
        };
        config.validate(std::env::var("SHOPWARE_COMPAT_LOCAL_TEST").as_deref() == Ok("1"))?;
        Ok(config)
    }
    pub fn validate(&self, local: bool) -> std::result::Result<(), Box<dyn std::error::Error>> {
        if self.gateway.len() < 24 || self.tenants.is_empty() || self.tenants.len() > 1000 {
            return Err("Invalid gateway configuration".into());
        }
        let mut origins = HashSet::new();
        for (id, t) in &self.tenants {
            if id.is_empty()
                || id.len() > 100
                || t.callback_token.len() < 24
                || !origin(&t.core_url, local)
                || t.cells.is_empty()
                || t.cells.len() > 8
            {
                return Err("Invalid shop configuration".into());
            }
            for (alias, c) in &t.cells {
                if alias.is_empty()
                    || alias.len() > 40
                    || !alias
                        .bytes()
                        .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
                    || !origin(&c.url, local)
                    || c.url.ends_with('/')
                    || c.client_id.len() < 16
                    || c.client_secret.len() < 24
                    || !matches!(c.environment.as_str(), "sandbox" | "live")
                    || !shopware_version(&c.version)
                    || !c.image_digest.starts_with("sha256:")
                    || c.image_digest.len() != 71
                    || !c.image_digest[7..].bytes().all(|b| b.is_ascii_hexdigit())
                {
                    return Err("Invalid fixed Shopware cell configuration".into());
                }
                let u = reqwest::Url::parse(&c.url)?;
                if !origins.insert(u.origin().ascii_serialization()) {
                    return Err("A Shopware origin cannot be shared between cells or shops".into());
                }
            }
        }
        Ok(())
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn destinations_are_not_user_input() {
        assert!(shopware_version("6.7.14.2"));
        assert!(!shopware_version("6.7.14.2;sh"));
        assert!(origin("https://shop.example", false));
        for u in [
            "http://shop.example",
            "https://user:pass@shop.example",
            "https://shop.example/path",
            "https://shop.example?url=x",
            "file:///etc/passwd",
        ] {
            assert!(!origin(u, false));
        }
        assert!(!origin("http://127.0.0.1:8813", false));
        assert!(origin("http://127.0.0.1:8813", true));
    }
}
