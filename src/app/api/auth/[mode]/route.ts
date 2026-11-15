import {
  errorMessage,
  jsonResponse,
  readJsonBody,
  RequestBodyTooLargeError,
} from '../../../../backend/http.ts';
import {
  authenticate,
  authenticateFirebase,
  authenticateSocial,
} from '../../../../backend/services/auth.ts';
import { forwardToLegacy } from '../../../../backend/legacyProxy.ts';

export async function POST(request: Request, context: { params: Promise<{ mode: string }> }) {
  const { mode: routeMode } = await context.params;
  if (
    routeMode !== 'login' &&
    routeMode !== 'signup' &&
    routeMode !== 'social' &&
    routeMode !== 'firebase'
  ) {
    return forwardToLegacy(request);
  }

  try {
    const body = await readJsonBody(request);
    const result =
      routeMode === 'login' || routeMode === 'signup'
        ? await authenticate(body, routeMode)
        : routeMode === 'social'
          ? await authenticateSocial(body)
          : await authenticateFirebase(body);
    if (result.status !== 200) return jsonResponse({ error: result.error }, result.status);
    const response = jsonResponse(result.response);
    response.headers.append(
      'Set-Cookie',
      `sankalpsetu_jwt=${encodeURIComponent(result.token)}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=604800`
    );
    return response;
  } catch (error) {
    const status =
      error instanceof RequestBodyTooLargeError ? 413 : error instanceof SyntaxError ? 400 : 500;
    return jsonResponse({ error: errorMessage(error, 'Authentication failed') }, status);
  }
}

export const GET = forwardToLegacy;
export const HEAD = forwardToLegacy;
export const PUT = forwardToLegacy;
export const PATCH = forwardToLegacy;
export const DELETE = forwardToLegacy;
export const OPTIONS = forwardToLegacy;

