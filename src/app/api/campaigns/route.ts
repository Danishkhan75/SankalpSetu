import { errorMessage, jsonResponse } from '../../../backend/http.ts';
import { listCampaignsResponse } from '../../../backend/services/campaigns.ts';
import { forwardToLegacy } from '../../../backend/legacyProxy.ts';

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    return jsonResponse(
      await listCampaignsResponse(
        query.get('search') || undefined,
        query.get('category') || undefined,
        query.get('verified') === 'true'
      )
    );
  } catch (error) {
    return jsonResponse({ error: errorMessage(error, 'Failed to load campaigns') }, 500);
  }
}

export const POST = forwardToLegacy;
export const PUT = forwardToLegacy;
export const PATCH = forwardToLegacy;
export const DELETE = forwardToLegacy;
export const OPTIONS = forwardToLegacy;
