//! Admin CRM creation uses native contacts/address storage, history and outbox; it never issues customer credentials.
use super::*;
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Input {
    email: String,
    profile: accounts::Contact,
    customer_group: String,
    billing_address: Option<commerce::Address>,
    shipping_address: Option<commerce::Address>,
    #[serde(default)]
    additional_addresses: Vec<commerce::Address>,
    request_key: String,
}
pub(super) async fn create(
    State(a): State<App>,
    h: RequestContext,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    create_inner(a, h, v, None, None).await
}
pub(crate) async fn import(
    a: &App,
    h: &RequestContext,
    id: &str,
    v: Value,
    source: &Value,
) -> Result<Json<Value>> {
    create_inner(a.clone(), h.clone(), v, Some(id), Some(source)).await
}
async fn create_inner(
    a: App,
    h: RequestContext,
    v: Value,
    stable_id: Option<&str>,
    source: Option<&Value>,
) -> Result<Json<Value>> {
    let t = merchant(&a, &h)?;
    auth::permit(&h, "customers.write")?;
    auth::permit(&h, "customers.pii")?;
    if v["profile"].to_string().len() > 4000 {
        return Err(bad("Invalid customer profile"));
    }
    let mut input: Input = serde_json::from_value(v.clone())
        .map_err(|_| bad("Complete customer profile and billing address required"))?;
    if source.is_none() && input.billing_address.is_none() {
        return Err(bad(
            "Complete customer profile and billing address required",
        ));
    }
    if input.additional_addresses.len()
        + usize::from(input.billing_address.is_some())
        + usize::from(input.shipping_address.is_some())
        > 50
    {
        return Err(bad(
            "Customer address book supports at most 50 addresses per creation",
        ));
    }
    let email = auth::email(&json!({"email":input.email}))?;
    input.profile.validate()?;
    if !(8..=128).contains(&input.request_key.len()) {
        return Err(bad("Customer request key required"));
    }
    let id = stable_id.map(str::to_owned).unwrap_or_else(|| {
        hash(&format!(
            "{t}:{}:{}",
            header(&h, "x-rac-user").unwrap_or(""),
            input.request_key
        ))
    });
    let fingerprint = hash(&v.to_string());
    let mut tx = a.db.begin().await?;
    history::context(&mut tx, &h, "merchant").await?;
    let (settings, _) = commerce::scoped_locked(&mut tx, &t, "default").await?;
    if !settings
        .customer_groups
        .iter()
        .any(|g| g.id == input.customer_group)
    {
        return Err(bad("Unknown customer group"));
    }
    for address in input
        .billing_address
        .iter_mut()
        .chain(input.shipping_address.iter_mut())
        .chain(input.additional_addresses.iter_mut())
    {
        address.validate()?;
        commerce::validate_address_geography(address, &settings)?;
        if !settings.countries.contains(&address.country) {
            return Err(bad("Address country unavailable"));
        }
    }
    if let Some(row) =
        sqlx::query("SELECT email,automation FROM customers WHERE tenant=$1 AND id=$2")
            .bind(&t)
            .bind(&id)
            .fetch_optional(&mut *tx)
            .await?
    {
        if row.get::<Value, _>("automation")["adminCreationFingerprint"] != fingerprint {
            return Err(conflict(
                "Customer request key already used for different input",
            ));
        }
        if source.is_some_and(|s| row.get::<Value, _>("automation")["importSource"] != *s) {
            return Err(conflict(
                "Customer source snapshot changed; review an explicit update",
            ));
        }
        return Ok(Json(
            json!({"id":id,"email":row.get::<String,_>("email"),"created":true}),
        ));
    }
    // An invalid credential hash cannot be used to sign in. Storefront access is not granted by a CRM creation.
    let n = sqlx::query("INSERT INTO customers(tenant,id,email,password_hash,profile,company,group_name,automation) VALUES($1,$2,$3,'!',$4,NULLIF($5,''),$6,$7) ON CONFLICT DO NOTHING")
        .bind(&t).bind(&id).bind(&email).bind(json!(input.profile)).bind(&input.profile.company).bind(&input.customer_group).bind(json!({"adminCreationFingerprint":fingerprint,"importSource":source})).execute(&mut *tx).await?.rows_affected();
    if n != 1 {
        return Err(conflict(
            "Customer already exists; select the existing customer",
        ));
    }
    if let Some(address) = input.billing_address {
        save_address(
            &mut tx,
            &t,
            &email,
            source.is_some(),
            &json!({"defaultBilling":true,"defaultShipping":input.shipping_address.is_none()}),
            &address,
        )
        .await?;
    }
    if let Some(address) = input.shipping_address {
        save_address(
            &mut tx,
            &t,
            &email,
            source.is_some(),
            &json!({"defaultShipping":true}),
            &address,
        )
        .await?;
    }
    for address in input.additional_addresses {
        save_address(&mut tx, &t, &email, source.is_some(), &json!({}), &address).await?;
    }
    sqlx::query("INSERT INTO outbox(tenant,kind,data) VALUES($1,$2,$3)")
        .bind(&t)
        .bind(if source.is_some() {
            "migration.record.imported"
        } else {
            "customer.created"
        })
        .bind(json!({"customerId":id,"actor":header(&h,"x-rac-user"),"source":"merchant"}))
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(Json(json!({"id":id,"email":email,"created":true})))
}

/// Safe creation choices are available to CRM writers without granting settings access.
pub(super) async fn context(State(a): State<App>, h: RequestContext) -> Result<Json<Value>> {
    let t = merchant(&a, &h)?;
    auth::permit(&h, "customers.write")?;
    auth::permit(&h, "customers.pii")?;
    let (s, _) = commerce::config(&a, &t).await?;
    Ok(Json(
        json!({"elements":s.customer_groups,"countries":s.countries,"mainLocale":s.main_locale}),
    ))
}

// Imported address books share native validation/storage, without ordinary address-change workflows.
async fn save_address(
    conn: &mut sqlx::PgConnection,
    tenant: &str,
    email: &str,
    imported: bool,
    flags: &Value,
    address: &commerce::Address,
) -> Result<Value> {
    if imported {
        accounts::address_import_conn(conn, tenant, email, flags, address).await
    } else {
        accounts::address_save_conn(conn, tenant, email, None, flags, address).await
    }
}
