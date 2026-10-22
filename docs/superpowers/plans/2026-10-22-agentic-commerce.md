# Connected agentic commerce implementation plan

> **For agentic workers:** Use superpowers:executing-plans in this existing isolated
> checkout. Execute continuously; the user already authorized implementation.

**Goal:** Connect merchant setup, app changes, shopper intent, testing and migration
with a persistent, bounded customer-agent scenario simulator.

**Architecture:** Existing Rust domain operations remain authoritative. Simulator
runs extend `agent_runs`/`tasks`; UI consumes native capability contracts. App-owned
implementation stays in its package, and publication stays with staging.

**Tech Stack:** Rust, PostgreSQL, React/TypeScript, existing inference and MCP registry.

**Spec:** `2026-10-22-agentic-commerce-spec.md`.

## Global constraints

- No parallel queue, commerce engine, secrets store or per-app database tables.
- Current actor/domain rights, tenant isolation, private stages and native revisions.
- Interface vocabulary EN/DE/ES/FR; content uses enabled shop languages/fallbacks.
- Simulated payments only; no outbound mail or paid booking from simulation.
- No claimed conversion uplift or browser coverage inferred from model prose.
- Read scoped AGENTS.md; preserve Rust production runtime and structure checks.

## Review focus

- An injected product description must never cause a privileged tool or live write.
- Partial cohort creation and a lost checkout response must resume without duplicates.
- Changed channel/app configuration must invalidate stale scenario evidence.
- Switching shop/account/environment must fence late UI responses and saved reports.
- Failure, uncertainty, cancellation and successful completion must remain distinct.

### Task 1: Durable customer-agent scenarios

**Files:** `src/agent_runs/scenarios/`, `src/agent_runs.rs`,
`src/agent_runs/{worker,contract}.rs`, native capability registry, `prompts/`,
`scripts/agentic_scenarios.py`.

**Interfaces:** bounded scenario creation/inspection via native operations; existing
run status/resume/cancel handles individual workers. Native catalogue/cart/checkout
owners execute approved simulation actions. Reports contain observations, not tokens.

- [x] Add failing real HTTP tests for private-only admission, cohort, native cart
  effects, comparison, idempotency, stop/restart and tenant/role denial.
- [x] Implement profile/step schemas, native action adapter and durable task execution.
- [x] Reuse current model accounting and task fencing; run the affected native suites.
- [x] Commit the tested backend slice (PR 195).

### Task 2: Visual simulator workspace and entry points

**Files:** `frontend/src/admin/scenarios/`, knowledge/workspace/designer entry owners,
`frontend/tests/unit/`.

**Interfaces:** use Task 1 operations; shared environment, channel, locale and API client.

- [x] Add tests for editable profiles, progress, stop/continue, comparison and scope switch.
- [x] Implement compact cohort cards, action timeline, baseline comparison and direct
  repair links. Persist selection via saved server runs, not secrets in local storage.
- [x] Verify localized responsive UI and native browser flow; commit (PR 195).

### Task 3: Connected catalogue and personal daily work

**Files:** catalogue intake, shared task progress, `frontend/src/admin/workspace/`,
`src/agent_runs/`, native work-template UI/tests.

**Interfaces:** existing intake, translation/media job IDs, native products and staging;
Task 2 receives selected private channel/work context.

- [x] Test incomplete products and failed media jobs through reload and selected release.
- [x] Connect source/text/image/review readiness and scoped follow-up actions in one view.
- [x] Connect completed work to existing Flow templates and contextual task results.
- [x] Run native/UI regressions and commit.

### Task 4: Complete app connection diagnostics and guided functionality

**Files:** existing app discovery/developer and package owners; native App Studio UI.

**Interfaces:** installed immutable manifest, native operation registry, existing
configuration/order history and scenario entry point; no alternative app schema.

- [x] Test one material/configuration app through native edit, cart, order and upgrade.
- [x] Surface missing connections with repair links and a guided test-before-release path.
- [x] Preserve package-owned code/settings, current rights and historic order snapshots.
- [x] Run app and private publication regressions; commit.

### Task 5: Intent-driven shopper workspace

**Files:** existing concierge/experience owner and storefront selection components.

**Interfaces:** registered visual blocks and authoritative native product/cart totals.

- [x] Test a budgeted multi-product request, rejected selection and editable cart handoff.
- [x] Connect intent, visual comparison/configuration and native checkout; keep UI and
  customer-agent actions aligned without model-supplied executable frontend code.
- [x] Verify native browser purchase and scope/language regressions; record the native
  German simulated receipt, return, empty-cart reload and retained privacy choice.

### Task 6: Migration-to-preview, documentation and delivery

**Files:** migration app/service existing owners, docs/status.md, related feature docs,
public site/README entry links and existing CI owners when affected.

**Interfaces:** existing source jobs/reconciliation, private target shop and release.

- [x] Test imported source -> comparison -> private preview -> chosen release.
- [x] Connect preview, missing-field repair and scenario testing in migration UI.
- [x] Update truthful feature docs, tutorials and public entry points.
- [x] Run relevant full checks and fresh whole-branch review; fix important findings.
- [ ] Land and deploy the verified artifact using the existing authorized path, then
  repeat public simulated acceptance and record what was actually delivered.

## Progress

- 22 October: fetched `origin/main` (`defac3dc`), clean existing isolated checkout,
  branch `feat/agentic-scenarios`. Existing tasks, approval, model checkpoints,
  native carts, experiments and stage admission inspected. Implementation started.

- Local simulator acceptance is complete: real `qwen3.6:35b` customer decisions,
  two native private purchases, exact-budget rejection/abandonment, reload,
  comparisons, private order grid and mobile layout. See the
  [recorded evidence](../../evidence/customer-scenarios-2026-10-22.md).
- Existing connected app/configuration, agentic cart/UCP, catalogue, staging and
  five-source migration suites passed again. Checked items above may reuse those
  owners; they do not mean a second implementation was introduced in this branch.
- The connected per-product language/image readiness projection and app reference
  diagnostics are implemented in a separate follow-up. Native catalogue reload,
  failed-image persistence, foreign scope and selected publication passed; Chrome
  opened the failed-image repair path. See the same evidence document.
- Independent critical-path review completed. Late UI selection, incomplete
  snapshot comparison, cancellation and post-lock lease-expiry findings were fixed
  and regressed. PR 195 passed complete CI, merged and was deployed; hosted
  stock-failure/repair, exact-budget rejection, two purchases, saved comparison
  and original embedded checkout passed. The connected catalogue/app and visual
  shopper follow-ups are consolidated in PR 199 for one final rollout.
