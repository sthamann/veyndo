//! Decimal source amounts become checked integer minor units without a floating-point intermediate.
use super::*;
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Money {
    pub currency: String,
    pub scale: u8,
    pub minor: i64,
}
impl Money {
    pub fn decimal(&self) -> String {
        let currency = veyndo_commerce::money::Currency::new(&self.currency, self.scale)
            .expect("parsed source currency");
        veyndo_commerce::money::Money::new(self.minor, currency).decimal()
    }
    pub fn parse(v: &Value, currency: &str, scale: u8) -> Result<Self> {
        let currency =
            veyndo_commerce::money::Currency::new(currency, scale).map_err(str::to_owned)?;
        let s = match v {
            Value::String(s) => s.clone(),
            Value::Number(n) => n.to_string(),
            _ => return Err("money amount is missing".into()),
        };
        if s.len() > 64 {
            return Err("money amount exceeds limit".into());
        }
        let (whole, fraction) = s.split_once('.').unwrap_or((&s, ""));
        if !fraction.bytes().all(|b| b.is_ascii_digit()) {
            return Err("invalid decimal fraction".into());
        }
        if fraction.len() > usize::from(scale)
            && fraction[usize::from(scale)..].bytes().any(|b| b != b'0')
        {
            return Err("money precision exceeds currency scale; review source rounding".into());
        }
        let kept = &fraction[..fraction.len().min(scale.into())];
        let decimal = if scale == 0 {
            whole.to_owned()
        } else {
            format!("{whole}.{kept:0<width$}", width = usize::from(scale))
        };
        let money =
            veyndo_commerce::money::Money::parse(&decimal, currency).map_err(str::to_owned)?;
        Ok(Self {
            currency: money.currency().code().into(),
            scale,
            minor: money.minor(),
        })
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn invalid_unicode_is_rejected_without_panicking() {
        assert!(Money::parse(&json!("1.é"), "EUR", 1).is_err());
    }
    #[test]
    fn exact_and_overflow() {
        assert_eq!(
            Money::parse(&json!("90071992547409.91"), "EUR", 2)
                .unwrap()
                .minor,
            9007199254740991
        );
        assert_eq!(Money::parse(&json!("-0.01"), "EUR", 2).unwrap().minor, -1);
        assert!(Money::parse(&json!("9999999999999999999999"), "EUR", 2).is_err());
        assert!(Money::parse(&json!("1.001"), "EUR", 2).is_err());
    }
}
