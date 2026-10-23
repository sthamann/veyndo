-- Planning ingress and saved private-run admission; no claims about SQL identity/time facts.
import Commerce.Generated
namespace CommerceKernel

theorem planning_request_exact (readOnly planningPost : Bool) :
    planning_request_admissible readOnly planningPost = true ↔
    readOnly = true ∨ planningPost = true := by
  cases readOnly <;> cases planningPost <;> simp [planning_request_admissible]

theorem planning_mutation_denied : planning_request_admissible false false = false := by rfl

theorem agent_preview_exact (active privatePreview personal sameOwner current : Bool) :
    agent_preview_admissible active privatePreview personal sameOwner current = true ↔
    active = true ∧ (privatePreview = false ∨ (personal = true ∧ sameOwner = true ∧ current = true)) := by
  cases active <;> cases privatePreview <;> cases personal <;> cases sameOwner <;> cases current <;>
    simp [agent_preview_admissible]

theorem agent_inactive_denied (privatePreview personal sameOwner current : Bool) :
    agent_preview_admissible false privatePreview personal sameOwner current = false := by
  simp [agent_preview_admissible]

theorem agent_private_requires_personal (active sameOwner current : Bool) :
    agent_preview_admissible active true false sameOwner current = false := by
  simp [agent_preview_admissible]

theorem agent_private_requires_owner (active personal current : Bool) :
    agent_preview_admissible active true personal false current = false := by
  simp [agent_preview_admissible]

theorem agent_expired_preview_denied (active personal sameOwner : Bool) :
    agent_preview_admissible active true personal sameOwner false = false := by
  simp [agent_preview_admissible]

theorem agent_live_independent_of_preview (personal sameOwner current : Bool) :
    agent_preview_admissible true false personal sameOwner current = true := by
  simp [agent_preview_admissible]

end CommerceKernel
