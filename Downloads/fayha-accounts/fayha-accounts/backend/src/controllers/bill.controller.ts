// FAYHA TRANSPORTATION - Bill Controller (AP)
import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { generateNumber } from '../utils/helpers';
import { config } from '../config';

export const billController = {
  // GET /api/v1/bills
  async getAll(req: AuthRequest, res: Response) {
    try {
      const { status, vendorId, page = 1, limit = 50 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);
      const where: any = {};
      if (status) where.status = status;
      if (vendorId) where.vendorId = vendorId;

      const [bills, total] = await Promise.all([
        prisma.bill.findMany({
          where,
          include: {
            vendor: { select: { code: true, name: true } },
            lineItems: true,
            _count: { select: { payments: true } }
          },
          orderBy: { billDate: 'desc' },
          skip, take: Number(limit),
        }),
        prisma.bill.count({ where }),
      ]);
      res.json({ success: true, data: bills, meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/v1/bills/:id
  async getById(req: AuthRequest, res: Response) {
    try {
      const bill = await prisma.bill.findUnique({
        where: { id: req.params.id },
        include: {
          vendor: true,
          lineItems: { orderBy: { lineNumber: 'asc' } },
          payments: { include: { bankAccount: { select: { bankName: true } } } },
        }
      });
      if (!bill) return res.status(404).json({ success: false, error: 'Bill not found' });
      res.json({ success: true, data: bill });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // POST /api/v1/bills
  async create(req: AuthRequest, res: Response) {
    try {
      const { vendorId, vendorBillRef, billDate, dueDate, description, lineItems, notes } = req.body;
      const vatRate = config.accounting.vatRate;
      let subtotal = 0;

      const processedLines = lineItems.map((item: any, i: number) => {
        const amount = Number(item.quantity) * Number(item.unitPrice);
        const itemVat = amount * vatRate;
        subtotal += amount;
        return {
          lineNumber: i + 1,
          description: item.description,
          expenseType: item.expenseType,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount,
          vatRate,
          vatAmount: itemVat,
          totalAmount: amount + itemVat,
          accountId: item.accountId,
        };
      });

      const vatAmount = subtotal * vatRate;
      const totalAmount = subtotal + vatAmount;
      const billNumber = await generateNumber('BILL', 'BILL');

      const bill = await prisma.$transaction(async (tx) => {
        const bill = await tx.bill.create({
          data: {
            billNumber, vendorId, vendorBillRef,
            billDate: new Date(billDate),
            dueDate: new Date(dueDate),
            description, subtotal, vatRate, vatAmount, totalAmount,
            balanceDue: totalAmount, status: 'UNPAID', notes,
            lineItems: { create: processedLines }
          },
          include: { vendor: true, lineItems: true }
        });

        await tx.vendor.update({
          where: { id: vendorId },
          data: {
            totalBilled: { increment: totalAmount },
            outstandingBalance: { increment: totalAmount },
          }
        });

        // Auto-create Journal Entry: DR Expense, CR Accounts Payable
        const userId = req.user?.id;
        if (userId && totalAmount > 0) {
          const apAccount = await tx.account.findFirst({
            where: { OR: [{ subType: 'Accounts Payable' }, { name: { contains: 'Accounts Payable' } }], isActive: true },
          });

          // Use first line item's accountId or find a general expense account
          let expenseAccountId: string | null = processedLines[0]?.accountId || null;
          if (!expenseAccountId) {
            const expAcct = await tx.account.findFirst({
              where: { type: 'EXPENSE', isActive: true },
            });
            expenseAccountId = expAcct?.id || null;
          }

          if (apAccount && expenseAccountId) {
            const jYear = new Date().getFullYear();
            const jPrefix = `JE-BILL-${jYear}-`;
            const lastJE = await tx.journalEntry.findFirst({
              where: { entryNumber: { startsWith: jPrefix } },
              orderBy: { entryNumber: 'desc' },
            });
            const jSeq = (lastJE ? parseInt(lastJE.entryNumber.replace(jPrefix, ''), 10) : 0) + 1;

            const journalLines: any[] = [
              { lineNumber: 1, accountId: expenseAccountId, description: `Expense - ${description || bill.billNumber}`, debitAmount: subtotal, creditAmount: 0, vendorId },
              { lineNumber: 2, accountId: apAccount.id, description: `AP - ${bill.vendor?.name || vendorId}`, debitAmount: 0, creditAmount: totalAmount, vendorId },
            ];

            // Add VAT line if applicable
            if (vatAmount > 0) {
              const vatAccount = await tx.account.findFirst({
                where: { OR: [{ name: { contains: 'VAT Input' } }, { name: { contains: 'Input Tax' } }], isActive: true },
              });
              if (vatAccount) {
                journalLines.push({ lineNumber: 3, accountId: vatAccount.id, description: 'VAT Input 15%', debitAmount: vatAmount, creditAmount: 0 });
              }
            }

            await tx.journalEntry.create({
              data: {
                entryNumber: `${jPrefix}${String(jSeq).padStart(4, '0')}`,
                date: new Date(billDate),
                description: `Vendor Bill: ${bill.billNumber} - ${bill.vendor?.name || ''}`,
                reference: bill.billNumber,
                referenceType: 'PURCHASE_BILL',
                totalDebit: totalAmount,
                totalCredit: totalAmount,
                status: 'POSTED',
                createdById: userId,
                postedAt: new Date(),
                lines: { create: journalLines },
              },
            });

            // Update account balances
            await tx.account.update({ where: { id: expenseAccountId }, data: { currentBalance: { increment: subtotal } } });
            await tx.account.update({ where: { id: apAccount.id }, data: { currentBalance: { increment: totalAmount } } });
            if (vatAmount > 0) {
              const vatAcct = await tx.account.findFirst({ where: { OR: [{ name: { contains: 'VAT Input' } }, { name: { contains: 'Input Tax' } }], isActive: true } });
              if (vatAcct) await tx.account.update({ where: { id: vatAcct.id }, data: { currentBalance: { increment: vatAmount } } });
            }
          }
        }

        return bill;
      });

      res.status(201).json({ success: true, data: bill });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/v1/bills/aging
  async getAgingReport(req: AuthRequest, res: Response) {
    try {
      const vendors = await prisma.vendor.findMany({
        where: { isActive: true, outstandingBalance: { gt: 0 } },
        include: {
          bills: {
            where: { status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } },
            select: { id: true, billNumber: true, dueDate: true, balanceDue: true }
          }
        }
      });

      const now = new Date();
      const agingData = vendors.map(vendor => {
        const buckets = { current: 0, days30: 0, days60: 0, days90: 0, over120: 0, total: 0 };
        vendor.bills.forEach(bill => {
          const daysPast = Math.floor((now.getTime() - bill.dueDate.getTime()) / (86400000));
          const balance = Number(bill.balanceDue);
          if (daysPast <= 0) buckets.current += balance;
          else if (daysPast <= 30) buckets.days30 += balance;
          else if (daysPast <= 60) buckets.days60 += balance;
          else if (daysPast <= 90) buckets.days90 += balance;
          else buckets.over120 += balance;
          buckets.total += balance;
        });
        return { id: vendor.id, code: vendor.code, name: vendor.name, buckets };
      });

      res.json({ success: true, data: agingData });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
