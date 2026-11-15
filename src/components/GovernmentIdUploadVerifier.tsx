import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileText,
  RefreshCw,
  Sparkles,
  X,
  Lock,
  ScanLine,
  ExternalLink,
} from 'lucide-react';
import {
  OFFICIAL_GOVERNMENT_IDENTITIES,
  GovernmentIdVerificationResult,
  generateAadhaarChecksum,
  resolveGovernmentVerificationPortal,
} from '../utils/donationLogic';
import {
  analyzeUploadedKycImage,
  evaluateKycMetricsAndWarnings,
  KycImageQualityReport,
} from '../utils/kycImageValidator';

interface GovernmentIdUploadVerifierProps {
  selectedDocType: string;
  onDocTypeChange: (docType: string) => void;
  applicantName: string;
  onVerificationComplete: (result: GovernmentIdVerificationResult | null) => void;
  verifiedResult: GovernmentIdVerificationResult | null;
  className?: string;
  required?: boolean;
}

// Generates an authentic SVG sample data-URI for UIDAI Aadhaar demonstration
function createSampleAadhaarDataUri(name: string): string {
  const prefix = '54891234567';
  const chk = generateAadhaarChecksum(prefix) ?? 8;
  const num = `${prefix}${chk}`;
  const formattedNum = `${num.slice(0, 4)} ${num.slice(4, 8)} ${num.slice(8)}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fffdfa"/>
        <stop offset="50%" stop-color="#fefcf8"/>
        <stop offset="100%" stop-color="#f8f4ed"/>
      </linearGradient>
      <pattern id="guilloche" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 0 10 Q 5 0, 10 10 T 20 10" fill="none" stroke="#f0e6d6" stroke-width="0.8"/>
      </pattern>
    </defs>
    
    <!-- Outer Card Frame -->
    <rect width="600" height="380" rx="16" fill="url(#bg)" stroke="#991B1B" stroke-width="3"/>
    <rect x="8" y="8" width="584" height="364" rx="12" fill="url(#guilloche)"/>

    <!-- Top Trilateral Band -->
    <rect x="8" y="8" width="584" height="6" fill="#F97316"/>
    <rect x="8" y="14" width="584" height="6" fill="#FFFFFF"/>
    <rect x="8" y="20" width="584" height="6" fill="#15803D"/>

    <!-- Official Header Bilingual -->
    <g transform="translate(30, 42)">
      <text font-family="sans-serif" font-weight="bold" font-size="14" fill="#991B1B">भारत सरकार</text>
      <text x="0" y="16" font-family="sans-serif" font-weight="bold" font-size="12" fill="#1F2937">GOVERNMENT OF INDIA</text>
    </g>

    <!-- Ashoka Lion Capital (Emblem Placeholder Icon) -->
    <g transform="translate(285, 36)">
      <circle cx="15" cy="15" r="14" fill="#FEF3C7" stroke="#991B1B" stroke-width="1.5"/>
      <path d="M 15 5 L 18 12 L 25 12 L 20 17 L 22 24 L 15 20 L 8 24 L 10 17 L 5 12 L 12 12 Z" fill="#991B1B"/>
    </g>

    <!-- UIDAI Sunburst Logo -->
    <g transform="translate(490, 36)">
      <text font-family="sans-serif" font-weight="bold" font-size="11" fill="#991B1B" text-anchor="middle">मेरा आधार</text>
      <text x="0" y="14" font-family="sans-serif" font-size="10" fill="#1F2937" text-anchor="middle">मेरी पहचान</text>
    </g>

    <line x1="20" y1="74" x2="580" y2="74" stroke="#D1D5DB" stroke-width="1"/>

    <!-- Cardholder Portrait Box -->
    <rect x="35" y="95" width="115" height="145" rx="8" fill="#E5E7EB" stroke="#9CA3AF" stroke-width="1.5"/>
    <circle cx="92.5" cy="140" r="28" fill="#9CA3AF"/>
    <path d="M 55 220 Q 92.5 180 130 220" fill="#6B7280"/>
    <rect x="35" y="245" width="115" height="18" fill="#1F6F5B" rx="4"/>
    <text x="92.5" y="258" font-family="sans-serif" font-size="9" font-weight="bold" fill="#ffffff" text-anchor="middle">UIDAI VERIFIED</text>

    <!-- Details Column -->
    <g transform="translate(175, 110)" font-family="sans-serif">
      <text font-size="11" fill="#6B7280" font-weight="bold">नाम / Name:</text>
      <text y="20" font-size="18" font-weight="bold" fill="#111827">${name || 'DANISH KHAN'}</text>
      
      <text y="50" font-size="11" fill="#6B7280" font-weight="bold">जन्म तिथि / DOB:</text>
      <text x="110" y="50" font-size="13" font-weight="bold" fill="#1F2937">05/03/1998</text>

      <text y="75" font-size="11" fill="#6B7280" font-weight="bold">लिंग / Gender:</text>
      <text x="110" y="75" font-size="13" font-weight="bold" fill="#1F2937">पुरुष / MALE</text>

      <text y="105" font-size="11" fill="#6B7280" font-weight="bold">पहचान प्रकार / Type:</text>
      <text x="110" y="105" font-size="12" font-weight="bold" fill="#15803D">ORIGINAL OFFICIAL AADHAAR</text>
    </g>

    <!-- Secure QR Code Box -->
    <rect x="460" y="105" width="105" height="105" rx="8" fill="#ffffff" stroke="#9CA3AF" stroke-width="1.5"/>
    <rect x="470" y="115" width="22" height="22" fill="#111827"/>
    <rect x="474" y="119" width="14" height="14" fill="#ffffff"/>
    <rect x="477" y="122" width="8" height="8" fill="#111827"/>
    <rect x="533" y="115" width="22" height="22" fill="#111827"/>
    <rect x="537" y="119" width="14" height="14" fill="#ffffff"/>
    <rect x="540" y="122" width="8" height="8" fill="#111827"/>
    <rect x="470" y="178" width="22" height="22" fill="#111827"/>
    <rect x="474" y="182" width="14" height="14" fill="#ffffff"/>
    <rect x="477" y="185" width="8" height="8" fill="#111827"/>
    <rect x="502" y="125" width="12" height="12" fill="#111827"/>
    <rect x="518" y="145" width="16" height="8" fill="#111827"/>
    <rect x="502" y="165" width="28" height="10" fill="#111827"/>
    <rect x="535" y="180" width="18" height="18" fill="#111827"/>

    <!-- Bottom Red Banner with 12-Digit Aadhaar (Verhoeff Verified) -->
    <rect x="8" y="295" width="584" height="60" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1"/>
    <text x="300" y="338" font-family="Courier, monospace" font-size="28" font-weight="bold" fill="#991B1B" text-anchor="middle" letter-spacing="4">${formattedNum}</text>

    <!-- Microtext Security Line -->
    <text x="300" y="370" font-family="sans-serif" font-size="9" fill="#6B7280" text-anchor="middle">
      भारतीय विशिष्ट पहचान प्राधिकरण • UNIQUE IDENTIFICATION AUTHORITY OF INDIA • VERHOEFF CHECKSUM VALIDATED
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Generates a low-quality / blurry / dim identity scan to demonstrate KYC image quality warnings
function createLowQualityBlurrySampleDataUri(name: string): string {
  const prefix = '54891234567';
  const chk = generateAadhaarChecksum(prefix) ?? 8;
  const num = `${prefix}${chk}`;
  const formattedNum = `${num.slice(0, 4)} ${num.slice(4, 8)} ${num.slice(8)}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">
    <defs>
      <filter id="motionBlur" x="0" y="0">
        <feGaussianBlur in="SourceGraphic" stdDeviation="1.9" />
      </filter>
    </defs>
    <!-- Low-Quality Blurry Scan Simulation -->
    <rect width="320" height="200" rx="10" fill="#2A2D34" stroke="#4B5563" stroke-width="2"/>
    <g filter="url(#motionBlur)" opacity="0.65">
      <text x="20" y="32" font-family="sans-serif" font-weight="bold" font-size="10" fill="#9CA3AF">GOVERNMENT OF INDIA • UIDAI</text>
      <rect x="20" y="48" width="55" height="68" rx="4" fill="#374151"/>
      <text x="90" y="68" font-family="sans-serif" font-size="11" font-weight="bold" fill="#D1D5DB">${name || 'DANISH KHAN'}</text>
      <text x="90" y="88" font-family="sans-serif" font-size="9" fill="#9CA3AF">DOB: 05/03/1998</text>
      <text x="160" y="155" font-family="Courier, monospace" font-size="15" font-weight="bold" fill="#D1D5DB" text-anchor="middle">${formattedNum}</text>
    </g>
    <rect x="16" y="168" width="288" height="22" rx="4" fill="#78350F"/>
    <text x="160" y="182" font-family="sans-serif" font-size="7.5" font-weight="bold" fill="#FDE68A" text-anchor="middle">
      LOW-QUALITY BLURRY SCAN SIMULATION (320×200px • DIM &amp; OUT OF FOCUS)
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Generates an invalid / fake document sample to test fraud rejection
function createSampleFakeDataUri(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
    <rect width="600" height="380" fill="#E2E8F0"/>
    <text x="300" y="140" font-family="sans-serif" font-size="22" font-weight="bold" fill="#475569" text-anchor="middle">
      RANDOM INTERNET PICTURE / UNRELATED RECEIPT
    </text>
    <text x="300" y="190" font-family="sans-serif" font-size="14" fill="#64748B" text-anchor="middle">
      (No UIDAI Header, No Ashoka Emblem, No Verhoeff 12-digit number)
    </text>
    <rect x="180" y="230" width="240" height="40" rx="8" fill="#EF4444"/>
    <text x="300" y="255" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">
      ANTI-FRAUD REJECTION TEST
    </text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Generates an authentic SVG sample data-URI for Income Tax PAN Card demonstration
function createSamplePanDataUri(name: string, panNumber = 'ABCDE1234F'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
    <defs>
      <linearGradient id="panBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#E0F2FE"/>
        <stop offset="50%" stop-color="#BAE6FD"/>
        <stop offset="100%" stop-color="#FEF3C7"/>
      </linearGradient>
    </defs>
    <rect width="600" height="380" rx="16" fill="url(#panBg)" stroke="#0369A1" stroke-width="3"/>
    <g transform="translate(30, 42)" font-family="sans-serif">
      <text font-weight="bold" font-size="15" fill="#0F172A">आयकर विभाग • INCOME TAX DEPARTMENT</text>
      <text y="20" font-weight="bold" font-size="13" fill="#0369A1">भारत सरकार • GOVT. OF INDIA</text>
    </g>
    <line x1="20" y1="78" x2="580" y2="78" stroke="#7DD3FC" stroke-width="1.5"/>
    <rect x="35" y="100" width="110" height="135" rx="8" fill="#F8FAFC" stroke="#0284C7" stroke-width="1.5"/>
    <circle cx="90" cy="145" r="26" fill="#64748B"/>
    <path d="M 55 215 Q 90 180 125 215" fill="#475569"/>
    <g transform="translate(170, 115)" font-family="sans-serif">
      <text font-size="11" fill="#0369A1" font-weight="bold">नाम / Name</text>
      <text y="20" font-size="18" font-weight="bold" fill="#0F172A">${(name || 'DANISH KHAN').toUpperCase()}</text>
      <text y="55" font-size="11" fill="#0369A1" font-weight="bold">जन्म की तारीख / Date of Birth</text>
      <text y="74" font-size="14" font-weight="bold" fill="#0F172A">05/03/1998</text>
      <text y="110" font-size="12" fill="#0369A1" font-weight="bold">स्थायी लेखा संख्या कार्ड / Permanent Account Number</text>
      <text y="138" font-family="Courier, monospace" font-size="26" font-weight="bold" fill="#0F172A" letter-spacing="3">${panNumber}</text>
    </g>
    <rect x="460" y="105" width="105" height="105" rx="8" fill="#ffffff" stroke="#0284C7" stroke-width="1.5"/>
    <rect x="472" y="117" width="24" height="24" fill="#0F172A"/>
    <rect x="528" y="117" width="24" height="24" fill="#0F172A"/>
    <rect x="472" y="173" width="24" height="24" fill="#0F172A"/>
    <rect x="502" y="145" width="22" height="22" fill="#0F172A"/>
    <text x="300" y="355" font-family="sans-serif" font-size="10" font-weight="bold" fill="#0369A1" text-anchor="middle">
      INCOME TAX DEPARTMENT • PERMANENT ACCOUNT NUMBER (PAN) VERIFIED HOLOGRAM
    </text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const GovernmentIdUploadVerifier: React.FC<GovernmentIdUploadVerifierProps> = ({
  selectedDocType,
  onDocTypeChange,
  applicantName,
  onVerificationComplete,
  verifiedResult,
  className = '',
  required = true,
}) => {
  const [uploadedImageUri, setUploadedImageUri] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [manualIdNumber, setManualIdNumber] = useState<string>('');
  const [verifying, setVerifying] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);
  const [qualityReport, setQualityReport] =
    useState<KycImageQualityReport | null>(null);

  const getDocRequirements = (type: string) => {
    const lower = type.toLowerCase();
    if (lower.includes('aadhaar')) {
      return {
        title: 'UIDAI Official Aadhaar Card Verification & Image Quality Scanner',
        description:
          'Upload your Aadhaar Card (front/full scan or clear photo). Our KYC Image Processor checks resolution, blur, glare, and contrast before AI Vision OCR extracts your 12-digit Aadhaar identifier.',
        placeholderId: 'Optional: Enter 12-digit Aadhaar (e.g. 5489 1234 5678) or leave blank for AI OCR',
        sampleBadge: 'Official UIDAI 12-Digit Aadhaar',
      };
    }
    if (lower.includes('pan')) {
      return {
        title: 'Income Tax Department PAN Card Verification & Quality Check',
        description:
          'Upload your PAN Card image. Our KYC Image Processor validates clarity and contrast while AI Vision OCR extracts your 10-character Permanent Account Number (e.g. ABCDE1234F).',
        placeholderId: 'Optional: Enter 10-char PAN (e.g. ABCDE1234F) or leave blank for AI OCR',
        sampleBadge: 'Income Tax Official PAN',
      };
    }
    if (lower.includes('driving')) {
      return {
        title: 'RTO State Driving Licence Verification & Quality Check',
        description:
          'Upload your State Driving Licence image. Image processing checks focus and exposure while AI Vision OCR extracts your DL number and issuing RTO authority.',
        placeholderId: 'Optional: Enter DL Number (e.g. DL-0420190149646) or leave blank for AI OCR',
        sampleBadge: 'RTO Driving Licence',
      };
    }
    if (lower.includes('ration')) {
      return {
        title: 'State Food & Civil Supplies Ration Card Verification',
        description:
          'Upload your State Ration Card image. AI Vision OCR extracts your Ration Card number and family head details.',
        placeholderId: 'Optional: Enter Ration Card Number or leave blank for AI OCR',
        sampleBadge: 'State Ration Card',
      };
    }
    return {
      title: 'Official Government Photo Identity Verification & Quality Check',
      description:
        'Upload your authentic government-issued identity document. Image forensics validates sharpness and lighting while AI Vision OCR verifies security hallmarks.',
      placeholderId: 'Optional: Enter Government ID Number or leave blank for AI OCR',
      sampleBadge: 'Official Government ID',
    };
  };

  const currentReqs = getDocRequirements(selectedDocType);

  const runVerificationWithPayload = async (
    imageUriToVerify: string,
    fileNameToVerify: string,
    idNumberOverride?: string,
    bypassQualityHold = false
  ) => {
    if (!imageUriToVerify) {
      setRejectionError('Please upload your official Government Identity document image first.');
      return;
    }

    setVerifying(true);
    setRejectionError(null);
    setScanStep('Step 1/3: Running Pixel-Level Image Quality, Blur & Glare Diagnostics...');

    try {
      const effectiveIdNum = (idNumberOverride ?? manualIdNumber).trim();
      const report = await analyzeUploadedKycImage({
        dataUri: imageUriToVerify,
        documentType: selectedDocType,
        manualIdNumber: effectiveIdNum,
        fileName: fileNameToVerify,
      });
      setQualityReport(report);

      // Pause and warn user if low-quality scan or invalid ID number warning is detected and user hasn't explicitly clicked "Proceed & Verify"
      if (
        (report.qualityGrade === 'LOW_QUALITY_WARNING' ||
          report.warnings.some((w) => w.code === 'POTENTIAL_INVALID_ID_NUMBER')) &&
        !bypassQualityHold
      ) {
        setVerifying(false);
        setScanStep('');
        onVerificationComplete(null);
        return;
      }

      setScanStep('Step 2/3: Inspecting Government Identity Hallmarks & Extracting Real Identifier...');

      const stepTimer = setTimeout(() => {
        setScanStep('Step 3/3: Validating Official Identifier Format & Cardholder Details...');
      }, 500);

      const res = await fetch('/api/verify-government-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: selectedDocType,
          applicantName: applicantName || 'Danish Khan',
          imageBase64: imageUriToVerify,
          fileName: fileNameToVerify,
          manualIdNumber: effectiveIdNum,
          mimeType: imageUriToVerify.startsWith('data:image/png')
            ? 'image/png'
            : imageUriToVerify.startsWith('data:image/svg')
            ? 'image/svg+xml'
            : imageUriToVerify.startsWith('data:image/webp')
            ? 'image/webp'
            : 'image/jpeg',
        }),
      });

      clearTimeout(stepTimer);
      const data = await res.json();

      if (!res.ok || !data.verified) {
        const errorMsg =
          data.rejectionReason ||
          data.error ||
          'Verification failed: Uploaded image is not a recognizable Government Identity document.';
        setRejectionError(errorMsg);
        onVerificationComplete(null);
      } else {
        setRejectionError(null);
        onVerificationComplete(data);
      }
    } catch (err: any) {
      setRejectionError(
        err.message || 'Verification service unreachable. Please ensure the document image is clear.'
      );
      onVerificationComplete(null);
    } finally {
      setVerifying(false);
      setScanStep('');
    }
  };

  const handleManualIdChange = (nextVal: string) => {
    setManualIdNumber(nextVal);
    if (uploadedImageUri) {
      void analyzeUploadedKycImage({
        dataUri: uploadedImageUri,
        documentType: selectedDocType,
        manualIdNumber: nextVal,
        fileName: uploadedFileName,
      }).then((report) => {
        setQualityReport(report);
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fname = file.name;
    setUploadedFileName(fname);
    setRejectionError(null);
    setQualityReport(null);
    onVerificationComplete(null);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const dataUri = reader.result;
        setUploadedImageUri(dataUri);
        void runVerificationWithPayload(dataUri, fname);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLoadGenuineSample = () => {
    const isPan = selectedDocType.toLowerCase().includes('pan');
    const uri = isPan
      ? createSamplePanDataUri(applicantName || 'Danish Khan', 'ABCDE1234F')
      : createSampleAadhaarDataUri(applicantName || 'Danish Khan');
    const fname = isPan
      ? 'official_income_tax_pan_card_scanned.svg'
      : 'official_uidai_aadhaar_card_scanned.svg';
    setManualIdNumber('');
    setUploadedImageUri(uri);
    setUploadedFileName(fname);
    setRejectionError(null);
    setQualityReport(null);
    onVerificationComplete(null);
    void runVerificationWithPayload(uri, fname, '', false);
  };

  const handleLoadLowQualitySample = () => {
    const uri = createLowQualityBlurrySampleDataUri(
      applicantName || 'Danish Khan'
    );
    const fname = 'low_quality_blurry_aadhaar_scan.svg';
    setUploadedImageUri(uri);
    setUploadedFileName(fname);
    setRejectionError(null);
    setQualityReport(null);
    onVerificationComplete(null);
    void runVerificationWithPayload(uri, fname, undefined, false);
  };

  const handleSimulateInvalidIdData = () => {
    const isPan = selectedDocType.toLowerCase().includes('pan');
    const badId = isPan ? 'INVALID999' : '123456789012';
    const uri = isPan
      ? createSamplePanDataUri(applicantName || 'Danish Khan', badId)
      : createSampleAadhaarDataUri(applicantName || 'Danish Khan');
    const fname = isPan
      ? 'pan_card_invalid_format_check.svg'
      : 'aadhaar_card_verhoeff_mismatch.svg';
    setManualIdNumber(badId);
    setUploadedImageUri(uri);
    setUploadedFileName(fname);
    setRejectionError(null);
    setQualityReport(null);
    onVerificationComplete(null);
    void runVerificationWithPayload(uri, fname, badId, false);
  };

  const handleLoadFakeSample = () => {
    const uri = createSampleFakeDataUri();
    const fname = 'random_unrelated_photo.svg';
    setUploadedImageUri(uri);
    setUploadedFileName(fname);
    setRejectionError(null);
    setQualityReport(null);
    onVerificationComplete(null);
    void runVerificationWithPayload(uri, fname);
  };

  const handleRunVerification = async (bypassWarnings = false) => {
    await runVerificationWithPayload(
      uploadedImageUri,
      uploadedFileName,
      undefined,
      bypassWarnings
    );
  };

  const handleReset = () => {
    setUploadedImageUri('');
    setUploadedFileName('');
    setRejectionError(null);
    setQualityReport(null);
    onVerificationComplete(null);
  };

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        verifiedResult?.verified
          ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600 shadow-sm'
          : rejectionError
          ? 'bg-red-50/60 dark:bg-red-950/30 border-red-300 dark:border-red-800'
          : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
      } ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          {verifiedResult?.verified ? (
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
          ) : rejectionError ? (
            <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldAlert className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Lock className="w-4 h-4" />
            </div>
          )}
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F6F5B] dark:text-emerald-400 block">
              Government of India • KYC Image Quality & Identity Verification
            </span>
            <h4 className="font-serif font-bold text-stone-900 dark:text-white text-sm sm:text-base">
              Upload Real Official Government Document
            </h4>
          </div>
        </div>

        {verifiedResult?.verified ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 text-xs font-mono font-bold border border-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            AUTHENTIC GOVERNMENT ID VERIFIED
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-[11px] font-mono font-bold">
            {required ? 'Required for Submission' : 'Verification Pending'}
          </span>
        )}
      </div>

      {/* Identity Selector Dropdown */}
      <div className="mt-3.5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-slate-300 mb-1">
              Choose Government Identity Type:
            </label>
            <select
              value={selectedDocType}
              onChange={(e) => {
                onDocTypeChange(e.target.value);
                handleReset();
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-900 dark:text-white text-xs sm:text-sm font-semibold shadow-sm focus:ring-2 focus:ring-[#1F6F5B]"
            >
              {OFFICIAL_GOVERNMENT_IDENTITIES.map((idType) => (
                <option key={idType} value={idType}>
                  {idType}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-slate-300 mb-1">
              Document / Aadhaar / ID Number (Auto-OCR or Enter):
            </label>
            <input
              type="text"
              value={manualIdNumber}
              onChange={(e) => handleManualIdChange(e.target.value)}
              placeholder={currentReqs.placeholderId}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-900 dark:text-white text-xs sm:text-sm font-mono focus:ring-2 focus:ring-[#1F6F5B]"
            />
            {manualIdNumber.trim().length > 0 && !uploadedImageUri && (() => {
              const liveIdCheck = evaluateKycMetricsAndWarnings({
                metrics: {
                  width: 800,
                  height: 500,
                  meanBrightness: 205,
                  contrastStdDev: 55,
                  sharpnessScore: 90,
                },
                documentType: selectedDocType,
                manualIdNumber,
              });
              const idWarning = liveIdCheck.warnings.find(
                (w) => w.code === 'POTENTIAL_INVALID_ID_NUMBER'
              );
              return idWarning ? (
                <div className="mt-1.5 p-2 rounded-lg bg-amber-100/90 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 text-[11px] text-amber-950 dark:text-amber-200 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block">{idWarning.title}</strong>
                    <span>{idWarning.recommendation}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-[11px] text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Identity Number Format &amp; Checksum Validated</span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Requirements Banner + Official Government Verification Website Link */}
        {(() => {
          const portalInfo = resolveGovernmentVerificationPortal(selectedDocType);
          return (
            <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-stone-200 dark:border-slate-700 text-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  {currentReqs.title}
                </div>
                <a
                  href={portalInfo.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 text-[#1F6F5B] dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[11px] font-mono font-bold transition-colors"
                >
                  <span>Official Portal: {portalInfo.portalName}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-stone-600 dark:text-slate-300 text-[11px] leading-relaxed">
                {currentReqs.description}
              </p>
              <div className="text-[10px] font-mono text-stone-500 dark:text-slate-400 flex flex-wrap items-center gap-2 pt-0.5">
                <span>• Protocol: {portalInfo.verificationProtocol}</span>
                <span>• Server-Side Gemini Vision/OCR Hook Active</span>
              </div>
            </div>
          );
        })()}

        {/* Upload Dropzone & Action Bar */}
        {!uploadedImageUri ? (
          <div className="space-y-2.5">
            <label className="p-5 rounded-2xl border-2 border-dashed border-stone-300 dark:border-slate-700 hover:border-[#1F6F5B] bg-white/60 dark:bg-slate-900/60 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
              <div className="w-11 h-11 rounded-full bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950 group-hover:text-[#1F6F5B] flex items-center justify-center mb-2 transition-colors">
                <Upload className="w-5 h-5" />
              </div>
              <span className="font-semibold text-xs sm:text-sm text-stone-900 dark:text-white">
                Click to Upload Official {selectedDocType.split('(')[0].trim()} Image
              </span>
              <span className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5">
                Supports Scanned Copy or Clear Mobile Photo (PNG, JPG, SVG, WebP) • Auto-Checks Blur, Glare & Resolution
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Quick Testing Actions for Evaluators / Testers */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-stone-100/90 dark:bg-slate-800/80 border border-stone-200 dark:border-slate-700 text-xs">
              <span className="text-[11px] font-mono text-stone-600 dark:text-slate-300 font-semibold">
                Quick KYC Test Samples:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleLoadGenuineSample}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Load Genuine Aadhaar Sample
                </button>
                <button
                  type="button"
                  onClick={handleLoadLowQualitySample}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <AlertTriangle className="w-3 h-3" />
                  Simulate Blurry / Low-Quality Warning
                </button>
                <button
                  type="button"
                  onClick={handleSimulateInvalidIdData}
                  className="px-2.5 py-1 rounded-lg bg-orange-100 dark:bg-orange-950/80 hover:bg-orange-200 text-orange-900 dark:text-orange-300 border border-orange-300 dark:border-orange-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <AlertCircle className="w-3 h-3" />
                  Simulate Invalid ID Data
                </button>
                <button
                  type="button"
                  onClick={handleLoadFakeSample}
                  className="px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-950/80 hover:bg-red-200 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ShieldAlert className="w-3 h-3" />
                  Test Fake Document Rejection
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Image Preview & Details */}
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-stone-900 dark:text-white truncate flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#1F6F5B]" />
                  {uploadedFileName || 'Government Identity Document'}
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-500 hover:text-red-600 cursor-pointer"
                  title="Remove document and upload new"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Document Image Thumbnail Preview */}
              <div className="relative rounded-xl overflow-hidden border border-stone-200 dark:border-slate-700 bg-stone-100 dark:bg-slate-800 flex items-center justify-center max-h-[220px]">
                <img
                  src={uploadedImageUri}
                  alt="Uploaded Government ID"
                  className="w-full h-auto max-h-[220px] object-contain"
                />
                {verifying && (
                  <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 text-center">
                    <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin mb-2" />
                    <span className="text-xs font-mono font-bold tracking-wider text-emerald-300 uppercase">
                      KYC Image Processor & Government AI Active
                    </span>
                    <span className="text-xs text-stone-200 mt-1 max-w-xs">
                      {scanStep || 'Inspecting document hallmarks...'}
                    </span>
                  </div>
                )}
              </div>

              {/* Real-Time KYC Image Quality & Forensics Diagnostic Card */}
              {qualityReport && (
                <div
                  className={`p-3 rounded-xl border text-xs space-y-2.5 ${
                    qualityReport.qualityGrade === 'EXCELLENT'
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                      : qualityReport.qualityGrade === 'INVALID_DOCUMENT'
                      ? 'bg-red-50/80 dark:bg-red-950/50 border-red-300 dark:border-red-800'
                      : 'bg-amber-50/90 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-stone-900 dark:text-white">
                      <ScanLine className="w-4 h-4 text-[#1F6F5B] dark:text-emerald-400" />
                      <span>KYC Image Processing & Quality Diagnostics</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase border ${
                        qualityReport.qualityGrade === 'EXCELLENT'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                          : qualityReport.qualityGrade === 'INVALID_DOCUMENT'
                          ? 'bg-red-100 text-red-900 border-red-400'
                          : 'bg-amber-100 text-amber-900 border-amber-400'
                      }`}
                    >
                      Quality Score: {qualityReport.overallQualityScore}/100 ({qualityReport.qualityGrade.replace(/_/g, ' ')})
                    </span>
                  </div>

                  {/* 4 Pixel-Level Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                    <div className="p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-stone-200/80 dark:border-slate-700">
                      <span className="text-[10px] text-stone-500 block uppercase">Resolution</span>
                      <strong className="text-stone-900 dark:text-white">
                        {qualityReport.metrics.resolution}
                      </strong>
                    </div>
                    <div className="p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-stone-200/80 dark:border-slate-700">
                      <span className="text-[10px] text-stone-500 block uppercase">Sharpness</span>
                      <strong
                        className={
                          qualityReport.metrics.sharpness < 32
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-[#1F6F5B] dark:text-emerald-400'
                        }
                      >
                        {qualityReport.metrics.sharpness}/100
                      </strong>
                    </div>
                    <div className="p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-stone-200/80 dark:border-slate-700">
                      <span className="text-[10px] text-stone-500 block uppercase">Brightness</span>
                      <strong className="text-stone-900 dark:text-white">
                        {qualityReport.metrics.brightness}/255
                      </strong>
                    </div>
                    <div className="p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-stone-200/80 dark:border-slate-700">
                      <span className="text-[10px] text-stone-500 block uppercase">Contrast</span>
                      <strong className="text-stone-900 dark:text-white">
                        {qualityReport.metrics.contrast} SD
                      </strong>
                    </div>
                  </div>

                  {/* Actionable Warnings for Low-Quality or Potentially Invalid Documents */}
                  {qualityReport.warnings.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>
                          Document Quality & Validity Warnings ({qualityReport.warnings.length}):
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {qualityReport.warnings.map((w, idx) => (
                          <div
                            key={`${w.code}-${idx}`}
                            className={`p-2 rounded-lg border text-[11px] leading-snug ${
                              w.severity === 'critical'
                                ? 'bg-red-100/80 dark:bg-red-950/70 border-red-300 text-red-950 dark:text-red-200'
                                : 'bg-white/90 dark:bg-slate-900/90 border-amber-300/90 dark:border-amber-700 text-stone-800 dark:text-slate-200'
                            }`}
                          >
                            <strong className="block font-semibold">
                              • {w.title}
                            </strong>
                            <span className="text-stone-600 dark:text-slate-300">
                              Recommendation: {w.recommendation}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Button to trigger Verification */}
              {!verifiedResult?.verified && (
                <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={verifying}
                      onClick={() => handleRunVerification(true)}
                      className="px-4 py-2.5 rounded-xl bg-[#1F6F5B] hover:bg-[#185848] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      {verifying
                        ? 'Inspecting Official Government Hallmarks...'
                        : qualityReport?.qualityGrade === 'LOW_QUALITY_WARNING'
                        ? 'Proceed & Verify Despite Low-Quality Warning'
                        : 'Verify Document with Government AI Engine'}
                    </button>

                    {qualityReport?.qualityGrade === 'LOW_QUALITY_WARNING' && (
                      <button
                        type="button"
                        onClick={handleLoadGenuineSample}
                        className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Replace with High-Clarity Scan
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleLoadGenuineSample}
                      className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                    >
                      Genuine Sample
                    </button>
                    <span className="text-stone-300">·</span>
                    <button
                      type="button"
                      onClick={handleLoadLowQualitySample}
                      className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
                    >
                      Blurry Warning
                    </button>
                    <span className="text-stone-300">·</span>
                    <button
                      type="button"
                      onClick={handleSimulateInvalidIdData}
                      className="text-[11px] text-orange-700 dark:text-orange-400 hover:underline font-semibold cursor-pointer"
                    >
                      Invalid ID Data
                    </button>
                    <span className="text-stone-300">·</span>
                    <button
                      type="button"
                      onClick={handleLoadFakeSample}
                      className="text-[11px] text-red-600 dark:text-red-400 hover:underline font-semibold cursor-pointer"
                    >
                      Fake Sample
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Verification Failure / Fraud Alert */}
        {rejectionError && (
          <div className="p-3.5 rounded-xl bg-red-100/90 dark:bg-red-950/80 border border-red-300 dark:border-red-800 text-xs text-red-900 dark:text-red-200 space-y-1.5 animate-fadeIn">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block">
                  Verification Failed: Document Rejected by Anti-Fraud Engine
                </strong>
                <p className="mt-0.5 text-[11px] leading-relaxed">{rejectionError}</p>
                <div className="mt-2 text-[11px] text-red-800 dark:text-red-300 font-mono bg-red-50 dark:bg-red-900/40 p-2 rounded-lg border border-red-200 dark:border-red-800/60">
                  Government of India requirement: Please upload an original, authentic {selectedDocType}. Do not upload unverified pictures, selfies, or forged cards.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Verified Success Details */}
        {verifiedResult?.verified && (
          <div className="p-3.5 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/80 border border-emerald-400 dark:border-emerald-600 text-xs text-emerald-950 dark:text-emerald-100 space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#1F6F5B] dark:text-emerald-400" />
                UIDAI & Government Registries Validated
              </span>
              <span className="font-mono text-[11px] bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                Confidence: {verifiedResult.confidenceScore}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
              <div>
                <span className="text-stone-500 dark:text-slate-400 block text-[10px] uppercase">
                  Cardholder Name
                </span>
                <strong className="text-stone-900 dark:text-white font-sans">
                  {verifiedResult.detectedName || applicantName || 'Danish Khan'}
                </strong>
              </div>
              <div>
                <span className="text-stone-500 dark:text-slate-400 block text-[10px] uppercase">
                  Verified ID Number
                </span>
                <strong className="text-[#1F6F5B] dark:text-emerald-300">
                  {verifiedResult.maskedIdNumber || 'XXXX-XXXX-5678'}
                </strong>
              </div>
              <div>
                <span className="text-stone-500 dark:text-slate-400 block text-[10px] uppercase">
                  Official Government Portal
                </span>
                <a
                  href={
                    verifiedResult.governmentPortalUrl ||
                    resolveGovernmentVerificationPortal(selectedDocType).portalUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1F6F5B] dark:text-emerald-300 font-bold hover:underline inline-flex items-center gap-1"
                >
                  <span>
                    {verifiedResult.governmentPortalName ||
                      resolveGovernmentVerificationPortal(selectedDocType).portalName}
                  </span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            </div>

            {Array.isArray(verifiedResult.securityMarks) &&
              verifiedResult.securityMarks.length > 0 && (
                <div className="pt-1 flex flex-wrap gap-1.5">
                  {verifiedResult.securityMarks.map((mark, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-white/70 dark:bg-slate-900/70 text-[10px] font-mono text-emerald-900 dark:text-emerald-300 border border-emerald-300/70"
                    >
                      ✓ {mark}
                    </span>
                  ))}
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};
