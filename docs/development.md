# Development and release checks

## Environment

Use Node.js 24 LTS and npm. The app is plain static HTML, CSS, and JavaScript modules; `scripts/serve.mjs` is only a local preview server. It binds to loopback by default and rejects private dotfiles, directories, and paths outside the repository.

```sh
npm ci
npm test
npm run catalogue:check
npm run dev -- --host 127.0.0.1 --port 8765
```

The preview server is available at <http://127.0.0.1:8765/>. The builder is at <http://127.0.0.1:8765/setup.html>.

## Browser checks

Browser tests use pinned Playwright Test and deterministic API fixtures. They cover builder search and validation, fixed and random settings, iframe generation, clipboard denial, passage rendering, responsive width, RTL metadata, theme selection, visible fallback, and cached-verse retry.

Install the browser once, then run:

```sh
npx playwright install chromium
npm run test:browser
```

`npm run test:live` is separate because it calls the real OurManna and Free Use Bible APIs and opens the real widget in Chromium. It needs network access. It checks a live OurManna response, the current translation catalogue, NET Bible John 3:16, and both real API-backed widget paths. It does not replace the mocked browser suite.

No automated screen-reader test is included. Before changing status semantics or builder controls, use keyboard-only navigation and a screen reader in a browser. A SharePoint tenant test also requires a tenant and an administrator able to configure its embed policy; the generic iframe has not been tenant-tested.

## Translation catalogue

`data/translations.json` is the normalized snapshot used by the builder. `LANGUAGES.md` is generated from that same file. Verse text is never stored in the catalogue.

```sh
npm run catalogue:check      # offline consistency check
npm run catalogue:generate   # regenerate LANGUAGES.md from the snapshot
npm run catalogue:refresh    # fetch the current upstream list and update both files
```

The refresh command is explicit and requires network access. It validates the response and duplicate IDs, writes the snapshot and Markdown together, and records the fetched date. Review its diff before committing.

`data/licence-overrides.json` preserves labels, source URLs, and shortcuts curated in the repository's previous catalogue. These values are explicit project metadata; a missing or newly introduced licence remains **Unknown** until reviewed. Do not infer legal status from a translation name or the API's availability. To update an override, verify it against the publisher's source and record the evidence in the change review.

## CI and public hosting

`.github/workflows/ci.yml` runs install, Node tests, offline catalogue validation, browser installation, and deterministic Playwright tests on pull requests to and pushes on `main`. It does not deploy the site. The repository currently uses GitHub Pages from `main`; merging to that branch publishes the static files. Confirm the Pages deployment status and run `npm run test:live` against the deployed URL before tagging a release.

Do not change repository visibility, Pages settings, or security settings as part of routine release work. The source repository has no software licence file; this project must not add one without the owner's choice.

## Release procedure

1. Review the behaviour contract and unresolved notes in `tasks/`.
2. Run `npm ci`, `npm test`, `npm run catalogue:check`, and `npm run test:browser` on Node 24.
3. Run `npm run test:live` with network access and record actual API outcomes.
4. Review the builder and widget in a desktop and narrow browser viewport. Check 200% browser zoom, keyboard access, dark/light themes, a long passage, and RTL text. Record any screen-reader or SharePoint tenant check that cannot be performed.
5. Set package metadata to `0.1.0`, finalize `CHANGELOG.md` and `docs/release-v0.1.0.md`, and review the generated embed paths under `/verse-of-the-day/`.
6. Push the candidate branch and use the pull request's actual CI run. Inspect the diff and deployment result after merge.
7. After Pages publishes the tested commit, open the public widget, builder, fixed passage, random mode, and generated embed URL. Create the annotated `v0.1.0` tag and release against that exact deployed commit.
8. Record the release URL, tag, deployed commit, validation, limitations, and rollback target. To roll back, revert the release commit through the repository's normal review path and confirm Pages serves the reverted main branch.
