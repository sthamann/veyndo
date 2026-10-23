# External order batching, 23 October 2026

The generic Rust external-order intake resolves localized product names once per
order and indexes the already locked product rows by ID. Seller APIs, mappings,
credentials and the regression fixture remain in the marketplace app. No new
service, cache, migration or database table is required.

## Before and after

The same installed-app callback fixture ran first against the preceding native
binary and then against the changed binary, each using disposable PostgreSQL
data and local seller endpoints. SQLx debug statement traces measured completed
translation reads during each native request:

| Order lines | Before | After |
| --- | ---: | ---: |
| 1 | 1 | 1 |
| 20 | 20 | 1 |
| 24 | 24 | 1 |
| Idempotent replay | 0 | 0 |

The old binary passes the behavioral assertions and fails the new constant-query
assertion, providing a regression counterexample. The changed binary passes both.
These counts concern name lookup, not every SQL statement in an order. No
production throughput or latency improvement is inferred from them.

## Preserved behavior

- Italian, short-language and main-language fallback retain locale-first order.
  A requested-language parent name still precedes a main-language child name;
  a child wins when both match the same locale.
- NULL, empty-space and tab-only names retain their previous SQL/Rust fallback.
  Another shop with identical product IDs cannot supply an order's name.
- Catalogue edits do not change the names or exact payment amounts of an imported
  order. Replay returns the existing order without rereading translations.
- Each admitted order emits one native `order.placed` event. Existing Flow,
  guest projection, invoice/PDF, restricted-user and cross-shop cases still run.
- A final-line stock failure rolls back all effects. Two independently identified
  orders competing for one remaining unit admit exactly one purchase.
- The 24-line bound remains intact, and 25 lines are rejected before persistence.

## Verification and delivery

The changed native marketplace suite, all 322 workspace Rust tests, Clippy,
module/source ownership checks and extracted Lean contracts pass locally.
The website build validates 322 pages and all local links. Lean remains at 63 policies and
149 properties, with 156,741 compiled comparisons and zero mismatches. This SQL
batching change adds no whole-function proof.

The local operating-system Node installation has a missing dynamic library;
the complete selected-suite run passes using the existing bundled Node runtime.
Full Linux CI and public delivery are recorded here after they complete. The
[current status page](../status.md) remains the source for the last accepted
public runtime. No live seller account was used for this fixture.
