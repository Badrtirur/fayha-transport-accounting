// ==========================================
// FAYHA TRANSPORTATION - Clearance Controllers
// All clearance-specific entity CRUD
// ==========================================

import { Request, Response } from 'express';
import prisma from '../config/database';
import { generateNumber } from '../utils/helpers';
import * as XLSX from 'xlsx';

interface CrudOptions {
  allowedFields?: string[];
  autoCodeField?: string;   // field name for auto-generated code (default: 'code')
  autoCodePrefix?: string;  // prefix for auto-generated code
}

// Helper for standard CRUD with field sanitization and auto-code generation
function crud(model: any, includes?: any, orderBy?: any, opts?: CrudOptions) {
  const sanitize = (body: any): any => {
    if (!opts?.allowedFields) return { ...body };
    const data: any = {};
    for (const key of opts.allowedFields) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    // Parse date fields
    const dateFields = ['date', 'dueDate', 'quoteDate', 'validUntil', 'etd', 'eta', 'atd', 'ata', 'completedAt', 'purchaseDate', 'nextServiceDate'];
    for (const df of dateFields) {
      if (data[df] && typeof data[df] === 'string') data[df] = new Date(data[df]);
    }
    // Nullify empty FK strings
    for (const fk of ['vendorId', 'clientId', 'jobRefId', 'bankAccountId', 'accountId', 'ledgerAccountId']) {
      if (data[fk] !== undefined && (!data[fk] || (typeof data[fk] === 'string' && data[fk].trim().length === 0))) {
        data[fk] = null;
      }
    }
    return data;
  };

  const autoCode = (data: any): any => {
    const field = opts?.autoCodeField || 'code';
    const prefix = opts?.autoCodePrefix;
    if (prefix && !data[field]) {
      data[field] = `${prefix}-${Date.now().toString(36).toUpperCase()}`;
    }
    return data;
  };

  return {
    async getAll(req: Request, res: Response) {
      try {
        const items = await model.findMany({
          ...(includes ? { include: includes } : {}),
          ...(orderBy ? { orderBy } : {}),
        });
        res.json({ success: true, data: items });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    },
    async getById(req: Request, res: Response) {
      try {
        const item = await model.findUnique({
          where: { id: req.params.id },
          ...(includes ? { include: includes } : {}),
        });
        if (!item) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, data: item });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    },
    async create(req: Request, res: Response) {
      try {
        const data = autoCode(sanitize(req.body));
        const item = await model.create({ data });
        res.status(201).json({ success: true, data: item });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    },
    async update(req: Request, res: Response) {
      try {
        const data = sanitize(req.body);
        const item = await model.update({ where: { id: req.params.id }, data });
        res.json({ success: true, data: item });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    },
    async remove(req: Request, res: Response) {
      try {
        await model.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: 'Deleted successfully' });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    },
  };
}

// ==================== CONSIGNEES ====================
export const consigneeController = crud(prisma.consignee, undefined, { name: 'asc' }, {
  autoCodePrefix: 'CON',
  allowedFields: ['code', 'name', 'nameAr', 'contactPerson', 'phone', 'email', 'address', 'city', 'country', 'warehouseLocation', 'authorizationNumber', 'importNumber', 'exportNumber', 'isActive', 'notes'],
});

// ==================== JOB CATEGORIES ====================
export const jobCategoryController = crud(prisma.jobCategory, { jobTitles: true }, { name: 'asc' }, {
  autoCodePrefix: 'JC',
  allowedFields: ['code', 'name', 'nameAr', 'isActive'],
});

// ==================== JOB TITLES ====================
export const jobTitleController = crud(prisma.jobTitle, { category: true }, { name: 'asc' }, {
  autoCodePrefix: 'JT',
  allowedFields: ['code', 'name', 'nameAr', 'categoryId', 'isActive'],
});

// ==================== JOB CONTROLLERS ====================
export const jobControllerCtrl = crud(prisma.jobController, undefined, { name: 'asc' }, {
  autoCodePrefix: 'CTRL',
  allowedFields: ['code', 'name', 'nameAr', 'phone', 'email', 'isActive'],
});

// ==================== SALESMEN ====================
export const salesmanController = crud(prisma.salesman, undefined, { name: 'asc' }, {
  autoCodePrefix: 'SM',
  allowedFields: ['code', 'name', 'nameAr', 'phone', 'email', 'commission', 'isActive'],
});

// ==================== JOB REFERENCES ====================
export const jobReferenceController = {
  async getAll(req: Request, res: Response) {
    try {
      const items = await prisma.jobReference.findMany({
        include: {
          client: true, consignee: true, category: true, title: true,
          salesman: true, controller: true,
          salesInvoices: { select: { totalAmount: true } },
          expenseEntries: { select: { totalAmount: true, category: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      // Add jobRefNo alias + basic financial totals
      const result = items.map((item: any) => {
        const totalServiceFees = (item.salesInvoices || []).reduce((s: number, inv: any) => s + (inv.totalAmount || 0), 0);
        const totalCost = (item.expenseEntries || []).reduce((s: number, exp: any) => s + (exp.totalAmount || 0), 0);
        return {
          ...item,
          jobRefNo: item.jobNumber,
          financialSummary: { totalServiceFees, totalCost, netProfit: totalServiceFees - totalCost },
        };
      });
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async getById(req: Request, res: Response) {
    try {
      const item = await prisma.jobReference.findUnique({
        where: { id: req.params.id },
        include: {
          client: true, consignee: true, category: true, title: true,
          salesman: true, controller: true, containers: true,
          salesInvoices: { include: { items: true } },
          expenseEntries: true,
        },
      });
      if (!item) return res.status(404).json({ success: false, error: 'Not found' });

      // Compute financial summary
      const totalServiceFees = (item.salesInvoices || []).reduce((s: number, inv: any) => s + (inv.totalAmount || 0), 0);
      const totalCost = (item.expenseEntries || []).reduce((s: number, exp: any) => s + (exp.totalAmount || 0), 0);
      const totalReimbursable = (item.expenseEntries || [])
        .filter((exp: any) => ['Government Fees', 'Port Charges', 'Customs'].includes(exp.category || ''))
        .reduce((s: number, exp: any) => s + (exp.totalAmount || 0), 0);

      const financialSummary = {
        totalServiceFees,
        totalCost,
        totalReimbursable,
        netProfit: totalServiceFees - totalCost,
        totalPayableCost: item.totalPayableCost,
        containerDetention: item.containerDetention,
        estimatedCost: item.estimatedCost,
        shipmentProcessCost: item.shipmentProcessCost,
      };

      res.json({ success: true, data: { ...item, jobRefNo: item.jobNumber, financialSummary } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async create(req: Request, res: Response) {
    try {
      const allowed = [
        'jobNumber', 'status', 'clientId', 'consigneeId',
        'authorizationNumber', 'authorizationExpiry', 'importNumber', 'importExpiry', 'exportNumber', 'exportExpiry',
        'direction', 'modeOfTransport', 'categoryId', 'titleId', 'fclLclType',
        'awbBl', 'hawbHbl', 'mabl', 'blStatus',
        'origin', 'destination', 'pol', 'pod', 'shipper', 'freightForwarder',
        'salesmanId', 'controllerId', 'isHazardous',
        'commercialInvoiceNo', 'commercialInvoiceValue', 'commercialCurrency',
        'manifestNumber', 'cbm', 'grossWeight', 'netWeight', 'packages', 'pallets',
        'shipName', 'shipNumber', 'imoNumber', 'airline', 'flightNumber',
        'truckPlate', 'driverName', 'driverPhone',
        'placeOfDelivery', 'deliveryAddress', 'deliveryContact', 'deliveryDate',
        'notes',
        'totalPayableCost', 'containerDetention', 'estimatedCost', 'shipmentProcessCost',
      ];
      const data: any = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }
      // Parse financial numeric fields
      for (const f of ['totalPayableCost', 'containerDetention', 'estimatedCost', 'shipmentProcessCost']) {
        if (data[f] !== undefined) data[f] = Number(data[f]) || 0;
      }
      if (!data.jobNumber) {
        data.jobNumber = await generateNumber('JOB_REFERENCE', 'JR');
      }
      // Strip FK fields that aren't valid IDs (must be 20+ chars like CUIDs/UUIDs)
      const fkFields = ['clientId', 'consigneeId', 'categoryId', 'titleId', 'salesmanId', 'controllerId'];
      for (const fk of fkFields) {
        if (data[fk] && typeof data[fk] === 'string' && data[fk].length < 20) {
          delete data[fk];
        }
      }
      const { containers } = req.body;
      const item = await prisma.jobReference.create({
        data: {
          ...data,
          ...(containers ? { containers: { create: containers } } : {}),
        },
        include: { client: true, consignee: true, containers: true },
      });
      res.status(201).json({ success: true, data: { ...item, jobRefNo: item.jobNumber } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async update(req: Request, res: Response) {
    try {
      const allowed = [
        'jobNumber', 'status', 'clientId', 'consigneeId',
        'authorizationNumber', 'authorizationExpiry', 'importNumber', 'importExpiry', 'exportNumber', 'exportExpiry',
        'direction', 'modeOfTransport', 'categoryId', 'titleId', 'fclLclType',
        'awbBl', 'hawbHbl', 'mabl', 'blStatus',
        'origin', 'destination', 'pol', 'pod', 'shipper', 'freightForwarder',
        'salesmanId', 'controllerId', 'isHazardous',
        'commercialInvoiceNo', 'commercialInvoiceValue', 'commercialCurrency',
        'manifestNumber', 'cbm', 'grossWeight', 'netWeight', 'packages', 'pallets',
        'shipName', 'shipNumber', 'imoNumber', 'airline', 'flightNumber',
        'truckPlate', 'driverName', 'driverPhone',
        'placeOfDelivery', 'deliveryAddress', 'deliveryContact', 'deliveryDate',
        'notes',
        'totalPayableCost', 'containerDetention', 'estimatedCost', 'shipmentProcessCost',
      ];
      const data: any = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }
      // Parse financial numeric fields
      for (const f of ['totalPayableCost', 'containerDetention', 'estimatedCost', 'shipmentProcessCost']) {
        if (data[f] !== undefined) data[f] = Number(data[f]) || 0;
      }
      // Strip FK fields that aren't valid IDs
      const fkFields = ['clientId', 'consigneeId', 'categoryId', 'titleId', 'salesmanId', 'controllerId'];
      for (const fk of fkFields) {
        if (data[fk] && typeof data[fk] === 'string' && data[fk].length < 20) {
          delete data[fk];
        }
      }
      const item = await prisma.jobReference.update({
        where: { id: req.params.id },
        data,
        include: { client: true, consignee: true },
      });
      res.json({ success: true, data: item });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async remove(req: Request, res: Response) {
    try {
      await prisma.jobReference.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Deleted' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

// ==================== SALES INVOICES ====================
// Auto-creates journal entry on invoice creation:
// DR Accounts Receivable (totalAmount)
// CR Sales Revenue (subtotal)
// CR VAT Output (vatAmount) - if applicable
export const salesInvoiceController = {
  async getAll(req: Request, res: Response) {
    try {
      const items = await prisma.salesInvoice.findMany({
        include: { client: true, items: true, salesman: true, jobReference: true },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: items });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async getById(req: Request, res: Response) {
    try {
      const item = await prisma.salesInvoice.findUnique({
        where: { id: req.params.id },
        include: { client: true, items: { include: { service: true } }, jobReference: true, salesman: true },
      });
      if (!item) return res.status(404).json({ success: false, error: 'Not found' });
      res.json({ success: true, data: item });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async create(req: Request, res: Response) {
    try {
      const allowed = [
        'invoiceNumber', 'clientId', 'jobReferenceId', 'salesmanId',
        'invoiceDate', 'dueDate', 'saleMethod', 'branch',
        'subtotal', 'vatRate', 'vatAmount', 'totalAmount', 'paidAmount', 'balanceDue',
        'status', 'zatcaStatus', 'paymentTermDays', 'notes',
      ];
      const data: any = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }

      // Accept frontend field aliases
      if (req.body.subTotal !== undefined && data.subtotal === undefined) data.subtotal = req.body.subTotal;
      if (req.body.totalVat !== undefined && data.vatAmount === undefined) data.vatAmount = req.body.totalVat;
      if (req.body.grandTotal !== undefined && data.totalAmount === undefined) data.totalAmount = req.body.grandTotal;
      if (req.body.invoiceNo !== undefined && data.invoiceNumber === undefined) data.invoiceNumber = req.body.invoiceNo;

      // Parse dates
      if (data.invoiceDate && typeof data.invoiceDate === 'string') data.invoiceDate = new Date(data.invoiceDate);
      if (data.dueDate && typeof data.dueDate === 'string') data.dueDate = new Date(data.dueDate);

      // Compute dueDate if not provided
      if (!data.dueDate && data.invoiceDate) {
        const d = new Date(data.invoiceDate);
        d.setDate(d.getDate() + (data.paymentTermDays || 30));
        data.dueDate = d;
      }
      if (!data.dueDate) data.dueDate = new Date();
      if (!data.invoiceDate) data.invoiceDate = new Date();

      // Parse numeric fields
      const numFields = ['subtotal', 'vatRate', 'vatAmount', 'totalAmount', 'paidAmount', 'balanceDue', 'paymentTermDays'];
      for (const f of numFields) {
        if (data[f] !== undefined) data[f] = Number(data[f]) || 0;
      }

      // Always compute balanceDue from totalAmount and paidAmount (never trust client value)
      data.balanceDue = (data.totalAmount || 0) - (data.paidAmount || 0);

      // Auto-generate invoice number (sequential INV-YYYY-NNNN)
      if (!data.invoiceNumber) {
        data.invoiceNumber = await generateNumber('SALES_INVOICE', 'INV');
      }

      // Strip FK fields that aren't valid IDs
      const fkFields = ['clientId', 'jobReferenceId', 'salesmanId'];
      for (const fk of fkFields) {
        if (data[fk] && typeof data[fk] === 'string' && data[fk].length < 10) {
          delete data[fk];
        }
      }

      // Process line items
      const { items } = req.body;
      const processedItems = (items || []).map((item: any, idx: number) => ({
        lineNumber: idx + 1,
        serviceId: (item.serviceId && item.serviceId.length >= 10) ? item.serviceId : undefined,
        nameEn: item.nameEn || item.name || '',
        nameAr: item.nameAr || '',
        description: item.description || '',
        amount: Number(item.amount) || 0,
        vatRate: Number(item.vatRate || item.vatPercent || 0.15),
        vatAmount: Number(item.vatAmount) || 0,
        totalAmount: Number(item.totalAmount || item.total) || 0,
      }));

      const invoice = await prisma.$transaction(async (tx) => {
        const invoice = await tx.salesInvoice.create({
          data: {
            ...data,
            ...(processedItems.length > 0 ? { items: { create: processedItems } } : {}),
          },
          include: { client: true, items: true },
        });

        // Auto-create Journal Entry for accounting trail
        const userId = (req as any).user?.id;
        if (userId && data.totalAmount > 0) {
          const totalAmt = data.totalAmount;
          const vatAmt = data.vatAmount || 0;
          const subtotalAmt = data.subtotal || (totalAmt - vatAmt);

          // Find Accounts Receivable account (DR side)
          const arAccount = await tx.account.findFirst({
            where: {
              OR: [
                { subType: 'Accounts Receivable' },
                { name: { contains: 'Accounts Receivable' } },
                { name: { contains: 'Receivable' } },
                { code: { startsWith: '1200' } },
              ],
              isActive: true,
            },
          });

          // Find Sales Revenue account (CR side)
          const revenueAccount = await tx.account.findFirst({
            where: {
              OR: [
                { subType: 'Sales Revenue' },
                { type: 'REVENUE' },
                { name: { contains: 'Sales' } },
                { name: { contains: 'Revenue' } },
              ],
              isActive: true,
            },
          });

          // Find VAT Output/Payable account (CR side for VAT)
          let vatAccount: any = null;
          if (vatAmt > 0) {
            vatAccount = await tx.account.findFirst({
              where: {
                OR: [
                  { name: { contains: 'VAT Output' } },
                  { name: { contains: 'VAT Payable' } },
                  { name: { contains: 'Output Tax' } },
                  { subType: 'VAT' },
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
                description: `Accounts Receivable - ${invoice.client?.name || ''} - ${invoice.invoiceNumber}`,
                debitAmount: totalAmt,
                creditAmount: 0,
                customerId: data.clientId || undefined,
              },
            ];

            if (vatAccount && vatAmt > 0) {
              // Separate revenue and VAT lines
              journalLines.push({
                lineNumber: 2,
                accountId: revenueAccount.id,
                description: `Sales Revenue - ${invoice.invoiceNumber}`,
                debitAmount: 0,
                creditAmount: subtotalAmt,
              });
              journalLines.push({
                lineNumber: 3,
                accountId: vatAccount.id,
                description: `VAT Output 15% - ${invoice.invoiceNumber}`,
                debitAmount: 0,
                creditAmount: vatAmt,
              });
            } else {
              // Single revenue line (full amount)
              journalLines.push({
                lineNumber: 2,
                accountId: revenueAccount.id,
                description: `Sales Revenue - ${invoice.invoiceNumber}`,
                debitAmount: 0,
                creditAmount: totalAmt,
              });
            }

            await tx.journalEntry.create({
              data: {
                entryNumber,
                date: data.invoiceDate || new Date(),
                description: `Sales Invoice: ${invoice.invoiceNumber} - ${invoice.client?.name || ''}`,
                reference: invoice.invoiceNumber,
                referenceType: 'SALES_INVOICE',
                totalDebit: totalAmt,
                totalCredit: totalAmt,
                status: 'POSTED',
                createdById: userId,
                postedAt: new Date(),
                notes: JSON.stringify({ salesInvoiceId: invoice.id, clientId: data.clientId }),
                lines: { create: journalLines },
              },
            });

            // Update account balances (since status=POSTED, balances must reflect)
            // AR is ASSET (normal debit): +totalAmt
            await tx.account.update({
              where: { id: arAccount.id },
              data: { currentBalance: { increment: totalAmt } },
            });
            // Revenue is REVENUE (normal credit): +subtotalAmt
            await tx.account.update({
              where: { id: revenueAccount.id },
              data: { currentBalance: { increment: vatAccount ? subtotalAmt : totalAmt } },
            });
            // VAT Output is LIABILITY (normal credit): +vatAmt
            if (vatAccount && vatAmt > 0) {
              await tx.account.update({
                where: { id: vatAccount.id },
                data: { currentBalance: { increment: vatAmt } },
              });
            }
          }
        }

        // Update customer totalInvoiced and outstandingBalance
        if (data.clientId && data.totalAmount > 0) {
          await tx.customer.update({
            where: { id: data.clientId },
            data: {
              totalInvoiced: { increment: data.totalAmount },
              outstandingBalance: { increment: data.totalAmount },
            },
          });
        }

        return invoice;
      }, { maxWait: 10000, timeout: 30000 });

      res.status(201).json({ success: true, data: invoice });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async update(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const existing = await prisma.salesInvoice.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ success: false, error: 'Not found' });

      // Prevent editing paid or partially paid invoices
      if (existing.status === 'PAID' || existing.status === 'PARTIAL') {
        return res.status(400).json({ success: false, error: `Cannot edit a ${existing.status.toLowerCase()} invoice. Reverse payments first.` });
      }

      const { items, ...rest } = req.body;
      const allowed = [
        'invoiceNumber', 'clientId', 'jobReferenceId', 'salesmanId',
        'invoiceDate', 'dueDate', 'saleMethod', 'branch',
        'subtotal', 'vatRate', 'vatAmount', 'totalAmount', 'paidAmount', 'balanceDue',
        'status', 'zatcaStatus', 'paymentTermDays', 'notes',
      ];
      const data: any = {};
      for (const key of allowed) {
        if (rest[key] !== undefined) data[key] = rest[key];
      }
      // Accept frontend field aliases
      if (rest.subTotal !== undefined && data.subtotal === undefined) data.subtotal = rest.subTotal;
      if (rest.totalVat !== undefined && data.vatAmount === undefined) data.vatAmount = rest.totalVat;
      if (rest.grandTotal !== undefined && data.totalAmount === undefined) data.totalAmount = rest.grandTotal;

      // Parse dates
      if (data.invoiceDate && typeof data.invoiceDate === 'string') data.invoiceDate = new Date(data.invoiceDate);
      if (data.dueDate && typeof data.dueDate === 'string') data.dueDate = new Date(data.dueDate);

      // Parse numeric fields
      const numFields = ['subtotal', 'vatRate', 'vatAmount', 'totalAmount', 'paidAmount', 'balanceDue', 'paymentTermDays'];
      for (const f of numFields) {
        if (data[f] !== undefined) data[f] = Number(data[f]) || 0;
      }

      // Recalculate balanceDue
      const newTotal = data.totalAmount !== undefined ? data.totalAmount : existing.totalAmount;
      const newPaid = data.paidAmount !== undefined ? data.paidAmount : existing.paidAmount;
      data.balanceDue = Math.max(0, (newTotal || 0) - (newPaid || 0));

      const oldTotal = existing.totalAmount || 0;
      const amountChanged = data.totalAmount !== undefined && Math.abs(data.totalAmount - oldTotal) > 0.01;

      // Pre-generate journal entry number outside transaction (SQLite single-writer lock)
      const preGenJeNumber = amountChanged ? await generateNumber('SALES_INVOICE', 'JE-INV') : '';

      const result = await prisma.$transaction(async (tx) => {
        // If totalAmount changed, reverse old journal and create new one
        if (amountChanged) {
          const userId = (req as any).user?.id;

          // Reverse old journal entries
          // Convention A: decrement by max(debit, credit) for each line
          const oldJournals = await tx.journalEntry.findMany({
            where: { referenceType: 'SALES_INVOICE', reference: existing.invoiceNumber },
            include: { lines: true },
          });
          for (const je of oldJournals) {
            for (const line of je.lines || []) {
              const amount = Math.max(line.debitAmount || 0, line.creditAmount || 0);
              if (amount > 0.001) {
                await tx.account.update({ where: { id: line.accountId }, data: { currentBalance: { decrement: amount } } });
              }
            }
            await tx.journalEntry.delete({ where: { id: je.id } });
          }

          // Reverse old customer balance
          if (existing.clientId && oldTotal > 0) {
            await tx.customer.update({
              where: { id: existing.clientId },
              data: { totalInvoiced: { decrement: oldTotal }, outstandingBalance: { decrement: oldTotal } },
            });
          }

          // Update line items if provided
          if (items) {
            await tx.salesInvoiceItem.deleteMany({ where: { salesInvoiceId: id } });
            const processedItems = (items || []).map((item: any, idx: number) => ({
              salesInvoiceId: id,
              lineNumber: idx + 1,
              serviceId: (item.serviceId && item.serviceId.length >= 10) ? item.serviceId : undefined,
              nameEn: item.nameEn || item.name || '',
              nameAr: item.nameAr || '',
              description: item.description || '',
              amount: Number(item.amount) || 0,
              vatRate: Number(item.vatRate || item.vatPercent || 0.15),
              vatAmount: Number(item.vatAmount) || 0,
              totalAmount: Number(item.totalAmount || item.total) || 0,
            }));
            if (processedItems.length > 0) {
              await tx.salesInvoiceItem.createMany({ data: processedItems });
            }
          }

          // Update the invoice
          const invoice = await tx.salesInvoice.update({
            where: { id },
            data,
            include: { client: true, items: true },
          });

          // Create new journal entry with new amounts
          const newTotalAmt = data.totalAmount;
          const vatAmt = data.vatAmount || 0;
          const subtotalAmt = data.subtotal || (newTotalAmt - vatAmt);
          const clientId = data.clientId || existing.clientId;

          if (userId && newTotalAmt > 0) {
            const arAccount = await tx.account.findFirst({ where: { OR: [{ subType: 'Accounts Receivable' }, { name: { contains: 'Accounts Receivable' } }, { name: { contains: 'Receivable' } }], isActive: true } });
            const revenueAccount = await tx.account.findFirst({ where: { OR: [{ subType: 'Sales Revenue' }, { type: 'REVENUE' }, { name: { contains: 'Sales' } }, { name: { contains: 'Revenue' } }], isActive: true } });
            let vatAccount: any = null;
            if (vatAmt > 0) {
              vatAccount = await tx.account.findFirst({ where: { OR: [{ name: { contains: 'VAT Output' } }, { name: { contains: 'VAT Payable' } }, { subType: 'VAT' }], isActive: true } });
            }

            if (arAccount && revenueAccount) {
              const entryNumber = preGenJeNumber;
              const journalLines: any[] = [
                { lineNumber: 1, accountId: arAccount.id, description: `Accounts Receivable - ${invoice.client?.name || ''} - ${invoice.invoiceNumber}`, debitAmount: newTotalAmt, creditAmount: 0, customerId: clientId || undefined },
              ];
              if (vatAccount && vatAmt > 0) {
                journalLines.push({ lineNumber: 2, accountId: revenueAccount.id, description: `Sales Revenue - ${invoice.invoiceNumber}`, debitAmount: 0, creditAmount: subtotalAmt });
                journalLines.push({ lineNumber: 3, accountId: vatAccount.id, description: `VAT Output 15% - ${invoice.invoiceNumber}`, debitAmount: 0, creditAmount: vatAmt });
              } else {
                journalLines.push({ lineNumber: 2, accountId: revenueAccount.id, description: `Sales Revenue - ${invoice.invoiceNumber}`, debitAmount: 0, creditAmount: newTotalAmt });
              }

              await tx.journalEntry.create({
                data: {
                  entryNumber, date: data.invoiceDate || existing.invoiceDate || new Date(),
                  description: `Sales Invoice: ${invoice.invoiceNumber} - ${invoice.client?.name || ''}`,
                  reference: invoice.invoiceNumber, referenceType: 'SALES_INVOICE',
                  totalDebit: newTotalAmt, totalCredit: newTotalAmt,
                  status: 'POSTED', createdById: userId, postedAt: new Date(),
                  notes: JSON.stringify({ salesInvoiceId: invoice.id, clientId }),
                  lines: { create: journalLines },
                },
              });

              // Update new account balances
              await tx.account.update({ where: { id: arAccount.id }, data: { currentBalance: { increment: newTotalAmt } } });
              await tx.account.update({ where: { id: revenueAccount.id }, data: { currentBalance: { increment: vatAccount ? subtotalAmt : newTotalAmt } } });
              if (vatAccount && vatAmt > 0) {
                await tx.account.update({ where: { id: vatAccount.id }, data: { currentBalance: { increment: vatAmt } } });
              }
            }
          }

          // Update new customer balance
          if (clientId && newTotalAmt > 0) {
            await tx.customer.update({
              where: { id: clientId },
              data: { totalInvoiced: { increment: newTotalAmt }, outstandingBalance: { increment: newTotalAmt } },
            });
          }

          return invoice;
        } else {
          // No amount change - update invoice fields and line items if provided
          if (items) {
            await tx.salesInvoiceItem.deleteMany({ where: { salesInvoiceId: id } });
            const processedItems = (items || []).map((item: any, idx: number) => ({
              salesInvoiceId: id,
              lineNumber: idx + 1,
              serviceId: (item.serviceId && item.serviceId.length >= 10) ? item.serviceId : undefined,
              nameEn: item.nameEn || item.name || '',
              nameAr: item.nameAr || '',
              description: item.description || '',
              amount: Number(item.amount) || 0,
              vatRate: Number(item.vatRate || item.vatPercent || 0.15),
              vatAmount: Number(item.vatAmount) || 0,
              totalAmount: Number(item.totalAmount || item.total) || 0,
            }));
            if (processedItems.length > 0) {
              await tx.salesInvoiceItem.createMany({ data: processedItems });
            }
          }
          const invoice = await tx.salesInvoice.update({
            where: { id },
            data,
            include: { client: true, items: true },
          });
          return invoice;
        }
      }, { maxWait: 10000, timeout: 30000 });

      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async send(req: Request, res: Response) {
    try {
      const invoice = await prisma.salesInvoice.findUnique({ where: { id: req.params.id } });
      if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
      const updated = await prisma.salesInvoice.update({
        where: { id: req.params.id },
        data: { status: 'SENT' },
        include: { client: true, items: true },
      });
      res.json({ success: true, data: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async markAsInvoiced(req: Request, res: Response) {
    try {
      const invoice = await prisma.salesInvoice.findUnique({
        where: { id: req.params.id },
        select: { id: true, status: true, jobReferenceId: true },
      });
      if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
      if (invoice.status === 'INVOICED') return res.status(400).json({ success: false, error: 'Invoice is already marked as invoiced' });

      const updated = await prisma.$transaction(async (tx) => {
        const inv = await tx.salesInvoice.update({
          where: { id: req.params.id },
          data: { status: 'INVOICED' },
          include: { client: true, items: true, jobReference: true },
        });

        // Also update linked Job Reference status
        if (invoice.jobReferenceId) {
          await tx.jobReference.update({
            where: { id: invoice.jobReferenceId },
            data: { status: 'Invoiced' },
          });
        }

        return inv;
      }, { maxWait: 10000, timeout: 30000 });

      res.json({ success: true, data: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async remove(req: Request, res: Response) {
    try {
      const invoice = await prisma.salesInvoice.findUnique({ where: { id: req.params.id }, include: { items: true } });
      if (!invoice) return res.status(404).json({ success: false, error: 'Not found' });

      // Prevent deletion of paid or partially paid invoices
      if (invoice.status === 'PAID' || invoice.status === 'PARTIAL') {
        return res.status(400).json({ success: false, error: `Cannot delete a ${invoice.status.toLowerCase()} invoice. Reverse the payment first.` });
      }

      await prisma.$transaction(async (tx) => {
        // 1. Reverse journal entries and account balances
        // Convention A: decrement by max(debit, credit) for each line
        const journals = await tx.journalEntry.findMany({
          where: { referenceType: 'SALES_INVOICE', reference: invoice.invoiceNumber },
          include: { lines: true },
        });
        for (const je of journals) {
          for (const line of je.lines || []) {
            const amount = Math.max(line.debitAmount || 0, line.creditAmount || 0);
            if (amount > 0.001) {
              await tx.account.update({
                where: { id: line.accountId },
                data: { currentBalance: { decrement: amount } },
              });
            }
          }
          await tx.journalEntry.delete({ where: { id: je.id } });
        }

        // 2. Reverse customer totalInvoiced and outstandingBalance
        if (invoice.clientId && (invoice.totalAmount || 0) > 0) {
          await tx.customer.update({
            where: { id: invoice.clientId },
            data: {
              totalInvoiced: { decrement: invoice.totalAmount || 0 },
              outstandingBalance: { decrement: invoice.totalAmount || 0 },
            },
          });
        }

        // 3. Delete invoice items then the invoice
        await tx.salesInvoiceItem.deleteMany({ where: { salesInvoiceId: invoice.id } });
        await tx.salesInvoice.delete({ where: { id: invoice.id } });
      }, { maxWait: 10000, timeout: 30000 });

      res.json({ success: true, message: 'Deleted and all accounting reversed' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

// ==================== INVOICE SERVICES ====================
export const invoiceServiceController = crud(prisma.invoiceService, undefined, { nameEn: 'asc' }, {
  autoCodePrefix: 'SVC',
  allowedFields: ['code', 'nameEn', 'nameAr', 'serviceGroup', 'defaultAmount', 'vatApplicable', 'isActive', 'ledgerAccountId', 'description'],
});

// ==================== CLIENT ADVANCES ====================
// Custom controller: auto-creates journal entry on advance receipt
// DR Cash/Bank Account (amount) | CR Client Advance Liability (amount)
const clientAdvanceCrud = crud(prisma.clientAdvance, { client: true }, { createdAt: 'desc' }, {
  autoCodePrefix: 'ADV',
  autoCodeField: 'advanceNumber',
  allowedFields: ['advanceNumber', 'clientId', 'amount', 'date', 'paymentMethod', 'bankAccountId', 'reference', 'description', 'status', 'usedAmount', 'remainingAmount'],
});

export const clientAdvanceController = {
  getAll: clientAdvanceCrud.getAll,
  getById: clientAdvanceCrud.getById,
  async update(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const existing = await prisma.clientAdvance.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ success: false, error: 'Not found' });

      // Don't allow editing used/partially used advances
      if ((existing.usedAmount || 0) > 0) {
        return res.status(400).json({ success: false, error: 'Cannot edit an advance that has been partially or fully applied to payments' });
      }

      const allowedFields = ['clientId', 'amount', 'date', 'paymentMethod', 'bankAccountId', 'reference', 'description'];
      const data: any = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }
      if (data.date && typeof data.date === 'string') data.date = new Date(data.date);
      if (data.amount !== undefined) data.amount = Number(data.amount) || 0;
      data.remainingAmount = (data.amount || existing.amount || 0) - (existing.usedAmount || 0);

      // Extract accountId (not a DB column)
      const selectedAccountId = req.body.accountId || null;

      // Pre-generate journal entry number outside transaction (SQLite single-writer lock)
      const preGenAdvJeNumber = await generateNumber('CLIENT_ADVANCE', 'JE-ADV');

      const result = await prisma.$transaction(async (tx) => {
        // 1. Reverse old journal entry and account balances
        // Convention A: CREATE incremented by debitAmount for DR lines and creditAmount for CR lines
        // So reversal decrements by max(debit, credit) for each line
        const oldJournals = await tx.journalEntry.findMany({
          where: { referenceType: 'CLIENT_ADVANCE', reference: existing.advanceNumber },
          include: { lines: true },
        });
        for (const je of oldJournals) {
          for (const line of je.lines || []) {
            const amount = Math.max(line.debitAmount || 0, line.creditAmount || 0);
            if (amount > 0.001) {
              await tx.account.update({
                where: { id: line.accountId },
                data: { currentBalance: { decrement: amount } },
              });
            }
          }
          await tx.journalEntry.delete({ where: { id: je.id } });
        }

        // 2. Reverse old bank transaction
        const oldBankTxns = await tx.bankTransaction.findMany({
          where: { documentRef: existing.advanceNumber, documentType: 'ADVANCE' },
        });
        for (const bt of oldBankTxns) {
          const reverseAmount = bt.type === 'CREDIT' ? -bt.amount : bt.amount;
          await tx.bankAccount.update({
            where: { id: bt.bankAccountId },
            data: { currentBalance: { increment: reverseAmount } },
          });
          await tx.bankTransaction.delete({ where: { id: bt.id } });
        }

        // 3. Update the advance record
        const advance = await tx.clientAdvance.update({
          where: { id },
          data,
          include: { client: true },
        });

        // 4. Re-create journal entry with new amounts
        const userId = (req as any).user?.id;
        const totalAmt = advance.amount || 0;
        if (userId && totalAmt > 0) {
          let debitAccountId: string | null = selectedAccountId;
          if (!debitAccountId && (advance.paymentMethod === 'Bank' || advance.paymentMethod === 'Cheque') && advance.bankAccountId) {
            const linked = await tx.account.findFirst({ where: { bankId: advance.bankAccountId } });
            debitAccountId = linked?.id || null;
          }
          if (!debitAccountId) {
            const cash = await tx.account.findFirst({ where: { OR: [{ code: { contains: 'CASH' } }, { name: { contains: 'Cash' } }, { subType: 'Cash' }], isActive: true } });
            debitAccountId = cash?.id || null;
          }
          let advLiab = await tx.account.findFirst({ where: { OR: [{ name: { contains: 'Client Advance' } }, { name: { contains: 'Customer Advance' } }, { name: { contains: 'Advance from' } }, { subType: 'Customer Deposits' }], isActive: true } });
          if (!advLiab) advLiab = await tx.account.findFirst({ where: { OR: [{ type: 'LIABILITY' }, { name: { contains: 'Liability' } }], isActive: true } });

          if (debitAccountId && advLiab) {
            const entryNumber = preGenAdvJeNumber;
            await tx.journalEntry.create({
              data: {
                entryNumber, date: advance.date || new Date(),
                description: `Client Advance: ${advance.advanceNumber} - ${advance.client?.name || ''}`,
                reference: advance.advanceNumber, referenceType: 'CLIENT_ADVANCE',
                totalDebit: totalAmt, totalCredit: totalAmt,
                status: 'POSTED', createdById: userId, postedAt: new Date(),
                notes: JSON.stringify({ clientAdvanceId: advance.id, clientId: advance.clientId, paymentMethod: advance.paymentMethod }),
                lines: { create: [
                  { lineNumber: 1, accountId: debitAccountId, description: `Cash/Bank - Client Advance ${advance.advanceNumber}`, debitAmount: totalAmt, creditAmount: 0, customerId: advance.clientId || undefined },
                  { lineNumber: 2, accountId: advLiab.id, description: `Client Advance Liability - ${advance.client?.name || ''}`, debitAmount: 0, creditAmount: totalAmt, customerId: advance.clientId || undefined },
                ] },
              },
            });
            await tx.account.update({ where: { id: debitAccountId }, data: { currentBalance: { increment: totalAmt } } });
            await tx.account.update({ where: { id: advLiab.id }, data: { currentBalance: { increment: totalAmt } } });
          }
        }

        // 5. Re-create bank transaction
        if ((advance.paymentMethod === 'Bank' || advance.paymentMethod === 'Cheque') && advance.bankAccountId) {
          await tx.bankAccount.update({ where: { id: advance.bankAccountId }, data: { currentBalance: { increment: totalAmt } } });
          await tx.bankTransaction.create({
            data: {
              bankAccountId: advance.bankAccountId, transactionDate: advance.date || new Date(),
              type: 'CREDIT', description: `Client Advance Received - ${advance.advanceNumber}`,
              reference: advance.advanceNumber, amount: totalAmt, runningBalance: 0,
              documentType: 'ADVANCE', documentRef: advance.advanceNumber,
            },
          });
        }

        return advance;
      }, { maxWait: 10000, timeout: 30000 });

      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async remove(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const existing = await prisma.clientAdvance.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ success: false, error: 'Not found' });

      // Don't allow deleting used/partially used advances
      if ((existing.usedAmount || 0) > 0) {
        return res.status(400).json({ success: false, error: 'Cannot delete an advance that has been partially or fully applied to payments' });
      }

      await prisma.$transaction(async (tx) => {
        // 1. Reverse journal entries and account balances
        // Convention A: decrement by max(debit, credit) for each line
        const journals = await tx.journalEntry.findMany({
          where: { referenceType: 'CLIENT_ADVANCE', reference: existing.advanceNumber },
          include: { lines: true },
        });
        for (const je of journals) {
          for (const line of je.lines || []) {
            const amount = Math.max(line.debitAmount || 0, line.creditAmount || 0);
            if (amount > 0.001) {
              await tx.account.update({
                where: { id: line.accountId },
                data: { currentBalance: { decrement: amount } },
              });
            }
          }
          await tx.journalEntry.delete({ where: { id: je.id } });
        }

        // 2. Reverse bank transactions
        const bankTxns = await tx.bankTransaction.findMany({
          where: { documentRef: existing.advanceNumber, documentType: 'ADVANCE' },
        });
        for (const bt of bankTxns) {
          const reverseAmount = bt.type === 'CREDIT' ? -bt.amount : bt.amount;
          await tx.bankAccount.update({
            where: { id: bt.bankAccountId },
            data: { currentBalance: { increment: reverseAmount } },
          });
          await tx.bankTransaction.delete({ where: { id: bt.id } });
        }

        // 3. Delete the advance record
        await tx.clientAdvance.delete({ where: { id } });
      }, { maxWait: 10000, timeout: 30000 });

      res.json({ success: true, message: 'Deleted and all accounting reversed' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async getByClient(req: Request, res: Response) {
    try {
      const { clientId } = req.params;
      const advances = await prisma.clientAdvance.findMany({
        where: {
          clientId,
          status: { in: ['ACTIVE', 'PARTIAL'] },
          remainingAmount: { gt: 0 },
        },
        include: { client: true },
        orderBy: { createdAt: 'desc' },
      });
      const totalAvailable = advances.reduce((sum: number, a: any) => sum + (a.remainingAmount || 0), 0);
      res.json({ success: true, data: { advances, totalAvailable } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async create(req: Request, res: Response) {
    try {
      const allowedFields = ['advanceNumber', 'clientId', 'amount', 'date', 'paymentMethod', 'bankAccountId', 'accountId', 'reference', 'description'];
      const data: any = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }

      // Auto-generate advance number (sequential ADV-YYYY-NNNN)
      if (!data.advanceNumber) {
        data.advanceNumber = await generateNumber('CLIENT_ADVANCE', 'ADV');
      }

      // Parse date
      if (data.date && typeof data.date === 'string') data.date = new Date(data.date);
      if (!data.date) data.date = new Date();

      // Parse numeric fields
      if (data.amount !== undefined) data.amount = Number(data.amount) || 0;

      // Force safe defaults on create (prevent client from setting used amounts)
      data.usedAmount = 0;
      data.status = 'ACTIVE';
      data.remainingAmount = data.amount || 0;

      // Extract accountId before create (not a DB column, used for journal entry only)
      const selectedAccountId = data.accountId || null;
      delete data.accountId;

      // Create the client advance
      const advance = await prisma.$transaction(async (tx) => {
        const advance = await tx.clientAdvance.create({ data, include: { client: true } });

        // Auto-create Journal Entry for accounting trail
        const userId = (req as any).user?.id;
        if (userId && data.amount > 0) {
          const totalAmt = data.amount;

          // Use the explicitly provided accountId, or fall back to lookup
          let debitAccountId: string | null = selectedAccountId;

          if (!debitAccountId && (data.paymentMethod === 'BANK_TRANSFER' || data.paymentMethod === 'Bank' || data.paymentMethod === 'Cheque') && data.bankAccountId) {
            const linkedAccount = await tx.account.findFirst({
              where: { bankId: data.bankAccountId },
            });
            debitAccountId = linkedAccount?.id || null;
          }

          if (!debitAccountId) {
            const cashAccount = await tx.account.findFirst({
              where: {
                OR: [
                  { code: { contains: 'CASH' } },
                  { name: { contains: 'Cash' } },
                  { subType: 'Cash' },
                ],
                isActive: true,
              },
            });
            debitAccountId = cashAccount?.id || null;
          }

          // Find Client Advance Liability account (CR side)
          let advanceLiabilityAccount = await tx.account.findFirst({
            where: {
              OR: [
                { name: { contains: 'Client Advance' } },
                { name: { contains: 'Customer Advance' } },
                { name: { contains: 'Advance from' } },
                { subType: 'Customer Deposits' },
              ],
              isActive: true,
            },
          });

          // Fallback to any liability account
          if (!advanceLiabilityAccount) {
            advanceLiabilityAccount = await tx.account.findFirst({
              where: {
                OR: [
                  { type: 'LIABILITY' },
                  { name: { contains: 'Liability' } },
                ],
                isActive: true,
              },
            });
          }

          if (debitAccountId && advanceLiabilityAccount) {
            // Generate journal entry number
            const jYear = new Date().getFullYear();
            const jPrefix = `JE-ADV-${jYear}-`;
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

            await tx.journalEntry.create({
              data: {
                entryNumber,
                date: data.date || new Date(),
                description: `Client Advance: ${advance.advanceNumber} - ${advance.client?.name || ''}`,
                reference: advance.advanceNumber,
                referenceType: 'CLIENT_ADVANCE',
                totalDebit: totalAmt,
                totalCredit: totalAmt,
                status: 'POSTED',
                createdById: userId,
                postedAt: new Date(),
                notes: JSON.stringify({ clientAdvanceId: advance.id, clientId: data.clientId, paymentMethod: data.paymentMethod }),
                lines: {
                  create: [
                    {
                      lineNumber: 1,
                      accountId: debitAccountId,
                      description: `Cash/Bank - Client Advance ${advance.advanceNumber}`,
                      debitAmount: totalAmt,
                      creditAmount: 0,
                      customerId: data.clientId || undefined,
                    },
                    {
                      lineNumber: 2,
                      accountId: advanceLiabilityAccount.id,
                      description: `Client Advance Liability - ${advance.client?.name || ''}`,
                      debitAmount: 0,
                      creditAmount: totalAmt,
                      customerId: data.clientId || undefined,
                    },
                  ],
                },
              },
            });

            // Update account balances
            // Cash/Bank is ASSET (normal debit): +amount
            await tx.account.update({
              where: { id: debitAccountId },
              data: { currentBalance: { increment: totalAmt } },
            });
            // Advance Liability is LIABILITY (normal credit): +amount
            await tx.account.update({
              where: { id: advanceLiabilityAccount.id },
              data: { currentBalance: { increment: totalAmt } },
            });
          }
        }

        // Update BankAccount balance + create BankTransaction for bank/cheque payments
        if ((data.paymentMethod === 'Bank' || data.paymentMethod === 'Cheque') && data.bankAccountId) {
          const totalAmt = Number(data.amount) || 0;
          await tx.bankAccount.update({
            where: { id: data.bankAccountId },
            data: { currentBalance: { increment: totalAmt } },
          });
          await tx.bankTransaction.create({
            data: {
              bankAccountId: data.bankAccountId,
              transactionDate: data.date || new Date(),
              type: 'CREDIT',
              description: `Client Advance Received - ${advance.advanceNumber}`,
              reference: advance.advanceNumber,
              amount: totalAmt,
              runningBalance: 0,
              documentType: 'ADVANCE',
              documentRef: advance.advanceNumber,
            },
          });
        }

        return advance;
      }, { maxWait: 10000, timeout: 30000 });

      res.status(201).json({ success: true, data: advance });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

// ==================== EXPENSE ENTRIES ====================
// Custom controller: auto-creates journal entry on expense creation
// DR Expense Account (accountId) | CR Cash/Bank Account
const expenseEntryCrud = crud(prisma.expenseEntry, { jobReference: true }, { date: 'desc' }, {
  autoCodePrefix: 'EXP',
  autoCodeField: 'expenseNumber',
  allowedFields: ['expenseNumber', 'date', 'clientId', 'vendorId', 'accountId', 'jobRefId', 'amount', 'vatAmount', 'totalAmount', 'paymentMethod', 'bankAccountId', 'category', 'description', 'reference', 'status', 'notes'],
});

export const expenseEntryController = {
  getAll: expenseEntryCrud.getAll,
  getById: expenseEntryCrud.getById,
  update: expenseEntryCrud.update,
  remove: expenseEntryCrud.remove,
  async create(req: Request, res: Response) {
    try {
      const allowedFields = ['expenseNumber', 'date', 'clientId', 'vendorId', 'accountId', 'jobRefId', 'amount', 'vatAmount', 'totalAmount', 'paymentMethod', 'bankAccountId', 'category', 'description', 'reference', 'status', 'notes'];
      const data: any = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }

      // Strip invalid FK for jobRefId
      if (data.jobRefId && typeof data.jobRefId === 'string' && data.jobRefId.length < 10) {
        delete data.jobRefId;
      }

      // Auto-generate expense number (sequential EXP-YYYY-NNNN)
      if (!data.expenseNumber) {
        data.expenseNumber = await generateNumber('EXPENSE_ENTRY', 'EXP');
      }

      // Parse date
      if (data.date && typeof data.date === 'string') {
        data.date = new Date(data.date);
      }

      // Create the expense entry
      const expense = await prisma.$transaction(async (tx) => {
        const expense = await tx.expenseEntry.create({ data });

        // Auto-create Journal Entry for accounting trail
        const userId = (req as any).user?.id;
        if (userId && data.accountId) {
          // Find the credit account (Cash or Bank)
          let creditAccountId: string | null = null;

          if ((data.paymentMethod === 'Bank' || data.paymentMethod === 'Cheque') && data.bankAccountId) {
            // Find the Account linked to this BankAccount
            const linkedAccount = await tx.account.findFirst({
              where: { bankId: data.bankAccountId },
            });
            creditAccountId = linkedAccount?.id || null;
          }

          if (!creditAccountId) {
            // Find a Cash-type account
            const cashAccount = await tx.account.findFirst({
              where: {
                OR: [
                  { code: { contains: 'CASH' } },
                  { name: { contains: 'Cash' } },
                  { subType: 'Cash' },
                ],
                isActive: true,
              },
            });
            creditAccountId = cashAccount?.id || null;
          }

          if (creditAccountId) {
            const totalAmt = data.totalAmount || (data.amount || 0) + (data.vatAmount || 0);

            // Generate journal entry number
            const jYear = new Date().getFullYear();
            const jPrefix = `JE-EXP-${jYear}-`;
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

            await tx.journalEntry.create({
              data: {
                entryNumber,
                date: data.date || new Date(),
                description: `Expense: ${data.description || data.category || expense.expenseNumber}`,
                reference: expense.expenseNumber,
                referenceType: 'EXPENSE_ENTRY',
                totalDebit: totalAmt,
                totalCredit: totalAmt,
                status: 'POSTED',
                createdById: userId,
                postedAt: new Date(),
                notes: JSON.stringify({ expenseEntryId: expense.id, vendorId: data.vendorId, paymentMethod: data.paymentMethod }),
                lines: {
                  create: [
                    {
                      lineNumber: 1,
                      accountId: data.accountId,
                      description: `Expense - ${data.category || data.description || ''}`,
                      debitAmount: totalAmt,
                      creditAmount: 0,
                      vendorId: data.vendorId || undefined,
                    },
                    {
                      lineNumber: 2,
                      accountId: creditAccountId,
                      description: `Payment - ${data.paymentMethod || 'Cash'}`,
                      debitAmount: 0,
                      creditAmount: totalAmt,
                    },
                  ],
                },
              },
            });

            // Update account balances
            // Expense account (EXPENSE, normal debit): +totalAmt
            await tx.account.update({
              where: { id: data.accountId },
              data: { currentBalance: { increment: totalAmt } },
            });
            // Cash/Bank account (ASSET, normal debit): -totalAmt (credit reduces asset)
            await tx.account.update({
              where: { id: creditAccountId },
              data: { currentBalance: { increment: -totalAmt } },
            });
          }
        }

        // Update BankAccount balance + create BankTransaction for bank/cheque payments
        if ((data.paymentMethod === 'Bank' || data.paymentMethod === 'Cheque') && data.bankAccountId) {
          const expTotal = data.totalAmount || (data.amount || 0) + (data.vatAmount || 0);
          await tx.bankAccount.update({
            where: { id: data.bankAccountId },
            data: { currentBalance: { increment: -expTotal } },
          });
          await tx.bankTransaction.create({
            data: {
              bankAccountId: data.bankAccountId,
              transactionDate: data.date || new Date(),
              type: 'DEBIT',
              description: `Expense - ${data.category || data.description || expense.expenseNumber}`,
              reference: expense.expenseNumber,
              amount: expTotal,
              runningBalance: 0,
              documentType: 'EXPENSE',
              documentRef: expense.expenseNumber,
            },
          });
        }

        return expense;
      });

      res.status(201).json({ success: true, data: expense });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

// ==================== PAYABLE EXPENSES ====================
// Custom controller: auto-creates journal entry on payable creation
// DR Expense Account | CR Accounts Payable
const payableExpenseCrud = crud(prisma.payableExpense, { vendor: true, jobReference: true, bankAccount: true }, { date: 'desc' }, {
  autoCodePrefix: 'PE',
  autoCodeField: 'expenseNumber',
  allowedFields: ['expenseNumber', 'vendorId', 'jobRefId', 'bankAccountId', 'date', 'dueDate', 'amount', 'vatAmount', 'totalAmount', 'paidAmount', 'balanceDue', 'category', 'description', 'paymentMethod', 'status'],
});

export const payableExpenseController = {
  getAll: payableExpenseCrud.getAll,
  getById: payableExpenseCrud.getById,
  update: payableExpenseCrud.update,
  remove: payableExpenseCrud.remove,
  async create(req: Request, res: Response) {
    try {
      const allowedFields = ['expenseNumber', 'vendorId', 'jobRefId', 'bankAccountId', 'date', 'dueDate', 'amount', 'vatAmount', 'totalAmount', 'paidAmount', 'balanceDue', 'category', 'description', 'paymentMethod', 'status'];
      const data: any = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }

      // Auto-generate expense number (sequential PE-YYYY-NNNN)
      if (!data.expenseNumber) {
        data.expenseNumber = await generateNumber('PAYABLE_EXPENSE', 'PE');
      }

      // Parse dates
      if (data.date && typeof data.date === 'string') data.date = new Date(data.date);
      if (data.dueDate && typeof data.dueDate === 'string') data.dueDate = new Date(data.dueDate);

      // Create the payable expense
      // Clear empty FK strings to avoid constraint issues
      if (!data.jobRefId) delete data.jobRefId;
      if (!data.bankAccountId) delete data.bankAccountId;

      const payable = await prisma.$transaction(async (tx) => {
        const payable = await tx.payableExpense.create({ data, include: { vendor: true, jobReference: true, bankAccount: true } });

        // Auto-create Journal Entry for accounting trail
        const userId = (req as any).user?.id;
        if (userId) {
          const totalAmt = data.totalAmount || (data.amount || 0) + (data.vatAmount || 0);

          // Find an Accounts Payable type account for the credit side
          const apAccount = await tx.account.findFirst({
            where: {
              OR: [
                { subType: 'Accounts Payable' },
                { name: { contains: 'Accounts Payable' } },
                { name: { contains: 'Payable' } },
                { type: 'LIABILITY' },
              ],
              isActive: true,
            },
          });

          // Find a general expense account for the debit side
          const expAccount = await tx.account.findFirst({
            where: {
              OR: [
                { type: 'EXPENSE' },
                { name: { contains: 'Expense' } },
              ],
              isActive: true,
            },
          });

          if (apAccount && expAccount) {
            // Generate journal entry number
            const jYear = new Date().getFullYear();
            const jPrefix = `JE-PE-${jYear}-`;
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

            await tx.journalEntry.create({
              data: {
                entryNumber,
                date: data.date || new Date(),
                description: `Payable Expense: ${data.description || payable.expenseNumber}`,
                reference: payable.expenseNumber,
                referenceType: 'PAYABLE_EXPENSE',
                totalDebit: totalAmt,
                totalCredit: totalAmt,
                status: 'POSTED',
                createdById: userId,
                postedAt: new Date(),
                notes: JSON.stringify({ payableExpenseId: payable.id, vendorId: data.vendorId }),
                lines: {
                  create: [
                    {
                      lineNumber: 1,
                      accountId: expAccount.id,
                      description: `Payable - ${data.description || data.category || ''}`,
                      debitAmount: totalAmt,
                      creditAmount: 0,
                      vendorId: data.vendorId || undefined,
                    },
                    {
                      lineNumber: 2,
                      accountId: apAccount.id,
                      description: `Accounts Payable - ${payable.vendor?.name || ''}`,
                      debitAmount: 0,
                      creditAmount: totalAmt,
                      vendorId: data.vendorId || undefined,
                    },
                  ],
                },
              },
            });

            // Update account balances
            // Expense account (EXPENSE, normal debit): +totalAmt
            await tx.account.update({
              where: { id: expAccount.id },
              data: { currentBalance: { increment: totalAmt } },
            });
            // AP account (LIABILITY, normal credit): +totalAmt
            await tx.account.update({
              where: { id: apAccount.id },
              data: { currentBalance: { increment: totalAmt } },
            });
          }
        }

        // Update vendor balance (increase outstanding payable)
        if (data.vendorId) {
          const peTotal = data.totalAmount || (data.amount || 0) + (data.vatAmount || 0);
          await tx.vendor.update({
            where: { id: data.vendorId },
            data: {
              totalBilled: { increment: peTotal },
              outstandingBalance: { increment: peTotal },
            },
          });
        }

        return payable;
      });

      res.status(201).json({ success: true, data: payable });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

// ==================== CLIENT OPB ====================
export const clientOPBController = crud(prisma.clientOPB, { client: true }, { date: 'desc' }, {
  allowedFields: ['clientId', 'date', 'debitAmount', 'creditAmount', 'description', 'reference'],
});

// ==================== PAYABLE OPB ====================
export const payableOPBController = crud(prisma.payableOPB, { vendor: true }, { date: 'desc' }, {
  allowedFields: ['vendorId', 'date', 'debitAmount', 'creditAmount', 'description', 'reference'],
});

// ==================== TERMINALS ====================
export const terminalController = crud(prisma.terminal, undefined, { name: 'asc' }, {
  autoCodePrefix: 'TRM',
  allowedFields: ['code', 'name', 'nameAr', 'port', 'city', 'country', 'isActive'],
});

// ==================== PORT HANDLING ====================
export const portHandlingController = crud(prisma.portHandling, undefined, { name: 'asc' }, {
  autoCodePrefix: 'PH',
  allowedFields: ['code', 'name', 'nameAr', 'portName', 'handlingType', 'defaultRate', 'isActive'],
});

// ==================== SHIPMENTS ====================
export const shipmentController = crud(prisma.shipment, undefined, { createdAt: 'desc' }, {
  autoCodePrefix: 'SHP',
  autoCodeField: 'shipmentNumber',
  allowedFields: ['shipmentNumber', 'origin', 'destination', 'status', 'modeOfTransport', 'carrier', 'etd', 'eta', 'atd', 'ata', 'notes'],
});

// ==================== DAILY WORK ORDERS ====================
export const dailyWorkOrderController = crud(prisma.dailyWorkOrder, undefined, { date: 'desc' }, {
  autoCodePrefix: 'DWO',
  autoCodeField: 'orderNumber',
  allowedFields: ['orderNumber', 'date', 'assignedTo', 'description', 'location', 'status', 'priority', 'completedAt', 'notes'],
});

// ==================== SALES QUOTES ====================
const salesQuoteCrud = crud(prisma.salesQuote, undefined, { createdAt: 'desc' }, {
  autoCodePrefix: 'SQ',
  autoCodeField: 'quoteNumber',
  allowedFields: ['quoteNumber', 'clientName', 'clientEmail', 'clientPhone', 'quoteDate', 'validUntil', 'subtotal', 'vatAmount', 'totalAmount', 'status', 'notes', 'items'],
});
export const salesQuoteController = {
  ...salesQuoteCrud,
  async send(req: Request, res: Response) {
    try {
      const quote = await prisma.salesQuote.update({
        where: { id: req.params.id },
        data: { status: 'SENT' },
      });
      res.json({ success: true, data: quote });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async convertToInvoice(req: Request, res: Response) {
    try {
      const quote = await prisma.salesQuote.findUnique({ where: { id: req.params.id } });
      if (!quote) return res.status(404).json({ success: false, error: 'Quote not found' });

      // Find client by name (or use clientId from request body)
      const clientId = req.body.clientId;
      let resolvedClientId = clientId;
      if (!resolvedClientId && quote.clientName) {
        const client = await prisma.customer.findFirst({ where: { name: quote.clientName } });
        if (client) resolvedClientId = client.id;
      }
      if (!resolvedClientId) {
        return res.status(400).json({ success: false, error: 'Client is required. Please provide clientId.' });
      }

      // Parse quote items
      let quoteItems: any[] = [];
      if (quote.items) {
        try { quoteItems = typeof quote.items === 'string' ? JSON.parse(quote.items) : []; } catch { quoteItems = []; }
      }

      // Create Sales Invoice from the quote
      const invoiceNumber = await generateNumber('SALES_INVOICE', 'INV');
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // Default 30-day payment terms

      const invoice = await prisma.$transaction(async (tx) => {
        const inv = await tx.salesInvoice.create({
          data: {
            invoiceNumber,
            clientId: resolvedClientId,
            invoiceDate: new Date(),
            dueDate,
            subtotal: quote.subtotal || 0,
            vatAmount: quote.vatAmount || 0,
            totalAmount: quote.totalAmount || 0,
            balanceDue: quote.totalAmount || 0,
            status: 'DRAFT',
            notes: `Converted from Quote: ${quote.quoteNumber}`,
            items: {
              create: quoteItems.map((item: any, idx: number) => ({
                lineNumber: idx + 1,
                serviceId: item.serviceId || undefined,
                nameEn: item.name || item.nameEn || '',
                nameAr: item.nameAr || '',
                description: item.description || '',
                amount: item.amount || 0,
                vatRate: (item.vatPercent || 15) / 100,
                vatAmount: item.vatAmount || 0,
                totalAmount: item.total || item.totalAmount || 0,
              })),
            },
          },
          include: { items: true, client: true },
        });

        // Mark quote as accepted
        await tx.salesQuote.update({
          where: { id: req.params.id },
          data: { status: 'Accepted' },
        });

        // Auto-create Journal Entry (same pattern as salesInvoiceController.create)
        const userId = (req as any).user?.id;
        const totalAmt = quote.totalAmount || 0;
        const vatAmt = quote.vatAmount || 0;
        const subtotalAmt = quote.subtotal || (totalAmt - vatAmt);

        if (userId && totalAmt > 0) {
          const arAccount = await tx.account.findFirst({
            where: {
              OR: [
                { subType: 'Accounts Receivable' },
                { name: { contains: 'Accounts Receivable' } },
                { name: { contains: 'Receivable' } },
                { code: { startsWith: '1200' } },
              ],
              isActive: true,
            },
          });
          const revenueAccount = await tx.account.findFirst({
            where: {
              OR: [
                { subType: 'Sales Revenue' },
                { type: 'REVENUE' },
                { name: { contains: 'Sales' } },
                { name: { contains: 'Revenue' } },
              ],
              isActive: true,
            },
          });
          let vatAccount: any = null;
          if (vatAmt > 0) {
            vatAccount = await tx.account.findFirst({
              where: {
                OR: [
                  { name: { contains: 'VAT Output' } },
                  { name: { contains: 'VAT Payable' } },
                  { name: { contains: 'Output Tax' } },
                  { subType: 'VAT' },
                ],
                isActive: true,
              },
            });
          }

          if (arAccount && revenueAccount) {
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

            const journalLines: any[] = [
              {
                lineNumber: 1,
                accountId: arAccount.id,
                description: `Accounts Receivable - ${inv.client?.name || ''} - ${inv.invoiceNumber}`,
                debitAmount: totalAmt,
                creditAmount: 0,
                customerId: resolvedClientId,
              },
            ];

            if (vatAccount && vatAmt > 0) {
              journalLines.push({
                lineNumber: 2,
                accountId: revenueAccount.id,
                description: `Sales Revenue - ${inv.invoiceNumber}`,
                debitAmount: 0,
                creditAmount: subtotalAmt,
              });
              journalLines.push({
                lineNumber: 3,
                accountId: vatAccount.id,
                description: `VAT Output 15% - ${inv.invoiceNumber}`,
                debitAmount: 0,
                creditAmount: vatAmt,
              });
            } else {
              journalLines.push({
                lineNumber: 2,
                accountId: revenueAccount.id,
                description: `Sales Revenue - ${inv.invoiceNumber}`,
                debitAmount: 0,
                creditAmount: totalAmt,
              });
            }

            await tx.journalEntry.create({
              data: {
                entryNumber,
                date: new Date(),
                description: `Sales Invoice: ${inv.invoiceNumber} - ${inv.client?.name || ''} (from Quote: ${quote.quoteNumber})`,
                reference: inv.invoiceNumber,
                referenceType: 'SALES_INVOICE',
                totalDebit: totalAmt,
                totalCredit: totalAmt,
                status: 'POSTED',
                createdById: userId,
                postedAt: new Date(),
                notes: JSON.stringify({ salesInvoiceId: inv.id, clientId: resolvedClientId, quoteId: quote.id }),
                lines: { create: journalLines },
              },
            });

            // Update account balances
            await tx.account.update({ where: { id: arAccount.id }, data: { currentBalance: { increment: totalAmt } } });
            await tx.account.update({ where: { id: revenueAccount.id }, data: { currentBalance: { increment: vatAccount ? subtotalAmt : totalAmt } } });
            if (vatAccount && vatAmt > 0) {
              await tx.account.update({ where: { id: vatAccount.id }, data: { currentBalance: { increment: vatAmt } } });
            }
          }
        }

        // Update customer balances
        if (resolvedClientId && totalAmt > 0) {
          await tx.customer.update({
            where: { id: resolvedClientId },
            data: {
              totalInvoiced: { increment: totalAmt },
              outstandingBalance: { increment: totalAmt },
            },
          });
        }

        return inv;
      });

      res.json({ success: true, data: invoice });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

// ==================== FCL/LCL ====================
export const fclLclController = crud(prisma.fclLcl, undefined, { name: 'asc' }, {
  autoCodePrefix: 'FCL',
  allowedFields: ['code', 'name', 'containerType', 'defaultRate', 'isActive'],
});

// ==================== FILE VERIFICATION ====================
export const fileVerificationController = crud(prisma.fileVerification, undefined, { createdAt: 'desc' }, {
  autoCodePrefix: 'FV',
  autoCodeField: 'fileNumber',
  allowedFields: ['fileNumber', 'jobReferenceNum', 'clientName', 'documentType', 'status', 'verifiedBy', 'verifiedAt', 'notes'],
});

// ==================== CRM LEADS ====================
export const crmLeadController = crud(prisma.cRMLead, undefined, { createdAt: 'desc' }, {
  allowedFields: ['name', 'company', 'email', 'phone', 'source', 'status', 'priority', 'assignedTo', 'notes', 'nextFollowUp'],
});

// ==================== FLEET (VEHICLES) ====================
export const fleetController = crud(prisma.vehicle, undefined, { createdAt: 'desc' }, {
  allowedFields: ['plateNumber', 'make', 'model', 'year', 'type', 'driver', 'status', 'location', 'fuelLevel', 'nextServiceDate', 'mileage', 'jobRef'],
});

// ==================== ASSETS ====================
export const assetController = crud(prisma.asset, undefined, { createdAt: 'desc' }, {
  allowedFields: ['name', 'category', 'purchaseDate', 'cost', 'currentValue', 'depreciationRate', 'location', 'status'],
});

// ==================== RCV/PVC VOUCHERS ====================
export const rcvPvcController = {
  async getAll(req: Request, res: Response) {
    try {
      const items = await prisma.rcvPvc.findMany({
        include: { customer: true, vendor: true },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: items });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async getById(req: Request, res: Response) {
    try {
      const item = await prisma.rcvPvc.findUnique({
        where: { id: req.params.id },
        include: { customer: true, vendor: true },
      });
      if (!item) return res.status(404).json({ success: false, error: 'Not found' });
      res.json({ success: true, data: item });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async create(req: Request, res: Response) {
    try {
      const allowed = ['type', 'voucherNo', 'date', 'clientId', 'vendorId', 'amount', 'reference', 'status', 'notes'];
      const data: any = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }

      // Parse date
      if (data.date && typeof data.date === 'string') data.date = new Date(data.date);
      if (!data.date) data.date = new Date();

      // Parse amount
      if (data.amount !== undefined) data.amount = Number(data.amount) || 0;

      // Default type
      if (!data.type) data.type = 'RCV';

      // Auto-generate voucher number
      if (!data.voucherNo) {
        const counterName = data.type === 'PVC' ? 'PVC_VOUCHER' : 'RCV_VOUCHER';
        const counterPrefix = data.type === 'PVC' ? 'PVC' : 'RCV';
        data.voucherNo = await generateNumber(counterName, counterPrefix);
      }

      // Strip invalid FK fields (empty strings, nulls, or short invalid IDs)
      for (const fk of ['clientId', 'vendorId']) {
        if (!data[fk] || (typeof data[fk] === 'string' && data[fk].trim().length === 0)) {
          data[fk] = null;
        }
      }

      const item = await prisma.$transaction(async (tx) => {
        const item = await tx.rcvPvc.create({ data, include: { customer: true, vendor: true } });

        // Auto-create journal entry
        const userId = (req as any).user?.id;
        if (userId && data.amount > 0) {
          const totalAmt = data.amount;

          // Find bank/cash account
          const cashAccount = await tx.account.findFirst({
            where: { OR: [{ name: { contains: 'Cash' } }, { subType: 'Cash' }], isActive: true },
          });

          if (data.type === 'RCV') {
            // RCV: DR Bank/Cash, CR Accounts Receivable
            const arAccount = await tx.account.findFirst({
              where: { OR: [{ name: { contains: 'Receivable' } }, { subType: 'CURRENT_ASSET' }], isActive: true },
            });
            if (cashAccount && arAccount) {
              const jYear = new Date().getFullYear();
              const jPrefix = `JE-RCV-${jYear}-`;
              const lastJE = await tx.journalEntry.findFirst({ where: { entryNumber: { startsWith: jPrefix } }, orderBy: { entryNumber: 'desc' } });
              let jSeq = 1;
              if (lastJE) { const n = parseInt(lastJE.entryNumber.replace(jPrefix, ''), 10); if (!isNaN(n)) jSeq = n + 1; }
              await tx.journalEntry.create({
                data: {
                  entryNumber: `${jPrefix}${String(jSeq).padStart(4, '0')}`,
                  date: data.date, description: `Receipt Voucher: ${item.voucherNo}`,
                  reference: item.voucherNo, referenceType: 'RCV',
                  totalDebit: totalAmt, totalCredit: totalAmt, status: 'POSTED',
                  createdById: userId, postedAt: new Date(),
                  lines: { create: [
                    { lineNumber: 1, accountId: cashAccount.id, description: `Cash receipt - ${item.voucherNo}`, debitAmount: totalAmt, creditAmount: 0, customerId: data.clientId || undefined },
                    { lineNumber: 2, accountId: arAccount.id, description: `AR cleared - ${item.voucherNo}`, debitAmount: 0, creditAmount: totalAmt, customerId: data.clientId || undefined },
                  ]},
                },
              });

              // Update Account balances: Cash +debit, AR -credit
              await tx.account.update({ where: { id: cashAccount.id }, data: { currentBalance: { increment: totalAmt } } });
              await tx.account.update({ where: { id: arAccount.id }, data: { currentBalance: { decrement: totalAmt } } });

              // Update BankAccount balance + create BankTransaction
              const rcvBank = await tx.bankAccount.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
              if (rcvBank) {
                await tx.bankAccount.update({ where: { id: rcvBank.id }, data: { currentBalance: { increment: totalAmt } } });
                await tx.bankTransaction.create({
                  data: {
                    bankAccountId: rcvBank.id, transactionDate: data.date || new Date(),
                    type: 'CREDIT', description: `Receipt Voucher - ${item.customer?.name || ''} - ${item.voucherNo}`,
                    reference: item.voucherNo, amount: totalAmt, runningBalance: 0,
                    documentType: 'RECEIPT', documentRef: item.voucherNo,
                  },
                });
              }

              // Update customer balance if linked
              if (data.clientId) {
                await tx.customer.update({
                  where: { id: data.clientId },
                  data: { totalPaid: { increment: totalAmt }, outstandingBalance: { decrement: totalAmt } },
                });
              }
            }
          } else {
            // PVC: DR Accounts Payable, CR Bank/Cash
            const apAccount = await tx.account.findFirst({
              where: { OR: [{ name: { contains: 'Payable' } }, { type: 'LIABILITY' }], isActive: true },
            });
            if (cashAccount && apAccount) {
              const jYear = new Date().getFullYear();
              const jPrefix = `JE-PVC-${jYear}-`;
              const lastJE = await tx.journalEntry.findFirst({ where: { entryNumber: { startsWith: jPrefix } }, orderBy: { entryNumber: 'desc' } });
              let jSeq = 1;
              if (lastJE) { const n = parseInt(lastJE.entryNumber.replace(jPrefix, ''), 10); if (!isNaN(n)) jSeq = n + 1; }
              await tx.journalEntry.create({
                data: {
                  entryNumber: `${jPrefix}${String(jSeq).padStart(4, '0')}`,
                  date: data.date, description: `Payment Voucher: ${item.voucherNo}`,
                  reference: item.voucherNo, referenceType: 'PVC',
                  totalDebit: totalAmt, totalCredit: totalAmt, status: 'POSTED',
                  createdById: userId, postedAt: new Date(),
                  lines: { create: [
                    { lineNumber: 1, accountId: apAccount.id, description: `AP cleared - ${item.voucherNo}`, debitAmount: totalAmt, creditAmount: 0, vendorId: data.vendorId || undefined },
                    { lineNumber: 2, accountId: cashAccount.id, description: `Cash payment - ${item.voucherNo}`, debitAmount: 0, creditAmount: totalAmt, vendorId: data.vendorId || undefined },
                  ]},
                },
              });

              // Update Account balances: AP -debit (reduce liability), Cash -credit
              await tx.account.update({ where: { id: apAccount.id }, data: { currentBalance: { decrement: totalAmt } } });
              await tx.account.update({ where: { id: cashAccount.id }, data: { currentBalance: { decrement: totalAmt } } });

              // Update BankAccount balance + create BankTransaction
              const pvcBank = await tx.bankAccount.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
              if (pvcBank) {
                await tx.bankAccount.update({ where: { id: pvcBank.id }, data: { currentBalance: { decrement: totalAmt } } });
                await tx.bankTransaction.create({
                  data: {
                    bankAccountId: pvcBank.id, transactionDate: data.date || new Date(),
                    type: 'DEBIT', description: `Payment Voucher - ${item.vendor?.name || ''} - ${item.voucherNo}`,
                    reference: item.voucherNo, amount: totalAmt, runningBalance: 0,
                    documentType: 'PAYMENT', documentRef: item.voucherNo,
                  },
                });
              }

              // Update vendor balance if linked
              if (data.vendorId) {
                await tx.vendor.update({
                  where: { id: data.vendorId },
                  data: { totalPaid: { increment: totalAmt }, outstandingBalance: { decrement: totalAmt } },
                });
              }
            }
          }
        }

        return item;
      });

      res.status(201).json({ success: true, data: item });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async update(req: Request, res: Response) {
    try {
      const allowed = ['type', 'voucherNo', 'date', 'clientId', 'vendorId', 'amount', 'reference', 'status', 'notes'];
      const data: any = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }
      if (data.date && typeof data.date === 'string') data.date = new Date(data.date);
      if (data.amount !== undefined) data.amount = Number(data.amount) || 0;
      // Strip invalid FK fields
      for (const fk of ['clientId', 'vendorId']) {
        if (data[fk] !== undefined && (!data[fk] || (typeof data[fk] === 'string' && data[fk].trim().length === 0))) {
          data[fk] = null;
        }
      }
      const item = await prisma.rcvPvc.update({ where: { id: req.params.id }, data, include: { customer: true, vendor: true } });
      res.json({ success: true, data: item });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async remove(req: Request, res: Response) {
    try {
      await prisma.rcvPvc.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Deleted' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

// ==================== PAYMENT ENTRIES ====================
// Stored as JournalEntry records with referenceType='PAYMENT_ENTRY'
// so they appear in the accounting journal/ledger automatically.

function parsePaymentMeta(notes: string | null): any {
  try { return notes ? JSON.parse(notes) : {}; } catch { return {}; }
}

function formatPaymentEntry(je: any): any {
  const meta = parsePaymentMeta(je.notes);
  return {
    id: je.id,
    documentId: je.entryNumber,
    documentDate: je.date,
    documentNumber: je.reference || '',
    clientId: meta.clientId || '',
    jobRefId: meta.jobRefId || '',
    invoiceId: meta.invoiceId || '',
    method: meta.method || 'Cash',
    entryType: meta.entryType || 'Payment',
    ledgerAccountId: meta.ledgerAccountId || '',
    totalCr: je.totalCredit,
    totalDr: je.totalDebit,
    isBalanced: Math.abs(je.totalDebit - je.totalCredit) < 0.01,
    lines: (je.lines || []).map((l: any) => ({
      id: l.id,
      paymentStatus: l.description || '',
      crAmount: l.creditAmount,
      drAmount: l.debitAmount,
      accountId: l.accountId,
    })),
    createdBy: je.createdBy?.firstName ? `${je.createdBy.firstName} ${je.createdBy.lastName}` : '',
    createdAt: je.createdAt,
    status: je.status,
  };
}

export const paymentEntryController = {
  async getAll(req: Request, res: Response) {
    try {
      const entries = await prisma.journalEntry.findMany({
        where: { referenceType: 'PAYMENT_ENTRY' },
        include: { lines: true, createdBy: true },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: entries.map(formatPaymentEntry) });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async getById(req: Request, res: Response) {
    try {
      const entry = await prisma.journalEntry.findUnique({
        where: { id: req.params.id },
        include: { lines: { include: { account: true } }, createdBy: true },
      });
      if (!entry || entry.referenceType !== 'PAYMENT_ENTRY') {
        return res.status(404).json({ success: false, error: 'Not found' });
      }
      res.json({ success: true, data: formatPaymentEntry(entry) });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async create(req: Request, res: Response) {
    try {
      const { clientId, jobRefId, invoiceId, documentDate, documentNumber, method, entryType, ledgerAccountId, lines, totalCr, totalDr, appliedAdvances } = req.body;
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

      // Validate Cr = Dr
      const crSum = (lines || []).reduce((s: number, l: any) => s + (l.crAmount || 0), 0);
      const drSum = (lines || []).reduce((s: number, l: any) => s + (l.drAmount || 0), 0);
      if (Math.abs(crSum - drSum) > 0.01) {
        return res.status(400).json({ success: false, error: 'Debit and Credit must be equal (Dr = Cr)' });
      }

      // Prevent duplicate payment entry for the same invoice
      if (invoiceId) {
        const existing = await prisma.journalEntry.findMany({
          where: { referenceType: 'PAYMENT_ENTRY' },
          select: { id: true, notes: true, entryNumber: true },
        });
        const duplicate = existing.find((je: any) => {
          try {
            const meta = je.notes ? JSON.parse(je.notes) : {};
            return meta.invoiceId === invoiceId;
          } catch { return false; }
        });
        if (duplicate) {
          return res.status(400).json({
            success: false,
            error: `A payment entry already exists for this invoice (${duplicate.entryNumber}). Cannot create duplicate.`,
          });
        }
      }

      const entryNumber = await generateNumber('PAYMENT_ENTRY', 'PE');

      // Pre-generate advance journal entry numbers OUTSIDE the transaction
      // (generateNumber uses global prisma which conflicts with SQLite's single-writer inside tx)
      const advJeNumbers: string[] = [];
      if (appliedAdvances && appliedAdvances.length > 0) {
        for (let i = 0; i < appliedAdvances.length; i++) {
          advJeNumbers.push(await generateNumber('PAYMENT_ENTRY', 'PE-ADV'));
        }
      }

      const entry = await prisma.$transaction(async (tx) => {
        // Find a default account for lines without specific account
        let defaultAccount = await tx.account.findFirst({ where: { isActive: true } });
        if (!defaultAccount) {
          throw new Error('No active accounts found in chart of accounts. Please set up accounts first.');
        }
        const defaultAccountId = defaultAccount.id;

        // Build journal lines
        const journalLines = (lines || []).map((l: any, idx: number) => ({
          lineNumber: idx + 1,
          accountId: l.accountId || defaultAccountId,
          description: l.paymentStatus || '',
          debitAmount: l.drAmount || 0,
          creditAmount: l.crAmount || 0,
          customerId: clientId || undefined,
        }));

        // Metadata stored in notes
        const advanceTotal = (appliedAdvances || []).reduce((s: number, a: any) => s + (a.amount || 0), 0);
        const meta = JSON.stringify({ clientId, jobRefId, invoiceId, method, entryType, ledgerAccountId, appliedAdvances: appliedAdvances || [], advanceTotal });

        const entry = await tx.journalEntry.create({
          data: {
            entryNumber,
            date: documentDate ? new Date(documentDate) : new Date(),
            description: `Payment Entry - ${entryType || 'Payment'} - ${method || 'Cash'}`,
            reference: documentNumber || undefined,
            referenceType: 'PAYMENT_ENTRY',
            totalDebit: drSum,
            totalCredit: crSum,
            status: 'POSTED',
            createdById: userId,
            postedAt: new Date(),
            notes: meta,
            lines: { create: journalLines },
          },
          include: { lines: true, createdBy: true },
        });

        // Look up advance liability account ID BEFORE the balance loop (needed to skip it)
        let advanceLiabilityAccountId: string | null = null;
        if (appliedAdvances && appliedAdvances.length > 0) {
          let _advLiab = await tx.account.findFirst({
            where: { OR: [{ name: { contains: 'Client Advance' } }, { name: { contains: 'Customer Advance' } }, { name: { contains: 'Advance from' } }, { subType: 'Customer Deposits' }], isActive: true },
          });
          if (!_advLiab) _advLiab = await tx.account.findFirst({ where: { OR: [{ type: 'LIABILITY' }, { name: { contains: 'Liability' } }], isActive: true } });
          advanceLiabilityAccountId = _advLiab?.id || null;
        }

        // Update Account.currentBalance for each journal line
        // Convention B (debit-positive): increment by (debit - credit)
        // EXCEPT: skip advance liability account — handled separately below
        for (const line of journalLines) {
          if (!line.accountId) continue;
          if (advanceLiabilityAccountId && line.accountId === advanceLiabilityAccountId) continue; // skip, handled in advance section
          const netAmount = (line.debitAmount || 0) - (line.creditAmount || 0);
          if (Math.abs(netAmount) > 0.001) {
            await tx.account.update({
              where: { id: line.accountId },
              data: { currentBalance: { increment: netAmount } },
            });
          }
        }

        // Handle advance liability balance update separately (Convention A: debit DECREASES liability)
        if (advanceLiabilityAccountId) {
          const advLine = journalLines.find((l: any) => l.accountId === advanceLiabilityAccountId);
          if (advLine && (advLine.debitAmount || 0) > 0) {
            await tx.account.update({
              where: { id: advanceLiabilityAccountId },
              data: { currentBalance: { decrement: advLine.debitAmount } },
            });
          }
        }

        // Update BankAccount + BankTransaction if payment method is Bank/Cheque
        if ((method === 'Bank' || method === 'Cheque') && ledgerAccountId) {
          // Find linked bank account by its accountId, or fallback to name matching
          let linkedBank = await tx.bankAccount.findFirst({ where: { accountId: ledgerAccountId, isActive: true } });
          if (!linkedBank) {
            // Try to link by matching the ledger account name to bank name
            const ledgerAccount = await tx.account.findUnique({ where: { id: ledgerAccountId }, select: { name: true } });
            if (ledgerAccount?.name) {
              linkedBank = await tx.bankAccount.findFirst({
                where: { bankName: { contains: ledgerAccount.name.replace(/\s*(bank|account|cash)\s*/gi, '').trim() }, isActive: true },
              });
              // If found, link it for future lookups
              if (linkedBank) {
                await tx.bankAccount.update({ where: { id: linkedBank.id }, data: { accountId: ledgerAccountId } });
              }
            }
          }
          if (linkedBank) {
            // Find the bank line - it's the line with ledgerAccountId
            const bankLine = journalLines.find((l: any) => l.accountId === ledgerAccountId);
            if (bankLine) {
              // For payment receipt: DR Bank (debit > 0) → bank balance increases
              // For payment disbursement: CR Bank (credit > 0) → bank balance decreases
              const bankNetAmount = (bankLine.debitAmount || 0) - (bankLine.creditAmount || 0);
              await tx.bankAccount.update({
                where: { id: linkedBank.id },
                data: { currentBalance: { increment: bankNetAmount } },
              });
              await tx.bankTransaction.create({
                data: {
                  bankAccountId: linkedBank.id,
                  transactionDate: documentDate ? new Date(documentDate) : new Date(),
                  type: bankNetAmount >= 0 ? 'CREDIT' : 'DEBIT',
                  description: `Payment Entry - ${entryType || 'Payment'} - ${entryNumber}`,
                  reference: documentNumber || entryNumber,
                  amount: Math.abs(bankNetAmount),
                  runningBalance: 0,
                  documentType: 'PAYMENT',
                  documentRef: entryNumber,
                },
              });
            }
          } else {
            // Fallback: try to find default bank
            const defaultBank = await tx.bankAccount.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
            if (defaultBank) {
              // Determine direction from actual journal lines: if ledger account has DR > CR, money came IN (CREDIT)
              const bankLine = journalLines.find((l: any) => l.accountId === ledgerAccountId);
              let isReceipt: boolean;
              let bankAmount: number;
              if (bankLine) {
                const netAmt = (bankLine.debitAmount || 0) - (bankLine.creditAmount || 0);
                isReceipt = netAmt >= 0;
                bankAmount = Math.abs(netAmt);
              } else {
                // Final fallback: check entryType
                isReceipt = entryType === 'Receive' || entryType === 'Receipt' || entryType === 'Payment';
                bankAmount = drSum;
              }
              await tx.bankAccount.update({
                where: { id: defaultBank.id },
                data: { currentBalance: { increment: isReceipt ? bankAmount : -bankAmount } },
              });
              await tx.bankTransaction.create({
                data: {
                  bankAccountId: defaultBank.id,
                  transactionDate: documentDate ? new Date(documentDate) : new Date(),
                  type: isReceipt ? 'CREDIT' : 'DEBIT',
                  description: `Payment Entry - ${entryType || 'Payment'} - ${entryNumber}`,
                  reference: documentNumber || entryNumber,
                  amount: bankAmount,
                  runningBalance: 0,
                  documentType: 'PAYMENT',
                  documentRef: entryNumber,
                },
              });
            }
          }
        }

        // Update customer balance if linked to a client (payment received against invoice)
        if (clientId && drSum > 0) {
          await tx.customer.update({
            where: { id: clientId },
            data: { totalPaid: { increment: drSum }, outstandingBalance: { decrement: drSum } },
          });
        }

        // Mark linked sales invoice as PAID/PARTIAL
        if (invoiceId) {
          const invoice = await tx.salesInvoice.findUnique({ where: { id: invoiceId } });
          if (invoice && invoice.status !== 'PAID') {
            const paymentAmount = drSum;
            const newPaid = (invoice.paidAmount || 0) + paymentAmount;
            const newBalance = Math.max(0, (invoice.totalAmount || 0) - newPaid);
            const newStatus = newBalance <= 0.01 ? 'PAID' : 'PARTIAL';

            await tx.salesInvoice.update({
              where: { id: invoiceId },
              data: {
                paidAmount: newPaid,
                balanceDue: newBalance,
                status: newStatus,
              },
            });

            // Also update customer balance from invoice's clientId if not already done above
            if (invoice.clientId && invoice.clientId !== clientId) {
              await tx.customer.update({
                where: { id: invoice.clientId },
                data: { totalPaid: { increment: paymentAmount }, outstandingBalance: { decrement: paymentAmount } },
              });
            }
          }
        }

        // Apply client advances if provided
        if (appliedAdvances && appliedAdvances.length > 0) {
          // Find Advance Liability account (DR side - reduce liability)
          let advanceLiabilityAccount = await tx.account.findFirst({
            where: {
              OR: [
                { name: { contains: 'Client Advance' } },
                { name: { contains: 'Customer Advance' } },
                { name: { contains: 'Advance from' } },
                { subType: 'Customer Deposits' },
              ],
              isActive: true,
            },
          });
          if (!advanceLiabilityAccount) {
            advanceLiabilityAccount = await tx.account.findFirst({
              where: { OR: [{ type: 'LIABILITY' }, { name: { contains: 'Liability' } }], isActive: true },
            });
          }

          // Find Accounts Receivable account (CR side - reduce receivable)
          let arAccount = await tx.account.findFirst({
            where: {
              OR: [
                { name: { contains: 'Accounts Receivable' } },
                { name: { contains: 'Trade Receivable' } },
                { subType: 'Accounts Receivable' },
              ],
              isActive: true,
            },
          });

          for (let advIdx = 0; advIdx < appliedAdvances.length; advIdx++) {
            const adv = appliedAdvances[advIdx];
            const advance = await tx.clientAdvance.findUnique({ where: { id: adv.advanceId } });
            if (!advance) continue;

            const applyAmount = Math.min(adv.amount || 0, advance.remainingAmount || 0);
            if (applyAmount <= 0) continue;

            const newUsed = (advance.usedAmount || 0) + applyAmount;
            const newRemaining = (advance.amount || 0) - newUsed;
            const newStatus = newRemaining <= 0.01 ? 'USED' : newUsed > 0 ? 'PARTIAL' : 'ACTIVE';

            await tx.clientAdvance.update({
              where: { id: adv.advanceId },
              data: { usedAmount: newUsed, remainingAmount: Math.max(0, newRemaining), status: newStatus },
            });

            // Create additional journal entry for advance application
            if (advanceLiabilityAccount && arAccount) {
              const advJeNumber = advJeNumbers[advIdx] || `PE-ADV-${Date.now()}`;
              await tx.journalEntry.create({
                data: {
                  entryNumber: advJeNumber,
                  date: documentDate ? new Date(documentDate) : new Date(),
                  description: `Advance Applied: ${advance.advanceNumber} against Payment ${entryNumber}`,
                  reference: entryNumber,
                  referenceType: 'ADVANCE_APPLICATION',
                  totalDebit: applyAmount,
                  totalCredit: applyAmount,
                  status: 'POSTED',
                  createdById: userId,
                  postedAt: new Date(),
                  notes: JSON.stringify({ clientAdvanceId: adv.advanceId, paymentEntryId: entry.id, clientId }),
                  lines: {
                    create: [
                      { lineNumber: 1, accountId: advanceLiabilityAccount.id, description: `DR Advance Liability - ${advance.advanceNumber}`, debitAmount: applyAmount, creditAmount: 0 },
                      { lineNumber: 2, accountId: arAccount.id, description: `CR Accounts Receivable - ${advance.advanceNumber}`, debitAmount: 0, creditAmount: applyAmount },
                    ],
                  },
                },
              });

              // NOTE: Account balance updates for advance liability and AR are handled
              // by the main journal balance loop above (advance liability is handled specially,
              // AR is handled by the CR AR line). No double-counting here.
            }
          }
        }

        return entry;
      }, { maxWait: 10000, timeout: 30000 });

      res.status(201).json({ success: true, data: formatPaymentEntry(entry) });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async remove(req: Request, res: Response) {
    try {
      const entry = await prisma.journalEntry.findUnique({
        where: { id: req.params.id },
        include: { lines: true },
      });
      if (!entry || entry.referenceType !== 'PAYMENT_ENTRY') {
        return res.status(404).json({ success: false, error: 'Not found' });
      }

      const meta = parsePaymentMeta(entry.notes);

      await prisma.$transaction(async (tx) => {
        // Look up advance liability account ID (to handle it specially)
        let advanceLiabilityAccountId: string | null = null;
        if (meta.appliedAdvances && meta.appliedAdvances.length > 0) {
          let _advLiab = await tx.account.findFirst({
            where: { OR: [{ name: { contains: 'Client Advance' } }, { name: { contains: 'Customer Advance' } }, { name: { contains: 'Advance from' } }, { subType: 'Customer Deposits' }], isActive: true },
          });
          if (!_advLiab) _advLiab = await tx.account.findFirst({ where: { OR: [{ type: 'LIABILITY' }, { name: { contains: 'Liability' } }], isActive: true } });
          advanceLiabilityAccountId = _advLiab?.id || null;
        }

        // 1. Reverse Account.currentBalance for each journal line
        // Convention B reversal for normal lines, Convention A reversal for advance liability
        for (const line of entry.lines || []) {
          if (advanceLiabilityAccountId && line.accountId === advanceLiabilityAccountId) {
            // Convention A reversal: CREATE did decrement (debit reduces liability), so reverse with increment
            if ((line.debitAmount || 0) > 0) {
              await tx.account.update({
                where: { id: line.accountId },
                data: { currentBalance: { increment: line.debitAmount } },
              });
            }
          } else {
            // Convention B reversal: decrement (debit - credit)
            const netAmount = (line.debitAmount || 0) - (line.creditAmount || 0);
            if (Math.abs(netAmount) > 0.001) {
              await tx.account.update({
                where: { id: line.accountId },
                data: { currentBalance: { decrement: netAmount } },
              });
            }
          }
        }

        // 2. Reverse BankAccount balance + delete BankTransaction
        const bankTxns = await tx.bankTransaction.findMany({
          where: { documentRef: entry.entryNumber, documentType: 'PAYMENT' },
        });
        for (const bt of bankTxns) {
          const reverseAmount = bt.type === 'CREDIT' ? -bt.amount : bt.amount;
          await tx.bankAccount.update({
            where: { id: bt.bankAccountId },
            data: { currentBalance: { increment: reverseAmount } },
          });
          await tx.bankTransaction.delete({ where: { id: bt.id } });
        }

        // 3. Reverse customer balance
        if (meta.clientId && entry.totalDebit > 0) {
          await tx.customer.update({
            where: { id: meta.clientId },
            data: { totalPaid: { decrement: entry.totalDebit }, outstandingBalance: { increment: entry.totalDebit } },
          });
        }

        // 4. Reverse invoice paidAmount/status
        if (meta.invoiceId) {
          const invoice = await tx.salesInvoice.findUnique({ where: { id: meta.invoiceId } });
          if (invoice) {
            const newPaid = Math.max(0, (invoice.paidAmount || 0) - entry.totalDebit);
            const newBalance = (invoice.totalAmount || 0) - newPaid;
            const newStatus = newPaid <= 0.01 ? (invoice.status === 'PAID' || invoice.status === 'PARTIAL' ? 'INVOICED' : invoice.status) : newBalance <= 0.01 ? 'PAID' : 'PARTIAL';
            await tx.salesInvoice.update({
              where: { id: meta.invoiceId },
              data: { paidAmount: newPaid, balanceDue: Math.max(0, newBalance), status: newStatus },
            });
          }
        }

        // 5. Reverse advance application
        if (meta.appliedAdvances && meta.appliedAdvances.length > 0) {
          for (const adv of meta.appliedAdvances) {
            const advance = await tx.clientAdvance.findUnique({ where: { id: adv.advanceId } });
            if (!advance) continue;
            const newUsed = Math.max(0, (advance.usedAmount || 0) - (adv.amount || 0));
            const newRemaining = (advance.amount || 0) - newUsed;
            const newStatus = newUsed <= 0.01 ? 'ACTIVE' : newRemaining <= 0.01 ? 'USED' : 'PARTIAL';
            await tx.clientAdvance.update({
              where: { id: adv.advanceId },
              data: { usedAmount: newUsed, remainingAmount: Math.max(0, newRemaining), status: newStatus },
            });
          }

          // Delete ADVANCE_APPLICATION journal entries linked to this payment
          // (No balance reversal needed — balance updates were done in the main journal loop)
          const advJournals = await tx.journalEntry.findMany({
            where: { referenceType: 'ADVANCE_APPLICATION', reference: entry.entryNumber },
          });
          for (const advJE of advJournals) {
            await tx.journalEntry.delete({ where: { id: advJE.id } });
          }
        }

        // 6. Delete the payment entry journal
        await tx.journalEntry.delete({ where: { id: req.params.id } });
      }, { maxWait: 10000, timeout: 30000 });

      res.json({ success: true, message: 'Deleted and all accounting reversed' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

// ==================== CLIENT SERVICES ====================
export const clientServiceController = {
  async getAll(req: Request, res: Response) {
    try {
      const { clientId } = req.query;
      const where: any = {};
      if (clientId) where.clientId = clientId;
      const items = await prisma.clientService.findMany({
        where,
        include: { service: true, client: true },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: items });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async getById(req: Request, res: Response) {
    try {
      const item = await prisma.clientService.findUnique({
        where: { id: req.params.id },
        include: { service: true, client: true },
      });
      if (!item) return res.status(404).json({ success: false, error: 'Not found' });
      res.json({ success: true, data: item });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async create(req: Request, res: Response) {
    try {
      const { clientId, serviceId, customAmount, customVat, notes, isActive } = req.body;
      if (!clientId || !serviceId) {
        return res.status(400).json({ success: false, error: 'clientId and serviceId are required' });
      }
      const item = await prisma.clientService.create({
        data: {
          clientId,
          serviceId,
          customAmount: customAmount != null ? Number(customAmount) : null,
          customVat: customVat != null ? Number(customVat) : null,
          notes: notes || null,
          isActive: isActive !== undefined ? isActive : true,
        },
        include: { service: true },
      });
      res.status(201).json({ success: true, data: item });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ success: false, error: 'This service is already assigned to this client' });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async update(req: Request, res: Response) {
    try {
      const { customAmount, customVat, notes, isActive } = req.body;
      const data: any = {};
      if (customAmount !== undefined) data.customAmount = customAmount != null ? Number(customAmount) : null;
      if (customVat !== undefined) data.customVat = customVat != null ? Number(customVat) : null;
      if (notes !== undefined) data.notes = notes;
      if (isActive !== undefined) data.isActive = isActive;
      const item = await prisma.clientService.update({
        where: { id: req.params.id },
        data,
        include: { service: true },
      });
      res.json({ success: true, data: item });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async remove(req: Request, res: Response) {
    try {
      await prisma.clientService.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Deleted' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async getMerged(req: Request, res: Response) {
    try {
      const { clientId } = req.query;
      if (!clientId) {
        return res.status(400).json({ success: false, error: 'clientId is required' });
      }
      const allServices = await prisma.invoiceService.findMany({
        where: { isActive: true },
        orderBy: { nameEn: 'asc' },
      });
      const clientServices = await prisma.clientService.findMany({
        where: { clientId: clientId as string, isActive: true },
      });
      const overrideMap = new Map(clientServices.map(cs => [cs.serviceId, cs]));

      const merged = allServices.map((svc: any) => {
        const override = overrideMap.get(svc.id);
        return {
          ...svc,
          name: svc.nameEn,
          groupId: svc.serviceGroup,
          defaultVatPercent: svc.vatApplicable === false ? 0 : 15,
          clientAmount: override?.customAmount ?? null,
          clientVat: override?.customVat ?? null,
          clientNotes: override?.notes ?? null,
          hasClientOverride: !!override,
        };
      });
      res.json({ success: true, data: merged });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

// ==================== CUSTOMER IMPORT (Excel/CSV) ====================
export const customerImportController = {
  async importFromExcel(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return res.status(400).json({ success: false, error: 'Empty workbook' });
      }
      const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

      if (rows.length === 0) {
        return res.status(400).json({ success: false, error: 'No data rows found in file' });
      }

      const colMap: Record<string, string> = {
        'name': 'name',
        'client name': 'name',
        'name (ar)': 'nameAr',
        'arabic name': 'nameAr',
        'name arabic': 'nameAr',
        'client type': 'clientType',
        'type': 'clientType',
        'cr number': 'crNumber',
        'cr no': 'crNumber',
        'vat number': 'vatNumber',
        'vat id': 'vatNumber',
        'vat no': 'vatNumber',
        'contact person': 'contactPerson',
        'contact': 'contactPerson',
        'phone': 'phone',
        'email': 'email',
        'city': 'city',
        'country': 'country',
        'address': 'address',
        'postal code': 'postalCode',
        'postal zone': 'postalCode',
        'authorization number': 'authorizationNumber',
        'auth number': 'authorizationNumber',
        'import number': 'importNumber',
        'export number': 'exportNumber',
        'credit limit': 'creditLimit',
        'payment terms (days)': 'paymentTermDays',
        'payment terms': 'paymentTermDays',
        'street name': 'streetName',
        'district': 'district',
        'building number': 'buildingNumber',
      };

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      const existing = await prisma.customer.findMany({ select: { name: true, vatNumber: true } });
      const existingSet = new Set(existing.map(c => `${c.name?.toLowerCase()}|${c.vatNumber || ''}`));

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        const mapped: any = {};
        for (const [header, value] of Object.entries(row)) {
          const key = colMap[header.toLowerCase().trim()];
          if (key) {
            mapped[key] = typeof value === 'string' ? value.trim() : value;
          }
        }

        if (!mapped.name) {
          errors.push(`Row ${rowNum}: Missing required field "Name"`);
          continue;
        }

        const dupKey = `${mapped.name.toLowerCase()}|${mapped.vatNumber || ''}`;
        if (existingSet.has(dupKey)) {
          skipped++;
          continue;
        }

        try {
          const creditLimit = mapped.creditLimit ? Number(mapped.creditLimit) || 0 : 0;
          const paymentTermDays = mapped.paymentTermDays ? Number(mapped.paymentTermDays) || 30 : 30;
          const code = `CLT-${Date.now().toString(36).toUpperCase()}-${i}`;

          await prisma.customer.create({
            data: {
              code,
              name: mapped.name,
              nameAr: mapped.nameAr || undefined,
              clientType: mapped.clientType || 'Business Client',
              crNumber: mapped.crNumber || undefined,
              vatNumber: mapped.vatNumber || undefined,
              contactPerson: mapped.contactPerson || undefined,
              phone: mapped.phone ? String(mapped.phone) : undefined,
              email: mapped.email || undefined,
              city: mapped.city || undefined,
              country: mapped.country || 'SAUDI ARABIA',
              address: mapped.address || undefined,
              postalCode: mapped.postalCode ? String(mapped.postalCode) : undefined,
              streetName: mapped.streetName || undefined,
              district: mapped.district || undefined,
              buildingNumber: mapped.buildingNumber ? String(mapped.buildingNumber) : undefined,
              authorizationNumber: mapped.authorizationNumber || undefined,
              importNumber: mapped.importNumber || undefined,
              exportNumber: mapped.exportNumber || undefined,
              creditLimit,
              paymentTermDays,
            },
          });
          existingSet.add(dupKey);
          imported++;
        } catch (rowErr: any) {
          errors.push(`Row ${rowNum}: ${rowErr.message}`);
        }
      }

      res.json({
        success: true,
        data: { imported, skipped, errors: errors.slice(0, 50), totalRows: rows.length },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
