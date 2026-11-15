import React from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';

export interface ConfirmActionState {
  title: string;
  message: string;
  itemName?: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
}

interface ConfirmActionModalProps {
  confirmState: ConfirmActionState | null;
  onClose: () => void;
  busy?: boolean;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  confirmState,
  onClose,
  busy = false,
}) => {
  if (!confirmState) return null;

  const handleConfirmClick = async () => {
    await confirmState.onConfirm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-action-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#FAF7F2] dark:bg-slate-900 border-2 border-red-300 dark:border-red-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Warning Header */}
        <div className="px-5 py-4 bg-red-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-800/80 border border-red-600/60">
              <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-red-200 block">
                Destructive Action Safeguard
              </span>
              <h3
                id="confirm-action-title"
                className="font-serif text-lg font-bold text-white leading-tight"
              >
                Are you sure? — {confirmState.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="p-1.5 rounded-lg text-red-200 hover:text-white hover:bg-red-800 transition-colors cursor-pointer"
            aria-label="Cancel confirmation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <p className="text-sm text-stone-700 dark:text-slate-200 leading-relaxed">
            {confirmState.message}
          </p>

          {confirmState.itemName && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/80 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="text-red-800 dark:text-red-300 font-semibold block">
                  Target Record:
                </span>
                <strong className="font-mono text-stone-900 dark:text-white break-words">
                  {confirmState.itemName}
                </strong>
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-stone-100 dark:bg-slate-800/80 border border-stone-200 dark:border-slate-700 text-[11px] text-stone-600 dark:text-slate-300 font-mono">
            Admin Safeguard: Confirmed actions are logged in the PostgreSQL Audit Trail under Admin Danish Khan (khandanish0503@gmail.com).
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-stone-100 dark:hover:bg-slate-700 text-stone-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              No, Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmClick}
              disabled={busy}
              className="px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>{busy ? 'Processing...' : confirmState.confirmLabel || 'Yes, Confirm & Delete'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
