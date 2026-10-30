# Connected commerce: implementation checklist

Requested 30 October 2026. This is the dedicated checklist for every task in the
supplied Fall 2026 comparison. It records implementation and acceptance separately.
The supplied comparison is the product brief; vendor availability must be checked
against current primary documentation before shipping each external adapter.

## Completion rule

A checked task means its real user journey works through existing native owners,
with current permissions, tenant/channel isolation, languages, revisions, sandbox
and selected publication. Record exact tests, browser evidence and deployment
separately. A mock, a plan, a link to another screen or an API-only shopper run is
not a completed browser journey. No simulated metric is a conversion prediction.

Use existing Rust workers, tasks, app records, native operations, Flow/outbox,
settings, currencies, history and release machinery. No parallel queue, scheduler,
identity, pricing owner or per-app database tables. Provider code remains app-owned.
Inward migration remains Shopify/other systems → Veyndo.

## Ordered tasks

### 1. Agent suggestion → private change → tests → review → publication

- [x] Link an applied native proposal to customer tests with actor/channel admission and its source revision/digest.
- [x] Record start/end publishable configuration digests and show current/stale/changed/legacy evidence.
- [ ] Complete the combined executable plan and rendered evidence for all target domains.
- [x] Reuse saved fictional customers; show observed outcomes, errors and native order references.
- [ ] Add rendered desktop/mobile checks with actual screenshots and failed steps.
- [ ] Cover design, discount rules, company purchasing, app behavior and checkout through their owners.
- [x] Show saved actor-private API customer tests and freshness beside native selected-release diffs; reopen the exact sandbox, channel and test.
- [x] Verify native proposal → approved private price → attributed purchase → selected publication, including revoked authority, stale/replayed selections, retained unrelated changes and unchanged operational state.
- [x] Verify the real Studio login, saved-result reopening, private channel context, selected publication and retained history after reload against native APIs.
- [x] Open the actual current sandbox storefront beside a saved test with its channel/language, fresh report admission and desktop/mobile widths; verify navigation and selected publication.
- [ ] Persist automatic browser captures and failed rendered steps as version-bound test evidence in the same review.
- [x] Verify native API denied rights, source changes during inference, configuration changes, cancellation, retry/restart and no live side effects.
- [ ] Verify those same boundaries for the new rendered browser path.

Owners: `src/agent_runs/`, `src/agent_runs/scenarios/`, `src/staging/`,
`extensions/apps/site-builder/`, existing B2B/app/checkout owners and
`frontend/src/admin/scenarios/`. First gap: API scenarios currently do not render
or inspect pages and cannot prove mobile usability or a company-buyer journey.

### 2. Whole-shop design workspace

- [x] Compare native home and saved content pages in a bounded overview; overlay the unsaved draft and retain agent input, dirty state and undo when returning.
- [x] Resolve global, channel-home and page-specific appearance through the existing renderer and content language.
- [ ] Show home, product, category, cart and content templates together using their actual renderer.
- [ ] Edit shared header/footer/type/colors/cards with visible inheritance and affected pages.
- [ ] Apply one reviewed agent request across selected pages with individual revision conflicts.
- [ ] Include installed app elements in the same selection, preview and inspector.
- [ ] Verify responsive layouts, keyboard operation, undo, save/reopen and selected sandbox publication.

Owner: `extensions/apps/site-builder/`; reuse native storefront presentation and
installed app surfaces. Storyfront keeps its original editor.

### 3. Scheduled campaign packages

- [ ] Bundle landing pages, translations, selection, prices, promotions and allowed app configuration.
- [ ] Make shop, channel, locale, destination, timezone, start and end explicit.
- [ ] Preflight translations, rule conflicts, dependencies, exact revisions and actor rights.
- [ ] Schedule through the existing durable worker; recover after restart without duplicate publication.
- [ ] End a campaign by restoring only its unchanged configuration; surface conflicting later edits.
- [ ] Preserve orders, payments, stock movements and secret app settings throughout.
- [ ] Test start/end, cancellation, DST/timezones, partial failures and revoked authority.

Owners: `src/staging/`, native domain save functions, existing Flow/task workers.

### 4. Shared external-channel product mapping

- [ ] Define a provider-neutral typed field mapping and channel overrides over the native product.
- [ ] Adapt existing Marketplace mapping instead of creating another mapping store.
- [ ] Show missing/invalid fields, category requirements, images and a channel preview for Amazon/eBay/Google/agents.
- [ ] Review AI mapping suggestions before saving; preserve native price, inventory and purchase terms.
- [ ] Validate translation fallback, large catalogue batches, revisions, permissions and provider errors.

Owners: native channels/catalogue and `extensions/apps/marketplaces/`; provider
requirements/protocols remain in app packages.

### 5. App, agent and commerce analytics

- [ ] Add versioned event and metric declarations to the existing app contract.
- [ ] Validate event payloads, package identity, bounded ingestion and consent/retention centrally.
- [ ] Support consultation, configuration, quote, proposal, form and digital-delivery events.
- [ ] Combine activity with authoritative native order totals without trusting app revenue claims.
- [ ] Expose readable reports and agent queries with current read/PII rights and explicit attribution scope.
- [ ] Test schema changes, duplicates, malicious fields, foreign tenants, deletion and retention.

Owners: app manifest/records/event gateway, visitor intelligence, native orders,
knowledge projections and the existing shared grid/report UI.

### 6. WebMCP completion

- [x] Inventory registered browser tools: search, read cart, add product, replace items and open checkout review. Add the missing first-product operation through the existing native command.
- [x] Keep these browser requests on native cart/checkout permission and revision paths, with cancellation and shop-context fences.
- [x] Test all five actual browser tools against native Rust/PostgreSQL in the in-app browser, plus negative/unknown products and reload; test unavailable-browser fallback and shop fencing through the native React hook.
- [x] Document operation coverage and distinguish local adapter tests from pending browser acceptance.

### 7. Optional Shop customer login

- [ ] Verify current Shop OIDC registration/discovery and external-shop access requirements.
- [ ] Implement as an optional customer identity adapter with PKCE/state/nonce, verified issuer/audience and explicit account linking.
- [ ] Configure through existing identity/settings ownership; never silently merge accounts by email.
- [ ] Test callback replay, denied consent, wrong issuer, revoked configuration and returning login.
- [ ] Record external app registration separately from local adapter completion.

### 8. Versioned UCP Ask adapter

- [ ] Verify the current draft schema and pin its protocol identifier/version.
- [ ] Answer shipping, returns and service questions from public approved shop knowledge with country/language/channel scope.
- [ ] Share native knowledge admission and source attribution; exclude private/PII material.
- [ ] Test discovery, request/response contract, unsupported versions, missing sources and injection.

### 9. Universal Checkout access assessment

- [x] Verify actual application/access and merchant eligibility requirements.
- [x] Record whether Veyndo can participate independently; do not imply UCP alone grants access.
- [x] Retain native checkout: the documented current merchant path is Shopify-only, with wider merchant support announced. No Veyndo adapter is advertised or activated.

Decision and sources: [external access assessment](../integrations/connected-commerce-access.md).
This completes the access decision, not a provider integration or approval.

### 10. Muse, Gemini and other assistants

- [ ] Verify each current integration surface, account requirements and supported commerce actions.
- [ ] Reuse existing MCP/UCP adapters and per-agent authority where available.
- [ ] Publish concrete setup and compatibility tests; record unavailable access as an external prerequisite.

### 11. Connected POS

- [ ] Transfer saved baskets between authorized employees/devices with ownership and concurrency checks.
- [ ] Import an online basket by explicit authorization and reprice through native checkout.
- [ ] Add device enrollment/revocation and scoped session visibility using existing access controls.
- [ ] Improve inventory count/correction through native inventory events and audit history.
- [ ] Verify concurrent handoff, stale prices, revoked devices and order/receipt continuity.

### 12. Agent-created digital products

- [ ] Complete upload → reviewed product draft → private preview → simulated purchase.
- [ ] Deliver a protected download and existing order-email/Flow action from an app-owned package.
- [ ] Preserve purchase entitlement, private file access, refunds/revocation and repeat delivery semantics.
- [ ] Test foreign/guest access, expired links, replay, missing mail provider and complete buyer return.

### 13. Translation freshness and RTL

- [ ] Mark translations stale after source content changes without overwriting human translations.
- [ ] Reuse translation jobs for selected changed fields with revision checks and explicit apply.
- [ ] Support direction from selected content language in storefront, editor preview and native app elements.
- [ ] Verify Arabic/Hebrew/Urdu, mixed-direction numbers/URLs, icons, grids, drag/drop and checkout.

## Shared delivery

- [ ] Update relevant guides, operation/API/MCP schemas and examples with each implemented task.
- [ ] Keep this checklist linked from current status and record tests beside completed tasks.
- [ ] Update README and public website after actual delivery; refresh images where UI changes.
- [ ] Run affected tests during development; retain the daily complete-suite cadence.
- [ ] Verify the delivered build and representative public journeys without real payment charges.

## Work log

30 October: read the complete brief, updated from GitHub main `20dd5dad`, created
branch `feat/connected-commerce-followups-20261030`, identified existing scenario,
site-builder and release owners. Implementation starts with task 1. No new feature
is marked complete by creating this checklist.

30 October, task 1 implementation: applied-proposal entry, server-derived source
revision/digest, native actor/channel checks before/after inference, and staging
projection freshness are implemented locally. Native PostgreSQL/HTTP cases pass
with actual separate restricted system/tenant logins and a local model fixture.
Targeted UI tests verify retained briefs, source removal, repeat attribution and
scope changes. Existing saved-customer functionality is reused. Rendered automatic
journeys, authenticated B2B scenarios and the combined release review remain open.

The additional size-limit regression installs a native app with 1001 configuration
records. Old reports and new purchases remain available when the bounded snapshot
cannot complete. [Scoped native checks and component captures](../evidence/connected-commerce-2026-10-30.md).

The actual merchant model wire also produces a private price proposal which is
approved through the native task endpoint and then exercised by an attributed
purchase. The original live price stays unchanged. The local inference response
is deterministic; no creative quality or rendered journey is inferred from it.

30 October, task 2 first slice: the page overview uses the actual shared renderer,
keeps at most four frames mounted, and preserves page/theme inheritance and the
unsaved draft. Desktop and mobile component previews were inspected. The independent
review found a same-page return resetting the dirty baseline; the guarded return
and a real editor regression now preserve dirty state and undo. Product/category/cart
template editing and one agent request across pages remain open.

30 October, task 6: all five actual WebMCP tools were discovered and called in the
in-app browser against the isolated native Rust/PostgreSQL shop. Product addition,
quantity changes, checkout review, negative/unknown product rejection, empty-cart
restoration and re-registration after reload passed. Screenshot and exact scope
are recorded in the linked evidence. Public deployment remains separate.

30 October, task 1 release-review slice: saved customer results and freshness now
appear beside the existing native selective-release diff. Opening a result retains
its sandbox, channel and saved test. Environment/request changes immediately hide
old selections, reports and history; rejected reads and navigation remain retryable.
Targeted component tests and desktop/mobile component previews cover this slice.
The complete rendered shopper and publication journey remains open.

30 October, native publication acceptance: the actual proposal/apply/customer-test
path now continues through the existing digest-bound release endpoint. Only the
tested product price reaches the live fixture. Private and live order snapshots
and stock remain identical; unselected channel/app changes retain their digests.
Saved attribution and configuration evidence remain readable and current. Missing
approval, stale selections, revoked authority and replay reject; the successful
publication creates exactly one release and one native outbox event.

The separate actual-browser acceptance signed into a native development shop,
opened the saved result, followed it to the same sandbox/channel, returned to the
release view and published only the product. History survived reload. Final native
reads confirmed the new live price, one private order and zero live orders. These
new screenshots contain real fixture data. Automatic rendered shopper execution
and combined captured preview evidence remain open.
