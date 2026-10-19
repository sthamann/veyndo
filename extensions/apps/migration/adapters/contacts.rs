//! Source address aliases are converted here; the commerce host only receives canonical address fields.
use super::*;
pub fn address(v: &Value, first: &str, last: &str) -> Result<Value> {
    if v.is_null()
        || v.as_object()
            .is_some_and(|m| m.values().all(|v| v.is_null() || v.as_str() == Some("")))
    {
        return Ok(Value::Null);
    }
    if !v.is_object() {
        return Err("Source address must be an object; no address was discarded".into());
    }
    let street = text(&field(v, &["street", "address_1", "address1"]));
    let street = if street.is_empty() {
        if v["street"]
            .as_array()
            .is_some_and(|xs| xs.iter().any(|x| !x.is_string()))
        {
            return Err("Source street lines must be text".into());
        }
        v["street"]
            .as_array()
            .map(|xs| {
                xs.iter()
                    .filter_map(Value::as_str)
                    .collect::<Vec<_>>()
                    .join(" ")
            })
            .unwrap_or_default()
    } else {
        street
    };
    if street.is_empty() {
        return Err(
            "Nonempty source address has no supported street; review the source mapping".into(),
        );
    }
    let given = text(&field(v, &["firstName", "first_name", "firstname"]));
    let first = if given.trim().is_empty() {
        first.to_owned()
    } else {
        given.trim().to_owned()
    };
    let family = text(&field(v, &["lastName", "last_name", "lastname"]));
    let last = if family.trim().is_empty() {
        last.to_owned()
    } else {
        family.trim().to_owned()
    };
    let name = text(&field(v, &["name"]));
    let name = if name.is_empty() {
        format!("{first} {last}").trim().to_owned()
    } else {
        name
    };
    let country = text(&field(
        v,
        &[
            "countryCodeV2",
            "country_code",
            "country_id",
            "country.iso",
            "countryIso",
            "country",
        ],
    ));
    if country.len() != 2 || !country.bytes().all(|b| b.is_ascii_uppercase()) {
        return Err(
            "Source address needs an explicit ISO country code; resolve source country IDs first"
                .into(),
        );
    }
    let region = field(
        v,
        &[
            "countryStateId",
            "provinceCode",
            "region.region_code",
            "state.isoCode",
            "state.shortCode",
            "state",
        ],
    );
    let region = match region {
        Value::Null => String::new(),
        Value::String(value) => value,
        _ => {
            return Err(
                "Source region needs an explicit subdivision code; no region was discarded".into(),
            );
        }
    };
    let region = if region.is_empty() || region.starts_with(&format!("{country}-")) {
        region
    } else if !region.contains('-') {
        format!("{country}-{region}")
    } else {
        return Err("Source subdivision belongs to another country".into());
    };
    if (!region.is_empty() && region.len() <= 3)
        || region.len() > 12
        || !region
            .bytes()
            .all(|b| b.is_ascii_uppercase() || b.is_ascii_digit() || b == b'-')
    {
        return Err("Source subdivision code requires an explicit native geography mapping".into());
    }
    let optional = |paths: &[&str]| -> Result<String> {
        let value = field(v, paths);
        match value {
            Value::Null => Ok(String::new()),
            Value::String(value) => Ok(value),
            _ => Err("Optional source address field must be text".into()),
        }
    };
    Ok(
        json!({"name":name,"firstName":first,"lastName":last,"company":optional(&["company"])? ,"department":optional(&["department"])? ,"title":optional(&["title"])? ,"vatId":optional(&["vatId","vat_id","vat_number"])? ,"phoneNumber":optional(&["phoneNumber","phone","telephone","phone_mobile"])? ,"street":street,"additionalAddressLine1":optional(&["additionalAddressLine1","address_2","address2"])? ,"additionalAddressLine2":optional(&["additionalAddressLine2"])? ,"postalCode":text(&field(v,&["postalCode","postcode","zip","zipcode","zipCode"])),"city":text(&field(v,&["city"])),"country":country,"countryStateId":region}),
    )
}
pub fn customer_address(v: &Value, first: &str, last: &str, shipping: bool) -> Result<Value> {
    let aliases: &[&str] = if shipping {
        &["shipping", "defaultShippingAddress"]
    } else {
        &["default_address", "billing", "defaultBillingAddress"]
    };
    let direct = field(v, aliases);
    if direct.is_object() || direct.is_array() {
        return address(&direct, first, last);
    }
    let addresses = list(&v["addresses"]);
    let reference = field(
        v,
        if shipping {
            &["default_shipping", "defaultShippingAddress"]
        } else {
            &["default_billing", "defaultBillingAddress"]
        },
    );
    let defaults = addresses
        .iter()
        .filter(|a| {
            a[if shipping {
                "default_shipping"
            } else {
                "default_billing"
            }] == true
        })
        .collect::<Vec<_>>();
    if defaults.len() > 1 {
        return Err("Multiple source default addresses require an explicit mapping".into());
    }
    let selected = if !reference.is_null() {
        addresses
            .iter()
            .find(|a| text(&a["id"]) == text(&reference))
    } else {
        defaults
            .first()
            .copied()
            .or_else(|| (!shipping && addresses.len() == 1).then(|| &addresses[0]))
    };
    if !reference.is_null() && selected.is_none() {
        return Err("Referenced default address is absent from the source snapshot".into());
    }
    match selected {
        Some(a) => address(a, first, last),
        None => Ok(Value::Null),
    }
}
pub fn additional(v: &Value, first: &str, last: &str) -> Result<Value> {
    if v["addresses"].is_null() {
        return Ok(json!([]));
    }
    let values = v["addresses"]
        .as_array()
        .ok_or("Source address book must be a complete array")?;
    if values.len() > 50 {
        return Err(
            "Source address book exceeds 50 entries; use a dedicated reviewed profile".into(),
        );
    }
    let billing = customer_address(v, first, last, false)?;
    let shipping = customer_address(v, first, last, true)?;
    let mut result = vec![];
    for value in values {
        let value = address(value, first, last)?;
        if !value.is_null() && value != billing && value != shipping && !result.contains(&value) {
            result.push(value);
        }
    }
    Ok(json!(result))
}
pub fn order_shipping(v: &Value) -> Result<Value> {
    let assignments = &v["extension_attributes"]["shipping_assignments"];
    if !assignments.is_null() {
        let xs = assignments
            .as_array()
            .ok_or("Invalid source shipping assignments")?;
        if xs.len() > 1 {
            return Err(
                "Multiple shipping destinations require a dedicated historical order profile"
                    .into(),
            );
        }
        if let Some(assignment) = xs.first() {
            return address(&assignment["shipping"]["address"], "", "");
        }
    }
    address(
        &field(v, &["shipping_address", "shipping", "shippingAddress"]),
        "",
        "",
    )
}
