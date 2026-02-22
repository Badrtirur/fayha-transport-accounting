// FAYHA TRANSPORTATION - Invoice Controller (AR)
import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { generateNumber } from '../utils/helpers';
import { config } from '../config';

export const invoiceController = {
  // GET /api/v1/invoices
  async getAll(req: AuthRequest, res: Response) {
    try {
      const { status, customerId, startDate, endDate, page = 1, limit = 50 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (status) where.status = status;
      if (customerId) where.customerId = customerId;
      if (startDate || endDate) {
        where.issueDate = {
          ...(startDate && { gte: new Date(startDate as string) }),
          ...(endDate && { lte: new Date(endDate as string) }),
        };
      }

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          include: {
            customer: { select: { code: true, name: true } },
            lineItems: true,
            _count: { select: { payments: true } }
          },
          orderBy: { issueDate: 'desc' },
          skip, take: Number(limit),
        }),
        prisma.invoice.count({ where }),
      ]);

      res.json({ success: true, data: invoices, meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/v1/invoices/:id
  async getById(req: AuthRequest, res: Response) {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: req.params.id },
        include: {
          customer: true,
          lineItems: { orderBy: { lineNumber: 'asc' } },
          payments: { include: { bankAccount: { select: { bankName: true } } } },
          journalEntry: { include: { lines: { include: { account: { select: { code: true, name: true } } } } } },
        }
      });

      if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
      res.json({ success: true, data: invoice });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // POST /api/v1/invoices
  // Auto-creates journal entry: DR Accounts Receivable, CR Revenue, CR VAT Output
  async create(req: AuthRequest, res: Response) {
    try {
      const { customerId, issueDate, dueDate, description, lineItems, notes, paymentTermDays } = req.body;

      const vatRate = config.accounting.vatRate;
      let subtotal = 0;

      const processedLines = lineItems.map((item: any, i: number) => {
        const amount = Number(item.quantity) * Number(item.unitPrice);
        const itemVat = amount * vatRate;
        subtotal += amount;
        return {
          lineNumber: i + 1,
          description: item.description,
          serviceType: item.serviceType,
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
      const invoiceNumber = await generateNumber('INVOICE', 'INV');
      const userId = req.user?.id;

      const invoice = await prisma.$transaction(async (tx) => {
        // Create the invoice
        const inv = await tx.invoice.create({
          data: {
            invoiceNumber,
            customerId,
            issueDate: new Date(issueDate),
            dueDate: new Date(dueDate),
            description,
            subtotal,
            vatRate,
            vatAmount,
            totalAmount,
            balanceDue: totalAmount,
            paymentTermDays: paymentTermDays || 30,
            status: 'DRAFT',
            notes,
            lineItems: { create: processedLines }
          },
          include: { customer: true, lineItems: true }
        });

        // Update customer total
        await tx.customer.update({
          where: { id: customerId },
          data: {
            totalInvoiced: { increment: totalAmount },
            outstandingBalance: { increment: totalAmount },
          }
        });

        // Auto-create Journal Entry for accounting trail
        if (userId && totalAmount > 0) {
          // Find Accounts Receivable account (DR side)
          const arAccount = await tx.account.findFirst({
            where: {
              OR: [
                { subType: 'Accounts Receivable' },
                { name: { contains: 'Accounts Receivable' } },
                { name: { contains: 'Receivable' } },
                { code: { startsWith: '1100' } },
              ],
              isActive: true,
            },
          });

          // Find Revenue account (CR side)
          const revenueAccount = await tx.account.findFirst({
            where: {
              OR: [
                { type: 'REVENUE' },
                { name: { contains: 'Revenue' } },
                { name: { contains: 'Sales' } },
              ],
              isActive: true,
            },
          });

          // Find VAT Output/Payable account (CR side for VAT)
          let vatAccount: any = null;
          if (vatAmount > 0) {
            vatAccount = await tx.account.findFirst({
              where: {
                OR: [
                  { name: { contains: 'VAT Payable' } },
                  { name: { contains: 'VAT Output' } },
                  { name: { contains: 'Output Tax' } },
                ],
                isActive: true,
              },
            });
          }

          if (arAccount && revenueAccount) {
            // Generate journal entry number
            const jYear = new Date().getFullYear();
            const jPrefix = `JE-INV-${jYear}-`;
            const lastJE = await tx.journalEntry.findFirst({
              where: { entryNumber: { startsWith: jPrefix } },
              orderBy: { entryNumber: 'desc' },
            });
            let jSeq = 1;
            if (lastJE) {
              const n = parseInt(lastJE.entryNumber.replace(jPrefix, ''), 10);
              if (!isNaN(n)) jSeq = n + 1;
            }
            const entryNumber = `${jPrefix}${String(jSeq).padStart(4, '0')}`;

            // Build journal lines
            const journalLines: any[] = [
              {
                lineNumber: 1,
                accountId: arAccount.id,
                description: `Accounts Receivable - ${inv.customer?.name || ''} - ${invoiceNumber}`,
                debitAmount: totalAmount,
                creditAmount: 0,
                customerId,
              },
            ];

            if (vatAccount && vatAmount > 0) {
              journalLines.push({
                lineNumber: 2,
                accountId: revenueAccount.id,
                description: `Revenue - ${invoiceNumber}`,
                debitAmount: 0,
                creditAmount: subtotal,
              });
              journalLines.push({
                lineNumber: 3,
                accountId: vatAccount.id,
                description: `VAT Output 15% - ${invoiceNumber}`,
                debitAmount: 0,
                creditAmount: vatAmount,
              });
            } else {
              journalLines.push({
                lineNumber: 2,
                accountId: revenueAccount.id,
                description: `Revenue - ${invoiceNumber}`,
                debitAmount: 0,
                creditAmount: totalAmount,
              });
            }

            const je = await tx.journalEntry.create({
              data: {
                entryNumber,
                date: new Date(issueDate),
                description: `Invoice: ${invoiceNumber} - ${inv.customer?.name || ''}`,
                reference: invoiceNumber,
                referenceType: 'INVOICE',
                totalDebit: totalAmount,
                totalCredit: totalAmount,
                status: 'POSTED',
                createdById: userId,
                postedAt: new Date(),
                notes: JSON.stringify({ invoiceId: inv.id, customerId }),
                lines: { create: journalLines },
              },
            });

            // Link journal entry to invoice
            await tx.invoice.update({
              where: { id: inv.id },
              data: { journalEntryId: je.id },
            });

            // Update account balances
            await tx.account.update({
              where: { id: arAccount.id },
              data: { currentBalance: { increment: totalAmount } },
            });
            await tx.account.update({
              where: { id: revenueAccount.id },
              data: { currentBalance: { increment: vatAccount ? subtotal : totalAmount } },
            });
            if (vatAccount && vatAmount > 0) {
              await tx.account.update({
                where: { id: vatAccount.id },
                data: { currentBalance: { increment: vatAmount } },
              });
            }
          }
        }

        return inv;
      });

      res.status(201).json({ success: true, data: invoice });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // POST /api/v1/invoices/:id/send
  async sendInvoice(req: AuthRequest, res: Response) {
    try {
      const invoice = await prisma.invoice.update({
        where: { id: req.params.id },
        data: { status: 'SENT' }
      });
      res.json({ success: true, data: invoice, message: 'Invoice sent' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/v1/invoices/aging
  async getAgingReport(req: AuthRequest, res: Response) {
    try {
      const customers = await prisma.customer.findMany({
        where: { isActive: true, outstandingBalance: { gt: 0 } },
        include: {
          invoices: {
            where: { status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE', 'SENT'] } },
            select: { id: true, invoiceNumber: true, dueDate: true, balanceDue: true }
          }
        }
      });

      const now = new Date();
      const agingData = customers.map(customer => {
        const buckets = { current: 0, days30: 0, days60: 0, days90: 0, over120: 0, total: 0 };

        customer.invoices.forEach(inv => {
          const daysPast = Math.floor((now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24));
          const balance = Number(inv.balanceDue);

          if (daysPast <= 0) buckets.current += balance;
          else if (daysPast <= 30) buckets.days30 += balance;
          else if (daysPast <= 60) buckets.days60 += balance;
          else if (daysPast <= 90) buckets.days90 += balance;
          else buckets.over120 += balance;

          buckets.total += balance;
        });

        return {
          id: customer.id,
          code: customer.code,
          name: customer.name,
          buckets,
        };
      });

      res.json({ success: true, data: agingData });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
