# Agentic inward shop migration

User-approved product: an independent Rust application migrates Shopify, WooCommerce,
PrestaShop, Magento 2 and Shopware 5 into Veyndo. A connected merchant describes the
goal, inspects source coverage and mappings, previews native data/design privately,
checks results and deliberately cuts over. Existing imports are not full migrations.

The application owns provider adapters, extraction, canonical source records,
versioned mappings, provenance and migration UI under extensions/apps/migration/.
The host owns generic native import admission and effects. No provider logic is
copied into system directories. No Python serving process or arbitrary source build.

Required domains: products/variants/categories/media/translations, CRM customers and
addresses, immutable historical orders, source reviews, coupons, pages/navigation,
branding and redirects. Unknown plugin behavior must become an explicit gap, never
silent loss. Historical money is exact; no invented stock, consent, verified purchase,
account identity, settlement, mail or inventory movement. Source read access cannot
authorize destination writes. API profiles and completeness are versioned by source.

Execution reuses native app gateway, callback identities, current compound rights,
encrypted installed settings, immutable manifests and existing durable app jobs.
Migrations use coarse batches/checkpoints; never place millions of source records in
bounded managed-app records or create tables per shop/model. A source snapshot may
be streamed from an export. Replays preserve stable source IDs and input digests;
changed snapshots/conflicts are visible. Preview and live historical intake are
distinct. Cutover never promises zero downtime without a source-specific final fence.

AI proposes mapping and editable design through central inference and the existing
site-builder proposal/review owner. Inputs are untrusted; credentials and unnecessary
customer data never enter prompts. The merchant can choose original/modernized/new
design, review before/after and accept selected changes. Deterministic transport
does not require a model per row. Public provider access still needs real source
credentials and provider admission. Browser mocks are not live-source acceptance.

Acceptance: native extraction/normalization for every advertised source; exact money,
cross-tenant denials, replay/conflict, cancellation/revocation and restart recovery;
native product/customer/history reads after import; no ordinary financial/stock/mail
side effects; private layout proposal review; complete simulated buyer purchase;
source count/reference/amount reconciliation. Resource admission and bounds must be
honest. Benchmarks measure real transport/target effects before throughput claims.
