//! Exact canonical history lines preserve source amounts without making native product or purchase claims.
use super::*;
pub fn lines(c: &Context, v: &Value) -> Result<Value> {
    let raw = field(
        v,
        &["line_items", "items", "associations.order_rows", "details"],
    );
    if raw.is_null() {
        return Ok(Value::Null);
    }
    let rows = raw.as_array().ok_or("historical lines must be an array")?;
    if rows.len() > 1000 {
        return Err(
            "historical order has more than 1000 lines; use a dedicated reviewed profile".into(),
        );
    }
    let mut result = vec![];
    for (i, row) in rows.iter().enumerate() {
        let currency = field(
            row,
            &["originalUnitPriceSet.shopMoney.currencyCode", "currency"],
        );
        if !currency.is_null() && currency.as_str() != Some(c.currency.as_str()) {
            return Err(
                "Historical item currency differs from the selected source currency".into(),
            );
        }
        let quantity = field(row, &["quantity", "qty_ordered", "product_quantity"]);
        let q = Money::parse(&quantity, &c.currency, 0)?.minor;
        if q <= 0 || q > 1_000_000 {
            return Err("historical quantity must be a positive supported integer".into());
        }
        let price = field(
            row,
            &[
                "price",
                "originalUnitPriceSet.shopMoney.amount",
                "unit_price_tax_incl",
            ],
        );
        let unit = if price.is_null() {
            None
        } else {
            Some(c.money(&price)?)
        };
        result.push(json!({"sourceId":id(row,&["id","item_id"]).unwrap_or_else(|_|format!("line-{i}")),"label":text(&field(row,&["title","name","articleName","product_name"])),"quantity":q,"unitPrice":unit,"productSourceId":field(row,&["variant.id","product_id","productId","articleId","product.id"])}));
    }
    Ok(json!(result))
}
