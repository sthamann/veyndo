//! A WooCommerce variation snapshot must cover exactly the declared source IDs and concrete attribute combinations.
use super::*;
use std::collections::BTreeSet;
pub fn expected(v: &Value) -> Result<BTreeSet<u64>> {
    let ids = v["variations"]
        .as_array()
        .filter(|xs| !xs.is_empty() && xs.len() <= 100)
        .ok_or("Variable products need a bounded complete variations export")?;
    let mut expected = BTreeSet::new();
    for id in ids {
        let id = id
            .as_u64()
            .filter(|n| *n > 0)
            .ok_or("Invalid WooCommerce variation identity")?;
        if v["id"].as_u64() == Some(id) || !expected.insert(id) {
            return Err("Duplicate WooCommerce variation identity".into());
        }
    }
    Ok(expected)
}
pub fn variants(v: &Value) -> Result<Vec<Value>> {
    let expected = expected(v)?;
    let axes = axes(v)?;
    let rows = v["_migrationVariations"]
        .as_array()
        .filter(|xs| xs.len() == expected.len())
        .ok_or(
            "Variable products require every declared variation; no partial parent was imported",
        )?;
    let parent = v["id"]
        .as_u64()
        .filter(|n| *n > 0)
        .ok_or("Invalid WooCommerce parent identity")?;
    let mut actual = BTreeSet::new();
    let mut combinations = BTreeSet::new();
    for row in rows {
        let id = row["id"]
            .as_u64()
            .filter(|n| *n > 0)
            .ok_or("Invalid variation identity")?;
        if !actual.insert(id)
            || row
                .get("parent_id")
                .is_some_and(|n| n.as_u64() != Some(parent))
        {
            return Err("Duplicate or foreign WooCommerce variation".into());
        }
        let attributes = row["attributes"]
            .as_array()
            .filter(|xs| !xs.is_empty() && xs.len() <= 40)
            .ok_or("Variation needs explicit concrete attributes")?;
        if row
            .get("gallery_image_ids")
            .is_some_and(|v| v.as_array().is_none_or(|xs| !xs.is_empty()))
        {
            return Err("Variation gallery IDs require explicit public image mapping".into());
        }
        if !combinations.insert(super::relations::options(row)?.to_string()) {
            return Err(
                "Duplicate concrete variation combination requires source reconciliation".into(),
            );
        }
        if attributes.len() != axes.len() {
            return Err("Variation does not cover every declared parent axis".into());
        }
        for attribute in attributes {
            for key in ["name", "option"] {
                if attribute[key]
                    .as_str()
                    .is_none_or(|s| s.trim().is_empty() || s.chars().count() > 100)
                {
                    return Err("Wildcard or unnamed variation attribute requires explicit combination expansion".into());
                }
            }
            let name = attribute["name"].as_str().unwrap();
            let option = attribute["option"].as_str().unwrap();
            if axes
                .get(name)
                .is_none_or(|options| !options.contains(option))
            {
                return Err("Variation uses an undeclared axis or option".into());
            }
        }
    }
    if actual != expected {
        return Err("Variation source set changed; review the complete parent again".into());
    }
    let mut rows = rows.clone();
    rows.sort_by_key(|row| row["id"].as_u64());
    Ok(rows)
}

pub fn visibility(v: &Value) -> Result<Option<bool>> {
    if v.get("catalog_visibility")
        .is_some_and(|value| !value.is_null() && value != "visible")
    {
        return Err(
            "Separate source catalogue/search/direct visibility requires explicit mapping".into(),
        );
    }
    match v.get("status") {
        Some(Value::String(status)) => match status.as_str() {
            "publish" => Ok(Some(true)),
            "draft" | "private" | "pending" | "future" | "trash" => Ok(Some(false)),
            _ => Err("Unsupported source product visibility".into()),
        },
        None | Some(Value::Null) => Ok(None),
        _ => Err("Source product visibility must be an explicit status".into()),
    }
}

fn axes(v: &Value) -> Result<std::collections::BTreeMap<String, BTreeSet<String>>> {
    let values = v["attributes"]
        .as_array()
        .filter(|xs| xs.len() <= 40)
        .ok_or("Variable parent needs every declared attribute axis")?;
    let mut axes = std::collections::BTreeMap::new();
    for value in values {
        let variation = value["variation"]
            .as_bool()
            .ok_or("Parent attribute variation flag required")?;
        if !variation {
            continue;
        }
        let name = value["name"]
            .as_str()
            .filter(|s| !s.trim().is_empty() && s.chars().count() <= 100)
            .ok_or("Parent variation axis name required")?;
        let options = value["options"]
            .as_array()
            .filter(|xs| !xs.is_empty() && xs.len() <= 100)
            .ok_or("Parent variation options required")?;
        let mut choices = BTreeSet::new();
        for option in options {
            let option = option
                .as_str()
                .filter(|s| !s.trim().is_empty() && s.chars().count() <= 100)
                .ok_or("Parent variation option must be concrete text")?;
            if !choices.insert(option.into()) {
                return Err("Duplicate parent variation option".into());
            }
        }
        if axes.insert(name.into(), choices).is_some() {
            return Err("Duplicate parent variation axis".into());
        }
    }
    if axes.is_empty() {
        return Err("Variable parent declares no concrete variation axis".into());
    }
    Ok(axes)
}
