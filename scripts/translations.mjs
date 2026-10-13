import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const API_URL = 'https://bible.helloao.org/api/available_translations.json';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT_PATH = resolve(ROOT, 'data/translations.json');
const OVERRIDES_PATH = resolve(ROOT, 'data/licence-overrides.json');
const MARKDOWN_PATH = resolve(ROOT, 'LANGUAGES.md');

function cellsFromRow(line) {
  if (!line.startsWith('|') || !line.endsWith('|')) return [];
  return line.slice(1, -1).split('|').map((cell) => cell.trim());
}

function codeFromCell(cell = '') {
  return /^`([^`]+)`$/.exec(cell.trim())?.[1] || '';
}

function licenceFromCell(cell = '') {
  const match = /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/.exec(cell.trim());
  return match ? { label: match[1], url: match[2] } : { label: 'Unknown', url: null };
}

export function parseLegacyCatalogue(markdown) {
  if (typeof markdown !== 'string') throw new TypeError('The existing catalogue must be Markdown text.');
  const metadata = new Map();
  let englishTable = false;

  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith('## ')) englishTable = line.trim() === '## English';
    const cells = cellsFromRow(line);
    if (!cells.length || cells[0].startsWith('---')) continue;
    if (cells[0] === 'ID' || cells[0] === 'Language') continue;

    const id = codeFromCell(englishTable ? cells[0] : cells[1]);
    if (!id) continue;
    const shortcut = englishTable ? codeFromCell(cells[1]) : '';
    const licence = licenceFromCell(cells.length >= 5 ? cells[4] : cells.at(-1));
    metadata.set(id, { shortcut, licenseLabel: licence.label, licenseUrl: licence.url });
  }
  return metadata;
}

function secureUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function normalizeCatalogue(data, legacy = new Map(), fetchedAt = new Date().toISOString()) {
  if (!data || !Array.isArray(data.translations) || data.translations.length === 0) {
    throw new TypeError('The upstream response must contain a non-empty translations array.');
  }

  const ids = new Set();
  const translations = data.translations.map((item) => {
    if (
      !item ||
      typeof item.id !== 'string' || !item.id.trim() ||
      typeof item.name !== 'string' || !item.name.trim() ||
      typeof item.language !== 'string' || !item.language.trim() ||
      !['ltr', 'rtl'].includes(item.textDirection) ||
      !Number.isSafeInteger(item.numberOfBooks) || item.numberOfBooks < 1
    ) {
      throw new TypeError('The upstream catalogue contains an entry with invalid required metadata.');
    }
    if (ids.has(item.id)) throw new TypeError(`The upstream catalogue contains duplicate ID ${item.id}.`);
    ids.add(item.id);

    const old = legacy.get(item.id);
    const language = item.languageEnglishName || item.languageName || item.language;
    return {
      id: item.id,
      shortcut: old?.shortcut || '',
      name: item.englishName || item.name,
      originalName: item.name,
      languageCode: item.language,
      language,
      nativeLanguage: item.languageName || '',
      direction: item.textDirection,
      books: item.numberOfBooks,
      website: secureUrl(item.website),
      licence: {
        label: old?.licenseLabel || 'Unknown',
        url: secureUrl(old?.licenseUrl) || secureUrl(item.licenseUrl),
        notes: typeof item.licenseNotes === 'string' && item.licenseNotes.trim() ? item.licenseNotes.trim() : null,
        notice: typeof item.licenseNotice === 'string' && item.licenseNotice.trim() ? item.licenseNotice.trim() : null,
        terms: item.license && typeof item.license === 'object' ? item.license : null,
      },
    };
  });

  translations.sort((a, b) => compareText(a.id, b.id));
  const languages = new Set(translations.map((item) => item.language));
  return {
    source: { url: API_URL, fetchedAt, translationCount: translations.length, languageCount: languages.size },
    translations,
  };
}

function compareText(a, b) {
  const left = String(a).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const right = String(b).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  return left < right ? -1 : left > right ? 1 : String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

function escapeCell(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
}

function escapeLabel(value) {
  return escapeCell(value).replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

function licenceCell(licence) {
  const label = escapeLabel(licence.label || 'Unknown');
  const url = secureUrl(licence.url);
  return url ? `[${label}](<${url}>)` : label;
}

function translationRow(translation, english) {
  if (english) {
    const shortcut = translation.shortcut ? `\`${escapeCell(translation.shortcut)}\`` : '';
    return `| \`${escapeCell(translation.id)}\` | ${shortcut} | ${escapeCell(translation.name)} | ${translation.books} | ${licenceCell(translation.licence)} | ${escapeCell(translation.licence.notice || '')} |`;
  }
  return `| ${escapeCell(translation.language)} | \`${escapeCell(translation.id)}\` | ${escapeCell(translation.name)} | ${translation.books} | ${licenceCell(translation.licence)} | ${escapeCell(translation.licence.notice || '')} |`;
}

export function renderCatalogue(snapshot) {
  const entries = snapshot.translations;
  const groups = new Map();
  for (const entry of entries) {
    const name = entry.language || entry.languageCode || 'Unknown';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(entry);
  }
  for (const rows of groups.values()) rows.sort((a, b) => compareText(a.id, b.id));

  const english = groups.get('English') || [];
  const generatedAt = snapshot.source.fetchedAt.slice(0, 10);
  const alphabetical = [...groups.keys()].filter((name) => name !== 'English').sort(compareText);
  const letters = new Map();
  const otherLanguages = [];
  for (const name of alphabetical) {
    const initial = name.normalize('NFD').replace(/\p{Diacritic}/gu, '').charAt(0).toUpperCase();
    if (/^[A-Z]$/.test(initial)) {
      if (!letters.has(initial)) letters.set(initial, []);
      letters.get(initial).push(name);
    } else {
      otherLanguages.push(name);
    }
  }

  const lines = [
    '# Available translations by language',
    '',
    `All **${entries.length.toLocaleString('en-US')} translations** in **${groups.size.toLocaleString('en-US')} languages** offered by the [Free Use Bible API](https://bible.helloao.org/), and the ID to use with this page.`,
    '',
    'Use the ID in the `translation` parameter, exactly as shown (IDs are case-sensitive):',
    '',
    '```',
    'https://ikelaiah.github.io/verse-of-the-day/?translation=eng_gnv',
    '```',
    '',
    `> Generated on ${generatedAt} from the API's [translation list](https://bible.helloao.org/api/available_translations.json). The API adds translations over time, so check that link for the latest list.`,
    '',
    '## Columns',
    '',
    '| Column | Meaning |',
    '|---|---|',
    '| **ID** | Value for `?translation=` |',
    '| **Books** | Number of books included: 66 = whole Bible, 27 = New Testament only, fewer = portions. If the day’s verse is in a missing book, the widget explains the fallback. |',
    '| **Licence** | The label follows the previous curated catalogue where available; new entries without a reviewed label show **Unknown**. Follow the source link and each publisher’s terms before use. |',
    '| **Attribution notice** | The widget displays an attribution notice supplied with passage data when the API provides one; the translation-list endpoint does not contain those passage notices. |',
    '',
    '## Jump to',
    '',
    `[English](#english)${[...letters.keys()].sort().map((letter) => ` · [${letter}](#${letter.toLowerCase()})`).join('')}${otherLanguages.length ? ' · [Other](#other)' : ''}`,
    '',
    '## English',
    '',
    `${english.length} translations. Those with a **Shortcut** can also be used by that short ID (e.g. \`?translation=kjv\`).`,
    '',
    '| ID | Shortcut | Translation | Books | Licence | Attribution notice |',
    '|---|---|---|---|---|---|',
    ...english.map((entry) => translationRow(entry, true)),
  ];

  for (const letter of [...letters.keys()].sort()) {
    for (const name of letters.get(letter)) {
      lines.push('', `## ${escapeCell(name)}`, '', '| Language | ID | Translation | Books | Licence | Attribution notice |', '|---|---|---|---|---|---|');
      lines.push(...groups.get(name).map((entry) => translationRow(entry, false)));
    }
  }
  if (otherLanguages.length) {
    lines.push('', '## Other', '', '| Language | ID | Translation | Books | Licence | Attribution notice |', '|---|---|---|---|---|---|');
    for (const name of otherLanguages) lines.push(...groups.get(name).map((entry) => translationRow(entry, false)));
  }
  return `${lines.join('\n')}\n`;
}

async function writeFilesAtomically(files) {
  const staged = [];
  const replaced = [];
  try {
    for (const [path, content] of files) {
      const temp = `${path}.${process.pid}.tmp`;
      const old = await readFile(path, 'utf8').catch((error) => error.code === 'ENOENT' ? null : Promise.reject(error));
      await mkdir(dirname(path), { recursive: true });
      await writeFile(temp, content, 'utf8');
      staged.push({ path, temp, old });
    }
    for (const item of staged) {
      await rename(item.temp, item.path);
      replaced.push(item);
    }
  } catch (error) {
    for (const item of replaced.reverse()) {
      if (item.old === null) await rm(item.path, { force: true });
      else {
        const restore = `${item.path}.${process.pid}.restore`;
        await writeFile(restore, item.old, 'utf8');
        await rename(restore, item.path);
      }
    }
    throw error;
  } finally {
    await Promise.all(staged.map((item) => rm(item.temp, { force: true })));
  }
}

async function refresh() {
  const response = await fetch(API_URL, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Translation API returned HTTP ${response.status}.`);
  const data = await response.json();
  const legacy = parseLegacyCatalogue(await readFile(MARKDOWN_PATH, 'utf8'));
  const overrides = JSON.parse(await readFile(OVERRIDES_PATH, 'utf8'));
  for (const [id, metadata] of Object.entries(overrides)) legacy.set(id, metadata);
  const snapshot = normalizeCatalogue(data, legacy);
  await writeFilesAtomically([
    [SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`],
    [MARKDOWN_PATH, renderCatalogue(snapshot)],
  ]);
  process.stdout.write(`Refreshed ${snapshot.source.translationCount} translations in ${snapshot.source.languageCount} languages.\n`);
}

async function generate({ check = false } = {}) {
  const snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, 'utf8'));
  const markdown = renderCatalogue(snapshot);
  const current = await readFile(MARKDOWN_PATH, 'utf8');
  if (check) {
    if (current !== markdown) throw new Error('LANGUAGES.md is out of date. Run npm run catalogue:generate.');
    process.stdout.write('LANGUAGES.md matches data/translations.json.\n');
    return;
  }
  if (current !== markdown) {
    await writeFilesAtomically([[MARKDOWN_PATH, markdown]]);
    process.stdout.write('Generated LANGUAGES.md from data/translations.json.\n');
  } else {
    process.stdout.write('LANGUAGES.md already matches data/translations.json.\n');
  }
}

async function main(command) {
  if (command === '--refresh') return refresh();
  if (command === '--generate') return generate();
  if (command === '--check') return generate({ check: true });
  throw new Error('Usage: node scripts/translations.mjs --refresh|--generate|--check');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv[2]).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
