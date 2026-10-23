//! Extracted commerce policies; pure bool/u64 decisions used by native consumers.
pub fn discount_cap(total: u64, requested: u64) -> u64 {
    total.min(requested)
}
pub fn stock_admissible(stock: u64, quantity: u64) -> bool {
    quantity > 0 && quantity <= stock
}
pub fn refund_admissible(captured: u64, refunded: u64, requested: u64) -> bool {
    refunded <= captured && requested > 0 && requested <= captured.saturating_sub(refunded)
}
pub fn revision_admissible(current: u64, expected: u64) -> bool {
    current > 0 && current == expected
}
pub fn replay_admissible(same_cart: bool, cart_open: bool, same_fingerprint: bool) -> bool {
    same_cart && (!cart_open || same_fingerprint)
}
pub fn checkout_contact_admissible(
    simulated: bool,
    email_present: bool,
    billing_present: bool,
) -> bool {
    simulated || email_present && billing_present
}
pub fn checkout_review_admissible(
    revision_matches: bool,
    expected_total: u64,
    actual_total: u64,
    methods_confirmed: bool,
) -> bool {
    revision_matches && expected_total == actual_total && methods_confirmed
}
/// A quoted currency must be enabled, configured and have an admissible rate.
pub fn currency_context_admissible(enabled: bool, configured: bool, fresh: bool) -> bool {
    enabled && configured && fresh
}
// Supported explicit currency precision; larger scales must not overflow the decimal factor.
pub fn currency_scale_admissible(scale: u64) -> bool {
    scale <= 6
}
/// Cash change is bounded and nonnegative only under cashier authorization and a reviewed total.
pub fn pos_cash_admissible(authorized: bool, tender: u64, total: u64, reviewed: bool) -> bool {
    authorized && reviewed && total <= tender && tender <= 1000000000000
}
/// Spending cannot exceed a currency-bound unit budget, including existing allocations.
pub fn b2b_budget_admissible(limit: u64, spent: u64, requested: u64) -> bool {
    spent <= limit && requested <= limit.saturating_sub(spent)
}
/// An approval requires a different employee, current authority, pending state and exact revision.
pub fn b2b_approval_admissible(
    different: bool,
    authorized: bool,
    pending: bool,
    current: bool,
) -> bool {
    different && authorized && pending && current
}
pub fn pos_discount_admissible(
    actor: bool,
    currency: bool,
    reason: bool,
    minor: u64,
    goods: u64,
) -> bool {
    actor && currency && reason && minor <= goods
}
/// Source amounts are bounded; a zero rate cannot carry nonzero tax. No tax-law inference.
pub fn external_amount_admissible(gross: u64, tax: u64, rate: u64) -> bool {
    gross <= 1000000000000 && tax <= gross && rate <= 100000 && (rate != 0 || tax == 0)
}
/// Paid imports require a positive, exactly reconciled source total.
pub fn external_paid_total_admissible(paid: bool, calculated: u64, declared: u64) -> bool {
    paid && calculated > 0 && calculated == declared
}
pub fn admin_payment_admissible(is_admin: bool, manual: bool, simulated: bool) -> bool {
    !is_admin || manual || simulated
}
