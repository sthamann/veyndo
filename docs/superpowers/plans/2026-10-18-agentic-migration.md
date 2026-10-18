# Agentic Migration Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a usable independent Rust migration application and its permission-aware Veyndo workflow.

**Architecture:** Source-owned adapters create versioned canonical records; coarse native app jobs execute reviewed batches with stable identity and durable progress. Generic host import operations retain native ownership, while app UI and central agent proposals prepare private previews and deliberate publication.

**Tech Stack:** Rust/Tokio/Axum/Serde, existing PostgreSQL/app jobs, React/TypeScript, central inference and native site-builder.

**Spec:** docs/superpowers/specs/2026-10-18-agentic-migration.md

## Global Constraints

- Rust files <=320 lines, frontend files <=400, responsibility comments, EN/DE/FR/ES UI.
- All app-specific source, UI, settings, tests and deployment stay under extensions/apps/migration/.
- Preserve current permissions, native transactions, stable identities, shared job leases and exact historic amounts.
- No per-source/shop/model tables, second planner/queue, provider credentials in browsers/prompts or unchecked SQL.
- Historical imports are not purchases or configuration releases; no payment, mail or inventory effects.

## Review Focus

1. Source identity/version/tenant collisions must not merge unrelated people or overwrite records.
2. Interrupted write/restart must reconcile exactly once; current revocation/cancellation stops subsequent batches.
3. Archived orders and coupons must not trigger stock, payment, invoice numbering or ordinary order flows.
4. Malicious content/URLs/credentials must not enter execution authority, unbounded fetch or public preview.
5. Unsupported plugin/source fields and incomplete pages must remain visible, not appear as completed migration.

### Task 1: Canonical records and source profiles

**Files:** extensions/apps/migration/{contract,adapters}/*.rs, service/main.rs, tests/*.rs; Cargo.toml.
**Interfaces:** `normalize(Source, kind, Value, Context) -> Result<Vec<Record>, Error>`; exact string-to-minor money; deterministic stable identity/provenance; completeness/gap summaries.
- [ ] Write Rust fixture tests for all five sources, variants, languages, negative/large amounts, missing references and unsupported input.
- [ ] Run tests and observe absence; implement the canonical contract and profiles; run the complete new binary suite.
- [ ] Commit the tested source contract.

### Task 2: Independent source transport and durable execution

**Files:** extensions/apps/migration/service/{config,transport,extract,core,jobs,runtime}.rs, app manifest and Dockerfile.
**Interfaces:** authenticated `/actions/{action}` and `/events`; existing `job_claim`/`job_progress` callbacks; source cursors and record digest checkpoints.
- [ ] Write real local HTTP source fixtures, denied egress/cursor and Core callback/restart tests.
- [ ] Implement bounded authenticated source reads and stream/export intake; reuse native app job claims and configured secret injection.
- [ ] Verify no credentials in diagnostics, no insecure redirect and no private-address fallback; commit.

### Task 3: Native generic import contracts

**Files:** src/operations/imports/*.rs, src/apps/core_callbacks.rs, credentials/manifest admission, operation registry and associated schema.
**Interfaces:** generic plan-checked native intake; products/customers reuse owners; immutable history has distinct import events and exact source snapshots.
- [ ] Write actual HTTP/PostgreSQL own/foreign, revision, replay, changed-content and side-effect regressions.
- [ ] Implement native admission and source mapping through shared ownership; preserve package/actor fences and operational/configuration separation.
- [ ] Run native order/account/catalogue/isolation regressions and commit.

### Task 4: Merchant workflow and agent-assisted layout/mapping

**Files:** extensions/apps/migration/studio/*, minimal host entry registration, app-owned agent schema/prompt integration.
**Interfaces:** source -> coverage -> reviewed mapping -> private preview -> coarse run progress/reconciliation; existing site-builder design proposals.
- [ ] Write UI tests for role denial, source coverage, approval, progress, errors, cancellation and retained draft context.
- [ ] Build compact responsive app-owned wizard; central assistant stays in a drawer. Never show fabricated readiness or activate source credentials in a sandbox.
- [ ] Run full frontend/build/localization gates; commit.

### Task 5: End-to-end acceptance and documentation

**Files:** app-local provider fixtures/tests; scripts registered integration entry; docs/agentic-migration.md, status/source inventory/README/CHANGELOG and site navigation.
**Interfaces:** frozen source -> repeatable import -> native target reads and isolated checkout -> reconciliation report.
- [ ] Exercise all source profiles with actual Rust transport/Core, restart, replay/denial and no unintended side effects; run relevant existing suites.
- [ ] Exercise browser wizard, private preview, agent proposal review and simulated checkout; save actual screenshots.
- [ ] Update source/contract/formal review manifests after actual review; full required checks; fresh whole-branch review and fix important findings.
- [ ] Publish reviewable PR and deliver within existing authorization; clearly record any external credential/hosting prerequisite instead of claiming it passed.
