import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

function luminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map((channel) => Number.parseInt(channel, 16) / 255);
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('widget text, references, and supporting text remain at least 4.5:1 in light and dark themes', async () => {
  const css = await readFile(new URL('../assets/widget.css', import.meta.url), 'utf8');
  const light = Object.fromEntries(['verse-text', 'reference-text', 'support-text'].map((name) => [
    name, css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1],
  ]));
  const darkRules = css.match(/:root\[data-theme="dark"\][\s\S]*?(?=\n\s*\*|$)/)?.[0] || '';
  const dark = Object.fromEntries(['verse-text', 'reference-text', 'support-text'].map((name) => [
    name, darkRules.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1],
  ]));
  for (const palette of [light, dark]) {
    for (const [name, colour] of Object.entries(palette)) assert.ok(colour, `${name} colour is declared`);
  }
  for (const colour of Object.values(light)) assert.ok(contrastRatio(colour, '#ffffff') >= 4.5);
  for (const colour of Object.values(dark)) assert.ok(contrastRatio(colour, '#1f1f1f') >= 4.5);
});

test('builder text and notice colours remain at least 4.5:1', async () => {
  const css = await readFile(new URL('../assets/setup.css', import.meta.url), 'utf8');
  const colour = (variable) => css.match(new RegExp(`--${variable}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1];
  const text = colour('text');
  const muted = colour('muted');
  const noticeRule = css.match(/\.notice\s*\{([^}]*)\}/i)?.[1] || '';
  const noticeForeground = noticeRule.match(/color:\s*(#[0-9a-f]{6})/i)?.[1];
  const noticeBackground = noticeRule.match(/background:\s*(#[0-9a-f]{6})/i)?.[1];
  assert.ok(text && muted && noticeForeground && noticeBackground, 'builder palette is declared');
  assert.ok(contrastRatio(text, '#f5f5f5') >= 4.5);
  assert.ok(contrastRatio(muted, '#f5f5f5') >= 4.5);
  assert.ok(contrastRatio(noticeForeground, noticeBackground) >= 4.5);
});
