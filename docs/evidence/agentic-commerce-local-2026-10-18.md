# Inward agentic commerce: local acceptance — 18 October 2026

This receipt covers the feature branch built from `749ac3e`, with the inward
commerce changes described in [the handbook](../agentic-commerce.md). It is local
acceptance, not a new hosted release or external provider admission.

## What passed

- Six real isolated Rust/HTTP/PostgreSQL suites: `agentic_commerce`, `currencies`,
  `checkout_handoff`, `catalog_management`, `legal_privacy`, `b2b_ucp`, followed by
  the required structure, ownership, route-rights, source inventory and localization checks.
- UCP cart native totals, single-use canonical continuation, foreign tenant and replay
  denial, native order idempotency, optional consent negotiation, missing-contact refusal
  through both protocol and native finalization, immutable completion snapshot,
  withdrawal/non-resurrection and buyer-clear revocation.
- A rejected consent/currency update leaves native revision, currency and contents
  unchanged. Existing exact currency, purchasing approval and legal-policy cases pass.
- Full frontend: **118 files, 657 tests**. TypeScript/Vite build, architecture and
  four-language localization pass. Shared cart actions serialize revisions, reject
  negative additions and stale-shop results, omit buyer/token output and never submit
  a financial order. Experimental WebMCP registration failures are contained.
- Rust workspace tests and Clippy, existing extracted Lean/conformance checks and
  mutation controls. The formal boundary remains selected extracted pure policies;
  these checks do not prove new SQL, HTTP adapters or provider behavior.
- Compiled registry regenerates consistent TS/WIT/OpenAPI input contracts. Site
  generation/link checks and production Docker-context negative controls pass.

## Actual browser flow

Signed into the synthetic merchant account, opened the AI-channel centre and
uploaded a Shopify CSV. The two priced variants became editable native drafts.
Created a private sandbox and saved both products there, with no live catalogue
change. [Import screenshot](../assets/agentic-commerce-20261018/shopify-sandbox.jpg).

The standard storefront added the native Field notebook through the shared cart
commands, increased quantity to two, accepted a fictional address, reviewed the
native total and placed simulated order **RAC-64dd0223**, EUR 25.00. The German
order name, quantity and amount were correct. Return to the shop and browser reload
both showed **Warenkorb 0**. [Purchase screenshot](../assets/agentic-commerce-20261018/purchase.jpg).
This browser round used the native demo method, not a real PSP or a Storyfront iframe.

The additional final-build browser round started from the actual UCP `continue_url`
with the cart’s `language=de-DE`. Single-use consume opened contact/address fields,
with German product, shipping and payment names. Native review and simulated order
**RAC-fa07ed97**, EUR 12.50, passed. Return and reload again retained an empty bag.
[UCP transfer purchase](../assets/agentic-commerce-20261018/transfer-purchase.jpg).
The missing-language URL assertion was observed failing before the generic handoff
owner was repaired; native handoff and B2B regressions passed afterwards.

## Shopware Payments simulation

The separately held actual private Rust adapter was built and tested against the
new public Core and a local synthetic PSP. The fixture now enters through UCP Cart
Transfer and native single-use consume, then exercises scoped hosted session,
verified callback, confirmed capture, partial refund, duplicate prevention, provider
payee/amount/tenant rejection, process-restart replay, authorization/void and SEPA
mandate validation. Every case passed; `realMoneyCharged` remained false. Private
source and partner configuration remain outside the public repository.

This is not a real PSP sandbox wallet/settlement acceptance, nor a public deployment
of the private fixture configuration.

## Live read-only supplier check

The actual native importer called public Shop MCP, not a local fake endpoint.
An unrestricted query returned mixed supplier currencies and was correctly rejected
without product creation. Selecting the returned `nova-ceramics.myshopify.com`
shop in an EUR test shop produced two native drafts: Monsoon Cup 16oz, EUR 31.95,
and Horizon Mug 16oz, EUR 22.95. Variant identity and the original source URL/query
were retained. `saved` remained false. Shop country/language/currency are sent as
locality preferences; provider prices are still validated rather than relabelled.
These dated observations are neither current price promises nor resale permission.

## Independent review

One fresh-context whole-branch review found native-finalization consent bypass,
unnegotiated consent and a partial currency update. Each was fixed with actual
negative HTTP regressions. The reviewer checked these fixes and the retained green
results and reported no remaining blocker in those targeted fixes. They did not
rerun the suites or conduct a second full audit.

The Google merchant programme, Muse/Link partnerships, native WebMCP availability
in a particular browser and continuous supplier inventory/order synchronisation
remain separate. Live supplier currency mismatches fail without creating products;
the merchant receives a localized recovery message. No test sends real PSP credentials,
buyer PII or financial instructions to an external supplier.
