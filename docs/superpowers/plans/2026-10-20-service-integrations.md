# Connected service integrations

Outcome: ten discoverable integration routes, with implemented provider operations distinguished from setup recipes and existing inward migrations. Provider behavior stays in its app package; shared hosting, encrypted settings, queue and native admission remain authoritative.

1. Add Vercel, Klaviyo, HubSpot, Contentful and Algolia to the existing Rust connector/app gateway. Start with bounded explicit operations, write-only credentials, revision fences, idempotency and honest provider receipts. Cover native HTTP/MCP permission denials, tenant separation, retries and stale settings with local provider fixtures.
2. Add Shopware 6 product intake to the existing inward migration owner, with explicit tax/currency/visibility/translation limits. Preserve existing Shopify and WooCommerce routes.
3. Provide Vercel frontend and Shopware Nexus HTTP integration recipes against native Store/Admin operations. No claimed marketplace listing, invented Nexus API or new external infrastructure.
4. Expose all ten routes through the existing Apps UI, with compact localized provider configuration and status. Keep credentials server-side and sandboxes closed to external effects.
5. Verify relevant Rust/frontend/native suites, update docs/status/changelog, review the final diff, and open a reviewable PR. Public activation requires an operator-configured connector service and provider credentials; local fixtures do not establish live provider acceptance.

Local implementation and acceptance completed: 296 Rust tests, 713 frontend tests, real multi-worker/provider and signed-runtime regressions, reviewed source/proof boundaries, generated documentation and Chrome screenshots. External provider activation and an actual Nexus/Vercel-hosted journey remain separate operator/provider acceptance.
