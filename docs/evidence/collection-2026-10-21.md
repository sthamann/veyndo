# Connected collection: public acceptance, 21 October 2026

The public configured-model task uses the existing Rust worker, native category
and product operations, translation queue and site-builder app. The test shop is
`agent-release-abnahm-0054aa7088`; all products and payments are synthetic.

## Observed private journey

1. The saved task created one category, assigned exactly Filzhorizont and Tonruhe,
   prepared two Italian translation drafts and saved one landing-page draft.
2. After contract repairs, continuation retained the completed category rather
   than duplicating it. All five steps completed. Both translation drafts were
   separately reviewed and applied in the private environment.
3. Native product inspection retained EUR 49.90 / stock 20 and EUR 34.50 / stock
   20. The unrelated third product was unchanged.
4. Translation review retained the private environment. The ordinary page editor
   opened without requiring the optional form receiver package.
5. A second natural-language request read the existing page and proposed shorter
   Italian headings with the existing descriptions moved into normal paragraphs.
   Explicit approval applied one native app action. The preview displayed the
   corrected text and exactly the original two selected product IDs.

## Publication repair

The initial public release failed because page validation ran before the selected
language settings. Commit `be620bfd` applies selected native configuration before
app records inside the same existing transaction. Current rights, package locks,
selection digests and final aggregate validation remain authoritative.

An actual local HTTP/PostgreSQL regression reproduces the related failure when
publishing a page with its newly selected channel. The repaired path accepts a
joint language/channel/package/page release, rejects missing dependencies with
complete rollback, rejects a stale digest, and rejects replay. Existing staging
and 43 tenant-isolation controls pass. Four interface tests check actionable
localized errors and suppression of private diagnostics. The existing frontend
baseline passed 732 tests. An independent Claude review found no additional issue
in the release-order change; it is static review, not public purchase evidence.

## Public selected release and purchase

Core/Studio `be620bfd` passed its deployment health check. At 13:34 CEST the
reviewed site-builder package, page, category, two products and settings published
together. Studio reported no remaining unpublished changes and recorded all six
units in publication history.

On the public shop domain, the selected product completed order `RAC-484bd556`
with its Italian product label, quantity one, EUR 49.90, German test address and
simulated demo payment. Return opened the native shop and an explicitly empty
cart. No real money moved. This is the standard storefront journey, not another
Storyfront iframe acceptance.

The public page rendering exposed a separate content/interface-language mismatch.
The app-owned renderer and SEO now use the same selected content locale as native
product reads. The Italian regression fails before this fix and passes afterward;
a French shop-main-language fallback control also passes. Image `quack-sand-8930`
(commit `f3255dab`) deployed at 13:54 CEST with one healthy instance. The actual
public Italian page now shows all three headings, original paragraphs, exactly
the two selected products and an Italian document title. The public cart remains
empty. This follow-up is a browser observation, not just the local rendering test.
