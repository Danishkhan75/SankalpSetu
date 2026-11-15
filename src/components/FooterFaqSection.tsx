import React, { useState } from 'react';
import { ChevronDown, HelpCircle, Lock, Receipt, ShieldCheck } from 'lucide-react';

interface FaqItem {
  id: string;
  category: 'Return & Support Categories' | 'Payment Verification' | 'Identity & Vetting';
  question: string;
  answer: string;
  referenceNote: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-pure-donator',
    category: 'Return & Support Categories',
    question: 'How do the 3 Support & Return Categories work (Pure Donator vs Yearly/Monthly vs 50% Return)?',
    answer:
      'SankalpSetu offers three clear support models: (1) Pure Donator (0% • No Tax • Nothing Returned) where 100% of the contribution is a direct grant with zero repayment required; (2) Lender — Yearly or Monthly Divided Return where the applicant enters how many years or months they need and the amount divides evenly (for example, ₹10,000 over 2 years = ₹5,000 per year, or ₹10,000 over 5 months = ₹2,000 per month); and (3) Lender — 50% Return Money where the applicant returns 50% of the principal (e.g., ₹5,000 on ₹10,000) and the remaining 50% is waived.',
    referenceNote: '1. Pure Donator (0% No Tax) · 2. Yearly / Monthly Divide · 3. 50% Return Money',
  },
  {
    id: 'faq-yearly-monthly-math',
    category: 'Return & Support Categories',
    question: 'How is the Yearly or Monthly repayment amount calculated when I enter the number of years or months?',
    answer:
      'There is 0% interest charged on any lender schedule. If an applicant requests ₹10,000 under Yearly Return and enters 2 years, the platform automatically divides ₹10,000 ÷ 2 = ₹5,000 per year. If they choose Monthly Return and enter 5 months, it divides ₹10,000 ÷ 5 = ₹2,000 per month. Under the 50% Return option, exactly half of the principal is returned and half is waived.',
    referenceNote: 'Zero-Interest Principal Division · Transparent Installment Calculator',
  },
  {
    id: 'faq-payment-webhook',
    category: 'Payment Verification',
    question: 'How does SankalpSetu verify payments without storing my card or UPI credentials?',
    answer:
      'We never touch or store raw card numbers, CVVs, or UPI PINs. When you initiate a contribution, our backend computes the exact rupee amount on the server and generates a unique order ID. Your payment is processed through PCI-DSS Level 1 checkout, and a contribution is marked PAID—and added to the campaign goal bar inside a PostgreSQL transaction—only after our server validates the cryptographic HMAC-SHA256 webhook signature.',
    referenceNote: 'HMAC-SHA256 Server Verification · Zero Raw Card Storage',
  },
  {
    id: 'faq-idempotency-refunds',
    category: 'Payment Verification',
    question: 'What prevents duplicate charges if my internet drops or I click Pay twice?',
    answer:
      'Every checkout session is assigned a unique cryptographic idempotency key before the order is sent to the server. If you double-click the button or refresh during a slow mobile connection, our PostgreSQL database recognizes the existing idempotency key and returns the same pending order instead of creating a duplicate charge.',
    referenceNote: 'Database Idempotency Key Constraint · Transactional Refund Support',
  },
  {
    id: 'faq-govt-id-vetting',
    category: 'Identity & Vetting',
    question: 'How does the Official Government Identity verification work for Aadhaar, PAN, Ration Card, and Driving Licence?',
    answer:
      'Every applicant uploads their Official Government Identity document (Aadhaar Card, PAN Card, Ration Card, or Driving Licence), which is inspected via OCR to verify the cardholder name and mask the Aadhaar number (XXXX-XXXX-1234) for privacy before funds are disbursed.',
    referenceNote: 'Official Government Identity OCR · UIDAI Privacy Masking',
  },
  {
    id: 'faq-field-utilization',
    category: 'Identity & Vetting',
    question: 'How do I know my contribution reached the freelancer, family, patient, or village described?',
    answer:
      '100% of your contribution is tracked in the live PostgreSQL ledger and verified by Platform Administrator Danish Khan (khandanish0503@gmail.com). Every campaign displays its verified Government Identity badge, beneficiary location, and real-time disbursement progress.',
    referenceNote: '100% Direct Escrow Tracking · Admin Audit Log Transparency',
  },
];

const CATEGORIES = ['All Topics', 'Return & Support Categories', 'Payment Verification', 'Identity & Vetting'] as const;

export const FooterFaqSection: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<(typeof CATEGORIES)[number]>('All Topics');
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    'faq-pure-donator': true,
    'faq-yearly-monthly-math': true,
    'faq-payment-webhook': false,
  });

  const filteredFaqs = FAQ_ITEMS.filter(
    (item) => selectedCategory === 'All Topics' || item.category === selectedCategory
  );

  const allFilteredOpen =
    filteredFaqs.length > 0 && filteredFaqs.every((item) => Boolean(openIds[item.id]));

  const toggleItem = (id: string) => {
    setOpenIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleToggleAll = () => {
    const nextState = !allFilteredOpen;
    const updated: Record<string, boolean> = { ...openIds };
    for (const item of filteredFaqs) {
      updated[item.id] = nextState;
    }
    setOpenIds(updated);
  };

  return (
    <div
      className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10 space-y-8"
      aria-labelledby="footer-faq-heading"
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-semibold tracking-wide uppercase text-[#FFC107] flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4" aria-hidden="true" />
            <span>Support Categories, Return Division & Security FAQ</span>
          </p>
          <h2
            id="footer-faq-heading"
            className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
          >
            Frequently Asked Questions on Pure Donator (0%), Yearly/Monthly Return & 50% Return
          </h2>
          <p className="text-sm sm:text-base text-stone-300 leading-relaxed">
            Clear answers on how Pure Donator (0% • No Tax), Yearly & Monthly divided lender repayments, and 50% return plans work.
          </p>
        </div>

        {/* Interactive Topic Filter & Expand/Collapse All */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-black/25 border border-white/15"
            role="group"
            aria-label="Filter FAQ topics"
          >
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 focus-visible:ring-4 focus-visible:ring-amber-400 ${
                  selectedCategory === category
                    ? 'bg-[#FFC107] text-[#1F2631]'
                    : 'text-stone-200 hover:bg-white/10'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleToggleAll}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 focus-visible:ring-4 focus-visible:ring-amber-400"
          >
            {allFilteredOpen ? 'Collapse All Answers' : 'Expand All Answers'}
          </button>
        </div>
      </div>

      {/* FAQ Accordion List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredFaqs.map((item) => {
          const isOpen = Boolean(openIds[item.id]);
          const CategoryIcon =
            item.category === 'Return & Support Categories'
              ? Receipt
              : item.category === 'Payment Verification'
                ? Lock
                : ShieldCheck;

          return (
            <div
              key={item.id}
              className="rounded-2xl bg-[#2B1E15] border border-white/15 overflow-hidden transition-colors hover:border-white/25 h-fit"
            >
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`${item.id}-panel`}
                  onClick={() => toggleItem(item.id)}
                  className="w-full text-left p-5 sm:p-6 flex items-start justify-between gap-4 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
                >
                  <div className="space-y-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FFC107]">
                      <CategoryIcon className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{item.category}</span>
                    </span>
                    <p className="text-base sm:text-lg font-bold text-white leading-snug">
                      {item.question}
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-[#FFC107] shrink-0 mt-1 transition-transform duration-150 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
              </h3>

              {isOpen && (
                <div
                  id={`${item.id}-panel`}
                  role="region"
                  className="px-5 sm:px-6 pb-6 pt-1 border-t border-white/10 space-y-3 text-stone-200"
                >
                  <p className="text-sm sm:text-base leading-relaxed text-stone-200">
                    {item.answer}
                  </p>
                  <p className="text-xs font-mono text-amber-300/90 pt-1">
                    Verification Standard: {item.referenceNote}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
