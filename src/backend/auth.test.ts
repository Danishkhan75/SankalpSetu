import assert from 'node:assert/strict';
import test from 'node:test';
import { authenticateFirebase, authenticateSocial, getOAuthAuthorizationUrl } from './services/auth.ts';
import { forwardToLegacy, shouldForwardToLegacy } from './legacyProxy.ts';

async function withEnvironment<T>(
  key: string,
  value: string | undefined,
  run: () => T | Promise<T>
): Promise<T> {
  const previous = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
  try {
    return await run();
  } finally {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
}

test('social and Firebase sign-in keep admin account restrictions', async () => {
  const social = await authenticateSocial({
    email: 'not-admin@example.test',
    role: 'admin',
    firebaseUid: 'firebase-user',
  });
  const firebase = await authenticateFirebase({
    email: 'not-admin@example.test',
    role: 'admin',
  });

  assert.equal(social.status, 403);
  assert.equal(firebase.status, 403);
});

test('OAuth authorization URL preserves provider configuration and callback state', async () => {
  await withEnvironment('APP_URL', 'https://app.example.test/', () =>
    withEnvironment('FACEBOOK_CLIENT_ID', 'facebook-client', () => {
      const result = getOAuthAuthorizationUrl({
        provider: 'facebook',
        role: 'donor',
        category: 'Village & Rural',
      });
      const url = new URL(result.url);
      const state = JSON.parse(
        Buffer.from(url.searchParams.get('state') || '', 'base64url').toString('utf8')
      );

      assert.equal(result.configured, true);
      assert.equal(result.redirectUri, 'https://app.example.test/auth/callback');
      assert.equal(url.searchParams.get('client_id'), 'facebook-client');
      assert.deepEqual(state, {
        provider: 'facebook',
        role: 'donor',
        category: 'Village & Rural',
      });
    })
  );
});

test('legacy forwarding is explicit and unavailable routes fail with 501 without a target', async () => {
  await withEnvironment('LEGACY_API_URL', undefined, async () => {
    assert.equal(shouldForwardToLegacy(), false);
    const response = await forwardToLegacy(new Request('https://api.example.test/api/unknown'));
    assert.equal(response.status, 501);
    assert.equal((await response.json()).code, 'LEGACY_BACKEND_UNAVAILABLE');
  });
});
