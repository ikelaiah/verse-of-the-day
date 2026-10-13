# Verse of the Day

A tiny, single-file web page that shows a daily Bible verse, built to be embedded in an **iframe**, for example in SharePoint Online's **Embed** web part.

**Live page:** https://ikelaiah.github.io/verse-of-the-day/

## Why this exists

[OurManna](https://www.ourmanna.com/) offers a free Verse of the Day widget, but only as a `<script>` tag:

```html
<div id="ourmanna-verse">Loading...</div>
<script src="https://beta.ourmanna.com/verses/api/js/" type="text/javascript"></script>
```

SharePoint's Embed web part doesn't accept script tags, and OurManna can't be iframed directly because its server sends `X-Frame-Options: SAMEORIGIN`. This repo hosts a small page on GitHub Pages that fetches the verse itself, so any site that accepts an iframe can show it. It can also show the verse in other translations through the [Free Use Bible API](https://bible.helloao.org/).

## Usage

Point an iframe at the live page. With no parameters it shows OurManna's verse of the day in the **King James Version**:

```html
<iframe src="https://ikelaiah.github.io/verse-of-the-day/"
        title="Verse of the Day"
        width="100%" height="220"
        frameborder="0" scrolling="no"></iframe>
```

### URL parameters

All parameters are optional and can be combined.

| Parameter | What it does | Default |
|---|---|---|
| `order=random` | Shows a different OurManna verse on every page load | `daily` |
| `translation=<id>` | Shows the verse in another translation (see [Translations](#translations)) | `kjv` |
| `ref=<passage>` | Shows a fixed passage of your choice instead of OurManna's pick | none |

### Examples

| URL | Result |
|---|---|
| `…/verse-of-the-day/` | Today's verse, King James Version |
| `…/verse-of-the-day/?translation=niv` | Today's verse, NIV (OurManna's own text) |
| `…/verse-of-the-day/?translation=bsb` | Today's verse, Berean Standard Bible |
| `…/verse-of-the-day/?translation=webbe` | Today's verse, World English Bible (British spelling) |
| `…/verse-of-the-day/?order=random` | A random verse on each load, King James Version |
| `…/verse-of-the-day/?order=random&translation=niv` | A random verse on each load, NIV |
| `…/verse-of-the-day/?ref=John 3:16` | John 3:16, King James Version |
| `…/verse-of-the-day/?ref=Psalm 23&translation=bsb` | All of Psalm 23, Berean Standard Bible |
| `…/verse-of-the-day/?ref=Romans 8:38-9:1&translation=nasb` | A passage across a chapter break, NASB |

Spaces in `ref` are fine in most places. If a tool complains, write them as `%20` (`?ref=John%203:16`).

**Passage formats `ref` understands:** `John 3:16`, `John 3:16-18`, `Psalm 23` (whole chapter), `Romans 8:38-9:1` (up to 3 chapters). Use full book names: `1 John`, `Song of Songs` or `Song of Solomon`, `Psalm` or `Psalms`.

### Translations

Translations other than OurManna's NIV come from the [Free Use Bible API](https://bible.helloao.org/), which has over 1,200 translations (54 in English). The 12 below have short IDs built into this page. Any other can be used by its full ID; see [Other translations](#other-translations).

| ID | Translation | Licence |
|---|---|---|
| `kjv` | King James Version (default) | Public domain |
| `bsb` | Berean Standard Bible | Public domain |
| `web` | World English Bible | Public domain |
| `webbe` | World English Bible, British Edition | Public domain |
| `asv` | American Standard Version (1901) | Public domain |
| `bbe` | Bible in Basic English | Public domain |
| `darby` | Darby Translation | Public domain |
| `dra` | Douay-Rheims 1899 | Public domain |
| `ylt` | Young's Literal Translation | Public domain |
| `nasb` | New American Standard Bible (2020) | © The Lockman Foundation, used by permission † |
| `amp` | Amplified Bible | © The Lockman Foundation, used by permission † |
| `net` | NET Bible | © Biblical Studies Press, non-commercial use only † |

† For these, the page automatically shows the publisher's copyright notice under the verse, as their licences require.

`translation=niv` shows OurManna's own NIV text. It only works without `ref`, because the Free Use Bible API doesn't have the NIV. With `ref`, it falls back to KJV.

#### Other translations

You can pass any translation ID from the API. **[LANGUAGES.md](LANGUAGES.md) lists all of them by language**, with each one's licence. These IDs are case-sensitive. Some other public-domain English translations:

| ID | Translation |
|---|---|
| `eng_webu` | World English Bible Updated |
| `eng_msb` | Majority Standard Bible |
| `eng_gnv` | Geneva Bible 1599 |
| `eng_rv5` | Revised Version (1895) |
| `eng_wbs` | Noah Webster Bible |
| `eng_cpb` | KJV Cambridge Paragraph Bible |
| `eng_tnt` | Tyndale New Testament (New Testament only) |
| `eng_jps` | JPS Tanakh 1917 (Old Testament only) |

Check each translation's licence in the full list before using it. Some, such as the Free Bible Version (`eng_fbv`), require credit to the translator. The page shows only the translation's name for them, which may not be enough. If a translation doesn't include the book of the day's verse, the page falls back to NIV.

## Embedding in SharePoint Online

1. **Allow the domain (one-off, needs a site collection admin).** Go to **Site settings → Site Collection Administration → HTML Field Security** and add `ikelaiah.github.io` to the list of allowed iframe domains.
2. **Add the web part.** Edit the page, add an **Embed** web part, and paste the iframe code from [Usage](#usage). Add any [URL parameters](#url-parameters) you want to the `src`.
3. **Adjust the height.** Verses vary in length, and `nasb`, `amp` and `net` add a copyright line. If anything gets cut off, raise `height` (e.g. to `260`) or remove `scrolling="no"`.

## How it works

```
                 no ref                                       ref=…
                   │                                            │
   OurManna JSON API (verse + reference)                        │
                   │                                            │
     translation=niv? ── yes ──► show OurManna's NIV text       │
                   │                                            │
                   no                                           │
                   ▼                                            ▼
     Free Use Bible API: fetch the chapter(s) in the chosen translation (default KJV),
     then pick out the verses in the reference
                   │
       success ──► show that translation (+ copyright notice if required)
       failure ──► fall back to OurManna's NIV text (or an error message for ref=…)
```

- Everything runs in the visitor's browser. There's no server, build step or API key.
- The Free Use Bible API serves static JSON files from a CDN. It has **no rate limits**, so it's fine on networks where many people share one IP address.
- Book names are converted to standard book codes (`Romans` → `ROM`, `1 John` → `1JN`) inside the page.
- Both APIs allow requests from any website (`Access-Control-Allow-Origin: *`).
- All verse text is inserted with `textContent`, never as HTML.

## Customising

All styling is in the `<style>` block at the top of [`index.html`](index.html). It uses SharePoint's Segoe UI font, dark grey text and a **transparent background**, so it takes on the colour of the page section it sits in. If you place it on a dark section, change `color` on `body`.

The element IDs (`#mannaverse`, `#mannaverse-reference`, `#mannaverse-version`) match OurManna's widget, so their [CSS styling guide](https://ourmanna.readme.io/reference/styling-using-css) still applies.

To add your own short translation ID, add an entry to the `TRANSLATIONS` object near the top of the script.

## Known limitations

- **NIV only comes from OurManna.** ESV, NLT, CSB and NIV aren't in the Free Use Bible API. ESV, NLT and CSB aren't available at all, and NIV works only for OurManna's own pick (`translation=niv`), not with `ref`.
- **Verse ranges can end mid-sentence.** OurManna chooses its ranges to read well in the NIV. KJV (the default) and other translations divide sentences differently, so the same range may start or end mid-sentence.
- **Some references fall back to NIV.** References the page can't read fall back to OurManna's NIV text: comma lists such as `Psalm 46:1,10`, abbreviations such as `Jn 3:16`, and spans of more than 3 chapters. With `ref=`, they show an error message instead.
- **OurManna's choices are fixed.** Its API only accepts `format` and `order`, and it labels every verse "NIV", although some of its random verses have King James wording.
- **NASB 1995 isn't built in.** The API has it as `NASB95`, but supplies the NASB 2020 copyright notice for it.

## Credits

- Verse selection and NIV text: [OurManna.com](https://www.ourmanna.com/)
- Other translations: [Free Use Bible API](https://bible.helloao.org/) by [AO Lab](https://github.com/HelloAOLab/bible-api)
- Translation copyrights belong to their respective publishers. See [Translations](#translations).
