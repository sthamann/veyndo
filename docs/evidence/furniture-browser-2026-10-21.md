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

Public image `shallow-place-4222` (`fa33a003`) started as deployment
`vendune-core-647d66b84d` at 14:13 CEST, with one passing replica and zero restarts.
The hosted browser completed another simulated order, `RAC-6c9f8c4f`, at 14:17:51:
Walnut Select, 260 x 80 cm, EUR 78 surcharge, EUR 427 total and EUR 68.17 VAT.
The German product label, native order record and order.placed Flow note agree.
Return showed cart zero. Without reloading, a new 180 x 80 cm configuration and
add-to-cart succeeded at EUR 379 with the correct EUR 30 surcharge. The previous
completed-cart conflict no longer occurs. The Studio orders page also retained
the private workspace and both original amounts across a full browser reload.

That continuation exposed a remaining presentation bug: replacing a completed
cart cleared the configuration controls even though the native selection and
new cart were correct. The follow-up preserves controls while refetching prices
for a new cart token, but resets them for a different buyer, country, currency or
company. A rendered regression first reproduced the empty field, then passed both
cart rollover and changed-buyer reset. The full frontend suite passes 744 tests with unchanged coverage gates.

Image `tangible-cat-3650` (`b0b8cba7`) is now running as deployment
`vendune-core-5457d5668b`, with one passing replica and zero restarts. An early
observation during the rolling deployment still showed empty controls; it is
retained as a failed observation rather than attributed to a speculative cause.
After explicitly reloading the storefront, simulated order `RAC-1c51b79e`
completed at EUR 379 (Walnut Select, 180 x 80 cm, EUR 30 surcharge). Return
showed an empty cart. Without another reload, the shopper reopened the product,
changed width to 240 cm and saved. Material, width, depth and the saved message
remained visible after cart renewal and the repeated privacy choice. Adding the
product retained all three values and EUR 379 in the native checkout. Observed
order/cart responses retained the same customer, country and currency context.
This verifies the control-preservation fix in the loaded public build. The
repeated privacy prompt on a new cart remains a separate usability issue.

This browser session does not yet accept independent B2B approval or the
saved-input reorder journey; those have separate local HTTP/PostgreSQL coverage.

## Saved inputs before adding a product

A further public browser check found that reloading after saving a configuration,
before adding the product, retained the native price but displayed empty input
fields. The configuration was stored in the cart; the form restored inputs only
from cart line items, which did not yet exist.

The follow-up extends the existing cart response with `savedConfigurations`:
accepted fields identified by app and product. It does not expose fee/rule
snapshots or introduce another persistence or calculation path. The form restores
the matching entry, with the line-item representation as a compatibility fallback.
Rendered tests reject entries for a different app or product and clear values for
a new cart. The actual HTTP/PostgreSQL app workflow verifies saving with no line
items, a fresh cart read, and isolation from a second cart. Public deployment and
browser reload acceptance of this additional repair are still pending.
