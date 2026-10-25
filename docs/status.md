# Veyndo: current status

Updated 25 October 2026. Start here for the public product, observed journeys and
remaining delivery work. Source code, passing tests and a successful public
journey are tracked separately. All purchases below use **simulated payments**.

## Native extension translation in source

The [Shopware source compiler](shopware-native-translation.md) now emits a regular
native Veyndo discount app from one admitted PHP cart-processor profile. Local
HTTP/MCP tests exercise current rights, private import, exact selected release,
checkout, stored component outcomes, stock and an empty active cart. The same
source fixture completes an original Shopware purchase with the same discounted
goods total. Parser/registration rejection and bounded WIT execution are tested.
This is a local implementation, not a public rollout or general Shopware plugin
virtualization. DAL, decorators, events, migrations, Twig and admin translation
remain open. [Exact acceptance](evidence/shopware-native-2026-10-25.md).

## New optional integration in source

The [Shopware environments app](shopware-compatibility.md) manages a separate
original Shopware 6.7.14.2 through an app-owned Rust controller, native jobs and
private operation records. Its local original-runtime tests exercise plugin
migration/event execution and a Twig App Script. Additional local acceptance
installed FroshTools 3.15.3 through Veyndo and used its original cache interface
and theme compilation. Distinct cell/core hostnames prevent login cookie collisions.
The isolated runtime recipe
includes its own database and workers. This is not a public deployment or universal
extension certification, and it does not synchronize native Veyndo orders/stock
with Shopware. The existing public acceptance below remains unchanged.
[Local extension, checkout and isolation evidence](evidence/shopware-compatibility-2026-10-25.md).

The 23 October release expands selected Lean guarantees to **63 policies / 149
properties**, splits their Rust/Lean owners and tightens Cargo dependency checks.
The subsequent shared discount repair and batched marketplace order localization
also pass complete required CI: **322 Rust tests**, **816 frontend tests**, native
database integration and coverage gates.
[Verification, modularity and release evidence](evidence/formal-modularity-2026-10-23.md).

Release checks report the complete frontend result independently of native
integration. Documentation and website changes outside the packaged runtime also
skip unrelated container builds. Main documentation/frontend checks now start
while an earlier native run continues; only native work shares a queue.
The same required tests, coverage policy and source/report checks remain in force.
[Measured CI results and main scheduling](evidence/parallel-verification-2026-10-23.md)
and [image publication scope](testing.md#image-publication-scope).
These CI improvements are merged through PR #217; the runtime and dated public
journeys below retain their accepted versions.

## What is online now

The latest accepted functional change is **`7bd37916` (PR #211)**, delivered as
Core image `befitting-river-8632` on **23 October at 18:05:26 CEST**. Its serialized
release completed at **18:07:11 CEST**, after a fresh snapshot, successful migration
job and health-checked rollout. Marketplace order import now resolves all admitted
line names in one query while retaining localization, tenant isolation, frozen
amounts, stock locks and replay behavior. Public simulated order **`RAC-7cf70dc0`**
completed afterward for **EUR 59.00**, including **EUR 9.42 VAT**, with the German
lamp name. Return, full reload and the reopened cart confirmed zero items and
retained the disabled personalization choice.
[Exact CI, query-plan and public release evidence](evidence/external-order-batching-2026-10-23.md).

The preceding Core image `dynamic-garden-8477`, source **`363181dd` (PR #209)**, was deployed on
**23 October at 15:14:51 CEST** and completed its health-checked rollout at
**15:16 CEST**, after a fresh snapshot and successful migration job.
Its acceptance observed one running instance, passing health checks and zero restarts.
The shared allocator preserves exact cent rounding for large baskets, and app
price increases reject overflowing totals before changing a quote.
Public simulated order **`RAC-b8059d75`** completed afterward for **EUR 349.00**,
including **EUR 55.72 VAT**, with its German product name. Return and full reload
retained an empty cart and the existing privacy choice. This is a fresh native
checkout acceptance; the dated Storyfront and authentication observations below
retain their original dates.
[Exact CI and public release evidence](evidence/formal-modularity-2026-10-23.md#discount-repair-complete-ci-and-public-rollout).

Core and Studio now include editable catalogue-based test customers from
[PR #203](https://github.com/sthamann/veyndo/pull/203), alongside the connected
customer-scenario, catalogue-preparation, app-diagnostics and visual-shopping
release. Image `loyal-line-5143`, source `2bb5a99f`, activated on **22 October at
19:55 CEST** after a fresh snapshot and successful migration-only job. The public
German-Studio / French-only-channel journey completed two private simulated
purchases and an exact-budget refusal. Reload and reuse retained the original
profiles and orders; the 390 px mobile view fits without horizontal overflow.
The [complete required CI run](https://github.com/sthamann/veyndo/actions/runs/39824617289)
passed on the final source, including all 816 frontend tests and the native
database integration. PR #203 merged normally as `35755608`; its complete Git
tree is identical to the publicly accepted `2bb5a99f` tree.
The regular main release then completed at **20:39 CEST**: image
`jovial-steel-7373`, a second fresh snapshot, successful migration job and a healthy
Core instance with zero restarts. The saved cohort remained available after reload.
[Exact runtime and browser evidence](evidence/customer-scenarios-2026-10-22.md#public-catalogue-profile-acceptance).

The preceding catalogue/privacy release was accepted on the same date; its
[earlier exact evidence](evidence/merchant-journey-2026-10-22.md#public-delivery-and-acceptance)
remains available.
The separate Experience service was observed running `b7c29ea6` on 23 October,
including the new film project/subtitle downloads and the earlier four-language
homepage's simulator, catalogue-preparation and visual-shopping entry. The
23 October formal release does not change its original Storyfront pin or checkout
code. The prior combined release, [PR #191](https://github.com/sthamann/veyndo/pull/191),
passed the public two-account company purchase and original embedded Storyfront
purchase/return/empty-cart checks. The approver inbox and reopened orders show their
accepted app configuration. The original embedded journey was repeated against
both final public services on 22 October: `RAC-b39c3fe0`, EUR 59.90, receipt return
and empty original Bag after reload. Native incognito input loaded the iframe on
its first open; an earlier separate extension-controlled tab still timed out.
[Final acceptance and retained counterexample](evidence/customer-scenarios-2026-10-22.md#public-acceptance-after-the-final-rollout).

The connected merchant workspace now supports these concrete journeys:

- Attach a CSV in the conversation, carry a product description or URL into the
  private source workflow, edit the preview and publish selected native products.
- Complete a purchase, return to an empty cart and retain the original revocable
  privacy choice without answering the same prompt again.
- Describe a collection task; prepare a native category, selected product changes,
  translations and a landing page in a private workspace; review and publish the
  chosen changes together.
- Create and configure an app, edit its records, preview privately and publish a
  selected package without publishing unrelated test data.
- Configure a desk with material and dimensions; save the selection, obtain an
  independent company approval and buy. Reorder at the current price while the
  original order retains its accepted configuration.
- Turn completed native work into an event-driven Flow draft with explicit input
  mapping, limits and a fresh personal review before execution.
- Compare a saved rule with an unsaved draft on recorded order-placement inputs,
  with the same native interpreter and no changes to existing orders.

## Private customer scenarios

The customer simulator is online on existing durable agent tasks: one to six
editable fictional profiles, bounded concurrent native shopping, exact budgets,
saved observations, resume/stop and before/after comparison. Designer, installed
sandbox apps and migration targets open the same workbench.
[Usage and exact scope](customer-scenarios.md). **Test customers from my catalogue**
now prepares three editable suggestions from visible channel products, without
customer records or an additional model call. Preview, adoption and test start
are separate actions. Profiles use the channel's enabled shopper languages even
when Studio uses another interface language. Public acceptance used the actual
configured model, exact-budget refusal, Germany/Austria purchases and the earlier
private notebook stock change. The connected catalogue
preparation grid, actionable app-reference diagnostics and visual shopper selection
are included in the combined public artifact; [implementation and browser evidence](evidence/customer-scenarios-2026-10-22.md#connected-catalogue-and-app-follow-through).

## Public acceptance

| Journey | What was observed | Evidence |
| --- | --- | --- |
| Native checkout after import batching | Public simulated order `RAC-7cf70dc0` completed on the new Core for EUR 59.00 with EUR 9.42 VAT and the German lamp name. Return, full reload and reopened cart confirmed zero items. The separate marketplace callback fixtures measured one translation query for 1, 20 and 24 lines, including strict signed tenant scope. | [23 October import release](evidence/external-order-batching-2026-10-23.md#public-purchase-after-rollout) |
| Native checkout after the discount repair | Public simulated order `RAC-b8059d75` completed on the new Core for EUR 349.00 with EUR 55.72 VAT and the German desk name. Return, full reload and the reopened cart confirmed zero items. Exact three-line discount allocations and frozen order values passed both native CI database modes separately. | [23 October discount release](evidence/formal-modularity-2026-10-23.md#discount-repair-complete-ci-and-public-rollout) |
| Catalogue-based test customers | German Studio prepared three French profiles from the channel's only notebook. The EUR 28.89 profile stopped; Germany and Austria orders completed for EUR 28.90 and EUR 29.14 with the stored French product name. Private orders increased from four to exactly six. Reload, profile reuse and 390 px mobile layout passed. | [Public profile preparation and purchases](evidence/customer-scenarios-2026-10-22.md#public-catalogue-profile-acceptance) |
| Visual shopping, catalogue preparation and app diagnostics | Final public cards showed the actual notebook and holder, EUR 63.40 together. Removal survived detail/back; restore retained cart zero. Native purchase `RAC-eb78b7d7` completed for EUR 28.90 including EUR 4.61 VAT; return/reload retained an empty cart and privacy rejection. Five-language readiness opened the correct media editor; app diagnostics retained draft protection. | [Final combined release acceptance](evidence/customer-scenarios-2026-10-22.md#public-acceptance-after-the-final-rollout) |
| Private customer scenarios | Three agents stopped at stock zero; after restoring private stock, two native EUR 28.90 orders completed while the EUR 1.00 buyer still stopped. Exact profiles and saved comparison survived reload. | [22 October simulator acceptance](evidence/customer-scenarios-2026-10-22.md#public-rollout-and-customer-scenario-acceptance) |
| Catalogue from the conversation | Actual composer CSV attachment, editable two-product preview, private save, publication of only the named chair, retained private side table and native image editing. Description and URL handoffs retained the current sandbox. | [22 October public journey](evidence/merchant-journey-2026-10-22.md#public-delivery-and-acceptance) |
| Purchase privacy continuation | Public simulated order `RAC-65c8482b`, EUR 59.00, German product name and EUR 9.42 VAT. Return and full reload retained an empty cart and the prior optional privacy rejection; settings remained editable. Native expiry, revocation, concurrency and company-identity cases also passed in CI. | [Public purchase and tests](evidence/merchant-journey-2026-10-22.md) |
| Collection preparation and selected publication | The configured model prepared five connected steps for two selected products. The same task resumed without duplicating its category. Reviewed Italian translations and the landing page were published together; a EUR 49.90 purchase retained the Italian product name. | [Collection and release history](evidence/release-history-through-2026-10-21.md#21-october-connected-collection-preparation-runs-publicly) |
| Personal workspace and generated app | Current editor context, saved private guidance, editable product filters, two approved native category steps, reload continuation and a generated English/German care-note app with retained records and central settings. | [Workspace browser evidence](evidence/agentic-workspace-2026-10-20.md) |
| Configured company purchase and reorder | First order `RAC-f117d21d`: Walnut Select, 260 × 80 cm, EUR 78 surcharge, EUR 427 total. After a material change, saved-list reorder used Walnut Select Plus, EUR 98 surcharge and EUR 447 total. The final all-browser repetition `RAC-34c09fc1` used separately signed-in buyer/approver sessions; approval and reopened orders displayed those exact values. Return/reload retained an empty cart; the original order still shows its older material and price. | [Public steps and screenshots](evidence/furniture-browser-2026-10-21.md#public-two-account-browser-acceptance-after-the-combined-release) |
| Repeat completed work | A completed task opened as an inactive Flow draft. After explicit activation, one real product update prepared a fresh review; approval created exactly one hidden native category. Completion survived reload and the category stayed private. The test Flow is inactive again. | [Flow browser evidence](evidence/flow-native-work-2026-10-21.md#reusing-completed-work-public-acceptance) |
| Compare recorded rule cases | A EUR 49.90 frozen case did not match the saved EUR 100 threshold and did match the draft EUR 1 threshold. Editing cleared stale results; reload retained the saved revision and unchanged order count. Desktop and 390 × 844 mobile Studio passed. This is condition comparison, not complete historical checkout repricing. | [Rule comparison](rule-history-comparison.md) |
| Repair missing product content | The assistant identified missing German text/media on one selected private product. A scoped translation was reviewed and applied; price and stock stayed unchanged. No completed image-generation claim. | [Product gap evidence](evidence/product-gaps-2026-10-21.md) |
| Original Storyfront embedded checkout | After both 22 October public deployments, the first iframe open loaded normally and `RAC-b39c3fe0` completed for EUR 59.90 with a German lamp name and EUR 9.56 VAT. Receipt return and full reload retained an empty original bag. No retry, user manual test or separate checkout navigation. Earlier extension-controlled tabs had paused/blank document loads. | [Current release purchase and screenshots](evidence/customer-scenarios-2026-10-22.md#public-homepage-follow-through), [21 October acceptance](evidence/storyfront-checkout-2026-10-21.md#final-combined-release-first-load-purchase-and-empty-cart-reload) |
| Native app extensions and workflows | Visual product fields, retained data on upgrade, native grid/filter integration, selected publication and distinct old/new order workflows were accepted publicly. | [Product fields](evidence/native-app-fields-hosted-2026-10-17.md), [app workflows](evidence/native-app-workflows-hosted-2026-10-17.md) |
| Inward agentic commerce | Native UCP transfer purchase, private Shopify variant intake, app declaration diagnostics and original embedded checkout passed. | [18 October acceptance](evidence/agentic-commerce-hosted-2026-10-18.md) |
| Native POS and documents | Fictional POS sale, native invoice/PDF and guarded app-bound completion passed on 17 October. Physical printers and real settlement were not part of that acceptance. | [Buyer/POS evidence](evidence/buyer-pos-hosted-2026-10-17.md), [PDF follow-up](evidence/receipt-pdf-hosted-2026-10-17.md) |
| Browser entry and retained sessions | Public Google entry, workspace selection and single-use Studio handoff repeated on 22 October; reload after rollout retained the authenticated workspace. Password sign-in/reload/logout last passed publicly on 16 October. Apple still awaits its Service ID Save and actual sign-in. | [22 October evidence](evidence/merchant-journey-2026-10-22.md), [browser session contract](browser-sessions.md) |

## App system and architecture

| Area | Implemented foundation | Remaining boundary |
| --- | --- | --- |
| App storage | Shared bounded records, references, indexes, settings and immutable packages; four fixed physical tables replace per-app physical tables. Public legacy-data migration was verified. | Capacity depends on measured workloads; shared storage is not a promise of unlimited throughput. [Storage model](app-data-storage.md) |
| Native object extensions | Versioned product/customer/order/company fields feed native details, grids, exact filters and permission-aware operations. Product lifecycle passed publicly; the other object types have local/CI coverage. | Broader arbitrary object types and every external protocol need their own contract and acceptance. [Extension contract](app-core-extensions.md) |
| Sandbox and app lifecycle | Private previews, current rights, version/digest checks and selected configuration publication use the same native owners. Material upgrades preserve historical orders. | Arbitrary Rust/TypeScript source compilation and hosting are not established by managed app packages. [App system status](app-system-status.md) |
| Agents and model tools | Durable checkpoints, leases, cancellation, reviewed native writes, distinct revocable identities, model allocation limits, emergency stop and OpenAI/Claude/Ollama tool protocols. | Real provider quality and invoiced cost are separate from fixtures and conservative allocations. [Controls](agent-authority-controls.md), [durable work](durable-agent-runs.md) |
| Authorization and database isolation | Current tenant/actor rights, separate restricted SQL roles, strict startup and native API/MCP operation checks. | Every new operation must retain those controls; an earlier audit is not whole-system certification. [Hosted database enforcement](evidence/database-enforcement-2026-10-15.json) |
| Events and workers | Separate cognition/apps/flows/audit checkpoints, durable traces, bounded workers, fenced retries and per-tenant admission. | Fleet throughput, failover and large-catalogue limits require representative measurement. [Rust service ownership](rust-services.md) |
| Contracts, boundaries and money | Generated operation input contracts, five real workspace libraries, exact money primitives and original PHP differential checks. | Response/domain DTOs and root-handler extraction remain incomplete; compatibility calculation paths still contain `f64`. [Hardening owners](platform-hardening.md) |
| Prompts and evidence | Versioned prompt files with IDs/digests; actual provider/admission and injection cases in the registered tests. | Passing admission checks does not establish semantic model quality for every merchant task. [Testing](testing.md) |

## Proposed next improvements

The 22 October merchant catalogue and privacy continuation changes are online and
accepted as described above. The connected image/translation progress view, app-reference diagnostics and
editable visual shopper selection are included in the current public release.
The first measured import improvement now resolves names for a 24-line order in
one query instead of 24. The same query uses existing indexes in a test shop with
200,059 products. Further throughput measurements and shared order-persistence
work remain separate. [Import verification](evidence/external-order-batching-2026-10-23.md).
[Concrete architecture improvements discussed with Claude](architecture-followups-2026-10-22.md)
are proposals, separate from this implementation.

## What remains to finish

1. **Isolate the remaining controlled-browser iframe failures.** A fresh private
   session now completes first load, purchase, return and empty-cart reload with
   native browser input; a normal-window first-open countercheck also passes.
   Earlier extension-controlled tabs reported paused/blank
   documents on the same deployed code. Preserve both observations; the cause of
   those earlier pauses and a broader reliability rate are not yet established.
2. **Complete Apple login configuration.** The new `start.veyndo.ai` callback
   returns `invalid_request: Invalid web redirect url`. The existing Service ID review now contains both new domains and their
   callback URLs; its final Save awaits the requested action-time approval.
   An actual Apple sign-in must then be observed.
3. **Accept the separate hosted migration service.** The Rust application and
   five source protocol fixtures reach private native products, media, pages,
   customer/address records, history, reviews and coupons. Saved mapping/comparison
   and reviewed cutover controls exist. Hosted gateway/callback setup and one
   complete public source-to-purchase journey remain open. [Migration guide](agentic-migration.md)
4. **Accept external integrations at their real destination.** Vercel, Klaviyo,
   HubSpot, Contentful and Algolia apps, Shopware 6 inward product intake and
   existing Shopify/WooCommerce/Slack routes have local fixtures. Actual provider
   activation, Nexus execution and external Vercel checkout need their own
   recorded outcomes. [Integration guide](service-integrations.md)
5. **Measure remaining operational claims.** Real provider payment/mail/refund,
   a recorded restore drill, large-catalogue/multi-worker throughput, complete
   historical checkout repricing and isolated arbitrary-source builds are not
   established by the public demo journeys. Current payment testing deliberately
   remains simulated. [Ordered follow-ups](connected-merchant-followups.md)

The earlier fresh-cart privacy regression is fixed and accepted in the public
native purchase above. Same-buyer company continuation, expiry and withdrawal
were additionally checked through actual native PostgreSQL transactions in CI.

## Start testing

1. [Take the first shop tour](first-tour.md).
2. [Build and privately test an app](app-tutorials/README.md).
3. [Review and publish selected changes](workbench.md).
4. [Understand the shared architecture](production-architecture.md).

The [dated release history](evidence/release-history-through-2026-10-21.md) retains
older versions and their exact acceptance limits. Implementation notes belong in
[CHANGELOG](../CHANGELOG.md), verification contracts in [Testing](testing.md), and
measured capacity in [Benchmarks](benchmarks.md).
