// ==========================================
// ZATCA Phase 1 — UUID, TLV QR, SHA-256 Hash
// ==========================================

import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

/**
 * Generate a random UUID v4 for the invoice.
 */
export function generateZatcaUuid(): string {
  return uuidv4();
}

/**
 * Build a ZATCA-compliant TLV (Tag-Length-Value) binary and return it as Base64.
 *
 * Tags:
 *  1 – Seller Name (UTF-8)
 *  2 – VAT Registration Number
 *  3 – Timestamp (ISO-8601)
 *  4 – Invoice Total (with VAT)
 *  5 – VAT Amount
 */
export function buildTlvBase64(
  sellerName: string,
  vatNumber: string,
  timestamp: string,
  totalWithVat: number,
  vatAmount: number,
): string {
  const entries = [
    { tag: 1, value: sellerName },
    { tag: 2, value: vatNumber },
    { tag: 3, value: timestamp },
    { tag: 4, value: totalWithVat.toFixed(2) },
    { tag: 5, value: vatAmount.toFixed(2) },
  ];

  const parts: Buffer[] = [];
  for (const entry of entries) {
    const valueBytes = Buffer.from(entry.value, 'utf-8');
    const tlv = Buffer.alloc(2 + valueBytes.length);
    tlv[0] = entry.tag;
    tlv[1] = valueBytes.length;
    valueBytes.copy(tlv, 2);
    parts.push(tlv);
  }

  return Buffer.concat(parts).toString('base64');
}

/**
 * Compute a SHA-256 hash of the canonical invoice content.
 * Returns a hex-encoded hash string.
 */
export function computeInvoiceHash(invoiceData: {
  invoiceNumber: string;
  issueDate: string | Date;
  totalAmount: number;
  vatAmount: number;
  sellerName: string;
  vatNumber: string;
}): string {
  const canonical = [
    invoiceData.invoiceNumber,
    invoiceData.issueDate instanceof Date
      ? invoiceData.issueDate.toISOString()
      : invoiceData.issueDate,
    invoiceData.totalAmount.toFixed(2),
    invoiceData.vatAmount.toFixed(2),
    invoiceData.sellerName,
    invoiceData.vatNumber,
  ].join('|');

  return createHash('sha256').update(canonical, 'utf-8').digest('hex');
}

/**
 * Orchestrator: generate all ZATCA Phase 1 fields for an invoice.
 */
export function generateZatcaFields(
  invoiceData: {
    invoiceNumber: string;
    issueDate: string | Date;
    totalAmount: number;
    vatAmount: number;
  },
  companyConfig: {
    sellerName: string;
    vatNumber: string;
  },
): {
  zatcaUuid: string;
  zatcaHash: string;
  zatcaQrCode: string;
  zatcaStatus: string;
} {
  const zatcaUuid = generateZatcaUuid();

  const timestamp =
    invoiceData.issueDate instanceof Date
      ? invoiceData.issueDate.toISOString()
      : new Date(invoiceData.issueDate).toISOString();

  const zatcaQrCode = buildTlvBase64(
    companyConfig.sellerName,
    companyConfig.vatNumber,
    timestamp,
    invoiceData.totalAmount,
    invoiceData.vatAmount,
  );

  const zatcaHash = computeInvoiceHash({
    invoiceNumber: invoiceData.invoiceNumber,
    issueDate: invoiceData.issueDate,
    totalAmount: invoiceData.totalAmount,
    vatAmount: invoiceData.vatAmount,
    sellerName: companyConfig.sellerName,
    vatNumber: companyConfig.vatNumber,
  });

  return {
    zatcaUuid,
    zatcaHash,
    zatcaQrCode,
    zatcaStatus: 'Due',
  };
}

// ==========================================
// ZATCA Phase 2 — Simulated Reporting
// ==========================================

/**
 * Simulate a ZATCA reporting/clearance API call.
 * Returns a clearance response after a short delay.
 * ~5% chance of rejection to simulate realistic failures.
 */
export async function simulateZatcaReport(invoice: {
  invoiceNumber: string;
  zatcaUuid?: string;
  zatcaHash?: string;
}): Promise<
  | { success: true; clearanceId: string; clearedAt: Date; signedHash: string }
  | { success: false; error: string }
> {
  // Simulate network delay (1 second)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // ~5% chance of rejection
  if (Math.random() < 0.05) {
    return {
      success: false,
      error: `ZATCA rejected invoice ${invoice.invoiceNumber}: validation error BT-110 total mismatch`,
    };
  }

  const clearanceId = `CLR-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const clearedAt = new Date();
  const signedHash = createHash('sha256')
    .update(`${invoice.zatcaHash || ''}|${clearanceId}|${clearedAt.toISOString()}`)
    .digest('hex');

  return {
    success: true,
    clearanceId,
    clearedAt,
    signedHash,
  };
}
