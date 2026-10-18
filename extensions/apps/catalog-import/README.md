# Inbound catalogue adapters

Rust provider code used by the native reviewed catalogue-intake owner. Shopify
product-export CSV and read-only Shop MCP results become editable Veyndo drafts.
No supplier checkout, wallet, account, purchase or outgoing catalogue export is called.
Native explicit private saves, source provenance, zero initial stock, revisions,
history and selected publication apply. Access to a public product does not grant
resale, image or republication rights. Shopify exports have no currency column;
the merchant must confirm the Veyndo currency. This is bounded intake, not an
authenticated ongoing inventory/order synchronizer or whole-shop migration.
