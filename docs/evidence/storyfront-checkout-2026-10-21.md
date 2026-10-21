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

## Repeated against Core fb8d54e0

With public Core image `dainty-ray-8892` running, the same original Experience
completed simulated order `RAC-fcaacdc2`: one ceramic cup, German product name,
EUR 24.90 total and EUR 3.98 VAT. Its receipt return closed the iframe, showed
the order-confirmed message and emptied the original bag. Full page reload and
hydration retained bag count zero. Screenshots captured embedded review, receipt
and the empty original bag.

Two earlier opens in the existing controlled tab timed out. The browser's
diagnostic API explicitly reported a paused document response. Closing the
dialog and fully reloading Storyfront preserved its one bag item; the next
ordinary Checkout action loaded the iframe and completed the purchase above.
This records a successful complete journey after a fresh page start, not a
claim that the prior automation-related first-load failures disappeared.

The same test found a separate presentation defect: on the long-description
Purchase scene at a 2060 x 881 viewport, the fixed Ask bar overlaps the add button.
Keyboard activation added exactly one item. That workaround completes this
checkout regression but does not accept pointer usability of the covered button.
