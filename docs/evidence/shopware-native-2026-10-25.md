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

Original order: `01a172ecaa88719d8bad8a24cb9b547b`. Native order: `88ad3e354bc04c4586123583ba98c7a9`.
The native order retains component digest `592681527458beb66eb41acb869662f32f16a624b6e1bfdb0151011db71a7d7b`, app
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
  saved private version with eight declared examples. This used manual package
  transfer, not a one-click handoff. The source plugin's original German/English
  names are preserved; missing translations are not invented.

Pull requests changing the compatibility package now run the original/native
purchase comparison automatically and retain the two synthetic result files.
This does not replace or weaken the shared repository checks.

## Reproduce

```sh
cargo test --locked -p veyndo-shopware-native
cargo build --locked --no-default-features -p veyndo -p veyndo-shopware-native --bin veyndo --bin shopware-compat --bin shopware-native
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

[Native translation contract](../shopware-native-translation.md) · [Current status](../status.md)
