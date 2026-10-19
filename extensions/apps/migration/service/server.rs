//! Private gateway authentication binds every source to its configured tenant and bounds concurrent source reads.
use super::*;
use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, Path, State},
    http::{HeaderMap, StatusCode},
    routing::{get, post},
};
use std::sync::Arc;
#[derive(Clone)]
pub(super) struct App {
    pub(super) config: Arc<config::Config>,
    pub(super) capacity: Arc<tokio::sync::Semaphore>,
}
type ResponseResult = std::result::Result<Json<Value>, (StatusCode, Json<Value>)>;
fn error(status: StatusCode, s: impl Into<String>) -> (StatusCode, Json<Value>) {
    (status, Json(serde_json::json!({"error":s.into()})))
}
pub(super) fn authenticate(
    a: &App,
    h: &HeaderMap,
) -> std::result::Result<String, (StatusCode, Json<Value>)> {
    let expected = format!("Bearer {}", a.config.gateway);
    let got = h
        .get("authorization")
        .and_then(|s| s.to_str().ok())
        .unwrap_or("");
    let key = ring::hmac::Key::new(ring::hmac::HMAC_SHA256, a.config.gateway.as_bytes());
    ring::hmac::verify(
        &key,
        got.as_bytes(),
        ring::hmac::sign(&key, expected.as_bytes()).as_ref(),
    )
    .map_err(|_| {
        error(
            StatusCode::UNAUTHORIZED,
            "Migration gateway authentication required",
        )
    })?;
    let t = h
        .get("x-tenant")
        .and_then(|s| s.to_str().ok())
        .unwrap_or("");
    if !a.config.sources.contains_key(t) && !a.config.callbacks.contains_key(t) {
        return Err(error(
            StatusCode::FORBIDDEN,
            "Source is not configured for this tenant",
        ));
    }
    Ok(t.into())
}
async fn action(
    State(a): State<App>,
    h: HeaderMap,
    Path(name): Path<String>,
    Json(v): Json<Value>,
) -> ResponseResult {
    let t = authenticate(&a, &h)?;
    let id = v["sourceId"].as_str().unwrap_or("installed");
    let c = a
        .config
        .connection(&t, id, &v["_appSettings"])
        .map_err(|e| error(StatusCode::BAD_REQUEST, e))?;
    let _permit = a.capacity.clone().try_acquire_owned().map_err(|_| {
        error(
            StatusCode::TOO_MANY_REQUESTS,
            "Migration capacity reached; continue after current batches finish",
        )
    })?;
    let kind = if name == "extract" {
        v["kind"].as_str().unwrap_or("")
    } else {
        name.strip_prefix("review_")
            .ok_or_else(|| error(StatusCode::NOT_FOUND, "Unknown migration action"))?
    };
    extract::page(&c, id, kind, v["cursor"].as_str(), a.config.fixture)
        .await
        .map(Json)
        .map_err(|e| error(StatusCode::BAD_REQUEST, e))
}
pub async fn run() -> Result<()> {
    let config = config::Config::load()?;
    let app = App {
        config: Arc::new(config),
        capacity: Arc::new(tokio::sync::Semaphore::new(8)),
    };
    let router=Router::new().route("/events",post(events::receive)).route("/health",get(||async{Json(serde_json::json!({"status":"ok","runtime":"rust","service":"migration-assistant"}))})).route("/actions/{action}",post(action)).layer(DefaultBodyLimit::max(65536)).with_state(app);
    let bind = std::env::var("MIGRATION_BIND").unwrap_or("127.0.0.1:8809".into());
    let listener = tokio::net::TcpListener::bind(&bind)
        .await
        .map_err(|_| "migration bind failed")?;
    axum::serve(listener, router)
        .await
        .map_err(|_| "migration listener failed".into())
}
