import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildIframeMarkup, buildWidgetUrl, validateEmbedSettings } from '../assets/embed.js';

const validSettings = {
  mode: 'daily', translation: 'eng_kjv', reference: '', referenceValid: true,
  theme: 'light', height: 220, verseNumbers: false,
};

test('validates fixed references, NIV restrictions, themes, and height bounds', () => {
  assert.deepEqual(validateEmbedSettings(validSettings), { ok: true });
  assert.match(validateEmbedSettings({ ...validSettings, mode: 'fixed', reference: 'John 3:16', referenceValid: false }).message, /full book name/);
  assert.match(validateEmbedSettings({ ...validSettings, mode: 'fixed', translation: 'niv', reference: 'John 3:16' }).message, /daily or random/);
  assert.match(validateEmbedSettings({ ...validSettings, height: 159 }).message, /160 to 2000/);
  assert.match(validateEmbedSettings({ ...validSettings, height: 2001 }).message, /160 to 2000/);
});

test('builds deployment-relative URLs and escaped iframe markup without clipping', () => {
  const url = buildWidgetUrl('https://example.test/verse-of-the-day/setup.html', {
    ...validSettings, mode: 'fixed', reference: 'John 3:16&x="test"', theme: 'dark', verseNumbers: true,
  });
  assert.equal(url.pathname, '/verse-of-the-day/index.html');
  assert.equal(url.searchParams.get('ref'), 'John 3:16&x="test"');
  assert.equal(url.searchParams.get('translation'), 'eng_kjv');
  assert.equal(url.searchParams.get('theme'), 'dark');
  assert.equal(url.searchParams.get('verseNumbers'), '1');
  const iframe = buildIframeMarkup(url.href, 220);
  assert.match(iframe, /width="100%"/);
  assert.match(iframe, /height="220"/);
  assert.match(iframe, /style="border:0"/);
  assert.doesNotMatch(iframe, /scrolling|frameborder/);
  assert.match(iframe, /&amp;/);
  assert.throws(() => buildIframeMarkup(url.href, '220" onload="alert(1)'), /integer from 160 to 2000/);
});

test('omits default daily order and includes random mode explicitly', () => {
  assert.equal(buildWidgetUrl('https://example.test/', validSettings).searchParams.has('order'), false);
  assert.equal(buildWidgetUrl('https://example.test/', { ...validSettings, mode: 'random' }).searchParams.get('order'), 'random');
});
