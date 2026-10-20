# Service integration acceptance — 20 October 2026

Scope: implementation branch `feat/service-integrations`, based on the guided
shop-design/migration follow-up. This is local acceptance with synthetic shops and
local HTTP providers. It is not public deployment, provider certification, an
accepted Nexus tenant workflow or a deployed Vercel frontend.

## Executed paths

- Five provider protocols traverse the real Core app gateway → private Rust
  connector → encrypted PostgreSQL queue → two Rust worker processes → local
  provider HTTP fixture → bounded/redacted receipt. Native HTTP/MCP and explicit
  customer-data rights, foreign shops, private egress, exact replay, 429 retry,
  uncertain outcomes and stale configuration are checked.
- Contentful reaches the native private evidence/knowledge consumer. Capacity
  rejection and a durable source-reset tombstone, including a lost Core action
  response, remove that app's old evidence without removing another app's data.
- The Nexus recipe's least-privilege native key can read a bounded catalogue and
  cannot execute an app write. No real Nexus workflow is invoked.
- Shopware 6 OAuth, explicit currency/language resolution and product search reach
  saved native inspection and reviewed private product import. A different live
  shop cannot read that private imported product. Source stock is not activated.
- Existing migration publication, explicit stock activation, simulated checkout,
  replay and empty-cart checks pass. Existing inward Shopify/WooCommerce/native
  domains remain under their previous documented limits.
- The Vercel TypeScript client uses native cart revisions and the native checkout
  transfer; transport tests reject a foreign checkout URL. The actual checkout
  handoff suite remains native HTTP/PostgreSQL acceptance, not an external Vercel
  browser purchase.
- Existing mail/provider, 43-check tenant-isolation and signed-runtime suites pass.
  The latter uses actual separate restricted database logins, two native replicas,
  native migration, pool reuse and production-foundation regressions.

## Code/UI checks

- Rust workspace tests: **296 passed**. Workspace Clippy runs with warnings denied.
- Frontend: **713 tests passed** across **123 files**, plus production build,
  formatting and EN/DE/FR/ES localization checks.
- Structure/source inventory, native operation contracts and documentation hygiene
  checks are retained. Extracted-policy proofs and mutations retain their existing
  scope; provider protocols, asynchronous orchestration and SQL are not formally proved.
- Actual Chrome sign-in and navigation in a disposable local native shop verified
  the ten-route directory and Vercel connection screen. Provider credentials were
  not entered through the browser and no public provider was contacted. Screenshots
  are local task artifacts; they do not depict production activation.

Commands and assertion owners:

```sh
cargo test --locked --workspace
cargo clippy --locked --workspace --all-targets -- -D warnings
npm --prefix frontend test
npm --prefix frontend run build
npm --prefix frontend run localization
npm --prefix frontend run format:check
python3 scripts/verify_integration.py --only rust_connectors email_tests tenant_isolation signed_runtime checkout_handoff
python3 scripts/formal.py
python3 scripts/formal/mutations.py
python3 scripts/structure.py
python3 scripts/build_site.py
python3 scripts/check_site.py
```

The signed fixture selects `TEST_SIGNED_HTTP_SUITES=migration_assistant`; each
registered runner creates and removes its own disposable database. Provider tests
are in `extensions/services/connectors/tests/`, Shopware 6 fixtures in the existing
migration app tests, and UI/client regressions in
`frontend/tests/unit/service-integrations.test.tsx`.

## Activation still required

Deploy the reviewed Core/connector/migration images, configure private
`APP_SERVICES`, and supply merchant provider credentials. Real account permission,
region, rate limits and downstream delivery/deployment/index results still require
provider acceptance. No new external service, subscription or production secret
was created in this work. [Capability matrix and setup](../service-integrations.md).
