//! Review and mutation contract: no shell/SQL emulation; original Shopware owns extension lifecycle effects.
use super::*;
#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Change {
    pub cell_id: String,
    pub kind: String,
    pub name: String,
    pub operation: String,
    pub revision: String,
}
impl Change {
    pub fn parse(v: &Value) -> Result<Self> {
        let c: Self = serde_json::from_value(v.clone())
            .map_err(|_| error(StatusCode::BAD_REQUEST, "Invalid extension change"))?;
        if !matches!(c.kind.as_str(), "plugin" | "app")
            || !matches!(
                c.operation.as_str(),
                "install" | "activate" | "deactivate" | "update" | "uninstall"
            )
            || c.name.is_empty()
            || c.name.len() > 120
            || !c
                .name
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b == b'_')
            || c.revision.len() != 64
            || !c.revision.bytes().all(|b| b.is_ascii_hexdigit())
        {
            return Err(error(
                StatusCode::BAD_REQUEST,
                "Invalid extension identifier or operation",
            ));
        }
        Ok(c)
    }
    pub fn path(&self) -> String {
        format!(
            "/api/_action/extension/{}/{}/{}",
            self.operation, self.kind, self.name
        )
    }
    pub fn method(&self) -> reqwest::Method {
        if matches!(self.operation.as_str(), "activate" | "deactivate") {
            reqwest::Method::PUT
        } else {
            reqwest::Method::POST
        }
    }
}
pub async fn prepare(a: &App, t: &str, v: &Value) -> Result<Value> {
    let change = Change::parse(v)?;
    let c = a.cell(t, &change.cell_id)?;
    let inventory = inventory::inspect(a, c).await?;
    if inventory["revision"] != change.revision {
        return Err(error(
            StatusCode::CONFLICT,
            "Extensions changed; refresh and review again",
        ));
    }
    let extension = inventory["snapshot"]["extensions"]
        .as_array()
        .and_then(|xs| {
            xs.iter()
                .find(|e| e["kind"] == change.kind && e["name"] == change.name)
        })
        .ok_or_else(|| {
            error(
                StatusCode::NOT_FOUND,
                "Extension must first be staged in this Shopware cell",
            )
        })?;
    let review = json!({"tenant":t,"change":change,"imageDigest":c.image_digest,"version":c.version,"environment":c.environment,"keepUserData":true});
    Ok(
        json!({"change":change,"approvalDigest":digest(&review),"extension":extension,"environment":c.environment,"keepUserData":true}),
    )
}
pub async fn execute(a: &App, t: &str, job: &Value) -> Result<Value> {
    let input = &job["input"];
    if input["approve"] != true {
        return Err(error(
            StatusCode::BAD_REQUEST,
            "Reviewed extension change requires approval",
        ));
    }
    let prepared = prepare(a, t, &input["change"]).await?;
    if input["approvalDigest"] != prepared["approvalDigest"] {
        return Err(error(
            StatusCode::CONFLICT,
            "Approval does not match the current cell",
        ));
    }
    let change = Change::parse(&input["change"])?;
    let c = a.cell(t, &change.cell_id)?;
    // Native CAS serializes mutations across replicas. An uncertain external write
    // keeps the fence; it never expires while Shopware may still be processing it.
    let rows = a
        .record(t, "list_locks", json!({"id":change.cell_id}))
        .await?;
    let prior = rows["elements"].as_array().and_then(|r| r.first());
    if prior.is_some_and(|r| r["state"] != "idle") {
        return Err(error(
            StatusCode::CONFLICT,
            "Environment has an unfinished change; reconcile it before continuing",
        ));
    }
    let lock_revision = prior.and_then(|r| r["revision"].as_i64()).unwrap_or(0);
    let mut fields = json!({"cell":change.cell_id,"change":input["change"],"job":job["id"],"state":"started","approval":prepared["approvalDigest"]});
    a.record(
        t,
        "save_locks",
        json!({"id":change.cell_id,"revision":lock_revision,"fields":fields}),
    )
    .await?;
    let preflight = async {
        prepare(a, t, &input["change"]).await?;
        let progress = a
            .callback(
                t,
                "job_progress",
                json!({"id":job["id"],"lease":job["lease"],"status":"running","progress":20}),
            )
            .await?;
        if progress["cancelRequested"] == true {
            return Err(error(
                StatusCode::CONFLICT,
                "Cancelled before Shopware change",
            ));
        }
        transport::token(a, c).await
    }
    .await;
    let token = match preflight {
        Ok(token) => token,
        Err(e) => {
            fields["state"] = json!("idle");
            // No business request has been sent, so this fence can be released safely.
            a.record(
                t,
                "save_locks",
                json!({"id":change.cell_id,"revision":lock_revision+1,"fields":fields}),
            )
            .await?;
            return Err(e);
        }
    };
    let receipt = format!("effect_{}", &digest(&job["id"])[..40]);
    a.record(
        t,
        "save_effects",
        json!({"id":receipt,"revision":0,"fields":fields}),
    )
    .await?;
    transport::request(
        a,
        c,
        &token,
        change.method(),
        &change.path(),
        json!({"keepUserData":true}),
    )
    .await?;
    let after = inventory::inspect(a, c).await?;
    fields["state"] = json!("acknowledged");
    a.record(
        t,
        "save_effects",
        json!({"id":receipt,"revision":1,"fields":fields}),
    )
    .await?;
    fields["state"] = json!("idle");
    a.record(
        t,
        "save_locks",
        json!({"id":change.cell_id,"revision":lock_revision+1,"fields":fields}),
    )
    .await?;
    Ok(
        json!({"receipt":receipt,"cellId":change.cell_id,"operation":change.operation,"revision":after["revision"]}),
    )
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn callers_cannot_select_arbitrary_runtime_commands() {
        let mut v = json!({"cellId":"sandbox","kind":"plugin","name":"Example","operation":"activate","revision":"a".repeat(64)});
        assert_eq!(Change::parse(&v).unwrap().method(), reqwest::Method::PUT);
        for name in ["../Other", "Example?token=x", "A/B", "A;shutdown", "%2e%2e"] {
            v["name"] = json!(name);
            assert!(Change::parse(&v).is_err());
        }
        v["name"] = json!("Example");
        v["operation"] = json!("remove");
        assert!(Change::parse(&v).is_err());
    }
}
