import assert from 'node:assert/strict';
import { once } from 'node:events';
import { chromium } from '@playwright/test';
import { collectPassage, parseReference } from '../assets/core.js';
import { createStaticServer } from './serve.mjs';

const OURMANNA_URL = 'https://beta.ourmanna.com/api/v1/get?format=json&order=daily';
const API_ROOT = 'https://bible.helloao.org/api';

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  assert.equal(response.ok, true, `${url} returned HTTP ${response.status}`);
  return response.json();
}

async function main() {
  const catalogue = await fetchJson(`${API_ROOT}/available_translations.json`);
  assert(catalogue.translations.some((translation) => translation.id === 'eng_net'), 'The live catalogue no longer contains eng_net.');

  const source = await fetchJson(OURMANNA_URL);
  const sourceVerse = source?.verse?.details;
  assert.equal(typeof sourceVerse?.text, 'string', 'OurManna did not return verse text.');
  assert.equal(typeof sourceVerse?.reference, 'string', 'OurManna did not return a reference.');
  assert.equal(typeof sourceVerse?.version, 'string', 'OurManna did not return a version.');

  const reference = parseReference('John 3:16');
  assert.equal(reference.ok, true);
  const chapter = await fetchJson(`${API_ROOT}/eng_net/${reference.value.book}/${reference.value.startChapter}.json`);
  const passage = collectPassage(reference.value, [chapter], 'eng_net');
  assert.equal(passage.ok, true, `NET Bible returned invalid passage data: ${passage.code}`);
  assert(passage.verses.some((verse) => verse.number === 16 && verse.content.length > 0), 'NET Bible did not return John 3:16 content.');
  const liveNotice = chapter.translation?.licenseNotice || chapter.translation?.licenseNotes || '';

  const server = createStaticServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 375, height: 780 } });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    const base = `http://127.0.0.1:${server.address().port}`;

    await page.goto(`${base}/index.html?ref=John%203%3A16&translation=eng_net`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#mannaverse .verse-line')?.textContent?.trim(), null, { timeout: 25_000 });
    assert.match(await page.locator('#mannaverse').innerText(), /\S/);
    await page.locator('#attribution').getByRole('link', { name: 'Free Use Bible API' }).waitFor();
    if (liveNotice) {
      const normalizedNotice = liveNotice.replace(/\s+/g, ' ').trim();
      assert((await page.locator('#attribution').innerText()).includes(normalizedNotice), 'The widget did not show the live translation attribution notice verbatim.');
    }
    await page.goto(`${base}/index.html?translation=niv&order=random`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#mannaverse')?.textContent?.trim() && document.querySelector('#mannaverse-reference')?.textContent?.trim(), null, { timeout: 25_000 });
    assert.match(await page.locator('#attribution').innerText(), /OurManna\.com/);
    assert.deepEqual(pageErrors, []);
  } finally {
    await browser?.close();
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }

  process.stdout.write(`Live smoke passed: OurManna returned ${sourceVerse.version} for ${sourceVerse.reference}; Free Use Bible rendered eng_net John 3:16; the widget rendered both live paths${liveNotice ? ' and showed its live attribution notice' : ''} without page errors.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
