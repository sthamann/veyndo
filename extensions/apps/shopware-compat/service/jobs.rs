//! Core-leased jobs: authenticate and validate whole event batches, claim before acknowledgement, and keep unknown writes fenced.
use super::*;
pub fn ids(v: &Value, t: &str) -> Result<Vec<String>> {
    let list = if let Some(vs) = v.get("events") {
        if v["tenant"] != t || v["app"] != "shopware_compat" || v["apiVersion"] != "1" {
            return Err(error(StatusCode::BAD_REQUEST, "Foreign event batch"));
        }
        vs.as_array()
            .filter(|es| !es.is_empty() && es.len() <= 8)
            .ok_or(error(StatusCode::BAD_REQUEST, "Invalid event batch size"))?
            .iter()
            .collect::<Vec<_>>()
    } else {
        vec![v]
    };
    list.iter()
        .map(|e| {
            let id = e["eventId"]
                .as_u64()
                .filter(|n| *n > 0)
                .ok_or(error(StatusCode::BAD_REQUEST, "Event ID missing"))?;
            if e["tenant"] != t
                || e["kind"] != "app.shopware_compat.job_change"
                || e["idempotencyKey"] != format!("{t}:shopware_compat:{id}")
            {
                return Err(error(
                    StatusCode::BAD_REQUEST,
                    "Invalid compatibility job event",
                ));
            }
            e["data"]["jobId"]
                .as_str()
                .filter(|s| !s.is_empty() && s.len() <= 100)
                .map(str::to_owned)
                .ok_or(error(StatusCode::BAD_REQUEST, "Job identity missing"))
        })
        .collect()
}
pub async fn events(
    State(a): State<App>,
    h: HeaderMap,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    let t = a.tenant(&h)?.to_owned();
    let ids = ids(&v, &t)?;
    for id in &ids {
        let permit = a.capacity.clone().try_acquire_owned().map_err(|_| {
            error(
                StatusCode::TOO_MANY_REQUESTS,
                "Compatibility worker capacity reached; event delivery will retry",
            )
        })?;
        let job = match a.callback(&t, "job_claim", json!({"id":id})).await {
            Ok(job) => job,
            Err(e) if e.0 == StatusCode::CONFLICT => continue,
            Err(e) => return Err(e),
        };
        let app = a.clone();
        let tenant = t.clone();
        tokio::spawn(async move {
            let _permit = permit;
            match app.callback(&tenant,"job_progress",json!({"id":job["id"],"lease":job["lease"],"progress":20,"status":"running","message":{"en":"Checking cell and reviewed extension state","de":"Umgebung und geprüften Erweiterungsstand kontrollieren","fr":"Vérification de l’environnement et de l’extension","es":"Verificando el entorno y la extensión"}})).await {
                Err(_)=>return,
                Ok(v) if v["cancelRequested"]==true=>{let _=app.callback(&tenant,"job_progress",json!({"id":job["id"],"lease":job["lease"],"status":"cancelled","progress":20})).await;return;},
                _=>{}
            }
            let operation = plan::execute(&app, &tenant, &job);
            tokio::pin!(operation);
            let mut heartbeat = tokio::time::interval(std::time::Duration::from_secs(20));
            heartbeat.tick().await;
            let result = loop {
                tokio::select! {
                    result=&mut operation=>break result,
                    _=heartbeat.tick()=>{
                        match app.callback(&tenant,"job_progress",json!({"id":job["id"],"lease":job["lease"],"status":"running","progress":20})).await{
                            Ok(v) if v["cancelRequested"]==true=>{
                                let _=app.callback(&tenant,"job_progress",json!({"id":job["id"],"lease":job["lease"],"status":"cancelled","progress":20})).await;
                                return; // Dropped in-flight writes keep their durable uncertain fence.
                            }
                            Err(_)=>return, // Revocation or expired lease stops further provider steps.
                            _=>{}
                        }
                    }
                }
            };
            let (status, result, message) = match result {
                Ok(v) => (
                    "succeeded",
                    v,
                    json!({"en":"Shopware acknowledged the extension change; inspect its behavior in the cell","de":"Shopware hat die Änderung bestätigt. Verhalten in der Umgebung prüfen.","fr":"Shopware a confirmé le changement. Vérifiez l’extension.","es":"Shopware confirmó el cambio. Comprueba la extensión."}),
                ),
                Err(e) => (
                    "failed",
                    json!({}),
                    json!({"en":e.1.0["error"],"de":"Änderung fehlgeschlagen. Prüfe den Umgebungsstatus und den gespeicherten Auftrag.","fr":"Échec. Vérifiez accès, champs requis et résultats incertains.","es":"Error. Revisa acceso, campos y resultados inciertos."}),
                ),
            };
            if let Err(e)=app.callback(&tenant,"job_progress",json!({"id":job["id"],"lease":job["lease"],"progress":100,"status":status,"message":message,"result":result})).await {
                eprintln!("Compatibility completion callback failed: {}", e.1.0["error"]);
            }
        });
    }
    Ok(Json(json!({"accepted":true})))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn a_foreign_or_invalid_batch_has_no_claims() {
        let good = json!({"tenant":"own","eventId":1,"kind":"app.shopware_compat.job_change","idempotencyKey":"own:shopware_compat:1","data":{"jobId":"job"}});
        assert_eq!(ids(&good, "own").unwrap(), vec!["job"]);
        assert!(ids(&json!({"apiVersion":"1","tenant":"own","app":"shopware_compat","events":[good,{"tenant":"foreign"}]}),"own").is_err());
    }
}
