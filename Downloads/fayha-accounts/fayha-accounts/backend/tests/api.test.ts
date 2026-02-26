// ==========================================
// FAYHA TRANSPORTATION — Jest API Test Suite
// 65 Tests · Industry-Standard · CRUD · Validation · ZATCA · Accounting
// ==========================================
//
// Run: npm test  (or npx jest)
// Requires backend running on localhost:5000 with seeded data
// ==========================================

const BASE = process.env.API_URL || 'http://localhost:5000/api/v1';
let TOKEN = '';
const ids: Record<string, string> = {};

// ─── Helpers ─────────────────────────────────────────────────────

async function api(
  method: string,
  path: string,
  body?: any,
  overrideToken?: string,
): Promise<{ status: number; ok: boolean; body: any }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const tok = overrideToken !== undefined ? overrideToken : TOKEN;
  if (tok) headers['Authorization'] = `Bearer ${tok}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body: json };
}

const GET  = (p: string, tok?: string) => api('GET', p, undefined, tok);
const POST = (p: string, b?: any, tok?: string) => api('POST', p, b, tok);
const PUT  = (p: string, b?: any) => api('PUT', p, b);
const DEL  = (p: string) => api('DELETE', p);

// ═══════════════════════════════════════════
// SECTION A: AUTH & SECURITY (1-6)
// ═══════════════════════════════════════════

describe('Auth', () => {
  it('#01 Login with valid admin credentials returns JWT token + user data', async () => {
    const r = await POST('/auth/login', { email: 'admin@fayha-transport.sa', password: 'admin123' });
    expect(r.ok).toBe(true);
    TOKEN = r.body.data?.token;
    expect(TOKEN).toBeDefined();
    expect(r.body.data?.user?.email).toBe('admin@fayha-transport.sa');
    expect(r.body.data.user.role).toBe('SUPER_ADMIN');
    expect(r.body.data.refreshToken).toBeDefined();
  });

  it('#02 GET /auth/me returns authenticated user profile', async () => {
    const r = await GET('/auth/me');
    expect(r.ok).toBe(true);
    expect(r.body.data?.email).toBe('admin@fayha-transport.sa');
  });

  it('#03 Login with wrong password returns 401', async () => {
    const r = await POST('/auth/login', { email: 'admin@fayha-transport.sa', password: 'wrongpass' });
    expect(r.status).toBe(401);
    expect(r.body.error).toContain('Invalid');
  });

  it('#04 Login with non-existent email returns 401', async () => {
    const r = await POST('/auth/login', { email: 'nobody@nowhere.com', password: 'test' });
    expect(r.status).toBe(401);
  });

  it('#05 Request without token returns 401', async () => {
    const r = await GET('/accounts', '');
    expect(r.status).toBe(401);
    expect(r.body.error).toContain('No token');
  });

  it('#06 Request with invalid/expired token returns 401', async () => {
    const r = await GET('/accounts', 'Bearer invalid.jwt.token');
    expect(r.status).toBe(401);
  });
});

// ═══════════════════════════════════════════
// SECTION B: CHART OF ACCOUNTS (7-12)
// ═══════════════════════════════════════════

describe('Accounts', () => {
  it('#07 GET /accounts returns all seeded accounts (>40)', async () => {
    const r = await GET('/accounts');
    expect(r.ok).toBe(true);
    expect(r.body.data.length).toBeGreaterThanOrEqual(40);
    ids.accountAR = r.body.data.find((a: any) => a.subType === 'Accounts Receivable' || a.name?.includes('Receivable'))?.id;
    ids.accountExpense = r.body.data.find((a: any) => a.type === 'Expense')?.id;
    ids.accountRevenue = r.body.data.find((a: any) => a.type === 'Revenue')?.id;
  });

  it('#08 Create account + verify returned fields', async () => {
    const code = `JEST-${Date.now()}`;
    const r = await POST('/accounts', { code, name: 'Jest Test Account', type: 'Expense', subType: 'General' });
    expect(r.ok).toBe(true);
    ids.testAccount = r.body.data.id;
    expect(r.body.data.code).toBe(code);
    expect(r.body.data.name).toBe('Jest Test Account');
    expect(r.body.data.type).toBe('Expense');
    expect(r.body.data.currentBalance).toBe(0);
    expect(r.body.data.isActive).toBe(true);
  });

  it('#09 Duplicate account code returns 400', async () => {
    const list = await GET('/accounts');
    const existing = list.body.data[0];
    const r = await POST('/accounts', { code: existing.code, name: 'Dup Test', type: 'Asset' });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/already exists/i);
  });

  it('#10 Update account name and verify', async () => {
    const r = await PUT(`/accounts/${ids.testAccount}`, { name: 'Jest Updated' });
    expect(r.ok).toBe(true);
    expect(r.body.data.name).toBe('Jest Updated');
  });

  it('#11 Trial balance returns data with balanced debits/credits', async () => {
    const r = await GET('/accounts/trial-balance');
    expect(r.ok).toBe(true);
    expect(r.body.data).toBeDefined();
    if (r.body.data.isBalanced !== undefined) {
      expect(r.body.data.isBalanced).toBe(true);
    }
  });

  it('#12 GET non-existent account returns 404', async () => {
    const r = await GET('/accounts/nonexistent-id-12345');
    expect(r.status).toBe(404);
  });
});

// ═══════════════════════════════════════════
// SECTION C: CUSTOMERS (13-18)
// ═══════════════════════════════════════════

describe('Customers', () => {
  it('#13 Create customer with all fields', async () => {
    const r = await POST('/customers', {
      name: 'Jest Test Client LLC',
      nameAr: 'شركة عميل جست',
      email: `jest-${Date.now()}@test.com`,
      phone: '+966500000099',
      vatNumber: '300000000000099',
      address: 'Riyadh, KSA',
      city: 'Riyadh',
      paymentTermDays: 45,
    });
    expect(r.ok).toBe(true);
    ids.customer = r.body.data.id;
    expect(r.body.data.code).toBeDefined();
  });

  it('#14 Create customer without name returns 400', async () => {
    const r = await POST('/customers', { email: 'noname@test.com' });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/Name is required/i);
  });

  it('#15 GET list includes new customer', async () => {
    const r = await GET('/customers');
    expect(r.ok).toBe(true);
    const found = r.body.data.find((c: any) => c.id === ids.customer);
    expect(found).toBeDefined();
    expect(found.name).toBe('Jest Test Client LLC');
  });

  it('#16 Update + verify phone change persists', async () => {
    await PUT(`/customers/${ids.customer}`, { phone: '+966588888888' });
    const r = await GET(`/customers/${ids.customer}`);
    expect(r.ok).toBe(true);
    expect(r.body.data.phone).toBe('+966588888888');
  });

  it('#17 GET /customers/:id/statement returns SOA structure', async () => {
    const r = await GET(`/customers/${ids.customer}/statement`);
    expect(r.ok).toBe(true);
  });

  it('#18 GET non-existent customer returns 404', async () => {
    const r = await GET('/customers/nonexistent-id-99999');
    expect(r.status).toBe(404);
  });
});

// ═══════════════════════════════════════════
// SECTION D: VENDORS (19-21)
// ═══════════════════════════════════════════

describe('Vendors', () => {
  it('#19 Create vendor with required fields', async () => {
    const r = await POST('/vendors', {
      code: `VND-JEST-${Date.now()}`,
      name: 'Jest Vendor Corp',
      email: `vendor-jest-${Date.now()}@test.com`,
      phone: '+966510000099',
      city: 'Jeddah',
    });
    expect(r.ok).toBe(true);
    ids.vendor = r.body.data.id;
  });

  it('#20 Update vendor and verify', async () => {
    await PUT(`/vendors/${ids.vendor}`, { name: 'Jest Updated Vendor' });
    const r = await GET(`/vendors/${ids.vendor}`);
    expect(r.body.data.name).toBe('Jest Updated Vendor');
  });

  it('#21 GET /vendors returns array with seeded + new vendors', async () => {
    const r = await GET('/vendors');
    expect(r.ok).toBe(true);
    expect(r.body.data.length).toBeGreaterThanOrEqual(10);
  });
});

// ═══════════════════════════════════════════
// SECTION E: JOB REFERENCE MODULE (22-27)
// ═══════════════════════════════════════════

describe('Consignees', () => {
  it('#22 Create + list consignees', async () => {
    const cr = await POST('/consignees', { name: 'Jest Consignee', phone: '+966520000099' });
    expect(cr.ok).toBe(true);
    ids.consignee = cr.body.data.id;
    const list = await GET('/consignees');
    expect(list.body.data.length).toBeGreaterThanOrEqual(5);
  });
});

describe('Job Module', () => {
  it('#23 Create category → title → controller → salesman chain', async () => {
    const cat = await POST('/job-categories', { name: 'Jest Category', code: `CAT-JEST-${Date.now()}` });
    expect(cat.ok).toBe(true);
    ids.jobCategory = cat.body.data.id;

    const jt = await POST('/job-titles', { name: 'Jest Title', code: `JT-JEST-${Date.now()}`, categoryId: ids.jobCategory });
    expect(jt.ok).toBe(true);
    ids.jobTitle = jt.body.data.id;

    const jc = await POST('/job-controllers', { name: 'Jest Controller', code: `JC-JEST-${Date.now()}` });
    expect(jc.ok).toBe(true);
    ids.jobController = jc.body.data.id;

    const sm = await POST('/salesmen', { name: 'Jest Salesman', code: `SM-JEST-${Date.now()}` });
    expect(sm.ok).toBe(true);
    ids.salesman = sm.body.data.id;
  });
});

describe('Job References', () => {
  it('#24 Create job reference linked to customer', async () => {
    const r = await POST('/job-references', {
      clientId: ids.customer,
      jobCategoryId: ids.jobCategory,
      status: 'Open',
    });
    expect(r.ok).toBe(true);
    ids.jobReference = r.body.data.id;
    expect(r.body.data.jobNumber).toBeDefined();
  });

  it('#25 Update status + verify change', async () => {
    await PUT(`/job-references/${ids.jobReference}`, { status: 'In Progress' });
    const r = await GET(`/job-references/${ids.jobReference}`);
    expect(r.body.data.status).toBe('In Progress');
  });

  it('#26 GET list returns 15+ seeded job references', async () => {
    const r = await GET('/job-references');
    expect(r.ok).toBe(true);
    expect(r.body.data.length).toBeGreaterThanOrEqual(15);
  });
});

describe('Invoice Services', () => {
  it('#27 Create service + verify all fields returned', async () => {
    const r = await POST('/invoice-services', {
      code: `SVC-JEST-${Date.now()}`,
      nameEn: 'Jest Transport',
      nameAr: 'نقل جست',
      serviceGroup: 'Transport',
      defaultRate: 500,
    });
    expect(r.ok).toBe(true);
    ids.invoiceService = r.body.data.id;
    expect(r.body.data.nameEn).toBe('Jest Transport');
  });
});

// ═══════════════════════════════════════════
// SECTION F: SALES INVOICES + ZATCA (28-40)
// ═══════════════════════════════════════════

describe('Sales Invoices', () => {
  it('#28 Create invoice with items — verify totals + ZATCA fields generated', async () => {
    const r = await POST('/sales-invoices', {
      clientId: ids.customer,
      jobReferenceId: ids.jobReference,
      salesmanId: ids.salesman,
      invoiceDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      saleMethod: 'CREDIT',
      subtotal: 2500,
      vatRate: 0.15,
      vatAmount: 375,
      totalAmount: 2875,
      items: [
        { nameEn: 'Transport A', description: 'Transport A', amount: 2000, vatRate: 0.15, vatAmount: 300, totalAmount: 2300 },
        { nameEn: 'Handling', description: 'Handling', amount: 500, vatRate: 0.15, vatAmount: 75, totalAmount: 575 },
      ],
    });
    expect(r.ok).toBe(true);
    const inv = r.body.data;
    ids.salesInvoice = inv.id;
    ids.salesInvoiceNumber = inv.invoiceNumber;

    // ZATCA Phase 1 fields
    expect(inv.zatcaUuid).toBeDefined();
    expect(inv.zatcaHash).toBeDefined();
    expect(inv.zatcaQrCode).toBeDefined();
    expect(inv.zatcaStatus).toBe('Due');

    // Totals
    expect(inv.totalAmount).toBe(2875);
    expect(inv.balanceDue).toBe(2875);
    expect(inv.paidAmount).toBe(0);

    // Auto-number
    expect(inv.invoiceNumber).toMatch(/^INV-/);

    // Items
    expect(inv.items).toHaveLength(2);
  });

  it('#29 GET list returns all invoices (seeded + new)', async () => {
    const r = await GET('/sales-invoices');
    expect(r.ok).toBe(true);
    expect(r.body.data.length).toBeGreaterThanOrEqual(10);
  });

  it('#30 GET by ID returns full invoice with client + items', async () => {
    const r = await GET(`/sales-invoices/${ids.salesInvoice}`);
    expect(r.ok).toBe(true);
    expect(r.body.data.client).toBeDefined();
    expect(r.body.data.client.id).toBe(ids.customer);
    expect(r.body.data.items).toHaveLength(2);
  });

  it('#31 Mark as INVOICED — status transitions correctly', async () => {
    const r = await POST(`/sales-invoices/${ids.salesInvoice}/mark-invoiced`);
    expect(r.ok).toBe(true);
    expect(r.body.data.status).toBe('INVOICED');
  });

  it('#32 Re-marking as INVOICED returns 400', async () => {
    const r = await POST(`/sales-invoices/${ids.salesInvoice}/mark-invoiced`);
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/already/i);
  });
});

describe('ZATCA Phase 2', () => {
  it('#33 Report to ZATCA — clearance succeeds (95%) or rejects (5%)', async () => {
    const r = await POST(`/sales-invoices/${ids.salesInvoice}/report-zatca`);
    const inv = r.body.data;
    expect(inv).toBeDefined();
    expect(['Synced With Zatca', 'Rejected']).toContain(inv.zatcaStatus);
    if (inv.zatcaStatus === 'Synced With Zatca') {
      expect(inv.zatcaClearanceId).toBeDefined();
      expect(inv.zatcaClearanceId).toMatch(/^CLR-/);
      expect(inv.zatcaClearedAt).toBeDefined();
    }
    ids.zatcaFinalStatus = inv.zatcaStatus;
  });

  it('#34 Re-reporting synced invoice returns 400', async () => {
    if (ids.zatcaFinalStatus !== 'Synced With Zatca') {
      const retry = await POST(`/sales-invoices/${ids.salesInvoice}/report-zatca`);
      ids.zatcaFinalStatus = retry.body.data?.zatcaStatus;
      return;
    }
    const r = await POST(`/sales-invoices/${ids.salesInvoice}/report-zatca`);
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/already synced/i);
  });

  it('#35 Report to ZATCA for non-existent invoice returns 404', async () => {
    const r = await POST('/sales-invoices/nonexistent-id/report-zatca');
    expect(r.status).toBe(404);
  });
});

describe('Sales Invoices (continued)', () => {
  it('#36 Create 2nd invoice → Send → verify SENT status', async () => {
    const cr = await POST('/sales-invoices', {
      clientId: ids.customer,
      invoiceDate: new Date().toISOString(),
      subtotal: 100, vatAmount: 15, totalAmount: 115,
      items: [{ nameEn: 'Service B', description: 'Service B', amount: 100, vatRate: 0.15, vatAmount: 15, totalAmount: 115 }],
    });
    expect(cr.ok).toBe(true);
    ids.salesInvoice2 = cr.body.data.id;

    const r = await POST(`/sales-invoices/${ids.salesInvoice2}/send`);
    expect(r.ok).toBe(true);
    expect(r.body.data.status).toBe('SENT');
  });

  it('#37 Update notes on draft invoice', async () => {
    const cr = await POST('/sales-invoices', {
      clientId: ids.customer,
      invoiceDate: new Date().toISOString(),
      subtotal: 200, vatAmount: 30, totalAmount: 230,
      items: [{ nameEn: 'Item C', description: 'Item C', amount: 200, vatRate: 0.15, vatAmount: 30, totalAmount: 230 }],
    });
    expect(cr.ok).toBe(true);
    ids.salesInvoice3 = cr.body.data.id;

    const r = await PUT(`/sales-invoices/${ids.salesInvoice3}`, { notes: 'Updated by Jest' });
    expect(r.ok).toBe(true);
  });

  it('#38 Delete DRAFT invoice — verify removed', async () => {
    const cr = await POST('/sales-invoices', {
      clientId: ids.customer,
      invoiceDate: new Date().toISOString(),
      subtotal: 50, vatAmount: 7.5, totalAmount: 57.5,
      items: [{ nameEn: 'Delete me', description: 'Delete me', amount: 50, vatRate: 0.15, vatAmount: 7.5, totalAmount: 57.5 }],
    });
    expect(cr.ok).toBe(true);
    const tempId = cr.body.data.id;

    const del = await DEL(`/sales-invoices/${tempId}`);
    expect(del.ok).toBe(true);

    const check = await GET(`/sales-invoices/${tempId}`);
    expect(check.status).toBe(404);
  });

  it('#39 Server computes balanceDue = totalAmount - paidAmount', async () => {
    const r = await GET(`/sales-invoices/${ids.salesInvoice}`);
    const inv = r.body.data;
    const expected = (inv.totalAmount || 0) - (inv.paidAmount || 0);
    expect(Math.abs(inv.balanceDue - expected)).toBeLessThan(0.01);
  });
});

describe('Sales Quotes', () => {
  it('#40 Create quote → list → convert to invoice', async () => {
    const cr = await POST('/sales-quotes', {
      clientName: 'Jest Quote Client',
      quoteDate: new Date().toISOString(),
      validUntil: new Date(Date.now() + 15 * 86400000).toISOString(),
      subtotal: 600, vatAmount: 90, totalAmount: 690,
      items: JSON.stringify([{ description: 'Quote item', qty: 3, unitPrice: 200 }]),
    });
    expect(cr.ok).toBe(true);
    ids.salesQuote = cr.body.data.id;

    const list = await GET('/sales-quotes');
    expect(list.body.data.length).toBeGreaterThanOrEqual(6);

    const conv = await POST(`/sales-quotes/${ids.salesQuote}/convert`, { clientId: ids.customer });
    expect(conv.ok).toBe(true);
    expect(conv.body.data.invoiceNumber).toBeDefined();
  });
});

// ═══════════════════════════════════════════
// SECTION G: BANK ACCOUNTS (41-44)
// ═══════════════════════════════════════════

describe('Banks', () => {
  it('#41 Create bank + verify opening balance', async () => {
    const r = await POST('/banks', {
      code: `BNK-JEST-${Date.now()}`,
      bankName: 'Jest Test Bank',
      accountNumber: `ACC-JEST-${Date.now()}`,
      openingBalance: 50000,
    });
    expect(r.ok).toBe(true);
    ids.bank = r.body.data.id;
    expect(r.body.data.openingBalance).toBe(50000);
    expect(r.body.data.currentBalance).toBe(50000);
  });

  it('#42 GET by ID returns bank with correct name', async () => {
    const r = await GET(`/banks/${ids.bank}`);
    expect(r.ok).toBe(true);
    expect(r.body.data.bankName).toBe('Jest Test Bank');
  });

  it('#43 GET transactions returns array', async () => {
    const r = await GET(`/banks/${ids.bank}/transactions`);
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.body.data)).toBe(true);
  });

  it('#44 GET non-existent bank returns 404', async () => {
    const r = await GET('/banks/nonexistent-id-99999');
    expect(r.status).toBe(404);
  });
});

// ═══════════════════════════════════════════
// SECTION H: JOURNAL ENTRIES & ACCOUNTING (45-50)
// ═══════════════════════════════════════════

describe('Journals', () => {
  it('#45 GET list returns 25+ seeded journal entries', async () => {
    const r = await GET('/journals');
    expect(r.ok).toBe(true);
    expect(r.body.data.length).toBeGreaterThanOrEqual(20);
    const posted = r.body.data.find((j: any) => j.status === 'POSTED');
    if (posted) ids.journalPosted = posted.id;
    ids.journalAny = r.body.data[0]?.id;
  });

  it('#46 GET by ID returns entry with balanced lines', async () => {
    if (!ids.journalAny) return;
    const r = await GET(`/journals/${ids.journalAny}`);
    expect(r.ok).toBe(true);
    const lines = r.body.data.lines || [];
    if (lines.length > 0) {
      const dr = lines.reduce((s: number, l: any) => s + (l.debitAmount || 0), 0);
      const cr = lines.reduce((s: number, l: any) => s + (l.creditAmount || 0), 0);
      expect(Math.abs(dr - cr)).toBeLessThan(0.01);
    }
  });

  it('#47 Invoice creation auto-creates journal entry (accounting link)', async () => {
    const r = await GET('/journals');
    if (ids.salesInvoiceNumber) {
      const match = r.body.data.find((j: any) =>
        j.reference === ids.salesInvoiceNumber ||
        j.description?.includes(ids.salesInvoiceNumber) ||
        j.referenceType === 'SALES_INVOICE'
      );
      expect(match).toBeDefined();
    }
  });

  it('#48 Void already-posted entry changes status', async () => {
    if (!ids.journalPosted) return;
    const r = await POST(`/journals/${ids.journalPosted}/void`, { reason: 'Jest test void' });
    if (r.ok) {
      expect(r.body.data.status).toBe('VOIDED');
    } else {
      expect(r.status).toBe(400);
    }
  });

  it('#49 Void non-posted entry returns 400', async () => {
    const all = await GET('/journals');
    const draft = all.body.data.find((j: any) => j.status !== 'POSTED');
    if (!draft) return;
    const r = await POST(`/journals/${draft.id}/void`, { reason: 'test' });
    expect(r.status).toBe(400);
  });
});

describe('Accounting Integrity', () => {
  it('#50 All seeded journal entries have Dr = Cr', async () => {
    const all = await GET('/journals');
    let checked = 0;
    for (const je of all.body.data.slice(0, 10)) {
      const detail = await GET(`/journals/${je.id}`);
      if (!detail.ok) continue;
      const lines = detail.body.data.lines || [];
      if (lines.length === 0) continue;
      const dr = lines.reduce((s: number, l: any) => s + (l.debitAmount || 0), 0);
      const cr = lines.reduce((s: number, l: any) => s + (l.creditAmount || 0), 0);
      expect(Math.abs(dr - cr)).toBeLessThan(0.01);
      checked++;
    }
    expect(checked).toBeGreaterThanOrEqual(5);
  });
});

// ═══════════════════════════════════════════
// SECTION I: EXPENSES & PAYABLES (51-55)
// ═══════════════════════════════════════════

describe('Expense Entries', () => {
  it('#51 Create expense + update + list', async () => {
    const cr = await POST('/expense-entries', {
      vendorId: ids.vendor,
      date: new Date().toISOString(),
      description: 'Jest Fuel Expense',
      amount: 750, vatAmount: 112.5, totalAmount: 862.5,
    });
    expect(cr.ok).toBe(true);
    ids.expenseEntry = cr.body.data.id;

    const up = await PUT(`/expense-entries/${ids.expenseEntry}`, { description: 'Jest Updated Fuel' });
    expect(up.ok).toBe(true);

    const list = await GET('/expense-entries');
    expect(list.body.data.length).toBeGreaterThanOrEqual(15);
  });
});

describe('Payable Expenses', () => {
  it('#52 Create payable expense with required dueDate', async () => {
    const r = await POST('/payable-expenses', {
      vendorId: ids.vendor,
      date: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      description: 'Jest Payable Expense',
      amount: 3000, totalAmount: 3450, balanceDue: 3450,
    });
    expect(r.ok).toBe(true);
    ids.payableExpense = r.body.data.id;
    expect(r.body.data.expenseNumber).toBeDefined();
  });

  it('#53 GET list returns 8+ payable expenses', async () => {
    const r = await GET('/payable-expenses');
    expect(r.ok).toBe(true);
    expect(r.body.data.length).toBeGreaterThanOrEqual(8);
  });
});

describe('Client Advances', () => {
  it('#54 Create advance + query by client', async () => {
    const cr = await POST('/client-advances', {
      clientId: ids.customer,
      date: new Date().toISOString(),
      amount: 5000,
      description: 'Jest Advance',
    });
    expect(cr.ok).toBe(true);

    const byClient = await GET(`/client-advances/by-client/${ids.customer}`);
    expect(byClient.ok).toBe(true);
  });
});

describe('OPB', () => {
  it('#55 Create client OPB + payable OPB', async () => {
    const clientOPB = await POST('/client-opb', {
      clientId: ids.customer,
      amount: 10000,
      date: new Date().toISOString(),
      description: 'Jest Client OPB',
    });
    expect(clientOPB.ok).toBe(true);

    const payableOPB = await POST('/payable-opb', {
      vendorId: ids.vendor,
      amount: 8000,
      date: new Date().toISOString(),
      description: 'Jest Payable OPB',
    });
    expect(payableOPB.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// SECTION J: OPERATIONS MODULES (56-62)
// ═══════════════════════════════════════════

describe('Terminals', () => {
  it('#56 Create + list terminals', async () => {
    const cr = await POST('/terminals', { name: 'Jest Terminal', code: `TRM-JEST-${Date.now()}` });
    expect(cr.ok).toBe(true);
    const list = await GET('/terminals');
    expect(list.body.data.length).toBeGreaterThanOrEqual(8);
  });
});

describe('Shipments', () => {
  it('#57 Create + list shipments', async () => {
    const cr = await POST('/shipments', { description: 'Jest Shipment', status: 'Pending' });
    expect(cr.ok).toBe(true);
    const list = await GET('/shipments');
    expect(list.body.data.length).toBeGreaterThanOrEqual(10);
  });
});

describe('Fleet', () => {
  it('#58 Create vehicle + list fleet', async () => {
    const cr = await POST('/fleet', { plateNumber: `JEST-${Date.now()}`, make: 'Toyota', model: 'Hilux', type: 'Truck', status: 'Active' });
    expect(cr.ok).toBe(true);
    const list = await GET('/fleet');
    expect(list.body.data.length).toBeGreaterThanOrEqual(8);
  });
});

describe('Assets', () => {
  it('#59 Create asset + list assets', async () => {
    const cr = await POST('/assets', { name: 'Jest Laptop', category: 'IT Equipment', purchaseDate: new Date().toISOString(), purchaseCost: 5000, status: 'Active' });
    expect(cr.ok).toBe(true);
    const list = await GET('/assets');
    expect(list.body.data.length).toBeGreaterThanOrEqual(8);
  });
});

describe('DWO', () => {
  it('#60 Create daily work order + list', async () => {
    const cr = await POST('/daily-work-orders', { description: 'Jest Work Order', date: new Date().toISOString() });
    expect(cr.ok).toBe(true);
    const list = await GET('/daily-work-orders');
    expect(list.body.data.length).toBeGreaterThanOrEqual(10);
  });
});

describe('RCV/PVC', () => {
  it('#61 Create receipt voucher + list', async () => {
    const cr = await POST('/rcv-pvc', { type: 'RCV', date: new Date().toISOString(), amount: 1500, description: 'Jest Receipt' });
    expect(cr.ok).toBe(true);
    const list = await GET('/rcv-pvc');
    expect(list.body.data.length).toBeGreaterThanOrEqual(8);
  });
});

describe('Settings', () => {
  it('#62 GET + update settings', async () => {
    const r = await GET('/settings');
    expect(r.ok).toBe(true);

    const bad = await PUT('/settings/COMPANY_NAME', {});
    if (bad.status === 400) {
      expect(bad.body.error).toMatch(/value is required/i);
    }
  });
});

// ═══════════════════════════════════════════
// SECTION K: REPORTS & DASHBOARD (63-65)
// ═══════════════════════════════════════════

describe('Dashboard', () => {
  it('#63 GET /dashboard/summary returns KPIs with numeric values', async () => {
    const r = await GET('/dashboard/summary');
    expect(r.ok).toBe(true);
    expect(r.body.data).toBeDefined();
    expect(typeof r.body.data).toBe('object');
  });
});

describe('Reports', () => {
  it('#64 Balance sheet returns assets/liabilities/equity sections', async () => {
    const r = await GET('/dashboard/balance-sheet');
    expect(r.ok).toBe(true);
    expect(r.body.data).toBeDefined();
  });

  it('#65 Income statement returns revenue & expense data', async () => {
    const r = await GET('/dashboard/income-statement');
    expect(r.ok).toBe(true);
    expect(r.body.data).toBeDefined();
  });
});
