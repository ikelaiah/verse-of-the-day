const BOOK_NAMES = Object.create(null);
export const TRANSLATIONS = {
  asv: { id: 'eng_asv', label: 'ASV' },
  amp: { id: 'AMP', label: 'AMP' },
  bbe: { id: 'eng_bbe', label: 'BBE' },
  bsb: { id: 'BSB', label: 'BSB' },
  darby: { id: 'eng_dby', label: 'Darby' },
  dra: { id: 'eng_dra', label: 'DRA' },
  kjv: { id: 'eng_kjv', label: 'KJV' },
  net: { id: 'eng_net', label: 'NET' },
  nasb: { id: 'NASB2020', label: 'NASB' },
  web: { id: 'ENGWEBP', label: 'WEB' },
  webbe: { id: 'eng_webpb', label: 'WEBBE' },
  ylt: { id: 'eng_ylt', label: 'YLT' },
  niv: { id: null, label: 'NIV' },
};

function codedError(code, message = code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export async function requestJson(url, { fetcher = globalThis.fetch, signal, timeoutMs = 10_000 } = {}) {
  const controller = new AbortController();
  let timedOut = false;
  let rejectInterrupted;
  const interrupted = new Promise((_, reject) => {
    rejectInterrupted = reject;
  });
  const onAbort = () => {
    controller.abort(signal.reason);
    rejectInterrupted(codedError(signal.reason === 'overall-timeout' ? 'overall-timeout' : 'aborted'));
  };

  if (signal) {
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort('request-timeout');
    rejectInterrupted(codedError('request-timeout'));
  }, timeoutMs);

  const load = async () => {
    let response;
    try {
      response = await fetcher(url, { signal: controller.signal });
    } catch (error) {
      if (error && error.code) throw error;
      throw codedError(controller.signal.aborted ? 'aborted' : 'network-error');
    }

    if (!response || !response.ok) {
      const status = response && response.status;
      throw codedError(status === 404 ? 'unavailable' : 'provider-error', `HTTP ${status || 'unknown'}`);
    }

    try {
      return await response.json();
    } catch {
      throw codedError('invalid-response');
    }
  };

  try {
    return await Promise.race([load(), interrupted]);
  } catch (error) {
    if (timedOut) throw codedError('request-timeout');
    throw error;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}
const BOOKS = [
  'GEN genesis', 'EXO exodus', 'LEV leviticus', 'NUM numbers', 'DEU deuteronomy', 'JOS joshua', 'JDG judges', 'RUT ruth',
  '1SA 1samuel', '2SA 2samuel', '1KI 1kings', '2KI 2kings', '1CH 1chronicles', '2CH 2chronicles', 'EZR ezra', 'NEH nehemiah',
  'EST esther', 'JOB job', 'PSA psalm psalms', 'PRO proverbs', 'ECC ecclesiastes', 'SNG songofsongs songofsolomon',
  'ISA isaiah', 'JER jeremiah', 'LAM lamentations', 'EZK ezekiel', 'DAN daniel', 'HOS hosea', 'JOL joel', 'AMO amos',
  'OBA obadiah', 'JON jonah', 'MIC micah', 'NAM nahum', 'HAB habakkuk', 'ZEP zephaniah', 'HAG haggai', 'ZEC zechariah',
  'MAL malachi', 'MAT matthew', 'MRK mark', 'LUK luke', 'JHN john', 'ACT acts', 'ROM romans', '1CO 1corinthians',
  '2CO 2corinthians', 'GAL galatians', 'EPH ephesians', 'PHP philippians', 'COL colossians', '1TH 1thessalonians',
  '2TH 2thessalonians', '1TI 1timothy', '2TI 2timothy', 'TIT titus', 'PHM philemon', 'HEB hebrews', 'JAS james',
  '1PE 1peter', '2PE 2peter', '1JN 1john', '2JN 2john', '3JN 3john', 'JUD jude', 'REV revelation revelations',
];

for (const entry of BOOKS) {
  const [bookId, ...names] = entry.split(' ');
  for (const name of names) BOOK_NAMES[name] = bookId;
}

function validInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export function parseReference(input) {
  if (typeof input !== 'string') return { ok: false, code: 'invalid-reference' };

  const match = /^(.+?)\s*(\d+)(?::(\d+)(?:\s*[-–]\s*(?:(\d+):)?(\d+))?)?$/.exec(input.trim());
  if (!match) return { ok: false, code: 'invalid-reference' };

  const normalizedBook = match[1].toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!Object.hasOwn(BOOK_NAMES, normalizedBook)) return { ok: false, code: 'invalid-reference' };

  const bookId = BOOK_NAMES[normalizedBook];
  const startChapter = Number(match[2]);
  const startVerse = match[3] ? Number(match[3]) : null;
  const endChapter = match[4] ? Number(match[4]) : startChapter;
  const endVerse = match[5] ? Number(match[5]) : startVerse;

  if (!validInteger(startChapter) || !validInteger(endChapter)) return { ok: false, code: 'invalid-reference' };
  if (startVerse !== null && !validInteger(startVerse)) return { ok: false, code: 'invalid-reference' };
  if (endVerse !== null && !validInteger(endVerse)) return { ok: false, code: 'invalid-reference' };
  if (endChapter < startChapter || endChapter - startChapter > 2) return { ok: false, code: 'invalid-reference' };
  if (startVerse === null && endChapter !== startChapter && endVerse !== null) return { ok: false, code: 'invalid-reference' };
  if (endChapter === startChapter && endVerse !== null && endVerse < startVerse) {
    return { ok: false, code: 'invalid-reference' };
  }
  if (startVerse !== null && match[4] && endVerse === null) return { ok: false, code: 'invalid-reference' };

  return {
    ok: true,
    value: { book: bookId, startChapter, startVerse, endChapter, endVerse },
  };
}

export function resolveOptions(search) {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(String(search || '').replace(/^\?/, ''));
  const order = params.get('order') === 'random' ? 'random' : 'daily';
  const reference = (params.get('ref') || '').trim() || null;
  const requestedTranslation = (params.get('translation') || '').trim() || 'kjv';
  const alias = TRANSLATIONS[requestedTranslation.toLowerCase()];
  const nivFixedReference = requestedTranslation.toLowerCase() === 'niv' && reference !== null;
  const requestedTheme = (params.get('theme') || '').trim().toLowerCase();
  const theme = ['light', 'dark', 'auto'].includes(requestedTheme) ? requestedTheme : 'light';
  const verseNumbers = params.get('verseNumbers') === '1';

  if (nivFixedReference) {
    return {
      order,
      reference,
      requestedTranslation,
      translationId: TRANSLATIONS.kjv.id,
      translationLabel: TRANSLATIONS.kjv.label,
      nivFixedReference,
      theme,
      verseNumbers,
    };
  }

  return {
    order,
    reference,
    requestedTranslation,
    translationId: alias ? alias.id : requestedTranslation,
    translationLabel: alias ? alias.label : '',
    nivFixedReference: false,
    theme,
    verseNumbers,
  };
}

export function formatReference(bookName, reference) {
  const start = `${bookName} ${reference.startChapter}`;
  if (reference.startVerse === null) return start;

  const first = `${start}:${reference.startVerse}`;
  if (reference.endChapter !== reference.startChapter) {
    return `${first}-${reference.endChapter}:${reference.endVerse}`;
  }
  return reference.endVerse !== reference.startVerse ? `${first}-${reference.endVerse}` : first;
}

export function collectPassage(reference, chapters, translationId) {
  if (!reference || !Array.isArray(chapters) || chapters.length !== reference.endChapter - reference.startChapter + 1) {
    return { ok: false, code: 'invalid-response' };
  }

  const verses = [];
  const items = [];
  let bookName = '';
  for (let index = 0; index < chapters.length; index += 1) {
    const data = chapters[index];
    const expectedNumber = reference.startChapter + index;
    if (
      !data ||
      !data.chapter ||
      data.chapter.number !== expectedNumber ||
      !Array.isArray(data.chapter.content) ||
      !data.translation ||
      data.translation.id !== translationId ||
      !data.book ||
      data.book.id !== reference.book ||
      typeof data.book.commonName !== 'string' ||
      !data.book.commonName.trim()
    ) {
      return { ok: false, code: 'invalid-response' };
    }

    if (!bookName) bookName = data.book.commonName;
    const chapterVerses = data.chapter.content.filter((item) => item && item.type === 'verse');
    for (const verse of chapterVerses) {
      if (!validInteger(verse.number) || !Array.isArray(verse.content)) {
        return { ok: false, code: 'invalid-response' };
      }
    }

    const firstNumber = index === 0 ? reference.startVerse : null;
    const lastNumber = index === chapters.length - 1 ? reference.endVerse : null;
    if (
      (firstNumber !== null && !chapterVerses.some((verse) => verse.number === firstNumber)) ||
      (lastNumber !== null && !chapterVerses.some((verse) => verse.number === lastNumber))
    ) {
      return { ok: false, code: 'passage-unavailable' };
    }

    const firstChapterVerse = chapterVerses[0]?.number;
    let selectedInChapter = false;
    let pendingStructure = [];
    for (const item of data.chapter.content) {
      if (!item || typeof item !== 'object') return { ok: false, code: 'invalid-response' };
      if (item.type !== 'verse') {
        if (item.type === 'heading' || item.type === 'hebrew_subtitle') {
          if (!Array.isArray(item.content)) return { ok: false, code: 'invalid-response' };
        }
        if (['heading', 'line_break', 'hebrew_subtitle'].includes(item.type)) pendingStructure.push(item);
        continue;
      }

      const verse = item;
      if (firstNumber !== null && verse.number < firstNumber) continue;
      if (lastNumber !== null && verse.number > lastNumber) break;

      if (
        !selectedInChapter &&
        index === 0 &&
        firstNumber !== null &&
        firstNumber !== firstChapterVerse
      ) {
        pendingStructure = [];
      }
      items.push(...pendingStructure);
      pendingStructure = [];

      const selectedVerse = { type: 'verse', chapter: expectedNumber, number: verse.number, content: verse.content };
      verses.push(selectedVerse);
      items.push(selectedVerse);
      selectedInChapter = true;
      if (verse.number === lastNumber) break;
    }

    if (!selectedInChapter) return { ok: false, code: 'passage-unavailable' };
  }

  if (verses.length === 0) return { ok: false, code: 'passage-unavailable' };
  return { ok: true, bookName, verses, items };
}
