//! Approved work uses the existing task lease; each native write is fenced against cancellation and recorded before advancing.
use super::*;
pub(crate) async fn execute(
    a: &App,
    t: &str,
    id: &str,
    h: &RequestContext,
    request: &Value,
) -> Result<Value> {
    let steps: Vec<work_plan::Step> = serde_json::from_value(request["execution"].clone())
        .map_err(|_| bad("Invalid approved work"))?;
    let run = CURRENT
        .try_with(Clone::clone)
        .map_err(|_| bad("Work requires its native worker"))?;
    for (index, step) in steps.iter().enumerate() {
        checkpoint::authorize(a).await?;
        let key = format!("operation-{index}");
        if checkpoint::load(a, &key).await?.is_some() {
            continue;
        }
        let changed=sqlx::query("UPDATE tasks SET run_pending=$4,run_revision=run_revision+1 WHERE tenant=$1 AND id=$2 AND run_state='running' AND run_lease=$3 AND run_until>now()").bind(t).bind(id).bind(&run.lease).bind(&key).execute(&a.db).await?.rows_affected();
        if changed != 1 {
            return Err(conflict("Work cancelled before operation"));
        }
        let mut tx = a.db.begin().await?;
        // Cancellation waits for an admitted operation; no later step can pass its state/lease fence.
        let locked=sqlx::query("SELECT id FROM tasks WHERE tenant=$1 AND id=$2 AND run_state='running' AND run_lease=$3 AND run_until>now() FOR UPDATE").bind(t).bind(id).bind(&run.lease).fetch_optional(&mut *tx).await?;
        if locked.is_none() {
            return Err(conflict("Work lost its operation lease"));
        }
        let args: Value = serde_json::from_str(&step.arguments_json)
            .map_err(|_| bad("Invalid approved arguments"))?;
        if let Some(change) = &step.binding {
            history::context(&mut tx, h, "agent-work").await?;
            apps::apply_change(&mut tx, t, change, h).await?;
        } else {
            Box::pin(capabilities::invoke(a, h, &step.name, &args)).await?;
        }
        // Keep only outcome metadata; domain data stays in its existing authorized owner.
        let receipt = json!({"index":index,"name":step.name,"label":step.label,"completed":true});
        let recorded = sqlx::query("UPDATE tasks SET run_checkpoint=jsonb_set(run_checkpoint,ARRAY[$4],$5,true),run_pending=NULL,run_revision=run_revision+1,run_updated=now(),run_until=now()+interval '240 seconds' WHERE tenant=$1 AND id=$2 AND run_lease=$3 AND run_state='running' AND run_until>now()")
            .bind(t).bind(id).bind(&run.lease).bind(&key).bind(receipt).execute(&mut *tx).await?.rows_affected();
        if recorded != 1 {
            return Err(conflict("Work lost its completion lease"));
        }
        tx.commit().await?;
    }
    let mut tx = a.db.begin().await?;
    let row=sqlx::query("UPDATE tasks SET applied=true,run_state='ready',run_pending=NULL,run_lease=NULL,run_until=NULL,run_revision=run_revision+1,run_updated=now() WHERE tenant=$1 AND id=$2 AND run_state='running' AND run_lease=$3 AND run_until>now() RETURNING conversation_id").bind(t).bind(id).bind(&run.lease).fetch_optional(&mut *tx).await?.ok_or(conflict("Work completion lost its lease"))?;
    if let Some(c) = row.get::<Option<String>, _>("conversation_id") {
        sqlx::query("UPDATE conversations SET turn_owner=NULL,turn_until=NULL WHERE tenant=$1 AND id=$2 AND turn_owner=$3").bind(t).bind(c).bind(id).execute(&mut *tx).await?;
    }
    tx.commit().await?;
    Ok(json!({"taskId":id,"applied":true}))
}
