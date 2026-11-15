import {
  getCampaignBySlug,
  getCampaignStatsById,
  listBloodDonations,
  listCampaignsWithOrg,
  listDoctors,
  listDonationsForUser,
} from '../../db/repository.ts';
import { getDonorSupportType } from '../../utils/donationLogic.ts';
import { normalizeGovernmentIdentityLabel } from './normalization.ts';

export function normalizeCampaign(campaign: any) {
  const returnOption = campaign.returnOption || 'monthly';
  return {
    ...campaign,
    documentType: normalizeGovernmentIdentityLabel(campaign.documentType),
    returnOption,
    donorSupportType: getDonorSupportType(returnOption),
    applicantEmail: campaign.applicantEmail || 'applicant@sankalpsetu.org',
    verificationStatus: (campaign.verified ?? campaign.documentVerified ?? true)
      ? 'Verified'
      : 'Pending',
    beneficiaryLocation:
      campaign.beneficiaryLocation || campaign.location || 'Rural Gram Panchayat, India',
    location: campaign.location || campaign.beneficiaryLocation || 'Rural Gram Panchayat, India',
    imageTheme: campaign.imageTheme || campaign.themeKey || 'water',
    themeKey: campaign.themeKey || campaign.imageTheme || 'water',
    imageUrl: campaign.imageUrl,
    impactMetric: campaign.impactMetric || campaign.impactLine || 'Direct Village Relief & Verification',
    impactLine: campaign.impactLine || campaign.impactMetric || 'Direct Village Relief & Verification',
    updates: Array.isArray(campaign.updates) ? campaign.updates : [],
  };
}

export async function listCampaignsResponse(search?: string, category?: string, verifiedOnly = false) {
  const [campaigns, doctors, blood, donations] = await Promise.all([
    listCampaignsWithOrg({ search, category, verifiedOnly }),
    listDoctors(),
    listBloodDonations(),
    listDonationsForUser('all'),
  ]);
  const normalized = campaigns.map(normalizeCampaign);
  return {
    campaigns: normalized,
    stats: {
      totalRaised: normalized.reduce((sum, campaign) => sum + Number(campaign.raisedAmount || 0), 0),
      totalDonationsCount: donations.length,
      verifiedNgoCount: 4,
      activeCampaignCount: normalized.length,
      verifiedDoctorCount: doctors.length,
      bloodDonationsCount: blood.length,
    },
  };
}

export async function getCampaignResponse(slug: string) {
  const campaign = await getCampaignBySlug(slug);
  return campaign ? { campaign: normalizeCampaign(campaign) } : null;
}

export async function getCampaignStatsResponse(id: number) {
  return getCampaignStatsById(id);
}
