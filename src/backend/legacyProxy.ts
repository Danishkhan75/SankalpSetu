import { errorMessage, jsonResponse, readLimitedBody } from './http.ts';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

function getLegacyApiUrl(requestUrl: URL): URL | null {
  const configured = process.env.LEGACY_API_URL;
  if (!configured) return null;

  const base = new URL(configured);
  if (base.protocol !== 'http:' && base.protocol !== 'https:') {
    throw new Error('LEGACY_API_URL must use HTTP or HTTPS.');
  }
  base.pathname = requestUrl.pathname;
  base.search = requestUrl.search;
  return base;
}

export function shouldForwardToLegacy(): boolean {
  return Boolean(process.env.LEGACY_API_URL);
}

export async function forwardToLegacy(request: Request): Promise<Response> {
  let target: URL | null;
  try {
    target = getLegacyApiUrl(new URL(request.url));
  } catch (error) {
    return jsonResponse({ error: errorMessage(error, 'Invalid legacy API configuration') }, 500);
  }
  if (!target) {
    return jsonResponse(
      {
        error: 'This endpoint has not yet been migrated and no legacy API is configured.',
        code: 'LEGACY_BACKEND_UNAVAILABLE',
      },
      501
    );
  }

  const headers = new Headers(request.headers);
  for (const header of HOP_BY_HOP_HEADERS) headers.delete(header);
  headers.delete('accept-encoding');
  let body: ArrayBuffer | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      const bytes = await readLimitedBody(request);
      body = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(body).set(bytes);
    } catch (error) {
      return jsonResponse({ error: errorMessage(error, 'Invalid request body') }, 413);
    }
  }

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
      cache: 'no-store',
    });
    const responseHeaders = new Headers(upstream.headers);
    for (const header of HOP_BY_HOP_HEADERS) responseHeaders.delete(header);
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    responseHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    const responseBody =
      request.method === 'HEAD' || upstream.status === 204 || upstream.status === 304
        ? null
        : await upstream.arrayBuffer();
    return new Response(responseBody, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return jsonResponse(
      {
        error: 'The legacy API is unavailable.',
        code: 'LEGACY_BACKEND_UNAVAILABLE',
      },
      502
    );
  }
}
