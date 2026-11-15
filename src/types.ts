export type UserRole = 'donor' | 'fundraiser' | 'user' | 'admin' | 'ngo_admin';

export type DonorSupportType = 'donator' | 'lender';

export type ReturnScheduleOption = 'no_return' | 'monthly' | 'yearly' | 'directly';

export interface UserProfile {
  id: number | string;
  uid?: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface CampaignUpdateItem {
  id: number | string;
  campaignId: number | string;
  title: string;
  body: string;
  createdAt: string;
}

export interface CampaignItem {
  id: number | string;
  organizationId: number;
  title: string;
  slug: string;
  category: string;
  location: string;
  beneficiaryLocation: string;
  applicantName: string;
  applicantEmail?: string;
  documentType: string;
  documentId: string;
  documentVerified: boolean;
  returnOption: ReturnScheduleOption;
  donorSupportType?: DonorSupportType;
  returnDurationMonths: number;
  description: string;
  impactLine: string;
  impactMetric: string;
  unitCost: number;
  unitImpact: string;
  goalAmount: number;
  raisedAmount: number;
  donorCount: number;
  status: string;
  verified: boolean;
  verificationStatus?: 'Verified' | 'Pending';
  verificationFileName?: string;
  deadline: string;
  themeKey: string;
  imageTheme: string;
  imageUrl?: string;
  createdAt: string;
  organizationName: string;
  organizationRegNo: string;
  organization80G: string;
  organizationVerified: boolean;
  updates: CampaignUpdateItem[];
}

export interface DonationRecord {
  id: number | string;
  campaignId: number | string;
  donorId: number | null;
  donorName: string;
  donorEmail: string;
  donorPhone: string;
  panNumber: string | null;
  amount: number;
  returnOption: ReturnScheduleOption;
  donorType?: DonorSupportType;
  donorSupportType?: DonorSupportType;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: string;
  gatewayMode: string;
  gatewayOrderId: string;
  gatewayPaymentId: string | null;
  receiptNo: string | null;
  receiptNumber: string;
  idempotencyKey: string;
  createdAt: string;
  campaignTitle?: string;
  campaignSlug?: string;
  organizationName?: string;
  organization80G?: string;
  organizationRegNo?: string;
}

export interface CampaignDetail extends CampaignItem {
  updates: CampaignUpdateItem[];
  recentDonations: DonationRecord[];
}

export interface DoctorRecord {
  id: number | string;
  name: string;
  qualification: string;
  specialization: string;
  specialty: string;
  regNumber: string;
  licenseNumber: string;
  villageCenter: string;
  hospitalVillage: string;
  phone: string;
  fee: number;
  consultationFee: number;
  availableDays: string;
  experienceYears: number;
  available: boolean;
  verified: boolean;
  createdAt: string;
  stateMedicalCouncil?: string;
  hprId?: string;
  governmentHospital?: string;
  department?: string;
  registrationYear?: number;
  nmcVerificationStatus?: 'GOVT_NMC_VERIFIED';
  nmcPortalUrl?: string;
}

export interface BloodDonationRecord {
  id: number | string;
  donorName: string;
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  requestType: 'donate_blood' | 'request_blood' | 'hire_doctor' | 'need_blood';
  villageName: string;
  phone: string;
  age: number;
  doctorId: number | string | null;
  doctorName: string | null;
  appointmentDate: string;
  customFeePaid: number;
  documentType: string;
  documentId: string;
  status: 'pending' | 'verified' | 'completed';
  notes: string | null;
  createdAt: string;
}

export interface PlatformStats {
  totalRaised: number;
  totalDonationsCount: number;
  verifiedNgoCount: number;
  activeCampaignCount: number;
  verifiedDoctorCount: number;
  bloodDonationsCount: number;
}

export interface OrganizationRecord {
  id: number;
  name: string;
  registrationNo: string;
  taxExemption80G: string;
  reg80g?: string;
  pan?: string;
  darpanId?: string;
  csr1RegNo?: string;
  fcraStatus?: string;
  headquarters?: string;
  focusAreas?: string[];
  officialWebsite?: string;
  partnerConnected?: boolean;
  outreachContactsCount?: number;
  verified: boolean;
  verificationStatus?: 'Verified' | 'Pending';
  verificationFileName?: string;
  verificationDocType?: string;
  ownerId: number;
  createdAt: string;
}

export interface HeroSlideItem {
  id: string;
  theme: string;
  categoryBadge: string;
  title: string;
  location: string;
  docBadge: string;
  caption: string;
  imageUrl?: string;
}

export interface AuditLogRecord {
  id: number | string;
  actorName: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: number | string;
  details: string;
  createdAt: string;
}

export interface HospitalRegistrationRecord {
  id: number | string;
  tokenNumber: string;
  patientName: string;
  phone: string;
  bloodGroup: string;
  emergencyType: 'OPD Consultation' | 'Emergency Trauma' | 'Blood Transfusion' | 'Maternity & NICU' | 'Ambulance Dispatch';
  hospitalName: string;
  hospitalAddress: string;
  hospitalPhone: string;
  distanceKm: number;
  estimatedMins: number;
  userLat: number;
  userLng: number;
  notes?: string;
  status: 'Confirmed' | 'Dispatched' | 'Completed';
  createdAt: string;
}

export interface VerificationUploadRecord {
  id: number | string;
  targetType: 'organization' | 'campaign';
  targetId: number | string;
  targetName: string;
  documentType: string;
  registrationNo: string;
  fileName: string;
  fileSizeKb: number;
  status: 'Verified' | 'Pending';
  uploadedBy: string;
  notes?: string;
  createdAt: string;
}

export interface EmailNotificationRecord {
  id: number | string;
  recipientRole: 'applicant' | 'admin' | 'donator_fundraiser';
  toEmail: string;
  toName: string;
  subject: string;
  bodyText: string;
  category: string;
  donorSupportType: DonorSupportType;
  returnOption: ReturnScheduleOption;
  amount: number;
  campaignId?: number | string;
  campaignTitle: string;
  applicantName: string;
  applicantEmail: string;
  documentType?: string;
  documentId?: string;
  gmailDispatched: boolean;
  gmailMessageId?: string;
  createdAt: string;
}


