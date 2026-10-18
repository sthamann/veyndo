# Migration Assistant: local acceptance, 18 October 2026

Scope: `feat/agentic-migration-assistant`, foundation commit `a33a21c9` and its
reviewed original-image/publication and native review/coupon follow-ups. This record describes local
synthetic execution, not public deployment or whole-shop source parity.

## Connected native journey

The actual independent Rust service reads a local WooCommerce HTTP fixture.
Source review freezes canonical row hashes. Explicit approval queues the existing
native app job/outbox. Its callback checks current package, creator, lease and
private destination before invoking the original native domain writer.

Products, images, categories, editable content pages, CRM customers, immutable
historical orders, moderated reviews and inactive coupons all traverse that real service/gateway/job/write path. Five
source-platform HTTP fixtures and 27 normalization cases exercise implemented
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

## Native reviews and coupons

Original review dates/authors/ratings enter native moderation, initially hidden
and never native purchase-verified. After ordinary moderation, the public review
shows only an imported label. Exact replay retains the human moderation decision;
changed source content and private/foreign product references are rejected.
Imported private review rows require current `catalog.read` **and** `customers.pii`
on the settings projection. Real members with either or neither right cannot
read them; removing PII from an existing role immediately removes the projection.
Source verification is restricted to boolean/null in both adapter and native intake.

WooCommerce percent/fixed-cart coupons enter native promotions inactive. Source
usage 2 of 5 becomes three remaining redemptions; past purchases are not inserted
as native uses. Unreviewed activation is rejected. Deliberate native review enables
the actual cart discount; replay does not reset an already reviewed promotion.
Original currency is immutable, visible and enforced on currency changes. A JPY
cart cannot accidentally satisfy a nominal EUR spend threshold. Negative/wrong-type
usage limits, malformed restriction fields and unsupported plugin restrictions
fail at the actual Rust CLI. Only explicit null/integer zero means unlimited.

The independent focused review found the malformed-limit, private review projection
and currency-boundary defects. Each was reproduced before repair and its actual
CLI/member/checkout countercase now passes. SQL/HTTP remains outside the pure proof.

## Complete concrete WooCommerce families and durable inspection

Actual local HTTP reads fetch 61 variations over two pages, split the expanded
family into byte-bounded review slices and retain every original ID exactly once.
Parent axes/options, complete declared variation IDs, duplicate/foreign identities,
wildcard combinations, standalone variations and unsupported separate catalogue
visibility have explicit Rust CLI rejection controls. Child images remain bound
to their own native product; private source status survives native publication.

The full source → Rust service → native job → private family/images → selected
publication → simulated variant purchase path passes. One hidden variant returns
404; buying the visible one and repeating the same order request decrements stock
once, and a fresh cart is empty. An original review still resolves the original
variable parent identity.

A six-second source read reproduced the five-second gateway failure. Inspection
now returns an immediate native job acknowledgement and later delivers bounded
source evidence. Native rich-page results also reproduced the former depth12
failure; they now use the existing bounded native document validator while keeping
32 KiB result, strict callback metadata and checkpoint limits. Wrong type, excessive
depth, oversized result and deep checkpoint controls remain rejected. Source review
uses adaptive slices up to 100 rows/10 images, 20 KiB estimated row budget and 28 KiB
response budget, rather than assuming every source page fits in one browser reply.

A running source inspection cancelled during its six-second read initially still
reported succeeded. The final native progress/authority fence fixes that actual
RED case. Current PII revocation redacts saved source-job results from lists and
returns 403 on detail; a foreign shop receives 404. Independent focused review of the
new grouped-event/current-actor/lease/result-budget/UI path found no remaining
Important/Critical issues after that cancellation fix. SQL/network orchestration
is not part of the extracted pure proof.

Chrome opened saved variable evidence after reload, then started another six-second
source inspection through the real Studio. Its returned review showed Blue/Red,
original parent, SKU, stock and hidden status; the import remained unapproved and
disabled. The first browser inspection exposed indistinguishable variant rows;
missing-evidence UI RED→GREEN controls cover the added readable details.
Screenshots: `artifacts/migration-variable-source-review.png` and
`artifacts/migration-slow-source-completed.png`. The owned test tab/process/database
were cleaned up; the user's original port 8802 process was preserved.

## Browser and general checks

Actual Chrome exercised source review, explicit approval, a successful image
job, private-target reuse and handoff to the existing Shop design agent with its
source URL retained. Saved jobs identify their data domain. The synthetic source
uses HTTP; existing CSP blocks its cross-origin thumbnail. A localized fallback
is shown, while copied native image bytes are checked separately. CSP was not
weakened. A further browser pass inspected original review evidence and coupon conditions,
explicitly approved both native imports and observed completed saved jobs. Preview
screenshots: `artifacts/migration-reviews-preview.png` and
`artifacts/migration-coupons-preview.png`. Owned disposable fixtures are cleaned up
after each pass; the user's existing server on port 8802 remains untouched.

Frontend: 119 files / 675 tests, production build, formatting and EN/DE/FR/ES
localization pass. Workspace Rust tests, warning-denying clippy, source/API/image
ownership checks and documentation generation/checking pass. Existing formal
mutation controls reject 172 broken policies; this does not prove all migration
or commerce behavior mathematically.

## Remaining acceptance

No real merchant source credentials, arbitrary source-version/plugin compatibility,
complete complex variants, other source-provider coupon mappings, automatic branded
theme parity, whole-shop final delta/cutover or large-catalogue throughput is
accepted by this record. The independent service needs its own deployment and
tenant-bound callback configuration before hosted use. See the
[workflow and current domain coverage](../agentic-migration.md).
