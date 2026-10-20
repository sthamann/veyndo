# Connected AI workspace: local acceptance, 20 October 2026

Base `cf0a87bf`; development branch `feat/agentic-workspace`, stacked on the service
integration work. This evidence is local and uses separate disposable PostgreSQL
databases and synthetic merchant accounts. It does not establish hosted activation.

## Demonstrated paths

- App discovery finds a relevant package after nine alphabetical fillers; metadata
  does not disclose sampled records. Actual reads use its managed action. Foreign
  shops, oversized pages and forged workspace identities are rejected.
- One exact approval saves two private managed records through the native Rust
  worker. Repeated approval does not repeat them; live records remain unchanged.
  Changing a target after review rejects approval. Live configuration and
  unadmitted operations are denied before a write.
- A filtered order view retains native criteria and originating context. Unknown
  tenant criteria fail. UI handoff reaches the real grid request; manual editing
  remains available and personal filters are excluded from persisted pins.
- Full app composition adds a model and setting, installs the proposed version in
  the real private preview and writes/reads an actual record. The existing lifecycle
  fixture still stages, publishes only its package and runs a simulated order review.
- Explicit private merchant guidance reaches the actual provider request with
  revision/hash provenance. Public publication fails and archiving withdraws it.
- Work suggestions reflect actual stock, disappear when stock is replenished and
  return no IDs/counts after the actor's rights narrow.

## Reproducible checks

Use the existing isolated suite runner with a disposable PostgreSQL connection:

```sh
python3 scripts/verify_integration.py --only users providers app_generation durable_agents knowledge_workspace app_preview automation app_studio
cd frontend && npm test && npx tsc --noEmit && npm run build
```

The provider/model servers are local fixtures, with no paid calls. The real Rust
HTTP routes, native operation registry, PostgreSQL transactions, app records,
staging owners and workers execute the tested effects. Fixtures do not prove a
live model understands every request. Native command and receipt transactions are
separate; interrupted unknown native effects require review, not automatic replay.

The independent full-diff review found five concrete edge cases: agent opt-out,
existing guidance demotion, custom action name collision, conversation ownership
and translated-title/body inheritance. All five were repaired and re-reviewed.

Local verification passed: 718 frontend tests, 298 Rust workspace tests, strict
TypeScript, Clippy, the affected native suites, prompt immutability, route rights,
source ownership, frontend architecture and four-language interface checks. The
existing formal gate passed 61 extracted policies with 156,705 conformance cases
and zero mismatches; its mutation suite rejected 174 broken policies plus the
syntax/binding/axiom negative controls. These proofs do not cover the new async
execution adapters. The complete site build covers 296 Markdown documents in
303 pages with local links/assets and search checked. No blanket full-platform certification,
external coding-agent execution or general exactly-once provider guarantee is claimed.
