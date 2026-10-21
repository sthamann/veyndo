# Furniture configuration: hosted private browser acceptance, 21 October 2026

The ordinary public Studio created app `furniture_mvi1n42k` from the app-owned
`1.0.1` pattern, saved its immutable version and installed it into private
`stage-b6a9474f38cd4d53a73a`. F5 preview records and installed sandbox records
remained separate. All identities, products and payments below are synthetic.

## Observed purchase and immutable order

The native product editor created desk `5d1e8a7c-651c-4492-abfe-1fae901ee526`
with EUR 349 base price and stock 10. The installed material library supplied
Walnut at EUR 20. Configuring 260 x 80 cm added EUR 48 for oversize. The real
browser checkout completed simulated order `RAC-38fed56b` for EUR 417 at
13:47:54 CEST. Confirmation and native Studio order inspection retained material,
dimensions and EUR 68 surcharge. Return displayed an empty cart, stock became 9,
and the existing order.placed Flow wrote its fulfillment note at 13:47:55.

Changing the installed material to Walnut Select / EUR 30 did not rewrite that
order: it still displays Walnut / EUR 68 surcharge / EUR 417. After reload, a new
260 x 80 configuration displays EUR 427. No real provider was charged.

## Continuation defects and regression coverage

Without reload, the configuration form still sent the completed cart's revision.
The correction routes configuration through the existing serialized storefront
commands, which create a fresh open cart and preserve current native CAS. A queued
add uses the configured revision. Tests reject stale conflicts without retry and
late results after a shop switch.

Studio reload also discarded the sandbox choice. The correction remembers only
the environment identifier per live shop and browser tab. Native access is checked
again; a denied sandbox stays closed. An explicit Live shop action remains
available to recover. Tests cover reload, changed shops, revoked access, explicit
return to live and unavailable browser storage.

These two continuation repairs are locally verified, awaiting public rollout.
The full frontend suite passes 743 tests in 127 files with unchanged coverage
gates. This browser session does not yet accept independent B2B approval or the
saved-input reorder journey; those have separate local HTTP/PostgreSQL coverage.
