//! Source address aliases are converted here; the commerce host only receives canonical address fields.
use super::*;
pub fn address(v: &Value, first: &str, last: &str) -> Value {
    if !v.is_object() {
        return Value::Null;
    }
    let street = text(&field(v, &["street", "address_1", "address1"]));
    let street = if street.is_empty() {
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
        return Value::Null;
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
    json!({"name":name,"firstName":first,"lastName":last,"company":field(v,&["company"]).as_str().unwrap_or(""),"street":street,"additionalAddressLine1":field(v,&["address_2","address2"]).as_str().unwrap_or(""),"postalCode":text(&field(v,&["postalCode","postcode","zip","zipcode"])),"city":text(&field(v,&["city"])),"country":text(&field(v,&["countryCodeV2","country_code","country","countryIso"])),"countryStateId":""})
}
pub fn customer_address(v: &Value, first: &str, last: &str) -> Value {
    let direct = field(v, &["default_address", "billing", "defaultBillingAddress"]);
    if direct.is_object() {
        return address(&direct, first, last);
    }
    let addresses = list(&v["addresses"]);
    let selected = addresses
        .iter()
        .find(|a| !v["default_billing"].is_null() && text(&a["id"]) == text(&v["default_billing"]))
        .or_else(|| (addresses.len() == 1).then(|| &addresses[0]));
    selected
        .map(|a| address(a, first, last))
        .unwrap_or(Value::Null)
}
