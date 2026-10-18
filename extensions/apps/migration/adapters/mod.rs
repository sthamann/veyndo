//! Source-specific parsing stays app-owned; unknown domains and incomplete records fail explicitly.
mod contacts;
mod coupons;
mod dates;
mod feedback;
mod order_lines;
mod pages;
mod products;
mod records;
mod relations;
mod visibility;
pub mod woo;
use crate::contract::*;
use serde_json::{Value, json};
pub fn normalize(c: &Context, kind: &str, v: &Value) -> Result<Vec<Record>> {
    c.validate()?;
    if kind == "products" {
        return products::normalize(c, v);
    }
    Ok(vec![records::normalize(c, kind, v)?])
}
pub(super) fn translated(c: &Context, v: &Value) -> Result<Value> {
    if let Some(s) = v.as_str() {
        return Ok(c.text(s));
    }
    if let Some(xs) = v.as_array() {
        let mut result = serde_json::Map::new();
        for x in xs {
            let id = text(&x["id"]);
            let locale = c.languages.get(&id).ok_or(
                "Map source language IDs to explicit locales before importing multilingual data",
            )?;
            if result
                .insert(
                    locale.clone(),
                    json!(text(&field(x, &["value", "language"]))),
                )
                .is_some()
            {
                return Err("Multiple source languages map to the same locale".into());
            }
        }
        return Ok(Value::Object(result));
    }
    Ok(c.text(""))
}
pub(super) fn list(v: &Value) -> Vec<Value> {
    if let Some(xs) = v.as_array() {
        return xs.clone();
    }
    if let Some(xs) = v["nodes"].as_array() {
        return xs.clone();
    }
    if let Some(xs) = v["edges"].as_array() {
        return xs.iter().map(|x| x["node"].clone()).collect();
    }
    vec![]
}
