import assert from 'node:assert/strict';
import { test } from 'node:test';
import { requestJson } from '../assets/core.js';

test('returns parsed JSON from a successful provider response', async () => {
  const result = await requestJson('/fixture.json', {
    fetcher: async () => ({ ok: true, json: async () => ({ answer: 42 }) }),
  });
  assert.deepEqual(result, { answer: 42 });
});

test('classifies missing content and server failures', async () => {
  await assert.rejects(
    requestJson('/missing.json', { fetcher: async () => ({ ok: false, status: 404 }) }),
    (error) => error.code === 'unavailable',
  );
  await assert.rejects(
    requestJson('/server-error.json', { fetcher: async () => ({ ok: false, status: 503 }) }),
    (error) => error.code === 'provider-error',
  );
  await assert.rejects(
    requestJson('/malformed.json', { fetcher: async () => ({ ok: true, json: async () => { throw new SyntaxError('bad JSON'); } }) }),
    (error) => error.code === 'invalid-response',
  );
});

test('times out while waiting for either response headers or JSON body', async () => {
  const pending = new Promise(() => {});
  await assert.rejects(requestJson('/headers.json', { fetcher: () => pending, timeoutMs: 5 }), (error) => error.code === 'request-timeout');
  await assert.rejects(
    requestJson('/body.json', {
      fetcher: async () => ({ ok: true, json: () => pending }),
      timeoutMs: 5,
    }),
    (error) => error.code === 'request-timeout',
  );
});

test('cancels a request when its load attempt is superseded', async () => {
  const controller = new AbortController();
  const request = requestJson('/slow.json', {
    signal: controller.signal,
    fetcher: (_url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    }),
  });
  controller.abort('superseded');
  await assert.rejects(request, (error) => error.code === 'aborted');
});
