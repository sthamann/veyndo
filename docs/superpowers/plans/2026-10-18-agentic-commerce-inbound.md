# Inbound agentic commerce implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline. Session instructions prohibit unsolicited delegation.

**Goal:** Accept external shopping-agent carts and external-shop catalogues into Veyndo, with one merchant control centre and the existing native commerce, private review and release paths.

**Architecture:** UCP is a protocol adapter to native carts, consent and the existing single-use checkout handoff. External supplier formats and Shop MCP belong to an app package; catalogue intake remains the only native reviewed-creation owner. Storefront UI and browser agents share commands, while model changes retain existing sandbox proposals.

**Tech Stack:** Rust/Axum/PostgreSQL, React/TypeScript, native app manifests, existing HTTP/provider and frontend tests.

**Spec:** User instruction of 18 October: execute recommendations 1–5, with Shopify and other provider shops coming INTO Veyndo, never an automatic outward Shopify integration.

## Global constraints

- Preserve tenant/channel/current-role admission, private staging, revisions and selected publication. Imported rows are not an authorization to republish or resell third-party stock.
- No provider credentials in the browser, task exports or release payloads. No external charge, email or paid provider test without a configured, authorized provider.
- Production first-party implementations remain Rust. Provider code stays under extensions/apps/.
- Interface text EN/DE/FR/ES; existing content-language inheritance. No duplicated pricing, stock, cart or checkout engine.
- Google merchant approval and geographic rollout, real payment settlement and Muse partnership access remain external acceptance dependencies. Never label them connected from schema presence.

## Review focus

- Foreign tenant/channel, private channel and preview cannot recover/consume a transferred cart.
- Single-use handoff, changed cart and repeat purchase cannot duplicate effects.
- Consent is opt-out unless explicit, has server-owned descriptions, requires applicable contact data, persists to the immutable order.
- External content and URLs cannot supply instructions, private-network access, mismatched currencies, credentials or unverifiable merchant authority.
- UI/agent calls serialize against current revisions and never expose cart capabilities or complete a purchase silently.

### Task 1: UCP cart transfer

**Files:** src/ucp/{mod,profile,cart}.rs; scripts/agentic_commerce.py; scripts/testing/suites.json.
**Interfaces:** POST /ucp/v1/carts consumes UCP line_items/currency/buyer and native context; returns native totals and canonical continue_url containing a short-lived single-use handoff fragment. Reuse checkout_handoff::issue and existing consume.
- [ ] Add HTTP regression for advertised capability, transfer, original token revocation, foreign/replay denial, native order and idempotent completion; observe current 404.
- [ ] Implement through new_cart_context/set_cart/cart_json and existing handoff, never use an arbitrary requested return origin.
- [ ] Run agentic_commerce, checkout_handoff and b2b_ucp against isolated PostgreSQL; commit.

### Task 2: UCP consent and payment acceptance

**Files:** src/ucp/{consent,document,mod,profile}.rs; scripts/agentic_commerce.py; docs/agentic-commerce.md.
**Interfaces:** buyer.consent contains registered purpose/segment decisions; current private cart is authoritative. Profile advertises buyer_consent only with the implementation. Completion reuses native checkout and payment uncertainty handling.
- [ ] Add failing create/update/read/complete tests: opt-out defaults, explicit consent, missing SMS/email contact, forged metadata, preservation, cross-tenant denial.
- [ ] Implement bounded typed consent validation/projection and use native legal owner where choices map to existing purposes. Preserve consent on update omission and in order snapshots.
- [ ] Test native simulated purchase/refund and configured provider fixtures; document that fixtures are not real settlement. Commit.

### Task 3: Inbound shops and catalogue adapters

**Files:** extensions/apps/catalog-import/; src/commerce/catalog_intake/{mod,prepare,schema,csv}.rs; frontend/src/admin/catalog/{CatalogIntake,catalog-intake-model}.tsx/ts; shared intake vocabulary/tests.
**Interfaces:** merchant.catalog.prepare gains deterministic shopify_csv and shop_mcp modes. Returns native editable drafts and source provenance; merchant.catalog.save retains explicit private approval. Supplier data never redirects orders to the supplier checkout.
- [ ] Add parser/provider regressions for variant rows, inherited title/image, HTML, currencies, response limits, error payloads and private URL denial; observe failure first.
- [ ] Implement bounded app-owned adapters and expose them in the existing intake chooser without requiring a model for deterministic data.
- [ ] Run catalogue HTTP/MCP/private publication tests and UI tests; separately verify public Shop MCP read only. Persistent authenticated Shopify sync is a separate app-settings/service contract, never falsely represented by a one-off import. Commit.

### Task 4: Merchant AI channel control centre

**Files:** frontend/src/admin/channels/{AgenticChannels,agentic-channel-i18n}.tsx/ts; src/ucp/readiness.rs; channel workspace; operation registry/schema as required.
**Interfaces:** permission-scoped readiness reports actual protocol/local configuration and explicit provider approval unknown state; current channel selection is preserved. Imports open Task 3 native private intake.
- [ ] Add UI/HTTP tests for current grants, actual capabilities, local-vs-provider readiness and selected shop/channel; observe missing entry first.
- [ ] Implement responsive provider cards, actionable setup and inbound catalogue entry, without activating a connection on GET or inventing approval/payment readiness.
- [ ] Run rights, localization, responsive/browser and isolation regressions; commit.

### Task 5: Shared storefront commands and agent design workflow

**Files:** frontend/src/storefront/shell/{storefront-actions,useStorefrontActions,useStorefrontController}.ts; site-builder app UI; tests/unit; docs.
**Interfaces:** native UI and browser-agent tools share catalog/cart commands with bounded schema, current token/revision, no token returned, and explicit buyer checkout review. Design assistance remains in the existing app-owned drawer and proposal owner.
- [ ] Add command/WebMCP lifecycle, invalid input, concurrent revision and no-silent-purchase tests; observe missing behavior first.
- [ ] Share actual storefront commands; register supported WebMCP tools with cleanup, excluding automatic financial completion. Improve actual preview/design review entry and source/app diagnostics through existing owners.
- [ ] Run complete frontend build, tests, architecture/localization and affected visual-workspace/browser regressions. Commit.

### Final integration

- [ ] Update README links, handbook/current status, operation/source inventories and CHANGELOG with actual implementation and explicit remaining provider gates.
- [ ] Run format, structure, formal-review/mutations, Rust unit/clippy, affected HTTP/provider suites and complete frontend checks. Review full diff; do not weaken gates.
- [ ] Run full purchase return/empty-cart and private catalogue publication workflows on the resulting build. Publish code/deploy only after checks; public rollout is separate from local success.
