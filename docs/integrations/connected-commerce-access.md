# Connected commerce: external access

Checked against primary documentation on 30 October 2026. These decisions belong
to the [implementation checklist](../plans/2026-10-30-connected-commerce.md).
They distinguish Veyndo accepting an assistant from importing another platform's
catalogue and checkout into Veyndo.

## Universal Checkout

Shopify currently creates the checkout from carts belonging to Shopify merchants.
Its Checkout Kit documentation describes support for other merchants accepting
Shop Pay as forthcoming. Universal Checkout itself requires early-access approval
for a Catalog API key, with client credentials from the Dev Dashboard. Implementing
UCP does not grant that approval or make a Veyndo merchant eligible.
[Shop Pay in Checkout Kit](https://shopify.dev/docs/agents/carts-and-checkout/shop-pay/checkout-kit).

**Decision:** keep Veyndo's native cart, checkout, order and payment owners. Do not
route a Veyndo merchant to Shopify or publish a Universal Checkout connection that
cannot be configured. No application, credential registration or provider contract
has been submitted. Revisit when the provider documents independent merchant
enrollment; then add only an app-owned adapter with explicit merchant eligibility,
revocation and simulated-purchase acceptance.

## Muse

Muse documents connector submission and per-tool review, complete purchase/status
workflows and approval on every sensitive write. A submitted connector and an
approved listing are different states.
[Muse connector guidelines](https://platform.muse.ai/docs).

Meta's separate AI Connectors page describes limited developer preview and a later
public-discovery phase. It is not evidence that a Muse listing has been approved.
[Meta AI Connectors](https://dev.meta.ai/products/connectors).

Veyndo should reuse its existing scoped native MCP operations, revocable agent
identity and approval paths. The remaining provider work is registration, exact
transport/authentication validation and an observed Muse workflow. No connector
submission or accepted listing is claimed here.

## Gemini

Shopify's Gemini connector manages Shopify shops and requires Shopify authorization.
Its documentation explicitly distinguishes merchant administration from consumer
product discovery. This is not a registration route for a Veyndo connector.
[Shopify connector for Gemini](https://help.shopify.com/en/manual/ai-powered-tools/connecting-ai-tools/shopify-connector-for-gemini).

Veyndo's independent Gemini admission, discovery and supported checkout transport
still require verification against Google's own merchant/developer documentation.
Keep this task open; the existence of Shopify's connector is insufficient evidence.

## UCP Ask

Ask is a draft Common capability, `dev.ucp.common.ask`, with MCP tool `ask_business`.
It returns information and must not change a cart, order or other resource. Before
implementing, pin the upstream draft and keep its discovery separate from dated
checkout profiles. Public answers must pass native source admission; context or
resource IDs supplied by a caller never grant access to private data.
[UCP Ask specification](https://ucp.dev/draft/specification/common/ask/),
[Shopify Ask MCP](https://shopify.dev/docs/agents/ask).
