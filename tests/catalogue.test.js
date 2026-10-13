import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeCatalogue, parseLegacyCatalogue, renderCatalogue } from '../scripts/translations.mjs';

const legacy = [
  '## English',
  '| ID | Shortcut | Translation | Books | Licence |',
  '|---|---|---|---|---|',
  '| `eng_kjv` | `kjv` | King James Version | 66 | [Public domain](https://example.test/kjv) |',
  '## A',
  '| Language | ID | Translation | Books | Licence |',
  '|---|---|---|---|---|',
  '| Arabic | `arb_bible` | الكتاب المقدس | 27 | [Credit required](https://example.test/arabic) |',
].join('\n');

const apiTranslations = [
  {
    id: 'eng_kjv', name: 'King James Version', englishName: 'King James Version',
    language: 'eng', languageName: 'English', languageEnglishName: 'English', textDirection: 'ltr', numberOfBooks: 66,
    website: 'https://example.test/kjv', licenseUrl: 'https://example.test/kjv-api', licenseNotes: null,
    licenseNotice: 'KJV notice.', license: { commercialUse: 'allowed', attribution: 'required' },
  },
  {
    id: 'arb_bible', name: 'الكتاب المقدس', englishName: 'Arabic Bible',
    language: 'arb', languageName: 'العربية', languageEnglishName: 'Arabic', textDirection: 'rtl', numberOfBooks: 27,
    website: 'https://example.test/arabic', licenseUrl: 'https://example.test/arabic-api', licenseNotes: null,
  },
  {
    id: 'new_id', name: 'New translation', englishName: 'New translation',
    language: 'eng', languageName: 'English', languageEnglishName: 'English', textDirection: 'ltr', numberOfBooks: 12,
    website: 'https://example.test/new', licenseUrl: 'https://example.test/new-licence', licenseNotes: 'See source terms.',
  },
  {
    id: 'html_name', name: '<img src=x onerror=alert(1)>', englishName: '<img src=x onerror=alert(1)>',
    language: 'eng', languageName: 'English', languageEnglishName: 'English', textDirection: 'ltr', numberOfBooks: 1,
    website: 'https://example.test/html', licenseUrl: 'https://example.test/html-licence', licenseNotes: null,
  },
];

test('parses existing English aliases and non-English licence provenance', () => {
  const result = parseLegacyCatalogue(legacy);
  assert.deepEqual(result.get('eng_kjv'), { shortcut: 'kjv', licenseLabel: 'Public domain', licenseUrl: 'https://example.test/kjv' });
  assert.deepEqual(result.get('arb_bible'), { shortcut: '', licenseLabel: 'Credit required', licenseUrl: 'https://example.test/arabic' });
});

test('reads licence data from the right column after attribution notices were added', () => {
  const markdown = [
    '## English',
    '| ID | Shortcut | Translation | Books | Licence | Attribution notice |',
    '|---|---|---|---|---|---|',
    '| `eng_kjv` | `kjv` | King James Version | 66 | [Public domain](https://example.test/kjv) | Copyright text, with a pipe-free cell. |',
  ].join('\n');
  assert.deepEqual(parseLegacyCatalogue(markdown).get('eng_kjv'), {
    shortcut: 'kjv', licenseLabel: 'Public domain', licenseUrl: 'https://example.test/kjv',
  });
});

test('normalizes live metadata and preserves unknown licence data without guessing', () => {
  const snapshot = normalizeCatalogue({ translations: apiTranslations }, parseLegacyCatalogue(legacy), '2026-10-13T00:00:00.000Z');
  assert.equal(snapshot.translations.length, 4);
  assert.deepEqual(snapshot.translations.find((entry) => entry.id === 'eng_kjv').licence, {
    label: 'Public domain', url: 'https://example.test/kjv', notes: null,
    notice: 'KJV notice.', terms: { commercialUse: 'allowed', attribution: 'required' },
  });
  const arabic = snapshot.translations.find((entry) => entry.id === 'arb_bible');
  assert.equal(arabic.direction, 'rtl');
  assert.equal(arabic.licence.label, 'Credit required');
  assert.equal(snapshot.translations.find((entry) => entry.id === 'new_id').licence.label, 'Unknown');
  assert.equal(snapshot.translations.find((entry) => entry.id === 'new_id').licence.notice, null);
  assert.throws(() => normalizeCatalogue({ translations: [...apiTranslations, apiTranslations[0]] }, new Map(), '2026-10-13T00:00:00.000Z'), /duplicate/);
});

test('renders stable language sections, current counts, escaped cells, and safe licence links', () => {
  const snapshot = normalizeCatalogue({ translations: apiTranslations }, parseLegacyCatalogue(legacy), '2026-10-13T00:00:00.000Z');
  const markdown = renderCatalogue(snapshot);
  assert.match(markdown, /4 translations\*\* in \*\*2 languages/);
  assert.match(markdown, /\| `eng_kjv` \| `kjv` \| King James Version \| 66 \| \[Public domain\]\(<https:\/\/example\.test\/kjv>\) \|/);
  assert.match(markdown, /## Arabic/);
  assert.match(markdown, /`arb_bible`/);
  assert.match(markdown, /\[Unknown\]\(<https:\/\/example\.test\/new-licence>\)/);
  assert.match(markdown, /KJV notice\./);
  assert.match(markdown, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(markdown, /<img\b/i);
  assert.doesNotMatch(renderCatalogue({ ...snapshot, generatedAt: '2026-10-13T00:00:00Z' }), /\]\(javascript:/i);
  assert.equal(renderCatalogue(snapshot), markdown);
});
