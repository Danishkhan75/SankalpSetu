import { errorMessage, jsonResponse } from '../../../../../backend/http.ts';
import { getCampaignStatsResponse } from '../../../../../backend/services/campaigns.ts';
import { forwardToLegacy } from '../../../../../backend/legacyProxy.ts';

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) return jsonResponse({ error: 'Invalid campaign ID' }, 400);

  try {
    const stats = await getCampaignStatsResponse(id);
    return stats
      ? jsonResponse({ stats })
      : jsonResponse({ error: 'Campaign not found' }, 404);
  } catch (error) {
    return jsonResponse({ error: errorMessage(error, 'Failed to fetch campaign stats') }, 500);
  }
}

export const POST = forwardToLegacy;
export const PUT = forwardToLegacy;
export const PATCH = forwardToLegacy;
export const DELETE = forwardToLegacy;
export const OPTIONS = forwardToLegacy;
