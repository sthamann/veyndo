//! Compile a bounded new-app brief into the existing native Manifest; no model-authored wiring or new executor.
use super::*;
pub(super) fn empty(m: &Value) -> bool {
    m["runtime"] == "declarative"
        && [
            "entities",
            "views",
            "surfaces",
            "actions",
            "slots",
            "events",
            "lifecycles",
            "settings",
        ]
        .iter()
        .all(|k| {
            m.get(k)
                .is_none_or(|v| v.as_array().is_some_and(Vec::is_empty))
        })
        && [
            "paymentProvider",
            "configuration",
            "capability",
            "distribution",
            "presentation",
        ]
        .iter()
        .all(|key| m.get(key).is_none_or(Value::is_null))
}
pub(super) fn schema(locales: &[String]) -> Value {
    let base = generation::schema_for(locales);
    let props = &base["properties"]["manifest"]["properties"];
    let mut entities = props["entities"].clone();
    entities["minItems"] = json!(1);
    entities["maxItems"] = json!(3);
    entities["items"]["properties"]["publicRead"] = json!({"type":"boolean","enum":[false]});
    entities["items"]["properties"]["extends"] = json!({"type":"null"});
    entities["items"]["properties"]["fields"]["maxItems"] = json!(16);
    entities["items"]["properties"]["fields"]["items"] =
        generation_fields::schema(&entities["items"]["properties"]["fields"]["items"]);
    let mut definition = json!({"type":"object","additionalProperties":false,
        "required":["name","entities","settings","placements"],"properties":{
        "name":props["name"],"summary":base["properties"]["summary"],"entities":entities,"settings":props["settings"],
        "placements":{"type":"array","minItems":1,"maxItems":6,"items":{"type":"object","additionalProperties":false,
            "required":["location","entity","label","saveLabel"],"properties":{
            "location":{"type":"string","enum":["admin.navigation","admin.product.tab","admin.customer","admin.order","admin.b2b.company","admin.b2b.unit"]},
            "entity":{"type":"string"},"label":props["name"],"saveLabel":props["name"]}}}}});
    definition["properties"]
        .as_object_mut()
        .unwrap()
        .remove("summary");
    json!({"type":"object","additionalProperties":false,"required":["summary","manifest"],"properties":{"summary":base["properties"]["summary"],"manifest":definition}})
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Brief {
    name: HashMap<String, String>,
    summary: HashMap<String, String>,
    entities: Vec<Value>,
    settings: Vec<Value>,
    placements: Vec<Placement>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Placement {
    location: String,
    entity: String,
    label: HashMap<String, String>,
    save_label: HashMap<String, String>,
}
pub(super) fn apply(old: &Value, output: &Value, versions: &Value) -> Result<Value> {
    if !empty(old) {
        return Err(bad("Guided creation requires an empty private draft"));
    }
    if output
        .as_object()
        .is_none_or(|o| o.len() != 2 || !o.contains_key("summary") || !o.contains_key("manifest"))
    {
        return Err(bad("Invalid guided app brief envelope"));
    }
    let mut definition = output["manifest"].clone();
    definition
        .as_object_mut()
        .ok_or(bad("Invalid guided app definition"))?
        .insert("summary".into(), output["summary"].clone());
    let brief: Brief =
        serde_json::from_value(definition).map_err(|_| bad("Invalid guided app brief"))?;
    if brief.entities.is_empty()
        || brief.entities.len() > 3
        || brief.settings.len() > 16
        || brief.placements.is_empty()
        || brief.placements.len() > 6
        || brief.entities.iter().any(|e| {
            e["publicRead"] != false
                || e.get("extends").is_some_and(|v| !v.is_null())
                || e["fields"].as_array().is_none_or(|f| f.len() > 16)
        })
    {
        return Err(bad(
            "Guided apps need bounded private models and placements",
        ));
    }
    let mut version = semver::Version::parse(old["version"].as_str().unwrap_or("0.1.0"))
        .map_err(|_| bad("Invalid draft version"))?;
    while versions
        .as_array()
        .into_iter()
        .flatten()
        .any(|v| v["app"] == old["id"] && v["version"] == version.to_string())
    {
        version.patch = version
            .patch
            .checked_add(1)
            .ok_or(bad("App version limit exceeded"))?;
    }
    let mut views = Vec::new();
    let mut surfaces = Vec::new();
    for (i, p) in brief.placements.iter().enumerate() {
        let entity = brief
            .entities
            .iter()
            .find(|e| e["name"] == p.entity)
            .ok_or(bad("Placement needs an existing data model"))?;
        let binding = match p.location.as_str() {
            "admin.navigation" => None,
            "admin.product.tab" => Some(("product", "productId")),
            "admin.customer" => Some(("customer", "customerId")),
            "admin.order" => Some(("order", "orderId")),
            "admin.b2b.company" => Some(("b2bCompany", "companyId")),
            "admin.b2b.unit" => Some(("b2bUnit", "unitId")),
            _ => {
                return Err(bad(
                    "Guided app placement must be a registered private admin location",
                ));
            }
        };
        let context = if let Some((core, key)) = binding {
            let field = entity["fields"]
                .as_array()
                .unwrap()
                .iter()
                .find(|f| {
                    f["coreReference"] == core && f["indexed"] == true && f["kind"] == "string"
                })
                .ok_or(bad(
                    "Contextual placement needs an indexed native reference field",
                ))?;
            json!({"field":field["name"],"key":key})
        } else {
            Value::Null
        };
        let suffix = p.entity.chars().take(27).collect::<String>();
        let read = format!("list_{suffix}");
        let write = format!("save_{suffix}");
        let id = format!("view_{i}");
        views.push(json!({"id":id,"layout":"form","blocks":[
            {"id":"records","kind":"table","title":p.label,"entity":p.entity,"readAction":read,"contextBinding":context,"geometry":{"x":0,"y":0,"w":6,"h":10}},
            {"id":"editor","kind":"form","title":p.label,"entity":p.entity,"readAction":read,"writeAction":write,"contextBinding":context,"geometry":{"x":6,"y":0,"w":6,"h":10}},
            {"id":"save","kind":"button","title":p.save_label,"geometry":{"x":6,"y":10,"w":6,"h":2},"handlers":{"click":[{"op":"validate","target":"editor"},{"op":"call","action":write,"input":{"kind":"record","block":"editor"}},{"op":"refresh","target":"records"}]}}
        ]}));
        surfaces.push(json!({"id":id,"location":p.location,"label":p.label,"uiPath":format!("native/{id}"),"actions":[read,write]}));
    }
    let mut result = json!({"summary":brief.summary,"manifest":{"id":old["id"],"version":version.to_string(),"coreApi":"1","runtime":"declarative","category":"operations","name":brief.name,"permissions":["data.read","data.write","admin.slot"],"entities":brief.entities,"settings":brief.settings,"views":views,"surfaces":surfaces,"slots":[],"apiRoutes":[],"intelligence":{"description":brief.summary,"tools":[],"entities":[]}}});
    routes::actions(&mut result["manifest"])?;
    generation_bindings::new_app_assets(&mut result["manifest"])?;
    Ok(result)
}
#[cfg(test)]
mod tests {
    use super::*;
    fn original() -> Value {
        json!({"id":"private_app","version":"0.1.0","coreApi":"1","runtime":"declarative","name":{"en":"Test"},"entities":[],"views":[],"surfaces":[],"actions":[],"settings":[]})
    }
    fn brief() -> Value {
        let m: Value = serde_json::from_str(include_str!(
            "../../extensions/apps/product-advisor/manifest.json"
        ))
        .unwrap();
        let mut entity = m["entities"][0].clone();
        entity["publicRead"] = json!(false);
        entity["fields"]
            .as_array_mut()
            .unwrap()
            .push(json!({"name":"design","kind":"file","label":{"en":"Design"}}));
        json!({"summary":m["name"],"manifest":{"name":m["name"],"entities":[entity],"settings":[{"key":"team","kind":"string","label":{"en":"Team"},"required":true}],"placements":[{"location":"admin.product.tab","entity":"entries","label":m["name"],"saveLabel":m["name"]},{"location":"admin.navigation","entity":"entries","label":m["name"],"saveLabel":m["name"]}]}})
    }
    #[test]
    fn merchant_brief_produces_connected_private_views_and_real_native_handlers() {
        assert!(empty(&original()));
        let mut out = apply(&original(), &brief(), &json!([])).unwrap();
        routes::actions(&mut out["manifest"]).unwrap();
        generation_bindings::complete(&mut out["manifest"]).unwrap();
        let m: apps::Manifest = serde_json::from_value(out["manifest"].clone()).unwrap();
        apps::validate(&m).unwrap();
        assert_eq!(m.id, "private_app");
        assert_eq!(m.settings.len(), 1);
        assert_eq!(m.views.len(), 2);
        assert_eq!(m.surfaces[0].location, "admin.product.tab");
        assert_eq!(
            out["manifest"]["views"][0]["blocks"][1]["contextBinding"]["key"],
            "productId"
        );
        assert_eq!(
            out["manifest"]["views"][0]["blocks"][2]["handlers"]["click"][1]["action"],
            "save_entries"
        );
        assert_eq!(
            out["manifest"]["views"][1]["blocks"][1]["contextBinding"],
            Value::Null
        );
        assert!(
            m.actions
                .iter()
                .all(|a| !a.public && !a.mcp.unwrap_or(true))
        );
        let next = apply(
            &original(),
            &brief(),
            &json!([{"app":"private_app","version":"0.1.0"}]),
        )
        .unwrap();
        assert_eq!(next["manifest"]["version"], "0.1.1");
    }
    #[test]
    fn brief_cannot_replace_existing_apps_or_invent_public_locations() {
        let mut old = original();
        old["entities"] = json!([{"name":"existing"}]);
        assert!(!empty(&old));
        assert!(apply(&old, &brief(), &json!([])).is_err());
        for key in ["settings", "lifecycles"] {
            let mut existing = original();
            existing[key] = json!([{"owned":"contract"}]);
            assert!(!empty(&existing));
        }
        let mut capability = original();
        capability["capability"] = json!({"intent":{"en":"Existing rules"}});
        assert!(!empty(&capability));
        for key in ["product.detail", "checkout.summary", "admin.unknown"] {
            let mut out = brief();
            out["manifest"]["placements"][0]["location"] = json!(key);
            assert!(apply(&original(), &out, &json!([])).is_err());
        }
        let mut out = brief();
        out["manifest"]["placements"][0]["entity"] = json!("foreign");
        assert!(apply(&original(), &out, &json!([])).is_err());
        let mut out = brief();
        out["manifest"]["entities"][0]["publicRead"] = json!(true);
        assert!(apply(&original(), &out, &json!([])).is_err());
    }
    #[test]
    fn brief_schema_requires_settings_placements_and_configured_languages() {
        let s = schema(&["it-IT".into()])["properties"]["manifest"].clone();
        assert_eq!(s["properties"]["name"]["required"], json!(["it-IT"]));
        assert!(
            s["required"]
                .as_array()
                .unwrap()
                .contains(&json!("settings"))
        );
        assert!(s["properties"].get("actions").is_none());
        assert!(s["properties"].get("views").is_none());
        let validation = &s["properties"]["entities"]["items"]["properties"]["fields"]["items"]["anyOf"]
            [0]["properties"]["validation"];
        assert_eq!(validation["additionalProperties"], false);
        assert!(validation["properties"].get("required").is_none());
        assert!(validation["properties"].get("type").is_none());
        assert!(validation["properties"].get("enum").is_none());
        assert_eq!(validation["properties"]["minLength"]["type"], "integer");
        assert_eq!(validation["properties"]["minimum"]["type"], "number");
    }
}
