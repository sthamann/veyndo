# storefront/catalog

Product details, variants, purchase, reviews, attachments and public grounded questions.

Each file starts with its responsibility. See [the source inventory](../../../../docs/module-inventory.md) for the full map.

## Modules

- [`CrossSelling.tsx`](CrossSelling.tsx): Merchant-selected recommendations use bounded current-cart detail reads and the shared native product tile; unavailable products disappear.
- [`ImagePlaceholder.tsx`](ImagePlaceholder.tsx): Honest empty-media state for newly created products; never invent a product photograph.
- [`MemoryRecommendations.tsx`](MemoryRecommendations.tsx): Public consumer of merchant-approved learned associations, hydrated with current product state.
- [`ProductAttachments.tsx`](ProductAttachments.tsx): Public attachment list follows the active storefront tenant and channel; private downloads are never listed.
- [`ProductPage.tsx`](ProductPage.tsx): Product family, gallery, context pricing and moderated customer reviews.
- [`ProductPurchase.tsx`](ProductPurchase.tsx): ProductPurchase: focused pdp-purchase view with explicit typed inputs and callbacks.
- [`ProductQuestion.tsx`](ProductQuestion.tsx): Read-only product questions cite only tenant-owned, explicitly published source documents.
- [`ProductReviews.tsx`](ProductReviews.tsx): ProductReviews: focused pdp-reviews view with explicit typed inputs and callbacks.

## Verification

Run affected tests, `npm run build` and `npm run architecture` from `frontend/` during development. Complete tests and coverage run daily through the existing workflow. Coverage includes untested source files. See [testing and limitations](../../../../docs/testing.md); file presence does not mean full test coverage.
