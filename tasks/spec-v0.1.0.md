# Verse of the Day v0.1.0 specification

Status: proposed execution specification, prepared 2026-10-13.
Executor: Luna 6. Scope: all fixes and usability improvements from the project review.
This document describes future implementation; it does not claim any work or verification is complete.

## Objective

Release a dependable, accessible Bible verse widget that a SharePoint page author can configure, preview, and copy without editing a query string. Readers must receive accurate passage references, understandable failure/fallback messages, readable content, and accessible long passages.

Primary flows:

1. Visit the setup page, select a mode and translation, preview, copy an iframe, and embed it.
2. Read a daily/random/fixed passage at the existing root URL, including narrow embeds and dark host sections.
3. Correct invalid settings or retry a temporary failure without guessing what happened.
4. Maintain the project using documented local checks and reproducible translation data.

## Scope and compatibility decisions

- Retain `/` as the widget and add `/setup.html` as the embed builder. Never replace existing embedded content with a setup form.
- Retain `order`, `translation`, `ref`, existing translation aliases, and the existing public element IDs. Preserve the default KJV selection.
- Preserve existing NIV behaviour, but explain it visibly: daily/random can fall back to OurManna; explicit `ref` with NIV uses KJV with a notice. The builder prevents selecting NIV for fixed passages and explains why. Existing bookmarked URLs continue to work.
- Preserve full-name reference syntax, the current aliases, and the three-chapter maximum. Supporting `Jn`, comma lists, or extra reference formats is not part of this release; unsupported syntax gets a useful message.
- Add `theme=light|dark|auto` and `verseNumbers=1`. Missing/invalid theme resolves to light; missing/invalid verseNumbers resolves to off. Document these defaults. Light remains transparent for existing hosts; dark uses an explicit dark background and accessible colours; auto follows the device preference, not the parent iframe colour.
- `ref` takes precedence over `order`. Empty/whitespace translation defaults to KJV. Friendly aliases are case-insensitive; full upstream IDs retain case.
- Keep static hosting and no runtime framework, backend, account system, API key, bundler, analytics, or service worker. Small native JavaScript modules are permitted to share validation and make logic testable. Update the old single-file documentation if code is extracted.
- Do not add auto-height promises: arbitrary cross-origin hosts and SharePoint cannot be assumed to run a companion script. Use scrollable fixed-height embeds and show their real bounds in preview.
- No daily refresh scheduler is added. Document that selection happens on page load and daily selection follows the provider's schedule.

## Behaviour contract

### References and selection

- Reject chapter/verse zero, negative or unsafe integers, reversed ranges, more than three chapters, unsupported syntax, and unknown book names.
- Validate explicit starting and ending verse numbers against the fetched chapter data before displaying anything. Do not clamp ranges or silently omit missing endpoints.
- Validate response chapter/book identity and the fields consumed by the renderer. Missing/invalid data becomes a controlled error or documented daily/random fallback.
- Whole chapters select available verses without inventing an infinite verse label. Verse numbering can differ by translation; do not require every integer between endpoints to exist or substitute another translation's verse counts.
- Retain safe text rendering. Upstream text, references, notices, names, and query values never become executable HTML.

### Errors, time limits, and fallbacks

Represent failures with explicit codes mapped to reader-facing text. Keep provider details out of the main user message.

| Condition | Required result |
| --- | --- |
| Unsupported fixed reference | Show the entered reference safely, an accepted example such as `John 3:16-18`, and a setup link. No Retry button for an input error. |
| Invalid or unavailable fixed passage | Explain that the requested passage could not be found in that translation. Do not display a partial result. |
| Unknown translation | Explain the translation could not be found; offer setup. In daily/random mode retain available OurManna content with a visible fallback explanation. |
| NIV plus explicit ref | Display KJV with a visible explanation that NIV is unavailable for fixed passages. |
| Daily/random translation fetch failure or missing passage | Retain available OurManna content with actual version attribution and a short visible fallback explanation. |
| OurManna unavailable | Show a temporary failure with Retry. Never claim that a different passage is today's verse. |
| Network failure, timeout, malformed response, server failure | Show an understandable temporary failure and Retry, or the fallback above if OurManna content is available. |

- Use a 10-second deadline per JSON request and a 20-second overall deadline for a load attempt, covering response-body parsing. Clear timers and cancel obsolete requests.
- Keep chapter requests concurrent and bounded to three. Avoid automatic retry loops. Retry is an explicit action, disabled while pending.
- A newer attempt wins: late responses cannot overwrite it. When retrying only a failed translation lookup, reuse the selected OurManna passage so a random verse does not unexpectedly change.
- Distinguish unknown translation from missing book/passage only where catalogue/API evidence supports it; otherwise use an honest combined availability message.
- Model loading, success, success-with-fallback, and error explicitly. Announce status changes without repeatedly reading entire chapters or forcibly moving focus.

### Reading and accessibility

- Normal text, references, notices, status messages, links, and controls must meet at least 4.5:1 contrast against supported backgrounds. Increase attribution to at least 12px and retain legibility at zoom.
- Use shared CSS colour variables so reference and attribution colours change with the theme. Document that transparent light mode requires a light host background.
- Set valid language metadata on the passage from upstream/catalogue data. Keep English control text marked English. Use a known language mapping or `und` when unknown; do not mislabel all translations as English. Set direction from metadata where available, with `dir=auto` as a fallback.
- Expose loading/error changes using suitable status semantics and `aria-busy`. Ensure keyboard focus visibility and accessible names for every control.
- Preserve paragraph/poetry breaks where upstream data provides them; otherwise use sensible verse blocks for whole chapters. Add optional verse numbers, including chapter context for cross-chapter passages. Do not render heading/note objects as literal objects or lose supported text content.
- All content and attribution remain reachable by scrolling at 320px width, in a 220px iframe, and at 200% zoom. Do not introduce horizontal page scrolling for ordinary content.

### Embed builder

- Accessible native controls for Daily / Random / Fixed passage; searchable translation names, languages, and IDs; reference; theme; height; optional verse numbers.
- Use a labelled search input and native selection/list controls instead of an unnecessarily complex custom combobox. Include matching count and no-results feedback. Search is case-insensitive; selection retains exact API ID.
- Present human-readable translation names, coverage information, and available licence/credit information with source links. Do not imply that API availability grants all usage rights.
- Include NIV as a special OurManna option for daily/random only. Mode changes that invalidate a selection require a visible explanation and an explicit replacement choice.
- Start with daily/KJV/light/220px/numbers off. Allow heights from 160 to 2000px with input validation; always allow scrolling.
- Provide desktop and narrow preview widths, including 320px. Preview uses the real widget, with a visible frame boundary and an informative iframe title.
- Validate reference syntax immediately, but debounce or explicitly trigger network preview validation. Do not make API calls on every keystroke.
- Keep preview, copied link, and copied iframe tied to the same current settings. Do not copy stale output while new settings are invalid or validation is pending. Clearly distinguish a valid configuration from a temporary provider failure.
- Generate widget URLs relative to the current deployment base so repository subpaths and localhost work. Use URL/URLSearchParams; HTML-escape attribute values in copied iframe markup. Never hard-code localhost into public examples.
- Copy actions show success only after clipboard success. On denial/unavailability expose selected, read-only text and manual-copy instructions.
- Generated iframe has `title`, `width="100%"`, validated height, and `style="border:0"`; it omits `scrolling="no"` and obsolete `frameborder`.

### Translation catalogue and documentation

- Add a reproducible generator and a checked-in normalized metadata snapshot shared by the builder and LANGUAGES.md generation. Keep verse text out of this catalogue.
- Preserve provenance, exact IDs, names, language metadata, coverage, available licence notices/source links, and aliases. Do not guess licences from absence of metadata. Keep any curated corrections explicit and documented.
- Build the searchable catalogue into the static site; an upstream catalogue outage must not prevent basic configuration. Normal widget startup must not download all 1,200+ translations just to show KJV.
- Generator supports an offline check against the committed snapshot, plus a separate explicit network refresh. Sort deterministically, escape Markdown cell content, validate schema, reject duplicate IDs, and avoid partial output on failure.
- Reorganize README: quick start and setup link first; clickable full examples; parameters/defaults/precedence; SharePoint instructions; troubleshooting; customization; developer commands; limitations; credits.
- Explain fallback notices, explicit NIV behaviour, full-name reference requirements, iframe scrolling/height, theme limitations, page-load refresh behaviour, and the runtime dependency on both API hosts.
- Show upstream copyright notices verbatim where provided. Make known additional credit requirements visible; retain unresolved limitations honestly. Do not state that the widget guarantees licence compliance.

## Suggested project structure

```text
index.html                    existing widget entry point
setup.html                    separate builder
assets/core.js                shared parsing, parameter and selection logic
assets/widget.js              API orchestration and widget DOM rendering
assets/widget.css             widget themes and reading layout
assets/setup.js                builder state, preview and copy behaviour
assets/setup.css               builder layout and responsive styles
data/translations.json        normalized, sourced metadata snapshot
scripts/serve.mjs              small local static server
scripts/translations.mjs       catalogue refresh/generate/check
tests/*.test.js                Node behaviour tests
tests/browser/*.spec.js        browser regression tests
tests/fixtures/                minimal representative API fixtures
docs/release-v0.1.0.md         evidence, limitations, deployment and rollback
tasks/                        this specification, plan, and checklist
```

Adapt small file boundaries if evidence warrants it; do not build a plugin architecture or duplicate the parser between pages.

## Commands to establish during implementation

There are currently no package scripts or committed tests. These are target commands, not existing capabilities.

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 8765
npm test
npm run test:browser
npm run catalogue:generate
npm run catalogue:check
npm run catalogue:refresh
```

Use Node's built-in test runner for logic and a pinned Playwright development dependency for repeatable browser tests. Keep a lockfile. Select and document a supported Node LTS and compatible test dependency versions when implementing. Browser installation instructions must be explicit. No application build is needed; static source is the deployable site. Network refresh and live API smoke checks are separate from deterministic tests.

## Code style

Use two-space indentation, descriptive names, explicit error codes, native modules, and small functions with clear ownership. Example of the intended boundary:

```js
export function validateRange(reference) {
  if (reference.startChapter < 1) {
    return { ok: false, code: 'invalid-reference' };
  }
  return { ok: true, value: reference };
}
```

This is an illustrative style example, not the complete validation algorithm.

## Boundaries and completion

- Always: preserve existing user changes; follow applicable repository instructions; test real behaviour; record evidence; verify generated links under the repository subpath; distinguish mock, live API, browser, and SharePoint verification.
- Execution may implement all listed source, test, documentation, and CI work once the user asks Luna to execute this plan. No extra permission is needed for ordinary reversible work already in scope.
- Ask only for a material missing decision or access that cannot be inferred, such as a desired source-code licence or unavailable deployment permissions. Do not independently choose a licence on the owner's behalf.
- Never: commit secrets, replace Bible text licences with a software licence, change repository visibility/security settings merely to publish, claim unavailable checks passed, or publish during this planning-only task.
- A future instruction to execute the plan for public release authorizes the planned release steps, subject to actual tool permissions. If authorization is limited to preparing changes, finish the concrete release candidate before requesting publication approval.
- No account/backend/theme marketplace/reference-language expansion is included. Avoid unrelated refactors and dependency upgrades.

Complete means every mandatory task and release gate in tasks/todo.md has evidence. Missing SharePoint tenant access can be recorded as an explicit limitation of the generic iframe release; do not advertise tenant-tested compatibility without a real check. Live API and real-browser checks are mandatory before calling v0.1.0 release-ready.
