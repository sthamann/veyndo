# Current product films and screenshots · 30 October 2026

## Source and scope

Core main `3ff4b3cd25fb73724572ca6b0d0dac9f3ed61de2` was current at capture. Public
Studio was reopened in the existing private synthetic shop for product content/SEO,
Shop intelligence, saved customer results, visual shop design, app canvas/settings,
app assistant and retained consultation record. No provider job, product write or
purchase was made for these captures. Dated local native screenshots from 29 and
30 October supplement recommendations, media, app entry and upgrade checks.

The four films are editorial sequences of still captures, with English titles and
burned-in captions. The interface contains English and German text. Film duration
is not a runtime measurement. Reopened customer results retain their original run.
Historical 13 October tours remain explicitly labelled as earlier recordings.

## Publication ownership

Core owns README, the generated handbook and canonical film assets. The private
Experience repository owns the public main website and the German/English Team
hub. Both public surfaces use the same final MP4 files and captions. The homepage
also has an accessible three-tab gallery with links to the corresponding handbook.

## Checks

HyperFrames 0.8.186 validates all four editable compositions without errors. Visual
review corrected cropped source regions and matched captions to visible UI. Silence
is intentional. Final encoding and targeted website checks are complete:

- All four MP4s fully decoded without errors: 1920×1080, 30 fps, H.264 High
  Level 4.1, yuv420p, no audio, and the MP4 index before the video data.
- Chrome played all four files at 72, 96, 84 and 116 seconds; Team chapter
  navigation jumped to the selected scene. No browser console errors were observed.
- Desktop and 390px layouts were inspected. The current screenshot gallery
  changes image and guide together and supports arrow-key focus and selection.
- 13 targeted tests passed (159 expectations), covering gallery, Team rendering,
  video controls and the documentation facade. Type, locale and structure checks
  passed, and the final website built successfully.
- The generated handbook passed its 345-page and 36,871-link/asset check.
- The editable archive contains 132 entries; sources use relative paths and
  contain no local account paths or credentials.

These checks concern publication and media playback. They do not rerun commerce
acceptance, payment providers or customer-agent scenarios.

## Public verification · 30 October 2026

Core [PR 246](https://github.com/sthamann/veyndo/pull/246) merged as
`e04fa6b671fb1d2b5f236121303dd2e10eb8b9f1`; the documentation publication completed.
The website and Team hub merged in Experience PR 83 as
`022f20b90f964d796813c8a1d09efc80eb08ca9c`. Northflank build
`gainful-love-5017` completed and the public service became healthy after restart.

- All twelve public film URLs (four films on each of website, Team and handbook)
  returned HTTP 200 with SHA-256 hashes identical to the final local files.
  Every URL also returned HTTP 206 for a byte-range request with the correct size.
- Chrome played all four films on the public Team hub at their expected durations.
  Chapter selection worked. The public homepage and handbook also played the AI
  overview, with advancing playback time and no media error.
- The public homepage displayed the current gallery and changed its selected
  screenshot. Public screenshots were retained with the local media outputs.
- Safari on macOS played all four files through the locally served final Team
  build, including chapter seeking. No physical iPhone playback was tested.
- Experience GitHub Actions could not start because of account billing or spending
  limits. They are not recorded as passing tests. The targeted local checks above
  and the separate successful Northflank production build are the available checks.

[Film guide](../video-tours.md) · [Actual captures](../assets/current-workspace-20261030/README.md).
