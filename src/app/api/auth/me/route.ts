import { getRequestUser } from '../../../../backend/auth.ts';
import { errorMessage, jsonResponse } from '../../../../backend/http.ts';
import { forwardToLegacy } from '../../../../backend/legacyProxy.ts';

export async function GET(request: Request) {
  try {
    return jsonResponse({ user: await getRequestUser(request, 'required') });
  } catch (error) {
    return jsonResponse({ error: errorMessage(error, 'Failed to fetch current user') }, 500);
  }
}
