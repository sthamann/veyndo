//! Pure public-intake admission; extracted independently of the surrounding SQL and HTTP.
/// Public intake can only append to a private inbox in a live, cart-bound context.
pub fn app_submission_admissible(
    private_inbox: bool,
    live_scope: bool,
    current_cart: bool,
) -> bool {
    private_inbox && live_scope && current_cart
}

/// Permanent credentials and credential settings require a current personal administrator.
pub fn persistent_key_admissible(personal: bool, administrator: bool) -> bool {
    personal && administrator
}

/// Operational customer/order extensions cannot become configuration release units.
pub fn app_configuration_release_admissible(extension: bool, product: bool, company: bool) -> bool {
    !extension || product || company
}

/// Declarative app lifecycles can only narrow the current native transition authority.
pub fn native_lifecycle_admissible(native: bool, rights: bool, guards: bool) -> bool {
    native && rights && guards
}

/// An active imported promotion requires a deliberately reviewed source mapping; ordinary promotions retain native admission.
pub fn source_activation_admissible(imported: bool, reviewed: bool, active: bool) -> bool {
    !imported || !active || reviewed
}

/// A requested cancellation cannot be committed as a successful job completion.
pub fn job_completion_admissible(cancel_requested: bool, succeeded: bool) -> bool {
    !cancel_requested || !succeeded
}
