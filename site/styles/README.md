# Shared public-site styles

`../style.css` declares the ordered modules. Keep that order: it preserves the
existing cascade, including responsive overrides. `scripts/build_site.py` flattens
the sources into one stylesheet at each existing marketing/handbook URL. Readers
do not fetch the individual imports.

| Module | Responsibility |
| --- | --- |
| `foundation.css` | Colors, reset, common page shell and header |
| `landing.css` | Hero, calls to action and product preview |
| `sections.css` | Sections, demo cards and performance cards |
| `architecture.css` | Architecture illustration and quick-start terminal |
| `articles.css` | Articles, notices, tables and disclosures |
| `footer-charts.css` | Footer and benchmark bar charts |
| `responsive.css` | Breakpoints and reduced motion |
| `benchmark.css` | Detailed benchmark document |
| `handbook.css` | Legacy handbook styles and final shell overrides |

Each module has an ownership comment and at most 320 lines. The build rejects
missing/duplicate/unregistered modules, nested imports, escaping symlinks and
asset URLs that would require rebasing. SVG/bitmap assets currently belong to
HTML; add explicit URL resolution before introducing CSS image URLs.

Run the existing documentation build and checks after edits:

```sh
python3 scripts/build_site.py
python3 scripts/check_site.py
```

The 23 October extraction preserves every original CSS rule and its order; only
module responsibility comments were added. `docs.css` and `showcase.css` keep
their separate handbook-interaction and film-gallery responsibilities.
