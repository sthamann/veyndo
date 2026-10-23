//! Discount conservation at signed limits and against an independent prefix-rounding oracle.
use super::allocate;

#[test]
fn baskets_larger_than_signed_and_unsigned_totals_keep_exact_cents() {
    let max = i64::MAX;
    for (items, discount, expected) in [
        (vec![max, max], max, vec![max / 2, max / 2 + 1]),
        (vec![max, 1], max, vec![1, 0]),
        (vec![max, max, max], 1, vec![max, max - 1, max]),
        (
            vec![max, max, max],
            max,
            vec![
                6148914691236517205,
                6148914691236517204,
                6148914691236517205,
            ],
        ),
        (
            vec![i64::MIN, max, max],
            max,
            vec![i64::MIN, max / 2, max / 2 + 1],
        ),
    ] {
        assert_eq!(allocate(&items, discount), expected);
    }
}

#[test]
fn every_small_basket_matches_prefix_rounding_including_ties_and_caps() {
    // The reference rounds complete prefixes, independently of the streaming
    // carry implementation. These bounded inputs cannot overflow the oracle.
    for a in 0..=9i64 {
        for b in 0..=9i64 {
            for c in 0..=9i64 {
                let items = [a, b, c];
                let total = a + b + c;
                for requested in -1..=total + 1 {
                    let actual = allocate(&items, requested);
                    let target = requested.clamp(0, total);
                    let mut prefix = 0;
                    let mut previous = 0;
                    for (before, after) in items.iter().zip(&actual) {
                        prefix += before;
                        let rounded = if total == 0 {
                            0
                        } else {
                            (prefix * target + total / 2) / total
                        };
                        assert_eq!(
                            *after,
                            before - (rounded - previous),
                            "{items:?}, {requested}"
                        );
                        assert!((0..=*before).contains(after));
                        previous = rounded;
                    }
                    assert_eq!(actual.iter().sum::<i64>(), total - target);
                }
            }
        }
    }
}

#[test]
fn wide_many_line_basket_conserves_discount_and_zero_lines() {
    let items: Vec<_> = (0..4096)
        .map(|i| if i % 3 == 0 { 0 } else { i64::MAX - i })
        .collect();
    for requested in [i64::MIN, -1, 0, 1, i64::MAX - 1, i64::MAX] {
        let actual = allocate(&items, requested);
        let mut removed = 0u128;
        for (before, after) in items.iter().zip(actual) {
            assert!((0..=*before).contains(&after));
            removed += (*before - after) as u128;
        }
        assert_eq!(removed, requested.max(0) as u128);
    }
}

#[test]
fn absent_positive_goods_and_credit_lines_are_preserved() {
    for items in [vec![], vec![0, 0], vec![i64::MIN, -1, 0]] {
        assert_eq!(allocate(&items, i64::MAX), items);
    }
    assert_eq!(allocate(&[1, -10, 2, 0], 99), [0, -10, 0, 0]);
}
