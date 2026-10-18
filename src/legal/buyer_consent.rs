//! Required contact data for explicit registered marketing segments; shared by protocol review and locked native checkout.
use super::*;
pub(crate) fn missing_contact(buyer: &Value) -> bool {
    let marketing = &buyer["consent"]["dev.ucp.consent.marketing"];
    [
        ("dev.ucp.consent.marketing.email", "email"),
        ("dev.ucp.consent.marketing.sms", "phone_number"),
    ]
    .iter()
    .any(|(segment, contact)| {
        let granted = marketing["segments"][*segment]["granted"]
            .as_bool()
            .unwrap_or(marketing["granted"] == true);
        granted && buyer[*contact].as_str().is_none_or(|s| s.trim().is_empty())
    })
}
pub(super) fn check(c: &StoredCart, receipt: &Value) -> Result<()> {
    if receipt["decided"] != true || receipt["choices"]["marketing"] != true {
        return Ok(());
    }
    let mut buyer = c.data.buyer.clone().unwrap_or(json!({}));
    if let Some(email) = c.data.email.as_ref().filter(|e| !e.is_empty()) {
        buyer["email"] = json!(email);
    }
    if let Some(address) = c
        .data
        .checkout
        .as_ref()
        .and_then(|s| s.address.as_ref())
        .filter(|a| !a.phone_number.is_empty())
    {
        buyer["phone_number"] = json!(address.phone_number);
    }
    if missing_contact(&buyer) {
        return Err(bad(
            "Consent contact data missing; enter the agreed email or phone, or withdraw marketing consent",
        ));
    }
    Ok(())
}
