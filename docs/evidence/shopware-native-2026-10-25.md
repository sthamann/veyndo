# Native Shopware translation acceptance — 25 October 2026

This local source acceptance covers `shopware-6.7/cart-percentage-v1`. It does not
certify general PHP plugins, a full Rust Shopware VM or a public rollout.

## Same source, two completed purchases

The complete synthetic `NativeDiscountReference` plugin in
`extensions/apps/shopware-compat/native/tests/fixture/` was installed unchanged in
original Shopware 6.7.14.2 and parsed by the native Rust compiler. The generated
app was imported into a private Veyndo environment, tested, staged and released
through the existing exact-digest selected publication.

| Observed effect | Original Shopware | Native Veyndo |
| --- | --- | --- |
| Product gross price | EUR 24.90 | EUR 24.90 |
| Percentage discount | 10% | 10% / 249 minor units |
| Goods total | EUR 22.41 | EUR 22.41 |
| Stock after one order | 9 | 9 |
| New active cart | Empty | Empty |
| Payment | Unpaid invoice | Bank transfer, no provider charge |

Original order: `01a17326bfb573e2894a82edf705a242`. Native order: `3829d7df779c409a8f541f3c6856b41f`.
The native order retains component digest `aeec9c89dd20ae63915ea17d78c5a911476712686636da3168afdcc09a9e5c60`, app
`imported_discount`, version `1.0.0`, currency EUR, scale 2 and reason
`shopware_discount`. The source fingerprint is `018a42953c4fa53b21ba82d71980a6972d039476c0131a1dd97bf29729e6011a`.

The original order retains its separate negative discount line. Native Veyndo
uses its existing proportional line allocation. This acceptance compares the
aggregate goods total, stock and empty active cart; it does not claim equivalent
line representation, mixed-tax behavior, shipping or promotion interactions.
The completed native cart remains available for idempotent order recovery;
the customer proceeds with a new empty active cart.

## Verification exercised

- Real authenticated HTTP and MCP translation through the app gateway, with an
  explicitly allowlisted compiler-only tenant and no original runtime credentials.
- A developer-only integration key can open the translation surface and translate,
  while reference inspection and its surface are rejected. A key with app
  management alone cannot open the translation surface.
- Current developer permission rejection, rejected direct service access and
  no installation during analysis.
- Malicious/unknown PHP and unconverted resources produce diagnostics and no
  installable manifest. Signature, namespace, PSR-4, XML and source-depth checks
  retain the complete-package boundary.
- Real native frozen examples and WIT evaluation, minor-unit rounding, currency
  retention, wrong-hook refusal and amount bounds.
- Private package installation while the live app registry stays unchanged,
  exact selected publication and a real PostgreSQL order.
- Repeated order submission returns the same order, stock is reduced once and
  a separate shop receives no discount hook.
- The original-cell regression still exercises lifecycle jobs, callbacks,
  restart fences, original App Scripts, migrations, data retention and actual
  container root/user/network isolation.
- Chrome acceptance used the actual sandboxed app surface: complete folder
  selection, source translation, native App Studio import, proposal review and a
  saved private version with eight declared examples. The separate developer
  translation surface was also opened and used in Chrome. This used manual package
  transfer, not a one-click handoff. The source plugin's original German/English
  names are preserved; missing translations are not invented.
- A separate Chrome purchase completed with the translated native discount:
  order `RAC-8ff9d92c`, EUR 22.41 total, EUR 3.58 VAT and EUR 2.49 discount.
  The demo provider reported a simulated authorization with no real money.
  Return to the shop, full reload and reopening the cart showed it empty.
  The previously missing receipt discount label is now localized EN/DE/FR/ES;
  Chrome displayed the German label. The existing receipt regression asserts
  the accepted discount amount and label.

Pull requests changing the compatibility package now run the original/native
purchase comparison automatically and retain the two synthetic result files.
This does not replace or weaken the shared repository checks.
The comparison passed in hosted run
[`40197036099`](https://github.com/sthamann/veyndo/actions/runs/40197036099)
on source `9acc45af`; full repository verification is tracked separately.

## Dependency isolation and release-image checks

The first hosted build exposed a shared-dependency error: the PHP parser's schema
dependencies enabled JSON insertion-order serialization in the Commerce build.
Localized maps then produced unstable package approval digests. The compiler now
has its own Cargo workspace and lockfile, and native package hashing explicitly
sorts all object keys. All 26 existing package identities retained their previous
digests. The full root workspace tests and both Clippy builds passed after this
correction; negative dependency checks reject reintegrating the parser workspace
into the core build. Three independent CLI processes emitted identical reports.

The final local controller image is
`sha256:000217f9dacc201d002cfe2560c58f40a03477d9ca74429239b843386c339ff7`.
It translated the same fixture with a read-only filesystem, an unprivileged user,
all capabilities dropped, no-new-privileges, 256 MiB memory and one CPU. Its image
contains no PHP, Python or Cargo executable. Health and authenticated translation
passed; unauthenticated translation returned HTTP 401. This is local image
acceptance, not a registry publication or production deployment.

## Reproduce

```sh
cargo test --locked --manifest-path extensions/apps/shopware-compat/Cargo.toml --target-dir target
cargo build --locked --no-default-features -p veyndo --bin veyndo
cargo build --locked --manifest-path extensions/apps/shopware-compat/Cargo.toml --target-dir target --bins
npm ci --prefix frontend && npm run build --prefix frontend
python3 extensions/apps/shopware-compat/tests/container.py --docker-context colima-veyndo-check --cell-image IMAGE
python3 scripts/testing/workspace_boundaries.py
python3 scripts/structure.py
```

The container driver creates its own databases and removes only its generated
containers/volumes afterward. `IMAGE` can reuse the pinned original-cell recipe.
Outputs are `artifacts/shopware-native-original-result.json`,
`artifacts/shopware-native-result.json` and `artifacts/shopware-native.log`.
These contain synthetic test identifiers, never provider credentials.

The crate tests passed seven compiler tests and four controller tests. Cargo
boundary checks passed 21 negative controls; the structure gate passed with 729
Rust modules and 836 frontend modules. Clippy passed with warnings denied.
The complete source inventory is recorded with the translator and gateway modules
classified as unproved. Existing Lean contracts, axiom checks and 156,749 compiled
Rust/Lean comparisons pass; no PHP compatibility theorem is claimed.

[Native translation contract](../shopware-native-translation.md) · [Current status](../status.md)
