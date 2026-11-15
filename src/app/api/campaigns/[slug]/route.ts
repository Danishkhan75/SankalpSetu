import { errorMessage, jsonResponse } from '../../../../backend/http.ts';
import { getCampaignResponse } from '../../../../backend/services/campaigns.ts';
import { forwardToLegacy } from '../../../../backend/legacyProxy.ts';

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const result = await getCampaignResponse(slug);
    return result
      ? jsonResponse(result)
      : jsonResponse({ error: 'Campaign not found' }, 404);
  } catch (error) {
    return jsonResponse({ error: errorMessage(error, 'Failed to load campaign details') }, 500);
  }
}

export const POST = forwardToLegacy;
export const PUT = forwardToLegacy;
export const PATCH = forwardToLegacy;
export const DELETE = forwardToLegacy;
export const OPTIONS = forwardToLegacy;
