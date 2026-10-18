# Bring an existing shop into Veyndo

The Migration Assistant is an **independent Rust application** with a merchant
workspace under Sales channels. Source-specific code, controls, translations and
its deployment image live in `extensions/apps/migration/`. Core retains generic
native import admission, current authorization and the original domain writers.

This is an implementation and local acceptance record, **not a declaration that
all source shops or the entire migration concept are already accepted publicly**.
See [current status](status.md) for deployed journeys.

## One connected workflow

1. Open **Sales channels → Migration Assistant** and review installation consent.
2. Select the original platform. Save its read-only connection in the existing
   encrypted app settings. Credentials are write-only in the browser and never
   form part of the agent prompt. Pin the applicable API profile/version.
3. Choose products, product images, categories, content pages, customers, original historical orders, reviews or coupons. Inspect the actual
   bounded source records and any mapping limitations. Source language IDs require
   explicit locale mapping. Local historical dates require a confirmed IANA zone.
4. Review destination tax or customer-group choices and explicitly approve the
   exact returned records. Products, images, categories and content pages share a selected
   private environment; products start with stock zero. Select the same environment
   across domains and after reloading. Content pages require the installed Shop design
   package; its exact destination digest is frozen in the reviewed job.
5. Follow the saved native job. Cancel stops subsequent writes. After an uncertain
   interruption, inspect the result and explicitly resume. Stable source identities
   prevent duplicates; changed snapshots produce a conflict rather than overwrite.
6. Open **Shop design**. The handoff selects the same private environment,
   opens its agent and pre-fills the reviewed source URL. Add screenshots and
   prepare the existing reference-design proposal against the actual private preview. Publish selected configuration through the existing
   release path. CRM customers and historical orders are operational data and are
   never sandbox release units. Stock activation is a separate deliberate action.

The contextual agent drawer embeds the existing Studio conversation and central
planner. It does not introduce another chat database, model gateway or execution
queue. The agent can prepare a plan; approving a source record and publishing a
shop remain distinct native actions. A generic migration prompt is not a claim of
automatic semantic equivalence for arbitrary third-party plugins or theme code.

## Current coverage

| Domain | Implemented path | Boundary |
| --- | --- | --- |
| Products | Shopify variants, WooCommerce simple products, PrestaShop/Magento/Shopware 5 source projections; native private product creation | Retains original price, known source stock and source metadata; active target stock starts at zero. Multiple Shopify/Shopware variants use native parents/options; category source IDs resolve to the native category tree. Complex/bundle/combinations still need complete domain mapping. Variable WooCommerce parents are rejected rather than treated as complete variants. |
| Product images | Public source URLs → frozen original-byte digests → native private asset store and ordered product media | PNG/JPEG/WebP, 1 byte–8 MiB each, up to 20 images/product and 10 images/reviewed slice. Source credentials are never forwarded to CDNs; unsupported signed URLs, private/relative source paths and unknown collection profiles require an explicit mapping/export. |
| Customers | Source profile/address normalization → native CRM owner | No password/account credential, marketing consent, verified identity or email-based historical ownership is invented. Existing email conflicts require a reviewed resolution. |
| Historical orders | Canonical source lines, exact minor-unit total, original timestamp/number → immutable native history | No repricing, new payment attempt, ordinary purchase event, stock consumption or invoice allocation. Source payment status is a historical claim, never native PSP confirmation. |
| Categories | Native private tree with stable IDs, localized names/slugs and explicit parent references | Parents must exist before children; missing parents stop the write instead of flattening the tree. |
| Content pages | Source HTML → editable rich blocks → the installed Shop design model | Same package/schema, field/reference validation, history and private release owner. Unsafe links, executable embeds, unresolved media and unsupported markup stop import. No arbitrary PHP/Liquid/theme conversion. |
| Reviews | Original author/text/date/rating → native review moderation | Hidden until ordinary moderation; visible source origin, never a fabricated native verified purchase. Original verification is only a typed boolean claim. Private imported author/provenance requires current product-read and PII rights. |
| Coupons | WooCommerce percent/fixed-cart rules → inactive native promotions | Exact remaining-use snapshot; explicit review before activation, original currency only. Product/customer/shipping/plugin restrictions and malformed limits stop instead of becoming unrestricted. Other provider discount profiles still need explicit mapping. |
| Design | Handoff to the existing visual editor and central reference-design proposals | No copied PHP/Liquid/theme executable and no automatic parity certification. |
| Cutover | Per-page reconciliation and controlled private publication foundations | No source freeze, final delta, whole-shop cross-object reconciliation, automatic DNS switch or zero-downtime guarantee yet. |

The direct source profiles target Shopify versioned Admin GraphQL, WooCommerce REST
v3 / WordPress pages, PrestaShop webservice, Magento 2 REST and Shopware 5 REST.
Their local HTTP fixtures prove the implemented protocol paths, **not admission
against arbitrary installed versions, private plugins or real merchant credentials**.
Shopify protected customer data/older orders, third-party reviews and discounts can
need additional access or explicit exports. API errors and nested pagination gaps
remain visible; they are not counted as a completed extraction.

## Original images and selected publication

Image review downloads bounded bytes to freeze their digest, MIME and length. A job
refetches and verifies those exact bytes before sending bounded chunks to the native
asset owner. Images use the existing asset quota/table; there is no migration file
store or source token in the browser. Source image positions survive interleaved
batches while existing manual media keep their slots.

The native owner commits immutable bytes before the ordinary product-media CAS.
A failed association therefore may leave one known, private, unassociated asset.
After resolving the native media limit or edit conflict, explicit replay attaches
the same asset rather than duplicating bytes. This is recoverable two-step behavior,
not an atomic claim across both writes.

Selected publication writes product parents before variants and images. A product
with a local image cannot publish unless its public attachment already exists live
or is included in that same transaction. A protected download cannot masquerade
as a product image. Live delivery URLs and actual database defaults are captured
in the publication baseline, so a later content release still compares correctly.
Stock is never copied by image or content publication.

## Original reviews and coupons

Reviews enter the existing moderation owner with their original timestamp, author,
content and rating. They start hidden and unverified, even if the original platform
claims a verified purchase. The normal native moderation UI shows that origin;
the storefront exposes only an imported label, never the private provenance object.
Settings-only users cannot read imported review data. Current `catalog.read` and
`customers.pii` must both be present, including after role changes.

WooCommerce percent/fixed-cart coupons become ordinary versioned native promotions,
initially inactive. Their original usage count is subtracted from the original limit;
no historical purchase is inserted into the native redemption ledger. Explicit null
or integer zero means source-unlimited. Wrong types, negative limits, unsupported
product/customer/shipping restrictions and plugin metadata are rejected. Review the
conditions and remaining uses in the native promotion editor before enabling.

Imported coupons apply **only in their original currency**. This immutable source
restriction prevents nominal minimum/maximum spend amounts from being compared
against another checkout currency. It is visible in the native editor and retained
through ordinary edits/publication. Automatic currency conversion of source spend
rules and arbitrary source-plugin discount semantics are not claimed.

## Run the Rust application

```sh
cargo build --locked --package veyndo-migration --bin migration-assistant
printf '%s\n' '{"id":9,"name":"Ceramic cup","price":"19.90"}' \
  | target/debug/migration-assistant normalize woocommerce products EUR en-GB source-shop
```

The CLI reads newline-delimited source JSON and writes version-1 canonical JSON.
Each line is bounded to 1 MiB, each normalized record to 512 KiB. Non-EUR sources
require the currency scale argument. PrestaShop language IDs can be set through
`MIGRATION_LANGUAGE_MAP='{"1":"de-DE","2":"en-GB"}'`; local SQL timestamps need
`MIGRATION_SOURCE_TIMEZONE=Europe/Berlin`. Ambiguous/nonexistent DST times require
an explicit source offset; the assistant does not guess. Magento's UTC source
format and WooCommerce's GMT field become explicit UTC timestamps.

For the separate service configure:

- `MIGRATION_GATEWAY_TOKEN`: private gateway token, at least 32 characters.
- `MIGRATION_CALLBACKS`: operator-bound tenant map with `coreUrl` and a revocable
  native migration app callback `token`, pinned to its reviewed package digest.
- `MIGRATION_SOURCES`: optional operator-bound tenant/profile map. Normal merchant
  setup uses the existing installed settings instead. Source URLs and credentials
  cannot be supplied in ordinary action arguments.
- `MIGRATION_BIND`: listener, default `127.0.0.1:8809`.

Run `migration-assistant serve`, or build
`extensions/apps/migration/Dockerfile` with the repository as context. The runtime
image contains the Rust binary and CA certificates, no Python interpreter.
Use current consent, a bounded key expiry and least privileges for the domains
actually being migrated. `settings.read` on this **app callback** explicitly maps
to native `team.manage`; only the app-bound claim can receive encrypted installed
settings. Personal job claims never return source secrets.

Source HTTP requires admitted HTTPS, pinned DNS, no proxies/redirects and bounded
streamed responses. `MIGRATION_ALLOW_FIXTURE=1` is only for synthetic loopback tests;
it is not a production on-premise network bypass. Private installations can provide
read-only exports to the Rust normalizer; a production private-network reader and
large source bulk-export orchestration remain separate work.

## Storage, recovery and authority

There are **no new per-shop/app/model database tables**. Native `app_jobs` and its
existing outbox own claims, leases, cancellation, explicit retries and small durable
checkpoints. Source pages are streamed/transient; raw catalogues are not placed in
the bounded managed app-record store. Existing native categories, products, managed pages, CRM and orders own
the imported business objects and their provenance. Product identity metadata retains
bounded source identity, record digest and known source stock; translated descriptions
remain in the native translation fields instead of being duplicated into the 8 KiB
identity object. This is not an archive of every ignored provider field.

A reviewed job contains source profile/cursor, target/options and canonical row
hashes. IDs are scoped to the admitted live shop, including private imports; separate
private environments retain the same source IDs without sharing their stored rows.
Selected publication preserves those IDs. Variant-expanded pages are sliced into batches of at most 100 native
records (10 for images). A slice binds the original source cursor, offset and full-page digest;
changed source pages cannot silently shift the next slice. Expanded normalization
and returned batches have explicit byte bounds. This is bounded execution, **not
a measured claim of arbitrary catalogue size or whole-shop snapshot consistency**.

The generic Core callback rechecks current creator/role, native compound rights,
app consent/digest, job lease, exact record hash and same-live-shop target while
holding their fences. Only the native coordinator reads the child-environment
binding under bounded system SQL authority; the actual domain write uses the
admitted target actor scope. No external process receives a database role.
A process admission reserve prevents nested guard/native-owner transactions from
exhausting the supported small pool; this is not fleet-wide throughput isolation.

Historical orders emit `migration.record.imported`, rather than `order.placed`.
Do not register this as evidence of a new sale. Existing source totals stay exact
in minor units and a decimal provenance string; old UI compatibility amounts do
not become a new payment or settlement. No unverified contact email becomes an
immutable native order-customer binding.

## Reproduce acceptance

```sh
cargo test --package veyndo-migration
python3 extensions/apps/migration/tests/normalization.py
python3 extensions/apps/migration/tests/transport.py
python3 scripts/verify_integration.py --only migration_assistant app_jobs app_callbacks admin_creation
TEST_SIGNED_HTTP_SUITES=migration_assistant python3 scripts/verify_integration.py --only signed_runtime
```

Tests use isolated synthetic shops, local HTTP sources and actual Rust/Core/
PostgreSQL writes. They cover source money/identity, all five protocol fixtures,
private products/images/categories/pages, native variant/category relations, CRM addresses,
immutable historical orders, moderated reviews, inactive coupons, explicit activation,
malformed usage-limit controls, current PII role revocation and cross-currency
coupon denial, replay/conflicts,
foreign denial, frozen hashes, cancellation, resume checkpoints and concurrent
callbacks. Image checks include a 3 MiB transfer, failure after binary persistence,
explicit replay recovery, unchanged manual image slots and atomic rejection of
missing image assets or protected downloads. Variant publication rejects a missing
parent and accepts jointly selected parents/categories regardless of input order. Studio regressions exercise approval, target reuse and PII gating.
The real service/outbox test also publishes one selected imported product and its original image, reads the
public bytes, repeats a later content release, explicitly
activates its stock and completes/replays a simulated native buyer purchase. Stock
decrements once and a fresh buyer cart is empty; the original completed cart remains
immutable evidence. This API acceptance does not replace a Storyfront browser test.
Eight concurrent editor/import first writes cover the shared page route/record lock
order; unknown-field replay and changed destination-package digests are rejected.
A green local test does not establish public deployment, real provider access,
whole-shop completeness or large-scale performance.
