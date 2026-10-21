# Furniture configurator

An app-owned material library and dimensional surcharge connected to native B2B
approval, checkout, saved input lists and current-price reorder. Start with the
**Configurable furniture** pattern in App Studio; see the [workflow and exact
acceptance boundary](../../../docs/furniture-configurator.md).

`manifest.json` is the canonical versioned definition. `configuration.wat` owns
its pure furniture rule; the Manifest embeds that source for immutable admission.
Core only hosts declared fields, bounded guest execution, source-currency pricing,
revision fences, native buying policy and checkout. Keep the source and embedded
text identical when proposing a new version. No plugin files are copied into
system directories and no per-installation SQL tables are created.

Seven synthetic configuration examples are frozen in the package. A modified
rule must fail incompatible examples before installation. Material records use
native optimistic revisions and history. Saved purchase lists store inputs only;
orders freeze the accepted fee, rule version and public material snapshot.

The public `configure` action is cart-capability-bound and available to MCP only
when enabled. Private material writes require catalogue authority; purchased
configuration reads require current `orders.read`. Native company membership,
independent approval, allocation/budget and stock checks remain authoritative.
The app has no payment provider, mailer or privileged database connection.

Version `1.0.1` also exposes the current material library through the existing
AI context and native namespaced graph. API, public catalogue reads and declared
MCP reads derive the same fields, package version and record revision; the graph
is a view over the native records. Material amounts are EUR-cent surcharges, not
complete retail prices. Private purchased configurations retain `orders.read`.
The immutable original package is retained at `versions/1.0.0.json`; upgrading
preserves its records and still needs ordinary review and consent.

The app-owned acceptance test is `tests/workflow.py`, registered through
`scripts/business_capability.py`. It completes both an original purchase and a
reorder after material/rule changes, requires independent approval again, checks
idempotent stock/order writes and preserves the original order. No payments are
settled with an external provider in this test.
