# Connected agentic commerce and scenario simulator

The user approved all five product improvements described on 22 October and added
a scenario simulator using small groups of agents playing different customer
profiles. This is an implementation specification, not a statement of shipped work.

## Outcomes

1. A merchant describes a connected shop extension and can follow its native app,
   data, price, order, permission and publication connections, test and release it.
2. Daily catalogue/agent work is visible in one contextual workspace, survives
   reload, and can become an explicitly approved repeatable native Flow.
3. Shopper intent produces an editable visual product selection using native
   catalogue, configuration, budget, cart and checkout operations.
4. Before publication a merchant can run customer scenarios against a private shop,
   inspect each agent's actions/results and compare saved baseline/candidate runs.
5. Migration leads into a private shop preview, reconciliation and selected release.

## Simulator contract

- Agents have explicit fictional profiles, goals, locale/country, budget and step
  limits. Profiles may be suggested from public shop products/settings; no customer
  PII is used to invent personas. The merchant can edit and select profiles.
- A small bounded cohort uses existing durable tasks, checkpoints, central inference,
  current permissions, emergency stop and model budgets. Do not build another queue.
- Models choose only registered shopper actions. Tool output is authoritative for
  prices, availability, selections, checkout results and observed failures. Product
  content and model responses are untrusted and cannot widen actions or identity.
- Execution is confined to an authorized private environment; real provider payments,
  emails and public-shop writes are forbidden. Reuse native commerce operations.
- Keep per-agent observations, prompt/model provenance, step counts and exact input
  snapshot identity. Interrupted external inference is uncertain and requires explicit
  continuation. Completed purchases/actions must not be repeated on retry.
- Baseline/candidate comparisons retain the same profiles and clearly show differences
  in settings/content. Do not call synthetic success ratios conversion forecasts.
- Distinguish API journey coverage from rendered browser/device coverage; a viewport
  label or model opinion does not prove a mobile UI worked.
- Native HTTP/MCP, localized Studio controls, read/write rights and documentation are
  part of the feature. No secrets, cart capabilities or raw customer data in reports.

## Acceptance

Use a disposable shop with real PostgreSQL and the native Rust server. Run differing
profiles with a controlled model, then with the configured model when available.
Introduce a real catalogue/checkout failure, observe it, fix the private shop, compare
the next run and confirm the live shop is unchanged. Cover stop/resume, duplicate
requests, revoked authority and foreign-shop access. Browser-test the workbench and
the connected merchant/shopper/migration entry points. Record deployment separately.
