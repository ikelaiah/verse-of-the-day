import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectPassage, parseReference } from '../assets/core.js';

const sampleChapter = (bookId, number, verses, translationId = 'eng_kjv') => ({
  translation: { id: translationId, name: 'King James Version', shortName: 'KJV', language: 'eng', textDirection: 'ltr' },
  book: { id: bookId, commonName: bookId === 'JHN' ? 'John' : 'Romans' },
  chapter: {
    number,
    content: verses.map((verseNumber) => ({ type: 'verse', number: verseNumber, content: [`Verse ${number}:${verseNumber}`] })),
  },
});

test('parses full book names, supported aliases, whole chapters, and bounded ranges', () => {
  assert.deepEqual(parseReference('John 3:16'), {
    ok: true,
    value: { book: 'JHN', startChapter: 3, startVerse: 16, endChapter: 3, endVerse: 16 },
  });
  assert.deepEqual(parseReference(' Psalm 23 '), {
    ok: true,
    value: { book: 'PSA', startChapter: 23, startVerse: null, endChapter: 23, endVerse: null },
  });
  assert.equal(parseReference('Psalms 23').value.book, 'PSA');
  assert.equal(parseReference('1 John 4:8').value.book, '1JN');
  assert.equal(parseReference('Song of Solomon 2:1').value.book, 'SNG');
  assert.deepEqual(parseReference('Romans 8:38-9:1').value, {
    book: 'ROM', startChapter: 8, startVerse: 38, endChapter: 9, endVerse: 1,
  });
  assert.equal(parseReference('John 3:16–18').value.endVerse, 18);
});

test('rejects invalid numeric bounds, ordering, unsupported syntax, and inherited object names', () => {
  for (const reference of [
    'John 0:1', 'John 3:0-2', 'John 3:-1', 'John 3:18-16', 'John 4:1-3:1',
    'John 3:1-6:1', 'John 999999999999999999999:1', 'Jn 3:16', 'No Such Book 1:1',
    'constructor 3:1', 'toString 3:1', 'Psalm 46:1,10', '',
  ]) {
    assert.equal(parseReference(reference).ok, false, reference);
  }
});

test('selects the exact requested verses only after validating both endpoints', () => {
  const chapters = [sampleChapter('ROM', 8, [37, 38, 39, 40]), sampleChapter('ROM', 9, [1, 2, 3])];
  const passage = collectPassage(parseReference('Romans 8:38-9:1').value, chapters, 'eng_kjv');
  assert.equal(passage.ok, true);
  assert.deepEqual(passage.verses.map((verse) => [verse.chapter, verse.number]), [[8, 38], [8, 39], [8, 40], [9, 1]]);
  assert.equal(collectPassage(parseReference('John 3:16').value, [sampleChapter('JHN', 3, [16])], 'eng_kjv').ok, true);
});

test('rejects missing endpoints instead of returning a misleading partial passage', () => {
  const cases = [
    ['John 3:16-999', [sampleChapter('JHN', 3, [16, 17, 18])]],
    ['John 3:999-4:2', [sampleChapter('JHN', 3, [1, 2]), sampleChapter('JHN', 4, [1, 2])]],
    ['John 3:16', [sampleChapter('JHN', 3, [15, 17])]],
  ];
  for (const [reference, chapters] of cases) {
    const result = collectPassage(parseReference(reference).value, chapters, 'eng_kjv');
    assert.deepEqual(result, { ok: false, code: 'passage-unavailable' }, reference);
  }
});

test('rejects empty or mismatched API data before it reaches the renderer', () => {
  const reference = parseReference('John 3:16').value;
  assert.deepEqual(collectPassage(reference, [sampleChapter('ROM', 3, [16])], 'eng_kjv'), {
    ok: false,
    code: 'invalid-response',
  });
  assert.deepEqual(collectPassage(reference, [sampleChapter('JHN', 3, [16], 'wrong_id')], 'eng_kjv'), {
    ok: false,
    code: 'invalid-response',
  });
  assert.deepEqual(collectPassage(reference, [], 'eng_kjv'), { ok: false, code: 'invalid-response' });
});
