import { errorMessage, jsonResponse } from '../../../backend/http.ts';
import { listBloodDonations } from '../../../db/repository.ts';
import { normalizeGovernmentIdentityLabel } from '../../../backend/services/normalization.ts';
import { forwardToLegacy } from '../../../backend/legacyProxy.ts';

export async function GET(request: Request) {
  try {
    const bloodDonations = (await listBloodDonations()).map((donation: any) => ({
      ...donation,
      documentType: normalizeGovernmentIdentityLabel(donation.documentType),
      doctorName: donation.doctorName || 'Verified Rural Medical Officer',
      customFeePaid: Number(donation.customFeePaid || 0),
    }));
    return jsonResponse({ bloodDonations });
  } catch (error) {
    return jsonResponse({ error: errorMessage(error, 'Failed to load blood donation records') }, 500);
  }
}

export const POST = forwardToLegacy;
export const PUT = forwardToLegacy;
export const PATCH = forwardToLegacy;
export const DELETE = forwardToLegacy;
export const OPTIONS = forwardToLegacy;
