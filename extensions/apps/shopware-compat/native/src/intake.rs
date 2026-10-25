//! Bound source intake and resolve Symfony registration without executing Composer or extension scripts.
use crate::{Diagnostic, Request, Result};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
pub(crate) struct Registration {
    pub namespace: String,
    pub bootstrap: String,
    pub processor: String,
    pub label: Value,
}
pub(crate) fn fingerprint(r: &Request) -> (String, BTreeMap<String, String>) {
    let hashes = r
        .files
        .iter()
        .map(|(p, s)| (p.clone(), format!("{:x}", Sha256::digest(s.as_bytes()))))
        .collect::<BTreeMap<_, _>>();
    let bytes = serde_json::to_vec(&(
        crate::PROFILE,
        env!("CARGO_PKG_VERSION"),
        &r.app_id,
        &r.version,
        &hashes,
    ))
    .expect("string map");
    (format!("{:x}", Sha256::digest(bytes)), hashes)
}
pub(crate) fn validate(r: &Request) -> Result<Registration> {
    let bad = |file: &str, text: &str| Diagnostic::new(file, 1, text);
    if r.app_id.is_empty()
        || r.app_id.len() > 48
        || !r
            .app_id
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'_')
    {
        return Err(bad(
            "request",
            "App ID must contain 1–48 lowercase letters, digits or underscores",
        ));
    }
    semver::Version::parse(&r.version)
        .map_err(|_| bad("request", "A semantic app version is required"))?;
    if r.files.is_empty()
        || r.files.len() > 64
        || r.files.values().map(String::len).sum::<usize>() > 262144
    {
        return Err(bad("request", "Source package exceeds 64 files or 256 KiB"));
    }
    for (path, source) in &r.files {
        if path.len() > 200
            || path.starts_with('/')
            || path.contains('\\')
            || path
                .split('/')
                .any(|s| s.is_empty() || s == "." || s == "..")
            || source.len() > 32768
        {
            return Err(bad(path, "Invalid source path or file exceeds 32 KiB"));
        }
        if !(path.ends_with(".php")
            || path == "composer.json"
            || path == "src/Resources/config/services.xml"
            || path == "README.md"
            || path == "LICENSE")
        {
            return Err(bad(
                path,
                "This package contains an unconverted resource; the entire native import is blocked",
            ));
        }
    }
    let composer: Value = serde_json::from_str(
        r.files
            .get("composer.json")
            .ok_or_else(|| bad("composer.json", "Missing Composer manifest"))?,
    )
    .map_err(|_| bad("composer.json", "Invalid JSON"))?;
    let allowed = [
        "name",
        "description",
        "license",
        "authors",
        "keywords",
        "homepage",
        "type",
        "version",
        "support",
        "funding",
        "time",
        "require",
        "autoload",
        "extra",
    ];
    if composer
        .as_object()
        .is_none_or(|m| m.keys().any(|k| !allowed.contains(&k.as_str())))
    {
        return Err(bad(
            "composer.json",
            "Unconverted Composer behavior; only package metadata and explicit profile contracts are admitted",
        ));
    }
    if composer["extra"].as_object().is_none_or(|m| {
        m.keys().any(|k| {
            ![
                "shopware-plugin-class",
                "label",
                "description",
                "manufacturerLink",
                "supportLink",
            ]
            .contains(&k.as_str())
        })
    }) {
        return Err(bad(
            "composer.json",
            "Unconverted Composer extra configuration",
        ));
    }
    if composer["type"] != "shopware-platform-plugin"
        || composer.get("scripts").is_some()
        || composer.get("autoload-dev").is_some()
    {
        return Err(bad(
            "composer.json",
            "Require a Shopware plugin without executable Composer scripts or development autoloading",
        ));
    }
    let requires = composer["require"]
        .as_object()
        .ok_or_else(|| bad("composer.json", "Missing require map"))?;
    if requires
        .keys()
        .any(|k| !["php", "shopware/core"].contains(&k.as_str()))
        || requires.get("shopware/core").and_then(Value::as_str) != Some("~6.7.0")
    {
        return Err(bad(
            "composer.json",
            "Profile requires shopware/core ~6.7.0; additional dependency contracts must be translated first",
        ));
    }
    let label = &composer["extra"]["label"];
    if label.as_object().is_none_or(|labels| {
        labels.is_empty()
            || labels.len() > 32
            || labels.iter().any(|(locale, text)| {
                locale.len() > 35
                    || locale
                        .split('-')
                        .any(|p| p.is_empty() || !p.bytes().all(|b| b.is_ascii_alphanumeric()))
                    || text
                        .as_str()
                        .is_none_or(|s| s.trim().is_empty() || s.len() > 200)
            })
    }) {
        return Err(bad(
            "composer.json",
            "Provide the original localized plugin labels; translations are never fabricated",
        ));
    }
    let autoload = composer["autoload"]
        .as_object()
        .ok_or_else(|| bad("composer.json", "Missing PSR-4 autoload map"))?;
    if autoload.len() != 1
        || !autoload.contains_key("psr-4")
        || autoload["psr-4"]
            .as_object()
            .is_none_or(|m| m.len() != 1 || m.values().any(|v| v != "src/"))
    {
        return Err(bad(
            "composer.json",
            "Only one src/ PSR-4 namespace is admitted",
        ));
    }
    let bootstrap = composer["extra"]["shopware-plugin-class"]
        .as_str()
        .filter(|s| !s.is_empty())
        .ok_or_else(|| bad("composer.json", "Missing plugin bootstrap class"))?
        .to_owned();
    let namespace = autoload["psr-4"]
        .as_object()
        .unwrap()
        .keys()
        .next()
        .unwrap();
    if namespace.is_empty() || !namespace.ends_with('\\') || !bootstrap.starts_with(namespace) {
        return Err(bad(
            "composer.json",
            "Bootstrap must use the declared PSR-4 namespace",
        ));
    }
    let path = "src/Resources/config/services.xml";
    let xml = r
        .files
        .get(path)
        .ok_or_else(|| bad(path, "Missing service registration"))?;
    let doc = roxmltree::Document::parse(xml)
        .map_err(|_| bad(path, "Invalid service XML; DTDs are forbidden"))?;
    let mut processor = None;
    for n in doc.descendants().filter(|n| n.is_element()) {
        let parent = n.parent_element().map(|p| p.tag_name().name());
        let expected_parent = match n.tag_name().name() {
            "container" => None,
            "services" => Some("container"),
            "service" => Some("services"),
            "argument" | "tag" => Some("service"),
            _ => return Err(bad(path, "Unconverted service configuration element")),
        };
        if parent != expected_parent
            || n.children()
                .any(|c| c.is_text() && !c.text().unwrap_or("").trim().is_empty())
            || !matches!(
                n.tag_name().namespace(),
                None | Some("http://symfony.com/schema/dic/services")
            )
        {
            return Err(bad(path, "Changed service configuration structure"));
        }
        let allowed = match n.tag_name().name() {
            "container" => vec![],
            "services" => vec![],
            "service" => vec!["id", "public"],
            "argument" => vec!["type", "id"],
            "tag" => vec!["name", "priority"],
            _ => return Err(bad(path, "Unconverted service configuration element")),
        };
        if n.attributes().any(|a| match a.namespace() {
            None => !allowed.contains(&a.name()),
            Some("http://www.w3.org/2001/XMLSchema-instance") => {
                n.tag_name().name() != "container" || a.name() != "schemaLocation"
            }
            _ => true,
        }) {
            return Err(bad(
                path,
                "Unconverted service attribute (decorators, factories and calls require explicit adapters)",
            ));
        }
        match n.tag_name().name() {
            "container" | "services" if n.children().filter(|c| c.is_element()).count() != 1 => {
                return Err(bad(
                    path,
                    "Exactly one services block and one service are required",
                ));
            }
            "argument" | "tag" if n.children().any(|c| c.is_element()) => {
                return Err(bad(path, "Nested service configuration is not admitted"));
            }
            "service" => {
                if n.attribute("id")
                    .is_none_or(|id| !id.starts_with(namespace))
                {
                    return Err(bad(path, "Processor must use the declared PSR-4 namespace"));
                }
                if processor
                    .replace(n.attribute("id").unwrap_or("").to_owned())
                    .is_some()
                {
                    return Err(bad(
                        path,
                        "Only one processor may be admitted by this profile",
                    ));
                }
                if n.children()
                    .filter(|c| c.is_element() && c.has_tag_name("argument"))
                    .count()
                    != 1
                    || n.children()
                        .filter(|c| c.is_element() && c.has_tag_name("tag"))
                        .count()
                        != 1
                {
                    return Err(bad(
                        path,
                        "Processor needs exactly one calculator dependency and one processor tag",
                    ));
                }
            }
            "argument"
                if n.attribute("type") != Some("service")
                    || n.attribute("id") != Some(crate::contracts::CALCULATOR) =>
            {
                return Err(bad(path, "Unknown injected service"));
            }
            "tag"
                if n.attribute("name") != Some("shopware.cart.processor")
                    || n.attribute("priority") != Some("4500") =>
            {
                return Err(bad(
                    path,
                    "Only the post-product cart processor phase (4500) is supported",
                ));
            }
            _ => {}
        }
    }
    Ok(Registration {
        label: label.clone(),
        namespace: namespace.clone(),
        bootstrap,
        processor: processor
            .filter(|s| !s.is_empty())
            .ok_or_else(|| bad(path, "Missing processor"))?,
    })
}
