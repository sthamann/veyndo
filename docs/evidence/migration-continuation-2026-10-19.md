# Migration continuation and current-target acceptance — 19 October 2026

The functional journey below is **local synthetic acceptance**, not a real source
shop, final delta/cutover, paid settlement or measured fleet capacity. The separate
hosted Core delivery is recorded at the end; it does not establish a public
end-to-end migration.

## What was exercised

| Journey | Observed result |
| --- | --- |
| All eight supported domains | Actual source HTTP → independent Rust service → native outbox/job → current domain owner → mapped-current-field comparison |
| Manual target price/text edit | Successful idempotent replay alone is insufficient; current comparison reports changed field paths and does not overwrite the edit |
| Missing image association | Actual stored image bytes and the separate product association are checked independently |
| Customer address edge cases | Identical explicit billing/shipping remain two rows; shipping-only/additional-only native defaults match the shared creation plan |
| Connected plan | Saved private page intents follow domain dependencies and source cursor order with explicit per-page review |
| Archival/restart | Technical jobs are actually archived and the independent Rust service actually restarted; page evidence remains in native app records |
| Recheck after restart | Changed price remains changed; restoring through the normal native editor makes the new read-only comparison match |
| Forged saved success | Ordinary edits and forged/reused evidence tokens fail native verification and cannot advance Studio progress |
| Completion authority | Personal/unscoped/stale/CAS/revoked-job-creator requests fail; native success and private evidence commit atomically |
| PII | Settings/order projections require paired PII rights; current-role revocation redacts or denies historical source payloads |
| Native purchase regression | Selected imported product/image publication, explicit stock activation and simulated purchase/replay decrement stock once and leave the new buyer cart empty |
| HTTP/MCP | The current-target operation uses the same native read owner and advertises a read-only MCP effect |

The independent review identified false address differences and forgeable,
non-job-bound evidence. A real identical-address case first failed on `/addresses`;
the shared native address creation plan resolves all three edge cases. Completion
now uses the existing native transaction, current creator/package/lease fences,
record CAS and platform authenticated encryption. Its verification reads actual
stored fields and current package bindings. This authenticates the admitted
service observation; it does not prove arbitrary service correctness.

## Reproduction

Run from the repository root against the explicitly selected disposable test
PostgreSQL configuration; the integration runner creates its own database:

```sh
cargo build --locked -p veyndo -p veyndo-migration --bin veyndo --bin migration-assistant
python3 scripts/verify_integration.py --only migration_assistant app_jobs app_callbacks admin_creation
TEST_SIGNED_HTTP_SUITES=migration_assistant python3 scripts/verify_integration.py --only signed_runtime
cargo test --locked --workspace
cargo clippy --locked --workspace --all-targets -- -D warnings
python3 scripts/formal.py
python3 scripts/formal/mutations.py
```

The signed-runtime acceptance uses actual separate tenant/system database logins,
checks foreign-scope denial and signing-key rotation/restart, and runs the migration
journey through those logins. The extracted cancellation policy covers all four
Boolean assignments; 61 total policies / 131 theorem audits and 156,705 Rust/Lean
comparison cases pass. Negative verification rejects 174 broken policies, 14
unsupported syntax mutations, three stale/disconnected bindings and nine proof
shortcuts. SQL, AES-GCM, HTTP, service execution and hosted deployment remain
outside those formal claims.

Frontend: 121 test files / 693 tests, production build and formatting pass.
Documentation rendering, complete Markdown coverage and over 29,000 local
links/assets pass. See [current status](../status.md) for hosted acceptance.

## Browser recovery

The actual German Studio browser reopened a saved eight-domain plan after job
archival. Its deliberately edited product receipt was unverified, so progression
stayed at 1/8 despite eight stored pages. **Quellseite neu prüfen** opened a fresh
source inspection rather than retrying the old hashes. A reconfigured source
profile produced the new actual source page; it was not automatically approved
or silently adopted. This is a recovery/authority check, not a completed eight-domain
browser migration. The complete eight-domain path above is native HTTP acceptance.

![Actual German Studio: preserved page evidence, 1/8 verified progress and explicit fresh source review](images/migration-2026-10-19/resume-review.jpg)

## Public-source interoperability

An actual HTTPS read from the immutable public GitHub commit export initially
returned 404 when the service sent an unrelated Bearer credential. Explicit public
export mode now sends no Authorization header on either manifest or page reads;
the Rust service reads exactly three synthetic products with verified hashes and
a terminal cursor. A local protected/public fixture also proves that a retained
private token is not forwarded in public mode and that the default private mode
still authenticates. This is a public-source transport check with a local Rust
service; it is not Northflank service acceptance.

## Hosted Core delivery boundary

PR [#168](https://github.com/sthamann/veyndo/pull/168) merged on 19 October at
08:48 UTC as `0aaec00597f104e3170df5c9243baf9d2074d7df` after the
[full required verification](https://github.com/sthamann/veyndo/actions/runs/39219572633)
passed. The merged source tree and tested `b13aedb` tree are identical
(`1db99634b80a058d5ccdf9ba41f8209180effbc4`). This includes real database/provider
fixtures and the separate restricted-system/tenant connection checks; it is not
real provider settlement.

The fresh Northflank disk snapshot `migration-assistant-20261019-b13aedb` completed
successfully before schema changes. Existing `vendune-migrate` ran the same
`violet-glass-1926` image in migration-only mode, run
`f45c2dd1-eea6-456b-af23-496e687aaaed`, and logged **Migration-only setup complete**
and exit code 0. Migration 106 adds review-source provenance; no new database
role, app table or runtime privilege was introduced.

Core deployment `vendune-core-589c44c658` then reached one ready instance with
zero restarts. `https://app.veyndo.ai/health` returned `status: ok`. The ordinary
Google entry created the explicitly empty synthetic shop **Migration Abnahme 19
Okt**; Studio reopened after the rollout with zero products. Existing separated
database command/configuration was preserved. The original Experience was not
redeployed, and no new hosted purchase is claimed here.

The smoke-tested independent image is available at
`ghcr.io/sthamann/veyndo-migration:sha-0aaec00597f104e3170df5c9243baf9d2074d7df`,
digest `sha256:4e4754a1ad4016337dd7893795e68b0f0437f23536f4cf9904b6a73860e87479`.
An anonymous registry manifest read returned 200. Its separate Northflank service,
private gateway, scoped callbacks and complete public source-to-purchase journey
remain unconfigured/unaccepted. Core availability and a published image are not
substitutes for those steps.
