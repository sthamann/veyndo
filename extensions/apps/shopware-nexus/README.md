# Shopware Nexus HTTP recipe

This directory owns a documented native Veyndo HTTP-action recipe, not a bundled
Nexus executable app, marketplace node or workflow export. Nexus remains Early
Access. Store a least-privilege Veyndo integration credential in its connection;
start with `catalog.read` and bounded native product search. Existing permission,
shop and revision checks remain authoritative for later operations.

`examples/catalogue-read.json` describes the request, continuation and boundary.
Native integration-key read/denied-write tests run in the registered Rust connector
suite. Actual execution in a real Nexus tenant remains unaccepted.
See [setup and current limits](../../../docs/service-integrations.md#shopware-nexus).
