import assert from 'node:assert/strict';
import test from 'node:test';
import { getRequiredServerEnv } from '../config/serverEnv.ts';
import { MAX_JSON_BODY_BYTES, readJsonBody } from './http.ts';

test('readJsonBody parses JSON objects', async () => {
  const request = new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'member@example.test' }),
  });
  assert.deepEqual(await readJsonBody(request), { email: 'member@example.test' });
});

test('readJsonBody rejects non-object and oversized bodies', async () => {
  const nonObject = new Request('http://localhost/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(['not', 'an object']),
  });
  await assert.rejects(readJsonBody(nonObject), /JSON object/);

  const oversized = new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-length': String(MAX_JSON_BODY_BYTES + 1) },
    body: '{}',
  });
  await assert.rejects(readJsonBody(oversized), /15 MB limit/);
});

test('required server settings reject absent values and placeholders', () => {
  const key = 'SANKALPSETU_TEST_REQUIRED_ENV';
  const previous = process.env[key];
  try {
    delete process.env[key];
    assert.throws(() => getRequiredServerEnv(key), new RegExp(key));
    process.env[key] = 'your-secret-here';
    assert.throws(() => getRequiredServerEnv(key), new RegExp(key));
    process.env[key] = 'configured-test-secret';
    assert.equal(getRequiredServerEnv(key), 'configured-test-secret');
  } finally {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
});
