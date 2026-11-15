export const MAX_JSON_BODY_BYTES = 15 * 1024 * 1024;

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super('Request body exceeds the 15 MB limit.');
    this.name = 'RequestBodyTooLargeError';
  }
}

export function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
  responseHeaders.set('X-Content-Type-Options', 'nosniff');
  responseHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

export async function readJsonBody(request: Request): Promise<Record<string, any>> {
  const bytes = await readLimitedBody(request);
  const parsed = JSON.parse(new TextDecoder().decode(bytes));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Request body must be a JSON object.');
  }
  return parsed;
}

export async function readLimitedBody(request: Request): Promise<Uint8Array> {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_JSON_BODY_BYTES) {
    throw new RequestBodyTooLargeError();
  }

  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_JSON_BODY_BYTES) {
      await reader.cancel();
      throw new RequestBodyTooLargeError();
    }
    chunks.push(value);
  }

  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
