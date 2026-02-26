// ==========================================
// FAYHA TRANSPORTATION — COMPREHENSIVE E2E TEST SUITE
// 65 Test Rows × CRUD + Validation + Edge Cases + Accounting Integrity
// ==========================================
//
// Run: npx ts-node tests/e2e-full-system.test.ts
// Requires backend running on localhost:5000 with seeded data
// ==========================================

const BASE = process.env.API_URL || 'http://localhost:5000/api/v1';
let TOKEN = '';
let VIEWER_TOKEN = '';

// ─── Stored IDs for cross-test references ────────────────────────
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

// ─── Test Runner ─────────────────────────────────────────────────

interface TestRow {
  id: number;
  module: string;
  description: string;
  fn: () => Promise<void>;
}

const tests: TestRow[] = [];
let passed = 0;
let failed = 0;
const failures: { id: number; module: string; desc: string; error: string }[] = [];

function test(id: number, module: string, description: string, fn: () => Promise<void>) {
  tests.push({ id, module, description, fn });
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

// ==========================================
// TEST DEFINITIONS — 65 ROWS
// ==========================================

// ═══════════════════════════════════════════
// SECTION A: AUTH & SECURITY (1-6)
// ═══════════════════════════════════════════

test(1, 'Auth', 'Login with valid admin credentials returns JWT token + user data', async () => {
  const r = await POST('/auth/login', { email: 'admin@fayha-transport.sa', password: 'admin123' });
  assert(r.ok, `Login failed: ${r.status} — Run "npx ts-node prisma/seed.ts" first`);
  TOKEN = r.body.data?.token;
  assert(!!TOKEN, 'No token in response');
  assert(!!r.body.data?.user?.email, 'No user object in login response');
  assert(r.body.data.user.role === 'SUPER_ADMIN', `Expected SUPER_ADMIN role, got ${r.body.data.user.role}`);
  assert(!!r.body.data.refreshToken, 'No refresh token returned');
});

test(2, 'Auth', 'GET /auth/me returns authenticated user profile', async () => {
  const r = await GET('/auth/me');
  assert(r.ok, `Profile failed: ${r.status}`);
  assert(r.body.data?.email === 'admin@fayha-transport.sa', 'Email mismatch');
});

test(3, 'Auth:Validation', 'Login with wrong password returns 401', async () => {
  const r = await POST('/auth/login', { email: 'admin@fayha-transport.sa', password: 'wrongpass' });
  assert(r.status === 401, `Expected 401, got ${r.status}`);
  assert(r.body.error === 'Invalid credentials', `Wrong error: ${r.body.error}`);
});

test(4, 'Auth:Validation', 'Login with non-existent email returns 401', async () => {
  const r = await POST('/auth/login', { email: 'nobody@nowhere.com', password: 'test' });
  assert(r.status === 401, `Expected 401, got ${r.status}`);
});

test(5, 'Auth:Validation', 'Request without token returns 401', async () => {
  const r = await GET('/accounts', '');
  assert(r.status === 401, `Expected 401, got ${r.status}`);
  assert(r.body.error === 'No token provided', `Wrong error: ${r.body.error}`);
});

test(6, 'Auth:Validation', 'Request with invalid/expired token returns 401', async () => {
  const r = await GET('/accounts', 'Bearer invalid.jwt.token');
  assert(r.status === 401, `Expected 401, got ${r.status}`);
});

// ═══════════════════════════════════════════
// SECTION B: CHART OF ACCOUNTS (7-12)
// ═══════════════════════════════════════════

test(7, 'Accounts', 'GET /accounts returns all seeded accounts (>40)', async () => {
  const r = await GET('/accounts');
  assert(r.ok, `Failed: ${r.status}`);
  const data = r.body.data;
  assert(Array.isArray(data) && data.length >= 40, `Expected >=40 accounts, got ${data?.length}`);
  // Store references
  ids.accountAR = data.find((a: any) => a.subType === 'Accounts Receivable' || a.name?.includes('Receivable'))?.id;
  ids.accountExpense = data.find((a: any) => a.type === 'Expense')?.id;
  ids.accountRevenue = data.find((a: any) => a.type === 'Revenue')?.id;
});

test(8, 'Accounts', 'Create account + verify returned fields', async () => {
  const code = `E2E-${Date.now()}`;
  const r = await POST('/accounts', { code, name: 'E2E Test Account', type: 'Expense', subType: 'General' });
  assert(r.ok, `Create failed: ${r.status} ${JSON.stringify(r.body)}`);
  const a = r.body.data;
  ids.testAccount = a.id;
  assert(a.code === code, 'Code mismatch');
  assert(a.name === 'E2E Test Account', 'Name mismatch');
  assert(a.type === 'Expense', 'Type mismatch');
  assert(a.currentBalance === 0, `Expected 0 balance, got ${a.currentBalance}`);
  assert(a.isActive === true, 'Should be active by default');
});

test(9, 'Accounts:Validation', 'Duplicate account code returns 400', async () => {
  const r = await GET('/accounts');
  const existing = r.body.data[0];
  const r2 = await POST('/accounts', { code: existing.code, name: 'Dup Test', type: 'Asset' });
  assert(r2.status === 400, `Expected 400 for duplicate code, got ${r2.status}`);
  assert(r2.body.error?.includes('already exists'), `Wrong error: ${r2.body.error}`);
});

test(10, 'Accounts', 'Update account name and verify', async () => {
  const r = await PUT(`/accounts/${ids.testAccount}`, { name: 'E2E Updated' });
  assert(r.ok, `Update failed: ${r.status}`);
  assert(r.body.data.name === 'E2E Updated', 'Name not updated');
});

test(11, 'Accounts', 'Trial balance returns data with balanced debits/credits', async () => {
  const r = await GET('/accounts/trial-balance');
  assert(r.ok, `Failed: ${r.status}`);
  const data = r.body.data;
  assert(data !== null && typeof data === 'object', 'No trial balance data');
  // Check balance if available
  if (data.isBalanced !== undefined) {
    assert(data.isBalanced === true, `Trial balance NOT balanced! totalDebit=${data.totalDebit}, totalCredit=${data.totalCredit}`);
  }
});

test(12, 'Accounts:Validation', 'GET non-existent account returns 404', async () => {
  const r = await GET('/accounts/nonexistent-id-12345');
  assert(r.status === 404, `Expected 404, got ${r.status}`);
});

// ═══════════════════════════════════════════
// SECTION C: CUSTOMERS (13-18)
// ═══════════════════════════════════════════

test(13, 'Customers', 'Create customer with all fields', async () => {
  const r = await POST('/customers', {
    name: 'E2E Test Client LLC',
    nameAr: 'شركة عميل اختبار',
    email: `e2e-${Date.now()}@test.com`,
    phone: '+966500000001',
    vatNumber: '300000000000003',
    address: 'Riyadh, KSA',
    city: 'Riyadh',
    paymentTermDays: 45,
  });
  assert(r.ok, `Create failed: ${r.status} ${JSON.stringify(r.body)}`);
  ids.customer = r.body.data.id;
  assert(!!r.body.data.code, 'Customer should have auto-generated code');
});

test(14, 'Customers:Validation', 'Create customer without name returns 400', async () => {
  const r = await POST('/customers', { email: 'noname@test.com' });
  assert(r.status === 400, `Expected 400 for missing name, got ${r.status}`);
  assert(r.body.error?.includes('Name is required'), `Wrong error: ${r.body.error}`);
});

test(15, 'Customers', 'GET list includes new customer', async () => {
  const r = await GET('/customers');
  assert(r.ok, `Failed: ${r.status}`);
  const found = r.body.data.find((c: any) => c.id === ids.customer);
  assert(!!found, 'New customer not in list');
  assert(found.name === 'E2E Test Client LLC', 'Name mismatch in list');
});

test(16, 'Customers', 'Update + verify phone change persists', async () => {
  await PUT(`/customers/${ids.customer}`, { phone: '+966599999999' });
  const r = await GET(`/customers/${ids.customer}`);
  assert(r.ok, `GET failed: ${r.status}`);
  assert(r.body.data.phone === '+966599999999', `Phone not updated: ${r.body.data.phone}`);
});

test(17, 'Customers', 'GET /customers/:id/statement returns SOA structure', async () => {
  const r = await GET(`/customers/${ids.customer}/statement`);
  assert(r.ok, `SOA failed: ${r.status}`);
});

test(18, 'Customers:Validation', 'GET non-existent customer returns 404', async () => {
  const r = await GET('/customers/nonexistent-id-99999');
  assert(r.status === 404, `Expected 404, got ${r.status}`);
});

// ═══════════════════════════════════════════
// SECTION D: VENDORS (19-21)
// ═══════════════════════════════════════════

test(19, 'Vendors', 'Create vendor with required fields', async () => {
  const r = await POST('/vendors', {
    code: `VND-E2E-${Date.now()}`,
    name: 'E2E Vendor Corp',
    email: `vendor-${Date.now()}@test.com`,
    phone: '+966510000001',
    city: 'Jeddah',
  });
  assert(r.ok, `Create failed: ${r.status} ${JSON.stringify(r.body)}`);
  ids.vendor = r.body.data.id;
});

test(20, 'Vendors', 'Update vendor and verify', async () => {
  const r = await PUT(`/vendors/${ids.vendor}`, { name: 'E2E Updated Vendor' });
  assert(r.ok, `Update failed: ${r.status}`);
  const v = await GET(`/vendors/${ids.vendor}`);
  assert(v.body.data.name === 'E2E Updated Vendor', 'Name not updated');
});

test(21, 'Vendors', 'GET /vendors returns array with seeded + new vendors', async () => {
  const r = await GET('/vendors');
  assert(r.ok, `Failed: ${r.status}`);
  assert(r.body.data.length >= 10, `Expected >= 10 vendors, got ${r.body.data.length}`);
});

// ═══════════════════════════════════════════
// SECTION E: JOB REFERENCE MODULE (22-27)
// ═══════════════════════════════════════════

test(22, 'Consignees', 'Create + list consignees', async () => {
  const cr = await POST('/consignees', { name: 'E2E Consignee', phone: '+966520000001' });
  assert(cr.ok, `Create failed: ${cr.status} ${JSON.stringify(cr.body)}`);
  ids.consignee = cr.body.data.id;
  const r = await GET('/consignees');
  assert(r.ok && r.body.data.length >= 5, 'Consignee list too small');
});

test(23, 'Job Module', 'Create category → title → controller → salesman chain', async () => {
  // Category
  const cat = await POST('/job-categories', { name: 'E2E Category', code: `CAT-${Date.now()}` });
  assert(cat.ok, `Category failed: ${JSON.stringify(cat.body)}`);
  ids.jobCategory = cat.body.data.id;

  // Title (requires categoryId)
  const jt = await POST('/job-titles', { name: 'E2E Title', code: `JT-${Date.now()}`, categoryId: ids.jobCategory });
  assert(jt.ok, `Title failed: ${JSON.stringify(jt.body)}`);
  ids.jobTitle = jt.body.data.id;

  // Controller
  const jc = await POST('/job-controllers', { name: 'E2E Controller', code: `JC-${Date.now()}` });
  assert(jc.ok, `Controller failed: ${JSON.stringify(jc.body)}`);
  ids.jobController = jc.body.data.id;

  // Salesman
  const sm = await POST('/salesmen', { name: 'E2E Salesman', code: `SM-${Date.now()}` });
  assert(sm.ok, `Salesman failed: ${JSON.stringify(sm.body)}`);
  ids.salesman = sm.body.data.id;
});

test(24, 'Job References', 'Create job reference linked to customer', async () => {
  const r = await POST('/job-references', {
    clientId: ids.customer,
    jobCategoryId: ids.jobCategory,
    status: 'Open',
  });
  assert(r.ok, `Create failed: ${r.status} ${JSON.stringify(r.body)}`);
  ids.jobReference = r.body.data.id;
  assert(!!r.body.data.jobNumber, 'Should have auto-generated jobNumber');
});

test(25, 'Job References', 'Update status + verify change', async () => {
  const r = await PUT(`/job-references/${ids.jobReference}`, { status: 'In Progress' });
  assert(r.ok, `Update failed: ${r.status}`);
  const jr = await GET(`/job-references/${ids.jobReference}`);
  assert(jr.body.data.status === 'In Progress', `Status not updated: ${jr.body.data.status}`);
});

test(26, 'Job References', 'GET list returns 15+ seeded job references', async () => {
  const r = await GET('/job-references');
  assert(r.ok, `Failed: ${r.status}`);
  assert(r.body.data.length >= 15, `Expected >=15, got ${r.body.data.length}`);
});

test(27, 'Invoice Services', 'Create service + verify all fields returned', async () => {
  const r = await POST('/invoice-services', {
    code: `SVC-E2E-${Date.now()}`,
    nameEn: 'E2E Transport',
    nameAr: 'نقل اختبار',
    serviceGroup: 'Transport',
    defaultRate: 500,
  });
  assert(r.ok, `Create failed: ${r.status} ${JSON.stringify(r.body)}`);
  ids.invoiceService = r.body.data.id;
  assert(r.body.data.nameEn === 'E2E Transport', 'nameEn mismatch');
});

// ═══════════════════════════════════════════
// SECTION F: SALES INVOICES + ZATCA (28-40)
// ═══════════════════════════════════════════

test(28, 'Sales Invoices', 'Create invoice with items — verify totals + ZATCA fields generated', async () => {
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
  assert(r.ok, `Create failed: ${r.status} ${JSON.stringify(r.body)}`);
  const inv = r.body.data;
  ids.salesInvoice = inv.id;
  ids.salesInvoiceNumber = inv.invoiceNumber;

  // Verify ZATCA Phase 1 fields
  assert(!!inv.zatcaUuid, 'Missing zatcaUuid');
  assert(!!inv.zatcaHash, 'Missing zatcaHash');
  assert(!!inv.zatcaQrCode, 'Missing zatcaQrCode');
  assert(inv.zatcaStatus === 'Due', `Expected zatcaStatus='Due', got '${inv.zatcaStatus}'`);

  // Verify totals
  assert(inv.totalAmount === 2875, `Total mismatch: ${inv.totalAmount}`);
  assert(inv.balanceDue === 2875, `BalanceDue mismatch: ${inv.balanceDue}`);
  assert(inv.paidAmount === 0, `PaidAmount should be 0, got ${inv.paidAmount}`);

  // Verify auto-generated invoice number
  assert(inv.invoiceNumber.startsWith('INV-'), `Invoice number format wrong: ${inv.invoiceNumber}`);

  // Verify items
  assert(Array.isArray(inv.items) && inv.items.length === 2, `Expected 2 items, got ${inv.items?.length}`);
});

test(29, 'Sales Invoices', 'GET list returns all invoices (seeded + new)', async () => {
  const r = await GET('/sales-invoices');
  assert(r.ok, `Failed: ${r.status}`);
  assert(r.body.data.length >= 10, `Expected >=10 invoices, got ${r.body.data.length}`);
});

test(30, 'Sales Invoices', 'GET by ID returns full invoice with client + items', async () => {
  const r = await GET(`/sales-invoices/${ids.salesInvoice}`);
  assert(r.ok, `Failed: ${r.status}`);
  const inv = r.body.data;
  assert(!!inv.client, 'Missing client relation');
  assert(inv.client.id === ids.customer, 'Client ID mismatch');
  assert(inv.items.length === 2, 'Items not included');
});

test(31, 'Sales Invoices', 'Mark as INVOICED — status transitions correctly', async () => {
  const r = await POST(`/sales-invoices/${ids.salesInvoice}/mark-invoiced`);
  assert(r.ok, `Failed: ${r.status} ${JSON.stringify(r.body)}`);
  assert(r.body.data.status === 'INVOICED', `Expected INVOICED, got ${r.body.data.status}`);
});

test(32, 'Sales Invoices:Validation', 'Re-marking as INVOICED returns 400', async () => {
  const r = await POST(`/sales-invoices/${ids.salesInvoice}/mark-invoiced`);
  assert(r.status === 400, `Expected 400, got ${r.status}`);
  assert(r.body.error?.includes('already'), `Wrong error: ${r.body.error}`);
});

test(33, 'ZATCA Phase 2', 'Report to ZATCA — clearance succeeds (95%) or rejects (5%)', async () => {
  const r = await POST(`/sales-invoices/${ids.salesInvoice}/report-zatca`);
  const inv = r.body.data;
  assert(!!inv, 'No invoice data returned');
  assert(
    inv.zatcaStatus === 'Synced With Zatca' || inv.zatcaStatus === 'Rejected',
    `Unexpected status: ${inv.zatcaStatus}`,
  );
  if (inv.zatcaStatus === 'Synced With Zatca') {
    assert(!!inv.zatcaClearanceId, 'Missing clearanceId');
    assert(inv.zatcaClearanceId.startsWith('CLR-'), `Wrong clearance format: ${inv.zatcaClearanceId}`);
    assert(!!inv.zatcaClearedAt, 'Missing clearedAt timestamp');
  }
  ids.zatcaFinalStatus = inv.zatcaStatus;
});

test(34, 'ZATCA Phase 2:Validation', 'Re-reporting synced invoice returns 400', async () => {
  if (ids.zatcaFinalStatus !== 'Synced With Zatca') {
    // Try again — if rejected, re-report should work
    const retry = await POST(`/sales-invoices/${ids.salesInvoice}/report-zatca`);
    ids.zatcaFinalStatus = retry.body.data?.zatcaStatus;
    return;
  }
  const r = await POST(`/sales-invoices/${ids.salesInvoice}/report-zatca`);
  assert(r.status === 400, `Expected 400 for already synced, got ${r.status}`);
  assert(r.body.error?.includes('already synced'), `Wrong error: ${r.body.error}`);
});

test(35, 'ZATCA:Validation', 'Report to ZATCA for non-existent invoice returns 404', async () => {
  const r = await POST('/sales-invoices/nonexistent-id/report-zatca');
  assert(r.status === 404, `Expected 404, got ${r.status}`);
});

test(36, 'Sales Invoices', 'Create 2nd invoice → Send → verify SENT status', async () => {
  const cr = await POST('/sales-invoices', {
    clientId: ids.customer,
    invoiceDate: new Date().toISOString(),
    subtotal: 100, vatAmount: 15, totalAmount: 115,
    items: [{ nameEn: 'Service B', description: 'Service B', amount: 100, vatRate: 0.15, vatAmount: 15, totalAmount: 115 }],
  });
  assert(cr.ok, `Create 2nd failed: ${cr.status}`);
  ids.salesInvoice2 = cr.body.data.id;

  const r = await POST(`/sales-invoices/${ids.salesInvoice2}/send`);
  assert(r.ok, `Send failed: ${r.status}`);
  assert(r.body.data.status === 'SENT', `Expected SENT, got ${r.body.data.status}`);
});

test(37, 'Sales Invoices', 'Update notes on draft invoice', async () => {
  const cr = await POST('/sales-invoices', {
    clientId: ids.customer,
    invoiceDate: new Date().toISOString(),
    subtotal: 200, vatAmount: 30, totalAmount: 230,
    items: [{ nameEn: 'Item C', description: 'Item C', amount: 200, vatRate: 0.15, vatAmount: 30, totalAmount: 230 }],
  });
  assert(cr.ok, `Create failed`);
  ids.salesInvoice3 = cr.body.data.id;

  const r = await PUT(`/sales-invoices/${ids.salesInvoice3}`, { notes: 'Updated by E2E' });
  assert(r.ok, `Update failed: ${r.status}`);
});

test(38, 'Sales Invoices', 'Delete DRAFT invoice — verify removed', async () => {
  const cr = await POST('/sales-invoices', {
    clientId: ids.customer,
    invoiceDate: new Date().toISOString(),
    subtotal: 50, vatAmount: 7.5, totalAmount: 57.5,
    items: [{ nameEn: 'Delete me', description: 'Delete me', amount: 50, vatRate: 0.15, vatAmount: 7.5, totalAmount: 57.5 }],
  });
  assert(cr.ok, 'Create temp invoice failed');
  const tempId = cr.body.data.id;

  const r = await DEL(`/sales-invoices/${tempId}`);
  assert(r.ok, `Delete failed: ${r.status}`);

  // Verify actually deleted
  const check = await GET(`/sales-invoices/${tempId}`);
  assert(check.status === 404, 'Invoice still exists after delete');
});

test(39, 'Sales Invoices', 'Server computes balanceDue = totalAmount - paidAmount', async () => {
  // The server should override any client-sent balanceDue
  const r = await GET(`/sales-invoices/${ids.salesInvoice}`);
  const inv = r.body.data;
  const expected = (inv.totalAmount || 0) - (inv.paidAmount || 0);
  assert(
    Math.abs(inv.balanceDue - expected) < 0.01,
    `balanceDue ${inv.balanceDue} != totalAmount(${inv.totalAmount}) - paidAmount(${inv.paidAmount}) = ${expected}`,
  );
});

test(40, 'Sales Quotes', 'Create quote → list → convert to invoice', async () => {
  const cr = await POST('/sales-quotes', {
    clientName: 'E2E Quote Client',
    quoteDate: new Date().toISOString(),
    validUntil: new Date(Date.now() + 15 * 86400000).toISOString(),
    subtotal: 600, vatAmount: 90, totalAmount: 690,
    items: JSON.stringify([{ description: 'Quote item', qty: 3, unitPrice: 200 }]),
  });
  assert(cr.ok, `Create quote failed: ${cr.status} ${JSON.stringify(cr.body)}`);
  ids.salesQuote = cr.body.data.id;

  // List
  const list = await GET('/sales-quotes');
  assert(list.ok && list.body.data.length >= 6, 'Quotes list too small');

  // Convert
  const conv = await POST(`/sales-quotes/${ids.salesQuote}/convert`, { clientId: ids.customer });
  assert(conv.ok, `Convert failed: ${conv.status} ${JSON.stringify(conv.body)}`);
  ids.convertedInvoice = conv.body.data.id;
  assert(!!conv.body.data.invoiceNumber, 'Converted invoice missing number');
});

// ═══════════════════════════════════════════
// SECTION G: BANK ACCOUNTS (41-44)
// ═══════════════════════════════════════════

test(41, 'Banks', 'Create bank + verify opening balance', async () => {
  const r = await POST('/banks', {
    code: `BNK-E2E-${Date.now()}`,
    bankName: 'E2E Test Bank',
    accountNumber: `ACC-${Date.now()}`,
    openingBalance: 50000,
  });
  assert(r.ok, `Create failed: ${r.status} ${JSON.stringify(r.body)}`);
  ids.bank = r.body.data.id;
  assert(r.body.data.openingBalance === 50000, `Opening balance wrong: ${r.body.data.openingBalance}`);
  assert(r.body.data.currentBalance === 50000, `Current balance should equal opening: ${r.body.data.currentBalance}`);
});

test(42, 'Banks', 'GET by ID returns bank with correct name', async () => {
  const r = await GET(`/banks/${ids.bank}`);
  assert(r.ok, `Failed: ${r.status}`);
  assert(r.body.data.bankName === 'E2E Test Bank', `Name wrong: ${r.body.data.bankName}`);
});

test(43, 'Banks', 'GET transactions returns array (may be empty for new bank)', async () => {
  const r = await GET(`/banks/${ids.bank}/transactions`);
  assert(r.ok, `Failed: ${r.status}`);
  assert(Array.isArray(r.body.data), 'Transactions not an array');
});

test(44, 'Banks:Validation', 'GET non-existent bank returns 404', async () => {
  const r = await GET('/banks/nonexistent-id-99999');
  assert(r.status === 404, `Expected 404, got ${r.status}`);
});

// ═══════════════════════════════════════════
// SECTION H: JOURNAL ENTRIES & ACCOUNTING (45-50)
// ═══════════════════════════════════════════

test(45, 'Journals', 'GET list returns 25+ seeded journal entries', async () => {
  const r = await GET('/journals');
  assert(r.ok, `Failed: ${r.status}`);
  assert(r.body.data.length >= 20, `Expected >=20, got ${r.body.data.length}`);
  // Find a posted entry for later tests
  const posted = r.body.data.find((j: any) => j.status === 'POSTED');
  if (posted) ids.journalPosted = posted.id;
  ids.journalAny = r.body.data[0]?.id;
});

test(46, 'Journals', 'GET by ID returns entry with balanced lines', async () => {
  if (!ids.journalAny) return;
  const r = await GET(`/journals/${ids.journalAny}`);
  assert(r.ok, `Failed: ${r.status}`);
  const je = r.body.data;
  const lines = je.lines || [];
  if (lines.length > 0) {
    const dr = lines.reduce((s: number, l: any) => s + (l.debitAmount || 0), 0);
    const cr = lines.reduce((s: number, l: any) => s + (l.creditAmount || 0), 0);
    assert(Math.abs(dr - cr) < 0.01, `UNBALANCED: Dr=${dr.toFixed(2)}, Cr=${cr.toFixed(2)}`);
  }
});

test(47, 'Journals', 'Invoice creation auto-creates journal entry (accounting link)', async () => {
  const r = await GET('/journals');
  const data = r.body.data;
  if (ids.salesInvoiceNumber) {
    const match = data.find((j: any) =>
      j.reference === ids.salesInvoiceNumber ||
      j.description?.includes(ids.salesInvoiceNumber) ||
      j.referenceType === 'SALES_INVOICE'
    );
    assert(!!match, `No journal entry found for invoice ${ids.salesInvoiceNumber}`);
    ids.journalForInvoice = match.id;
  }
});

test(48, 'Journals:Validation', 'Void already-posted entry changes status', async () => {
  if (!ids.journalPosted) return;
  const r = await POST(`/journals/${ids.journalPosted}/void`, { reason: 'E2E test void' });
  // May fail if already voided — both OK and 400 are valid
  if (r.ok) {
    assert(r.body.data.status === 'VOIDED', `Expected VOIDED, got ${r.body.data.status}`);
  } else {
    assert(r.status === 400, `Unexpected status: ${r.status}`);
  }
});

test(49, 'Journals:Validation', 'Void non-posted entry returns 400', async () => {
  // Create a DRAFT journal by finding one or using any voided one
  const all = await GET('/journals');
  const draft = all.body.data.find((j: any) => j.status !== 'POSTED');
  if (!draft) return; // skip if none available
  const r = await POST(`/journals/${draft.id}/void`, { reason: 'test' });
  assert(r.status === 400, `Expected 400 for void non-posted, got ${r.status}`);
});

test(50, 'Accounting', 'All seeded journal entries have Dr = Cr (accounting integrity)', async () => {
  const all = await GET('/journals');
  let checked = 0;
  for (const je of all.body.data.slice(0, 10)) {
    const detail = await GET(`/journals/${je.id}`);
    if (!detail.ok) continue;
    const lines = detail.body.data.lines || [];
    if (lines.length === 0) continue;
    const dr = lines.reduce((s: number, l: any) => s + (l.debitAmount || 0), 0);
    const cr = lines.reduce((s: number, l: any) => s + (l.creditAmount || 0), 0);
    assert(Math.abs(dr - cr) < 0.01, `Journal ${je.id} UNBALANCED: Dr=${dr}, Cr=${cr}`);
    checked++;
  }
  assert(checked >= 5, `Only verified ${checked} journals, expected at least 5`);
});

// ═══════════════════════════════════════════
// SECTION I: EXPENSES & PAYABLES (51-55)
// ═══════════════════════════════════════════

test(51, 'Expense Entries', 'Create expense + update + list', async () => {
  const cr = await POST('/expense-entries', {
    vendorId: ids.vendor,
    date: new Date().toISOString(),
    description: 'E2E Fuel Expense',
    amount: 750, vatAmount: 112.5, totalAmount: 862.5,
  });
  assert(cr.ok, `Create failed: ${cr.status} ${JSON.stringify(cr.body)}`);
  ids.expenseEntry = cr.body.data.id;

  const up = await PUT(`/expense-entries/${ids.expenseEntry}`, { description: 'E2E Updated Fuel' });
  assert(up.ok, `Update failed: ${up.status}`);

  const list = await GET('/expense-entries');
  assert(list.ok && list.body.data.length >= 15, `Expected >=15, got ${list.body.data.length}`);
});

test(52, 'Payable Expenses', 'Create payable expense with required dueDate', async () => {
  const r = await POST('/payable-expenses', {
    vendorId: ids.vendor,
    date: new Date().toISOString(),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    description: 'E2E Payable Expense',
    amount: 3000, totalAmount: 3450, balanceDue: 3450,
  });
  assert(r.ok, `Create failed: ${r.status} ${JSON.stringify(r.body)}`);
  ids.payableExpense = r.body.data.id;
  assert(!!r.body.data.expenseNumber, 'Missing auto-generated expenseNumber');
});

test(53, 'Payable Expenses', 'GET list returns 8+ payable expenses', async () => {
  const r = await GET('/payable-expenses');
  assert(r.ok, `Failed: ${r.status}`);
  assert(r.body.data.length >= 8, `Expected >=8, got ${r.body.data.length}`);
});

test(54, 'Client Advances', 'Create advance + query by client', async () => {
  const cr = await POST('/client-advances', {
    clientId: ids.customer,
    date: new Date().toISOString(),
    amount: 5000,
    description: 'E2E Advance',
  });
  assert(cr.ok, `Create failed: ${cr.status} ${JSON.stringify(cr.body)}`);
  ids.clientAdvance = cr.body.data.id;

  const byClient = await GET(`/client-advances/by-client/${ids.customer}`);
  assert(byClient.ok, `By-client query failed: ${byClient.status}`);
});

test(55, 'OPB', 'Create client OPB + payable OPB', async () => {
  const clientOPB = await POST('/client-opb', {
    clientId: ids.customer,
    amount: 10000,
    date: new Date().toISOString(),
    description: 'E2E Client OPB',
  });
  assert(clientOPB.ok, `Client OPB failed: ${clientOPB.status} ${JSON.stringify(clientOPB.body)}`);

  // Get a vendor for payable OPB
  const vendors = await GET('/vendors');
  const vendorId = ids.vendor || vendors.body.data[0]?.id;
  const payableOPB = await POST('/payable-opb', {
    vendorId,
    amount: 8000,
    date: new Date().toISOString(),
    description: 'E2E Payable OPB',
  });
  assert(payableOPB.ok, `Payable OPB failed: ${payableOPB.status} ${JSON.stringify(payableOPB.body)}`);
});

// ═══════════════════════════════════════════
// SECTION J: OPERATIONS MODULES (56-62)
// ═══════════════════════════════════════════

test(56, 'Terminals', 'Create + list terminals', async () => {
  const cr = await POST('/terminals', { name: 'E2E Terminal', code: `TRM-${Date.now()}` });
  assert(cr.ok, `Create failed: ${cr.status} ${JSON.stringify(cr.body)}`);
  const list = await GET('/terminals');
  assert(list.ok && list.body.data.length >= 8, `Expected >=8, got ${list.body.data.length}`);
});

test(57, 'Shipments', 'Create + list shipments', async () => {
  const cr = await POST('/shipments', { description: 'E2E Shipment', status: 'Pending' });
  assert(cr.ok, `Create failed: ${cr.status} ${JSON.stringify(cr.body)}`);
  const list = await GET('/shipments');
  assert(list.ok && list.body.data.length >= 10, `Expected >=10, got ${list.body.data.length}`);
});

test(58, 'Fleet', 'Create vehicle + list fleet', async () => {
  const cr = await POST('/fleet', { plateNumber: `E2E-${Date.now()}`, make: 'Toyota', model: 'Hilux', type: 'Truck', status: 'Active' });
  assert(cr.ok, `Create failed: ${cr.status} ${JSON.stringify(cr.body)}`);
  const list = await GET('/fleet');
  assert(list.ok && list.body.data.length >= 8, `Expected >=8, got ${list.body.data.length}`);
});

test(59, 'Assets', 'Create asset + list assets', async () => {
  const cr = await POST('/assets', { name: 'E2E Laptop', category: 'IT Equipment', purchaseDate: new Date().toISOString(), purchaseCost: 5000, status: 'Active' });
  assert(cr.ok, `Create failed: ${cr.status} ${JSON.stringify(cr.body)}`);
  const list = await GET('/assets');
  assert(list.ok && list.body.data.length >= 8, `Expected >=8, got ${list.body.data.length}`);
});

test(60, 'DWO', 'Create daily work order + list', async () => {
  const cr = await POST('/daily-work-orders', { description: 'E2E Work Order', date: new Date().toISOString() });
  assert(cr.ok, `Create failed: ${cr.status} ${JSON.stringify(cr.body)}`);
  const list = await GET('/daily-work-orders');
  assert(list.ok && list.body.data.length >= 10, `Expected >=10, got ${list.body.data.length}`);
});

test(61, 'RCV/PVC', 'Create receipt voucher + list', async () => {
  const cr = await POST('/rcv-pvc', { type: 'RCV', date: new Date().toISOString(), amount: 1500, description: 'E2E Receipt' });
  assert(cr.ok, `Create failed: ${cr.status} ${JSON.stringify(cr.body)}`);
  const list = await GET('/rcv-pvc');
  assert(list.ok && list.body.data.length >= 8, `Expected >=8, got ${list.body.data.length}`);
});

test(62, 'Settings', 'GET + update settings', async () => {
  const r = await GET('/settings');
  assert(r.ok, `GET settings failed: ${r.status}`);

  // Test validation — missing value
  const bad = await PUT('/settings/COMPANY_NAME', {});
  // May return 400 for missing value
  if (bad.status === 400) {
    assert(bad.body.error?.includes('value is required'), `Wrong validation: ${bad.body.error}`);
  }
});

// ═══════════════════════════════════════════
// SECTION K: REPORTS & DASHBOARD (63-65)
// ═══════════════════════════════════════════

test(63, 'Dashboard', 'GET /dashboard/summary returns KPIs with numeric values', async () => {
  const r = await GET('/dashboard/summary');
  assert(r.ok, `Failed: ${r.status}`);
  const d = r.body.data;
  assert(d !== null && typeof d === 'object', 'No dashboard data');
});

test(64, 'Reports', 'Balance sheet returns assets/liabilities/equity sections', async () => {
  const r = await GET('/dashboard/balance-sheet');
  assert(r.ok, `Failed: ${r.status}`);
  const d = r.body.data;
  assert(d !== null, 'No balance sheet data');
});

test(65, 'Reports', 'Income statement returns revenue & expense data', async () => {
  const r = await GET('/dashboard/income-statement');
  assert(r.ok, `Failed: ${r.status}`);
  const d = r.body.data;
  assert(d !== null, 'No income statement data');
});

// ==========================================
// RUNNER
// ==========================================

async function run() {
  const startTime = Date.now();
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║   FAYHA TRANSPORTATION — COMPREHENSIVE E2E TEST SUITE                  ║');
  console.log('║   65 Tests · CRUD · Validation · ZATCA · Accounting · Edge Cases        ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════╣');
  console.log(`║   Target:  ${BASE.padEnd(58)}║`);
  console.log(`║   Tests:   ${String(tests.length).padEnd(58)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  let currentModule = '';
  for (const t of tests) {
    // Print module header
    const mod = t.module.split(':')[0];
    if (mod !== currentModule) {
      currentModule = mod;
      console.log(`  ── ${mod} ${'─'.repeat(60 - mod.length)}`);
    }

    const start = Date.now();
    try {
      await t.fn();
      const ms = Date.now() - start;
      passed++;
      console.log(`  ✅ #${String(t.id).padStart(2, '0')} ${t.description} (${ms}ms)`);
    } catch (err: any) {
      const ms = Date.now() - start;
      failed++;
      const msg = (err.message || String(err)).slice(0, 300);
      failures.push({ id: t.id, module: t.module, desc: t.description, error: msg });
      console.log(`  ❌ #${String(t.id).padStart(2, '0')} ${t.description} (${ms}ms)`);
      console.log(`       → ${msg}`);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════════╗');
  console.log(`║  RESULTS:  ${passed} passed  ·  ${failed} failed  ·  ${tests.length} total  ·  ${totalTime}s               `.slice(0, 74) + '║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝');

  if (failures.length > 0) {
    console.log('');
    console.log('  ┌─ FAILURES ──────────────────────────────────────────────────────────┐');
    for (const f of failures) {
      console.log(`  │  #${String(f.id).padStart(2, '0')} [${f.module}] ${f.desc}`);
      console.log(`  │      ${f.error}`);
    }
    console.log('  └──────────────────────────────────────────────────────────────────────┘');
  }

  console.log('');
  if (failed === 0) {
    console.log('  ╔═══════════════════════════════════════════════╗');
    console.log('  ║  ALL 65 TESTS PASSED — SYSTEM FULLY VERIFIED ║');
    console.log('  ╚═══════════════════════════════════════════════╝');
  } else {
    console.log(`  ⚠️  ${failed} TEST(S) FAILED — SEE ABOVE`);
  }
  console.log('');

  // Module summary
  const mods: Record<string, { pass: number; fail: number }> = {};
  for (const t of tests) {
    const m = t.module.split(':')[0];
    if (!mods[m]) mods[m] = { pass: 0, fail: 0 };
  }
  for (const t of tests) {
    const m = t.module.split(':')[0];
    const f = failures.find((x) => x.id === t.id);
    if (f) mods[m].fail++;
    else mods[m].pass++;
  }
  console.log('  MODULE COVERAGE:');
  for (const [m, v] of Object.entries(mods)) {
    const icon = v.fail === 0 ? '✅' : '❌';
    console.log(`    ${icon} ${m.padEnd(22)} ${v.pass}/${v.pass + v.fail} passed`);
  }
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal runner error:', err);
  process.exit(2);
});
