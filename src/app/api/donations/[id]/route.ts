import { errorMessage, jsonResponse } from '../../../../backend/http.ts';
import { deleteDonationRecord } from '../../../../backend/services/donations.ts';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const result = await deleteDonationRecord(id, request);
    return jsonResponse(result.response, result.status);
  } catch (error) {
    return jsonResponse({ error: errorMessage(error, 'Failed to delete donation record') }, 500);
  }
}
