//! Existing encrypted connector configuration remains the single provider credential owner.
use super::*;
pub async fn public(store: &Store, t: &str, a: &str) -> Result<Value> {
    let state = store.get(t, a).await?;
    Ok(
        json!({"revision":state["revision"],"settings":state["settings"],"credentialConfigured":!text(&state["credentials"],"apiKey").is_empty(),"jobs":store.jobs(t,a).await?}),
    )
}
pub async fn configure(store: &Store, t: &str, a: &str, v: &Value) -> Result<Value> {
    let s = &v["settings"];
    let obj = s
        .as_object()
        .ok_or(Error::Invalid("Settings object required"))?;
    checked(
        s.to_string().len() <= 4000
            && obj.iter().all(|(k, v)| {
                if k == "enabled" {
                    v.is_boolean()
                } else {
                    fields(a).contains(&k.as_str())
                        && v.as_str()
                            .is_some_and(|s| s.len() <= 100 && !s.chars().any(char::is_control))
                }
            }),
        "Unknown or invalid integration setting",
    )?;
    let mut tx = store.tx(t).await?;
    store.lock(&mut tx, t, a).await?;
    let mut current = store.get_tx(&mut tx, t, a).await?;
    if current["revision"] != v["revision"] {
        return Err(Error::Conflict);
    }
    let credentials = v.get("credentials").cloned().unwrap_or(json!({}));
    let changes = credentials
        .as_object()
        .ok_or(Error::Invalid("Credential object required"))?;
    checked(
        changes.keys().all(|k| k == "apiKey"),
        "Unknown credential field",
    )?;
    if let Some(key) = changes.get("apiKey") {
        let key = key
            .as_str()
            .ok_or(Error::Invalid("Credential must be text"))?;
        checked(
            key.len() <= 4000 && !key.contains(['\r', '\n', '\0']),
            "Invalid provider credential",
        )?;
        current["credentials"] = json!({"apiKey":key});
    }
    if s["enabled"] == true {
        secret(&text(&current["credentials"], "apiKey"))?;
        for key in fields(a) {
            if !["locale", "region"].contains(key) {
                identifier(s, key)?;
            }
        }
    }
    if a == "vercel" && s["enabled"] == true {
        let _ = super::vercel::prepare(s, &text(&current["credentials"], "apiKey"), &json!({}))?;
    }
    if a == "contentful" && s["enabled"] == true {
        let _ =
            super::contentful::prepare(s, &text(&current["credentials"], "apiKey"), &json!({}))?;
    }
    let purge =
        if a == "contentful" && (current["settings"] != *s || changes.contains_key("apiKey")) {
            Some(store.purge(&mut tx, t, a).await?)
        } else {
            None
        };
    current["settings"] = s.clone();
    current["revision"] = json!(current["revision"].as_u64().unwrap_or(0) + 1);
    store.save(&mut tx, t, a, &current).await?;
    tx.commit().await?;
    let mut result = public(store, t, a).await?;
    if let Some(cursor) = purge {
        result["purgeSources"] = json!(true);
        result["exportCursor"] = json!(cursor);
    }
    Ok(result)
}
