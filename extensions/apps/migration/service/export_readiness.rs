//! Offline exports must contain expanded original references, not shallow API summaries disguised as complete pages.
use super::*;
fn address(row: &Value, owner: &Value, reference: Option<&Value>) -> Result<()> {
    let country = row["country_code"].as_str();
    if !row.is_object()
        || contract::text(&row["id_customer"]) != contract::text(owner)
        || contract::text(owner).is_empty()
        || reference.is_some_and(|id| contract::text(id) != contract::text(&row["id"]))
        || !country.is_some_and(|s| s.len() == 2 && s.bytes().all(|b| b.is_ascii_uppercase()))
        || (!row["id_state"].is_null()
            && contract::text(&row["id_state"]) != "0"
            && row["provinceCode"].as_str().is_none_or(str::is_empty))
    {
        return Err("PrestaShop export needs original owned address/country/state references expanded before packaging".into());
    }
    Ok(())
}
pub fn validate(c: &Context, kind: &str, row: &Value) -> Result<()> {
    if kind == "orders"
        && field(
            row,
            &["line_items", "items", "associations.order_rows", "details"],
        )
        .as_array()
        .is_none()
    {
        return Err(
            "Historical export needs original complete order positions, not a list summary".into(),
        );
    }
    if c.source == Source::Prestashop {
        if kind == "customers" {
            let rows = row["addresses"].as_array().ok_or(
                "PrestaShop customer export needs an explicit complete original address array",
            )?;
            for value in rows {
                address(value, &row["id"], None)?;
            }
        } else if kind == "orders" {
            if row["currency"].as_str() != Some(c.currency.as_str()) {
                return Err("PrestaShop export needs the original order currency reference expanded as ISO currency".into());
            }
            for (id, key) in [
                ("id_address_invoice", "billing_address"),
                ("id_address_delivery", "shipping_address"),
            ] {
                if contract::text(&row[id]).is_empty() {
                    return Err("PrestaShop export lacks original order address references".into());
                }
                address(&row[key], &row["id_customer"], Some(&row[id]))?;
            }
        }
    }
    if c.source == Source::Shopify {
        for key in ["variants", "images", "addressesV2", "lineItems"] {
            if row[key].is_object() && row[key]["pageInfo"]["hasNextPage"].as_bool() != Some(false)
            {
                return Err("Shopify export contains an incomplete nested connection; expand all original child records first".into());
            }
        }
        if kind == "customers"
            && let Some(nodes) = row["addressesV2"]["nodes"].as_array()
            && row["addresses"].as_array() != Some(nodes)
        {
            return Err("Shopify export needs its complete addresses flattened into the normalized source profile".into());
        }
    }
    Ok(())
}
