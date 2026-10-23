//! Extracted intelligence policies; pure bool/u64 decisions used by native consumers.
/// Price admission proves only the explicit corridor and supplied domain guards; no model truth claim.
pub fn ai_price_admissible(
    price: u64,
    minimum: u64,
    maximum: u64,
    margin: bool,
    discount: bool,
    brand: bool,
    available: bool,
) -> bool {
    minimum <= price && price <= maximum && margin && discount && brand && available
}
/// Budgeted autonomy requires explicit policy, current authority, price-only scope and all budgets.
pub fn ai_autonomy_admissible(
    enabled: bool,
    authorized: bool,
    price_only: bool,
    daily_budget: bool,
    within_delta: bool,
) -> bool {
    enabled && authorized && price_only && daily_budget && within_delta
}
/// Only current, public, confirmed, unexpired source-bound claims may be rendered.
pub fn claim_render_admissible(
    confirmed: bool,
    public_source: bool,
    current_source: bool,
    valid_time: bool,
    exact_text: bool,
) -> bool {
    confirmed && public_source && current_source && valid_time && exact_text
}
/// An experiment may claim uplift only at the admissible final look, with enough units and a positive lower bound.
pub fn experiment_result_admissible(
    final_look: bool,
    enough_units: bool,
    positive_bound: bool,
) -> bool {
    final_look && enough_units && positive_bound
}
