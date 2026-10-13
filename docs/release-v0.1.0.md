# Verse of the Day 0.1.0 release record

This release adds a separate embed builder and hardens the existing static widget for public use. The root URL remains the widget; `/setup.html` is the builder.

## Release notes

- Search translations by name, language, or ID; choose daily, random, or fixed passage mode; preview desktop and 320px widths; copy a link or iframe.
- Validate full-name passage references and API endpoints before showing content. Add visible errors, retry, request deadlines, and explicit daily/random fallbacks.
- Improve long passage layout, optional verse numbers, attribution display, theme contrast, language/direction, and status announcements.
- Check in a reproducible translation catalogue, local test tooling, browser regression coverage, CI, and updated usage and developer documentation.

## Candidate verification

| Check | Result |
|---|---|
| Node/npm version | Node 24.11.0 and npm 11.11.0; Playwright Test 1.64.0 pinned |
| Clean install | `npm ci` passed |
| Logic, catalogue, security, and contrast tests | Passed: 25 tests, 0 failures (`npm test`) |
| Offline catalogue consistency | Passed against `data/translations.json`; last live refresh recorded 1,256 translations in 1,004 languages on 2026-10-13 |
| Deterministic Chromium suite | Passed: 12 tests, 0 failures; API responses are mocked |
| Live API/browser smoke | Passed on 2026-10-13: OurManna returned NIV for Romans 2:7-8; live `eng_net` John 3:16 rendered in Chromium with its supplied attribution notice; both live widget paths had no page errors |
| Layout review | Chromium screenshot reviewed at 1280×900; browser tests cover a 320px host, a 320px preview, long scrollable content, and a 160 CSS-pixel reflow viewport equivalent to 200% zoom on a 320px viewport |
| Keyboard | Native controls and visible focus exercised in Chromium |
| Screen reader | Not tested; no screen-reader app was available in this environment |
| SharePoint | Not tenant-tested; its site collection embed policy and a tenant administrator were unavailable |
| Actual browser zoom control | Headless Chromium did not respond to its browser zoom shortcut. Layout reflow and wrapping were checked at the equivalent 160 CSS-pixel viewport; the browser UI's zoom control itself was not exercised. |

## Publication record

Fill in these fields after the deployment and public release are verified:

- Repository: <https://github.com/ikelaiah/verse-of-the-day>
- Candidate branch: `codex/v0.1.0`
- Candidate/deployed commit: pending
- CI workflow run: pending
- GitHub Pages deployment: pending
- Public release URL: pending
- Tag: `v0.1.0` pending
- Rollback target: `main` commit immediately before the release merge, to be recorded after merge

## Compatibility and licence notes

The site remains static and keeps `/` as the widget. Existing query parameters and translation aliases remain recognized; `nasb` and `amp` are retained for old links but currently unavailable from the upstream catalogue, and the widget explains its daily/random fallback. The builder creates iframe markup without `scrolling="no"`.

This repository has no software licence file. No software licence was added for this release. Bible text and translation rights remain with their publishers; the catalogue's labels and upstream notices do not guarantee licence compliance.
