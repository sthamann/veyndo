//! PHP namespace resolution; short names cannot spoof a registered Shopware service.
use crate::{Diagnostic, Result};
use mago_span::HasSpan;
use mago_syntax::ast::*;
use std::collections::BTreeMap;
pub(crate) struct Scope<'a> {
    pub path: &'a str,
    pub source: &'a str,
    pub namespace: String,
    pub imports: BTreeMap<String, String>,
}
pub(crate) fn text(bytes: &[u8]) -> String {
    String::from_utf8_lossy(bytes).into_owned()
}
impl Scope<'_> {
    pub fn error(&self, node: &impl HasSpan, message: impl Into<String>) -> Diagnostic {
        let offset = node.span().start.offset as usize;
        Diagnostic::new(
            self.path,
            1 + self.source.as_bytes()[..offset.min(self.source.len())]
                .iter()
                .filter(|b| **b == b'\n')
                .count(),
            message,
        )
    }
    pub fn resolve(&self, id: &Identifier<'_>) -> String {
        let name = text(id.value());
        if id.is_fully_qualified() {
            return name.trim_start_matches('\\').into();
        }
        let (first, rest) = name.split_once('\\').unwrap_or((&name, ""));
        if let Some(import) = self.imports.get(&first.to_ascii_lowercase()) {
            return format!(
                "{import}{}",
                if rest.is_empty() {
                    String::new()
                } else {
                    format!("\\{rest}")
                }
            );
        }
        if self.namespace.is_empty() {
            name
        } else {
            format!("{}\\{name}", self.namespace)
        }
    }
    pub fn import(&mut self, u: &Use<'_>) -> Result<()> {
        let UseItems::Sequence(seq) = &u.items else {
            return Err(self.error(
                u,
                "Grouped or non-class imports require an explicit resolver adapter",
            ));
        };
        for item in seq.items.iter() {
            let name = text(item.name.value()).trim_start_matches('\\').to_owned();
            let alias = item
                .alias
                .as_ref()
                .map(|a| text(a.identifier.value))
                .unwrap_or_else(|| name.rsplit('\\').next().unwrap_or("").into())
                .to_ascii_lowercase();
            if self.imports.insert(alias, name).is_some() {
                return Err(self.error(u, "Duplicate imported symbol"));
            }
        }
        Ok(())
    }
    pub fn hint(&self, h: &Option<Hint<'_>>) -> Option<String> {
        match h {
            Some(Hint::Identifier(i)) => Some(self.resolve(i)),
            _ => None,
        }
    }
}
