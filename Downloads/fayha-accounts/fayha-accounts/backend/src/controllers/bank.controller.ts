// FAYHA TRANSPORTATION - Bank Account Controller
import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../types';

export const bankController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const banks = await prisma.bankAccount.findMany({
        where: { isActive: true },
        include: { _count: { select: { transactions: true } } },
        orderBy: { bankName: 'asc' }
      });
      res.json({ success: true, data: banks });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const bank = await prisma.bankAccount.findUnique({
        where: { id: req.params.id },
        include: {
          transactions: { orderBy: { transactionDate: 'desc' }, take: 100 },
          reconciliations: { orderBy: { periodEnd: 'desc' }, take: 12 },
        }
      });
      if (!bank) return res.status(404).json({ success: false, error: 'Bank not found' });
      res.json({ success: true, data: bank });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const bank = await prisma.bankAccount.create({
        data: { ...req.body, currentBalance: req.body.openingBalance || 0 }
      });
      res.status(201).json({ success: true, data: bank });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const allowed = ['code', 'bankName', 'bankNameAr', 'accountNumber', 'ibanNumber', 'swiftCode', 'branchName', 'branchCode', 'color', 'isActive', 'isDefault'];
      const data: any = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }
      const bank = await prisma.bankAccount.update({ where: { id: req.params.id }, data });
      res.json({ success: true, data: bank });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },

  async delete(req: AuthRequest, res: Response) {
    try {
      await prisma.bankAccount.delete({ where: { id: req.params.id } });
      res.json({ success: true, data: { message: 'Bank account deleted' } });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },

  async getTransactions(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate, reconciled, page = 1, limit = 50 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);
      const where: any = { bankAccountId: req.params.id };
      if (startDate || endDate) {
        where.transactionDate = {
          ...(startDate && { gte: new Date(startDate as string) }),
          ...(endDate && { lte: new Date(endDate as string) }),
        };
      }
      if (reconciled !== undefined) {
        where.reconciliationStatus = reconciled === 'true' ? 'RECONCILED' : 'UNRECONCILED';
      }

      const [transactions, total] = await Promise.all([
        prisma.bankTransaction.findMany({ where, orderBy: { transactionDate: 'desc' }, skip, take: Number(limit) }),
        prisma.bankTransaction.count({ where }),
      ]);

      res.json({ success: true, data: transactions, meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },

  async reconcile(req: AuthRequest, res: Response) {
    try {
      const { transactionIds } = req.body;
      await prisma.bankTransaction.updateMany({
        where: { id: { in: transactionIds } },
        data: { reconciliationStatus: 'RECONCILED', reconciledAt: new Date() }
      });
      res.json({ success: true, message: `${transactionIds.length} transactions reconciled` });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },

  // Fix payment entry bank transactions that were incorrectly typed as DEBIT instead of CREDIT
  async repairPaymentTransactionTypes(req: AuthRequest, res: Response) {
    try {
      // Find all bank transactions from Payment Entries (documentType = 'PAYMENT')
      const paymentTxns = await prisma.bankTransaction.findMany({
        where: { documentType: 'PAYMENT', type: 'DEBIT' },
      });

      let fixed = 0;
      for (const txn of paymentTxns) {
        if (!txn.documentRef) continue;
        // Look up the journal entry to check if this was a receipt (money IN)
        const je: any = await prisma.journalEntry.findFirst({
          where: { entryNumber: txn.documentRef, referenceType: 'PAYMENT_ENTRY' },
          include: { lines: true },
        });
        if (!je) continue;

        // Parse metadata to get ledgerAccountId
        let meta: any = {};
        try { meta = je.notes ? JSON.parse(je.notes) : {}; } catch { /* ignore */ }

        // Check if the bank/cash line is a DEBIT (money received) — should be CREDIT type
        // Try matching by ledgerAccountId first, then fall back to finding any DR line with matching bank account
        let bankLine = (je.lines || []).find((l: any) => l.accountId === meta.ledgerAccountId);
        if (!bankLine) {
          // Fallback: find any line where DR > CR (the bank/cash side of a receipt)
          bankLine = (je.lines || []).find((l: any) => (l.debitAmount || 0) > 0 && (l.creditAmount || 0) === 0);
        }
        if (bankLine && (bankLine.debitAmount || 0) > (bankLine.creditAmount || 0)) {
          // This is a receipt (DR Bank), should be CREDIT type
          await prisma.bankTransaction.update({
            where: { id: txn.id },
            data: { type: 'CREDIT' },
          });
          fixed++;
        }
      }

      // Recalculate bank balances
      const banks = await prisma.bankAccount.findMany({ where: { isActive: true } });
      for (const bank of banks) {
        const txns = await prisma.bankTransaction.findMany({ where: { bankAccountId: bank.id } });
        let balance = bank.openingBalance || 0;
        for (const t of txns) {
          balance += t.type === 'CREDIT' ? t.amount : -t.amount;
        }
        await prisma.bankAccount.update({ where: { id: bank.id }, data: { currentBalance: balance } });
      }

      res.json({ success: true, message: `Fixed ${fixed} payment transactions, recalculated bank balances` });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },
};

// Customer Controller
export const customerController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const { search, isActive } = req.query;
      const where: any = {};
      if (isActive !== undefined) where.isActive = isActive === 'true';
      if (search) {
        where.OR = [
          { name: { contains: search as string } },
          { code: { contains: search as string } },
        ];
      }
      const customers = await prisma.customer.findMany({
        where,
        include: {
          _count: { select: { jobReferences: true, salesInvoices: true } },
          jobReferences: { select: { status: true } },
        },
        orderBy: { name: 'asc' },
      });

      // Enrich each customer with job reference counts and status breakdown
      const enriched = customers.map((c: any) => {
        const statuses = (c.jobReferences || []).map((jr: any) => jr.status);
        const jobStatusCounts = {
          open: statuses.filter((s: string) => s === 'Draft' || s === 'Active').length,
          inProgress: statuses.filter((s: string) => s === 'In Progress' || s === 'Customs Cleared' || s === 'Delivered').length,
          invoiced: statuses.filter((s: string) => s === 'Invoiced').length,
          closed: statuses.filter((s: string) => s === 'Closed').length,
        };
        const { jobReferences, _count, ...rest } = c;
        return {
          ...rest,
          totalJobs: _count?.jobReferences || 0,
          totalInvoices: _count?.salesInvoices || 0,
          jobStatusCounts,
        };
      });

      res.json({ success: true, data: enriched });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: req.params.id },
        include: {
          invoices: { orderBy: { issueDate: 'desc' }, take: 20 },
          contacts: true,
          _count: { select: { jobReferences: true, salesInvoices: true } },
        }
      });
      if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
      const { _count, ...rest } = customer as any;
      res.json({ success: true, data: { ...rest, totalJobs: _count?.jobReferences || 0, totalInvoices: _count?.salesInvoices || 0 } });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const allowed = ['code', 'name', 'nameAr', 'clientType', 'contactPerson', 'contactPersonPhone', 'phone', 'phoneAlt', 'email', 'password', 'designation', 'salesmanId', 'website', 'address', 'streetName', 'streetNameAr', 'buildingNumber', 'buildingNumberAr', 'district', 'districtAr', 'city', 'cityAr', 'country', 'postalCode', 'postalCodeAr', 'vatNumber', 'crNumber', 'creditLimit', 'paymentTermDays', 'category', 'isActive', 'authorizationNumber', 'authorizationExpiry', 'notifyBefore', 'importNumber', 'importExpiry', 'exportNumber', 'exportExpiry', 'parentAccountId', 'ledgerCode', 'ledgerNote', 'isOtherBranch', 'notes'];
      const dateFields = ['authorizationExpiry', 'importExpiry', 'exportExpiry'];
      const numberFields = ['creditLimit', 'paymentTermDays', 'notifyBefore'];
      const boolFields = ['isActive', 'isOtherBranch'];

      const data: any = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) {
          if (dateFields.includes(key)) {
            data[key] = req.body[key] ? new Date(req.body[key]) : null;
          } else if (numberFields.includes(key)) {
            data[key] = Number(req.body[key]) || 0;
          } else if (boolFields.includes(key)) {
            data[key] = req.body[key] === true || req.body[key] === 'true';
          } else {
            data[key] = req.body[key];
          }
        }
      }

      // Auto-generate code if not provided
      if (!data.code) {
        const year = new Date().getFullYear();
        const prefix = `CL-${year}-`;
        const last = await prisma.customer.findFirst({
          where: { code: { startsWith: prefix } },
          orderBy: { code: 'desc' },
        });
        let seq = 1;
        if (last) {
          const n = parseInt(last.code.replace(prefix, ''), 10);
          if (!isNaN(n)) seq = n + 1;
        }
        data.code = `${prefix}${String(seq).padStart(4, '0')}`;
      }

      if (!data.name) return res.status(400).json({ success: false, error: 'Name is required' });

      // Auto-create ledger account if parentAccountId is provided
      if (data.parentAccountId && !data.ledgerCode) {
        try {
          const parentAcct = await prisma.account.findUnique({ where: { id: data.parentAccountId } });
          if (parentAcct) {
            // Find next code under this parent
            const children = await prisma.account.findMany({
              where: { parentId: parentAcct.id },
              select: { code: true },
              orderBy: { code: 'asc' },
            });
            let nextSeq = 1;
            if (children.length > 0) {
              const nums = children.map(c => {
                const suffix = c.code.slice(parentAcct.code.length + 1);
                return parseInt(suffix, 10) || 0;
              });
              nextSeq = Math.max(...nums) + 1;
            }
            let padding = 4;
            if (children.length > 0) {
              const lastSuffix = children[children.length - 1].code.slice(parentAcct.code.length + 1);
              padding = Math.max(lastSuffix.length, 2);
            }
            const ledgerCode = `${parentAcct.code}-${String(nextSeq).padStart(padding, '0')}`;
            data.ledgerCode = ledgerCode;

            // Create the actual account in Chart of Accounts
            await prisma.account.create({
              data: {
                code: ledgerCode,
                name: data.name,
                nameAr: data.nameAr || null,
                type: parentAcct.type,
                subType: 'LEDGER',
                parentId: parentAcct.id,
                isActive: true,
              },
            });
          }
        } catch (acctErr: any) {
          // If account already exists (duplicate code), just link it
          if (acctErr.code !== 'P2002') {
            console.error('Failed to auto-create ledger account:', acctErr.message);
          }
        }
      }

      const customer = await prisma.customer.create({ data });
      res.status(201).json({ success: true, data: customer });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const allowed = ['name', 'nameAr', 'clientType', 'contactPerson', 'contactPersonPhone', 'phone', 'phoneAlt', 'email', 'password', 'designation', 'salesmanId', 'website', 'address', 'streetName', 'streetNameAr', 'buildingNumber', 'buildingNumberAr', 'district', 'districtAr', 'city', 'cityAr', 'country', 'postalCode', 'postalCodeAr', 'vatNumber', 'crNumber', 'creditLimit', 'paymentTermDays', 'category', 'isActive', 'authorizationNumber', 'authorizationExpiry', 'notifyBefore', 'importNumber', 'importExpiry', 'exportNumber', 'exportExpiry', 'parentAccountId', 'ledgerCode', 'ledgerNote', 'isOtherBranch', 'notes', 'totalInvoiced', 'totalPaid', 'outstandingBalance'];
      const dateFields = ['authorizationExpiry', 'importExpiry', 'exportExpiry'];
      const numberFields = ['creditLimit', 'paymentTermDays', 'notifyBefore', 'totalInvoiced', 'totalPaid', 'outstandingBalance'];
      const boolFields = ['isActive', 'isOtherBranch'];

      const data: any = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) {
          if (dateFields.includes(key)) {
            data[key] = req.body[key] ? new Date(req.body[key]) : null;
          } else if (numberFields.includes(key)) {
            data[key] = Number(req.body[key]) || 0;
          } else if (boolFields.includes(key)) {
            data[key] = req.body[key] === true || req.body[key] === 'true';
          } else {
            data[key] = req.body[key];
          }
        }
      }

      // Auto-create ledger account if parentAccountId is set and no ledger exists yet
      if (data.parentAccountId) {
        const existing = await prisma.customer.findUnique({ where: { id: req.params.id }, select: { ledgerCode: true } });
        if (!existing?.ledgerCode && !data.ledgerCode) {
          try {
            const parentAcct = await prisma.account.findUnique({ where: { id: data.parentAccountId } });
            if (parentAcct) {
              const children = await prisma.account.findMany({
                where: { parentId: parentAcct.id },
                select: { code: true },
                orderBy: { code: 'asc' },
              });
              let nextSeq = 1;
              if (children.length > 0) {
                const nums = children.map(c => {
                  const suffix = c.code.slice(parentAcct.code.length + 1);
                  return parseInt(suffix, 10) || 0;
                });
                nextSeq = Math.max(...nums) + 1;
              }
              let padding = 4;
              if (children.length > 0) {
                const lastSuffix = children[children.length - 1].code.slice(parentAcct.code.length + 1);
                padding = Math.max(lastSuffix.length, 2);
              }
              const ledgerCode = `${parentAcct.code}-${String(nextSeq).padStart(padding, '0')}`;
              data.ledgerCode = ledgerCode;

              await prisma.account.create({
                data: {
                  code: ledgerCode,
                  name: data.name || (await prisma.customer.findUnique({ where: { id: req.params.id } }))?.name || 'Customer Account',
                  type: parentAcct.type,
                  subType: 'LEDGER',
                  parentId: parentAcct.id,
                  isActive: true,
                },
              });
            }
          } catch (acctErr: any) {
            if (acctErr.code !== 'P2002') {
              console.error('Failed to auto-create ledger account:', acctErr.message);
            }
          }
        }
      }

      const customer = await prisma.customer.update({ where: { id: req.params.id }, data });
      res.json({ success: true, data: customer });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },

  async delete(req: AuthRequest, res: Response) {
    try {
      await prisma.customer.delete({ where: { id: req.params.id } });
      res.json({ success: true, data: { message: 'Customer deleted' } });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },

  async getStatement(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const customerId = req.params.id;

      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });

      // Build date filter
      const dateFilter: any = {};
      if (startDate) dateFilter.gte = new Date(startDate as string);
      if (endDate) dateFilter.lte = new Date(endDate as string);

      // Get legacy invoices
      const invWhere: any = { customerId };
      if (startDate || endDate) invWhere.issueDate = dateFilter;
      const invoices = await prisma.invoice.findMany({
        where: invWhere, include: { payments: true }, orderBy: { issueDate: 'asc' },
      });

      // Get sales invoices
      const siWhere: any = { clientId: customerId };
      if (startDate || endDate) siWhere.invoiceDate = dateFilter;
      const salesInvoices = await prisma.salesInvoice.findMany({
        where: siWhere, orderBy: { invoiceDate: 'asc' },
      });

      // Get legacy payments received from this customer
      const payWhere: any = { customerId };
      if (startDate || endDate) payWhere.paymentDate = dateFilter;
      const payments = await prisma.payment.findMany({
        where: payWhere, orderBy: { paymentDate: 'asc' },
      });

      // Get payment entries (JournalEntry with referenceType PAYMENT_ENTRY) for this customer
      const peWhere: any = { referenceType: 'PAYMENT_ENTRY' };
      if (startDate || endDate) peWhere.date = dateFilter;
      const paymentEntries = await prisma.journalEntry.findMany({
        where: peWhere, orderBy: { date: 'asc' },
      });
      // Filter by clientId stored in notes metadata
      const clientPaymentEntries = paymentEntries.filter((je: any) => {
        try {
          const meta = je.notes ? JSON.parse(je.notes) : {};
          return meta.clientId === customerId;
        } catch { return false; }
      });

      // Build unified SOA entries
      const entries: any[] = [];

      for (const inv of invoices) {
        entries.push({
          date: inv.issueDate, type: 'INVOICE', reference: inv.invoiceNumber,
          description: inv.description || `Invoice ${inv.invoiceNumber}`,
          debit: inv.totalAmount, credit: 0,
        });
      }
      for (const si of salesInvoices) {
        entries.push({
          date: si.invoiceDate, type: 'SALES_INVOICE', reference: si.invoiceNumber,
          description: `Sales Invoice ${si.invoiceNumber}`,
          debit: si.totalAmount, credit: 0,
        });
      }
      for (const pay of payments) {
        entries.push({
          date: pay.paymentDate, type: 'PAYMENT', reference: pay.paymentNumber,
          description: pay.description || `Payment ${pay.paymentNumber}`,
          debit: 0, credit: pay.amount,
        });
      }
      for (const pe of clientPaymentEntries) {
        entries.push({
          date: pe.date, type: 'PAYMENT_ENTRY', reference: pe.entryNumber,
          description: `Payment Entry ${pe.entryNumber}`,
          debit: 0, credit: pe.totalDebit || 0,
        });
      }

      // Sort by date
      entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate running balance (debit = customer owes more, credit = customer pays)
      let runningBalance = 0;
      for (const entry of entries) {
        runningBalance += entry.debit - entry.credit;
        entry.balance = runningBalance;
      }

      res.json({
        success: true,
        data: {
          customer, invoices, entries,
          totalInvoiced: customer.totalInvoiced,
          totalPaid: customer.totalPaid,
          outstandingBalance: customer.outstandingBalance,
        },
      });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },
};

// Vendor Controller
export const vendorController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const { search, isActive } = req.query;
      const where: any = {};
      if (isActive !== undefined) where.isActive = isActive === 'true';
      if (search) {
        where.OR = [
          { name: { contains: search as string } },
          { code: { contains: search as string } },
        ];
      }
      const vendors = await prisma.vendor.findMany({ where, orderBy: { name: 'asc' } });
      res.json({ success: true, data: vendors });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const vendor = await prisma.vendor.findUnique({
        where: { id: req.params.id },
        include: {
          bills: { orderBy: { billDate: 'desc' }, take: 20 },
          payments: { orderBy: { paymentDate: 'desc' }, take: 20 },
          contacts: true,
        }
      });
      if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });
      res.json({ success: true, data: vendor });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const allowed = ['code', 'name', 'nameAr', 'contactPerson', 'phone', 'phoneAlt', 'email', 'website', 'address', 'city', 'country', 'postalCode', 'vatNumber', 'crNumber', 'paymentTermDays', 'category', 'isActive', 'notes'];
      const data: any = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }
      if (data.paymentTermDays !== undefined) data.paymentTermDays = Number(data.paymentTermDays) || 30;
      const vendor = await prisma.vendor.create({ data });
      res.status(201).json({ success: true, data: vendor });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const allowed = ['name', 'nameAr', 'contactPerson', 'phone', 'phoneAlt', 'email', 'website', 'address', 'city', 'country', 'postalCode', 'vatNumber', 'crNumber', 'paymentTermDays', 'category', 'isActive', 'notes'];
      const data: any = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }
      const vendor = await prisma.vendor.update({ where: { id: req.params.id }, data });
      res.json({ success: true, data: vendor });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },

  async delete(req: AuthRequest, res: Response) {
    try {
      await prisma.vendor.delete({ where: { id: req.params.id } });
      res.json({ success: true, data: { message: 'Vendor deleted' } });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },

  async getStatement(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const vendorId = req.params.id;

      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
      if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });

      // Get bills
      const billWhere: any = { vendorId };
      if (startDate || endDate) {
        billWhere.billDate = {
          ...(startDate && { gte: new Date(startDate as string) }),
          ...(endDate && { lte: new Date(endDate as string) }),
        };
      }
      const bills = await prisma.bill.findMany({
        where: billWhere, include: { payments: true }, orderBy: { billDate: 'asc' },
      });

      // Get payments to this vendor
      const paymentWhere: any = { vendorId };
      if (startDate || endDate) {
        paymentWhere.paymentDate = {
          ...(startDate && { gte: new Date(startDate as string) }),
          ...(endDate && { lte: new Date(endDate as string) }),
        };
      }
      const payments = await prisma.payment.findMany({
        where: paymentWhere, orderBy: { paymentDate: 'asc' },
      });

      // Get payable expenses
      const peWhere: any = { vendorId };
      if (startDate || endDate) {
        peWhere.date = {
          ...(startDate && { gte: new Date(startDate as string) }),
          ...(endDate && { lte: new Date(endDate as string) }),
        };
      }
      const payableExpenses = await prisma.payableExpense.findMany({
        where: peWhere, orderBy: { date: 'asc' },
      });

      // Build unified statement entries with running balance
      const entries: any[] = [];

      for (const bill of bills) {
        entries.push({
          date: bill.billDate,
          type: 'BILL',
          reference: bill.billNumber,
          description: bill.description || `Bill ${bill.billNumber}`,
          debit: 0,
          credit: bill.totalAmount,
        });
      }
      for (const pe of payableExpenses) {
        entries.push({
          date: pe.date,
          type: 'PAYABLE_EXPENSE',
          reference: pe.expenseNumber,
          description: pe.description || `Payable ${pe.expenseNumber}`,
          debit: 0,
          credit: pe.totalAmount,
        });
      }
      for (const pay of payments) {
        entries.push({
          date: pay.paymentDate,
          type: 'PAYMENT',
          reference: pay.paymentNumber,
          description: pay.description || `Payment ${pay.paymentNumber}`,
          debit: pay.amount,
          credit: 0,
        });
      }

      // Sort by date
      entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate running balance
      let runningBalance = 0;
      for (const entry of entries) {
        runningBalance += entry.credit - entry.debit;
        entry.balance = runningBalance;
      }

      res.json({
        success: true,
        data: { vendor, entries, totalBilled: vendor.totalBilled, totalPaid: vendor.totalPaid, outstandingBalance: vendor.outstandingBalance },
      });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },
};

// Dashboard Controller
export const dashboardController = {
  async getSummary(req: AuthRequest, res: Response) {
    try {
      const [
        totalRevenue, totalExpenses,
        totalReceivable, totalPayable,
        bankBalances,
        unpaidInvoices, unpaidBills,
        recentJournals
      ] = await Promise.all([
        prisma.account.aggregate({ where: { type: 'REVENUE' }, _sum: { currentBalance: true } }),
        prisma.account.aggregate({ where: { type: 'EXPENSE' }, _sum: { currentBalance: true } }),
        prisma.invoice.aggregate({ where: { status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE', 'SENT'] } }, _sum: { balanceDue: true } }),
        prisma.bill.aggregate({ where: { status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } }, _sum: { balanceDue: true } }),
        prisma.bankAccount.findMany({ where: { isActive: true }, select: { id: true, code: true, bankName: true, currentBalance: true, color: true } }),
        prisma.invoice.count({ where: { status: { in: ['UNPAID', 'OVERDUE'] } } }),
        prisma.bill.count({ where: { status: { in: ['UNPAID', 'OVERDUE'] } } }),
        prisma.journalEntry.findMany({ take: 10, orderBy: { date: 'desc' }, include: { lines: { include: { account: { select: { code: true, name: true } } } } } }),
      ]);

      const rev = Number(totalRevenue._sum.currentBalance || 0);
      const exp = Number(totalExpenses._sum.currentBalance || 0);

      res.json({
        success: true,
        data: {
          totalRevenue: rev,
          totalExpenses: exp,
          netIncome: rev - exp,
          totalReceivable: Number(totalReceivable._sum.balanceDue || 0),
          totalPayable: Number(totalPayable._sum.balanceDue || 0),
          totalBankBalance: bankBalances.reduce((s, b) => s + Number(b.currentBalance), 0),
          bankBalances,
          unpaidInvoices,
          unpaidBills,
          recentJournals,
        }
      });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },

  async getBalanceSheet(req: AuthRequest, res: Response) {
    try {
      const accounts = await prisma.account.findMany({
        where: { isActive: true, type: { in: ['ASSET', 'LIABILITY', 'EQUITY'] } },
        orderBy: { code: 'asc' }
      });

      const assets = accounts.filter(a => a.type === 'ASSET');
      const liabilities = accounts.filter(a => a.type === 'LIABILITY');
      const equity = accounts.filter(a => a.type === 'EQUITY');

      // Include Net Income (Revenue - Expenses) in equity for complete balance sheet
      const plAccounts = await prisma.account.findMany({
        where: { isActive: true, type: { in: ['REVENUE', 'EXPENSE'] } },
      });
      const totalRev = plAccounts.filter(a => a.type === 'REVENUE').reduce((s, a) => s + Number(a.currentBalance), 0);
      const totalExp = plAccounts.filter(a => a.type === 'EXPENSE').reduce((s, a) => s + Number(a.currentBalance), 0);
      const netIncome = totalRev - totalExp;

      const totalAssets = assets.reduce((s, a) => s + Number(a.currentBalance), 0);
      const totalLiabilities = liabilities.reduce((s, a) => s + Number(a.currentBalance), 0);
      const totalEquity = equity.reduce((s, a) => s + Number(a.currentBalance), 0) + netIncome;

      res.json({
        success: true,
        data: {
          assets: assets.map(a => ({ accountId: a.id, accountCode: a.code, accountName: a.name, subType: a.subType, balance: Number(a.currentBalance) })),
          liabilities: liabilities.map(a => ({ accountId: a.id, accountCode: a.code, accountName: a.name, subType: a.subType, balance: Number(a.currentBalance) })),
          equity: equity.map(a => ({ accountId: a.id, accountCode: a.code, accountName: a.name, subType: a.subType, balance: Number(a.currentBalance) })),
          totalAssets,
          totalLiabilities,
          totalEquity,
          netIncome,
        }
      });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },

  async getIncomeStatement(req: AuthRequest, res: Response) {
    try {
      const accounts = await prisma.account.findMany({
        where: { isActive: true, type: { in: ['REVENUE', 'EXPENSE'] } },
        orderBy: { code: 'asc' }
      });

      const revenue = accounts.filter(a => a.type === 'REVENUE');
      const expenses = accounts.filter(a => a.type === 'EXPENSE');
      const totalRev = revenue.reduce((s, a) => s + Number(a.currentBalance), 0);
      const totalExp = expenses.reduce((s, a) => s + Number(a.currentBalance), 0);

      res.json({
        success: true,
        data: {
          revenue: revenue.map(a => ({ accountId: a.id, accountCode: a.code, accountName: a.name, subType: a.subType, balance: Number(a.currentBalance) })),
          expenses: expenses.map(a => ({ accountId: a.id, accountCode: a.code, accountName: a.name, subType: a.subType, balance: Number(a.currentBalance) })),
          totalRevenue: totalRev,
          totalExpenses: totalExp,
          netIncome: totalRev - totalExp,
          profitMargin: totalRev > 0 ? ((totalRev - totalExp) / totalRev) * 100 : 0,
        }
      });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },
};

// Settings Controller
export const settingsController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const settings = await prisma.setting.findMany({ orderBy: { key: 'asc' } });
      // Convert to key-value map for easy consumption
      const map: Record<string, string> = {};
      for (const s of settings) map[s.key] = s.value;
      res.json({ success: true, data: { settings, map } });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },

  async getByCategory(req: AuthRequest, res: Response) {
    try {
      const { category } = req.params;
      const settings = await prisma.setting.findMany({
        where: { category: category.toUpperCase() },
        orderBy: { key: 'asc' },
      });
      const map: Record<string, string> = {};
      for (const s of settings) map[s.key] = s.value;
      res.json({ success: true, data: settings, map });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const { key } = req.params;
      const { value } = req.body;
      if (value === undefined) return res.status(400).json({ success: false, error: 'value is required' });

      const setting = await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value), type: 'STRING', category: 'COMPANY' },
      });
      res.json({ success: true, data: setting });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },

  async bulkUpdate(req: AuthRequest, res: Response) {
    try {
      const { settings } = req.body;
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ success: false, error: 'settings object is required' });
      }

      const results = [];
      for (const [key, value] of Object.entries(settings)) {
        const setting = await prisma.setting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value), type: 'STRING', category: key.startsWith('COMPANY') ? 'COMPANY' : 'GENERAL' },
        });
        results.push(setting);
      }
      res.json({ success: true, data: results });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  },
};
