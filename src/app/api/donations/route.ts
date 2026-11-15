import { errorMessage, jsonResponse, readJsonBody, RequestBodyTooLargeError } from '../../../backend/http.ts';
import { createDonationOrder, listDonationHistory } from '../../../backend/services/donations.ts';

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    return jsonResponse({ donations: await listDonationHistory(query.get('email')) });
  } catch (error) {
    return jsonResponse({ error: errorMessage(error, 'Failed to fetch donor history') }, 500);
  }
}

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
