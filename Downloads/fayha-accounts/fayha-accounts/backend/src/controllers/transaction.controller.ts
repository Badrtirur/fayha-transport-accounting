// ==========================================
// FAYHA TRANSPORTATION - Transaction History Controller
// Unified transaction view from JournalEntry (single source of truth)
// ==========================================

import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../types';

// Direction classification based on referenceType
const IN_TYPES = new Set([
  'RCV',
  'PAYMENT_RECEIVED',
  'CLIENT_ADVANCE',
  'SALES_INVOICE',
  'BANK_DEPOSIT',
  'INVOICE',
]);

const OUT_TYPES = new Set([
  'PVC',
  'PAYMENT',
  'EXPENSE_ENTRY',
  'EXPENSE',
  'PAYABLE_EXPENSE',
  'PURCHASE_BILL',
  'BILL',
  'SALARY',
  'PAYMENT_ENTRY',
]);

function getDirection(referenceType: string): 'IN' | 'OUT' | 'NEUTRAL' {
  if (IN_TYPES.has(referenceType)) return 'IN';
  if (OUT_TYPES.has(referenceType)) return 'OUT';
  return 'NEUTRAL';
}

export const transactionController = {
  /**
   * GET /transactions
   * Single source: JournalEntry (POSTED) mapped to unified records
   */
  async getAll(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate, type, page = 1, limit = 100 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      // Build date filter
      const dateFilter: any = {};
      if (startDate) dateFilter.gte = new Date(startDate as string);
      if (endDate) dateFilter.lte = new Date(endDate as string);

      // Fetch posted journal entries
      const journalWhere: any = { status: 'POSTED' };
      if (startDate || endDate) journalWhere.date = dateFilter;

      const journalEntries = await prisma.journalEntry.findMany({
        where: journalWhere,
        include: {
          lines: {
            include: {
              account: { select: { code: true, name: true } },
              customer: { select: { name: true } },
              vendor: { select: { name: true } },
            },
          },
        },
        orderBy: { date: 'desc' },
      });

      // Map journal entries to unified format
      let allTxns = journalEntries.map((je: any) => {
        const refType = je.referenceType || 'JOURNAL';

        // Sum debits and credits from journal lines
        let debit = 0;
        let credit = 0;
        for (const line of (je.lines || [])) {
          debit += Number(line.debitAmount || 0);
          credit += Number(line.creditAmount || 0);
        }

        // Collect related entity names from lines
        const entityNames = new Set<string>();
        for (const line of (je.lines || [])) {
          if (line.customer?.name) entityNames.add(line.customer.name);
          if (line.vendor?.name) entityNames.add(line.vendor.name);
        }

        return {
          id: je.id,
          date: je.date,
          type: refType,
          reference: je.referenceNumber || je.reference || je.entryNumber,
          description: je.description,
          debit,
          credit,
          balance: 0,
          relatedEntity: Array.from(entityNames).join(', '),
          source: 'JOURNAL' as const,
          status: je.status,
          direction: getDirection(refType),
        };
      });

      // Filter by type if specified
      if (type) {
        allTxns = allTxns.filter((t) => t.type === type);
      }

      // Calculate running balance (cumulative debit - credit, oldest first)
      let runningBalance = 0;
      for (let i = allTxns.length - 1; i >= 0; i--) {
        runningBalance += allTxns[i].debit - allTxns[i].credit;
        allTxns[i].balance = runningBalance;
      }

      const total = allTxns.length;
      const paged = allTxns.slice(skip, skip + Number(limit));

      res.json({
        success: true,
        data: paged,
        meta: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * GET /transactions/entity/:entityId
   * Filter transactions by customerId or vendorId in journal lines
   */
  async getByEntity(req: AuthRequest, res: Response) {
    try {
      const { entityId } = req.params;
      const { startDate, endDate } = req.query;

      const dateFilter: any = {};
      if (startDate) dateFilter.gte = new Date(startDate as string);
      if (endDate) dateFilter.lte = new Date(endDate as string);

      // Find journal entries that have lines referencing this entity
      const journalEntries = await prisma.journalEntry.findMany({
        where: {
          status: 'POSTED',
          ...(startDate || endDate ? { date: dateFilter } : {}),
          lines: {
            some: {
              OR: [
                { customerId: entityId },
                { vendorId: entityId },
              ],
            },
          },
        },
        include: {
          lines: {
            include: {
              account: { select: { code: true, name: true } },
              customer: { select: { name: true } },
              vendor: { select: { name: true } },
            },
          },
        },
        orderBy: { date: 'desc' },
      });

      const transactions = journalEntries.map((je: any) => {
        const refType = je.referenceType || 'JOURNAL';

        // Sum debits/credits only for lines matching this entity
        let debit = 0;
        let credit = 0;
        for (const line of je.lines) {
          if (line.customerId === entityId || line.vendorId === entityId) {
            debit += Number(line.debitAmount || 0);
            credit += Number(line.creditAmount || 0);
          }
        }

        // Collect related entity names
        const entityNames = new Set<string>();
        for (const line of (je.lines || [])) {
          if (line.customer?.name) entityNames.add(line.customer.name);
          if (line.vendor?.name) entityNames.add(line.vendor.name);
        }

        return {
          id: je.id,
          date: je.date,
          type: refType,
          reference: je.referenceNumber || je.reference || je.entryNumber,
          description: je.description,
          debit,
          credit,
          balance: 0,
          relatedEntity: Array.from(entityNames).join(', '),
          source: 'JOURNAL' as const,
          status: je.status,
          direction: getDirection(refType),
        };
      });

      // Calculate running balance
      let runningBalance = 0;
      for (let i = transactions.length - 1; i >= 0; i--) {
        runningBalance += transactions[i].debit - transactions[i].credit;
        transactions[i].balance = runningBalance;
      }

      res.json({ success: true, data: transactions });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
