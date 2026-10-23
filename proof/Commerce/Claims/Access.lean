-- Access contracts for the extracted production policies.
import Commerce.Generated
namespace CommerceKernel

/-- Scope admission implies authentication and a recognized scope. -/
theorem scope_authenticated_known (auth known owner explicit grant fallback : Bool)
    (h : scope_admissible auth known owner explicit grant fallback = true) :
    auth = true ∧ known = true := by
  cases auth <;> cases known <;> simp_all [scope_admissible]

/-- Explicit scope denial cannot inherit role defaults. -/
theorem scope_explicit_no_escalation (auth known fallback : Bool) :
    scope_admissible auth known false true false fallback = false := by
  cases auth <;> cases known <;> simp [scope_admissible]

/-- Authentication, recognized scope and an actual grant are necessary and sufficient. -/
theorem scope_exact (auth known owner explicit grant fallback : Bool) :
    scope_admissible auth known owner explicit grant fallback = true ↔
    auth = true ∧ known = true ∧ (owner = true ∨ (explicit = true ∧ grant = true) ∨
      (explicit = false ∧ fallback = true)) := by
  cases auth <;> cases known <;> cases owner <;> cases explicit <;> cases grant <;> cases fallback <;> simp [scope_admissible]

/-- Tenant roles and revoked operator grants cannot confer global access. -/
theorem platform_exact (personal granted active : Bool) :
    platform_admissible personal granted active = true ↔
    personal = true ∧ granted = true ∧ active = true := by
  cases personal <;> cases granted <;> cases active <;> simp [platform_admissible]

/-- Bootstrap and integration credentials are never admitted as personal operator sessions. -/
theorem platform_personal_required (granted active : Bool) :
    platform_admissible false granted active = false := by
  cases granted <;> cases active <;> simp [platform_admissible]

/-- Exact lifecycle admission includes legitimate reads and settlement; no blanket rejection. -/
theorem shop_availability_exact (active paused read settlement : Bool) :
    shop_request_admissible active paused read settlement = (settlement || active || paused && read) := by rfl

/-- Archived availability cannot admit customer operations or merchant reads, except reconciliation. -/
theorem shop_archived_denied (read : Bool) :
    shop_request_admissible false false read false = false := by
  cases read <;> simp [shop_request_admissible]

theorem consent_exact (enabled current fresh chosen : Bool) :
    consent_admissible enabled current fresh chosen = true ↔ enabled = true ∧ current = true ∧ fresh = true ∧ chosen = true := by
  cases enabled <;> cases current <;> cases fresh <;> cases chosen <;> simp [consent_admissible]

theorem legal_checkout_exact (strict current accepted digital immediate : Bool) :
    legal_checkout_admissible strict current accepted digital immediate = true ↔ strict = false ∨ current = true ∧ accepted = true ∧ (digital = false ∨ immediate = true) := by
  cases strict <;> cases current <;> cases accepted <;> cases digital <;> cases immediate <;> simp [legal_checkout_admissible]

theorem channel_private_requires_identity (active merchant preview mutating : Bool)
    (h : channel_access_admissible active true merchant preview mutating = true) :
    merchant = true ∨ (preview = true ∧ mutating = false) := by
  cases active <;> cases merchant <;> cases preview <;> cases mutating <;> simp_all [channel_access_admissible]

theorem channel_paused_requires_preview (is_private merchant preview mutating : Bool)
    (h : channel_access_admissible false is_private merchant preview mutating = true) :
    preview = true ∧ mutating = false := by
  cases is_private <;> cases merchant <;> cases preview <;> cases mutating <;> simp_all [channel_access_admissible]

theorem channel_preview_no_mutation (is_private : Bool) :
    channel_access_admissible false is_private false true true = false := by
  cases is_private <;> rfl

theorem channel_access_exact (active is_private merchant preview mutating : Bool) :
    channel_access_admissible active is_private merchant preview mutating =
      ((active && !is_private) || (active && merchant) || (preview && !mutating)) := by
  cases active <;> cases is_private <;> cases merchant <;> cases preview <;> cases mutating <;> rfl

/-- A public-asset optimization cannot bypass admission for a hosted shop. -/
theorem native_asset_hosted_denied (nativeAsset : Bool) :
    native_asset_bypass nativeAsset true = false := by simp [native_asset_bypass]

theorem native_asset_bypass_exact (nativeAsset hosted : Bool) :
    native_asset_bypass nativeAsset hosted = true ↔ nativeAsset = true ∧ hosted = false := by
  cases nativeAsset <;> cases hosted <;> simp [native_asset_bypass]

/-- Persistent integration authority requires both a personal session and current administrator rights. -/
theorem persistent_key_exact (personal administrator : Bool) :
    persistent_key_admissible personal administrator = true ↔ personal = true ∧ administrator = true := by
  cases personal <;> cases administrator <;> simp [persistent_key_admissible]

theorem persistent_key_nonpersonal_denied (administrator : Bool) :
    persistent_key_admissible false administrator = false := by
  cases administrator <;> simp [persistent_key_admissible]

/-- Proves factor admission only; code cryptography, SQL and broker evidence remain tested boundaries. -/
theorem auth_factor_exact (required verified : Bool) :
    auth_factor_admissible required verified = true ↔ required = false ∨ verified = true := by
  cases required <;> cases verified <;> simp [auth_factor_admissible]

theorem auth_factor_required_denied : auth_factor_admissible true false = false := by
  rfl

end CommerceKernel
