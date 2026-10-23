//! Extracted fulfillment policies; pure bool/u64 decisions used by native consumers.
pub fn order_edit_admissible(terminal: bool) -> bool {
    !terminal
}
pub fn completion_admissible(terminal: bool, payment_ready: bool, deliveries_ready: bool) -> bool {
    !terminal && payment_ready && deliveries_ready
}
pub fn cancellation_admissible(
    terminal: bool,
    external_payment: bool,
    refund_required: bool,
    deliveries_open: bool,
) -> bool {
    !terminal && !external_payment && !refund_required && deliveries_open
}
pub fn manual_payment_admissible(
    terminal: bool,
    external_payment: bool,
    current_pending: bool,
    target_paid: bool,
) -> bool {
    !terminal && !external_payment && current_pending && target_paid
}
pub fn download_admissible(order_blocked: bool, paid: bool, simulated_authorized: bool) -> bool {
    !order_blocked && (paid || simulated_authorized)
}
pub fn receipt_admissible(
    expected: u64,
    received: u64,
    same_currency: bool,
    confirmed: bool,
) -> bool {
    expected == received && same_currency && confirmed
}
/// Uncaptured stock can be restored; an authorization requires provider-confirmed void evidence.
pub fn reservation_release_admissible(
    uncaptured: bool,
    authorized: bool,
    void_confirmed: bool,
) -> bool {
    uncaptured || authorized && void_confirmed
}
// Explicit ledger state codes are mapped by payments/state.rs; no backward monetary transitions.
pub fn payment_transition_admissible(current: u64, next: u64) -> bool {
    current <= 9
        && next <= 9
        && (current == next
            || current <= 3 && next > current && next <= 4
            || current <= 3 && (next == 7 || next == 8)
            || (current == 4 || current == 5 || current == 9) && (next == 5 || next == 6)
            || (current == 7 || current == 8) && next == 9)
}
// Pure package allocation and carrier-intent admission; external facts and effects remain unproved.
/// Package splitting moves a strict positive subset of an open, nonterminal allocation.
pub fn delivery_split_admissible(
    is_open: bool,
    terminal: bool,
    available: u64,
    moving: u64,
) -> bool {
    is_open && !terminal && moving > 0 && moving < available
}
/// An open eligible parcel admits an empty or identical carrier intent, never another occupied booking.
pub fn carrier_booking_admissible(
    is_open: bool,
    closed: bool,
    labelled: bool,
    occupied: bool,
    same: bool,
) -> bool {
    is_open && !closed && !labelled && (!occupied || same)
}
