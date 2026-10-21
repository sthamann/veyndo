//! Provider wire adaptation for strict fixed-object schemas; dynamic JSON is encoded only on the model wire and restored before domain validation.
use serde_json::{Value, json};
pub(super) fn strict_schema(mut v: Value) -> Value {
    // OpenAI's strict array subset excludes uniqueItems. Preserve the domain
    // schema and reject duplicates during restoration before any proposal exists.
    if let Some(object) = v.as_object_mut() {
        object.remove("uniqueItems");
    }
    if v.is_object()
        && ((v["type"] == "object" && !v["properties"].is_object())
            || (v.get("type").is_none() && v.get("anyOf").is_none() && v.get("enum").is_none()))
    {
        return json!({"type":"string","description":"JSON-encoded value. Encode the entire object/value as a JSON string; the host restores and validates it."});
    }
    for key in ["anyOf", "oneOf"] {
        if let Some(xs) = v.get_mut(key).and_then(Value::as_array_mut) {
            for x in xs {
                *x = strict_schema(x.clone());
            }
        }
    }
    if let Some(items) = v.get_mut("items") {
        *items = strict_schema(items.clone());
    }
    if v["type"] == "object" {
        let required = v["required"].as_array().cloned().unwrap_or_default();
        let properties = v["properties"].as_object_mut().unwrap();
        for (name, value) in properties.iter_mut() {
            *value = strict_schema(value.clone());
            if !required.contains(&json!(name)) {
                *value = json!({"anyOf":[value.clone(),{"type":"null"}]});
            }
        }
        let names = properties.keys().cloned().collect::<Vec<_>>();
        v["required"] = json!(names);
        v["additionalProperties"] = json!(false);
    }
    v
}
pub(super) fn restore(schema: &Value, mut value: Value) -> Result<Value, String> {
    if value.is_null() {
        return Ok(value);
    }
    if (schema["type"] == "object" && !schema["properties"].is_object())
        || (schema.get("type").is_none()
            && schema.get("anyOf").is_none()
            && schema.get("enum").is_none())
    {
        if let Some(s) = value.as_str() {
            if s.len() > 65536 {
                return Err("Model JSON field exceeds 64 KiB".into());
            }
            value = serde_json::from_str(s).map_err(|_| "Model returned invalid encoded JSON")?;
        }
        return Ok(value);
    }
    if let Some(branches) = schema["anyOf"].as_array() {
        for branch in branches {
            let t = branch["type"].as_str().unwrap_or("");
            if (t == "object" && (value.is_object() || value.is_string()))
                || (t == "array" && value.is_array())
                || (t == "string" && value.is_string())
            {
                return restore(branch, value);
            }
        }
    }
    if let Some(properties) = schema["properties"].as_object()
        && let Some(object) = value.as_object_mut()
    {
        for (key, shape) in properties {
            // Strict providers require every property and encode omitted optional
            // fields as null. Undo only that wire adaptation: a required null or
            // an explicitly nullable/dynamic domain value must still be validated.
            let required = schema["required"]
                .as_array()
                .is_some_and(|keys| keys.iter().any(|name| name.as_str() == Some(key)));
            if !required
                && shape["type"].as_str().is_some_and(|kind| kind != "null")
                && object.get(key).is_some_and(Value::is_null)
            {
                object.remove(key);
                continue;
            }
            if let Some(v) = object.get_mut(key) {
                *v = restore(shape, v.clone())?;
            }
        }
    }
    if let Some(items) = schema.get("items")
        && let Some(array) = value.as_array_mut()
    {
        for v in array.iter_mut() {
            *v = restore(items, v.clone())?;
        }
        if schema["uniqueItems"] == true {
            let mut seen = std::collections::HashSet::new();
            for item in array {
                if !seen.insert(item.to_string()) {
                    return Err("Model returned duplicate items in a unique selection".into());
                }
            }
        }
    }
    Ok(value)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn unique_product_selection_is_enforced_by_host_not_provider_schema() {
        let schema = json!({"type":"object","properties":{
            "translation_products":{"type":["array","null"],"minItems":1,
                "maxItems":1000,"uniqueItems":true,"items":{"type":"string"}}
        }});
        let wire = strict_schema(schema.clone());
        let selection = &wire["properties"]["translation_products"]["anyOf"][0];
        assert!(selection.get("uniqueItems").is_none());
        assert_eq!(selection["maxItems"], 1000);
        assert!(restore(&schema, json!({"translation_products":["a","a"]})).is_err());
        let distinct = json!({"translation_products":["a","b"]});
        assert_eq!(restore(&schema, distinct.clone()).unwrap(), distinct);
        assert_eq!(
            restore(&schema, json!({"translation_products":null})).unwrap(),
            json!({"translation_products":null})
        );
        assert_eq!(
            schema["properties"]["translation_products"]["uniqueItems"],
            true
        );
    }
    #[test]
    fn wire_only_optional_nulls_restore_absence_without_clearing_domain_values() {
        let schema = json!({"type":"object","required":["changes"],"properties":{
            "changes":{"type":"array","items":{"type":"object"}},
            "operations":{"type":"array","items":{"type":"object"}},
            "manifest":{"type":"object","required":[],"properties":{
                "lifecycles":{"type":"array","items":{"type":"object"}},
                "caption":{"anyOf":[{"type":"string"},{"type":"null"}]},
                "arbitrary":{}
            }}
        }});
        let restored = restore(
            &schema,
            json!({"changes":[],"operations":null,
            "manifest":{"lifecycles":null,"caption":null,"arbitrary":null}}),
        )
        .unwrap();
        assert!(restored.get("operations").is_none());
        assert!(restored["manifest"].get("lifecycles").is_none());
        assert_eq!(restored["manifest"].get("caption"), Some(&Value::Null));
        assert_eq!(restored["manifest"].get("arbitrary"), Some(&Value::Null));
        // Invalid required values remain visible to the ordinary domain validator.
        assert_eq!(
            restore(&schema, json!({"changes":null})).unwrap()["changes"],
            Value::Null
        );
    }
    #[test]
    fn dynamic_fields_roundtrip_and_invalid_wire_json_fails_closed() {
        let schema = json!({"type":"object","properties":{"fields":{"type":"object"},"branches":{"type":"array","items":{"anyOf":[{"type":"object","properties":{"value":{}}},{"type":"null"}]}}}});
        let wire = strict_schema(schema.clone());
        assert_eq!(wire["properties"]["fields"]["anyOf"][0]["type"], "string");
        let value=restore(&schema,json!({"fields":"{\"money\":{\"minor\":125,\"currency\":\"USD\",\"scale\":2}}","branches":[{"value":"[1,true]"}]})).unwrap();
        assert_eq!(value["fields"]["money"]["minor"], 125);
        assert_eq!(value["branches"][0]["value"], json!([1, true]));
        assert!(restore(&schema, json!({"fields":"invalid JSON"})).is_err());
    }
}
