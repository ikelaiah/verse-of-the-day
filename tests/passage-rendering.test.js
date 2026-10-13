import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectPassage, parseReference } from '../assets/core.js';

test('preserves headings and line breaks that fall inside a whole chapter', () => {
  const response = {
    translation: { id: 'eng_kjv', name: 'King James Version', shortName: 'KJV', language: 'eng', textDirection: 'ltr' },
    book: { id: 'PSA', commonName: 'Psalm' },
    chapter: {
      number: 23,
      content: [
        { type: 'heading', content: ['A Psalm of David'] },
        { type: 'verse', number: 1, content: ['The LORD is my shepherd;'] },
        { type: 'line_break' },
        { type: 'verse', number: 2, content: ['He maketh me to lie down'] },
        { type: 'heading', content: ['A later stanza'] },
        { type: 'verse', number: 3, content: ['He restoreth my soul.'] },
      ],
    },
  };
  const result = collectPassage(parseReference('Psalm 23').value, [response], 'eng_kjv');
  assert.equal(result.ok, true);
  assert.deepEqual(result.items.map((item) => item.type), ['heading', 'verse', 'line_break', 'verse', 'heading', 'verse']);
  assert.deepEqual(result.items.filter((item) => item.type === 'verse').map((item) => item.number), [1, 2, 3]);
});

test('omits headings that precede a requested verse but keeps structure within the selected range', () => {
  const response = {
    translation: { id: 'eng_kjv', name: 'King James Version', shortName: 'KJV', language: 'eng', textDirection: 'ltr' },
    book: { id: 'JHN', commonName: 'John' },
    chapter: {
      number: 3,
      content: [
        { type: 'verse', number: 1, content: ['In the beginning'] },
        { type: 'heading', content: ['Before selection'] },
        { type: 'verse', number: 16, content: ['For God so loved the world'] },
        { type: 'line_break' },
        { type: 'verse', number: 17, content: ['For God sent not his Son'] },
      ],
    },
  };
  const result = collectPassage(parseReference('John 3:16-17').value, [response], 'eng_kjv');
  assert.deepEqual(result.items.map((item) => item.type), ['verse', 'line_break', 'verse']);
});
