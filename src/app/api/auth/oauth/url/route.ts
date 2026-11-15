import { errorMessage, jsonResponse } from '../../../../../backend/http.ts';
import { getOAuthAuthorizationUrl } from '../../../../../backend/services/auth.ts';

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    return jsonResponse(
      getOAuthAuthorizationUrl({
        provider: query.get('provider') || 'google',
        role: query.get('role') || 'donor',
        category: query.get('category') || 'Freelancer & Startup',
      })
    );
  } catch (error) {
    return jsonResponse({ error: errorMessage(error, 'Failed to create OAuth URL') }, 500);
  }
}
