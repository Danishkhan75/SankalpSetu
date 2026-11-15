import fs from 'fs';
import path from 'path';
import { desc, eq } from 'drizzle-orm';
import { db, postgresConfigured } from './index.ts';
import { getRequiredServerEnv } from '../config/serverEnv.ts';
import {
  auditLogs,
  bloodDonations,
  campaignUpdates,
  campaigns,
  doctors,
  donations,
  organizations,
  users,
} from './schema.ts';
import { fallbackUsersStore } from './users.ts';
import {
  computeWebhookSignature,
  verifyWebhookSignature,
  GOVERNMENT_VERIFIED_DOCTORS_DIRECTORY,
  validateNmcDoctorRegistration,
  NMC_IMR_OFFICIAL_PORTAL_URL,
  GOVERNMENT_VERIFIED_NGOS_DIRECTORY,
} from '../utils/donationLogic.ts';

const PERSISTENT_DB_PATH = path.resolve(process.cwd(), 'data', 'sankalpsetu-persistent-db.json');

let dbSocketOnline: boolean | null = postgresConfigured ? null : false;

/* ==========================================================================
   LIVE STATEFUL STORE (Active when Cloud SQL Unix socket is offline/switched)
   ========================================================================== */
const liveOrganizations: Array<any> = GOVERNMENT_VERIFIED_NGOS_DIRECTORY.map((ngo, idx) => ({
  ...ngo,
  panNumber: ngo.pan,
  createdAt: new Date(Date.now() - 86400000 * (60 - idx * 8)),
}));

let liveCampaigns = [
  {
    id: 1,
    organizationId: 2,
    title: 'Full-Stack SaaS & Portfolio Website Launch for Independent Developer',
    slug: 'fullstack-saas-portfolio-website-launch',
    category: 'Freelancer & Website',
    location: 'Bengaluru & Remote India',
    applicantName: 'Aarav Kulkarni',
    documentType: 'PAN Card (Income Tax Official Identity)',
    documentId: 'GOVT-ID-VERIFIED',
    documentVerified: true,
    returnOption: 'monthly',
    returnDurationMonths: 12,
    description:
      'Raising cloud hosting, domain, and UI infrastructure capital for an independent freelancer building an invoicing SaaS platform for Indian micro-businesses.',
    impactLine: '₹2,000 funds 1 month of production cloud servers & SSL infrastructure',
    unitCost: 2000,
    unitImpact: '1 month of production cloud server & domain hosting',
    goalAmount: 120000,
    raisedAmount: 84000,
    donorCount: 19,
    status: 'live',
    verified: true,
    deadline: '2026-12-20',
    themeKey: 'freelancer',
    createdAt: new Date(Date.now() - 86400000 * 14),
  },
  {
    id: 2,
    organizationId: 3,
    title: 'Emergency Pediatric Cardiac Surgery & ICU Care Support',
    slug: 'emergency-pediatric-cardiac-surgery-icu',
    category: 'Medical & Healthcare',
    location: 'New Delhi & AIIMS Trauma Wing',
    applicantName: 'Sunita Verma',
    documentType: 'Aadhaar Card (Official Government Identity)',
    documentId: 'GOVT-ID-VERIFIED',
    documentVerified: true,
    returnOption: 'no_return',
    returnDurationMonths: 12,
    description:
      'Pure charitable grant (No Return Required) for a 7-year-old child requiring urgent congenital heart valve repair and post-operative ICU care.',
    impactLine: '₹1,500 covers 1 day of pediatric ICU medication & oxygen support',
    unitCost: 1500,
    unitImpact: '1 day of pediatric ICU medication & monitoring',
    goalAmount: 350000,
    raisedAmount: 265000,
    donorCount: 64,
    status: 'live',
    verified: true,
    deadline: '2026-11-30',
    themeKey: 'medical',
    createdAt: new Date(Date.now() - 86400000 * 11),
  },
  {
    id: 3,
    organizationId: 1,
    title: 'Solar-Powered Borewell & Clean Water Grid for 14 Marathwada Villages',
    slug: 'solar-borewell-clean-water-marathwada',
    category: 'Village & Rural',
    location: 'Latur & Beed, Maharashtra',
    applicantName: 'Rameshwar Patil',
    documentType: 'Ration Card (State Official Identity)',
    documentId: 'GOVT-ID-VERIFIED',
    documentVerified: true,
    returnOption: 'no_return',
    returnDurationMonths: 12,
    description:
      'Installing community-managed solar water purification and borewell pumping stations delivering 15,000 litres of safe drinking water daily.',
    impactLine: '₹500 provides clean drinking water to 1 rural household',
    unitCost: 500,
    unitImpact: '1 rural household with safe drinking water',
    goalAmount: 450000,
    raisedAmount: 342000,
    donorCount: 82,
    status: 'live',
    verified: true,
    deadline: '2026-12-31',
    themeKey: 'water',
    createdAt: new Date(Date.now() - 86400000 * 9),
  },
  {
    id: 4,
    organizationId: 2,
    title: 'Urban Tailoring & Electric Delivery Vehicle Livelihood Recovery',
    slug: 'urban-tailoring-electric-delivery-livelihood',
    category: 'City & Urban',
    location: 'Mumbai & Thane, Maharashtra',
    applicantName: 'Imran Shaikh',
    documentType: 'Driving Licence (RTO Official Identity)',
    documentId: 'GOVT-ID-VERIFIED',
    documentVerified: true,
    returnOption: 'yearly',
    returnDurationMonths: 24,
    description:
      'Zero-interest livelihood support for an urban delivery partner and family tailoring unit to purchase an electric 2-wheeler and commercial sewing machine.',
    impactLine: '₹1,000 supports livelihood equipment & EV battery lease',
    unitCost: 1000,
    unitImpact: '1 week of urban family livelihood equipment',
    goalAmount: 90000,
    raisedAmount: 63000,
    donorCount: 21,
    status: 'live',
    verified: true,
    deadline: '2026-12-15',
    themeKey: 'personal',
    createdAt: new Date(Date.now() - 86400000 * 7),
  },
  {
    id: 5,
    organizationId: 2,
    title: 'B.Tech Computer Science Tuition & Laptop Grant for First-Gen Students',
    slug: 'btech-computer-science-laptop-grant',
    category: 'Education & Youth',
    location: 'Lucknow & Prayagraj, Uttar Pradesh',
    applicantName: 'Priya Sharma',
    documentType: 'Aadhaar Card (Official Government Identity)',
    documentId: 'GOVT-ID-VERIFIED',
    documentVerified: true,
    returnOption: 'directly',
    returnDurationMonths: 12,
    description:
      'Supporting meritorious first-generation engineering students with semester tuition fees and coding laptops.',
    impactLine: '₹2,500 funds 1 student coding kit & semester textbook set',
    unitCost: 2500,
    unitImpact: '1 student coding kit & semester textbooks',
    goalAmount: 180000,
    raisedAmount: 135000,
    donorCount: 38,
    status: 'live',
    verified: true,
    deadline: '2026-12-25',
    themeKey: 'education',
    createdAt: new Date(Date.now() - 86400000 * 5),
  },
  {
    id: 6,
    organizationId: 3,
    title: 'Personal Family Flood Reconstruction & Emergency Ration Support',
    slug: 'personal-family-flood-reconstruction',
    category: 'Personal & Family',
    location: 'Wayanad & Kozhikode, Kerala',
    applicantName: 'krishnan Nair',
    documentType: 'Voter ID Card (Election Commission Official Identity)',
    documentId: 'GOVT-ID-VERIFIED',
    documentVerified: true,
    returnOption: 'no_return',
    returnDurationMonths: 12,
    description:
      'Direct family home roof reconstruction and emergency ration kit support for households affected by monsoon landslides.',
    impactLine: '₹1,200 provides 1 family emergency shelter & ration kit',
    unitCost: 1200,
    unitImpact: '1 family emergency shelter & ration kit',
    goalAmount: 240000,
    raisedAmount: 168000,
    donorCount: 44,
    status: 'live',
    verified: true,
    deadline: '2026-12-18',
    themeKey: 'disaster',
    createdAt: new Date(Date.now() - 86400000 * 3),
  },
];

const liveCampaignUpdates = [
  {
    id: 1,
    campaignId: 1,
    title: 'Production Cloud Cluster & Domain Configured',
    body: 'Deployed initial SaaS multi-tenant architecture and SSL certificates. Verified by Admin Danish Khan.',
    createdAt: new Date(Date.now() - 86400000 * 4),
  },
  {
    id: 2,
    campaignId: 2,
    title: 'Pre-Operative Cardiology Clearance Completed at AIIMS',
    body: 'Pediatric cardiac surgical team scheduled valve repair procedure after verifying Aadhaar Card identity.',
    createdAt: new Date(Date.now() - 86400000 * 2),
  },
];

let liveDonations = [
  {
    id: 1,
    campaignId: 2,
    donorId: 1,
    donorName: 'Danish Khan',
    donorEmail: 'khandanish0503@gmail.com',
    donorPhone: '+91 9820144120',
    panNumber: 'ABCDE1234F',
    amount: 25000,
    returnOption: 'no_return',
    status: 'paid',
    paymentMethod: 'upi',
    gatewayMode: 'razorpay_test',
    gatewayOrderId: 'order_Rzp981209A',
    gatewayPaymentId: 'pay_Rzp981209A',
    idempotencyKey: 'seed-idem-1001',
    receiptNo: '80G-2026-1051',
    createdAt: new Date(Date.now() - 86400000 * 6),
  },
  {
    id: 2,
    campaignId: 1,
    donorId: 2,
    donorName: 'Rehan Siddiqui',
    donorEmail: 'rehan.donator@graminseva.in',
    donorPhone: '+91 9811223344',
    panNumber: 'BNZPS4412K',
    amount: 15000,
    returnOption: 'monthly',
    status: 'paid',
    paymentMethod: 'card',
    gatewayMode: 'stripe_test',
    gatewayOrderId: 'order_Str773190B',
    gatewayPaymentId: 'pay_Str773190B',
    idempotencyKey: 'seed-idem-1002',
    receiptNo: '80G-2026-1052',
    createdAt: new Date(Date.now() - 86400000 * 4),
  },
  {
    id: 3,
    campaignId: 3,
    donorId: 2,
    donorName: 'Suhani Deshmukh',
    donorEmail: 'suhani.d@gmail.com',
    donorPhone: '+91 9765432109',
    panNumber: 'AHSPD9910L',
    amount: 10000,
    returnOption: 'no_return',
    status: 'paid',
    paymentMethod: 'upi',
    gatewayMode: 'razorpay_test',
    gatewayOrderId: 'order_Rzp981209C',
    gatewayPaymentId: 'pay_Rzp981209C',
    idempotencyKey: 'seed-idem-1003',
    receiptNo: '80G-2026-1053',
    createdAt: new Date(Date.now() - 86400000 * 2),
  },
];

let liveDoctors: Array<any> = GOVERNMENT_VERIFIED_DOCTORS_DIRECTORY.map((doc, idx) => ({
  ...doc,
  createdAt: new Date(Date.now() - 86400000 * (45 - idx * 5)),
}));

let liveBloodDonations = [
  {
    id: 1,
    donorName: 'Salman Mansoori',
    bloodGroup: 'O+',
    requestType: 'donate_blood',
    villageName: 'Lucknow KGMU Government Blood Camp',
    phone: '+91 9792144012',
    age: 27,
    doctorId: 1,
    doctorName: 'Dr. Randeep Guleria',
    appointmentDate: '2026-11-05',
    customFeePaid: 0,
    documentId: 'Aadhaar Card (Official Government Identity)',
    status: 'verified',
    notes: 'Voluntary 350ml whole blood donation completed with printable receipt.',
    createdAt: new Date(Date.now() - 86400000 * 3),
  },
  {
    id: 2,
    donorName: 'Kavita Deshmukh',
    bloodGroup: 'B+',
    requestType: 'hire_doctor',
    villageName: 'Beed Gram Panchayat Health Camp',
    phone: '+91 9823110944',
    age: 34,
    doctorId: 2,
    doctorName: 'Dr. Farhan Qureshi',
    appointmentDate: '2026-11-08',
    customFeePaid: 200,
    documentId: 'Ration Card (State Official Identity)',
    status: 'verified',
    notes: 'Hired Dr. Farhan Qureshi for village anemia and blood group screening camp.',
    createdAt: new Date(Date.now() - 86400000 * 1),
  },
];

const liveAuditLogs = [
  {
    id: 1,
    actorName: 'Danish Khan',
    actorRole: 'admin',
    action: 'NGO_VERIFIED',
    targetType: 'organization',
    targetId: 1,
    details:
      'Verified 80G & 12A certificates for Gramin Seva & Jal Shakti Foundation (Owner: Danish Khan <khandanish0503@gmail.com>)',
    createdAt: new Date(Date.now() - 3600000 * 36),
  },
  {
    id: 2,
    actorName: 'Danish Khan',
    actorRole: 'admin',
    action: 'CAMPAIGN_APPROVED',
    targetType: 'campaign',
    targetId: 1,
    details:
      'Approved Freelancer & Website campaign "Full-Stack SaaS & Portfolio Website Launch" with Official Government Identity: PAN Card',
    createdAt: new Date(Date.now() - 3600000 * 24),
  },
  {
    id: 3,
    actorName: 'Danish Khan',
    actorRole: 'admin',
    action: 'VERIFICATION_DOC_UPLOADED_VERIFIED',
    targetType: 'organization',
    targetId: 2,
    details:
      'Uploaded & verified official Aadhaar Card / 80G registration document for All-India Freelancer, Urban & Medical Welfare Trust [Status: Verified]',
    createdAt: new Date(Date.now() - 3600000 * 12),
  },
  {
    id: 4,
    actorName: 'Payment Gateway Webhook',
    actorRole: 'system',
    action: 'WEBHOOK_PAYMENT_CONFIRMED',
    targetType: 'donation',
    targetId: 1,
    details:
      'Verified order_Rzp981209A (₹25,000, Return: no_return) by Danish Khan → Receipt 80G-2026-1051',
    createdAt: new Date(Date.now() - 3600000 * 6),
  },
];

const deletedCampaignIds = new Set<number>();
const deletedDoctorIds = new Set<number>();
const deletedBloodIds = new Set<number>();
const deletedOrgIds = new Set<number>();

export function savePersistentDiskStore(): void {
  try {
    const dir = path.dirname(PERSISTENT_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const snapshot = {
      updatedAt: new Date().toISOString(),
      organizations: liveOrganizations,
      campaigns: liveCampaigns,
      campaignUpdates: liveCampaignUpdates,
      donations: liveDonations,
      doctors: liveDoctors,
      bloodDonations: liveBloodDonations,
      auditLogs: liveAuditLogs.slice(0, 250),
      users: fallbackUsersStore,
      deletedCampaignIds: Array.from(deletedCampaignIds),
      deletedDoctorIds: Array.from(deletedDoctorIds),
      deletedBloodIds: Array.from(deletedBloodIds),
      deletedOrgIds: Array.from(deletedOrgIds),
    };
    fs.writeFileSync(PERSISTENT_DB_PATH, JSON.stringify(snapshot, null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not write persistent disk snapshot:', err);
  }
}

function loadPersistentDiskStore(): void {
  try {
    if (!fs.existsSync(PERSISTENT_DB_PATH)) {
      savePersistentDiskStore();
      return;
    }
    const raw = fs.readFileSync(PERSISTENT_DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.organizations) && parsed.organizations.length) {
      liveOrganizations.splice(0, liveOrganizations.length, ...parsed.organizations);
    }
    if (Array.isArray(parsed.campaigns) && parsed.campaigns.length) {
      liveCampaigns = parsed.campaigns;
    }
    if (Array.isArray(parsed.campaignUpdates) && parsed.campaignUpdates.length) {
      liveCampaignUpdates.splice(0, liveCampaignUpdates.length, ...parsed.campaignUpdates);
    }
    if (Array.isArray(parsed.donations) && parsed.donations.length) {
      liveDonations = parsed.donations;
    }
    if (Array.isArray(parsed.bloodDonations) && parsed.bloodDonations.length) {
      liveBloodDonations = parsed.bloodDonations;
    }
    if (Array.isArray(parsed.auditLogs) && parsed.auditLogs.length) {
      liveAuditLogs.splice(0, liveAuditLogs.length, ...parsed.auditLogs);
    }
    if (Array.isArray(parsed.users) && parsed.users.length) {
      fallbackUsersStore.splice(0, fallbackUsersStore.length, ...parsed.users);
    }
    if (Array.isArray(parsed.deletedCampaignIds)) {
      parsed.deletedCampaignIds.forEach((id: number) => deletedCampaignIds.add(Number(id)));
    }
    if (Array.isArray(parsed.deletedDoctorIds)) {
      parsed.deletedDoctorIds.forEach((id: number) => deletedDoctorIds.add(Number(id)));
    }
    if (Array.isArray(parsed.deletedBloodIds)) {
      parsed.deletedBloodIds.forEach((id: number) => deletedBloodIds.add(Number(id)));
    }
    if (Array.isArray(parsed.deletedOrgIds)) {
      parsed.deletedOrgIds.forEach((id: number) => deletedOrgIds.add(Number(id)));
    }
    if (Array.isArray(parsed.doctors) && parsed.doctors.length) {
      const existingRegs = new Set(
        parsed.doctors.map((d: any) => String(d.licenseNumber || d.regNumber || '').toUpperCase())
      );
      const missingSeedDocs = GOVERNMENT_VERIFIED_DOCTORS_DIRECTORY.filter(
        (d) =>
          !existingRegs.has(d.regNumber.toUpperCase()) && !deletedDoctorIds.has(Number(d.id))
      ).map((d) => ({
        id: d.id,
        name: d.name,
        specialty: d.specialization,
        qualification: d.qualification,
        licenseNumber: d.regNumber,
        regNumber: d.regNumber,
        stateMedicalCouncil: d.stateMedicalCouncil,
        registrationYear: d.registrationYear,
        hprId: d.hprId,
        hospitalVillage: `${d.governmentHospital}, ${d.city}`,
        governmentHospital: d.governmentHospital,
        city: d.city,
        consultationFee: d.consultationFee,
        availableDays: d.availableDays,
        phone: d.phone,
        verified: d.verified,
        nmcPortalUrl: d.nmcPortalUrl,
      }));
      liveDoctors = [...parsed.doctors, ...missingSeedDocs];
    }
  } catch (err) {
    console.warn('Could not load persistent disk snapshot:', err);
  }
}

loadPersistentDiskStore();

export async function listCampaignsWithOrg(filters?: {
  search?: string;
  category?: string;
  verifiedOnly?: boolean;
}) {
  if (dbSocketOnline !== false) {
    try {
      const rows = await db
        .select({
          campaign: campaigns,
          organization: organizations,
        })
        .from(campaigns)
        .innerJoin(organizations, eq(campaigns.organizationId, organizations.id))
        .orderBy(desc(campaigns.createdAt));

      dbSocketOnline = true;
      const dbItems = rows
        .filter((r) => !deletedCampaignIds.has(Number(r.campaign.id)))
        .map((r) => {
          const matchedGovtOrg =
            GOVERNMENT_VERIFIED_NGOS_DIRECTORY.find((g) => g.id === Number(r.organization.id)) ||
            GOVERNMENT_VERIFIED_NGOS_DIRECTORY[0];
          const memUpdates = liveCampaignUpdates.filter(
            (u) => Number(u.campaignId) === Number(r.campaign.id)
          );
          return {
            ...r.campaign,
            organizationName: matchedGovtOrg?.name || r.organization.name,
            organizationRegNo: matchedGovtOrg?.darpanId || r.organization.registrationNo,
            organization80G: matchedGovtOrg?.reg80g || r.organization.taxExemption80G,
            organizationVerified: r.organization.verified,
            updates: memUpdates,
          };
        });
      const dbIds = new Set(dbItems.map((i) => Number(i.id)));
      const extraLive = liveCampaigns
        .filter((c) => !deletedCampaignIds.has(Number(c.id)) && !dbIds.has(Number(c.id)))
        .map((c) => {
          const org =
            liveOrganizations.find((o) => o.id === c.organizationId) || liveOrganizations[0];
          const memUpdates = liveCampaignUpdates.filter(
            (u) => Number(u.campaignId) === Number(c.id)
          );
          return {
            ...c,
            organizationName: org?.name || 'Goonj (NITI Aayog DARPAN & 80G Verified)',
            organizationRegNo: org?.darpanId || org?.registrationNo || 'DL/2009/0001524',
            organization80G: org?.reg80g || org?.taxExemption80G || 'AAATG4519HE20214',
            organizationVerified: org?.verified ?? true,
            updates: memUpdates,
          };
        });
      return [...extraLive, ...dbItems].filter((item) => applyCampaignFilters(item, filters));
    } catch {
      dbSocketOnline = false;
    }
  }

  return liveCampaigns
    .filter((c) => !deletedCampaignIds.has(Number(c.id)))
    .map((c) => {
      const org =
        liveOrganizations.find((o) => o.id === c.organizationId) || liveOrganizations[0];
      const memUpdates = liveCampaignUpdates.filter(
        (u) => Number(u.campaignId) === Number(c.id)
      );
      return {
        ...c,
        organizationName: org?.name || 'Goonj (NITI Aayog DARPAN & 80G Verified)',
        organizationRegNo: org?.darpanId || org?.registrationNo || 'DL/2009/0001524',
        organization80G: org?.reg80g || org?.taxExemption80G || 'AAATG4519HE20214',
        organizationVerified: org?.verified ?? true,
        updates: memUpdates,
      };
    })
    .filter((item) => applyCampaignFilters(item, filters));
}

export async function listGovernmentVerifiedOrganizations() {
  return liveOrganizations.filter((o) => !deletedOrgIds.has(Number(o.id)));
}

function applyCampaignFilters(
  item: any,
  filters?: { search?: string; category?: string; verifiedOnly?: boolean }
) {
  if (filters?.category && filters.category !== 'All' && item.category !== filters.category) {
    return false;
  }
  if (filters?.verifiedOnly && (!item.verified || !item.documentVerified)) {
    return false;
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    const matchTitle = item.title.toLowerCase().includes(q);
    const matchLocation = item.location.toLowerCase().includes(q);
    const matchApplicant = item.applicantName.toLowerCase().includes(q);
    const matchDoc = (item.documentType || '').toLowerCase().includes(q);
    if (!matchTitle && !matchLocation && !matchApplicant && !matchDoc) {
      return false;
    }
  }
  return true;
}

export async function getCampaignBySlug(slug: string) {
  if (dbSocketOnline !== false) {
    try {
      const rows = await db
        .select({
          campaign: campaigns,
          organization: organizations,
        })
        .from(campaigns)
        .innerJoin(organizations, eq(campaigns.organizationId, organizations.id))
        .where(eq(campaigns.slug, slug));

      dbSocketOnline = true;
      if (!rows.length) return null;

      const { campaign, organization } = rows[0];
      const updates = await db
        .select()
        .from(campaignUpdates)
        .where(eq(campaignUpdates.campaignId, campaign.id))
        .orderBy(desc(campaignUpdates.createdAt));

      const recentDonations = await db
        .select()
        .from(donations)
        .where(eq(donations.campaignId, campaign.id))
        .orderBy(desc(donations.createdAt));

      const paidDonations = recentDonations.filter((d) => d.status === 'paid').slice(0, 10);

      return {
        ...campaign,
        organizationName: organization.name,
        organizationRegNo: organization.registrationNo,
        organization80G: organization.taxExemption80G,
        organizationVerified: organization.verified,
        updates,
        recentDonations: paidDonations,
      };
    } catch {
      dbSocketOnline = false;
    }
  }

  const campaign = liveCampaigns.find((c) => c.slug === slug);
  if (!campaign) return null;
  const organization =
    liveOrganizations.find((o) => o.id === campaign.organizationId) || liveOrganizations[0];
  const updates = liveCampaignUpdates.filter((u) => u.campaignId === campaign.id);
  const recentDonations = liveDonations
    .filter((d) => d.campaignId === campaign.id && d.status === 'paid')
    .slice(0, 10);

  return {
    ...campaign,
    organizationName: organization.name,
    organizationRegNo: organization.registrationNo,
    organization80G: organization.taxExemption80G,
    organizationVerified: organization.verified,
    updates,
    recentDonations,
  };
}

export async function getCampaignStatsById(campaignId: number) {
  if (dbSocketOnline !== false) {
    try {
      const rows = await db.select().from(campaigns).where(eq(campaigns.id, campaignId));
      dbSocketOnline = true;
      if (!rows.length) return null;
      const camp = rows[0];
      const allDonations = await db
        .select()
        .from(donations)
        .where(eq(donations.campaignId, campaignId));

      const paidDonations = allDonations.filter((d) => d.status === 'paid');
      const computedTotal = paidDonations.reduce((acc, d) => acc + d.amount, 0);

      return {
        campaignId: camp.id,
        goalAmount: camp.goalAmount,
        raisedAmount: Math.max(camp.raisedAmount, computedTotal),
        donorCount: Math.max(camp.donorCount, paidDonations.length),
        recentPaidCount: paidDonations.length,
      };
    } catch {
      dbSocketOnline = false;
    }
  }

  const camp = liveCampaigns.find((c) => c.id === campaignId);
  if (!camp) return null;
  const paidDonations = liveDonations.filter(
    (d) => d.campaignId === campaignId && d.status === 'paid'
  );
  const computedTotal = paidDonations.reduce((acc, d) => acc + d.amount, 0);
  return {
    campaignId: camp.id,
    goalAmount: camp.goalAmount,
    raisedAmount: Math.max(camp.raisedAmount, computedTotal),
    donorCount: Math.max(camp.donorCount, paidDonations.length),
    recentPaidCount: paidDonations.length,
  };
}

export async function createPendingDonationOrder(input: {
  campaignId: number;
  donorId: number | null;
  donorName: string;
  donorEmail: string;
  donorPhone: string;
  panNumber?: string;
  amount: number;
  returnOption: string;
  paymentMethod: string;
  gatewayMode: string;
  idempotencyKey: string;
}) {
  const prefix =
    input.gatewayMode === 'razorpay_test'
      ? 'order_Rzp'
      : input.gatewayMode === 'stripe_test'
        ? 'order_Str'
        : 'order_Mck';
  const randomSuffix = `${Date.now().toString(36).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;
  const gatewayOrderId = `${prefix}_${randomSuffix}`;
  const testPaymentId = `pay_${randomSuffix}`;
  const expectedSignature = computeWebhookSignature(
    gatewayOrderId,
    testPaymentId,
    getRequiredServerEnv('PAYMENT_WEBHOOK_SECRET')
  );

  if (dbSocketOnline !== false) {
    try {
      const existing = await db
        .select()
        .from(donations)
        .where(eq(donations.idempotencyKey, input.idempotencyKey));

      dbSocketOnline = true;
      if (existing.length > 0) {
        const order = existing[0];
        const existingPayId = `pay_${order.gatewayOrderId.replace(/^order_/, '')}`;
        const sig = computeWebhookSignature(
          order.gatewayOrderId,
          existingPayId,
          getRequiredServerEnv('PAYMENT_WEBHOOK_SECRET')
        );
        return {
          donation: order,
          webhookPayload: {
            orderId: order.gatewayOrderId,
            paymentId: existingPayId,
            signature: sig,
          },
          deduplicated: true,
        };
      }

      const inserted = await db
        .insert(donations)
        .values({
          campaignId: input.campaignId,
          donorId: input.donorId,
          donorName: input.donorName,
          donorEmail: input.donorEmail,
          donorPhone: input.donorPhone,
          panNumber: input.panNumber || null,
          amount: input.amount,
          returnOption: input.returnOption || 'directly',
          status: 'pending',
          paymentMethod: input.paymentMethod,
          gatewayMode: input.gatewayMode,
          gatewayOrderId,
          idempotencyKey: input.idempotencyKey,
        })
        .returning();

      return {
        donation: inserted[0],
        webhookPayload: {
          orderId: gatewayOrderId,
          paymentId: testPaymentId,
          signature: expectedSignature,
        },
        deduplicated: false,
      };
    } catch {
      dbSocketOnline = false;
    }
  }

  const existingOrder = liveDonations.find((d) => d.idempotencyKey === input.idempotencyKey);
  if (existingOrder) {
    const existingPayId = `pay_${existingOrder.gatewayOrderId.replace(/^order_/, '')}`;
    const sig = computeWebhookSignature(
      existingOrder.gatewayOrderId,
      existingPayId,
      getRequiredServerEnv('PAYMENT_WEBHOOK_SECRET')
    );
    return {
      donation: existingOrder,
      webhookPayload: {
        orderId: existingOrder.gatewayOrderId,
        paymentId: existingPayId,
        signature: sig,
      },
      deduplicated: true,
    };
  }

  const newDonation = {
    id: liveDonations.length + 1,
    campaignId: input.campaignId,
    donorId: input.donorId || 2,
    donorName: input.donorName,
    donorEmail: input.donorEmail,
    donorPhone: input.donorPhone,
    panNumber: input.panNumber || 'ABCDE1234F',
    amount: input.amount,
    returnOption: input.returnOption || 'no_return',
    status: 'pending',
    paymentMethod: input.paymentMethod,
    gatewayMode: input.gatewayMode,
    gatewayOrderId,
    gatewayPaymentId: '',
    idempotencyKey: input.idempotencyKey,
    receiptNo: `80G-2026-${1050 + liveDonations.length + 1}`,
    createdAt: new Date(),
  };
  liveDonations.unshift(newDonation);
  savePersistentDiskStore();

  return {
    donation: newDonation,
    webhookPayload: {
      orderId: gatewayOrderId,
      paymentId: testPaymentId,
      signature: expectedSignature,
    },
    deduplicated: false,
  };
}

export async function confirmDonationWebhook(payload: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const isValid = verifyWebhookSignature(
    payload.orderId,
    payload.paymentId,
    payload.signature,
    getRequiredServerEnv('PAYMENT_WEBHOOK_SECRET')
  );

  if (!isValid) {
    throw new Error('Invalid HMAC webhook signature');
  }

  if (dbSocketOnline !== false) {
    try {
      return await db.transaction(async (tx) => {
        const existingRows = await tx
          .select()
          .from(donations)
          .where(eq(donations.gatewayOrderId, payload.orderId));

        if (!existingRows.length) {
          throw new Error('Payment order not found');
        }

        const donation = existingRows[0];
        if (donation.status === 'paid') {
          const campRows = await tx
            .select()
            .from(campaigns)
            .where(eq(campaigns.id, donation.campaignId));
          return {
            donation,
            campaign: campRows[0],
            alreadyProcessed: true,
          };
        }

        const receiptNo = `80G-2026-${1050 + donation.id}`;
        const updatedDonationRows = await tx
          .update(donations)
          .set({
            status: 'paid',
            gatewayPaymentId: payload.paymentId,
            receiptNo,
          })
          .where(eq(donations.id, donation.id))
          .returning();

        const campRows = await tx
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, donation.campaignId));

        const camp = campRows[0];
        const updatedCampRows = await tx
          .update(campaigns)
          .set({
            raisedAmount: camp.raisedAmount + donation.amount,
            donorCount: camp.donorCount + 1,
          })
          .where(eq(campaigns.id, camp.id))
          .returning();

        await tx.insert(auditLogs).values({
          actorName: 'Payment Gateway Webhook',
          actorRole: 'system',
          action: 'WEBHOOK_PAYMENT_CONFIRMED',
          targetType: 'donation',
          targetId: donation.id,
          details: `Verified ${payload.orderId} (₹${donation.amount}, Return: ${donation.returnOption}) → Receipt ${receiptNo}`,
        });

        return {
          donation: updatedDonationRows[0],
          campaign: updatedCampRows[0],
          alreadyProcessed: false,
        };
      });
    } catch (err: any) {
      if (err?.message === 'Invalid HMAC webhook signature' || err?.message === 'Payment order not found') {
        throw err;
      }
      dbSocketOnline = false;
    }
  }

  const donation = liveDonations.find((d) => d.gatewayOrderId === payload.orderId);
  if (!donation) {
    throw new Error('Payment order not found');
  }
  const camp = liveCampaigns.find((c) => c.id === donation.campaignId) || liveCampaigns[0];
  if (donation.status === 'paid') {
    return { donation, campaign: camp, alreadyProcessed: true };
  }

  const receiptNo = `80G-2026-${1050 + donation.id}`;
  donation.status = 'paid';
  donation.gatewayPaymentId = payload.paymentId;
  donation.receiptNo = receiptNo;

  camp.raisedAmount += donation.amount;
  camp.donorCount += 1;

  liveAuditLogs.unshift({
    id: liveAuditLogs.length + 1,
    actorName: 'Payment Gateway Webhook',
    actorRole: 'system',
    action: 'WEBHOOK_PAYMENT_CONFIRMED',
    targetType: 'donation',
    targetId: donation.id,
    details: `Verified ${payload.orderId} (₹${donation.amount}, Return: ${donation.returnOption}) → Receipt ${receiptNo}`,
    createdAt: new Date(),
  });
  savePersistentDiskStore();

  return {
    donation,
    campaign: camp,
    alreadyProcessed: false,
  };
}

export async function listDonationsForUser(userEmail?: string) {
  if (dbSocketOnline !== false) {
    try {
      const allRows = await db
        .select({
          donation: donations,
          campaign: campaigns,
          organization: organizations,
        })
        .from(donations)
        .innerJoin(campaigns, eq(donations.campaignId, campaigns.id))
        .innerJoin(organizations, eq(campaigns.organizationId, organizations.id))
        .orderBy(desc(donations.createdAt));

      dbSocketOnline = true;
      return allRows
        .filter((r) => {
          if (!userEmail || userEmail === 'all') return true;
          return r.donation.donorEmail.toLowerCase() === userEmail.toLowerCase();
        })
        .map((r) => ({
          ...r.donation,
          campaignTitle: r.campaign.title,
          campaignSlug: r.campaign.slug,
          organizationName: r.organization.name,
          organization80G: r.organization.taxExemption80G,
          organizationRegNo: r.organization.registrationNo,
        }));
    } catch {
      dbSocketOnline = false;
    }
  }

  return liveDonations
    .filter((d) => {
      if (!userEmail || userEmail === 'all') return true;
      return d.donorEmail.toLowerCase() === userEmail.toLowerCase();
    })
    .map((d) => {
      const camp = liveCampaigns.find((c) => c.id === d.campaignId) || liveCampaigns[0];
      const org =
        liveOrganizations.find((o) => o.id === camp?.organizationId) || liveOrganizations[0];
      return {
        ...d,
        campaignTitle: camp?.title || 'Verified Aid Campaign',
        campaignSlug: camp?.slug || 'verified-aid-campaign',
        organizationName: org.name,
        organization80G: org.taxExemption80G,
        organizationRegNo: org.registrationNo,
      };
    });
}

export async function createNewCampaign(
  input: {
    organizationId: number;
    title: string;
    category: string;
    location: string;
    applicantName: string;
    documentType: string;
    documentId: string;
    returnOption: string;
    returnDurationMonths: number;
    description: string;
    impactLine: string;
    unitCost: number;
    unitImpact: string;
    goalAmount: number;
    deadline: string;
    themeKey: string;
  },
  actorName: string,
  actorRole: string
) {
  const baseSlug = input.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50);
  const slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;
  const isAutoVerified = actorRole === 'admin';

  let createdCamp: any = null;

  if (dbSocketOnline !== false) {
    try {
      const orgs = await db.select().from(organizations);
      const targetOrg = orgs.find((o) => o.id === input.organizationId) || orgs[0];

      const inserted = await db
        .insert(campaigns)
        .values({
          organizationId: targetOrg ? targetOrg.id : 1,
          title: input.title,
          slug,
          category: input.category,
          location: input.location,
          applicantName: input.applicantName,
          documentType: input.documentType,
          documentId: input.documentId || 'GOVT-ID-VERIFIED',
          documentVerified: isAutoVerified,
          returnOption: input.returnOption,
          returnDurationMonths: input.returnDurationMonths,
          description: input.description,
          impactLine: input.impactLine,
          unitCost: input.unitCost,
          unitImpact: input.unitImpact,
          goalAmount: input.goalAmount,
          raisedAmount: 0,
          donorCount: 0,
          status: 'live',
          verified: isAutoVerified,
          deadline: input.deadline,
          themeKey: input.themeKey,
        })
        .returning();

      if (inserted.length) {
        createdCamp = inserted[0];
      }
    } catch {
      // Fallback to in-memory
    }
  }

  if (!createdCamp) {
    const targetOrg =
      liveOrganizations.find((o) => o.id === input.organizationId) || liveOrganizations[0];
    createdCamp = {
      id: liveCampaigns.length ? Math.max(...liveCampaigns.map((c) => c.id)) + 1 : 1,
      organizationId: targetOrg ? targetOrg.id : 1,
      title: input.title,
      slug,
      category: input.category,
      location: input.location,
      applicantName: input.applicantName,
      documentType: input.documentType,
      documentId: input.documentId || 'GOVT-ID-VERIFIED',
      documentVerified: true,
      returnOption: input.returnOption,
      returnDurationMonths: input.returnDurationMonths,
      description: input.description,
      impactLine: input.impactLine,
      unitCost: input.unitCost,
      unitImpact: input.unitImpact,
      goalAmount: input.goalAmount,
      raisedAmount: 0,
      donorCount: 0,
      status: 'live',
      verified: isAutoVerified,
      deadline: input.deadline,
      themeKey: input.themeKey,
      createdAt: new Date(),
    };
  }

  liveCampaigns.unshift(createdCamp);

  await createAuditLogEntry({
    actorName,
    actorRole,
    action: 'VILLAGE_REQUEST_CREATED',
    targetType: 'campaign',
    targetId: createdCamp.id,
    details: `Created request "${input.title}" (${input.applicantName}, Official Govt ID: ${input.documentType}, Return: ${input.returnOption})`,
  });

  return createdCamp;
}

export async function updateCampaignFields(
  campaignId: number,
  updates: {
    title?: string;
    category?: string;
    location?: string;
    applicantName?: string;
    documentType?: string;
    documentId?: string;
    documentVerified?: boolean;
    returnOption?: string;
    returnDurationMonths?: number;
    goalAmount?: number;
    raisedAmount?: number;
    status?: string;
    verified?: boolean;
    deadline?: string;
  },
  actorName: string,
  actorRole: string
) {
  let updatedCamp: any = null;
  const idx = liveCampaigns.findIndex((c) => c.id === campaignId);
  if (idx !== -1) {
    liveCampaigns[idx] = {
      ...liveCampaigns[idx],
      ...updates,
    };
    updatedCamp = liveCampaigns[idx];
  }

  if (dbSocketOnline !== false) {
    try {
      const updated = await db
        .update(campaigns)
        .set(updates)
        .where(eq(campaigns.id, campaignId))
        .returning();

      if (updated.length) {
        updatedCamp = updated[0];
      }
    } catch {
      // Handled via liveCampaigns
    }
  }

  if (!updatedCamp) {
    throw new Error('Campaign not found');
  }

  await createAuditLogEntry({
    actorName,
    actorRole,
    action: 'CAMPAIGN_UPDATED_BY_ADMIN',
    targetType: 'campaign',
    targetId: campaignId,
    details: `Updated campaign #${campaignId} (${updatedCamp.title})`,
  });

  return updatedCamp;
}

export async function deleteCampaignById(campaignId: number, actorName: string) {
  deletedCampaignIds.add(Number(campaignId));
  const target = liveCampaigns.find((c) => c.id === campaignId);
  liveCampaigns = liveCampaigns.filter((c) => c.id !== campaignId);

  let deletedRow: any = target || { id: campaignId, title: `Campaign #${campaignId}` };

  if (dbSocketOnline !== false) {
    try {
      const dbDeleted = await db.transaction(async (tx) => {
        await tx.delete(campaignUpdates).where(eq(campaignUpdates.campaignId, campaignId));
        await tx.delete(donations).where(eq(donations.campaignId, campaignId));
        const deleted = await tx
          .delete(campaigns)
          .where(eq(campaigns.id, campaignId))
          .returning();
        return deleted[0];
      });
      if (dbDeleted) {
        deletedRow = dbDeleted;
      }
    } catch {
      // Handled via deletedCampaignIds set and liveCampaigns filter
    }
  }

  await createAuditLogEntry({
    actorName,
    actorRole: 'admin',
    action: 'CAMPAIGN_DELETED',
    targetType: 'campaign',
    targetId: campaignId,
    details: `Deleted campaign "${deletedRow.title || `#${campaignId}`}"`,
  });

  return deletedRow;
}

export async function addCampaignProgressUpdate(
  campaignId: number,
  title: string,
  body: string,
  actorName: string
) {
  if (dbSocketOnline !== false) {
    try {
      const inserted = await db
        .insert(campaignUpdates)
        .values({
          campaignId,
          title,
          body,
        })
        .returning();

      await db.insert(auditLogs).values({
        actorName,
        actorRole: 'admin',
        action: 'FIELD_UPDATE_POSTED',
        targetType: 'campaign',
        targetId: campaignId,
        details: `Posted field update "${title}"`,
      });

      return inserted[0];
    } catch {
      dbSocketOnline = false;
    }
  }

  const created = {
    id: liveCampaignUpdates.length + 1,
    campaignId,
    title,
    body,
    createdAt: new Date(),
  };
  liveCampaignUpdates.unshift(created);
  liveAuditLogs.unshift({
    id: liveAuditLogs.length + 1,
    actorName,
    actorRole: 'admin',
    action: 'FIELD_UPDATE_POSTED',
    targetType: 'campaign',
    targetId: campaignId,
    details: `Posted field update "${title}"`,
    createdAt: new Date(),
  });
  savePersistentDiskStore();
  return created;
}

/* ==========================================================================
   DOCTORS & BLOOD DONATION REPOSITORY HELPERS
   ========================================================================== */
export async function listDoctors() {
  const activeLive = liveDoctors.filter((d) => !deletedDoctorIds.has(Number(d.id)));
  if (dbSocketOnline !== false) {
    try {
      const rows = await db.select().from(doctors).orderBy(desc(doctors.createdAt));
      dbSocketOnline = true;
      const liveIds = new Set(activeLive.map((d) => Number(d.id)));
      const liveRegs = new Set(activeLive.map((d) => String(d.regNumber || '').toUpperCase()));
      const extraCustomDb = rows
        .filter((d) => {
          const numId = Number(d.id);
          if (deletedDoctorIds.has(numId) || liveIds.has(numId)) return false;
          if (liveRegs.has(String(d.regNumber || '').toUpperCase())) return false;
          const check = validateNmcDoctorRegistration({
            name: d.name,
            regNumber: d.regNumber,
            qualification: d.qualification,
          });
          return check.valid;
        })
        .map((d) => {
          const check = validateNmcDoctorRegistration({
            name: d.name,
            regNumber: d.regNumber,
          });
          return {
            ...d,
            stateMedicalCouncil: check.stateMedicalCouncil,
            hprId: check.hprId,
            governmentHospital: d.villageCenter,
            department: d.specialization,
            registrationYear: 2012,
            nmcVerificationStatus: 'GOVT_NMC_VERIFIED' as const,
            nmcPortalUrl: NMC_IMR_OFFICIAL_PORTAL_URL,
          };
        });
      return [...activeLive, ...extraCustomDb];
    } catch {
      dbSocketOnline = false;
    }
  }
  return activeLive;
}

export async function createDoctor(
  input: {
    name: string;
    qualification: string;
    specialization: string;
    regNumber: string;
    villageCenter: string;
    phone: string;
    fee: number;
    available: boolean;
    stateMedicalCouncil?: string;
    hprId?: string;
    governmentHospital?: string;
    department?: string;
  },
  actorName: string
) {
  const nmcCheck = validateNmcDoctorRegistration({
    name: input.name,
    regNumber: input.regNumber,
    qualification: input.qualification,
    governmentHospital: input.governmentHospital || input.villageCenter,
  });

  if (!nmcCheck.valid) {
    throw new Error(
      nmcCheck.error ||
        'Doctor registration must have a valid NMC / State Medical Council registration number.'
    );
  }

  let createdDoc: any = null;
  if (dbSocketOnline !== false) {
    try {
      const inserted = await db
        .insert(doctors)
        .values({
          name: input.name,
          qualification: input.qualification,
          specialization: input.specialization,
          regNumber: nmcCheck.normalizedRegNumber,
          villageCenter: input.villageCenter,
          phone: input.phone,
          fee: input.fee,
          available: input.available,
        })
        .returning();
      createdDoc = inserted[0];
    } catch {
      // Fallback to in-memory below
    }
  }

  const enrichedDoc = {
    id: createdDoc?.id
      ? Number(createdDoc.id)
      : liveDoctors.length
        ? Math.max(...liveDoctors.map((d) => Number(d.id))) + 1
        : 1,
    ...input,
    regNumber: nmcCheck.normalizedRegNumber,
    stateMedicalCouncil: input.stateMedicalCouncil || nmcCheck.stateMedicalCouncil,
    hprId: input.hprId || nmcCheck.hprId,
    governmentHospital: input.governmentHospital || input.villageCenter,
    department: input.department || input.specialization,
    registrationYear: 2014,
    experienceYears: 12,
    nmcVerificationStatus: 'GOVT_NMC_VERIFIED' as const,
    nmcPortalUrl: NMC_IMR_OFFICIAL_PORTAL_URL,
    createdAt: createdDoc?.createdAt || new Date(),
  };

  liveDoctors.unshift(enrichedDoc);

  await createAuditLogEntry({
    actorName,
    actorRole: 'admin',
    action: 'DOCTOR_ADDED',
    targetType: 'doctor',
    targetId: enrichedDoc.id,
    details: `Added NMC-IMR Government Verified Doctor ${input.name} (${nmcCheck.normalizedRegNumber} • ${nmcCheck.stateMedicalCouncil} • HPR: ${nmcCheck.hprId}) at ${input.villageCenter}`,
  });

  return enrichedDoc;
}

export async function updateDoctorById(
  doctorId: number,
  updates: Partial<{
    name: string;
    qualification: string;
    specialization: string;
    villageCenter: string;
    phone: string;
    fee: number;
    available: boolean;
  }>,
  actorName: string
) {
  let updatedDoc: any = null;
  const idx = liveDoctors.findIndex((d) => d.id === doctorId);
  if (idx !== -1) {
    liveDoctors[idx] = { ...liveDoctors[idx], ...updates };
    updatedDoc = liveDoctors[idx];
  }

  if (dbSocketOnline !== false) {
    try {
      const updated = await db
        .update(doctors)
        .set(updates)
        .where(eq(doctors.id, doctorId))
        .returning();
      if (updated.length) {
        updatedDoc = updated[0];
      }
    } catch {
      // In-memory already updated
    }
  }

  if (!updatedDoc) {
    throw new Error('Doctor not found');
  }

  await createAuditLogEntry({
    actorName,
    actorRole: 'admin',
    action: 'DOCTOR_UPDATED',
    targetType: 'doctor',
    targetId: doctorId,
    details: `Updated doctor ${updatedDoc.name}`,
  });

  return updatedDoc;
}

export async function deleteDoctorById(doctorId: number, actorName: string) {
  deletedDoctorIds.add(Number(doctorId));
  const target = liveDoctors.find((d) => d.id === doctorId);
  liveDoctors = liveDoctors.filter((d) => d.id !== doctorId);
  let deletedDoc: any = target || { id: doctorId, name: `Doctor #${doctorId}` };

  if (dbSocketOnline !== false) {
    try {
      await db
        .update(bloodDonations)
        .set({ doctorId: null })
        .where(eq(bloodDonations.doctorId, doctorId));

      const deleted = await db.delete(doctors).where(eq(doctors.id, doctorId)).returning();
      if (deleted.length) {
        deletedDoc = deleted[0];
      }
    } catch {
      // Filtered via deletedDoctorIds
    }
  }

  await createAuditLogEntry({
    actorName,
    actorRole: 'admin',
    action: 'DOCTOR_REMOVED',
    targetType: 'doctor',
    targetId: doctorId,
    details: `Removed doctor ${deletedDoc.name || `#${doctorId}`}`,
  });

  return deletedDoc;
}

export async function listBloodDonations() {
  if (dbSocketOnline !== false) {
    try {
      const rows = await db
        .select()
        .from(bloodDonations)
        .orderBy(desc(bloodDonations.createdAt));
      dbSocketOnline = true;
      const filteredDb = rows.filter((b) => !deletedBloodIds.has(Number(b.id)));
      const dbIds = new Set(filteredDb.map((b) => Number(b.id)));
      const extraLive = liveBloodDonations.filter(
        (b) => !deletedBloodIds.has(Number(b.id)) && !dbIds.has(Number(b.id))
      );
      return [...extraLive, ...filteredDb];
    } catch {
      dbSocketOnline = false;
    }
  }
  return liveBloodDonations.filter((b) => !deletedBloodIds.has(Number(b.id)));
}

export async function createBloodDonationEntry(input: {
  donorName: string;
  bloodGroup: string;
  requestType: string;
  villageName: string;
  phone: string;
  age: number;
  doctorId?: number | null;
  appointmentDate: string;
  customFeePaid: number;
  documentId: string;
  notes?: string;
}) {
  if (dbSocketOnline !== false) {
    try {
      let doctorName: string | null = null;
      if (input.doctorId) {
        const docRows = await db
          .select()
          .from(doctors)
          .where(eq(doctors.id, input.doctorId));
        if (docRows.length) {
          doctorName = docRows[0].name;
        }
      }

      const inserted = await db
        .insert(bloodDonations)
        .values({
          donorName: input.donorName,
          bloodGroup: input.bloodGroup,
          requestType: input.requestType,
          villageName: input.villageName,
          phone: input.phone,
          age: input.age,
          doctorId: input.doctorId || null,
          doctorName,
          appointmentDate: input.appointmentDate,
          customFeePaid: input.customFeePaid,
          documentId: input.documentId,
          status: 'verified',
          notes: input.notes || null,
        })
        .returning();

      await db.insert(auditLogs).values({
        actorName: input.donorName,
        actorRole: 'user',
        action:
          input.requestType === 'hire_doctor'
            ? 'DOCTOR_HIRED_FOR_VILLAGE'
            : input.requestType === 'request_blood'
              ? 'EMERGENCY_BLOOD_REQUESTED'
              : 'BLOOD_DONATION_REGISTERED',
        targetType: 'blood_donation',
        targetId: inserted[0].id,
        details: `${input.donorName} (${input.bloodGroup}, Location: ${input.villageName}, Govt ID: ${input.documentId}) ${doctorName ? `with ${doctorName}` : ''}`,
      });

      return inserted[0];
    } catch {
      dbSocketOnline = false;
    }
  }

  const doc = liveDoctors.find((d) => d.id === input.doctorId);
  const doctorName = doc ? doc.name : 'Dr. Meenakshi Iyer';
  const created = {
    id: liveBloodDonations.length
      ? Math.max(...liveBloodDonations.map((b) => b.id)) + 1
      : 1,
    donorName: input.donorName,
    bloodGroup: input.bloodGroup,
    requestType: input.requestType,
    villageName: input.villageName,
    phone: input.phone,
    age: input.age,
    doctorId: input.doctorId ?? 1,
    doctorName,
    appointmentDate: input.appointmentDate,
    customFeePaid: input.customFeePaid,
    documentId: input.documentId,
    status: 'verified',
    notes: input.notes || '',
    createdAt: new Date(),
  };
  liveBloodDonations.unshift(created);
  liveAuditLogs.unshift({
    id: liveAuditLogs.length + 1,
    actorName: input.donorName,
    actorRole: 'user',
    action:
      input.requestType === 'hire_doctor'
        ? 'DOCTOR_HIRED_FOR_VILLAGE'
        : input.requestType === 'request_blood'
          ? 'EMERGENCY_BLOOD_REQUESTED'
          : 'BLOOD_DONATION_REGISTERED',
    targetType: 'blood_donation',
    targetId: created.id,
    details: `${input.donorName} (${input.bloodGroup}, Location: ${input.villageName}, Govt ID: ${input.documentId}) with ${doctorName}`,
    createdAt: new Date(),
  });
  savePersistentDiskStore();
  return created;
}

export async function updateBloodDonationStatus(
  id: number,
  status: string,
  actorName: string
) {
  if (dbSocketOnline !== false) {
    try {
      const updated = await db
        .update(bloodDonations)
        .set({ status })
        .where(eq(bloodDonations.id, id))
        .returning();
      if (!updated.length) {
        throw new Error('Record not found');
      }
      await db.insert(auditLogs).values({
        actorName,
        actorRole: 'admin',
        action: 'BLOOD_RECORD_STATUS_UPDATED',
        targetType: 'blood_donation',
        targetId: id,
        details: `Updated blood/doctor record #${id} (${updated[0].donorName}) to ${status}`,
      });
      return updated[0];
    } catch {
      dbSocketOnline = false;
    }
  }

  const idx = liveBloodDonations.findIndex((b) => b.id === id);
  if (idx === -1) throw new Error('Record not found');
  liveBloodDonations[idx].status = status;
  liveAuditLogs.unshift({
    id: liveAuditLogs.length + 1,
    actorName,
    actorRole: 'admin',
    action: 'BLOOD_RECORD_STATUS_UPDATED',
    targetType: 'blood_donation',
    targetId: id,
    details: `Updated blood/doctor record #${id} (${liveBloodDonations[idx].donorName}) to ${status}`,
    createdAt: new Date(),
  });
  return liveBloodDonations[idx];
}

export async function deleteBloodDonationById(id: number, actorName: string) {
  deletedBloodIds.add(Number(id));
  const target = liveBloodDonations.find((b) => b.id === id);
  liveBloodDonations = liveBloodDonations.filter((b) => b.id !== id);
  let deletedRecord: any = target || { id, donorName: `Record #${id}` };

  if (dbSocketOnline !== false) {
    try {
      const deleted = await db
        .delete(bloodDonations)
        .where(eq(bloodDonations.id, id))
        .returning();
      if (deleted.length) {
        deletedRecord = deleted[0];
      }
    } catch {
      // Filtered via deletedBloodIds
    }
  }

  await createAuditLogEntry({
    actorName,
    actorRole: 'admin',
    action: 'BLOOD_RECORD_DELETED',
    targetType: 'blood_donation',
    targetId: id,
    details: `Deleted blood/doctor record for ${deletedRecord.donorName || `#${id}`}`,
  });

  return deletedRecord;
}

function mergeAuditLogLists(dbLogs: any[], memLogs: any[], limit = 100) {
  const seen = new Set<string>();
  const combined: any[] = [];

  for (const item of [...memLogs, ...dbLogs]) {
    const key = `${item.action || ''}:${item.targetType || ''}:${item.details || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      combined.push(item);
    }
  }

  combined.sort((a, b) => {
    const tA = new Date(a.createdAt || 0).getTime();
    const tB = new Date(b.createdAt || 0).getTime();
    return tB - tA;
  });

  return combined.slice(0, limit);
}

export async function getAdminOverviewData() {
  if (dbSocketOnline !== false) {
    try {
      const orgs = await db
        .select()
        .from(organizations)
        .orderBy(desc(organizations.createdAt));
      const filteredDbOrgs = orgs.filter((o) => !deletedOrgIds.has(Number(o.id)));
      const dbOrgIds = new Set(filteredDbOrgs.map((o) => Number(o.id)));
      const extraLiveOrgs = liveOrganizations.filter(
        (o) => !deletedOrgIds.has(Number(o.id)) && !dbOrgIds.has(Number(o.id))
      );
      const mergedOrgs = [...extraLiveOrgs, ...filteredDbOrgs];

      const allCampaigns = await listCampaignsWithOrg();
      const allDonations = await db
        .select({
          donation: donations,
          campaign: campaigns,
        })
        .from(donations)
        .innerJoin(campaigns, eq(donations.campaignId, campaigns.id))
        .orderBy(desc(donations.createdAt));

      const allDoctors = await listDoctors();
      const allBlood = await listBloodDonations();
      const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
      const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

      return {
        organizations: mergedOrgs,
        campaigns: allCampaigns,
        donations: allDonations.map((d) => ({
          ...d.donation,
          campaignTitle: d.campaign.title,
        })),
        doctors: allDoctors,
        bloodDonations: allBlood,
        auditLogs: mergeAuditLogLists(logs, liveAuditLogs, 100),
        users: allUsers,
      };
    } catch {
      dbSocketOnline = false;
    }
  }

  const allCampaigns = await listCampaignsWithOrg();
  return {
    organizations: liveOrganizations.filter((o) => !deletedOrgIds.has(Number(o.id))),
    campaigns: allCampaigns,
    donations: liveDonations.map((d) => {
      const camp = liveCampaigns.find((c) => c.id === d.campaignId);
      return {
        ...d,
        campaignTitle: camp?.title || 'Verified Aid Campaign',
      };
    }),
    doctors: liveDoctors.filter((d) => !deletedDoctorIds.has(Number(d.id))),
    bloodDonations: liveBloodDonations.filter((b) => !deletedBloodIds.has(Number(b.id))),
    auditLogs: liveAuditLogs.slice(0, 100),
    users: fallbackUsersStore,
  };
}

export async function listAuditLogs(limit = 100) {
  if (dbSocketOnline !== false) {
    try {
      const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
      dbSocketOnline = true;
      return mergeAuditLogLists(logs, liveAuditLogs, limit);
    } catch {
      dbSocketOnline = false;
    }
  }
  return liveAuditLogs.slice(0, limit);
}

export async function createAuditLogEntry(input: {
  actorName: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: number;
  details: string;
}) {
  const numericTarget = Number(input.targetId);
  const safeTargetId =
    Number.isFinite(numericTarget) && numericTarget > 0
      ? Math.max(1, Math.abs(Math.trunc(numericTarget)) % 1000000000)
      : 1;

  const entry: any = {
    id: liveAuditLogs.length
      ? Math.max(...liveAuditLogs.map((l) => Number(l.id) || 0)) + 1
      : 1,
    actorName: input.actorName || 'Danish Khan',
    actorRole: input.actorRole || 'admin',
    action: input.action || 'ADMIN_AUDIT_ACTION',
    targetType: input.targetType || 'organization',
    targetId: safeTargetId,
    details: input.details,
    createdAt: new Date(),
  };

  liveAuditLogs.unshift(entry);
  savePersistentDiskStore();

  if (dbSocketOnline !== false) {
    try {
      const inserted = await db
        .insert(auditLogs)
        .values({
          actorName: entry.actorName,
          actorRole: entry.actorRole,
          action: entry.action,
          targetType: entry.targetType,
          targetId: safeTargetId,
          details: entry.details,
        })
        .returning();
      if (inserted.length) {
        entry.id = inserted[0].id;
        entry.createdAt = inserted[0].createdAt;
        return inserted[0];
      }
    } catch (err) {
      console.warn('Audit log stored in memory fallback:', err);
    }
  }

  return entry;
}

export async function createOrganizationInRepo(
  input: {
    name: string;
    registrationNo: string;
    taxExemption80G?: string;
    panNumber?: string;
    city?: string;
    state?: string;
    verified?: boolean;
  },
  actorName: string
) {
  const verified = input.verified !== undefined ? Boolean(input.verified) : true;
  let createdOrg: any = null;

  if (dbSocketOnline !== false) {
    try {
      const inserted = await db
        .insert(organizations)
        .values({
          name: input.name,
          registrationNo: input.registrationNo,
          taxExemption80G: input.taxExemption80G || `80G-${Date.now().toString().slice(-4)}`,
          verified,
          ownerId: 1,
        })
        .returning();
      if (inserted.length) {
        createdOrg = {
          ...inserted[0],
          panNumber: input.panNumber || 'AAATN1234F',
          city: input.city || 'All-India Hub',
          state: input.state || 'India',
        };
      }
    } catch {
      // Fallback to in-memory
    }
  }

  if (!createdOrg) {
    const nextId = liveOrganizations.length
      ? Math.max(...liveOrganizations.map((o) => Number(o.id) || 0)) + 1
      : 10;
    createdOrg = {
      id: nextId,
      name: input.name,
      registrationNo: input.registrationNo,
      taxExemption80G: input.taxExemption80G || `80G-${nextId}`,
      panNumber: input.panNumber || 'AAATN1234F',
      city: input.city || 'All-India Hub',
      state: input.state || 'India',
      verified,
      createdAt: new Date(),
    };
  }

  liveOrganizations.unshift(createdOrg);

  await createAuditLogEntry({
    actorName,
    actorRole: 'admin',
    action: 'NGO_REGISTERED',
    targetType: 'organization',
    targetId: createdOrg.id,
    details: `Registered NGO "${createdOrg.name}" (${createdOrg.registrationNo})`,
  });

  return createdOrg;
}

export async function deleteOrganizationInRepo(orgId: number, actorName: string) {
  deletedOrgIds.add(Number(orgId));
  const target = liveOrganizations.find((o) => Number(o.id) === Number(orgId));
  liveOrganizations.splice(
    0,
    liveOrganizations.length,
    ...liveOrganizations.filter((o) => Number(o.id) !== Number(orgId))
  );

  let orgName = target?.name || `NGO #${orgId}`;

  if (dbSocketOnline !== false) {
    try {
      const rows = await db.select().from(organizations).where(eq(organizations.id, orgId));
      if (rows.length) {
        orgName = rows[0].name;
      }
      await db.delete(organizations).where(eq(organizations.id, orgId));
    } catch {
      // Filtered via deletedOrgIds if foreign key exists
    }
  }

  await createAuditLogEntry({
    actorName,
    actorRole: 'admin',
    action: 'NGO_DELETED',
    targetType: 'organization',
    targetId: orgId,
    details: `Deleted NGO "${orgName}" (#${orgId}) from platform registry`,
  });

  return { id: orgId, name: orgName };
}

export async function approveCampaignByAdmin(
  campaignId: number,
  verified: boolean,
  actorName: string
) {
  const camp = liveCampaigns.find((c) => c.id === campaignId);
  if (camp) {
    camp.verified = verified;
    camp.documentVerified = verified;
    camp.status = verified ? 'live' : 'draft';
  }

  let updatedCamp: any = camp;

  if (dbSocketOnline !== false) {
    try {
      const updated = await db
        .update(campaigns)
        .set({
          verified,
          documentVerified: verified,
          status: verified ? 'live' : 'draft',
        })
        .where(eq(campaigns.id, campaignId))
        .returning();

      if (updated.length) {
        updatedCamp = updated[0];
      }
    } catch {
      // Handled in memory
    }
  }

  if (!updatedCamp) {
    throw new Error('Campaign not found');
  }

  await createAuditLogEntry({
    actorName,
    actorRole: 'admin',
    action: verified ? 'CAMPAIGN_APPROVED' : 'CAMPAIGN_APPROVAL_REVOKED',
    targetType: 'campaign',
    targetId: campaignId,
    details: `${verified ? 'Approved & verified' : 'Suspended'} campaign "${updatedCamp.title}" (Official Govt ID: ${updatedCamp.documentType}, Category: ${updatedCamp.category})`,
  });

  return updatedCamp;
}

export async function toggleOrganizationVerification(
  orgId: number,
  verified: boolean,
  actorName: string
) {
  const memOrg = liveOrganizations.find((o) => Number(o.id) === Number(orgId));
  if (memOrg) {
    memOrg.verified = verified;
  }
  liveCampaigns.forEach((c) => {
    if (Number(c.organizationId) === Number(orgId)) c.verified = verified;
  });

  let updatedOrgResult: any = memOrg;

  if (dbSocketOnline !== false) {
    try {
      const dbResult = await db.transaction(async (tx) => {
        const updatedOrg = await tx
          .update(organizations)
          .set({ verified })
          .where(eq(organizations.id, orgId))
          .returning();

        if (updatedOrg.length) {
          await tx
            .update(campaigns)
            .set({ verified })
            .where(eq(campaigns.organizationId, orgId));
          return updatedOrg[0];
        }
        return null;
      });
      if (dbResult) {
        updatedOrgResult = dbResult;
      }
    } catch {
      // Handled via liveOrganizations
    }
  }

  if (!updatedOrgResult) {
    updatedOrgResult = {
      id: orgId,
      name: `NGO Partner #${orgId}`,
      registrationNo: `80G-${orgId}`,
      verified,
    };
  }

  await createAuditLogEntry({
    actorName,
    actorRole: 'admin',
    action: verified ? 'NGO_VERIFIED' : 'NGO_VERIFICATION_REVOKED',
    targetType: 'organization',
    targetId: orgId,
    details: `${verified ? 'Verified' : 'Revoked verification for'} "${updatedOrgResult.name}" (${updatedOrgResult.registrationNo})`,
  });

  return updatedOrgResult;
}

export async function refundDonationById(donationId: number, actorName: string) {
  const memTarget = liveDonations.find((d) => Number(d.id) === Number(donationId));
  if (memTarget) {
    memTarget.status = 'refunded';
    const camp = liveCampaigns.find((c) => c.id === memTarget.campaignId);
    if (camp) {
      camp.raisedAmount = Math.max(0, camp.raisedAmount - memTarget.amount);
      camp.donorCount = Math.max(0, camp.donorCount - 1);
    }
  }

  let refundedResult: any = memTarget;

  if (dbSocketOnline !== false) {
    try {
      const dbRefunded = await db.transaction(async (tx) => {
        const rows = await tx.select().from(donations).where(eq(donations.id, donationId));
        if (!rows.length) {
          return null;
        }
        const target = rows[0];
        const updatedDonation = await tx
          .update(donations)
          .set({ status: 'refunded' })
          .where(eq(donations.id, donationId))
          .returning();

        const campRows = await tx
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, target.campaignId));
        if (campRows.length) {
          const camp = campRows[0];
          await tx
            .update(campaigns)
            .set({
              raisedAmount: Math.max(0, camp.raisedAmount - target.amount),
              donorCount: Math.max(0, camp.donorCount - 1),
            })
            .where(eq(campaigns.id, camp.id));
        }
        return updatedDonation[0];
      });
      if (dbRefunded) {
        refundedResult = dbRefunded;
      }
    } catch {
      // Handled via liveDonations
    }
  }

  if (!refundedResult) {
    throw new Error('Donation not found');
  }

  await createAuditLogEntry({
    actorName,
    actorRole: 'admin',
    action: 'DONATION_REFUNDED',
    targetType: 'donation',
    targetId: donationId,
    details: `Refunded ₹${refundedResult.amount} for order ${refundedResult.gatewayOrderId} (${refundedResult.donorEmail})`,
  });

  return refundedResult;
}

export async function clearAllAuditLogs() {
  liveAuditLogs.length = 0;
  savePersistentDiskStore();
  if (dbSocketOnline !== false) {
    try {
      await db.delete(auditLogs);
    } catch {
      // Fallback handled via liveAuditLogs
    }
  }
  return [];
}

