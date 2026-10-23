-- Commerce contracts for the extracted production policies.
import Commerce.Generated
namespace CommerceKernel

/-- A discount never exceeds the goods total. -/
theorem discount_bounded (total requested : Nat) : discount_cap total requested ≤ total := by
  simp only [discount_cap]; exact Nat.min_le_left _ _

/-- A discount never exceeds the requested amount. -/
theorem discount_requested (total requested : Nat) : discount_cap total requested ≤ requested := by
  simp only [discount_cap]; exact Nat.min_le_right _ _

/-- Exact conservation after a capped discount. -/
theorem discount_conservation (total requested : Nat) :
    total - discount_cap total requested + discount_cap total requested = total := by
  exact Nat.sub_add_cancel (discount_bounded total requested)

/-- Every admitted quantity is positive and within stock. -/
theorem stock_positive_bounded (stock quantity : Nat)
    (h : stock_admissible stock quantity = true) : 0 < quantity ∧ quantity ≤ stock := by
  simpa [stock_admissible] using h

/-- Admitted reservations cannot underflow and conserve stock. -/
theorem stock_conservation (stock quantity : Nat)
    (h : stock_admissible stock quantity = true) : stock - quantity + quantity = stock := by
  exact Nat.sub_add_cancel (stock_positive_bounded stock quantity h).2

/-- Prior plus requested refunds stay within the captured amount. -/
theorem refund_bounded (captured refunded requested : Nat)
    (h : refund_admissible captured refunded requested = true) :
    0 < requested ∧ refunded + requested ≤ captured := by
  simp only [refund_admissible, Bool.and_eq_true, decide_eq_true_eq, and_assoc] at h
  omega

/-- Zero refunds cannot pass the production decision. -/
theorem refund_zero_denied (captured refunded : Nat) :
    refund_admissible captured refunded 0 = false := by simp [refund_admissible]

/-- Successful writes require an exact positive persisted revision. -/
theorem revision_exact (current expected : Nat)
    (h : revision_admissible current expected = true) : 0 < current ∧ current = expected := by
  simpa [revision_admissible] using h

/-- An idempotency replay cannot target another cart. -/
theorem replay_same_cart (sameCart cartOpen sameFingerprint : Bool)
    (h : replay_admissible sameCart cartOpen sameFingerprint = true) : sameCart = true := by
  cases sameCart <;> simp_all [replay_admissible]

/-- Changed open purchases cannot reuse another fingerprint's result. -/
theorem replay_open_fingerprint (sameCart sameFingerprint : Bool)
    (h : replay_admissible sameCart true sameFingerprint = true) : sameFingerprint = true := by
  cases sameCart <;> cases sameFingerprint <;> simp_all [replay_admissible]

/-- Financial checkout cannot bypass contact and billing. -/
theorem financial_contact_required (email billing : Bool)
    (h : checkout_contact_admissible false email billing = true) : email = true ∧ billing = true := by
  cases email <;> cases billing <;> simp_all [checkout_contact_admissible]

/-- The cap also preserves every valid requested discount exactly. -/
theorem discount_exact (total requested : Nat) : discount_cap total requested = min total requested := by
  rfl

/-- Valid stock reservations are accepted, not merely safe when accepted. -/
theorem stock_exact (stock quantity : Nat) :
    stock_admissible stock quantity = true ↔ 0 < quantity ∧ quantity ≤ stock := by
  simp [stock_admissible]

/-- Exact refund admission includes completeness for valid refunds. -/
theorem refund_exact (captured refunded requested : Nat) :
    refund_admissible captured refunded requested = true ↔
    0 < requested ∧ refunded + requested ≤ captured := by
  simp only [refund_admissible, Bool.and_eq_true, decide_eq_true_eq, and_assoc]
  omega

/-- Correct positive revisions are always admitted. -/
theorem revision_exact_behavior (current expected : Nat) :
    revision_admissible current expected = true ↔ 0 < current ∧ current = expected := by
  simp [revision_admissible]

/-- Exact replay behavior preserves valid same-cart retries. -/
theorem replay_exact (sameCart cartOpen fingerprint : Bool) :
    replay_admissible sameCart cartOpen fingerprint = true ↔
    sameCart = true ∧ (cartOpen = false ∨ fingerprint = true) := by
  cases sameCart <;> cases cartOpen <;> cases fingerprint <;> simp [replay_admissible]

/-- Contact admission preserves both financial and explicitly simulated behavior. -/
theorem checkout_contact_exact (simulated email billing : Bool) :
    checkout_contact_admissible simulated email billing = true ↔
    simulated = true ∨ (email = true ∧ billing = true) := by
  cases simulated <;> cases email <;> cases billing <;> simp [checkout_contact_admissible]

/-- Review accepts exactly an unchanged revision/amount and confirmed methods; no vacuous rejection. -/
theorem checkout_review_exact (revision methods : Bool) (expected actual : Nat) :
    checkout_review_admissible revision expected actual methods = true ↔
    revision = true ∧ expected = actual ∧ methods = true := by
  simp [checkout_review_admissible, and_assoc]

/-- Every supported precision, and only supported precision, passes the production boundary. -/
theorem currency_scale_exact (scale : Nat) :
    currency_scale_admissible scale = true ↔ scale ≤ 6 := by simp [currency_scale_admissible]

/-- Arbitrarily large input precision cannot pass. -/
theorem currency_scale_overflow_denied (scale : Nat) (h : 6 < scale) :
    currency_scale_admissible scale = false := by simp [currency_scale_admissible]; omega

theorem currency_context_exact (enabled configured fresh : Bool) :
    currency_context_admissible enabled configured fresh = true ↔ enabled = true ∧ configured = true ∧ fresh = true := by
  cases enabled <;> cases configured <;> cases fresh <;> simp [currency_context_admissible]

theorem currency_context_stale_denied (enabled configured : Bool) :
    currency_context_admissible enabled configured false = false := by simp [currency_context_admissible]

/-- Cash is admitted only for an authorized, reviewed sale with sufficient, bounded tender. -/
theorem pos_cash_exact (authorized reviewed : Bool) (tender total : Nat) :
    pos_cash_admissible authorized tender total reviewed = true ↔
    authorized = true ∧ reviewed = true ∧ total ≤ tender ∧ tender ≤ 1000000000000 := by
  cases authorized <;> cases reviewed <;> simp [pos_cash_admissible, and_assoc]

/-- An admitted cash sale cannot underflow its change or lose value. -/
theorem pos_cash_conserves (authorized reviewed : Bool) (tender total : Nat)
    (h : pos_cash_admissible authorized tender total reviewed = true) : tender - total + total = tender := by
  exact Nat.sub_add_cancel ((pos_cash_exact authorized reviewed tender total).mp h).2.2.1

/-- Unauthenticated cash settlement is impossible in the extracted decision. -/
theorem pos_cash_unauthorized_denied (reviewed : Bool) (tender total : Nat) :
    pos_cash_admissible false tender total reviewed = false := by simp [pos_cash_admissible]

theorem b2b_budget_exact (limit spent requested : Nat) :
    b2b_budget_admissible limit spent requested = true ↔ spent ≤ limit ∧ requested ≤ limit - spent := by
  simp [b2b_budget_admissible]

theorem b2b_budget_conserves (limit spent requested : Nat)
    (h : b2b_budget_admissible limit spent requested = true) : spent + requested ≤ limit := by
  have safe := (b2b_budget_exact limit spent requested).mp h
  omega

theorem b2b_approval_exact (different authorized pending current : Bool) :
    b2b_approval_admissible different authorized pending current = true ↔
    different = true ∧ authorized = true ∧ pending = true ∧ current = true := by
  cases different <;> cases authorized <;> cases pending <;> cases current <;> simp [b2b_approval_admissible]

theorem b2b_self_approval_denied (authorized pending current : Bool) :
    b2b_approval_admissible false authorized pending current = false := by simp [b2b_approval_admissible]

/-- Exact guard only; percentage arithmetic, SQL and hardware adapters remain tested boundaries. -/
theorem pos_discount_exact (actor currency reason : Bool) (minor goods : Nat) :
    pos_discount_admissible actor currency reason minor goods = true ↔
    actor = true ∧ currency = true ∧ reason = true ∧ minor ≤ goods := by
  cases actor <;> cases currency <;> cases reason <;> simp [pos_discount_admissible, and_assoc]

theorem pos_discount_exceeds_denied (actor currency reason : Bool) (minor goods : Nat)
    (h : goods < minor) : pos_discount_admissible actor currency reason minor goods = false := by
  simp [pos_discount_admissible, Nat.not_le_of_gt h]

/-- Exact admission of bounded source money. It does not validate a jurisdiction's tax law. -/
theorem external_amount_exact (gross tax rate : Nat) :
    external_amount_admissible gross tax rate = true ↔
    gross ≤ 1000000000000 ∧ tax ≤ gross ∧ rate ≤ 100000 ∧ (rate ≠ 0 ∨ tax = 0) := by
  simp [external_amount_admissible, and_assoc]

theorem external_amount_tax_bounded (gross tax rate : Nat)
    (h : external_amount_admissible gross tax rate = true) : tax ≤ gross := by
  exact ((external_amount_exact gross tax rate).mp h).2.1

theorem external_paid_total_exact (paid : Bool) (calculated declared : Nat) :
    external_paid_total_admissible paid calculated declared = true ↔
    paid = true ∧ 0 < calculated ∧ calculated = declared := by
  cases paid <;> simp [external_paid_total_admissible, and_assoc]

theorem external_unpaid_denied (calculated declared : Nat) :
    external_paid_total_admissible false calculated declared = false := by
  simp [external_paid_total_admissible]

/-- Pure admin payment admission; async SQL/provider/authentication code remains outside this proof. -/
theorem admin_payment_exact (is_admin manual simulated : Bool) :
    admin_payment_admissible is_admin manual simulated = true ↔
    is_admin = false ∨ manual = true ∨ simulated = true := by
  cases is_admin <;> cases manual <;> cases simulated <;> simp [admin_payment_admissible]

theorem admin_external_payment_denied : admin_payment_admissible true false false = false := by
  rfl

/-- A second admitted reservation consumes only the stock remaining after the first. -/
theorem stock_sequence_bounded (stock first second : Nat)
    (a : stock_admissible stock first = true)
    (b : stock_admissible (stock - first) second = true) : first + second ≤ stock := by
  have ha := stock_positive_bounded stock first a
  have hb := stock_positive_bounded (stock - first) second b
  omega

theorem stock_sequence_conservation (stock first second : Nat)
    (a : stock_admissible stock first = true)
    (b : stock_admissible (stock - first) second = true) :
    stock - first - second + first + second = stock := by
  have h := stock_sequence_bounded stock first second a b
  omega

/-- Reserved/past refunds count before the next refund, including boundary-sized sums. -/
theorem refund_sequence_bounded (captured refunded first second : Nat)
    (a : refund_admissible captured refunded first = true)
    (b : refund_admissible captured (refunded + first) second = true) :
    0 < first ∧ refunded + first + second ≤ captured := by
  exact ⟨(refund_bounded captured refunded first a).1, (refund_bounded captured (refunded + first) second b).2⟩

theorem refund_lowered_capture_denied (captured refunded requested : Nat)
    (h : captured < refunded) : refund_admissible captured refunded requested = false := by
  simp [refund_admissible, Nat.not_le_of_gt h]

/-- Applies to B2B spending and the shared token/cost allocation guard. Serialized state is an adapter premise. -/
theorem budget_sequence_bounded (limit spent first second : Nat)
    (a : b2b_budget_admissible limit spent first = true)
    (b : b2b_budget_admissible limit (spent + first) second = true) :
    first ≤ limit - spent ∧ spent + first + second ≤ limit := by
  exact ⟨((b2b_budget_exact limit spent first).mp a).2, b2b_budget_conserves limit (spent + first) second b⟩

theorem budget_sequence_conservation (limit spent first second : Nat)
    (a : b2b_budget_admissible limit spent first = true)
    (b : b2b_budget_admissible limit (spent + first) second = true) :
    limit - (spent + first + second) + spent + first + second = limit := by
  have h := (budget_sequence_bounded limit spent first second a b).2
  omega

theorem budget_lowered_limit_denied (limit spent requested : Nat)
    (h : limit < spent) : b2b_budget_admissible limit spent requested = false := by
  simp [b2b_budget_admissible, Nat.not_le_of_gt h]

theorem budget_zero_at_exhaustion (limit : Nat) :
    b2b_budget_admissible limit limit 0 = true := by
  simp [b2b_budget_admissible]

theorem discount_monotone_requested (total first second : Nat) (h : first ≤ second) :
    discount_cap total first ≤ discount_cap total second := by
  simp only [discount_cap]
  omega

theorem discount_idempotent (total requested : Nat) :
    discount_cap total (discount_cap total requested) = discount_cap total requested := by
  simp [discount_cap]

end CommerceKernel
