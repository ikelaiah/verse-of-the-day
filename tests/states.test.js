import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveOptions } from '../assets/core.js';

test('applies the documented mode, default, and parameter precedence', () => {
  assert.deepEqual(resolveOptions(''), {
    order: 'daily', reference: null, requestedTranslation: 'kjv', translationId: 'eng_kjv', translationLabel: 'KJV', nivFixedReference: false, theme: 'light', verseNumbers: false,
  });
  assert.deepEqual(resolveOptions('?order=random&translation=%20%20'), {
    order: 'random', reference: null, requestedTranslation: 'kjv', translationId: 'eng_kjv', translationLabel: 'KJV', nivFixedReference: false, theme: 'light', verseNumbers: false,
  });
  assert.deepEqual(resolveOptions('?order=random&ref=John%203:16&translation=bsb'), {
    order: 'random', reference: 'John 3:16', requestedTranslation: 'bsb', translationId: 'BSB', translationLabel: 'BSB', nivFixedReference: false, theme: 'light', verseNumbers: false,
  });
});

test('makes NIV and unknown-translation behavior explicit in the resolved options', () => {
  assert.deepEqual(resolveOptions('?translation=NIV'), {
    order: 'daily', reference: null, requestedTranslation: 'NIV', translationId: null, translationLabel: 'NIV', nivFixedReference: false, theme: 'light', verseNumbers: false,
  });
  assert.deepEqual(resolveOptions('?ref=John%203:16&translation=niv'), {
    order: 'daily', reference: 'John 3:16', requestedTranslation: 'niv', translationId: 'eng_kjv', translationLabel: 'KJV', nivFixedReference: true, theme: 'light', verseNumbers: false,
  });
  assert.deepEqual(resolveOptions('?translation=custom_ABC'), {
    order: 'daily', reference: null, requestedTranslation: 'custom_ABC', translationId: 'custom_ABC', translationLabel: '', nivFixedReference: false, theme: 'light', verseNumbers: false,
  });
});

test('accepts only the documented theme options and falls back safely', () => {
  assert.equal(resolveOptions('?theme=dark').theme, 'dark');
  assert.equal(resolveOptions('?theme=auto').theme, 'auto');
  assert.equal(resolveOptions('?theme=system').theme, 'light');
  assert.equal(resolveOptions('?theme=%20dark%20').theme, 'dark');
});

test('turns optional verse numbers on only for the explicit 1 value', () => {
  assert.equal(resolveOptions('?verseNumbers=1').verseNumbers, true);
  assert.equal(resolveOptions('?verseNumbers=true').verseNumbers, false);
  assert.equal(resolveOptions('').verseNumbers, false);
});
