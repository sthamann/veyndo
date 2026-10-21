# Veyndo: current status

This is the single starting point for what works, what is implemented but not
publicly accepted, and what still needs development. Updated 21 October 2026.
A green test, merged code and a completed public business journey are different evidence.

Migration implementation (19 October): saved plans now connect all eight supported
domains in a review-gated page sequence. Native current-field comparison detects
missing records, changed prices/text and image associations. Private page intents
and bounded reports survive technical job archival and service restart; a changed
result does not authorize repair or cutover. Local synthetic acceptance is separate
from the still-pending public migration-service acceptance. Migration 106 was deployed with Core/Studio `b13aedb`; the current Core/Studio
release is `b0811f8` (20 October, see the workspace section). The separate service image is published,
but its hosted gateway/callback configuration and public migration journey remain
open. Native completion evidence is now
atomically sealed under current job/creator/package/lease/CAS checks; raw edited
success flags cannot advance Studio. [Acceptance evidence](evidence/migration-continuation-2026-10-19.md)
and [workflow limits](agentic-migration.md).

Local migration follow-up (18 October): frozen domain export packaging and pinned
HTTPS intake now reuse native reviewed jobs, with separate export credentials,
source-reference checks and visible original counts/digests. Two-page native
product intake/replay and tamper rejection are locally tested. This remains
a historical local checkpoint, now merged in PR #168; it did not establish a
complete shop migration/cutover. [Scope and evidence](agentic-migration.md).

## 21 October: collection workflow in development

The next [connected merchant follow-ups](connected-merchant-followups.md) are being
implemented in sequence. Scoped translation jobs and a connected private
category/translation/page task have passed initial local HTTP/PostgreSQL restart
and selective-release cases. The new extension is not yet publicly deployed;
the accepted public workspace remains the 20 October release below.

## 20 October: design onboarding and readable product comparison

Merged and included in Core/Studio `34e272b`: guided native private-workspace/package
setup with return to the selected design tool, plus original/mapped/current
product comparison. The local native migration suite and 706 frontend regressions
passed; browser acceptance uses a separate synthetic local shop. The deployment does not establish a complete hosted migration-service journey. [Local acceptance evidence](evidence/design-migration-2026-10-20.md). See
[shop design](personal-workspace-and-shop-design.md) and
[migration review](agentic-migration.md).

## 20 October: service integration implementation

Merged in PR #172 and included in Core/connector `34e272b`: five bounded Rust provider apps (Vercel, Klaviyo,
HubSpot, Contentful, Algolia), a Shopware 6 product reader into native private
imports, and ten discoverable integration routes reusing existing Shopify,
WooCommerce and Slack owners. Nexus uses a documented HTTP-action recipe.
Provider activation, a real Nexus run and an externally hosted Vercel checkout
are separate from local fixtures. Local provider/native/signed-runtime tests and
713 frontend checks pass. [Capabilities, setup and limits](service-integrations.md)
and [local evidence](evidence/service-integrations-2026-10-20.md).

## 20 October: connected agentic workspace

Merged in PRs #172, #173 and #174, running as Core/Studio `b0811f8`:
typed editor context, relevance/cursor app discovery, reviewed private multi-step
native work with saved action progress, complete native app composition/private
preview, editable grid handoffs, current-right work suggestions and explicit
versioned private guidance. Current rights and native review/publication remain
authoritative across these paths.

The final required full run [39441599258](https://github.com/sthamann/veyndo/actions/runs/39441599258)
passed all 102 registered integration/browser-contract suites, 721 frontend tests,
299 Rust workspace tests, restricted-login/pooler repetitions, formal/mutation
checks and unchanged coverage gates. PR #174 merged as `2aadf62c`; its Git tree
is identical to the tested, publicly running `b0811f8` tree.

Actual public configured-model acceptance covers selected-editor/guidance recall,
native editable product filtering, current-stock work cards, one approval finishing
two private category steps, saved progress after full reload, and a generated
care-note app with English/German records. Its selected package release left test
data private; the central region setting survived reload. The missing optional
title regression also passed on the final public image.
[User guide](agentic-workspace.md) and
[acceptance evidence](evidence/agentic-workspace-2026-10-20.md).

## Start with a complete journey

1. [Create and explore a synthetic shop](first-tour.md).
2. [Build an app and test its real records privately](app-tutorials/README.md).
3. [Review a sandbox and selected publication](workbench.md).
4. [Understand the connected architecture](production-architecture.md).

## Accepted commerce journeys

The [inward agentic-commerce change](agentic-commerce.md) adds native UCP Cart
Transfer, optional explicit buyer consent, inward Shopify CSV/Shop MCP catalogue
preparation, merchant AI-channel controls and shared UI/browser-agent cart actions.
It also adds structural design comparison and app declaration diagnostics.
[Public acceptance on 18 October](evidence/agentic-commerce-hosted-2026-10-18.md)
passed native cart transfer and original embedded Storyfront purchases, return and
persistent empty carts, inward Shopify import into a private sandbox and app
declaration diagnostics. Full required CI passed all 101 integration suites and
657 frontend tests. The actual private Shopware Payments adapter also passed
[synthetic-provider checks](evidence/agentic-commerce-local-2026-10-18.md); public
browser purchases used the explicitly simulated native demo-card.
Google enrolment, Muse partnerships, real PSP settlement and continuous supplier
synchronisation are separate and are not claimed by this work.

## Migration Assistant: implementation in progress

The new [migration workflow](agentic-migration.md) has a separate Rust application,
five source protocol fixtures, private product/image/category/page intake and native CRM/history/review/coupon paths,
reviewed native jobs and a Studio entry. [Local acceptance and focused independent review](evidence/migration-assistant-local-2026-10-18.md) cover this connected scope;
the larger assistant remains in development and is not part of public acceptance below.
Public original-image copying and selected product/image publication have local acceptance.
Reviews retain native moderation and never gain purchase verification; WooCommerce
coupons require activation review and remain bound to their original currency.
WooCommerce concrete variable families now preserve native options, original parent IDs,
private status and child images. Slow source inspection uses saved jobs, with reopening,
cancellation and current PII revocation controls. These additions have local acceptance. Publication-state controls also cover drafts/disabled
products across the other four source profiles; unsupported separate visibility stops explicitly.
Complex source variants, private/provider-specific media and coupon mappings, full mapping/cutover and
large-scale throughput remain incomplete. All five local source HTTP profiles now reach
native private product creation; net/gross and source-warning choices use the native price owner. The guide distinguishes normalization
from an accepted native target write. All five local provider protocols now also reach
native CRM address books and immutable historical orders, including source detail/reference
reads, distinct delivery addresses, subdivisions, replay and absent ordinary address-change flows.
Shopify full-history intake requires actual all-order access. These are local acceptance
results; hosted service deployment and whole-shop cutover remain open.

## Public acceptance

| Journey or boundary | Evidence and present limitation |
| --- | --- |
| Inward agentic commerce | [18 October public acceptance](evidence/agentic-commerce-hosted-2026-10-18.md): UCP transfer purchase RAC-81a64f7e, embedded Storyfront purchase RAC-df45f7f6, return and persistent empty bags, two private Shopify variants and declaration diagnostics passed. No real money, Google admission or continuous supplier sync. |
| Buyer entry and native POS receipt | [17 October hosted follow-up](evidence/buyer-pos-hosted-2026-10-17.md): own-account sign-in entry, preserved carts across rollout, German simulated purchase RAC-7bd54019, fictional POS sale RAC-5e78c602, actionable seller setup, single native invoice/PDF and guarded app-bound completion passed. Hosted signed-buyer RFQs, real settlement and physical printers remain separate. The [later PDF follow-up](evidence/receipt-pdf-hosted-2026-10-17.md) repairs its Windows-1252 punctuation; arbitrary Unicode fonts remain outside that renderer. |
| Native app workflows and AI proposals | [17 October public acceptance](evidence/native-app-workflows-hosted-2026-10-17.md): visual creation, private installation, selected publication, guarded completion, 0.1.1 → 0.1.2 upgrade and distinct old/new order workflows passed. The [configured-model follow-up](evidence/agent-native-workflows-hosted-2026-10-17.md#follow-up-accepted-on-d939257) also passed exact preservation, private install and selected publication of a missing quote workflow. Payments remained simulated; hosted RFQ buyer execution is a separate acceptance. |
| Native app product journey | [17 October hosted acceptance](evidence/native-app-fields-hosted-2026-10-17.md): visual creation, native product writes, compatible upgrade with retained data, optional grid column, exact positive/negative filters and selected live publication passed. Original embedded Storyfront purchase/return/bag clearing also passed on that image; payment remained simulated. |
| Shared app storage | [15 October hosted migration](evidence/shared-app-storage-hosted-2026-10-15.json): four fixed physical tables, checked data migration and simulated purchases. This does not establish unbounded capacity. |
| Restricted database runtime | [Hosted enforcement record](evidence/database-enforcement-2026-10-15.json): separate roles and strict restart. Authorization and SQL isolation are both required. |
| Native checkout | Dated acceptance covers simulated purchases. It does not prove a real provider payment, mail delivery, invoice and refund journey. |
| Storyfront embedded checkout | [18 October controlled-Chrome acceptance](evidence/storyfront-checkout-hosted-2026-10-18.md): the then-current public original Experience opens the native iframe, saves simulated order RAC-3b2e5dfc with its German product name, verifies completion and clears the original bag. The receipt's return closes the iframe on the same Experience; the bag stays empty after reload. Earlier paused-document attempts remain historical evidence; real provider redirects/3DS remain unaccepted. |
| Browser login | HttpOnly implementation and registered session tests exist. Public Google sign-in, reload and logout passed on 16 October. Fresh SaaS creation and its one-use Studio handoff also passed. Public password sign-in, reload persistence, logout and denied protected-route return also passed in a separate incognito session on 16 October. Apple currently returns `invalid_request: Invalid web redirect url` for the new start.veyndo.ai callback; the Apple Service ID configuration is not repaired. |
| Legacy domains | 16 October public DNS/TLS/redirect checks passed for vendune.ai and team.vendune.ai, ending at www.veyndo.ai and team.veyndo.ai respectively. No DNS change was made. Authoritative-provider configuration and filtering-provider delisting remain separate checks. |
| Recovery and real providers | Restore drill and real payment/mail/refund acceptance require their own recorded outcomes. No current whole-system production certification. |

## Implementation and hardening

| Area | Current boundary | Acceptance required |
| --- | --- | --- |
| Commerce and channels | Native Rust owners for products, prices, stock, checkout, orders, documents, POS and selected B2B/UCP routes | Full relevant role/channel/language/currency flows, including denied cases |
| App storage and lifecycle | Shared bounded records, references, settings, immutable definitions, private previews and selected release | Complete generated business capability across data/UI/logic; no arbitrary-source hosting claim |
| Agent runs | Persisted native task checkpoints, leases, cancellation and explicit uncertain-call continuation. Publicly deployed [planning-agent controls](agent-authority-controls.md) add distinct revocable keys, exact-model allocation envelopes and live/sandbox stop. | [Hosted stop/re-enable and shopping acceptance](evidence/agent-authority-hosted-2026-10-16.md); conservative token/USD allocations are not provider invoices or unrestricted financial autonomy. |
| Provider tools | Native OpenAI Responses/Chat, Claude and Ollama read tool protocols, private conversation continuation and current per-call authorization are deployed in the 16 October Core | Local provider and durable-worker fixture suites passed; real configured provider quality/usage needs separate acceptance |
| Native app extensions | [Version-1 private product/customer/order/company fields](app-core-extensions.md) integrate native details, existing grids, exact filters, current permissions and selected configuration release | [17 October hosted product lifecycle](evidence/native-app-fields-hosted-2026-10-17.md) passed; all four object types have local/required-CI coverage, not four separate hosted walkthroughs |
| POS status and database recovery | [Reproduced read-race and startup repairs](evidence/startup-pos-recovery-2026-10-17.md) keep payment/order snapshots coherent and retry transient initial database connections | Deterministic regressions and full required CI passed; repairs are deployed in the [17 October image](evidence/native-app-fields-hosted-2026-10-17.md). No induced production outage, failover or uncertain-write retry claim |
| Prompt governance | Central prompts are versioned files with ID, template digest and rendered-system digest in model usage | Versioned prompt IDs and content digests in model evidence, injection evaluation at actual admission |
| Contracts | Compiled operation registry generates request OpenAPI, TypeScript and WIT contracts with drift checks | Input contract generation passes locally; broad domain objects and response DTOs are not yet completely typed |
| Module boundaries | Five real workspace libraries extract kernel, runtime, commerce, apps and provider inference; HTTP/domain composition remains in the root | Compiler checks and dependency-DAG negative controls passed locally; not every domain handler has moved |
| Money | Exact `Money` exists; compatibility calculation paths still contain `f64` | Exact authoritative arithmetic with the original PHP differential gate |
| Outbox | Separate cognition/apps/flows/audit checkpoints and durable request/task/event trace IDs are deployed in the 16 October Core | Actual PostgreSQL poison-audit isolation, other-consumer progress, quarantine, cold restart and explicit replay passed; public migration 103 applied successfully after a fresh snapshot |

## Public delivery and current work

The connected workspace is publicly running on `b0811f8`, image
`plant-horses-6593`, deployment `vendune-core-6cc7f557d9`.
Its real model acceptance includes two approved category steps, saved progress
across reload, private/live isolation, a generated multilingual care-note app,
ordinary installed record writes and selected package publication/configuration.
The optional-title renderer correction is also public: a record without an
optional title was saved, selected, edited and saved again without a crash.
English/German content survived the Core rollout. Exact source and results belong to the
[20 October acceptance record](evidence/agentic-workspace-2026-10-20.md).

The preceding Core was `b13aedb`, image `violet-glass-1926`, deployment
`vendune-core-589c44c658`. [19 October delivery evidence](evidence/migration-continuation-2026-10-19.md#hosted-core-delivery-boundary)
records the full green PR checks, identical source trees after merging as
`0aaec005`, a fresh successful snapshot, migration 106 through the existing owner
job and one healthy replica. Google entry, a new empty test shop, retained Studio
session after rollout and the public health endpoint were checked. The separate
Rust image is published; the hosted migration service and its complete public
import/publication/purchase journey are not accepted yet. This does not extend
the earlier Storyfront purchase acceptance to a new purchase on this image.

The preceding accepted agentic-commerce Core was `d5c4724`, image `smiling-driving-6446`, deployment
`vendune-core-58f5569684`. The [18 October agentic-commerce acceptance](evidence/agentic-commerce-hosted-2026-10-18.md)
records the full required CI on `dd19c22`, merged as `1bb2e5e`, and identical
production input trees. One healthy replica served actual native cart-transfer and
original embedded Storyfront purchases, return and empty carts after reload.
Inward Shopify variants remained private. No migration or database privilege
change was needed. The original Experience remains `b40b386`, image
`educated-sort-2532`; it was not redeployed.

The earlier receipt-PDF Core was `25b354e`, image `wise-authority-6674`. Its
[PDF follow-up](evidence/receipt-pdf-hosted-2026-10-17.md) preserves the original
invoice identity while repairing Windows-1252 punctuation. Its separate
[18 October Storyfront receipt](evidence/storyfront-checkout-hosted-2026-10-18.md)
retains the earlier order and source boundary.

The preceding Core was `ce5a710`, image `busy-machine-7486`. Its
[buyer/POS receipt](evidence/buyer-pos-hosted-2026-10-17.md) records the full required
100-suite/648-frontend-test check on `eab3534`, merged as `0460521` with an identical
Git tree. All Dockerfile inputs in the image are identical to that verified tree;
later differences are CI review metadata and test documentation. One healthy Core,
preserved carts/session, a native simulated purchase and a fictional POS sale with
one invoice/PDF passed publicly. No migration or new runtime right was required.
Before this rollout, the original embedded Storyfront recheck on `e9369cf` was
held by the browser controller. That receipt accepts no new embedded purchase;
it preserves the exact diagnostic and earlier successes.

The preceding `e9369cf` [UI-caption receipt](evidence/agent-native-workflows-hosted-2026-10-17.md#ui-caption-follow-up-accepted-on-e9369cf) retains its 641 frontend tests, maintenance/readiness and native quote captions. Rust, schema and runtime contracts remain unchanged from the fully tested `d939257` backend. The [release and configured-model receipt](evidence/agent-native-workflows-hosted-2026-10-17.md#follow-up-accepted-on-d939257)
records full required CI, snapshot, successful maintenance/readiness and preserved
merchant sign-in. The original natural-language request now produced a valid
0.1.3 quote-review proposal through the configured model. Direct package comparison
preserved the old order contract and every data/UI/access section. Explicit private
installation and selected publication passed; the old order remained unchanged.
The prior two public refusals retain their earlier image and evidence.
The [preceding native order receipt](evidence/native-app-workflows-hosted-2026-10-17.md)
retains its guarded purchases and old/new workflow versions. This release did not
redeploy the private Experience service or newly accept the original embedded
Storyfront checkout; earlier results retain their own source boundary.

Earlier deliveries retain their source and acceptance boundaries:
[product fields and original embedded checkout, 17 October](evidence/native-app-fields-hosted-2026-10-17.md),
[agent authority, 16 October](evidence/agent-authority-hosted-2026-10-16.md),
[configuration summaries](evidence/configuration-summary-hosted-2026-10-16.md),
[platform hardening](evidence/platform-hardening-hosted-2026-10-16.md) and
[Studio release](evidence/studio-release-hosted-2026-10-16.json).

## Evidence and reference guides

- [Hardening design and owners](platform-hardening.md): architecture detail, not another release status.
- [Historical delivery audit](delivery-audit-2026-10-15.md) and [release record](current-release.md): dated evidence.
- [Testing](testing.md), [formal scope](formal-verification.md), [capacity measurements](benchmarks.md).
- [Changelog](../CHANGELOG.md): implementation notes belong here, not in the README.
