import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  FileCheck2,
  IndianRupee,
  RefreshCw,
  Sparkles,
  CalendarClock,
  Phone,
  Mail,
  User,
} from 'lucide-react';
import { CampaignItem, UserProfile } from '../types';
import {
  formatINR,
  calculateRepaymentSchedule,
  validateDonationForm,
} from '../utils/donationLogic';
import { ExportFormatButtons } from './ExportFormatButtons';

interface DonationFlowModalProps {
  campaign: CampaignItem | null;
  currentUser: UserProfile | null;
  onClose: () => void;
  onSuccess: () => void;
}

const SUGGESTED_AMOUNTS = [550, 1500, 3200, 7500, 15000];

export const DonationFlowModal: React.FC<DonationFlowModalProps> = ({
  campaign,
  currentUser,
  onClose,
  onSuccess,
}) => {
  const [amountInput, setAmountInput] = useState<string>('1500');
  const [donorName, setDonorName] = useState<string>(currentUser?.name || '');
  const [donorEmail, setDonorEmail] = useState<string>(currentUser?.email || '');
  const [donorPhone, setDonorPhone] = useState<string>('+91 9811223344');
  const [panNumber, setPanNumber] = useState<string>('ABCDE1234F');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [returnOption, setReturnOption] = useState<
    'no_return' | 'monthly' | 'yearly' | 'directly'
  >(campaign?.returnOption || 'no_return');
  const [returnDurationMonths, setReturnDurationMonths] = useState<number>(
    campaign?.returnDurationMonths || 12
  );
  const [step, setStep] = useState<'form' | 'gateway' | 'receipt'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<{
    donationId: string;
    gatewayOrderId: string;
    amount: number;
    receiptNumber?: string;
    gatewayPaymentId?: string;
  } | null>(null);

  useEffect(() => {
    if (currentUser?.name && !donorName) setDonorName(currentUser.name);
    if (currentUser?.email && !donorEmail) setDonorEmail(currentUser.email);
  }, [currentUser, donorName, donorEmail]);

  const liveValidation = useMemo(
    () =>
      validateDonationForm({
        amount: amountInput,
        donorName,
        donorEmail,
        donorPhone,
        panNumber,
      }),
    [amountInput, donorName, donorEmail, donorPhone, panNumber]
  );

  if (!campaign) return null;

  const numericAmount = Number(amountInput) || 0;
  const repaymentPlan = calculateRepaymentSchedule(
    numericAmount > 0 ? numericAmount : 1000,
    returnOption,
    returnDurationMonths
  );

  const handleInitiateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!liveValidation.isValid) {
      const firstError =
        liveValidation.errors.amount ||
        liveValidation.errors.donorName ||
        liveValidation.errors.donorEmail ||
        liveValidation.errors.donorPhone ||
        liveValidation.errors.panNumber ||
        'Please fix the highlighted fields before continuing.';
      setError(firstError);
      return;
    }

    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentUser) {
        headers['x-demo-role'] = currentUser.role;
      }

      const res = await fetch('/api/donations/create-order', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          campaignId: campaign.id,
          amount: Math.round(numericAmount),
          donorName: donorName.trim(),
          donorEmail: donorEmail.trim(),
          donorPhone: donorPhone.trim(),
          panNumber: panNumber.trim().toUpperCase() || undefined,
          paymentMethod,
          returnOption,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not initialize payment order');
      }

      setOrderDetails({
        donationId: data.donation.id,
        gatewayOrderId: data.gatewayOrder.gatewayOrderId,
        amount: data.donation.amount,
      });
      setStep('gateway');
    } catch (err: any) {
      setError(err.message || 'Network error while creating order');
    } finally {
      setLoading(false);
    }
  };

  const handleSettleWebhook = async (outcome: 'paid' | 'failed') => {
    if (!orderDetails) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/payments/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayOrderId: orderDetails.gatewayOrderId,
          gatewayPaymentId: `pay_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          signature: 'verified_hmac_sha256_signature',
          status: outcome,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Payment settlement failed');
      }

      if (outcome === 'failed') {
        setError('Transaction declined. No funds were deducted. You can retry settlement.');
        setStep('form');
        return;
      }

      setOrderDetails((prev) =>
        prev
          ? {
              ...prev,
              receiptNumber: data.receiptNumber,
              gatewayPaymentId: data.donation.gatewayPaymentId,
            }
          : null
      );
      setStep('receipt');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to verify payment webhook');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-md p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="donation-modal-title"
    >
      <div className="relative w-full max-w-xl rounded-2xl liquid-glass liquid-sheen bg-[#FAF7F2]/95 dark:bg-slate-900/95 border border-stone-300 dark:border-slate-700 shadow-2xl overflow-hidden my-8">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-900 text-stone-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[11px] uppercase tracking-widest text-emerald-300 block">
                Verified Contribution & Lender Escrow Checkout
              </span>
              <h3
                id="donation-modal-title"
                className="font-serif text-lg font-semibold text-white truncate"
              >
                {campaign.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-Time Form Validation Status Bar */}
        <div className="px-6 py-2.5 bg-emerald-950 text-emerald-100 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-emerald-800">
          <span className="flex items-center gap-1.5 font-medium">
            <FileCheck2 className="w-4 h-4 text-emerald-400 shrink-0" />
            Verified ID: <strong>{campaign.documentType || 'Official Government Identity'}</strong>
          </span>
          {liveValidation.isValid ? (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-emerald-800/90 px-2.5 py-0.5 rounded text-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              All Fields Validated
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-amber-900/90 px-2.5 py-0.5 rounded text-amber-200">
              <AlertCircle className="w-3.5 h-3.5 text-amber-300" />
              Complete Required Fields
            </span>
          )}
        </div>

        <div className="p-6 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs sm:text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleInitiateOrder} className="space-y-5" noValidate>
              {/* 1. Positive Donation Amount Input with Real-Time Validation */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-slate-200">
                    Contribution Amount (INR) <span className="text-red-600">*</span>
                  </label>
                  {liveValidation.validFields.amount ? (
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Valid Positive Amount
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Minimum ₹50 required
                    </span>
                  )}
                </div>

                <div className="relative mb-2">
                  <IndianRupee className="w-5 h-5 text-stone-600 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="50"
                    max="10000000"
                    step="1"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    aria-invalid={Boolean(liveValidation.errors.amount)}
                    className={`w-full pl-11 pr-24 py-3 rounded-xl border-2 bg-white dark:bg-slate-900 font-mono text-xl font-bold text-stone-900 dark:text-white focus:outline-none transition-colors ${
                      liveValidation.errors.amount
                        ? 'border-red-500 focus:border-red-600 bg-red-50/30 dark:bg-red-950/20'
                        : 'border-emerald-600/70 focus:border-[#1F6F5B]'
                    }`}
                    placeholder="Enter positive amount (e.g. 10000)"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-stone-500 dark:text-slate-400">
                    INR (₹)
                  </span>
                </div>

                {liveValidation.errors.amount && (
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-2 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{liveValidation.errors.amount}</span>
                  </p>
                )}

                {/* Quick Select Preset Amounts */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-stone-500 dark:text-slate-400 mr-1">
                    Quick select:
                  </span>
                  {SUGGESTED_AMOUNTS.map((preset) => {
                    const active = numericAmount === preset;
                    return (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setAmountInput(String(preset))}
                        className={`liquid-btn px-2.5 py-1 rounded-lg font-mono text-xs font-semibold border transition-all cursor-pointer ${
                          active
                            ? 'bg-[#C1553B] text-white border-[#C1553B]'
                            : 'bg-white dark:bg-slate-800 text-stone-700 dark:text-slate-200 border-stone-300 dark:border-slate-700 hover:border-stone-400'
                        }`}
                      >
                        ₹{preset.toLocaleString('en-IN')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Support & Return Category (3 Types: Pure Donator 0% No Tax, Yearly/Monthly Lender, or 50% Return) */}
              <div className="p-4 rounded-xl bg-stone-100/90 dark:bg-slate-800/80 border border-stone-200 dark:border-slate-700 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-slate-200 flex items-center gap-1.5">
                    <CalendarClock className="w-4 h-4 text-[#C1553B]" />
                    Support & Return Category (3 Types)
                  </label>
                  <span className="text-[11px] font-mono text-stone-600 dark:text-slate-300">
                    {returnOption === 'no_return'
                      ? '1. Pure Donator (0% • No Tax)'
                      : returnOption === 'directly'
                        ? '3. Lender (50% Return Money)'
                        : '2. Lender (Yearly / Monthly Divide)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReturnOption('no_return');
                      setReturnDurationMonths(0);
                    }}
                    className={`liquid-btn p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      returnOption === 'no_return'
                        ? 'bg-[#1F6F5B] text-white border-[#1F6F5B] shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-stone-800 dark:text-slate-200 border-stone-300 dark:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase tracking-wide">
                      1. Pure Donator
                    </div>
                    <div
                      className={`text-[11px] mt-0.5 ${
                        returnOption === 'no_return'
                          ? 'text-emerald-100'
                          : 'text-stone-500 dark:text-slate-400'
                      }`}
                    >
                      0% • No Tax • Nothing Returned
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
                    className={`liquid-btn p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      returnOption === 'yearly' || returnOption === 'monthly'
                        ? 'bg-stone-900 dark:bg-amber-600 text-white border-stone-900 dark:border-amber-500 shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-stone-800 dark:text-slate-200 border-stone-300 dark:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase tracking-wide">
                      2. Yearly / Monthly
                    </div>
                    <div
                      className={`text-[11px] mt-0.5 ${
                        returnOption === 'yearly' || returnOption === 'monthly'
                          ? 'text-stone-200'
                          : 'text-stone-500 dark:text-slate-400'
                      }`}
                    >
                      Divide by Years or Months
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReturnOption('directly');
                      setReturnDurationMonths(1);
                    }}
                    className={`liquid-btn p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      returnOption === 'directly'
                        ? 'bg-[#C1553B] text-white border-[#C1553B] shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-stone-800 dark:text-slate-200 border-stone-300 dark:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase tracking-wide">
                      3. 50% Return
                    </div>
                    <div
                      className={`text-[11px] mt-0.5 ${
                        returnOption === 'directly'
                          ? 'text-amber-100'
                          : 'text-stone-500 dark:text-slate-400'
                      }`}
                    >
                      Return 50% • 50% Waived
                    </div>
                  </button>
                </div>

                {(returnOption === 'yearly' || returnOption === 'monthly') && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 items-end">
                    <button
                      type="button"
                      onClick={() => {
                        setReturnOption('yearly');
                        setReturnDurationMonths(2);
                      }}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                        returnOption === 'yearly'
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-200 border-stone-300 dark:border-slate-700'
                      }`}
                    >
                      Yearly Return
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReturnOption('monthly');
                        setReturnDurationMonths(5);
                      }}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                        returnOption === 'monthly'
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-200 border-stone-300 dark:border-slate-700'
                      }`}
                    >
                      Monthly Return
                    </button>
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-stone-600 dark:text-slate-300 mb-1">
                        {returnOption === 'yearly'
                          ? 'How Many Years?'
                          : 'How Many Months?'}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={returnOption === 'yearly' ? 20 : 120}
                        value={returnDurationMonths}
                        onChange={(e) =>
                          setReturnDurationMonths(
                            Math.max(1, Number(e.target.value) || 1)
                          )
                        }
                        className="w-full py-1.5 px-2.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs font-bold text-stone-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200/80 dark:border-slate-700 text-xs text-stone-700 dark:text-slate-300">
                  <span>Selected Plan:</span>
                  <span className="font-mono font-semibold text-emerald-900 dark:text-emerald-300">
                    {repaymentPlan.summaryText}
                  </span>
                </div>
              </div>

              {/* 3. Donor Full Name & Email with Real-Time Validation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-slate-300">
                      Full Name <span className="text-red-600">*</span>
                    </label>
                    {liveValidation.validFields.donorName ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    )}
                  </div>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      aria-invalid={Boolean(liveValidation.errors.donorName)}
                      className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-stone-900 dark:text-white text-sm focus:outline-none transition-colors ${
                        liveValidation.errors.donorName
                          ? 'border-red-500 bg-red-50/30 dark:bg-red-950/20'
                          : 'border-emerald-600/70 focus:border-[#1F6F5B]'
                      }`}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  {liveValidation.errors.donorName && (
                    <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 font-medium">
                      {liveValidation.errors.donorName}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-slate-300">
                      Email Address <span className="text-red-600">*</span>
                    </label>
                    {liveValidation.validFields.donorEmail ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    )}
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={donorEmail}
                      onChange={(e) => setDonorEmail(e.target.value)}
                      aria-invalid={Boolean(liveValidation.errors.donorEmail)}
                      className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-stone-900 dark:text-white text-sm focus:outline-none transition-colors ${
                        liveValidation.errors.donorEmail
                          ? 'border-red-500 bg-red-50/30 dark:bg-red-950/20'
                          : 'border-emerald-600/70 focus:border-[#1F6F5B]'
                      }`}
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                  {liveValidation.errors.donorEmail && (
                    <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 font-medium">
                      {liveValidation.errors.donorEmail}
                    </p>
                  )}
                </div>
              </div>

              {/* 4. Mobile Phone, PAN Number & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-slate-300">
                      Mobile Number
                    </label>
                    {liveValidation.errors.donorPhone ? (
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                  </div>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={donorPhone}
                      onChange={(e) => setDonorPhone(e.target.value)}
                      className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-stone-900 dark:text-white text-sm focus:outline-none ${
                        liveValidation.errors.donorPhone
                          ? 'border-red-500 bg-red-50/30'
                          : 'border-stone-300 dark:border-slate-700 focus:border-[#1F6F5B]'
                      }`}
                      placeholder="+91 9811223344"
                    />
                  </div>
                  {liveValidation.errors.donorPhone && (
                    <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 font-medium">
                      {liveValidation.errors.donorPhone}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-slate-300">
                      PAN / Identity Reference (Optional)
                    </label>
                    {liveValidation.errors.panNumber ? (
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={10}
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-900 font-mono text-stone-900 dark:text-white text-sm uppercase focus:outline-none ${
                      liveValidation.errors.panNumber
                        ? 'border-red-500 bg-red-50/30'
                        : 'border-stone-300 dark:border-slate-700 focus:border-[#1F6F5B]'
                    }`}
                    placeholder="ABCDE1234F"
                  />
                  {liveValidation.errors.panNumber && (
                    <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 font-medium">
                      {liveValidation.errors.panNumber}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-slate-300 mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['upi', 'card', 'netbanking'] as const).map((method) => (
                    <button
                      type="button"
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`liquid-btn py-2.5 px-2 rounded-xl text-xs font-semibold uppercase border transition-all cursor-pointer ${
                        paymentMethod === method
                          ? 'bg-stone-900 dark:bg-emerald-600 text-white border-stone-900 dark:border-emerald-500'
                          : 'bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-300 border-stone-300 dark:border-slate-700 hover:bg-stone-100'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !liveValidation.isValid}
                className="liquid-btn w-full py-3.5 px-6 rounded-xl bg-[#C1553B] hover:bg-[#A9442C] text-white font-semibold text-sm sm:text-base shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Creating Escrow Order...</span>
                  </>
                ) : (
                  <>
                    <span>
                      Proceed with {formatINR(numericAmount > 0 ? numericAmount : 0)}
                    </span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'gateway' && orderDetails && (
            <div className="space-y-6">
              <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-700 pb-3">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-stone-500 dark:text-slate-400 block">
                      Escrow Order ID
                    </span>
                    <span className="font-mono text-sm font-semibold text-stone-900 dark:text-white">
                      {orderDetails.gatewayOrderId}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs uppercase tracking-wider text-stone-500 dark:text-slate-400 block">
                      Amount
                    </span>
                    <span className="font-mono text-xl font-bold text-[#1F6F5B] dark:text-emerald-400">
                      {formatINR(orderDetails.amount)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-stone-600 dark:text-slate-300 pt-1">
                  <div>
                    <span className="text-stone-400 block">Organization:</span>
                    <strong className="text-stone-800 dark:text-white">
                      {campaign.organizationName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-stone-400 block">Support Plan:</span>
                    <strong className="text-stone-800 dark:text-white uppercase">
                      {returnOption === 'no_return'
                        ? 'Pure Donator (0% • No Tax)'
                        : returnOption === 'directly'
                          ? '50% Return Money'
                          : `${returnOption} (${returnDurationMonths})`}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSettleWebhook('paid')}
                  className="liquid-btn py-3.5 px-4 rounded-xl bg-[#1F6F5B] hover:bg-[#165344] text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Authorize & Complete Payment</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSettleWebhook('failed')}
                  className="py-3.5 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-red-50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 font-semibold text-sm transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {step === 'receipt' && orderDetails && (
            <div className="space-y-5 text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-[#1F6F5B] flex items-center justify-center mx-auto">
                <FileCheck2 className="w-8 h-8" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#1F6F5B] bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
                  <Sparkles className="w-3.5 h-3.5" /> Form Submitted Successfully! • Official Receipt Issued
                </span>
                <h4 className="font-serif text-2xl font-bold text-stone-900 dark:text-white mt-2">
                  Thank You, {donorName}!
                </h4>
                <p className="text-sm text-stone-600 dark:text-slate-300 mt-1">
                  Your contribution of{' '}
                  <strong className="font-mono">{formatINR(orderDetails.amount)}</strong> is confirmed and a summary has been dispatched to{' '}
                  <strong className="font-mono text-emerald-800 dark:text-emerald-400">
                    khandanish0503@gmail.com
                  </strong>
                  .
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-left font-mono text-xs space-y-2 text-stone-700 dark:text-slate-200">
                <div className="flex justify-between">
                  <span className="text-stone-400">RECEIPT NO:</span>
                  <span className="font-bold text-stone-900 dark:text-white">
                    {orderDetails.receiptNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">ORDER ID:</span>
                  <span>{orderDetails.gatewayOrderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">RETURN PLAN:</span>
                  <span className="uppercase font-bold text-emerald-800 dark:text-emerald-400">
                    {repaymentPlan.summaryText}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-100/90 dark:bg-slate-800/80 border border-stone-200 dark:border-slate-700 text-left space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-slate-300">
                  Download Official Receipt (PDF / Excel / HTML):
                </div>
                <ExportFormatButtons
                  payload={{
                    title: 'SankalpSetu Official Contribution & Escrow Receipt',
                    subtitle: `Campaign: ${campaign.title} (${campaign.organizationName})`,
                    referenceId:
                      orderDetails.receiptNumber || orderDetails.gatewayOrderId,
                    badgeText:
                      returnOption === 'no_return'
                        ? 'Pure Donator (0% • No Tax)'
                        : returnOption === 'directly'
                          ? 'Lender (50% Return Money)'
                          : `Lender (${returnOption.toUpperCase()})`,
                    fileNamePrefix: 'SankalpSetu-Donation-Receipt',
                    fields: [
                      {
                        label: 'Receipt Number',
                        value:
                          orderDetails.receiptNumber ||
                          orderDetails.gatewayOrderId,
                      },
                      {
                        label: 'Escrow Order ID',
                        value: orderDetails.gatewayOrderId,
                      },
                      { label: 'Donor / Lender Name', value: donorName },
                      { label: 'Donor Email', value: donorEmail },
                      { label: 'Donor Phone', value: donorPhone },
                      { label: 'Campaign Title', value: campaign.title },
                      {
                        label: 'Organization',
                        value: campaign.organizationName,
                      },
                      {
                        label: 'Contribution Amount',
                        value: formatINR(orderDetails.amount),
                      },
                      {
                        label: 'Support & Return Plan',
                        value: repaymentPlan.summaryText,
                      },
                      {
                        label: 'Payment Method',
                        value: paymentMethod.toUpperCase(),
                      },
                    ],
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <a
                  href={`https://mail.google.com/mail/?view=cm&fs=1&to=khandanish0503@gmail.com&su=${encodeURIComponent(
                    `[SankalpSetu Donation Summary] ${orderDetails.receiptNumber} — ${donorName}`
                  )}&body=${encodeURIComponent(
                    `Form Submitted Successfully!\nDonor: ${donorName} (${donorEmail})\nCampaign: ${campaign.title}\nAmount: ${formatINR(
                      orderDetails.amount
                    )}\nReceipt: ${orderDetails.receiptNumber}\nOrder ID: ${orderDetails.gatewayOrderId}\nReturn Plan: ${repaymentPlan.summaryText}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="liquid-btn py-3 px-4 rounded-xl bg-[#1F6F5B] hover:bg-[#165344] text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  Open Summary in Gmail
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="liquid-btn py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
