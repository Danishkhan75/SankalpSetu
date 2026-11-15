import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export type ExportFormat = 'pdf' | 'excel' | 'html';

export interface ExportFieldRow {
  label: string;
  value: string | number;
}

export interface ExportTableData {
  headers: string[];
  rows: Array<Array<string | number>>;
}

export interface ExportDocumentPayload {
  title: string;
  subtitle?: string;
  referenceId: string;
  badgeText?: string;
  issuedAt?: string;
  fields?: ExportFieldRow[];
  table?: ExportTableData;
  footerNote?: string;
  fileNamePrefix?: string;
}

function escapeHtml(raw: string | number | null | undefined): string {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizePdfText(raw: string | number | null | undefined): string {
  return String(raw ?? '')
    .replace(/₹/g, 'INR ')
    .replace(/[•·]/g, '-')
    .replace(/[—–]/g, '-')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Generates a PDF document using the `jspdf` library (`new jsPDF(...)`)
 * with styled header banner, reference ID, key-value receipt/campaign fields,
 * and tabular rows.
 */
export function generateJsPdfDocument(payload: ExportDocumentPayload): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
    compress: false,
  });

  const issuedAt = payload.issuedAt || new Date().toLocaleString('en-IN');

  // Top Header Banner (#1F6F5B)
  doc.setFillColor(31, 111, 91);
  doc.roundedRect(36, 32, 523, 56, 6, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(
    sanitizePdfText(payload.title || 'SankalpSetu Official Receipt & Campaign Report').slice(0, 68),
    48,
    56
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(230, 244, 241);
  doc.text(
    sanitizePdfText(
      payload.subtitle ||
        'SankalpSetu Universal Aid Platform - Admin: Danish Khan (khandanish0503@gmail.com)'
    ).slice(0, 92),
    48,
    74
  );

  // Reference & Issued metadata
  let y = 110;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(24, 21, 18);
  doc.text(
    sanitizePdfText(`Reference ID: ${payload.referenceId}   |   Issued: ${issuedAt}`),
    40,
    y
  );

  if (payload.badgeText) {
    y += 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(193, 85, 59);
    doc.text(sanitizePdfText(`Category / Status: ${payload.badgeText}`), 40, y);
  }

  y += 12;
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(1);
  doc.line(36, y, 559, y);
  y += 18;

  // Key-Value Fields
  if (payload.fields && payload.fields.length > 0) {
    for (const field of payload.fields) {
      if (y > 740) {
        doc.addPage();
        y = 48;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(65, 65, 65);
      doc.text(sanitizePdfText(`${field.label}:`).slice(0, 38), 40, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(20, 20, 20);
      doc.text(sanitizePdfText(field.value).slice(0, 68), 185, y);

      y += 6;
      doc.setDrawColor(238, 238, 238);
      doc.setLineWidth(0.5);
      doc.line(40, y, 555, y);
      y += 15;
    }
  }

  // Table Section
  if (payload.table && payload.table.headers.length > 0) {
    y += 8;
    if (y > 700) {
      doc.addPage();
      y = 48;
    }
    const cols = payload.table.headers.length;
    const colWidth = Math.floor(515 / Math.max(1, cols));

    // Table Header Bar
    doc.setFillColor(24, 21, 18);
    doc.rect(36, y - 11, 523, 18, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);

    payload.table.headers.forEach((h, idx) => {
      doc.text(sanitizePdfText(h).slice(0, 18), 42 + idx * colWidth, y + 1);
    });
    y += 16;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(35, 35, 35);

    for (const row of payload.table.rows) {
      if (y > 760) {
        doc.addPage();
        y = 48;
      }
      row.forEach((cell, idx) => {
        doc.text(sanitizePdfText(cell).slice(0, 20), 42 + idx * colWidth, y);
      });
      y += 5;
      doc.setDrawColor(235, 235, 235);
      doc.line(36, y, 559, y);
      y += 12;
    }
  }

  // Footer
  doc.setDrawColor(200, 200, 200);
  doc.line(36, 792, 559, 792);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(
    sanitizePdfText(
      payload.footerNote ||
        'Official SankalpSetu Digital Certificate & Export - Verified by Chief Admin Danish Khan (khandanish0503@gmail.com)'
    ).slice(0, 105),
    40,
    808
  );

  return doc;
}

/**
 * Generates an Excel (.xlsx) binary workbook using the `xlsx` library (`XLSX.utils.aoa_to_sheet`).
 */
export function generateXlsxWorkbookBytes(payload: ExportDocumentPayload): Uint8Array {
  const issuedAt = payload.issuedAt || new Date().toLocaleString('en-IN');
  const aoa: Array<Array<string | number>> = [
    [payload.title || 'SankalpSetu Official Export'],
    [
      payload.subtitle ||
        'SankalpSetu Universal Aid Platform — Admin: Danish Khan (khandanish0503@gmail.com)',
    ],
    ['Reference ID', payload.referenceId, 'Issued At', issuedAt],
  ];

  if (payload.badgeText) {
    aoa.push(['Category / Status', payload.badgeText]);
  }

  if (payload.fields && payload.fields.length > 0) {
    aoa.push([]);
    aoa.push(['Field', 'Value']);
    for (const f of payload.fields) {
      aoa.push([f.label, f.value]);
    }
  }

  if (payload.table && payload.table.headers.length > 0) {
    aoa.push([]);
    aoa.push(payload.table.headers);
    for (const r of payload.table.rows) {
      aoa.push(r);
    }
  }

  aoa.push([]);
  aoa.push([
    payload.footerNote ||
      'Official Digital Export • SankalpSetu Platform (Chief Administrator: Danish Khan • khandanish0503@gmail.com)',
  ]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 26 },
    { wch: 36 },
    { wch: 24 },
    { wch: 28 },
    { wch: 28 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'SankalpSetu_Export');
  const arrayBuf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(arrayBuf);
}

/**
 * Generates a valid, self-contained PDF binary document (Uint8Array) via `jspdf`
 * that opens natively in Adobe Reader, Chrome PDF Viewer, macOS Preview, etc.
 */
export function generateRealPdfBytes(payload: ExportDocumentPayload): Uint8Array {
  const doc = generateJsPdfDocument(payload);
  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}

/**
 * Generates an Excel-compatible SpreadsheetML (.xls) document that opens natively
 * in Microsoft Excel, Google Sheets, and LibreOffice Calc with styled headers and rows.
 */
export function generateExcelXmlContent(payload: ExportDocumentPayload): string {
  const issuedAt = payload.issuedAt || new Date().toLocaleString('en-IN');

  const fieldRowsXml = (payload.fields || [])
    .map(
      (f) => `
      <Row>
        <Cell ss:StyleID="FieldLabel"><Data ss:Type="String">${escapeHtml(f.label)}</Data></Cell>
        <Cell ss:StyleID="FieldValue"><Data ss:Type="String">${escapeHtml(f.value)}</Data></Cell>
      </Row>`
    )
    .join('');

  let tableSectionXml = '';
  if (payload.table && payload.table.headers.length > 0) {
    const headerCells = payload.table.headers
      .map(
        (h) =>
          `<Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeHtml(h)}</Data></Cell>`
      )
      .join('');
    const bodyRows = payload.table.rows
      .map(
        (row) =>
          `<Row>${row
            .map(
              (cell) =>
                `<Cell ss:StyleID="TableCell"><Data ss:Type="String">${escapeHtml(cell)}</Data></Cell>`
            )
            .join('')}</Row>`
      )
      .join('\n');

    tableSectionXml = `
      <Row></Row>
      <Row>${headerCells}</Row>
      ${bodyRows}
    `;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#181512"/>
    </Style>
    <Style ss:ID="TitleBanner">
      <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#1F6F5B" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="MetaRow">
      <Font ss:FontName="Consolas" ss:Size="10" ss:Bold="1" ss:Color="#334155"/>
      <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="FieldLabel">
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#1E293B"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
    </Style>
    <Style ss:ID="FieldValue">
      <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#0F172A"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
    </Style>
    <Style ss:ID="TableHeader">
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#181512" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="TableCell">
      <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1E293B"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
    </Style>
  </Styles>
  <Worksheet ss:Name="SankalpSetu Export">
    <Table ss:DefaultColumnWidth="160" ss:DefaultRowHeight="20">
      <Column ss:Width="190"/>
      <Column ss:Width="260"/>
      <Column ss:Width="150"/>
      <Column ss:Width="150"/>
      <Column ss:Width="180"/>
      <Row ss:Height="28">
        <Cell ss:StyleID="TitleBanner"><Data ss:Type="String">${escapeHtml(payload.title)}</Data></Cell>
        <Cell ss:StyleID="TitleBanner"><Data ss:Type="String">${escapeHtml(
          payload.subtitle || 'SankalpSetu Official Record'
        )}</Data></Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:StyleID="MetaRow"><Data ss:Type="String">Reference ID: ${escapeHtml(
          payload.referenceId
        )}</Data></Cell>
        <Cell ss:StyleID="MetaRow"><Data ss:Type="String">Issued: ${escapeHtml(
          issuedAt
        )}</Data></Cell>
      </Row>
      ${
        payload.badgeText
          ? `<Row ss:Height="22">
              <Cell ss:StyleID="FieldLabel"><Data ss:Type="String">Category / Status</Data></Cell>
              <Cell ss:StyleID="FieldValue"><Data ss:Type="String">${escapeHtml(
                payload.badgeText
              )}</Data></Cell>
            </Row>`
          : ''
      }
      <Row></Row>
      ${fieldRowsXml}
      ${tableSectionXml}
      <Row></Row>
      <Row>
        <Cell ss:StyleID="MetaRow"><Data ss:Type="String">${escapeHtml(
          payload.footerNote ||
            'Official Digital Export • SankalpSetu Platform (Chief Administrator: Danish Khan • khandanish0503@gmail.com)'
        )}</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
</Workbook>`;
}

/**
 * Generates a standalone, print-ready HTML (.html) receipt/report document.
 */
export function generateHtmlDocumentContent(payload: ExportDocumentPayload): string {
  const issuedAt = payload.issuedAt || new Date().toLocaleString('en-IN');
  const fieldsHtml = (payload.fields || [])
    .map(
      (f) => `
      <div class="row">
        <strong>${escapeHtml(f.label)}:</strong>
        <span>${escapeHtml(f.value)}</span>
      </div>`
    )
    .join('');

  let tableHtml = '';
  if (payload.table && payload.table.headers.length > 0) {
    const ths = payload.table.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
    const trs = payload.table.rows
      .map(
        (r) =>
          `<tr>${r.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
      )
      .join('');
    tableHtml = `
      <table>
        <thead><tr>${ths}</tr></thead>
        <tbody>${trs}</tbody>
      </table>
    `;
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(payload.title)} — ${escapeHtml(payload.referenceId)}</title>
  <style>
    body { font-family: Georgia, serif; background: #FAF7F2; color: #181512; padding: 36px; margin: 0; }
    .card { max-width: 820px; margin: 0 auto; background: #fff; border: 2px solid #1F6F5B; border-radius: 16px; padding: 32px; box-shadow: 0 10px 28px rgba(0,0,0,0.06); }
    .header { border-bottom: 2px solid #E5E7EB; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
    .badge { background: #1F6F5B; color: #fff; font-family: monospace; font-size: 15px; font-weight: bold; padding: 8px 14px; border-radius: 10px; white-space: nowrap; }
    .meta { font-family: monospace; font-size: 12px; color: #57534E; margin-bottom: 14px; }
    .row { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid #F3F4F6; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-family: sans-serif; font-size: 12px; }
    th { background: #181512; color: #fff; text-align: left; padding: 10px; }
    td { padding: 9px 10px; border-bottom: 1px solid #E5E7EB; }
    .footer { margin-top: 24px; font-size: 12px; color: #57534E; text-align: center; border-top: 1px solid #E5E7EB; padding-top: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <h1 style="margin:0;font-size:22px;">${escapeHtml(payload.title)}</h1>
        <p style="margin:4px 0 0;font-size:12px;color:#57534E;">${escapeHtml(
          payload.subtitle ||
            'Verified by Chief Admin Danish Khan (khandanish0503@gmail.com)'
        )}</p>
      </div>
      <div class="badge">${escapeHtml(payload.badgeText || payload.referenceId)}</div>
    </div>
    <div class="meta">Reference ID: <strong>${escapeHtml(
      payload.referenceId
    )}</strong> &bull; Issued: ${escapeHtml(issuedAt)}</div>
    ${fieldsHtml}
    ${tableHtml}
    <div class="footer">
      ${escapeHtml(
        payload.footerNote ||
          'Official Digital & Printable Certificate • SankalpSetu Platform (Owner: Danish Khan • khandanish0503@gmail.com)'
      )}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Triggers a browser download of the given document payload in PDF (.pdf via jsPDF),
 * Excel (.xlsx via SheetJS xlsx), or HTML (.html) format.
 */
export function downloadExportDocument(
  payload: ExportDocumentPayload,
  format: ExportFormat
): void {
  if (typeof document === 'undefined') return;
  const cleanPrefix = (payload.fileNamePrefix || payload.title || 'SankalpSetu-Receipt')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const cleanRef = (payload.referenceId || 'REF')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-');
  const baseName = `${cleanPrefix}-${cleanRef}`;

  if (format === 'pdf') {
    const doc = generateJsPdfDocument(payload);
    doc.save(`${baseName}.pdf`);
    return;
  }

  if (format === 'excel') {
    const xlsxBytes = generateXlsxWorkbookBytes(payload);
    const blob = new Blob([xlsxBytes as unknown as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  const htmlContent = generateHtmlDocumentContent(payload);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${baseName}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Resolves the best high-resolution photograph according to the Hero/Campaign theme, title, or caption.
 */
export function resolveBestImageForCaptionOrTitle(params: {
  theme?: string;
  title?: string;
  caption?: string;
  customImageUrl?: string | null;
}): string {
  if (params.customImageUrl && params.customImageUrl.trim().length > 0) {
    return params.customImageUrl.trim();
  }
  const combined = `${params.theme || ''} ${params.title || ''} ${params.caption || ''}`.toLowerCase();

  if (
    combined.includes('freelance') ||
    combined.includes('website') ||
    combined.includes('saas') ||
    combined.includes('developer') ||
    combined.includes('software') ||
    combined.includes('studio')
  ) {
    return '/assets/hero/freelancer.jpg';
  }
  if (
    combined.includes('blood') ||
    combined.includes('transfusion') ||
    combined.includes('donor') ||
    combined.includes('o+') ||
    combined.includes('a+')
  ) {
    return '/assets/hero/blood_camp.jpg';
  }
  if (
    combined.includes('medical') ||
    combined.includes('hospital') ||
    combined.includes('doctor') ||
    combined.includes('health') ||
    combined.includes('patient') ||
    combined.includes('dialysis') ||
    combined.includes('trauma')
  ) {
    return '/assets/hero/health.jpg';
  }
  if (
    combined.includes('education') ||
    combined.includes('student') ||
    combined.includes('tuition') ||
    combined.includes('school') ||
    combined.includes('college') ||
    combined.includes('stem') ||
    combined.includes('laptop') ||
    combined.includes('b.tech')
  ) {
    return '/assets/hero/education.jpg';
  }
  if (
    combined.includes('water') ||
    combined.includes('borewell') ||
    combined.includes('drought') ||
    combined.includes('filtration')
  ) {
    return '/assets/hero/water.jpg';
  }
  if (
    combined.includes('environment') ||
    combined.includes('solar') ||
    combined.includes('micro-grid') ||
    combined.includes('rural') ||
    combined.includes('village') ||
    combined.includes('gram')
  ) {
    return '/assets/hero/environment.jpg';
  }
  if (
    combined.includes('personal') ||
    combined.includes('city') ||
    combined.includes('family') ||
    combined.includes('shop') ||
    combined.includes('urban')
  ) {
    return '/assets/hero/personal.jpg';
  }

  return '/assets/hero/freelancer.jpg';
}

import {
  buildConsolidatedTaxStatementSummary,
  ConsolidatedTaxDonationInput,
  ConsolidatedTaxStatementSummary,
  formatINR,
} from './donationLogic';

export interface ConsolidatedTaxExportOptions {
  donorName?: string;
  donorEmail?: string;
  donorPan?: string;
  financialYear?: string;
  onlyPaid?: boolean;
  filterByDonorEmail?: string;
}

/**
 * Builds an ExportDocumentPayload representing the Consolidated Section 80G / Form 10BE Tax Statement
 * across all past donation receipts.
 */
export function buildConsolidatedTaxExportPayload(
  donations: ConsolidatedTaxDonationInput[],
  options?: ConsolidatedTaxExportOptions
): {
  summary: ConsolidatedTaxStatementSummary;
  payload: ExportDocumentPayload;
} {
  const summary = buildConsolidatedTaxStatementSummary(donations, options);

  const payload: ExportDocumentPayload = {
    title: `Consolidated 80G Tax Certificate & Annual Donation Statement (${summary.financialYear})`,
    subtitle:
      'Form 10BE / Section 80G(5)(vi) Income Tax Deduction Statement — SankalpSetu Universal Aid Platform',
    referenceId: summary.certificateReferenceId,
    badgeText: `${summary.receiptCount} Past Receipts • 50% Sec 80G Tax Deduction`,
    fileNamePrefix: 'SankalpSetu-Consolidated-80G-Tax-Receipts',
    fields: [
      { label: 'Consolidated Certificate ID', value: summary.certificateReferenceId },
      {
        label: 'Financial Year / Assessment Year',
        value: `${summary.financialYear} (${summary.assessmentYear})`,
      },
      { label: 'Donor Full Name', value: summary.donorName },
      { label: 'Donor Registered Email', value: summary.donorEmail },
      { label: 'Donor Income Tax PAN', value: summary.donorPan },
      { label: 'Total Past Receipts Consolidated', value: `${summary.receiptCount} Verified Receipts` },
      {
        label: 'Cumulative Amount Donated',
        value: formatINR(summary.totalDonatedAmount),
      },
      {
        label: 'Eligible Section 80G Tax Deduction (50%)',
        value: formatINR(summary.totalEligible80GDeduction),
      },
      {
        label: 'Estimated Income Tax Saved (30% Slab)',
        value: formatINR(summary.totalEstimatedTaxSaved),
      },
      {
        label: 'NGO 80G URN & PAN',
        value: '80G-DEL-2026-8841 • PAN: AABCG8841K (Form 10AC Verified)',
      },
      {
        label: 'Authorized Certifying Officer',
        value: 'Danish Khan (Chief Administrator • khandanish0503@gmail.com)',
      },
    ],
    table: {
      headers: [
        'Receipt No.',
        'Date',
        'Order ID',
        'Campaign / Purpose',
        'NGO 80G Reg',
        'Mode',
        'Donated',
        '80G Eligible (50%)',
      ],
      rows: summary.items.map((item) => [
        item.receiptNumber,
        item.dateFormatted,
        item.orderId,
        item.campaignTitle,
        item.organization80G,
        item.paymentMethod,
        formatINR(item.amount),
        formatINR(item.eligible80GDeduction),
      ]),
    },
    footerNote: summary.sectionDeclaration,
  };

  return { summary, payload };
}

/**
 * Generates a dedicated, multi-section Consolidated 80G Tax Certificate PDF document via `jsPDF`
 * containing all past donation receipts, itemized 80G deduction breakdown, and Form 10BE compliance summary.
 */
export function generateConsolidatedTaxPdfDocument(
  donations: ConsolidatedTaxDonationInput[],
  options?: ConsolidatedTaxExportOptions
): { doc: jsPDF; summary: ConsolidatedTaxStatementSummary } {
  const { summary } = buildConsolidatedTaxExportPayload(donations, options);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
    compress: false,
  });

  const issuedAt = new Date().toLocaleString('en-IN');

  // 1. Official Section 80G / Form 10BE Header Banner
  doc.setFillColor(31, 111, 91);
  doc.roundedRect(32, 28, 531, 64, 6, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    sanitizePdfText(
      `CONSOLIDATED SECTION 80G TAX CERTIFICATE (${summary.financialYear} / ${summary.assessmentYear})`
    ),
    44,
    50
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(225, 245, 238);
  doc.text(
    sanitizePdfText(
      'Annual Statement of Past Donation Receipts (Form 10BE / Sec 80G(5)(vi) Income Tax Act, 1961)'
    ),
    44,
    66
  );
  doc.text(
    sanitizePdfText(
      `Certificate ID: ${summary.certificateReferenceId}   |   Issued: ${issuedAt}`
    ),
    44,
    81
  );

  // 2. Donor & Trust Identification Block
  let y = 110;
  doc.setFillColor(246, 244, 238);
  doc.roundedRect(32, y - 12, 531, 68, 5, 5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(24, 21, 18);
  doc.text(sanitizePdfText(`Donor Name: ${summary.donorName}`), 42, y + 4);
  doc.text(sanitizePdfText(`Donor PAN: ${summary.donorPan}`), 330, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text(sanitizePdfText(`Donor Email: ${summary.donorEmail}`), 42, y + 20);
  doc.text(
    sanitizePdfText(`Receipts Consolidated: ${summary.receiptCount} Verified Receipts`),
    330,
    y + 20
  );
  doc.text(
    sanitizePdfText('80G URN: 80G-DEL-2026-8841  |  Trust PAN: AABCG8841K (Form 10AC Verified)'),
    42,
    y + 36
  );
  doc.text(
    sanitizePdfText('Authorized Officer: Danish Khan (khandanish0503@gmail.com)'),
    330,
    y + 36
  );

  // 3. Consolidated Tax Summary Highlights Strip
  y = 188;
  doc.setFillColor(24, 21, 18);
  doc.roundedRect(32, y, 531, 46, 5, 5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(180, 230, 210);
  doc.text('CUMULATIVE DONATED AMOUNT', 44, y + 16);
  doc.text('ELIGIBLE 80G DEDUCTION (50%)', 225, y + 16);
  doc.text('EST. TAX SAVED (30% SLAB)', 410, y + 16);

  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(sanitizePdfText(formatINR(summary.totalDonatedAmount)), 44, y + 34);
  doc.text(sanitizePdfText(formatINR(summary.totalEligible80GDeduction)), 225, y + 34);
  doc.text(sanitizePdfText(formatINR(summary.totalEstimatedTaxSaved)), 410, y + 34);

  // 4. Itemized Past Donation Receipts Table
  y = 254;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(24, 21, 18);
  doc.text(
    sanitizePdfText(
      `Itemized Schedule of All Past Donation Receipts (${summary.receiptCount} Receipts)`
    ),
    34,
    y
  );

  y += 12;
  doc.setFillColor(31, 111, 91);
  doc.rect(32, y, 531, 18, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('#', 38, y + 12);
  doc.text('RECEIPT NO.', 54, y + 12);
  doc.text('DATE', 132, y + 12);
  doc.text('ORDER ID', 190, y + 12);
  doc.text('CAMPAIGN / BENEFICIARY', 268, y + 12);
  doc.text('MODE', 406, y + 12);
  doc.text('AMOUNT', 444, y + 12);
  doc.text('80G (50%)', 504, y + 12);

  y += 28;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 30, 30);

  for (const item of summary.items) {
    if (y > 730) {
      doc.addPage();
      y = 48;
    }
    doc.text(String(item.index), 38, y);
    doc.text(sanitizePdfText(item.receiptNumber).slice(0, 16), 54, y);
    doc.text(sanitizePdfText(item.dateFormatted).slice(0, 12), 132, y);
    doc.text(sanitizePdfText(item.orderId).slice(0, 15), 190, y);
    doc.text(sanitizePdfText(item.campaignTitle).slice(0, 28), 268, y);
    doc.text(sanitizePdfText(item.paymentMethod).slice(0, 7), 406, y);
    doc.text(sanitizePdfText(formatINR(item.amount)), 444, y);
    doc.text(sanitizePdfText(formatINR(item.eligible80GDeduction)), 504, y);

    y += 5;
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(32, y, 563, y);
    y += 13;
  }

  // Totals Footer Row
  if (y > 720) {
    doc.addPage();
    y = 48;
  }
  doc.setFillColor(241, 245, 249);
  doc.rect(32, y - 8, 531, 20, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(24, 21, 18);
  doc.text(
    sanitizePdfText(`CONSOLIDATED TOTAL (${summary.receiptCount} RECEIPTS)`),
    40,
    y + 5
  );
  doc.text(sanitizePdfText(formatINR(summary.totalDonatedAmount)), 440, y + 5);
  doc.text(sanitizePdfText(formatINR(summary.totalEligible80GDeduction)), 502, y + 5);

  // Legal 80G Declaration Footer
  doc.setDrawColor(200, 200, 200);
  doc.line(32, 782, 563, 782);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text(sanitizePdfText(summary.sectionDeclaration).slice(0, 112), 34, 796);
  doc.text(
    sanitizePdfText(
      'Digitally Verified by SankalpSetu Chief Administrator Danish Khan (khandanish0503@gmail.com) - Valid for Income Tax Return (ITR) Filing'
    ),
    34,
    808
  );

  return { doc, summary };
}

/**
 * Generates raw PDF bytes (Uint8Array) for the Consolidated 80G Tax Certificate.
 */
export function generateConsolidatedTaxPdfBytes(
  donations: ConsolidatedTaxDonationInput[],
  options?: ConsolidatedTaxExportOptions
): Uint8Array {
  const { doc } = generateConsolidatedTaxPdfDocument(donations, options);
  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}

/**
 * Triggers a browser download of all past donation receipts as a single consolidated PDF file
 * for income tax deduction purposes.
 */
export function downloadConsolidatedTaxReceiptsPdf(
  donations: ConsolidatedTaxDonationInput[],
  options?: ConsolidatedTaxExportOptions
): ConsolidatedTaxStatementSummary {
  const { doc, summary } = generateConsolidatedTaxPdfDocument(donations, options);
  if (typeof document !== 'undefined') {
    const cleanRef = summary.certificateReferenceId.replace(/[^a-zA-Z0-9-_]+/g, '-');
    doc.save(`SankalpSetu-Consolidated-80G-Tax-Receipts-${cleanRef}.pdf`);
  }
  return summary;
}

