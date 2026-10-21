//! Selective publication checks every selected domain's current rights before writing any live row.
use super::*;
pub(super) fn permit(h: &RequestContext, keys: &[String]) -> Result<()> {
    for key in keys {
        let scope = match key.split(':').next().unwrap_or("") {
            "product" | "category" | "asset" => "catalog.write",
            "document" => "knowledge.write",
            "app" | "appdata" => "apps.manage",
            "b2b-company" | "b2b-unit" => "b2b.manage",
            "channel" => "channels.manage",
            "rule" | "promotion" | "flow" => "automation.manage",
            "company" | "company-channel" | "settings" | "settings-channel" | "experience"
            | "order-workflow" => "settings.write",
            _ => return Err(bad("Unsupported release unit")),
        };
        auth::permit(h, scope)?;
        if key.starts_with("b2b-") {
            auth::permit(h, "b2b.read")?;
            auth::permit(h, "customers.pii")?;
        }
        if key.starts_with("b2b-unit:") {
            auth::permit(h, "catalog.read")?;
        }
    }
    Ok(())
}

/// Staging diffs contain actual records, so each domain read right is mandatory.
pub(super) fn can_read(h: &RequestContext, key: &str) -> bool {
    let scope = match key.split(':').next().unwrap_or("") {
        "product" | "category" | "asset" => "catalog.read",
        "document" => "knowledge.read",
        "app" => "apps.read",
        "appdata" => "apps.manage",
        "b2b-company" | "b2b-unit" => "b2b.read",
        "channel" => "channels.read",
        "rule" | "promotion" | "flow" => "automation.read",
        _ => "settings.read",
    };
    auth::allowed(h, scope)
        && (!(key.starts_with("b2b-") || key.starts_with("appdata:"))
            || auth::allowed(h, "customers.pii"))
}

/// Use the locked snapshot's model, avoiding a second backend while its transaction owns the pool.
pub(super) fn can_read_unit(h: &RequestContext, key: &str, current: &Value) -> Result<bool> {
    if !key.starts_with("appdata:") {
        return Ok(can_read(h, key));
    }
    if !auth::allowed(h, "apps.read") {
        return Ok(false);
    }
    let parts = key.split(':').collect::<Vec<_>>();
    if parts.len() != 4 {
        return Ok(false);
    }
    let Some(manifest) = current
        .get(format!("app:{}", parts[1]))
        .and_then(|package| package.get("manifest"))
    else {
        return Ok(false);
    };
    let m: apps::Manifest =
        serde_json::from_value(manifest.clone()).map_err(|_| bad("Invalid app"))?;
    let Some(e) = m.entities.iter().find(|e| e.name == parts[2]) else {
        return Ok(false);
    };
    if !e.public_read && !auth::allowed(h, "customers.pii") {
        return Ok(false);
    }
    Ok(apps::record_access(&m, e, h, "list").is_ok())
}

/// Baseline values retain their original read boundary after schema/permission changes.
pub(super) fn before(
    h: &RequestContext,
    key: &str,
    baseline: &Value,
    current: &Value,
) -> Option<Value> {
    let value = baseline.get(key)?;
    if !key.starts_with("appdata:") {
        return Some(value.clone());
    }
    let parts = key.split(':').collect::<Vec<_>>();
    if parts.len() != 4 {
        return None;
    }
    let old: apps::Manifest = serde_json::from_value(
        baseline
            .get(format!("app:{}", parts[1]))?
            .get("manifest")?
            .clone(),
    )
    .ok()?;
    let prior = old.entities.iter().find(|e| e.name == parts[2])?;
    if apps::record_access(&old, prior, h, "list").is_err()
        || (!prior.public_read && !auth::allowed(h, "customers.pii"))
    {
        return None;
    }
    let new: apps::Manifest = serde_json::from_value(
        current
            .get(format!("app:{}", parts[1]))?
            .get("manifest")?
            .clone(),
    )
    .ok()?;
    let entity = new.entities.iter().find(|e| e.name == parts[2])?;
    let mut projection = serde_json::Map::new();
    projection.insert("id".into(), value["id"].clone());
    for field in &entity.fields {
        if let Some(v) = value.get(&field.name) {
            projection.insert(field.name.clone(), v.clone());
        }
    }
    Some(Value::Object(projection))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn snapshot_reads_keep_model_action_and_private_data_rights() {
        let mut current = json!({"app:fixture":{"manifest":{"id":"fixture","version":"1.0.0","coreApi":"1","runtime":"declarative","name":{"en":"Fixture"},"permissions":["data.read"],"entities":[{"name":"notes","publicRead":true,"fields":[]}],"actions":[{"name":"list_notes","description":"Read notes","handler":"list","entity":"notes","permission":"catalog.read","requiredPermissions":["knowledge.read"],"inputSchema":{}}],"slots":[],"events":[]}}});
        let mut h = RequestContext::new();
        h.principal.role = Some("viewer".into());
        h.principal.permissions = Some(json!(["apps.read", "catalog.read"]).to_string());
        let key = "appdata:fixture:notes:same";
        assert!(!can_read_unit(&h, key, &current).unwrap());
        h.principal.permissions =
            Some(json!(["apps.read", "catalog.read", "knowledge.read"]).to_string());
        assert!(can_read_unit(&h, key, &current).unwrap());
        current["app:fixture"]["manifest"]["entities"][0]["publicRead"] = json!(false);
        assert!(!can_read_unit(&h, key, &current).unwrap());
        h.principal.permissions = Some(
            json!([
                "apps.read",
                "catalog.read",
                "knowledge.read",
                "customers.pii"
            ])
            .to_string(),
        );
        assert!(can_read_unit(&h, key, &current).unwrap());
        for invalid in [
            "appdata:absent:notes:same",
            "appdata:fixture:absent:same",
            "appdata:fixture",
        ] {
            assert!(!can_read_unit(&h, invalid, &current).unwrap());
        }
    }
}
