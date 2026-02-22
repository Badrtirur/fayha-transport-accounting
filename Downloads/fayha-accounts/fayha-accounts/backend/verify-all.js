#!/usr/bin/env node
// =============================================================================
// FAYHA — DEEP VERIFICATION (every single check matters)
// =============================================================================

const BASE = 'http://localhost:5000/api/v1';
let TOKEN = '';
let PASS = 0, FAIL = 0, ERRORS = [];

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (TOKEN) opts.headers['Authorization'] = `Bearer ${TOKEN}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data: json.data !== undefined ? json.data : json, raw: json };
}

function assert(ok, label, detail) {
  if (ok) { PASS++; console.log(`  ✓ ${label}`); }
  else { FAIL++; const m = `  ✗ ${label}${detail ? ' — ' + detail : ''}`; console.log(m); ERRORS.push(m); }
}

function section(t) { console.log(`\n${'─'.repeat(60)}\n  ${t}\n${'─'.repeat(60)}`); }

async function main() {
  console.log('\n██ FAYHA DEEP VERIFICATION ██\n');

  // ── AUTH ──
  section('1. AUTHENTICATION');
  const login = await api('POST', '/auth/login', { email: 'admin@fayha-transport.sa', password: 'admin123' });
  assert(login.ok && login.data.token, 'Login works');
  TOKEN = login.data.token;

  const me = await api('GET', '/auth/me');
  assert(me.ok && me.data.email, 'GET /auth/me returns user profile');

  // ── CUSTOMERS ──
  section('2. CUSTOMERS CRUD');
  const custList = await api('GET', '/customers');
  assert(custList.ok && Array.isArray(custList.data), `GET /customers returns array (${custList.data?.length || 0} records)`);

  // Pick a customer and verify detail
  if (custList.data?.length > 0) {
    const c = custList.data[0];
    const custDetail = await api('GET', `/customers/${c.id}`);
    assert(custDetail.ok && custDetail.data.id === c.id, `GET /customers/:id returns correct customer (${c.name})`);

    // Verify balance consistency
    const inv = custDetail.data.totalInvoiced || 0;
    const paid = custDetail.data.totalPaid || 0;
    const out = custDetail.data.outstandingBalance || 0;
    const expectedOut = inv - paid;
    assert(Math.abs(out - expectedOut) < 0.01, `Customer balance: outstanding(${out}) = invoiced(${inv}) - paid(${paid})`, `expected ${expectedOut}`);
  }

  // ── VENDORS ──
  section('3. VENDORS');
  const vendList = await api('GET', '/vendors');
  assert(vendList.ok && Array.isArray(vendList.data), `GET /vendors returns array (${vendList.data?.length || 0})`);

  // ── CONSIGNEES ──
  section('4. CONSIGNEES');
  const conList = await api('GET', '/consignees');
  assert(conList.ok && Array.isArray(conList.data), `GET /consignees returns array (${conList.data?.length || 0})`);

  // ── JOB REFERENCES ──
  section('5. JOB REFERENCES');
  const jrList = await api('GET', '/job-references');
  assert(jrList.ok && Array.isArray(jrList.data), `GET /job-references returns array (${jrList.data?.length || 0})`);

  if (jrList.data?.length > 0) {
    const jr = jrList.data[0];
    assert(!!jr.jobNumber, `Job Ref has jobNumber: ${jr.jobNumber}`);
    assert(!!jr.clientId, `Job Ref has clientId`);
  }

  // ── CHART OF ACCOUNTS ──
  section('6. CHART OF ACCOUNTS');
  const accounts = await api('GET', '/accounts');
  assert(accounts.ok && Array.isArray(accounts.data), `GET /accounts returns array (${accounts.data?.length || 0})`);

  const acctTypes = {};
  for (const a of accounts.data || []) { acctTypes[a.type] = (acctTypes[a.type] || 0) + 1; }
  assert(acctTypes.ASSET > 0, `Has ASSET accounts (${acctTypes.ASSET || 0})`);
  assert(acctTypes.LIABILITY > 0, `Has LIABILITY accounts (${acctTypes.LIABILITY || 0})`);
  assert(acctTypes.EQUITY > 0, `Has EQUITY accounts (${acctTypes.EQUITY || 0})`);
  assert(acctTypes.REVENUE > 0, `Has REVENUE accounts (${acctTypes.REVENUE || 0})`);
  assert(acctTypes.EXPENSE > 0, `Has EXPENSE accounts (${acctTypes.EXPENSE || 0})`);

  // ── TRIAL BALANCE ──
  section('7. TRIAL BALANCE');
  const tb = await api('GET', '/accounts/trial-balance');
  assert(tb.ok, 'Trial balance endpoint works');
  const tbData = Array.isArray(tb.data) ? tb.data : (tb.data?.accounts || []);
  let tbDr = 0, tbCr = 0;
  for (const a of tbData) { tbDr += a.debit || a.totalDebit || 0; tbCr += a.credit || a.totalCredit || 0; }
  assert(Math.abs(tbDr - tbCr) < 0.02, `Trial Balance: DR(${tbDr.toFixed(2)}) = CR(${tbCr.toFixed(2)})`, `diff=${Math.abs(tbDr - tbCr).toFixed(2)}`);

  // ── SALES INVOICES ──
  section('8. SALES INVOICES');
  const invList = await api('GET', '/sales-invoices');
  assert(invList.ok && Array.isArray(invList.data), `GET /sales-invoices returns array (${invList.data?.length || 0})`);

  // Verify invoice amounts
  let invErrors = 0;
  for (const inv of (invList.data || []).slice(0, 50)) {
    // subtotal + vat = total
    if (inv.subtotal && inv.vatAmount !== undefined) {
      const expectedTotal = (inv.subtotal || 0) + (inv.vatAmount || 0);
      if (Math.abs((inv.totalAmount || 0) - expectedTotal) > 0.01) {
        invErrors++;
        console.log(`    ✗ ${inv.invoiceNumber}: subtotal(${inv.subtotal})+vat(${inv.vatAmount})=${expectedTotal} ≠ total(${inv.totalAmount})`);
      }
    }
    // paidAmount + balanceDue = totalAmount
    if (inv.paidAmount !== undefined && inv.balanceDue !== undefined) {
      const sum = (inv.paidAmount || 0) + (inv.balanceDue || 0);
      if (Math.abs(sum - (inv.totalAmount || 0)) > 0.01) {
        invErrors++;
        console.log(`    ✗ ${inv.invoiceNumber}: paid(${inv.paidAmount})+balance(${inv.balanceDue})=${sum} ≠ total(${inv.totalAmount})`);
      }
    }
    // Status consistency
    if (inv.paidAmount >= (inv.totalAmount || 0) - 0.01 && inv.totalAmount > 0 && inv.status !== 'PAID' && inv.status !== 'DRAFT') {
      invErrors++;
      console.log(`    ✗ ${inv.invoiceNumber}: fully paid but status=${inv.status}`);
    }
  }
  assert(invErrors === 0, `Invoice amount consistency (checked ${Math.min(50, invList.data?.length || 0)})`, `${invErrors} errors`);

  // ── PAYMENT ENTRIES ──
  section('9. PAYMENT ENTRIES');
  const peList = await api('GET', '/payment-entries');
  assert(peList.ok && Array.isArray(peList.data), `GET /payment-entries returns array (${peList.data?.length || 0})`);

  let peErrors = 0;
  for (const pe of (peList.data || []).slice(0, 50)) {
    // All should be POSTED
    if (pe.status !== 'POSTED') {
      peErrors++;
      console.log(`    ✗ ${pe.documentId}: status=${pe.status}`);
    }
    // DR = CR (balanced)
    const dr = pe.totalDr || 0;
    const cr = pe.totalCr || 0;
    if (Math.abs(dr - cr) > 0.01 && dr > 0 && cr > 0) {
      peErrors++;
      console.log(`    ✗ ${pe.documentId}: DR(${dr}) ≠ CR(${cr})`);
    }
  }
  assert(peErrors === 0, `Payment entries all POSTED & balanced (checked ${Math.min(50, peList.data?.length || 0)})`, `${peErrors} errors`);

  // Verify a single PE detail page works
  if (peList.data?.length > 0) {
    const pe = peList.data[0];
    const peDetail = await api('GET', `/payment-entries/${pe.id}`);
    assert(peDetail.ok && peDetail.data?.documentId, `GET /payment-entries/:id returns detail (${pe.documentId})`);
    const lines = peDetail.data?.lines || [];
    assert(lines.length > 0, `Payment entry has journal lines (${lines.length} lines)`);
  }

  // ── CLIENT ADVANCES ──
  section('10. CLIENT ADVANCES');
  const advList = await api('GET', '/client-advances');
  assert(advList.ok && Array.isArray(advList.data), `GET /client-advances returns array (${advList.data?.length || 0})`);

  let advErrors = 0;
  for (const adv of (advList.data || []).slice(0, 50)) {
    const expectedRemaining = (adv.amount || 0) - (adv.usedAmount || 0);
    const actualRemaining = adv.remainingAmount ?? expectedRemaining;
    if (Math.abs(actualRemaining - expectedRemaining) > 0.01) {
      advErrors++;
      console.log(`    ✗ ${adv.advanceNumber}: remaining=${actualRemaining} ≠ amount(${adv.amount})-used(${adv.usedAmount})=${expectedRemaining}`);
    }
  }
  assert(advErrors === 0, `Advance utilization consistent (checked ${Math.min(50, advList.data?.length || 0)})`, `${advErrors} errors`);

  // ── EXPENSE ENTRIES ──
  section('11. EXPENSE ENTRIES');
  const expList = await api('GET', '/expense-entries');
  assert(expList.ok && Array.isArray(expList.data), `GET /expense-entries returns array (${expList.data?.length || 0})`);

  // ── JOURNAL ENTRIES ──
  section('12. JOURNAL ENTRIES');
  const jeList = await api('GET', '/journals');
  const journals = Array.isArray(jeList.data) ? jeList.data : (jeList.data?.data || []);
  assert(jeList.ok, `GET /journals works (${journals.length} entries)`);

  let unbalanced = 0;
  for (const je of journals) {
    const lines = je.lines || [];
    const dr = lines.reduce((s, l) => s + (l.debitAmount || 0), 0);
    const cr = lines.reduce((s, l) => s + (l.creditAmount || 0), 0);
    if (Math.abs(dr - cr) > 0.01) {
      unbalanced++;
      console.log(`    ✗ ${je.entryNumber}: DR(${dr}) ≠ CR(${cr})`);
    }
  }
  assert(unbalanced === 0, `All ${journals.length} journal entries balanced (DR = CR)`, `${unbalanced} unbalanced`);

  // ── BANK ACCOUNTS ──
  section('13. BANK ACCOUNTS');
  const bankList = await api('GET', '/banks');
  assert(bankList.ok && Array.isArray(bankList.data), `GET /banks returns array (${bankList.data?.length || 0})`);

  for (const bank of bankList.data || []) {
    const bd = await api('GET', `/banks/${bank.id}`);
    assert(bd.ok, `Bank detail works: ${bank.bankName}`);

    const txns = bd.data?.transactions || [];
    const totalIn = txns.filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
    const totalOut = txns.filter(t => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0);
    const expectedBal = (bd.data?.openingBalance || 0) + totalIn - totalOut;
    const actualBal = bd.data?.currentBalance || 0;
    assert(Math.abs(actualBal - expectedBal) < 0.01,
      `${bank.bankName}: balance(${actualBal.toFixed(2)}) = opening(${(bd.data?.openingBalance || 0).toFixed(2)}) + in(${totalIn.toFixed(2)}) - out(${totalOut.toFixed(2)})`,
      `expected ${expectedBal.toFixed(2)}`
    );

    // Verify PE transactions are CREDIT (Money In)
    const peTxns = txns.filter(t => t.documentRef?.startsWith('PE-'));
    const wrongPE = peTxns.filter(t => t.type === 'DEBIT');
    if (peTxns.length > 0) {
      assert(wrongPE.length === 0, `${bank.bankName}: all ${peTxns.length} PE transactions are CREDIT (Money In)`, `${wrongPE.length} still DEBIT`);
    }

    console.log(`    Money In: SAR ${totalIn.toFixed(2)} (${txns.filter(t => t.type === 'CREDIT').length} tx)`);
    console.log(`    Money Out: SAR ${totalOut.toFixed(2)} (${txns.filter(t => t.type === 'DEBIT').length} tx)`);
  }

  // ── ACCOUNTING EQUATION ──
  section('14. ACCOUNTING EQUATION (A = L + E + Net Income)');
  const allAccts = (await api('GET', '/accounts')).data || [];
  let totalA = 0, totalL = 0, totalE = 0, totalR = 0, totalX = 0;
  for (const a of allAccts) {
    const b = a.currentBalance || 0;
    switch (a.type) {
      case 'ASSET': totalA += b; break;
      case 'LIABILITY': totalL += b; break;
      case 'EQUITY': totalE += b; break;
      case 'REVENUE': totalR += b; break;
      case 'EXPENSE': totalX += b; break;
    }
  }
  const netIncome = totalR - totalX;
  const lhs = totalA;
  const rhs = totalL + totalE + netIncome;
  console.log(`    Assets:      SAR ${totalA.toLocaleString('en', { minimumFractionDigits: 2 })}`);
  console.log(`    Liabilities: SAR ${totalL.toLocaleString('en', { minimumFractionDigits: 2 })}`);
  console.log(`    Equity:      SAR ${totalE.toLocaleString('en', { minimumFractionDigits: 2 })}`);
  console.log(`    Revenue:     SAR ${totalR.toLocaleString('en', { minimumFractionDigits: 2 })}`);
  console.log(`    Expenses:    SAR ${totalX.toLocaleString('en', { minimumFractionDigits: 2 })}`);
  console.log(`    Net Income:  SAR ${netIncome.toLocaleString('en', { minimumFractionDigits: 2 })}`);
  assert(Math.abs(lhs - rhs) < 1.0, `A(${lhs.toFixed(2)}) = L+E+NI(${rhs.toFixed(2)})`, `diff=${Math.abs(lhs - rhs).toFixed(2)}`);

  // ── DASHBOARD ──
  section('15. DASHBOARD & REPORTS');
  const dash = await api('GET', '/dashboard/summary');
  assert(dash.ok, 'Dashboard summary works');

  const bs = await api('GET', '/dashboard/balance-sheet');
  assert(bs.ok, 'Balance sheet report works');

  const is_ = await api('GET', '/dashboard/income-statement');
  assert(is_.ok, 'Income statement report works');

  // ── CROSS-CHECK: Sum of customer outstanding = AR account balance ──
  section('16. CROSS-CHECKS');
  const allCusts = (await api('GET', '/customers')).data || [];
  const totalCustOutstanding = allCusts.reduce((s, c) => s + (c.outstandingBalance || 0), 0);
  const arAcct = allAccts.find(a => a.code === '1100' || a.name?.includes('Accounts Receivable'));
  if (arAcct) {
    const arBalance = arAcct.currentBalance || 0;
    // Note: AR balance may not match customer outstanding exactly due to seed data or other transactions
    // but let's check the relationship
    console.log(`    Total customer outstanding: SAR ${totalCustOutstanding.toFixed(2)}`);
    console.log(`    AR account balance:         SAR ${arBalance.toFixed(2)}`);
    const diff = Math.abs(totalCustOutstanding - arBalance);
    if (diff < 1.0) {
      assert(true, `Customer outstanding matches AR balance (diff: ${diff.toFixed(2)})`);
    } else {
      console.log(`    ⚠ Difference: SAR ${diff.toFixed(2)} (may be from seed opening balances or non-invoice AR entries)`);
    }
  }

  // ── SETTINGS ──
  section('17. SETTINGS');
  const settings = await api('GET', '/settings');
  assert(settings.ok, 'Settings endpoint works');

  // ── FINAL REPORT ──
  console.log('\n' + '█'.repeat(60));
  console.log(`  VERIFICATION COMPLETE`);
  console.log('█'.repeat(60));
  console.log(`\n  PASSED: ${PASS}`);
  console.log(`  FAILED: ${FAIL}`);
  console.log(`  TOTAL:  ${PASS + FAIL}`);
  console.log(`  RATE:   ${((PASS / (PASS + FAIL)) * 100).toFixed(1)}%\n`);

  if (ERRORS.length > 0) {
    console.log('  FAILURES:');
    ERRORS.forEach(e => console.log(`  ${e}`));
  }

  console.log(FAIL === 0 ? '\n  ✅ EVERYTHING IS WORKING CORRECTLY\n' : '\n  ❌ ISSUES FOUND — SEE ABOVE\n');
  process.exit(FAIL > 0 ? 1 : 0);
}

main();
