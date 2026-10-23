//! Integer-cent proportional discount allocation; cumulative rounding conserves the exact basket discount.
#[cfg(test)]
#[path = "discount_boundaries.rs"]
mod boundaries;
/// Return discounted line totals in cents. Target is clamped to available positive goods value.
pub fn allocate(totals: &[i64], discount: i64) -> Vec<i64> {
    let total: u128 = totals.iter().map(|n| (*n).max(0) as u128).sum();
    if total == 0 {
        return totals.to_vec();
    }
    // The requested discount is at most i64::MAX, so narrowing only the cap's
    // total to u64::MAX preserves min(total, requested) even for larger baskets.
    let target = crate::verified_kernel::discount_cap(
        total.min(u64::MAX as u128) as u64,
        discount.max(0) as u64,
    ) as u128;
    // Carry the remainder instead of multiplying the cumulative basket by the
    // target. On supported <=64-bit targets total < 2^127, each line product
    // < 2^126, and product + carry < 2^128. The initial half implements the
    // same half-up cumulative rounding, including stable line-order tie breaks.
    let mut carry = total / 2;
    totals
        .iter()
        .map(|n| {
            let numerator = (*n).max(0) as u128 * target + carry;
            let allocated = numerator / total;
            carry = numerator % total;
            // target <= total and carry < total imply allocated <= max(n, 0).
            *n - allocated as i64
        })
        .collect()
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn exact_cents_no_negative_lines() {
        for items in [vec![1, 1, 1], vec![2490, 2990, 7490], vec![0, 1, 999999]] {
            for discount in 0..=items.iter().sum::<i64>() + 1 {
                let result = allocate(&items, discount);
                assert!(result.iter().all(|v| *v >= 0));
                assert_eq!(
                    result.iter().sum::<i64>(),
                    (items.iter().sum::<i64>() - discount).max(0)
                );
            }
        }
    }
}
