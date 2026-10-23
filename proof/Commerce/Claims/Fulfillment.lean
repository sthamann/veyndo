-- Fulfillment contracts for the extracted production policies.
import Commerce.Generated
namespace CommerceKernel

/-- Terminal states prohibit operational edits. -/
theorem terminal_edit_denied : order_edit_admissible true = false := by rfl

/-- Completion entails acceptable payment and complete physical deliveries. -/
theorem completion_safe (terminal payment deliveries : Bool)
    (h : completion_admissible terminal payment deliveries = true) :
    terminal = false ∧ payment = true ∧ deliveries = true := by
  cases terminal <;> cases payment <;> cases deliveries <;> simp_all [completion_admissible]

/-- Cancellation respects provider, refund and return constraints. -/
theorem cancellation_safe (terminal external refund deliveriesOpen : Bool)
    (h : cancellation_admissible terminal external refund deliveriesOpen = true) :
    terminal = false ∧ external = false ∧ refund = false ∧ deliveriesOpen = true := by
  cases terminal <;> cases external <;> cases refund <;> cases deliveriesOpen <;> simp_all [cancellation_admissible]

/-- Manual commands cannot confirm external provider payments. -/
theorem manual_payment_safe (terminal external pending targetPaid : Bool)
    (h : manual_payment_admissible terminal external pending targetPaid = true) :
    terminal = false ∧ external = false ∧ pending = true ∧ targetPaid = true := by
  cases terminal <;> cases external <;> cases pending <;> cases targetPaid <;> simp_all [manual_payment_admissible]

/-- Blocked orders never grant downloads. -/
theorem download_blocked_denied (paid simulated : Bool) :
    download_admissible true paid simulated = false := by simp [download_admissible]

/-- Downloads require confirmed payment or explicit simulated authorization. -/
theorem download_payment_required (blocked paid simulated : Bool)
    (h : download_admissible blocked paid simulated = true) :
    blocked = false ∧ (paid = true ∨ simulated = true) := by
  cases blocked <;> cases paid <;> cases simulated <;> simp_all [download_admissible]

/-- Receipts must match the amount and currency and confirm the outcome. -/
theorem receipt_exact (expected received : Nat) (currency confirmed : Bool)
    (h : receipt_admissible expected received currency confirmed = true) :
    expected = received ∧ currency = true ∧ confirmed = true := by
  simpa [receipt_admissible, and_assoc] using h

/-- Nonterminal operational edits remain possible. -/
theorem order_edit_exact (terminal : Bool) : order_edit_admissible terminal = true ↔ terminal = false := by
  cases terminal <;> simp [order_edit_admissible]

/-- Ready nonterminal orders can complete. -/
theorem completion_exact (terminal payment deliveries : Bool) :
    completion_admissible terminal payment deliveries = true ↔
    terminal = false ∧ payment = true ∧ deliveries = true := by
  cases terminal <;> cases payment <;> cases deliveries <;> simp [completion_admissible]

/-- Native cancellation is admitted precisely within the business guard. -/
theorem cancellation_exact (terminal external refund deliveries : Bool) :
    cancellation_admissible terminal external refund deliveries = true ↔
    terminal = false ∧ external = false ∧ refund = false ∧ deliveries = true := by
  cases terminal <;> cases external <;> cases refund <;> cases deliveries <;> simp [cancellation_admissible]

/-- Valid native manual payments remain possible. -/
theorem manual_payment_exact (terminal external pending targetPaid : Bool) :
    manual_payment_admissible terminal external pending targetPaid = true ↔
    terminal = false ∧ external = false ∧ pending = true ∧ targetPaid = true := by
  cases terminal <;> cases external <;> cases pending <;> cases targetPaid <;> simp [manual_payment_admissible]

/-- Unblocked paid/simulated orders receive their permitted download. -/
theorem download_exact (blocked paid simulated : Bool) :
    download_admissible blocked paid simulated = true ↔
    blocked = false ∧ (paid = true ∨ simulated = true) := by
  cases blocked <;> cases paid <;> cases simulated <;> simp [download_admissible]

/-- Exact matching receipts are accepted as well as mismatches rejected. -/
theorem receipt_exact_behavior (expected received : Nat) (currency confirmed : Bool) :
    receipt_admissible expected received currency confirmed = true ↔
    expected = received ∧ currency = true ∧ confirmed = true := by
  simp [receipt_admissible, and_assoc]

/-- Release accepts exactly uncaptured attempts or an explicitly voided authorization. -/
theorem reservation_release_exact (uncaptured authorized voidConfirmed : Bool) :
    reservation_release_admissible uncaptured authorized voidConfirmed = (uncaptured || authorized && voidConfirmed) := by rfl

/-- Uncertain authorizations cannot restore inventory. -/
theorem reservation_authorized_unvoided : reservation_release_admissible false true false = false := by rfl

/-- A later capture cannot be hidden by a void flag. -/
theorem reservation_captured_denied (voidConfirmed : Bool) : reservation_release_admissible false false voidConfirmed = false := by
  cases voidConfirmed <;> simp [reservation_release_admissible]

/-- Full ledger transition relation, including confirmed late capture and refund progression. -/
theorem payment_transition_exact (current next : Nat) :
    payment_transition_admissible current next = true ↔
    current ≤ 9 ∧ next ≤ 9 ∧ (current = next ∨
    (current ≤ 3 ∧ next > current ∧ next ≤ 4) ∨
    (current ≤ 3 ∧ (next = 7 ∨ next = 8)) ∨
    ((current = 4 ∨ current = 5 ∨ current = 9) ∧ (next = 5 ∨ next = 6)) ∨
    ((current = 7 ∨ current = 8) ∧ next = 9)) := by
  simp [payment_transition_admissible, and_assoc, or_assoc]

theorem payment_refunded_terminal (next : Nat) :
    payment_transition_admissible 6 next = true ↔ next = 6 := by
  simp [payment_transition_admissible]; omega

theorem payment_pending_capture : payment_transition_admissible 0 4 = true := by rfl

/-- Exact package-subset admission; async allocation and carrier effects remain tested boundaries. -/
theorem delivery_split_exact (is_open terminal : Bool) (available moving : Nat) :
    delivery_split_admissible is_open terminal available moving = true ↔
    is_open = true ∧ terminal = false ∧ 0 < moving ∧ moving < available := by
  cases is_open <;> cases terminal <;> simp [delivery_split_admissible, and_assoc]

theorem delivery_split_closed_denied (terminal : Bool) (available moving : Nat) :
    delivery_split_admissible false terminal available moving = false := by
  simp [delivery_split_admissible]

theorem delivery_split_all_denied (is_open terminal : Bool) (available : Nat) :
    delivery_split_admissible is_open terminal available available = false := by
  simp [delivery_split_admissible]

/-- Native package intent admission, not proof of a carrier protocol or external charge. -/
theorem carrier_booking_exact (is_open closed labelled occupied same : Bool) :
    carrier_booking_admissible is_open closed labelled occupied same = true ↔
    is_open = true ∧ closed = false ∧ labelled = false ∧ (occupied = false ∨ same = true) := by
  cases is_open <;> cases closed <;> cases labelled <;> cases occupied <;> cases same <;> simp [carrier_booking_admissible]

theorem carrier_booking_occupied_denied (is_open closed labelled : Bool) :
    carrier_booking_admissible is_open closed labelled true false = false := by
  simp [carrier_booking_admissible]

end CommerceKernel
