import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from './route.ts';

test('OAuth callback returns the expected postMessage contract and escapes script text', async () => {
  const state = Buffer.from(
    JSON.stringify({
      provider: 'google',
      role: 'donor',
      category: '</script><script>alert(1)</script>',
    })
  ).toString('base64url');
  const response = await GET(
    new Request(`https://app.example.test/auth/callback?code=oauth-code&state=${state}`)
  );
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /OAUTH_AUTH_SUCCESS/);
  assert.match(html, /oauth-code/);
  assert.doesNotMatch(html, /<\/script><script>alert\(1\)<\/script>/);
  assert.match(html, /window\.close\(\)/);
});
