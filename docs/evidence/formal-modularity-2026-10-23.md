# Formal guarantees and module audit — 23 October 2026

The initial local source verification is based on `fc47503745bd9820c8a526f1b9e8b7dfefb7a602`.
Its [machine-readable results](formal-modularity-2026-10-23.json) retain the source
base, dirty-worktree flag, exact checks and selected larger files. The subsequent
complete CI and public Core rollout are recorded separately below.
The [formal guide](../formal-verification.md) explains the trust boundary;
the [current status](../status.md) records public runtime acceptance separately.

The subsequent [Linux CI formal result](formal-verification-2026-10-23.json) and
[mutation result](formal-mutations-2026-10-23.json) are copied unchanged from
[run 39934011164](https://github.com/sthamann/veyndo/actions/runs/39934011164).
That clean checkout has source `bd1fc0e4f7b499bb72aaebd8ae7c0d46c09b679b` and tree
`c48dbf804423c5de33916dc65342553caaf7f230`, identical to PR #206's `d68b2940`.
It independently reproduces the 63-policy / 149-property / 156,741-case result
and all formal mutation controls. The complete required run passed, including
native database integration, strict signed runtime, transaction pooling and
coverage gates: 317 Rust workspace tests and 816 frontend tests in 140 files.
Measured line coverage is 86.62% for Rust, 69.92% for the frontend and 80.72%
for Python development/test tooling. These percentages retain their CI source
and do not imply whole-system proof.

## What changed

| Area | Before | After |
| --- | --- | --- |
| Extracted production policies | 61 | 63, including the existing private continuation and planning-request decisions |
| Named Lean properties | 131 | 149: 18 new sequential commerce and agent-admission properties |
| Rust policy entry | 320 lines, several responsibilities | 71-line explicit facade; seven domain modules of 14–76 lines |
| Handwritten proof entry | 515 lines | Eight import lines; seven independent domains of 38–240 lines |
| Module/dependency checks | Domain DAG and selected forbidden dependencies | Reviewed package owners, all direct domain dependencies, aliases, optional/dev/build variants, target paths and domain build scripts |

All 61 previous policy signatures and typed expressions are unchanged. Existing
public names and production consumers keep the same behavior. New pure guards
extract the decisions already used by the native agent control and continuation
paths; credentials, route classification, SQL and time remain their existing owners.

The new universal statements prove that two admitted reservations preserve stock,
successive refunds stay within captures, and successive allocations preserve the
budget. They also cover a lowered budget/capture, discount monotonicity/idempotence,
and exact private agent-context admission. They assume the latest state supplied
by the adapter; they do not prove database serialization or provider behavior.

## Completed checks

- **Lean:** all 149 properties compile; the compiled environment is rechecked.
  No `sorry`, custom axioms or native-decision axioms are admitted.
- **Compiled Rust/Lean comparison:** 156,741 identical inputs, zero mismatches,
  exhaustive Boolean assignments and numeric edges through `u64::MAX`.
- **Negative controls:** Lean rejects 183 broken policies. The checks also reject
  14 unsupported syntax cases, three stale/disconnected inventories, nine proof
  shortcuts, ten module/proof-layout bypasses and 17 Cargo boundary bypasses.
- **Rust:** all 317 workspace tests pass, including four new independent
  wide-integer/sequence/context tests. Workspace Clippy with warnings denied,
  formatting and the native binary build pass.
- **Native database/HTTP paths:** the registered `b2b`, `payments`, `durable_agents`
  and `agent_authorities` suites pass in a newly created local PostgreSQL database,
  removed by the existing runner afterward. Provider/model responses are local
  fixtures; this is not a real-money payment or hosted inference acceptance.
- **Structure:** 711 Rust modules meet the 320-line limit and responsibility-header
  contract; `main.rs` meets its 120-line limit. All 836 frontend production modules
  meet their ownership, resolved-import, DAG and size rules. Plugin ownership,
  route permissions, localization and the exact source inventory also pass.

The native tests include two HTTP replicas competing for one remaining model
allocation, restart after exhaustion, stop during an actual worker request,
revocation, foreign/sibling-identity denial and existing B2B/payment state effects.
Finite regression results and selected universal proofs are different evidence.

The subsequent CI review also identified a race in the existing delayed-flow
revocation test: `queued` is both the initial admission state and the state after
the delay has been saved. The test now waits for the persisted `effect` cursor
and `delayCompleted=pause`, then revokes membership and advances the timer in
one transaction. It requires the exact `Flow owner lost access` failure and an
unchanged order; failed checks include the persisted cursor, lease and attempts.
The selected signed-runtime regression passes with separate non-owner tenant
and system connections, including the following restart and isolation checks.
No production authorization or worker timing was relaxed.

## What the file review does and does not establish

The runtime already has five domain crates, plus the root application and separate
migration application. This change tightens the existing Cargo check; it does not
claim to have moved every root adapter into a domain crate. Size limits alone do
not establish good architecture. The dependency rules, shared native consumers
and responsibility boundaries are the relevant controls.

The audit also found larger files outside the small production-module rule:
`site/style.css` has 1,037 lines, `scripts/connected_apps.py` 768 and
`scripts/email_tests.py` 638. Some localization catalogues and UI test files exceed
400 lines under their separate roles/limits. These are explicit future extraction
candidates, not evidence that every repository file is already small. Splitting
the site stylesheet by handbook/marketing components and provider tests by their
existing fixtures would be useful follow-ups; vendor/generated files should retain
their provenance rather than being split for a line-count target.

## Website stylesheet follow-up

The subsequent stylesheet extraction addresses the largest file above:
`site/style.css` is now a ten-line ordered entry to nine documented modules of
49–204 lines. Removing only each added responsibility comment and concatenating
the modules reproduces the original 1,037-line source byte for byte. The build
publishes one flattened stylesheet at both existing URLs; CSS imports add no
browser requests. Marketing and handbook bundles are checked for exact equality.
The existing full website build and local-link/asset validation pass.

## Provider test follow-up

The two integration files identified above are now small suite entry points:
`connected_apps.py` runs the access, private source, event delivery and disconnect
scenarios; `email_tests.py` composes the original nine test cases. Protocol fixtures,
server lifetime and individual scenarios have documented owners under
`scripts/testing/connected_contracts/` and `scripts/testing/mail_contracts/`.
`rust_connectors.py` now imports the shared mail fixture directly instead of
depending on the mail test class.

The same three registered suites passed before and after extraction. Structural
comparison confirms unchanged bodies for all nine mail tests and all 37 assertions
and nine reported scenarios in the connected app suite. Native mail delivery and
the separate Rust connector regression still run against local provider fixtures
and disposable PostgreSQL databases. [Ownership and reproduction command](../testing.md#mail-and-connected-app-test-ownership).

The complete CI also exposed an existing role-race fixture problem under signed
transaction pooling. Its `FOR UPDATE` barrier could block worker foreign-key
checks before the HTTP mutation reached its intended lifecycle lock. A direct
`FOR KEY SHARE` negative control reproduces that excessive exclusion. The fixture
now uses `FOR NO KEY UPDATE`, verifies compatible key reads, and requires the
mutation to wait behind that exact backend before demoting the owner. Promotion,
invitation and invitation acceptance must still return 403; denied invitations
remain absent or unredeemed. Production authorization and lock acquisition are
unchanged. Failure cleanup releases the database barrier before joining HTTP.

## Discount arithmetic follow-up

The next review found a concrete overflow in the shared discount allocation:
summing two `i64::MAX` line amounts panicked in a debug build. A larger cumulative
basket multiplied by its discount could also exceed the intermediate type. The
regression reproduces the original sum failure before the repair.

`crates/commerce/src/discount.rs` now totals positive goods in `u128` and carries
the division remainder between lines. This preserves cumulative half-up rounding
and its stable line-order tie breaks. Each step multiplies only one line by the
bounded discount. On supported targets with at most 64-bit pointers, the total is
below 2^127, the line product below 2^126 and their intermediate sum below 2^128.
Negative credit lines retain their value and receive no allocated discount.

Promotions and app adjustments keep the same shared owner. App price increases
also reject an overflowing adjusted total before changing the quote. The new
separate regression module checks exact extreme outputs, a 4,096-line basket,
empty/credit-only inputs and every three-line combination from zero to nine
minor units against an independent complete-prefix rounding oracle. The native
promotion regression checks individual discounted lines and their persisted
order values in addition to its existing concurrent single-use coupon test.

The extracted `discount_cap` policy and its Lean properties are unchanged. The
allocator and floating-point tax adapters remain reviewed and behaviorally tested
Rust, not extracted mathematical proofs. The current inventory grows to 712 Rust
modules because the new regression has its own owner.

Local verification passes all 322 Rust workspace tests, the release-mode discount
tests, Clippy, module and dependency checks, and the native `marketing_accounts`,
`currencies` and `business_capability` database/HTTP suites. Lean rechecking still
proves 149 properties and compares 156,741 compiled cases with zero mismatches.
The website build validates all 321 generated pages. The complete CI and public
delivery of this repair are recorded separately below.

## Discount repair: complete CI and public rollout

[PR #209](https://github.com/sthamann/veyndo/pull/209) merged normally on
23 October at 13:02:07 UTC as `363181ddb7d2dc3759171c8b330f51b15247b38c`.
Its tree `56e398d026ad4928dc64caa3dcdaef21259b0ee5` is identical to the tested
branch `467fc5fd` and GitHub's clean CI checkout `429cdf040e3a26eaf0613cbfc0325b0a746ce08d`.

The [complete required CI run](https://github.com/sthamann/veyndo/actions/runs/39953688161)
passed all 322 Rust workspace tests, 816 frontend tests in 140 files, native
database integration, strict signed connections, transaction pooling and
coverage gates. The exact three-line discount and frozen order assertions passed
in both database modes. Measured line coverage is **86.64% Rust**, **69.92%
frontend** and **80.76% Python test/development tooling**.

The [formal result](discount-formal-verification-2026-10-23.json) and
[mutation result](discount-formal-mutations-2026-10-23.json) are copied unchanged
from that CI run. They retain the clean source commit and reproduce all 149 Lean
properties, 156,741 compiled comparison cases and zero mismatches. All 183 broken
policy mutations are rejected. The source inventory now records 712 Rust modules,
including the independently owned discount boundary regression. These existing
Lean properties cover the extracted policies; the wider allocation repair has
the behavioral and native checkout evidence described above.

The normal main release built image `dynamic-garden-8477` from merged commit
`363181dd`, created snapshot `26-10-23-131334-backup`, and completed migration job
`0e4971fe-01e5-45cf-b379-a1a8d1a3010d` successfully. The Core deployment
`vendune-core-6dc786ccf` started at **15:14:51 CEST**. By **15:16 CEST**, the release
had finished with one running instance, 1/1 health checks passing and zero
restarts. No database role, service resource or provider configuration changed.
The separate migration-service image publication initially received `unknown blob`
from GHCR after its successful tests; rerunning that failed publication job
completed successfully without source changes.

After the rollout, the public fictional workshop shop completed a native guest
purchase with **Demo payment**, a fictional address and an `example.test` email.
Receipt **`RAC-b8059d75`** contains the German desk name, quantity one, **EUR 349.00**
total, **EUR 55.72 VAT** and free collection. The receipt explicitly reports a
simulated authorization. **Back to shop**, a full browser reload and reopening
the cart all confirm zero items. The previous optional privacy rejection remains
in effect. Anonymous Core health returns HTTP 200 and `status=ok` with PostgreSQL.
This public single-item purchase verifies the released native checkout and cart
continuation; the exact three-line discount is separately covered by the local
and full CI database/HTTP tests. It does not re-date embedded Storyfront acceptance.

## Reproduce

```sh
python3 scripts/formal.py
python3 scripts/formal/mutations.py
cargo fmt --check
cargo clippy --locked --workspace --all-targets -- -D warnings
cargo test --locked --workspace
python3 scripts/testing/workspace_boundaries.py
python3 scripts/verify_integration.py --only b2b payments durable_agents agent_authorities
python3 scripts/structure.py
python3 scripts/testing/documentation_hygiene.py
python3 scripts/build_site.py
python3 scripts/check_site.py
```

The integration runner creates its own disposable database using the configured
local test server; use `TEST_PSQL` for an installed native PostgreSQL client.
The complete required Linux CI remains the merge requirement and passed for this
release. Local green checks do not substitute for it or public release acceptance.

## Public Core rollout

[PR #206](https://github.com/sthamann/veyndo/pull/206) merged normally at
10:25:25 UTC on 23 October as `a7089747200a87e391527ec0798e5b26336239d2`.
Its complete tree is identical to the tested source `d68b2940` and CI checkout
listed above. The already-built image `marked-act-7677` was activated at
**12:26 CEST**; the observed deployment is `vendune-core-55f7c95bc5`.
Northflank reports one running instance, 1/1 health checks passing and zero
restarts. No schema, database role, service resource or provider setting changed.

Anonymous `https://app.veyndo.ai/health` returned HTTP 200 and `status=ok` with
the PostgreSQL check passing. The public test shop opened its German catalogue
with current prices and stock and retained cart count zero. Studio displayed
the normal sign-in screen for this browser session. This is a post-release
availability/read smoke check, not a fresh sign-in or purchase acceptance; the
dated public purchases remain linked in [current status](../status.md).
