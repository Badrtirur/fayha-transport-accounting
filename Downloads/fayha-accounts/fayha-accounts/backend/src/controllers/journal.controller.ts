// FAYHA TRANSPORTATION - Journal Entry Controller
import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { generateNumber } from '../utils/helpers';

export const journalController = {
  // GET /api/v1/journals
  async getAll(req: AuthRequest, res: Response) {
    try {
      const { status, startDate, endDate, page = 1, limit = 50 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (status) where.status = status;
      if (startDate || endDate) {
        where.date = {
          ...(startDate && { gte: new Date(startDate as string) }),
          ...(endDate && { lte: new Date(endDate as string) }),
        };
      }

      const [entries, total] = await Promise.all([
        prisma.journalEntry.findMany({
          where,
          include: {
            lines: { include: { account: { select: { code: true, name: true, type: true } } } },
            createdBy: { select: { firstName: true, lastName: true } },
            approvedBy: { select: { firstName: true, lastName: true } },
          },
          orderBy: { date: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.journalEntry.count({ where }),
      ]);

      res.json({
        success: true,
        data: entries,
        meta: {
          page: Number(page), limit: Number(limit), total,
          totalPages: Math.ceil(total / Number(limit)),
          hasNext: skip + Number(limit) < total,
          hasPrev: Number(page) > 1,
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/v1/journals/:id
  async getById(req: AuthRequest, res: Response) {
    try {
      const entry = await prisma.journalEntry.findUnique({
        where: { id: req.params.id },
        include: {
          lines: {
            include: {
              account: { select: { code: true, name: true, type: true } },
              customer: { select: { code: true, name: true } },
              vendor: { select: { code: true, name: true } },
            },
            orderBy: { lineNumber: 'asc' }
          },
          createdBy: { select: { firstName: true, lastName: true, email: true } },
          approvedBy: { select: { firstName: true, lastName: true } },
          fiscalPeriod: true,
        }
      });

      if (!entry) return res.status(404).json({ success: false, error: 'Journal entry not found' });

      res.json({ success: true, data: entry });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // POST /api/v1/journals
  async create(req: AuthRequest, res: Response) {
    try {
      const { date, description, reference, referenceType, entryType, lines, notes } = req.body;

      // Validate debits = credits
      let totalDebit = 0, totalCredit = 0;
      for (const line of lines) {
        totalDebit += Number(line.debitAmount || 0);
        totalCredit += Number(line.creditAmount || 0);
      }

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return res.status(400).json({
          success: false,
          error: `Debits (${totalDebit}) must equal Credits (${totalCredit})`
        });
      }

      const entryNumber = await generateNumber('JOURNAL', 'JE');

      const entry = await prisma.journalEntry.create({
        data: {
          entryNumber,
          entryType: entryType || 'Journal',
          date: new Date(date),
          description,
          reference,
          referenceType,
          totalDebit,
          totalCredit,
          status: 'DRAFT',
          createdById: req.user!.id,
          notes,
          lines: {
            create: lines.map((line: any, index: number) => ({
              lineNumber: index + 1,
              accountId: line.accountId,
              description: line.description,
              debitAmount: line.debitAmount || 0,
              creditAmount: line.creditAmount || 0,
              customerId: line.customerId,
              vendorId: line.vendorId,
              costCenter: line.costCenter,
              department: line.department,
            }))
          }
        },
        include: {
          lines: { include: { account: { select: { code: true, name: true } } } }
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user!.id, action: 'CREATE',
          entityType: 'JournalEntry', entityId: entry.id,
        }
      });

      res.status(201).json({ success: true, data: entry });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // POST /api/v1/journals/:id/post
  async postEntry(req: AuthRequest, res: Response) {
    try {
      const entry = await prisma.journalEntry.findUnique({
        where: { id: req.params.id },
        include: { lines: true }
      });

      if (!entry) return res.status(404).json({ success: false, error: 'Not found' });
      if (entry.status === 'POSTED') return res.status(400).json({ success: false, error: 'Already posted' });

      // Update account balances
      for (const line of entry.lines) {
        const account = await prisma.account.findUnique({ where: { id: line.accountId } });
        if (!account) continue;

        const isNormalDebit = ['ASSET', 'EXPENSE'].includes(account.type);
        let balanceChange = 0;

        if (isNormalDebit) {
          balanceChange = Number(line.debitAmount) - Number(line.creditAmount);
        } else {
          balanceChange = Number(line.creditAmount) - Number(line.debitAmount);
        }

        await prisma.account.update({
          where: { id: line.accountId },
          data: { currentBalance: { increment: balanceChange } }
        });
      }

      const updated = await prisma.journalEntry.update({
        where: { id: req.params.id },
        data: {
          status: 'POSTED',
          postedAt: new Date(),
          approvedById: req.user!.id,
          approvedAt: new Date(),
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user!.id, action: 'POST',
          entityType: 'JournalEntry', entityId: entry.id,
        }
      });

      res.json({ success: true, data: updated, message: 'Journal entry posted successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // POST /api/v1/journals/:id/void
  async voidEntry(req: AuthRequest, res: Response) {
    try {
      const { reason } = req.body;
      const entry = await prisma.journalEntry.findUnique({
        where: { id: req.params.id },
        include: { lines: true }
      });

      if (!entry) return res.status(404).json({ success: false, error: 'Not found' });
      if (entry.status !== 'POSTED') return res.status(400).json({ success: false, error: 'Can only void posted entries' });

      // Reverse account balances
      for (const line of entry.lines) {
        const account = await prisma.account.findUnique({ where: { id: line.accountId } });
        if (!account) continue;

        const isNormalDebit = ['ASSET', 'EXPENSE'].includes(account.type);
        let balanceChange = 0;

        if (isNormalDebit) {
          balanceChange = Number(line.creditAmount) - Number(line.debitAmount); // Reverse
        } else {
          balanceChange = Number(line.debitAmount) - Number(line.creditAmount); // Reverse
        }

        await prisma.account.update({
          where: { id: line.accountId },
          data: { currentBalance: { increment: balanceChange } }
        });
      }

      const updated = await prisma.journalEntry.update({
        where: { id: req.params.id },
        data: { status: 'VOIDED', voidedAt: new Date(), voidReason: reason }
      });

      res.json({ success: true, data: updated, message: 'Journal entry voided' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
