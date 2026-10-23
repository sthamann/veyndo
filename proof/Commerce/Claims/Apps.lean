-- Apps contracts for the extracted production policies.
import Commerce.Generated
namespace CommerceKernel

/-- Eligibility requires an explicit private mutation capability. -/
theorem app_flow_exact (allowed readOnly isPublic : Bool) :
    app_flow_admissible allowed readOnly isPublic = true ↔
    allowed = true ∧ readOnly = false ∧ isPublic = false := by
  cases allowed <;> cases readOnly <;> cases isPublic <;> simp [app_flow_admissible]

/-- Read-only actions can never become a flow mutation. -/
theorem app_flow_readonly_denied (allowed isPublic : Bool) :
    app_flow_admissible allowed true isPublic = false := by
  cases allowed <;> cases isPublic <;> simp [app_flow_admissible]

/-- GET admission cannot authorize a managed mutation. -/
theorem app_read_safe (readOnly mutating : Bool)
    (h : app_read_admissible readOnly mutating = true) :
    readOnly = true ∧ mutating = false := by
  cases readOnly <;> cases mutating <;> simp_all [app_read_admissible]

/-- The read admission policy accepts exactly declared non-mutating operations. -/
theorem app_read_exact (readOnly mutating : Bool) :
    app_read_admissible readOnly mutating = (readOnly && !mutating) := by rfl

/-- Opt-out and current authorization are both necessary and sufficient. -/
theorem app_tool_exact (enabled authorized : Bool) :
    app_tool_admissible enabled authorized = true ↔ enabled = true ∧ authorized = true := by
  cases enabled <;> cases authorized <;> simp [app_tool_admissible]

/-- Explicit opt-out rejects even authorized callers. -/
theorem app_tool_disabled (authorized : Bool) : app_tool_admissible false authorized = false := by
  cases authorized <;> simp [app_tool_admissible]

/-- Personal reference data cannot be public. -/
theorem app_core_reference_private (private_data : Bool) :
    app_core_reference_admissible false private_data = true ↔ private_data = true := by
  cases private_data <;> simp [app_core_reference_admissible]

/-- Exact exposure policy, including legitimate public product content. -/
theorem app_core_reference_exact (product private_data : Bool) :
    app_core_reference_admissible product private_data = (product || private_data) := by rfl

/-- All and only clean HTTPS or explicitly admitted HTTP transports pass. -/
theorem app_service_transport_exact (clean secure plain loopback approved : Bool) :
    app_service_transport_admissible clean secure plain loopback approved = true ↔
    clean = true ∧ (secure = true ∨ plain = true ∧ (loopback = true ∨ approved = true)) := by
  cases clean <;> cases secure <;> cases plain <;> cases loopback <;> cases approved <;> simp [app_service_transport_admissible]

theorem app_service_transport_unapproved_denied :
    app_service_transport_admissible true false true false false = false := by rfl

theorem app_service_transport_unsafe_denied (secure plain loopback approved : Bool) :
    app_service_transport_admissible false secure plain loopback approved = false := by rfl

theorem wasm_resources_exact (tables memories elements pages : Nat) :
    wasm_resources_admissible tables memories elements pages = true ↔
    tables ≤ 1 ∧ memories ≤ 1 ∧ elements ≤ 10000 ∧ pages ≤ 16 := by
  simp [wasm_resources_admissible, Bool.and_eq_true, decide_eq_true_eq, and_assoc]

theorem wasm_tables_bounded (tables memories elements pages : Nat)
    (h : wasm_resources_admissible tables memories elements pages = true) : elements ≤ 10000 := by
  exact (wasm_resources_exact tables memories elements pages).mp h |>.2.2.1

theorem app_package_authority_exact (pinned bundled : Bool) :
    app_package_authorized pinned bundled = true ↔ pinned = true ∨ bundled = true := by
  cases pinned <;> cases bundled <;> simp [app_package_authorized]

theorem app_package_unapproved_denied : app_package_authorized false false = false := by rfl

theorem app_surface_exact (currentPackage allowedAction : Bool) :
    app_surface_admissible currentPackage allowedAction = true ↔ currentPackage = true ∧ allowedAction = true := by
  cases currentPackage <;> cases allowedAction <;> simp [app_surface_admissible]

theorem app_surface_stale_denied (allowedAction : Bool) :
    app_surface_admissible false allowedAction = false := by
  cases allowedAction <;> simp [app_surface_admissible]

theorem app_callback_exact (capability currentRole : Bool) :
    app_callback_admissible capability currentRole = true ↔ capability = true ∧ currentRole = true := by
  cases capability <;> cases currentRole <;> simp [app_callback_admissible]

theorem app_callback_without_consent_denied (currentRole : Bool) :
    app_callback_admissible false currentRole = false := by
  cases currentRole <;> simp [app_callback_admissible]

theorem app_submission_exact (privateInbox liveScope currentCart : Bool) :
    app_submission_admissible privateInbox liveScope currentCart = (privateInbox && liveScope && currentCart) := by rfl

theorem app_submission_private_live_cart (privateInbox liveScope currentCart : Bool)
    (h : app_submission_admissible privateInbox liveScope currentCart = true) :
    privateInbox = true ∧ liveScope = true ∧ currentCart = true := by
  cases privateInbox <;> cases liveScope <;> cases currentCart <;> simp_all [app_submission_admissible]

theorem app_configuration_release_exact (extension product company : Bool) :
    app_configuration_release_admissible extension product company = (!extension || product || company) := by rfl

theorem app_configuration_release_operational :
    app_configuration_release_admissible true false false = false := by rfl

/-- An app may only narrow native authority with current rights and pure guards. -/
theorem native_lifecycle_safe (native rights guards : Bool)
    (h : native_lifecycle_admissible native rights guards = true) :
    native = true ∧ rights = true ∧ guards = true := by
  simpa [native_lifecycle_admissible, Bool.and_eq_true, and_assoc] using h

theorem native_lifecycle_exact (native rights guards : Bool) :
    native_lifecycle_admissible native rights guards =
    (native && rights && guards) := by rfl

/-- Exact admission keeps ordinary promotions unchanged and requires review before imported activation. -/
theorem source_activation_exact (imported reviewed active : Bool) :
    source_activation_admissible imported reviewed active = (!imported || !active || reviewed) := by
  rfl

/-- An imported active promotion with no reviewed mapping is denied. -/
theorem source_activation_unreviewed_denied : source_activation_admissible true false true = false := by
  rfl

theorem job_completion_exact (cancel_requested succeeded : Bool) :
    job_completion_admissible cancel_requested succeeded = (!cancel_requested || !succeeded) := by rfl

theorem job_cancelled_success_denied : job_completion_admissible true true = false := by rfl

end CommerceKernel
