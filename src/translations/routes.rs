//! Authorized translation job creation, progress, paginated drafts and resume/cancel controls.
use super::*;
pub(crate) async fn create(
    State(a): State<App>,
    h: RequestContext,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    auth::permit(&h, "catalog")?;
    let t = merchant(&a, &h)?;
    let (settings, _) = commerce::config(&a, &t).await?;
    let choice: Choice = serde_json::from_value(
        v.get("inference")
            .cloned()
            .unwrap_or(json!({"provider":"ollama","model":null})),
    )
    .map_err(|_| bad("Invalid translation provider"))?;
    let products = selection::parse(v.get("productIds"))?;
    admit_provider(&a, &choice).await?;
    let mut tx = a.db.begin().await?;
    let id = Uuid::new_v4().to_string();
    enqueue(
        &a,
        &mut tx,
        &t,
        &id,
        &settings,
        (
            v["targetLocale"]
                .as_str()
                .ok_or(bad("Target language required"))?,
            &choice,
            v["overwrite"].as_bool().unwrap_or(false),
            products.as_deref(),
        ),
    )
    .await?;
    tx.commit().await?;
    Ok(Json(json!({"id":id,"status":"queued"})))
}
/// Both explicit settings commands and approved merchant tasks enqueue the same durable draft owner.
pub(crate) async fn enqueue(
    _a: &App,
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    t: &str,
    id: &str,
    s: &commerce::Settings,
    request: (&str, &Choice, bool, Option<&[String]>),
) -> Result<()> {
    let (target, choice, overwrite, products) = request;
    selection::admit(tx, t, products).await?;
    if !s.locales.iter().any(|l| l == target) || target == s.main_locale {
        return Err(bad("Select an enabled translation target"));
    }
    let row = sqlx::query(
        "SELECT count(*) AS total,coalesce(max(id),'') AS highwater FROM products WHERE tenant=$1 AND ($2::text[] IS NULL OR id=ANY($2))",
    )
    .bind(t)
    .bind(products)
    .fetch_one(&mut **tx)
    .await?;
    sqlx::query("INSERT INTO translation_jobs(tenant,id,source_locale,target_locale,choice,overwrite,total,highwater,product_ids) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)").bind(t).bind(id).bind(&s.main_locale).bind(target).bind(json!(choice)).bind(overwrite).bind(row.get::<i64,_>("total")).bind(row.get::<String,_>("highwater")).bind(products).execute(&mut **tx).await?;
    Ok(())
}

pub(crate) async fn list(State(a): State<App>, h: RequestContext) -> Result<Json<Value>> {
    auth::permit(&h, "catalog.read")?;
    let t = merchant(&a, &h)?;
    let rows:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(j)-'tenant'-'lease'-'lease_until' FROM translation_jobs j WHERE tenant=$1 ORDER BY created_at DESC LIMIT 30").bind(&t).fetch_all(&a.db).await?;
    Ok(Json(json!({"jobs":rows})))
}
pub(crate) async fn detail(
    State(a): State<App>,
    h: RequestContext,
    Path(id): Path<String>,
    axum::extract::Query(q): axum::extract::Query<HashMap<String, String>>,
) -> Result<Json<Value>> {
    auth::permit(&h, "catalog.read")?;
    let t = merchant(&a, &h)?;
    let job:Value=sqlx::query_scalar("SELECT to_jsonb(j)-'tenant'-'lease'-'lease_until' FROM translation_jobs j WHERE tenant=$1 AND id=$2").bind(&t).bind(&id).fetch_optional(&a.db).await?.ok_or(bad("Translation job unavailable"))?;
    let items:Vec<Value>=sqlx::query_scalar("SELECT to_jsonb(i)-'tenant'-'job_id' FROM translation_items i WHERE tenant=$1 AND job_id=$2 AND product_id>$3 ORDER BY product_id LIMIT 51").bind(&t).bind(&id).bind(q.get("cursor").map(String::as_str).unwrap_or("")).fetch_all(&a.db).await?;
    let counts:Value=sqlx::query_scalar("SELECT coalesce(jsonb_object_agg(status,n),'{}') FROM (SELECT status,count(*) AS n FROM translation_items WHERE tenant=$1 AND job_id=$2 GROUP BY status) s").bind(&t).bind(&id).fetch_one(&a.db).await?;
    Ok(Json(
        json!({"job":job,"counts":counts,"items":items.iter().take(50).collect::<Vec<_>>(),"nextCursor":if items.len()>50 {items[49]["product_id"].clone()}else{Value::Null}}),
    ))
}
pub(crate) async fn control(
    State(a): State<App>,
    h: RequestContext,
    Path(id): Path<String>,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    auth::permit(&h, "catalog")?;
    let t = merchant(&a, &h)?;
    let status = match v["action"].as_str() {
        Some("resume") => "queued",
        Some("cancel") => "cancelled",
        _ => return Err(bad("Invalid translation action")),
    };
    let n=sqlx::query("UPDATE translation_jobs SET status=$1,error=NULL,lease=NULL,lease_until=NULL WHERE tenant=$2 AND id=$3 AND run_task IS NULL AND status IN ('queued','failed','processing')").bind(status).bind(&t).bind(&id).execute(&a.db).await?.rows_affected();
    if n == 0 {
        return Err(conflict(
            "Translation is complete or controlled by its original task; use the task continuation controls",
        ));
    }
    Ok(Json(json!({"status":status})))
}

/// Resolve centrally managed provider settings before acquiring a transaction-pool backend.
pub(crate) async fn admit_provider(a: &App, choice: &Choice) -> Result<()> {
    let available = a.inference.public_providers().await.map_err(bad)?;
    if !available["providers"].as_array().is_some_and(|providers| {
        providers
            .iter()
            .any(|p| p["id"] == json!(choice.provider) && p["configured"] == true)
    }) {
        return Err(bad("Translation provider is not configured"));
    }
    Ok(())
}
