# Shop design onboarding and readable migration comparison

**Spec:** The user's selected follow-ups 1 and 2 in this conversation: guide a new
merchant through required packages/private editing and return to the chosen work;
show products as source → actual Veyndo target → meaningful differences.

## Constraints

Use native app consent, environment admission, catalogue mapping, read permissions,
CAS and publication. No new executor, pricing calculator, identity, database table
or automatic publication. App-specific UI remains in its package; EN/DE/FR/ES.
Source and comparison values are transient authorized reads, never stored in job
receipts. Default native comparison remains values-free; only explicit product
preview requests return bounded selected catalogue fields. Current tenant controls
must reject foreign/denied reads. No production secrets or extra hosting required.

### Task 1: Guided private shop-design start

**Files:** site-builder/studio and its tests; minimal existing Studio integration.
**Interfaces:** Existing /api/environments, AppConsent, workspace changes and same
preview; a bounded non-sensitive UI intent retains channel, mode/section across
sandbox handoff without copying drafts or credentials.
- [ ] Write regressions for a new shop, existing sandbox reuse, app consent,
  denied rights, cancellation/retry and late workspace changes; run RED.
- [ ] Implement compact step guidance and resume, hide unusable controls until
  prerequisites are ready. Do not install or publish from a GET/render.
- [ ] Run site-designer/site-workspace tests and commit. Expected: all pass.

### Task 2: Product source/target comparison

**Files:** generic native import inspection, migration/studio, host scoped-request
handoff, app-local regression tests and generated operation contracts.
**Interfaces:** merchant.import.inspect details=true in an already authenticated
private target request; shared native mapping and exact comparison remain owners.
- [ ] Write actual native regressions for explicit bounded preview, unchanged
  default, missing targets, changed fields, foreign and denied access; run RED.
- [ ] Add explicit product-only projection and a scoped, freshness-fenced UI with
  source/native/difference columns, images, variants and publication explanations.
- [ ] Run native migration and relevant frontend tests and commit. Expected: all pass.

### Task 3: Connected verification and documentation

- [ ] Run full frontend tests/build/localization/structure and relevant Rust checks,
  native integration, formal review/drift checks when Rust changes, and docs links.
- [ ] Exercise browser setup and comparison in an isolated local fixture, capture
  actual screenshots; preserve the user's existing port 8802 and its database.
- [ ] Update guides/status/changelog, obtain one whole-branch review, fix important
  findings and publish a reviewable PR. Hosted service setup remains separately held
  at its user-owned key entry; do not claim this local acceptance is public delivery.
