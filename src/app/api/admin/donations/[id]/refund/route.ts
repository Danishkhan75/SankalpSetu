import { errorMessage, jsonResponse } from '../../../../../../backend/http.ts';
import { refundDonation } from '../../../../../../backend/services/donations.ts';

async function handleRefund(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const result = await refundDonation(Number(id), request);
    return jsonResponse(result.response, result.status);
  } catch (error) {
    return jsonResponse({ error: errorMessage(error, 'Failed to refund donation') }, 400);
  }
}

export const POST = handleRefund;
export const PATCH = handleRefund;
