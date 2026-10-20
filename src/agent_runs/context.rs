//! Bounded presentation context is saved with the task; it never supplies identity, rights or trusted object facts.
use super::*;
pub(crate) fn normalize(value: &Value) -> Result<Value> {
    if value.is_null() {
        return Ok(Value::Null);
    }
    apps::validate_native_input(&schema(), value)?;
    Ok(value.clone())
}
pub(crate) fn schema() -> Value {
    json!({"type":"object","additionalProperties":false,"required":["view"],"properties":{
        "view":{"type":"string","enum":["assistant","workspace","overview","knowledge","agents","commerce","design","productData","products","orders","customers","b2b","pos","storyfronts","channels","automation","apps","developers","environments","users"]},
        "selected":{"type":"object","additionalProperties":false,"required":["kind","id"],"properties":{"kind":{"type":"string","enum":["product","order","customer","company","app","page","flow"]},"id":{"type":"string","minLength":1,"maxLength":160}}}
    }})
}
pub(crate) fn current() -> Value {
    CURRENT
        .try_with(|run| run.workspace.clone())
        .unwrap_or(Value::Null)
}
