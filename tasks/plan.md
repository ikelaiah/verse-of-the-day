# v0.1.0 public release execution plan for Luna 6

Read `tasks/spec-v0.1.0.md` first. It defines behaviour; this file defines execution order. Track completion and evidence in `tasks/todo.md`.

## Starting point and known evidence

The repository currently contains index.html, README.md, and LANGUAGES.md. It has no test runner, build pipeline, or catalogue generator. The review executed the current inline script with mocked API responses and reproduced misleading reference ranges, generic input errors, and silent translation substitutions. The attribution colour measured about 3.53:1 against white. Browser and live API integration checks were unavailable; none should be treated as already passed.

This turn only writes a plan. Do not interpret unchecked tasks as implemented. The intended executor is Luna 6; no model has been switched or delegated during planning.

## Execution protocol

1. Read repository instructions and inspect the working tree, branch, remotes, and existing Pages configuration. Preserve unrelated changes. Do not print credentials.
2. Execute the numbered tasks in order on an isolated release branch where permitted. Keep each change focused; add failing behavioural regression tests before fixes.
3. At each checkpoint run the relevant accumulated checks. Update the todo entry with commands/results and a short next-step note. Proceed without routine confirmation requests.
4. Reuse applicable implementation, testing, frontend, browser, debugging, and review skills. Do not spawn extra agents unless the user or applicable instructions authorize them.
5. If upstream API schema differs, inspect official documentation/live responses, revise the affected contract with reasons, and continue the unaffected work. Never invent fixture fields to make tests pass.
6. Record concrete blockers, finish independent tasks, and leave a precise handoff if externally blocked. Do not mark skipped checks as passed.

Dependency chain: T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08 → T09 → T10 → T11 → T12 → T13 → T14 → T15 → T16. Some tasks have fewer direct dependencies, but sequential execution is the default to avoid conflicting edits.

## T01 — Establish reproducible local verification

**Dependencies:** none. **Scope:** medium, up to five files.
**Files:** package.json, package-lock.json, scripts/serve.mjs, tests/smoke.test.js, .gitignore.

Create the minimal package scripts and static preview server. Use a supported Node LTS, record the requirement, and keep runtime dependencies at zero. Do not add a build tool.

**Acceptance:**
- `npm ci`, `npm test`, and the documented local server command work from a clean checkout.
- Static preview serves the widget correctly; the server binds to loopback by default and does not serve files outside the project or sensitive dot-directories.
- Existing valid widget behaviour is captured by an initial meaningful smoke test without live API calls.

**Verify:** run the commands; request the local index and a missing path; confirm no production files depend on node_modules.

## T02 — Correct reference validation

**Dependencies:** T01. **Scope:** medium, up to five files.
**Files:** index.html, assets/core.js, assets/widget.js, tests/references.test.js, tests/fixtures/chapters.json.

Extract only the shared logic needed for testing/reuse, retaining public element IDs and the root entry point. Validate reference syntax, order, bounds, endpoint existence, response identity, and selected content before rendering.

**Acceptance:**
- All reference cases in the regression matrix below have their specified results; invalid ranges never display partial success.
- Whole chapters and valid cross-chapter passages still work, with at most three chapter requests.
- Rendering remains text-safe and selection does not assume contiguous verse numbering across translations.

**Verify:** `npm test`; observe the regression cases fail before the correction and pass after it. Compare valid-path output with the baseline.

## Checkpoint A

Run accumulated tests. Root widget and current valid URLs still work. Review extraction for unnecessary abstractions before adding more functionality.

## T03 — Explain configuration errors and fallbacks

**Dependencies:** T02. **Scope:** medium, up to four files.
**Files:** assets/core.js, assets/widget.js, index.html, tests/states.test.js.

Implement explicit error and result states. Preserve documented substitutions, but render their explanation beside the actual version. Provide examples and a setup link for configuration errors; the link becomes active when T09 lands.

**Acceptance:**
- Invalid syntax, unavailable passage/translation, and temporary failures have distinct, actionable messages where evidence permits distinction.
- NIV fixed-reference URLs display KJV plus a notice; daily/random fallback displays actual OurManna attribution plus a notice.
- Blank parameters resolve consistently; ref overrides order; hostile query/API text remains inert.

**Verify:** `npm test`; test failures at both providers and the complete fallback matrix, including fixed refs with no OurManna request.

## T04 — Bound requests and make retry reliable

**Dependencies:** T03. **Scope:** small, two files.
**Files:** assets/widget.js, tests/requests.test.js.

Implement per-request and overall deadlines, cancellation, stale-response protection, and an explicit Retry action for temporary failures. Include JSON-body parsing in the timeout lifetime.

**Acceptance:**
- A pending request terminates within its deadline; an entire load cannot remain pending beyond 20 seconds.
- Retry cannot launch overlapping active attempts; late responses cannot overwrite the latest result, and timers are cleared.
- Translation retry keeps the already selected random passage; no automatic unbounded retries occur.

**Verify:** `npm test` with controlled promises/timers for request timeout, pending body, late completion, repeated retry, and successful recovery.

## T05 — Improve accessibility and add themes

**Dependencies:** T04. **Scope:** medium, up to five files.
**Files:** index.html, assets/widget.css, assets/widget.js, assets/core.js, tests/accessibility.test.js.

Introduce shared colour variables and theme parsing; improve attribution readability, status semantics, focus styling, language, and direction. Derive language from verified upstream fields, adding small mappings only when necessary.

**Acceptance:**
- Supported light/dark/auto states meet contrast requirements for all text and controls; attribution is at least 12px.
- Loading, errors, and retry have appropriate accessible states; focus remains usable and status announcements do not repeat whole chapters.
- English controls and translated passages have correct separate language/direction semantics, including RTL and unknown metadata.

**Verify:** `npm test`; calculate palette contrast. Real screen-reader, zoom, keyboard, and visual checks follow in T14; do not claim unit tests prove accessibility.

## Checkpoint B

Run accumulated tests for validation, fallback, timeouts, and themes. Confirm public IDs and default rendering remain compatible. Record the chosen error messages and theme contract in the specification if refined.

## T06 — Make long passages readable

**Dependencies:** T05. **Scope:** medium, four files.
**Files:** assets/core.js, assets/widget.js, assets/widget.css, tests/passage-rendering.test.js.

Preserve supported structural breaks and add optional verse numbers. Ensure scrolling keeps the passage, warning, and attribution reachable without cutting content off.

**Acceptance:**
- Whole chapters have sensible readable blocks; supported poetry/paragraph breaks survive; inline text and punctuation are preserved.
- `verseNumbers=1` renders unambiguous verse/chapter markers; default off preserves compact daily verses.
- Notes/headings are handled deliberately, with no `[object Object]` output, executable HTML, or silent loss of supported verse text.

**Verify:** `npm test` with representative mixed-content and RTL fixtures. Include a long chapter for browser checks.

## T07 — Make the translation catalogue reproducible

**Dependencies:** T02. **Scope:** medium, up to five files.
**Files:** scripts/translations.mjs, data/translations.json, tests/catalogue.test.js, package.json, LANGUAGES.md.

Inspect the current official API schema, then create the metadata snapshot and generator. Separate network refresh from deterministic generation/checking. Preserve source links and known curated qualifications.

**Acceptance:**
- `npm run catalogue:generate` and `npm run catalogue:check` reproduce the committed Markdown from the snapshot without network access.
- Refresh validates data before replacing output; duplicate IDs, malformed metadata, and network failures cannot corrupt the last good catalogue.
- Counts, aliases, language/direction metadata, coverage, and available licence details derive from data; unknowns stay unknown. Markdown pipes/newlines are escaped.

**Verify:** `npm test`, generation twice with no second diff, `npm run catalogue:check`, and one separately recorded live refresh. Record refresh date and source.

## T08 — Expose translation credit information consistently

**Dependencies:** T03, T07. **Scope:** medium, up to four files.
**Files:** assets/widget.js, scripts/translations.mjs, tests/credits.test.js, data/translation-credits.json if needed.

Ensure supplied publisher notices remain visible verbatim and add known credit/source metadata where the catalogue supports it. Keep the full searchable catalogue off the default widget startup path; generate a small credit map only if required.

**Acceptance:**
- Representative NASB/AMP/NET notices remain complete; credit-required and unknown cases are represented honestly.
- Fallback updates text, version, and credit together; stale notices never remain from a previous result.
- Do not infer permission or copy unsafe licence URLs into links; allow only expected safe web URL schemes and safe text.

**Verify:** `npm test`; inspect representative official source notices and record any unresolved discrepancies, including the existing NASB95 qualification. Avoid broad legal conclusions.

## Checkpoint C

Run accumulated tests and catalogue check. Compare current snapshot totals with generated docs. Confirm normal widget usage does not load the full translation catalogue.

## T09 — Build accessible configuration controls

**Dependencies:** T05, T07, T08. **Scope:** medium, up to five files.
**Files:** setup.html, assets/setup.js, assets/setup.css, assets/core.js, tests/setup-state.test.js.

Build the separate setup page using labelled native controls. Add search/filtering, translation coverage/credit context, fixed-reference validation, and the theme/height/number settings from the spec.

**Acceptance:**
- A user can select each mode and find translations by name, language, or ID, including no-results and catalogue-load errors.
- NIV/fixed incompatibility is explained; no silent selection change occurs. Invalid refs and heights show inline errors and prevent stale copying.
- Layout works with keyboard and small screens, and the root route remains the widget.

**Verify:** `npm test` for state transitions/filtering. Manual/browser checks follow in T14.

## T10 — Preview and copy the actual embed

**Dependencies:** T06, T09. **Scope:** medium, up to four files.
**Files:** assets/setup.js, assets/setup.css, tests/embed-output.test.js, setup.html.

Connect settings to the real iframe preview, responsive width choices, copied widget link, and copied iframe markup. Use a single canonical configuration model; avoid independent URL-building implementations.

**Acceptance:**
- Preview and copied output describe identical current settings and function from localhost and `/verse-of-the-day/`.
- Default embed permits scrolling, includes a title, and uses validated dimensions and escaped attributes.
- Clipboard success, denial, and unavailable clipboard have accurate feedback and a working manual-copy path. Pending/invalid configurations cannot copy old output.

**Verify:** `npm test` for encoding, special characters, subpaths, validation, and clipboard outcomes; real embed round trip in T14.

## T11 — Rewrite the user documentation around successful setup

**Dependencies:** T10. **Scope:** small, two files.
**Files:** README.md, docs/development.md.

Put quick start and builder first. Add complete clickable examples, parameter precedence/defaults, troubleshooting, correct theme guidance, no-clipping embeds, provider dependency information, page-load refresh semantics, and local developer commands.

**Acceptance:**
- Every public parameter and fallback behaviour matches the implementation; remove stale single-file claims if modules were extracted.
- A new user can complete setup or diagnose each review finding using the README without reading source code.
- Development docs cover Node/browser prerequisites, installation, local preview, deterministic tests, catalogue refresh/check, and live smoke checks.

**Verify:** follow the instructions from a clean checkout; open generated example URLs in T14. Recheck current SharePoint guidance against official documentation before asserting its steps are current.

## Checkpoint D

Run accumulated tests and catalogue check. Exercise each builder mode and compare its output with README examples. Review all original findings against the coverage table below.

## T12 — Add repeatable browser coverage

**Dependencies:** T11. **Scope:** medium, up to five files.
**Files:** package.json, package-lock.json, playwright.config.js, tests/browser/widget.spec.js, tests/browser/setup.spec.js.

Add a pinned Playwright development dependency and browser tests against a managed local server. Mock external responses for deterministic regression tests; keep live API smoke separate.

**Acceptance:**
- Chromium tests cover widget valid/error/fallback/timeout/retry states and the complete builder-to-iframe journey.
- Tests cover narrow embeds, accessible names, RTL, long text, zoom-equivalent reflow, dark theme, clipboard failure, and no unexpected console errors.
- Tests serve a repository subpath and verify relative assets/links as well as the root; deliberate network failure tests distinguish expected failures from unexpected errors.

**Verify:** documented browser installation, then `npm run test:browser`. Capture useful screenshots on failures; do not add large screenshot baselines without need.

## T13 — Automate the release checks

**Dependencies:** T12. **Scope:** small, up to three files.
**Files:** .github/workflows/ci.yml, package.json if needed, docs/development.md.

Add CI that runs the committed deterministic checks on pull requests and release branches. Inspect existing remote workflows before introducing a competing Pages deployment workflow.

**Acceptance:**
- A clean runner installs locked dependencies and required browsers, then runs unit tests, catalogue check, and browser tests.
- Ordinary CI does not fetch live verse APIs or regenerate catalogue timestamps and needs no API secrets.
- Workflow permissions are minimal; unrelated deployment/access settings are unchanged.

**Verify:** all equivalent commands locally; inspect an actual CI run before release when remote access is available.

## T14 — Perform release-candidate usability and integration review

**Dependencies:** T13. **Scope:** small documentation update; no implementation changes unless a finding requires a focused fix.
**Files:** docs/release-v0.1.0.md, tasks/todo.md.

Run the matrix below in a real browser. Review implementation for correctness, simplicity, safe text handling, bounded work, and compatible public URLs. Verify official live API responses separately. Address findings, then rerun only affected checks plus final required gates.

**Acceptance:**
- Desktop Chromium and Firefox pass core journeys; narrow 320/375px embeds, 220px height, 200% zoom, keyboard-only use, theme contrast, RTL, and long passages are checked.
- Screen-reader status/focus behaviour is checked with an available reader; if inaccessible, record that limitation explicitly rather than claiming it was verified. Live default KJV, NIV, another translation, whole chapter, cross-chapter and RTL examples succeed or a provider issue is resolved/documented as release-blocking.
- A SharePoint tenant check is attempted if authorized access exists; otherwise clearly record that generic iframe behaviour was verified and tenant behaviour was not. No unresolved high/medium correctness or usability findings remain in release scope.

**Verify:** attach commands/results, representative screenshots, browser versions, actual live URLs, and explicit limitations to the release record. Do not mark release-ready while real-browser or live API checks are unavailable.

## T15 — Prepare the concrete v0.1.0 release candidate

**Dependencies:** T14. **Scope:** medium, up to five files.
**Files:** package.json, package-lock.json, CHANGELOG.md, docs/release-v0.1.0.md, README.md if needed.

Set version 0.1.0, write release notes, and document deployment/rollback based on the actual repository hosting configuration. Review source-code licensing separately from Bible text licences; retain an existing licence or obtain owner direction before adding one. Do not describe the repository as permissively licensed without evidence.

**Acceptance:**
- Version metadata agrees; release notes list fixes, builder, accessibility, compatibility, and remaining provider/SharePoint limitations accurately.
- The candidate is a known commit with clean intended changes, passing required checks, and an explicit list of public static assets. No fixtures or private files accidentally enter a curated deployment artifact.
- Rollback names the previous deployed commit/artifact and explains how to restore it. Release notes and the tag target are reviewable before publication.

**Verify:** clean install; `npm test`; `npm run catalogue:check`; `npm run test:browser`; final diff review; preview the exact deployable files under the repository subpath.

## T16 — Publish and verify v0.1.0

**Dependencies:** T15 and authorization to execute the public release. **Scope:** release operations, then release-record update.

Use the existing repository and hosting workflow. If the repository is currently private or deployment requires broader access, do not change visibility/permissions without explicit authorization. Do not invent GitHub URLs or assume the git remote is the README URL.

**Acceptance:**
- Push/merge according to repository rules, deploy the tested candidate, and confirm success before creating the final public release. If Pages auto-deploys on merge, treat merge as publication and finish all earlier gates first.
- Create annotated tag `v0.1.0` on the tested/deployed commit and publish the GitHub release with the prepared notes. If a tag/release already exists, inspect it and do not overwrite it; resolve the conflict with the owner.
- Verify the public widget, setup page, assets, generated embed, and representative query URLs. Record release URL, deployed commit, tag, and post-deployment results. Roll back through the documented mechanism if a material regression appears.

**Verify:** actual deployment status and live smoke checks, not just a successful push. Report any permissions/tool blocker precisely and leave the tested candidate intact.

## Mandatory regression matrix

| Area | Cases and expected outcomes |
| --- | --- |
| Valid refs | John 3:16; John 3:16-18; Psalm 23; Romans 8:38-9:1; 1 John; Song of Songs/Song of Solomon; en-dash ranges; supported book-code aliases; case/whitespace variants. Select exact requested content. |
| Invalid refs | John 3:16-999; John 3:999-4:2; John 3:0-2; John 0:1; John 3:18-16; reversed chapters; more than three chapters; missing endpoint; unsafe numeric input. No partial success or misleading reference. |
| Unsupported syntax | Jn 3:16; Psalm 46:1,10; nonsense book; inherited object-property names. Useful input error without unwanted requests. |
| Configuration | Empty/whitespace translation; aliases and exact-case IDs; ref plus order=random; invalid theme/height/verseNumbers; URL encoding and HTML attribute escaping. |
| Fallback | Daily/random secondary failure; unknown ID; absent book; unsupported OurManna ref; explicit NIV fixed ref; direct NIV daily path; failures never leave mismatched text/version/credit. |
| Network/data | 404, 500, rejected fetch, never-settled fetch/body, invalid JSON, malformed schema, empty passage, missing metadata, stale completion, retry success and repeated clicks. |
| Safety | HTML-looking verse/error/credit/query text stays text; unsafe link schemes rejected; translation IDs URL-encoded; no query-driven arbitrary API host. |
| Reading | Short verse; long chapter; mixed inline content; poetry; optional numbers across chapters; complete credit notice; translated language and RTL direction. |
| Builder | Each mode; name/language/ID search; no results; NIV mode change; invalid-to-valid edit; preview/copy parity; clipboard blocked; network failure; static catalogue failure. |
| Embedding | Root and repository subpath; 320/375px widths; desktop width; 220px height; 200% zoom; light and dark hosts; all attribution reachable. |

## Coverage of the original review

| Review item | Tasks |
| --- | --- |
| Incorrect range acceptance | T02 |
| Unhelpful error messages | T03, T09 |
| Silent translation substitutions | T03, T09, T11 |
| Clipped embeds | T06, T10, T11, T12, T14 |
| Indefinite loading | T04 |
| Contrast, language/direction, announcements | T05, T12, T14 |
| Separate embed builder with preview/copy | T09, T10 |
| Quick start, clickable examples, troubleshooting | T11 |
| Incorrect dark-section styling guidance | T05, T11 |
| Parameter precedence and defaults | T03, T11 |
| Missing local/test/generation instructions | T01, T07, T11 |
| Regression suite | T01-T06, T12, T13 |
| Paragraphs and optional verse numbers | T06 |
| Public release readiness and evidence | T14-T16 |

## Luna 6 handoff prompt

> Execute the v0.1.0 plan in `tasks/plan.md`, using `tasks/spec-v0.1.0.md` as the behaviour contract and `tasks/todo.md` to track progress. Implement one task at a time, preserve unrelated user changes, and verify each checkpoint. Cover every original review finding and the separate embed builder. Keep the app static with no runtime framework. Do not claim browser, live API, screen-reader, or SharePoint checks passed without evidence. Prepare a concrete tested release candidate and follow the public-release authorization in this execution request before publishing. Continue independently through ordinary implementation decisions, and report only genuine blockers or material changes of scope.
