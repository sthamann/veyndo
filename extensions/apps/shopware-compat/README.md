# Shopware extensions: native translation and original reference environments

The Rust compiler translates the admitted cart-percentage profile into a regular
Veyndo commerce app. Start with the [native translation guide](../../../docs/shopware-native-translation.md).
For native analysis alone, set `APP_TOKEN` and `SHOPWARE_COMPAT_TENANTS` to
`{"merchant-id":{}}`. No original runtime, callback key or database connection is
needed. The translation action requires `developer.manage`; its results remain
proposals until the existing private import and release steps succeed.

This optional app also manages original Shopware extensions from Veyndo. The controller
is Rust; the separate cell runs original Shopware PHP, MariaDB and its workers.
All app code, UI, deployment and fixtures live in this directory.

The tested target is Shopware **6.7.14.2**. The cell image uses production commit
`0242545ecdb2364cdb01aa41340c3063282de79e` and the checked-in Composer lock.
Composer recipes are applied during the build; the resulting image ID is the
deployment identity. Save that image and its recipe lock with the release.

## What runs where

- Original Shopware owns extension installation, dependency injection, DAL,
  migrations, event subscribers, Twig, App Scripts, administration and storefront.
- Veyndo owns app consent, current roles, MCP admission, native job leases,
  operator-approved UI bundles, private audit records and their revisions.
- The controller has scoped Veyndo callback keys and a separate Shopware
  integration for each environment. It has no Veyndo database credential,
  Docker socket, arbitrary command endpoint or arbitrary URL proxy.
- Each cell gets a separate MariaDB database, volumes, process limits and network.
  Original plugin tables stay there. Veyndo uses its existing shared app tables.

The original-cell mode does not itself convert plugin behavior into native checkout hooks. The separate source compiler implements the bounded native profile documented above.
Shopware storefront/admin extensions run on their original surfaces. Use the
[migration assistant](../../../docs/agentic-migration.md) for reviewed transfers
into native Veyndo. This app does not synchronize two order or inventory ledgers.

## Create one isolated cell

Run from the repository root. Use a different Compose project and independent
secrets for every merchant and environment. Keep the environment file outside
the repository with mode 0600. It needs:

```dotenv
CELL_IMAGE=sha256:<built-image-id>
CELL_URL=https://shopware-cell.example.com
CELL_DB_PASSWORD=<independent-random-hex-secret>
CELL_SECRET=<independent-random-hex-secret>
CELL_PORT=8814
```

```sh
docker build -f extensions/apps/shopware-compat/deploy/Cell.Dockerfile -t shopware-cell:6.7.14.2 .
docker image inspect shopware-cell:6.7.14.2 --format '{{.Id}}'
# Copy that exact image ID into CELL_IMAGE before starting the environment.
docker compose --env-file /secure/cell.env -p merchant-sandbox -f extensions/apps/shopware-compat/deploy/compose.yaml --profile setup run --rm setup
docker compose --env-file /secure/cell.env -p merchant-sandbox -f extensions/apps/shopware-compat/deploy/compose.yaml up -d --build ingress web worker scheduler
```

A separate unprivileged ingress binds only to loopback; PHP, workers and MariaDB remain on an internal network. Put the configured HTTPS origin behind
the deployment's reverse proxy. Runtime networking defaults to the cell's internal
network. Apps needing remote registration, providers or webhooks require an
operator-configured egress gateway and inbound routes. No external provider is
enabled by this package. Mail starts disabled.

Install original administration/storefront assets with the same image:
`docker compose … exec web php bin/console assets:install` and
`docker compose … exec web php bin/console theme:compile` after configuring a
sales channel. Stage extension files only in this cell's `custom/plugins` or
`custom/apps`, then use original Shopware refresh/install commands or its
administration. Composer plugins belong in a reviewed image build. Retain the
original extension license and required vendor credentials.

## Connect the Rust controller

Build with `cargo build --locked --manifest-path extensions/apps/shopware-compat/Cargo.toml --target-dir target --bin shopware-compat`, or
build `deploy/Controller.Dockerfile` from the repository root.

1. Install `shopware_compat` in Veyndo Apps with its current canonical manifest
   digest and consent. Reference service actions require `apps.manage` and `team.manage`; native
   translation and its separate workspace require `developer.manage`.
2. Create its scoped callback key with `data.read`, `data.write`, `jobs.write`.
   Use a current merchant identity and expiry. Revocation retains the usual native
   job and callback fences.
3. In each original cell, create a Shopware integration for the required Admin
   API extension operations. Keep its credentials server-side. Create distinct
   credentials for every cell and never reuse a Veyndo login.
4. Set `APP_TOKEN` to the core gateway's independent app token. Set
   `SHOPWARE_COMPAT_TENANTS` to the following structure, using exact root origins:

```json
{
  "merchant-id": {
    "coreUrl": "https://api.veyndo.example",
    "callbackToken": "<scoped-app-key>",
    "cells": {
      "sandbox": {
        "url": "https://shopware-cell.example.com",
        "clientId": "<shopware-integration-id>",
        "clientSecret": "<shopware-integration-secret>",
        "version": "6.7.14.2",
        "imageDigest": "sha256:<built-image-id>",
        "environment": "sandbox"
      }
    }
  }
}
```

The service checks the original version on each inspection. `imageDigest` is
operator-supplied deployment metadata, not remote image attestation. Each cell
requires its own hostname, also distinct from every configured Veyndo core host.
Different ports do not isolate cookies. The service rejects a reused hostname
across shops/cells, including reuse on another port. Deployment must also avoid
aliasing one database through different hostnames. For local browser tests use
`localhost` for one cell and `127.0.0.1` for Veyndo; never open multiple Shopware
installations on that cell hostname. Loopback HTTP requires `SHOPWARE_COMPAT_LOCAL_TEST=1`.
Use HTTPS otherwise. `SHOPWARE_COMPAT_BIND` defaults to `127.0.0.1:8812`.

5. Configure the existing Veyndo `APP_SERVICES.shopware_compat` with the service
   origin/token and `uiUrl` set to the same origin, `approvedDigests` from `veyndo --app-digest …/manifest.json`, and
   `uiDigests.index.html` from `python3 scripts/build_app_ui.py shopware-compat`.
   Existing private-origin, network admission and service quotas still apply.
   Regenerate `ui.html` using `--output extensions/apps/shopware-compat/ui.html`
   when changing the UI. The binary embeds exactly these bytes.

## Use and recover

Open the installed app's workspace. Select an environment, inspect the actual
extensions, review a change and submit it. Installation, activation, deactivation,
update and uninstall use the original Shopware lifecycle API. Uninstall always
keeps user data. Updates do not silently accept new app permissions.

The review binds the tenant, cell, deployed version, configured image ID and
observed extension state. A second read follows a durable native CAS lock before
the effect. Only one controller mutation per cell can proceed across replicas.
Use this controller exclusively for managed lifecycle changes; simultaneous direct
administrator changes in Shopware cannot be transactionally locked by Veyndo.

An interrupted mutation retains `started` in its private receipt/lock. Do not
blindly retry it. An operator must stop the cell's processes, inspect the original
database/extension state, retain the receipt, and explicitly reconcile the lock
through its current native record revision before restarting. Clearing an uncertain
lock while Shopware still runs can duplicate extension effects. Normal preflight
failures release the lock before any mutation has been sent.

On SIGINT or SIGTERM the controller closes HTTP admission and waits up to 60
seconds for its leased background jobs after current requests finish. Give the
deployment enough termination time for these requests and the drain period.
A forced termination or drain timeout leaves started operations fenced; restarting
the process does not repeat an uncertain extension change.

Operational records have `operational: true`: they cannot be cloned or selectively
published as sandbox configuration, nor changed back into publishable data.
The original database and files require their own coordinated backup/restore;
Veyndo's PostgreSQL snapshot does not include them.

## Verification

For a complete fresh run, build the two native binaries and run:

```sh
cargo build --locked --no-default-features -p veyndo --bin veyndo
cargo build --locked --manifest-path extensions/apps/shopware-compat/Cargo.toml --target-dir target --bins
npm ci --prefix frontend && npm run build --prefix frontend
python3 extensions/apps/shopware-compat/tests/container.py
```

The driver builds original Shopware, creates isolated PostgreSQL and MariaDB,
installs the two fixture extensions, compiles the original theme and exercises the
native gateway. It then installs the native discount source fixture in original Shopware, translates the identical source, performs a native private import and selected release, and compares the two purchases. It checks data retention after uninstall and actual container
restrictions, then removes only its own generated containers and test volumes.
Use `--docker-context NAME` without switching your Docker default, or
`--cell-image IMAGE` to reuse an already built cell. The native integration
registry includes `shopware_compat`, so normal full CI executes the original
runtime test and collects its Rust/Python coverage. The dedicated GitHub workflow
supports a focused manual run. Local registry runs can set `SHOPWARE_TEST_CELL_IMAGE`
to reuse an immutable cell image; CI builds the checked-in recipe.

`cargo test --locked --manifest-path extensions/apps/shopware-compat/Cargo.toml --target-dir target` checks destination and
event/command admission. `tests/integration.py` runs against an original Shopware
installation, not an API fixture. Stage the two packages in `tests/fixtures`, run
`plugin:refresh`, install the fixture app inactive, and provide an isolated native
PostgreSQL database plus `SHOPWARE_TEST_URL`, `SHOPWARE_TEST_CLIENT` and
`SHOPWARE_TEST_SECRET`. The test refuses a non-loopback Shopware origin.

It checks the native gateway/job/callback path, original plugin migration and
event execution, original App Scripts, current permissions, foreign-cell rejection,
persistence of an uncertain cell fence across service restart, and an original
storefront/guest order while the plugin is active, with stock deduction and an
empty cart. The invoice transaction remains unpaid and mail stays disabled. A pass covers
these fixtures; it does not certify arbitrary third-party extensions, Shopware 5,
all 6.x versions, commercial licenses or provider-dependent payments.
