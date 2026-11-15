import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  ShieldCheck,
  Clock,
  FileCheck2,
  CheckCircle2,
  Building2,
  FileText,
  ScanLine,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import { VerificationUploadRecord } from '../types';
import {
  analyzeUploadedKycImage,
  evaluateKycMetricsAndWarnings,
  KycImageQualityReport,
  KycPixelMetrics,
} from '../utils/kycImageValidator';
import { generateAadhaarChecksum } from '../utils/donationLogic';

export interface VerificationTarget {
  targetType: 'organization' | 'campaign';
  targetId: number | string;
  targetName: string;
  currentRegNo?: string;
  currentDocType?: string;
  currentVerified?: boolean;
}

interface VerificationUploadModalProps {
  target: VerificationTarget | null;
  actorName: string;
  actorRole: string;
  recentUploads: VerificationUploadRecord[];
  onClose: () => void;
  onUploaded: (
    record: VerificationUploadRecord,
    message: string,
    adminSummaryEmail?: any
  ) => void;
}

const REGISTRATION_DOCUMENT_TYPES = [
  'Aadhaar Card (Official Government Identity)',
  'PAN Card (Income Tax Official Identity)',
  'Ration Card (State Official Identity)',
  'Driving Licence (RTO Official Identity)',
  'Voter ID Card (Election Commission Official Identity)',
  'Indian Passport (Official Government Identity)',
  '80G & 12A Income Tax Exemption Certificate (Form 10AC/10BE)',
  'NGO Darpan & Ministry of Corporate Affairs CSR-1 Certificate',
] as const;

function getDefaultValidIdForType(docType: string, fallbackReg?: string): string {
  const lower = docType.toLowerCase();
  if (lower.includes('aadhaar')) {
    const prefix = '54891234567';
    const chk = generateAadhaarChecksum(prefix) ?? 8;
    return `${prefix.slice(0, 4)} ${prefix.slice(4, 8)} ${prefix.slice(8)}${chk}`;
  }
  if (lower.includes('pan')) {
    return 'ABCDE1234F';
  }
  if (lower.includes('driving')) {
    return 'DL-0420190149646';
  }
  return fallbackReg || '80G-DEL-2026-8841';
}

export const VerificationUploadModal: React.FC<VerificationUploadModalProps> = ({
  target,
  actorName,
  actorRole,
  recentUploads,
  onClose,
  onUploaded,
}) => {
  const initialDocType = target?.currentDocType || REGISTRATION_DOCUMENT_TYPES[0];
  const [documentType, setDocumentType] = useState<string>(initialDocType);
  const [registrationNo, setRegistrationNo] = useState<string>(
    getDefaultValidIdForType(initialDocType, target?.currentRegNo)
  );
  const [status, setStatus] = useState<'Verified' | 'Pending'>(
    target?.currentVerified === false ? 'Pending' : 'Verified'
  );
  const [selectedFileName, setSelectedFileName] = useState<string>(
    `${(target?.targetName || 'govt_identity')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')}_aadhaar_pan_verified.pdf`
  );
  const [selectedFileSizeKb, setSelectedFileSizeKb] = useState<number>(340);
  const [notes, setNotes] = useState<string>(
    'Original official Government Identity / Registration document inspected and uploaded for platform audit compliance.'
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string>('');
  const [activeMetrics, setActiveMetrics] = useState<KycPixelMetrics>({
    width: 1240,
    height: 780,
    meanBrightness: 206,
    contrastStdDev: 56,
    sharpnessScore: 91,
  });
  const [qualityReport, setQualityReport] = useState<KycImageQualityReport>(() =>
    evaluateKycMetricsAndWarnings({
      metrics: {
        width: 1240,
        height: 780,
        meanBrightness: 206,
        contrastStdDev: 56,
        sharpnessScore: 91,
      },
      documentType: initialDocType,
      manualIdNumber: getDefaultValidIdForType(initialDocType, target?.currentRegNo),
    })
  );

  useEffect(() => {
    setQualityReport(
      evaluateKycMetricsAndWarnings({
        metrics: activeMetrics,
        documentType,
        manualIdNumber: registrationNo,
        fileName: selectedFileName,
      })
    );
  }, [activeMetrics, documentType, registrationNo, selectedFileName]);

  if (!target) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setSelectedFileSizeKb(Math.max(1, Math.round(file.size / 1024)));

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setUploadedImageBase64(reader.result);
          void analyzeUploadedKycImage({
            dataUri: reader.result,
            documentType,
            manualIdNumber: registrationNo,
            fileName: file.name,
          }).then((report) => {
            setQualityReport(report);
          });
        }
      };
      reader.readAsDataURL(file);
    } else {
      setUploadedImageBase64('');
      setActiveMetrics({
        width: 1240,
        height: 780,
        meanBrightness: 208,
        contrastStdDev: 58,
        sharpnessScore: 92,
      });
    }
  };

  const handleSimulateHighClarity = () => {
    const validId = getDefaultValidIdForType(documentType, target?.currentRegNo);
    setRegistrationNo(validId);
    setSelectedFileName('official_high_clarity_kyc_verified_scan.png');
    setSelectedFileSizeKb(420);
    setActiveMetrics({
      width: 1280,
      height: 800,
      meanBrightness: 210,
      contrastStdDev: 60,
      sharpnessScore: 93,
      isSimulatedLowQuality: false,
      isSimulatedFake: false,
    });
  };

  const handleSimulateLowQuality = () => {
    setSelectedFileName('low_quality_blurry_kyc_mobile_capture.jpg');
    setSelectedFileSizeKb(48);
    setStatus('Pending');
    setActiveMetrics({
      width: 320,
      height: 200,
      meanBrightness: 40,
      contrastStdDev: 16,
      sharpnessScore: 18,
      isSimulatedLowQuality: true,
      isSimulatedFake: false,
    });
  };

  const handleSimulateInvalidIdData = () => {
    const isPan = documentType.toLowerCase().includes('pan');
    setRegistrationNo(isPan ? 'INVALID999' : '123456789012');
    setSelectedFileName('kyc_document_id_checksum_mismatch.png');
    setStatus('Pending');
    setActiveMetrics({
      width: 900,
      height: 560,
      meanBrightness: 195,
      contrastStdDev: 50,
      sharpnessScore: 84,
      isSimulatedLowQuality: false,
      isSimulatedFake: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedFileName.trim()) {
      setError('Please select or attach an official Government Identity or registration document file.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/verification-uploads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-role': actorRole,
        },
        body: JSON.stringify({
          targetType: target.targetType,
          targetId: target.targetId,
          targetName: target.targetName,
          documentType,
          registrationNo: registrationNo.trim() || 'GOVT-ID-VERIFIED',
          fileName: selectedFileName.trim(),
          fileSizeKb: selectedFileSizeKb,
          imageBase64: uploadedImageBase64 || undefined,
          status,
          notes: `${notes.trim()} [KYC Image Score: ${qualityReport.overallQualityScore}/100 (${qualityReport.qualityGrade})]`,
          uploadedBy: actorName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload verification document');
      }

      onUploaded(
        data.upload,
        data.message ||
          `Form Submitted Successfully! Uploaded "${selectedFileName}" (${documentType}) for "${target.targetName}" with status [${status.toUpperCase()}] — Detailed summary sent to Admin khandanish0503@gmail.com.`,
        data.adminSummaryEmail
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'Could not complete verification upload');
    } finally {
      setSubmitting(false);
    }
  };

  const matchingUploads = recentUploads.filter(
    (u) =>
      String(u.targetId) === String(target.targetId) &&
      u.targetType === target.targetType
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-upload-modal-title"
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#FAF7F2] dark:bg-slate-900 border border-stone-300 dark:border-slate-700 shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 block">
                NGO & Campaign KYC Image Processing & Verification Upload
              </span>
              <h3
                id="verification-upload-modal-title"
                className="font-serif text-lg font-bold text-white line-clamp-1"
              >
                Verification Upload: {target.targetName}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Verification Upload Modal"
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Info Strip */}
        <div className="px-6 py-3 bg-emerald-950/90 text-emerald-100 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-emerald-800">
          <span className="flex items-center gap-1.5 font-medium">
            <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
            Target ({target.targetType.toUpperCase()} #{target.targetId}):{' '}
            <strong>{target.targetName}</strong>
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono font-bold text-[11px] ${
              status === 'Verified'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}
          >
            {status === 'Verified' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Clock className="w-3.5 h-3.5" />
            )}
            Status Indicator: {status.toUpperCase()}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 font-semibold">
              {error}
            </div>
          )}

          {/* 1. Official Government Identity / Registration Document Type & ID Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-slate-300 mb-1.5">
                1. Official Government Identity Type
              </label>
              <select
                value={documentType}
                onChange={(e) => {
                  const nextDoc = e.target.value;
                  setDocumentType(nextDoc);
                  setRegistrationNo(getDefaultValidIdForType(nextDoc, target?.currentRegNo));
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-stone-900 dark:text-white font-medium"
              >
                {REGISTRATION_DOCUMENT_TYPES.map((dt) => (
                  <option key={dt} value={dt}>
                    {dt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-slate-300 mb-1.5">
                2. Document / Aadhaar / PAN / Reg Number
              </label>
              <input
                type="text"
                value={registrationNo}
                onChange={(e) => setRegistrationNo(e.target.value)}
                placeholder="Enter Aadhaar, PAN, DL, or 80G Reg No"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-stone-900 dark:text-white"
              />
            </div>
          </div>

          {/* 2. Direct Document Upload Dropzone + Simulation Controls */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-slate-300">
              3. Attach Official Government Identity / Registration File (PDF, JPG, PNG)
            </label>
            <div className="p-4 rounded-xl border-2 border-dashed border-emerald-600/50 dark:border-emerald-500/40 bg-emerald-50/40 dark:bg-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#1F6F5B] text-white flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-stone-900 dark:text-white truncate">
                    {selectedFileName}
                  </div>
                  <div className="text-[11px] font-mono text-stone-500 dark:text-slate-400">
                    Size: {selectedFileSizeKb} KB · Ready for Cloud SQL & Audit Log Sync
                  </div>
                </div>
              </div>

              <label className="px-3.5 py-2 rounded-xl bg-stone-900 dark:bg-emerald-600 hover:opacity-90 text-white text-xs font-semibold cursor-pointer shrink-0 text-center">
                Choose File from Device
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Interactive KYC Image Processing Simulation Presets */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-stone-100 dark:bg-slate-800/80 border border-stone-200 dark:border-slate-700 text-xs">
              <span className="text-[11px] font-mono font-semibold text-stone-600 dark:text-slate-300">
                KYC Image Analyzer Presets:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSimulateHighClarity}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  High-Clarity Scan
                </button>
                <button
                  type="button"
                  onClick={handleSimulateLowQuality}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <AlertTriangle className="w-3 h-3" />
                  Simulate Blurry / Low-Quality Warning
                </button>
                <button
                  type="button"
                  onClick={handleSimulateInvalidIdData}
                  className="px-2.5 py-1 rounded-lg bg-orange-100 dark:bg-orange-950/80 hover:bg-orange-200 text-orange-900 dark:text-orange-300 border border-orange-300 dark:border-orange-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <AlertCircle className="w-3 h-3" />
                  Simulate Invalid Aadhaar/PAN Data
                </button>
              </div>
            </div>

            {/* KYC Image Processing & Identity Data Diagnostic Panel */}
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
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
                  <span>KYC Image Processing & Identity Data Analysis</span>
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

              {qualityReport.warnings.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      KYC Image Quality & Identity Data Warnings ({qualityReport.warnings.length}):
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {qualityReport.warnings.map((w, idx) => (
                      <div
                        key={`${w.code}-${idx}`}
                        className="p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-amber-300 dark:border-amber-700 text-[11px] text-stone-800 dark:text-slate-200"
                      >
                        <strong className="block font-semibold">• {w.title}</strong>
                        <span className="text-stone-600 dark:text-slate-300">
                          Recommendation: {w.recommendation}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Verification Status Indicator Selector ('Verified' / 'Pending') */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-slate-300 mb-1.5">
              4. Verification Status Indicator (Updates NGO / Campaign & Admin Audit Log)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('Verified')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  status === 'Verified'
                    ? 'bg-emerald-950 text-white border-emerald-600 shadow-md'
                    : 'bg-white dark:bg-slate-800 text-stone-800 dark:text-slate-200 border-stone-300 dark:border-slate-700'
                }`}
              >
                <ShieldCheck
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    status === 'Verified' ? 'text-emerald-400' : 'text-emerald-700'
                  }`}
                />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider">
                    Verified (Active 80G & Live)
                  </div>
                  <div
                    className={`text-[11px] mt-0.5 ${
                      status === 'Verified' ? 'text-emerald-200' : 'text-stone-500 dark:text-slate-400'
                    }`}
                  >
                    Marks registration document as Verified and logs VERIFICATION_DOC_UPLOADED_VERIFIED in Audit Log.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStatus('Pending')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  status === 'Pending'
                    ? 'bg-amber-950 text-white border-amber-500 shadow-md'
                    : 'bg-white dark:bg-slate-800 text-stone-800 dark:text-slate-200 border-stone-300 dark:border-slate-700'
                }`}
              >
                <Clock
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    status === 'Pending' ? 'text-amber-400' : 'text-amber-600'
                  }`}
                />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider">
                    Pending Review (Under Vetting)
                  </div>
                  <div
                    className={`text-[11px] mt-0.5 ${
                      status === 'Pending' ? 'text-amber-200' : 'text-stone-500 dark:text-slate-400'
                    }`}
                  >
                    Sets badge to Pending Review and logs VERIFICATION_DOC_UPLOADED_PENDING in Audit Log.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 4. Compliance Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-slate-300 mb-1">
              5. Verification & Audit Remarks
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-stone-900 dark:text-white"
              placeholder="Enter compliance notes for the Admin Audit Log..."
            />
          </div>

          {/* Previous Uploads for this Target */}
          {matchingUploads.length > 0 && (
            <div className="p-3.5 rounded-xl bg-stone-100 dark:bg-slate-800/70 border border-stone-200 dark:border-slate-700 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-slate-300">
                Recent Uploaded Documents for {target.targetName}:
              </div>
              {matchingUploads.slice(0, 3).map((u) => (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-slate-700"
                >
                  <span className="truncate">
                    {u.fileName} ({u.registrationNo})
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.status === 'Verified'
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {u.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-stone-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-slate-700 text-xs font-semibold text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-[#1F6F5B] hover:bg-[#165344] text-white text-xs font-semibold flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              <FileCheck2 className="w-4 h-4" />
              {submitting
                ? 'Uploading & Logging to Audit Trail...'
                : `Upload Document & Mark ${status}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
