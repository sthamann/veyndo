# Connect services and bring shops into Veyndo

Veyndo remains the commerce owner. External services supply frontend hosting,
content, CRM, marketing, notifications or search. Shop migrations run **toward
Veyndo**, into a reviewed private preview. The ten routes below are a practical
selection, not a market-share ranking or a claim of provider certification.

**Implementation branch, 20 October 2026:** provider fixtures and native tests are
separate from public activation. No external provider account, Vercel project,
Nexus tenant or paid service is created by installing these packages. The deployed
operator must configure the Rust connector service and each merchant must supply
its provider credential. See [current status](status.md).

## Choose an integration

Open **Apps → Services & shop imports**. Each card opens the actual installed app
or its normal package-consent dialog. Nexus opens the HTTP setup instructions.
There is no synthetic “connected” badge based only on a catalogue entry.

| Route | Implemented capability | Boundary |
| --- | --- | --- |
| Vercel | Stateless Store API client, public-route rewrite example, encrypted Deploy Hook and queued deployment request | No Vercel Marketplace listing, project provisioning, deployment-completion polling or custom frontend account UI |
| Shopware Nexus | HTTP-action recipe calling Veyndo's scoped native API; native catalogue-read/key-denial regression | Nexus Early Access; no invented custom-node/marketplace API or imported Nexus workflow format |
| Shopware 6 | Admin OAuth, explicit currency/language resolution, bounded product pages, translated product/variant projection and native private import | Other direct domains, CMS conversion and complete channel/tax-rule migration are not implemented for this new source |
| Shopify | Existing versioned inward migration adapter and native reviewed imports | Domain-specific limits remain in the [Migration Assistant](agentic-migration.md); this change does not add an outbound Shopify mirror |
| WooCommerce | Existing versioned inward migration adapter, including reviewed variants and supported native domains | Same inward direction and existing review/cutover limits |
| Klaviyo | Explicit profile/metric event ingestion with stable event identity | Acceptance is not downstream completion; no marketing subscription or consent inference |
| HubSpot | One explicitly supplied contact upsert by email with first/last name | No automatic whole-CRM sync or arbitrary CRM properties |
| Slack | Existing OAuth notification app, channel choice and Flow action | App installation does not send a real notification |
| Contentful | Published entries, 50 at a time (2,000 stored sources per connection), into private shop knowledge and the existing graph/evidence consumer | No storefront auto-publication, asset mirroring, full rich-text rendering or automatic deletion reconciliation |
| Algolia | Up to 50 explicit catalogue records into one configured index | No automatic full-catalogue feed, arbitrary fields or proof that an accepted task has finished indexing |

## Configure a provider safely

1. Install the corresponding package with its native consent dialog.
2. Open the app connection. Set the provider identifiers and its credential.
3. Credentials are write-only in the UI and encrypted in the existing connector
   configuration. A blank credential field preserves the existing value. Disabling
   the connection stops new operations; queued work also checks the current revision.
4. Save before running an operation. Unsaved fields cannot silently change the
   destination of the operation shown beside them.
5. Enter only the intended data and run the operation. Refresh **Recent jobs**.
   For recurring work, use the existing Flow Builder app-action contract.

All five new action sets use `apps.manage`. HubSpot/Klaviyo additionally require
current `customers.pii` for their transfer action; Contentful requires
`knowledge.write`; Algolia requires `catalog.read`. Read-only Nexus keys cannot
invoke provider writes. API, MCP and Flow invoke the same registered app actions
and native package/permission checks. Private sandboxes block external service
execution. Package versions/digests use normal app consent; provider connection
revisions use the existing encrypted connector owner, not a second settings store.
Connection credentials are operational data, not a sandbox release unit; these
legacy connector settings do not have the native app-settings history/restore UI.

The durable PostgreSQL queue is shared across replicas: tenant-bound idempotency
keys, payload fingerprints, leases and quotas. Reusing a key with a changed payload
is rejected. Configuration changes invalidate queued work before network dispatch.
Only a proven HTTP 429 rejection is retried automatically. A timeout, broken reply
or ambiguous write response is **uncertain** and is not automatically resent.

## Vercel frontends

The app package owns [the client](../extensions/apps/vercel/frontend/client.ts)
and [the rewrite example](../extensions/apps/vercel/frontend/vercel.json).
Copy the client into your frontend source and the rewrite into its Vercel project
configuration. Configure your actual public Commerce origin as the rewrite target;
the example uses `https://app.veyndo.ai`. Do not proxy `/api`, `/mcp` or merchant
credentials into a public frontend.

```typescript
import { createVeyndoStorefront } from './veyndo-client';
const shop = createVeyndoStorefront({
  origin: window.location.origin, // same-origin /store-api rewrite
  checkoutOrigin: 'https://app.veyndo.ai',
  shop: 'YOUR_SHOP_ID', channel: 'default', locale: 'de-DE'
});
const cart = await shop.createCart();
const filled = await shop.replaceItems(cart, [{id: 'YOUR_PRODUCT_ID', quantity: 1}]);
window.location.assign(await shop.checkout(filled));
```

The generic return type can be specialized with the generated/native API types.
Keep each customer's cart handle separate, especially during SSR. The client has
no module-global cart or administrator token. Native cart revisions and a
single-use native checkout handoff retain price, inventory and order authority.
This client redirects to the native checkout. It does **not** configure iframe
embedding, guarantee a return into a custom frontend or prove an external Vercel
purchase journey. Do not replay the original cart after its handoff rotates the
capability. Existing Storyfront embedding/return behavior has its separate
[checkout acceptance](experience-integration.md#checkout-transfer-from-an-external-experience).

Vercel's [external rewrites](https://vercel.com/docs/routing/rewrites) avoid requiring
browser CORS to the Core. Keep session/cart responses uncached on the proxy; the
client uses `cache: no-store`. The rewrite is an example configuration, not a
verified public Vercel deployment. Veyndo's API admission remains active.

For rebuilds, create a branch-specific [Vercel Deploy Hook](https://vercel.com/docs/deploy-hooks)
in your project and save its complete URL as this app's private credential. Only
the fixed `https://api.vercel.com/v1/integrations/deploy/<project>/<secret>` shape
is accepted. An explicit app `run` request queues one POST. Its receipt says
`accepted` and `deploymentConfirmed: false`; check Vercel for the actual build result.
Do not put a hook URL into browser source, a Flow argument or documentation.

## Shopware Nexus

Nexus documents external HTTP requests and credential-bearing connections in its
[official product guide](https://frontends.shopware.com/docs/products/nexus/).
The current guide identifies Early Access and places custom node development
later. This integration therefore uses the supported **HTTP request action**.

1. In Veyndo **Developer → API & integrations**, create a named integration key
   with only `catalog.read` for the initial read test.
2. Save that key in a Nexus connection, not in workflow output, query parameters
   or public frontend code. Send `Authorization: Bearer <key>` and
   `x-tenant: <shop ID>` on each request.
3. Configure `POST https://app.veyndo.ai/api/search/product` with JSON
   `{"limit":50}`. Use the bounded [HTTP setup example](../extensions/apps/shopware-nexus/examples/catalogue-read.json).
4. Continue with the returned `nextCursor` in `after`; stop when `hasMore` is false.
   Respect rate limits. This is a scoped read, not a product import or publication.
5. Add only the specific native operation rights needed by a future workflow.
   Use the generated [API documentation](studio-api-and-channels.md) for its input schema.
   Writes retain native revisions, validation and current membership admission.

This is a configuration recipe plus a native API/key regression, **not an
accepted execution inside a real Nexus tenant**. Do not claim a Nexus marketplace
package, workflow import or event trigger that the public documentation does not expose.

## Shopware 6 inward catalogue intake

In the existing Migration Assistant choose `shopware6`, its actual source origin,
API profile/version, currency and locale. `username` is the Shopware integration's
access ID; the encrypted `token` is its client secret. Grant only the source read
rights needed for products and their currency/language/media/category/options
associations. The reader does not issue source catalogue writes.

The reader exchanges OAuth credentials and resolves the selected currency and
language uniquely. It requests product inheritance, stable ID sorting and exact
page counts, at most 50 source products per page. It selects an explicit price in
that currency; it does not invent currency conversion. Source parent IDs and
option groups remain explicit. Missing inheritance, price or option data fails
before advancing the page. The selected gross basis and source tax/channel-rule
warning must be reviewed before native import. Existing sandbox/reconciliation
and selected release remain the only destination write/publication paths.

The new reader currently projects one selected content locale. It does not claim
all source translations, advanced prices, plugin fields, sales-channel visibility
or source tax-rule equivalence. Stock is recorded as source evidence; imported
native stock stays zero until the existing explicit stock/cutover process.
Supported source CMS/customer/order workflows remain adapter-specific.

Sources: [Shopware integration APIs](https://developer.shopware.com/docs/guides/development/integrations-api/),
[search criteria](https://developer.shopware.com/docs/guides/development/integrations-api/search-criteria.html),
[product inheritance](https://github.com/shopware/admin-api-reference/blob/main/docs/concepts/endpoint-structure/writing-entities/product-data.md).

## Provider-specific limits

| Provider | Required credential scope | Request/receipt behavior |
| --- | --- | --- |
| Klaviyo | Private key with `events:write` | API revision `2026-10-15`, explicit email/metric/event ID, bounded properties; HTTP 202 means accepted only. [Create event](https://developers.klaviyo.com/en/reference/create_event). |
| HubSpot | Private app token with contact-write scope | Batch-upsert endpoint with a single email-identified contact and complete supplied name fields; partial/error results are not confirmed. [Official upsert](https://developers.hubspot.com/docs/api-reference/legacy/crm/objects/objects/batch/upsert-objects). |
| Contentful | Content Delivery API token restricted to the intended space/environment | Global/EU delivery, explicit locale, manual offset continuation; configuration/credential changes purge that connector's old knowledge sources. [Delivery API](https://www.contentful.com/developers/docs/references/content-delivery-api/overview/). |
| Algolia | Index-restricted key allowing object writes; keep administrator keys private | Stable `objectID`, name and optional description/url/image/locale only. No prices/stock/PII in this initial projection. Task receipt is accepted, not indexing-complete. [Batch API](https://www.algolia.com/doc/rest-api/search/batch). |

Flow arguments follow each installed manifest's typed schema. Provider bodies,
credentials and recipient data do not become public job receipts. Contentful
source material remains merchant-private, untrusted source content in existing
retrieval/evidence. This release adds no per-provider database tables or indexes,
provider subprocess language, secondary queue or alternate commerce calculator.

## Local acceptance and operation

Run the registered `rust_connectors` and `migration_assistant` suites against an
isolated PostgreSQL database. They use local provider HTTP fixtures, separate
non-owner connector logins and two Rust worker processes. Unit/component checks
cover fixed endpoint admission, asynchronous receipt meaning, UI scope fences,
dirty settings and native cart/handoff requests. These checks need no real API
key or customer data. [Evidence](evidence/service-integrations-2026-10-20.md).

Provider modules live under `extensions/apps/<provider>/src/`; only generic
transport, encrypted configuration, queue and dispatch live in the shared
connector host. Operator `APP_SERVICES` entries use the existing private service
URL `/<app-id>` and server-only gateway token. The local connector launcher includes
all five new IDs. Update existing deployments deliberately; no automatic public
activation is performed by the catalogue UI.
