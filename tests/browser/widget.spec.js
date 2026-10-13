import { expect, test } from './fixtures.js';

function chapterFixture({ id = 'eng_kjv', language = 'en', direction = 'ltr', content } = {}) {
  return {
    translation: {
      id, name: 'Fixture Translation', shortName: 'Fixture', language,
      textDirection: direction, licenseNotice: 'Copyright notice supplied by the fixture.',
    },
    book: { id: 'JHN', commonName: 'John' },
    chapter: {
      number: 3,
      content: content || [
        { type: 'verse', number: 16, content: ['For God so loved ', { text: 'the world' }, '.'] },
        { type: 'heading', content: ['The next section'] },
        { type: 'verse', number: 17, content: ['He sent his Son.'] },
      ],
    },
  };
}

async function mockChapter(page, fixture = chapterFixture(), { status = 200 } = {}) {
  await page.route('https://bible.helloao.org/api/**', async (route) => {
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(fixture) });
  });
}

test('renders a validated passage, structure, attribution, language, and device theme', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await mockChapter(page);
  await page.goto('index.html?ref=John%203%3A16-17&translation=eng_kjv&theme=auto&verseNumbers=1');

  await expect(page.locator('#mannaverse')).toContainText('For God so loved the world.');
  await expect(page.locator('#mannaverse .section-heading')).toHaveText('The next section');
  await expect(page.locator('#mannaverse .verse-number').first()).toHaveAttribute('aria-label', 'Chapter 3, verse 16');
  await expect(page.locator('#mannaverse-reference')).toContainText('John 3:16-17');
  await expect(page.locator('#attribution .notice')).toHaveText('Copyright notice supplied by the fixture.');
  await expect(page.locator('#mannaverse')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('uses translation language and right-to-left direction from response metadata', async ({ page }) => {
  await mockChapter(page, chapterFixture({ id: 'rtl_test', language: 'ar', direction: 'rtl' }));
  await page.goto('index.html?ref=John%203%3A16&translation=rtl_test');
  await expect(page.locator('#mannaverse')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('#mannaverse')).toHaveAttribute('dir', 'rtl');
});

test('keeps HTML-looking passage text and attribution inert', async ({ page }) => {
  const htmlLookingText = '<img src=x onerror=alert(1)> <svg onload=alert(2)></svg>';
  await mockChapter(page, chapterFixture({
    content: [{ type: 'verse', number: 16, content: [htmlLookingText] }],
  }));
  await page.goto('index.html?ref=John%203%3A16&translation=eng_kjv');
  await expect(page.locator('#mannaverse')).toContainText(htmlLookingText);
  await expect(page.locator('#mannaverse img, #mannaverse svg')).toHaveCount(0);
});

test('falls back to the cached source verse after a daily translation failure', async ({ page }) => {
  let translationRequests = 0;
  await page.route('https://beta.ourmanna.com/api/v1/get?**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      verse: { details: { text: 'A source verse.', reference: 'John 3:16', version: 'NIV' } },
    }) });
  });
  await page.route('https://bible.helloao.org/api/**', async (route) => {
    translationRequests += 1;
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
  await page.goto('index.html?translation=unknown_translation');

  await expect(page.locator('#mannaverse')).toHaveText('A source verse.');
  await expect(page.locator('#status')).toContainText('Showing OurManna’s source text instead.');
  await expect(page.locator('#mannaverse-reference')).toContainText('NIV');
  expect(translationRequests).toBeGreaterThan(0);
});

test('retries the chosen translation with the same cached source verse', async ({ page }) => {
  let sourceRequests = 0;
  let translationRequests = 0;
  await page.route('https://beta.ourmanna.com/api/v1/get?**', async (route) => {
    sourceRequests += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      verse: { details: { text: 'Cached source.', reference: 'John 3:16', version: 'NIV' } },
    }) });
  });
  await page.route('https://bible.helloao.org/api/**', async (route) => {
    translationRequests += 1;
    if (translationRequests === 1) {
      await route.fulfill({ status: 503, body: '{}' });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(chapterFixture()) });
  });
  await page.goto('index.html?translation=eng_kjv');
  await expect(page.locator('#mannaverse')).toHaveText('Cached source.');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.locator('#mannaverse')).toContainText('For God so loved the world.');
  expect(sourceRequests).toBe(1);
  expect(translationRequests).toBe(2);
});

test('shows a clear fixed-reference error without showing partial content', async ({ page }) => {
  let requests = 0;
  await page.route('https://bible.helloao.org/api/**', async (route) => {
    requests += 1;
    await route.fulfill({ status: 404, body: '{}' });
  });
  await page.goto('index.html?ref=John%203%3A999&translation=eng_kjv');
  await expect(page.locator('#mannaverse')).toContainText('This complete passage or translation could not be found.');
  await expect(page.locator('#status')).toContainText('Check the full book name and verse range');
  expect(requests).toBe(1);
});
