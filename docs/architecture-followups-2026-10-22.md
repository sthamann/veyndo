# Make the existing platform easier and faster — 22 October 2026

These are proposed next improvements, not additional features shipped by the
merchant-catalogue change. Codex consulted the actual Claude CLI model
`claude-opus-4-8[1m]` using selected public repository documentation and a bounded
change excerpt. Claude had no repository tools or production access. Its suggestions
were checked against the existing owners where indicated below; this is not an
independent whole-repository audit.

## 1. Finish a catalogue in one connected workspace

**Merchant task:** “Import these products, prepare missing German text and images,
and show me exactly what is ready to publish.”

Connect the existing intake rows, native product records, selected translation jobs,
image jobs and selected publication review with one readable progress view. A product
can separately show text ready, image awaiting review, inventory unset and private
preview ready. Each action opens the existing native editor and returns to the same
selection. Show the source of imported facts and clearly distinguish generated sample
content. Do not invent inventory or copy private test stock into the live shop.

Keep `commerce/catalog_intake`, translations, media jobs and staging as the writers;
the new part is their bounded shared view and durable references. No new import
catalogue or agent queue is needed. This turn implements direct composer attachment,
source handoff and selected publication; a fully connected job-by-job view is follow-up.

**Acceptance:** import 20 products, fail two image jobs deliberately, reload, resume
only those jobs, review the selected translations and publish three products. No
other products or operational inventory change.

## 2. Make every app feature behave like the native feature it extends

**Merchant task:** add a material selector once, then use it in the product editor,
storefront, company approval, order details, search and agent conversation.

Use the immutable package and operation registry as the source for field controls,
permissions, filtering, API/MCP schemas, knowledge projection and current installation
status. Extend the existing package diagnostics to say which requested connection is
missing and link to the exact repair. Keep app-owned settings, code and data inside
the package boundary; do not move app implementation into commerce handlers.

**Acceptance:** install one package in a private environment, use its field from
visual and agent edits, publish a selected version, upgrade it and reopen an older
order. A restricted team member and another shop must see only their allowed fields.
Product-field and configured-order journeys already provide a useful starting case.

## 3. Make running work understandable across agents and integrations

**Merchant task:** see why a translation, marketplace sync or migration is waiting;
stop or continue it without accidentally repeating a paid action.

Expose a common progress shape over the existing jobs: current stage, completed
result, review required, provider uncertainty and allowed next action. Share small
Rust lease/admission helpers only where the existing semantics are actually the same.
Keep authoritative queues in their current services and preserve tenant fairness,
actor checks, trace links and cancellation fences.

Claude suggested one durable-work primitive. The useful part is consistent progress
and tested fencing. A single retry rule for payment, read-only extraction and model
inference would be wrong: an uncertain payment must not be blindly repeated. A
connector push should join an agent plan through its real job reference and result,
not through a second planner or a polling loop holding a database connection.

**Acceptance:** one task combines product preparation, translation and a connector
push; kill a worker during the external step. Resume completed local steps exactly
once, expose uncertain delivery explicitly and retain current withdrawal/stop checks.

## 4. Remove repeated product reads before adding more infrastructure

**Merchant task:** large imports and long marketplace orders stay responsive while
customers continue shopping.

The source already contains `localization::hydrate_products`, so Claude's suggestion
to introduce the first common hydrator is not needed. One concrete opportunity is
`commerce/external_orders::import_external`: its line loop performed a translation
query per product and scanned locked product rows repeatedly. The 23 October change
loads all names in one query and indexes the locked rows by ID. It preserves this
import's locale-first parent/variant precedence and existing blank-name behavior.

**Measured acceptance:** orders with 1, 20 and 24 lines in a fifth content language
now issue 1, 1 and 1 translation queries, compared with 1, 20 and 24 before.
The existing maximum is 24 lines, so the original proposed 100-line case would
exceed the contract; a 25-line request is explicitly rejected. Inherited variant
names, NULL/empty names, frozen amounts, foreign-shop names, concurrent final stock
and single native outbox effects pass through the real callback. Further latency
and production throughput measurements remain separate from this round-trip
reduction. [Exact evidence](evidence/external-order-batching-2026-10-23.md).

## 5. Share order persistence rules while preserving each channel's contract

**Merchant task:** an online purchase, POS sale or marketplace import appears as one
consistent order with correct stock, documents and follow-up Flows.

Claude proposed routing every channel through external-order input. The source shows
why that would be too broad: a marketplace import retains an already accepted external
price/payment snapshot; native checkout computes and authorizes a new purchase.
Preserve that distinction. Both already use native inventory/app lifecycle owners.
Inspect and extract only genuinely duplicated transactional persistence/outbox checks,
then test them across the real entry points. Do not turn an external historical
payment into a new charge or treat a B2B approval as an ordinary imported field.

**Acceptance:** concurrent POS, native/UCP and imported marketplace purchases contend
for the same final stock. Each admitted sale has one order and one native downstream
effect; replays stay idempotent and failures cannot oversell or invent payment capture.

## 6. Return useful release feedback sooner

**Developer task:** find a broken UI test quickly while the complete Rust and
database checks continue, then promote the already built immutable runtime image.

The current workflow runs compilation, formal mutations, frontend verification and
native integration sequentially. In PR #193, formal mutation checks took 5m08 and
frontend verification 4m01 before native integration started. These are observed
step durations, not a projected speedup.

A further bounded Claude review proposed separate Rust, frontend and integration
jobs. Start with the smaller safe split: cheap source/scope admission, then frontend
in parallel with the existing Rust/formal/native lane. Rust unit and HTTP integration
coverage currently depend on the same instrumented binaries and environment; do not
separate them without an explicit matching binary/profile/toolchain artifact contract.
Keep the existing conservative docs/frontend/full classification and a required
aggregate that rejects failed, cancelled or unexpectedly skipped required lanes.

Keep database fixtures and coverage profiles fresh. Retain authorization, privacy,
revocation, payment replay and stock checks as required work. Publish per-lane coverage
artifacts and combine their actual reports before enforcing the existing floors.
Do not cache business state or weaken branch protection to obtain a faster green run.

**Acceptance:** the same changed source and deliberately broken UI/privacy cases
produce the same final verdict; the UI failure appears independently of Rust's
duration. Measure total wall time and runner consumption before claiming improvement.

## Suggested order

Complete the connected catalogue progress first, then the app connection diagnostics
and common job view. The confirmed marketplace translation hot path is a small,
measurable performance change. Broader order persistence refactoring should follow
its cross-channel concurrency test rather than begin with a new architecture layer.

Claude also raised platform metadata consuming app-record quotas. The excerpts did
not prove that all those workloads share a single quota; inspect actual accounting
and measured usage before reserving a separate capacity class. No unlimited exemption
or new per-app tables should be added based on that hypothesis.
