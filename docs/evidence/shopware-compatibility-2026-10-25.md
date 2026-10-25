# Original Shopware compatibility: local acceptance, 25 October 2026

This report covers the optional compatibility app and generic host repairs developed
from main `19d3d57f`. These are local results for the changed source, not a public
rollout or a compatibility certificate for arbitrary third-party packages.

## Executed journeys

| Test | Observed outcome |
| --- | --- |
| Fresh original runtime | Disposable Shopware 6.7.14.2, private MariaDB, web, worker, scheduler and ingress initialized successfully. The driver removed its own containers and volumes afterward. |
| PHP plugin | Original install and migration, dependency-injected event subscriber, activation, deactivation and uninstall completed through native Veyndo jobs. Migration data remained after uninstall. |
| App Script | The original Twig interpreter returned the submitted probe through the activated app endpoint. |
| Original purchase | Product page loaded with the plugin active. A synthetic guest bought one EUR 19.90 product through the Store API. The accepted order retained that line, available stock changed from ten to nine and the reopened cart was empty. Its original manual invoice transaction stayed open; no provider payment was made and mail was disabled. |
| Veyndo app admission | Pinned UI bytes, native callback authority, foreign-cell rejection, insufficient-role rejection and MCP filtering passed. |
| Restart | A retained started operation continued to fence the cell after controller restart. No second extension effect ran. |
| Shutdown | SIGINT and SIGTERM both returned a normal exit in the original-runtime integration test. The controller stops HTTP admission and drains background job permits; unfinished operations keep their durable fence. |
| Sandbox | Operational records were neither cloned nor offered for selective publication. Ordinary configuration still cloned. |
| Container boundary | The actual web container ran as www-data with a read-only root, all capabilities dropped and only the internal cell network. |
| Controller image | The release Docker image built and served its Rust health response as non-root `app`, with a read-only root and dropped capabilities. It contained neither a PHP nor a Python interpreter and exited normally on SIGTERM. |
| Browser | Personal sign-in, extension inventory, search, review dialog and cancellation worked in Chrome. The guide includes the actual Studio capture. |

The image used for the local acceptance was
`sha256:97a3026105b710f8ec43618a2f434e9ddd6c6d3c7e33293ddba5b614d4cfeb17`.
The package recipe pins original production commit
`0242545ecdb2364cdb01aa41340c3063282de79e` and includes its Composer lock.
A build on another architecture has a different image identity.

## Shared host regression

- 235 Rust unit tests passed for the commerce and compatibility binaries; Clippy
  passed with warnings denied.
- Ten focused AppFrame tests passed, including foreign document URLs, changed
  context, bridge admission and retry behavior. The frontend production build passed.
- All eleven shared app-surface integration cases passed against PostgreSQL,
  including encrypted settings, revoked/foreign authority, MCP and bounded egress.
- All 43 tenant-isolation checks passed. These test API/MCP/UCP, object ownership,
  foreign mutations, composite links and the existing app RLS contract. They do
  not establish fleet-wide deployment or the strict production runtime-role setup.
- The registered `tenant_isolation` and `shopware_compat` run passed together,
  followed by structure, localization, API catalogue and source-inventory checks.
- The extracted app-release predicate now excludes operational records. Lean
  checked 150 properties over the existing 63 policies, with 156,749 compiled
  Rust/Lean comparison cases and zero mismatches. Mutation checks rejected 184
  broken policies. The asynchronous controller and original PHP remain unproved.

## Reproduce

```sh
cargo build --locked --no-default-features --bin veyndo --bin shopware-compat
python3 extensions/apps/shopware-compat/tests/container.py
```

The normal native suite now includes `shopware_compat`; the optional manual GitHub
workflow runs the same package test in isolation. The complete CI run and public
acceptance retain their separate status in [current status](../status.md).

## Scope still outside this implementation

There is no automatic two-way product, inventory or order synchronization with
native Veyndo, and original checkout plugins do not modify the native Rust
checkout. App packages requiring external registration, mail or payment providers
need their own allowed routes and configuration. This local acceptance uses two
purpose-built extensions; it does not certify Shopware 5, every 6.x version or
arbitrary commercial extensions. Provisioning and package staging use the supplied
operator deployment and original Shopware tools.

[Merchant guide and screenshot](../shopware-compatibility.md) ·
[Operator setup](../../extensions/apps/shopware-compat/README.md)
