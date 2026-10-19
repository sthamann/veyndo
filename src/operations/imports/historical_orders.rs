//! Immutable native historical orders preserve exact amounts and provenance without purchase, stock, account or payment effects.
use super::*;
pub(super) async fn import(
    a: &App,
    h: &RequestContext,
    r: &SourceRecord,
    options: &Value,
) -> Result<Value> {
    auth::permit(h, "orders.write")?;
    auth::permit(h, "customers.pii")?;
    let t = merchant(a, h)?;
    if staging::parent(a, &t).await?.is_some() {
        return Err(bad(
            "Historical orders require a live migration target; they are never configuration release units",
        ));
    }
    let amount = &r.data["total"];
    let minor = amount["minor"]
        .as_i64()
        .filter(|n| *n >= 0)
        .ok_or(bad("Exact nonnegative historical total required"))?;
    let code = amount["currency"]
        .as_str()
        .ok_or(bad("Historical currency required"))?;
    let scale = amount["scale"]
        .as_u64()
        .and_then(|n| u8::try_from(n).ok())
        .ok_or(bad("Historical currency scale required"))?;
    let currency = veyndo::money::Currency::new(code, scale)
        .map_err(|_| bad("Invalid historical currency"))?;
    let exact = veyndo::money::Money::new(minor, currency);
    let created = r.data["createdAt"]
        .as_str()
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
        .ok_or(bad("Historical date needs an explicit timezone"))?;
    let number = r.data["number"]
        .as_str()
        .filter(|s| !s.is_empty() && s.len() <= 100 && !s.chars().any(char::is_control))
        .ok_or(bad("Original order number required"))?;
    let source_lines = r.data["lines"]
        .as_array()
        .filter(|xs| !xs.is_empty() && xs.len() <= 1000)
        .ok_or(bad("Historical line items required, maximum 1000"))?;
    let mut lines = vec![];
    for (index, line) in source_lines.iter().enumerate() {
        let name = line["label"]
            .as_str()
            .filter(|s| !s.is_empty() && s.len() <= 1000)
            .ok_or(bad("Original line name required"))?;
        let quantity = line["quantity"]
            .as_u64()
            .filter(|n| *n > 0 && *n <= 1_000_000)
            .ok_or(bad("Original positive integer line quantity required"))?;
        lines.push(json!({"id":format!("historical-{index}"),"label":name,"quantity":quantity,"type":"historical","sourceSnapshot":line}));
    }
    let channel = options["channelId"]
        .as_str()
        .filter(|s| !s.is_empty() && s.len() <= 100)
        .ok_or(bad("Target channel required"))?;
    let id = r.identity(&t);
    let fingerprint = hash(&json!({"record":r,"options":options}).to_string());
    let key = format!("historical:{id}");
    let mut tx = a.db.begin().await?;
    history::context(&mut tx, h, "historical_import").await?;
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,28))")
        .bind(format!("{t}:{key}"))
        .execute(&mut *tx)
        .await?;
    if let Some(old) =
        sqlx::query("SELECT data,fingerprint FROM orders WHERE tenant=$1 AND idempotency_key=$2")
            .bind(&t)
            .bind(&key)
            .fetch_optional(&mut *tx)
            .await?
    {
        if old.get::<String, _>("fingerprint") != fingerprint {
            return Err(conflict(
                "Historical source identity already has a different immutable snapshot",
            ));
        }
        return Ok(json!({"id":id,"replayed":true,"historical":true}));
    }
    sqlx::query("SELECT id FROM sales_channels WHERE tenant=$1 AND id=$2 FOR SHARE")
        .bind(&t)
        .bind(channel)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or(bad("Target sales channel unavailable"))?;
    if let Some(app) = h.principal.app.as_deref() {
        let m = apps::package(a, &t, app, true).await?;
        apps::lock_package_write(&mut tx, &t, &m).await?;
    }
    // Existing UI compatibility amounts are derived from the immutable exact historical amount, not repriced.
    let display = exact
        .decimal()
        .parse::<f64>()
        .map_err(|_| bad("Historical display amount unavailable"))?;
    let quote = json!({"lineItems":lines,"price":{"totalPrice":display,"netPrice":null,"totalMinor":minor,"currency":code,"currencyScale":scale,"taxStatus":"historical","calculatedTaxes":[]},"shippingCosts":{"totalPrice":null},"locale":options["locale"].as_str().unwrap_or("en-GB"),"salesChannelId":channel});
    let mut order = json!({"id":id,"orderNumber":number,"revision":1,"state":"historical","salesChannelId":channel,"channel":"historical_import","cart":quote,"deliveries":[],"payment":{"state":"historical","provider":"historical_import","realMoneyCharged":false},"money":{"minor":minor,"currency":{"code":code,"scale":scale}},"historicalImport":{"source":r.source,"sourceShop":r.source_shop,"sourceId":r.source_id,"snapshot":r.data,"fingerprint":fingerprint,"importedAt":chrono::Utc::now().to_rfc3339(),"sourceAmount":exact.decimal()}});
    order["billingAddress"] = r.data["billingAddress"].clone();
    order["shippingAddress"] = r.data["shippingAddress"].clone();
    commerce::order_fields(&mut order);
    let cart_id = format!("history-{id}");
    let token = format!("history-private-{}", uid());
    sqlx::query("INSERT INTO carts(id,tenant,token,data,status) VALUES($1,$2,$3,$4,'completed')")
        .bind(&cart_id)
        .bind(&t)
        .bind(token)
        .bind(json!({"items":[],"locale":"en-GB","salesChannel":channel,"order":order}))
        .execute(&mut *tx)
        .await?;
    sqlx::query("INSERT INTO orders(id,tenant,cart_id,idempotency_key,fingerprint,data,created_at) VALUES($1,$2,$3,$4,$5,$6,$7::text::timestamptz)").bind(&id).bind(&t).bind(cart_id).bind(key).bind(fingerprint).bind(&order).bind(created.to_rfc3339()).execute(&mut *tx).await?;
    sqlx::query("INSERT INTO order_activity(tenant,order_id,actor,kind,data) VALUES($1,$2,$3,'historical_import',$4)").bind(&t).bind(&id).bind(h.principal.user.as_deref().unwrap_or("unknown")).bind(json!({"source":r.source,"sourceShop":r.source_shop,"sourceId":r.source_id})).execute(&mut *tx).await?;
    sqlx::query("INSERT INTO outbox(tenant,kind,data) VALUES($1,'migration.record.imported',$2)")
        .bind(&t)
        .bind(json!({"kind":"orders","targetId":id}))
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(json!({"id":id,"replayed":false,"historical":true}))
}
