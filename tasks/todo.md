# v0.1.0 execution checklist

Executor: Luna 6. The execution request authorizes the planned public release. The widget remains the root page; the builder is `setup.html`.

## Tasks

- [x] T01 — Reproducible local verification. Node 24.11.0, pinned Playwright, lockfile, secure loopback preview server, and npm scripts.
- [x] T02 — Correct reference validation. Full-name parsing, bounded ranges, exact endpoint validation, and no partial fixed passages.
- [x] Checkpoint A — Regression tests pass; default KJV and existing URL aliases retained.
- [x] T03 — Explain configuration errors and translation fallbacks.
- [x] T04 — Bound requests, cancel stale work, and make retry reliable.
- [x] T05 — Improve accessibility and add light/dark/auto themes.
- [x] Checkpoint B — Input, fallback, timeout, and contrast checks pass.
- [x] T06 — Render long passages with optional verse numbers and scrollable content.
- [x] T07 — Generate the searchable translation catalogue from a checked-in snapshot and explicit licence overrides.
- [x] T08 — Display API attribution notices verbatim where passage data supplies them.
- [x] Checkpoint C — Offline catalogue check passes; normal widget startup does not fetch the full catalogue.
- [x] T09 — Build labelled, searchable configuration controls.
- [x] T10 — Preview the actual widget and copy deployment-relative links/iframe markup.
- [x] T11 — Rewrite README and add development/release documentation.
- [x] Checkpoint D — Builder, generated examples, documentation, and review findings agree.
- [x] T12 — Add deterministic Chromium browser coverage, including the repository subpath.
- [x] T13 — Automate checks in CI and verify the actual pull-request and main-branch workflow runs.
- [x] T14 — Review the candidate in Chromium and run live API/browser integration checks. Zoom reflow was tested at the equivalent 160 CSS-pixel viewport; the browser's zoom control itself, a screen reader, and a SharePoint tenant were unavailable and are recorded as limitations.
- [x] T15 — Prepare version 0.1.0, changelog, release notes, and candidate evidence.
- [x] T16 — Publish, tag, and verify the public release.

## Release gates

- [x] Original findings are mapped to implemented work and test evidence.
- [x] Clean dependency install succeeds under Node 24.11.0; package metadata is 0.1.0.
- [x] Node regression tests pass, including invalid endpoints, request deadlines, text safety, and contrast.
- [x] Offline catalogue check passes; live refresh date and 1,256/1,004 counts are recorded.
- [x] Deterministic browser suite passes and actual CI run is verified. Local suite: 12 passed; PR and main-branch CI passed.
- [x] Chromium desktop/narrow/theme/RTL/long-passage/keyboard checks pass. Reflow at 160 CSS pixels covers the effective layout width of 200% zoom on a 320px viewport; direct zoom UI input was unavailable.
- [x] Screen-reader limitation is explicitly recorded; no screen-reader app was available.
- [x] Live API smoke passed for OurManna and Free Use Bible API, including live attribution in Chromium.
- [x] SharePoint limitation is explicitly recorded; no tenant/admin access was available.
- [x] Builder preview and generated iframe match under `/verse-of-the-day/`; generated iframe omits `scrolling="no"`.
- [x] No unresolved high/medium implementation findings remain. Direct zoom UI, screen-reader, and tenant checks remain stated test limitations.
- [x] README, catalogue, development notes, changelog, and release notes match the candidate.
- [x] No software licence was added; the repository's absent software licence is described accurately.
- [x] Candidate/deployed commit, CI run, Pages deployment, and rollback target are recorded in `docs/release-v0.1.0.md`.
- [x] Public release authorization is explicit; repository visibility and hosting security settings remain unchanged.
- [x] Public deployment and post-deployment smoke checks pass.
- [x] Annotated `v0.1.0` tag and public release target the deployed commit.
- [x] Final handoff includes the actual release URL, commit/tag, verification, and limitations.

## Execution log

2026-10-13 — Inspected the repository, Pages state, remote, and branch. Created `codex/v0.1.0` from current `main` (`bc313c3e78beafca6780dc5621afae2194d0666a`).

2026-10-13 — Implemented reference validation, request deadlines, reader-facing errors/fallbacks, themes, passage structure, verse numbers, safe static preview, and tests. `npm test`: 25 passed after final candidate changes.

2026-10-13 — Refreshed the upstream catalogue: 1,256 translations / 1,004 languages. Preserved 1,256 reviewed legacy licence labels and sources in `data/licence-overrides.json`. `npm run catalogue:check`: passed.

2026-10-13 — Added setup builder, mocked browser tests, CI workflow, docs, and v0.1.0 metadata. `npm ci` under Node 24.11.0: passed; zero reported vulnerabilities. `npm run test:browser`: 12 passed under Node 24.11.0. `npm run test:live`: passed against live OurManna and Free Use Bible APIs, with no browser page errors.

2026-10-13 — Visually reviewed Chromium screenshot at 1280×900. Browser coverage checks 320px width, a 320px preview, keyboard focus, RTL, dark auto-theme, long passage scroll, and equivalent zoom reflow at 160 CSS pixels. Actual browser zoom controls, screen reader, and SharePoint tenant were unavailable; see `docs/release-v0.1.0.md`.

2026-10-13 — Opened PR #1 and verified its CI run (`38362959518`). Merged as `d46347988248c5f7e2701bb6913641324ed47046`; main CI (`38363161311`) and GitHub Pages deployment (`38363161365`) passed. Public Chromium smoke verified the widget, builder, catalogue, fixed NET John 3:16 preview, and generated iframe URL. Created annotated tag `v0.1.0` and published <https://github.com/ikelaiah/verse-of-the-day/releases/tag/v0.1.0>. Rollback baseline is `bc313c3e78beafca6780dc5621afae2194d0666a`.

## Next action

Release `v0.1.0` is published. The tag and release point at deployed commit `d46347988248c5f7e2701bb6913641324ed47046`; publication evidence and the rollback target are recorded in `docs/release-v0.1.0.md`.
