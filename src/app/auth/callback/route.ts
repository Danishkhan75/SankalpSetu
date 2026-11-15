function scriptValue(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const code = query.get('code') || '';
  let state = {
    provider: 'google',
    role: 'donor',
    category: 'Freelancer & Startup',
  };
  const encodedState = query.get('state');

  if (encodedState) {
    try {
      const parsed = JSON.parse(Buffer.from(encodedState, 'base64url').toString('utf8'));
      if (parsed && typeof parsed === 'object') {
        state = {
          provider: String(parsed.provider || state.provider),
          role: String(parsed.role || state.role),
          category: String(parsed.category || state.category),
        };
      }
    } catch (error) {
      console.warn('OAuth callback state could not be decoded; using defaults.', error);
    }
  }

  const html = `<!doctype html>
<html>
  <body style="font-family: sans-serif; padding: 24px; text-align: center;">
    <script>
      if (window.opener) {
        window.opener.postMessage({
          type: 'OAUTH_AUTH_SUCCESS',
          code: ${scriptValue(code)},
          provider: ${scriptValue(state.provider)},
          role: ${scriptValue(state.role)},
          category: ${scriptValue(state.category)}
        }, '*');
        window.close();
      } else {
        window.location.href = '/';
      }
    </script>
    <p>Authentication successful. This window will close automatically.</p>
  </body>
</html>`;
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  });
}
