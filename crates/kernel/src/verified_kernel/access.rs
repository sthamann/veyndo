//! Extracted access policies; pure bool/u64 decisions used by native consumers.
pub fn scope_admissible(
    authenticated: bool,
    known_scope: bool,
    owner: bool,
    explicit: bool,
    explicit_grant: bool,
    default_grant: bool,
) -> bool {
    authenticated
        && known_scope
        && (owner || explicit && explicit_grant || !explicit && default_grant)
}
/// Global administration requires a personal session and a current independent operator grant.
pub fn platform_admissible(personal: bool, granted: bool, active: bool) -> bool {
    personal && granted && active
}
/// Availability fence: paused merchant reads and existing payment settlement may continue.
pub fn shop_request_admissible(
    active: bool,
    paused: bool,
    read_only: bool,
    settlement: bool,
) -> bool {
    settlement || active || paused && read_only
}
/// Optional processing requires an enabled purpose and a fresh affirmative receipt for this policy.
pub fn consent_admissible(enabled: bool, current: bool, fresh: bool, chosen: bool) -> bool {
    enabled && current && fresh && chosen
}
/// Strict checkout binds the current document version and separately requested digital delivery.
pub fn legal_checkout_admissible(
    strict: bool,
    current: bool,
    accepted: bool,
    digital: bool,
    immediate: bool,
) -> bool {
    !strict || current && accepted && (!digital || immediate)
}
/// Preview grants admit only simulations; public requests require an active channel and private requests a current merchant.
pub fn channel_access_admissible(
    active: bool,
    is_private: bool,
    merchant: bool,
    preview: bool,
    mutating: bool,
) -> bool {
    active && (!is_private || merchant) || preview && !mutating
}
/// Only native public assets may skip identity; every hosted alias retains tenant/channel admission.
pub fn native_asset_bypass(native_asset: bool, hosted: bool) -> bool {
    native_asset && !hosted
}
/// Factor evidence is supplied only by the native verified-code or live personal-session handoff owners.
pub fn auth_factor_admissible(required: bool, verified: bool) -> bool {
    !required || verified
}
/// Permanent credentials and credential settings require a current personal administrator.
pub fn persistent_key_admissible(personal: bool, administrator: bool) -> bool {
    personal && administrator
}
