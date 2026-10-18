# Local inward-commerce screenshots — 18 October 2026

Captured from the real Chrome UI against an isolated local Rust/PostgreSQL test
shop named Agentic Commerce QA. All contacts, products and purchases are synthetic.
The Shopify export contains two fictional ceramic-mug variants. Payment in the
browser screenshot uses native demo mode; actual private Shopware Payments is
separately tested with a synthetic local PSP, not represented by this picture.
No screenshot establishes public deployment, Google approval or live settlement.

- `channels.jpg`: native readiness and inward source entries, external approval unverified.
- `shopify-sandbox.jpg`: both native variant drafts saved in the private sandbox.
- `purchase.jpg`: native shared UI cart commands, quantity two, simulated order RAC-64dd0223.

Return and browser reload retained an empty cart. Required contact enforcement,
explicit UCP consent negotiation and currency-update atomicity are separately
covered by actual isolated HTTP regressions on the final build.
