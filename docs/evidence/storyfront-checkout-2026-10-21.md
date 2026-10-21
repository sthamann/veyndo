# Original Storyfront embedded checkout: 21 October 2026

Public Core `fa33a003`, image `shallow-place-4222`, was running during this
browser acceptance. The original Lumen Story Lab Experience retained its
separate Storyfront deployment. No local replacement storefront was used.

The browser added one synthetic ceramic cup to the original Storyfront bag,
then opened the native checkout in its iframe. The first navigation remained
paused by browser automation: the diagnostic API explicitly reported a paused
document response. The visible bounded timeout retained the bag and offered
retry. The ordinary retry loaded contact/address fields and the native quote.
This observation is not evidence that every first navigation is reliable.

After rejecting optional tracking, the guest flow used synthetic contact and
address data, pickup and the explicitly simulated payment method. The iframe
completed order `RAC-585cbb53` for EUR 24.90, with EUR 3.98 VAT. Confirmation
retained the German product name, quantity one and simulated authorization.
No real provider was charged.

The confirmation's return action closed the iframe and returned to the original
Experience. Its own bag showed zero items and the order-confirmed message.
Opening the bag showed no purchased position. A full reload and Storyfront
hydration retained bag count zero.

This accepts the complete embedded purchase/return/cart reconciliation path on
the named public version after retry. It does not claim an uninterrupted first
load, real payment acceptance, or independent B2B approval.
