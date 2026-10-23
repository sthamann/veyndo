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
The existing full website build and local-link/asset validation pass. The larger
integration-test files remain separate future cleanup candidates.

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
