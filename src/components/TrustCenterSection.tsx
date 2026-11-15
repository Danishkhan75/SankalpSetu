import React from 'react';
import { AlertTriangle, CheckCircle2, FileSearch, Gavel, ShieldCheck, UserRoundCheck } from 'lucide-react';

type TrustStatus = 'Verified' | 'Pending' | 'Expired' | 'Rejected' | 'Unverified';

interface VerificationSummary {
  label: string;
  status: TrustStatus;
  method: string;
  source: string;
  timestamp: string;
  reference: string;
  reviewStatus: string;
  expiry?: string;
}

const governmentIdentities: VerificationSummary[] = [
  {
    label: 'Aadhaar Card',
    status: 'Verified',
    method: 'UIDAI eKYC + OCR match',
    source: 'UIDAI / Admin desk',
    timestamp: '2026-11-09 09:15 IST',
    reference: 'UIDAI-8742-1990-5543',
    reviewStatus: 'Pass',
  },
  {
    label: 'PAN Card',
    status: 'Verified',
    method: 'Income Tax portal validation',
    source: 'PAN validation service',
    timestamp: '2026-11-09 09:26 IST',
    reference: 'ABCPD1234F',
    reviewStatus: 'Pass',
  },
  {
    label: 'Driving Licence',
    status: 'Pending',
    method: 'OCR + manual review',
    source: 'Parivahan portal',
    timestamp: '2026-11-09 11:02 IST',
    reference: 'DL-2026-4421108',
    reviewStatus: 'Under review',
  },
  {
    label: 'Passport',
    status: 'Rejected',
    method: 'Image quality check',
    source: 'Passport Seva portal',
    timestamp: '2026-11-08 18:45 IST',
    reference: 'P-7124039',
    reviewStatus: 'Rejected',
    expiry: 'Re-upload required',
  },
];

const doctorVerifications: VerificationSummary[] = [
  {
    label: 'Dr. Meenakshi Iyer',
    status: 'Verified',
    method: 'NMC-IMR + state registry match',
    source: 'NMC / DMC',
    timestamp: '2026-11-10 07:38 IST',
    reference: 'DMC/R/04892',
    reviewStatus: 'Approved',
  },
  {
    label: 'Dr. Randeep Guleria',
    status: 'Verified',
    method: 'ABDM registry match',
    source: 'NMC / ABDM',
    timestamp: '2026-11-09 18:04 IST',
    reference: 'NMC-187420',
    reviewStatus: 'Current',
  },
  {
    label: 'Dr. S. K. Tiwari',
    status: 'Expired',
    method: 'Revalidation due',
    source: 'State Medical Council',
    timestamp: '2026-05-16 12:00 IST',
    reference: 'UPMC/R/3427',
    reviewStatus: 'Revalidation required',
    expiry: 'Expired 2026-11-02',
  },
];

const ngoVerifications: VerificationSummary[] = [
  {
    label: 'Goonj',
    status: 'Verified',
    method: 'NGO DARPAN + 80G',
    source: 'NITI Aayog DARPAN / IT Dept',
    timestamp: '2026-10-28 13:21 IST',
    reference: 'DL/2009/0001428',
    reviewStatus: 'Approved',
  },
  {
    label: 'Smile Foundation',
    status: 'Pending',
    method: '12AB document review',
    source: 'NGO DARPAN',
    timestamp: '2026-11-09 11:45 IST',
    reference: 'MH/2012/001083',
    reviewStatus: 'In progress',
  },
  {
    label: 'HelpAge India',
    status: 'Unverified',
    method: 'Awaiting CSR-1 evidence',
    source: 'MCA / CSR portal',
    timestamp: '2026-11-07 16:10 IST',
    reference: 'CSR-1 pending',
    reviewStatus: 'Not yet eligible',
  },
];

const statusColors: Record<TrustStatus, string> = {
  Verified: 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700',
  Pending: 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700',
  Expired: 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-700',
  Rejected: 'bg-red-100 text-red-900 border border-red-300 dark:bg-red-950/80 dark:text-red-200 dark:border-red-700',
  Unverified: 'bg-slate-200 text-slate-900 border border-slate-300 dark:bg-slate-700 dark:text-slate-50 dark:border-slate-600',
};

function VerificationTable({ rows }: { rows: VerificationSummary[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 dark:border-slate-800">
      <div className="grid grid-cols-[1.2fr,0.7fr,1fr,1fr,0.9fr] gap-2 bg-stone-100/90 dark:bg-slate-900/70 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-600 dark:text-slate-400">
        <span>Entity</span>
        <span>Status</span>
        <span>Method</span>
        <span>Source</span>
        <span>Reference</span>
      </div>
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[1.2fr,0.7fr,1fr,1fr,0.9fr] gap-2 border-t border-stone-200 dark:border-slate-800 px-3 py-3 text-xs text-stone-700 dark:text-slate-200">
          <div>
            <div className="font-semibold text-stone-900 dark:text-white">{row.label}</div>
            <div className="text-[11px] text-stone-500 dark:text-slate-400">{row.timestamp}</div>
          </div>
          <span className={`inline-flex items-center justify-center rounded-full px-2 py-1 text-[10px] font-bold ${statusColors[row.status]}`}>
            {row.status}
          </span>
          <div>{row.method}</div>
          <div>{row.source}</div>
          <div>
            <div className="font-medium break-all">{row.reference}</div>
            {row.expiry && <div className="text-[10px] text-stone-500 dark:text-slate-400">{row.expiry}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TrustCenterSection() {
  return (
    <section id="trust-center" className="py-8 sm:py-10 border-b border-stone-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-950/30">
      <div className="max-w-[1360px] mx-auto responsive-shell">
        <div className="flex flex-col gap-3 pb-5">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            Trust Center
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-white">
            Government-grade trust, verification and grievance transparency
          </h2>
          <p className="max-w-3xl text-sm sm:text-base text-stone-600 dark:text-slate-300">
            SankalpSetu distinguishes official government verification from OCR, quality checks, and manual review. Every campaign, doctor, and NGO profile shows the evidence chain, review status and next action required.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-3xl border border-stone-200 bg-stone-50/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-white">
              <FileSearch className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Government Identity Verification
            </div>
            <VerificationTable rows={governmentIdentities} />
          </div>

          <div className="rounded-3xl border border-stone-200 bg-stone-50/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-white">
              <UserRoundCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Doctor Verification
            </div>
            <VerificationTable rows={doctorVerifications} />
          </div>

          <div className="rounded-3xl border border-stone-200 bg-stone-50/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-white">
              <CheckCircle2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              NGO Verification
            </div>
            <VerificationTable rows={ngoVerifications} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr,0.7fr]">
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-white">
              <Gavel className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Verification history & review flow
            </div>
            <div className="space-y-4">
              {[
                'Document uploaded for review',
                'OCR completed and document quality checks passed',
                'Format validation passed',
                'Authorized government verification succeeded',
                'Manual admin approval completed',
              ].map((step, index) => (
                <div key={step} className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-stone-900 dark:text-white">{step}</div>
                    <div className="text-xs text-stone-500 dark:text-slate-400">Only the final government verification step is treated as official proof.</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-white">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
              Complaint & dispute resolution
            </div>
            <div className="space-y-3 text-sm text-stone-700 dark:text-slate-200">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
                <div className="font-semibold text-amber-900 dark:text-amber-200">Complaint submitted</div>
                <div className="text-xs mt-1">Case #TR-2026-1042 — fraud, document mismatch, or campaign misuse can be filed publicly and tracked.</div>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="font-semibold text-stone-900 dark:text-white">Dispute resolution status</div>
                <div className="text-xs mt-1">Awaiting evidence review from platform team and external verifier.</div>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="font-semibold text-stone-900 dark:text-white">Grievance officer</div>
                <div className="text-xs mt-1">Danish Khan • grievance@sankalpsetu.org • +91 1800-889-7265</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
