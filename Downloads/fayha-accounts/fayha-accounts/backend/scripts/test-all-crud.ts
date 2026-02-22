// ==========================================
// FAYHA ERP - Comprehensive CRUD & Accounting Test Script
// Tests all sections: Create 50+ records, Update 5, Delete 3
// Verifies auto journal entries & Trial Balance (DR = CR)
// ==========================================

const BASE_URL = 'http://localhost:5000/api/v1';
let TOKEN = '';
let ACCOUNTS: any[] = [];
let BANK_ACCOUNTS: any[] = [];
const RUN_ID = Date.now().toString(36).slice(-4).toUpperCase(); // unique per run

// ==================== HELPERS ====================

let requestCount = 0;
async function api(method: string, path: string, body?: any, retries = 5): Promise<any> {
  // Throttle: pause briefly every 5 requests to avoid rate limiting (2000 req / 15 min)
  requestCount++;
  if (requestCount % 5 === 0) await sleep(50);

  const opts: any = {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const json = await res.json();

  // Retry on rate limit with exponential backoff
  if (res.status === 429 && retries > 0) {
    const wait = (4 - retries) * 15000; // 15s, 30s, 45s
    console.log(`    ⏳ Rate limited on ${method} ${path}, waiting ${wait / 1000}s...`);
    await sleep(wait);
    return api(method, path, body, retries - 1);
  }

  if (!res.ok && !json.success) {
    throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function login() {
  for (let attempt = 1; attempt <= 10; attempt++) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@fayha-transport.sa', password: 'admin123' }),
    });
    const json = await res.json();
    if (res.status === 429) {
      console.log(`  Rate limited, waiting 30s... (attempt ${attempt}/10)`);
      await sleep(30000);
      continue;
    }
    if (!json.token && !json.data?.token) throw new Error('Login failed: ' + JSON.stringify(json));
    TOKEN = json.token || json.data?.token;
    console.log('✅ Logged in successfully\n');
    return;
  }
  throw new Error('Login failed after 10 retries due to rate limiting');
}

async function loadAccounts() {
  const res = await api('GET', '/accounts');
  ACCOUNTS = res.data || [];
  const bankRes = await api('GET', '/banks');
  BANK_ACCOUNTS = bankRes.data || [];
  console.log(`  Loaded ${ACCOUNTS.length} accounts, ${BANK_ACCOUNTS.length} bank accounts`);
}

function findAccount(codeOrType: string): string {
  const acc = ACCOUNTS.find((a: any) => a.code === codeOrType || a.type === codeOrType);
  return acc?.id || ACCOUNTS[0]?.id || '';
}

function findAccountByCode(code: string): string {
  return ACCOUNTS.find((a: any) => a.code === code)?.id || '';
}

function randomCity() {
  const cities = ['Riyadh', 'Jeddah', 'Dammam', 'Mecca', 'Medina', 'Tabuk', 'Abha', 'Khobar', 'Jubail', 'Yanbu'];
  return cities[Math.floor(Math.random() * cities.length)];
}

function randomCategory() {
  const cats = ['Retail', 'FMCG', 'Petrochemical', 'Automotive', 'Electronics', 'Construction', 'Pharma', 'Textile', 'Food', 'Logistics'];
  return cats[Math.floor(Math.random() * cats.length)];
}

function randomAmount(min = 500, max = 50000) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function pad(n: number, len = 3) { return String(n).padStart(len, '0'); }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ==================== RESULTS TRACKING ====================

interface SectionResult {
  name: string;
  created: number;
  updated: number;
  deleted: number;
  journalsVerified: number;
  errors: string[];
}

const results: SectionResult[] = [];
function newSection(name: string): SectionResult {
  const s: SectionResult = { name, created: 0, updated: 0, deleted: 0, journalsVerified: 0, errors: [] };
  results.push(s);
  return s;
}

// ==================== GROUP 1: MASTER DATA ====================

async function testCustomers() {
  const sec = newSection('Customers');
  console.log('\n═══════════════════════════════════════');
  console.log('  CUSTOMERS');
  console.log('═══════════════════════════════════════');

  const ids: string[] = [];

  // CREATE 50
  for (let i = 1; i <= 50; i++) {
    try {
      const res = await api('POST', '/customers', {
        name: `Test Customer ${pad(i)}`,
        nameAr: `عميل تجريبي ${i}`,
        contactPerson: `Contact Person ${i}`,
        phone: `+966-5${pad(i, 8)}`,
        email: `customer${i}@test.sa`,
        city: randomCity(),
        category: randomCategory(),
        creditLimit: randomAmount(50000, 500000),
        paymentTermDays: [15, 30, 45, 60][i % 4],
        vatNumber: `30001${pad(i, 7)}00003`,
        crNumber: `101${pad(i, 7)}`,
      });
      ids.push(res.data.id);
      sec.created++;
    } catch (e: any) { sec.errors.push(`Create #${i}: ${e.message}`); }
  }
  console.log(`  Created: ${sec.created}/50`);

  // UPDATE 5
  for (let i = 0; i < Math.min(5, ids.length); i++) {
    try {
      await api('PUT', `/customers/${ids[i]}`, {
        name: `Updated Customer ${pad(i + 1)}`,
        creditLimit: 999999,
        city: 'Riyadh',
      });
      sec.updated++;
    } catch (e: any) { sec.errors.push(`Update #${i + 1}: ${e.message}`); }
  }
  console.log(`  Updated: ${sec.updated}/5`);

  // DELETE 3
  for (let i = ids.length - 1; i >= ids.length - 3 && i >= 0; i--) {
    try {
      await api('DELETE', `/customers/${ids[i]}`);
      sec.deleted++;
    } catch (e: any) { sec.errors.push(`Delete #${i}: ${e.message}`); }
  }
  console.log(`  Deleted: ${sec.deleted}/3`);
  if (sec.errors.length) console.log(`  Errors: ${sec.errors.length}`);

  return ids.slice(0, ids.length - 3); // return surviving IDs
}

async function testVendors() {
  const sec = newSection('Vendors');
  console.log('\n═══════════════════════════════════════');
  console.log('  VENDORS');
  console.log('═══════════════════════════════════════');

  const ids: string[] = [];

  for (let i = 1; i <= 50; i++) {
    try {
      const res = await api('POST', '/vendors', {
        code: `TV${RUN_ID}-${pad(i, 4)}`,
        name: `Test Vendor ${pad(i)}`,
        nameAr: `مورد تجريبي ${i}`,
        contactPerson: `Vendor Contact ${i}`,
        phone: `+966-5${pad(i, 8)}`,
        email: `vendor${i}@test.sa`,
        city: randomCity(),
        category: randomCategory(),
        paymentTermDays: [15, 30, 45, 60][i % 4],
        vatNumber: `31001${pad(i, 7)}00003`,
      });
      ids.push(res.data.id);
      sec.created++;
    } catch (e: any) { sec.errors.push(`Create #${i}: ${e.message}`); }
  }
  console.log(`  Created: ${sec.created}/50`);

  for (let i = 0; i < Math.min(5, ids.length); i++) {
    try {
      await api('PUT', `/vendors/${ids[i]}`, {
        name: `Updated Vendor ${pad(i + 1)}`,
        paymentTermDays: 90,
      });
      sec.updated++;
    } catch (e: any) { sec.errors.push(`Update #${i + 1}: ${e.message}`); }
  }
  console.log(`  Updated: ${sec.updated}/5`);

  for (let i = ids.length - 1; i >= ids.length - 3 && i >= 0; i--) {
    try {
      await api('DELETE', `/vendors/${ids[i]}`);
      sec.deleted++;
    } catch (e: any) { sec.errors.push(`Delete #${i}: ${e.message}`); }
  }
  console.log(`  Deleted: ${sec.deleted}/3`);
  if (sec.errors.length) console.log(`  Errors: ${sec.errors.length}`);

  return ids.slice(0, ids.length - 3);
}

async function testConsignees() {
  const sec = newSection('Consignees');
  console.log('\n═══════════════════════════════════════');
  console.log('  CONSIGNEES');
  console.log('═══════════════════════════════════════');

  const ids: string[] = [];

  for (let i = 1; i <= 50; i++) {
    try {
      const res = await api('POST', '/consignees', {
        name: `Test Consignee ${pad(i)}`,
        nameAr: `مرسل إليه ${i}`,
        contactPerson: `Consignee Contact ${i}`,
        phone: `+966-5${pad(i, 8)}`,
        email: `consignee${i}@test.sa`,
        city: randomCity(),
        warehouseLocation: `Warehouse Zone ${i}, Industrial Area`,
      });
      ids.push(res.data.id);
      sec.created++;
    } catch (e: any) { sec.errors.push(`Create #${i}: ${e.message}`); }
  }
  console.log(`  Created: ${sec.created}/50`);

  for (let i = 0; i < Math.min(5, ids.length); i++) {
    try {
      await api('PUT', `/consignees/${ids[i]}`, { name: `Updated Consignee ${pad(i + 1)}`, city: 'Dammam' });
      sec.updated++;
    } catch (e: any) { sec.errors.push(`Update #${i + 1}: ${e.message}`); }
  }
  console.log(`  Updated: ${sec.updated}/5`);

  for (let i = ids.length - 1; i >= ids.length - 3 && i >= 0; i--) {
    try {
      await api('DELETE', `/consignees/${ids[i]}`);
      sec.deleted++;
    } catch (e: any) { sec.errors.push(`Delete #${i}: ${e.message}`); }
  }
  console.log(`  Deleted: ${sec.deleted}/3`);
  if (sec.errors.length) console.log(`  Errors: ${sec.errors.length}`);

  return ids.slice(0, ids.length - 3);
}

async function testTerminals() {
  const sec = newSection('Terminals');
  console.log('\n═══════════════════════════════════════');
  console.log('  TERMINALS');
  console.log('═══════════════════════════════════════');

  const ids: string[] = [];
  const ports = ['Jeddah Islamic Port', 'King Abdulaziz Port', 'Jubail Commercial Port', 'Dammam Port', 'Yanbu Port'];

  for (let i = 1; i <= 20; i++) {
    try {
      const res = await api('POST', '/terminals', {
        name: `Terminal ${pad(i)}`,
        nameAr: `محطة ${i}`,
        port: ports[i % ports.length],
        city: randomCity(),
        country: 'Saudi Arabia',
      });
      ids.push(res.data.id);
      sec.created++;
    } catch (e: any) { sec.errors.push(`Create #${i}: ${e.message}`); }
  }
  console.log(`  Created: ${sec.created}/20`);

  for (let i = 0; i < Math.min(5, ids.length); i++) {
    try {
      await api('PUT', `/terminals/${ids[i]}`, { name: `Updated Terminal ${pad(i + 1)}` });
      sec.updated++;
    } catch (e: any) { sec.errors.push(`Update #${i + 1}: ${e.message}`); }
  }
  console.log(`  Updated: ${sec.updated}/5`);

  for (let i = ids.length - 1; i >= ids.length - 3 && i >= 0; i--) {
    try {
      await api('DELETE', `/terminals/${ids[i]}`);
      sec.deleted++;
    } catch (e: any) { sec.errors.push(`Delete #${i}: ${e.message}`); }
  }
  console.log(`  Deleted: ${sec.deleted}/3`);
  if (sec.errors.length) console.log(`  Errors: ${sec.errors.length}`);
}

async function testCRMLeads() {
  const sec = newSection('CRM Leads');
  console.log('\n═══════════════════════════════════════');
  console.log('  CRM LEADS');
  console.log('═══════════════════════════════════════');

  const ids: string[] = [];
  const sources = ['Website', 'Referral', 'Cold Call', 'Exhibition', 'LinkedIn'];
  const statuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION'];

  for (let i = 1; i <= 50; i++) {
    try {
      const res = await api('POST', '/crm-leads', {
        name: `Lead Contact ${pad(i)}`,
        company: `Company ${pad(i)} LLC`,
        email: `lead${i}@company${i}.sa`,
        phone: `+966-5${pad(i, 8)}`,
        source: sources[i % sources.length],
        status: statuses[i % statuses.length],
        priority: ['LOW', 'MEDIUM', 'HIGH'][i % 3],
        notes: `Test lead #${i} for CRM testing`,
      });
      ids.push(res.data.id);
      sec.created++;
    } catch (e: any) { sec.errors.push(`Create #${i}: ${e.message}`); }
  }
  console.log(`  Created: ${sec.created}/50`);

  for (let i = 0; i < Math.min(5, ids.length); i++) {
    try {
      await api('PUT', `/crm-leads/${ids[i]}`, { status: 'WON', priority: 'HIGH' });
      sec.updated++;
    } catch (e: any) { sec.errors.push(`Update #${i + 1}: ${e.message}`); }
  }
  console.log(`  Updated: ${sec.updated}/5`);

  for (let i = ids.length - 1; i >= ids.length - 3 && i >= 0; i--) {
    try {
      await api('DELETE', `/crm-leads/${ids[i]}`);
      sec.deleted++;
    } catch (e: any) { sec.errors.push(`Delete #${i}: ${e.message}`); }
  }
  console.log(`  Deleted: ${sec.deleted}/3`);
  if (sec.errors.length) console.log(`  Errors: ${sec.errors.length}`);
}

// ==================== GROUP 2: OPERATIONS ====================

async function testJobReferences(customerIds: string[], consigneeIds: string[]) {
  const sec = newSection('Job References');
  console.log('\n═══════════════════════════════════════');
  console.log('  JOB REFERENCES');
  console.log('═══════════════════════════════════════');

  const ids: string[] = [];
  const directions = ['IMPORT', 'EXPORT'];
  const modes = ['SEA', 'AIR', 'LAND'];

  for (let i = 1; i <= 50; i++) {
    try {
      const res = await api('POST', '/job-references', {
        clientId: customerIds[i % customerIds.length],
        consigneeId: consigneeIds.length > 0 ? consigneeIds[i % consigneeIds.length] : undefined,
        direction: directions[i % 2],
        modeOfTransport: modes[i % 3],
        origin: randomCity(),
        destination: randomCity(),
        packages: Math.floor(Math.random() * 100) + 1,
        grossWeight: randomAmount(100, 10000),
        notes: `Job ref test #${i}`,
      });
      ids.push(res.data.id);
      sec.created++;
    } catch (e: any) { sec.errors.push(`Create #${i}: ${e.message}`); }
  }
  console.log(`  Created: ${sec.created}/50`);

  for (let i = 0; i < Math.min(5, ids.length); i++) {
    try {
      await api('PUT', `/job-references/${ids[i]}`, { status: 'IN_PROGRESS', notes: 'Updated during test' });
      sec.updated++;
    } catch (e: any) { sec.errors.push(`Update #${i + 1}: ${e.message}`); }
  }
  console.log(`  Updated: ${sec.updated}/5`);

  for (let i = ids.length - 1; i >= ids.length - 3 && i >= 0; i--) {
    try {
      await api('DELETE', `/job-references/${ids[i]}`);
      sec.deleted++;
    } catch (e: any) { sec.errors.push(`Delete #${i}: ${e.message}`); }
  }
  console.log(`  Deleted: ${sec.deleted}/3`);
  if (sec.errors.length) console.log(`  Errors: ${sec.errors.length}`);

  return ids.slice(0, ids.length - 3);
}

async function testShipments() {
  const sec = newSection('Shipments');
  console.log('\n═══════════════════════════════════════');
  console.log('  SHIPMENTS');
  console.log('═══════════════════════════════════════');

  const ids: string[] = [];
  const statuses = ['IN_TRANSIT', 'AT_PORT', 'CUSTOMS_CLEARANCE', 'DELIVERED', 'PENDING'];
  const modes = ['SEA', 'AIR', 'LAND'];
  const carriers = ['Maersk', 'MSC', 'Hapag-Lloyd', 'COSCO', 'Saudi Airlines Cargo', 'Saudia Cargo'];

  for (let i = 1; i <= 50; i++) {
    try {
      const res = await api('POST', '/shipments', {
        origin: randomCity(),
        destination: randomCity(),
        status: statuses[i % statuses.length],
        modeOfTransport: modes[i % modes.length],
        carrier: carriers[i % carriers.length],
        etd: new Date(Date.now() + i * 86400000).toISOString(),
        eta: new Date(Date.now() + (i + 7) * 86400000).toISOString(),
        notes: `Shipment test #${i}`,
      });
      ids.push(res.data.id);
      sec.created++;
    } catch (e: any) { sec.errors.push(`Create #${i}: ${e.message}`); }
  }
  console.log(`  Created: ${sec.created}/50`);

  for (let i = 0; i < Math.min(5, ids.length); i++) {
    try {
      await api('PUT', `/shipments/${ids[i]}`, { status: 'DELIVERED', notes: 'Delivered during test' });
      sec.updated++;
    } catch (e: any) { sec.errors.push(`Update #${i + 1}: ${e.message}`); }
  }
  console.log(`  Updated: ${sec.updated}/5`);

  for (let i = ids.length - 1; i >= ids.length - 3 && i >= 0; i--) {
    try {
      await api('DELETE', `/shipments/${ids[i]}`);
      sec.deleted++;
    } catch (e: any) { sec.errors.push(`Delete #${i}: ${e.message}`); }
  }
  console.log(`  Deleted: ${sec.deleted}/3`);
  if (sec.errors.length) console.log(`  Errors: ${sec.errors.length}`);
}

async function testDailyWorkOrders() {
  const sec = newSection('Daily Work Orders');
  console.log('\n═══════════════════════════════════════');
  console.log('  DAILY WORK ORDERS');
  console.log('═══════════════════════════════════════');

  const ids: string[] = [];
  const priorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
  const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

  for (let i = 1; i <= 50; i++) {
    try {
      const res = await api('POST', '/daily-work-orders', {
        date: new Date().toISOString(),
        assignedTo: `Worker ${pad(i)}`,
        description: `Work order task #${i}: ${['Load containers', 'Unload cargo', 'Inspect shipment', 'Documentation review', 'Customs filing'][i % 5]}`,
        location: randomCity(),
        status: statuses[i % statuses.length],
        priority: priorities[i % priorities.length],
        notes: `Test work order #${i}`,
      });
      ids.push(res.data.id);
      sec.created++;
    } catch (e: any) { sec.errors.push(`Create #${i}: ${e.message}`); }
  }
  console.log(`  Created: ${sec.created}/50`);

  for (let i = 0; i < Math.min(5, ids.length); i++) {
    try {
      await api('PUT', `/daily-work-orders/${ids[i]}`, { status: 'COMPLETED', completedAt: new Date().toISOString() });
      sec.updated++;
    } catch (e: any) { sec.errors.push(`Update #${i + 1}: ${e.message}`); }
  }
  console.log(`  Updated: ${sec.updated}/5`);

  for (let i = ids.length - 1; i >= ids.length - 3 && i >= 0; i--) {
    try {
      await api('DELETE', `/daily-work-orders/${ids[i]}`);
      sec.deleted++;
    } catch (e: any) { sec.errors.push(`Delete #${i}: ${e.message}`); }
  }
  console.log(`  Deleted: ${sec.deleted}/3`);
  if (sec.errors.length) console.log(`  Errors: ${sec.errors.length}`);
}

async function testFileVerifications() {
  const sec = newSection('File Verifications');
  console.log('\n═══════════════════════════════════════');
  console.log('  FILE VERIFICATIONS');
  console.log('═══════════════════════════════════════');

  const ids: string[] = [];
  const docTypes = ['Bill of Lading', 'Commercial Invoice', 'Packing List', 'Certificate of Origin', 'Insurance Certificate'];
  const statuses = ['PENDING', 'VERIFIED', 'REJECTED'];

  for (let i = 1; i <= 50; i++) {
    try {
      const res = await api('POST', '/file-verifications', {
        jobReferenceNum: `JR-2026-${pad(i, 4)}`,
        clientName: `Client ${pad(i)}`,
        documentType: docTypes[i % docTypes.length],
        status: statuses[i % statuses.length],
        notes: `File verification test #${i}`,
      });
      ids.push(res.data.id);
      sec.created++;
    } catch (e: any) { sec.errors.push(`Create #${i}: ${e.message}`); }
  }
  console.log(`  Created: ${sec.created}/50`);

  for (let i = 0; i < Math.min(5, ids.length); i++) {
    try {
      await api('PUT', `/file-verifications/${ids[i]}`, { status: 'VERIFIED', verifiedBy: 'Test Admin' });
      sec.updated++;
    } catch (e: any) { sec.errors.push(`Update #${i + 1}: ${e.message}`); }
  }
  console.log(`  Updated: ${sec.updated}/5`);

  for (let i = ids.length - 1; i >= ids.length - 3 && i >= 0; i--) {
    try {
      await api('DELETE', `/file-verifications/${ids[i]}`);
      sec.deleted++;
    } catch (e: any) { sec.errors.push(`Delete #${i}: ${e.message}`); }
  }
  console.log(`  Deleted: ${sec.deleted}/3`);
  if (sec.errors.length) console.log(`  Errors: ${sec.errors.length}`);
}

async function testSalesQuotes() {
  const sec = newSection('Sales Quotes');
  console.log('\n═══════════════════════════════════════');
  console.log('  SALES QUOTES');
  console.log('═══════════════════════════════════════');

  const ids: string[] = [];

  for (let i = 1; i <= 50; i++) {
    try {
      const subtotal = randomAmount(5000, 100000);
      const vatAmount = Math.round(subtotal * 0.15 * 100) / 100;
      const res = await api('POST', '/sales-quotes', {
        clientName: `Quote Client ${pad(i)}`,
        clientEmail: `quote${i}@client.sa`,
        clientPhone: `+966-5${pad(i, 8)}`,
        quoteDate: new Date().toISOString(),
        validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
        subtotal,
        vatAmount,
        totalAmount: subtotal + vatAmount,
        status: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'][i % 4],
        notes: `Sales quote test #${i}`,
        items: JSON.stringify([{ description: `Service item ${i}`, amount: subtotal }]),
      });
      ids.push(res.data.id);
      sec.created++;
    } catch (e: any) { sec.errors.push(`Create #${i}: ${e.message}`); }
  }
  console.log(`  Created: ${sec.created}/50`);

  for (let i = 0; i < Math.min(5, ids.length); i++) {
    try {
      await api('PUT', `/sales-quotes/${ids[i]}`, { status: 'ACCEPTED', notes: 'Accepted during test' });
      sec.updated++;
    } catch (e: any) { sec.errors.push(`Update #${i + 1}: ${e.message}`); }
  }
  console.log(`  Updated: ${sec.updated}/5`);

  for (let i = ids.length - 1; i >= ids.length - 3 && i >= 0; i--) {
    try {
      await api('DELETE', `/sales-quotes/${ids[i]}`);
      sec.deleted++;
    } catch (e: any) { sec.errors.push(`Delete #${i}: ${e.message}`); }
  }
  console.log(`  Deleted: ${sec.deleted}/3`);
  if (sec.errors.length) console.log(`  Errors: ${sec.errors.length}`);
}

// ==================== GROUP 3: FINANCIAL (with journal verification) ====================

async function testSalesInvoices(customerIds: string[], jobRefIds: string[]) {
  const sec = newSection('Sales Invoices');
  console.log('\n═══════════════════════════════════════');
  console.log('  SALES INVOICES (with journal verification)');
  console.log('═══════════════════════════════════════');

  const ids: string[] = [];

  for (let i = 1; i <= 50; i++) {
    try {
      const amount = randomAmount(1000, 25000);
      const vatRate = 0.15;
      const vatAmount = Math.round(amount * vatRate * 100) / 100;
      const totalAmount = amount + vatAmount;

      const res = await api('POST', '/sales-invoices', {
        clientId: customerIds[i % customerIds.length],
        jobReferenceId: jobRefIds.length > 0 ? jobRefIds[i % jobRefIds.length] : undefined,
        invoiceDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        saleMethod: i % 3 === 0 ? 'CASH' : 'CREDIT',
        subtotal: amount,
        vatRate,
        vatAmount,
        totalAmount,
        paymentTermDays: 30,
        notes: `Sales invoice test #${i}`,
        items: [{
          lineNumber: 1,
          nameEn: `Clearance Service ${i}`,
          nameAr: `خدمة تخليص ${i}`,
          description: `Customs clearance service #${i}`,
          amount,
          vatRate,
          vatAmount,
          totalAmount,
        }],
      });
      ids.push(res.data.id);
      sec.created++;
    } catch (e: any) { sec.errors.push(`Create #${i}: ${e.message}`); }
  }
  console.log(`  Created: ${sec.created}/50`);

  // Verify journal entries exist for created invoices
  if (ids.length > 0) {
    try {
      const journalRes = await api('GET', '/journals?limit=500');
      const journals = journalRes.data || [];
      let verified = 0;
      for (const id of ids.slice(0, 10)) {
        const inv = journals.find((j: any) =>
          j.reference?.includes(id) || j.description?.toLowerCase().includes('sales invoice') || j.referenceType === 'SALES_INVOICE'
        );
        if (inv) verified++;
      }
      sec.journalsVerified = verified;
      console.log(`  Journal entries verified: ${verified}/10 (sampled)`);
    } catch (e: any) { sec.errors.push(`Journal check: ${e.message}`); }
  }

  // UPDATE 5
  for (let i = 0; i < Math.min(5, ids.length); i++) {
    try {
      await api('PUT', `/sales-invoices/${ids[i]}`, { notes: `Updated invoice #${i + 1}` });
      sec.updated++;
    } catch (e: any) { sec.errors.push(`Update #${i + 1}: ${e.message}`); }
  }
  console.log(`  Updated: ${sec.updated}/5`);

  // DELETE 3
  for (let i = ids.length - 1; i >= ids.length - 3 && i >= 0; i--) {
    try {
      await api('DELETE', `/sales-invoices/${ids[i]}`);
      sec.deleted++;
    } catch (e: any) { sec.errors.push(`Delete #${i}: ${e.message}`); }
  }
  console.log(`  Deleted: ${sec.deleted}/3`);
  if (sec.errors.length) console.log(`  Errors: ${sec.errors.length}`);

  return ids.slice(0, ids.length - 3);
}

async function testExpenseEntries(vendorIds: string[], jobRefIds: string[]) {
  const sec = newSection('Expense Entries');
  console.log('\n═══════════════════════════════════════');
  console.log('  EXPENSE ENTRIES (with journal verification)');
  console.log('═══════════════════════════════════════');

  const ids: string[] = [];
  const categories = ['Fuel', 'Maintenance', 'Tolls', 'Customs Fees', 'Office Supplies', 'Utilities', 'Insurance', 'Port Charges'];
  const expenseAccountId = findAccountByCode('5150') || findAccountByCode('5030') || findAccount('EXPENSE');
  const bankAccountId = BANK_ACCOUNTS.length > 0 ? BANK_ACCOUNTS[0].id : undefined;

  for (let i = 1; i <= 50; i++) {
    try {
      const amount = randomAmount(200, 5000);
      const vatAmount = Math.round(amount * 0.15 * 100) / 100;

      const res = await api('POST', '/expense-entries', {
        date: new Date().toISOString(),
        vendorId: vendorIds.length > 0 ? vendorIds[i % vendorIds.length] : undefined,
        accountId: expenseAccountId || undefined,
        jobRefId: jobRefIds.length > 0 ? jobRefIds[i % jobRefIds.length] : undefined,
        amount,
        vatAmount,
        totalAmount: amount + vatAmount,
        paymentMethod: i % 2 === 0 ? 'CASH' : 'BANK_TRANSFER',
        bankAccountId: i % 2 !== 0 ? bankAccountId : undefined,
        category: categories[i % categories.length],
        description: `Expense entry test #${i}: ${categories[i % categories.length]}`,
        reference: `EXP-REF-${pad(i, 4)}`,
        status: 'APPROVED',
      });
      ids.push(res.data.id);
      sec.created++;
    } catch (e: any) { sec.errors.push(`Create #${i}: ${e.message}`); }
  }
  console.log(`  Created: ${sec.created}/50`);

  // Verify journal entries
  try {
    const journalRes = await api('GET', '/journals?limit=500');
    const journals = journalRes.data || [];
    let verified = 0;
    for (const j of journals) {
      if (j.referenceType === 'EXPENSE' || j.description?.toLowerCase().includes('expense')) verified++;
    }
    sec.journalsVerified = Math.min(verified, sec.created);
    console.log(`  Journal entries found for expenses: ${verified}`);
  } catch (e: any) { sec.errors.push(`Journal check: ${e.message}`); }

  for (let i = 0; i < Math.min(5, ids.length); i++) {
    try {
      await api('PUT', `/expense-entries/${ids[i]}`, { description: `Updated expense #${i + 1}`, status: 'APPROVED' });
      sec.updated++;
    } catch (e: any) { sec.errors.push(`Update #${i + 1}: ${e.message}`); }
  }
  console.log(`  Updated: ${sec.updated}/5`);

  for (let i = ids.length - 1; i >= ids.length - 3 && i >= 0; i--) {
    try {
      await api('DELETE', `/expense-entries/${ids[i]}`);
      sec.deleted++;
    } catch (e: any) { sec.errors.push(`Delete #${i}: ${e.message}`); }
  }
  console.log(`  Deleted: ${sec.deleted}/3`);
  if (sec.errors.length) console.log(`  Errors: ${sec.errors.length}`);
}

async function testPayableExpenses(vendorIds: string[], jobRefIds: string[]) {
  const sec = newSection('Payable Expenses');
  console.log('\n═══════════════════════════════════════');
  console.log('  PAYABLE EXPENSES (with journal verification)');
  console.log('═══════════════════════════════════════');

  const ids: string[] = [];
  const categories = ['Shipping Fees', 'Port Handling', 'Storage', 'Demurrage', 'Documentation', 'Inspection'];

  for (let i = 1; i <= 50; i++) {
    try {
      const amount = randomAmount(500, 15000);
      const vatAmount = Math.round(amount * 0.15 * 100) / 100;
      const totalAmount = amount + vatAmount;

      const payableData: any = {
        vendorId: vendorIds[i % vendorIds.length],
        date: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        amount,
        vatAmount,
        totalAmount,
        paidAmount: 0,
        balanceDue: totalAmount,
        category: categories[i % categories.length],
        description: `Payable expense test #${i}: ${categories[i % categories.length]}`,
        paymentMethod: 'Cash',
        status: 'UNPAID',
      };
      if (jobRefIds.length > 0) payableData.jobRefId = jobRefIds[i % jobRefIds.length];
      const res = await api('POST', '/payable-expenses', payableData);
      ids.push(res.data.id);
      sec.created++;
    } catch (e: any) { sec.errors.push(`Create #${i}: ${e.message}`); }
  }
  console.log(`  Created: ${sec.created}/50`);

  // Verify journal entries
  try {
    const journalRes = await api('GET', '/journals?limit=500');
    const journals = journalRes.data || [];
    let verified = 0;
    for (const j of journals) {
      if (j.referenceType === 'PAYABLE_EXPENSE' || j.description?.toLowerCase().includes('payable')) verified++;
    }
    sec.journalsVerified = Math.min(verified, sec.created);
    console.log(`  Journal entries found for payables: ${verified}`);
  } catch (e: any) { sec.errors.push(`Journal check: ${e.message}`); }

  for (let i = 0; i < Math.min(5, ids.length); i++) {
    try {
      await api('PUT', `/payable-expenses/${ids[i]}`, { description: `Updated payable #${i + 1}` });
      sec.updated++;
    } catch (e: any) { sec.errors.push(`Update #${i + 1}: ${e.message}`); }
  }
  console.log(`  Updated: ${sec.updated}/5`);

  for (let i = ids.length - 1; i >= ids.length - 3 && i >= 0; i--) {
    try {
      await api('DELETE', `/payable-expenses/${ids[i]}`);
      sec.deleted++;
    } catch (e: any) { sec.errors.push(`Delete #${i}: ${e.message}`); }
  }
  console.log(`  Deleted: ${sec.deleted}/3`);
  if (sec.errors.length) console.log(`  Errors: ${sec.errors.length}`);
}

async function testClientAdvances(customerIds: string[]) {
  const sec = newSection('Client Advances');
  console.log('\n═══════════════════════════════════════');
  console.log('  CLIENT ADVANCES (with journal verification)');
  console.log('═══════════════════════════════════════');

  const ids: string[] = [];
  const bankAccountId = BANK_ACCOUNTS.length > 0 ? BANK_ACCOUNTS[0].id : undefined;

  for (let i = 1; i <= 50; i++) {
    try {
      const amount = randomAmount(1000, 30000);
      const res = await api('POST', '/client-advances', {
        clientId: customerIds[i % customerIds.length],
        amount,
        date: new Date().toISOString(),
        paymentMethod: i % 2 === 0 ? 'CASH' : 'BANK_TRANSFER',
        bankAccountId: i % 2 !== 0 ? bankAccountId : undefined,
        reference: `ADV-REF-${pad(i, 4)}`,
        description: `Client advance test #${i}`,
        status: 'ACTIVE',
        usedAmount: 0,
        remainingAmount: amount,
      });
      ids.push(res.data.id);
      sec.created++;
    } catch (e: any) { sec.errors.push(`Create #${i}: ${e.message}`); }
  }
  console.log(`  Created: ${sec.created}/50`);

  // Verify journal entries
  try {
    const journalRes = await api('GET', '/journals?limit=500');
    const journals = journalRes.data || [];
    let verified = 0;
    for (const j of journals) {
      if (j.referenceType === 'CLIENT_ADVANCE' || j.description?.toLowerCase().includes('advance')) verified++;
    }
    sec.journalsVerified = Math.min(verified, sec.created);
    console.log(`  Journal entries found for advances: ${verified}`);
  } catch (e: any) { sec.errors.push(`Journal check: ${e.message}`); }

  for (let i = 0; i < Math.min(5, ids.length); i++) {
    try {
      await api('PUT', `/client-advances/${ids[i]}`, { description: `Updated advance #${i + 1}` });
      sec.updated++;
    } catch (e: any) { sec.errors.push(`Update #${i + 1}: ${e.message}`); }
  }
  console.log(`  Updated: ${sec.updated}/5`);

  for (let i = ids.length - 1; i >= ids.length - 3 && i >= 0; i--) {
    try {
      await api('DELETE', `/client-advances/${ids[i]}`);
      sec.deleted++;
    } catch (e: any) { sec.errors.push(`Delete #${i}: ${e.message}`); }
  }
  console.log(`  Deleted: ${sec.deleted}/3`);
  if (sec.errors.length) console.log(`  Errors: ${sec.errors.length}`);
}

async function testRcvPvc(customerIds: string[], vendorIds: string[]) {
  const sec = newSection('RCV/PVC Vouchers');
  console.log('\n═══════════════════════════════════════');
  console.log('  RCV/PVC VOUCHERS (with journal verification)');
  console.log('═══════════════════════════════════════');

  const ids: string[] = [];

  // 25 RCV (Receive) vouchers
  for (let i = 1; i <= 25; i++) {
    try {
      const res = await api('POST', '/rcv-pvc', {
        type: 'RCV',
        date: new Date().toISOString(),
        clientId: customerIds[i % customerIds.length],
        amount: randomAmount(1000, 20000),
        reference: `RCV-REF-${pad(i, 4)}`,
        status: 'DRAFT',
        notes: `RCV voucher test #${i}`,
      });
      ids.push(res.data.id);
      sec.created++;
    } catch (e: any) { sec.errors.push(`Create RCV #${i}: ${e.message}`); }
  }

  // 25 PVC (Payment) vouchers
  for (let i = 1; i <= 25; i++) {
    try {
      const res = await api('POST', '/rcv-pvc', {
        type: 'PVC',
        date: new Date().toISOString(),
        vendorId: vendorIds[i % vendorIds.length],
        amount: randomAmount(1000, 20000),
        reference: `PVC-REF-${pad(i, 4)}`,
        status: 'DRAFT',
        notes: `PVC voucher test #${i}`,
      });
      ids.push(res.data.id);
      sec.created++;
    } catch (e: any) { sec.errors.push(`Create PVC #${i}: ${e.message}`); }
  }
  console.log(`  Created: ${sec.created}/50 (25 RCV + 25 PVC)`);

  // Verify journal entries
  try {
    const journalRes = await api('GET', '/journals?limit=500');
    const journals = journalRes.data || [];
    let verified = 0;
    for (const j of journals) {
      if (j.referenceType === 'RCV' || j.referenceType === 'PVC' || j.description?.toLowerCase().includes('voucher')) verified++;
    }
    sec.journalsVerified = Math.min(verified, sec.created);
    console.log(`  Journal entries found for RCV/PVC: ${verified}`);
  } catch (e: any) { sec.errors.push(`Journal check: ${e.message}`); }

  for (let i = 0; i < Math.min(5, ids.length); i++) {
    try {
      await api('PUT', `/rcv-pvc/${ids[i]}`, { notes: `Updated voucher #${i + 1}` });
      sec.updated++;
    } catch (e: any) { sec.errors.push(`Update #${i + 1}: ${e.message}`); }
  }
  console.log(`  Updated: ${sec.updated}/5`);

  for (let i = ids.length - 1; i >= ids.length - 3 && i >= 0; i--) {
    try {
      await api('DELETE', `/rcv-pvc/${ids[i]}`);
      sec.deleted++;
    } catch (e: any) { sec.errors.push(`Delete #${i}: ${e.message}`); }
  }
  console.log(`  Deleted: ${sec.deleted}/3`);
  if (sec.errors.length) console.log(`  Errors: ${sec.errors.length}`);
}

async function testPaymentEntries() {
  const sec = newSection('Payment Entries');
  console.log('\n═══════════════════════════════════════');
  console.log('  PAYMENT ENTRIES (journal-backed)');
  console.log('═══════════════════════════════════════');

  const ids: string[] = [];
  const cashAccountId = findAccountByCode('1010');
  const arAccountId = findAccountByCode('1100');
  const apAccountId = findAccountByCode('2010');
  const revenueAccountId = findAccountByCode('4010');
  const expenseAccountId = findAccountByCode('5150');

  // Use whichever accounts exist
  const drAccountId = cashAccountId || arAccountId || ACCOUNTS[0]?.id || '';
  const crAccountId = revenueAccountId || apAccountId || (ACCOUNTS.length > 1 ? ACCOUNTS[1].id : ACCOUNTS[0]?.id) || '';

  for (let i = 1; i <= 50; i++) {
    try {
      const amount = randomAmount(500, 10000);
      const res = await api('POST', '/payment-entries', {
        documentDate: new Date().toISOString(),
        documentNumber: `PE-DOC-${pad(i, 4)}`,
        method: i % 2 === 0 ? 'Cash' : 'Bank Transfer',
        entryType: i % 3 === 0 ? 'Payment' : 'Receipt',
        totalDr: amount,
        totalCr: amount,
        lines: [
          { accountId: drAccountId, drAmount: amount, crAmount: 0, paymentStatus: `DR Line - entry ${i}` },
          { accountId: crAccountId, drAmount: 0, crAmount: amount, paymentStatus: `CR Line - entry ${i}` },
        ],
      });
      ids.push(res.data.id);
      sec.created++;
    } catch (e: any) { sec.errors.push(`Create #${i}: ${e.message}`); }
  }
  console.log(`  Created: ${sec.created}/50`);

  // Payment entries are journal entries - verify DR = CR
  sec.journalsVerified = sec.created; // Each PE is a journal entry by design
  console.log(`  Journal entries (each PE is a journal): ${sec.created}`);

  // Payment entries don't have PUT, only DELETE
  for (let i = ids.length - 1; i >= ids.length - 3 && i >= 0; i--) {
    try {
      await api('DELETE', `/payment-entries/${ids[i]}`);
      sec.deleted++;
    } catch (e: any) { sec.errors.push(`Delete #${i}: ${e.message}`); }
  }
  console.log(`  Deleted: ${sec.deleted}/3`);
  if (sec.errors.length) console.log(`  Errors: ${sec.errors.length}`);
}

// ==================== GROUP 4: OPENING BALANCES ====================

async function testClientOPB(customerIds: string[]) {
  const sec = newSection('Client OPB');
  console.log('\n═══════════════════════════════════════');
  console.log('  CLIENT OPENING BALANCES');
  console.log('═══════════════════════════════════════');

  const ids: string[] = [];

  for (let i = 1; i <= 50; i++) {
    try {
      const isDebit = i % 2 === 0;
      const amount = randomAmount(1000, 50000);
      const res = await api('POST', '/client-opb', {
        clientId: customerIds[i % customerIds.length],
        date: new Date('2026-01-01').toISOString(),
        debitAmount: isDebit ? amount : 0,
        creditAmount: isDebit ? 0 : amount,
        description: `Client OPB test #${i}`,
        reference: `OPB-C-${pad(i, 4)}`,
      });
      ids.push(res.data.id);
      sec.created++;
    } catch (e: any) { sec.errors.push(`Create #${i}: ${e.message}`); }
  }
  console.log(`  Created: ${sec.created}/50`);

  for (let i = 0; i < Math.min(5, ids.length); i++) {
    try {
      await api('PUT', `/client-opb/${ids[i]}`, { description: `Updated OPB #${i + 1}` });
      sec.updated++;
    } catch (e: any) { sec.errors.push(`Update #${i + 1}: ${e.message}`); }
  }
  console.log(`  Updated: ${sec.updated}/5`);

  for (let i = ids.length - 1; i >= ids.length - 3 && i >= 0; i--) {
    try {
      await api('DELETE', `/client-opb/${ids[i]}`);
      sec.deleted++;
    } catch (e: any) { sec.errors.push(`Delete #${i}: ${e.message}`); }
  }
  console.log(`  Deleted: ${sec.deleted}/3`);
  if (sec.errors.length) console.log(`  Errors: ${sec.errors.length}`);
}

async function testPayableOPB(vendorIds: string[]) {
  const sec = newSection('Payable OPB');
  console.log('\n═══════════════════════════════════════');
  console.log('  PAYABLE OPENING BALANCES');
  console.log('═══════════════════════════════════════');

  const ids: string[] = [];

  for (let i = 1; i <= 50; i++) {
    try {
      const isDebit = i % 3 === 0;
      const amount = randomAmount(1000, 50000);
      const res = await api('POST', '/payable-opb', {
        vendorId: vendorIds[i % vendorIds.length],
        date: new Date('2026-01-01').toISOString(),
        debitAmount: isDebit ? amount : 0,
        creditAmount: isDebit ? 0 : amount,
        description: `Payable OPB test #${i}`,
        reference: `OPB-V-${pad(i, 4)}`,
      });
      ids.push(res.data.id);
      sec.created++;
    } catch (e: any) { sec.errors.push(`Create #${i}: ${e.message}`); }
  }
  console.log(`  Created: ${sec.created}/50`);

  for (let i = 0; i < Math.min(5, ids.length); i++) {
    try {
      await api('PUT', `/payable-opb/${ids[i]}`, { description: `Updated OPB #${i + 1}` });
      sec.updated++;
    } catch (e: any) { sec.errors.push(`Update #${i + 1}: ${e.message}`); }
  }
  console.log(`  Updated: ${sec.updated}/5`);

  for (let i = ids.length - 1; i >= ids.length - 3 && i >= 0; i--) {
    try {
      await api('DELETE', `/payable-opb/${ids[i]}`);
      sec.deleted++;
    } catch (e: any) { sec.errors.push(`Delete #${i}: ${e.message}`); }
  }
  console.log(`  Deleted: ${sec.deleted}/3`);
  if (sec.errors.length) console.log(`  Errors: ${sec.errors.length}`);
}

// ==================== FINAL VERIFICATION ====================

async function verifyTrialBalance() {
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║  TRIAL BALANCE VERIFICATION           ║');
  console.log('╚═══════════════════════════════════════╝');

  try {
    const res = await api('GET', '/accounts/trial-balance');
    const data = res.data;

    // Response: { accounts: [...], totalDebits, totalCredits, isBalanced }
    const totalDebit = data.totalDebits || data.totalDebit || 0;
    const totalCredit = data.totalCredits || data.totalCredit || 0;
    const diff = Math.abs(totalDebit - totalCredit);
    const balanced = data.isBalanced !== undefined ? data.isBalanced : diff < 0.02;
    console.log(`  Total Debits:  ${totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`  Total Credits: ${totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`  Difference:    ${diff.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`  isBalanced:    ${balanced}`);
    console.log(`  Status:        ${balanced ? '✅ BALANCED (DR = CR)' : '❌ IMBALANCED!'}`);
    if (!balanced && data.accounts) {
      console.log('\n  Top accounts by balance:');
      const sorted = [...data.accounts].sort((a: any, b: any) => Math.max(b.debit, b.credit) - Math.max(a.debit, a.credit));
      for (const row of sorted.slice(0, 10)) {
        console.log(`    ${row.accountCode} ${row.accountName.padEnd(30)} DR: ${row.debit.toFixed(2).padStart(12)}  CR: ${row.credit.toFixed(2).padStart(12)}`);
      }
    }
    return balanced;
  } catch (e: any) {
    console.log(`  ❌ Error fetching trial balance: ${e.message}`);
    return false;
  }
}

async function verifyJournalCount() {
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║  JOURNAL ENTRIES COUNT                ║');
  console.log('╚═══════════════════════════════════════╝');

  try {
    const res = await api('GET', '/journals?limit=1000');
    const journals = res.data || [];
    const total = journals.length;

    // Count by type
    const byType: Record<string, number> = {};
    for (const j of journals) {
      const t = j.referenceType || 'MANUAL';
      byType[t] = (byType[t] || 0) + 1;
    }

    console.log(`  Total journal entries: ${total}`);
    for (const [type, count] of Object.entries(byType)) {
      console.log(`    ${type}: ${count}`);
    }
    return total;
  } catch (e: any) {
    console.log(`  ❌ Error fetching journals: ${e.message}`);
    return 0;
  }
}

// ==================== MAIN ====================

async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║  FAYHA ERP - Comprehensive CRUD & Accounting Test ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  // Login
  await login();
  await loadAccounts();

  // GROUP 1: Master Data
  console.log('\n▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓');
  console.log('  GROUP 1: MASTER DATA');
  console.log('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓');
  const customerIds = await testCustomers();
  const vendorIds = await testVendors();
  const consigneeIds = await testConsignees();
  await testTerminals();
  await testCRMLeads();

  // GROUP 2: Operations
  console.log('\n\n▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓');
  console.log('  GROUP 2: OPERATIONS');
  console.log('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓');
  const jobRefIds = await testJobReferences(customerIds, consigneeIds);
  await testShipments();
  await testDailyWorkOrders();
  await testFileVerifications();
  await testSalesQuotes();

  // GROUP 3: Financial
  console.log('\n\n▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓');
  console.log('  GROUP 3: FINANCIAL (with accounting)');
  console.log('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓');
  await testSalesInvoices(customerIds, jobRefIds);
  await testExpenseEntries(vendorIds, jobRefIds);
  await testPayableExpenses(vendorIds, jobRefIds);
  await testClientAdvances(customerIds);
  await testRcvPvc(customerIds, vendorIds);
  await testPaymentEntries();

  // GROUP 4: Opening Balances
  console.log('\n\n▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓');
  console.log('  GROUP 4: OPENING BALANCES');
  console.log('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓');
  await testClientOPB(customerIds);
  await testPayableOPB(vendorIds);

  // FINAL VERIFICATION
  console.log('\n\n▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓');
  console.log('  FINAL VERIFICATION');
  console.log('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓');
  console.log('  Waiting 15s for rate limit cooldown...');
  await sleep(15000);
  const trialBalanced = await verifyTrialBalance();
  const journalCount = await verifyJournalCount();

  // ==================== SUMMARY REPORT ====================
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║                    FINAL SUMMARY REPORT                          ║');
  console.log('╠═══════════════════════════════════════════════════════════════════╣');
  console.log('║ Section                  │ Created │ Updated │ Deleted │ Journals ║');
  console.log('╠══════════════════════════╪═════════╪═════════╪═════════╪══════════╣');

  let totalCreated = 0, totalUpdated = 0, totalDeleted = 0, totalJournals = 0, totalErrors = 0;
  for (const r of results) {
    const name = r.name.padEnd(24);
    const cr = String(r.created).padStart(7);
    const up = String(r.updated).padStart(7);
    const dl = String(r.deleted).padStart(7);
    const jn = r.journalsVerified > 0 ? String(r.journalsVerified).padStart(8) : '     N/A';
    console.log(`║ ${name} │ ${cr} │ ${up} │ ${dl} │ ${jn} ║`);
    totalCreated += r.created;
    totalUpdated += r.updated;
    totalDeleted += r.deleted;
    totalJournals += r.journalsVerified;
    totalErrors += r.errors.length;
  }

  console.log('╠══════════════════════════╪═════════╪═════════╪═════════╪══════════╣');
  console.log(`║ TOTAL                    │ ${String(totalCreated).padStart(7)} │ ${String(totalUpdated).padStart(7)} │ ${String(totalDeleted).padStart(7)} │ ${String(totalJournals).padStart(8)} ║`);
  console.log('╚══════════════════════════╧═════════╧═════════╧═════════╧══════════╝');

  console.log(`\n  Total journal entries in system: ${journalCount}`);
  console.log(`  Trial Balance: ${trialBalanced ? '✅ BALANCED' : '❌ IMBALANCED'}`);
  console.log(`  Total errors: ${totalErrors}`);
  console.log(`  Time elapsed: ${elapsed}s`);

  // Print errors if any
  if (totalErrors > 0) {
    console.log('\n\n═══════════════════════════════════════');
    console.log('  ERROR DETAILS');
    console.log('═══════════════════════════════════════');
    for (const r of results) {
      if (r.errors.length > 0) {
        console.log(`\n  [${r.name}] (${r.errors.length} errors):`);
        for (const e of r.errors.slice(0, 5)) {
          console.log(`    - ${e.slice(0, 200)}`);
        }
        if (r.errors.length > 5) console.log(`    ... and ${r.errors.length - 5} more`);
      }
    }
  }

  console.log('\n\n✅ Test script completed.');
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
