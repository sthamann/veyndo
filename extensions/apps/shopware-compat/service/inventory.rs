//! Observe original plugin/app state; fingerprints bind reviews to runtime version and deployment plus installed state.
use super::*;
pub async fn inspect(a: &App, c: &config::Cell) -> Result<Value> {
    let token = transport::token(a, c).await?;
    let info = transport::request(
        a,
        c,
        &token,
        reqwest::Method::GET,
        "/api/_info/version",
        json!({}),
    )
    .await?;
    if info["version"] != c.version {
        return Err(error(
            StatusCode::CONFLICT,
            "Shopware version differs from the reviewed cell configuration",
        ));
    }
    let mut extensions = Vec::new();
    for kind in ["plugin", "app"] {
        for page in 1..=11 {
            let rows = transport::request(
                a,
                c,
                &token,
                reqwest::Method::POST,
                &format!("/api/search/{kind}"),
                json!({"limit":100,"page":page,"sort":[{"field":"name","order":"ASC"}]}),
            )
            .await?;
            let list = rows["data"]
                .as_array()
                .ok_or_else(|| error(StatusCode::BAD_GATEWAY, "Invalid extension inventory"))?;
            if page == 11 && !list.is_empty() {
                return Err(error(
                    StatusCode::UNPROCESSABLE_ENTITY,
                    "Cell inventory exceeds 1000 extensions per kind",
                ));
            }
            for row in list {
                extensions.push(json!({"id":row["id"],"kind":kind,"name":row["name"],"version":row["version"],"active":row["active"],"installedAt":row["installedAt"],"updatedAt":row["updatedAt"]}));
            }
            if list.len() < 100 {
                break;
            }
        }
    }
    let snapshot = json!({"version":c.version,"imageDigest":c.image_digest,"environment":c.environment,"extensions":extensions});
    let revision = digest(&snapshot);
    if snapshot.to_string().len() > 56000 {
        return Err(error(
            StatusCode::UNPROCESSABLE_ENTITY,
            "Extension inventory exceeds the safe gateway response size",
        ));
    }
    Ok(
        json!({"snapshot":snapshot,"revision":revision,"execution":"original-shopware","universalCompatibilityVerified":false}),
    )
}
