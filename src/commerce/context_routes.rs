//! Public method discovery and revision-checked checkout context changes.
use super::*;

pub(crate) async fn options(State(a): State<App>, h: RequestContext) -> Result<Json<Value>> {
    let t = tenant(&h)?;
    let (s, revision) = scoped_config(&a, &t, marketing::channel_id(&h)).await?;
    let cart = if header(&h, "sw-context-token").is_some() {
        Some(load_cart(&a, &h).await?)
    } else {
        None
    };
    let code = s
        .currencies
        .selected(&currencies::requested(&h, cart.as_ref()))?
        .code
        .clone();
    let business = cart.as_ref().is_some_and(|c| s.is_business(&c.data.group));
    let currency = s.currencies.selected(&code)?;
    let shipping = s
        .shipping
        .iter()
        .filter(|v| v.active)
        .map(|v| {
            let mut result = super::method_text::localized_shipping(
                v,
                header(&h, "x-commerce-locale").unwrap_or(&s.main_locale),
                &s,
            );
            result["price"] = json!(currencies::convert(v.price, &s.currencies, currency)?);
            result["freeAbove"] = json!(
                v.free_above
                    .map(|v| currencies::convert(v, &s.currencies, currency))
                    .transpose()?
            );
            Ok(result)
        })
        .collect::<Result<Vec<Value>>>()?;
    let available = payments::registry::available(&a, &t, marketing::channel_id(&h), &code).await?;
    let locale = header(&h, "x-commerce-locale").unwrap_or(&s.main_locale);
    Ok(Json(
        json!({"mainLocale":s.main_locale,"locales":s.locales,"countries":s.countries,"currencyContext":currencies::context(&s.currencies,currency),"shipping":shipping,"payments":s.payments.iter().filter(|v|v.active&&(v.mode != "cash" || h.pos.is_some())&&(!v.business_only||business)&&v.provider.as_ref().is_none_or(|p|v.provider_method.as_ref().is_some_and(|m|available.contains(&(p.clone(),m.clone()))))).map(|v|super::method_text::localized_payment(v,locale,&s)).collect::<Vec<_>>(),"revision":revision}),
    ))
}
pub(crate) async fn select_checkout(
    State(a): State<App>,
    h: RequestContext,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    let mut requested: CheckoutSelection = serde_json::from_value(v["checkout"].clone())
        .map_err(|_| bad("Invalid checkout selection"))?;
    if v["checkout"]["address"].is_object()
        && v["checkout"]["address"]["country"].is_null()
        && let Some(ad) = &mut requested.address
    {
        ad.country = requested.country.clone();
    }
    // Quote a candidate before locking its cart: pricing/settings use the pool.
    // Concurrent requests must not each hold one connection while asking for another.
    let mut c = load_cart(&a, &h).await?;
    let original_revision = c.revision;
    if c.status != "open" {
        return Err(conflict("Cart is terminal"));
    }
    if v["revision"].as_i64() != Some(c.revision) {
        return Err(conflict("Cart revision changed; reload before editing"));
    }
    if requested.billing_address_id.is_some() || requested.shipping_address_id.is_some() {
        let (_, email) = accounts::identity(&a, &h).await?;
        if c.data.customer_id.is_none() || c.data.email.as_deref() != Some(&email) {
            return Err(Error(
                StatusCode::FORBIDDEN,
                "Address selection requires the owning authenticated cart".into(),
            ));
        }
        let mut tx = a.db.begin().await?;
        if let Some(id) = &requested.billing_address_id {
            requested.billing_address =
                Some(accounts::address_get(&mut tx, &c.tenant, &email, id).await?);
        }
        if let Some(id) = &requested.shipping_address_id {
            requested.address = Some(accounts::address_get(&mut tx, &c.tenant, &email, id).await?);
            requested.country = requested.address.as_ref().unwrap().country.clone();
        }
        tx.commit().await?;
    }
    if let Some(email) = &requested.customer_email {
        let email = auth::email(&json!({"email":email}))?;
        if c.data.customer_id.is_some() && c.data.email.as_deref() != Some(&email) {
            return Err(bad("Checkout email differs from authenticated customer"));
        }
        c.data.email = Some(email);
    }
    let (settings, _) = scoped_config(&a, &c.tenant, &c.data.sales_channel).await?;
    for ad in [&mut requested.address, &mut requested.billing_address]
        .into_iter()
        .flatten()
    {
        ad.validate()?;
        validate_address_geography(ad, &settings)?;
    }
    if requested
        .address
        .as_ref()
        .is_some_and(|a| a.country != requested.country)
    {
        return Err(bad(
            "Shipping address country differs from checkout country",
        ));
    }
    if requested.billing_address.is_none() {
        requested.billing_address = requested.address.clone();
    }
    c.data.checkout = Some(requested);
    c.revision += 1;
    let q = cart_json(&a, &c).await?;
    if q["selectionNeedsConfirmation"] == true {
        return Err(bad("Selected country, shipping or payment is unavailable"));
    }
    let mut tx = a.db.begin().await?;
    let locked =
        sqlx::query("SELECT revision,status FROM carts WHERE tenant=$1 AND token=$2 FOR UPDATE")
            .bind(&c.tenant)
            .bind(&c.token)
            .fetch_one(&mut *tx)
            .await?;
    if locked.get::<String, _>("status") != "open"
        || locked.get::<i64, _>("revision") != original_revision
    {
        return Err(conflict("Cart revision changed; reload before editing"));
    }
    b2b::guard_conn(&mut tx, &h, &c).await?;
    sqlx::query("UPDATE carts SET data=$1,revision=$2 WHERE id=$3")
        .bind(json!(c.data))
        .bind(c.revision)
        .bind(c.id)
        .execute(&mut *tx)
        .await?;
    agent_runs::checkpoint::fence_commit(&a, &mut tx).await?;
    tx.commit().await?;
    Ok(Json(q))
}
