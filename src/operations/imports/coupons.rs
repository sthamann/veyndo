//! Generic coupon import delegates a reviewed native promotion definition, without pretending original usage is a new purchase.
use super::*;
pub(super) async fn import(a: &App, h: &RequestContext, r: &SourceRecord) -> Result<Value> {
    let t = merchant(a, h)?;
    let settings = commerce::config(a, &t).await?.0;
    if r.data["currency"] != settings.currencies.pricing_currency
        || r.data["scale"].as_u64()
            != currencies::scale(&settings.currencies.pricing_currency).map(u64::from)
    {
        return Err(bad(
            "Map source coupon amounts to the shop pricing currency before import",
        ));
    }
    let mut destination = r.data["destination"].clone();
    if !destination.is_object() {
        return Err(bad("Reviewed native coupon mapping required"));
    }
    destination["sourceImport"] = json!({"version":r.version,"source":r.source,"sourceShop":r.source_shop,"sourceId":r.source_id,"currency":r.data["currency"],"recordDigest":hash(&json!(r).to_string()),"activationReviewed":false});
    marketing::import_promotion(a, h, &configuration_id(&r.identity(&t)), &destination).await
}
fn configuration_id(id: &str) -> String {
    const ALPHABET: &[u8] = b"abcdefghijklmnopqrstuvwxyz234567";
    let uuid = Uuid::parse_str(id).expect("native source UUID");
    let (mut value, mut bits) = (0_u32, 0_u32);
    let mut encoded = String::from("m_");
    for byte in uuid.as_bytes() {
        value = (value << 8) | u32::from(*byte);
        bits += 8;
        while bits >= 5 {
            bits -= 5;
            encoded.push(ALPHABET[((value >> bits) & 31) as usize] as char);
        }
    }
    if bits > 0 {
        encoded.push(ALPHABET[((value << (5 - bits)) & 31) as usize] as char);
    }
    encoded
}
