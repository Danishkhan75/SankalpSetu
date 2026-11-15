import React, { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ShieldCheck,
  Search,
  MapPin,
  ArrowUpRight,
  CheckCircle2,
  FileCheck2,
  Menu,
  X,
  Stethoscope,
  Mail,
  Database,
  Camera,
  Navigation,
  Play,
  Pause,
  Sun,
  Moon,
  Sparkles,
  History,
  Trash2,
  ImagePlus,
  AlertCircle,
} from 'lucide-react';
import {
  CampaignItem,
  DonationRecord,
  PlatformStats,
  UserProfile,
  UserRole,
  DoctorRecord,
  BloodDonationRecord,
  HeroSlideItem,
} from './types';
import {
  calculateCampaignProgress,
  filterCampaigns,
  formatCompactINR,
  formatINR,
  calculateRepaymentSchedule,
  validateQuickAidRequestForm,
  GovernmentIdVerificationResult,
  OFFICIAL_GOVERNMENT_IDENTITIES,
} from './utils/donationLogic';
import { GovernmentIdUploadVerifier } from './components/GovernmentIdUploadVerifier';
import { CampaignArtwork } from './components/CampaignArtwork';
import { HeroGeminiShowcase } from './components/HeroGeminiShowcase';
import { DonationFlowModal } from './components/DonationFlowModal';
import { CampaignDetailModal } from './components/CampaignDetailModal';
import { RoleDashboards, UNIVERSAL_CATEGORIES } from './components/RoleDashboards';
import { BloodAndDoctorSection } from './components/BloodAndDoctorSection';
import { NearbyHospitalFinder } from './components/NearbyHospitalFinder';
import { FooterFaqSection } from './components/FooterFaqSection';
import {
  AuthPortalModal,
  AuthenticatedSession,
} from './components/AuthPortalModal';
import {
  ConfirmActionModal,
  ConfirmActionState,
} from './components/ConfirmActionModal';
import {
  SubmissionSuccessModal,
  SubmissionSuccessInfo,
} from './components/SubmissionSuccessModal';
import { InBuiltWebsiteMedicalChatbot } from './components/InBuiltWebsiteMedicalChatbot';
import { TrustCenterSection } from './components/TrustCenterSection';
import { CampaignTransparencyDashboard } from './components/CampaignTransparencyDashboard';

const FILTER_CATEGORIES = ['All', ...UNIVERSAL_CATEGORIES] as const;

const DEFAULT_HERO_SLIDES: HeroSlideItem[] = [
  {
    id: 'slide-freelancer',
    theme: 'freelancer',
    categoryBadge: 'Freelancer & Website Fund',
    title: 'Freelancer Website, SaaS & Digital Studio Launch Support',
    location: 'Bengaluru, Pune, Delhi & Remote Freelancers',
    docBadge: 'Aadhaar Card & PAN Card Official Identity Verified',
    caption:
      'Independent developers, designers, and freelancers can raise working capital for their own website or SaaS product and return funds Monthly, Yearly, or One-Time.',
  },
  {
    id: 'slide-personal',
    theme: 'personal',
    categoryBadge: 'City & Personal Emergency',
    title: 'Personal Crisis, Urban Livelihood & City Family Relief',
    location: 'Mumbai, Hyderabad, Kolkata & Urban Centers',
    docBadge: 'Aadhaar Card, PAN Card & Ration Card Verified',
    caption:
      'For city workers, small shopkeepers, and families facing personal emergencies—select your exact needed amount and divide repayments across flexible schedules.',
  },
  {
    id: 'slide-blood',
    theme: 'blood_camp',
    categoryBadge: 'Medical & Blood Donation',
    title: 'Donate Blood (Instant Printable Receipt) & Hire Certified Doctors',
    location: 'City Hospitals, Trauma Centers & Rural Health Camps',
    docBadge: 'MCI Doctor & Official Government Identity Verified',
    caption:
      'Select your blood group (A+, B+, O+, AB+), download and print your official Blood Donation Receipt, or locate nearby hospitals with Google Maps shortest path.',
  },
  {
    id: 'slide-water',
    theme: 'water',
    categoryBadge: 'Village & Rural Welfare',
    title: 'Solar Borewell, Clean Water & Gram Panchayat Livelihood Aid',
    location: 'Marathwada, Bundelkhand & Rural Gram Sabhas',
    docBadge: 'Ration Card & Aadhaar Card Official Identity Verified',
    caption:
      'Supporting rural communities and smallholder farmers with zero-interest harvest-linked Yearly, Monthly, or Direct return options.',
  },
  {
    id: 'slide-education',
    theme: 'education',
    categoryBadge: 'Education & Skill Building',
    title: 'University Tuition, Coding Bootcamps & Youth STEM Labs',
    location: 'All-India Students, City Colleges & Rural Schools',
    docBadge: 'Aadhaar Card & Driving Licence Official Identity Verified',
    caption:
      'Helping students and young professionals fund higher education, laptops, and technical certifications with post-graduation repayment plans.',
  },
];

const PANEL_PROFILES: Record<UserRole, UserProfile> = {
  admin: {
    id: 'demo-admin-uid',
    name: 'Danish Khan',
    email: 'khandanish0503@gmail.com',
    role: 'admin',
  },
  donor: {
    id: 'demo-donor-uid',
    name: 'Verified Donator',
    email: 'donator@sankalpsetu.org',
    role: 'donor',
  },
  fundraiser: {
    id: 'demo-fundraiser-uid',
    name: 'Verified Fundraiser',
    email: 'fundraiser@sankalpsetu.org',
    role: 'fundraiser',
  },
  user: {
    id: 'demo-user-uid',
    name: 'Verified Applicant',
    email: 'applicant@sankalpsetu.org',
    role: 'user',
  },
  ngo_admin: {
    id: 'demo-ngo-partner-uid',
    name: 'Goonj • NGO Partner',
    email: 'partner@ngodarpan.gov.in',
    role: 'ngo_admin',
  },
};

export default function App() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlideItem[]>(DEFAULT_HERO_SLIDES);
  const [stats, setStats] = useState<PlatformStats>({
    totalRaised: 0,
    totalDonationsCount: 0,
    verifiedNgoCount: 0,
    activeCampaignCount: 0,
    verifiedDoctorCount: 4,
    bloodDonationsCount: 2,
  });
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [bloodDonations, setBloodDonations] = useState<BloodDonationRecord[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [donorSupportFilter, setDonorSupportFilter] = useState<
    'All' | 'donator' | 'lender'
  >('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [authSession, setAuthSession] = useState<AuthenticatedSession | null>(() => {
    try {
      const saved = localStorage.getItem('sankalpsetu_session');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });
  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem('sankalpsetu_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.user?.role) return parsed.user.role as UserRole;
      }
    } catch {
      // ignore
    }
    return 'donor';
  });
  const [selectedHeroPhotoIdx, setSelectedHeroPhotoIdx] = useState<number>(0);
  const [heroAutoPlay, setHeroAutoPlay] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [customHeroImages, setCustomHeroImages] = useState<Record<string, string>>({});

  const [donationModalCampaign, setDonationModalCampaign] =
    useState<CampaignItem | null>(null);
  const [detailModalCampaign, setDetailModalCampaign] =
    useState<CampaignItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [legalPolicySection, setLegalPolicySection] = useState<
    'terms' | 'privacy' | 'cookies' | '80g' | 'refund' | null
  >(null);
  const [appConfirmState, setAppConfirmState] =
    useState<ConfirmActionState | null>(null);
  const [appSubmissionSuccess, setAppSubmissionSuccess] =
    useState<SubmissionSuccessInfo | null>(null);
  const [calcDonationAmount, setCalcDonationAmount] = useState<number>(10000);
  const [calcReturnMode, setCalcReturnMode] = useState<
    'no_return' | 'monthly' | 'yearly' | 'directly'
  >('yearly');
  const [calcDuration, setCalcDuration] = useState<number>(2);
  const [quickTitle, setQuickTitle] = useState<string>('Emergency Medical & Family Relief');
  const [quickName, setQuickName] = useState<string>('Rohan Sharma');
  const [quickEmail, setQuickEmail] = useState<string>('applicant@sankalpsetu.org');
  const [quickLocation, setQuickLocation] = useState<string>('New Delhi');
  const [quickCategory, setQuickCategory] = useState<string>('Medical & Healthcare');
  const [quickDocType, setQuickDocType] = useState<string>(
    OFFICIAL_GOVERNMENT_IDENTITIES[0]
  );
  const [quickVerifiedGovId, setQuickVerifiedGovId] =
    useState<GovernmentIdVerificationResult | null>(null);
  const [quickGovIdError, setQuickGovIdError] = useState<string | null>(null);
  const [quickSubmitBusy, setQuickSubmitBusy] = useState(false);
  const [appToast, setAppToast] = useState<string | null>(null);

  const quickAidValidation = validateQuickAidRequestForm({
    title: quickTitle,
    applicantName: quickName,
    applicantEmail: quickEmail,
    goalAmount: calcDonationAmount,
    beneficiaryLocation: quickLocation,
    description: `Quick Aid Request for ${quickTitle} in ${quickLocation}`,
  });

  const currentUser: UserProfile = authSession?.user
    ? {
        id: authSession.user.id,
        uid: authSession.user.uid,
        name: authSession.user.name,
        email: authSession.user.email,
        role: activeRole,
      }
    : PANEL_PROFILES[activeRole];

  // Sync Day / Night Mode with <html class="dark">
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Listen for Google Maps Platform Demo Key Quota Event (Section 8 Case A)
  useEffect(() => {
    const handleQuota = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Auto-advance Hero Carousel continuously with delay (4.5s) using motion
  useEffect(() => {
    if (!heroAutoPlay || heroSlides.length === 0) return;
    const timer = window.setInterval(() => {
      setSelectedHeroPhotoIdx((prev) => (prev + 1) % heroSlides.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [heroAutoPlay, heroSlides.length]);

  const fetchAllData = useCallback(async () => {
    try {
      const [campRes, donRes, docRes, bloodRes, heroRes] = await Promise.all([
        fetch('/api/campaigns'),
        fetch('/api/donations', {
          headers: { 'x-demo-role': activeRole },
        }),
        fetch('/api/doctors'),
        fetch('/api/blood-donations'),
        fetch('/api/hero-slides'),
      ]);

      if (campRes.ok) {
        const campData = await campRes.json();
        setCampaigns(campData.campaigns || []);
        if (campData.stats) setStats(campData.stats);
      }

      if (donRes.ok) {
        const donData = await donRes.json();
        setDonations(donData.donations || []);
      }

      if (docRes.ok) {
        const docData = await docRes.json();
        setDoctors(docData.doctors || []);
      }

      if (bloodRes.ok) {
        const bloodData = await bloodRes.json();
        setBloodDonations(bloodData.bloodDonations || []);
      }

      if (heroRes.ok) {
        const heroData = await heroRes.json();
        if (Array.isArray(heroData.heroSlides)) {
          setHeroSlides(heroData.heroSlides);
        }
      }
    } catch (error) {
      console.error('Failed to fetch platform data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeRole]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleDirectAdminHeroPhotoUpdate = async (
    slideId: string,
    imageUrl: string
  ) => {
    setHeroSlides((prev) =>
      prev.map((s) =>
        s.id === slideId ? { ...s, imageUrl: imageUrl || undefined } : s
      )
    );
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
          setHeroSlides(data.heroSlides);
        } else {
          fetchAllData();
        }
      }
    } catch {
      // ignore
    }
  };

  const handleDirectAdminHeroSlideDelete = async (slideId: string) => {
    const removed = heroSlides.find((s) => s.id === slideId);
    setHeroSlides((prev) => prev.filter((s) => s.id !== slideId));
    setSelectedHeroPhotoIdx(0);
    setAppToast(
      `Deleted Hero Slide "${removed?.title || slideId}" from showcase.`
    );
    try {
      const res = await fetch(`/api/hero-slides/${slideId}`, {
        method: 'DELETE',
        headers: { 'x-demo-role': 'admin' },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.heroSlides)) {
          setHeroSlides(data.heroSlides);
        } else {
          fetchAllData();
        }
      }
    } catch {
      // ignore
    }
  };

  const handleDirectAdminCampaignPhotoUpdate = async (
    campaignId: string | number,
    imageUrl: string
  ) => {
    setCampaigns((prev) =>
      prev.map((c) =>
        String(c.id) === String(campaignId)
          ? { ...c, imageUrl: imageUrl || undefined }
          : c
      )
    );
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
        fetchAllData();
      }
    } catch {
      // ignore
    }
  };

  const handleDirectAdminCampaignDelete = async (
    campaignId: string | number
  ) => {
    setCampaigns((prev) =>
      prev.filter((c) => String(c.id) !== String(campaignId))
    );
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: { 'x-demo-role': 'admin' },
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch {
      // ignore
    }
  };

  const requestDirectAdminCampaignDelete = (camp: CampaignItem) => {
    handleDirectAdminCampaignDelete(camp.id);
    setAppToast(`Deleted campaign "${camp.title}" from directory.`);
  };

  const handleRoleSwitchRequest = (targetRole: UserRole) => {
    if (targetRole === 'admin') {
      if (authSession?.user?.role === 'admin') {
        setActiveRole('admin');
      } else {
        setAuthModalOpen(true);
      }
      return;
    }
    setActiveRole(targetRole);
  };

  const filteredCampaigns = filterCampaigns(campaigns, {
    category: activeCategory,
    searchQuery,
    status: 'live',
    donorSupportType: donorSupportFilter,
  });

  const activeHeroPhoto =
    heroSlides[selectedHeroPhotoIdx] || heroSlides[0] || DEFAULT_HERO_SLIDES[0];
  const featuredCampaign = campaigns[0] || null;

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden flex flex-col bg-[#FAF7F2] dark:bg-[#0D1117] text-[#181512] dark:text-[#F0F4F8] transition-colors duration-300">
      {/* Google Maps Platform Quota Notice (Rendered only if quota event fires) */}
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 dark:bg-amber-950/80 border-b border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 px-3 py-2 text-xs flex items-center justify-between gap-2 z-50 shadow-sm">
          <span className="flex-1 text-center">
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 dark:text-amber-100 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
          <button
            type="button"
            onClick={() => setGmpQuotaExceeded(false)}
            aria-label="Dismiss notice"
            className="p-1 rounded-lg hover:bg-amber-200/60 dark:hover:bg-amber-900/60 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Responsive Liquid Glass Navigation Bar (Clean across Mobile, iPad/Tablet, and Desktop) */}
      <header className="sticky top-0 z-40 liquid-glass border-b border-stone-200/80 dark:border-slate-800/80 w-full transition-colors">
        <div className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-8 h-20 sm:h-24 flex items-center justify-between gap-2 sm:gap-3 w-full">
          {/* Official SankalpSetu Brand Logo — Enlarged Red & Blue Inner Emblem Without Outer Border */}
          <a href="#top" className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 lg:flex-initial lg:shrink-0">
            <div
              data-testid="navbar-brand-logo"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-white/95 dark:bg-white/90 flex items-center justify-center shrink-0 ring-1 ring-stone-200/70 dark:ring-slate-700/80 p-0 shadow-xs"
            >
              <img
                src="/assets/aistudio/SankalpSetu_d7769182.png"
                alt="SankalpSetu Official Logo"
                className="w-full h-full object-cover object-center scale-[2.38] transform-gpu"
              />
            </div>
            <div className="min-w-0 lg:shrink-0">
              <span className="font-serif text-lg sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-white block leading-none truncate">
                SankalpSetu
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-stone-500 dark:text-slate-400 block mt-1 truncate">
                <span className="sm:hidden">Danish Khan • Aid</span>
                <span className="hidden sm:inline">All-India Aid • Danish Khan</span>
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links (Visible on xl+) */}
          <nav className="hidden xl:flex shrink-0 items-center gap-2 text-[11px] font-semibold text-stone-600 dark:text-slate-300 whitespace-nowrap">
            <a href="#campaigns" className="hover:text-stone-900 dark:hover:text-white transition-colors">
              Campaigns
            </a>
            <a
              href="#admin-audit-log"
              onClick={() => handleRoleSwitchRequest('admin')}
              className="hover:text-stone-900 dark:hover:text-white transition-colors flex items-center gap-1 text-emerald-800 dark:text-emerald-400"
            >
              <History className="w-3.5 h-3.5" />
              Audit Log
            </a>
            <a
              href="#blood-doctors"
              className="hover:text-stone-900 dark:hover:text-white transition-colors flex items-center gap-1"
            >
              <Stethoscope className="w-3.5 h-3.5 text-red-700 dark:text-red-400" />
              Blood & Doctors
            </a>
            <a
              href="#nearby-hospitals"
              className="hover:text-stone-900 dark:hover:text-white transition-colors flex items-center gap-1"
            >
              <Navigation className="w-3.5 h-3.5 text-[#1F6F5B] dark:text-emerald-400" />
              Hospitals
            </a>
            <a href="#faq-section" className="hover:text-stone-900 dark:hover:text-white transition-colors">
              Return & FAQ
            </a>
          </nav>

          {/* Right Controls: Role Switcher + Day/Night Theme Toggle */}
          <div className="hidden min-[1600px]:flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1 bg-stone-200/80 dark:bg-slate-800/90 p-1 rounded-xl border border-stone-300/80 dark:border-slate-700">
              {(
                [
                  { role: 'donor', label: 'Donator' },
                  { role: 'fundraiser', label: 'Fundraiser' },
                  { role: 'ngo_admin', label: 'NGO Partner' },
                  { role: 'user', label: 'User' },
                  ...(authSession?.user?.role === 'admin'
                    ? ([{ role: 'admin', label: 'Admin' }] as const)
                    : []),
                ] as const
              ).map((item) => (
                <button
                  key={item.role}
                  type="button"
                  data-testid={`role-switch-${item.role}`}
                  onClick={() => handleRoleSwitchRequest(item.role)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    activeRole === item.role
                      ? 'bg-stone-900 dark:bg-emerald-600 text-white shadow-sm'
                      : 'text-stone-700 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Login / Sign Up Button */}
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span>
                {authSession
                  ? `${authSession.user.name.split(' ')[0]} (${authSession.user.category})`
                  : 'Sign In / Join'}
              </span>
            </button>

            {/* Day / Night Theme Toggle Button */}
            <button
              type="button"
              onClick={() => setDarkMode((prev) => !prev)}
              aria-label="Toggle Day and Night Theme"
              className="px-2.5 py-2 rounded-xl glass-card text-stone-800 dark:text-amber-300 hover:bg-stone-200/70 dark:hover:bg-slate-800 transition-all flex items-center gap-1 text-[11px] font-semibold border border-stone-300/80 dark:border-slate-700 cursor-pointer"
            >
              {darkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Day</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-stone-700" />
                  <span>Night</span>
                </>
              )}
            </button>
          </div>

          {/* Mobile & Tablet Controls (Visible below lg — properly aligned and responsive across all devices) */}
          <div className="flex min-[1600px]:hidden items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="px-2.5 py-2 rounded-xl bg-[#1F6F5B] text-white text-[11px] font-bold shrink-0 cursor-pointer shadow-sm"
            >
              {authSession ? authSession.user.role.toUpperCase() : 'Login'}
            </button>
            <button
              type="button"
              onClick={() => setDarkMode((prev) => !prev)}
              aria-label="Toggle Day and Night Theme Mobile"
              className="p-2 rounded-xl glass-card text-stone-800 dark:text-amber-300 border border-stone-300 dark:border-slate-700 shrink-0"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="px-2.5 py-2 rounded-xl bg-stone-900 dark:bg-emerald-700 text-white hover:bg-stone-800 transition-colors flex items-center gap-1 text-xs font-semibold shrink-0 whitespace-nowrap shadow-sm"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4 shrink-0" />
              ) : (
                <Menu className="w-4 h-4 shrink-0" />
              )}
              <span className="hidden sm:inline">Menu & Panels</span>
              <span className="inline sm:hidden">Menu</span>
            </button>
          </div>
        </div>

        {/* Responsive Mobile & iPad Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-nav-drawer min-[1600px]:hidden border-t border-stone-200 dark:border-slate-800 liquid-glass px-4 pt-4 pb-6 space-y-4 shadow-xl">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-slate-400 block mb-2">
                Select Workspace Role:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(
                  [
                    {
                      role: 'donor',
                      label: 'As Donator',
                      sub: 'Pure Donator (0% No Tax) & Lender',
                    },
                    {
                      role: 'fundraiser',
                      label: 'As Fundraiser',
                      sub: 'Raise Funds & Support Campaigns',
                    },
                    {
                      role: 'ngo_admin',
                      label: 'As NGO Partner',
                      sub: 'Collective Metrics & Govt NGO Outreach',
                    },
                    {
                      role: 'user',
                      label: 'As User / Applicant',
                      sub: 'Request Aid for Any Category',
                    },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => {
                      handleRoleSwitchRequest(item.role);
                      setMobileMenuOpen(false);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      activeRole === item.role
                        ? 'bg-stone-900 dark:bg-emerald-700 text-white border-stone-900 dark:border-emerald-600'
                        : 'bg-white dark:bg-slate-900 text-stone-800 dark:text-slate-200 border-stone-300 dark:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{item.label}</div>
                    <div
                      className={`text-[11px] mt-0.5 ${
                        activeRole === item.role
                          ? 'text-stone-300 dark:text-emerald-100'
                          : 'text-stone-500 dark:text-slate-400'
                      }`}
                    >
                      {item.sub}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-200 dark:border-slate-800 text-xs font-semibold">
              <a
                href="#campaigns"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 text-center text-stone-800 dark:text-slate-200"
              >
                All Campaigns
              </a>
              <a
                href="#blood-doctors"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-center text-red-900 dark:text-red-200"
              >
                Blood & Receipt
              </a>
              <a
                href="#nearby-hospitals"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-center text-emerald-950 dark:text-emerald-200"
              >
                Nearby Hospitals
              </a>
              <a
                href="#faq-section"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 text-center text-stone-800 dark:text-slate-200"
              >
                Return & FAQ
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Floating Non-Blocking Toast Notification */}
      {appToast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md p-3.5 rounded-2xl bg-stone-900/95 text-white border border-emerald-500/60 shadow-2xl flex items-center justify-between gap-3 text-xs font-medium backdrop-blur-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{appToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setAppToast(null)}
            className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-mono uppercase cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content */}
      <main id="top" className="flex-1 w-full">
        {/* Hero Section with Continuous Auto-Moving Motion Carousel + Gemini Hero Image Generator */}
        <section className="relative pt-6 pb-12 lg:py-14 border-b border-stone-200/80 dark:border-slate-800/80 overflow-hidden">
          <div className="max-w-[1360px] mx-auto responsive-shell">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-10 items-center">
              {/* Left Editorial Narrative (5 Columns) */}
              <div className="xl:col-span-5 space-y-4 sm:space-y-5">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#1F6F5B] dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-md border border-emerald-200/80 dark:border-emerald-800">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>For City, Freelancer, Personal, Medical & Village Needs</span>
                </div>

                <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-stone-900 dark:text-white leading-[1.08] hero-headline-responsive">
                  Raise or Request Funds for Any Category with Divided Return.
                </h1>

                <p className="text-sm sm:text-base text-stone-600 dark:text-slate-300 leading-relaxed">
                  Built for <strong>everyone who needs help</strong>—whether a{' '}
                  <strong>freelancer building a website</strong>, a{' '}
                  <strong>city family with a personal emergency</strong>, a{' '}
                  <strong>medical patient</strong>, or a{' '}
                  <strong>village community</strong>. Select your category, set your own amount, and divide repayments{' '}
                  <strong>Monthly</strong>, <strong>Yearly</strong>, or{' '}
                  <strong>One-Time Directly</strong>.
                </p>

                {/* Owner & Verification Liquid Glass Banner */}
                <div className="p-3.5 rounded-xl glass-card liquid-sheen text-xs space-y-1">
                  <div className="flex items-center justify-between text-stone-700 dark:text-slate-300">
                    <span className="font-semibold flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-[#1F6F5B] dark:text-emerald-400 shrink-0" />
                      Platform Owner & Chief Verifier:
                    </span>
                    <strong className="text-stone-900 dark:text-white">Danish Khan</strong>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1 text-stone-500 dark:text-slate-400 font-mono text-[11px]">
                    <span>khandanish0503@gmail.com</span>
                    <span className="text-emerald-800 dark:text-emerald-400 font-semibold">
                      Official Government Identity Verified
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      featuredCampaign &&
                      setDonationModalCampaign(featuredCampaign)
                    }
                    className="px-4 sm:px-5 py-3 rounded-xl bg-[#C1553B] hover:bg-[#A9442C] text-white font-semibold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
                  >
                    Select Price & Fund Now
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                  <a
                    href="#nearby-hospitals"
                    className="px-4 sm:px-5 py-3 rounded-xl bg-stone-900 dark:bg-emerald-700 hover:bg-stone-800 dark:hover:bg-emerald-600 text-white font-semibold text-xs sm:text-sm transition-colors flex items-center gap-2"
                  >
                    <Navigation className="w-4 h-4 text-emerald-300" />
                    Live Hospital Map & Register
                  </a>
                </div>

                {/* Live Ledger Telemetry Strip */}
                <div className="pt-4 border-t border-stone-200/90 dark:border-slate-800 grid grid-cols-3 gap-3">
                  <div>
                    <span className="font-mono text-lg sm:text-2xl font-bold text-stone-900 dark:text-white block">
                      {formatCompactINR(stats.totalRaised)}
                    </span>
                    <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-stone-500 dark:text-slate-400">
                      Total Disbursed
                    </span>
                  </div>
                  <div>
                    <span className="font-mono text-lg sm:text-2xl font-bold text-[#1F6F5B] dark:text-emerald-400 block">
                      6 Categories
                    </span>
                    <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-stone-500 dark:text-slate-400">
                      Freelancer • City • Village
                    </span>
                  </div>
                  <div>
                    <span className="font-mono text-lg sm:text-2xl font-bold text-stone-900 dark:text-white block">
                      3 Categories
                    </span>
                    <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-stone-500 dark:text-slate-400">
                      0% Donator • Yearly/Mo • 50%
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Dynamic Auto-Moving Motion Gallery with Gemini Image Studio & Direct Admin Controls (7 Columns) */}
              <div
                className="xl:col-span-7 space-y-3"
                onMouseEnter={() => setHeroAutoPlay(false)}
                onMouseLeave={() => setHeroAutoPlay(true)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 dark:text-slate-300 px-1">
                  <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-[#C1553B] dark:text-amber-400" />
                    Dynamic Hero Showcase (Freelancer, City, Medical & Village)
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {activeRole === 'admin' && activeHeroPhoto && (
                      <>
                        <a
                          href="#admin-hero-manager"
                          className="px-2.5 py-1 rounded-md bg-stone-900 hover:bg-stone-800 text-amber-300 font-semibold text-[11px] flex items-center gap-1 cursor-pointer shadow-sm"
                        >
                          <span>+ Add Hero Banner</span>
                        </a>
                        <label className="px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer shadow-sm">
                          <ImagePlus className="w-3 h-3" />
                          Upload Photo
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => {
                                if (typeof reader.result === 'string') {
                                  handleDirectAdminHeroPhotoUpdate(
                                    activeHeroPhoto.id,
                                    reader.result
                                  );
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                        <label className="px-2.5 py-1 rounded-md bg-stone-800 hover:bg-stone-700 text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer shadow-sm">
                          <Camera className="w-3 h-3 text-emerald-300" />
                          Take Photo
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => {
                                if (typeof reader.result === 'string') {
                                  handleDirectAdminHeroPhotoUpdate(
                                    activeHeroPhoto.id,
                                    reader.result
                                  );
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                        {(activeHeroPhoto.imageUrl ||
                          customHeroImages[activeHeroPhoto.theme]) && (
                          <button
                            type="button"
                            onClick={() => {
                              handleDirectAdminHeroPhotoUpdate(
                                activeHeroPhoto.id,
                                ''
                              );
                              setCustomHeroImages((prev) => {
                                const next = { ...prev };
                                delete next[activeHeroPhoto.theme];
                                return next;
                              });
                            }}
                            className="px-2 py-1 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                            title="Delete Custom Hero Photo"
                          >
                            <Trash2 className="w-3 h-3" /> Reset Photo
                          </button>
                        )}
                        {heroSlides.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDirectAdminHeroSlideDelete(
                                activeHeroPhoto.id
                              )
                            }
                            className="px-2 py-1 rounded-md bg-rose-700 hover:bg-rose-600 text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                            title="Delete This Hero Slide"
                          >
                            <Trash2 className="w-3 h-3" /> Delete Slide
                          </button>
                        )}
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setHeroAutoPlay((p) => !p)}
                      className="px-2.5 py-1 rounded-md bg-stone-200/80 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 text-stone-800 dark:text-slate-200 font-mono text-[11px] flex items-center gap-1"
                    >
                      {heroAutoPlay ? (
                        <>
                          <Pause className="w-3 h-3" /> Auto-Moving
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3" /> Paused
                        </>
                      )}
                    </button>
                    <span className="font-mono text-[11px] text-stone-500 dark:text-slate-400">
                      {(selectedHeroPhotoIdx % Math.max(heroSlides.length, 1)) + 1} /{' '}
                      {heroSlides.length}
                    </span>
                  </div>
                </div>

                {/* Animated Main Hero Slide with Gemini Image Showcase & Motion Progress Bar */}
                <div className="relative rounded-2xl overflow-hidden border border-stone-300 dark:border-slate-700 shadow-xl bg-stone-900 h-64 sm:h-80">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeHeroPhoto.id}
                      initial={{ opacity: 0, x: 32, scale: 1.02 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -32, scale: 0.99 }}
                      transition={{ duration: 0.55, ease: 'easeInOut' }}
                      className="w-full h-full relative"
                    >
                      <HeroGeminiShowcase
                        theme={activeHeroPhoto.theme}
                        title={activeHeroPhoto.title}
                        caption={activeHeroPhoto.caption}
                        customImageUrl={
                          activeHeroPhoto.imageUrl ||
                          customHeroImages[activeHeroPhoto.theme]
                        }
                        onCustomImageGenerated={(theme, dataUrl) => {
                          setCustomHeroImages((prev) => ({
                            ...prev,
                            [theme]: dataUrl,
                          }));
                          handleDirectAdminHeroPhotoUpdate(
                            activeHeroPhoto.id,
                            dataUrl
                          );
                        }}
                        showGeneratorButton={activeRole === 'admin'}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/35 to-transparent pointer-events-none" />

                      <div className="absolute top-3.5 left-3.5 right-3.5 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                        <span className="px-3 py-1 rounded-md bg-stone-900/85 backdrop-blur-md text-amber-300 text-xs font-mono font-semibold border border-stone-700">
                          {activeHeroPhoto.categoryBadge}
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-[#1F6F5B] text-white text-xs font-semibold flex items-center gap-1 shadow">
                          <CheckCircle2 className="w-3.5 h-3.5" />{' '}
                          {activeHeroPhoto.docBadge}
                        </span>
                      </div>

                      <div className="absolute bottom-4 left-4 right-4 sm:right-44 text-white pointer-events-none">
                        <div className="flex items-center gap-1.5 text-xs text-stone-300 mb-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{activeHeroPhoto.location}</span>
                        </div>
                        <h2 className="font-serif text-lg sm:text-2xl font-bold leading-snug">
                          {activeHeroPhoto.title}
                        </h2>
                        <p className="text-xs text-stone-200 mt-1 line-clamp-2">
                          {activeHeroPhoto.caption}
                        </p>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Continuous Motion Progress Indicator Bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-stone-800">
                    <motion.div
                      key={`${activeHeroPhoto.id}-${heroAutoPlay}`}
                      initial={{ width: '0%' }}
                      animate={{ width: heroAutoPlay ? '100%' : '35%' }}
                      transition={{
                        duration: heroAutoPlay ? 4.5 : 0.3,
                        ease: 'linear',
                      }}
                      className="h-full bg-[#C1553B]"
                    />
                  </div>
                </div>

                {/* Dynamic Interactive Thumbnail Grid — Visible ONLY in Admin Panel */}
                {activeRole === 'admin' && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-3">
                    {heroSlides.map((photo, index) => {
                      const isSelected =
                        index ===
                        selectedHeroPhotoIdx % Math.max(heroSlides.length, 1);
                      return (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => setSelectedHeroPhotoIdx(index)}
                          className={`group relative rounded-xl overflow-hidden border-2 transition-all text-left h-16 sm:h-24 bg-stone-900 ${
                            isSelected
                              ? 'border-[#C1553B] ring-2 ring-[#C1553B]/30 scale-[1.02]'
                              : 'border-stone-300 dark:border-slate-700 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <HeroGeminiShowcase
                            theme={photo.theme}
                            title={photo.title}
                            caption={photo.caption}
                            customImageUrl={
                              photo.imageUrl || customHeroImages[photo.theme]
                            }
                            showGeneratorButton={false}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/20 to-transparent" />
                          <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-stone-900/80 text-[9px] sm:text-[10px] font-mono text-white">
                            #{index + 1}
                          </span>
                          <span className="absolute bottom-1 left-1 right-1 text-[9px] sm:text-[11px] font-semibold text-white leading-tight line-clamp-2">
                            {photo.categoryBadge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <TrustCenterSection />
        <CampaignTransparencyDashboard />

        {/* Quick Aid Request & Live 3-Category Return Division Calculator */}
        <section className="py-7 bg-emerald-950/5 dark:bg-slate-900/60 border-b border-stone-200/80 dark:border-slate-800">
          <div className="max-w-[1360px] mx-auto responsive-shell">
            <div className="p-5 sm:p-6 rounded-2xl liquid-glass liquid-sheen border border-emerald-300/60 dark:border-emerald-800/60 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/80 dark:border-slate-800 pb-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#1F6F5B] text-white font-mono text-[10px] uppercase font-bold">
                      Quick Aid Request & Return Division Calculator
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase flex items-center gap-1 ${
                        quickAidValidation.isValid && quickVerifiedGovId?.verified
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 border border-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300'
                      }`}
                    >
                      {quickAidValidation.isValid && quickVerifiedGovId?.verified ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-[#1F6F5B] dark:text-emerald-400" />
                          All Fields &amp; Govt ID Verified Ready
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          Mandatory Official Government Identity Verification Required
                        </>
                      )}
                    </span>
                  </div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900 dark:text-white mt-1">
                    Submit a Verified Quick Aid Request — Pure Donator (0% • No Tax) or Lender Return
                  </h3>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-right">
                  <span className="text-[10px] font-mono uppercase text-emerald-800 dark:text-emerald-300 block">
                    {calcReturnMode === 'no_return'
                      ? '1. Pure Donator (0% • No Tax)'
                      : calcReturnMode === 'directly'
                        ? '3. Lender — 50% Return Money'
                        : `2. Lender — ${calcReturnMode === 'yearly' ? 'Yearly' : 'Monthly'} Divided Return`}
                  </span>
                  <strong className="font-mono text-xs sm:text-sm text-emerald-950 dark:text-emerald-200">
                    {
                      calculateRepaymentSchedule(
                        Math.max(0, calcDonationAmount),
                        calcReturnMode,
                        calcDuration
                      ).summaryText
                    }
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-start">
                {/* 1. Request Title */}
                <div className="lg:col-span-2">
                  <label className="flex items-center justify-between text-[11px] font-bold uppercase text-stone-600 dark:text-slate-300 mb-1">
                    <span>Aid Request Title *</span>
                    {!quickAidValidation.errors.title && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#1F6F5B] dark:text-emerald-400" />
                    )}
                  </label>
                  <input
                    type="text"
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    placeholder="e.g. Emergency Medical Relief"
                    aria-invalid={Boolean(quickAidValidation.errors.title)}
                    className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs text-stone-900 dark:text-white ${
                      quickAidValidation.errors.title
                        ? 'border-red-400 dark:border-red-700'
                        : 'border-emerald-500/80 dark:border-emerald-600'
                    }`}
                  />
                  {quickAidValidation.errors.title && (
                    <p className="text-[10px] text-red-600 dark:text-red-400 font-medium mt-1">
                      {quickAidValidation.errors.title}
                    </p>
                  )}
                </div>

                {/* 2. Applicant Name */}
                <div>
                  <label className="flex items-center justify-between text-[11px] font-bold uppercase text-stone-600 dark:text-slate-300 mb-1">
                    <span>Your Name *</span>
                    {!quickAidValidation.errors.applicantName && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#1F6F5B] dark:text-emerald-400" />
                    )}
                  </label>
                  <input
                    type="text"
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    placeholder="Full Name"
                    aria-invalid={Boolean(quickAidValidation.errors.applicantName)}
                    className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs text-stone-900 dark:text-white ${
                      quickAidValidation.errors.applicantName
                        ? 'border-red-400 dark:border-red-700'
                        : 'border-emerald-500/80 dark:border-emerald-600'
                    }`}
                  />
                  {quickAidValidation.errors.applicantName && (
                    <p className="text-[10px] text-red-600 dark:text-red-400 font-medium mt-1">
                      {quickAidValidation.errors.applicantName}
                    </p>
                  )}
                </div>

                {/* 3. Applicant Email */}
                <div>
                  <label className="flex items-center justify-between text-[11px] font-bold uppercase text-stone-600 dark:text-slate-300 mb-1">
                    <span>Email Address *</span>
                    {!quickAidValidation.errors.applicantEmail && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#1F6F5B] dark:text-emerald-400" />
                    )}
                  </label>
                  <input
                    type="email"
                    value={quickEmail}
                    onChange={(e) => setQuickEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    aria-invalid={Boolean(quickAidValidation.errors.applicantEmail)}
                    className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 font-mono text-xs text-stone-900 dark:text-white ${
                      quickAidValidation.errors.applicantEmail
                        ? 'border-red-400 dark:border-red-700'
                        : 'border-emerald-500/80 dark:border-emerald-600'
                    }`}
                  />
                  {quickAidValidation.errors.applicantEmail && (
                    <p className="text-[10px] text-red-600 dark:text-red-400 font-medium mt-1">
                      {quickAidValidation.errors.applicantEmail}
                    </p>
                  )}
                </div>

                {/* 4. Positive Amount (₹) */}
                <div>
                  <label className="flex items-center justify-between text-[11px] font-bold uppercase text-stone-600 dark:text-slate-300 mb-1">
                    <span>Amount (₹) *</span>
                    {!quickAidValidation.errors.goalAmount && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#1F6F5B] dark:text-emerald-400" />
                    )}
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={500}
                    value={calcDonationAmount}
                    onChange={(e) =>
                      setCalcDonationAmount(Number(e.target.value))
                    }
                    aria-invalid={Boolean(quickAidValidation.errors.goalAmount)}
                    className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 font-mono text-xs font-bold text-stone-900 dark:text-white ${
                      quickAidValidation.errors.goalAmount
                        ? 'border-red-400 dark:border-red-700'
                        : 'border-emerald-500/80 dark:border-emerald-600'
                    }`}
                  />
                  {quickAidValidation.errors.goalAmount && (
                    <p className="text-[10px] text-red-600 dark:text-red-400 font-medium mt-1">
                      {quickAidValidation.errors.goalAmount}
                    </p>
                  )}
                </div>

                {/* 5. City / Village Location */}
                <div>
                  <label className="flex items-center justify-between text-[11px] font-bold uppercase text-stone-600 dark:text-slate-300 mb-1">
                    <span>City / Village *</span>
                    {!quickAidValidation.errors.beneficiaryLocation && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#1F6F5B] dark:text-emerald-400" />
                    )}
                  </label>
                  <input
                    type="text"
                    value={quickLocation}
                    onChange={(e) => setQuickLocation(e.target.value)}
                    placeholder="e.g. New Delhi"
                    aria-invalid={Boolean(
                      quickAidValidation.errors.beneficiaryLocation
                    )}
                    className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs text-stone-900 dark:text-white ${
                      quickAidValidation.errors.beneficiaryLocation
                        ? 'border-red-400 dark:border-red-700'
                        : 'border-emerald-500/80 dark:border-emerald-600'
                    }`}
                  />
                  {quickAidValidation.errors.beneficiaryLocation && (
                    <p className="text-[10px] text-red-600 dark:text-red-400 font-medium mt-1">
                      {quickAidValidation.errors.beneficiaryLocation}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end pt-1">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-stone-500 dark:text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={quickCategory}
                    onChange={(e) => setQuickCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-stone-900 dark:text-white"
                  >
                    {UNIVERSAL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-stone-500 dark:text-slate-400 mb-1">
                    Support & Return Category (3 Types)
                  </label>
                  <select
                    value={calcReturnMode}
                    onChange={(e) => {
                      const nextMode = e.target.value as
                        | 'no_return'
                        | 'monthly'
                        | 'yearly'
                        | 'directly';
                      setCalcReturnMode(nextMode);
                      if (nextMode === 'yearly') setCalcDuration(2);
                      if (nextMode === 'monthly') setCalcDuration(5);
                      if (nextMode === 'directly') setCalcDuration(1);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-stone-900 dark:text-white"
                  >
                    <option value="no_return">
                      1. Pure Donator (0% • No Tax • Nothing Returned)
                    </option>
                    <option value="yearly">
                      2. Lender — Yearly Return (Enter Years)
                    </option>
                    <option value="monthly">
                      2. Lender — Monthly Return (Enter Months)
                    </option>
                    <option value="directly">
                      3. Lender — 50% Return Money (50% Waived)
                    </option>
                  </select>
                </div>

                {(calcReturnMode === 'yearly' || calcReturnMode === 'monthly') ? (
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-stone-500 dark:text-slate-400 mb-1">
                      {calcReturnMode === 'yearly'
                        ? 'In How Many Years? (e.g. 2)'
                        : 'In How Many Months? (e.g. 5)'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={calcReturnMode === 'yearly' ? 20 : 120}
                      value={calcDuration}
                      onChange={(e) =>
                        setCalcDuration(Math.max(1, Number(e.target.value) || 1))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-emerald-500/80 dark:border-emerald-600 bg-white dark:bg-slate-900 font-mono text-xs font-bold text-stone-900 dark:text-white"
                    />
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-stone-100/80 dark:bg-slate-800/80 border border-stone-200 dark:border-slate-700 text-[11px] font-mono text-stone-700 dark:text-slate-300">
                    {calcReturnMode === 'no_return'
                      ? '0% Return • No Tax • Nothing to Return'
                      : `Return 50% (${formatINR(Math.round(Math.max(0, calcDonationAmount) * 0.5))}) • 50% Waived`}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={quickSubmitBusy}
                    onClick={async () => {
                      if (!quickAidValidation.isValid) {
                        const firstFieldErr =
                          quickAidValidation.errors.title ||
                          quickAidValidation.errors.applicantName ||
                          quickAidValidation.errors.applicantEmail ||
                          quickAidValidation.errors.goalAmount ||
                          quickAidValidation.errors.beneficiaryLocation;
                        setQuickGovIdError(
                          `Validation Error: ${firstFieldErr || 'Please complete all required fields.'}`
                        );
                        setAppToast(
                          `Validation Error: ${firstFieldErr || 'Please complete all required fields.'}`
                        );
                        return;
                      }
                      if (!quickVerifiedGovId || !quickVerifiedGovId.verified) {
                        const msg =
                          'Mandatory Verification Required: Official Government Identity (Aadhaar, PAN, Driving Licence, Voter ID, Passport, or Ration Card) must be uploaded and verified by the Official Government Portal & Gemini Vision/OCR engine before submitting your ₹' +
                          Number(calcDonationAmount).toLocaleString('en-IN') +
                          ' request.';
                        setQuickGovIdError(msg);
                        setAppToast(msg);
                        return;
                      }

                      setQuickGovIdError(null);
                      setQuickSubmitBusy(true);
                      try {
                        const res = await fetch('/api/campaigns', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            title: quickTitle.trim(),
                            category: quickCategory,
                            goalAmount: calcDonationAmount,
                            beneficiaryVillage: quickLocation.trim(),
                            beneficiaryLocation: quickLocation.trim(),
                            documentType: quickVerifiedGovId.documentType || quickDocType,
                            documentId: quickVerifiedGovId.maskedIdNumber,
                            rawIdNumber: quickVerifiedGovId.rawExtractedId,
                            govIdVerified: true,
                            verificationToken: quickVerifiedGovId.verificationToken,
                            documentVerified: true,
                            description: `Submitted via Quick Aid Request (${
                              calcReturnMode === 'no_return'
                                ? 'Pure Donator 0% No Tax'
                                : calcReturnMode === 'directly'
                                  ? '50% Return Money'
                                  : `Lender ${calcReturnMode} (${calcDuration})`
                            }) by ${quickName.trim()}.`,
                            applicantName:
                              quickVerifiedGovId.detectedName || quickName.trim(),
                            applicantEmail: quickEmail.trim(),
                            returnOption: calcReturnMode,
                            donorSupportType:
                              calcReturnMode === 'no_return'
                                ? 'donator'
                                : 'lender',
                            returnDurationMonths:
                              calcReturnMode === 'no_return'
                                ? 0
                                : calcReturnMode === 'directly'
                                  ? 1
                                  : calcDuration,
                          }),
                        });
                        const data = await res.json();
                        if (res.ok) {
                          setQuickVerifiedGovId(null);
                          setQuickGovIdError(null);
                          setAppSubmissionSuccess({
                            formTitle: 'Quick Aid Request Submitted (Government ID Verified)',
                            message:
                              data.message ||
                              'Form Submitted Successfully! Official Government Identity verified & detailed summary sent to Admin Danish Khan (khandanish0503@gmail.com).',
                            referenceId: `CAM-${data.campaign?.id || Date.now()}`,
                            category: quickCategory,
                            amountFormatted: formatINR(calcDonationAmount),
                            applicantName: quickName.trim(),
                            applicantEmail: quickEmail.trim(),
                            adminSummaryEmail: data.adminSummaryEmail || null,
                          });
                          fetchAllData();
                        } else {
                          const errMsg =
                            data.error ||
                            'Official Government Identity verification is mandatory before submitting this request.';
                          setQuickGovIdError(errMsg);
                          setAppToast(errMsg);
                        }
                      } finally {
                        setQuickSubmitBusy(false);
                      }
                    }}
                    className="liquid-btn flex-1 py-2.5 px-4 rounded-xl bg-[#1F6F5B] hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {quickSubmitBusy
                        ? 'Verifying & Submitting Request...'
                        : quickVerifiedGovId?.verified
                        ? 'Submit Verified Quick Aid Request'
                        : 'Submit Quick Aid Request (Verify Govt ID Below)'}
                    </span>
                  </button>
                </div>
              </div>

              {quickGovIdError && (
                <div className="p-3.5 rounded-xl bg-red-100/95 dark:bg-red-950/85 border border-red-400 dark:border-red-700 text-xs text-red-900 dark:text-red-200 flex items-start gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block">
                      Submission Blocked — Official Government Identity Not Uploaded / Verified
                    </strong>
                    <p className="mt-0.5 leading-relaxed">{quickGovIdError}</p>
                  </div>
                </div>
              )}

              {/* Mandatory Official Government Identity Upload & Gemini Vision/OCR Verification */}
              <div className="pt-2">
                <GovernmentIdUploadVerifier
                  selectedDocType={quickDocType}
                  onDocTypeChange={(docType) => {
                    setQuickDocType(docType);
                    setQuickVerifiedGovId(null);
                    setQuickGovIdError(null);
                  }}
                  applicantName={quickName || currentUser.name}
                  onVerificationComplete={(result) => {
                    setQuickVerifiedGovId(result);
                    if (result?.verified) {
                      setQuickGovIdError(null);
                    }
                  }}
                  verifiedResult={quickVerifiedGovId}
                  required={true}
                />
              </div>
            </div>
          </div>
        </section>

        {/* In-Built Website, Medical & Google Search AI Chatbot (Speech-to-Text + Document & Camera OCR) */}
        <InBuiltWebsiteMedicalChatbot
          totalRaised={stats.totalRaised}
          activeCampaignCount={campaigns.length || stats.activeCampaignCount}
          verifiedDoctorCount={doctors.length || stats.verifiedDoctorCount}
        />

        {/* Active 3-Panel Workspace (Admin Danish Khan + Audit Log / Donator & Fundraiser / Universal User) */}
        <div id="panel-workspace">
          <RoleDashboards
            currentUser={currentUser}
            campaigns={campaigns}
            donations={donations}
            doctors={doctors}
            bloodDonations={bloodDonations}
            heroSlides={heroSlides}
            onHeroSlidesChange={setHeroSlides}
            onRefresh={fetchAllData}
            onSelectCampaignForDonation={(camp) =>
              setDonationModalCampaign(camp)
            }
          />
        </div>

        {/* Universal Campaigns Directory (Freelancer, Personal, City, Medical, Village, Education) */}
        <section id="campaigns" className="py-14 border-t border-stone-200/80 dark:border-slate-800/80">
          <div className="max-w-[1360px] mx-auto responsive-shell space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#1F6F5B] dark:text-emerald-400 block mb-1">
                  All-Category Verified Campaigns & Return Division
                </span>
                <h2 className="font-serif text-2xl sm:text-4xl font-bold text-stone-900 dark:text-white tracking-tight">
                  Fund Freelancers, Personal Needs, City, Medical & Villages
                </h2>
                <p className="text-sm text-stone-600 dark:text-slate-300 mt-1">
                  Filter by category below. Every campaign is verified with Official Government Identity (Aadhaar Card, PAN Card, Ration Card, Driving Licence) and shows how funds are supported via <strong>Pure Donator (No Return)</strong> or <strong>Lender Return</strong>.
                </p>
              </div>

              {/* Search Input */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search freelancer, city, medical, village..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1F6F5B]"
                />
              </div>
            </div>

            {/* Universal Category Filter Bar + Donor Type Filter (Pure Donator vs Lender) */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {FILTER_CATEGORIES.map((cat) => {
                  const active = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                        active
                          ? 'bg-stone-900 dark:bg-emerald-600 text-white border-stone-900 dark:border-emerald-500 shadow-sm'
                          : 'glass-card text-stone-600 dark:text-slate-300 border-stone-200/90 dark:border-slate-700 hover:border-stone-300 hover:text-stone-900 dark:hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 bg-stone-200/70 dark:bg-slate-800/80 p-1 rounded-xl border border-stone-300/80 dark:border-slate-700">
                {(
                  [
                    { id: 'All', label: 'All Donor Types' },
                    { id: 'donator', label: '1. Pure Donator (No Return)' },
                    { id: 'lender', label: '2. Lender (Return Money)' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDonorSupportFilter(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      donorSupportFilter === item.id
                        ? 'bg-[#1F6F5B] text-white shadow-sm'
                        : 'text-stone-700 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Campaign Cards Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-96 rounded-2xl bg-stone-200/60 dark:bg-slate-800/50 animate-pulse border border-stone-200 dark:border-slate-700"
                  />
                ))}
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="p-10 rounded-2xl glass-card text-center space-y-3">
                <p className="font-serif text-xl text-stone-700 dark:text-slate-200">
                  No campaigns match your current category or donor type filter.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory('All');
                    setDonorSupportFilter('All');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl bg-stone-900 dark:bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
                >
                  Show All Categories & Donor Types
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {filteredCampaigns.map((camp) => {
                  const prog = calculateCampaignProgress(
                    camp.raisedAmount,
                    camp.goalAmount,
                    camp.donorCount
                  );
                  const repayment = calculateRepaymentSchedule(
                    camp.goalAmount,
                    camp.returnOption || 'monthly',
                    camp.returnDurationMonths || 12
                  );
                  const isNoReturn =
                    camp.returnOption === 'no_return' ||
                    camp.donorSupportType === 'donator';
                  const vStatus =
                    camp.verificationStatus ||
                    (camp.verified ? 'Verified' : 'Pending');

                  return (
                    <article
                      key={camp.id}
                      className="group rounded-2xl glass-card liquid-sheen shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden"
                    >
                      <div
                        className="relative h-48 w-full overflow-hidden bg-stone-900 cursor-pointer"
                        onClick={() => setDetailModalCampaign(camp)}
                      >
                        {camp.imageUrl ? (
                          <img
                            src={camp.imageUrl}
                            alt={camp.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <CampaignArtwork
                            theme={camp.imageTheme}
                            title={camp.title}
                            caption={camp.description}
                            className="group-hover:scale-105 transition-transform duration-500"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-stone-900/90 backdrop-blur-md text-amber-300 text-[11px] font-semibold">
                          {camp.category}
                        </span>
                        <span
                          className={`absolute top-3 right-3 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border ${
                            isNoReturn
                              ? 'bg-emerald-950/95 text-emerald-300 border-emerald-600'
                              : 'bg-amber-950/95 text-amber-300 border-amber-600'
                          }`}
                        >
                          {isNoReturn
                            ? 'PURE DONATOR (0% • NO TAX)'
                            : camp.returnOption === 'directly'
                              ? 'LENDER: 50% RETURN MONEY'
                              : `LENDER: ${(camp.returnOption || 'monthly').toUpperCase()}`}
                        </span>

                        {activeRole === 'admin' && (
                          <div
                            className="absolute top-12 right-3 flex items-center gap-1.5 z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <label
                              className="px-2 py-1 rounded bg-stone-900/90 hover:bg-stone-800 text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer border border-stone-600"
                              title="Admin: Upload or Change Campaign Photo"
                            >
                              <ImagePlus className="w-3 h-3 text-emerald-400" />
                              Photo
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    if (typeof reader.result === 'string') {
                                      handleDirectAdminCampaignPhotoUpdate(
                                        camp.id,
                                        reader.result
                                      );
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }}
                              />
                            </label>
                            {camp.imageUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDirectAdminCampaignPhotoUpdate(
                                    camp.id,
                                    ''
                                  )
                                }
                                className="px-2 py-1 rounded bg-amber-700/90 hover:bg-amber-600 text-white text-[10px] font-semibold cursor-pointer"
                                title="Admin: Remove Custom Photo"
                              >
                                Reset Photo
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                requestDirectAdminCampaignDelete(camp)
                              }
                              className="px-2 py-1 rounded bg-rose-700/90 hover:bg-rose-600 text-white text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer"
                              title="Admin: Delete Campaign"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                          <span className="flex items-center gap-1 font-medium truncate">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            {camp.beneficiaryLocation}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              vStatus === 'Verified'
                                ? 'bg-emerald-600/90 text-white'
                                : 'bg-amber-500/90 text-stone-950'
                            }`}
                          >
                            {vStatus}
                          </span>
                        </div>
                      </div>

                      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-5">
                        <div className="space-y-2.5">
                          <div className="p-2.5 rounded-xl bg-stone-50/90 dark:bg-slate-800/80 border border-stone-200/90 dark:border-slate-700 text-[11px] space-y-1">
                            <div className="flex items-center justify-between text-emerald-900 dark:text-emerald-300 font-semibold">
                              <span className="flex items-center gap-1">
                                <FileCheck2 className="w-3.5 h-3.5 text-[#1F6F5B] dark:text-emerald-400 shrink-0" />
                                Official Govt ID: {vStatus}
                              </span>
                              <span className="font-mono text-[10px] uppercase text-[#1F6F5B] dark:text-emerald-400">
                                Verified Identity
                              </span>
                            </div>
                            <div className="text-stone-600 dark:text-slate-300 font-medium truncate">
                              {camp.documentType}
                            </div>
                          </div>

                          <h3
                            onClick={() => setDetailModalCampaign(camp)}
                            className="font-serif text-lg sm:text-xl font-bold text-stone-900 dark:text-white group-hover:text-[#C1553B] dark:group-hover:text-amber-400 transition-colors cursor-pointer line-clamp-2 leading-snug"
                          >
                            {camp.title}
                          </h3>

                          <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {camp.description}
                          </p>
                        </div>

                        <div className="space-y-4 pt-2 border-t border-stone-100 dark:border-slate-800">
                          <div>
                            <div className="flex items-baseline justify-between mb-1.5">
                              <div>
                                <span className="font-mono text-base sm:text-lg font-bold text-stone-900 dark:text-white">
                                  {formatINR(camp.raisedAmount)}
                                </span>
                                <span className="text-xs text-stone-500 dark:text-slate-400 font-mono ml-1.5">
                                  of {formatINR(camp.goalAmount)}
                                </span>
                              </div>
                              <span className="font-mono text-xs font-bold text-[#1F6F5B] dark:text-emerald-400">
                                {prog.percentage}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-stone-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#1F6F5B] dark:bg-emerald-500 transition-all duration-500"
                                style={{ width: `${prog.clampedPercentage}%` }}
                              />
                            </div>
                            <div className="text-[11px] text-emerald-900 dark:text-emerald-300 mt-2 font-mono bg-emerald-50/70 dark:bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-200/70 dark:border-emerald-800/70">
                              {repayment.summaryText}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setDetailModalCampaign(camp)}
                              className="px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Inspect Docs
                            </button>
                            <button
                              type="button"
                              onClick={() => setDonationModalCampaign(camp)}
                              className="flex-1 py-2.5 px-4 rounded-xl bg-stone-900 dark:bg-emerald-700 hover:bg-[#C1553B] dark:hover:bg-emerald-600 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              {isNoReturn
                                ? 'Donate (No Return)'
                                : 'Lend / Donate Now'}
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Blood Donation (Downloadable & Printable Receipt) & Hire Verified Doctors Section */}
        <BloodAndDoctorSection
          doctors={doctors}
          bloodDonations={bloodDonations}
          onRefresh={fetchAllData}
          isAdmin={activeRole === 'admin'}
        />

        {/* Contact Nearby Hospital + Share Live GPS Location + Shortest Path + Direct Registration */}
        <NearbyHospitalFinder />
      </main>

      {/* Clean Footer with FAQ, Terms & Policies, and GitHub / LinkedIn / Social Links */}
      <footer className="bg-stone-900 dark:bg-slate-950 text-stone-400 text-xs w-full">
        <div id="faq-section">
          <FooterFaqSection />
        </div>
        <div className="border-t border-stone-800 py-12">
          <div className="max-w-[1360px] mx-auto responsive-shell grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 items-start">
            {/* Column 1: Brand & Mission */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 text-white">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-white/95 flex items-center justify-center shrink-0 ring-1 ring-stone-700 p-0 shadow-xs">
                  <img
                    src="/assets/aistudio/SankalpSetu_d7769182.png"
                    alt="SankalpSetu Official Logo"
                    className="w-full h-full object-cover object-center scale-[2.38] transform-gpu"
                  />
                </div>
                <div>
                  <span className="font-serif text-xl font-bold block leading-tight">
                    SankalpSetu
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">
                    Universal Aid Platform
                  </span>
                </div>
              </div>
              <p className="text-stone-400 leading-relaxed">
                Supporting Freelancers, City Families, Personal Emergencies, Medical Patients, Students, and Rural Villages with verified Government Identity (Aadhaar, PAN, Ration Card, Driving Licence) and flexible Pure Donator or Lender options.
              </p>
            </div>

            {/* Column 2: Platform Features & Services */}
            <div className="space-y-2.5">
              <span className="text-white font-semibold uppercase tracking-wider block">
                Platform Features & Services
              </span>
              <ul className="space-y-2">
                <li>
                  <a href="#campaigns" className="hover:text-white transition-colors">
                    Freelancer, Personal, City, Medical & Village Campaigns
                  </a>
                </li>
                <li>
                  <a href="#blood-doctors" className="hover:text-white transition-colors">
                    Blood Donation (Printable Receipt) & Hire Doctors
                  </a>
                </li>
                <li>
                  <a href="#nearby-hospitals" className="hover:text-white transition-colors">
                    Nearby Hospitals, Live Shortest Route & Direct Registration
                  </a>
                </li>
                <li>
                  <a href="#faq-section" className="hover:text-white transition-colors">
                    Pure Donator (0% No Tax), Yearly/Monthly & 50% Return FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Terms & Legal Policies */}
            <div className="space-y-2.5">
              <span className="text-white font-semibold uppercase tracking-wider block">
                Terms & Policies
              </span>
              <ul className="space-y-2">
                <li>
                  <button
                    type="button"
                    onClick={() => setLegalPolicySection('terms')}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Terms of Service & Platform Rules
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setLegalPolicySection('privacy')}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Privacy Policy & Data Protection
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setLegalPolicySection('cookies')}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Cookie Policy & Cloudflare Security
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setLegalPolicySection('80g')}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Government Identity & KYC Verification Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setLegalPolicySection('refund')}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Refund, Escrow & Lender Repayment Policy
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Connect, GitHub, LinkedIn & Administrator */}
            <div className="space-y-3">
              <span className="text-white font-semibold uppercase tracking-wider block">
                Connect & Official Accounts
              </span>
              <div className="text-stone-200 font-serif text-base font-bold">
                Danish Khan
              </div>
              <div className="flex items-center gap-1.5 font-mono text-emerald-400">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <a
                  href="mailto:khandanish0503@gmail.com"
                  className="hover:underline break-all"
                >
                  khandanish0503@gmail.com
                </a>
              </div>

              {/* Social & Developer Profile Links (GitHub, LinkedIn, X) */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href="https://github.com/danishkhan75"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-semibold inline-flex items-center gap-1.5 border border-stone-700 transition-colors"
                  aria-label="GitHub Profile"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  <span>GitHub</span>
                </a>

                <a
                  href="https://www.linkedin.com/in/-danish-khan-"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-[#0A66C2] hover:bg-[#004182] text-white font-semibold inline-flex items-center gap-1.5 transition-colors"
                  aria-label="LinkedIn Profile"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  <span>LinkedIn</span>
                </a>

                <a
                  href="https://x.com/DanishK0503"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-semibold inline-flex items-center gap-1.5 border border-stone-700 transition-colors"
                  aria-label="X Profile"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span>X</span>
                </a>
              </div>
            </div>
          </div>

          <div className="max-w-[1360px] mx-auto responsive-shell mt-8 pt-6 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-stone-500">
            <span>
              © {new Date().getFullYear()} SankalpSetu Fundraising & Medical Platform. Owned & Administered by Danish Khan.
            </span>
            <div className="flex flex-wrap items-center gap-4 text-stone-400">
              <button
                type="button"
                onClick={() => setLegalPolicySection('terms')}
                className="hover:text-white underline cursor-pointer"
              >
                Terms
              </button>
              <button
                type="button"
                onClick={() => setLegalPolicySection('privacy')}
                className="hover:text-white underline cursor-pointer"
              >
                Privacy
              </button>
              <button
                type="button"
                onClick={() => setLegalPolicySection('cookies')}
                className="hover:text-white underline cursor-pointer"
              >
                Cookies
              </button>
              <a
                href="https://github.com/danishkhan75"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white underline"
              >
                GitHub
              </a>
              <a
                href="https://www.linkedin.com/in/-danish-khan-"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white underline"
              >
                LinkedIn
              </a>
              <a
                href="https://x.com/DanishK0503"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white underline"
              >
                X
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Interactive Legal & Policies Modal */}
      {legalPolicySection && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5 text-stone-900 dark:text-white my-6">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#1F6F5B] dark:text-emerald-400 block">
                  SankalpSetu Official Legal & Compliance
                </span>
                <h3 className="font-serif text-xl sm:text-2xl font-bold mt-0.5">
                  {legalPolicySection === 'terms' && 'Terms of Service & Platform Governance'}
                  {legalPolicySection === 'privacy' && 'Privacy Policy & Identity Data Protection'}
                  {legalPolicySection === 'cookies' && 'Cookie Policy & Cloudflare Turnstile Security'}
                  {legalPolicySection === '80g' && 'Government Identity & KYC Verification Policy'}
                  {legalPolicySection === 'refund' && 'Escrow Disbursement, Refund & Lender Repayment Policy'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLegalPolicySection(null)}
                className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-500 hover:text-stone-900 dark:hover:text-white cursor-pointer"
                aria-label="Close legal policy modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'terms', label: 'Terms of Service' },
                  { id: 'privacy', label: 'Privacy Policy' },
                  { id: 'cookies', label: 'Cookie Policy' },
                  { id: '80g', label: 'Identity & KYC Policy' },
                  { id: 'refund', label: 'Refund & Escrow' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLegalPolicySection(tab.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                    legalPolicySection === tab.id
                      ? 'bg-stone-900 dark:bg-emerald-600 text-white'
                      : 'bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 space-y-3 leading-relaxed max-h-[55vh] overflow-y-auto pr-1">
              {legalPolicySection === 'terms' && (
                <>
                  <p>
                    <strong>1. Platform Mission & Scope:</strong> SankalpSetu is an All-India universal aid, medical relief, and zero-interest community lending platform administered by Chief Verifier Danish Khan (khandanish0503@gmail.com).
                  </p>
                  <p>
                    <strong>2. Mandatory Government Identity Verification:</strong> Every fundraiser or aid applicant must upload and verify a genuine Indian Government Identity document (Aadhaar Card, PAN Card, Ration Card, or Driving Licence) before funds are disbursed.
                  </p>
                  <p>
                    <strong>3. Account Roles:</strong> Users may participate as a Donator, Fundraiser, or User/Applicant. Administrator privileges are strictly restricted to the platform owner.
                  </p>
                </>
              )}
              {legalPolicySection === 'privacy' && (
                <>
                  <p>
                    <strong>1. Government ID Masking & Encryption:</strong> Uploaded Aadhaar numbers are automatically masked to <code>XXXX-XXXX-1234</code> in accordance with UIDAI privacy regulations.
                  </p>
                  <p>
                    <strong>2. No Unauthorized Data Sharing:</strong> Donor and applicant contact details are used solely for issuing official contribution receipts, hospital tokens, and 3-way Gmail verification summaries.
                  </p>
                </>
              )}
              {legalPolicySection === 'cookies' && (
                <>
                  <p>
                    <strong>1. Session & JWT Security Cookies:</strong> SankalpSetu uses HTTP-only signed JWT session tokens and Cloudflare Turnstile verification to protect accounts against automated abuse and cross-site attacks.
                  </p>
                  <p>
                    <strong>2. Essential Preferences:</strong> Local storage is used only to remember your active authentication session and Day/Night theme preference.
                  </p>
                </>
              )}
              {legalPolicySection === '80g' && (
                <>
                  <p>
                    <strong>1. Pure Donator (0% • No Tax):</strong> Contributions made under the Pure Donator plan have 0% return and no tax complexity—100% of the contribution supports the verified applicant.
                  </p>
                  <p>
                    <strong>2. Instant Receipt Generation:</strong> Every settled contribution generates a downloadable, printable receipt with a unique verification number.
                  </p>
                </>
              )}
              {legalPolicySection === 'refund' && (
                <>
                  <p>
                    <strong>1. Escrow Protection & Refunds:</strong> All contributions are held in audited escrow until identity and utilization milestones are verified. Unutilized or disputed contributions can be refunded directly to the original payment source.
                  </p>
                  <p>
                    <strong>2. 0% Interest Lender Repayments:</strong> Campaigns created under the Lender Return plan divide principal repayments across Monthly, Yearly, or One-Time Direct schedules with 0% interest.
                  </p>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-stone-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] font-mono text-stone-500">
                Admin Contact: khandanish0503@gmail.com
              </span>
              <button
                type="button"
                onClick={() => setLegalPolicySection(null)}
                className="px-5 py-2 rounded-full bg-stone-900 dark:bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <DonationFlowModal
        campaign={donationModalCampaign}
        currentUser={currentUser}
        onClose={() => setDonationModalCampaign(null)}
        onSuccess={() => {
          fetchAllData();
        }}
      />

      <CampaignDetailModal
        campaign={detailModalCampaign}
        onClose={() => setDetailModalCampaign(null)}
        onDonateClick={(camp) => {
          setDetailModalCampaign(null);
          setDonationModalCampaign(camp);
        }}
      />

      <AuthPortalModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentSession={authSession}
        onOpenLegalPolicy={(sec) => setLegalPolicySection(sec)}
        onAuthSuccess={(session) => {
          setAuthSession(session);
          setActiveRole(session.user.role);
          if (
            session.user.category &&
            session.user.category !== 'All Categories'
          ) {
            const matchedCat = UNIVERSAL_CATEGORIES.find((c) =>
              c
                .toLowerCase()
                .includes(session.user.category.split(' ')[0].toLowerCase())
            );
            if (matchedCat) setActiveCategory(matchedCat);
          }
          fetchAllData();
        }}
        onLogout={() => {
          localStorage.removeItem('sankalpsetu_jwt');
          localStorage.removeItem('sankalpsetu_session');
          setAuthSession(null);
          setActiveRole('donor');
          fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
        }}
      />

      <ConfirmActionModal
        confirmState={appConfirmState}
        onClose={() => setAppConfirmState(null)}
      />

      <SubmissionSuccessModal
        submission={appSubmissionSuccess}
        onClose={() => setAppSubmissionSuccess(null)}
      />
    </div>
  );
}
