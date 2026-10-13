import { test as base, expect } from '@playwright/test';

function chapterFor(id, chapterNumber = 3) {
  return {
    translation: {
      id,
      name: 'Fixture Translation',
      shortName: 'Fixture',
      language: 'en',
      textDirection: 'ltr',
    },
    book: { id: 'JHN', commonName: 'John' },
    chapter: {
      number: chapterNumber,
      content: [
        { type: 'verse', number: 16, content: ['For God so loved the world.'] },
        { type: 'verse', number: 17, content: ['He sent his Son.'] },
      ],
    },
  };
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('https://beta.ourmanna.com/api/v1/get?**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        verse: { details: { text: 'The source verse.', reference: 'John 3:16', version: 'NIV' } },
      }) });
    });
    await page.route('https://bible.helloao.org/api/**', async (route) => {
      const url = new URL(route.request().url());
      const segments = url.pathname.split('/');
      const id = decodeURIComponent(segments[2] || 'eng_kjv');
      const chapter = Number((segments[4] || '3.json').replace('.json', '')) || 3;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(chapterFor(id, chapter)) });
    });
    await use(page);
  },
});

export { expect };
