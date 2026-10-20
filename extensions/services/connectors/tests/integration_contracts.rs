//! Provider projections reject arbitrary endpoints and preserve asynchronous acceptance semantics.
use super::*;
#[test]
fn fixed_provider_contracts() {
    let s = json!({"enabled":true});
    let call = integrations::prepare(
        "vercel",
        &s,
        "https://api.vercel.com/v1/integrations/deploy/prj_test/secret",
        &json!({}),
    )
    .unwrap();
    assert!(
        call.url
            .starts_with("https://api.vercel.com/v1/integrations/deploy/")
    );
    assert!(
        integrations::prepare("vercel", &s, "https://attacker.test/secret", &json!({})).is_err()
    );
    assert!(
        integrations::prepare(
            "vercel",
            &s,
            "https://api.vercel.com/v1/integrations/deploy/a/b?target=x",
            &json!({})
        )
        .is_err()
    );
    assert!(integrations::prepare("hubspot", &s, "key", &json!({"email":"invalid"})).is_err());
    let input = json!({"email":"buyer@example.test","firstName":"A","lastName":"B"});
    let call = integrations::prepare("hubspot", &s, "key", &input).unwrap();
    assert_eq!(call.body.unwrap()["inputs"][0]["idProperty"], "email");
    assert!(
        integrations::receipt("hubspot", 200, &json!({"status":"PENDING","results":[]})).is_err()
    );
    assert!(
        integrations::receipt("algolia", 200, &json!({"taskID":1,"objectIDs":["a"]})).unwrap()["state"]
            == "accepted"
    );
    assert!(integrations::receipt("klaviyo", 202, &json!({})).unwrap()["state"] == "accepted");
    assert!(integrations::receipt("klaviyo", 200, &json!({})).is_err());
}

#[test]
fn provider_receipts_and_knowledge_are_bounded() {
    assert!(integrations::receipt("vercel", 200, &json!({"job":{"id":"x".repeat(201)}})).is_err());
    assert!(
        integrations::receipt(
            "hubspot",
            200,
            &json!({"status":"COMPLETE","results":[{"id":"x".repeat(201)}]})
        )
        .is_err()
    );
    let settings = json!({"space":"shop","environment":"master"});
    let value = json!({"items":[{"sys":{"id":"entry"},"fields":{"body":"x".repeat(12001)}}]});
    assert!(integrations::content_sources(&value, &settings).is_err());
}
