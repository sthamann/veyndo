# Migration Assistant

Independent Rust source adapters, canonical records and a connected Veyndo Studio.
Read the [workflow, current coverage and deployment guide](../../../docs/agentic-migration.md).
App-specific code stays here; Core contains only generic native import/job admission.

- `contract/`: stable versioned source identities and exact source money.
- `adapters/`: source-owned normalization, languages, addresses, historical lines/dates.
- `service/`: bounded HTTPS extraction, immutable variant slices and native job callbacks.
- `studio/`: source setup, review, saved jobs and the shared agent drawer.
- `tests/`: real Rust protocol/Core fixtures and app-owned UI acceptance.

Native target import currently covers private products, categories, editable content
pages, CRM customers and immutable historical orders. Products use real native
variant/category associations; all private domains can share one selected preview. Normalizing other source domains does not implement their target
migration. Do not advertise complete theme/plugin conversion or zero-downtime cutover.
