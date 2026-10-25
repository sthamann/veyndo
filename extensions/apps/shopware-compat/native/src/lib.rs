//! Original PHP is parsed, never executed; admitted decisions become regular sandboxed apps.
mod component;
mod contracts;
mod expressions;
mod intake;
mod php;
mod symbols;
mod syntax_budget;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;

pub const PROFILE: &str = "shopware-6.7/cart-percentage-v1";
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Request {
    pub app_id: String,
    pub version: String,
    pub files: BTreeMap<String, String>,
}
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Diagnostic {
    pub file: String,
    pub line: usize,
    pub code: String,
    pub message: String,
}
impl Diagnostic {
    fn new(file: &str, line: usize, message: impl Into<String>) -> Self {
        Self {
            file: file.into(),
            line,
            code: "unsupported_contract".into(),
            message: message.into(),
        }
    }
}
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Report {
    pub profile: String,
    pub compiler: String,
    pub source_digest: String,
    pub files: BTreeMap<String, String>,
    pub diagnostics: Vec<Diagnostic>,
    pub manifest: Option<Value>,
    pub decision: Option<CartDiscount>,
}
/// Normalized decision consumed by the native component compiler, API and review UI.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CartDiscount {
    pub basis_points: i64,
    pub label: String,
    pub source_line_id: String,
    pub source_line_type: String,
}
type Result<T> = std::result::Result<T, Diagnostic>;

/// Returns no installable package when any source, registration or semantic boundary is unknown.
/// Callers must retain the original source and report; native review decides installation separately.
pub fn translate(request: &Request) -> Report {
    let (digest, hashes) = intake::fingerprint(request);
    let mut report = Report {
        profile: PROFILE.into(),
        compiler: env!("CARGO_PKG_VERSION").into(),
        source_digest: digest,
        files: hashes,
        diagnostics: vec![],
        manifest: None,
        decision: None,
    };
    let result = intake::validate(request).and_then(|registration| {
        let mut processors = BTreeMap::new();
        let mut bootstrap = false;
        for (path, source) in &request.files {
            if path.ends_with(".php") {
                for class in php::analyse(path, source, &registration.bootstrap)? {
                    match class {
                        php::ClassResult::Bootstrap => {
                            if bootstrap {return Err(Diagnostic::new(path, 1, "Duplicate plugin bootstrap"));}
                            let expected = format!("src/{}.php", registration.bootstrap.strip_prefix(&registration.namespace).unwrap().replace('\\', "/"));
                            if *path != expected {return Err(Diagnostic::new(path, 1, "Bootstrap path does not match PSR-4 autoloading"));}
                            bootstrap = true;
                        },
                        php::ClassResult::Processor { name, decision } => {
                            let Some(relative) = name.strip_prefix(&registration.namespace) else {return Err(Diagnostic::new(path, 1, "Processor is outside the autoload namespace"));};
                            if *path != format!("src/{}.php", relative.replace('\\', "/")) {return Err(Diagnostic::new(path, 1, "Processor path does not match PSR-4 autoloading"));}
                            if processors.insert(name, decision).is_some() {
                                return Err(Diagnostic::new(path, 1, "Duplicate class declaration"));
                            }
                        }
                    }
                }
            }
        }
        if !bootstrap || processors.len() != 1 || !processors.contains_key(&registration.processor) {
            return Err(Diagnostic::new("src/Resources/config/services.xml", 1,
                "The package must contain its empty Plugin bootstrap and exactly the registered cart processor"));
        }
        let decision = processors.remove(&registration.processor).expect("registered processor");
        let manifest = component::manifest(request, &report.source_digest, &registration.label, &decision);
        report.decision = Some(decision);
        Ok(manifest)
    });
    match result {
        Ok(manifest) => report.manifest = Some(manifest),
        Err(error) => report.diagnostics.push(error),
    }
    report
}
