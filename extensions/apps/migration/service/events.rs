//! The native outbox delivers job IDs; the service claims current Core leases before acknowledging work.
use super::*;
use axum::{
    Json,
    extract::State,
    http::{HeaderMap, StatusCode},
};
pub async fn receive(
    State(a): State<server::App>,
    h: HeaderMap,
    Json(v): Json<Value>,
) -> std::result::Result<Json<Value>, (StatusCode, Json<Value>)> {
    let t = server::authenticate(&a, &h)?;
    let fail = |s: &str| (StatusCode::BAD_REQUEST, Json(json!({"error":s})));
    let events = if v.get("events").is_some() {
        if v["tenant"] != t || v["app"] != "migration" || v["apiVersion"] != "1" {
            return Err(fail("Foreign migration batch"));
        }
        v["events"]
            .as_array()
            .filter(|xs| !xs.is_empty() && xs.len() <= 8)
            .ok_or_else(|| fail("Invalid migration batch"))?
            .iter()
            .collect::<Vec<_>>()
    } else {
        vec![&v]
    };
    let mut ids = vec![];
    for e in events {
        let n = e["eventId"]
            .as_u64()
            .filter(|n| *n > 0)
            .ok_or_else(|| fail("Event identity required"))?;
        let kind = e["kind"].as_str().unwrap_or("");
        if e["tenant"] != t
            || !job_event(kind)
            || e["idempotencyKey"] != format!("{t}:migration:{n}")
        {
            return Err(fail("Invalid migration event"));
        }
        ids.push(
            e["data"]["jobId"]
                .as_str()
                .filter(|s| !s.is_empty() && s.len() <= 100)
                .ok_or_else(|| fail("Job identity required"))?
                .to_owned(),
        );
    }
    let c = a
        .config
        .callbacks
        .get(&t)
        .ok_or_else(|| fail("Core callback unavailable"))?;
    for id in ids {
        let permit = a.capacity.clone().try_acquire_owned().map_err(|_| {
            (
                StatusCode::TOO_MANY_REQUESTS,
                Json(json!({"error":"Migration capacity reached"})),
            )
        })?;
        let job =
            match core::callback(c, &t, "job_claim", &json!({"id":id}), a.config.fixture).await {
                Ok(job) => job,
                Err(e) if e.contains("(HTTP 409)") => continue,
                Err(e) => return Err((StatusCode::BAD_GATEWAY, Json(json!({"error":e})))),
            };
        let cfg = a.config.clone();
        let tenant = t.clone();
        tokio::spawn(async move {
            let _permit = permit;
            let c = &cfg.callbacks[&tenant];
            let operation = batch::run(&cfg, &tenant, &job);
            tokio::pin!(operation);
            let mut timer = tokio::time::interval(std::time::Duration::from_secs(20));
            timer.tick().await;
            let result = loop {
                tokio::select! {
                    result=&mut operation=>break result,
                    _=timer.tick()=>{
                        match core::callback(c,&tenant,"job_progress",&json!({"id":job["id"],"lease":job["lease"],"status":"running"}),cfg.fixture).await{
                            Ok(v) if v["cancelRequested"]!=true=>{},
                            Ok(_)=>{let _=core::callback(c,&tenant,"job_progress",&json!({"id":job["id"],"lease":job["lease"],"status":"cancelled"}),cfg.fixture).await;return},
                            Err(_)=>return,
                        }
                    }
                }
            };
            let (status, result, message) = match result {
                Ok(r) => ("succeeded", r, json!({})),
                Err(e) => (
                    if e.starts_with("Migration cancelled;") {
                        "cancelled"
                    } else {
                        "failed"
                    },
                    json!({}),
                    json!({"en":e.clone(),"de":e.clone(),"fr":e.clone(),"es":e}),
                ),
            };
            let _=core::callback(c,&tenant,"job_progress",&json!({"id":job["id"],"lease":job["lease"],"status":status,"result":result,"message":message}),cfg.fixture).await;
        });
    }
    Ok(Json(json!({"accepted":true})))
}

fn job_event(kind: &str) -> bool {
    static EVENTS: std::sync::OnceLock<Vec<String>> = std::sync::OnceLock::new();
    EVENTS
        .get_or_init(|| {
            serde_json::from_str::<Value>(include_str!("../manifest.json"))
                .ok()
                .and_then(|m| {
                    m["actions"].as_array().map(|xs| {
                        xs.iter()
                            .filter(|a| a["handler"] == "job")
                            .filter_map(|a| {
                                a["name"]
                                    .as_str()
                                    .map(|name| format!("app.migration.job_{name}"))
                            })
                            .collect()
                    })
                })
                .unwrap_or_default()
        })
        .iter()
        .any(|s| s == kind)
}
