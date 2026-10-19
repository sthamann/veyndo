//! Historical timestamps retain their real timezone; ambiguous local DST times require explicit source evidence.
use super::*;
use chrono::TimeZone;
pub fn created(c: &Context, v: &Value) -> Result<Value> {
    let value = field(
        v,
        &["created_at", "date_created_gmt", "date_add", "orderTime"],
    );
    if value.is_null() {
        return Ok(Value::Null);
    }
    let raw = value.as_str().ok_or("Source date must be text")?;
    if let Ok(time) = chrono::DateTime::parse_from_rfc3339(raw) {
        return Ok(json!(time.to_rfc3339()));
    }
    let naive = chrono::NaiveDateTime::parse_from_str(raw, "%Y-%m-%d %H:%M:%S")
        .or_else(|_| chrono::NaiveDateTime::parse_from_str(raw, "%Y-%m-%dT%H:%M:%S"))
        .map_err(|_| "Unsupported source timestamp")?;
    let utc = c.source == Source::Magento2 || v.get("date_created_gmt").is_some();
    let timezone = if utc {
        chrono_tz::UTC
    } else {
        c.timezone
            .as_deref()
            .ok_or("Confirm the source timezone before importing local historical dates")?
            .parse::<chrono_tz::Tz>()
            .map_err(|_| "Invalid IANA source timezone")?
    };
    let time=timezone.from_local_datetime(&naive).single().ok_or("Source timestamp is ambiguous or nonexistent at a DST transition; export its explicit offset")?;
    Ok(json!(
        time.to_utc()
            .to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
    ))
}
