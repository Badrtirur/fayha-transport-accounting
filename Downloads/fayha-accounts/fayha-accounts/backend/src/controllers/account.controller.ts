// FAYHA TRANSPORTATION - Chart of Accounts Controller
import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../types';

export const accountController = {
  // GET /api/v1/accounts
  async getAll(req: AuthRequest, res: Response) {
    try {
      const { type, subType, isActive, search } = req.query;

      const where: any = {};
      if (type) where.type = type;
      if (subType) where.subType = subType;
      if (isActive !== undefined) where.isActive = isActive === 'true';
      if (search) {
        where.OR = [
          { code: { contains: search as string } },
          { name: { contains: search as string } },
        ];
      }

      const accounts = await prisma.account.findMany({
        where,
        include: { parent: { select: { code: true, name: true } }, bank: { select: { bankName: true } } },
        orderBy: { code: 'asc' }
      });

      res.json({ success: true, data: accounts });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/v1/accounts/:id
  async getById(req: AuthRequest, res: Response) {
    try {
      const account = await prisma.account.findUnique({
        where: { id: req.params.id },
        include: {
          parent: true,
          children: { select: { id: true, code: true, name: true } },
          bank: true,
        }
      });

      if (!account) {
        return res.status(404).json({ success: false, error: 'Account not found' });
      }

      res.json({ success: true, data: account });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // POST /api/v1/accounts
  async create(req: AuthRequest, res: Response) {
    try {
      const { code, name, nameAr, type, subType, description, parentId, openingBalance, isBankAccount } = req.body;

      const existing = await prisma.account.findUnique({ where: { code } });
      if (existing) {
        return res.status(400).json({ success: false, error: 'Account code already exists' });
      }

      const account = await prisma.account.create({
        data: {
          code, name, nameAr, type, subType, description, parentId,
          openingBalance: openingBalance || 0,
          currentBalance: openingBalance || 0,
          isBankAccount: isBankAccount || false,
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'CREATE',
          entityType: 'Account',
          entityId: account.id,
          newData: account as any,
        }
      });

      res.status(201).json({ success: true, data: account });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // PUT /api/v1/accounts/:id
  async update(req: AuthRequest, res: Response) {
    try {
      const { name, nameAr, description, parentId, isActive, openingBalance, currentBalance } = req.body;

      const account = await prisma.account.findUnique({ where: { id: req.params.id } });
      if (!account) {
        return res.status(404).json({ success: false, error: 'Account not found' });
      }

      const data: any = {};
      if (name !== undefined) data.name = name;
      if (nameAr !== undefined) data.nameAr = nameAr;
      if (description !== undefined) data.description = description;
      if (parentId !== undefined) data.parentId = parentId;
      if (isActive !== undefined) data.isActive = isActive;
      if (openingBalance !== undefined) data.openingBalance = openingBalance;
      if (currentBalance !== undefined) data.currentBalance = currentBalance;

      const updated = await prisma.account.update({
        where: { id: req.params.id },
        data,
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'UPDATE',
          entityType: 'Account',
          entityId: updated.id,
          oldData: JSON.stringify({ id: account.id, code: account.code, name: account.name, openingBalance: account.openingBalance, currentBalance: account.currentBalance }),
          newData: JSON.stringify({ id: updated.id, code: updated.code, name: updated.name, openingBalance: updated.openingBalance, currentBalance: updated.currentBalance }),
        }
      });

      res.json({ success: true, data: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/v1/accounts/:id/ledger
  async getLedger(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const accountId = req.params.id;

      const account = await prisma.account.findUnique({ where: { id: accountId } });
      if (!account) {
        return res.status(404).json({ success: false, error: 'Account not found' });
      }

      const where: any = { accountId };
      if (startDate || endDate) {
        where.journalEntry = {
          date: {
            ...(startDate && { gte: new Date(startDate as string) }),
            ...(endDate && { lte: new Date(endDate as string) }),
          }
        };
      }

      const entries = await prisma.journalLine.findMany({
        where,
        include: {
          journalEntry: {
            select: { entryNumber: true, date: true, description: true, reference: true, status: true }
          }
        },
        orderBy: { journalEntry: { date: 'asc' } }
      });

      res.json({
        success: true,
        data: {
          account,
          entries,
          openingBalance: Number(account.openingBalance),
          currentBalance: Number(account.currentBalance),
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/v1/accounts/trial-balance
  // Calculates balances from JournalLine sums (POSTED entries only) for accuracy
  async getTrialBalance(req: AuthRequest, res: Response) {
    try {
      const accounts = await prisma.account.findMany({
        where: { isActive: true },
        orderBy: { code: 'asc' },
      });

      // Aggregate all POSTED journal line totals per account
      const lineTotals = await prisma.journalLine.groupBy({
        by: ['accountId'],
        where: {
          journalEntry: { status: 'POSTED' },
        },
        _sum: {
          debitAmount: true,
          creditAmount: true,
        },
      });

      // Build a map of accountId -> { totalDebit, totalCredit }
      const lineMap: Record<string, { totalDebit: number; totalCredit: number }> = {};
      for (const lt of lineTotals) {
        lineMap[lt.accountId] = {
          totalDebit: lt._sum.debitAmount || 0,
          totalCredit: lt._sum.creditAmount || 0,
        };
      }

      let totalDebits = 0;
      let totalCredits = 0;

      const rows = accounts.map(acc => {
        const sums = lineMap[acc.id] || { totalDebit: 0, totalCredit: 0 };
        const openingBal = Number(acc.openingBalance) || 0;
        const isNormalDebit = ['ASSET', 'EXPENSE'].includes((acc.type || '').toUpperCase());

        // Net balance = opening + journal activity
        let netBalance: number;
        if (isNormalDebit) {
          netBalance = openingBal + sums.totalDebit - sums.totalCredit;
        } else {
          netBalance = openingBal + sums.totalCredit - sums.totalDebit;
        }

        let debit = 0, credit = 0;
        if (isNormalDebit) {
          if (netBalance >= 0) debit = netBalance; else credit = Math.abs(netBalance);
        } else {
          if (netBalance >= 0) credit = netBalance; else debit = Math.abs(netBalance);
        }

        totalDebits += debit;
        totalCredits += credit;

        return {
          accountCode: acc.code,
          accountName: acc.name,
          accountType: acc.type,
          debit,
          credit,
        };
      });

      // Filter out accounts with zero balances for cleaner view
      const nonZeroRows = rows.filter(r => r.debit > 0.001 || r.credit > 0.001);

      res.json({
        success: true,
        data: {
          accounts: nonZeroRows.length > 0 ? nonZeroRows : rows,
          totalDebits,
          totalCredits,
          isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
