-- Intelligence contracts for the extracted production policies.
import Commerce.Generated
namespace CommerceKernel

theorem ai_price_exact (price minimum maximum : Nat) (margin discount brand available : Bool) :
    ai_price_admissible price minimum maximum margin discount brand available = true ↔
    minimum ≤ price ∧ price ≤ maximum ∧ margin = true ∧ discount = true ∧ brand = true ∧ available = true := by
  simp [ai_price_admissible, Bool.and_eq_true, decide_eq_true_eq, and_assoc]

theorem ai_price_locked_denied (price minimum maximum : Nat) (margin discount available : Bool) :
    ai_price_admissible price minimum maximum margin discount false available = false := by
  simp [ai_price_admissible]

theorem ai_autonomy_exact (enabled authorized price_only daily_budget within_delta : Bool) :
    ai_autonomy_admissible enabled authorized price_only daily_budget within_delta = true ↔
    enabled = true ∧ authorized = true ∧ price_only = true ∧ daily_budget = true ∧ within_delta = true := by
  cases enabled <;> cases authorized <;> cases price_only <;> cases daily_budget <;> cases within_delta <;> simp [ai_autonomy_admissible]

theorem ai_autonomy_disabled_denied (authorized price_only daily_budget within_delta : Bool) :
    ai_autonomy_admissible false authorized price_only daily_budget within_delta = false := by
  simp [ai_autonomy_admissible]

theorem claim_render_exact (confirmed public_source current_source valid_time exact_text : Bool) :
    claim_render_admissible confirmed public_source current_source valid_time exact_text = true ↔
    confirmed = true ∧ public_source = true ∧ current_source = true ∧ valid_time = true ∧ exact_text = true := by
  cases confirmed <;> cases public_source <;> cases current_source <;> cases valid_time <;> cases exact_text <;> simp [claim_render_admissible]

theorem claim_unconfirmed_denied (public_source current_source valid_time exact_text : Bool) :
    claim_render_admissible false public_source current_source valid_time exact_text = false := by
  simp [claim_render_admissible]

theorem experiment_result_exact (final_look enough_units positive_bound : Bool) :
    experiment_result_admissible final_look enough_units positive_bound = true ↔
    final_look = true ∧ enough_units = true ∧ positive_bound = true := by
  cases final_look <;> cases enough_units <;> cases positive_bound <;> simp [experiment_result_admissible]

theorem experiment_immature_denied (enough_units positive_bound : Bool) :
    experiment_result_admissible false enough_units positive_bound = false := by
  simp [experiment_result_admissible]

theorem experiment_undersized_denied (final_look positive_bound : Bool) :
    experiment_result_admissible final_look false positive_bound = false := by
  simp [experiment_result_admissible]

end CommerceKernel
