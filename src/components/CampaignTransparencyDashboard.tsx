import React from 'react';
import { ArrowRightLeft, BadgeCheck, BanknoteArrowUp, FileText, Landmark, ShieldCheck, TrendingUp } from 'lucide-react';

const financialStats = [
  { label: 'Campaign target', value: '₹4,50,000', accent: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200' },
  { label: 'Total raised', value: '₹4,27,600', accent: 'bg-sky-100 text-sky-900 dark:bg-sky-950/80 dark:text-sky-200' },
  { label: 'Successful payment amount', value: '₹4,12,000', accent: 'bg-violet-100 text-violet-900 dark:bg-violet-950/80 dark:text-violet-200' },
  { label: 'Payment fees', value: '₹6,240', accent: 'bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-200' },
  { label: 'Available for disbursement', value: '₹4,05,760', accent: 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200' },
  { label: 'Total disbursed', value: '₹3,18,400', accent: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200' },
  { label: 'Remaining funds', value: '₹87,360', accent: 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-50' },
  { label: 'Refunds', value: '₹12,800', accent: 'bg-orange-100 text-orange-900 dark:bg-orange-950/80 dark:text-orange-200' },
];

const milestones = [
  {
    name: 'Application submitted',
    status: 'Completed',
    date: '2026-10-09',
    actor: 'Applicant',
    evidence: 'Application ID #S-30124',
    detail: 'Submitted by Rameshwar Patil for solar borewell & water grid support.',
  },
  {
    name: 'Identity verification',
    status: 'Completed',
    date: '2026-10-10',
    actor: 'Verification desk',
    evidence: 'Aadhaar + PAN + ration card verified',
    detail: 'OCR passed and manual review accepted. Government identity status remains separate from manual approval.',
  },
  {
    name: 'Supporting documents reviewed',
    status: 'Completed',
    date: '2026-10-12',
    actor: 'Admin',
    evidence: 'Gram panchayat resolution uploaded',
    detail: 'Community requirement document reviewed before disbursement planning.',
  },
  {
    name: 'Admin approval',
    status: 'Completed',
    date: '2026-10-14',
    actor: 'Danish Khan',
    evidence: 'Campaign approved by platform admin',
    detail: 'Approval confirmed after identity, bank compliance and village impact checks.',
  },
  {
    name: 'Campaign published',
    status: 'Completed',
    date: '2026-10-15',
    actor: 'Fundraiser',
    evidence: 'Live on SankalpSetu campaign page',
    detail: 'Public campaign page released with target, funding model and disbursement route.',
  },
  {
    name: 'Fundraising progress',
    status: 'In progress',
    date: '2026-11-11',
    actor: 'Donors',
    evidence: '₹4,27,600 raised to date',
    detail: 'Public dashboard updated with verified contributions and support-mode breakdown.',
  },
  {
    name: 'Payment reconciliation',
    status: 'Queued',
    date: '2026-11-18',
    actor: 'Finance operations',
    evidence: 'Escrow reconciliation pending',
    detail: 'All successful payments are reconciled before funds move to disbursement stage.',
  },
  {
    name: 'Beneficiary disbursement',
    status: 'Pending',
    date: '2026-11-28',
    actor: 'NGO partner',
    evidence: 'Disbursement to be approved',
    detail: 'Beneficiary transfer is gated by milestone proof and utilization evidence.',
  },
];

const supportDocs = [
  'Gram Sabha resolution and village map',
  'Site plan and water grid costing',
  'Aadhaar and PAN verification record',
  'Escrow ledger and payment reconciliation summary',
  'Beneficiary bank account / UPI verification',
];

const statusStyles: Record<string, string> = {
  Completed: 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700',
  'In progress': 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700',
  Queued: 'bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950/80 dark:text-sky-200 dark:border-sky-700',
  Pending: 'bg-slate-200 text-slate-900 border border-slate-300 dark:bg-slate-700 dark:text-slate-50 dark:border-slate-600',
};

export function CampaignTransparencyDashboard() {
  return (
    <section id="campaign-transparency" className="py-8 sm:py-10 border-b border-stone-200/80 dark:border-slate-800 bg-emerald-950/5 dark:bg-slate-950/40">
      <div className="max-w-[1360px] mx-auto responsive-shell">
        <div className="flex flex-col gap-3 pb-5">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-900 dark:border-violet-800 dark:bg-violet-950/70 dark:text-violet-200">
            <Landmark className="w-3.5 h-3.5" />
            Campaign Transparency Dashboard
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-white">
            Financial transparency and milestone accountability for every live campaign
          </h2>
          <p className="max-w-3xl text-sm sm:text-base text-stone-600 dark:text-slate-300">
            Each campaign shows money received, fees, real disbursement status, refunds and evidence of utilization so supporters can track exactly what is happening in real time.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {financialStats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${stat.accent}`}>
                {stat.label}
              </div>
              <div className="mt-3 text-2xl font-bold text-stone-900 dark:text-white">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-white">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Campaign milestones
            </div>
            <div className="space-y-4">
              {milestones.map((item, index) => (
                <div key={item.name} className="flex gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                      {index + 1}
                    </div>
                    {index < milestones.length - 1 && (
                      <div className="mt-2 h-10 w-px bg-stone-300 dark:bg-slate-700" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-stone-900 dark:text-white">{item.name}</div>
                      <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${statusStyles[item.status]}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-stone-500 dark:text-slate-400">{item.date} • {item.actor}</div>
                    <div className="mt-1 text-xs text-stone-700 dark:text-slate-200">{item.evidence}</div>
                    <div className="mt-2 text-xs text-stone-600 dark:text-slate-300">{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-white">
                <BadgeCheck className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                Utilization updates
              </div>
              <div className="space-y-3 text-sm text-stone-700 dark:text-slate-200">
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="font-semibold text-stone-900 dark:text-white">Water infrastructure progress</div>
                  <div className="mt-1 text-xs">8 of 14 borewells commissioned; pipeline survey completed for remaining 6 villages.</div>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="font-semibold text-stone-900 dark:text-white">Field evidence</div>
                  <div className="mt-1 text-xs">Village committee resolution and beneficiary receipt attached to the public transparency ledger.</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-white">
                <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Supporting documents
              </div>
              <ul className="space-y-2 text-sm text-stone-700 dark:text-slate-200">
                {supportDocs.map((doc) => (
                  <li key={doc} className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Public accountability statement
              </div>
              <p className="text-sm text-stone-600 dark:text-slate-300">
                All funding activity is tracked against verified campaign milestones. Unutilized or disputed funds remain escrowed until review or refund resolution is completed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
