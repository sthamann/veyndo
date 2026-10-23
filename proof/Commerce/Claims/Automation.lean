-- Automation contracts for the extracted production policies.
import Commerce.Generated
namespace CommerceKernel

/-- The rule checks actual customer authentication rather than a supplied guest email. -/
theorem rule_authenticated_exact (present required : Bool) :
    rule_authenticated present required = true ↔ present = required := by
  cases present <;> cases required <;> simp [rule_authenticated]

/-- A guest cannot satisfy the authenticated customer branch. -/
theorem rule_guest_denied : rule_authenticated false true = false := by
  simp [rule_authenticated]

/-- Supported comparison selection exactly preserves all three Boolean operations. -/
theorem rule_comparison_exact (equal empty eq neq isEmpty : Bool) :
    rule_boolean_comparison equal empty eq neq isEmpty = true ↔
    (eq = true ∧ equal = true) ∨ (neq = true ∧ equal = false) ∨ (isEmpty = true ∧ empty = true) := by
  cases equal <;> cases empty <;> cases eq <;> cases neq <;> cases isEmpty <;> simp [rule_boolean_comparison]

/-- XOR accepts exactly one successful branch, including completeness. -/
theorem rule_xor_exact (hits : Nat) : rule_xor_count hits = true ↔ hits = 1 := by
  simp [rule_xor_count]

/-- Empty and multiple hits cannot masquerade as exclusive OR. -/
theorem rule_xor_empty : rule_xor_count 0 = false := by rfl

/-- Scheduling accepts precisely the documented thirty-day boundary. -/
theorem flow_delay_exact (seconds : Nat) : flow_delay_admissible seconds = true ↔ seconds ≤ 2592000 := by
  simp [flow_delay_admissible]

/-- Country, subdivision, postcode, date and authoritative Rule Builder conditions are all necessary and sufficient. -/
theorem destination_tax_exact (condition country state postal date : Bool) :
    destination_tax_admissible condition country state postal date = true ↔
    condition = true ∧ country = true ∧ state = true ∧ postal = true ∧ date = true := by
  cases condition <;> cases country <;> cases state <;> cases postal <;> cases date <;> simp [destination_tax_admissible]

/-- Unknown groups cannot gain net presentation by claiming a business basis. -/
theorem customer_group_unknown_denied (business : Bool) :
    customer_group_net false business = false := by simp [customer_group_net]

/-- Every configured business basis, and only that basis, selects net presentation. -/
theorem customer_group_net_exact (configured business : Bool) :
    customer_group_net configured business = true ↔ configured = true ∧ business = true := by
  simp [customer_group_net]

/-- All and only positive bounded operator quotas are admitted. -/
theorem resource_quota_exact (limit : Nat) :
    resource_quota_admissible limit = true ↔ 0 < limit ∧ limit ≤ 1000000 := by simp [resource_quota_admissible]

theorem resource_quota_zero_denied : resource_quota_admissible 0 = false := by rfl

/-- Retry admits exactly explicit rate-limit rejection before the eighth attempt. -/
theorem notification_retry_exact (limited : Bool) (attempts : Nat) :
    notification_retry_admissible limited attempts = true ↔ limited = true ∧ attempts < 8 := by
  simp [notification_retry_admissible]

theorem notification_ambiguous_never_retry (attempts : Nat) :
    notification_retry_admissible false attempts = false := by simp [notification_retry_admissible]

end CommerceKernel
