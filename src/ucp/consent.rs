//! Explicit UCP consent reuses native cart-bound privacy receipts; source documents never define consent policy or authority.
use super::*;
pub(super) const CAPABILITY: &str = "dev.ucp.shopping.buyer_consent";
const PURPOSES: &[(&str, &str)] = &[
    ("dev.ucp.consent.analytics", "analytics"),
    ("dev.ucp.consent.preferences", "personalization"),
    ("dev.ucp.consent.marketing", "marketing"),
    ("dev.ucp.consent.sale_or_sharing", "saleOrSharing"),
];
const EMAIL: &str = "dev.ucp.consent.marketing.email";
const SMS: &str = "dev.ucp.consent.marketing.sms";
const MARKETING: &str = "dev.ucp.consent.marketing";
pub(super) fn admit(v: &Value, negotiated: bool) -> Result<()> {
    if !negotiated && v["buyer"].get("consent").is_some() {
        return Err(conflict(
            "capabilities_incompatible: negotiate buyer_consent before supplying choices",
        ));
    }
    Ok(())
}
pub(super) fn buyer(v: &Value, current: Option<&Value>) -> Result<Option<Value>> {
    let Some(incoming) = v.get("buyer") else {
        return Ok(current.cloned());
    };
    if incoming.is_null() {
        return Ok(None);
    }
    if !incoming.is_object() || incoming.to_string().len() > 16000 {
        return Err(bad("Buyer must be a bounded object"));
    }
    let mut buyer = incoming.clone();
    if let Some(choices) = incoming.get("consent") {
        let choices = choices
            .as_object()
            .filter(|v| v.len() <= 4)
            .ok_or(bad("Invalid buyer consent"))?;
        for (purpose, decision) in choices {
            if !PURPOSES.iter().any(|(id, _)| id == purpose) {
                return Err(bad("Unknown consent purpose"));
            }
            validate(decision, purpose == MARKETING)?;
        }
        let mut merged = current
            .and_then(|b| b.get("consent"))
            .filter(|v| v.is_object())
            .cloned()
            .unwrap_or(json!({}));
        for (purpose, decision) in choices {
            merged[purpose] = decision.clone();
        }
        buyer["consent"] = merged;
    } else if let Some(previous) = current.and_then(|b| b.get("consent")) {
        buyer["consent"] = previous.clone();
    }
    Ok(Some(buyer))
}
fn validate(v: &Value, segments: bool) -> Result<()> {
    let object = v.as_object().ok_or(bad("Invalid consent decision"))?;
    if v["granted"].as_bool().is_none()
        || v["source"] != "platform"
        || object
            .keys()
            .any(|k| !matches!(k.as_str(), "granted" | "source" | "segments"))
    {
        return Err(bad(
            "Consent requires an explicit platform choice; policy metadata is server-owned",
        ));
    }
    if let Some(values) = v.get("segments") {
        let values = values
            .as_object()
            .filter(|v| segments && v.len() <= 2)
            .ok_or(bad("Invalid consent segments"))?;
        for (key, value) in values {
            if key != EMAIL && key != SMS {
                return Err(bad("Unknown consent segment"));
            }
            validate(value, false)?;
        }
    }
    Ok(())
}
pub(super) fn missing(buyer: &Value) -> bool {
    legal::missing_contact(buyer)
}
/// Only explicitly supplied purposes may grant consent; omissions never revive an expired or withdrawn choice.
pub(super) async fn prepare(
    a: &App,
    h: &RequestContext,
    v: &Value,
) -> Result<Option<(String, HashMap<String, bool>)>> {
    let Some(buyer) = v.get("buyer") else {
        return Ok(None);
    };
    let explicit = buyer.is_null();
    let Some(choices) = buyer.get("consent").or(explicit.then_some(&Value::Null)) else {
        return Ok(None);
    };
    let (s, _) = commerce::scoped_config(a, &tenant(h)?, marketing::channel_id(h)).await?;
    let patch = PURPOSES
        .iter()
        .filter(|(id, native)| {
            *native != "saleOrSharing" && (explicit || choices.get(*id).is_some())
        })
        .map(|(id, native)| {
            let decision = &choices[*id];
            let granted = decision["granted"] == true
                || (*id == MARKETING
                    && [EMAIL, SMS]
                        .iter()
                        .any(|segment| decision["segments"][*segment]["granted"] == true));
            ((*native).to_owned(), granted)
        })
        .collect();
    Ok(Some((legal::policy_version(&s.legal), patch)))
}
pub(super) async fn project(
    a: &App,
    h: &RequestContext,
    c: &StoredCart,
    doc: &mut Value,
) -> Result<()> {
    let snapshot = c.data.order.as_ref().map(|order| &order["legal"]);
    let receipt = if let Some(snapshot) = snapshot {
        snapshot["consent"].clone()
    } else {
        legal::consent_receipt(State(a.clone()), h.clone()).await?.0
    };
    let saved_buyer = json!({"consent":snapshot.map(|s|s["buyerConsent"].clone())});
    let original = if snapshot.is_some() {
        &saved_buyer
    } else {
        c.data.buyer.as_ref().unwrap_or(&Value::Null)
    };
    let mut consent = json!({});
    for (id, native) in PURPOSES {
        let decision = &original["consent"][*id];
        let active = receipt["decided"] == true && receipt["choices"][*native] == true;
        let explicit = decision["source"] == "platform" && receipt["decided"] == true;
        let mut choice = json!({"granted":active && decision["granted"]==true,"source":if explicit{"platform"}else{"business"},"description":messages::consent(native,&c.data.locale)});
        if *id == MARKETING {
            for (segment, contact) in [(EMAIL, "email"), (SMS, "sms")] {
                let granted = decision["segments"][segment]["granted"]
                    .as_bool()
                    .unwrap_or(decision["granted"] == true);
                choice["segments"][segment] = json!({"granted":active && granted,"source":if explicit{"platform"}else{"business"},"description":messages::consent(contact,&c.data.locale)});
            }
        }
        consent[*id] = choice;
    }
    if !doc["buyer"].is_object() {
        doc["buyer"] = json!({});
    }
    doc["buyer"]["consent"] = consent;
    doc["ucp"]["capabilities"][CAPABILITY] = json!([{"version":UCP_VERSION}]);
    if c.status == "open" && missing(&doc["buyer"]) {
        doc["status"] = json!("incomplete");
        doc["messages"].as_array_mut().unwrap().push(json!({"type":"warning","code":"missing_consent_data","content":messages::consent("missing",&c.data.locale)}));
    }
    Ok(())
}
