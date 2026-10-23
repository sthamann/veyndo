//! Executable u64 edge/sequence regressions against independent u128 arithmetic, complementing universal Lean proofs.
use crate::verified_kernel::*;

const EDGES: [u64; 10] = [
    0,
    1,
    2,
    99,
    100,
    u32::MAX as u64,
    1 << 63,
    u64::MAX - 2,
    u64::MAX - 1,
    u64::MAX,
];

#[test]
fn budgets_and_refunds_match_wide_arithmetic_at_every_edge() {
    for limit in EDGES {
        for spent in EDGES {
            for request in EDGES {
                let fits = u128::from(spent) + u128::from(request) <= u128::from(limit);
                assert_eq!(b2b_budget_admissible(limit, spent, request), fits);
                assert_eq!(
                    refund_admissible(limit, spent, request),
                    request > 0 && fits
                );
            }
        }
    }
}

#[test]
fn reservation_sequences_conserve_stock_and_cannot_wrap() {
    for stock in EDGES {
        for first in EDGES {
            if !stock_admissible(stock, first) {
                continue;
            }
            let remaining = stock.checked_sub(first).unwrap();
            for second in EDGES {
                let total = u128::from(first) + u128::from(second);
                assert_eq!(
                    stock_admissible(remaining, second),
                    second > 0 && total <= u128::from(stock)
                );
                if stock_admissible(remaining, second) {
                    assert_eq!(u128::from(remaining - second) + total, u128::from(stock));
                }
            }
        }
    }
}

#[test]
fn sequential_budget_changes_preserve_both_allocations() {
    for limit in EDGES {
        for spent in EDGES {
            for first in EDGES {
                if !b2b_budget_admissible(limit, spent, first) {
                    continue;
                }
                let allocated = spent.checked_add(first).unwrap();
                for second in EDGES {
                    let total = u128::from(allocated) + u128::from(second);
                    assert_eq!(
                        b2b_budget_admissible(limit, allocated, second),
                        total <= u128::from(limit)
                    );
                    if b2b_budget_admissible(limit, allocated, second) {
                        assert_eq!(
                            u128::from(limit - allocated - second) + total,
                            u128::from(limit)
                        );
                    }
                }
                if allocated > 0 {
                    assert!(!b2b_budget_admissible(allocated - 1, allocated, 0));
                }
            }
        }
    }
}

#[test]
fn private_agent_continuations_never_inherit_public_admission() {
    for active in [false, true] {
        for personal in [false, true] {
            for owner in [false, true] {
                for current in [false, true] {
                    assert_eq!(
                        agent_preview_admissible(active, false, personal, owner, current),
                        active
                    );
                    let admitted = agent_preview_admissible(active, true, personal, owner, current);
                    assert_eq!(
                        admitted,
                        [active, personal, owner, current]
                            .iter()
                            .all(|value| *value)
                    );
                }
            }
        }
    }
    assert!(!planning_request_admissible(false, false));
    assert!(planning_request_admissible(true, false));
    assert!(planning_request_admissible(false, true));
}
