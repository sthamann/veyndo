//! Extracted apps policies; pure bool/u64 decisions used by native consumers.
/// Only an explicitly eligible private mutation action may be bound to a durable flow.
pub fn app_flow_admissible(allowed: bool, read_only: bool, is_public: bool) -> bool {
    allowed && !read_only && !is_public
}
/// GET app routes require declared read-only behavior and exclude managed mutations.
pub fn app_read_admissible(read_only: bool, mutating: bool) -> bool {
    read_only && !mutating
}
/// An explicitly disabled agent action cannot be exposed or invoked, even to an authorized actor.
pub fn app_tool_admissible(enabled: bool, authorized: bool) -> bool {
    enabled && authorized
}
/// Personal core references are private; only product references may be declared public.
pub fn app_core_reference_admissible(product: bool, private_data: bool) -> bool {
    product || private_data
}
/// Private HTTP requires an exact operator-approved origin; unsafe URL parts are always denied.
pub fn app_service_transport_admissible(
    clean_url: bool,
    https: bool,
    http: bool,
    loopback: bool,
    private_origin: bool,
) -> bool {
    clean_url && (https || http && (loopback || private_origin))
}
/// A package may use operator credentials only if its exact content is pinned or bundled.
pub fn app_package_authorized(pinned: bool, bundled: bool) -> bool {
    pinned || bundled
}
/// Guest instances have bounded private and exported resources alike.
pub fn wasm_resources_admissible(tables: u64, memories: u64, elements: u64, pages: u64) -> bool {
    tables <= 1 && memories <= 1 && elements <= 10000 && pages <= 16
}
/// UI grants cannot outlive their immutable package or expand their server-selected action set.
pub fn app_surface_admissible(current_package: bool, allowed_action: bool) -> bool {
    current_package && allowed_action
}
/// Original app consent and the creator's current core role must both permit a callback.
pub fn app_callback_admissible(capability: bool, current_role: bool) -> bool {
    capability && current_role
}
// Pure public-intake admission; extracted independently of the surrounding SQL and HTTP.
/// Public intake can only append to a private inbox in a live, cart-bound context.
pub fn app_submission_admissible(
    private_inbox: bool,
    live_scope: bool,
    current_cart: bool,
) -> bool {
    private_inbox && live_scope && current_cart
}
/// Operational receipts and customer/order extensions cannot become configuration release units.
pub fn app_configuration_release_admissible(
    extension: bool,
    product: bool,
    company: bool,
    operational: bool,
) -> bool {
    !operational && (!extension || product || company)
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
