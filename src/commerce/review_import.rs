//! Native historical review admission preserves source provenance, explicit moderation and unverified customer identity.
use super::*;
pub(crate) async fn import_review(
    a: &App,
    h: &RequestContext,
    id: &str,
    product: &str,
    data: &Value,
    source: &Value,
) -> Result<Value> {
    let t = merchant(a, h)?;
    auth::permit(h, "catalog.write")?;
    auth::permit(h, "customers.pii")?;
    if staging::parent(a, &t).await?.is_some() {
        return Err(bad(
            "Historical reviews require their live product and native moderation",
        ));
    }
    let field = |key: &str, max: usize| -> Result<&str> {
        data[key]
            .as_str()
            .filter(|s| !s.trim().is_empty() && s.chars().count() <= max)
            .ok_or(bad(format!("Original review {key} required")))
    };
    let author = field("sourceAuthor", 80)?;
    let title = field("title", 120)?;
    let content = field("text", 3000)?;
    let rating = data["rating"]
        .as_i64()
        .filter(|n| (1..=5).contains(n))
        .ok_or(bad("Review rating must be 1..5"))?;
    let created = field("createdAt", 100).and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(s)
            .map_err(|_| bad("Original review date requires an explicit timezone"))
    })?;
    if data["verifiedPurchase"] != false {
        return Err(bad(
            "Imported purchase claims are not native verified-purchase evidence",
        ));
    }
    let mut tx = a.db.begin().await?;
    history::context(&mut tx, h, "historical_review_import").await?;
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,28))")
        .bind(format!("{t}:review:{id}"))
        .execute(&mut *tx)
        .await?;
    let exists: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM products WHERE tenant=$1 AND id=$2)")
            .bind(&t)
            .bind(product)
            .fetch_one(&mut *tx)
            .await?;
    if !exists {
        return Err(bad(
            "Publish the referenced product before its historical reviews",
        ));
    }
    let previous: Option<Value> = sqlx::query_scalar(
        "SELECT source_import FROM product_reviews WHERE tenant=$1 AND id=$2 FOR UPDATE",
    )
    .bind(&t)
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?
    .flatten();
    if let Some(previous) = previous {
        if previous != *source {
            return Err(conflict(
                "Imported review source changed; review its conflict",
            ));
        }
        tx.commit().await?;
        return Ok(json!({"id":id,"replayed":true}));
    }
    sqlx::query("INSERT INTO product_reviews(id,tenant,product_id,session,author,rating,title,content,verified,approved,created_at,source_import) VALUES($1,$2,$3,$4,$5,$6,$7,$8,false,false,$9::text::timestamptz,$10)").bind(id).bind(&t).bind(product).bind(format!("import:{id}")).bind(author).bind(rating as i32).bind(title).bind(content).bind(created.to_rfc3339()).bind(source).execute(&mut *tx).await?;
    sqlx::query("INSERT INTO outbox(tenant,kind,data) VALUES($1,'migration.record.imported',$2)")
        .bind(&t)
        .bind(json!({"kind":"reviews","targetId":id}))
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(json!({"id":id,"replayed":false,"state":"pending-moderation","verifiedPurchase":false}))
}
