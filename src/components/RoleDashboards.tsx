import React, { useState, useEffect, useCallback } from 'react';
import {
  PlusCircle,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  Building2,
  ArrowUpRight,
  Stethoscope,
  Trash2,
  Edit3,
  Save,
  Calculator,
  Printer,
  History,
  Search,
  Download,
  ShieldCheck,
  Clock,
  FileCheck,
  Upload,
  HeartHandshake,
  Camera,
  ImagePlus,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import {
  CampaignItem,
  DonationRecord,
  UserProfile,
  DoctorRecord,
  BloodDonationRecord,
  AuditLogRecord,
  OrganizationRecord,
  VerificationUploadRecord,
  EmailNotificationRecord,
  ReturnScheduleOption,
  HeroSlideItem,
} from '../types';
import {
  formatINR,
  calculateRepaymentSchedule,
  AuditActionCategory,
  classifyAuditAction,
  filterAuditLogs,
  getDonorSupportType,
  OFFICIAL_GOVERNMENT_IDENTITIES,
  GovernmentIdVerificationResult,
  validateQuickAidRequestForm,
  buildConsolidatedTaxStatementSummary,
  validateNmcDoctorRegistration,
  RBAC_ROLE_DEFINITIONS,
  evaluateRbacAccess,
  GOVERNMENT_VERIFIED_NGOS_DIRECTORY,
  calculateNgoCollectiveMetrics,
  NGO_DARPAN_OFFICIAL_PORTAL_URL,
  resolveHeroThemeFromText,
  buildQwenHeroBannerPrompt,
} from '../utils/donationLogic';
import {
  VerificationUploadModal,
  VerificationTarget,
} from './VerificationUploadModal';
import { GmailNotificationCenter } from './GmailNotificationModal';
import { GovernmentIdUploadVerifier } from './GovernmentIdUploadVerifier';
import {
  ConfirmActionModal,
  ConfirmActionState,
} from './ConfirmActionModal';
import {
  SubmissionSuccessModal,
  SubmissionSuccessInfo,
} from './SubmissionSuccessModal';
import { ExportFormatButtons } from './ExportFormatButtons';
import { HeroBannerPhotoPicker } from './HeroBannerPhotoPicker';
import {
  ExportDocumentPayload,
  downloadConsolidatedTaxReceiptsPdf,
  buildConsolidatedTaxExportPayload,
} from '../utils/exportUtils';

export const UNIVERSAL_CATEGORIES = [
  'Freelancer & Website',
  'Personal & Family',
  'City & Urban',
  'Medical & Healthcare',
  'Village & Rural',
  'Education & Skills',
] as const;

const AUDIT_CATEGORIES: AuditActionCategory[] = [
  'All',
  'NGO Verification',
  'Campaign Approval',
  'Refund & Settlement',
  'Medical & Hospital',
];

interface RoleDashboardsProps {
  currentUser: UserProfile;
  campaigns: CampaignItem[];
  donations: DonationRecord[];
  doctors: DoctorRecord[];
  bloodDonations: BloodDonationRecord[];
  heroSlides?: HeroSlideItem[];
  onHeroSlidesChange?: (slides: HeroSlideItem[]) => void;
  onRefresh: () => void;
  onSelectCampaignForDonation?: (campaign: CampaignItem) => void;
}

export interface NgoPartnerDashboardProps {
  currentUser: UserProfile;
  campaigns: CampaignItem[];
  donations: DonationRecord[];
  organizations: OrganizationRecord[];
  onRefresh: () => void;
  onOpenCampaignVerificationModal?: (campaign: CampaignItem) => void;
  onOpenOrgVerificationModal?: (org: OrganizationRecord) => void;
  onSelectCampaignForDonation?: (campaign: CampaignItem) => void;
  renderLaunchCampaignForm?: () => React.ReactNode;
}

export const NgoPartnerDashboard: React.FC<NgoPartnerDashboardProps> = ({
  currentUser,
  campaigns,
  organizations: initialOrganizations,
  onRefresh,
  onOpenCampaignVerificationModal,
  onOpenOrgVerificationModal,
  onSelectCampaignForDonation,
  renderLaunchCampaignForm,
}) => {
  const [govtNgos, setGovtNgos] = useState<OrganizationRecord[]>(() =>
    initialOrganizations.length > 0
      ? initialOrganizations
      : (GOVERNMENT_VERIFIED_NGOS_DIRECTORY as unknown as OrganizationRecord[])
  );
  const [selectedNgoId, setSelectedNgoId] = useState<number | 'all'>('all');
  const [activeOutreachCampaignId, setActiveOutreachCampaignId] = useState<number | string | null>(
    null
  );
  const [outreachTitle, setOutreachTitle] = useState('');
  const [outreachChannel, setOutreachChannel] = useState(
    'Email, Donor 80G Broadcast & Gram Sabha Notice'
  );
  const [outreachBody, setOutreachBody] = useState('');
  const [outreachSubmitting, setOutreachSubmitting] = useState(false);
  const [ngoBannerMessage, setNgoBannerMessage] = useState<string | null>(null);
  const [ngoBannerError, setNgoBannerError] = useState<string | null>(null);

  // Connect New Government-Verified DARPAN NGO Form State
  const [showNewDarpanForm, setShowNewDarpanForm] = useState(false);
  const [newDarpanName, setNewDarpanName] = useState('');
  const [newDarpanId, setNewDarpanId] = useState('');
  const [newDarpan80G, setNewDarpan80G] = useState('');
  const [newDarpanPan, setNewDarpanPan] = useState('');
  const [newDarpanHq, setNewDarpanHq] = useState('');
  const [connectingNgoId, setConnectingNgoId] = useState<number | null>(null);
  const [showCreateCampaignDrawer, setShowCreateCampaignDrawer] = useState(false);

  const loadGovernmentVerifiedNgos = useCallback(async () => {
    try {
      const res = await fetch('/api/ngos/government-verified');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.organizations) && data.organizations.length > 0) {
          setGovtNgos(data.organizations);
        }
      }
    } catch {
      // Fallback to seeded GOVERNMENT_VERIFIED_NGOS_DIRECTORY
    }
  }, []);

  useEffect(() => {
    loadGovernmentVerifiedNgos();
  }, [loadGovernmentVerifiedNgos, initialOrganizations.length]);

  const collectiveMetrics = calculateNgoCollectiveMetrics(
    campaigns,
    govtNgos,
    selectedNgoId
  );

  const selectedNgoRecord =
    selectedNgoId === 'all'
      ? null
      : govtNgos.find((o) => Number(o.id) === Number(selectedNgoId)) || null;

  const handleToggleConnectGovtNgo = async (ngo: OrganizationRecord) => {
    setConnectingNgoId(Number(ngo.id));
    setNgoBannerError(null);
    setNgoBannerMessage(null);
    const nextConnected = !ngo.partnerConnected;
    try {
      const res = await fetch('/api/ngos/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ngoId: ngo.id,
          connected: nextConnected,
          actorName: currentUser.name,
          actorRole: currentUser.role,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not update NGO partnership status');
      }
      if (Array.isArray(data.organizations)) {
        setGovtNgos(data.organizations);
      } else {
        setGovtNgos((prev) =>
          prev.map((item) =>
            Number(item.id) === Number(ngo.id)
              ? { ...item, partnerConnected: nextConnected }
              : item
          )
        );
      }
      setNgoBannerMessage(
        data.message ||
          `${nextConnected ? 'Connected with' : 'Updated'} ${ngo.name} (DARPAN ID: ${ngo.darpanId || ngo.registrationNo})`
      );
      onRefresh();
    } catch (err: any) {
      setNgoBannerError(err.message || 'Failed to connect with government NGO');
    } finally {
      setConnectingNgoId(null);
    }
  };

  const handleRegisterAndConnectDarpanNgo = async (e: React.FormEvent) => {
    e.preventDefault();
    setNgoBannerError(null);
    setNgoBannerMessage(null);
    try {
      const res = await fetch('/api/ngos/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDarpanName.trim(),
          darpanId: newDarpanId.trim().toUpperCase(),
          reg80g: newDarpan80G.trim().toUpperCase(),
          pan: newDarpanPan.trim().toUpperCase(),
          headquarters: newDarpanHq.trim() || 'New Delhi, India',
          actorName: currentUser.name,
          actorRole: currentUser.role,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'DARPAN NGO verification failed');
      }
      if (Array.isArray(data.organizations)) {
        setGovtNgos(data.organizations);
      }
      setNgoBannerMessage(
        data.message ||
          `Verified & connected "${newDarpanName}" under NITI Aayog NGO DARPAN (${newDarpanId.toUpperCase()}).`
      );
      setNewDarpanName('');
      setNewDarpanId('');
      setNewDarpan80G('');
      setNewDarpanPan('');
      setNewDarpanHq('');
      setShowNewDarpanForm(false);
      onRefresh();
    } catch (err: any) {
      setNgoBannerError(err.message || 'Could not verify DARPAN NGO');
    }
  };

  const handlePostCampaignOutreach = async (
    e: React.FormEvent,
    campaignId: number | string
  ) => {
    e.preventDefault();
    if (!outreachTitle.trim() || !outreachBody.trim()) {
      setNgoBannerError(
        'Please enter both an Outreach Milestone Title and Field Update Summary.'
      );
      return;
    }
    setOutreachSubmitting(true);
    setNgoBannerError(null);
    setNgoBannerMessage(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/outreach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: outreachTitle.trim(),
          body: outreachBody.trim(),
          channel: outreachChannel,
          actorName: `${currentUser.name} (NGO Partner)`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish campaign outreach milestone');
      }
      setNgoBannerMessage(
        data.message ||
          `Outreach Milestone "${outreachTitle}" published and dispatched to donors & beneficiaries!`
      );
      setOutreachTitle('');
      setOutreachBody('');
      setActiveOutreachCampaignId(null);
      onRefresh();
    } catch (err: any) {
      setNgoBannerError(err.message || 'Could not publish outreach update');
    } finally {
      setOutreachSubmitting(false);
    }
  };

  const buildNgoCollectiveReportPayload = (): ExportDocumentPayload => ({
    title: `SankalpSetu NGO Partner Collective Fundraising & Outreach Report`,
    subtitle: selectedNgoRecord
      ? `${selectedNgoRecord.name} • NITI Aayog DARPAN: ${selectedNgoRecord.darpanId || selectedNgoRecord.registrationNo} • 80G: ${selectedNgoRecord.reg80g || selectedNgoRecord.taxExemption80G}`
      : 'All Connected Government-Verified NGOs (NITI Aayog NGO DARPAN · 80G · MCA CSR-1)',
    referenceId: `NGO-COLLECTIVE-${new Date().toISOString().slice(0, 10)}`,
    badgeText: 'NITI AAYOG DARPAN & 80G VERIFIED',
    fileNamePrefix: 'SankalpSetu-NGO-Collective-Outreach-Report',
    fields: [
      {
        label: 'Scope / NGO Partner',
        value: selectedNgoRecord
          ? `${selectedNgoRecord.name} (${selectedNgoRecord.darpanId || selectedNgoRecord.registrationNo})`
          : `All Government-Verified Partner NGOs (${govtNgos.length})`,
      },
      {
        label: 'Collective Funds Raised',
        value: formatINR(collectiveMetrics.totalRaisedAmount),
      },
      {
        label: 'Collective Campaign Goal',
        value: formatINR(collectiveMetrics.totalGoalAmount),
      },
      {
        label: 'Overall Funding Completion',
        value: `${collectiveMetrics.overallCompletionPct}% (Remaining Gap: ${formatINR(collectiveMetrics.remainingFundingGap)})`,
      },
      {
        label: 'Total Verified Donors & Lenders',
        value: `${collectiveMetrics.totalDonorsCount} Contributors`,
      },
      {
        label: 'Pure Grant vs 0% Lender Split',
        value: `Pure Grant: ${formatINR(collectiveMetrics.pureGrantRaisedAmount)} (${collectiveMetrics.pureGrantCampaignsCount} campaigns) • 0% Lender: ${formatINR(collectiveMetrics.lenderRaisedAmount)} (${collectiveMetrics.lenderCampaignsCount} campaigns)`,
      },
      {
        label: 'Connected Government NGOs',
        value: `${collectiveMetrics.connectedGovtNgosCount} NITI Aayog DARPAN Verified NGOs`,
      },
      {
        label: 'Platform Governance',
        value: 'Chief Administrator Danish Khan (khandanish0503@gmail.com)',
      },
    ],
    table: {
      headers: [
        'Campaign ID',
        'Campaign Title',
        'Affiliated Govt NGO',
        '80G / DARPAN Reg',
        'Category',
        'Support Mode',
        'Raised',
        'Goal',
        'Completion %',
        'Outreach Updates',
      ],
      rows: collectiveMetrics.campaignBreakdown.map((item) => [
        `CMP-${item.id}`,
        item.title,
        item.organizationName,
        item.organization80G,
        item.category,
        item.supportModeLabel,
        formatINR(item.raisedAmount),
        formatINR(item.goalAmount),
        `${item.completionPct}%`,
        `${item.updatesCount} Milestones`,
      ]),
    },
  });

  return (
    <div
      data-testid="ngo-partner-dashboard"
      className="space-y-8"
    >
      {/* Top Hero Banner for NGO Partner Dashboard */}
      <div className="rounded-2xl bg-gradient-to-br from-stone-900 via-[#13382E] to-stone-950 text-white p-5 sm:p-7 border border-emerald-700/40 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-mono uppercase tracking-wider font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                NGO Partner Dashboard · NITI Aayog NGO DARPAN & 80G Verified
              </span>
              <a
                href={NGO_DARPAN_OFFICIAL_PORTAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-amber-300 text-[11px] font-mono font-semibold transition-colors"
              >
                <span>Official Registry: ngodarpan.gov.in</span>
                <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
              Verified NGO Partner — Collective Fundraising Metrics & Campaign Outreach
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 max-w-3xl">
              Track collective fundraising performance across all NGO-affiliated campaigns, publish verified beneficiary outreach milestones, upload Form 10BE / 80G utilization certificates, and connect with real Government of India verified NGOs registered on <strong>NITI Aayog NGO DARPAN</strong>, <strong>Income Tax 12AB/80G</strong>, and <strong>MCA CSR-1</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <ExportFormatButtons
              payload={buildNgoCollectiveReportPayload()}
              labelPrefix="Export NGO Report"
            />
            {renderLaunchCampaignForm && (
              <button
                type="button"
                data-testid="ngo-toggle-launch-campaign-btn"
                onClick={() => setShowCreateCampaignDrawer((prev) => !prev)}
                className="px-4 py-2.5 rounded-xl bg-[#C1553B] hover:bg-[#A9442C] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{showCreateCampaignDrawer ? 'Hide Campaign Form' : 'Launch NGO Campaign'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar by Specific Government-Verified NGO Partner */}
        <div className="pt-4 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="ngo-partner-filter-select"
              className="text-xs font-mono uppercase tracking-wider text-emerald-300 font-semibold"
            >
              Filter Collective Metrics by NGO Partner:
            </label>
            <select
              id="ngo-partner-filter-select"
              data-testid="ngo-partner-filter-select"
              value={String(selectedNgoId)}
              onChange={(e) =>
                setSelectedNgoId(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="px-3 py-1.5 rounded-xl bg-stone-900/90 border border-emerald-500/40 text-white text-xs font-mono"
            >
              <option value="all">
                All Connected Government-Verified NGOs ({govtNgos.length} Partners)
              </option>
              {govtNgos.map((ngo) => (
                <option key={ngo.id} value={String(ngo.id)}>
                  {ngo.name} • DARPAN: {ngo.darpanId || ngo.registrationNo}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs font-mono text-stone-300">
            Active NGO Scope:{' '}
            <strong className="text-amber-300">
              {selectedNgoRecord
                ? `${selectedNgoRecord.name} (${selectedNgoRecord.darpanId || selectedNgoRecord.registrationNo})`
                : `All ${govtNgos.length} Verified Partner NGOs`}
            </strong>
          </div>
        </div>

        {/* 5 Collective Fundraising KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15">
            <span className="text-[11px] font-mono uppercase tracking-wider text-stone-300 block">
              Collective Funds Raised
            </span>
            <span
              data-testid="ngo-collective-raised"
              className="font-mono text-xl sm:text-2xl font-bold text-emerald-300 tabular-nums block mt-1"
            >
              {formatINR(collectiveMetrics.totalRaisedAmount)}
            </span>
            <span
              data-testid="ngo-collective-goal"
              className="text-[11px] font-mono text-stone-300 block mt-0.5"
            >
              of {formatINR(collectiveMetrics.totalGoalAmount)} Goal ({collectiveMetrics.overallCompletionPct}%)
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15">
            <span className="text-[11px] font-mono uppercase tracking-wider text-stone-300 block">
              Verified Donors & Lenders
            </span>
            <span
              data-testid="ngo-collective-donors"
              className="font-mono text-xl sm:text-2xl font-bold text-white tabular-nums block mt-1"
            >
              {collectiveMetrics.totalDonorsCount} Supporters
            </span>
            <span className="text-[11px] font-mono text-emerald-300 block mt-0.5">
              Across {collectiveMetrics.totalCampaignsCount} Active Campaigns
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15">
            <span className="text-[11px] font-mono uppercase tracking-wider text-stone-300 block">
              Pure Grant (0% No Tax)
            </span>
            <span className="font-mono text-lg sm:text-xl font-bold text-amber-300 tabular-nums block mt-1">
              {formatINR(collectiveMetrics.pureGrantRaisedAmount)}
            </span>
            <span className="text-[11px] font-mono text-stone-300 block mt-0.5">
              {collectiveMetrics.pureGrantCampaignsCount} Pure Grant Campaigns
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15">
            <span className="text-[11px] font-mono uppercase tracking-wider text-stone-300 block">
              0% Lender Return Pool
            </span>
            <span className="font-mono text-lg sm:text-xl font-bold text-sky-300 tabular-nums block mt-1">
              {formatINR(collectiveMetrics.lenderRaisedAmount)}
            </span>
            <span className="text-[11px] font-mono text-stone-300 block mt-0.5">
              {collectiveMetrics.lenderCampaignsCount} Divided Return Campaigns
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15">
            <span className="text-[11px] font-mono uppercase tracking-wider text-stone-300 block">
              Outreach & Govt Network
            </span>
            <span
              data-testid="ngo-outreach-count"
              className="font-mono text-lg sm:text-xl font-bold text-emerald-300 tabular-nums block mt-1"
            >
              {collectiveMetrics.totalOutreachUpdatesCount} Field Updates
            </span>
            <span
              data-testid="ngo-connected-count"
              className="text-[11px] font-mono text-stone-300 block mt-0.5"
            >
              {collectiveMetrics.connectedGovtNgosCount} Connected Govt NGOs
            </span>
          </div>
        </div>
      </div>

      {/* Feedback & Error Alerts */}
      {ngoBannerMessage && (
        <div
          data-testid="ngo-partner-feedback"
          className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-xs sm:text-sm font-medium text-emerald-950 dark:text-emerald-200 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#1F6F5B] dark:text-emerald-400 shrink-0" />
            <span>{ngoBannerMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setNgoBannerMessage(null)}
            className="text-xs font-mono underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {ngoBannerError && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-xs sm:text-sm font-medium text-red-900 dark:text-red-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{ngoBannerError}</span>
          </div>
          <button
            type="button"
            onClick={() => setNgoBannerError(null)}
            className="text-xs font-mono underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Optional Launch New NGO Campaign Drawer */}
      {showCreateCampaignDrawer && renderLaunchCampaignForm && (
        <div className="max-w-3xl mx-auto">{renderLaunchCampaignForm()}</div>
      )}

      {/* SECTION 1: SPECIFIC CAMPAIGN OUTREACH & BENEFICIARY MILESTONE MANAGER */}
      <div
        data-testid="ngo-campaign-outreach-section"
        className="liquid-glass rounded-2xl overflow-hidden border border-stone-200/90 dark:border-slate-700/90"
      >
        <div className="p-5 sm:p-6 bg-stone-100/90 dark:bg-slate-800/90 border-b border-stone-200 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#1F6F5B] dark:text-emerald-400 font-bold block">
              NGO Campaign Outreach & Utilization Manager
            </span>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-white mt-0.5">
              Manage Specific Campaign Outreach, Beneficiary Updates & 80G Utilization ({collectiveMetrics.campaignBreakdown.length})
            </h3>
            <p className="text-xs text-stone-600 dark:text-slate-300 mt-1">
              Publish real-time field outreach updates, notify contributors across Email/WhatsApp/Gram Sabha channels, and attach 80G/Form 10BE utilization certificates.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ExportFormatButtons
              payload={buildNgoCollectiveReportPayload()}
              compact
              labelPrefix="Outreach Ledger"
            />
          </div>
        </div>

        <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {collectiveMetrics.campaignBreakdown.map((item) => {
            const fullCamp = campaigns.find((c) => String(c.id) === String(item.id));
            const isOutreachOpen = String(activeOutreachCampaignId) === String(item.id);
            const updatesList = fullCamp?.updates || [];

            return (
              <div
                key={item.id}
                data-testid={`ngo-outreach-campaign-card-${item.id}`}
                className="p-5 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-stone-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                      <span className="px-2 py-0.5 rounded bg-stone-900 text-amber-300 font-bold">
                        {item.category}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-[#1F6F5B] dark:text-emerald-300 font-semibold">
                        {item.supportModeLabel}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-stone-500 dark:text-slate-400">
                      80G URN: <strong>{item.organization80G}</strong>
                    </span>
                  </div>

                  <div>
                    <h4 className="font-serif font-bold text-base sm:text-lg text-stone-900 dark:text-white leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-slate-300 mt-1">
                      Affiliated NGO:{' '}
                      <strong className="text-[#1F6F5B] dark:text-emerald-400">
                        {item.organizationName}
                      </strong>{' '}
                      · Location: <strong>{item.location}</strong>
                    </p>
                  </div>

                  {/* Collective Progress Bar */}
                  <div className="space-y-1.5 bg-stone-50 dark:bg-slate-800/60 p-3 rounded-xl border border-stone-200/70 dark:border-slate-700/70">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-stone-900 dark:text-white">
                        Raised: {formatINR(item.raisedAmount)}{' '}
                        <span className="text-stone-400 font-normal">
                          / {formatINR(item.goalAmount)}
                        </span>
                      </span>
                      <span className="font-bold text-[#1F6F5B] dark:text-emerald-400">
                        {item.completionPct}% • {item.donorCount} Donors
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-[#1F6F5B] dark:bg-emerald-500 transition-all"
                        style={{ width: `${Math.max(4, item.completionPct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Recent Field Outreach Updates */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono uppercase text-stone-500 dark:text-slate-400">
                      <span>Recent Outreach Milestones ({updatesList.length})</span>
                      <span className="text-[#1F6F5B] dark:text-emerald-400 font-semibold">
                        Verified Field Feed
                      </span>
                    </div>
                    {updatesList.length > 0 ? (
                      <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                        {updatesList.slice(0, 2).map((u) => (
                          <div
                            key={u.id}
                            className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 text-xs"
                          >
                            <div className="font-semibold text-stone-900 dark:text-white">
                              {u.title}
                            </div>
                            <p className="text-[11px] text-stone-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                              {u.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-stone-500 dark:text-slate-400 italic">
                        No outreach broadcast posted yet — click "Manage Campaign Outreach" below to publish a milestone.
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Bar & Expandable Outreach Broadcast Form */}
                <div className="pt-3 border-t border-stone-200/70 dark:border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        data-testid={`manage-outreach-toggle-${item.id}`}
                        onClick={() => {
                          if (isOutreachOpen) {
                            setActiveOutreachCampaignId(null);
                          } else {
                            setActiveOutreachCampaignId(item.id);
                            setOutreachTitle(
                              `Beneficiary Utilization & Field Verification — ${item.location}`
                            );
                            setOutreachBody(
                              `Disbursed verified tranche for "${item.title}" under ${item.organizationName} (80G: ${item.organization80G}). Field receipts & beneficiary KYC audited.`
                            );
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#1F6F5B] hover:bg-[#185848] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <HeartHandshake className="w-3.5 h-3.5" />
                        <span>
                          {isOutreachOpen ? 'Close Outreach Form' : 'Manage Campaign Outreach'}
                        </span>
                      </button>

                      {fullCamp && onOpenCampaignVerificationModal && (
                        <button
                          type="button"
                          onClick={() => onOpenCampaignVerificationModal(fullCamp)}
                          className="px-2.5 py-1.5 rounded-xl border border-stone-300 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-[#1F6F5B] dark:text-emerald-400" />
                          <span>80G / Utilization Doc</span>
                        </button>
                      )}
                    </div>

                    {fullCamp && onSelectCampaignForDonation && (
                      <button
                        type="button"
                        onClick={() => onSelectCampaignForDonation(fullCamp)}
                        className="px-3 py-1.5 rounded-xl bg-[#C1553B] hover:bg-[#A9442C] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <span>Co-Fund</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {isOutreachOpen && (
                    <form
                      data-testid={`outreach-form-${item.id}`}
                      onSubmit={(e) => handlePostCampaignOutreach(e, item.id)}
                      className="p-3.5 rounded-xl bg-stone-100/90 dark:bg-slate-800/90 border border-stone-300 dark:border-slate-700 space-y-2.5"
                    >
                      <div className="text-xs font-bold uppercase tracking-wider text-[#1F6F5B] dark:text-emerald-400">
                        Publish Campaign Outreach Update & Notify Donors
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[11px] font-semibold text-stone-600 dark:text-slate-300 block mb-1">
                            Milestone Title
                          </label>
                          <input
                            type="text"
                            required
                            data-testid={`outreach-title-input-${item.id}`}
                            value={outreachTitle}
                            onChange={(e) => setOutreachTitle(e.target.value)}
                            placeholder="e.g. Phase-1 Solar Borewell Installed"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-stone-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-stone-600 dark:text-slate-300 block mb-1">
                            Outreach Broadcast Channel
                          </label>
                          <select
                            value={outreachChannel}
                            onChange={(e) => setOutreachChannel(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-stone-900 dark:text-white"
                          >
                            <option value="Email, Donor 80G Broadcast & Gram Sabha Notice">
                              Email, Donor 80G Broadcast & Gram Sabha Notice
                            </option>
                            <option value="WhatsApp & SMS Beneficiary Outreach">
                              WhatsApp & SMS Beneficiary Outreach
                            </option>
                            <option value="CSR-1 & Form 10BE Utilization Filing">
                              CSR-1 & Form 10BE Utilization Filing
                            </option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-stone-600 dark:text-slate-300 block mb-1">
                          Field Utilization & Impact Summary
                        </label>
                        <textarea
                          rows={2}
                          required
                          data-testid={`outreach-body-input-${item.id}`}
                          value={outreachBody}
                          onChange={(e) => setOutreachBody(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-stone-900 dark:text-white"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveOutreachCampaignId(null)}
                          className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-600 text-xs font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          data-testid={`submit-outreach-btn-${item.id}`}
                          disabled={outreachSubmitting}
                          className="px-3.5 py-1.5 rounded-lg bg-[#1F6F5B] hover:bg-[#185848] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                        >
                          {outreachSubmitting
                            ? 'Dispatching...'
                            : 'Publish & Broadcast Outreach'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: CONNECT WITH REAL GOVERNMENT-VERIFIED NGOs (NITI AAYOG NGO DARPAN DIRECTORY) */}
      <div
        data-testid="govt-verified-ngos-directory"
        className="liquid-glass rounded-2xl overflow-hidden border border-stone-200/90 dark:border-slate-700/90"
      >
        <div className="p-5 sm:p-6 bg-stone-100/90 dark:bg-slate-800/90 border-b border-stone-200 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#1F6F5B] dark:text-emerald-400 font-bold">
                Government of India Verified NGO Network · NITI Aayog NGO DARPAN & MCA CSR-1
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-[#1F6F5B] dark:text-emerald-300 text-[10px] font-mono font-bold">
                100% Real Registered Indian NGOs
              </span>
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-white mt-0.5">
              Connect & Co-Sponsor with Real Government-Verified NGOs ({govtNgos.length})
            </h3>
            <p className="text-xs text-stone-600 dark:text-slate-300 mt-1">
              Every organization below is a real Indian non-profit verified with its official <strong>NITI Aayog NGO DARPAN Unique ID</strong>, <strong>Income Tax Section 80G / 12AB URN</strong>, and <strong>Ministry of Corporate Affairs CSR-1 Registration</strong>. Connect to syndicate campaign outreach and co-sponsor verified aid requests.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              data-testid="open-verify-darpan-ngo-btn"
              onClick={() => setShowNewDarpanForm((prev) => !prev)}
              className="px-3.5 py-2 rounded-xl bg-stone-900 dark:bg-emerald-600 hover:bg-stone-800 dark:hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>
                {showNewDarpanForm
                  ? 'Close DARPAN Verification Form'
                  : 'Verify & Link Another Govt NGO (DARPAN ID)'}
              </span>
            </button>
          </div>
        </div>

        {/* Form to Verify & Connect a New NITI Aayog DARPAN NGO */}
        {showNewDarpanForm && (
          <form
            data-testid="verify-darpan-ngo-form"
            onSubmit={handleRegisterAndConnectDarpanNgo}
            className="p-5 sm:p-6 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-800/70 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#1F6F5B] dark:text-emerald-400 font-bold block">
                  Live NITI Aayog NGO DARPAN Registry Verification
                </span>
                <h4 className="font-serif text-base sm:text-lg font-bold text-stone-900 dark:text-white">
                  Link a Registered Indian NGO Partner by DARPAN Unique ID & 80G URN
                </h4>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                  Registered NGO Name *
                </label>
                <input
                  type="text"
                  required
                  data-testid="darpan-ngo-name-input"
                  value={newDarpanName}
                  onChange={(e) => setNewDarpanName(e.target.value)}
                  placeholder="e.g. Narayan Seva Sansthan"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-stone-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                  NITI Aayog DARPAN ID *
                </label>
                <input
                  type="text"
                  required
                  data-testid="darpan-ngo-id-input"
                  value={newDarpanId}
                  onChange={(e) => setNewDarpanId(e.target.value.toUpperCase())}
                  placeholder="e.g. RJ/2009/0001842"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono uppercase text-stone-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                  Section 80G / 12AB URN *
                </label>
                <input
                  type="text"
                  required
                  data-testid="darpan-ngo-80g-input"
                  value={newDarpan80G}
                  onChange={(e) => setNewDarpan80G(e.target.value.toUpperCase())}
                  placeholder="e.g. AAATN9182CE20214"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono uppercase text-stone-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                  Income Tax PAN
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={newDarpanPan}
                  onChange={(e) => setNewDarpanPan(e.target.value.toUpperCase())}
                  placeholder="AAATN9182C"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono uppercase text-stone-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-slate-300 block mb-1">
                  Headquarters City & State
                </label>
                <input
                  type="text"
                  value={newDarpanHq}
                  onChange={(e) => setNewDarpanHq(e.target.value)}
                  placeholder="Udaipur, Rajasthan"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-stone-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewDarpanForm(false)}
                className="px-3.5 py-2 rounded-xl border border-stone-300 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="submit-darpan-ngo-btn"
                className="px-4 py-2 rounded-xl bg-[#1F6F5B] hover:bg-[#185848] text-white text-xs font-semibold cursor-pointer"
              >
                Verify DARPAN ID & Connect NGO Partner
              </button>
            </div>
          </form>
        )}

        {/* Directory Grid of Real Government-Verified NGOs */}
        <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {govtNgos.map((ngo) => {
            const isConnected = ngo.partnerConnected !== false;
            const darpanCode = ngo.darpanId || ngo.registrationNo;
            const reg80GCode = ngo.reg80g || ngo.taxExemption80G;
            const csr1Code = ngo.csr1RegNo || `CSR00000${ngo.id}81`;
            const focusTags =
              Array.isArray(ngo.focusAreas) && ngo.focusAreas.length > 0
                ? ngo.focusAreas
                : ['All Categories', '80G Verified Relief'];

            return (
              <div
                key={ngo.id}
                data-testid={`govt-ngo-card-${ngo.id}`}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                  isConnected
                    ? 'bg-white dark:bg-slate-900 border-emerald-400/70 dark:border-emerald-600/70 shadow-sm'
                    : 'bg-stone-50/90 dark:bg-slate-900/60 border-stone-200 dark:border-slate-800'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-[#1F6F5B] dark:text-emerald-300 text-[10px] font-mono font-bold uppercase">
                      <ShieldCheck className="w-3 h-3" />
                      DARPAN: {darpanCode}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        isConnected
                          ? 'bg-[#1F6F5B] text-white'
                          : 'bg-stone-200 dark:bg-slate-800 text-stone-600 dark:text-slate-400'
                      }`}
                    >
                      {isConnected ? 'Connected Partner' : 'Available to Connect'}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-serif font-bold text-base text-stone-900 dark:text-white leading-snug">
                      {ngo.name}
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                      HQ: <strong>{ngo.headquarters || 'New Delhi, India'}</strong>
                    </p>
                  </div>

                  {/* Official Government Identifiers Box */}
                  <div className="p-3 rounded-xl bg-stone-100/80 dark:bg-slate-800/70 border border-stone-200/70 dark:border-slate-700/70 space-y-1 text-[11px] font-mono">
                    <div className="flex justify-between gap-2">
                      <span className="text-stone-500 dark:text-slate-400">Income Tax 80G:</span>
                      <strong className="text-stone-900 dark:text-white">{reg80GCode}</strong>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-stone-500 dark:text-slate-400">MCA CSR-1 Reg:</span>
                      <strong className="text-stone-900 dark:text-white">{csr1Code}</strong>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-stone-500 dark:text-slate-400">PAN / FCRA:</span>
                      <strong className="text-[#1F6F5B] dark:text-emerald-400">
                        {ngo.pan || 'AAATG4519H'} • Verified
                      </strong>
                    </div>
                  </div>

                  {/* Focus Areas */}
                  <div className="flex flex-wrap gap-1.5">
                    {focusTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded bg-stone-200/70 dark:bg-slate-800 text-stone-700 dark:text-slate-300 text-[10px] font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Connect / Filter / Official Portal Actions */}
                <div className="pt-3 border-t border-stone-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid={`connect-govt-ngo-btn-${ngo.id}`}
                      disabled={connectingNgoId === Number(ngo.id)}
                      onClick={() => handleToggleConnectGovtNgo(ngo)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                        isConnected
                          ? 'bg-emerald-100 dark:bg-emerald-950/90 text-[#1F6F5B] dark:text-emerald-300 border border-emerald-400/60 hover:bg-emerald-200/70'
                          : 'bg-[#1F6F5B] hover:bg-[#185848] text-white shadow-xs'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {connectingNgoId === Number(ngo.id)
                          ? 'Syncing...'
                          : isConnected
                          ? 'Connected Partner ✓'
                          : 'Connect & Co-Sponsor'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedNgoId(Number(ngo.id))}
                      className="px-2.5 py-1.5 rounded-xl border border-stone-300 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800 text-[11px] font-mono text-stone-700 dark:text-slate-300 cursor-pointer"
                    >
                      View Metrics
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {onOpenOrgVerificationModal && (
                      <button
                        type="button"
                        onClick={() => onOpenOrgVerificationModal(ngo)}
                        className="p-1.5 rounded-lg border border-stone-200 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-600 dark:text-slate-300 cursor-pointer"
                        title="Upload 80G / CSR-1 Verification Document"
                      >
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {ngo.officialWebsite && (
                      <a
                        href={ngo.officialWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-mono text-[#1F6F5B] dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>Official Site</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const RoleDashboards: React.FC<RoleDashboardsProps> = ({
  currentUser,
  campaigns,
  donations,
  doctors,
  heroSlides = [],
  onHeroSlidesChange,
  onRefresh,
  onSelectCampaignForDonation,
}) => {
  // Synced local states for instant 0ms UI updates on Add / Delete / Update
  const [localHeroSlides, setLocalHeroSlides] = useState<HeroSlideItem[]>(heroSlides);
  const [localCampaigns, setLocalCampaigns] = useState<CampaignItem[]>(campaigns);
  const [localDoctors, setLocalDoctors] = useState<DoctorRecord[]>(doctors);
  const [localDonations, setLocalDonations] = useState<DonationRecord[]>(donations);

  useEffect(() => {
    setLocalHeroSlides(heroSlides);
  }, [heroSlides]);

  useEffect(() => {
    setLocalCampaigns(campaigns);
  }, [campaigns]);

  useEffect(() => {
    setLocalDoctors(doctors);
  }, [doctors]);

  useEffect(() => {
    setLocalDonations(donations);
  }, [donations]);
  // Universal Fund Request / Fundraiser Form State (Shared across Admin, Fundraiser & User Panels)
  const [title, setTitle] = useState('Emergency Medical & Livelihood Support');
  const [category, setCategory] = useState<string>('Freelancer & Website');
  const [goalAmount, setGoalAmount] = useState('60000');
  const [beneficiaryLocation, setBeneficiaryLocation] = useState('New Delhi');
  const [description, setDescription] = useState(
    'Verified community and medical aid request supported with Official Government Identity.'
  );
  const [applicantName, setApplicantName] = useState(
    currentUser.name || 'Rohan Sharma'
  );
  const [applicantEmail, setApplicantEmail] = useState(
    currentUser.email || 'applicant@sankalpsetu.org'
  );
  const [documentType, setDocumentType] = useState<string>(
    OFFICIAL_GOVERNMENT_IDENTITIES[0]
  );
  const [verifiedGovId, setVerifiedGovId] =
    useState<GovernmentIdVerificationResult | null>(null);
  const [campaignImageUrl, setCampaignImageUrl] = useState<string>('');
  const [campaignImageName, setCampaignImageName] = useState<string>('');
  const [returnOption, setReturnOption] =
    useState<ReturnScheduleOption>('no_return');
  const [returnDurationMonths, setReturnDurationMonths] = useState<number>(12);
  const [returnDate, setReturnDate] = useState<string>('2027-05-01');

  const requestFormValidation = validateQuickAidRequestForm({
    title,
    applicantName,
    applicantEmail,
    goalAmount,
    beneficiaryLocation,
    description,
  });

  // Donor Panel Filter: All vs Pure Donator (No Return) vs Lender (Want Money Back)
  const [donorPanelSupportFilter, setDonorPanelSupportFilter] = useState<
    'all' | 'donator' | 'lender'
  >('all');

  // Consolidated Tax PDF Export State (Donator Dashboard)
  const [taxExportFy, setTaxExportFy] = useState<string>('FY 2026-27 (AY 2027-28)');
  const [taxExportPan, setTaxExportPan] = useState<string>('ABCDE1234F');
  const [taxExportScope, setTaxExportScope] = useState<'all_paid' | 'my_email'>('all_paid');
  const [showConsolidatedTaxModal, setShowConsolidatedTaxModal] = useState<boolean>(false);

  // Verification Upload Modal State & Gmail Notification Store
  const [verificationTarget, setVerificationTarget] =
    useState<VerificationTarget | null>(null);
  const [verificationUploads, setVerificationUploads] = useState<
    VerificationUploadRecord[]
  >([]);
  const [emailNotifications, setEmailNotifications] = useState<
    EmailNotificationRecord[]
  >([]);

  // Admin Edit Campaign State
  const [editingCampaignId, setEditingCampaignId] = useState<
    string | number | null
  >(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('Freelancer & Website');
  const [editGoal, setEditGoal] = useState('');
  const [editRaised, setEditRaised] = useState('');
  const [editReturnOption, setEditReturnOption] =
    useState<ReturnScheduleOption>('monthly');
  const [editReturnMonths, setEditReturnMonths] = useState<number>(12);

  // Admin Hero Slide Manager State
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [slideTitle, setSlideTitle] = useState('');
  const [slideBadge, setSlideBadge] = useState('');
  const [slideLocation, setSlideLocation] = useState('');
  const [slideDocBadge, setSlideDocBadge] = useState('');
  const [slideCaption, setSlideCaption] = useState('');
  const [newSlideTitle, setNewSlideTitle] = useState('');
  const [newSlideBadge, setNewSlideBadge] = useState('All-India Aid');
  const [newSlideLocation, setNewSlideLocation] = useState('New Delhi, Mumbai & All India');
  const [newSlideCaption, setNewSlideCaption] = useState('');
  const [newSlideImageUrl, setNewSlideImageUrl] = useState('');

  // Admin Add Doctor State
  const [docName, setDocName] = useState('');
  const [docSpecialty] = useState(
    'MBBS, MD (Emergency & Blood Transfusion)'
  );
  const [docLicense, setDocLicense] = useState('');
  const [docVillage, setDocVillage] = useState('');
  const [docFee, setDocFee] = useState('300');

  // Admin Add NGO State
  const [newOrgName, setNewOrgName] = useState('');

  // Admin Audit Log & NGO Vetting State
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<
    Array<{
      id: number | string;
      uid: string;
      name: string;
      email: string;
      role: string;
      category?: string;
      provider?: string;
      createdAt?: string;
    }>
  >([]);
  const [auditCategoryFilter, setAuditCategoryFilter] =
    useState<AuditActionCategory>('All');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [customAuditNote, setCustomAuditNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmActionState | null>(
    null
  );
  const [submissionSuccess, setSubmissionSuccess] =
    useState<SubmissionSuccessInfo | null>(null);

  const fetchAdminAuditAndOrgs = useCallback(async () => {
    try {
      const [overviewRes, logsRes, uploadsRes, emailsRes] = await Promise.all([
        fetch('/api/admin/overview', { headers: { 'x-demo-role': 'admin' } }),
        fetch('/api/admin/audit-logs', { headers: { 'x-demo-role': 'admin' } }),
        fetch('/api/verification-uploads'),
        fetch('/api/notifications/emails'),
      ]);
      if (overviewRes.ok) {
        const ovData = await overviewRes.json();
        if (Array.isArray(ovData.organizations)) {
          setOrganizations(ovData.organizations);
        }
        if (Array.isArray(ovData.auditLogs)) {
          setAuditLogs(ovData.auditLogs);
        }
        if (Array.isArray(ovData.registeredUsers)) {
          setRegisteredUsers(ovData.registeredUsers);
        }
      }
      if (logsRes.ok) {
        const lData = await logsRes.json();
        if (Array.isArray(lData.auditLogs)) {
          setAuditLogs(lData.auditLogs);
        }
      }
      if (uploadsRes.ok) {
        const uData = await uploadsRes.json();
        if (Array.isArray(uData.uploads)) {
          setVerificationUploads(uData.uploads);
        }
      }
      if (emailsRes.ok) {
        const eData = await emailsRes.json();
        if (Array.isArray(eData.emailNotifications)) {
          setEmailNotifications(eData.emailNotifications);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchAdminAuditAndOrgs();
  }, [fetchAdminAuditAndOrgs, campaigns.length, donations.length]);

  const previewSchedule = calculateRepaymentSchedule(
    Number(goalAmount) || 0,
    returnOption,
    returnDurationMonths
  );

  const getThemeForCategory = (cat: string) => {
    if (cat.includes('Freelancer')) return 'freelancer';
    if (cat.includes('Personal') || cat.includes('City')) return 'personal';
    if (cat.includes('Medical')) return 'health';
    if (cat.includes('Education')) return 'education';
    return 'water';
  };

  const handleCampaignPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCampaignImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCampaignImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateUniversalCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!requestFormValidation.isValid) {
      const firstErr =
        requestFormValidation.errors.title ||
        requestFormValidation.errors.applicantName ||
        requestFormValidation.errors.applicantEmail ||
        requestFormValidation.errors.goalAmount ||
        requestFormValidation.errors.beneficiaryLocation ||
        requestFormValidation.errors.description;
      setFeedback(`Validation Error: ${firstErr}`);
      return;
    }

    if (!verifiedGovId || !verifiedGovId.verified) {
      setFeedback(
        'Mandatory Verification Error: Official Government Identity is mandatory to submit. Please upload and verify your Official Government Identity (Aadhaar, PAN, Driving Licence, Voter ID, Passport, or Ration Card) via the Government Portal & Gemini Vision/OCR engine before submitting.'
      );
      return;
    }

    setSubmitting(true);

    const effectiveTitle = title.trim();
    const effectiveApplicantName =
      verifiedGovId.detectedName || applicantName.trim();
    const effectiveApplicantEmail = applicantEmail.trim();
    const effectiveLocation = beneficiaryLocation.trim();
    const effectiveDescription = description.trim();
    const effectiveDocType = verifiedGovId.documentType || documentType;
    const effectiveDocId = verifiedGovId.maskedIdNumber;

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-role': currentUser.role,
        },
        body: JSON.stringify({
          title: effectiveTitle,
          category,
          goalAmount: Number(goalAmount) || 60000,
          deadline: returnDate || '2027-05-01',
          beneficiaryLocation: effectiveLocation,
          impactMetric: `${category} • Return: ${previewSchedule.summaryText} (Target Date: ${returnDate})`,
          description: effectiveDescription,
          imageTheme: getThemeForCategory(category),
          imageUrl: campaignImageUrl || undefined,
          applicantName: effectiveApplicantName,
          applicantEmail: effectiveApplicantEmail,
          documentType: effectiveDocType,
          documentId: effectiveDocId,
          rawIdNumber: verifiedGovId.rawExtractedId,
          govIdVerified: true,
          verificationToken: verifiedGovId.verificationToken,
          documentVerified: true,
          returnOption,
          returnDurationMonths,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not submit fund campaign');
      }

      const submittedGoal = Number(goalAmount) || 60000;

      setTitle('');
      setBeneficiaryLocation('');
      setDescription('');
      setApplicantName('');
      setCampaignImageUrl('');
      setCampaignImageName('');
      setVerifiedGovId(null);
      const supportBadge =
        returnOption === 'no_return'
          ? 'Pure Donator Grant (No Money Return Needed)'
          : `Lender Return (${previewSchedule.summaryText})`;
      const successMsg =
        data.message ||
        `Form Submitted Successfully! Published "${effectiveTitle}" under [${category}] (${supportBadge}) verified with ${effectiveDocType}. Detailed summary sent to Admin Danish Khan (khandanish0503@gmail.com).`;
      setFeedback(successMsg);
      if (data.adminSummaryEmail) {
        setEmailNotifications((prev) => [data.adminSummaryEmail, ...prev]);
      }
      setSubmissionSuccess({
        formTitle: `Fund Campaign Request (${category})`,
        message: successMsg,
        referenceId: `CMP-${data.campaign?.id || Date.now()}`,
        category,
        applicantName: effectiveApplicantName,
        applicantEmail: effectiveApplicantEmail,
        amountFormatted: formatINR(submittedGoal),
        adminSummaryEmail: data.adminSummaryEmail || null,
      });
      onRefresh();
      fetchAdminAuditAndOrgs();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const startEditingCampaign = (camp: CampaignItem) => {
    setEditingCampaignId(camp.id);
    setEditTitle(camp.title);
    setEditCategory(camp.category || 'Freelancer & Website');
    setEditGoal(String(camp.goalAmount));
    setEditRaised(String(camp.raisedAmount));
    setEditReturnOption(camp.returnOption || 'monthly');
    setEditReturnMonths(camp.returnDurationMonths || 12);
  };

  const handleAdminSaveCampaign = async (campaignId: string | number) => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-role': 'admin',
        },
        body: JSON.stringify({
          title: editTitle,
          category: editCategory,
          goalAmount: Number(editGoal),
          raisedAmount: Number(editRaised),
          returnOption: editReturnOption,
          returnDurationMonths: Number(editReturnMonths) || 12,
          documentVerified: true,
        }),
      });
      if (!res.ok) throw new Error('Failed to update campaign');
      setEditingCampaignId(null);
      setFeedback(
        'Form Submitted Successfully! Admin Danish Khan updated category, amount, and return division schedule (Recorded in Audit Log).'
      );
      onRefresh();
      fetchAdminAuditAndOrgs();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminUpdateCampaignPhoto = async (
    campaignId: string | number,
    imageUrl: string
  ) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-role': 'admin',
        },
        body: JSON.stringify({ imageUrl }),
      });
      if (res.ok) {
        setFeedback(
          imageUrl
            ? `Admin Danish Khan: Updated photo for campaign #${campaignId}.`
            : `Admin Danish Khan: Removed custom photo for campaign #${campaignId}.`
        );
        onRefresh();
        fetchAdminAuditAndOrgs();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminApproveCampaign = async (
    campaignId: string | number,
    verifiedState: boolean
  ) => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-role': 'admin',
        },
        body: JSON.stringify({ verified: verifiedState }),
      });
      if (!res.ok) throw new Error('Failed to update campaign approval');
      setFeedback(
        `Admin Danish Khan: ${
          verifiedState ? 'Approved & Verified' : 'Paused'
        } campaign #${campaignId} (Logged to Audit Trail).`
      );
      onRefresh();
      fetchAdminAuditAndOrgs();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Admin Hero Slide Handlers
  const startEditingHeroSlide = (slide: HeroSlideItem) => {
    setEditingSlideId(slide.id);
    setSlideTitle(slide.title);
    setSlideBadge(slide.categoryBadge);
    setSlideLocation(slide.location);
    setSlideDocBadge(slide.docBadge);
    setSlideCaption(slide.caption);
  };

  const handleAdminSaveHeroSlide = async (slideId: string) => {
    setSubmitting(true);
    setLocalHeroSlides((prev) => {
      const next = prev.map((s) =>
        s.id === slideId
          ? {
              ...s,
              title: slideTitle,
              categoryBadge: slideBadge,
              location: slideLocation,
              docBadge: slideDocBadge,
              caption: slideCaption,
            }
          : s
      );
      onHeroSlidesChange?.(next);
      return next;
    });
    try {
      const res = await fetch(`/api/hero-slides/${slideId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-role': 'admin',
        },
        body: JSON.stringify({
          title: slideTitle,
          categoryBadge: slideBadge,
          location: slideLocation,
          docBadge: slideDocBadge,
          caption: slideCaption,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.heroSlides)) {
          setLocalHeroSlides(data.heroSlides);
          onHeroSlidesChange?.(data.heroSlides);
        }
        setEditingSlideId(null);
        setFeedback(`Form Submitted Successfully! Updated Hero Section slide "${slideTitle}".`);
        onRefresh();
        fetchAdminAuditAndOrgs();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminUpdateHeroSlidePhoto = async (
    slideId: string,
    imageUrl: string
  ) => {
    setSubmitting(true);
    const updatedSlides = localHeroSlides.map((s) =>
      s.id === slideId ? { ...s, imageUrl: imageUrl || undefined } : s
    );
    setLocalHeroSlides(updatedSlides);
    onHeroSlidesChange?.(updatedSlides);
    try {
      const res = await fetch(`/api/hero-slides/${slideId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-role': 'admin',
        },
        body: JSON.stringify({ imageUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.heroSlides)) {
          setLocalHeroSlides(data.heroSlides);
          onHeroSlidesChange?.(data.heroSlides);
        }
        setFeedback(
          imageUrl
            ? `Admin Danish Khan: Updated Hero Section photo for slide "${slideId}".`
            : `Admin Danish Khan: Removed custom Hero photo for slide "${slideId}".`
        );
        onRefresh();
        fetchAdminAuditAndOrgs();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminDeleteHeroSlide = async (slideId: string) => {
    setSubmitting(true);
    const targetSlide = localHeroSlides.find((s) => s.id === slideId);
    const remainingSlides = localHeroSlides.filter((s) => s.id !== slideId);
    setLocalHeroSlides(remainingSlides);
    onHeroSlidesChange?.(remainingSlides);
    try {
      const res = await fetch(`/api/hero-slides/${slideId}`, {
        method: 'DELETE',
        headers: { 'x-demo-role': 'admin' },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.heroSlides)) {
        setLocalHeroSlides(data.heroSlides);
        onHeroSlidesChange?.(data.heroSlides);
      }
      setFeedback(
        `Admin Danish Khan: Deleted Hero Section slide "${targetSlide?.title || slideId}".`
      );
      onRefresh();
      fetchAdminAuditAndOrgs();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminGenerateExistingSlideQwenPhoto = async (slide: HeroSlideItem) => {
    setSubmitting(true);
    setFeedback(`Generating Qwen/Qwen-Image-2.1 banner for "${slide.title}"...`);
    try {
      const built = buildQwenHeroBannerPrompt({
        title: slide.title,
        categoryBadge: slide.categoryBadge,
        location: slide.location,
        caption: slide.caption,
      });
      const res = await fetch('/api/hf/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: built.prompt,
          title: slide.title,
          caption: slide.caption,
          theme: slide.theme || built.themeHint,
          model: 'Qwen/Qwen-Image-2.1',
        }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        await handleAdminUpdateHeroSlidePhoto(slide.id, data.imageUrl);
        setFeedback(
          `Admin Danish Khan: Generated & applied In-Built Qwen AI (Qwen/Qwen-Image-2.1) photo for "${slide.title}".`
        );
      }
    } catch (err: any) {
      setFeedback(`Error generating Qwen AI photo: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminAddHeroSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveTitle =
      newSlideTitle.trim() ||
      `Verified All-India Relief & Livelihood Support Slide #${localHeroSlides.length + 1}`;
    const effectiveBadge = newSlideBadge.trim() || 'All-India Aid';
    const effectiveLocation = newSlideLocation.trim() || 'New Delhi, Mumbai & All India';
    const effectiveCaption =
      newSlideCaption.trim() ||
      'Verified support campaign with Official Government Identity managed by Admin Danish Khan.';
    const resolvedTheme = resolveHeroThemeFromText(
      `${effectiveBadge} ${effectiveTitle} ${effectiveCaption}`
    );

    setSubmitting(true);
    try {
      const res = await fetch('/api/hero-slides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-role': 'admin',
        },
        body: JSON.stringify({
          title: effectiveTitle,
          categoryBadge: effectiveBadge,
          location: effectiveLocation,
          docBadge: 'Aadhaar & PAN Official Government Identity Verified',
          caption: effectiveCaption,
          theme: resolvedTheme,
          imageUrl: newSlideImageUrl || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.heroSlides)) {
          setLocalHeroSlides(data.heroSlides);
          onHeroSlidesChange?.(data.heroSlides);
        } else if (data.slide) {
          const appendedSlides = [...localHeroSlides, data.slide];
          setLocalHeroSlides(appendedSlides);
          onHeroSlidesChange?.(appendedSlides);
        }
        setNewSlideTitle('');
        setNewSlideCaption('');
        setNewSlideImageUrl('');
        const msg = `Form Submitted Successfully! Added new Hero Section banner "${effectiveTitle}". Summary sent to Admin Danish Khan (khandanish0503@gmail.com).`;
        setFeedback(msg);
        setSubmissionSuccess({
          formTitle: 'Hero Section Banner Added',
          message: msg,
          referenceId: `HERO-${Date.now()}`,
          category: effectiveBadge,
          applicantName: 'Danish Khan',
          applicantEmail: 'khandanish0503@gmail.com',
        });
        onRefresh();
        fetchAdminAuditAndOrgs();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminToggleNgoVerification = async (
    orgId: number,
    nextVerified: boolean
  ) => {
    setSubmitting(true);
    setOrganizations((prev) =>
      prev.map((o) =>
        Number(o.id) === Number(orgId)
          ? {
              ...o,
              verified: nextVerified,
              verificationStatus: nextVerified ? 'Verified' : 'Pending',
            }
          : o
      )
    );
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-role': 'admin',
        },
        body: JSON.stringify({ verified: nextVerified }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update NGO verification');
      if (Array.isArray(data.organizations)) {
        setOrganizations(data.organizations);
      }
      if (Array.isArray(data.auditLogs)) {
        setAuditLogs(data.auditLogs);
      }
      setFeedback(
        `Admin Danish Khan: ${
          nextVerified ? 'Verified NGO 80G Status' : 'Set Pending Status'
        } for Organization #${orgId} (Recorded in Audit Log).`
      );
      onRefresh();
      fetchAdminAuditAndOrgs();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminAddOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveOrgName =
      newOrgName.trim() ||
      `SankalpSetu Verified Welfare & 80G Trust #${organizations.length + 1}`;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-role': 'admin',
        },
        body: JSON.stringify({ name: effectiveOrgName }),
      });
      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data.organizations)) {
          setOrganizations(data.organizations);
        } else if (data.organization) {
          setOrganizations((prev) => [data.organization, ...prev]);
        }
        if (Array.isArray(data.auditLogs)) {
          setAuditLogs(data.auditLogs);
        }
        setNewOrgName('');
        const msg = `Form Submitted Successfully! Added & verified NGO "${effectiveOrgName}" (Logged in Audit Trail & sent to khandanish0503@gmail.com).`;
        setFeedback(msg);
        setSubmissionSuccess({
          formTitle: 'Verified 80G NGO Added',
          message: msg,
          referenceId: `NGO-${Date.now()}`,
          category: 'NGO Verification',
          applicantName: effectiveOrgName,
          applicantEmail: 'khandanish0503@gmail.com',
        });
        onRefresh();
        fetchAdminAuditAndOrgs();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminDeleteOrganization = async (orgId: number) => {
    setSubmitting(true);
    const targetOrg = organizations.find((o) => Number(o.id) === Number(orgId));
    setOrganizations((prev) => prev.filter((o) => Number(o.id) !== Number(orgId)));
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: 'DELETE',
        headers: { 'x-demo-role': 'admin' },
      });
      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data.organizations)) {
          setOrganizations(data.organizations);
        }
        if (Array.isArray(data.auditLogs)) {
          setAuditLogs(data.auditLogs);
        }
        setFeedback(
          `Admin Danish Khan: Deleted NGO "${targetOrg?.name || `#${orgId}`}" (Logged in Audit Trail).`
        );
        onRefresh();
        fetchAdminAuditAndOrgs();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminAddManualAuditLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveNote =
      customAuditNote.trim() ||
      `Verified 80G & Official Government Identity compliance audit by Admin Danish Khan (${new Date().toLocaleTimeString('en-IN')})`;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-role': 'admin',
        },
        body: JSON.stringify({
          action: 'NGO_VERIFIED_COMPLIANCE_AUDIT',
          targetType: 'platform',
          targetId: 1,
          details: effectiveNote,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data.auditLogs)) {
          setAuditLogs(data.auditLogs);
        } else if (data.auditLog) {
          setAuditLogs((prev) => [data.auditLog, ...prev]);
        }
        setAuditCategoryFilter('All');
        setAuditSearchQuery('');
        setCustomAuditNote('');
        const msg = `Form Submitted Successfully! Recorded timestamped Audit Log entry — "${effectiveNote}". Summary sent to khandanish0503@gmail.com.`;
        setFeedback(msg);
        fetchAdminAuditAndOrgs();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadAuditCsv = () => {
    const headers = ['ID', 'Timestamp', 'Actor', 'Role', 'Action', 'Target', 'Details'];
    const rows = filteredAuditLogsList.map((l) => [
      l.id,
      l.createdAt,
      `"${(l.actorName || '').replace(/"/g, '""')}"`,
      l.actorRole,
      l.action,
      `${l.targetType}#${l.targetId}`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SankalpSetu_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAdminClearAuditLogs = async () => {
    setSubmitting(true);
    setAuditLogs([]);
    try {
      const res = await fetch('/api/admin/audit-logs', {
        method: 'DELETE',
        headers: { 'x-demo-role': 'admin' },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.auditLogs)) {
        setAuditLogs(data.auditLogs);
      }
      setFeedback(
        'Admin Danish Khan: Audit Log cleared after confirmation.'
      );
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const requestAdminClearAuditLogs = () => {
    setConfirmState({
      title: 'Clear Entire Admin Audit Log',
      message:
        'Are you sure you want to permanently clear all timestamped entries from the Admin Audit Log? This destructive action cannot be undone.',
      itemName: `All ${auditLogs.length} Audit Log Records`,
      confirmLabel: 'Yes, Clear Audit Log',
      onConfirm: handleAdminClearAuditLogs,
    });
  };

  const handleAdminDeleteCampaign = async (campaignId: string | number) => {
    setSubmitting(true);
    const targetCamp = localCampaigns.find((c) => String(c.id) === String(campaignId));
    setLocalCampaigns((prev) => prev.filter((c) => String(c.id) !== String(campaignId)));
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: { 'x-demo-role': 'admin' },
      });
      if (!res.ok) throw new Error('Could not delete campaign');
      setFeedback(
        `Admin Danish Khan: Deleted campaign "${targetCamp?.title || `#${campaignId}`}" (Logged to Audit Trail).`
      );
      onRefresh();
      fetchAdminAuditAndOrgs();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const requestAdminDeleteCampaign = (camp: CampaignItem) => {
    handleAdminDeleteCampaign(camp.id);
  };

  const requestAdminDeleteHeroSlide = (slide: HeroSlideItem) => {
    handleAdminDeleteHeroSlide(slide.id);
  };

  const requestAdminDeleteOrganization = (org: OrganizationRecord) => {
    handleAdminDeleteOrganization(org.id);
  };

  const handleAdminDeleteRegisteredUser = async (emailToDelete: string) => {
    setSubmitting(true);
    setRegisteredUsers((prev) =>
      prev.filter((u) => u.email.toLowerCase() !== emailToDelete.toLowerCase())
    );
    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(emailToDelete)}`,
        {
          method: 'DELETE',
          headers: { 'x-demo-role': 'admin' },
        }
      );
      const data = await res.json();
      if (res.ok && Array.isArray(data.registeredUsers)) {
        setRegisteredUsers(data.registeredUsers);
      }
      setFeedback(
        `Admin Danish Khan: Removed user account "${emailToDelete}" from PostgreSQL users directory.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    const nmcValidation = validateNmcDoctorRegistration({
      name: docName,
      regNumber: docLicense,
      governmentHospital: docVillage,
    });
    if (!nmcValidation.valid) {
      setFeedback(`NMC Verification Error: ${nmcValidation.error}`);
      return;
    }

    const effectiveDocName = docName.trim().startsWith('Dr.')
      ? docName.trim()
      : `Dr. ${docName.trim()}`;
    const effectiveDocLicense = nmcValidation.normalizedRegNumber;
    const effectiveDocVillage = docVillage.trim() || 'AIIMS Government Medical Center, New Delhi';

    setSubmitting(true);
    try {
      const res = await fetch('/api/doctors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-role': 'admin',
        },
        body: JSON.stringify({
          name: effectiveDocName,
          specialty: docSpecialty,
          qualification: 'MBBS, MD',
          licenseNumber: effectiveDocLicense,
          stateMedicalCouncil: nmcValidation.stateMedicalCouncil,
          hprId: nmcValidation.hprId,
          hospitalVillage: effectiveDocVillage,
          governmentHospital: effectiveDocVillage,
          consultationFee: Number(docFee) || 300,
          availableDays: 'Mon - Sat (9:00 AM - 6:00 PM)',
          phone: '+91 9811223344',
          verified: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not add doctor');
      if (data.doctor) {
        setLocalDoctors((prev) => {
          const filtered = prev.filter(
            (d) =>
              String(d.licenseNumber || '').toUpperCase() !==
              String(data.doctor.licenseNumber || '').toUpperCase()
          );
          return [data.doctor, ...filtered];
        });
      }
      setDocName('');
      setDocLicense('');
      setDocVillage('');
      const onlineSummary = data.onlineVerification?.summary
        ? ` ${data.onlineVerification.summary}`
        : '';
      const msg = `NMC-IMR & Online Doctor Verification Passed! Registered "${effectiveDocName}" (${effectiveDocLicense} • ${
        data.doctor?.stateMedicalCouncil || nmcValidation.stateMedicalCouncil
      }).${onlineSummary} Summary sent to Admin Danish Khan (khandanish0503@gmail.com).`;
      setFeedback(msg);
      setSubmissionSuccess({
        formTitle: 'NMC-IMR & Live Web Verified Doctor Added',
        message: msg,
        referenceId: effectiveDocLicense,
        category: 'Medical & Healthcare (NMC-IMR + Live Web Check)',
        applicantName: effectiveDocName,
        applicantEmail: 'khandanish0503@gmail.com',
        amountFormatted: formatINR(Number(docFee) || 300),
      });
      onRefresh();
      fetchAdminAuditAndOrgs();
    } catch (err: any) {
      setFeedback(`NMC Verification Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminDeleteDoctor = async (doctorId: string | number) => {
    setSubmitting(true);
    const targetDoc = localDoctors.find((d) => String(d.id) === String(doctorId));
    setLocalDoctors((prev) => prev.filter((d) => String(d.id) !== String(doctorId)));
    try {
      await fetch(`/api/doctors/${doctorId}`, {
        method: 'DELETE',
        headers: { 'x-demo-role': 'admin' },
      });
      setFeedback(
        `Admin Danish Khan: Removed doctor "${targetDoc?.name || `#${doctorId}`}".`
      );
      onRefresh();
      fetchAdminAuditAndOrgs();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const requestAdminDeleteDoctor = (doc: DoctorRecord) => {
    handleAdminDeleteDoctor(doc.id);
  };

  const handleRefundDonation = async (donationId: string | number) => {
    setSubmitting(true);
    setLocalDonations((prev) =>
      prev.map((d) =>
        String(d.id) === String(donationId) ? { ...d, status: 'refunded' } : d
      )
    );
    try {
      const res = await fetch(`/api/admin/donations/${donationId}/refund`, {
        method: 'PATCH',
        headers: { 'x-demo-role': 'admin' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refund failed');
      setFeedback(
        'Admin Danish Khan: Donation marked as refunded, campaign ledger recalculated, and DONATION_REFUNDED recorded in Audit Log.'
      );
      onRefresh();
      fetchAdminAuditAndOrgs();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminDeleteDonation = async (donationId: string | number) => {
    setSubmitting(true);
    setLocalDonations((prev) => prev.filter((d) => String(d.id) !== String(donationId)));
    try {
      const res = await fetch(`/api/donations/${donationId}`, {
        method: 'DELETE',
        headers: { 'x-demo-role': 'admin' },
      });
      if (res.ok) {
        setFeedback(`Admin Danish Khan: Deleted donation record #${donationId}.`);
        onRefresh();
        fetchAdminAuditAndOrgs();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const requestAdminDeleteDonation = (don: DonationRecord) => {
    handleAdminDeleteDonation(don.id);
  };

  const filteredAuditLogsList = filterAuditLogs(auditLogs, {
    category: auditCategoryFilter,
    searchQuery: auditSearchQuery,
  });

  const buildDonationReceiptPayload = (
    don: DonationRecord
  ): ExportDocumentPayload => ({
    title: 'SankalpSetu Official Contribution & Lender Receipt',
    subtitle: `Campaign: ${don.campaignTitle || 'Verified Campaign'}`,
    referenceId: don.receiptNumber || don.gatewayOrderId || `DON-${don.id}`,
    badgeText:
      don.returnOption === 'no_return'
        ? 'Pure Donator (0% • No Tax)'
        : don.returnOption === 'directly'
          ? 'Lender (50% Return Money)'
          : `Lender (${(don.returnOption || 'monthly').toUpperCase()})`,
    fileNamePrefix: 'SankalpSetu-Donation-Receipt',
    fields: [
      { label: 'Receipt Number', value: don.receiptNumber || `REC-${don.id}` },
      { label: 'Order ID', value: don.gatewayOrderId },
      { label: 'Donor / Lender Name', value: don.donorName },
      { label: 'Donor Email', value: don.donorEmail },
      { label: 'Campaign Title', value: don.campaignTitle || 'Verified Campaign' },
      { label: 'Amount Contributed', value: formatINR(don.amount) },
      {
        label: 'Support / Return Category',
        value:
          don.returnOption === 'no_return'
            ? 'Pure Donator (0% • No Tax • Nothing Returned)'
            : don.returnOption === 'directly'
              ? 'Lender (50% Return Money)'
              : `Lender (${(don.returnOption || 'monthly').toUpperCase()} Return)`,
      },
      { label: 'Settlement Status', value: don.status.toUpperCase() },
      { label: 'Authorized By', value: 'Danish Khan (khandanish0503@gmail.com)' },
    ],
  });

  const buildDonationsLedgerPayload = (): ExportDocumentPayload => ({
    title: 'SankalpSetu Verified Donation & Lender Ledger Report',
    subtitle: 'Complete PostgreSQL Contribution & Repayment Schedule Ledger',
    referenceId: `LEDGER-${new Date().toISOString().slice(0, 10)}`,
    fileNamePrefix: 'SankalpSetu-Donation-Ledger',
    fields: [
      { label: 'Total Ledger Entries', value: localDonations.length },
      {
        label: 'Total Disbursed Value',
        value: formatINR(
          localDonations
            .filter((d) => d.status === 'paid')
            .reduce((acc, d) => acc + d.amount, 0)
        ),
      },
      { label: 'Platform Owner', value: 'Danish Khan (khandanish0503@gmail.com)' },
    ],
    table: {
      headers: [
        'Receipt No',
        'Order ID',
        'Donor Name',
        'Email',
        'Campaign',
        'Support Type',
        'Amount',
        'Status',
      ],
      rows: localDonations.map((d) => [
        d.receiptNumber || `REC-${d.id}`,
        d.gatewayOrderId,
        d.donorName,
        d.donorEmail,
        d.campaignTitle || 'Campaign',
        d.returnOption === 'no_return'
          ? 'Pure Donator (0%)'
          : d.returnOption === 'directly'
            ? '50% Return'
            : `${(d.returnOption || 'monthly').toUpperCase()}`,
        formatINR(d.amount),
        d.status.toUpperCase(),
      ]),
    },
  });

  const buildCampaignsReportPayload = (): ExportDocumentPayload => ({
    title: 'SankalpSetu Universal Aid Campaigns & Verification Directory',
    subtitle: 'All Active Campaigns Across Freelancer, City, Personal, Medical & Village Categories',
    referenceId: `CAMPAIGNS-${new Date().toISOString().slice(0, 10)}`,
    fileNamePrefix: 'SankalpSetu-Campaigns-Report',
    fields: [
      { label: 'Total Active Campaigns', value: localCampaigns.length },
      { label: 'Verified By', value: 'Admin Danish Khan (khandanish0503@gmail.com)' },
    ],
    table: {
      headers: [
        'ID',
        'Title',
        'Category',
        'Applicant',
        'Location',
        'Govt ID',
        'Raised',
        'Goal',
      ],
      rows: localCampaigns.map((c) => [
        c.id,
        c.title,
        c.category,
        c.applicantName || 'Verified Citizen',
        c.beneficiaryLocation,
        c.documentType || 'Aadhaar Card',
        formatINR(c.raisedAmount),
        formatINR(c.goalAmount),
      ]),
    },
  });

  const buildSingleCampaignPayload = (
    camp: CampaignItem
  ): ExportDocumentPayload => {
    const sched = calculateRepaymentSchedule(
      camp.goalAmount,
      camp.returnOption || 'monthly',
      camp.returnDurationMonths || 12
    );
    return {
      title: `SankalpSetu Campaign & Verification Certificate — ${camp.title}`,
      subtitle: `Category: ${camp.category} • Location: ${camp.beneficiaryLocation}`,
      referenceId: `CMP-${camp.id}`,
      badgeText:
        camp.returnOption === 'no_return'
          ? 'Pure Donator (0% • No Tax)'
          : camp.returnOption === 'directly'
          ? 'Lender (50% Return Money)'
          : `Lender (${(camp.returnOption || 'monthly').toUpperCase()} Return)`,
      fileNamePrefix: 'SankalpSetu-Campaign-Summary',
      fields: [
        { label: 'Campaign ID', value: `CMP-${camp.id}` },
        { label: 'Campaign Title', value: camp.title },
        { label: 'Category', value: camp.category },
        { label: 'Applicant Name', value: camp.applicantName || 'Verified Citizen' },
        { label: 'Applicant Email', value: camp.applicantEmail || 'applicant@sankalpsetu.org' },
        { label: 'Location', value: camp.beneficiaryLocation },
        { label: 'Government Identity', value: camp.documentType || 'Official Aadhaar Card' },
        { label: 'Raised Amount', value: formatINR(camp.raisedAmount) },
        { label: 'Goal Amount', value: formatINR(camp.goalAmount) },
        { label: 'Repayment / Support Schedule', value: sched.summaryText },
        { label: 'Verification Status', value: camp.verificationStatus || 'Verified' },
      ],
    };
  };

  const buildAuditLogsPayload = (): ExportDocumentPayload => ({
    title: 'SankalpSetu Admin Immutable Audit Log Report',
    subtitle: 'Timestamped History of Sensitive Verification, Approval & Settlement Actions',
    referenceId: `AUDIT-${new Date().toISOString().slice(0, 10)}`,
    fileNamePrefix: 'SankalpSetu-Audit-Log',
    fields: [
      { label: 'Filtered Audit Entries', value: filteredAuditLogsList.length },
      { label: 'Filter Category', value: auditCategoryFilter },
      { label: 'Chief Administrator', value: 'Danish Khan (khandanish0503@gmail.com)' },
    ],
    table: {
      headers: ['ID', 'Timestamp', 'Actor', 'Role', 'Action', 'Target', 'Details'],
      rows: filteredAuditLogsList.map((l) => [
        l.id,
        l.createdAt || new Date().toISOString(),
        l.actorName,
        l.actorRole,
        l.action,
        `${l.targetType}#${l.targetId}`,
        l.details,
      ]),
    },
  });

  // Shared Universal Campaign / Fund Request Form Builder (usable in User, Fundraiser, and Admin panels)
  const renderUniversalRequestForm = (panelTitle: string, panelSubtitle: string) => (
    <form
      onSubmit={handleCreateUniversalCampaign}
      className="p-5 sm:p-6 rounded-2xl liquid-glass space-y-4"
    >
      <div className="border-b border-stone-200 dark:border-slate-700 pb-3">
        <span className="text-xs font-bold uppercase tracking-widest text-[#C1553B] dark:text-amber-400 block">
          {panelTitle}
        </span>
        <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-white mt-0.5">
          {panelSubtitle}
        </h3>
      </div>

      {/* Step 1: Select Category (Freelancer, Personal, City, Medical, Village, Education) */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-slate-300 mb-1.5">
          1. Select Category (Freelancer, City, Personal, Medical, Village, Education)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {UNIVERSAL_CATEGORIES.map((cat) => (
            <button
              type="button"
              key={cat}
              onClick={() => setCategory(cat)}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold border text-left transition-all cursor-pointer ${
                category === cat
                  ? 'bg-stone-900 dark:bg-emerald-600 text-white border-stone-900 dark:border-emerald-500 shadow-sm'
                  : 'bg-white/80 dark:bg-slate-800/80 text-stone-700 dark:text-slate-300 border-stone-300 dark:border-slate-700 hover:bg-stone-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Campaign Title, Applicant Name & Applicant Gmail with Real-Time Validation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-slate-300 mb-1">
            <span>Request Title *</span>
            {!requestFormValidation.errors.title && (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1F6F5B] dark:text-emerald-400" />
            )}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Emergency Medical / Community Support"
            aria-invalid={Boolean(requestFormValidation.errors.title)}
            className={`w-full px-3.5 py-2 rounded-xl border bg-white dark:bg-slate-900 text-sm text-stone-900 dark:text-white transition-colors ${
              requestFormValidation.errors.title
                ? 'border-red-400 dark:border-red-700'
                : 'border-emerald-500/80 dark:border-emerald-600'
            }`}
          />
          {requestFormValidation.errors.title && (
            <p className="text-[11px] text-red-600 dark:text-red-400 font-medium mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{requestFormValidation.errors.title}</span>
            </p>
          )}
        </div>
        <div>
          <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-slate-300 mb-1">
            <span>Applicant Name *</span>
            {!requestFormValidation.errors.applicantName && (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1F6F5B] dark:text-emerald-400" />
            )}
          </label>
          <input
            type="text"
            value={applicantName}
            onChange={(e) => setApplicantName(e.target.value)}
            placeholder="e.g. Rohan Sharma"
            aria-invalid={Boolean(requestFormValidation.errors.applicantName)}
            className={`w-full px-3.5 py-2 rounded-xl border bg-white dark:bg-slate-900 text-sm text-stone-900 dark:text-white transition-colors ${
              requestFormValidation.errors.applicantName
                ? 'border-red-400 dark:border-red-700'
                : 'border-emerald-500/80 dark:border-emerald-600'
            }`}
          />
          {requestFormValidation.errors.applicantName && (
            <p className="text-[11px] text-red-600 dark:text-red-400 font-medium mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{requestFormValidation.errors.applicantName}</span>
            </p>
          )}
        </div>
        <div>
          <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-slate-300 mb-1">
            <span>Applicant Email *</span>
            {!requestFormValidation.errors.applicantEmail && (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1F6F5B] dark:text-emerald-400" />
            )}
          </label>
          <input
            type="email"
            value={applicantEmail}
            onChange={(e) => setApplicantEmail(e.target.value)}
            placeholder="applicant@gmail.com"
            aria-invalid={Boolean(requestFormValidation.errors.applicantEmail)}
            className={`w-full px-3.5 py-2 rounded-xl border bg-white dark:bg-slate-900 text-sm text-stone-900 dark:text-white transition-colors ${
              requestFormValidation.errors.applicantEmail
                ? 'border-red-400 dark:border-red-700'
                : 'border-emerald-500/80 dark:border-emerald-600'
            }`}
          />
          {requestFormValidation.errors.applicantEmail && (
            <p className="text-[11px] text-red-600 dark:text-red-400 font-medium mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{requestFormValidation.errors.applicantEmail}</span>
            </p>
          )}
        </div>
      </div>

      {/* Step 3: Donor Support Category (Pure Donator 0% No Tax vs. Lender Return: Yearly, Monthly, or 50% Return Money) */}
      <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 dark:text-emerald-300 flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-[#1F6F5B] dark:text-emerald-400" />
            2. Select Support Category: Pure Donator (0% • No Tax) or Lender Return
          </span>
          <span className="text-[11px] font-mono text-emerald-800 dark:text-emerald-400">
            {returnOption === 'no_return'
              ? 'Pure Donator • 0% No Tax • Nothing Returned'
              : returnOption === 'directly'
              ? 'Lender • 50% Return Money'
              : `Lender • ${returnOption.toUpperCase()} Division`}
          </span>
        </div>

        {/* Three Primary Support Category Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => setReturnOption('no_return')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              returnOption === 'no_return'
                ? 'bg-[#1F6F5B] text-white border-[#1F6F5B] shadow-sm'
                : 'bg-white dark:bg-slate-900 text-stone-800 dark:text-slate-200 border-stone-300 dark:border-slate-700'
            }`}
          >
            <div className="text-xs font-bold uppercase tracking-wider">
              1. Pure Donator (0% • No Tax)
            </div>
            <div
              className={`text-[11px] mt-0.5 ${
                returnOption === 'no_return'
                  ? 'text-emerald-100'
                  : 'text-stone-500 dark:text-slate-400'
              }`}
            >
              0% Return, no tax, nothing to return.
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (returnOption !== 'yearly' && returnOption !== 'monthly') {
                setReturnOption('yearly');
                setReturnDurationMonths(2);
              }
            }}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              returnOption === 'yearly' || returnOption === 'monthly'
                ? 'bg-stone-900 dark:bg-amber-600 text-white border-stone-900 dark:border-amber-500 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-stone-800 dark:text-slate-200 border-stone-300 dark:border-slate-700'
            }`}
          >
            <div className="text-xs font-bold uppercase tracking-wider">
              2. Lender (Yearly / Monthly Divide)
            </div>
            <div
              className={`text-[11px] mt-0.5 ${
                returnOption === 'yearly' || returnOption === 'monthly'
                  ? 'text-stone-200'
                  : 'text-stone-500 dark:text-slate-400'
              }`}
            >
              Divide by years (e.g. ₹10,000 in 2 yrs = ₹5,000/yr) or months.
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setReturnOption('directly');
              setReturnDurationMonths(1);
            }}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              returnOption === 'directly'
                ? 'bg-[#C1553B] text-white border-[#C1553B] shadow-sm'
                : 'bg-white dark:bg-slate-900 text-stone-800 dark:text-slate-200 border-stone-300 dark:border-slate-700'
            }`}
          >
            <div className="text-xs font-bold uppercase tracking-wider">
              3. Lender (50% Return Money)
            </div>
            <div
              className={`text-[11px] mt-0.5 ${
                returnOption === 'directly'
                  ? 'text-amber-100'
                  : 'text-stone-500 dark:text-slate-400'
              }`}
            >
              Return 50% of the money (e.g. ₹10,000 → return ₹5,000).
            </div>
          </button>
        </div>

        {(returnOption === 'yearly' || returnOption === 'monthly') && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setReturnOption('yearly');
                setReturnDurationMonths(2);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold uppercase border transition-all cursor-pointer ${
                returnOption === 'yearly'
                  ? 'bg-[#1F6F5B] text-white border-[#1F6F5B]'
                  : 'bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-300 border-stone-300 dark:border-slate-700'
              }`}
            >
              Yearly Return (Divide by Years)
            </button>
            <button
              type="button"
              onClick={() => {
                setReturnOption('monthly');
                setReturnDurationMonths(5);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold uppercase border transition-all cursor-pointer ${
                returnOption === 'monthly'
                  ? 'bg-[#1F6F5B] text-white border-[#1F6F5B]'
                  : 'bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-300 border-stone-300 dark:border-slate-700'
              }`}
            >
              Monthly Return (Divide by Months)
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="flex items-center justify-between text-[11px] font-bold uppercase text-stone-700 dark:text-slate-300 mb-1">
              <span>Amount Needed (₹) *</span>
              {!requestFormValidation.errors.goalAmount && (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1F6F5B] dark:text-emerald-400" />
              )}
            </label>
            <input
              type="number"
              min="1"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              aria-invalid={Boolean(requestFormValidation.errors.goalAmount)}
              className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 font-mono text-sm font-bold text-stone-900 dark:text-white ${
                requestFormValidation.errors.goalAmount
                  ? 'border-red-400 dark:border-red-700'
                  : 'border-emerald-500/80 dark:border-emerald-600'
              }`}
            />
            {requestFormValidation.errors.goalAmount && (
              <p className="text-[10px] text-red-600 dark:text-red-400 font-medium mt-1">
                {requestFormValidation.errors.goalAmount}
              </p>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-stone-700 dark:text-slate-300 mb-1">
              {returnOption === 'yearly'
                ? 'In How Many Years? (e.g. 2)'
                : returnOption === 'monthly'
                ? 'In How Many Months? (e.g. 5)'
                : returnOption === 'directly'
                ? '50% Return Amount (₹)'
                : 'Return Needed'}
            </label>
            {returnOption === 'yearly' || returnOption === 'monthly' ? (
              <input
                type="number"
                min="1"
                max="120"
                value={returnDurationMonths}
                onChange={(e) =>
                  setReturnDurationMonths(Math.max(1, Number(e.target.value) || 1))
                }
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-sm font-bold text-stone-900 dark:text-white"
              />
            ) : (
              <div className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-100 dark:bg-slate-800 font-mono text-xs font-bold text-stone-800 dark:text-slate-200">
                {returnOption === 'directly'
                  ? `${formatINR(Math.round((Number(goalAmount) || 0) * 0.5))} (50%)`
                  : '₹0 (0% No Return)'}
              </div>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-stone-700 dark:text-slate-300 mb-1">
              Target Date
            </label>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs text-stone-900 dark:text-white"
            />
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-stone-600 dark:text-slate-300 font-medium">
            Automatic Division Calculation:
          </span>
          <strong className="font-mono text-emerald-950 dark:text-emerald-300">
            {previewSchedule.summaryText}
          </strong>
        </div>
      </div>

      {/* Step 4: Location (Photo upload is visible ONLY in Admin backend panel) */}
      <div className={currentUser.role === 'admin' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'w-full'}>
        <div>
          <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-slate-300 mb-1">
            <span>City / Town / Village Location *</span>
            {!requestFormValidation.errors.beneficiaryLocation && (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1F6F5B] dark:text-emerald-400" />
            )}
          </label>
          <input
            type="text"
            value={beneficiaryLocation}
            onChange={(e) => setBeneficiaryLocation(e.target.value)}
            placeholder="e.g. Bengaluru City / Mumbai / Sitapur"
            aria-invalid={Boolean(
              requestFormValidation.errors.beneficiaryLocation
            )}
            className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs text-stone-900 dark:text-white ${
              requestFormValidation.errors.beneficiaryLocation
                ? 'border-red-400 dark:border-red-700'
                : 'border-emerald-500/80 dark:border-emerald-600'
            }`}
          />
          {requestFormValidation.errors.beneficiaryLocation && (
            <p className="text-[10px] text-red-600 dark:text-red-400 font-medium mt-1">
              {requestFormValidation.errors.beneficiaryLocation}
            </p>
          )}
        </div>
        {currentUser.role === 'admin' && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-slate-300 mb-1">
              Admin Campaign Photo (Backend Only)
            </label>
            <label className="w-full px-3 py-2 rounded-xl border border-dashed border-emerald-500/80 bg-emerald-50/40 dark:bg-emerald-950/30 text-xs text-emerald-900 dark:text-emerald-300 font-semibold flex items-center justify-between gap-1.5 cursor-pointer hover:bg-emerald-100/60 transition-colors">
              <span className="truncate flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 shrink-0 text-[#1F6F5B] dark:text-emerald-400" />
                {campaignImageName || 'Upload Campaign Photo'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleCampaignPhotoSelect}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

      {/* Step 5: Official Government Identity Document Upload & Anti-Fraud AI Verification */}
      <GovernmentIdUploadVerifier
        selectedDocType={documentType}
        onDocTypeChange={(docType) => {
          setDocumentType(docType);
          setVerifiedGovId(null);
        }}
        applicantName={applicantName || currentUser.name}
        onVerificationComplete={(result) => setVerifiedGovId(result)}
        verifiedResult={verifiedGovId}
        required={true}
      />

      <div>
        <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-slate-300 mb-1">
          <span>Full Purpose & Verification Details *</span>
          {!requestFormValidation.errors.description && (
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1F6F5B] dark:text-emerald-400" />
          )}
        </label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Explain why the funds are needed (min 10 characters)..."
          aria-invalid={Boolean(requestFormValidation.errors.description)}
          className={`w-full px-3.5 py-2 rounded-xl border bg-white dark:bg-slate-900 text-sm text-stone-900 dark:text-white ${
            requestFormValidation.errors.description
              ? 'border-red-400 dark:border-red-700'
              : 'border-emerald-500/80 dark:border-emerald-600'
          }`}
        />
        {requestFormValidation.errors.description && (
          <p className="text-[11px] text-red-600 dark:text-red-400 font-medium mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{requestFormValidation.errors.description}</span>
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="liquid-btn w-full py-3 px-5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm bg-[#1F6F5B] hover:bg-[#185848] disabled:opacity-50 text-white"
      >
        <PlusCircle className="w-4 h-4" />
        {submitting
          ? 'Verifying & Submitting Request...'
          : verifiedGovId?.verified
          ? `Submit Verified [${category}] Request (${formatINR(
              Number(goalAmount) || 0
            )} · ${returnOption === 'no_return' ? 'Pure Donator' : 'Lender Return'})`
          : `Submit [${category}] Request (Upload & Verify Govt ID Above First)`}
      </button>
    </form>
  );

  const openCampaignVerificationModal = (camp: CampaignItem) => {
    setVerificationTarget({
      targetType: 'campaign',
      targetId: camp.id,
      targetName: camp.title,
      currentRegNo: camp.documentId,
      currentDocType: camp.documentType,
      currentVerified:
        camp.verificationStatus
          ? camp.verificationStatus === 'Verified'
          : camp.verified !== false,
    });
  };

  const openOrgVerificationModal = (org: OrganizationRecord) => {
    setVerificationTarget({
      targetType: 'organization',
      targetId: org.id,
      targetName: org.name,
      currentRegNo: org.reg80g,
      currentDocType:
        'Aadhaar Card (Official Government Identity)',
      currentVerified:
        org.verificationStatus
          ? org.verificationStatus === 'Verified'
          : org.verified !== false,
    });
  };

  const renderVerificationStatusBadge = (
    status?: 'Verified' | 'Pending',
    verifiedFallback?: boolean
  ) => {
    const resolved = status || (verifiedFallback ? 'Verified' : 'Pending');
    if (resolved === 'Verified') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[10px] font-mono font-bold uppercase">
          <CheckCircle2 className="w-3 h-3 text-[#1F6F5B] dark:text-emerald-400" />
          Status: Verified
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/90 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[10px] font-mono font-bold uppercase">
        <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
        Status: Pending
      </span>
    );
  };

  const renderSupportTypeBadge = (returnOpt?: string, supportType?: string) => {
    const resolved = getDonorSupportType(returnOpt, supportType as any);
    if (resolved === 'donator') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/70 text-[#1F6F5B] dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800 text-[10px] font-mono font-bold uppercase">
          <HeartHandshake className="w-3 h-3" />
          Pure Donator (0% • No Tax)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/70 text-[#C1553B] dark:text-amber-300 border border-amber-300/80 dark:border-amber-800 text-[10px] font-mono font-bold uppercase">
        <Calculator className="w-3 h-3" />
        {returnOpt === 'directly'
          ? 'Lender (50% Return Money)'
          : `Lender (${(returnOpt || 'monthly').toUpperCase()} Return)`}
      </span>
    );
  };

  const activeRbacEvaluation = evaluateRbacAccess({
    role: currentUser.role,
    email:
      currentUser.role === 'admin'
        ? 'khandanish0503@gmail.com'
        : currentUser.email,
  });

  const activeRbacDefinition =
    RBAC_ROLE_DEFINITIONS[activeRbacEvaluation.effectiveRole];

  const renderRbacPolicyBanner = () => (
    <div
      data-testid="rbac-policy-banner"
      className="p-4 rounded-2xl liquid-glass border border-stone-200/90 dark:border-slate-700/90 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
    >
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-stone-900 dark:bg-emerald-600 text-white text-[11px] font-mono uppercase tracking-wider font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            RBAC Active · Role: {activeRbacEvaluation.effectiveRole.toUpperCase()}
          </span>
          <span className="text-xs font-serif font-bold text-stone-900 dark:text-white">
            {activeRbacDefinition.label}
          </span>
          <span className="text-[11px] font-mono text-stone-500 dark:text-slate-400">
            ({activeRbacEvaluation.grantedPermissions.length} Active Permissions · Admin Locked to khandanish0503@gmail.com)
          </span>
        </div>
        <p className="text-xs text-stone-600 dark:text-slate-300">
          {activeRbacDefinition.description}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        {activeRbacEvaluation.grantedPermissions.map((perm) => (
          <span
            key={perm}
            className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono font-semibold text-[#1F6F5B] dark:text-emerald-300"
          >
            ✓ {perm}
          </span>
        ))}
      </div>
    </div>
  );

  const renderVerificationModal = () => (
    <>
      <VerificationUploadModal
        target={verificationTarget}
        actorName={currentUser.name}
        actorRole={currentUser.role}
        recentUploads={verificationUploads}
        onClose={() => setVerificationTarget(null)}
        onUploaded={(rec, msg, adminEmail) => {
          setFeedback(msg);
          if (adminEmail) {
            setEmailNotifications((prev) => [adminEmail, ...prev]);
          }
          setSubmissionSuccess({
            formTitle: `Document Verification Upload (${rec.targetType.toUpperCase()})`,
            message: msg,
            referenceId: `VER-${rec.id}`,
            category: rec.documentType,
            applicantName: rec.uploadedBy,
            applicantEmail: currentUser.email,
            adminSummaryEmail: adminEmail || null,
          });
          onRefresh();
          fetchAdminAuditAndOrgs();
        }}
      />
      <ConfirmActionModal
        confirmState={confirmState}
        onClose={() => setConfirmState(null)}
        busy={submitting}
      />
      <SubmissionSuccessModal
        submission={submissionSuccess}
        onClose={() => setSubmissionSuccess(null)}
      />
    </>
  );

  // ============================================================================
  // PANEL 2: DONATOR & FUNDRAISER PANEL (role === 'donor' || role === 'fundraiser')
  // ============================================================================
  if (currentUser.role === 'donor' || currentUser.role === 'fundraiser') {
    const paidDonations = localDonations.filter((d) => d.status === 'paid');
    const totalGiven = paidDonations.reduce((acc, d) => acc + d.amount, 0);

    const scopedTaxDonations =
      taxExportScope === 'my_email' && currentUser.email
        ? localDonations.filter(
            (d) =>
              d.donorEmail.toLowerCase() === currentUser.email.toLowerCase() ||
              d.status === 'paid'
          )
        : localDonations;

    const consolidatedTaxSummary = buildConsolidatedTaxStatementSummary(
      scopedTaxDonations,
      {
        donorName: currentUser.name || 'Danish Khan',
        donorEmail: currentUser.email || 'khandanish0503@gmail.com',
        donorPan: taxExportPan || 'ABCDE1234F',
        financialYear: taxExportFy,
      }
    );

    const consolidatedTaxPayload = buildConsolidatedTaxExportPayload(
      scopedTaxDonations,
      {
        donorName: currentUser.name || 'Danish Khan',
        donorEmail: currentUser.email || 'khandanish0503@gmail.com',
        donorPan: taxExportPan || 'ABCDE1234F',
        financialYear: taxExportFy,
      }
    );

    const handleDownloadConsolidatedTaxPdf = () => {
      const summary = downloadConsolidatedTaxReceiptsPdf(scopedTaxDonations, {
        donorName: currentUser.name || 'Danish Khan',
        donorEmail: currentUser.email || 'khandanish0503@gmail.com',
        donorPan: taxExportPan || 'ABCDE1234F',
        financialYear: taxExportFy,
      });
      setFeedback(
        `Consolidated Tax Certificate PDF (${summary.certificateReferenceId}) exported with ${summary.receiptCount} past donation receipts totaling ${formatINR(summary.totalDonatedAmount)} (Section 80G Eligible Deduction: ${formatINR(summary.totalEligible80GDeduction)}).`
      );
    };

    const matchingCampaignsForDonors = localCampaigns.filter((c) => {
      if (donorPanelSupportFilter === 'all') return true;
      const cType = getDonorSupportType(c.returnOption, c.donorSupportType);
      return cType === donorPanelSupportFilter;
    });

    return (
      <section className="py-10 border-t border-stone-200/80 dark:border-slate-800">
        <div className="max-w-[1360px] mx-auto responsive-shell space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#1F6F5B] dark:text-emerald-400 block mb-1">
                Panel 2 · Pure Donator (No Return) & Lender (0% Return) Workspace
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white">
                Donator & Fundraiser Panel — Support as Pure Donator or Lender
              </h2>
              <p className="text-sm text-stone-600 dark:text-slate-300 mt-1">
                Support needy applicants across <strong>Freelancer Website</strong>, <strong>City</strong>, <strong>Personal</strong>, <strong>Medical</strong>, <strong>Education</strong>, or <strong>Village</strong> categories as either a <strong>Pure Donator (No Return Required)</strong> or a <strong>0% Interest Lender (Monthly, Yearly, or One-Time Return)</strong>.
              </p>
            </div>
            <div className="p-4 rounded-xl liquid-glass flex items-center gap-6 shrink-0">
              <div>
                <span className="text-xs uppercase tracking-wider text-stone-500 dark:text-slate-400 block">
                  Total Disbursed
                </span>
                <span className="font-mono text-xl sm:text-2xl font-bold text-[#1F6F5B] dark:text-emerald-400 tabular-nums">
                  {formatINR(totalGiven)}
                </span>
              </div>
              <div className="h-8 w-px bg-stone-200 dark:bg-slate-700" />
              <div>
                <span className="text-xs uppercase tracking-wider text-stone-500 dark:text-slate-400 block">
                  Verified Contributions
                </span>
                <span className="font-mono text-xl sm:text-2xl font-bold text-stone-900 dark:text-white tabular-nums">
                  {paidDonations.length}
                </span>
              </div>
            </div>
          </div>

          {feedback && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-950 dark:text-emerald-200 font-medium">
              {feedback}
            </div>
          )}

          {renderRbacPolicyBanner()}

          {/* Consolidated Tax Receipt Export (All Past Donations — Form 10BE / Section 80G) */}
          <div
            data-testid="consolidated-tax-export-card"
            className="liquid-glass rounded-2xl p-5 sm:p-6 border-2 border-[#1F6F5B]/35 dark:border-emerald-500/40 bg-gradient-to-br from-emerald-50/70 via-white/90 to-amber-50/40 dark:from-emerald-950/40 dark:via-slate-900/90 dark:to-slate-900 space-y-5"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#1F6F5B] text-white text-[11px] font-mono uppercase tracking-wider font-bold">
                    <FileCheck className="w-3.5 h-3.5" />
                    Consolidated Tax PDF Export · Section 80G & Form 10BE
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-stone-900 text-amber-300 text-[11px] font-mono font-semibold">
                    Certificate: {consolidatedTaxSummary.certificateReferenceId}
                  </span>
                </div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-white">
                  Export All Past Donation Receipts as a Consolidated Tax PDF
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 max-w-3xl">
                  Generate a single consolidated PDF statement combining all your past verified donation receipts, payment order references, PAN details, and itemized Section 80G eligible tax deductions for Income Tax filing.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  data-testid="export-consolidated-tax-pdf-btn"
                  onClick={handleDownloadConsolidatedTaxPdf}
                  className="px-4 py-3 rounded-xl bg-[#1F6F5B] hover:bg-[#185848] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-md cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Consolidated Tax PDF (All Past Receipts)</span>
                </button>
                <button
                  type="button"
                  data-testid="preview-consolidated-tax-btn"
                  onClick={() => setShowConsolidatedTaxModal(true)}
                  className="px-3.5 py-3 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-stone-100 dark:hover:bg-slate-700 text-stone-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <FileCheck className="w-4 h-4 text-[#1F6F5B] dark:text-emerald-400" />
                  <span>Preview Statement ({consolidatedTaxSummary.receiptCount})</span>
                </button>
              </div>
            </div>

            {/* Tax Summary Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-white/90 dark:bg-slate-900/80 border border-stone-200/80 dark:border-slate-800">
                <span className="text-[11px] font-mono uppercase text-stone-500 dark:text-slate-400 block">
                  Past Receipts Consolidated
                </span>
                <span
                  data-testid="consolidated-receipt-count"
                  className="font-mono text-lg sm:text-xl font-bold text-stone-900 dark:text-white tabular-nums"
                >
                  {consolidatedTaxSummary.receiptCount} Receipts
                </span>
                <span className="text-[11px] text-stone-500 dark:text-slate-400 block mt-0.5">
                  Grant: {formatINR(consolidatedTaxSummary.pureGrantAmount)} · Lender: {formatINR(consolidatedTaxSummary.lenderSupportAmount)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/90 dark:bg-slate-900/80 border border-stone-200/80 dark:border-slate-800">
                <span className="text-[11px] font-mono uppercase text-stone-500 dark:text-slate-400 block">
                  Cumulative Donated Total
                </span>
                <span
                  data-testid="consolidated-total-amount"
                  className="font-mono text-lg sm:text-xl font-bold text-stone-900 dark:text-white tabular-nums"
                >
                  {formatINR(consolidatedTaxSummary.totalDonatedAmount)}
                </span>
                <span className="text-[11px] text-stone-500 dark:text-slate-400 block mt-0.5">
                  100% Verified Gateway Settled
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80">
                <span className="text-[11px] font-mono uppercase text-emerald-800 dark:text-emerald-300 block">
                  Eligible 80G Deduction (50%)
                </span>
                <span
                  data-testid="consolidated-eligible-deduction"
                  className="font-mono text-lg sm:text-xl font-bold text-[#1F6F5B] dark:text-emerald-400 tabular-nums"
                >
                  {formatINR(consolidatedTaxSummary.totalEligible80GDeduction)}
                </span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300/80 block mt-0.5">
                  Reg: 80G-DEL-2026-8841
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60">
                <span className="text-[11px] font-mono uppercase text-amber-900 dark:text-amber-300 block">
                  Est. Tax Saved (30% Slab)
                </span>
                <span className="font-mono text-lg sm:text-xl font-bold text-amber-900 dark:text-amber-300 tabular-nums">
                  {formatINR(consolidatedTaxSummary.totalEstimatedTaxSaved)}
                </span>
                <span className="text-[11px] text-amber-800 dark:text-amber-400 block mt-0.5">
                  Form 10BE Ready for ITR
                </span>
              </div>
            </div>

            {/* Filter & Tax Metadata Controls */}
            <div className="pt-2 border-t border-stone-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="tax-fy-select"
                    className="text-xs font-semibold text-stone-600 dark:text-slate-300"
                  >
                    Financial Year:
                  </label>
                  <select
                    id="tax-fy-select"
                    value={taxExportFy}
                    onChange={(e) => setTaxExportFy(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-stone-900 dark:text-white"
                  >
                    <option value="FY 2026-27 (AY 2027-28)">FY 2026-27 (AY 2027-28)</option>
                    <option value="FY 2025-26 (AY 2026-27)">FY 2025-26 (AY 2026-27)</option>
                    <option value="All Financial Years (Consolidated)">All Financial Years</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label
                    htmlFor="tax-pan-input"
                    className="text-xs font-semibold text-stone-600 dark:text-slate-300"
                  >
                    Donor PAN:
                  </label>
                  <input
                    id="tax-pan-input"
                    type="text"
                    maxLength={10}
                    value={taxExportPan}
                    onChange={(e) => setTaxExportPan(e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    className="w-32 px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono uppercase text-stone-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTaxExportScope('all_paid')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                      taxExportScope === 'all_paid'
                        ? 'bg-stone-900 dark:bg-emerald-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-stone-600 dark:text-slate-300 border border-stone-300 dark:border-slate-700'
                    }`}
                  >
                    All Past Verified Receipts ({paidDonations.length})
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono text-stone-500 dark:text-slate-400">
                  Also export in:
                </span>
                <ExportFormatButtons
                  payload={consolidatedTaxPayload.payload}
                  compact
                  labelPrefix="Tax Schedule"
                />
              </div>
            </div>
          </div>

          {/* Active Applicant Requests Matched for Donators & Lenders */}
          <div className="liquid-glass rounded-2xl overflow-hidden border border-stone-200/90 dark:border-slate-700/90">
            <div className="p-5 bg-stone-100/80 dark:bg-slate-800/80 border-b border-stone-200 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#1F6F5B] dark:text-emerald-400 block">
                  Live Applicant Requests & Donor Category Matching
                </span>
                <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900 dark:text-white">
                  Requests Waiting for Pure Donators (0% No Tax) & Lenders ({matchingCampaignsForDonors.length})
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { id: 'all', label: `All Requests (${campaigns.length})` },
                    {
                      id: 'donator',
                      label: `1. Pure Donator (0% • No Tax)`,
                    },
                    {
                      id: 'lender',
                      label: `2. Lender (Yearly / Monthly / 50% Return)`,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDonorPanelSupportFilter(tab.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      donorPanelSupportFilter === tab.id
                        ? 'bg-stone-900 dark:bg-emerald-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-300 border border-stone-300 dark:border-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-stone-200/80 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
              {matchingCampaignsForDonors.map((camp) => {
                const sched = calculateRepaymentSchedule(
                  camp.goalAmount,
                  camp.returnOption || 'monthly',
                  camp.returnDurationMonths || 12
                );
                return (
                  <div
                    key={camp.id}
                    className="p-4 sm:p-5 hover:bg-stone-50/70 dark:hover:bg-slate-800/40 transition-colors flex flex-col gap-3.5"
                  >
                    <div className="space-y-2 w-full">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-stone-900 text-amber-300 text-[11px] font-mono font-semibold">
                            {camp.category}
                          </span>
                          {renderSupportTypeBadge(
                            camp.returnOption,
                            camp.donorSupportType
                          )}
                          {renderVerificationStatusBadge(
                            camp.verificationStatus,
                            camp.verified
                          )}
                        </div>
                        <div className="font-mono font-bold text-stone-900 dark:text-white text-base tabular-nums">
                          {formatINR(camp.raisedAmount)}{' '}
                          <span className="text-xs text-stone-400 font-normal">
                            / {formatINR(camp.goalAmount)}
                          </span>
                        </div>
                      </div>
                      <h4 className="font-serif font-bold text-stone-900 dark:text-white text-base sm:text-lg leading-snug">
                        {camp.title}
                      </h4>
                      <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
                        Applicant: <strong>{camp.applicantName}</strong> (
                        {camp.applicantEmail || 'applicant@sankalpsetu.org'}) · Location:{' '}
                        <strong>{camp.beneficiaryLocation}</strong> · Govt ID:{' '}
                        <strong className="text-[#1F6F5B] dark:text-emerald-400">
                          {camp.documentType}
                        </strong>
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-stone-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-mono text-emerald-900 dark:text-emerald-300 font-semibold">
                        {sched.summaryText}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <ExportFormatButtons
                          payload={buildSingleCampaignPayload(camp)}
                          compact
                        />
                        {onSelectCampaignForDonation && (
                          <button
                            type="button"
                            onClick={() => onSelectCampaignForDonation(camp)}
                            className="px-3.5 py-1.5 rounded-xl bg-[#C1553B] hover:bg-[#A9442C] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-sm"
                          >
                            {camp.returnOption === 'no_return'
                              ? 'Donate (0% No Tax)'
                              : 'Lend / Support Now'}
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left 6 Cols: Start a Fundraiser in Any Category */}
            <div className="xl:col-span-6">
              {renderUniversalRequestForm(
                'Start a Verified Fundraiser',
                'Raise Funds for Freelancer Website, Personal, City, Medical or Village'
              )}
            </div>

            {/* Right 6 Cols: Responsive Donation & Lender Ledger Cards */}
            <div className="xl:col-span-6 liquid-glass rounded-2xl overflow-hidden">
              <div className="px-5 py-4 bg-stone-100/80 dark:bg-slate-800/80 border-b border-stone-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-stone-700 dark:text-slate-200">
                    Verified Donation & Lender Ledger ({localDonations.length})
                  </h3>
                  <span className="text-[11px] font-mono text-stone-500 dark:text-slate-400">
                    Download Individual Receipt or Consolidated Tax PDF for All Past Donations
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    data-testid="ledger-consolidated-tax-pdf-btn"
                    onClick={handleDownloadConsolidatedTaxPdf}
                    className="px-2.5 py-1 rounded-lg bg-[#1F6F5B] hover:bg-[#185848] text-white text-[11px] font-mono font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3 h-3" />
                    <span>Consolidated Tax PDF</span>
                  </button>
                  <ExportFormatButtons
                    payload={buildDonationsLedgerPayload()}
                    compact
                    labelPrefix="Export"
                  />
                </div>
              </div>
              <div className="divide-y divide-stone-200/80 dark:divide-slate-800 max-h-[540px] overflow-y-auto">
                {localDonations.map((don) => (
                  <div
                    key={don.id}
                    className="p-4 hover:bg-stone-50/80 dark:hover:bg-slate-800/40 transition-colors flex flex-col gap-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-stone-500 dark:text-slate-400">
                          <strong className="text-stone-900 dark:text-white">
                            {don.receiptNumber}
                          </strong>
                          <span>·</span>
                          <span>{don.gatewayOrderId}</span>
                          <span>·</span>
                          {renderSupportTypeBadge(
                            don.returnOption,
                            don.donorSupportType
                          )}
                        </div>
                        <div className="font-serif font-bold text-stone-900 dark:text-white text-sm break-words">
                          {don.campaignTitle}
                        </div>
                        <div className="text-xs text-stone-500 dark:text-slate-400 break-all">
                          Donor: <strong>{don.donorName}</strong> ({don.donorEmail})
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0">
                        <span className="font-mono text-base font-bold text-stone-900 dark:text-white tabular-nums">
                          {formatINR(don.amount)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            don.status === 'paid'
                              ? 'text-[#1F6F5B] dark:text-emerald-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {don.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-stone-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase text-stone-400">
                        Download Receipt:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <ExportFormatButtons
                          payload={buildDonationReceiptPayload(don)}
                          compact
                        />
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="p-1.5 rounded-lg border border-stone-200 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-700 dark:text-slate-300 cursor-pointer"
                          title="Print Official Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Consolidated Tax Statement & Form 10BE Preview Modal */}
          {showConsolidatedTaxModal && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Consolidated Tax Deduction Statement Preview"
              data-testid="consolidated-tax-modal"
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-sm overflow-y-auto"
            >
              <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 shadow-2xl overflow-hidden my-8">
                <div className="p-5 sm:p-6 bg-stone-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 block">
                      Form 10BE · Section 80G(5)(vi) Income Tax Act, 1961
                    </span>
                    <h3 className="font-serif text-xl sm:text-2xl font-bold mt-0.5">
                      Consolidated Annual Tax Receipt Statement ({consolidatedTaxSummary.financialYear})
                    </h3>
                    <p className="text-xs text-stone-300 mt-1 font-mono">
                      Certificate: {consolidatedTaxSummary.certificateReferenceId} · 80G Reg: 80G-DEL-2026-8841
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="modal-download-consolidated-pdf-btn"
                      onClick={handleDownloadConsolidatedTaxPdf}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Consolidated PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConsolidatedTaxModal(false)}
                      className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-stone-100 dark:bg-slate-800">
                      <span className="text-[10px] font-mono uppercase text-stone-500 block">Donor Name & PAN</span>
                      <strong className="text-xs sm:text-sm text-stone-900 dark:text-white block mt-0.5">
                        {consolidatedTaxSummary.donorName} ({consolidatedTaxSummary.donorPan})
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-stone-100 dark:bg-slate-800">
                      <span className="text-[10px] font-mono uppercase text-stone-500 block">Receipts Included</span>
                      <strong className="font-mono text-sm text-stone-900 dark:text-white block mt-0.5">
                        {consolidatedTaxSummary.receiptCount} Past Receipts
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-stone-100 dark:bg-slate-800">
                      <span className="text-[10px] font-mono uppercase text-stone-500 block">Total Donated</span>
                      <strong className="font-mono text-sm text-stone-900 dark:text-white block mt-0.5">
                        {formatINR(consolidatedTaxSummary.totalDonatedAmount)}
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                      <span className="text-[10px] font-mono uppercase text-emerald-700 dark:text-emerald-300 block">
                        50% Eligible 80G Deduction
                      </span>
                      <strong className="font-mono text-sm text-[#1F6F5B] dark:text-emerald-400 block mt-0.5">
                        {formatINR(consolidatedTaxSummary.totalEligible80GDeduction)}
                      </strong>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-stone-200 dark:border-slate-700 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-200 font-mono text-[11px] uppercase">
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Receipt No.</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Campaign / Beneficiary</th>
                          <th className="py-2.5 px-3">Mode</th>
                          <th className="py-2.5 px-3 text-right">Donated</th>
                          <th className="py-2.5 px-3 text-right">80G Eligible (50%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 dark:divide-slate-800">
                        {consolidatedTaxSummary.items.map((item, idx) => (
                          <tr key={item.receiptNumber} className="hover:bg-stone-50 dark:hover:bg-slate-800/50">
                            <td className="py-2.5 px-3 font-mono">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-stone-900 dark:text-white">
                              {item.receiptNumber}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-stone-500">{item.dateFormatted}</td>
                            <td className="py-2.5 px-3 font-medium text-stone-900 dark:text-white">
                              {item.campaignTitle}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px]">{item.supportCategoryLabel}</td>
                            <td className="py-2.5 px-3 font-mono font-semibold text-right">
                              {formatINR(item.amount)}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-[#1F6F5B] dark:text-emerald-400 text-right">
                              {formatINR(item.eligible80GDeduction)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-200 dark:border-slate-800">
                    <span className="text-xs text-stone-500 dark:text-slate-400">
                      Digitally certified by Chief Administrator Danish Khan (khandanish0503@gmail.com)
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <ExportFormatButtons
                        payload={consolidatedTaxPayload.payload}
                        labelPrefix="Export Consolidated"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3-Way Gmail Notification Center */}
          <GmailNotificationCenter
            notifications={emailNotifications}
            onRefresh={fetchAdminAuditAndOrgs}
          />

          {renderVerificationModal()}
        </div>
      </section>
    );
  }

  // ============================================================================
  // PANEL 4: VERIFIED NGO PARTNER DASHBOARD (role === 'ngo_admin')
  // ============================================================================
  if (currentUser.role === 'ngo_admin') {
    return (
      <section className="py-10 border-t border-stone-200/80 dark:border-slate-800">
        <div className="max-w-[1360px] mx-auto responsive-shell space-y-6">
          {renderRbacPolicyBanner()}
          <NgoPartnerDashboard
            currentUser={currentUser}
            campaigns={localCampaigns}
            donations={localDonations}
            organizations={organizations}
            onRefresh={() => {
              fetchAdminAuditAndOrgs();
              onRefresh();
            }}
            onOpenCampaignVerificationModal={openCampaignVerificationModal}
            onOpenOrgVerificationModal={openOrgVerificationModal}
            onSelectCampaignForDonation={onSelectCampaignForDonation}
            renderLaunchCampaignForm={() =>
              renderUniversalRequestForm(
                'Launch Verified NGO Partner Campaign',
                'Create an 80G & NITI Aayog DARPAN Backed Campaign for Your NGO Outreach'
              )
            }
          />
          <GmailNotificationCenter
            notifications={emailNotifications}
            onRefresh={fetchAdminAuditAndOrgs}
          />
          {renderVerificationModal()}
        </div>
      </section>
    );
  }

  // ============================================================================
  // PANEL 3: UNIVERSAL USER / APPLICANT & NGO CAMPAIGN MANAGER PANEL (role === 'user')
  // ============================================================================
  if (currentUser.role === 'user') {
    return (
      <section className="py-10 border-t border-stone-200/80 dark:border-slate-800">
        <div className="max-w-[1360px] mx-auto responsive-shell space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#C1553B] dark:text-amber-400 block mb-1">
                Panel 3 · Universal Applicant & Campaign Portal
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white">
                Request Pure Donator (0% • No Tax) or Lender Support (Yearly, Monthly, or 50% Return)
              </h2>
              <p className="text-sm text-stone-600 dark:text-slate-300 mt-1">
                Choose whether you need a <strong>Pure Donator (0% Return • No Tax • Nothing Returned)</strong>, a <strong>Lender Yearly / Monthly Divided Return</strong>, or a <strong>50% Return Money</strong> plan. Verify using your <strong>Official Government Identity (Aadhaar Card, PAN Card, Ration Card, Driving Licence)</strong>.
              </p>
            </div>
          </div>

          {feedback && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm font-medium text-emerald-950 dark:text-emerald-200">
              {feedback}
            </div>
          )}

          {renderRbacPolicyBanner()}

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            <div className="xl:col-span-6">
              {renderUniversalRequestForm(
                'Universal Fund Request Form',
                'Choose Category, Amount & Support Type (Pure Donator vs Lender)'
              )}
            </div>

            {/* Right Column: Active Requests & NGO Verification Upload Controls */}
            <div className="xl:col-span-6 space-y-4">
              <div className="p-5 sm:p-6 rounded-2xl liquid-glass">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-stone-200/80 dark:border-slate-800">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-stone-600 dark:text-slate-300 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#1F6F5B] dark:text-emerald-400" />
                      Active Requests, Verification Status & Support Plans ({campaigns.length})
                    </h3>
                    <span className="text-[11px] font-mono text-stone-500 dark:text-slate-400">
                      Export Active Requests as PDF (.pdf), Excel (.xls), or HTML (.html)
                    </span>
                  </div>
                  <ExportFormatButtons
                    payload={buildCampaignsReportPayload()}
                    compact
                    labelPrefix="Export"
                  />
                </div>
                <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                  {campaigns.map((camp) => {
                    const sched = calculateRepaymentSchedule(
                      camp.goalAmount,
                      camp.returnOption || 'monthly',
                      camp.returnDurationMonths || 12
                    );
                    return (
                      <div
                        key={camp.id}
                        className="p-4 rounded-xl border border-stone-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 flex flex-col gap-3 hover:bg-white dark:hover:bg-slate-900 transition-colors"
                      >
                        <div className="space-y-1.5 w-full">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                              <span className="px-2 py-0.5 rounded bg-stone-900 text-amber-300 font-bold">
                                {camp.category}
                              </span>
                              {renderVerificationStatusBadge(
                                camp.verificationStatus,
                                camp.verified
                              )}
                              {renderSupportTypeBadge(
                                camp.returnOption,
                                camp.donorSupportType
                              )}
                            </div>
                            <div className="font-mono font-bold text-stone-900 dark:text-white text-sm sm:text-base tabular-nums">
                              {formatINR(camp.raisedAmount)}{' '}
                              <span className="text-xs text-stone-400 font-normal">
                                / {formatINR(camp.goalAmount)}
                              </span>
                            </div>
                          </div>
                          <h4 className="font-serif font-bold text-stone-900 dark:text-white text-base leading-snug">
                            {camp.title}
                          </h4>
                          <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
                            Applicant: <strong>{camp.applicantName}</strong> (
                            {camp.beneficiaryLocation}) · Govt ID:{' '}
                            <span className="font-semibold text-[#1F6F5B] dark:text-emerald-400">
                              {camp.documentType}
                            </span>
                          </p>
                        </div>
                        <div className="pt-2.5 border-t border-stone-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-mono text-emerald-900 dark:text-emerald-300 font-semibold">
                            {sched.summaryText}
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <ExportFormatButtons
                              payload={buildSingleCampaignPayload(camp)}
                              compact
                            />
                            {onSelectCampaignForDonation && (
                              <button
                                type="button"
                                onClick={() => onSelectCampaignForDonation(camp)}
                                className="px-3 py-1.5 rounded-lg bg-[#C1553B] text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                Support / Lend <ArrowUpRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 3-Way Gmail Notification Center */}
          <GmailNotificationCenter
            notifications={emailNotifications}
            onRefresh={fetchAdminAuditAndOrgs}
          />

          {renderVerificationModal()}
        </div>
      </section>
    );
  }

  // ============================================================================
  // PANEL 1: FULL ADMIN CONTROL PANEL — DANISH KHAN (khandanish0503@gmail.com)
  // ============================================================================
  return (
    <section className="py-10 border-t border-stone-200/80 dark:border-slate-800">
      <div className="max-w-[1360px] mx-auto responsive-shell space-y-8">
        <div className="w-full min-w-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(360px,auto)] items-end gap-4 bg-stone-900 dark:bg-slate-900 text-white p-5 sm:p-6 rounded-2xl border border-stone-700/80 shadow-xl">
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1.5 mb-1">
              <ShieldAlert className="w-4 h-4" /> Panel 1 · Master Admin Full Control Center (Dynamic Data, Photos & Hero Section)
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
              Admin Danish Khan — Update & Delete Any Data, Photo, Hero Slide & Audit Log
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 mt-1">
              Owner Email:{' '}
              <strong className="font-mono text-emerald-300">
                khandanish0503@gmail.com
              </strong>{' '}
              · Directly update or delete any Hero Section photo, Campaign photo, NGO, Doctor, or Donation record in real time.
            </p>
          </div>
          <div className="flex w-full lg:w-auto flex-wrap items-center gap-2.5 text-xs font-mono tabular-nums">
            {organizations.length > 0 && (
              <button
                type="button"
                onClick={() => openOrgVerificationModal(organizations[0])}
                className="px-3.5 py-2 rounded-xl bg-[#1F6F5B] hover:bg-emerald-600 text-white font-sans font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                Verification Upload Modal
              </button>
            )}
            <div className="px-3 py-2 rounded-xl bg-stone-800 border border-stone-700">
              Hero Slides: <strong>{localHeroSlides.length}</strong>
            </div>
            <div className="px-3 py-2 rounded-xl bg-stone-800 border border-stone-700">
              Active Campaigns: <strong>{localCampaigns.length}</strong>
            </div>
            <div className="px-3 py-2 rounded-xl bg-emerald-950 border border-emerald-700 text-emerald-300">
              Audit Log Events: <strong>{auditLogs.length}</strong>
            </div>
          </div>
        </div>

        {renderRbacPolicyBanner()}

        {feedback && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-sm text-emerald-950 dark:text-emerald-200 font-semibold flex items-center justify-between gap-3">
            <span>{feedback}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="px-2.5 py-1 rounded-lg bg-emerald-200/70 dark:bg-emerald-900 text-xs font-bold shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Floating Toast Confirmation so Admin sees instant feedback at any scroll position */}
        {feedback && (
          <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 p-4 rounded-2xl bg-stone-900/95 dark:bg-emerald-950/95 text-white border border-emerald-500/60 shadow-2xl flex items-start justify-between gap-3 backdrop-blur-md">
            <div className="flex items-start gap-2.5 text-xs sm:text-sm font-medium leading-snug">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{feedback}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-mono uppercase shrink-0 cursor-pointer"
            >
              Close
            </button>
          </div>
        )}

        {/* ======================================================================
            ADMIN HERO SECTION & PHOTO MANAGER (DIRECT UPDATE & DELETE)
            ====================================================================== */}
        <div
          id="admin-hero-manager"
          className="liquid-glass rounded-2xl border border-stone-200/90 dark:border-slate-700/90"
        >
          <div className="px-5 py-4 bg-stone-900/95 text-white rounded-t-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" />
                Direct Hero Section & Photo Control
              </span>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-white">
                Manage Hero Section Photos & Slides ({localHeroSlides.length}) — Update, Replace Photo or Delete
              </h3>
            </div>
            <span className="text-xs font-mono text-emerald-300">
              100% Dynamic & Real-Time
            </span>
          </div>

          <div className="p-4 sm:p-5 pb-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {localHeroSlides.map((slide, idx) => {
                const isEditingSlide = editingSlideId === slide.id;
                return (
                  <div
                    key={slide.id}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 flex flex-col justify-between gap-3 shadow-xs"
                  >
                    {isEditingSlide ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={slideBadge}
                          onChange={(e) => setSlideBadge(e.target.value)}
                          placeholder="Category Badge"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-xs"
                        />
                        <input
                          type="text"
                          value={slideTitle}
                          onChange={(e) => setSlideTitle(e.target.value)}
                          placeholder="Hero Slide Title"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-xs font-bold"
                        />
                        <input
                          type="text"
                          value={slideLocation}
                          onChange={(e) => setSlideLocation(e.target.value)}
                          placeholder="Location"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-xs"
                        />
                        <textarea
                          rows={2}
                          value={slideCaption}
                          onChange={(e) => setSlideCaption(e.target.value)}
                          placeholder="Caption"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-xs"
                        />
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleAdminSaveHeroSlide(slide.id)}
                            className="flex-1 py-1.5 px-3 rounded-lg bg-[#1F6F5B] text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" /> Save Slide
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSlideId(null)}
                            className="py-1.5 px-3 rounded-lg bg-stone-200 dark:bg-slate-700 text-xs font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded bg-stone-900 text-amber-300 font-mono text-[10px] font-bold">
                              #{idx + 1} · {slide.categoryBadge}
                            </span>
                            {slide.imageUrl && (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-mono text-[10px] font-bold">
                                Custom Photo Active
                              </span>
                            )}
                          </div>
                          <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-white line-clamp-2">
                            {slide.title}
                          </h4>
                          <p className="text-[11px] text-stone-500 dark:text-slate-400">
                            {slide.location}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-100 dark:border-slate-800">
                          <label className="px-2.5 py-1.5 rounded-lg bg-[#1F6F5B] hover:bg-[#185848] text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer">
                            <ImagePlus className="w-3 h-3" />
                            Upload
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                const reader = new FileReader();
                                reader.onload = () => {
                                  if (typeof reader.result === 'string') {
                                    handleAdminUpdateHeroSlidePhoto(
                                      slide.id,
                                      reader.result
                                    );
                                  }
                                };
                                reader.readAsDataURL(f);
                              }}
                            />
                          </label>
                          <label className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer">
                            <Camera className="w-3 h-3 text-emerald-300" />
                            Take Photo
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                const reader = new FileReader();
                                reader.onload = () => {
                                  if (typeof reader.result === 'string') {
                                    handleAdminUpdateHeroSlidePhoto(
                                      slide.id,
                                      reader.result
                                    );
                                  }
                                };
                                reader.readAsDataURL(f);
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAdminGenerateExistingSlideQwenPhoto(slide)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            title="Generate photo using In-Built Qwen AI (Qwen/Qwen-Image-2.1)"
                          >
                            <Sparkles className="w-3 h-3" /> Qwen AI
                          </button>
                          {slide.imageUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                handleAdminUpdateHeroSlidePhoto(slide.id, '')
                              }
                              className="px-2 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-semibold cursor-pointer"
                            >
                              Delete Photo
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => startEditingHeroSlide(slide)}
                            className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 text-[11px] font-semibold text-stone-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => requestAdminDeleteHeroSlide(slide)}
                            className="px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 hover:bg-red-50 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add New Hero Section Banner Form — With 3 Photo Options (Upload from Computer, Take Photo, Generate from In-Built Qwen AI) */}
            <form
              data-testid="add-new-hero-banner-form"
              onSubmit={handleAdminAddHeroSlide}
              className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-700 shadow-xs space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-slate-200 flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-[#1F6F5B] dark:text-emerald-400" />
                  Add New Hero Section Banner &amp; Photo (Upload from Computer · Take Photo · In-Built Qwen AI)
                </span>
                <span className="text-[11px] font-mono text-stone-500 dark:text-slate-400">
                  3 Banner Image Options · Instant Live Update
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
                <input
                  type="text"
                  data-testid="new-hero-badge-input"
                  value={newSlideBadge}
                  onChange={(e) => setNewSlideBadge(e.target.value)}
                  placeholder="Category Badge (e.g. Medical Aid)"
                  className="lg:col-span-3 w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50/70 dark:bg-slate-800 text-xs text-stone-900 dark:text-white"
                />
                <input
                  type="text"
                  data-testid="new-hero-title-input"
                  value={newSlideTitle}
                  onChange={(e) => setNewSlideTitle(e.target.value)}
                  placeholder="New Hero Banner Title (e.g. Emergency Trauma & Blood Relief)..."
                  className="lg:col-span-5 w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50/70 dark:bg-slate-800 text-xs text-stone-900 dark:text-white"
                />
                <input
                  type="text"
                  data-testid="new-hero-location-input"
                  value={newSlideLocation}
                  onChange={(e) => setNewSlideLocation(e.target.value)}
                  placeholder="Location (e.g. New Delhi, Mumbai & All India)"
                  className="lg:col-span-4 w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50/70 dark:bg-slate-800 text-xs text-stone-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                <input
                  type="text"
                  data-testid="new-hero-caption-input"
                  value={newSlideCaption}
                  onChange={(e) => setNewSlideCaption(e.target.value)}
                  placeholder="Optional Banner Caption (used by In-Built Qwen AI to generate the best matching photo)..."
                  className="lg:col-span-9 w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50/70 dark:bg-slate-800 text-xs text-stone-900 dark:text-white"
                />
                <button
                  type="submit"
                  data-testid="add-hero-banner-submit-btn"
                  disabled={submitting}
                  className="lg:col-span-3 w-full py-2.5 px-4 rounded-xl bg-[#1F6F5B] hover:bg-[#185848] text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>+ Add Hero Section Banner</span>
                </button>
              </div>

              {/* 3-Option Hero Banner Photo Selector: 1. Upload from Computer | 2. Take Photo | 3. Generate from In-Built Qwen AI */}
              <HeroBannerPhotoPicker
                title={newSlideTitle}
                categoryBadge={newSlideBadge}
                location={newSlideLocation}
                caption={newSlideCaption}
                imageUrl={newSlideImageUrl}
                onImageChange={(nextUrl) => setNewSlideImageUrl(nextUrl)}
                onStatusFeedback={(msg) => setFeedback(msg)}
              />
            </form>
          </div>
        </div>

        {/* ======================================================================
            ADMIN AUDIT LOG & NGO REGISTRATION VERIFICATION UPLOAD CONTROLS
            ====================================================================== */}
        <div
          id="admin-audit-log"
          className="liquid-glass rounded-2xl border border-stone-200/90 dark:border-slate-700/90"
        >
          <div className="px-5 py-4 bg-stone-900/95 text-white rounded-t-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-emerald-400">
                <History className="w-4 h-4" />
                <span>Immutable Platform Transparency & Compliance Trail</span>
              </div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-white mt-0.5">
                Admin Audit Log — Timestamped History of Sensitive Actions ({filteredAuditLogsList.length})
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ExportFormatButtons
                payload={buildAuditLogsPayload()}
                compact
                labelPrefix="Export"
              />
              <button
                type="button"
                onClick={handleDownloadAuditCsv}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button
                type="button"
                onClick={requestAdminClearAuditLogs}
                className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Audit Log
              </button>
            </div>
          </div>

          {/* Dedicated NGO Registration Verification Upload & Status Indicator Bar */}
          <div className="px-4 sm:px-5 py-4 bg-emerald-50/60 dark:bg-slate-800/70 border-b border-stone-200 dark:border-slate-700 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#1F6F5B] dark:text-emerald-400" />
                NGO Registration Document Verification & Status Indicator ({organizations.length} Active):
              </span>
              <span className="text-[11px] font-mono text-stone-500 dark:text-slate-400">
                Uploaded Docs: {verificationUploads.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {organizations.map((org) => {
                const orgStatus =
                  org.verificationStatus ||
                  (org.verified ? 'Verified' : 'Pending');
                return (
                  <div
                    key={org.id}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 flex flex-col justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-1.5 w-full">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="text-sm font-serif font-bold text-stone-900 dark:text-white leading-snug">
                          {org.name}
                        </strong>
                        {renderVerificationStatusBadge(
                          orgStatus,
                          org.verified
                        )}
                      </div>
                      <div className="text-xs font-mono text-stone-600 dark:text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>80G Reg: <strong>{org.reg80g}</strong></span>
                        <span>PAN: <strong>{org.pan}</strong></span>
                        {org.verificationFileName && (
                          <span className="text-[#1F6F5B] dark:text-emerald-400">
                            File: {org.verificationFileName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-stone-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => openOrgVerificationModal(org)}
                        className="px-3 py-1.5 rounded-lg bg-[#1F6F5B] hover:bg-[#185848] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 shrink-0" />
                        <span>Verification Upload</span>
                      </button>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleAdminToggleNgoVerification(
                              org.id,
                              !org.verified
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800 text-xs font-semibold text-stone-700 dark:text-slate-300 cursor-pointer"
                        >
                          {org.verified ? 'Set Pending' : 'Set Verified'}
                        </button>
                        <button
                          type="button"
                          onClick={() => requestAdminDeleteOrganization(org)}
                          className="px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          title="Delete NGO Organization"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={handleAdminAddOrganization}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1"
            >
              <input
                type="text"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="Enter new verified NGO organization name (80G & 12A)..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 text-xs text-stone-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl bg-stone-900 dark:bg-emerald-600 hover:bg-stone-800 text-white text-xs font-bold cursor-pointer shrink-0 flex items-center justify-center gap-1.5 shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Add NGO</span>
              </button>
            </form>
          </div>

          {/* Filter Pills + Search Input + Manual Audit Log Entry */}
          <div className="p-4 sm:p-5 border-b border-stone-200/80 dark:border-slate-800 space-y-3.5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Interactive Category Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {AUDIT_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setAuditCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      auditCategoryFilter === cat
                        ? 'bg-stone-900 dark:bg-emerald-600 text-white shadow-sm'
                        : 'bg-white/80 dark:bg-slate-800 text-stone-700 dark:text-slate-300 border border-stone-200 dark:border-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search Audit History */}
              <div className="relative w-full lg:w-72">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                  placeholder="Search actor, action, order ID, NGO..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 text-xs text-stone-900 dark:text-white"
                />
              </div>
            </div>

            {/* Record Custom Compliance Note */}
            <form
              onSubmit={handleAdminAddManualAuditLog}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
            >
              <input
                type="text"
                value={customAuditNote}
                onChange={(e) => setCustomAuditNote(e.target.value)}
                placeholder="Log manual Admin compliance note (e.g. Verified Aadhaar & 80G certificate)..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 text-xs text-stone-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl bg-[#1F6F5B] hover:bg-[#185848] text-white text-xs font-bold cursor-pointer shrink-0 flex items-center justify-center gap-1.5 shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Record Audit Entry</span>
              </button>
            </form>
          </div>

          {/* Timestamped Audit Log Feed */}
          <div className="divide-y divide-stone-200/80 dark:divide-slate-800 max-h-96 overflow-y-auto">
            {filteredAuditLogsList.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 dark:text-slate-400">
                No audit log entries match the selected filter.
              </div>
            ) : (
              filteredAuditLogsList.map((log) => {
                const meta = classifyAuditAction(log.action);
                const formattedTime = log.createdAt
                  ? new Date(log.createdAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'medium',
                    })
                  : '2026-10-29 12:20:00';
                return (
                  <div
                    key={log.id}
                    className="p-4 hover:bg-stone-50/80 dark:hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                        <span
                          className={`font-bold ${
                            meta.severity === 'critical'
                              ? 'text-red-700 dark:text-red-400'
                              : meta.severity === 'verified'
                              ? 'text-[#1F6F5B] dark:text-emerald-400'
                              : 'text-blue-700 dark:text-blue-400'
                          }`}
                        >
                          [{log.action}]
                        </span>
                        <span className="text-stone-400">·</span>
                        <span className="text-stone-700 dark:text-slate-300 font-semibold">
                          Actor: {log.actorName} ({log.actorRole})
                        </span>
                        <span className="text-stone-400">·</span>
                        <span className="text-stone-500 dark:text-slate-400">
                          Target: {log.targetType} #{log.targetId}
                        </span>
                      </div>
                      <p className="text-stone-800 dark:text-slate-200 font-medium break-words">
                        {log.details}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-stone-500 dark:text-slate-400 shrink-0 tabular-nums">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>{formattedTime}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 1. Admin Campaign Category, Price, Photo Upload & Delete Control */}
        <div className="liquid-glass rounded-2xl overflow-hidden">
          <div className="px-5 py-4 bg-stone-100/80 dark:bg-slate-800/80 border-b border-stone-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-stone-800 dark:text-slate-200">
                1. Approve Campaigns, Update/Delete Campaign Photos & Edit Support Type ({localCampaigns.length})
              </h3>
              <span className="text-[11px] font-mono text-stone-500 dark:text-slate-400">
                Full Admin CRUD, Photo Control & Campaign Data Export (PDF / Excel / HTML)
              </span>
            </div>
            <ExportFormatButtons
              payload={buildCampaignsReportPayload()}
              compact
              labelPrefix="Export All Campaigns"
            />
          </div>

          <div className="divide-y divide-stone-200 dark:divide-slate-800">
            {localCampaigns.map((camp) => {
              const isEditing = editingCampaignId === camp.id;
              const sched = calculateRepaymentSchedule(
                camp.goalAmount,
                camp.returnOption || 'monthly',
                camp.returnDurationMonths || 12
              );
              return (
                <div
                  key={camp.id}
                  className="p-4 sm:p-5 hover:bg-stone-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {isEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
                      <div className="sm:col-span-2 lg:col-span-2">
                        <label className="text-[11px] font-bold uppercase text-stone-500 block mb-1">
                          Title & Category
                        </label>
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-stone-900 dark:text-white"
                          />
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 text-stone-900 dark:text-white font-semibold"
                          >
                            {UNIVERSAL_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase text-stone-500 block mb-1">
                          Goal Price (₹)
                        </label>
                        <input
                          type="number"
                          value={editGoal}
                          onChange={(e) => setEditGoal(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs text-stone-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase text-stone-500 block mb-1">
                          Raised Price (₹)
                        </label>
                        <input
                          type="number"
                          value={editRaised}
                          onChange={(e) => setEditRaised(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs text-stone-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase text-stone-500 block mb-1">
                          Donor Support & Months
                        </label>
                        <div className="flex gap-1.5">
                          <select
                            value={editReturnOption}
                            onChange={(e) =>
                              setEditReturnOption(
                                e.target.value as ReturnScheduleOption
                              )
                            }
                            className="flex-1 px-2 py-2 rounded-lg border border-stone-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 text-stone-900 dark:text-white font-bold uppercase"
                          >
                            <option value="no_return">No Return (Donator)</option>
                            <option value="monthly">Monthly (Lender)</option>
                            <option value="yearly">Yearly (Lender)</option>
                            <option value="directly">One-Time (Lender)</option>
                          </select>
                          {editReturnOption !== 'no_return' && (
                            <input
                              type="number"
                              min="1"
                              max="120"
                              value={editReturnMonths}
                              onChange={(e) =>
                                setEditReturnMonths(Number(e.target.value) || 12)
                              }
                              className="w-16 px-2 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs text-stone-900 dark:text-white"
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAdminSaveCampaign(camp.id)}
                          className="flex-1 py-2 px-3 rounded-lg bg-[#1F6F5B] text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" /> Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCampaignId(null)}
                          className="py-2 px-3 rounded-lg bg-stone-200 dark:bg-slate-700 text-stone-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3.5">
                      <div className="space-y-2 w-full">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                            <span className="px-2.5 py-0.5 rounded-md bg-stone-900 text-amber-300 font-bold">
                              {camp.category}
                            </span>
                            {renderVerificationStatusBadge(
                              camp.verificationStatus,
                              camp.verified
                            )}
                            {renderSupportTypeBadge(
                              camp.returnOption,
                              camp.donorSupportType
                            )}
                            <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/70 text-[#1F6F5B] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-sans font-semibold text-[11px]">
                              Govt ID: {camp.documentType}
                            </span>
                          </div>
                          <div className="font-mono text-sm sm:text-base font-bold text-stone-900 dark:text-white tabular-nums">
                            {formatINR(camp.raisedAmount)}{' '}
                            <span className="text-xs text-stone-400 font-normal">
                              of {formatINR(camp.goalAmount)}
                            </span>
                          </div>
                        </div>

                        <h4 className="font-serif text-base sm:text-lg font-bold text-stone-900 dark:text-white leading-snug">
                          {camp.title}
                        </h4>

                        <div className="text-xs text-stone-600 dark:text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>
                            Applicant: <strong>{camp.applicantName}</strong> (
                            {camp.applicantEmail || 'applicant@sankalpsetu.org'})
                          </span>
                          <span>
                            Location: <strong>{camp.beneficiaryLocation}</strong>
                          </span>
                          <span className="font-mono text-emerald-800 dark:text-emerald-300 font-semibold">
                            {sched.summaryText}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-stone-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                            <Camera className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                            <span>Update Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                const reader = new FileReader();
                                reader.onload = () => {
                                  if (typeof reader.result === 'string') {
                                    handleAdminUpdateCampaignPhoto(
                                      camp.id,
                                      reader.result
                                    );
                                  }
                                };
                                reader.readAsDataURL(f);
                              }}
                            />
                          </label>
                          {camp.imageUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                handleAdminUpdateCampaignPhoto(camp.id, '')
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 text-xs font-semibold cursor-pointer"
                            >
                              Remove Photo
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openCampaignVerificationModal(camp)}
                            className="px-3 py-1.5 rounded-lg bg-[#1F6F5B] hover:bg-[#185848] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5 shrink-0" />
                            <span>Verification Upload</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdminApproveCampaign(camp.id, true)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 text-xs font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>Approve & Audit</span>
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <ExportFormatButtons
                            payload={buildSingleCampaignPayload(camp)}
                            compact
                          />
                          <button
                            type="button"
                            onClick={() => startEditingCampaign(camp)}
                            className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800 text-xs font-semibold text-stone-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 shrink-0" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => requestAdminDeleteCampaign(camp)}
                            className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/50 text-xs font-semibold text-red-700 dark:text-red-400 flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Admin Create Any Category Campaign + 3. Doctor & Refund Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6">
            {renderUniversalRequestForm(
              'Admin Quick Launch',
              'Add Campaign for Freelancer, Personal, City, Medical or Village'
            )}
          </div>

          <div className="lg:col-span-6 space-y-6">
            {/* Add / Manage Government NMC-IMR Verified Doctors */}
            <div className="liquid-glass rounded-2xl p-5 sm:p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-stone-700 dark:text-slate-200 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-[#1F6F5B] dark:text-emerald-400" />
                2. Register Government NMC-IMR Verified Doctor ({localDoctors.length} Active)
              </h3>
              <form onSubmit={handleAdminAddDoctor} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="Real Doctor Name (e.g. Dr. Rinchin Dorjee Khrime)"
                    className="px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-stone-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={docLicense}
                    onChange={(e) => setDocLicense(e.target.value)}
                    placeholder="NMC / State Reg No. (e.g. APMC/R/0530, DMC/R/04892)"
                    className="px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs uppercase text-stone-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={docVillage}
                    onChange={(e) => setDocVillage(e.target.value)}
                    placeholder="State Medical Council / Govt Hospital (e.g. Arunachal Pradesh Medical)"
                    className="px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-stone-900 dark:text-white"
                  />
                  <input
                    type="number"
                    value={docFee}
                    onChange={(e) => setDocFee(e.target.value)}
                    placeholder="OPD Consultation Fee (₹)"
                    className="px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs text-stone-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-stone-900 dark:bg-emerald-600 hover:opacity-90 text-white text-xs font-semibold cursor-pointer"
                >
                  {submitting
                    ? 'Checking Online (NMC-IMR + Google Search + PubMed)...'
                    : '+ Verify Online & Register NMC-IMR Doctor'}
                </button>
              </form>

              <div className="divide-y divide-stone-200/70 dark:divide-slate-800 pt-2">
                {localDoctors.map((d) => (
                  <div
                    key={d.id}
                    className="py-2 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <strong className="text-stone-900 dark:text-white">{d.name}</strong> ({d.licenseNumber})
                      <div className="text-stone-500 dark:text-slate-400">
                        {d.governmentHospital || d.hospitalVillage} · {d.stateMedicalCouncil || 'NMC-IMR'} · Fee: {formatINR(d.consultationFee)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => requestAdminDeleteDoctor(d)}
                      className="px-2.5 py-1 rounded-lg border border-red-200 text-red-600 dark:text-red-400 hover:bg-red-50 font-semibold shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Payment & Refund Ledger */}
            <div className="liquid-glass rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 bg-stone-100/80 dark:bg-slate-800/80 border-b border-stone-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-stone-700 dark:text-slate-200">
                    3. Payment Settlement, Refund & Receipt Export Control ({localDonations.length})
                  </h3>
                  <span className="text-[11px] font-mono text-stone-500 dark:text-slate-400">
                    Admin: Danish Khan • Export All Receipts as PDF or Excel
                  </span>
                </div>
                <ExportFormatButtons
                  payload={buildDonationsLedgerPayload()}
                  compact
                  labelPrefix="Export Receipts"
                />
              </div>
              <div className="divide-y divide-stone-200 dark:divide-slate-800 max-h-72 overflow-y-auto">
                {localDonations.map((don) => (
                  <div
                    key={don.id}
                    className="p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-stone-900 dark:text-white">
                        {don.gatewayOrderId}
                      </span>{' '}
                      · <span className="text-stone-700 dark:text-slate-300">{don.donorName}</span>
                      <div className="text-stone-500 dark:text-slate-400 font-mono text-[11px]">
                        Support:{' '}
                        {don.returnOption === 'no_return'
                          ? 'PURE DONATOR (NO RETURN)'
                          : `LENDER (${(don.returnOption || 'monthly').toUpperCase()})`}{' '}
                        · Status: {don.status.toUpperCase()}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-stone-900 dark:text-white tabular-nums">
                        {formatINR(don.amount)}
                      </span>
                      <ExportFormatButtons
                        payload={buildDonationReceiptPayload(don)}
                        compact
                      />
                      {don.status === 'paid' && (
                        <button
                          type="button"
                          onClick={() => handleRefundDonation(don.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 font-semibold cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" /> Issue Refund
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => requestAdminDeleteDonation(don)}
                        className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 cursor-pointer flex items-center gap-1 font-semibold"
                        title="Delete Donation Record"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Registered JWT & Social OAuth Users Directory (PostgreSQL users table) */}
        <div className="liquid-glass rounded-2xl overflow-hidden border border-stone-200/90 dark:border-slate-700/90">
          <div className="px-5 py-4 bg-stone-900 text-white flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 block">
                Verified Account & Session Directory
              </span>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-white">
                4. Registered Admin, Donator, Fundraiser & User Accounts ({registeredUsers.length})
              </h3>
            </div>
            <span className="text-xs font-mono text-amber-300">
              Protected by Cloudflare Turnstile & JWT
            </span>
          </div>

          <div className="divide-y divide-stone-200 dark:divide-slate-800 max-h-72 overflow-y-auto">
            {registeredUsers.map((u) => (
              <div
                key={`${u.uid}-${u.email}`}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-stone-50/80 dark:hover:bg-slate-800/40"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-stone-900 dark:text-white text-sm">
                      {u.name}
                    </strong>
                    <span className="px-2 py-0.5 rounded bg-stone-900 text-amber-300 font-mono text-[10px] uppercase font-bold">
                      Role: {u.role}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-mono text-[10px] font-bold">
                      Category: {u.category || 'All Categories'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono text-[10px] uppercase">
                      Provider: {u.provider || 'email_jwt'}
                    </span>
                  </div>
                  <div className="font-mono text-stone-500 dark:text-slate-400 text-[11px]">
                    Email: {u.email} · UID: {u.uid}
                  </div>
                </div>

                {u.email.toLowerCase() !== 'khandanish0503@gmail.com' && (
                  <button
                    type="button"
                    onClick={() => handleAdminDeleteRegisteredUser(u.email)}
                    className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete User</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 5. 3-Way Gmail Notification & Dispatch Center (Applicant, Admin khandanish0503@gmail.com, Donator/Fundraiser) */}
        <GmailNotificationCenter
          notifications={emailNotifications}
          onRefresh={fetchAdminAuditAndOrgs}
        />

        {renderVerificationModal()}
      </div>
    </section>
  );
};
