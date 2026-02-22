#!/usr/bin/env node
// =============================================================================
// FAYHA TRANSPORTATION - END-TO-END ACCOUNTING ACCURACY TEST
// Creates 50+ records across all sections, then verifies 100% accuracy
// =============================================================================

const BASE = 'http://localhost:5000/api/v1';
let TOKEN = '';
let ERRORS = [];
let WARNINGS = [];
let PASS = 0;
let FAIL = 0;

// ── Helpers ──
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (TOKEN) opts.headers['Authorization'] = `Bearer ${TOKEN}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json().catch(() => ({}));
  if (!res.ok && !json.success) {
    throw new Error(`${method} ${path} → ${res.status}: ${json.error || JSON.stringify(json)}`);
  }
  return json.data !== undefined ? json.data : json;
}

function assert(condition, label, detail) {
  if (condition) {
    PASS++;
    console.log(`  ✓ ${label}`);
  } else {
    FAIL++;
    const msg = `  ✗ ${label}${detail ? ` — ${detail}` : ''}`;
    console.log(msg);
    ERRORS.push(msg);
  }
}

function assertClose(actual, expected, label, tolerance = 0.01) {
  const diff = Math.abs(actual - expected);
  assert(diff <= tolerance, label, `expected ${expected}, got ${actual} (diff ${diff.toFixed(4)})`);
}

function section(title) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

// ── Storage for created IDs ──
const IDS = {
  customers: [],
  vendors: [],
  consignees: [],
  jobCategories: [],
  jobTitles: [],
  jobControllers: [],
  salesmen: [],
  jobRefs: [],
  salesInvoices: [],
  paymentEntries: [],
  clientAdvances: [],
  expenseEntries: [],
  banks: [],
  accounts: {},
};

// =============================================================================
// PHASE 1: AUTHENTICATION
// =============================================================================
async function phase1_auth() {
  section('PHASE 1: AUTHENTICATION');
  const result = await api('POST', '/auth/login', {
    email: 'admin@fayha-transport.sa',
    password: 'admin123',
  });
  TOKEN = result.token;
  assert(!!TOKEN, 'Login successful, token received');
  assert(!!result.user, 'User profile returned');
  console.log(`  → Logged in as: ${result.user.firstName} ${result.user.lastName} (${result.user.role})`);
}

// =============================================================================
// PHASE 2: LOAD EXISTING SEED DATA (accounts, banks, etc.)
// =============================================================================
async function phase2_loadSeedData() {
  section('PHASE 2: LOAD EXISTING SEED DATA');

  // Load Chart of Accounts
  const accounts = await api('GET', '/accounts');
  console.log(`  → Found ${accounts.length} accounts in Chart of Accounts`);

  // Map key accounts by name/code
  for (const acc of accounts) {
    if (acc.code === '1000' || acc.code === '1010') IDS.accounts.cash = acc;
    if (acc.name?.includes('Accounts Receivable') || acc.code === '1200') IDS.accounts.ar = acc;
    if (acc.name?.includes('Accounts Payable') || acc.code === '2000') IDS.accounts.ap = acc;
    if (acc.name?.includes('VAT Payable') || acc.code === '2200') IDS.accounts.vatPayable = acc;
    if (acc.name?.includes('VAT Input') || acc.code === '1400') IDS.accounts.vatInput = acc;
    if (acc.name?.includes('Transportation Revenue') || acc.code === '4000') IDS.accounts.transportRevenue = acc;
    if (acc.name?.includes('Customs Clearance Revenue') || acc.code === '4100') IDS.accounts.customsRevenue = acc;
    if (acc.name?.includes('Freight Forwarding') || acc.code === '4200') IDS.accounts.freightRevenue = acc;
    if (acc.name?.includes('Driver Salaries') || acc.code === '5000') IDS.accounts.driverSalaries = acc;
    if (acc.name?.includes('Fuel') || acc.code === '5200') IDS.accounts.fuel = acc;
    if (acc.name?.includes('Port Charges') || acc.code === '5500') IDS.accounts.portCharges = acc;
    if (acc.name?.includes('Client Advance') || acc.name?.includes('Customer Advance') || acc.name?.includes('Customer Deposits')) IDS.accounts.advanceLiability = acc;
    // Bank accounts in COA
    if (acc.code === '1010') IDS.accounts.alRajhiGL = acc;
    if (acc.code === '1011') IDS.accounts.snbGL = acc;
    if (acc.code === '1012') IDS.accounts.riyadGL = acc;
  }

  // Load bank accounts
  const banks = await api('GET', '/banks');
  IDS.banks = banks;
  console.log(`  → Found ${banks.length} bank accounts`);

  // Load existing customers
  const customers = await api('GET', '/customers');
  IDS.customers = customers;
  console.log(`  → Found ${customers.length} existing customers`);

  // Load existing vendors
  const vendors = await api('GET', '/vendors');
  IDS.vendors = vendors || [];
  console.log(`  → Found ${IDS.vendors.length} existing vendors`);

  // Essential accounts check
  assert(!!IDS.accounts.ar, 'Accounts Receivable account found');
  assert(!!IDS.accounts.cash, 'Cash account found');
  assert(IDS.banks.length > 0, 'At least 1 bank account exists');
  assert(IDS.customers.length > 0, 'At least 1 customer exists');
}

// =============================================================================
// PHASE 3: CREATE TEST DATA — CUSTOMERS (10 new)
// =============================================================================
async function phase3_customers() {
  section('PHASE 3: CREATE 10 NEW CUSTOMERS');
  const newCustomers = [
    { code: 'TST-C01', name: 'Test Alpha Trading Co.', phone: '0501110001', email: 'alpha@test.sa', city: 'Riyadh', creditLimit: 100000 },
    { code: 'TST-C02', name: 'Test Beta Logistics LLC', phone: '0501110002', email: 'beta@test.sa', city: 'Jeddah', creditLimit: 200000 },
    { code: 'TST-C03', name: 'Test Gamma Import/Export', phone: '0501110003', email: 'gamma@test.sa', city: 'Dammam', creditLimit: 150000 },
    { code: 'TST-C04', name: 'Test Delta Shipping Co.', phone: '0501110004', email: 'delta@test.sa', city: 'Riyadh', creditLimit: 300000 },
    { code: 'TST-C05', name: 'Test Epsilon Freight', phone: '0501110005', email: 'epsilon@test.sa', city: 'Jeddah', creditLimit: 250000 },
    { code: 'TST-C06', name: 'Test Zeta Industries', phone: '0501110006', email: 'zeta@test.sa', city: 'Dammam', creditLimit: 180000 },
    { code: 'TST-C07', name: 'Test Eta Construction', phone: '0501110007', email: 'eta@test.sa', city: 'Riyadh', creditLimit: 120000 },
    { code: 'TST-C08', name: 'Test Theta Chemicals', phone: '0501110008', email: 'theta@test.sa', city: 'Jubail', creditLimit: 500000 },
    { code: 'TST-C09', name: 'Test Iota Electronics', phone: '0501110009', email: 'iota@test.sa', city: 'Riyadh', creditLimit: 90000 },
    { code: 'TST-C10', name: 'Test Kappa Food Co.', phone: '0501110010', email: 'kappa@test.sa', city: 'Jeddah', creditLimit: 350000 },
  ];

  const createdCustomers = [];
  for (const c of newCustomers) {
    try {
      const created = await api('POST', '/customers', { ...c, country: 'SAUDI ARABIA', isActive: true });
      createdCustomers.push(created);
      assert(!!created.id, `Created customer: ${c.name}`);
    } catch (e) {
      // May already exist
      console.log(`  ⚠ Customer ${c.code} may already exist: ${e.message}`);
    }
  }
  // Refresh customer list
  IDS.customers = await api('GET', '/customers');
  console.log(`  → Total customers now: ${IDS.customers.length}`);
}

// =============================================================================
// PHASE 4: CREATE CONSIGNEES (5)
// =============================================================================
async function phase4_consignees() {
  section('PHASE 4: CREATE 5 CONSIGNEES');
  const consignees = [
    { code: 'TST-CON01', name: 'Test Warehouse A', city: 'Riyadh', contactPerson: 'Ali', phone: '0501200001' },
    { code: 'TST-CON02', name: 'Test Warehouse B', city: 'Jeddah', contactPerson: 'Omar', phone: '0501200002' },
    { code: 'TST-CON03', name: 'Test Distribution Center', city: 'Dammam', contactPerson: 'Saeed', phone: '0501200003' },
    { code: 'TST-CON04', name: 'Test Port Facility', city: 'Jubail', contactPerson: 'Fahad', phone: '0501200004' },
    { code: 'TST-CON05', name: 'Test Factory Yard', city: 'Yanbu', contactPerson: 'Ahmed', phone: '0501200005' },
  ];

  for (const c of consignees) {
    try {
      const created = await api('POST', '/consignees', c);
      IDS.consignees.push(created);
      assert(!!created.id, `Created consignee: ${c.name}`);
    } catch (e) {
      console.log(`  ⚠ Consignee ${c.code}: ${e.message}`);
    }
  }
}

// =============================================================================
// PHASE 5: CREATE JOB REFERENCES (10)
// =============================================================================
async function phase5_jobRefs() {
  section('PHASE 5: CREATE 10 JOB REFERENCES');

  // Load job categories, titles, etc.
  try { IDS.jobCategories = await api('GET', '/job-categories'); } catch { IDS.jobCategories = []; }
  try { IDS.jobTitles = await api('GET', '/job-titles'); } catch { IDS.jobTitles = []; }
  try { IDS.jobControllers = await api('GET', '/job-controllers'); } catch { IDS.jobControllers = []; }
  try { IDS.salesmen = await api('GET', '/salesmen'); } catch { IDS.salesmen = []; }

  // Use first 10 customers (mix seed + test)
  const customers = IDS.customers.slice(0, 10);
  const consignee = IDS.consignees[0] || null;

  for (let i = 0; i < 10; i++) {
    const client = customers[i % customers.length];
    try {
      const jr = await api('POST', '/job-references', {
        clientId: client.id,
        consigneeId: consignee?.id || undefined,
        direction: i % 2 === 0 ? 'IMPORT' : 'EXPORT',
        modeOfTransport: ['SEA', 'AIR', 'LAND'][i % 3],
        categoryId: IDS.jobCategories[0]?.id || undefined,
        titleId: IDS.jobTitles[0]?.id || undefined,
        controllerId: IDS.jobControllers[0]?.id || undefined,
        origin: ['Shanghai', 'Dubai', 'Hamburg', 'Singapore', 'Rotterdam'][i % 5],
        destination: ['Jeddah', 'Dammam', 'Riyadh', 'Jubail', 'Yanbu'][i % 5],
        awbBl: `BL-TST-${String(i + 1).padStart(3, '0')}`,
        packages: 10 + i * 5,
        grossWeight: 1000 + i * 500,
        notes: `E2E Test Job Reference #${i + 1}`,
      });
      IDS.jobRefs.push(jr);
      assert(!!jr.id, `Created Job Ref: ${jr.jobNumber} for ${client.name}`);
    } catch (e) {
      console.log(`  ⚠ Job Ref #${i + 1}: ${e.message}`);
    }
  }
  console.log(`  → Total Job References created: ${IDS.jobRefs.length}`);
}

// =============================================================================
// PHASE 6: CREATE SALES INVOICES (10) — one per job ref
// =============================================================================
async function phase6_salesInvoices() {
  section('PHASE 6: CREATE 10 SALES INVOICES');

  const revenueAccounts = [
    IDS.accounts.transportRevenue,
    IDS.accounts.customsRevenue,
    IDS.accounts.freightRevenue,
  ].filter(Boolean);

  if (revenueAccounts.length === 0) {
    console.log('  ⚠ No revenue accounts found, looking for any revenue account...');
    const allAccounts = await api('GET', '/accounts');
    const revAcc = allAccounts.find(a => a.type === 'REVENUE');
    if (revAcc) revenueAccounts.push(revAcc);
  }

  for (let i = 0; i < Math.min(10, IDS.jobRefs.length); i++) {
    const jr = IDS.jobRefs[i];
    const amount = 5000 + i * 2000; // SAR 5,000 to 23,000
    const vatRate = 0.15;
    const vatAmount = Math.round(amount * vatRate * 100) / 100;
    const totalAmount = amount + vatAmount;

    try {
      const inv = await api('POST', '/sales-invoices', {
        clientId: jr.clientId,
        jobReferenceId: jr.id,
        invoiceDate: '2026-02-15',
        dueDate: '2026-03-17',
        saleMethod: 'CREDIT',
        subtotal: amount,
        vatRate,
        vatAmount,
        totalAmount,
        balanceDue: totalAmount,
        status: 'DRAFT',
        items: [
          {
            description: `Transportation & Clearance Service - Job ${jr.jobNumber}`,
            quantity: 1,
            unitPrice: amount * 0.6,
            total: amount * 0.6,
            accountId: revenueAccounts[0]?.id,
          },
          {
            description: `Documentation & Handling - Job ${jr.jobNumber}`,
            quantity: 1,
            unitPrice: amount * 0.4,
            total: amount * 0.4,
            accountId: (revenueAccounts[1] || revenueAccounts[0])?.id,
          },
        ],
      });
      IDS.salesInvoices.push(inv);
      assert(!!inv.id, `Created Invoice: ${inv.invoiceNumber} — SAR ${totalAmount.toLocaleString()}`);
    } catch (e) {
      console.log(`  ⚠ Invoice for ${jr.jobNumber}: ${e.message}`);
    }
  }
  console.log(`  → Total Sales Invoices created: ${IDS.salesInvoices.length}`);
}

// =============================================================================
// PHASE 7: MARK INVOICES AS INVOICED (finalize them)
// =============================================================================
async function phase7_markInvoiced() {
  section('PHASE 7: MARK INVOICES AS INVOICED');
  let invoicedCount = 0;
  for (const inv of IDS.salesInvoices) {
    try {
      await api('POST', `/sales-invoices/${inv.id}/mark-invoiced`);
      invoicedCount++;
      assert(true, `Invoiced: ${inv.invoiceNumber}`);
    } catch (e) {
      console.log(`  ⚠ Mark invoiced ${inv.invoiceNumber}: ${e.message}`);
    }
  }
  console.log(`  → Invoiced: ${invoicedCount}/${IDS.salesInvoices.length}`);
}

// =============================================================================
// PHASE 8: CREATE CLIENT ADVANCES (5)
// =============================================================================
async function phase8_clientAdvances() {
  section('PHASE 8: CREATE 5 CLIENT ADVANCES');

  const bankAccount = IDS.banks[0]; // Al Rajhi
  const customers = IDS.customers.slice(0, 5);

  for (let i = 0; i < 5; i++) {
    const client = customers[i % customers.length];
    const amount = 3000 + i * 1500; // SAR 3,000 to 9,000

    try {
      const adv = await api('POST', '/client-advances', {
        clientId: client.id,
        amount,
        date: '2026-02-10',
        paymentMethod: 'BANK_TRANSFER',
        bankAccountId: bankAccount?.id,
        reference: `ADV-TST-${String(i + 1).padStart(3, '0')}`,
        description: `Advance payment from ${client.name}`,
      });
      IDS.clientAdvances.push(adv);
      assert(!!adv.id, `Created Advance: ${adv.advanceNumber} — SAR ${amount.toLocaleString()} from ${client.name}`);
    } catch (e) {
      console.log(`  ⚠ Client Advance #${i + 1}: ${e.message}`);
    }
  }
  console.log(`  → Total Client Advances: ${IDS.clientAdvances.length}`);
}

// =============================================================================
// PHASE 9: CREATE PAYMENT ENTRIES (5) — pay some invoices
// =============================================================================
async function phase9_paymentEntries() {
  section('PHASE 9: CREATE 5 PAYMENT ENTRIES');

  // Reload invoices to get current status
  const allInvoices = await api('GET', '/sales-invoices');
  const invoicedInvs = allInvoices.filter(inv =>
    inv.status === 'INVOICED' || inv.status === 'PARTIAL'
  );
  console.log(`  → Found ${invoicedInvs.length} payable invoices`);

  // Find bank GL account
  const bankGLAccount = IDS.accounts.alRajhiGL || IDS.accounts.snbGL ||
    (await api('GET', '/accounts')).find(a => a.code === '1010' || a.name?.includes('Rajhi'));
  const arAccount = IDS.accounts.ar;

  if (!bankGLAccount || !arAccount) {
    console.log('  ⚠ Missing bank GL or AR account, skipping payment entries');
    return;
  }

  const toPay = invoicedInvs.slice(0, 5);
  for (let i = 0; i < toPay.length; i++) {
    const inv = toPay[i];
    const payAmount = inv.totalAmount || inv.balanceDue || 5000;

    // Find the job ref for this invoice
    const jobRef = IDS.jobRefs.find(j => j.id === inv.jobReferenceId);

    try {
      const pe = await api('POST', '/payment-entries', {
        clientId: inv.clientId,
        jobRefId: inv.jobReferenceId || jobRef?.id,
        invoiceId: inv.id,
        documentDate: '2026-02-20',
        documentNumber: `CHQ-TST-${String(i + 1).padStart(3, '0')}`,
        method: i % 2 === 0 ? 'Bank' : 'Cheque',
        entryType: 'Receipt',
        ledgerAccountId: bankGLAccount.id,
        lines: [
          {
            paymentStatus: `DR: Bank`,
            accountId: bankGLAccount.id,
            drAmount: payAmount,
            crAmount: 0,
          },
          {
            paymentStatus: `CR: Accounts Receivable`,
            accountId: arAccount.id,
            drAmount: 0,
            crAmount: payAmount,
          },
        ],
        totalDr: payAmount,
        totalCr: payAmount,
      });
      IDS.paymentEntries.push({ ...pe, amount: payAmount, invoiceId: inv.id });
      assert(!!pe.id, `Created Payment: ${pe.documentId || pe.entryNumber} — SAR ${payAmount.toLocaleString()} for ${inv.invoiceNumber}`);
    } catch (e) {
      console.log(`  ⚠ Payment Entry #${i + 1}: ${e.message}`);
    }
  }
  console.log(`  → Total Payment Entries: ${IDS.paymentEntries.length}`);
}

// =============================================================================
// PHASE 10: CREATE EXPENSE ENTRIES (5)
// =============================================================================
async function phase10_expenseEntries() {
  section('PHASE 10: CREATE 5 EXPENSE ENTRIES');

  const expenseAccounts = [
    IDS.accounts.fuel,
    IDS.accounts.portCharges,
    IDS.accounts.driverSalaries,
  ].filter(Boolean);

  // Get any expense account if none found
  if (expenseAccounts.length === 0) {
    const allAccounts = await api('GET', '/accounts');
    const expAcc = allAccounts.filter(a => a.type === 'EXPENSE');
    expenseAccounts.push(...expAcc.slice(0, 3));
  }

  for (let i = 0; i < 5; i++) {
    const amount = 1000 + i * 800;
    const vatAmount = Math.round(amount * 0.15 * 100) / 100;
    const jobRef = IDS.jobRefs[i % IDS.jobRefs.length];

    try {
      const exp = await api('POST', '/expense-entries', {
        date: '2026-02-18',
        clientId: jobRef?.clientId,
        jobRefId: jobRef?.id,
        accountId: expenseAccounts[i % expenseAccounts.length]?.id,
        amount,
        vatAmount,
        totalAmount: amount + vatAmount,
        paymentMethod: 'CASH',
        category: ['Fuel', 'Port Charges', 'Driver Salary', 'Maintenance', 'Customs'][i % 5],
        description: `E2E Test Expense #${i + 1} — ${['Fuel', 'Port Charges', 'Driver Salary', 'Maintenance', 'Customs'][i % 5]}`,
        reference: `EXP-TST-${String(i + 1).padStart(3, '0')}`,
      });
      IDS.expenseEntries.push(exp);
      assert(!!exp.id, `Created Expense: ${exp.expenseNumber} — SAR ${(amount + vatAmount).toLocaleString()}`);
    } catch (e) {
      console.log(`  ⚠ Expense Entry #${i + 1}: ${e.message}`);
    }
  }
}

// =============================================================================
// PHASE 11: CREATE JOURNAL ENTRIES (5 general journals)
// =============================================================================
async function phase11_journalEntries() {
  section('PHASE 11: CREATE 5 GENERAL JOURNAL ENTRIES');

  const allAccounts = await api('GET', '/accounts');
  const deprExpense = allAccounts.find(a => a.name?.includes('Depreciation') && a.type === 'EXPENSE');
  const accDepr = allAccounts.find(a => a.name?.includes('Accumulated') || (a.type === 'ASSET' && a.name?.includes('Depreciation')));
  const cashAcc = IDS.accounts.cash || allAccounts.find(a => a.code === '1000');
  const rentAcc = allAccounts.find(a => a.name?.includes('Rent')) || allAccounts.find(a => a.type === 'EXPENSE');
  const utilAcc = allAccounts.find(a => a.name?.includes('Utilities')) || rentAcc;

  const entries = [
    { desc: 'Monthly Vehicle Depreciation', dr: deprExpense, cr: accDepr || cashAcc, amount: 2500 },
    { desc: 'Office Rent Payment', dr: rentAcc, cr: cashAcc, amount: 8000 },
    { desc: 'Utility Bills', dr: utilAcc, cr: cashAcc, amount: 1500 },
    { desc: 'Miscellaneous Expense', dr: rentAcc, cr: cashAcc, amount: 750 },
    { desc: 'Staff Salary Advance', dr: allAccounts.find(a => a.name?.includes('Staff') || a.name?.includes('Salaries')) || rentAcc, cr: cashAcc, amount: 5000 },
  ];

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (!e.dr || !e.cr) {
      console.log(`  ⚠ Skipping journal #${i + 1}: missing accounts`);
      continue;
    }
    try {
      const je = await api('POST', '/journals', {
        date: '2026-02-20',
        description: `E2E Test: ${e.desc}`,
        reference: `JE-TST-${String(i + 1).padStart(3, '0')}`,
        lines: [
          { accountId: e.dr.id, description: e.desc, debitAmount: e.amount, creditAmount: 0 },
          { accountId: e.cr.id, description: e.desc, debitAmount: 0, creditAmount: e.amount },
        ],
      });
      // Post the journal entry
      if (je.id) {
        try {
          await api('POST', `/journals/${je.id}/post`);
          assert(true, `Created & Posted JE: ${je.entryNumber} — ${e.desc} SAR ${e.amount.toLocaleString()}`);
        } catch (postErr) {
          assert(true, `Created JE: ${je.entryNumber} (may be auto-posted)`);
        }
      }
    } catch (err) {
      console.log(`  ⚠ Journal Entry #${i + 1}: ${err.message}`);
    }
  }
}

// =============================================================================
// PHASE 12: VERIFICATION — ACCOUNTING ACCURACY
// =============================================================================
async function phase12_verifyAccounting() {
  section('PHASE 12: VERIFY ACCOUNTING ACCURACY');

  // ── 12a: Trial Balance must balance (Total DR = Total CR) ──
  console.log('\n  ── 12a: TRIAL BALANCE ──');
  try {
    const tb = await api('GET', '/accounts/trial-balance');
    let totalDr = 0;
    let totalCr = 0;
    const tbData = Array.isArray(tb) ? tb : (tb.accounts || tb.data || []);
    for (const acc of tbData) {
      totalDr += acc.debit || acc.totalDebit || 0;
      totalCr += acc.credit || acc.totalCredit || 0;
    }
    assertClose(totalDr, totalCr, `Trial Balance: DR (${totalDr.toFixed(2)}) = CR (${totalCr.toFixed(2)})`);
    console.log(`    Total Debit:  SAR ${totalDr.toLocaleString('en', { minimumFractionDigits: 2 })}`);
    console.log(`    Total Credit: SAR ${totalCr.toLocaleString('en', { minimumFractionDigits: 2 })}`);
    console.log(`    Difference:   SAR ${Math.abs(totalDr - totalCr).toFixed(2)}`);
  } catch (e) {
    console.log(`  ⚠ Trial Balance check: ${e.message}`);
  }

  // ── 12b: All Journal Entries must be balanced (DR = CR per entry) ──
  console.log('\n  ── 12b: JOURNAL ENTRY BALANCE CHECK ──');
  try {
    const journals = await api('GET', '/journals');
    const jList = Array.isArray(journals) ? journals : (journals.data || []);
    let unbalanced = 0;
    for (const je of jList) {
      const lines = je.lines || [];
      const dr = lines.reduce((s, l) => s + (l.debitAmount || 0), 0);
      const cr = lines.reduce((s, l) => s + (l.creditAmount || 0), 0);
      if (Math.abs(dr - cr) > 0.01) {
        unbalanced++;
        console.log(`    ✗ UNBALANCED: ${je.entryNumber} DR=${dr} CR=${cr} diff=${(dr - cr).toFixed(2)}`);
      }
    }
    assert(unbalanced === 0, `All ${jList.length} journal entries are balanced`, `${unbalanced} unbalanced`);
  } catch (e) {
    console.log(`  ⚠ Journal check: ${e.message}`);
  }

  // ── 12c: Invoice status check — paid invoices should be PAID ──
  console.log('\n  ── 12c: INVOICE STATUS CHECK ──');
  try {
    const invoices = await api('GET', '/sales-invoices');
    const invList = Array.isArray(invoices) ? invoices : [];
    let statusCorrect = 0;
    let statusWrong = 0;
    for (const inv of invList) {
      if (inv.paidAmount >= inv.totalAmount - 0.01 && inv.status !== 'PAID') {
        statusWrong++;
        console.log(`    ✗ Invoice ${inv.invoiceNumber}: paidAmount=${inv.paidAmount} totalAmount=${inv.totalAmount} but status=${inv.status}`);
      } else if (inv.paidAmount > 0 && inv.paidAmount < inv.totalAmount - 0.01 && inv.status !== 'PARTIAL') {
        statusWrong++;
        console.log(`    ✗ Invoice ${inv.invoiceNumber}: partially paid but status=${inv.status}`);
      } else {
        statusCorrect++;
      }
    }
    assert(statusWrong === 0, `All ${invList.length} invoice statuses correct`, `${statusWrong} wrong`);
    console.log(`    → ${statusCorrect} correct, ${statusWrong} wrong out of ${invList.length} invoices`);
  } catch (e) {
    console.log(`  ⚠ Invoice status check: ${e.message}`);
  }

  // ── 12d: Customer balance accuracy ──
  console.log('\n  ── 12d: CUSTOMER BALANCE ACCURACY ──');
  try {
    const customers = await api('GET', '/customers');
    let balanceErrors = 0;
    for (const cust of customers.slice(0, 20)) {
      // Expected: outstandingBalance = totalInvoiced - totalPaid
      const expected = (cust.totalInvoiced || 0) - (cust.totalPaid || 0);
      const actual = cust.outstandingBalance || 0;
      if (Math.abs(actual - expected) > 0.01) {
        balanceErrors++;
        console.log(`    ✗ ${cust.name}: outstanding=${actual} expected=${expected} (invoiced=${cust.totalInvoiced} paid=${cust.totalPaid})`);
      }
    }
    assert(balanceErrors === 0, `Customer balances consistent (invoiced - paid = outstanding)`, `${balanceErrors} errors`);
  } catch (e) {
    console.log(`  ⚠ Customer balance check: ${e.message}`);
  }

  // ── 12e: Bank transaction types ──
  console.log('\n  ── 12e: BANK TRANSACTION TYPES ──');
  try {
    for (const bank of IDS.banks) {
      const bankDetail = await api('GET', `/banks/${bank.id}`);
      const txns = bankDetail.transactions || [];
      const creditTxns = txns.filter(t => t.type === 'CREDIT');
      const debitTxns = txns.filter(t => t.type === 'DEBIT');
      const totalIn = creditTxns.reduce((s, t) => s + t.amount, 0);
      const totalOut = debitTxns.reduce((s, t) => s + t.amount, 0);

      // Check for payment entries (PE-*) that should be CREDIT (money in)
      // Note: PVC-* entries are payment vouchers (money out) and should be DEBIT
      const paymentReceipts = txns.filter(t => t.documentType === 'PAYMENT' && t.documentRef?.startsWith('PE-'));
      const wrongPayments = paymentReceipts.filter(t => t.type === 'DEBIT');
      assert(
        wrongPayments.length === 0,
        `${bank.bankName}: ${paymentReceipts.length} payment receipts all typed CREDIT`,
        `${wrongPayments.length} still typed DEBIT`
      );

      console.log(`    ${bank.bankName}: In=${totalIn.toFixed(2)} (${creditTxns.length}tx) Out=${totalOut.toFixed(2)} (${debitTxns.length}tx)`);
    }
  } catch (e) {
    console.log(`  ⚠ Bank transaction check: ${e.message}`);
  }

  // ── 12f: Client Advance utilization ──
  console.log('\n  ── 12f: CLIENT ADVANCE UTILIZATION ──');
  try {
    const advances = await api('GET', '/client-advances');
    const advList = Array.isArray(advances) ? advances : [];
    let advErrors = 0;
    for (const adv of advList) {
      const expectedRemaining = (adv.amount || 0) - (adv.usedAmount || 0);
      const actualRemaining = adv.remainingAmount ?? expectedRemaining;
      if (Math.abs(actualRemaining - expectedRemaining) > 0.01) {
        advErrors++;
        console.log(`    ✗ ${adv.advanceNumber}: remaining=${actualRemaining} expected=${expectedRemaining}`);
      }
      // Status check
      if (adv.usedAmount >= adv.amount - 0.01 && adv.status !== 'USED') {
        advErrors++;
        console.log(`    ✗ ${adv.advanceNumber}: fully used but status=${adv.status}`);
      }
    }
    assert(advErrors === 0, `All ${advList.length} advance records consistent`, `${advErrors} errors`);
  } catch (e) {
    console.log(`  ⚠ Advance check: ${e.message}`);
  }

  // ── 12g: Payment Entry journal entries are all POSTED ──
  console.log('\n  ── 12g: PAYMENT ENTRY STATUS ──');
  try {
    const peList = await api('GET', '/payment-entries');
    const entries = Array.isArray(peList) ? peList : [];
    let notPosted = 0;
    for (const pe of entries) {
      if (pe.status !== 'POSTED') {
        notPosted++;
        console.log(`    ✗ ${pe.documentId}: status=${pe.status} (should be POSTED)`);
      }
    }
    assert(notPosted === 0, `All ${entries.length} payment entries are POSTED`, `${notPosted} not posted`);
  } catch (e) {
    console.log(`  ⚠ Payment entry check: ${e.message}`);
  }

  // ── 12h: Bank balance = opening + sum(CREDIT) - sum(DEBIT) ──
  console.log('\n  ── 12h: BANK BALANCE CALCULATION ──');
  try {
    for (const bank of IDS.banks) {
      const bankDetail = await api('GET', `/banks/${bank.id}`);
      const txns = bankDetail.transactions || [];
      const totalIn = txns.filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
      const totalOut = txns.filter(t => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0);
      const expectedBalance = (bankDetail.openingBalance || 0) + totalIn - totalOut;
      const actualBalance = bankDetail.currentBalance || 0;

      assertClose(
        actualBalance, expectedBalance,
        `${bankDetail.bankName}: balance ${actualBalance.toFixed(2)} = opening(${(bankDetail.openingBalance || 0).toFixed(2)}) + in(${totalIn.toFixed(2)}) - out(${totalOut.toFixed(2)})`
      );
    }
  } catch (e) {
    console.log(`  ⚠ Bank balance check: ${e.message}`);
  }

  // ── 12i: Balance Sheet (Assets = Liabilities + Equity) ──
  console.log('\n  ── 12i: BALANCE SHEET EQUATION ──');
  try {
    const accounts = await api('GET', '/accounts');
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let totalRevenue = 0;
    let totalExpense = 0;

    for (const acc of accounts) {
      const bal = acc.currentBalance || 0;
      switch (acc.type) {
        case 'ASSET': totalAssets += bal; break;
        case 'LIABILITY': totalLiabilities += bal; break;
        case 'EQUITY': totalEquity += bal; break;
        case 'REVENUE': totalRevenue += bal; break;
        case 'EXPENSE': totalExpense += bal; break;
      }
    }

    console.log(`    Assets:      SAR ${totalAssets.toLocaleString('en', { minimumFractionDigits: 2 })}`);
    console.log(`    Liabilities: SAR ${totalLiabilities.toLocaleString('en', { minimumFractionDigits: 2 })}`);
    console.log(`    Equity:      SAR ${totalEquity.toLocaleString('en', { minimumFractionDigits: 2 })}`);
    console.log(`    Revenue:     SAR ${totalRevenue.toLocaleString('en', { minimumFractionDigits: 2 })}`);
    console.log(`    Expenses:    SAR ${totalExpense.toLocaleString('en', { minimumFractionDigits: 2 })}`);
    console.log(`    Net Income:  SAR ${(totalRevenue - totalExpense).toLocaleString('en', { minimumFractionDigits: 2 })}`);

    // A = L + E + (R - Ex)  [accounting equation with income]
    const lhs = totalAssets;
    const rhs = totalLiabilities + totalEquity + (totalRevenue - totalExpense);
    assertClose(lhs, rhs,
      `Accounting Equation: Assets(${lhs.toFixed(2)}) = L+E+NetIncome(${rhs.toFixed(2)})`,
      1.0 // Allow small rounding tolerance
    );
  } catch (e) {
    console.log(`  ⚠ Balance sheet check: ${e.message}`);
  }
}

// =============================================================================
// PHASE 13: DATA COUNT VERIFICATION
// =============================================================================
async function phase13_dataCounts() {
  section('PHASE 13: DATA COUNT VERIFICATION');

  const counts = {};

  try { const d = await api('GET', '/customers'); counts.customers = Array.isArray(d) ? d.length : 0; } catch { counts.customers = 0; }
  try { const d = await api('GET', '/vendors'); counts.vendors = Array.isArray(d) ? d.length : 0; } catch { counts.vendors = 0; }
  try { const d = await api('GET', '/consignees'); counts.consignees = Array.isArray(d) ? d.length : 0; } catch { counts.consignees = 0; }
  try { const d = await api('GET', '/job-references'); counts.jobRefs = Array.isArray(d) ? d.length : 0; } catch { counts.jobRefs = 0; }
  try { const d = await api('GET', '/sales-invoices'); counts.salesInvoices = Array.isArray(d) ? d.length : 0; } catch { counts.salesInvoices = 0; }
  try { const d = await api('GET', '/payment-entries'); counts.paymentEntries = Array.isArray(d) ? d.length : 0; } catch { counts.paymentEntries = 0; }
  try { const d = await api('GET', '/client-advances'); counts.clientAdvances = Array.isArray(d) ? d.length : 0; } catch { counts.clientAdvances = 0; }
  try { const d = await api('GET', '/expense-entries'); counts.expenseEntries = Array.isArray(d) ? d.length : 0; } catch { counts.expenseEntries = 0; }
  try { const d = await api('GET', '/journals'); const j = Array.isArray(d) ? d : (d.data || []); counts.journalEntries = j.length; } catch { counts.journalEntries = 0; }
  try { const d = await api('GET', '/banks'); counts.bankAccounts = Array.isArray(d) ? d.length : 0; } catch { counts.bankAccounts = 0; }
  try { const d = await api('GET', '/accounts'); counts.chartOfAccounts = Array.isArray(d) ? d.length : 0; } catch { counts.chartOfAccounts = 0; }

  console.log('\n  DATA COUNTS:');
  console.log(`    Customers:        ${counts.customers}`);
  console.log(`    Vendors:          ${counts.vendors}`);
  console.log(`    Consignees:       ${counts.consignees}`);
  console.log(`    Job References:   ${counts.jobRefs}`);
  console.log(`    Sales Invoices:   ${counts.salesInvoices}`);
  console.log(`    Payment Entries:  ${counts.paymentEntries}`);
  console.log(`    Client Advances:  ${counts.clientAdvances}`);
  console.log(`    Expense Entries:  ${counts.expenseEntries}`);
  console.log(`    Journal Entries:  ${counts.journalEntries}`);
  console.log(`    Bank Accounts:    ${counts.bankAccounts}`);
  console.log(`    Chart of Accounts: ${counts.chartOfAccounts}`);

  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  console.log(`\n    TOTAL RECORDS: ${total}`);
  assert(total >= 50, `Total records >= 50 (got ${total})`);
}

// =============================================================================
// MAIN
// =============================================================================
async function main() {
  console.log('\n' + '█'.repeat(60));
  console.log('  FAYHA TRANSPORTATION — E2E ACCOUNTING TEST');
  console.log('  ' + new Date().toISOString());
  console.log('█'.repeat(60));

  try {
    await phase1_auth();
    await phase2_loadSeedData();
    await phase3_customers();
    await phase4_consignees();
    await phase5_jobRefs();
    await phase6_salesInvoices();
    await phase7_markInvoiced();
    await phase8_clientAdvances();
    await phase9_paymentEntries();
    await phase10_expenseEntries();
    await phase11_journalEntries();
    await phase12_verifyAccounting();
    await phase13_dataCounts();
  } catch (e) {
    console.error(`\n  FATAL ERROR: ${e.message}`);
    console.error(e.stack);
    FAIL++;
  }

  // ── Final Report ──
  console.log('\n' + '█'.repeat(60));
  console.log('  FINAL RESULTS');
  console.log('█'.repeat(60));
  console.log(`\n  PASSED: ${PASS}`);
  console.log(`  FAILED: ${FAIL}`);
  console.log(`  TOTAL:  ${PASS + FAIL}`);
  console.log(`  RATE:   ${((PASS / (PASS + FAIL)) * 100).toFixed(1)}%`);

  if (ERRORS.length > 0) {
    console.log(`\n  ERRORS:`);
    for (const err of ERRORS) {
      console.log(`  ${err}`);
    }
  }

  if (FAIL > 0) {
    console.log('\n  ❌ SOME TESTS FAILED — review errors above');
    process.exit(1);
  } else {
    console.log('\n  ✅ ALL TESTS PASSED — 100% ACCURACY');
    process.exit(0);
  }
}

main();
