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
source-platform HTTP fixtures, 27 normalization cases, eight CRM evidence cases, 14 transport cases and four publication-state cases exercise implemented
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

The subsequent cross-provider publication controls reproduced 29 failing assertions
against the old binary: Shopify drafts/archived/unpublished status, typed active/status
flags, disabled Shopware variant families and unsupported separate visibility. Four
source-state cases now pass through the Rust CLI; actual HTTP transport fixtures
also return inactive canonical products for each non-Woo source and assert that
Shopify requests both status and online-store publication. Focused independent
source-visibility review found no Important/Critical findings. Real source stores
and additional source channel semantics remain outside this local evidence.

## Reviewed net/gross prices and warning acknowledgement

Actual native intake reproduced the missing `sourcePriceBasis` schema contract;
the reviewed option now uses the existing tax calculator. 12.50 EUR net at 19%
becomes 14.88 EUR gross, while an explicitly gross 19.90 stays 19.90. Missing or
mismatched known basis, invalid source basis types and excessive native range are
refused. Configured JPY scale 0 and KWD scale 3 yield 1488 and 1.488 respectively.
Original source minor units and basis remain in bounded provenance.

A two-record batch with different acknowledged warnings reproduced the native
exact-warning rejection. The existing job coordinator now checks the approved
union and forwards only each frozen row's own warnings. Missing approval still
fails, and repeated native writes replay. Studio warning controls confirm only the
now-resolved source-tax warning; unrelated unresolved warnings remain blocking.

All five actual source HTTP protocols now reach saved review and the native private
product owner, including PrestaShop's net conversion and disabled publication from
the other four providers. Focused independent review found no Important findings
in the new price/basis/acknowledgement scope. The calculator's existing compatibility
boundary remains; no complete provider tax parity or real-store acceptance is implied.

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

Frontend: 119 files / 679 tests, production build, formatting and EN/DE/FR/ES
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

### Source price browser acceptance

Actual Chrome reopened the persisted PrestaShop inspection, retained its declared
net basis, accepted an explicit 19% target rate and completed the reviewed job.
The first screenshot exposed a real table layout defect: a 100% content cell
collapsed the other three columns to 35–36 px. App-owned column proportions now
keep desktop headers at 144/361/180/216 px. At a 900 px viewport the 680 px table
scrolls inside its 600 px wrapper; the document remains 900 px wide.
Screenshots: `artifacts/migration-presta-net-review-fixed.png` and
`artifacts/migration-presta-price-options.png`. The owned browser tab, fixture
processes and disposable database were cleaned up. Port 8802 was preserved.

## Native CRM source fidelity follow-up

CLI counterexamples reproduced missing Woo delivery addresses, unresolved Shopware
country/postcode aliases, Magento shipping assignments and mismatched historical
line currencies. Native intake now preserves separate billing/delivery/additional
addresses within the original CRM transaction. Invalid additional geography rolls
back the customer; replay leaves exactly one address book. Ordinary manual address
events remain enabled, while historical address intake emits only its migration
event. A database-positive control checks event visibility before the absence check.

All five real local source HTTP protocols now reach native customer/address and
immutable historical-order writes. Four-provider follow-ups resolve Presta customer/
country/state/currency dependencies, Shopware detail summaries and current Shopify
email/address fields. Full Shopify historical access requires actual read_all_orders;
its missing-scope counterexample was observed before the guard was implemented.

Independent focused review found a subdivision-loss defect. Source US/CA examples
for all five adapters now produce US-CA, foreign-country region prefixes fail and
a configured native DE-BE customer import retains the region. The reviewer found
no other Important/Critical issues, including the new import-only event selection.
The surrounding source joins, JSON parsing and SQL/async behavior remain unproved.

Registered migration/customer-account/company-settings/tenant-isolation checks pass.
A complete repeat under separate signed System/Tenant logins, ticket rotation and
restart also passes, including five-provider CRM, original historical amounts and
positions, private/publication/simulated-purchase regression, replay and current-right
denials. Original port 8802 remains on the user's unchanged process.

Actual Chrome reopened saved Shopify customer and historical-order evidence, expanded
additional addresses/positions, selected the real German native customer group and
completed both reviewed repeats. The first pass exposed a genuine crash: the app
expected a group `name` map, while the native owner returns translated group fields.
The app now uses the shared `CustomerGroup` type and inheritance renderer. The same
native response shape reproduces RED and passes GREEN in the UI regression.
Screenshots: `artifacts/migration-crm-customer-review.png` and
`artifacts/migration-crm-order-review.png`. Both were visually inspected. The owned
Chrome tab, fixture processes and disposable database were cleaned up; port 8802
and the two pre-existing disposable databases were preserved.

## Source pagination completeness follow-up

Four real HTTP counterexamples previously accepted malformed REST page counts,
a short nonterminal offset page, and missing Shopify root/nested page evidence.
These now fail before returning records or advancing a cursor. REST count/page
occupancy must agree; queried Shopify connections require boolean completeness.
The complete registered native migration path passes, including five-provider
CRM/history and simulated checkout. Independent focused review found no Important
or Critical defects. This protects individual source pages; it does not establish
whole-shop snapshot consistency or final cutover. Evidence:
`artifacts/migration-incomplete-pagination-red.log`,
`artifacts/migration-incomplete-pagination-green.log`,
`artifacts/migration-pagination-native.log`, `artifacts/migration-pagination-clippy.log`.

## Frozen domain-export intake

The independent Rust `pack` command streams original expanded JSON lines into
private immutable source files, followed by a checksum-pinned manifest. The
actual HTTP reader checks original context, counts, page bytes and continuation.
Six export test cases exercise all five product adapters, expanded Presta history,
malformed/truncated references, duplicate IDs, tampered manifests/pages, explicit
legacy HTTP source identity without fetching that host, and separate export
credentials. See the guide for hard bounds and incomplete source profiles.

Actual independent-service/Core acceptance imports all 52 products from a frozen
two-page export into a private native target, preserves original source identity,
prices and zero stock, and replays without duplicates. Tampered page bytes fail
before native creation. Saved results retain the same export hash/counts; current
roles/package/creator/lease and exact reviewed digest admission remain unchanged.
This is domain-export coverage, not a full-source transaction fence or current
whole-shop field reconciliation/cutover.

The browser reopened encrypted export settings with both secrets empty, performed
a fresh saved inspection, reloaded and reopened its original digest/count evidence,
and explicitly imported 29 reviewed rows into a new private preview. The actual
UI finished 29/29. A first browser replay selected an existing target
with different earlier options and correctly conflicted; that exposed misleading
source-error wording. The actual changed-options regression reproduced it. Callback
errors now identify Veyndo and supply four-language recovery guidance while hiding
response bodies/credentials. Native conflicts continue to leave original records
unchanged. The own fixture/tab were cleaned; user process PID55412/8802 stayed live.

![Actual local saved export review](images/migration-2026-10-18/export-review.png)

A separate local synthetic Debug packaging probe processed 200,000 product rows
into 4,000 fixed export pages (20,270,675 raw page bytes, 896,258-byte manifest):
46.007 seconds and 31,113,216 bytes maximum child RSS. It measured packaging only,
not source API speed, native 200k-row import or hosted/fleet throughput. Disk
synchronization and Debug mode are part of that measurement. Temporary source
artifacts were removed after the probe. Evidence:
`artifacts/migration-export-200k-pack.json`.

Additional evidence: `migration-export-red.log`, `migration-export-green.log`,
`migration-export-unexpanded-red.log`, `migration-export-http-identity-red.log`,
`migration-export-native-red.log`, `migration-export-conflict-red.log`,
`migration-export-signed-runtime-final.log`, `migration-export-ui-red.log`,
`migration-export-ui-green.log`, actual `migration-export-review.png` and
`migration-export-completed.png` under the local artifacts directory. These are
local development results; the complete assistant remains a draft, not a public
rollout or admission of arbitrary live source stores.


## Saved work plans and history — 19 October local acceptance

- Native private `migration/runs` logical records retain translated labels, source
  profile, planned domains and private preview with native optimistic revisions.
  Actual save/list/CAS conflict, invalid domain-array negatives and foreign-shop
  denial passed; saving a plan starts no import and does not approve records.
- Actual HTTP history containing 105 additional jobs was read in disjoint 7-row
  keyset pages by group. Current action/PII redaction and tenant/app containment
  remain in the original owner. Native retention is still 1,000 jobs/shop.
- Independent review found that deleting a cursor row could falsely end pagination.
  Actual old-binary HTTP RED reproduced an archived cursor returning 200/empty.
  The fix retains a resolved timestamp for the current read and reports 409/reload
  for an already missing cursor. Actual archive/foreign/bounds negatives passed.
- Independent review also found malformed domain metadata and late manual job
  refreshes after role changes. Native action schemas and defensive Studio decoding
  now reject bad plans; one request/group/access-key-fenced hook owns all job-list
  responses. A delayed control-refresh regression confirms that revoking the same
  user's PII right cannot repopulate customer-review rows from an old response.
  Focused re-review reported no remaining Important/Critical findings.
- Complete registered migration fixtures passed through actual separate signed
  System/Tenant database logins, restart, signing-key rotation and tenant-isolation
  checks. They include frozen 52-product native private imports, grouped source
  evidence, exact amounts, replay/tamper/conflict negatives and the existing native
  publication/simulated purchase/stock-once/new-empty-cart path. Source APIs and
  payment remain synthetic; this is not live-provider or hosted service acceptance.
- Actual Chrome: create `Sommerkollektion – Browser-Abnahme`, select products/images,
  save, reload, reopen the native plan, inspect its frozen source, explicitly
  confirm gross/19%/exact rows, queue import, reload and reopen again. The same
  preview and linked 29/29 completion were visible. This browser import was an
  exact replay into the existing synthetic destination, not a second unique batch.
- Rust workspace tests/clippy, 120 frontend files/685 tests, build/format/localization,
  structure, formal baseline and negative proof controls passed for this scope.
  SQL/provider/async behavior is outside the extracted proof boundary.

![Saved plan and persisted batch completion after full browser reload](images/migration-2026-10-18/work-plan-completed.jpg)

The labels and plan are context only. They do not freeze changing connection settings,
prove whole-shop coverage/current target parity, persist a separate receipt ledger
past job archival, perform final deltas/cutover or establish real hosted admission.
Whole-shop orchestration and the remaining provider/content/navigation/branding/
redirect scope remain open. No public rollout is claimed for PR 168.
