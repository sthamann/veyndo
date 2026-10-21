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
        if step.name == "merchant.translations.create" {
            if !translation::advance(a, t, id, h, &run, index, step).await? {
                return Ok(json!({"taskId":id,"applied":false,"queued":true}));
            }
            continue;
        }
        let changed=sqlx::query("UPDATE tasks SET run_pending=$4,run_revision=run_revision+1 WHERE tenant=$1 AND id=$2 AND run_state='running' AND run_lease=$3 AND run_until>now()").bind(t).bind(id).bind(&run.lease).bind(&key).execute(&a.db).await?.rows_affected();
        if changed != 1 {
            return Err(conflict("Work cancelled before operation"));
        }
        let mut tx = a.db.begin().await?;
        // This transaction admits one operation. Managed saves and their receipts
        // commit together; native owners keep their own transaction below.
        let locked=sqlx::query("SELECT id FROM tasks WHERE tenant=$1 AND id=$2 AND run_state='running' AND run_lease=$3 AND run_until>now() FOR UPDATE").bind(t).bind(id).bind(&run.lease).fetch_optional(&mut *tx).await?;
        if locked.is_none() {
            return Err(conflict("Work lost its operation lease"));
        }
        let args: Value = serde_json::from_str(&step.arguments_json)
            .map_err(|_| bad("Invalid approved arguments"))?;
        let admission = format!("admission-{key}");
        if let Some(change) = &step.binding {
            history::context(&mut tx, h, "agent-work").await?;
            apps::apply_change(&mut tx, t, change, h).await?;
        } else {
            // Do not hold a backend while a native owner acquires its own one.
            // Retain an admission token across cancellation so an admitted native
            // effect can truthfully finish its receipt without reviving the task.
            let admitted = sqlx::query("UPDATE tasks SET run_checkpoint=jsonb_set(run_checkpoint,ARRAY[$3],$4,true) WHERE tenant=$1 AND id=$2 AND run_state='running' AND run_lease=$5 AND run_until>now()")
                .bind(t).bind(id).bind(&admission).bind(json!({"lease":run.lease})).bind(&run.lease).execute(&mut *tx).await?.rows_affected();
            if admitted != 1 {
                return Err(conflict("Native work admission lost its lease"));
            }
            tx.commit().await?;
            Box::pin(capabilities::invoke(a, h, &step.name, &args)).await?;
            tx = a.db.begin().await?;
        }
        // Keep only outcome metadata; domain data stays in its existing authorized owner.
        let receipt = json!({"index":index,"name":step.name,"label":step.label,"completed":true});
        let recorded = sqlx::query("UPDATE tasks SET run_checkpoint=jsonb_set(run_checkpoint-$6::text,ARRAY[$4],$5,true),run_pending=CASE WHEN run_state='running' THEN NULL ELSE run_pending END,run_revision=run_revision+1,run_updated=now(),run_until=CASE WHEN run_state='running' AND run_until>now() THEN now()+interval '240 seconds' ELSE run_until END WHERE tenant=$1 AND id=$2 AND ((run_lease=$3 AND run_state='running' AND run_until>now()) OR ($7 AND run_checkpoint->$6=jsonb_build_object('lease',$3::text) AND ((run_state IN ('cancelled','uncertain') AND run_lease IS NULL) OR (run_state='running' AND run_lease=$3))))")
            .bind(t).bind(id).bind(&run.lease).bind(&key).bind(receipt).bind(&admission).bind(step.binding.is_none()).execute(&mut *tx).await?.rows_affected();
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
