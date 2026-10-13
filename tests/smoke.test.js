import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createStaticServer } from '../scripts/serve.mjs';
import { test } from 'node:test';

test('the static preview serves the existing widget and keeps private files private', async (context) => {
  const server = createStaticServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

  const base = `http://127.0.0.1:${server.address().port}`;
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Verse of the Day/);
  assert.equal((await fetch(`${base}/.git/config`)).status, 404);
  assert.equal((await fetch(`${base}/.env`)).status, 404);
  assert.equal((await fetch(`${base}/.github/workflows/ci.yml`)).status, 404);
  assert.equal((await fetch(`${base}/missing.html`)).status, 404);
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
});
