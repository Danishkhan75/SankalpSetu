import React from 'react';
import { CheckCircle2, Database, Lock, Server, ShieldCheck } from 'lucide-react';

export const ProjectBlueprintView: React.FC = () => {
  return (
    <section
      className="max-w-7xl mx-auto px-6 py-10 space-y-10"
      aria-labelledby="blueprint-heading"
    >
      <div className="border-b border-stone-200 pb-6">
        <p className="text-sm font-medium text-[#6B7280]">
          University Full-Stack Project Documentation · PERN / PostgreSQL Relational Architecture
        </p>
        <h1
          id="blueprint-heading"
          className="text-3xl font-extrabold tracking-tight text-[#1F2631] mt-1"
        >
          System Architecture, Security Decisions & Open Questions Resolution
        </h1>
      </div>

      {/* Resolution of Open Questions from Section 17 */}
      <div className="rounded-2xl bg-white border border-stone-200 p-6 sm:p-8 space-y-6">
        <h2 className="text-xl font-bold text-[#1F2631]">
          01. Resolution of Section 17 Open Questions (For Supervisor Report)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl bg-[#FAF7F2] border border-stone-200 p-5 space-y-2">
            <h3 className="text-base font-bold text-[#1F2631]">
              1. Project Structure (Unified Full-Stack vs Split Repos)
            </h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              Implemented as a unified full-stack TypeScript codebase combining a React 19 + Tailwind CSS frontend with REST API handlers (`/api/campaigns`, `/api/donations`, `/api/payments/webhook`, `/api/admin/*`) sharing a single source of truth for Zod validation schemas (`src/utils/donationLogic.ts`).
            </p>
          </div>

          <div className="rounded-xl bg-[#FAF7F2] border border-stone-200 p-5 space-y-2">
            <h3 className="text-base font-bold text-[#1F2631]">
              2. Relational PostgreSQL vs MongoDB (PERN Justification)
            </h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              Backed by a live Google Cloud SQL PostgreSQL instance with Drizzle ORM (`src/db/schema.ts`). Financial donations require ACID transactions, foreign-key integrity (`users → organizations → campaigns → donations`), and unique constraints on `gateway_order_id` and `idempotency_key`.
            </p>
          </div>

          <div className="rounded-xl bg-[#FAF7F2] border border-stone-200 p-5 space-y-2">
            <h3 className="text-base font-bold text-[#1F2631]">
              3. Swappable Payment Gateway Adapter
            </h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              Supports Razorpay Checkout (Test Mode), Stripe Elements (Test Mode), and Instant Mock behind a unified order + HMAC webhook verification state machine (`pending → paid → refunded`). Only the signed webhook updates campaign totals.
            </p>
          </div>

          <div className="rounded-xl bg-[#FAF7F2] border border-stone-200 p-5 space-y-2">
            <h3 className="text-base font-bold text-[#1F2631]">
              4. Accessible Glassmorphism & WCAG AA Contrast
            </h3>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              Glassmorphism (`bg-white/10 backdrop-blur-xl border border-white/20`) is applied strictly to the dark wood hero framing panel. Long-form text, tables, and the 3-step donation flow sit on solid `#FAF7F2` / `#FFFFFF` surfaces with 18px donation typography and 10:1 contrast on `#FFC107` primary buttons.
            </p>
          </div>
        </div>
      </div>

      {/* Relational Database Schema & Security Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl bg-white border border-stone-200 p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#1F2631] font-bold text-base">
            <Database className="w-5 h-5 text-[#8A5A36]" aria-hidden="true" />
            <h3>PostgreSQL Relational Tables</h3>
          </div>
          <ul className="space-y-2 text-sm text-[#6B7280]">
            <li>
              <strong className="text-[#1F2631] font-mono">users</strong>: id, uid (UNIQUE), name, email, role (donor | ngo_admin | admin)
            </li>
            <li>
              <strong className="text-[#1F2631] font-mono">organizations</strong>: id, name, registration_no (UNIQUE), tax_exemption_80g, verified, owner_id (FK)
            </li>
            <li>
              <strong className="text-[#1F2631] font-mono">campaigns</strong>: id, organization_id (FK), title, slug (UNIQUE), goal_amount, raised_amount, status, deadline
            </li>
            <li>
              <strong className="text-[#1F2631] font-mono">donations</strong>: id, campaign_id (FK), donor_id (FK), amount, status, gateway_order_id (UNIQUE), idempotency_key (UNIQUE)
            </li>
            <li>
              <strong className="text-[#1F2631] font-mono">campaign_updates & audit_logs</strong>: relational field dispatches and compliance audit trail
            </li>
          </ul>
        </div>

        <div className="rounded-2xl bg-white border border-stone-200 p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#1F2631] font-bold text-base">
            <Lock className="w-5 h-5 text-[#8A5A36]" aria-hidden="true" />
            <h3>Authentication & RBAC Guards</h3>
          </div>
          <ul className="space-y-2 text-sm text-[#6B7280]">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
              <span>Firebase Google OAuth (`signInWithPopup`) with server-side `firebase-admin` ID token verification.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
              <span>Role-based middleware enforcing `donor`, `ngo_admin`, and `admin` route boundaries.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
              <span>Guest checkout enabled on `POST /api/donations` so older donors never hit a login wall.</span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl bg-white border border-stone-200 p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#1F2631] font-bold text-base">
            <Server className="w-5 h-5 text-[#8A5A36]" aria-hidden="true" />
            <h3>Payment & Webhook Integrity</h3>
          </div>
          <ul className="space-y-2 text-sm text-[#6B7280]">
            <li className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
              <span>Server-computed order amounts with Zod min/max bounds (`₹100` to `₹10,00,000`).</span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
              <span>Idempotency key enforcement prevents duplicate orders on double-clicks.</span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
              <span>HMAC-SHA256 webhook verification updates `donations` and `campaigns` inside a single PostgreSQL transaction.</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};
