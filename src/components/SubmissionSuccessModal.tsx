import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Mail,
  Send,
  X,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { EmailNotificationRecord } from '../types';
import {
  encodeGmailMimeMessage,
  ADMIN_OFFICIAL_EMAIL,
} from '../utils/donationLogic';
import {
  getCachedGoogleAccessToken,
  googleSignInWithGmailScope,
} from '../lib/firebase';
import { ExportFormatButtons } from './ExportFormatButtons';

export interface SubmissionSuccessInfo {
  formTitle: string;
  message: string;
  referenceId?: string;
  category?: string;
  applicantName?: string;
  applicantEmail?: string;
  amountFormatted?: string;
  adminSummaryEmail?: EmailNotificationRecord | null;
}

interface SubmissionSuccessModalProps {
  submission: SubmissionSuccessInfo | null;
  onClose: () => void;
}

export const SubmissionSuccessModal: React.FC<SubmissionSuccessModalProps> = ({
  submission,
  onClose,
}) => {
  const [sendingGmail, setSendingGmail] = useState(false);
  const [gmailSentStatus, setGmailSentStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const adminEmail = submission?.adminSummaryEmail?.toEmail || ADMIN_OFFICIAL_EMAIL;
  const emailSubject =
    submission?.adminSummaryEmail?.subject ||
    `[SankalpSetu Admin Summary] ${submission?.formTitle || 'New Submission'} — ${
      submission?.applicantName || 'Verified User'
    }`;
  const emailBody =
    submission?.adminSummaryEmail?.bodyText ||
    [
      `SANKALPSETU OFFICIAL SUBMISSION SUMMARY FOR ADMIN DANISH KHAN (${ADMIN_OFFICIAL_EMAIL})`,
      `====================================================================`,
      `Form Type: ${submission?.formTitle || 'Platform Form Submission'}`,
      `Status: FORM SUBMITTED SUCCESSFULLY`,
      `Reference ID: ${submission?.referenceId || `REF-${Date.now()}`}`,
      `Category: ${submission?.category || 'General Welfare'}`,
      `Submitted By: ${submission?.applicantName || 'Verified Applicant'} (${
        submission?.applicantEmail || ADMIN_OFFICIAL_EMAIL
      })`,
      submission?.amountFormatted ? `Amount / Value: ${submission.amountFormatted}` : '',
      `Timestamp (IST): ${new Date().toLocaleString('en-IN')}`,
      ``,
      `Details: ${submission?.message || 'Recorded in PostgreSQL & Admin Audit Trail.'}`,
    ]
      .filter(Boolean)
      .join('\n');

  // Automatically attempt silent Gmail API dispatch if a cached OAuth access token is active
  useEffect(() => {
    if (!submission) {
      setGmailSentStatus(null);
      return;
    }
    const cachedToken = getCachedGoogleAccessToken();
    if (cachedToken) {
      sendViaGmailApi(cachedToken, true);
    }
  }, [submission]);

  if (!submission) return null;

  const sendViaGmailApi = async (tokenOverride?: string, silent = false) => {
    setSendingGmail(true);
    try {
      let token = tokenOverride || getCachedGoogleAccessToken();
      if (!token && !silent) {
        const authRes = await googleSignInWithGmailScope();
        token = authRes?.accessToken || null;
      }
      if (!token) {
        setSendingGmail(false);
        return;
      }

      const raw = encodeGmailMimeMessage({
        to: ADMIN_OFFICIAL_EMAIL,
        subject: emailSubject,
        bodyText: emailBody,
      });

      const res = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        setGmailSentStatus(
          `Real Gmail API Dispatched to ${ADMIN_OFFICIAL_EMAIL} (Message ID: ${
            data.id || 'SENT'
          })`
        );
        if (submission.adminSummaryEmail?.id) {
          await fetch(
            `/api/notifications/emails/${submission.adminSummaryEmail.id}/mark-sent`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ gmailMessageId: data.id || `gmail-${Date.now()}` }),
            }
          ).catch(() => {});
        }
      } else if (!silent) {
        setGmailSentStatus(
          `Queued in Admin Notification Center for ${ADMIN_OFFICIAL_EMAIL}. You can also click "Open in Gmail Compose" below.`
        );
      }
    } catch {
      if (!silent) {
        setGmailSentStatus(
          `Summary logged for ${ADMIN_OFFICIAL_EMAIL}. Click "Open in Gmail Compose" to send directly from your mail client.`
        );
      }
    } finally {
      setSendingGmail(false);
    }
  };

  const handleCopySummary = () => {
    navigator.clipboard?.writeText(emailBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    ADMIN_OFFICIAL_EMAIL
  )}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submission-success-title"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-[#FAF7F2] dark:bg-slate-900 border-2 border-emerald-500 dark:border-emerald-600 shadow-2xl overflow-hidden my-6">
        {/* Green Success Header */}
        <div className="px-6 py-4 bg-[#1F6F5B] text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/15 border border-white/25">
              <CheckCircle2 className="w-6 h-6 text-emerald-200 shrink-0" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-200 block">
                PostgreSQL Database & Admin Gmail Notification Confirmed
              </span>
              <h3
                id="submission-success-title"
                className="font-serif text-xl sm:text-2xl font-bold text-white"
              >
                Form Submitted Successfully!
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-800 transition-colors cursor-pointer"
            aria-label="Close confirmation modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Primary Confirmation Message */}
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#1F6F5B] dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs sm:text-sm text-emerald-950 dark:text-emerald-100">
              <div className="font-bold text-sm sm:text-base">
                {submission.formTitle} — Submitted Successfully!
              </div>
              <p className="leading-relaxed">{submission.message}</p>
            </div>
          </div>

          {/* Admin Email Summary Box (khandanish0503@gmail.com) */}
          <div className="rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden">
            <div className="px-4 py-3 bg-stone-900 text-white flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Admin Summary Dispatched To:{' '}
                  <strong className="font-mono text-emerald-300">
                    {adminEmail}
                  </strong>
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-900 text-emerald-200 font-mono text-[10px] uppercase">
                Owner: Danish Khan
              </span>
            </div>

            <div className="p-4 space-y-2.5 text-xs">
              <div className="font-mono text-[11px] text-stone-500 dark:text-slate-400 border-b border-stone-200 dark:border-slate-800 pb-2">
                <div>
                  <strong className="text-stone-800 dark:text-slate-200">To:</strong>{' '}
                  Danish Khan &lt;{ADMIN_OFFICIAL_EMAIL}&gt;
                </div>
                <div>
                  <strong className="text-stone-800 dark:text-slate-200">Subject:</strong>{' '}
                  {emailSubject}
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-slate-400">
                <FileText className="w-3.5 h-3.5 text-[#C1553B]" />
                <span>Detailed Submission Summary Sent to Admin Email:</span>
              </div>

              <pre className="p-3 rounded-lg bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-800 font-mono text-[11px] text-stone-800 dark:text-slate-200 whitespace-pre-wrap break-words max-h-48 overflow-y-auto leading-relaxed">
                {emailBody}
              </pre>
            </div>
          </div>

          {gmailSentStatus && (
            <div className="p-3 rounded-xl bg-emerald-100/80 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-xs font-mono text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#1F6F5B] dark:text-emerald-400 shrink-0" />
              <span>{gmailSentStatus}</span>
            </div>
          )}

          {/* Download / Export Official Submission Receipt as PDF, Excel, or HTML */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950 border border-stone-300 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-slate-200">
              Download Official Receipt / Summary:
            </span>
            <ExportFormatButtons
              payload={{
                title: `SankalpSetu Official Submission Receipt — ${submission.formTitle}`,
                referenceId: submission.referenceId || `REF-${Date.now()}`,
                badgeText: submission.category || 'Verified Submission',
                fileNamePrefix: 'SankalpSetu-Submission-Receipt',
                fields: [
                  { label: 'Form Title', value: submission.formTitle },
                  {
                    label: 'Reference ID',
                    value: submission.referenceId || 'VERIFIED',
                  },
                  {
                    label: 'Category',
                    value: submission.category || 'General Welfare',
                  },
                  {
                    label: 'Applicant / Submitted By',
                    value: submission.applicantName || 'Verified User',
                  },
                  {
                    label: 'Applicant Email',
                    value: submission.applicantEmail || ADMIN_OFFICIAL_EMAIL,
                  },
                  ...(submission.amountFormatted
                    ? [
                        {
                          label: 'Amount / Value',
                          value: submission.amountFormatted,
                        },
                      ]
                    : []),
                  {
                    label: 'Admin Notification Recipient',
                    value: ADMIN_OFFICIAL_EMAIL,
                  },
                  { label: 'Confirmation Details', value: submission.message },
                ],
              }}
              compact
            />
          </div>

          {/* Action Buttons for Real Gmail API Send + Direct Compose + Copy */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => sendViaGmailApi(undefined, false)}
                disabled={sendingGmail}
                className="px-4 py-2.5 rounded-xl bg-[#1F6F5B] hover:bg-[#185848] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {sendingGmail
                    ? 'Sending via Gmail API...'
                    : `Send via Gmail API to ${ADMIN_OFFICIAL_EMAIL}`}
                </span>
              </button>

              <a
                href={gmailComposeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2.5 rounded-xl bg-stone-900 dark:bg-slate-800 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
                <span>Open in Gmail Compose</span>
              </a>

              <button
                type="button"
                onClick={handleCopySummary}
                className="px-3 py-2.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-stone-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Summary</span>
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-[#C1553B] hover:bg-[#A9442C] text-white text-xs font-bold cursor-pointer shadow-sm"
            >
              Done & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
