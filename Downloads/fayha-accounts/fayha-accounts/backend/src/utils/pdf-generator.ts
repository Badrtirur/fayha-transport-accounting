// ==========================================
// FAYHA TRANSPORTATION - PDF Generator Service
// Server-side invoice PDF generation using pdfkit
// ==========================================

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { buildTlvBase64 } from './zatca';
import QRCode from 'qrcode';

// Ensure uploads/pdfs directory exists
const PDF_DIR = path.resolve('./uploads/pdfs');
fs.mkdirSync(PDF_DIR, { recursive: true });

// Brand colors
const BRAND_BLUE: [number, number, number] = [30, 58, 110]; // #1e3a6e
const WHITE: [number, number, number] = [255, 255, 255];
const SLATE_600: [number, number, number] = [71, 85, 105];
const SLATE_500: [number, number, number] = [100, 116, 139];
const SLATE_800: [number, number, number] = [30, 41, 59];
const AMBER_700: [number, number, number] = [180, 83, 9];

interface InvoiceItem {
  nameEn?: string;
  name?: string;
  nameAr?: string;
  description?: string;
  amount: number;
  vatRate?: number;
  vatPercent?: number;
  vatAmount: number;
  totalAmount?: number;
  total?: number;
}

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  invoiceDate: string | Date;
  dueDate?: string | Date;
  saleMethod?: string;
  subtotal?: number;
  vatAmount?: number;
  totalAmount?: number;
  paidAmount?: number;
  balanceDue?: number;
  zatcaStatus?: string;
  zatcaUuid?: string;
  zatcaHash?: string;
  zatcaQrCode?: string;
  zatcaClearanceId?: string;
  notes?: string;
  items: InvoiceItem[];
  client?: {
    name: string;
    nameAr?: string;
    vatNumber?: string;
    buildingNumber?: string;
    streetName?: string;
    district?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    contactPerson?: string;
    contactPersonPhone?: string;
    phone?: string;
  };
  jobReference?: {
    jobRefNo?: string;
    jobNumber?: string;
    direction?: string;
    jobDescription?: string;
    hsCode?: string;
    customerRefNo?: string;
    cargoDescription?: string;
    pol?: string;
    origin?: string;
    pod?: string;
    destination?: string;
    grossWeight?: string;
    chargeableWeight?: string;
    shipper?: string;
    fclLclType?: string;
    consigneeName?: string;
    vesselName?: string;
    airlines?: string;
    awbBl?: string;
    awbBlNumber?: string;
    packages?: string;
    hawbHbl?: string;
    mawbMbl?: string;
  };
}

interface CompanyInfo {
  name: string;
  nameAr: string;
  vatNumber: string;
  crNumber: string;
  address: string;
  addressAr?: string;
  phone1?: string;
  phone2?: string;
  email?: string;
}

interface BankInfo {
  bankName: string;
  accountNumber?: string;
  ibanNumber?: string;
  swiftCode?: string;
  branchName?: string;
}

const DEFAULT_COMPANY: CompanyInfo = {
  name: 'Fayha Arabia Company',
  nameAr: '\u0634\u0631\u0643\u0629 \u0641\u064a\u062d\u0627 \u0623\u0631\u0627\u0628\u064a\u0627',
  vatNumber: '311467026900003',
  crNumber: '1010616141',
  address: 'Building No: 8298, Prince Muhammad Ibn Abdulrahman Ibn Abdulaziz, Al Mishael Dist., Riyadh 14325, Saudi Arabia',
  addressAr: '\u0631\u0642\u0645 \u0627\u0644\u0645\u0628\u0646\u0649: \u0668\u0662\u0669\u0668\u060c \u0627\u0644\u0623\u0645\u064a\u0631 \u0645\u062d\u0645\u062f \u0628\u0646 \u0639\u0628\u062f\u0627\u0644\u0631\u062d\u0645\u0646 \u0628\u0646 \u0639\u0628\u062f\u0627\u0644\u0639\u0632\u064a\u0632\u060c \u062d\u064a \u0627\u0644\u0645\u0634\u0627\u0639\u0644\u060c \u0627\u0644\u0631\u0645\u0632 \u0627\u0644\u0628\u0631\u064a\u062f\u064a\u060c \u0627\u0644\u0631\u064a\u0627\u0636\u060c \u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629',
  phone1: '050 057 1423',
  phone2: '050 243 4321',
  email: 'info@fayha.sa',
};

function fmtDate(d: any): string {
  if (!d) return '';
  try {
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`;
  } catch { return ''; }
}

function fmtNum(n: number): string {
  return (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Generate a ZATCA-compliant tax invoice PDF using pdfkit.
 * Returns the absolute file path of the generated PDF.
 */
export async function generateInvoicePdf(
  invoice: InvoiceData,
  companyInfo?: Partial<CompanyInfo>,
  banks?: BankInfo[],
): Promise<{ filePath: string; fileName: string }> {
  const company = { ...DEFAULT_COMPANY, ...companyInfo };
  const fileName = `${invoice.invoiceNumber}.pdf`;
  const filePath = path.join(PDF_DIR, fileName);

  // Generate QR code as PNG buffer
  let qrPngBuffer: Buffer | null = null;
  try {
    const items = invoice.items || [];
    const vatTotal = items.reduce((s, i) => s + (i.vatAmount || 0), 0);
    const grandTotal = invoice.totalAmount || 0;
    const timestamp = invoice.invoiceDate
      ? new Date(invoice.invoiceDate).toISOString()
      : new Date().toISOString();

    const tlvBase64 = buildTlvBase64(
      company.name,
      company.vatNumber,
      timestamp,
      grandTotal,
      vatTotal,
    );
    qrPngBuffer = await QRCode.toBuffer(tlvBase64, { width: 120, margin: 1 });
  } catch { /* QR generation failed, continue without */ }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 30, bottom: 30, left: 40, right: 40 },
      info: {
        Title: `Tax Invoice ${invoice.invoiceNumber}`,
        Author: company.name,
        Subject: 'Tax Invoice',
      },
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const leftMargin = doc.page.margins.left;

    // ═══ HEADER ═══
    // Company name
    doc.fontSize(16).fillColor(BRAND_BLUE).font('Helvetica-Bold')
      .text(company.name, leftMargin, 35, { width: pageWidth * 0.65 });
    doc.fontSize(8).fillColor(SLATE_500).font('Helvetica')
      .text(`VAT: ${company.vatNumber}  |  CR: ${company.crNumber}`, leftMargin, 55, { width: pageWidth * 0.65 });

    // CR Number box (right side)
    const crBoxX = leftMargin + pageWidth - 130;
    doc.rect(crBoxX, 30, 130, 32).fill(BRAND_BLUE);
    doc.fontSize(8).fillColor(WHITE).font('Helvetica-Bold')
      .text(`C.R: ${company.crNumber}`, crBoxX + 8, 38, { width: 114, align: 'center' })
      .text(`VAT: ${company.vatNumber}`, crBoxX + 8, 49, { width: 114, align: 'center' });

    // Blue separator
    doc.moveTo(leftMargin, 72).lineTo(leftMargin + pageWidth, 72).lineWidth(2).strokeColor(BRAND_BLUE).stroke();

    // ═══ INVOICE TITLE STRIP ═══
    doc.rect(leftMargin, 80, pageWidth, 22).fill(BRAND_BLUE);
    doc.fontSize(10).fillColor(WHITE).font('Helvetica-Bold')
      .text('TAX INVOICE', leftMargin + 12, 85, { width: pageWidth / 2 })
      .text('الفاتورة الضريبية', leftMargin + pageWidth / 2, 85, { width: pageWidth / 2 - 12, align: 'right' });

    let y = 110;

    // ═══ BILL TO + INVOICE DETAILS ═══
    const halfW = pageWidth / 2 - 4;
    const client = invoice.client;

    // Bill To box
    doc.rect(leftMargin, y, halfW, 90).lineWidth(0.5).strokeColor([200, 200, 200]).stroke();
    doc.rect(leftMargin, y, halfW, 14).fill([248, 250, 252]);
    doc.fontSize(7).fillColor(BRAND_BLUE).font('Helvetica-Bold')
      .text('Bill To / فاتورة إلى', leftMargin + 6, y + 3, { width: halfW - 12 });
    doc.fontSize(9).fillColor(SLATE_800).font('Helvetica-Bold')
      .text(client?.name || 'N/A', leftMargin + 6, y + 18, { width: halfW - 12 });

    let billY = y + 30;
    doc.fontSize(7).font('Helvetica').fillColor(SLATE_600);
    const clientAddress = [client?.buildingNumber, client?.streetName, client?.district, client?.city, client?.postalCode].filter(Boolean).join(', ');
    if (clientAddress) { doc.text(`Address: ${clientAddress}`, leftMargin + 6, billY, { width: halfW - 12 }); billY += 10; }
    doc.text(`Country: ${client?.country || 'SAUDI ARABIA'}`, leftMargin + 6, billY, { width: halfW - 12 }); billY += 10;
    if (client?.contactPerson) { doc.text(`Attn: ${client.contactPerson}`, leftMargin + 6, billY, { width: halfW - 12 }); billY += 10; }
    if (client?.vatNumber) { doc.text(`VAT ID: ${client.vatNumber}`, leftMargin + 6, billY, { width: halfW - 12 }); }

    // Invoice Details box
    const detailsX = leftMargin + halfW + 8;
    doc.rect(detailsX, y, halfW, 90).lineWidth(0.5).strokeColor([200, 200, 200]).stroke();

    const detailRows = [
      ['Invoice No', invoice.invoiceNumber],
      ['Invoice Date', fmtDate(invoice.invoiceDate)],
      ['Due Date', fmtDate(invoice.dueDate)],
      ['Sales Method', invoice.saleMethod || 'CREDIT'],
      ['Job Ref. No', invoice.jobReference?.jobRefNo || invoice.jobReference?.jobNumber || 'N/A'],
      ['VAT ID', company.vatNumber],
    ];
    let dY = y + 4;
    for (const [label, value] of detailRows) {
      doc.fontSize(7).font('Helvetica').fillColor(SLATE_500)
        .text(label, detailsX + 6, dY, { width: halfW / 2 - 6 });
      doc.fontSize(7).font('Helvetica-Bold').fillColor(SLATE_800)
        .text(value, detailsX + halfW / 2, dY, { width: halfW / 2 - 6, align: 'right' });
      dY += 14;
    }

    y += 98;

    // ═══ SHIPMENT DETAILS ═══
    const jr = invoice.jobReference;
    if (jr) {
      doc.rect(leftMargin, y, pageWidth, 14).fill([238, 242, 247]);
      doc.fontSize(7).fillColor(SLATE_600).font('Helvetica-Bold')
        .text('Shipment Details / تفاصيل', leftMargin + 6, y + 3, { width: pageWidth - 12 });
      y += 16;

      const shipmentFields = [
        ['Job', 'Clearance'],
        ['Job Details', jr.jobDescription || jr.hsCode || ''],
        ['Customer Ref / PO', jr.customerRefNo || ''],
        ['Origin', jr.pol || jr.origin || ''],
        ['Destination', jr.pod || jr.destination || ''],
        ['Container', jr.fclLclType || ''],
        ['AWB / BL NO', jr.awbBl || jr.awbBlNumber || ''],
        ['Vessel / Airline', jr.vesselName || jr.airlines || ''],
      ].filter(([, v]) => v);

      doc.fontSize(7).font('Helvetica');
      const colW = pageWidth / 2;
      let sY = y;
      shipmentFields.forEach(([label, value], idx) => {
        const col = idx % 2;
        const x = leftMargin + col * colW + 6;
        doc.fillColor(SLATE_500).text(`${label}: `, x, sY, { continued: true });
        doc.fillColor(SLATE_800).font('Helvetica-Bold').text(value, { continued: false });
        doc.font('Helvetica');
        if (col === 1) sY += 11;
      });
      if (shipmentFields.length % 2 !== 0) sY += 11;
      y = sY + 4;

      doc.moveTo(leftMargin, y).lineTo(leftMargin + pageWidth, y).lineWidth(0.5).strokeColor([200, 200, 200]).stroke();
      y += 6;
    }

    // ═══ LINE ITEMS TABLE ═══
    const normalizedItems = (invoice.items || []).map((i: any) => ({
      ...i,
      name: i.name || i.nameEn || '',
      vatPercent: i.vatPercent ?? (i.vatRate ? i.vatRate * 100 : 0),
      total: i.total ?? i.totalAmount ?? ((i.amount || 0) + (i.vatAmount || 0)),
    }));

    // Table header
    const colWidths = [25, pageWidth - 25 - 65 - 40 - 65 - 75, 65, 40, 65, 75];
    const colStarts = [leftMargin];
    for (let i = 1; i < colWidths.length; i++) {
      colStarts.push(colStarts[i - 1] + colWidths[i - 1]);
    }

    doc.rect(leftMargin, y, pageWidth, 18).fill(BRAND_BLUE);
    const headers = ['No', 'Services / Description', 'Amount', 'VAT%', 'VAT Amt', 'Total (SAR)'];
    const headerAligns: ('left' | 'center' | 'right')[] = ['center', 'left', 'right', 'center', 'right', 'right'];
    doc.fontSize(7).fillColor(WHITE).font('Helvetica-Bold');
    headers.forEach((h, i) => {
      doc.text(h, colStarts[i] + 3, y + 5, { width: colWidths[i] - 6, align: headerAligns[i] });
    });
    y += 18;

    // Table rows
    normalizedItems.forEach((item: any, idx: number) => {
      const rowH = 16;
      if (idx % 2 === 1) {
        doc.rect(leftMargin, y, pageWidth, rowH).fill([240, 245, 255]);
      }
      doc.fontSize(7).fillColor(SLATE_600).font('Helvetica');
      doc.text(String(idx + 1), colStarts[0] + 3, y + 5, { width: colWidths[0] - 6, align: 'center' });
      doc.fillColor(SLATE_800).font('Helvetica-Bold')
        .text(item.name, colStarts[1] + 3, y + 5, { width: colWidths[1] - 6 });
      doc.font('Helvetica').fillColor(SLATE_800)
        .text(fmtNum(item.amount), colStarts[2] + 3, y + 5, { width: colWidths[2] - 6, align: 'right' });
      doc.text(`${item.vatPercent || 0}%`, colStarts[3] + 3, y + 5, { width: colWidths[3] - 6, align: 'center' });
      doc.fillColor(SLATE_600)
        .text(fmtNum(item.vatAmount), colStarts[4] + 3, y + 5, { width: colWidths[4] - 6, align: 'right' });
      doc.fillColor(SLATE_800).font('Helvetica-Bold')
        .text(fmtNum(item.total), colStarts[5] + 3, y + 5, { width: colWidths[5] - 6, align: 'right' });
      y += rowH;
    });

    // Empty rows to fill at least 5
    const emptyRows = Math.max(0, 5 - normalizedItems.length);
    for (let i = 0; i < emptyRows; i++) {
      const rowIdx = normalizedItems.length + i;
      if (rowIdx % 2 === 1) {
        doc.rect(leftMargin, y, pageWidth, 16).fill([240, 245, 255]);
      }
      y += 16;
    }

    // Bottom line of table
    doc.moveTo(leftMargin, y).lineTo(leftMargin + pageWidth, y).lineWidth(0.5).strokeColor([200, 200, 200]).stroke();
    y += 8;

    // ═══ SUMMARY TOTALS ═══
    const nonTaxItems = normalizedItems.filter((i: any) => !i.vatPercent || i.vatPercent === 0);
    const taxItems = normalizedItems.filter((i: any) => i.vatPercent && i.vatPercent > 0);
    const nonTaxTotal = nonTaxItems.reduce((s: number, i: any) => s + (i.amount || 0), 0);
    const taxableTotal = taxItems.reduce((s: number, i: any) => s + (i.amount || 0), 0);
    const vatTotal = taxItems.reduce((s: number, i: any) => s + (i.vatAmount || 0), 0);
    const grandTotal = invoice.totalAmount || (nonTaxTotal + taxableTotal + vatTotal);

    const sumX = leftMargin + pageWidth - 220;
    const sumW = 220;

    const summaryRows = [
      { label: 'Non Taxable Amount (SAR)', value: fmtNum(nonTaxTotal), color: SLATE_800, bg: [248, 250, 252] as [number, number, number] },
      { label: 'Taxable Amount (SAR)', value: fmtNum(taxableTotal), color: SLATE_800, bg: [248, 250, 252] as [number, number, number] },
      { label: 'VAT Amount (SAR)', value: fmtNum(vatTotal), color: AMBER_700, bg: WHITE },
    ];

    for (const row of summaryRows) {
      doc.rect(sumX, y, sumW, 16).fill(row.bg).lineWidth(0.5).strokeColor([200, 200, 200]).stroke();
      doc.fontSize(7).fillColor(SLATE_600).font('Helvetica')
        .text(row.label, sumX + 8, y + 4, { width: sumW / 2 });
      doc.fillColor(row.color).font('Helvetica-Bold')
        .text(row.value, sumX + sumW / 2, y + 4, { width: sumW / 2 - 8, align: 'right' });
      y += 16;
    }

    // Grand total row
    doc.rect(sumX, y, sumW, 20).fill(BRAND_BLUE);
    doc.fontSize(8).fillColor(WHITE).font('Helvetica-Bold')
      .text('Total Amount (SAR)', sumX + 8, y + 5, { width: sumW / 2 })
      .text(fmtNum(grandTotal), sumX + sumW / 2, y + 5, { width: sumW / 2 - 8, align: 'right' });
    y += 26;

    // ═══ PAYMENT STATUS ═══
    if ((invoice.paidAmount || 0) > 0 || (invoice.balanceDue || 0) > 0) {
      doc.rect(sumX, y, sumW, 14).fill([239, 246, 255]).lineWidth(0.5).strokeColor([200, 200, 200]).stroke();
      doc.fontSize(7).fillColor([30, 58, 167]).font('Helvetica')
        .text('Paid Amount', sumX + 8, y + 3, { width: sumW / 2 });
      doc.font('Helvetica-Bold')
        .text(fmtNum(invoice.paidAmount || 0), sumX + sumW / 2, y + 3, { width: sumW / 2 - 8, align: 'right' });
      y += 14;

      doc.rect(sumX, y, sumW, 14).fill([255, 241, 242]).lineWidth(0.5).strokeColor([200, 200, 200]).stroke();
      doc.fontSize(7).fillColor([159, 18, 57]).font('Helvetica')
        .text('Balance Due', sumX + 8, y + 3, { width: sumW / 2 });
      doc.font('Helvetica-Bold')
        .text(fmtNum(invoice.balanceDue || 0), sumX + sumW / 2, y + 3, { width: sumW / 2 - 8, align: 'right' });
      y += 18;
    }

    // ═══ NOTICE ═══
    doc.fontSize(6).fillColor(SLATE_500).font('Helvetica')
      .text('**** Errors or omissions, if any, must be reported within seven (7) days from the date of invoice ****',
        leftMargin, y, { width: pageWidth, align: 'center' });
    y += 14;

    // ═══ BANK DETAILS ═══
    const bankList = banks || [];
    if (bankList.length > 0) {
      const bankColW = pageWidth / Math.min(bankList.length, 2);
      bankList.slice(0, 2).forEach((bank, idx) => {
        const bx = leftMargin + idx * bankColW;
        doc.rect(bx + 2, y, bankColW - 4, 60).lineWidth(0.5).strokeColor([200, 200, 200]).stroke();
        let bY = y + 4;
        doc.fontSize(7).fillColor(BRAND_BLUE).font('Helvetica-Bold')
          .text('Bank Details / بيانات البنك', bx + 8, bY, { width: bankColW - 16, align: 'center' });
        bY += 10;
        doc.fontSize(7).fillColor(SLATE_800).font('Helvetica-Bold')
          .text(bank.bankName || '', bx + 8, bY, { width: bankColW - 16, align: 'center' });
        bY += 9;
        doc.fillColor(SLATE_600).font('Helvetica')
          .text(company.name, bx + 8, bY, { width: bankColW - 16, align: 'center' });
        bY += 9;
        if (bank.accountNumber) { doc.text(`A/C No: ${bank.accountNumber}`, bx + 8, bY, { width: bankColW - 16, align: 'center' }); bY += 9; }
        if (bank.ibanNumber) { doc.text(`IBAN: ${bank.ibanNumber}`, bx + 8, bY, { width: bankColW - 16, align: 'center' }); bY += 9; }
        if (bank.swiftCode) { doc.text(`SWIFT: ${bank.swiftCode}`, bx + 8, bY, { width: bankColW - 16, align: 'center' }); }
      });
      y += 66;
    }

    // ═══ ZATCA QR + SIGNATURES ═══
    doc.moveTo(leftMargin, y).lineTo(leftMargin + pageWidth, y).lineWidth(1.5).strokeColor(BRAND_BLUE).stroke();
    y += 8;

    // QR Code
    if (qrPngBuffer) {
      doc.image(qrPngBuffer, leftMargin, y, { width: 70, height: 70 });
    } else {
      doc.rect(leftMargin, y, 70, 70).lineWidth(1).strokeColor(SLATE_800).stroke();
      doc.fontSize(7).fillColor(SLATE_800).font('Helvetica-Bold')
        .text('ZATCA\nQR CODE\nPHASE 2', leftMargin + 8, y + 20, { width: 54, align: 'center' });
    }

    // ZATCA info
    const zatcaX = leftMargin + 80;
    doc.fontSize(8).fillColor(BRAND_BLUE).font('Helvetica-Bold')
      .text('ZATCA Phase 2 Compliant', zatcaX, y + 2);
    doc.fontSize(7).fillColor(SLATE_500).font('Helvetica')
      .text(`Status: ${invoice.zatcaStatus || 'Due'}`, zatcaX, y + 14);
    if (invoice.zatcaUuid) {
      doc.fontSize(6).fillColor(SLATE_500).text(`UUID: ${invoice.zatcaUuid}`, zatcaX, y + 24);
    }
    if (invoice.zatcaHash) {
      doc.fontSize(6).fillColor(SLATE_500).text(`HASH: ${invoice.zatcaHash}`, zatcaX, y + 34);
    }
    if (invoice.zatcaClearanceId) {
      doc.fontSize(6).fillColor([16, 185, 129]).text(`CLEARANCE: ${invoice.zatcaClearanceId}`, zatcaX, y + 44);
    }

    // Signature lines
    const sigY = y + 5;
    const sigX1 = leftMargin + pageWidth - 190;
    const sigX2 = leftMargin + pageWidth - 85;

    doc.moveTo(sigX1, sigY + 40).lineTo(sigX1 + 80, sigY + 40).lineWidth(1).strokeColor(SLATE_500).stroke();
    doc.fontSize(6).fillColor(SLATE_500).font('Helvetica')
      .text('Authorized Signature', sigX1, sigY + 43, { width: 80, align: 'center' });

    doc.moveTo(sigX2, sigY + 40).lineTo(sigX2 + 80, sigY + 40).lineWidth(1).strokeColor(SLATE_500).stroke();
    doc.fontSize(6).fillColor(SLATE_500).font('Helvetica')
      .text('Customer Stamp', sigX2, sigY + 43, { width: 80, align: 'center' });

    y += 78;

    // ═══ FOOTER ═══
    const footerY = doc.page.height - doc.page.margins.bottom - 40;
    if (y < footerY) {
      doc.rect(0, footerY, doc.page.width, 40).fill(BRAND_BLUE);
      doc.fontSize(7).fillColor(WHITE).font('Helvetica-Bold')
        .text(`Tel: ${company.phone1 || ''} | ${company.phone2 || ''}`, 0, footerY + 6, { width: doc.page.width, align: 'center' });
      doc.fontSize(6).fillColor(WHITE).font('Helvetica')
        .text(company.address, 0, footerY + 18, { width: doc.page.width, align: 'center' });
      if (company.addressAr) {
        doc.text(company.addressAr, 0, footerY + 28, { width: doc.page.width, align: 'center' });
      }
    }

    doc.end();

    stream.on('finish', () => {
      resolve({ filePath, fileName });
    });
    stream.on('error', reject);
  });
}

export { PDF_DIR };
