import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCampaignProgress,
  calculateImpactStatement,
  calculate80GTaxDeduction,
  calculateRepaymentSchedule,
  formatINR,
  computeWebhookSignature,
  verifyWebhookSignature,
  createDonationOrderSchema,
  createCampaignSchema,
  bloodDonationSchema,
  classifyAuditAction,
  filterAuditLogs,
  calculateHaversineDistanceKm,
  hospitalRegistrationSchema,
  getDonorSupportType,
  verificationUploadSchema,
  buildThreeWayRequestEmails,
  encodeGmailMimeMessage,
  filterCampaigns,
  validateAadhaarVerhoeff,
  generateAadhaarChecksum,
  validatePanCard,
  validateDrivingLicence,
  maskGovernmentId,
  signJwtToken,
  verifyJwtToken,
  validateAuthCredentials,
  buildAdminSubmissionSummaryEmail,
  ADMIN_OFFICIAL_EMAIL,
  validateQuickAidRequestForm,
  validateDonationForm,
  HERO_BANNER_PHOTO_SOURCES,
  resolveHeroThemeFromText,
  buildQwenHeroBannerPrompt,
} from './donationLogic';

test('calculateCampaignProgress computes accurate percentages and goal state', () => {
  const half = calculateCampaignProgress(600000, 1200000);
  assert.equal(half.percentage, 50);
  assert.equal(half.clampedPercentage, 50);
  assert.equal(half.remainingAmount, 600000);
  assert.equal(half.isGoalReached, false);

  const exceeded = calculateCampaignProgress(1500000, 1200000);
  assert.equal(exceeded.percentage, 125);
  assert.equal(exceeded.clampedPercentage, 100);
  assert.equal(exceeded.remainingAmount, 0);
  assert.equal(exceeded.isGoalReached, true);
});

test('calculateRepaymentSchedule computes Pure Donator (0%), Yearly division (10000 / 2 yrs = 5000), Monthly division, and 50% Return Money', () => {
  const pureDonator = calculateRepaymentSchedule(18000, 'no_return', 12);
  assert.equal(pureDonator.installmentAmount, 0);
  assert.equal(pureDonator.installmentCount, 0);
  assert.equal(pureDonator.totalReturnAmount, 0);
  assert.equal(pureDonator.donorSupportType, 'donator');
  assert.equal(getDonorSupportType('no_return'), 'donator');

  // Yearly: 10000 in 2 years -> 5000 each year
  const yearly10k = calculateRepaymentSchedule(10000, 'yearly', 2);
  assert.equal(yearly10k.installmentAmount, 5000);
  assert.equal(yearly10k.installmentCount, 2);
  assert.equal(yearly10k.totalReturnAmount, 10000);
  assert.equal(yearly10k.donorSupportType, 'lender');

  // Monthly: 10000 in 5 months -> 2000 each month
  const monthly10k = calculateRepaymentSchedule(10000, 'monthly', 5);
  assert.equal(monthly10k.installmentAmount, 2000);
  assert.equal(monthly10k.installmentCount, 5);
  assert.equal(monthly10k.donorSupportType, 'lender');
  assert.equal(getDonorSupportType('monthly'), 'lender');

  // 50% Return Money: 10000 -> 5000 return (50%)
  const halfReturn = calculateRepaymentSchedule(10000, 'directly', 1);
  assert.equal(halfReturn.installmentAmount, 5000);
  assert.equal(halfReturn.totalReturnAmount, 5000);
  assert.equal(halfReturn.installmentCount, 1);
  assert.equal(halfReturn.donorSupportType, 'lender');
});

test('calculateImpactStatement scales impact units proportionally', () => {
  const res = calculateImpactStatement(1500, 500, '1 rural household with safe drinking water');
  assert.equal(res.units, 3);
  assert.equal(res.statement, 'Funds 3 × rural household with safe drinking water');
});

test('calculate80GTaxDeduction returns 50% deduction and estimated savings', () => {
  const tax = calculate80GTaxDeduction(2000);
  assert.equal(tax.eligibleDeduction, 1000);
  assert.equal(tax.estimatedTaxSaved, 300);
});

test('formatINR formats Indian numbering system with lakhs and thousands', () => {
  assert.equal(formatINR(500), '₹500');
  assert.equal(formatINR(12500), '₹12,500');
  assert.equal(formatINR(864500), '₹8,64,500');
  assert.equal(formatINR(1200000), '₹12,00,000');
});

test('HMAC webhook signature verification validates genuine signatures and rejects tampering', () => {
  const secret = 'whsec_sankalpsetu_test_key';
  const sig = computeWebhookSignature('order_101', 'pay_202', secret);
  assert.equal(verifyWebhookSignature('order_101', 'pay_202', sig, secret), true);
  assert.equal(verifyWebhookSignature('order_101', 'pay_tampered', sig, secret), false);
  assert.equal(verifyWebhookSignature('order_101', 'pay_202', 'invalid_sig', secret), false);
});

test('createDonationOrderSchema enforces custom price bounds and return option', () => {
  const valid = createDonationOrderSchema.safeParse({
    campaignId: 1,
    amount: 750,
    returnOption: 'no_return',
    donorName: 'Danish Khan',
    donorEmail: 'khandanish0503@gmail.com',
    donorPhone: '+91 9820144120',
    panNumber: 'ABCDE1234F',
    paymentMethod: 'upi',
    gatewayMode: 'razorpay_test',
    idempotencyKey: 'idem-12345678',
  });
  assert.equal(valid.success, true);

  const invalidAmount = createDonationOrderSchema.safeParse({
    campaignId: 1,
    amount: 10,
    donorName: 'Danish Khan',
    donorEmail: 'khandanish0503@gmail.com',
    donorPhone: '+91 9820144120',
    paymentMethod: 'upi',
    gatewayMode: 'razorpay_test',
    idempotencyKey: 'idem-12345678',
  });
  assert.equal(invalidAmount.success, false);
});

test('bloodDonationSchema and createCampaignSchema validate village documents and blood group', () => {
  const validBlood = bloodDonationSchema.safeParse({
    donorName: 'Salman Mansoori',
    bloodGroup: 'O+',
    requestType: 'donate_blood',
    villageName: 'Rampur Kalan',
    phone: '+91 9792144012',
    age: 26,
    doctorId: 1,
    appointmentDate: '2026-11-10',
    customFeePaid: 300,
    documentId: 'AADHAAR-9921',
  });
  assert.equal(validBlood.success, true);

  const validCampaign = createCampaignSchema.safeParse({
    organizationId: 1,
    title: 'Clean Water Solar Micro-Grid for 12 Villages',
    category: 'Clean Water',
    location: 'Latur, Maharashtra',
    applicantName: 'Sunita Devi',
    documentType: 'Original Aadhaar & Gram Panchayat Resolution',
    documentId: 'GP-2026-101',
    returnOption: 'no_return',
    returnDurationMonths: 24,
    description: 'Installing community-managed solar water purification systems that deliver 10,000 litres daily.',
    impactLine: '₹500 provides clean water for 1 household',
    unitCost: 500,
    unitImpact: '1 household with clean water',
    goalAmount: 500000,
    deadline: '2026-12-31',
    themeKey: 'water',
  });
  assert.equal(validCampaign.success, true);
});

test('classifyAuditAction and filterAuditLogs categorize and filter sensitive Admin actions including Verification Uploads', () => {
  const sampleLogs = [
    {
      id: 1,
      actorName: 'Danish Khan',
      action: 'VERIFICATION_DOC_UPLOADED_VERIFIED',
      details: 'Uploaded 80G Form 10BE for Gramin Seva Foundation',
      targetType: 'organization',
    },
    {
      id: 2,
      actorName: 'Danish Khan',
      action: 'CAMPAIGN_APPROVED',
      details: 'Approved Freelancer SaaS Website Campaign #4',
      targetType: 'campaign',
    },
    {
      id: 3,
      actorName: 'Danish Khan',
      action: 'DONATION_REFUNDED',
      details: 'Refunded ₹2,500 for order_Rzp9981',
      targetType: 'donation',
    },
    {
      id: 4,
      actorName: 'Rohan Sharma',
      action: 'HOSPITAL_PATIENT_REGISTERED',
      details: 'Registered at AIIMS Emergency Trauma Center',
      targetType: 'hospital',
    },
  ];

  assert.equal(classifyAuditAction('VERIFICATION_DOC_UPLOADED_VERIFIED').category, 'NGO Verification');
  assert.equal(classifyAuditAction('VERIFICATION_DOC_UPLOADED_PENDING').badgeLabel, 'Verification Pending');
  assert.equal(classifyAuditAction('DONATION_REFUNDED').category, 'Refund & Settlement');
  assert.equal(classifyAuditAction('CAMPAIGN_APPROVED').category, 'Campaign Approval');
  assert.equal(classifyAuditAction('HOSPITAL_PATIENT_REGISTERED').category, 'Medical & Hospital');

  const ngoLogs = filterAuditLogs(sampleLogs, { category: 'NGO Verification' });
  assert.equal(ngoLogs.length, 1);
  assert.equal(ngoLogs[0].action, 'VERIFICATION_DOC_UPLOADED_VERIFIED');

  const refundLogs = filterAuditLogs(sampleLogs, { searchQuery: 'order_Rzp9981' });
  assert.equal(refundLogs.length, 1);
  assert.equal(refundLogs[0].action, 'DONATION_REFUNDED');
});

test('calculateHaversineDistanceKm and hospitalRegistrationSchema validate hospital routing and booking', () => {
  const dist = calculateHaversineDistanceKm(
    { lat: 28.5672, lng: 77.2100 },
    { lat: 28.6139, lng: 77.2090 }
  );
  assert.equal(dist > 4.5 && dist < 6.0, true);

  const validReg = hospitalRegistrationSchema.safeParse({
    patientName: 'Aarav Verma',
    phone: '+91 9811223344',
    bloodGroup: 'B+',
    emergencyType: 'Emergency Trauma',
    hospitalName: 'Safdarjung Hospital & Trauma Center',
    hospitalAddress: 'Ansari Nagar West, New Delhi',
    hospitalPhone: '+91 11 26707444',
  });
  assert.equal(validReg.success, true);
});

test('verificationUploadSchema, filterCampaigns by donorSupportType, and buildThreeWayRequestEmails work accurately', () => {
  const validUpload = verificationUploadSchema.safeParse({
    targetType: 'organization',
    targetId: 1,
    targetName: 'Gramin Seva Foundation',
    documentType: '80G & 12A Tax Exemption Certificate',
    registrationNo: '80G-DEL-2026-991',
    fileName: 'gramin_seva_80g_certificate.pdf',
    fileSizeKb: 245,
    status: 'Verified',
  });
  assert.equal(validUpload.success, true);

  const campaigns = [
    {
      title: 'Emergency Heart Surgery Aid',
      description: 'Need pure grant support for surgery',
      category: 'Medical & Healthcare',
      returnOption: 'no_return',
      status: 'live',
    },
    {
      title: 'Freelancer SaaS Launch',
      description: 'Will return in 12 monthly installments',
      category: 'Freelancer & Website',
      returnOption: 'monthly',
      status: 'live',
    },
  ];

  const donatorOnly = filterCampaigns(campaigns, { donorSupportType: 'donator' });
  assert.equal(donatorOnly.length, 1);
  assert.equal(donatorOnly[0].title, 'Emergency Heart Surgery Aid');

  const lenderOnly = filterCampaigns(campaigns, { donorSupportType: 'lender' });
  assert.equal(lenderOnly.length, 1);
  assert.equal(lenderOnly[0].title, 'Freelancer SaaS Launch');

  const emails = buildThreeWayRequestEmails({
    campaignId: 77,
    title: 'Emergency Medical Aid for Child Surgery',
    category: 'Medical & Healthcare',
    amount: 45000,
    applicantName: 'Sunita Verma',
    applicantEmail: 'sunita.verma@gmail.com',
    location: 'Lucknow, UP',
    documentType: 'Original Hospital Estimate & Aadhaar',
    documentId: 'HOSP-EST-2026-44',
    returnOption: 'no_return',
    returnDurationMonths: 12,
    description: 'Urgent pediatric surgery support needed with no repayment.',
  });

  assert.equal(emails.length, 3);
  assert.equal(emails[0].recipientRole, 'applicant');
  assert.equal(emails[0].toEmail, 'sunita.verma@gmail.com');
  assert.equal(emails[1].recipientRole, 'admin');
  assert.equal(emails[1].toEmail, 'khandanish0503@gmail.com');
  assert.equal(emails[2].recipientRole, 'donator_fundraiser');
  assert.equal(emails[0].donorSupportType, 'donator');

  const encoded = encodeGmailMimeMessage({
    to: 'khandanish0503@gmail.com',
    subject: emails[1].subject,
    bodyText: emails[1].bodyText,
  });
  assert.equal(encoded.length > 20, true);
  assert.equal(encoded.includes('+'), false);
  assert.equal(encoded.includes('/'), false);
});

test('validateAadhaarVerhoeff and generateAadhaarChecksum validate genuine Aadhaar checksum and reject invalid numbers', () => {
  // Generate a valid 12-digit Aadhaar using Verhoeff
  const prefix11 = '54891234567';
  const checksum = generateAadhaarChecksum(prefix11);
  assert.notEqual(checksum, null);
  const validAadhaar = `${prefix11}${checksum}`;

  // Validates with space formatting and without
  assert.equal(validateAadhaarVerhoeff(validAadhaar), true);
  assert.equal(validateAadhaarVerhoeff(`${validAadhaar.slice(0, 4)} ${validAadhaar.slice(4, 8)} ${validAadhaar.slice(8)}`), true);

  // Rejects invalid checksum (tampered last digit)
  const tampered = `${prefix11}${(Number(checksum) + 1) % 10}`;
  assert.equal(validateAadhaarVerhoeff(tampered), false);

  // Rejects numbers starting with 0 or 1 (UIDAI rule)
  assert.equal(validateAadhaarVerhoeff('012345678912'), false);
  assert.equal(validateAadhaarVerhoeff('123456789012'), false);

  // Rejects short or alphabetic strings
  assert.equal(validateAadhaarVerhoeff('12345'), false);
  assert.equal(validateAadhaarVerhoeff('ABCD1234EFGH'), false);
});

test('validatePanCard, validateDrivingLicence, and maskGovernmentId enforce Indian government formats', () => {
  // PAN tests
  assert.equal(validatePanCard('ABCDE1234F'), true);
  assert.equal(validatePanCard('BNZPK5412Q'), true);
  assert.equal(validatePanCard('abcde1234f'), true); // normalized uppercase
  assert.equal(validatePanCard('12345ABCDE'), false); // wrong layout
  assert.equal(validatePanCard('ABCD1234F'), false); // 9 chars instead of 10

  // Driving Licence tests
  assert.equal(validateDrivingLicence('DL0420110012345'), true);
  assert.equal(validateDrivingLicence('MH-12-2019-0004512'), true);
  assert.equal(validateDrivingLicence('12345'), false);

  // Masking tests
  assert.equal(maskGovernmentId('548912345678'), 'XXXX-XXXX-5678');
  assert.equal(maskGovernmentId('ABCDE1234F'), 'ABXXXX234F');
});

test('signJwtToken, verifyJwtToken, validateAuthCredentials, and buildAdminSubmissionSummaryEmail work accurately', () => {
  const secret = 'test-only-jwt-secret';
  const adminPassword = 'test-only-admin-password';
  const token = signJwtToken(
    {
      sub: 'user-admin-1',
      email: ADMIN_OFFICIAL_EMAIL,
      name: 'Danish Khan',
      role: 'admin',
      category: 'All Categories',
      provider: 'email_jwt',
    },
    secret,
    3600
  );

  const verified = verifyJwtToken(token, secret);
  assert.equal(verified.valid, true);
  assert.equal(verified.payload?.email, 'khandanish0503@gmail.com');
  assert.equal(verified.payload?.role, 'admin');
  assert.equal(verified.payload?.category, 'All Categories');

  // Tampered secret fails verification
  const badVerify = verifyJwtToken(token, 'wrong_secret');
  assert.equal(badVerify.valid, false);

  // Admin authentication requires the separately configured password.
  const validAdmin = validateAuthCredentials({
    mode: 'signin',
    role: 'admin',
    email: 'khandanish0503@gmail.com',
    password: adminPassword,
    category: 'All Categories',
    provider: 'email_jwt',
    adminPassword,
  });
  assert.equal(validAdmin.valid, true);
  assert.equal(validAdmin.normalizedRole, 'admin');

  const missingAdminPassword = validateAuthCredentials({
    mode: 'signin',
    role: 'admin',
    email: ADMIN_OFFICIAL_EMAIL,
    password: 'any-password',
    category: 'All Categories',
    provider: 'email_jwt',
  });
  assert.equal(missingAdminPassword.valid, false);

  const wrongAdminPass = validateAuthCredentials({
    mode: 'signin',
    role: 'admin',
    email: 'khandanish0503@gmail.com',
    password: 'WrongPassword123',
    category: 'All Categories',
    provider: 'email_jwt',
    adminPassword,
  });
  assert.equal(wrongAdminPass.valid, false);

  const wrongAdminEmail = validateAuthCredentials({
    mode: 'signin',
    role: 'admin',
    email: 'someone@gmail.com',
    password: adminPassword,
    category: 'All Categories',
    provider: 'email_jwt',
    adminPassword,
  });
  assert.equal(wrongAdminEmail.valid, false);

  // Category is required for all roles
  const missingCategory = validateAuthCredentials({
    mode: 'signup',
    role: 'donor',
    email: 'donor@example.com',
    password: 'DonorPassword123',
    category: '',
    provider: 'email_jwt',
  });
  assert.equal(missingCategory.valid, false);

  // Admin summary email builder generates structured summary to khandanish0503@gmail.com
  const summaryMail = buildAdminSubmissionSummaryEmail({
    submissionType: 'Fund Request / Campaign',
    referenceId: 'REQ-2026-901',
    submittedBy: 'Aarav Sharma',
    submittedEmail: 'aarav@example.com',
    role: 'user',
    category: 'Freelancer & Startup',
    title: 'Freelancer Portfolio & Cloud Server Setup',
    amount: 35000,
    location: 'Pune, Maharashtra',
    details: {
      'Government Identity': 'Aadhaar Card (Official Government Identity)',
      'Repayment Plan': 'Monthly Return (12 Months)',
    },
  });
  assert.equal(summaryMail.toEmail, 'khandanish0503@gmail.com');
  assert.equal(summaryMail.recipientRole, 'admin');
  assert.equal(summaryMail.bodyText.includes('REQ-2026-901'), true);
  assert.equal(summaryMail.bodyText.includes('Freelancer & Startup'), true);
});

test('validateQuickAidRequestForm and validateDonationForm provide real-time field validation for mandatory fields, email formats, and positive amounts', () => {
  // 1. Valid Quick Aid Request
  const validAid = validateQuickAidRequestForm({
    applicantName: 'Rohan Sharma',
    applicantEmail: 'rohan.sharma@gmail.com',
    title: 'Emergency Hospital & Surgery Support',
    category: 'Medical & Healthcare',
    amount: 25000,
    location: 'New Delhi',
    description: 'Urgent hospital admission support needed for cardiac surgery.',
  });
  assert.equal(validAid.isValid, true);
  assert.equal(Object.keys(validAid.errors).length, 0);
  assert.equal(validAid.validFields.applicantEmail, true);
  assert.equal(validAid.validFields.amount, true);

  // 2. Invalid Quick Aid Request (empty name, bad email, negative/zero amount, short title)
  const invalidAid = validateQuickAidRequestForm({
    applicantName: '',
    applicantEmail: 'invalid-email-format',
    title: 'Aid',
    category: '',
    amount: -500,
  });
  assert.equal(invalidAid.isValid, false);
  assert.equal(Boolean(invalidAid.errors.applicantName), true);
  assert.equal(Boolean(invalidAid.errors.applicantEmail), true);
  assert.equal(Boolean(invalidAid.errors.title), true);
  assert.equal(Boolean(invalidAid.errors.category), true);
  assert.equal(Boolean(invalidAid.errors.amount), true);

  // 3. Valid Donation Form
  const validDonation = validateDonationForm({
    amount: 1500,
    donorName: 'Danish Khan',
    donorEmail: 'khandanish0503@gmail.com',
    donorPhone: '+91 9811223344',
    panNumber: 'ABCDE1234F',
  });
  assert.equal(validDonation.isValid, true);
  assert.equal(Object.keys(validDonation.errors).length, 0);

  // 4. Invalid Donation Form (zero amount, bad email, invalid PAN)
  const invalidDonation = validateDonationForm({
    amount: 0,
    donorName: 'A',
    donorEmail: 'notanemail@',
    donorPhone: '123',
    panNumber: 'INVALIDPAN',
  });
  assert.equal(invalidDonation.isValid, false);
  assert.equal(Boolean(invalidDonation.errors.amount), true);
  assert.equal(Boolean(invalidDonation.errors.donorName), true);
  assert.equal(Boolean(invalidDonation.errors.donorEmail), true);
  assert.equal(Boolean(invalidDonation.errors.donorPhone), true);
  assert.equal(Boolean(invalidDonation.errors.panNumber), true);
});

test('exportUtils generates valid PDF (%PDF-1.4), Excel (.xls SpreadsheetML), HTML receipts, and resolves best image by caption or title', async () => {
  const {
    generateRealPdfBytes,
    generateExcelXmlContent,
    generateHtmlDocumentContent,
    resolveBestImageForCaptionOrTitle,
  } = await import('./exportUtils');

  const samplePayload = {
    title: 'Official Contribution & Aid Receipt',
    subtitle: 'SankalpSetu Universal Aid & Medical Platform',
    referenceId: 'SS-REC-2026-9901',
    issuedAt: '01 Nov 2026, 12:00 PM',
    badgeText: 'PURE DONATOR (0% • NO TAX)',
    fields: [
      { label: 'Supporter Name', value: 'Danish Khan' },
      { label: 'Amount Contributed', value: '₹10,000' },
      { label: 'Category', value: 'Medical & Blood Donation' },
    ],
    table: {
      headers: ['Installment #', 'Schedule', 'Amount'],
      rows: [
        [1, 'Year 1', '₹5,000'],
        [2, 'Year 2', '₹5,000'],
      ],
    },
    footerNote: 'Verified by SankalpSetu Chief Administrator Danish Khan',
  };

  // 1. PDF binary verification (jsPDF %PDF-1.3 / %PDF-1.4)
  const pdfBytes = generateRealPdfBytes(samplePayload);
  const pdfText = new TextDecoder().decode(pdfBytes);
  assert.equal(pdfText.startsWith('%PDF-1.'), true);
  assert.equal(pdfText.includes('%%EOF'), true);
  assert.equal(pdfText.includes('SS-REC-2026-9901'), true);
  assert.equal(pdfText.includes('Danish Khan'), true);

  // 2. Excel (.xls) SpreadsheetML verification
  const excelXml = generateExcelXmlContent(samplePayload);
  assert.equal(excelXml.includes('urn:schemas-microsoft-com:office:spreadsheet'), true);
  assert.equal(excelXml.includes('SS-REC-2026-9901'), true);
  assert.equal(excelXml.includes('Danish Khan'), true);
  assert.equal(excelXml.includes('Year 1'), true);

  // 3. HTML standalone receipt verification
  const htmlDoc = generateHtmlDocumentContent(samplePayload);
  assert.equal(htmlDoc.toLowerCase().startsWith('<!doctype html>'), true);
  assert.equal(htmlDoc.includes('SS-REC-2026-9901'), true);
  assert.equal(htmlDoc.includes('Official Contribution &amp; Aid Receipt'), true);

  // 4. Best image resolution by caption / title
  assert.equal(
    resolveBestImageForCaptionOrTitle({
      title: 'Emergency Blood Donation Camp & Doctor Booking',
      caption: 'Urgent O+ blood group needed at trauma hospital',
    }),
    '/assets/hero/blood_camp.jpg'
  );
  assert.equal(
    resolveBestImageForCaptionOrTitle({
      title: 'Freelancer SaaS Cloud Server & Laptop Grant',
      caption: 'Supporting indie web developers',
    }),
    '/assets/hero/freelancer.jpg'
  );
  assert.equal(
    resolveBestImageForCaptionOrTitle({
      title: 'B.Tech Computer Science Tuition & Scholarship',
      caption: 'First-generation student education support',
    }),
    '/assets/hero/education.jpg'
  );
  assert.equal(
    resolveBestImageForCaptionOrTitle({
      title: 'Clean Solar Drinking Water Filtration Grid',
      caption: 'Gram Panchayat rural village water supply',
    }),
    '/assets/hero/water.jpg'
  );

  // 5. XLSX binary workbook verification via SheetJS (xlsx)
  const { generateXlsxWorkbookBytes } = await import('./exportUtils');
  const xlsxBytes = generateXlsxWorkbookBytes(samplePayload);
  assert.equal(xlsxBytes.length > 500, true);
  // ZIP / OpenXML magic bytes ('PK')
  assert.equal(xlsxBytes[0], 0x50);
  assert.equal(xlsxBytes[1], 0x4b);
});

test('evaluateKycMetricsAndWarnings detects low-quality scans (blur, low resolution, dim lighting, low contrast) and invalid ID checksums', async () => {
  const { evaluateKycMetricsAndWarnings } = await import('./kycImageValidator');

  // 1. High-clarity Aadhaar scan passes with EXCELLENT grade and 0 warnings
  const excellentReport = evaluateKycMetricsAndWarnings({
    metrics: {
      width: 1200,
      height: 760,
      meanBrightness: 205,
      contrastStdDev: 56,
      sharpnessScore: 88,
    },
    documentType: 'Aadhaar Card (Official Government Identity)',
    fileName: 'official_uidai_aadhaar_card_scanned.svg',
  });
  assert.equal(excellentReport.qualityGrade, 'EXCELLENT');
  assert.equal(excellentReport.warnings.length, 0);
  assert.equal(excellentReport.overallQualityScore >= 90, true);

  // 2. Blurry, low-resolution, dim scan triggers LOW_QUALITY_WARNING with specific diagnostic codes
  const blurryReport = evaluateKycMetricsAndWarnings({
    metrics: {
      width: 320,
      height: 200,
      meanBrightness: 40,
      contrastStdDev: 16,
      sharpnessScore: 18,
      isSimulatedLowQuality: true,
    },
    documentType: 'Aadhaar Card (Official Government Identity)',
    manualIdNumber: '123412341234', // invalid Verhoeff checksum (starts with 1)
    fileName: 'low_quality_blurry_aadhaar_scan.svg',
  });
  assert.equal(blurryReport.qualityGrade, 'LOW_QUALITY_WARNING');
  assert.equal(blurryReport.canProceedWithWarning, true);
  const codes = blurryReport.warnings.map((w) => w.code);
  assert.equal(codes.includes('LOW_RESOLUTION'), true);
  assert.equal(codes.includes('BLUR_DETECTED'), true);
  assert.equal(codes.includes('POOR_LIGHTING_DARK'), true);
  assert.equal(codes.includes('LOW_CONTRAST'), true);
  assert.equal(codes.includes('POTENTIAL_INVALID_ID_NUMBER'), true);

  // 3. Unrelated / fake document triggers INVALID_DOCUMENT critical warning
  const fakeReport = evaluateKycMetricsAndWarnings({
    metrics: {
      width: 600,
      height: 380,
      meanBrightness: 210,
      contrastStdDev: 50,
      sharpnessScore: 80,
      isSimulatedFake: true,
    },
    documentType: 'Aadhaar Card (Official Government Identity)',
    fileName: 'random_unrelated_photo.svg',
  });
  assert.equal(fakeReport.qualityGrade, 'INVALID_DOCUMENT');
  assert.equal(fakeReport.canProceedWithWarning, false);

  // 4. Invalid PAN format triggers POTENTIAL_INVALID_ID_NUMBER warning even on a clear scan
  const badPanReport = evaluateKycMetricsAndWarnings({
    metrics: {
      width: 900,
      height: 560,
      meanBrightness: 200,
      contrastStdDev: 55,
      sharpnessScore: 88,
    },
    documentType: 'PAN Card (Income Tax Official Identity)',
    manualIdNumber: 'INVALID999',
  });
  assert.equal(
    badPanReport.warnings.some((w) => w.code === 'POTENTIAL_INVALID_ID_NUMBER'),
    true
  );

  // 5. Valid PAN format passes with EXCELLENT grade and 0 warnings
  const validPanReport = evaluateKycMetricsAndWarnings({
    metrics: {
      width: 900,
      height: 560,
      meanBrightness: 200,
      contrastStdDev: 55,
      sharpnessScore: 88,
    },
    documentType: 'PAN Card (Income Tax Official Identity)',
    manualIdNumber: 'ABCDE1234F',
  });
  assert.equal(validPanReport.qualityGrade, 'EXCELLENT');
  assert.equal(validPanReport.warnings.length, 0);
});

test('buildConsolidatedTaxStatementSummary and generateConsolidatedTaxPdfBytes consolidate all past donation receipts into a single 80G tax PDF', async () => {
  const {
    buildConsolidatedTaxStatementSummary,
    GOVERNMENT_VERIFIED_DOCTORS_DIRECTORY,
    validateNmcDoctorRegistration,
  } = await import('./donationLogic');
  const { generateConsolidatedTaxPdfBytes } = await import('./exportUtils');

  const pastDonations = [
    {
      id: 1,
      campaignId: 101,
      campaignTitle: 'Emergency Pediatric Heart Surgery — AIIMS New Delhi',
      donorName: 'Danish Khan',
      donorEmail: 'khandanish0503@gmail.com',
      panNumber: 'ABCDE1234F',
      amount: 15000,
      tipAmount: 0,
      totalPaid: 15000,
      paymentMethod: 'UPI' as const,
      status: 'paid' as const,
      gatewayOrderId: 'order_tax_101',
      receiptNumber: 'SS-80G-2026-101',
      taxEligible80G: true,
      returnOption: 'no_return' as const,
      createdAt: '2026-02-15',
    },
    {
      id: 2,
      campaignId: 102,
      campaignTitle: 'Rural Solar Water Grid — Barmer Village',
      donorName: 'Danish Khan',
      donorEmail: 'khandanish0503@gmail.com',
      panNumber: 'ABCDE1234F',
      amount: 25000,
      tipAmount: 0,
      totalPaid: 25000,
      paymentMethod: 'NetBanking' as const,
      status: 'paid' as const,
      gatewayOrderId: 'order_tax_102',
      receiptNumber: 'SS-80G-2026-102',
      taxEligible80G: true,
      returnOption: 'yearly' as const,
      createdAt: '2026-03-10',
    },
  ];

  const summary = buildConsolidatedTaxStatementSummary(pastDonations, {
    donorName: 'Danish Khan',
    donorEmail: 'khandanish0503@gmail.com',
    donorPan: 'ABCDE1234F',
    financialYear: 'FY 2026-27',
  });

  assert.equal(summary.receiptCount, 2);
  assert.equal(summary.totalDonatedAmount, 40000);
  assert.equal(summary.totalEligible80GDeduction, 20000);
  assert.equal(summary.totalEstimatedTaxSaved, 6000);
  assert.equal(summary.pureGrantAmount, 15000);
  assert.equal(summary.lenderSupportAmount, 25000);

  const pdfBytes = generateConsolidatedTaxPdfBytes(pastDonations, {
    donorName: 'Danish Khan',
    donorEmail: 'khandanish0503@gmail.com',
    donorPan: 'ABCDE1234F',
    financialYear: 'FY 2026-27',
  });
  const pdfText = new TextDecoder().decode(pdfBytes);
  assert.equal(pdfText.startsWith('%PDF-1.'), true);
  assert.equal(pdfText.includes('SS-80G-2026-101'), true);
  assert.equal(pdfText.includes('SS-80G-2026-102'), true);
  assert.equal(pdfText.includes('ABCDE1234F'), true);

  // Verify real Government NMC-IMR doctors directory has zero mock data
  assert.equal(GOVERNMENT_VERIFIED_DOCTORS_DIRECTORY.length >= 6, true);
  for (const doc of GOVERNMENT_VERIFIED_DOCTORS_DIRECTORY) {
    assert.equal(doc.nmcVerificationStatus, 'GOVT_NMC_VERIFIED');
    assert.equal(Boolean(doc.stateMedicalCouncil), true);
    assert.equal(Boolean(doc.hprId && doc.hprId.endsWith('@hpr.abdm')), true);
    assert.equal(Boolean(doc.governmentHospital), true);
  }

  // Validate NMC registration check rejects mock names & accepts real State Medical Council numbers
  const mockCheck = validateNmcDoctorRegistration({
    name: 'Dr. Mock Placeholder',
    regNumber: 'DMC/R/04892',
    governmentHospital: 'AIIMS New Delhi',
  });
  assert.equal(mockCheck.valid, false);

  const realCheck = validateNmcDoctorRegistration({
    name: 'Dr. Randeep Guleria',
    regNumber: 'DMC/R/04892',
    governmentHospital: 'AIIMS New Delhi',
  });
  assert.equal(realCheck.valid, true);
  assert.equal(realCheck.stateMedicalCouncil.includes('Delhi Medical Council'), true);
});

test('RBAC (Role-Based Access Control) enforces 5 roles (admin, ngo_admin, donor, fundraiser, user), restricts admin to khandanish0503@gmail.com, and checks granular permissions', async () => {
  const {
    evaluateRbacAccess,
    hasRolePermission,
    RBAC_ROLE_DEFINITIONS,
  } = await import('./donationLogic');

  // 1. All 5 roles defined (admin, ngo_admin, donor, fundraiser, user)
  assert.equal(Object.keys(RBAC_ROLE_DEFINITIONS).length, 5);

  // 2. Authorized Admin (khandanish0503@gmail.com) has full access to admin:dashboard, admin:doctors_manage, and donor:export_consolidated_tax_pdf
  const adminAccess = evaluateRbacAccess({
    role: 'admin',
    email: 'khandanish0503@gmail.com',
    allowedRoles: ['admin'],
    requiredPermission: 'admin:doctors_manage',
  });
  assert.equal(adminAccess.allowed, true);
  assert.equal(adminAccess.effectiveRole, 'admin');
  assert.equal(hasRolePermission('admin', 'admin:audit_logs', 'khandanish0503@gmail.com'), true);

  // 3. Unauthorized email attempting 'admin' role is strictly rejected
  const spoofedAdmin = evaluateRbacAccess({
    role: 'admin',
    email: 'intruder@example.com',
    allowedRoles: ['admin'],
    requiredPermission: 'admin:dashboard',
  });
  assert.equal(spoofedAdmin.allowed, false);
  assert.equal(Boolean(spoofedAdmin.reason?.includes('restricted to platform owner')), true);

  // 4. Donor has 'donor:export_consolidated_tax_pdf' and 'donor:contribute', but lacks 'admin:campaigns_approve_delete'
  const donorTaxAccess = evaluateRbacAccess({
    role: 'donor',
    email: 'donor@sankalpsetu.org',
    allowedRoles: ['donor', 'fundraiser', 'admin'],
    requiredPermission: 'donor:export_consolidated_tax_pdf',
  });
  assert.equal(donorTaxAccess.allowed, true);

  const donorAdminAttempt = evaluateRbacAccess({
    role: 'donor',
    email: 'donor@sankalpsetu.org',
    allowedRoles: ['admin'],
    requiredPermission: 'admin:campaigns_approve_delete',
  });
  assert.equal(donorAdminAttempt.allowed, false);

  // 5. NGO Partner (ngo_admin) has 'ngo:manage_outreach' and 'ngo:connect_government_ngos'
  const ngoPartnerAccess = evaluateRbacAccess({
    role: 'ngo_admin',
    email: 'partner@ngodarpan.gov.in',
    allowedRoles: ['ngo_admin', 'admin'],
    requiredPermission: 'ngo:manage_outreach',
  });
  assert.equal(ngoPartnerAccess.allowed, true);
  assert.equal(ngoPartnerAccess.effectiveRole, 'ngo_admin');
});

test('GOVERNMENT_VERIFIED_NGOS_DIRECTORY, calculateNgoCollectiveMetrics, and validateDarpanNgoRegistration compute collective NGO metrics and verify NITI Aayog DARPAN NGOs', async () => {
  const {
    GOVERNMENT_VERIFIED_NGOS_DIRECTORY,
    calculateNgoCollectiveMetrics,
    validateDarpanNgoRegistration,
  } = await import('./donationLogic');

  // 1. Verify all 6 real Government-Verified Indian NGOs have DARPAN IDs, 80G URNs, and CSR-1 numbers
  assert.equal(GOVERNMENT_VERIFIED_NGOS_DIRECTORY.length, 6);
  for (const ngo of GOVERNMENT_VERIFIED_NGOS_DIRECTORY) {
    assert.equal(ngo.verified, true);
    assert.equal(/^[A-Z]{2}\/\d{4}\/\d{5,8}$/.test(ngo.darpanId), true);
    assert.equal(Boolean(ngo.reg80g), true);
    assert.equal(Boolean(ngo.csr1RegNo), true);
  }

  // 2. Collective metrics across campaigns (Pure Grant vs 0% Lender split, completion %, filtering by organizationId)
  const sampleCampaigns = [
    {
      id: 1,
      organizationId: 1,
      organizationName: 'Goonj (NITI Aayog DARPAN & 80G Verified)',
      organization80G: 'AAATG4519HE20214',
      title: 'Marathwada Clean Water Grid',
      category: 'Village & Rural',
      goalAmount: 100000,
      raisedAmount: 60000,
      donorCount: 15,
      returnOption: 'no_return',
      verified: true,
      updates: [{ id: 1, title: 'Milestone 1', body: 'Completed' }],
    },
    {
      id: 2,
      organizationId: 2,
      organizationName: 'The Akshaya Patra Foundation',
      organization80G: 'AAATT6468PE20211',
      title: 'STEM School Nutrition & Laptop Grant',
      category: 'Education & Skills',
      goalAmount: 50000,
      raisedAmount: 40000,
      donorCount: 10,
      returnOption: 'yearly',
      verified: true,
      updates: [],
    },
  ];

  const allMetrics = calculateNgoCollectiveMetrics(
    sampleCampaigns,
    GOVERNMENT_VERIFIED_NGOS_DIRECTORY,
    'all'
  );
  assert.equal(allMetrics.totalCampaignsCount, 2);
  assert.equal(allMetrics.totalGoalAmount, 150000);
  assert.equal(allMetrics.totalRaisedAmount, 100000);
  assert.equal(allMetrics.overallCompletionPct, 67);
  assert.equal(allMetrics.remainingFundingGap, 50000);
  assert.equal(allMetrics.totalDonorsCount, 25);
  assert.equal(allMetrics.pureGrantCampaignsCount, 1);
  assert.equal(allMetrics.pureGrantRaisedAmount, 60000);
  assert.equal(allMetrics.lenderCampaignsCount, 1);
  assert.equal(allMetrics.lenderRaisedAmount, 40000);
  assert.equal(allMetrics.totalOutreachUpdatesCount, 1);
  assert.equal(allMetrics.connectedGovtNgosCount, 4);

  const goonjMetrics = calculateNgoCollectiveMetrics(
    sampleCampaigns,
    GOVERNMENT_VERIFIED_NGOS_DIRECTORY,
    1
  );
  assert.equal(goonjMetrics.totalCampaignsCount, 1);
  assert.equal(goonjMetrics.totalRaisedAmount, 60000);
  assert.equal(goonjMetrics.overallCompletionPct, 60);

  // 3. DARPAN ID validation
  const validDarpan = validateDarpanNgoRegistration({
    name: 'Narayan Seva Sansthan',
    darpanId: 'RJ/2009/0001842',
    reg80g: 'AAATN9182CE20214',
    pan: 'AAATN9182C',
  });
  assert.equal(validDarpan.valid, true);

  const invalidDarpan = validateDarpanNgoRegistration({
    name: 'Mock Placeholder NGO',
    darpanId: 'INVALID-123',
  });
  assert.equal(invalidDarpan.valid, false);
});

test('HERO_BANNER_PHOTO_SOURCES and buildQwenHeroBannerPrompt support Upload from Computer, Take Photo, and In-Built Qwen AI (Qwen/Qwen-Image-2.1)', () => {
  assert.equal(HERO_BANNER_PHOTO_SOURCES.length, 3);
  assert.deepEqual(
    HERO_BANNER_PHOTO_SOURCES.map((s) => s.id),
    ['upload', 'camera', 'qwen_ai']
  );
  const qwenOption = HERO_BANNER_PHOTO_SOURCES.find((s) => s.id === 'qwen_ai');
  assert.equal(qwenOption?.modelId, 'Qwen/Qwen-Image-2.1');

  assert.equal(resolveHeroThemeFromText('Emergency Blood Transfusion Camp'), 'blood_camp');
  assert.equal(resolveHeroThemeFromText('Freelancer SaaS Website Launch'), 'freelancer');
  assert.equal(resolveHeroThemeFromText('STEM School Education Lab'), 'education');

  const built = buildQwenHeroBannerPrompt({
    title: 'Rural Telemedicine & Solar Water Station',
    categoryBadge: 'Medical & Village Aid',
    location: 'Latur, Maharashtra',
    caption: 'Providing clean water and diagnostic care',
  });
  assert.equal(built.model, 'Qwen/Qwen-Image-2.1');
  assert.equal(built.prompt.includes('Rural Telemedicine & Solar Water Station'), true);
  assert.equal(built.prompt.includes('Latur, Maharashtra'), true);
});

test('Strict NMC Doctor & KYC Verification rejects dummy doctor names, sequential numbers, consonant mashes, and invalid Aadhaar/PAN/phone inputs', async () => {
  const {
    isLikelyRealHumanName,
    validateNmcDoctorRegistration,
    validateRealKycSubmission,
  } = await import('./donationLogic');

  // 1. Human name checks
  assert.equal(isLikelyRealHumanName('Dr. Randeep Guleria'), true);
  assert.equal(isLikelyRealHumanName('Imran Ansari'), true);
  assert.equal(isLikelyRealHumanName('dummy'), false);
  assert.equal(isLikelyRealHumanName('Dr. Test User'), false);
  assert.equal(isLikelyRealHumanName('Dr. bcdfg hjklm'), false);
  assert.equal(isLikelyRealHumanName('Singleword'), false);

  // 2. NMC Doctor Registration checks
  const dummyDoctor1 = validateNmcDoctorRegistration({
    name: 'Dr. Dummy Doctor',
    regNumber: 'DMC/R/04892',
  });
  assert.equal(dummyDoctor1.valid, false);

  const dummyDoctor2 = validateNmcDoctorRegistration({
    name: 'Dr. Sanjay Verma',
    regNumber: 'DMC-1234',
  });
  assert.equal(dummyDoctor2.valid, false);

  const dummyDoctor3 = validateNmcDoctorRegistration({
    name: 'Dr. Sanjay Verma',
    regNumber: 'DMC-00000',
  });
  assert.equal(dummyDoctor3.valid, false);

  const strictUnregisteredLookup = validateNmcDoctorRegistration({
    name: 'Dr. Unregistered Person',
    regNumber: 'DMC/R/58291',
    strictRegistryLookup: true,
  });
  assert.equal(strictUnregisteredLookup.valid, false);

  const validRegisteredLookup = validateNmcDoctorRegistration({
    name: 'DMC/R/04892',
    regNumber: 'DMC/R/04892',
    strictRegistryLookup: true,
  });
  assert.equal(validRegisteredLookup.valid, true);
  assert.equal(validRegisteredLookup.matchedDoctor?.name, 'Dr. Randeep Guleria');

  // 3. Real KYC & Medical form submission checks
  const badKycAadhaar = validateRealKycSubmission({
    documentType: 'Aadhaar Card',
    manualIdNumber: '123456789012',
    applicantName: 'Imran Ansari',
  });
  assert.equal(badKycAadhaar.valid, false);

  const badKycPhone = validateRealKycSubmission({
    documentType: 'Aadhaar Card',
    applicantName: 'Imran Ansari',
    phone: '9876543210',
    location: 'Lucknow',
  });
  assert.equal(badKycPhone.valid, false);

  const validKyc = validateRealKycSubmission({
    documentType: 'PAN Card',
    manualIdNumber: 'ABCDE1234F',
    applicantName: 'Danish Khan',
    phone: '+91 9820144120',
    location: 'Mumbai, Maharashtra',
  });
  assert.equal(validKyc.valid, true);

  // 4. Real Indian State Medical Council formats including Dr. Rinchin Dorjee Khrime (APMC/R/0530)
  const rinchinDoctor = validateNmcDoctorRegistration({
    name: 'Dr. Rinchin Dorjee Khrime',
    regNumber: 'APMC/R/0530',
    governmentHospital: 'Arunachal Pradesh Medical',
  });
  assert.equal(rinchinDoctor.valid, true);
  assert.equal(rinchinDoctor.normalizedRegNumber, 'APMC/R/0530');
  assert.equal(
    rinchinDoctor.stateMedicalCouncil,
    'Arunachal Pradesh Medical Council (NMC-IMR)'
  );

  // Also test other real Indian State Medical Council slash/hyphen/numeric formats
  const slashRegFormat = validateNmcDoctorRegistration({
    name: 'Dr. Naresh Trehan',
    regNumber: 'UPMC/R/08419',
    governmentHospital: 'King George Medical University, Lucknow',
  });
  assert.equal(slashRegFormat.valid, true);

  const numericWithCouncilFormat = validateNmcDoctorRegistration({
    name: 'Dr.V. Shanta',
    regNumber: 'TNMC/F/48219',
    governmentHospital: 'Tamil Nadu Medical Council, Chennai',
  });
  assert.equal(numericWithCouncilFormat.valid, true);
});

test('Mandatory Government Identity submission validation blocks ₹10,000 / campaign requests without verified Official Government ID and validates signed verification tokens', async () => {
  const {
    resolveGovernmentVerificationPortal,
    signGovernmentIdVerificationToken,
    verifyGovernmentIdVerificationToken,
    validateMandatoryCampaignGovIdSubmission,
    generateAadhaarChecksum,
  } = await import('./donationLogic');

  // 1. Official Government Verification Portal resolution
  const aadhaarPortal = resolveGovernmentVerificationPortal(
    'Aadhaar Card (Official Government Identity)'
  );
  assert.equal(aadhaarPortal.portalUrl.includes('uidai.gov.in'), true);

  const panPortal = resolveGovernmentVerificationPortal(
    'PAN Card (Official Government Identity)'
  );
  assert.equal(panPortal.portalUrl.includes('incometax.gov.in'), true);

  // 2. Submitting ₹10,000 request WITHOUT uploading/verifying a Government Official Identity is rejected
  const unuploadedAttempt = validateMandatoryCampaignGovIdSubmission({
    documentType: 'Aadhaar Card (Official Government Identity)',
    documentId: 'AADHAAR-VERIFIED-9821',
    govIdVerified: false,
    applicantName: 'Rohan Sharma',
  });
  assert.equal(unuploadedAttempt.valid, false);
  assert.equal(
    Boolean(unuploadedAttempt.error?.includes('Mandatory')),
    true
  );

  // 3. Submitting with placeholder ID even if govIdVerified=true is rejected
  const placeholderAttempt = validateMandatoryCampaignGovIdSubmission({
    documentType: 'Aadhaar Card (Official Government Identity)',
    documentId: 'XXXX-XXXX-4829',
    govIdVerified: true,
    applicantName: 'Rohan Sharma',
  });
  assert.equal(placeholderAttempt.valid, false);

  // 4. Signing and verifying an authentic Government ID token succeeds
  const prefix = '54891234567';
  const chk = generateAadhaarChecksum(prefix) ?? 8;
  const validAadhaar = `${prefix}${chk}`;
  const maskedAadhaar = `XXXX-XXXX-${validAadhaar.slice(-4)}`;

  const token = signGovernmentIdVerificationToken({
    documentType: 'Aadhaar Card (Official Government Identity)',
    maskedIdNumber: maskedAadhaar,
    applicantName: 'Rohan Sharma',
  });
  assert.equal(token.startsWith('govid_ver_'), true);
  const verifiedTokenInfo = verifyGovernmentIdVerificationToken(token);
  assert.equal(verifiedTokenInfo.valid, true);
  assert.equal(verifiedTokenInfo.maskedIdNumber, maskedAadhaar);

  const verifiedAttempt = validateMandatoryCampaignGovIdSubmission({
    documentType: 'Aadhaar Card (Official Government Identity)',
    documentId: maskedAadhaar,
    rawIdNumber: validAadhaar,
    govIdVerified: true,
    verificationToken: token,
    applicantName: 'Rohan Sharma',
  });
  assert.equal(verifiedAttempt.valid, true);
});

test('In-Built SankalpSetu Chatbot engine supports Max/Google Search/Medical/Website modes and returns distinct, question-specific answers for different medical, doctor, calculation, KYC, and live search queries', async () => {
  const {
    CHATBOT_MODES,
    CHATBOT_ATTACHMENT_OPTIONS,
    buildSankalpSetuChatbotSystemInstruction,
    generateSmartChatbotFallbackResponse,
  } = await import('./donationLogic');

  assert.equal(CHATBOT_MODES.length, 4);
  assert.equal(CHATBOT_MODES[0].id, 'max');
  assert.equal(CHATBOT_MODES[0].shortLabel, 'Max');
  assert.equal(CHATBOT_MODES[0].useGoogleSearch, true);

  assert.equal(CHATBOT_ATTACHMENT_OPTIONS.length, 3);
  assert.deepEqual(
    CHATBOT_ATTACHMENT_OPTIONS.map((o) => o.id),
    ['upload', 'camera', 'sample_doc']
  );

  const sysPrompt = buildSankalpSetuChatbotSystemInstruction({
    totalRaised: 1950000,
    activeCampaignCount: 7,
    verifiedDoctorCount: 7,
  });
  assert.equal(sysPrompt.includes('khandanish0503@gmail.com'), true);
  assert.equal(sysPrompt.includes('Pure Donator'), true);
  assert.equal(sysPrompt.includes('Aadhaar Card'), true);

  // 1. Paracetamol dosage query -> specific Paracetamol answer
  const paracetamolRes = generateSmartChatbotFallbackResponse({
    message: 'What is the safe dosage of paracetamol for fever?',
    mode: 'medical',
  });
  assert.equal(paracetamolRes.reply.includes('Paracetamol (Acetaminophen)'), true);
  assert.equal(paracetamolRes.reply.includes('4,000 mg'), true);

  // 2. Dengue query -> specific Dengue NS1 & platelet answer (different from Paracetamol)
  const dengueRes = generateSmartChatbotFallbackResponse({
    message: 'What are the symptoms and platelet rules for dengue fever?',
    mode: 'medical',
  });
  assert.equal(dengueRes.reply.includes('Dengue NS1 Antigen'), true);
  assert.notEqual(paracetamolRes.reply, dengueRes.reply);

  // 3. Specific Doctor query -> Dr. Rinchin Dorjee Khrime profile
  const doctorRes = generateSmartChatbotFallbackResponse({
    message: 'Who is Dr. Rinchin Dorjee Khrime and how is he verified?',
    mode: 'max',
  });
  assert.equal(doctorRes.reply.includes('APMC/R/0530'), true);
  assert.equal(doctorRes.reply.includes('Arunachal Pradesh Medical Council'), true);
  assert.notEqual(doctorRes.reply, dengueRes.reply);

  // 4. Repayment calculation query for ₹24,000 over 2 years -> computes exact ₹12,000/year and ₹1,000/month
  const calcRes = generateSmartChatbotFallbackResponse({
    message: 'If I raise 24000 for 2 years how much do I return per month or year?',
    mode: 'website',
  });
  assert.equal(calcRes.reply.includes('₹24,000'), true);
  assert.equal(calcRes.reply.includes('₹12,000'), true);
  assert.equal(calcRes.reply.includes('₹1,000'), true);
  assert.notEqual(calcRes.reply, doctorRes.reply);

  // 5. Mandatory Government ID / Aadhaar KYC query
  const kycRes = generateSmartChatbotFallbackResponse({
    message: 'Why is Aadhaar or PAN government ID mandatory before submitting?',
    mode: 'website',
  });
  assert.equal(kycRes.reply.includes('Verhoeff'), true);
  assert.equal(kycRes.reply.includes('myaadhaar.uidai.gov.in'), true);
  assert.notEqual(kycRes.reply, calcRes.reply);

  // 6. Live Web Search snippets integration for open-ended queries
  const liveSearchRes = generateSmartChatbotFallbackResponse({
    message: 'Tell me about Pradhan Mantri Bhartiya Janaushadhi Pariyojana generic medicines',
    mode: 'google_search',
    liveSearchSnippets: [
      {
        title: 'Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP)',
        snippet:
          'PMBJP is a campaign launched by the Department of Pharmaceuticals, Government of India, to provide quality generic medicines at affordable prices.',
        uri: 'https://janaushadhi.gov.in/',
        sourceType: 'wikipedia',
      },
    ],
  });
  assert.equal(liveSearchRes.reply.includes('Department of Pharmaceuticals'), true);
  assert.equal(
    liveSearchRes.sources.some((s) => s.uri === 'https://janaushadhi.gov.in/'),
    true
  );

  // 7. Attachment analysis
  const attachmentRes = generateSmartChatbotFallbackResponse({
    message: 'Analyze my medical prescription',
    attachmentName: 'aiims_prescription.png',
    mode: 'max',
  });
  assert.equal(attachmentRes.reply.includes('aiims_prescription.png'), true);
});




