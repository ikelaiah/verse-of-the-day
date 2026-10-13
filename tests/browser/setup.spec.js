import { expect, test } from './fixtures.js';

test('searches translations and keeps preview and generated iframe in sync', async ({ page }) => {
  await page.goto('setup.html');
  await expect(page.locator('#translation-list')).toBeEnabled();
  await expect(page.locator('#selected-credit')).toContainText('King James Version');

  await page.getByRole('radio', { name: 'A passage I choose' }).check();
  await page.getByLabel('Bible reference').fill('Jn 3:16');
  await expect(page.locator('#widget-link')).toHaveValue('');
  await expect(page.locator('#form-status')).toContainText('Use a full book name');

  await page.getByLabel('Bible reference').fill('John 3:16');
  await page.getByLabel('Colour theme').selectOption('dark');
  await page.getByLabel('Embed height').fill('400');
  await page.getByLabel('Show verse numbers').check();
  await expect(page.locator('#preview-frame')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('#preview-frame')).toHaveAttribute('height', '400');
  await expect(page.locator('#widget-link')).toHaveValue(/index\.html\?/);
  await expect(page.locator('#widget-link')).toHaveValue(/^http:\/\/127\.0\.0\.1:8765\/verse-of-the-day\//);
  await expect(page.locator('#widget-link')).toHaveValue(/ref=John\+3%3A16/);
  await expect(page.locator('#widget-link')).toHaveValue(/theme=dark/);
  await expect(page.locator('#widget-link')).toHaveValue(/verseNumbers=1/);
  await expect(page.locator('#iframe-code')).toHaveValue(/height="400"/);
  await expect(page.locator('#iframe-code')).toHaveValue(/title="Verse of the Day"/);
  await expect(page.locator('#iframe-code')).not.toHaveValue(/scrolling|frameborder/);
  await expect(page.frameLocator('#preview-frame').locator('#mannaverse')).toContainText('For God so loved the world.');
  await expect(page.locator('#preview-status')).toHaveText('Preview is showing the selected settings.');

  await page.getByRole('button', { name: 'Narrow (320px)' }).click();
  await expect(page.locator('#preview-frame')).toHaveAttribute('data-width', 'narrow');
  expect(await page.locator('#preview-frame').evaluate((frame) => Math.round(frame.getBoundingClientRect().width))).toBe(320);
});
test('disallows NIV for fixed passages and does not retain stale copy output', async ({ page }) => {
  await page.goto('setup.html');
  await page.getByLabel('Find a translation').fill('NIV');
  await page.getByLabel('Choose translation').selectOption('niv');
  await expect(page.locator('#widget-link')).toHaveValue(/translation=niv/);
  await page.getByRole('radio', { name: 'A passage I choose' }).check();
  await page.getByLabel('Bible reference').fill('John 3:16');
  await expect(page.locator('#form-status')).toContainText('NIV is available for daily or random verses only');
  await expect(page.locator('#widget-link')).toHaveValue('');
  await expect(page.locator('#iframe-code')).toHaveValue('');
});

test('shows matching-count and no-results feedback for catalogue search', async ({ page }) => {
  await page.goto('setup.html');
  await page.getByLabel('Find a translation').fill('zzzz-no-translation');
  await expect(page.locator('#result-count')).toContainText('No translations match');
  await expect(page.locator('#translation-list')).toBeDisabled();
  await page.getByLabel('Find a translation').fill('Arabic');
  await expect(page.locator('#result-count')).toContainText('translation');
  await expect(page.locator('#translation-list option').first()).toContainText('Arabic');
});

test('exposes selected text for manual copying when clipboard access fails', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => { throw new Error('permission denied'); } },
    });
  });
  await page.goto('setup.html');
  await page.getByRole('button', { name: 'Copy link' }).click();
  await expect(page.locator('#link-copy-status')).toContainText('The text is selected');
  expect(await page.locator('#widget-link').evaluate((field) => field.selectionStart === 0 && field.selectionEnd === field.value.length)).toBe(true);
});

test('keeps the builder usable at 320px and shows keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('setup.html');
  await expect(page.locator('#translation-list')).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

  await page.keyboard.press('Tab');
  await expect(page.locator('.brand')).toBeFocused();
  expect(await page.locator('.brand').evaluate((element) => getComputedStyle(element).outlineWidth)).toBe('3px');
  await page.getByRole('button', { name: 'Narrow (320px)' }).click();
  await expect(page.locator('#preview-frame')).toHaveAttribute('data-width', 'narrow');
  expect(await page.locator('#preview-frame').evaluate((frame) => Math.round(frame.getBoundingClientRect().width))).toBe(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('keeps a long passage scrollable and wrapped at a narrow effective zoom width', async ({ page }) => {
  const longText = 'A long passage remains readable when the embed is narrow. '.repeat(100);
  await page.route('https://bible.helloao.org/api/**', async (route) => {
    const url = new URL(route.request().url());
    const id = decodeURIComponent(url.pathname.split('/')[2]);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      translation: { id, name: 'Fixture Translation', shortName: 'Fixture', language: 'en', textDirection: 'ltr' },
      book: { id: 'JHN', commonName: 'John' },
      chapter: { number: 3, content: [{ type: 'verse', number: 16, content: [longText] }] },
    }) });
  });
  await page.setViewportSize({ width: 160, height: 900 });
  await page.goto('setup.html');
  await page.getByRole('radio', { name: 'A passage I choose' }).check();
  await page.getByLabel('Bible reference').fill('John 3:16');
  await page.getByRole('button', { name: 'Narrow (320px)' }).click();
  const passage = page.frameLocator('#preview-frame').locator('#mannaverse');
  await expect(passage).toContainText('A long passage remains readable');
  const dimensions = await page.frameLocator('#preview-frame').locator('body').evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.innerHeight);
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(160);
});
