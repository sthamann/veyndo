//! Operator-bound source identities and credentials; action input cannot choose a network destination.
use super::*;
use std::collections::HashMap;
#[derive(Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Connection {
    pub system: Source,
    pub origin: String,
    #[serde(default)]
    pub token: String,
    #[serde(default)]
    pub username: String,
    pub version: String,
    pub currency: String,
    pub scale: u8,
    pub locale: String,
    #[serde(default)]
    pub languages: HashMap<String, String>,
    #[serde(default)]
    pub timezone: Option<String>,
    #[serde(default)]
    #[serde(alias = "export_manifest")]
    pub export_manifest: Option<String>,
    #[serde(default)]
    #[serde(alias = "export_digest")]
    pub export_digest: Option<String>,
    #[serde(default)]
    #[serde(alias = "export_token")]
    pub export_token: Option<String>,
}
pub struct Config {
    pub gateway: String,
    pub sources: HashMap<String, HashMap<String, Connection>>,
    pub fixture: bool,
    pub callbacks: HashMap<String, core::Callback>,
}
impl Config {
    pub fn connection(&self, t: &str, id: &str, settings: &Value) -> Result<Connection> {
        if id == "installed" {
            let mut values = settings.clone();
            if let Some(raw) = values
                .as_object_mut()
                .and_then(|m| m.remove("language_map"))
            {
                let text = raw.as_str().unwrap_or("");
                if !text.is_empty() {
                    values["languages"] = serde_json::from_str(text)
                        .map_err(|_| "Invalid explicit source language mapping")?;
                }
            }
            for key in [
                "timezone",
                "exportManifest",
                "exportDigest",
                "exportToken",
                "export_manifest",
                "export_digest",
                "export_token",
            ] {
                if values[key].as_str() == Some("") {
                    values.as_object_mut().unwrap().remove(key);
                }
            }
            let c: Connection = serde_json::from_value(values)
                .map_err(|_| "Complete the encrypted source settings in Apps first")?;
            c.validate_origin(self.fixture)?;
            c.validate_export(self.fixture)?;
            return Ok(c);
        }
        self.sources
            .get(t)
            .and_then(|s| s.get(id))
            .cloned()
            .ok_or("Source is not configured for this tenant".into())
    }
    pub fn load() -> Result<Self> {
        let gateway =
            std::env::var("MIGRATION_GATEWAY_TOKEN").map_err(|_| "gateway token required")?;
        if gateway.len() < 32 {
            return Err("gateway token must have at least 32 characters".into());
        }
        let callbacks: HashMap<String, core::Callback> =
            serde_json::from_str(&std::env::var("MIGRATION_CALLBACKS").unwrap_or("{}".into()))
                .map_err(|_| "Invalid Core callback configuration")?;
        let sources: HashMap<String, HashMap<String, Connection>> =
            serde_json::from_str(&std::env::var("MIGRATION_SOURCES").unwrap_or("{}".into()))
                .map_err(|_| "invalid source configuration")?;
        if sources.len() > 1000
            || callbacks.len() > 1000
            || sources.is_empty() && callbacks.is_empty()
        {
            return Err("configure 1..1000 tenants".into());
        }
        let fixture = std::env::var("MIGRATION_ALLOW_FIXTURE").as_deref() == Ok("1");
        for c in callbacks.values() {
            transport::admit_url(&c.core_url, fixture)?;
            if c.token.len() < 32 {
                return Err("Scoped Core callback credential required".into());
            }
        }
        for (tenant, cs) in &sources {
            if tenant.is_empty() || cs.is_empty() || cs.len() > 20 {
                return Err("invalid tenant source configuration".into());
            }
            for (id, c) in cs {
                if id.is_empty()
                    || c.export_manifest.is_none() && c.token.is_empty()
                    || c.token.len() > 8192
                    || c.version.is_empty()
                    || c.version.len() > 30
                {
                    return Err("source identity, credential and version required".into());
                }
                c.validate_origin(fixture)?;
                c.validate_export(fixture)?;
                Context {
                    source: c.system,
                    shop: id.clone(),
                    currency: c.currency.clone(),
                    scale: c.scale,
                    locale: c.locale.clone(),
                    languages: c.languages.clone(),
                    timezone: c.timezone.clone(),
                }
                .validate()?;
                veyndo_commerce::money::Currency::new(&c.currency, c.scale)
                    .map_err(str::to_owned)?;
            }
        }
        Ok(Self {
            gateway,
            sources,
            fixture,
            callbacks,
        })
    }
}

// An offline source identity is never an egress destination. Legacy HTTP shops can export privately over a separate admitted HTTPS endpoint.
pub fn original_identity(origin: &str) -> Result<()> {
    let u = reqwest::Url::parse(origin).map_err(|_| "Invalid original source identity")?;
    if origin.len() > 200
        || !["http", "https"].contains(&u.scheme())
        || u.host_str().is_none()
        || !u.username().is_empty()
        || u.password().is_some()
        || u.query().is_some()
        || u.fragment().is_some()
    {
        return Err("Original source identity needs a credential-free HTTP(S) shop URL".into());
    }
    Ok(())
}
impl Connection {
    fn validate_origin(&self, fixture: bool) -> Result<()> {
        if self.export_manifest.is_some() {
            original_identity(&self.origin)
        } else {
            transport::admit_url(&self.origin, fixture).map(|_| ())
        }
    }
    fn validate_export(&self, fixture: bool) -> Result<()> {
        match (&self.export_manifest, &self.export_digest) {
            (None, None) if !self.token.is_empty() && self.token.len() <= 8192 => Ok(()),
            (Some(url), Some(hash))
                if export_manifest::valid_digest(hash)
                    && self
                        .export_token
                        .as_ref()
                        .is_some_and(|s| !s.is_empty() && s.len() <= 8192) =>
            {
                transport::admit_url(url, fixture)?;
                Ok(())
            }
            _ => Err("Export requires both an admitted manifest URL and SHA-256 pin".into()),
        }
    }
}
