//! Read-only native import reconciliation compares mapped current values, never a successful replay flag.
use super::*;
#[path = "inspect_history.rs"]
mod history;
#[path = "inspect_media.rs"]
mod media;
#[path = "inspect_product.rs"]
mod product;
pub(crate) async fn route(
    State(a): State<App>,
    h: RequestContext,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    inspect(&a, &h, &v).await.map(Json)
}
pub(crate) async fn inspect(a: &App, h: &RequestContext, v: &Value) -> Result<Value> {
    let t = merchant(a, h)?;
    auth::permit(h, "apps.manage")?;
    apps::validate_native_input(&schema("merchant.import.inspect").unwrap(), v)?;
    let r: SourceRecord =
        serde_json::from_value(v["record"].clone()).map_err(|_| bad("Invalid source record"))?;
    r.validate()?;
    let namespace = identity_namespace(a, &t).await?;
    let mut id = r.identity(&namespace);
    let (expected, actual) = match r.kind.as_str() {
        "products" => {
            auth::permit(h, "catalog.read")?;
            let mapped = products::mapped(a, &t, &r, &v["options"]).await?;
            let actual =
                match commerce::product_editor(State(a.clone()), h.clone(), Path(id.clone())).await
                {
                    Ok(Json(value)) => Some(value),
                    Err(e) if e.0 == StatusCode::NOT_FOUND => None,
                    Err(e) => return Err(e),
                };
            // Inventory, new merchant metadata and later media have independent native owners.
            // Only source-owned fields are asserted by this product record; assets get their own comparison.
            let mut catalog = mapped["catalog"].clone();
            if let Some(categories) = catalog["categoryIds"].as_array_mut() {
                categories.sort_by_key(Value::to_string);
            }
            let mut translations = mapped["translations"].clone();
            let settings = commerce::config(a, &t).await?.0;
            let main = commerce::product_language_key(&settings.main_locale, &settings);
            if translations[&main].is_object() && translations[&main]["description"].is_null() {
                translations[&main]["description"] = json!("");
            }
            let mut expected = json!({"translations":translations,"catalog":catalog,"extra":{"priceCurrency":mapped["extra"]["priceCurrency"],"identity":{"migrationDigest":mapped["extra"]["identity"]["migrationDigest"]}},"commerce":{"price":mapped["commerce"]["price"],"taxRate":mapped["commerce"]["taxRate"]}});
            if let Some(rich) = mapped["extra"].get("richDescription") {
                expected["extra"]["richDescription"] = rich.clone();
            }
            (expected, actual)
        }
        "categories" => {
            auth::permit(h, "catalog.read")?;
            let mapped = categories::mapped(a, &t, &r, &v["options"]).await?;
            let actual = sqlx::query_scalar::<_,Value>("SELECT jsonb_build_object('parentId',parent_id,'data',data) FROM categories WHERE tenant=$1 AND id=$2").bind(&t).bind(&id).fetch_optional(&a.db).await?;
            (
                json!({"parentId":mapped["parentId"],"data":mapped["data"]}),
                actual,
            )
        }
        "assets" => media::inspect(a, h, &r, &namespace, &id).await?,
        "pages" => {
            apps::inspect_import_record(
                a,
                h,
                &id,
                &r.data["destination"],
                v["options"]["destinationDigest"]
                    .as_str()
                    .ok_or(bad("Reviewed destination digest required"))?,
            )
            .await?
        }
        "coupons" => {
            auth::permit(h, "automation.read")?;
            id = coupons::configuration_id(&r.identity(&t));
            let actual = sqlx::query_scalar::<_, Value>(
                "SELECT data FROM commerce_promotions WHERE tenant=$1 AND id=$2",
            )
            .bind(&t)
            .bind(&id)
            .fetch_optional(&a.db)
            .await?;
            let mut expected = r.data["destination"].clone();
            if !expected.is_object() {
                return Err(bad("Reviewed coupon mapping required"));
            }
            expected["sourceImport"] = json!({"recordDigest":hash(&json!(r).to_string())});
            (expected, actual)
        }
        "customers" | "orders" | "reviews" => {
            history::inspect(a, h, &r, &v["options"], &id).await?
        }
        _ => return Err(bad("Unsupported native inspection domain")),
    };
    let mut differences = vec![];
    if let Some(actual) = &actual {
        compare(&expected, actual, "", &mut differences);
    }
    let mut result = json!({"id":id,"kind":r.kind,"status":if actual.is_none(){"missing"}else if differences.is_empty(){"matching"}else{"changed"},"differences":differences,"checkedAt":chrono::Utc::now().to_rfc3339(),"comparison":"mapped-current-fields-v1","readOnly":true});
    if r.kind == "products" && v["details"] == true {
        let (settings, _) = commerce::config(a, &t).await?;
        let scale = settings
            .currencies
            .selected(
                expected["extra"]["priceCurrency"]
                    .as_str()
                    .ok_or(bad("Product currency required"))?,
            )?
            .scale;
        result["preview"] = json!({"expected":product::projection(&expected, scale)?,"actual":actual.as_ref().map(|value| product::projection(value, settings.currencies.selected(value["extra"]["priceCurrency"].as_str().ok_or(bad("Product currency required"))?)?.scale)).transpose()?,"limits":{"locales":16,"textCharacters":4000,"images":8},"publication":"private-preview-not-publication"});
    }
    Ok(result)
}
/// A sparse expected object asserts only mapped fields. Arrays retain their meaningful order.
fn compare(expected: &Value, actual: &Value, path: &str, differences: &mut Vec<String>) {
    if differences.len() >= 100 {
        return;
    }
    if let Some(object) = expected.as_object() {
        for (key, value) in object {
            let escaped = key.replace('~', "~0").replace('/', "~1");
            compare(
                value,
                &actual[key],
                &format!("{path}/{escaped}"),
                differences,
            );
        }
    } else if expected != actual {
        differences.push(path.into());
    }
}
