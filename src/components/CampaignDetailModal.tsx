import React from 'react';
import { X, MapPin, ShieldCheck, Calendar, CheckCircle2, ArrowUpRight, Users, FileCheck2, CalendarClock } from 'lucide-react';
import { CampaignItem } from '../types';
import { calculateCampaignProgress, formatINR, calculateRepaymentSchedule } from '../utils/donationLogic';
import { CampaignArtwork } from './CampaignArtwork';
import { ExportFormatButtons } from './ExportFormatButtons';

interface CampaignDetailModalProps {
  campaign: CampaignItem | null;
  onClose: () => void;
  onDonateClick: (campaign: CampaignItem) => void;
}

export const CampaignDetailModal: React.FC<CampaignDetailModalProps> = ({
  campaign,
  onClose,
  onDonateClick,
}) => {
  if (!campaign) return null;

  const progress = calculateCampaignProgress(
    campaign.raisedAmount,
    campaign.goalAmount,
    campaign.donorCount
  );

  const repayment = calculateRepaymentSchedule(
    campaign.goalAmount,
    campaign.returnOption || 'monthly',
    campaign.returnDurationMonths || 12
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-3xl rounded-2xl bg-[#FAF7F2] border border-stone-300 shadow-2xl overflow-hidden my-8">
        <div className="relative h-64 w-full overflow-hidden bg-stone-900">
          {campaign.imageUrl ? (
            <img
              src={campaign.imageUrl}
              alt={campaign.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <CampaignArtwork
              theme={campaign.imageTheme}
              title={campaign.title}
              caption={campaign.description}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/40 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-stone-900/80 text-white hover:bg-stone-900 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-5 left-6 right-6 text-white">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-emerald-300 mb-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>{campaign.organizationName}</span>
              <span>•</span>
              <span className="font-mono">Reg: {campaign.organizationRegNo}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-stone-200">
                <MapPin className="w-3.5 h-3.5" /> {campaign.beneficiaryLocation}
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-tight">
              {campaign.title}
            </h2>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6 max-h-[72vh] overflow-y-auto">
          {/* Official Government Identity Verification Box */}
          <div className="p-4 rounded-xl bg-emerald-950 text-emerald-50 border border-emerald-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-emerald-400 uppercase tracking-wider block font-semibold">Applicant</span>
              <strong className="text-sm text-white">{campaign.applicantName || 'Verified Citizen'}</strong>
            </div>
            <div>
              <span className="text-emerald-400 uppercase tracking-wider block font-semibold">Official Government Identity</span>
              <strong className="text-sm text-white flex items-center gap-1">
                <FileCheck2 className="w-4 h-4 text-emerald-400 shrink-0" />
                {campaign.documentType || 'Aadhaar Card (Official Government Identity)'}
              </strong>
              <span className="font-mono text-[11px] text-emerald-300">
                Status: {campaign.verificationStatus || 'Verified'}
              </span>
            </div>
            <div>
              <span className="text-emerald-400 uppercase tracking-wider block font-semibold">Support / Return Plan</span>
              <strong className="text-sm text-amber-300 uppercase flex items-center gap-1">
                <CalendarClock className="w-4 h-4" />
                {campaign.returnOption === 'no_return'
                  ? 'Pure Donator (No Return)'
                  : `${campaign.returnOption || 'monthly'} Return`}
              </strong>
              <span className="font-mono text-[11px] text-emerald-200">{repayment.summaryText}</span>
            </div>
          </div>

          {/* Progress Bar & Financial Ledger */}
          <div className="p-5 rounded-xl bg-white border border-stone-200/90 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-4 mb-3">
              <div>
                <span className="text-xs uppercase tracking-wider text-stone-500 block">
                  Verified Disbursed & Raised
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-2xl sm:text-3xl font-bold text-stone-900">
                    {formatINR(campaign.raisedAmount)}
                  </span>
                  <span className="text-sm text-stone-500 font-mono">
                    of {formatINR(campaign.goalAmount)} goal
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-5 text-sm">
                <div className="flex items-center gap-1.5 text-stone-700">
                  <Users className="w-4 h-4 text-[#1F6F5B]" />
                  <span className="font-mono font-semibold">{campaign.donorCount}</span> supporters
                </div>
                <div className="font-mono font-bold text-[#1F6F5B] bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  {progress.percentage}% Funded
                </div>
              </div>
            </div>

            <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1F6F5B] transition-all duration-500"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>

          {/* Story & Impact Metric */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500">
              Village Field Report & Original Document Audit
            </h3>
            <p className="text-stone-700 leading-relaxed text-base">{campaign.description}</p>
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-sm text-emerald-950 font-medium">
              Field Target: {campaign.impactMetric}
            </div>
          </div>

          {/* Updates Timeline */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500">
              Disbursement Milestones ({campaign.updates.length})
            </h3>
            {campaign.updates.length === 0 ? (
              <p className="text-sm text-stone-500 italic">
                Initial Gram Panchayat physical document inspection completed.
              </p>
            ) : (
              <div className="space-y-3 border-l-2 border-stone-300 pl-4">
                {campaign.updates.map((upd) => (
                  <div key={upd.id} className="p-4 rounded-xl bg-white border border-stone-200">
                    <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                      <span className="font-semibold text-stone-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#1F6F5B]" />
                        {upd.title}
                      </span>
                      <span className="font-mono flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(upd.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-stone-600">{upd.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-stone-200 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-stone-600">
                Download / Export Campaign Report:
              </span>
              <ExportFormatButtons
                payload={{
                  title: `SankalpSetu Campaign Audit & Report — ${campaign.title}`,
                  referenceId: `CMP-${campaign.id}`,
                  badgeText: campaign.category,
                  fileNamePrefix: 'SankalpSetu-Campaign-Report',
                  fields: [
                    { label: 'Campaign Title', value: campaign.title },
                    { label: 'Category', value: campaign.category },
                    { label: 'Applicant Name', value: campaign.applicantName || 'Verified Citizen' },
                    { label: 'Location', value: campaign.beneficiaryLocation },
                    { label: 'Official Govt Identity', value: campaign.documentType || 'Aadhaar Card' },
                    { label: 'Verification Status', value: campaign.verificationStatus || 'Verified' },
                    { label: 'Raised Amount', value: formatINR(campaign.raisedAmount) },
                    { label: 'Goal Amount', value: formatINR(campaign.goalAmount) },
                    { label: 'Support / Return Plan', value: repayment.summaryText },
                    { label: 'Description', value: campaign.description },
                  ],
                }}
                compact
              />
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-stone-100">
              <div className="text-xs text-stone-500">
                Verified by Platform Admin <strong>Danish Khan</strong> (khandanish0503@gmail.com)
              </div>
              <button
                onClick={() => {
                  onClose();
                  onDonateClick(campaign);
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#C1553B] hover:bg-[#A9442C] text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Select Your Own Price & Contribute
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
