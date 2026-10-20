//! Versioned source identities and exact historical money shared by migration transport and admission.
mod money;
pub use money::Money;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
pub type Result<T> = std::result::Result<T, String>;
#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Source {
    Shopify,
    Woocommerce,
    Prestashop,
    Magento2,
    Shopware5,
    Shopware6,
}
impl Source {
    pub fn parse(s: &str) -> Result<Self> {
        serde_json::from_value(json!(s))
            .map_err(|_| "unsupported source; select a versioned adapter".into())
    }
    pub fn name(self) -> &'static str {
        match self {
            Self::Shopify => "shopify",
            Self::Woocommerce => "woocommerce",
            Self::Prestashop => "prestashop",
            Self::Magento2 => "magento2",
            Self::Shopware5 => "shopware5",
            Self::Shopware6 => "shopware6",
        }
    }
}
pub struct Context {
    pub source: Source,
    pub shop: String,
    pub currency: String,
    pub scale: u8,
    pub locale: String,
    pub languages: std::collections::HashMap<String, String>,
    pub timezone: Option<String>,
}
impl Context {
    pub fn validate(&self) -> Result<()> {
        if self.shop.is_empty()
            || self.shop.len() > 200
            || self.shop.chars().any(char::is_control)
            || self.currency.len() != 3
            || !self.currency.bytes().all(|c| c.is_ascii_uppercase())
            || self.locale.is_empty()
            || self.locale.len() > 35
        {
            return Err("invalid source shop, currency or locale".into());
        }
        Ok(())
    }
    pub fn text(&self, value: impl Into<String>) -> Value {
        let mut m = serde_json::Map::new();
        m.insert(self.locale.clone(), json!(value.into()));
        Value::Object(m)
    }
    pub fn money(&self, value: &Value) -> Result<Money> {
        Money::parse(value, &self.currency, self.scale)
    }
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Record {
    pub version: u8,
    pub source: Source,
    pub source_shop: String,
    pub kind: String,
    pub source_id: String,
    pub data: Value,
    pub warnings: Vec<String>,
}
impl Record {
    pub fn new(c: &Context, kind: &str, id: String, data: Value) -> Result<Self> {
        c.validate()?;
        if id.is_empty() || id.len() > 200 || id.chars().any(char::is_control) {
            return Err("source identity is missing or invalid".into());
        }
        if data.to_string().len() > 512 * 1024 {
            return Err("record exceeds 512 KiB; split its source projection".into());
        }
        Ok(Self {
            version: 1,
            source: c.source,
            source_shop: c.shop.clone(),
            kind: kind.into(),
            source_id: id,
            data,
            warnings: vec![],
        })
    }
    pub fn identity(&self, tenant: &str) -> String {
        let raw = serde_json::to_vec(&(
            tenant,
            self.source,
            self.source_shop.as_str(),
            self.kind.as_str(),
            self.source_id.as_str(),
        ))
        .unwrap();
        let digest = Sha256::digest(raw);
        let mut bytes = [0; 16];
        bytes.copy_from_slice(&digest[..16]);
        uuid::Uuid::from_bytes(bytes).to_string()
    }
    pub fn digest(&self) -> String {
        format!(
            "{:x}",
            Sha256::digest(serde_json::to_value(self).unwrap().to_string())
        )
    }
}
pub fn text(v: &Value) -> String {
    v.as_str()
        .map(str::to_owned)
        .or_else(|| v.as_i64().map(|n| n.to_string()))
        .unwrap_or_default()
}
pub fn field(v: &Value, paths: &[&str]) -> Value {
    paths
        .iter()
        .find_map(|p| {
            let mut x = v;
            for k in p.split('.') {
                x = x.get(k)?;
            }
            (!x.is_null()).then(|| x.clone())
        })
        .unwrap_or(Value::Null)
}
pub fn id(v: &Value, paths: &[&str]) -> Result<String> {
    let s = text(&field(v, paths));
    if s.is_empty() {
        Err("source identity missing".into())
    } else {
        Ok(s)
    }
}
