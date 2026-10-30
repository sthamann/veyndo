# shared/content

Structured rich-content rendering without injecting arbitrary HTML.

Each file starts with its responsibility. See [the source inventory](../../../../docs/module-inventory.md) for the full map.

## Modules

- [`RichDescription.tsx`](RichDescription.tsx): Safe rich blocks with native image/video rendering; no HTML interpretation or script execution.
- [`product-seo.ts`](product-seo.ts): Shared per-field SEO inheritance, encoded product paths and client feedback matching native metadata limits.
- [`rich-document.tsx`](rich-document.tsx): Safe structured editor rendering. Only known nodes/marks produce elements; URLs are never executable.

- [`product-specifications.ts`](product-specifications.ts): Native field-level specification fallback shared by Studio preview and storefront; preserves regional keys and explicit blanks.

## Verification

Run affected tests, `npm run build` and `npm run architecture` from `frontend/` during development. Full tests and coverage run daily through the existing workflow. Coverage includes untested source files. See [testing and limitations](../../../../docs/testing.md); file presence does not mean full test coverage.
