# Verse of the Day

A small, static Bible passage widget that can be embedded on a web page. Configure it with the [embed builder](https://ikelaiah.github.io/verse-of-the-day/setup.html), then copy a link or iframe.

- **Widget:** <https://ikelaiah.github.io/verse-of-the-day/>
- **Embed builder:** <https://ikelaiah.github.io/verse-of-the-day/setup.html>
- **Translations:** [LANGUAGES.md](LANGUAGES.md)

## Quick start

1. Open the [embed builder](https://ikelaiah.github.io/verse-of-the-day/setup.html).
2. Choose daily, random, or a fixed passage; choose a translation and appearance.
3. Check the preview at desktop and narrow width.
4. Copy the iframe and paste it into a page that allows iframe embeds.

The default widget shows OurManna's daily verse in the King James Version (KJV). It needs no account, API key, build step, or server-side code. On each page load, the visitor's browser requests verse data from [OurManna](https://www.ourmanna.com/) and, for other translations, the [Free Use Bible API](https://bible.helloao.org/).

## Embed examples

The builder creates iframe markup for the current GitHub Pages path, including the selected height and options. A basic KJV embed is:

```html
<iframe src="https://ikelaiah.github.io/verse-of-the-day/index.html?translation=kjv&amp;theme=light"
        title="Verse of the Day" width="100%" height="220" style="border:0"></iframe>
```

The iframe scrolls when its content is taller than the selected height. Keep a useful height for long passages and attribution. Do not add `scrolling="no"`.

Examples you can open directly:

- [Daily KJV](https://ikelaiah.github.io/verse-of-the-day/?translation=kjv)
- [Random NET Bible](https://ikelaiah.github.io/verse-of-the-day/?order=random&translation=net)
- [Psalm 23 in the Berean Standard Bible](https://ikelaiah.github.io/verse-of-the-day/?ref=Psalm%2023&translation=bsb)
- [John 3:16–18 in the World English Bible](https://ikelaiah.github.io/verse-of-the-day/?ref=John%203%3A16-18&translation=web)
- [Romans 8:38–9:1 with verse numbers](https://ikelaiah.github.io/verse-of-the-day/?ref=Romans%208%3A38-9%3A1&translation=kjv&verseNumbers=1)

## Settings

Every setting is optional. `ref` takes precedence over `order`; an empty or whitespace-only `translation` selects KJV.

| Setting | Values | Default | Effect |
|---|---|---|---|
| `order` | `daily`, `random` | `daily` | `random` requests a different source verse on each page load. |
| `translation` | Alias or exact API ID | `kjv` | Selects the requested translation. See [the full catalogue](LANGUAGES.md). |
| `ref` | Full book name and chapter/verse | none | Shows a fixed passage instead of the source verse. |
| `theme` | `light`, `dark`, `auto` | `light` | `light` is transparent; `dark` uses a dark background; `auto` follows the reader's device colour preference. |
| `verseNumbers` | `1` | off | Shows verse numbers and chapter context for cross-chapter passages. |

Aliases are friendly shortcuts and are case-insensitive. Full API IDs preserve their exact case. Examples include `kjv`, `bsb`, `net`, `web`, `webbe`, `asv`, `bbe`, `darby`, `dra`, and `ylt`. You can use any current ID in [LANGUAGES.md](LANGUAGES.md). The catalogue changes over time; check a translation's source and terms before use.

The older `nasb` and `amp` shortcuts remain recognized for existing URLs, but their corresponding translation IDs are absent from the current upstream catalogue snapshot (2026-10-13). The widget reports the unavailable translation and uses its visible daily/random fallback when possible. These shortcuts are not offered by the builder.

`niv` means OurManna's own source text, not an API translation. It works for daily and random verses. For compatibility, an explicit fixed-reference URL with `translation=niv` displays KJV and explains the substitution; the builder asks you to choose another translation for a fixed passage.

### References

Use full book names. Supported examples are `John 3:16`, `John 3:16-18`, `Psalm 23`, and `Romans 8:38-9:1`. Cross-chapter passages may span up to three chapters. Book-name aliases include `Psalm`/`Psalms` and `Song of Songs`/`Song of Solomon`.

Abbreviations such as `Jn 3:16`, comma-separated verse lists such as `Psalm 46:1,10`, and passages spanning more than three chapters are not supported. Invalid syntax is explained before the widget makes a request. If a valid-looking endpoint does not exist in the selected translation, the widget reports that the passage is unavailable instead of showing a partial range.

## SharePoint

1. Add an **Embed** web part to the page and paste the iframe from the builder into its **Website address or embed code** field.
2. If SharePoint rejects the domain, ask a site collection administrator to allow `ikelaiah.github.io` under the site's embed security settings. Do not allow every external domain just to enable this widget.
3. Set an adequate height in the builder. The iframe keeps a fixed height and allows its contents to scroll.

SharePoint's embed policy and available controls depend on the site and tenant. The owner has not verified this widget in a SharePoint tenant. Microsoft's [Embed web part guidance](https://support.microsoft.com/en-us/sharepoint/sites-pages/add-content-to-your-page-using-the-embed-web-part) explains that embed code must use an HTTPS iframe, and [domain controls](https://support.microsoft.com/en-us/sharepoint/sites-pages/allow-or-restrict-the-ability-to-embed-content-on-sharepoint-pages) are managed by site collection administrators.

## Behaviour and limits

- Verse selection happens when the page loads. Daily selection follows OurManna's schedule; there is no background refresh timer. Random mode requests a new source verse on each load.
- If a daily/random translation cannot supply the selected book or passage, the widget keeps the source verse and displays a fallback message. A fixed passage never silently changes translations.
- OurManna chooses its verse text and labels its response. Other translations can divide verses or sentences differently, so a selected passage may read differently at its edges.
- Light mode is transparent and works best over a light host background. Dark mode uses its own dark background. Auto follows the iframe reader's device preference, not the containing SharePoint section's colour.
- No automatic iframe height adjustment is promised. Set a height in the builder and leave scrolling enabled.
- Daily/random source verses depend on OurManna; another translation also depends on the Free Use Bible API. Fixed passages use the Free Use Bible API only. A timeout, provider outage, or malformed response is shown with a retry option or a visible fallback.
- Translation availability, book coverage, attribution data, and usage terms differ. The API catalogue is informational and does not grant rights. Review the publisher's source terms; the widget does not guarantee licence compliance.
- The project has no software licence file. This release does not assign one.

## Development

Use Node.js 24 LTS and npm. From a clean checkout:

```sh
npm ci
npm test
npm run catalogue:check
npm run dev -- --host 127.0.0.1 --port 8765
```

Open <http://127.0.0.1:8765/> for the widget or <http://127.0.0.1:8765/setup.html> for the builder. Install the pinned Playwright browser once, then run the deterministic browser suite:

```sh
npx playwright install chromium
npm run test:browser
```

`npm run catalogue:check` compares `LANGUAGES.md` with the checked-in `data/translations.json`; it is offline. `npm run catalogue:generate` writes the Markdown from that snapshot. `npm run catalogue:refresh` explicitly fetches the current upstream list, preserves curated labels where IDs match, updates the snapshot and Markdown, and records the fetch date. Review the generated diff before committing it. The normal widget loads neither the full catalogue nor the builder.

The site is static and has no build step. `assets/core.js` contains shared parsing and API validation; `assets/widget.js` renders the widget; `assets/setup.js` powers the builder. See [development notes](docs/development.md) for release checks and maintenance details.

## Credits

- Daily/random verse selection and OurManna text: [OurManna](https://www.ourmanna.com/).
- Translation chapter data and catalogue: [Free Use Bible API](https://bible.helloao.org/) by [AO Lab](https://github.com/HelloAOLab/bible-api).
- Translation publishers and contributors retain their respective rights. Where the API includes an attribution notice with chapter data, the widget displays it with the passage. Review each translation's publisher information for all requirements.
