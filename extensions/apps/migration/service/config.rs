//! Operator-bound source identities and credentials; action input cannot choose a network destination.
use super::*;
use std::collections::HashMap;
#[derive(Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Connection {
    pub system: Source,
    pub origin: String,
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
            if values["timezone"].as_str() == Some("") {
                values.as_object_mut().unwrap().remove("timezone");
            }
            let c: Connection = serde_json::from_value(values)
                .map_err(|_| "Complete the encrypted source settings in Apps first")?;
            transport::admit_url(&c.origin, self.fixture)?;
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
                    || c.token.is_empty()
                    || c.token.len() > 8192
                    || c.version.is_empty()
                    || c.version.len() > 30
                {
                    return Err("source identity, credential and version required".into());
                }
                transport::admit_url(&c.origin, fixture)?;
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
