//! Read-only native callback comparisons cover every reviewed row, including rows imported before a resumed lease.
use super::*;
pub async fn run(config: &config::Config, t: &str, job: &Value, rows: &[Value]) -> Result<Value> {
    let callback = config.callbacks.get(t).ok_or("Core callback unavailable")?;
    let mut matching = 0;
    let mut changed = 0;
    let mut missing = 0;
    let mut examples = vec![];
    for row in rows {
        let state = core::callback(
            callback,
            t,
            "job_progress",
            &json!({"id":job["id"],"lease":job["lease"],"status":"running"}),
            config.fixture,
        )
        .await?;
        if state["cancelRequested"] == true {
            return Err("Migration cancelled; target comparison stopped".into());
        }
        let result = core::callback(
            callback,
            t,
            "job_inspect",
            &json!({"id":job["id"],"lease":job["lease"],"record":row}),
            config.fixture,
        )
        .await?;
        match result["status"].as_str() {
            Some("matching") => matching += 1,
            Some("changed") => changed += 1,
            Some("missing") => missing += 1,
            _ => return Err("Native target comparison returned an unknown status".into()),
        }
        if result["status"] != "matching"
            && examples.len() < 6
            && !["customers", "orders", "reviews"].contains(&row["kind"].as_str().unwrap_or(""))
        {
            let fields = result["differences"]
                .as_array()
                .map(|xs| {
                    xs.iter()
                        .take(3)
                        .filter_map(|v| v.as_str())
                        .map(|s| s.chars().take(120).collect::<String>())
                        .collect::<Vec<_>>()
                })
                .unwrap_or_default();
            examples
                .push(json!({"id":result["id"],"status":result["status"],"differences":fields}));
        }
    }
    Ok(
        json!({"comparison":"mapped-current-fields-v1","matching":matching,"changed":changed,"missing":missing,"checked":rows.len(),"examples":examples,"checkedAt":chrono::Utc::now().to_rfc3339(),"readOnly":true}),
    )
}
