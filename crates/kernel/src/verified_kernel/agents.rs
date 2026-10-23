//! Planning-only ingress and private continuation admission; identity and time are verified by native adapters.
pub fn planning_request_admissible(read_only: bool, planning_post: bool) -> bool {
    read_only || planning_post
}

pub fn agent_preview_admissible(
    active: bool,
    private_preview: bool,
    personal: bool,
    same_owner: bool,
    current: bool,
) -> bool {
    active && (!private_preview || personal && same_owner && current)
}
