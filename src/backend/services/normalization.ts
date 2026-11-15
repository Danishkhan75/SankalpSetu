import { getDonorSupportType } from '../../utils/donationLogic.ts';

export function normalizeGovernmentIdentityLabel(value?: string | null): string | undefined {
  if (!value) return value || undefined;
  const raw = String(value).trim();
  const lower = raw.toLowerCase();
  if (lower.includes('aadhaar') || lower.includes('aadhar')) {
    return 'Aadhaar Card (Official Government Identity)';
  }
  if (lower.includes('pan')) return 'PAN Card (Income Tax Official Identity)';
  if (lower.includes('ration')) return 'Ration Card (State Official Identity)';
  if (lower.includes('driving') || lower.includes('licence') || lower.includes('license')) {
    return 'Driving Licence (RTO Official Identity)';
  }
  if (lower.includes('voter')) return 'Voter ID Card (Election Commission Official Identity)';
  if (lower.includes('passport')) return 'Indian Passport (Official Government Identity)';
  return raw;
}

export function normalizeDonation<T extends Record<string, unknown>>(donation: T) {
  const returnOption = donation.returnOption || 'monthly';
  const receiptNumber =
    donation.receiptNumber ||
    donation.receiptNo ||
    `80G-2026-${1050 + Number(donation.id || 1)}`;

  return {
    ...donation,
    receiptNumber,
    receiptNo: donation.receiptNo || receiptNumber,
    returnOption,
    donorType: getDonorSupportType(String(returnOption)),
  };
}
