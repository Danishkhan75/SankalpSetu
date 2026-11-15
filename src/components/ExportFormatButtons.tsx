import React, { useState } from 'react';
import { FileText, FileSpreadsheet, FileCode2, Check } from 'lucide-react';
import {
  ExportDocumentPayload,
  ExportFormat,
  downloadExportDocument,
} from '../utils/exportUtils';

interface ExportFormatButtonsProps {
  payload: ExportDocumentPayload;
  compact?: boolean;
  labelPrefix?: string;
  className?: string;
}

export const ExportFormatButtons: React.FC<ExportFormatButtonsProps> = ({
  payload,
  compact = false,
  labelPrefix = '',
  className = '',
}) => {
  const [downloadedFormat, setDownloadedFormat] = useState<ExportFormat | null>(
    null
  );

  const handleTrigger = (format: ExportFormat, e: React.MouseEvent) => {
    e.stopPropagation();
    downloadExportDocument(payload, format);
    setDownloadedFormat(format);
    setTimeout(() => {
      setDownloadedFormat((prev) => (prev === format ? null : prev));
    }, 2000);
  };

  const prefixText = labelPrefix ? `${labelPrefix} ` : '';

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-1.5 no-print ${className}`}
      role="group"
      aria-label={`Download ${payload.title} as PDF, Excel, or HTML`}
    >
      <button
        type="button"
        onClick={(e) => handleTrigger('pdf', e)}
        className={`rounded-lg font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer border shadow-2xs ${
          compact
            ? 'px-2 py-1 text-[11px]'
            : 'px-3 py-2 text-xs'
        } bg-red-700 hover:bg-red-600 text-white border-red-800`}
        title="Download Official PDF (.pdf)"
      >
        {downloadedFormat === 'pdf' ? (
          <Check className="w-3.5 h-3.5 text-amber-200 shrink-0" />
        ) : (
          <FileText className="w-3.5 h-3.5 text-red-100 shrink-0" />
        )}
        <span>{prefixText}PDF (.pdf)</span>
      </button>

      <button
        type="button"
        onClick={(e) => handleTrigger('excel', e)}
        className={`rounded-lg font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer border shadow-2xs ${
          compact
            ? 'px-2 py-1 text-[11px]'
            : 'px-3 py-2 text-xs'
        } bg-[#1F6F5B] hover:bg-[#165344] text-white border-emerald-800`}
        title="Download Microsoft Excel Workbook (.xlsx)"
      >
        {downloadedFormat === 'excel' ? (
          <Check className="w-3.5 h-3.5 text-amber-200 shrink-0" />
        ) : (
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
        )}
        <span>{prefixText}Excel (.xlsx)</span>
      </button>

      <button
        type="button"
        onClick={(e) => handleTrigger('html', e)}
        className={`rounded-lg font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer border shadow-2xs ${
          compact
            ? 'px-2 py-1 text-[11px]'
            : 'px-3 py-2 text-xs'
        } bg-stone-900 hover:bg-stone-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white border-stone-700`}
        title="Download Standalone Web Receipt (.html)"
      >
        {downloadedFormat === 'html' ? (
          <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
        ) : (
          <FileCode2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
        )}
        <span>{prefixText}HTML (.html)</span>
      </button>
    </div>
  );
};
