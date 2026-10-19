//! Operational history comparison reads actual CRM/address/order/review values with paired current PII rights.
use super::*;
pub(super) async fn inspect(
    a: &App,
    h: &RequestContext,
    r: &SourceRecord,
    options: &Value,
    id: &str,
) -> Result<(Value, Option<Value>)> {
    auth::permit(h, "customers.pii")?;
    let t = merchant(a, h)?;
    match r.kind.as_str() {
        "customers" => {
            auth::permit(h, "customers.read")?;
            let row=sqlx::query("SELECT email,profile,group_name,automation FROM customers WHERE tenant=$1 AND id=$2").bind(&t).bind(id).fetch_optional(&a.db).await?;
            let mut actual = None;
            if let Some(row) = row {
                let email: String = row.get("email");
                let book = accounts::address_list(a, &t, &email).await?;
                let elements = book["elements"]
                    .as_array()
                    .ok_or(bad("Native address book unavailable"))?;
                let default = |field: &str| {
                    elements
                        .iter()
                        .find(|v| v["id"] == book[field])
                        .map(|v| v["address"].clone())
                        .unwrap_or(Value::Null)
                };
                let mut addresses = elements
                    .iter()
                    .map(|v| v["address"].clone())
                    .collect::<Vec<_>>();
                addresses.sort_by_key(Value::to_string);
                actual = Some(
                    json!({"email":email,"profile":row.get::<Value,_>("profile"),"customerGroup":row.get::<String,_>("group_name"),"sourceDigest":row.get::<Value,_>("automation")["importSource"]["fingerprint"],"billingAddress":default("defaultBillingAddressId"),"shippingAddress":default("defaultShippingAddressId"),"addresses":addresses}),
                );
            }
            let first = r.data["firstName"].as_str().unwrap_or("");
            let last = r.data["lastName"].as_str().unwrap_or("");
            let plan = crate::operations::customer_create::address_plan(&r.data)?;
            let mut billing = Value::Null;
            let mut shipping = Value::Null;
            let mut addresses = vec![];
            for (address, flags) in plan {
                let address = json!(address);
                if billing.is_null() || flags["defaultBilling"] == true {
                    billing = address.clone();
                }
                if shipping.is_null() || flags["defaultShipping"] == true {
                    shipping = address.clone();
                }
                addresses.push(address);
            }
            addresses.sort_by_key(Value::to_string);
            Ok((
                json!({"email":auth::email(&r.data)?,"profile":{"name":format!("{first} {last}"),"firstName":first,"lastName":last},"customerGroup":options["customerGroup"],"sourceDigest":hash(&json!(r).to_string()),"billingAddress":billing,"shippingAddress":shipping,"addresses":addresses}),
                actual,
            ))
        }
        "orders" => {
            auth::permit(h, "orders.read")?;
            let actual=sqlx::query_scalar::<_,Value>("SELECT data||jsonb_build_object('sourceCreatedAt',to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"')) FROM orders WHERE tenant=$1 AND id=$2").bind(&t).bind(id).fetch_optional(&a.db).await?;
            let created = chrono::DateTime::parse_from_rfc3339(
                r.data["createdAt"]
                    .as_str()
                    .ok_or(bad("Source creation date required"))?,
            )
            .map_err(|_| bad("Invalid source creation date"))?
            .with_timezone(&chrono::Utc)
            .to_rfc3339_opts(chrono::SecondsFormat::Micros, true);
            let lines=r.data["lines"].as_array().ok_or(bad("Source order lines required"))?.iter().enumerate().map(|(index,line)|json!({"id":format!("historical-{index}"),"label":line["label"],"quantity":line["quantity"],"type":"historical","sourceSnapshot":line})).collect::<Vec<_>>();
            Ok((
                json!({"orderNumber":r.data["number"],"state":"historical","sourceCreatedAt":created,"salesChannelId":options["channelId"],"money":{"minor":r.data["total"]["minor"],"currency":{"code":r.data["total"]["currency"],"scale":r.data["total"]["scale"]}},"cart":{"lineItems":lines,"price":{"totalMinor":r.data["total"]["minor"],"currency":r.data["total"]["currency"],"currencyScale":r.data["total"]["scale"]}},"historicalImport":{"snapshot":r.data,"fingerprint":hash(&json!({"record":r,"options":options}).to_string())},"billingAddress":r.data["billingAddress"],"shippingAddress":r.data["shippingAddress"],"payment":{"state":"historical","realMoneyCharged":false}}),
                actual,
            ))
        }
        "reviews" => {
            auth::permit(h, "catalog.read")?;
            let actual=sqlx::query_scalar::<_,Value>("SELECT jsonb_build_object('productId',product_id,'sourceAuthor',author,'rating',rating,'title',title,'text',content,'verifiedPurchase',verified,'sourceDigest',source_import->>'recordDigest','createdAt',to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"')) FROM product_reviews WHERE tenant=$1 AND id=$2").bind(&t).bind(id).fetch_optional(&a.db).await?;
            let created = chrono::DateTime::parse_from_rfc3339(
                r.data["createdAt"]
                    .as_str()
                    .ok_or(bad("Source review date required"))?,
            )
            .map_err(|_| bad("Invalid review date"))?
            .with_timezone(&chrono::Utc)
            .to_rfc3339_opts(chrono::SecondsFormat::Micros, true);
            let product = relations::identity(
                r,
                &t,
                "products",
                r.data["productSourceId"]
                    .as_str()
                    .ok_or(bad("Source product required"))?,
            )?;
            Ok((
                json!({"productId":product,"sourceAuthor":r.data["sourceAuthor"],"rating":r.data["rating"],"title":r.data["title"],"text":r.data["text"],"createdAt":created,"verifiedPurchase":false,"sourceDigest":hash(&json!(r).to_string())}),
                actual,
            ))
        }
        _ => Err(bad("Unsupported history inspection")),
    }
}
