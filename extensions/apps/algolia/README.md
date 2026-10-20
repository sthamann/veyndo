# Algolia integration

The package owns its versioned manifest, provider request/receipt projection in
`src/provider.rs`, and Studio descriptor in `studio/connector.json`. The shared
Rust connector owns encrypted configuration, revision fences, PostgreSQL jobs,
leases and transport. No provider database table or Python runtime is added.

Install through native app consent; configure the private service and merchant
credential before use. Actions retain native permissions, package digest and
private-sandbox egress checks. Explicit operations and provider acceptance do not
imply a complete account-wide sync or public provider acceptance.

See [setup, scopes, protocol sources and limits](../../../docs/service-integrations.md).
Local provider/native HTTP tests live under
`extensions/services/connectors/tests/` and run through `rust_connectors`.
