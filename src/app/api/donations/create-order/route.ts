import { errorMessage, jsonResponse, readJsonBody, RequestBodyTooLargeError } from '../../../../backend/http.ts';
import { createDonationOrder } from '../../../../backend/services/donations.ts';

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    return jsonResponse(await createDonationOrder(body, request), 201);
  } catch (error) {
    const status =
      error instanceof RequestBodyTooLargeError ? 413 : error instanceof SyntaxError ? 400 : 500;
    return jsonResponse({ error: errorMessage(error, 'Failed to create donation order') }, status);
  }
}
