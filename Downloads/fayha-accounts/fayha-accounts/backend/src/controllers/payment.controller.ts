// FAYHA TRANSPORTATION - Payment Controller
import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { generateNumber } from '../utils/helpers';

export const paymentController = {
  // GET /api/v1/payments
  async getAll(req: AuthRequest, res: Response) {
    try {
      const { direction, bankAccountId, page = 1, limit = 50 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);
      const where: any = {};
      if (direction) where.direction = direction;
      if (bankAccountId) where.bankAccountId = bankAccountId;

      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          include: {
            customer: { select: { code: true, name: true } },
            vendor: { select: { code: true, name: true } },
            bankAccount: { select: { code: true, bankName: true } },
            invoice: { select: { invoiceNumber: true } },
            bill: { select: { billNumber: true } },
          },
          orderBy: { paymentDate: 'desc' },
          skip, take: Number(limit),
        }),
        prisma.payment.count({ where }),
      ]);

      res.json({ success: true, data: payments, meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // POST /api/v1/payments/receive  (Customer payment - AR)
  // Wrapped in $transaction for accounting integrity
  async receivePayment(req: AuthRequest, res: Response) {
    try {
      const { customerId, invoiceId, amount, paymentDate, paymentMethod, bankAccountId, chequeNumber, referenceNumber, description } = req.body;

      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

      const paymentAmount = Number(amount);
      if (paymentAmount > Number(invoice.balanceDue)) {
        return res.status(400).json({ success: false, error: 'Payment exceeds balance due' });
      }

      const paymentNumber = await generateNumber('PAYMENT', 'REC');
      const userId = req.user!.id;

      const payment = await prisma.$transaction(async (tx) => {
        const pmt = await tx.payment.create({
          data: {
            paymentNumber, direction: 'INCOMING', customerId, invoiceId,
            amount: paymentAmount, paymentDate: new Date(paymentDate),
            paymentMethod, bankAccountId, chequeNumber, referenceNumber,
            description, processedById: userId,
          }
        });

        // Update invoice
        const newPaid = Number(invoice.paidAmount) + paymentAmount;
        const newBalance = Number(invoice.totalAmount) - newPaid;
        await tx.invoice.update({
          where: { id: invoiceId },
          data: { paidAmount: newPaid, balanceDue: newBalance, status: newBalance <= 0 ? 'PAID' : 'PARTIAL' }
        });

        // Update customer balance
        await tx.customer.update({
          where: { id: customerId },
          data: { totalPaid: { increment: paymentAmount }, outstandingBalance: { decrement: paymentAmount } }
        });

        // Update bank balance
        if (bankAccountId) {
          await tx.bankAccount.update({ where: { id: bankAccountId }, data: { currentBalance: { increment: paymentAmount } } });
          await tx.bankTransaction.create({
            data: {
              bankAccountId, transactionDate: new Date(paymentDate), type: 'CREDIT',
              description: `Payment received - ${paymentNumber}`, reference: invoice.invoiceNumber,
              amount: paymentAmount, documentType: 'RECEIPT', documentRef: paymentNumber,
            }
          });
        }

        // Auto-create Journal Entry: DR Bank/Cash, CR Accounts Receivable
        let debitAccountId: string | null = null;
        if (bankAccountId) {
          const bankAcct = await tx.bankAccount.findUnique({ where: { id: bankAccountId } });
          if (bankAcct?.accountId) debitAccountId = bankAcct.accountId;
          if (!debitAccountId) {
            const linked = await tx.account.findFirst({ where: { bankId: bankAccountId, isActive: true } });
            if (linked) debitAccountId = linked.id;
          }
        }
        if (!debitAccountId) {
          const cashAcct = await tx.account.findFirst({ where: { OR: [{ name: { contains: 'Cash' } }, { subType: 'Cash' }], isActive: true } });
          debitAccountId = cashAcct?.id || null;
        }

        const arAccount = await tx.account.findFirst({
          where: { OR: [{ subType: 'Accounts Receivable' }, { name: { contains: 'Accounts Receivable' } }], isActive: true },
        });

        if (debitAccountId && arAccount) {
          const jYear = new Date().getFullYear();
          const jPrefix = `JE-REC-${jYear}-`;
          const lastJE = await tx.journalEntry.findFirst({ where: { entryNumber: { startsWith: jPrefix } }, orderBy: { entryNumber: 'desc' } });
          const jSeq = (lastJE ? parseInt(lastJE.entryNumber.replace(jPrefix, ''), 10) : 0) + 1;

          const je = await tx.journalEntry.create({
            data: {
              entryNumber: `${jPrefix}${String(jSeq).padStart(4, '0')}`,
              date: new Date(paymentDate),
              description: `Customer Payment: ${paymentNumber} - ${invoice.invoiceNumber}`,
              reference: paymentNumber, referenceType: 'PAYMENT',
              totalDebit: paymentAmount, totalCredit: paymentAmount,
              status: 'POSTED', createdById: userId, postedAt: new Date(),
              lines: { create: [
                { lineNumber: 1, accountId: debitAccountId, description: `Cash/Bank Receipt - ${paymentNumber}`, debitAmount: paymentAmount, creditAmount: 0, customerId },
                { lineNumber: 2, accountId: arAccount.id, description: `AR Reduction - ${invoice.invoiceNumber}`, debitAmount: 0, creditAmount: paymentAmount, customerId },
              ] },
            },
          });

          await tx.account.update({ where: { id: debitAccountId }, data: { currentBalance: { increment: paymentAmount } } });
          await tx.account.update({ where: { id: arAccount.id }, data: { currentBalance: { decrement: paymentAmount } } });
          await tx.payment.update({ where: { id: pmt.id }, data: { journalEntryId: je.id } });
        }

        return pmt;
      });

      res.status(201).json({ success: true, data: payment, message: 'Payment recorded' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // POST /api/v1/payments/disburse  (Vendor payment - AP)
  async disbursePayment(req: AuthRequest, res: Response) {
    try {
      const { vendorId, billId, amount, paymentDate, paymentMethod, bankAccountId, chequeNumber, referenceNumber, description } = req.body;

      const bill = await prisma.bill.findUnique({ where: { id: billId } });
      if (!bill) return res.status(404).json({ success: false, error: 'Bill not found' });

      const paymentAmount = Number(amount);
      if (paymentAmount > Number(bill.balanceDue)) {
        return res.status(400).json({ success: false, error: 'Payment exceeds balance due' });
      }

      const paymentNumber = await generateNumber('PAYMENT', 'PAY');
      const userId = req.user!.id;

      const payment = await prisma.$transaction(async (tx) => {
        const pmt = await tx.payment.create({
          data: {
            paymentNumber,
            direction: 'OUTGOING',
            vendorId,
            billId,
            amount: paymentAmount,
            paymentDate: new Date(paymentDate),
            paymentMethod,
            bankAccountId,
            chequeNumber,
            referenceNumber,
            description,
            processedById: userId,
          }
        });

        // Update bill
        const newPaid = Number(bill.paidAmount) + paymentAmount;
        const newBalance = Number(bill.totalAmount) - newPaid;
        await tx.bill.update({
          where: { id: billId },
          data: {
            paidAmount: newPaid,
            balanceDue: newBalance,
            status: newBalance <= 0 ? 'PAID' : 'PARTIAL',
          }
        });

        // Update vendor balance
        await tx.vendor.update({
          where: { id: vendorId },
          data: {
            totalPaid: { increment: paymentAmount },
            outstandingBalance: { decrement: paymentAmount },
          }
        });

        // Update bank balance
        if (bankAccountId) {
          await tx.bankAccount.update({
            where: { id: bankAccountId },
            data: { currentBalance: { decrement: paymentAmount } }
          });

          await tx.bankTransaction.create({
            data: {
              bankAccountId,
              transactionDate: new Date(paymentDate),
              type: 'DEBIT',
              description: `Payment sent - ${paymentNumber}`,
              reference: bill.billNumber,
              amount: paymentAmount,
              documentType: 'PAYMENT_VOUCHER',
              documentRef: paymentNumber,
            }
          });
        }

        // Auto-create Journal Entry: DR Accounts Payable, CR Bank/Cash
        let creditAccountId: string | null = null;

        if (bankAccountId) {
          const bankAcct = await tx.bankAccount.findUnique({ where: { id: bankAccountId } });
          if (bankAcct?.accountId) creditAccountId = bankAcct.accountId;
          if (!creditAccountId) {
            const linked = await tx.account.findFirst({ where: { bankId: bankAccountId, isActive: true } });
            if (linked) creditAccountId = linked.id;
          }
        }
        if (!creditAccountId) {
          const cashAcct = await tx.account.findFirst({
            where: { OR: [{ name: { contains: 'Cash' } }, { subType: 'Cash' }], isActive: true },
          });
          creditAccountId = cashAcct?.id || null;
        }

        const apAccount = await tx.account.findFirst({
          where: { OR: [{ subType: 'Accounts Payable' }, { name: { contains: 'Accounts Payable' } }], isActive: true },
        });

        if (creditAccountId && apAccount) {
          const jYear = new Date().getFullYear();
          const jPrefix = `JE-PAY-${jYear}-`;
          const lastJE = await tx.journalEntry.findFirst({
            where: { entryNumber: { startsWith: jPrefix } },
            orderBy: { entryNumber: 'desc' },
          });
          const jSeq = (lastJE ? parseInt(lastJE.entryNumber.replace(jPrefix, ''), 10) : 0) + 1;

          const je = await tx.journalEntry.create({
            data: {
              entryNumber: `${jPrefix}${String(jSeq).padStart(4, '0')}`,
              date: new Date(paymentDate),
              description: `Vendor Payment: ${paymentNumber} - ${bill.billNumber}`,
              reference: paymentNumber,
              referenceType: 'PAYMENT',
              totalDebit: paymentAmount,
              totalCredit: paymentAmount,
              status: 'POSTED',
              createdById: userId,
              postedAt: new Date(),
              lines: {
                create: [
                  { lineNumber: 1, accountId: apAccount.id, description: `AP Reduction - ${bill.billNumber}`, debitAmount: paymentAmount, creditAmount: 0, vendorId },
                  { lineNumber: 2, accountId: creditAccountId, description: `Cash/Bank Payment - ${paymentNumber}`, debitAmount: 0, creditAmount: paymentAmount, vendorId },
                ],
              },
            },
          });

          await tx.account.update({ where: { id: apAccount.id }, data: { currentBalance: { decrement: paymentAmount } } });
          await tx.account.update({ where: { id: creditAccountId }, data: { currentBalance: { decrement: paymentAmount } } });
          await tx.payment.update({ where: { id: pmt.id }, data: { journalEntryId: je.id } });
        }

        return pmt;
      });

      res.status(201).json({ success: true, data: payment, message: 'Payment disbursed' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
