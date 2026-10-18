//! Preserve source variant identity, decimal price and known stock; never invent available inventory.
use super::*;
pub fn normalize(c: &Context, v: &Value) -> Result<Vec<Record>> {
    let parent = id(v, &["id", "sku"])?;
    if c.source == Source::Woocommerce
        && v["type"]
            .as_str()
            .is_some_and(|kind| !["simple", "variable"].contains(&kind))
    {
        return Err("Source product type needs an explicit native behavior mapping".into());
    }
    if c.source == Source::Woocommerce && v["parent_id"].as_u64().is_some_and(|n| n > 0) {
        return Err("Standalone variations require a complete parent snapshot".into());
    }
    let woo_variable = c.source == Source::Woocommerce && v["type"] == "variable";
    let variants = match c.source {
        Source::Woocommerce if woo_variable => super::woo::variants(v)?,
        Source::Shopify => list(&v["variants"]),
        Source::Shopware5 => {
            let mut ds = list(&v["details"]);
            if ds.is_empty() && !v["mainDetail"].is_null() {
                ds.push(v["mainDetail"].clone());
            }
            ds
        }
        _ => vec![],
    };
    if !variants.is_empty() {
        if variants.len() > 100 {
            return Err("Variant export exceeds bounded profile".into());
        }
        let grouped = variants.len() > 1 || woo_variable;
        let group_id = if woo_variable {
            parent.clone()
        } else {
            format!("group:{parent}")
        };
        let mut rows = vec![];
        if grouped {
            let mut group = product(c, v, &variants[0], None)?;
            group.source_id = group_id.clone();
            group.data["sku"] = Value::Null;
            group.data["options"] = json!({});
            group.data["sourceProductId"] = json!(parent);
            group.data["variantGroup"] = json!(true);
            group.data["catalogActive"] = json!(super::visibility::product(c, v, v)?);
            rows.push(group);
        }
        let mut bytes = 0;
        for variant in &variants {
            let mut row = product(c, v, variant, grouped.then_some(group_id.as_str()))?;
            row.data["sourceProductId"] = json!(parent);
            bytes += serde_json::to_vec(&row)
                .map_err(|_| "Invalid source row")?
                .len();
            if bytes > 8 * 1024 * 1024 {
                return Err("Expanded source variants exceed 8 MiB; narrow the export".into());
            }
            rows.push(row);
        }
        return Ok(rows);
    }
    product(c, v, v, None).map(|r| vec![r])
}
fn product(c: &Context, parent: &Value, v: &Value, pid: Option<&str>) -> Result<Record> {
    let source_id = id(v, &["id", "sku"])?;
    let name = field(parent, &["title", "name"]);
    let description = if c.source == Source::Magento2 {
        list(&parent["custom_attributes"])
            .into_iter()
            .find(|a| a["attribute_code"] == "description")
            .map(|a| a["value"].clone())
            .unwrap_or(json!(""))
    } else {
        field(
            parent,
            &[
                "descriptionHtml",
                "body_html",
                "description",
                "description_long",
            ],
        )
    };
    let price = if c.source == Source::Shopware5 {
        v["prices"][0]["price"].clone()
    } else {
        field(v, &["price.amount", "price", "regular_price"])
    };
    let price = if price.as_str() == Some("") {
        field(v, &["regular_price"])
    } else {
        price
    };
    let amount = c.money(&price)?;
    if amount.minor < 0 {
        return Err("negative product price requires explicit review".into());
    }
    let stock = field(
        v,
        &[
            "inventory_quantity",
            "stock_quantity",
            "inStock",
            "extension_attributes.stock_item.qty",
        ],
    );
    if !stock.is_null() && stock.as_i64().is_none_or(|n| n < 0 || n > i32::MAX.into()) {
        return Err("invalid source inventory; reconcile reservations before activation".into());
    }
    let visible = super::visibility::product(c, parent, v)?;
    let images = if pid.is_some() {
        if v["image"].is_object() {
            json!([v["image"]])
        } else {
            Value::Null
        }
    } else {
        field(parent, &["images", "media_gallery_entries"])
    };
    let mut r = Record::new(
        c,
        "products",
        source_id,
        json!({"name":translated(c,&name)?,"description":translated(c,&description)?,"sku":field(v,&["sku","reference","number"]),"parentSourceId":pid,"variantTitle":field(v,&["title"]),"price":amount,"priceDisplay":amount.decimal(),"stock":stock,"sourceImages":images,"options":super::relations::options(v)?,"categorySourceIds":super::relations::categories(c,parent)?,"sourceCategory":field(parent,&["id_category_default","categories"]),"sourceType":field(parent,&["type","type_id"]),"catalogActive":visible}),
    )?;
    if c.source == Source::Magento2
        && parent["type_id"]
            .as_str()
            .is_some_and(|t| !["simple", "virtual", "downloadable"].contains(&t))
    {
        r.warnings
            .push("complex_product_requires_relationship_mapping".into());
    }
    if c.source == Source::Prestashop {
        r.warnings
            .push("source_price_tax_basis_requires_review".into());
    }
    Ok(r)
}
