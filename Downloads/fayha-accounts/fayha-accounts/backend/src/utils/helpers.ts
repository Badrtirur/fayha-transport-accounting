// FAYHA TRANSPORTATION - Utility Helpers
import prisma from '../config/database';

/**
 * Generate sequential document number
 * e.g., "INV-2026-0001", "BILL-2026-0001"
 */
export async function generateNumber(counterName: string, prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const counter = await prisma.counter.upsert({
      where: { name_year: { name: counterName, year } },
      update: { value: { increment: 1 } },
      create: { name: counterName, prefix, value: 1, year },
    });

    const generated = `${prefix}-${year}-${String(counter.value).padStart(4, '0')}`;

    // Check if this number already exists in the target table to avoid unique constraint errors
    const exists = await checkNumberExists(counterName, generated);
    if (!exists) {
      return generated;
    }
    // Number already exists — loop will increment counter again
  }

  // Fallback: append timestamp to guarantee uniqueness
  const ts = Date.now().toString(36);
  const counter = await prisma.counter.upsert({
    where: { name_year: { name: counterName, year } },
    update: { value: { increment: 1 } },
    create: { name: counterName, prefix, value: 1, year },
  });
  return `${prefix}-${year}-${String(counter.value).padStart(4, '0')}-${ts}`;
}

async function checkNumberExists(counterName: string, value: string): Promise<boolean> {
  try {
    const tableMap: Record<string, () => Promise<boolean>> = {
      JOB_REFERENCE: async () => !!(await prisma.jobReference.findFirst({ where: { jobNumber: value } })),
      INVOICE: async () => !!(await prisma.invoice.findFirst({ where: { invoiceNumber: value } })),
      SALES_INVOICE: async () => !!(await prisma.salesInvoice.findFirst({ where: { invoiceNumber: value } })),
      BILL: async () => !!(await prisma.bill.findFirst({ where: { billNumber: value } })),
      PAYMENT: async () => !!(await prisma.payment.findFirst({ where: { paymentNumber: value } })),
      JOURNAL: async () => !!(await prisma.journalEntry.findFirst({ where: { entryNumber: value } })),
      CLIENT_ADVANCE: async () => !!(await prisma.clientAdvance.findFirst({ where: { advanceNumber: value } })),
      EXPENSE_ENTRY: async () => !!(await prisma.expenseEntry.findFirst({ where: { expenseNumber: value } })),
      PAYABLE_EXPENSE: async () => !!(await prisma.payableExpense.findFirst({ where: { expenseNumber: value } })),
      PAYMENT_ENTRY: async () => !!(await prisma.payableExpense.findFirst({ where: { expenseNumber: value } })),
      RCV_VOUCHER: async () => !!(await prisma.rcvPvc.findFirst({ where: { voucherNo: value } })),
      PVC_VOUCHER: async () => !!(await prisma.rcvPvc.findFirst({ where: { voucherNo: value } })),
    };
    const checker = tableMap[counterName];
    if (!checker) return false;
    return checker();
  } catch {
    return false;
  }
}

/**
 * Format currency (SAR)
 */
export function formatCurrency(amount: number): string {
  return `SAR ${Math.abs(amount).toLocaleString('en-SA', { minimumFractionDigits: 2 })}`;
}

/**
 * Calculate days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  return Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
}
