//! Source coupon rules map to native inactive promotions; unsupported conditions stop instead of widening the original discount.
use super::*;
pub fn coupon(c: &Context, v: &Value) -> Result<Value> {
    let code = text(&field(v, &["code", "name"]));
    if code.is_empty() || code.len() > 64 || !code.is_ascii() {
        return Err("Original coupon code required".into());
    }
    let (kind, amount) = match c.source {
        Source::Woocommerce => {
            validate_restrictions(v)?;
            if [
                "product_ids",
                "excluded_product_ids",
                "product_categories",
                "excluded_product_categories",
                "email_restrictions",
            ]
            .iter()
            .any(|key| v[*key].as_array().is_some_and(|xs| !xs.is_empty()))
                || v["usage_limit_per_user"].as_u64().is_some_and(|n| n > 0)
                || v["exclude_sale_items"] == true
                || v["limit_usage_to_x_items"].as_u64().is_some_and(|n| n > 0)
                || v["free_shipping"] == true
            {
                return Err("Coupon has product/customer/shipping restrictions needing an explicit mapping; it was not imported as unrestricted".into());
            }
            (
                match v["discount_type"].as_str() {
                    Some("percent") => "percentage",
                    Some("fixed_cart") => "absolute",
                    _ => return Err("Unsupported source coupon discount type".into()),
                },
                v["amount"].clone(),
            )
        }
        _ => {
            return Err(
                "Coupon source profile requires an explicit rule/usage export mapping".into(),
            );
        }
    };
    let money = if kind == "percentage" {
        Money::parse(&amount, "PCT", 4)?
    } else {
        c.money(&amount)?
    };
    if money.minor < 0 || (kind == "percentage" && money.minor > 100 * 10_i64.pow(4)) {
        return Err("Invalid source discount amount".into());
    }
    let amount: Value =
        serde_json::from_str(&money.decimal()).map_err(|_| "Invalid exact discount")?;
    let used = v["usage_count"]
        .as_u64()
        .ok_or("Original coupon usage count required")?;
    let remaining = match v.get("usage_limit") {
        Some(Value::Null) => None,
        Some(value) => match value.as_u64() {
            Some(0) => None,
            Some(limit) => Some(limit.saturating_sub(used)),
            None => {
                return Err(
                    "Original coupon usage limit must be null or an unsigned integer".into(),
                );
            }
        },
        None => {
            return Err("Original coupon usage limit or explicit unlimited null required".into());
        }
    };
    let mut conditions = vec![];
    for (key, operator) in [("minimum_amount", ">="), ("maximum_amount", "<=")] {
        if let Some(value) = v.get(key).filter(|n| !n.is_null() && *n != "") {
            let money = c.money(value)?;
            if money.minor < 0 {
                return Err("Invalid source coupon spend bound".into());
            }
            if money.minor > 0 {
                conditions.push(json!({"type":"cartCartAmount","operator":operator,"amount":serde_json::from_str::<Value>(&money.decimal()).map_err(|_|"Invalid source bound")?}));
            }
        }
    }
    let rule = if conditions.is_empty() {
        json!({"type":"alwaysValid"})
    } else {
        json!({"type":"andContainer","children":conditions})
    };
    let expires = if let Some(date) = v.get("date_expires_gmt").filter(|n| !n.is_null()) {
        super::dates::created(c, &json!({"date_created_gmt":date}))?
    } else {
        Value::Null
    };
    Ok(
        json!({"currency":c.currency,"scale":c.scale,"code":code,"amount":v["amount"],"discountType":v["discount_type"],"expiresAt":expires,"sourceRules":source_rules(v),"activationReviewed":false,"destination":{"name":c.text(code.clone()),"active":false,"code":code,"kind":kind,"amount":amount,"rule":rule,"exclusive":v["individual_use"]==true,"priority":0,"maxUses":remaining,"start":Value::Null,"end":expires}}),
    )
}

fn source_rules(v: &Value) -> Value {
    let keys = [
        "discount_type",
        "amount",
        "usage_limit",
        "usage_count",
        "minimum_amount",
        "maximum_amount",
        "individual_use",
        "date_expires_gmt",
    ];
    Value::Object(
        keys.into_iter()
            .filter_map(|key| v.get(key).map(|value| (key.into(), value.clone())))
            .collect(),
    )
}

fn validate_restrictions(v: &Value) -> Result<()> {
    for key in [
        "product_ids",
        "excluded_product_ids",
        "product_categories",
        "excluded_product_categories",
        "email_restrictions",
        "meta_data",
    ] {
        if let Some(value) = v.get(key) {
            let xs = value
                .as_array()
                .ok_or("Invalid source coupon restriction array")?;
            if key == "meta_data" && !xs.is_empty() {
                return Err("Coupon plugin metadata requires explicit rule mapping".into());
            }
        }
    }
    for key in ["usage_limit_per_user", "limit_usage_to_x_items"] {
        if let Some(value) = v.get(key).filter(|n| !n.is_null())
            && value.as_u64().is_none()
        {
            return Err("Invalid source coupon restriction limit".into());
        }
    }
    for key in ["free_shipping", "exclude_sale_items", "individual_use"] {
        if v.get(key).is_some_and(|n| !n.is_boolean()) {
            return Err("Invalid source coupon restriction boolean".into());
        }
    }
    Ok(())
}
