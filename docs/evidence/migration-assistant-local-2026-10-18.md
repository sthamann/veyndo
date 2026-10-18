# Migration Assistant: local acceptance, 18 October 2026

Scope: `feat/agentic-migration-assistant`, foundation commit `a33a21c9` and its
reviewed original-image/publication follow-up. This record describes local
synthetic execution, not public deployment or whole-shop source parity.

## Connected native journey

The actual independent Rust service reads a local WooCommerce HTTP fixture.
Source review freezes canonical row hashes. Explicit approval queues the existing
native app job/outbox. Its callback checks current package, creator, lease and
private destination before invoking the original native domain writer.

Products, images, categories, editable content pages, CRM customers and immutable
historical orders all traverse that real service/gateway/job/write path. Five
source-platform HTTP fixtures and 19 normalization cases exercise implemented
provider profiles. Three Rust package tests cover the shared exact-money, safe
transport and explicit unknown-image-profile boundaries.

A selected imported product and its image publish together. The public native
asset endpoint returns the original bytes. A subsequent product-content edit
publishes successfully against the persisted live baseline. After deliberate
stock activation, a simulated native buyer purchase and idempotent replay produce
one order/stock decrement; a fresh cart is empty. This is API acceptance, not a
new Storyfront browser purchase or real PSP settlement.

## Rejection and recovery evidence

- Changed reviewed records, wrong image bytes, foreign tenants, stale leases,
  cancelled jobs and changed installed packages are rejected.
- A 3 MiB image passes the bounded binary lane without relaxing metadata limits.
  Failure at the native media-count limit leaves one private immutable asset;
  explicit retry after resolving the limit attaches it without duplicate bytes.
- Source-image order survives interleaved writes while manual media retain their
  positions. Public CDN fetches never receive source account authorization.
- Product-only release with an absent live image and joint release referencing
  a protected download are rejected with complete transaction rollback.
- A variant without its required parent cannot publish. Joint product/category/
  image selections work independently of request order and start stock at zero.
- Signed System/Tenant database-role tests include actual HTTP, separate logins,
  restart, key rotation, pooled reuse and foreign-object denial. Native app-job,
  callback, admin-creation and staging regressions also pass.

Focused independent reviews covered native image admission and publication,
including selected-only writes, compound tenant references, package/actor fences,
parent ordering, stock preservation and exact live baseline projection. Their
concrete attachment-kind and source-image-order findings were fixed and covered
by the regressions above. SQL/HTTP execution is outside the pure Lean proof scope.

## Browser and general checks

Actual Chrome exercised source review, explicit approval, a successful image
job, private-target reuse and handoff to the existing Shop design agent with its
source URL retained. Saved jobs identify their data domain. The synthetic source
uses HTTP; existing CSP blocks its cross-origin thumbnail. A localized fallback
is shown, while copied native image bytes are checked separately. CSP was not
weakened. The disposable browser fixture was stopped and removed afterwards.

Frontend: 119 files / 666 tests, production build, formatting and EN/DE/FR/ES
localization pass. Workspace Rust tests, warning-denying clippy, source/API/image
ownership checks and documentation generation/checking pass. Existing formal
mutation controls reject 170 broken policies; this does not prove all migration
or commerce behavior mathematically.

## Remaining acceptance

No real merchant source credentials, arbitrary source-version/plugin compatibility,
complete complex variants, native review/voucher migration, automatic branded
theme parity, whole-shop final delta/cutover or large-catalogue throughput is
accepted by this record. The independent service needs its own deployment and
tenant-bound callback configuration before hosted use. See the
[workflow and current domain coverage](../agentic-migration.md).
