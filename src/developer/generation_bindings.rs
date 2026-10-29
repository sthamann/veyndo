//! Complete only deterministic native model/asset bindings; original validation and explicit consent remain authoritative.
use super::*;
pub(super) fn complete(value: &mut Value) -> Result<()> {
    let mut m: apps::Manifest =
        serde_json::from_value(value.clone()).map_err(|e| bad(e.to_string()))?;
    let has_assets = m.entities.iter().any(|e| {
        e.fields
            .iter()
            .any(|f| ["image", "file"].contains(&f.kind.as_str()))
    });
    if has_assets {
        for permission in ["assets.read", "assets.write"] {
            if !m.permissions.iter().any(|p| p == permission) {
                m.permissions.push(permission.into());
            }
        }
        let contracts: Vec<Value> = serde_json::from_str(include_str!(
            "../../extensions/sdk/native-asset-actions.json"
        ))
        .expect("native asset action contracts");
        for contract in contracts {
            if !m.actions.iter().any(|a| a.handler == contract["handler"]) {
                if m.actions.iter().any(|a| a.name == contract["name"]) {
                    return Err(bad(
                        "Native asset action name conflicts with an existing action",
                    ));
                }
                m.actions
                    .push(serde_json::from_value(contract).expect("native asset action"));
            }
        }
    }
    for view in &mut m.views {
        for block in &mut view.blocks {
            let Some(entity) = block
                .entity
                .as_ref()
                .filter(|name| m.entities.iter().any(|e| &e.name == *name))
            else {
                continue;
            };
            if ["text", "button", "frame", "tabs"].contains(&block.kind.as_str()) {
                continue;
            }
            let suffix = entity.chars().take(27).collect::<String>();
            for (field, handler, name) in [
                (&mut block.read_action, "list", format!("list_{suffix}")),
                (&mut block.write_action, "save", format!("save_{suffix}")),
            ] {
                if handler == "save" && block.kind != "form" && !block.inline_edit {
                    continue;
                }
                if field.is_none()
                    && m.actions.iter().any(|a| {
                        a.name == name && a.handler == handler && a.entity.as_ref() == Some(entity)
                    })
                {
                    *field = Some(name);
                }
            }
        }
    }
    for surface in &mut m.surfaces {
        let Some(view) = m
            .views
            .iter()
            .find(|v| surface.ui_path == format!("native/{}", v.id))
        else {
            continue;
        };
        for block in &view.blocks {
            if surface.location.starts_with("admin.")
                && (block.kind == "form" || block.inline_edit)
                && m.entities.iter().any(|e| {
                    Some(&e.name) == block.entity.as_ref()
                        && e.fields
                            .iter()
                            .any(|f| ["image", "file"].contains(&f.kind.as_str()))
                })
            {
                for action in m.actions.iter().filter(|a| {
                    ["assets", "asset_preview", "asset_upload"].contains(&a.handler.as_str())
                }) {
                    if !surface.actions.contains(&action.name) {
                        surface.actions.push(action.name.clone());
                    }
                }
            }
        }
    }
    *value = json!(m);
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    fn upload_draft() -> Value {
        let mut m: Value = serde_json::from_str(include_str!(
            "../../extensions/apps/product-advisor/manifest.json"
        ))
        .unwrap();
        m["id"] = json!("consultation_binding");
        m["entities"][0]["publicRead"] = json!(false);
        m["entities"][0]["fields"]
            .as_array_mut()
            .unwrap()
            .push(json!({"name":"design","label":{"en":"Design"},"kind":"file"}));
        m["surfaces"].as_array_mut().unwrap().truncate(1);
        m["views"].as_array_mut().unwrap().truncate(1);
        m["apiRoutes"] = json!([]);
        for block in m["views"][0]["blocks"]
            .as_array_mut()
            .unwrap()
            .iter_mut()
            .take(2)
        {
            block["readAction"] = Value::Null;
            block["writeAction"] = Value::Null;
        }
        m.as_object_mut().unwrap().remove("actions");
        routes::actions(&mut m).unwrap();
        m
    }
    #[test]
    fn described_file_forms_compile_to_the_same_private_asset_contract_as_visual_forms() {
        let mut value = upload_draft();
        complete(&mut value).unwrap();
        let m: apps::Manifest = serde_json::from_value(value.clone()).unwrap();
        apps::validate(&m).unwrap();
        assert_eq!(value["views"][0]["blocks"][0]["readAction"], "list_entries");
        assert_eq!(
            value["views"][0]["blocks"][1]["writeAction"],
            "save_entries"
        );
        for right in ["assets.read", "assets.write"] {
            assert!(m.permissions.iter().any(|p| p == right));
        }
        let contracts: Vec<Value> = serde_json::from_str(include_str!(
            "../../extensions/sdk/native-asset-actions.json"
        ))
        .unwrap();
        for contract in contracts {
            let action = value["actions"]
                .as_array()
                .unwrap()
                .iter()
                .find(|a| a["name"] == contract["name"])
                .unwrap();
            assert_eq!(action["handler"], contract["handler"]);
            assert_eq!(action["permission"], contract["permission"]);
            assert_eq!(action["public"], false);
            assert!(
                value["surfaces"][0]["actions"]
                    .as_array()
                    .unwrap()
                    .contains(&contract["name"])
            );
        }
        let original = value.clone();
        complete(&mut value).unwrap();
        assert_eq!(value, original);
    }
    #[test]
    fn explicit_bad_bindings_and_public_forms_are_never_repaired_into_authority() {
        let mut wrong = upload_draft();
        wrong["views"][0]["blocks"][0]["readAction"] = json!("foreign_action");
        complete(&mut wrong).unwrap();
        assert_eq!(
            wrong["views"][0]["blocks"][0]["readAction"],
            "foreign_action"
        );
        assert!(apps::validate(&serde_json::from_value(wrong).unwrap()).is_err());
        let mut public = upload_draft();
        public["surfaces"][0]["location"] = json!("product.detail");
        complete(&mut public).unwrap();
        assert!(apps::validate(&serde_json::from_value(public).unwrap()).is_err());
    }
    #[test]
    fn unresolved_bindings_report_the_exact_view_block_and_property() {
        let mut value = upload_draft();
        complete(&mut value).unwrap();
        for (property, replacement) in [
            ("readAction", Value::Null),
            ("writeAction", json!("unknown_save")),
        ] {
            let mut invalid = value.clone();
            invalid["views"][0]["blocks"][1][property] = replacement;
            let error = apps::validate(&serde_json::from_value(invalid).unwrap()).unwrap_err();
            assert_eq!(
                error.problem()["pointer"],
                format!("/views/0/blocks/1/{property}")
            );
        }
    }
    #[test]
    fn synthesized_list_actions_are_read_only_for_native_get_routes() {
        let value = upload_draft();
        let action = value["actions"]
            .as_array()
            .unwrap()
            .iter()
            .find(|a| a["handler"] == "list")
            .unwrap();
        assert_eq!(action["readOnly"], true);
    }
    #[test]
    fn a_surface_unknown_action_points_at_the_unresolved_entry() {
        let mut value = upload_draft();
        complete(&mut value).unwrap();
        value["surfaces"][0]["actions"]
            .as_array_mut()
            .unwrap()
            .push(json!("invented_action"));
        let m: apps::Manifest = serde_json::from_value(value).unwrap();
        let error = apps::validate(&m).unwrap_err();
        assert!(error.1.contains("invented_action"));
        assert!(
            error.problem()["pointer"]
                .as_str()
                .unwrap()
                .starts_with("/surfaces/0/actions/")
        );
    }
    #[test]
    fn compilation_preserves_explicit_surface_action_restrictions() {
        let mut value = upload_draft();
        value["surfaces"][0]["actions"] = json!([]);
        complete(&mut value).unwrap();
        assert!(
            !value["surfaces"][0]["actions"]
                .as_array()
                .unwrap()
                .contains(&json!("save_entries"))
        );
        assert!(apps::validate(&serde_json::from_value(value).unwrap()).is_err());
    }
    #[test]
    fn a_surface_missing_native_view_points_at_the_target() {
        let mut value = upload_draft();
        complete(&mut value).unwrap();
        value["surfaces"][0]["uiPath"] = json!("native/missing_view");
        let error = apps::validate(&serde_json::from_value(value).unwrap()).unwrap_err();
        assert_eq!(error.problem()["pointer"], "/surfaces/0/uiPath");
    }
}
