//! Capability-bound consent continuation: successive carts share one revocable receipt, never copied grants.
use super::*;

// Aliases are server-created, one hop and immutable; both sides are tenant/channel scoped.
pub(super) const RECEIPT_SQL: &str = "SELECT root.cart_id,root.policy_version,root.data,root.expires_at>now() AS fresh FROM privacy_consents own JOIN privacy_consents root ON root.tenant=own.tenant AND root.channel_id=own.channel_id AND root.cart_id=coalesce(own.source_cart_id,own.cart_id) AND root.source_cart_id IS NULL WHERE own.tenant=$1 AND own.cart_id=$2 AND own.channel_id=$3 FOR SHARE OF root";

pub(super) async fn receipt_owner(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    c: &StoredCart,
) -> Result<String> {
    Ok(sqlx::query_scalar("SELECT coalesce(source_cart_id,cart_id) FROM privacy_consents WHERE tenant=$1 AND cart_id=$2 AND channel_id=$3")
        .bind(&c.tenant).bind(&c.id).bind(&c.data.sales_channel)
        .fetch_optional(&mut **tx).await?.unwrap_or_else(|| c.id.clone()))
}

pub(super) async fn receipt_carts(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    c: &StoredCart,
    owner: &str,
) -> Result<Vec<String>> {
    Ok(sqlx::query_scalar("SELECT cart_id FROM privacy_consents WHERE tenant=$1 AND channel_id=$2 AND (cart_id=$3 OR source_cart_id=$3) ORDER BY cart_id")
        .bind(&c.tenant).bind(&c.data.sales_channel).bind(owner).fetch_all(&mut **tx).await?)
}

/// The caller has authenticated the original cart capability through load_cart.
/// Completed storefront carts in the same browser/shop/channel qualify. Company
/// buyers additionally need their current authenticated identity and purchasing grant.
pub(crate) async fn continue_consent(
    a: &App,
    previous: &StoredCart,
    next: &StoredCart,
) -> Result<()> {
    if previous.status != "completed"
        || previous.tenant != next.tenant
        || previous.data.sales_channel != next.data.sales_channel
        || previous.data.session.is_empty()
        || previous.data.session != next.data.session
        || previous.data.customer_id != next.data.customer_id
        || previous.data.pos_actor.is_some()
        || previous.data.admin_actor.is_some()
        || (previous.data.b2b.is_some() && previous.data.customer_id.is_none())
    {
        return Ok(());
    }
    let mut tx = a.db.begin().await?;
    let (settings, _) =
        commerce::scoped_locked(&mut tx, &next.tenant, &next.data.sales_channel).await?;
    // A capability-checked successor points at the original receipt. It never copies
    // a grant: reads, revocation and processing all lock/read the same root row.
    let saved = sqlx::query(RECEIPT_SQL)
        .bind(&previous.tenant)
        .bind(&previous.id)
        .bind(&previous.data.sales_channel)
        .fetch_optional(&mut *tx)
        .await?;
    if let Some(saved) = saved.filter(|r| {
        r.get::<String, _>("policy_version") == policy_version(&settings.legal)
            && r.get::<bool, _>("fresh")
    }) {
        let source: String = saved.get("cart_id");
        // Old binaries fail closed on an alias during a rolling update/rollback.
        let inserted = sqlx::query("INSERT INTO privacy_consents(tenant,cart_id,channel_id,policy_version,data,expires_at,source_cart_id) VALUES($1,$2,$3,'','{\"choices\":{},\"decided\":false}',now(),$4) ON CONFLICT(tenant,cart_id,channel_id) DO NOTHING")
            .bind(&next.tenant).bind(&next.id).bind(&next.data.sales_channel)
            .bind(&source).execute(&mut *tx).await?.rows_affected();
        if inserted == 1 {
            sqlx::query("INSERT INTO privacy_consent_log(tenant,cart_id,channel_id,data) VALUES($1,$2,$3,$4)")
                .bind(&next.tenant).bind(&next.id).bind(&next.data.sales_channel)
                .bind(json!({"continuedFromCartId":previous.id,"receiptCartId":source}))
                .execute(&mut *tx).await?;
        }
    }
    tx.commit().await?;
    Ok(())
}
