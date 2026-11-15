import { errorMessage, jsonResponse } from '../../../backend/http.ts';
import { listDoctorsResponse } from '../../../backend/services/doctors.ts';
import { forwardToLegacy } from '../../../backend/legacyProxy.ts';

export async function GET(request: Request) {
  try {
    return jsonResponse({ doctors: await listDoctorsResponse() });
  } catch (error) {
    return jsonResponse({ error: errorMessage(error, 'Failed to load doctors') }, 500);
  }
}

export const POST = forwardToLegacy;
export const PUT = forwardToLegacy;
export const PATCH = forwardToLegacy;
export const DELETE = forwardToLegacy;
export const OPTIONS = forwardToLegacy;
