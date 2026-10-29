# Isolated restore and operational acceptance: 29 October 2026

An actual custom PostgreSQL dump of the local synthetic development environment
was restored into a separate database, `veyndo_restore_20261029`. The source
processes were stopped before backup. No hosted database, customer record or
external payment account was used. This establishes a local recovery exercise;
it does not establish recovery from a Northflank disk snapshot.

## Backup and restored data

| Check | Observed result |
| --- | --- |
| Format | PostgreSQL 17 custom dump, without original ownership or ACLs |
| Size | 2,203,863 bytes |
| SHA-256 | `f5b05479f2869a714897142e5652381a4e81ba77d02300b5e5e0f738d722ca82` |
| Whole database comparison | All 150 public tables matched sorted row-content fingerprints immediately after restore |
| Database structure | 101 migration entries and 274 row-security policies retained |
| Business data | 285 products, 64 categories, 7 orders, 10 customers, 27 app records, 11 app packages and 15 app versions |
| Original source after the exercise | All 150 original table fingerprints unchanged |

The restored WooCommerce target retained its eight private reviewed batches,
historical EUR 44.70 order, EUR 24.80 browser order and stock of two. Anonymous
access returned 401 and another workspace's authenticated owner returned 403.
Backups, connection strings, encryption keys and session files remain private;
they are not documentation assets.

## Existing order and service chain

The exercise used the existing Rust Core, PostgreSQL outbox, Flow Builder,
app gateway and Rust connector service. A local SMTP receiver and local payment
protocol endpoint supplied disposable external wire fixtures. Python implements
only those test endpoints and orchestration, not a production worker.

1. Install and configure the existing email app, enable actual SMTP delivery to
   the local receiver and register the ordinary `order.placed` email Flow.
2. Install the existing generic payment-provider package with its local protocol
   fixture. Create an ordinary EUR 19.90 pickup order through native checkout.
3. Reconcile and capture through the durable native payment ledger. Order
   **`RAC-b3e45df1`**, ID `b3e45df1baa647d5afd51a57df74fb7e`, reached the
   captured state. No money was charged.
4. Receive exactly one actual SMTP message containing that order number. Its
   SHA-256 was `0f978c7285ae9ba43cdae45088ecf5063553a6ca82da098b86bf01e01f90590b`.
5. Create the native German invoice with an idempotency key. The returned PDF,
   **1,122 bytes**, contains `Rechnung`, `INV00000001`, the original product and
   `19.90 EUR`. ID: `1c42ea45a70a43d489dc7933388caf75`; SHA-256:
   `60bc06de2f5c71f631733f4193c005157bc020073440368b8dd4b9d903f7f512`.
6. Refund all **1,990 EUR minor units** through the native provider job. Repeating
   the same idempotency key retained one refund job and exactly one provider
   refund call.
7. Separately cancel the restored, unpaid demo order `RAC-537c1ef2`. Stock
   returned from one to two exactly once; the stale cancellation replay returned
   409. This cancellation is distinct from the captured order's refund.

The local payment fixture exercises the generic provider protocol, not an actual
Shopware Payments account. Real settlement and external email delivery are not
claimed. The prior [browser purchase](woocommerce-source-2026-10-29.md) covers
contact/address forms, confirmation, return and an empty basket; the restored
operational chain above was exercised through actual native HTTP operations.

## Restricted connections after recovery

The registered signed-scope provisioning and adversarial SQL probes were run
against the restored database through separate authenticated logins. The system
and tenant roles have no ownership, superuser, RLS bypass or inherited authority.
The restored Core then restarted with both `DB_RLS_REQUIRED=true` and
`DB_SCOPE_REQUIRED=true` and separate system/tenant connections.

Actual checks retained private batch access, read the refunded order and invoice,
and performed an authorized `merchant.order.note` MCP write. Forged GUC scope,
foreign reads/writes, expired or forged tickets, protected identity/key access,
DDL, truncation and attempts to disable RLS were denied by the existing SQL probes.

The Rust connector restarted with a third restricted login, strict RLS and grants
only on its six connector tables, sequences and migration metadata. It has no
Commerce data grants. Reading the existing encrypted email configuration through
the native app action succeeded after restart. SMTP delivery above preceded
this final restricted-connector restart; no second delivery is asserted.

## Reproduction and recovery discipline

Use the existing database backup/restore utilities and registered
`scripts/security/authenticated_scope.py` provisioning checks. Stop the owned
source writers, save the dump and its hash, restore into a newly named isolated
database, compare table contents before testing, and configure fresh restricted
runtime roles within that copy. Start the existing Rust binaries on separate
ports with local SMTP/provider fixtures. Preserve the original database and
verify its final content hashes. Do not point development workers at hosted
customer data or replay a restored outbox against live providers.

[Hosted backup and release procedure](../cloud-releases.md),
[current delivery state](../status.md).
