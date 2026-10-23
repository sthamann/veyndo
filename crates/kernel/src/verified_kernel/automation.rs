//! Extracted automation policies; pure bool/u64 decisions used by native consumers.
/// A guest address never grants the authenticated-customer rule.
pub fn rule_authenticated(customer_present: bool, required: bool) -> bool {
    customer_present == required
}
/// Explicit supported comparison operators select equality, inequality or emptiness.
pub fn rule_boolean_comparison(
    equal: bool,
    empty: bool,
    eq: bool,
    neq: bool,
    is_empty: bool,
) -> bool {
    eq && equal || neq && !equal || is_empty && empty
}
/// Exclusive OR admits precisely one matching child.
pub fn rule_xor_count(hits: u64) -> bool {
    hits == 1
}
/// A durable flow delay is bounded to thirty days.
pub fn flow_delay_admissible(seconds: u64) -> bool {
    seconds <= 2592000
}
/// Destination tax rules require every configured jurisdiction and validity condition.
pub fn destination_tax_admissible(
    condition: bool,
    country: bool,
    state: bool,
    postal: bool,
    date: bool,
) -> bool {
    condition && country && state && postal && date
}
/// Net presentation requires a currently configured group with an explicit business basis.
pub fn customer_group_net(configured: bool, business: bool) -> bool {
    configured && business
}
pub fn resource_quota_admissible(limit: u64) -> bool {
    limit > 0 && limit <= 1000000
}
/// A notification may be retried only after an explicit rate-limit rejection and before attempt eight.
pub fn notification_retry_admissible(rate_limited: bool, attempts: u64) -> bool {
    rate_limited && attempts < 8
}
