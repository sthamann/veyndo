//! Page evidence lives in the installed app's native private records, separate from bounded technical job retention.
use super::*;
pub async fn load(config: &config::Config, t: &str, job: &Value) -> Result<Option<Value>> {
    let input = &job["input"];
    let Some(id) = input["batchId"].as_str() else {
        return Ok(None);
    };
    let callback = config.callbacks.get(t).ok_or("Core callback unavailable")?;
    let page = core::callback(
        callback,
        t,
        "record_action",
        &json!({"action":"list_batches","input":{"id":id,"limit":1}}),
        config.fixture,
    )
    .await?;
    let row = page["elements"]
        .as_array()
        .and_then(|xs| xs.first())
        .ok_or("Saved migration page is missing; review it again")?;
    if input["evidenceRecord"] != json!({"entity":"batches","id":id}) {
        return Err("Frozen completion destination differs from the reviewed page".into());
    }
    if input["batchRevision"]
        .as_u64()
        .is_none_or(|rev| rev == 0 || row["revision"].as_u64().is_none_or(|current| current < rev))
        || row["run_id"] != input["jobGroup"]
        || row["source_id"] != input["sourceId"]
        || row["kind"] != input["kind"]
        || row["target"] != input["target"]
        || row["digests"] != input["recordDigests"]
        || row["options"] != input["options"]
        || row["cursor"].as_str().unwrap_or("") != input["cursor"].as_str().unwrap_or("")
    {
        return Err("Saved migration page differs from the reviewed job; review it again".into());
    }
    Ok(Some(row.clone()))
}
pub fn evidence(job: &Value, row: &Value, result: &Value) -> Result<Value> {
    let mut fields = row.clone();
    let map = fields
        .as_object_mut()
        .ok_or("Invalid saved migration page")?;
    map.remove("id");
    map.remove("revision");
    map.remove("evidence");
    fields["cursor"] = json!(row["cursor"].as_str().unwrap_or(""));
    fields["state"] = json!(if result["reconciled"] == true {
        "matching"
    } else {
        "differences"
    });
    fields["result"] = result.clone();
    fields["job_id"] = job["id"].clone();
    fields["next_cursor"] = json!(result["nextCursor"].as_str().unwrap_or(""));
    Ok(
        json!({"action":"save_batch","input":{"id":row["id"],"revision":row["revision"],"fields":fields}}),
    )
}
