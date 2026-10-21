# Completing the connected merchant workspace

Implementation sequence approved on 21 October 2026. This page tracks the remaining
work after the publicly accepted [20 October workspace](agentic-workspace.md).
It is a delivery plan, not a claim that every item below is already available online.
[Current public status](status.md) remains the release entry point.

| Order | Merchant outcome | Completion evidence |
| --- | --- | --- |
| 0 | Apple sign-in returns to the selected Studio shop | Correct Service ID return URLs, real sign-in, reload and logout. Apple Developer authentication is currently required. |
| 1 | Prepare a selected collection, translations and landing page together | Exact product scope, private native/app drafts, progress, interrupted task continuation, current rights, real preview and selected publication. |
| 2 | A material/dimensions app works throughout the shop | Product configuration, surcharge, cart, order, saved selection, reorder, rights, API/MCP, relevant UCP/knowledge projection and immutable upgrade. |
| 3 | Find actual missing data and prepare useful corrections | Native current records, identified gaps, explicit evidence and reviewed bounded proposals; no invented product facts. |
| 4 | Reuse accepted work as a configurable Flow | Native action mapping, parameters, explicit actor/limits/review, current rights and actual outbox execution. |
| 5 | Compare rules against past orders safely | Authorized frozen inputs, original native calculation and meaningful diffs without creating orders, payments or messages. Recalculation does not establish a revenue effect. |
| 6 | Complete inward shop migration and an external integration | Saved source mapping, private destination data/layout, selected cutover and purchase, plus observed external destination result. Local provider fixtures remain separate evidence. |
| 7 | Keep contracts, money and delivery consistent under load | Exact authoritative amounts and PHP differential cases, generated API contracts, measured bounded/fair workers, required CI and public deployment. |

## Collection preparation: current development

The first extension uses the existing Rust task worker, translation queue and
site-builder app; it adds no independent orchestration service or app tables.

An explicit `productIds` array on `merchant.translations.create` restricts a job to
1–1,000 distinct current-shop products. Missing selection preserves the historical
whole-catalogue API behavior. Empty, duplicate, malformed and unavailable IDs are
rejected. A collection operation inside an agent work plan always requires an
explicit selection. Selections may also reference a product created by an earlier reviewed native step. Unknown IDs and references to later creates are rejected before approval. The selected IDs survive a worker restart; product contents
are read when the draft is generated and applying that draft checks its original
product revision. This is not a snapshot of catalogue text at queue time.

A private reviewed plan can combine native category/product operations, scoped
translation preparation and managed page/app saves. Translation preparation yields
the task worker while its existing translation worker runs. The task advances only
after the drafts are ready. A failed child stops subsequent steps. Explicit task
continuation resumes failed child work and retains completed operation receipts.
Child creation and its task link commit together. A dead translation worker stops with an explicit-continuation error instead of automatically repeating a possibly charged model call. Terminal child results wake the existing task scheduler; other waits yield for five seconds and keep no database backend. The child retains the parent trace. Each generated draft stores bounded provider/model, token-usage and registered prompt-version evidence, without copying prompt text or credentials into the receipt. Native admission cases include null/empty/duplicate, forged-object, SQL-looking and instruction-like selections. This corpus tests actual admission, not semantic translation quality. Cancellation invalidates the
child lease; the original session, current membership, private preview admission
and shop emergency stop are checked before inference and before storing its result.
Completed translation drafts still require their own review/apply action. Completing
a preparation task never publishes pages or product text automatically.

The conversation links to the actual translation job. Use the existing native
product/page editors for manual adjustments, the private storefront preview to see
them, and the selected-release review to publish only the chosen configuration.

Local HTTP/PostgreSQL acceptance exercises one category, an existing product,
a newly created selected product and a native landing page, deliberately invalid
translation output, a fresh process, explicit continuation and selected publication
of the page alone. Native category revision remains one; other product changes
stay private. Cancellation during inference, original-session revocation and a
killed translation worker also pass locally. PR #177 passed its full verification and is publicly deployed with migration 107.
The public configured-model task exposed a provider schema error (fixed by deployed
`693dd33`) and then an unknown app field. Deployed `40b4a97a` adds current app
contracts and one bounded model repair. The continued public task reached page
block validation. The app-owned contract now describes block IDs, localized text,
product selection and form/extension limits explicitly, with a native-validated
example. Rejections identify the block index and property without echoing content.
The continued public plan now reaches review. Execution exposed an incomplete
product edit after its category was saved. Native category-only edits and pre-review
product-shape validation are deployed as `9d70e60`. Continuing that exact saved
public task completed all five steps; both Italian translation drafts were reviewed
and applied in the private environment. The category was retained instead of being
created again. Browser verification found two additional editor handoff issues:
translation-review links reloaded into the live shop, and ordinary page editing
required the optional form receiver. Repairs in PR #182 are publicly running as `498ced45`: translation review
retains the private environment and ordinary page editing no longer requires the
optional form receiver. The private Italian preview shows exactly both selected
products. A second configured-model request shortened the headings and moved the
existing descriptions unchanged into paragraph blocks; explicit approval applied
that correction, and the native preview reflects it. Selected publication exposed
a dependency-order defect, repaired and publicly deployed in `be620bfd`. All six
selected units published together, and the public simulated purchase retained the
Italian product name and left an empty cart after return. Published page text still
used the interface locale; the app-owned content-locale repair is publicly running
as `f3255dab`, with headings, paragraphs, exact products and title observed in the
browser. See the current status page.

The one-backend transaction-pool checks additionally exposed nested database
acquisition in publication diffs, reviewed app staging and app reactivation.
These paths now reuse the locked package snapshot or existing transaction,
retaining current model/action/PII rights, environment ownership and digest/CAS
checks. Activation uses the same tenant/app package fence as installation and
record writes. The required pooler suite retains staging and collection tests.

## Material and dimensions: next development step

The app-owned `1.0.1` pattern adds the existing material records to the native AI
context and namespaced graph, shared by authorized API/MCP/public reads. Local
acceptance now completes a second independently approved purchase after saved-input
reorder and material/rule changes, checks idempotent order/stock effects and keeps
the first order immutable. The original `1.0.0` definition and workflow tests stay
inside the plugin directory. The hosted private browser journey now completes
material/dimensions configuration, simulated EUR 417 purchase, empty cart return,
native order/Flow inspection and immutable order display after a material update.
Independent B2B approval and saved-input reorder still need hosted browser
acceptance. [Evidence and two continuation repairs](evidence/furniture-browser-2026-10-21.md).

The expanded one-backend check also caught a nested settings read when saving
roles. Role writes now use the existing locked commerce configuration reader in
their current transaction. Current delegation and revision checks remain in the
same owner. Required transaction-pool acceptance includes roles, native object
extensions, material graph/upgrade/reorder and UCP purchasing.

## Product gaps: current hosted acceptance

The public assistant inspected one selected private product, identified missing
German text/media and prepared a translation job for exactly that product.
Separate review/apply produced visible German storefront text while preserving
price and stock. [Observed scope and remaining limits](evidence/product-gaps-2026-10-21.md).
This establishes a bounded correction path; it does not claim whole-catalogue
coverage or completed image generation.
