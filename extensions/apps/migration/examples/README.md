# Public synthetic frozen product sample

`frozen-products/` is a reproducible three-product WooCommerce-shaped domain
export produced by the independent Rust `pack` command. It contains no customer,
credential, personal or real merchant data. The original source identity
`https://migration-demo.example` is deliberately fictional; only the pinned export
hosting URL is fetched. These are demonstration amounts in EUR, reviewed as gross
at the destination; no tax jurisdiction or source-store completeness is implied.

For a hosted acceptance, serve this exact directory over HTTPS (for example the
repository's immutable raw GitHub commit URL). Enter the SHA-256 of `manifest.json`
and a separate synthetic export token in the installed migration app settings.
The token is deliberately non-secret because these fixtures are public; never use
real source API credentials. Review the three products, explicitly choose gross
basis and the destination tax rate, and import to a private preview. Compare the
actual target; select publication and stock activation separately. Any payment in
this demonstration must remain simulated.

The sample has no images, customers, historical orders, source API connection or
cross-domain snapshot. It does not replace the eight-domain local provider/native
fixtures or prove migration of a real source shop. Keep public hosting acceptance
separate from local results in `docs/status.md`.
