import { errorMessage, jsonResponse } from '../../../../backend/http.ts';
import { listDonationHistory } from '../../../../backend/services/donations.ts';

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    return jsonResponse({ donations: await listDonationHistory(query.get('email')) });
  } catch (error) {
    return jsonResponse({ error: errorMessage(error, 'Failed to fetch donor history') }, 500);
  }
}
