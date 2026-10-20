# Vercel frontend contract

`client.ts` is a stateless browser/SSR Store API adapter with explicit shop,
channel, locale, cart token and revisions. It accepts no merchant credential and
redirects through the existing single-use native checkout handoff. Do not share
cart handles across SSR visitors. `vercel.json` proxies public Store API routes
only; configure the actual Commerce origin and keep responses uncached.

Use the frontend's own origin for `origin` and the native Commerce origin for
`checkoutOrigin`. A proxy is needed for browser calls; do not assume Core CORS.
The example does not provision a Vercel project or provide a complete account,
iframe, return-navigation or custom storefront implementation.

The actual cart/handoff owner remains Core; component/transport regressions are
in `frontend/tests/unit/service-integrations.test.tsx`, and native checkout transfer
acceptance remains `scripts/checkout_handoff.py`.
See [the integration guide](../../../../docs/service-integrations.md).
