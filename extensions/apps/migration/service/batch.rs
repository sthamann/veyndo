//! A reviewed source page is immutable during a job; each native write is replayable and checkpointed in Core.
use super::*;
pub async fn run(config: &config::Config, t: &str, job: &Value) -> Result<Value> {
    let callback = config
        .callbacks
        .get(t)
        .ok_or("Core callback is not configured for this tenant")?;
    let input = &job["input"];
    let source_id = input["sourceId"]
        .as_str()
        .ok_or("Source connection required")?;
    let c = config.connection(t, source_id, &job["_appSettings"])?;
    let inspecting = job["action"]
        .as_str()
        .and_then(|name| name.strip_prefix("review_"));
    let kind = inspecting
        .or_else(|| input["kind"].as_str())
        .ok_or("Source domain required")?;
    let mut page = extract::page(
        &c,
        source_id,
        kind,
        input["cursor"].as_str(),
        config.fixture,
    )
    .await?;
    if inspecting.is_some() {
        let state = core::callback(
            callback,
            t,
            "job_progress",
            &json!({"id":job["id"],"lease":job["lease"],"status":"running"}),
            config.fixture,
        )
        .await?;
        if state["cancelRequested"] == true {
            return Err("Migration cancelled; no source inspection was adopted".into());
        }
        page["cursor"] = input["cursor"].clone();
        page["jobGroup"] = input["jobGroup"].clone();
        return Ok(page);
    }
    if page["recordDigests"] != input["recordDigests"] {
        return Err("Source changed after review; inspect this page again before importing".into());
    }
    let rows = page["records"]
        .as_array()
        .ok_or("Invalid source projection")?;
    let mut completed = job["checkpoint"]["completed"].as_u64().unwrap_or(0) as usize;
    if completed > rows.len() {
        return Err("Checkpoint exceeds reviewed page".into());
    }
    for row in rows.iter().skip(completed) {
        let state = core::callback(
            callback,
            t,
            "job_progress",
            &serde_json::json!({"id":job["id"],"lease":job["lease"],"status":"running"}),
            config.fixture,
        )
        .await?;
        if state["cancelRequested"] == true {
            return Err("Migration cancelled; completed records remain identifiable".into());
        }
        let mut write = serde_json::json!({"id":job["id"],"lease":job["lease"],"record":row});
        if row["kind"] == "assets" {
            use base64::Engine as _;
            use sha2::Digest;
            let (bytes, mime) = media::bytes(row, config.fixture).await?;
            if row["data"]["digest"] != format!("{:x}", sha2::Sha256::digest(&bytes))
                || row["data"]["mime"] != mime
            {
                return Err("Source image changed after review; no new bytes were imported".into());
            }
            let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
            write["assetChunks"] = json!(
                encoded
                    .as_bytes()
                    .chunks(65536)
                    .map(|s| std::str::from_utf8(s).unwrap())
                    .collect::<Vec<_>>()
            );
        }
        core::callback(callback, t, "job_import", &write, config.fixture).await?;
        completed += 1;
        core::callback(callback,t,"job_progress",&serde_json::json!({"id":job["id"],"lease":job["lease"],"status":"running","progress":completed*99/rows.len().max(1),"checkpoint":{"completed":completed}}),config.fixture).await?;
    }
    let mut result = serde_json::json!({"target":input["target"],"kind":input["kind"],"sourceId":input["sourceId"],"imported":completed,"reviewed":rows.len(),"nextCursor":page["nextCursor"],"sourceVersion":page["sourceVersion"],"adapterVersion":1,"snapshotConsistent":false,"cutoverReady":false,"reconciled":completed==rows.len()});
    result["jobGroup"] = input["jobGroup"].clone();
    result["cursor"] = input["cursor"].clone();
    if let Some(source) = page.get("sourceExport") {
        result["sourceExport"] = source.clone();
    }
    Ok(result)
}
