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
killed translation worker also pass locally. All 724 frontend regressions pass;
final backend/full verification is in progress. Public configured-model/browser
acceptance and public rollout of this extension have not yet been completed.

The one-backend transaction-pool checks additionally exposed nested database
acquisition in publication diffs, reviewed app staging and app reactivation.
These paths now reuse the locked package snapshot or existing transaction,
retaining current model/action/PII rights, environment ownership and digest/CAS
checks. Activation uses the same tenant/app package fence as installation and
record writes. The required pooler suite retains staging and collection tests.
