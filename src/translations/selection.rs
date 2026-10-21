//! Explicit product selection is bounded, unique and tenant-owned before any translation is queued.
use super::*;
pub(crate) fn parse(value: Option<&Value>) -> Result<Option<Vec<String>>> {
    let Some(value) = value else { return Ok(None) };
    let ids: Vec<String> = serde_json::from_value(value.clone())
        .map_err(|_| bad("Product selection must be an array of identifiers"))?;
    validate(&ids)?;
    Ok(Some(ids))
}
pub(crate) fn validate(ids: &[String]) -> Result<()> {
    let unique = ids.iter().collect::<std::collections::HashSet<_>>();
    if ids.is_empty()
        || ids.len() > 1000
        || unique.len() != ids.len()
        || ids.iter().any(|id| id.is_empty() || id.len() > 160)
    {
        return Err(bad("Select 1..1000 distinct product identifiers"));
    }
    Ok(())
}
pub(crate) async fn admit(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    t: &str,
    ids: Option<&[String]>,
) -> Result<()> {
    if let Some(ids) = ids {
        validate(ids)?;
        let count: i64 =
            sqlx::query_scalar("SELECT count(*) FROM products WHERE tenant=$1 AND id=ANY($2)")
                .bind(t)
                .bind(ids)
                .fetch_one(&mut **tx)
                .await?;
        if count != ids.len() as i64 {
            return Err(bad("Selected products are not available in this shop"));
        }
    }
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn missing_means_catalogue_but_explicit_empty_never_does() {
        assert!(parse(None).unwrap().is_none());
        for value in [
            json!([]),
            json!(null),
            json!(["a", "a"]),
            json!(["a", 3]),
            json!([""]),
        ] {
            assert!(parse(Some(&value)).is_err());
        }
        assert_eq!(
            parse(Some(&json!(["b", "a"]))).unwrap().unwrap(),
            vec!["b", "a"]
        );
    }
}
