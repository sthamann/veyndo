//! Scenario evidence uses the release owner's configuration projection, never orders or inventory.
use super::*;

pub(super) async fn capture(a: &App, t: &str) -> Option<String> {
    // Evidence is diagnostic: lock contention or the release projection's size
    // limits must not hide a completed purchase or stop an admitted shopper.
    match tokio::time::timeout(std::time::Duration::from_secs(3), snapshot(a, t)).await {
        Ok(Ok(digest)) => Some(digest),
        _ => {
            tracing::warn!(
                tenant = t,
                "Customer test configuration evidence unavailable"
            );
            None
        }
    }
}

async fn snapshot(a: &App, t: &str) -> Result<String> {
    let mut tx = a.db.begin().await?;
    sqlx::query("SET LOCAL lock_timeout='250ms'")
        .execute(&mut *tx)
        .await?;
    operations::lock_company(&mut tx, t).await?;
    let configuration = staging::snapshot(&mut tx, t).await?;
    // Release projections exclude credentials, stock and operational records.
    // Keep only the digest in the actor-private task, not a second configuration store.
    let digest = hash(&configuration.to_string());
    tx.rollback().await?;
    Ok(digest)
}

pub(super) fn review(evidence: &Value, current: Option<&str>) -> &'static str {
    let Some(started) = evidence["startedDigest"].as_str().filter(|s| !s.is_empty()) else {
        return "unverified";
    };
    let Some(finished) = evidence["finishedDigest"]
        .as_str()
        .filter(|s| !s.is_empty())
    else {
        return "unverified";
    };
    if current.is_none() || evidence["schemaVersion"] != 1 {
        "unverified"
    } else if started != finished {
        "changed_during_run"
    } else if Some(finished) != current {
        "stale"
    } else {
        "current"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn historical_or_partial_evidence_cannot_be_current() {
        for value in [
            Value::Null,
            json!({}),
            json!({"schemaVersion":1,"startedDigest":"a"}),
            json!({"schemaVersion":2,"startedDigest":"a","finishedDigest":"a"}),
        ] {
            assert_eq!(review(&value, Some("a")), "unverified");
        }
    }
    #[test]
    fn configuration_changes_during_execution_and_afterward_are_distinct() {
        let mut value = json!({"schemaVersion":1,"startedDigest":"a","finishedDigest":"a"});
        assert_eq!(review(&value, Some("a")), "current");
        assert_eq!(review(&value, None), "unverified");
        assert_eq!(review(&value, Some("b")), "stale");
        value["finishedDigest"] = json!("b");
        assert_eq!(review(&value, Some("b")), "changed_during_run");
        assert_eq!(review(&value, Some("a")), "changed_during_run");
    }
}
