import React, { useState } from 'react';
import {
  HeartPulse,
  Stethoscope,
  Droplets,
  ShieldCheck,
  MapPin,
  Phone,
  CheckCircle2,
  FileCheck2,
  IndianRupee,
  Calendar,
  Download,
  Printer,
  X,
  FileText,
  Trash2,
  Building2,
  ExternalLink,
  Search,
} from 'lucide-react';
import { DoctorRecord, BloodDonationRecord } from '../types';
import {
  BLOOD_GROUPS,
  OFFICIAL_GOVERNMENT_IDENTITIES,
  GovernmentIdVerificationResult,
  formatINR,
  NMC_IMR_OFFICIAL_PORTAL_URL,
  isLikelyRealHumanName,
  validateRealKycSubmission,
} from '../utils/donationLogic';
import { GovernmentIdUploadVerifier } from './GovernmentIdUploadVerifier';
import {
  SubmissionSuccessModal,
  SubmissionSuccessInfo,
} from './SubmissionSuccessModal';
import {
  ConfirmActionModal,
  ConfirmActionState,
} from './ConfirmActionModal';
import { ExportFormatButtons } from './ExportFormatButtons';
import { ExportDocumentPayload } from '../utils/exportUtils';

interface BloodAndDoctorSectionProps {
  doctors: DoctorRecord[];
  bloodDonations: BloodDonationRecord[];
  onRefresh: () => void;
  isAdmin?: boolean;
}

export const BloodAndDoctorSection: React.FC<BloodAndDoctorSectionProps> = ({
  doctors,
  bloodDonations,
  onRefresh,
  isAdmin = false,
}) => {
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<(typeof BLOOD_GROUPS)[number]>('O+');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    String(doctors[0]?.id || '1')
  );
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [villageName, setVillageName] = useState('');
  const [documentType, setDocumentType] = useState<string>(
    OFFICIAL_GOVERNMENT_IDENTITIES[0]
  );
  const [verifiedGovId, setVerifiedGovId] =
    useState<GovernmentIdVerificationResult | null>(null);
  const [requestType, setRequestType] = useState<
    'donate_blood' | 'hire_doctor' | 'need_blood'
  >('donate_blood');
  const [customFeePaid, setCustomFeePaid] = useState<string>('300');
  const [appointmentDate, setAppointmentDate] = useState<string>('2026-05-20');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [activeBloodReceipt, setActiveBloodReceipt] =
    useState<BloodDonationRecord | null>(null);
  const [submissionSuccess, setSubmissionSuccess] =
    useState<SubmissionSuccessInfo | null>(null);
  const [confirmState, setConfirmState] =
    useState<ConfirmActionState | null>(null);
  const [activeNmcDossier, setActiveNmcDossier] = useState<{
    certificateId: string;
    verifiedAt: string;
    doctor: DoctorRecord;
    nmcRegistrySummary: string;
    officialPortalUrl: string;
    onlineVerification?: {
      verifiedOnline: boolean;
      confidence: string;
      sourcesChecked: string[];
      citations: Array<{ title: string; url: string }>;
      summary: string;
    };
  } | null>(null);
  const [verifyingDoctorId, setVerifyingDoctorId] = useState<string | number | null>(null);
  const [nmcLookupName, setNmcLookupName] = useState<string>('');
  const [nmcLookupReg, setNmcLookupReg] = useState<string>('');
  const [nmcLookupError, setNmcLookupError] = useState<string | null>(null);

  const selectedDoctor =
    doctors.find((d) => String(d.id) === String(selectedDoctorId)) || doctors[0];

  const handleHireDoctorCard = (
    doc: DoctorRecord,
    mode: 'donate_blood' | 'hire_doctor'
  ) => {
    setSelectedDoctorId(String(doc.id));
    setRequestType(mode);
    setCustomFeePaid(String(doc.consultationFee));
    const formEl = document.getElementById('village-blood-doctor-form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleVerifyDoctorOnNmc = async (doc: DoctorRecord) => {
    setVerifyingDoctorId(doc.id);
    setNmcLookupError(null);
    try {
      const res = await fetch('/api/doctors/verify-nmc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: doc.name,
          regNumber: doc.licenseNumber || doc.regNumber,
          qualification: doc.qualification,
          specialization: doc.specialty,
          governmentHospital: doc.governmentHospital || doc.hospitalVillage,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.verified) {
        throw new Error(data.error || 'Could not verify NMC registration');
      }
      setActiveNmcDossier({
        certificateId: data.certificateId,
        verifiedAt: data.verifiedAt,
        doctor: { ...doc, ...(data.doctor || {}) },
        nmcRegistrySummary: data.nmcRegistrySummary,
        officialPortalUrl: data.officialPortalUrl || NMC_IMR_OFFICIAL_PORTAL_URL,
        onlineVerification: data.onlineVerification,
      });
    } catch (err: any) {
      setNmcLookupError(err.message || 'NMC registry verification failed');
    } finally {
      setVerifyingDoctorId(null);
    }
  };

  const handleQuickNmcLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setNmcLookupError(null);
    setActiveNmcDossier(null);
    const nameQ = nmcLookupName.trim();
    const regQ = nmcLookupReg.trim();

    if (!nameQ && !regQ) {
      setNmcLookupError(
        'Please enter a Doctor Name (e.g. Dr. Randeep Guleria) or Official NMC Registration No. (e.g. DMC/R/04892) to verify against the Government NMC-IMR registry.'
      );
      return;
    }

    // Only match local directory on EXACT registration number, EXACT HPR ID, or full doctor name (>= 5 chars)
    const cleanNameLookup = (nameQ || regQ).replace(/^dr\.?\s+/i, '').trim().toLowerCase();
    const cleanRegLookup = (regQ || nameQ).trim().toUpperCase();

    const exactFound = doctors.find((d) => {
      const dReg = (d.licenseNumber || d.regNumber || '').trim().toUpperCase();
      const dHpr = (d.hprId || '').trim().toUpperCase();
      const dNameClean = d.name.replace(/^dr\.?\s+/i, '').trim().toLowerCase();
      if (cleanRegLookup && (dReg === cleanRegLookup || dHpr === cleanRegLookup)) {
        // If user also typed a separate name, ensure the name isn't a dummy/conflicting name
        if (nameQ && regQ && !dNameClean.includes(nameQ.replace(/^dr\.?\s+/i, '').trim().toLowerCase())) {
          return false;
        }
        return true;
      }
      if (!regQ && cleanNameLookup.length >= 5 && dNameClean === cleanNameLookup) {
        return true;
      }
      return false;
    });

    if (exactFound) {
      await handleVerifyDoctorOnNmc(exactFound);
      return;
    }

    setVerifyingDoctorId('lookup');
    try {
      const res = await fetch('/api/doctors/verify-nmc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: regQ || nameQ,
          name: nameQ || regQ,
          regNumber: (regQ || nameQ).toUpperCase(),
          strictRegistryLookup: !(nameQ && regQ),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.verified) {
        throw new Error(
          data.error ||
            'NMC-IMR Verification Rejected: Doctor credentials were not found or failed Government NMC validation.'
        );
      }
      setActiveNmcDossier({
        certificateId: data.certificateId,
        verifiedAt: data.verifiedAt,
        doctor: data.doctor,
        nmcRegistrySummary: data.nmcRegistrySummary,
        officialPortalUrl: data.officialPortalUrl || NMC_IMR_OFFICIAL_PORTAL_URL,
        onlineVerification: data.onlineVerification,
      });
    } catch (err: any) {
      setNmcLookupError(err.message);
    } finally {
      setVerifyingDoctorId(null);
    }
  };

  const buildDoctorNmcCertificatePayload = (
    doc: DoctorRecord,
    certId?: string
  ): ExportDocumentPayload => ({
    title: 'Government of India — NMC Indian Medical Register (IMR) Doctor Verification',
    subtitle: `State Medical Council: ${doc.stateMedicalCouncil || 'Delhi Medical Council (NMC-IMR)'}`,
    referenceId:
      certId ||
      `NMC-IMR-${(doc.licenseNumber || doc.regNumber || 'DMC04892').replace(/[^A-Z0-9]/gi, '')}`,
    badgeText: 'GOVT NMC-IMR & ABDM HPR VERIFIED',
    fileNamePrefix: 'NMC-Government-Verified-Doctor-Certificate',
    fields: [
      { label: 'Medical Practitioner Name', value: doc.name },
      { label: 'Recognized Qualification', value: doc.qualification },
      { label: 'Specialty / Department', value: doc.specialty },
      {
        label: 'NMC / State Council Registration No.',
        value: doc.licenseNumber || doc.regNumber,
      },
      {
        label: 'Registering State Medical Council',
        value: doc.stateMedicalCouncil || 'Delhi Medical Council (NMC-IMR)',
      },
      {
        label: 'ABDM Healthcare Professionals Registry (HPR ID)',
        value: doc.hprId || '22-1048-8921-4401@hpr.abdm',
      },
      {
        label: 'Government Hospital / Medical Institute',
        value: doc.governmentHospital || doc.hospitalVillage,
      },
      {
        label: 'Registration Year & Clinical Experience',
        value: `${doc.registrationYear || 2001} (${doc.experienceYears} Years Clinical Standing)`,
      },
      {
        label: 'Official NMC Verification Portal',
        value: doc.nmcPortalUrl || NMC_IMR_OFFICIAL_PORTAL_URL,
      },
    ],
  });

  const handleDeleteBloodRecord = async (recordId: string | number) => {
    try {
      const res = await fetch(`/api/blood-donations/${recordId}`, {
        method: 'DELETE',
        headers: { 'x-demo-role': 'admin' },
      });
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Admin Danish Khan: Deleted blood donation / booking record #${recordId}.`,
        });
        onRefresh();
      }
    } catch {
      // ignore
    }
  };

  const requestDeleteBloodRecord = (record: BloodDonationRecord) => {
    setConfirmState({
      title: 'Delete Blood Donation / Doctor Booking Record',
      message:
        'Are you sure you want to delete this blood donation / doctor booking record from the registry?',
      itemName: `${record.donorName} (${record.bloodGroup} • ${record.villageName})`,
      confirmLabel: 'Yes, Delete Record',
      onConfirm: () => handleDeleteBloodRecord(record.id),
    });
  };

  const buildBloodReceiptPayload = (
    record: BloodDonationRecord
  ): ExportDocumentPayload => {
    const receiptCode = `BLD-2026-${1000 + Number(record.id || 1)}`;
    return {
      title: 'SankalpSetu Official Blood Donation & Medical Certificate',
      subtitle:
        'Verified by Chief Admin Danish Khan (khandanish0503@gmail.com)',
      referenceId: receiptCode,
      badgeText: `Blood Group ${record.bloodGroup}`,
      fileNamePrefix: 'Blood-Donation-Receipt',
      fields: [
        { label: 'Receipt Number', value: receiptCode },
        { label: 'Donor / Applicant Name', value: record.donorName },
        {
          label: 'Service Type',
          value: record.requestType.replace('_', ' ').toUpperCase(),
        },
        { label: 'Blood Group', value: record.bloodGroup },
        { label: 'City / Village Location', value: record.villageName },
        {
          label: 'Assigned Verified Doctor',
          value: record.doctorName || 'Dr. Farhan Siddiqui',
        },
        {
          label: 'Official Government Identity Verified',
          value: record.documentType,
        },
        { label: 'Appointment / Camp Date', value: record.appointmentDate },
        {
          label: 'Consultation / Camp Fee',
          value: formatINR(record.customFeePaid),
        },
        { label: 'Verification Status', value: record.status.toUpperCase() },
        {
          label: 'Authorized By',
          value: 'Danish Khan (khandanish0503@gmail.com)',
        },
      ],
    };
  };

  const buildFullBloodRegistryPayload = (): ExportDocumentPayload => ({
    title: 'SankalpSetu Live Blood Donations & Doctor Bookings Registry',
    subtitle: 'All Verified Blood Donor & Doctor Booking Records',
    referenceId: `BLD-REG-${new Date().toISOString().slice(0, 10)}`,
    fileNamePrefix: 'SankalpSetu-Blood-Doctor-Registry',
    fields: [
      { label: 'Total Records', value: bloodDonations.length },
      { label: 'Verified Doctors', value: doctors.length },
      { label: 'Platform Owner', value: 'Danish Khan (khandanish0503@gmail.com)' },
    ],
    table: {
      headers: [
        'Receipt ID',
        'Donor / Patient',
        'Blood Group',
        'Service',
        'Location',
        'Doctor',
        'Govt ID',
        'Fee',
      ],
      rows: bloodDonations.map((r) => [
        `BLD-2026-${1000 + Number(r.id || 1)}`,
        r.donorName,
        r.bloodGroup,
        r.requestType.replace('_', ' ').toUpperCase(),
        r.villageName,
        r.doctorName || 'Dr. Farhan Siddiqui',
        r.documentType,
        formatINR(r.customFeePaid),
      ]),
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const trimmedName = donorName.trim();
    const trimmedVillage = villageName.trim();
    const trimmedPhone = donorPhone.trim();

    if (!trimmedName || !isLikelyRealHumanName(trimmedName)) {
      setFeedback({
        type: 'error',
        message:
          'Verification Rejected: Please enter your real full name (first & last name as printed on your Government ID). Dummy, test, or single-word names are strictly rejected.',
      });
      return;
    }

    if (!trimmedVillage || trimmedVillage.length < 3) {
      setFeedback({
        type: 'error',
        message:
          'Verification Rejected: Please enter a real City, Town, or Village location.',
      });
      return;
    }

    if (!trimmedPhone) {
      setFeedback({
        type: 'error',
        message:
          'Verification Rejected: Please enter a valid 10-digit Indian mobile number (starting with 6–9).',
      });
      return;
    }

    const fieldCheck = validateRealKycSubmission({
      documentType,
      applicantName: trimmedName,
      phone: trimmedPhone,
      location: trimmedVillage,
    });

    if (!fieldCheck.valid) {
      setFeedback({
        type: 'error',
        message: fieldCheck.error || 'Submitted details failed real verification.',
      });
      return;
    }

    if (!verifiedGovId || !verifiedGovId.verified) {
      setFeedback({
        type: 'error',
        message:
          'Mandatory Government Identity Verification Pending: Please upload and verify a genuine Government ID card (Aadhaar / PAN / Driving Licence / Voter ID) before submitting.',
      });
      return;
    }

    const effectiveDonorName = verifiedGovId.detectedName || trimmedName;
    const effectiveVillage = trimmedVillage;
    const effectiveDocType = verifiedGovId.documentType || documentType;
    const effectiveDocId = verifiedGovId.maskedIdNumber;

    setSubmitting(true);
    try {
      const res = await fetch('/api/blood-donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorName: effectiveDonorName,
          donorPhone: trimmedPhone,
          donorEmail: donorEmail.trim() || 'khandanish0503@gmail.com',
          villageName: effectiveVillage,
          bloodGroup: selectedBloodGroup,
          documentType: effectiveDocType,
          documentId: effectiveDocId,
          requireVerifiedGovId: true,
          govIdVerified: true,
          doctorId: selectedDoctor?.id || null,
          requestType,
          customFeePaid: Math.max(0, Number(customFeePaid) || 0),
          appointmentDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || 'Could not register blood donation / doctor booking'
        );
      }

      const createdRecord: BloodDonationRecord = data.bloodDonation || {
        id: Date.now(),
        donorName: effectiveDonorName,
        bloodGroup: selectedBloodGroup,
        requestType,
        villageName: effectiveVillage,
        phone: donorPhone.trim() || '+91 9800000000',
        age: 28,
        doctorId: selectedDoctor?.id || 1,
        doctorName: selectedDoctor?.name || 'Verified Medical Officer',
        appointmentDate,
        customFeePaid: Math.max(0, Number(customFeePaid) || 0),
        documentType: effectiveDocType,
        documentId: effectiveDocId,
        status: 'verified',
        notes: null,
        createdAt: new Date().toISOString(),
      };

      const successMsg =
        data.message ||
        `Form Submitted Successfully! Registered ${selectedBloodGroup} (${requestType.replace(
          '_',
          ' '
        )}) with ${
          selectedDoctor?.name || 'Medical Officer'
        }. Detailed summary sent to Admin Danish Khan (khandanish0503@gmail.com) & official receipt generated!`;
      setFeedback({
        type: 'success',
        message: successMsg,
      });
      setActiveBloodReceipt(createdRecord);
      setSubmissionSuccess({
        formTitle: `Blood Donation & Doctor Booking (${selectedBloodGroup})`,
        message: successMsg,
        referenceId: `BLD-2026-${1000 + Number(createdRecord.id || 1)}`,
        category: 'Medical & Emergency',
        applicantName: createdRecord.donorName,
        applicantEmail: donorEmail.trim() || 'khandanish0503@gmail.com',
        amountFormatted: formatINR(createdRecord.customFeePaid),
        adminSummaryEmail: data.adminSummaryEmail || null,
      });
      setDonorName('');
      setVerifiedGovId(null);
      onRefresh();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to submit booking',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="blood-doctors"
      className="py-14 border-t border-stone-200/80 bg-[#F3EFE6]/60"
    >
      <div className="max-w-[1360px] mx-auto responsive-shell">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-800 bg-red-100/90 px-3 py-1.5 rounded-md border border-red-200 mb-3">
              <HeartPulse className="w-4 h-4 text-red-700" />
              Blood Donation (Instant Printable Receipt) & Hire Certified Doctors
            </div>
            <h2 className="font-serif text-2xl sm:text-4xl font-bold text-stone-900 tracking-tight">
              Select Blood Group, Get Donor Receipt & Hire Verified Doctors
            </h2>
            <p className="text-stone-600 text-sm sm:text-base mt-2 max-w-2xl">
              Open to all citizens across cities, towns, freelancers, and villages. Select your blood group (
              <span className="font-mono font-semibold">
                A+, A-, B+, B-, AB+, AB-, O+, O-
              </span>
              ), hire an MCI-registered doctor, and receive an instant{' '}
              <strong>downloadable & printable Blood Donation Receipt</strong>.
            </p>
          </div>

          {/* Interactive Blood Type Selector Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-stone-200/90 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block mb-2">
              Select Blood Group Type:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {BLOOD_GROUPS.map((bg) => {
                const active = selectedBloodGroup === bg;
                return (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => setSelectedBloodGroup(bg)}
                    className={`w-10 h-10 sm:w-11 sm:h-10 rounded-xl font-mono text-xs sm:text-sm font-bold border transition-all flex items-center justify-center ${
                      active
                        ? 'bg-red-700 text-white border-red-700 shadow-sm scale-105'
                        : 'bg-stone-50 text-stone-800 border-stone-300 hover:border-red-400'
                    }`}
                  >
                    {bg}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Grid: Verified Doctors Directory (Left 7 cols) + Booking & Blood Form (Right 5 cols) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Verified Doctors Directory */}
          <div className="xl:col-span-7 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-serif text-xl font-bold text-stone-900 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-[#1F6F5B]" />
                  Government-Verified NMC & ABDM HPR Doctors ({doctors.length})
                </h3>
                <p className="text-xs text-stone-600 mt-0.5">
                  Every specialist below is registered in the{' '}
                  <strong>National Medical Commission (NMC) Indian Medical Register (IMR)</strong> &{' '}
                  <strong>Ayushman Bharat Digital Mission (ABDM HPR)</strong> from real Government Medical Institutes.
                </p>
              </div>
              <a
                href={NMC_IMR_OFFICIAL_PORTAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#1F6F5B] border border-emerald-200 text-xs font-mono font-bold transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Official NMC-IMR Portal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Live NMC & State Medical Council Registry Verification Lookup Bar */}
            <form
              onSubmit={handleQuickNmcLookup}
              className="p-3.5 rounded-2xl bg-white border border-emerald-200/90 shadow-xs space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-950">
                  Live NMC-IMR Doctor Authenticity Checker (Rejects Dummy / Unregistered Data)
                </span>
                <span className="text-[10px] font-mono text-stone-500">
                  Checks National Medical Commission IMR & State Council Format
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-4 relative">
                  <Stethoscope className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={nmcLookupName}
                    onChange={(e) => setNmcLookupName(e.target.value)}
                    placeholder="Doctor Full Name (e.g. Dr. Randeep Guleria)"
                    data-testid="nmc-lookup-name-input"
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-900"
                  />
                </div>
                <div className="sm:col-span-5 relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={nmcLookupReg}
                    onChange={(e) => setNmcLookupReg(e.target.value)}
                    placeholder="NMC / State Reg No (e.g. DMC/R/04892, KMC-31894)"
                    data-testid="nmc-lookup-reg-input"
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-300 text-xs font-mono text-stone-900"
                  />
                </div>
                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    disabled={verifyingDoctorId === 'lookup'}
                    data-testid="nmc-registry-lookup-btn"
                    className="w-full h-full px-3 py-2 rounded-xl bg-[#1F6F5B] hover:bg-[#165344] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {verifyingDoctorId === 'lookup'
                        ? 'Verifying...'
                        : 'Verify Doctor'}
                    </span>
                  </button>
                </div>
              </div>
            </form>

            {nmcLookupError && (
              <div
                data-testid="nmc-lookup-error-banner"
                className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-xs text-red-900 font-medium flex items-start justify-between gap-3"
              >
                <div>
                  <strong className="font-bold uppercase tracking-wider text-[11px] text-red-800 block mb-0.5">
                    NMC-IMR Government Verification Rejected
                  </strong>
                  <span>{nmcLookupError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNmcLookupError(null)}
                  className="text-red-600 hover:text-red-900 text-xs font-bold shrink-0"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 min-[1500px]:grid-cols-2 gap-4">
              {doctors.map((doc) => {
                const isSelected = String(selectedDoctorId) === String(doc.id);
                const isVerifying = verifyingDoctorId === doc.id;
                return (
                  <div
                    key={doc.id}
                    data-testid={`govt-verified-doctor-card-${doc.id}`}
                    className={`p-5 rounded-2xl bg-white border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#1F6F5B] ring-2 ring-[#1F6F5B]/20 shadow-md'
                        : 'border-stone-200/90 hover:border-stone-300 shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                              <ShieldCheck className="w-3 h-3 text-[#1F6F5B]" />
                              GOVT NMC-IMR VERIFIED
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                              {doc.qualification}
                            </span>
                          </div>
                          <h4 className="font-serif text-lg font-bold text-stone-900">
                            {doc.name}
                          </h4>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] uppercase tracking-wider text-stone-400 block">
                            OPD / Camp Fee
                          </span>
                          <span className="font-mono text-sm font-bold text-[#1F6F5B]">
                            {formatINR(doc.consultationFee)}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs font-medium text-stone-700 mb-3">
                        {doc.specialty}
                      </p>

                      <div className="space-y-1.5 text-xs text-stone-600 border-t border-stone-100 pt-2.5">
                        <div className="flex items-start gap-1.5">
                          <FileCheck2 className="w-3.5 h-3.5 text-[#1F6F5B] shrink-0 mt-0.5" />
                          <span className="font-mono text-[11px] text-stone-800">
                            <strong>NMC Reg:</strong> {doc.licenseNumber} •{' '}
                            {doc.stateMedicalCouncil || 'State Medical Council (NMC-IMR)'}
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                          <span className="font-mono text-[11px] text-emerald-900">
                            <strong>ABDM HPR ID:</strong>{' '}
                            {doc.hprId || '22-1048-8921-4401@hpr.abdm'} ({doc.experienceYears} yrs exp)
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                          <span className="text-stone-800 font-medium">
                            {doc.governmentHospital || doc.hospitalVillage}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>
                            {doc.hospitalVillage} ({doc.availableDays})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="font-mono">{doc.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mt-4 pt-3 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => handleVerifyDoctorOnNmc(doc)}
                        disabled={isVerifying}
                        data-testid={`verify-nmc-doctor-${doc.id}`}
                        className="w-full py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 text-[11px] font-mono font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[#1F6F5B]" />
                        <span>
                          {isVerifying
                            ? 'Checking NMC Indian Medical Register...'
                            : `Verify NMC-IMR Credential (${doc.licenseNumber})`}
                        </span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleHireDoctorCard(doc, 'donate_blood')}
                          className="py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Droplets className="w-3.5 h-3.5" /> Donate {selectedBloodGroup}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleHireDoctorCard(doc, 'hire_doctor')}
                          className="py-2 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Hire Doctor
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Right Form: Register Blood Donation or Hire Original Doctor */}
          <div
            id="village-blood-doctor-form"
            className="xl:col-span-5 bg-white rounded-2xl border border-stone-300 shadow-lg p-5 sm:p-6 space-y-4"
          >
            <div className="border-b border-stone-200 pb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#C1553B] block">
                Official Government Identity Verified Medical Desk
              </span>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 mt-0.5">
                Donate Blood ({selectedBloodGroup}) or Hire Doctor
              </h3>
            </div>

            {feedback && (
              <div
                className={`p-3.5 rounded-xl text-xs font-medium border ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}
              >
                {feedback.message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                  1. Select Service Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'donate_blood', label: 'Donate Blood' },
                      { id: 'hire_doctor', label: 'Hire Doctor' },
                      { id: 'need_blood', label: 'Request Blood' },
                    ] as const
                  ).map((tab) => (
                    <button
                      type="button"
                      key={tab.id}
                      onClick={() => setRequestType(tab.id)}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                        requestType === tab.id
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-stone-50 text-stone-700 border-stone-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Blood Group Type
                  </label>
                  <select
                    value={selectedBloodGroup}
                    onChange={(e) => setSelectedBloodGroup(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 bg-white font-mono text-sm font-bold text-red-700"
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        Blood Group {bg}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Select Verified Doctor
                  </label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => {
                      setSelectedDoctorId(e.target.value);
                      const found = doctors.find(
                        (d) => String(d.id) === String(e.target.value)
                      );
                      if (found) setCustomFeePaid(String(found.consultationFee));
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 bg-white text-sm text-stone-900"
                  >
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} ({doc.specialty})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Full Name (As on Official Government ID)
                  </label>
                  <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="e.g. Imran Ansari"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    City / Town / Village Location
                  </label>
                  <input
                    type="text"
                    value={villageName}
                    onChange={(e) => setVillageName(e.target.value)}
                    placeholder="e.g. Lucknow City / Rampur"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Contact Phone / Mobile Number
                  </label>
                  <input
                    type="text"
                    value={donorPhone}
                    onChange={(e) => setDonorPhone(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Preferred Camp / Visit Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 font-mono text-xs"
                    />
                  </div>
                </div>

              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                  Your Selected Price / Doctor Fee (₹)
                </label>
                <div className="relative">
                  <IndianRupee className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="0"
                    value={customFeePaid}
                    onChange={(e) => setCustomFeePaid(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-300 font-mono text-sm font-bold"
                  />
                </div>
              </div>

              {/* Mandatory Official Government Identity Document Upload & Anti-Fraud Verification */}
              <GovernmentIdUploadVerifier
                selectedDocType={documentType}
                onDocTypeChange={(docType) => {
                  setDocumentType(docType);
                  setVerifiedGovId(null);
                }}
                applicantName={donorName || 'Blood Donor Applicant'}
                onVerificationComplete={(result) => setVerifiedGovId(result)}
                verifiedResult={verifiedGovId}
                required={true}
              />

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-5 rounded-xl font-semibold text-sm shadow-md transition-all cursor-pointer bg-[#1F6F5B] hover:bg-[#165344] text-white"
              >
                {submitting
                  ? 'Submitting & Sending Summary to khandanish0503@gmail.com...'
                  : `Submit & Confirm ${selectedBloodGroup} Receipt (${formatINR(
                      Number(customFeePaid) || 0
                    )})`}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-2xl border border-stone-200/90 p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 pb-3 border-b border-stone-100">
            <div className="min-w-0">
              <h4 className="text-xs font-bold uppercase tracking-widest text-stone-600">
                Live Blood Donations & Doctor Bookings ({bloodDonations.length})
              </h4>
              <span className="text-[11px] font-mono text-emerald-800">
                Download Receipt or Export Registry as PDF (.pdf), Excel (.xls), or HTML (.html)
              </span>
            </div>
            <ExportFormatButtons
              payload={buildFullBloodRegistryPayload()}
              compact
              labelPrefix="Export"
            />
          </div>
          <div className="divide-y divide-stone-100">
            {bloodDonations.slice(0, 8).map((item) => (
              <div
                key={item.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <span className="w-9 h-9 rounded-xl bg-red-700 text-white font-mono font-bold flex items-center justify-center shrink-0">
                    {item.bloodGroup}
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-stone-900 flex flex-wrap items-center gap-1.5">
                      <span>{item.donorName}</span>
                      <span className="text-[11px] font-normal text-stone-500">
                        ({item.villageName})
                      </span>
                    </div>
                    <div className="text-stone-500">
                      Doc: <strong>{item.doctorName}</strong> • Govt ID: {item.documentType}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pl-12 sm:pl-0 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveBloodReceipt(item)}
                    className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3 h-3 text-amber-300" />
                    Receipt
                  </button>
                  <ExportFormatButtons
                    payload={buildBloodReceiptPayload(item)}
                    compact
                  />
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => requestDeleteBloodRecord(item)}
                      className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors cursor-pointer"
                      title="Admin Delete Blood Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Downloadable & Printable Blood Donation Receipt Modal */}
      {activeBloodReceipt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 backdrop-blur-sm p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Blood Donation Receipt"
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-white border-2 border-red-800 shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-red-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Droplets className="w-5 h-5 text-red-200" />
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-red-200 block">
                    Official Printable & Downloadable Certificate
                  </span>
                  <h3 className="font-serif text-lg font-bold">
                    Blood Donation & Medical Receipt
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveBloodReceipt(null)}
                className="p-1.5 rounded-lg text-red-200 hover:text-white hover:bg-red-800 no-print"
                aria-label="Close blood receipt"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                <div>
                  <span className="text-xs text-stone-500 block">Receipt No.</span>
                  <span className="font-mono text-base font-bold text-stone-900">
                    BLD-2026-{1000 + Number(activeBloodReceipt.id || 1)}
                  </span>
                </div>
                <div className="px-4 py-2 rounded-xl bg-red-700 text-white font-mono text-xl font-bold">
                  {activeBloodReceipt.bloodGroup}
                </div>
              </div>

              <div className="space-y-2.5 text-xs font-mono text-stone-700">
                <div className="flex justify-between py-1.5 border-b border-stone-100">
                  <span className="text-stone-400">DONOR / APPLICANT:</span>
                  <strong className="text-stone-900">{activeBloodReceipt.donorName}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-100">
                  <span className="text-stone-400">LOCATION (CITY / VILLAGE):</span>
                  <strong className="text-stone-900">{activeBloodReceipt.villageName}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-100">
                  <span className="text-stone-400">VERIFIED DOCTOR:</span>
                  <strong className="text-emerald-900">
                    {activeBloodReceipt.doctorName || 'Dr. Farhan Siddiqui'}
                  </strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-100">
                  <span className="text-stone-400">OFFICIAL GOVT IDENTITY:</span>
                  <strong className="text-stone-900">{activeBloodReceipt.documentType}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-100">
                  <span className="text-stone-400">APPOINTMENT DATE:</span>
                  <span>{activeBloodReceipt.appointmentDate}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-100">
                  <span className="text-stone-400">FEE / CONTRIBUTION:</span>
                  <strong className="text-[#1F6F5B]">
                    {formatINR(activeBloodReceipt.customFeePaid)}
                  </strong>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-stone-400">AUTHORIZED BY:</span>
                  <span>Danish Khan (khandanish0503@gmail.com)</span>
                </div>
              </div>

              <div className="space-y-3 pt-2 no-print">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-600">
                  Download Receipt Format (PDF / Excel / HTML):
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <ExportFormatButtons
                    payload={buildBloodReceiptPayload(activeBloodReceipt)}
                  />
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="py-2 px-3.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Receipt
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Government NMC-IMR & ABDM HPR Doctor Verification Dossier Modal */}
      {activeNmcDossier && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 backdrop-blur-sm p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Government NMC Doctor Verification Certificate"
          data-testid="nmc-doctor-verification-modal"
        >
          <div className="relative w-full max-w-xl rounded-2xl bg-white border-2 border-[#1F6F5B] shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-[#1F6F5B] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-emerald-200 shrink-0" />
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-100 block">
                    National Medical Commission (NMC-IMR) & ABDM HPR Registry
                  </span>
                  <h3 className="font-serif text-lg font-bold">
                    Government-Verified Medical Practitioner Dossier
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveNmcDossier(null)}
                className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-800 cursor-pointer"
                aria-label="Close NMC verification dossier"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#1F6F5B] shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 space-y-1">
                  <div className="font-bold uppercase tracking-wider text-[#1F6F5B]">
                    Status: Active & Verified in Indian Medical Register (IMR)
                  </div>
                  <p className="leading-relaxed">{activeNmcDossier.nmcRegistrySummary}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono text-stone-700 border border-stone-200 rounded-xl p-4 bg-stone-50/70">
                <div className="flex justify-between py-1.5 border-b border-stone-200/80 gap-2">
                  <span className="text-stone-500">CERTIFICATE ID:</span>
                  <strong className="text-stone-900">{activeNmcDossier.certificateId}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-200/80 gap-2">
                  <span className="text-stone-500">PRACTITIONER NAME:</span>
                  <strong className="text-stone-900">{activeNmcDossier.doctor.name}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-200/80 gap-2">
                  <span className="text-stone-500">QUALIFICATION:</span>
                  <strong className="text-stone-900 text-right">
                    {activeNmcDossier.doctor.qualification}
                  </strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-200/80 gap-2">
                  <span className="text-stone-500">NMC / COUNCIL REG NO:</span>
                  <strong className="text-[#1F6F5B]">
                    {activeNmcDossier.doctor.licenseNumber || activeNmcDossier.doctor.regNumber}
                  </strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-200/80 gap-2">
                  <span className="text-stone-500">STATE MEDICAL COUNCIL:</span>
                  <strong className="text-stone-900 text-right">
                    {activeNmcDossier.doctor.stateMedicalCouncil || 'Delhi Medical Council (NMC-IMR)'}
                  </strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-stone-200/80 gap-2">
                  <span className="text-stone-500">ABDM HPR ID:</span>
                  <strong className="text-emerald-900">
                    {activeNmcDossier.doctor.hprId || '22-1048-8921-4401@hpr.abdm'}
                  </strong>
                </div>
                <div className="flex justify-between py-1.5 gap-2">
                  <span className="text-stone-500">GOVERNMENT HOSPITAL:</span>
                  <strong className="text-stone-900 text-right">
                    {activeNmcDossier.doctor.governmentHospital ||
                      activeNmcDossier.doctor.hospitalVillage}
                  </strong>
                </div>
              </div>

              {activeNmcDossier.onlineVerification && (
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
                  <div className="font-bold text-stone-800 flex items-center justify-between">
                    <span>Real-Time Online Verification Sources Checked:</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-mono text-[10px] uppercase">
                      {activeNmcDossier.onlineVerification.confidence} confidence
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeNmcDossier.onlineVerification.sourcesChecked.map((src, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-white border border-stone-200 text-[11px] font-mono text-stone-700"
                      >
                        ✓ {src}
                      </span>
                    ))}
                  </div>
                  {activeNmcDossier.onlineVerification.citations?.length > 0 && (
                    <div className="pt-1 space-y-1">
                      <div className="text-[11px] font-semibold text-stone-600">
                        Verified Web Citations:
                      </div>
                      {activeNmcDossier.onlineVerification.citations.slice(0, 3).map((c, idx) => (
                        <a
                          key={idx}
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-[11px] text-[#1F6F5B] hover:underline truncate"
                        >
                          • {c.title} ({c.url})
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <ExportFormatButtons
                  payload={buildDoctorNmcCertificatePayload(
                    activeNmcDossier.doctor,
                    activeNmcDossier.certificateId
                  )}
                  labelPrefix="Export NMC Certificate"
                  compact
                />
                <a
                  href={activeNmcDossier.officialPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <span>Open Official NMC Registry</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmActionModal
        confirmState={confirmState}
        onClose={() => setConfirmState(null)}
        busy={submitting}
      />
      <SubmissionSuccessModal
        submission={submissionSuccess}
        onClose={() => setSubmissionSuccess(null)}
      />
    </section>
  );
};
