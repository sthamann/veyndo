//! App-owned controller for isolated original Shopware cells; never executes PHP inside Commerce.
mod config;
mod core;
mod inventory;
mod jobs;
mod plan;
mod transport;
use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, Path, State},
    http::{HeaderMap, StatusCode},
    routing::{get, post},
};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::sync::Arc;
type Error = (StatusCode, Json<Value>);
type Result<T> = std::result::Result<T, Error>;
fn error(code: StatusCode, text: &str) -> Error {
    (code, Json(json!({"error":text})))
}
fn digest(v: &Value) -> String {
    format!("{:x}", Sha256::digest(v.to_string().as_bytes()))
}
#[derive(Clone)]
struct App {
    config: Arc<config::Config>,
    http: reqwest::Client,
    capacity: Arc<tokio::sync::Semaphore>,
}
impl App {
    fn tenant<'a>(&self, h: &'a HeaderMap) -> Result<&'a str> {
        let expected = format!("Bearer {}", self.config.gateway);
        let actual = h
            .get("authorization")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");
        let key = ring::hmac::Key::new(ring::hmac::HMAC_SHA256, self.config.gateway.as_bytes());
        ring::hmac::verify(
            &key,
            actual.as_bytes(),
            ring::hmac::sign(&key, expected.as_bytes()).as_ref(),
        )
        .map_err(|_| error(StatusCode::UNAUTHORIZED, "Gateway authentication required"))?;
        h.get("x-tenant")
            .and_then(|v| v.to_str().ok())
            .filter(|t| self.config.tenants.contains_key(*t))
            .ok_or_else(|| {
                error(
                    StatusCode::FORBIDDEN,
                    "No Shopware cell configured for this shop",
                )
            })
    }
    fn cell(&self, tenant: &str, id: &str) -> Result<&config::Cell> {
        self.config
            .tenants
            .get(tenant)
            .and_then(|t| t.cells.get(id))
            .ok_or_else(|| error(StatusCode::NOT_FOUND, "Shopware cell unavailable"))
    }
}
async fn action(
    State(a): State<App>,
    h: HeaderMap,
    Path(name): Path<String>,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    let tenant = a.tenant(&h)?;
    let _permit = a.capacity.clone().try_acquire_owned().map_err(|_| {
        error(
            StatusCode::TOO_MANY_REQUESTS,
            "Compatibility workers are busy",
        )
    })?;
    let result = match name.as_str() {
        "cells" => {
            json!({"elements":a.config.tenants[tenant].cells.iter().map(|(id,c)|json!({"id":id,"environment":c.environment,"version":c.version,"imageDigest":c.image_digest,"adminUrl":format!("{}/admin",c.url),"storefrontUrl":c.url})).collect::<Vec<_>>() })
        }
        "inspect" => {
            inventory::inspect(&a, a.cell(tenant, v["cellId"].as_str().unwrap_or(""))?).await?
        }
        "prepare" => plan::prepare(&a, tenant, &v).await?,
        _ => return Err(error(StatusCode::NOT_FOUND, "Unknown compatibility action")),
    };
    Ok(Json(result))
}
#[tokio::main]
async fn main() -> std::result::Result<(), Box<dyn std::error::Error>> {
    let config = config::Config::load()?;
    let a = App {
        config: Arc::new(config),
        http: reqwest::Client::builder()
            .no_proxy()
            .redirect(reqwest::redirect::Policy::none())
            .connect_timeout(std::time::Duration::from_secs(3))
            .timeout(std::time::Duration::from_secs(45))
            .build()?,
        capacity: Arc::new(tokio::sync::Semaphore::new(8)),
    };
    let router = Router::new()
        .route(
            "/health",
            get(|| async { Json(json!({"service":"shopware-compat","runtime":"rust"})) }),
        )
        .route(
            "/index.html",
            get(|| async { axum::response::Html(include_str!("../ui.html")) }),
        )
        .route("/actions/{action}", post(action))
        .route("/events", post(jobs::events))
        .layer(DefaultBodyLimit::max(65536))
        .with_state(a);
    let bind = std::env::var("SHOPWARE_COMPAT_BIND").unwrap_or("127.0.0.1:8812".into());
    axum::serve(tokio::net::TcpListener::bind(bind).await?, router).await?;
    Ok(())
}
