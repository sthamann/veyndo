//! Source publication/status is distinct from inventory; unsupported direct/search/catalogue visibility must be mapped explicitly.
use super::*;
pub fn product(c: &Context, parent: &Value, child: &Value) -> Result<Option<bool>> {
    let base = own(c.source, parent)?;
    let child = own(c.source, child)?;
    Ok(match (base, child) {
        (Some(false), _) | (_, Some(false)) => Some(false),
        (_, value) => value.or(base),
    })
}
fn own(source: Source, v: &Value) -> Result<Option<bool>> {
    match source {
        Source::Woocommerce => super::woo::visibility(v),
        Source::Shopify => match v.get("status") {
            None | Some(Value::Null) => Ok(None),
            Some(Value::String(status)) if status == "ACTIVE" => match v.get("onlineStoreUrl") {
                Some(Value::Null) => Ok(Some(false)),
                Some(Value::String(url)) if !url.trim().is_empty() => Ok(Some(true)),
                None => Ok(None),
                _ => Err("Invalid Shopify online-store publication projection".into()),
            },
            Some(Value::String(status)) if ["DRAFT", "ARCHIVED"].contains(&status.as_str()) => {
                Ok(Some(false))
            }
            _ => Err(
                "Shopify unlisted/unknown publication requires explicit visibility mapping".into(),
            ),
        },
        Source::Prestashop => {
            if v.get("visibility")
                .is_some_and(|x| !x.is_null() && x != "both")
            {
                return Err("PrestaShop separate catalogue/search/direct visibility requires explicit mapping".into());
            }
            if let Some(active) = v["active"].as_bool() {
                Ok(Some(active))
            } else {
                numeric(&v["active"], "1", "0")
            }
        }
        Source::Magento2 => {
            if v.get("visibility")
                .is_some_and(|x| !x.is_null() && x != 4 && x != "4")
            {
                return Err(
                    "Magento separate catalogue/search/direct visibility requires explicit mapping"
                        .into(),
                );
            }
            numeric(&v["status"], "1", "2")
        }
        Source::Shopware5 => match v.get("active") {
            None | Some(Value::Null) => Ok(None),
            Some(Value::Bool(active)) => Ok(Some(*active)),
            _ => Err("Shopware source active flag must be boolean".into()),
        },
    }
}
fn numeric(value: &Value, enabled: &str, disabled: &str) -> Result<Option<bool>> {
    let value = match value {
        Value::Null => return Ok(None),
        Value::String(value) => value.clone(),
        Value::Number(value) if value.is_u64() => value.to_string(),
        _ => return Err("Source active/status flag has an invalid type".into()),
    };
    if value == enabled {
        Ok(Some(true))
    } else if value == disabled {
        Ok(Some(false))
    } else {
        Err("Source active/status flag is outside its declared profile".into())
    }
}
