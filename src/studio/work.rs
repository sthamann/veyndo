//! Bounded current-right work items come from native rows; no inferred revenue, customer data or parallel task store.
use crate::*;
pub(super) async fn load(a: &App, h: &RequestContext, t: &str, actor: &str) -> Result<Value> {
    let mut items = vec![];
    if auth::allowed(h, "catalog.read") {
        let ids: Vec<String> = sqlx::query_scalar(
            "SELECT id FROM products WHERE tenant=$1 AND stock<=0 ORDER BY id LIMIT 4",
        )
        .bind(t)
        .fetch_all(&a.db)
        .await?;
        for id in ids.into_iter().take(3) {
            items.push(
                json!({"id":format!("stock:{id}"),"kind":"stock","tab":"productData","entity":id}),
            );
        }
    }
    if auth::allowed(h, "assistant.use") && auth::allowed(h, "knowledge.read") {
        let rows=sqlx::query("SELECT id,run_state FROM tasks WHERE tenant=$1 AND run_actor=$2 AND run_state IN ('failed','uncertain') AND run_scopes <@ $3 ORDER BY run_updated DESC LIMIT 3").bind(t).bind(actor).bind(json!(auth::SCOPES.iter().filter(|s|auth::allowed(h,s)).collect::<Vec<_>>())).fetch_all(&a.db).await?;
        for r in rows {
            items.push(json!({"id":format!("run:{}",r.get::<String,_>("id")),"kind":"run","tab":"assistant","runId":r.get::<String,_>("id")}));
        }
    }
    if auth::allowed(h, "catalog.write") {
        let ids:Vec<String>=sqlx::query_scalar("SELECT id FROM translation_jobs WHERE tenant=$1 AND EXISTS(SELECT 1 FROM translation_items i WHERE i.tenant=translation_jobs.tenant AND i.job_id=translation_jobs.id AND i.status='ready') ORDER BY created_at DESC LIMIT 3").bind(t).fetch_all(&a.db).await?;
        for id in ids {
            items.push(json!({"id":format!("translation:{id}"),"kind":"translation","tab":"commerce","translationJob":id}));
        }
    }
    if auth::allowed(h, "apps.manage") {
        let ids: Vec<String> = sqlx::query_scalar("SELECT DISTINCT j.app FROM app_jobs j JOIN app_packages p ON p.tenant=j.tenant AND p.id=j.app WHERE j.tenant=$1 AND j.status='failed' AND p.active ORDER BY j.app LIMIT 3").bind(t).fetch_all(&a.db).await?;
        for id in ids {
            items.push(json!({"id":format!("app:{id}"),"kind":"app","tab":"apps","app":id}));
        }
    }
    Ok(json!({"items":items,"sampled":true,"perKindLimit":3}))
}
