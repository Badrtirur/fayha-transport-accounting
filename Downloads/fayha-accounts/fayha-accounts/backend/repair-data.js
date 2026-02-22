#!/usr/bin/env node
// =============================================================================
// FAYHA TRANSPORTATION - DATA REPAIR SCRIPT
// Fixes: opening balances, customer balances, bank transaction types
// =============================================================================

const BASE = 'http://localhost:5000/api/v1';
let TOKEN = '';

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

async function main() {
  console.log('\n═══════════════════════════════════════════');
  console.log('  FAYHA DATA REPAIR SCRIPT');
  console.log('═══════════════════════════════════════════\n');

  // 1. Login
  const auth = await api('POST', '/auth/login', {
    email: 'admin@fayha-transport.sa',
    password: 'admin123',
  });
  TOKEN = auth.token;
  console.log('✓ Authenticated\n');

  // 2. Fix bank transaction types (DEBIT → CREDIT for payment receipts)
  console.log('── FIX 1: Bank Transaction Types ──');
  try {
    const result = await api('POST', '/banks/repair-payment-types');
    console.log(`  ${result.message}`);
  } catch (e) {
    console.log(`  ⚠ ${e.message}`);
  }

  // 3. Recalculate customer balances from actual invoice/payment data
  console.log('\n── FIX 2: Customer Balances ──');
  const customers = await api('GET', '/customers');
  const allInvoices = await api('GET', '/sales-invoices');
  const allPaymentEntries = await api('GET', '/payment-entries');
  const peList = Array.isArray(allPaymentEntries) ? allPaymentEntries : [];

  let custFixed = 0;
  for (const cust of customers) {
    // Calculate totalInvoiced from actual invoices
    const custInvoices = allInvoices.filter(inv => inv.clientId === cust.id);
    const actualInvoiced = custInvoices.reduce((s, inv) => s + (inv.totalAmount || 0), 0);

    // Calculate totalPaid from actual payment entries
    const custPayments = peList.filter(pe => pe.clientId === cust.id);
    const actualPaid = custPayments.reduce((s, pe) => s + (pe.totalCr || pe.totalDr || 0), 0);

    // Expected outstanding
    const actualOutstanding = actualInvoiced - actualPaid;

    // Check if needs fixing
    const needsFix =
      Math.abs((cust.totalInvoiced || 0) - actualInvoiced) > 0.01 ||
      Math.abs((cust.totalPaid || 0) - actualPaid) > 0.01 ||
      Math.abs((cust.outstandingBalance || 0) - actualOutstanding) > 0.01;

    if (needsFix) {
      try {
        await api('PUT', `/customers/${cust.id}`, {
          totalInvoiced: actualInvoiced,
          totalPaid: actualPaid,
          outstandingBalance: actualOutstanding,
        });
        custFixed++;
        console.log(`  Fixed: ${cust.name} — invoiced=${actualInvoiced} paid=${actualPaid} outstanding=${actualOutstanding}`);
      } catch (e) {
        console.log(`  ⚠ ${cust.name}: ${e.message}`);
      }
    }
  }
  console.log(`  → Fixed ${custFixed} customer balances`);

  // 4. Fix opening balance imbalance in Chart of Accounts
  console.log('\n── FIX 3: Chart of Accounts Opening Balance ──');
  const accounts = await api('GET', '/accounts');

  // Calculate current imbalance
  // In accounting: Assets + Expenses (debit normal) vs Liabilities + Equity + Revenue (credit normal)
  // For trial balance: DR side = Assets (positive) + Expenses (positive) + Contra-Assets (negative sign but stored as negative)
  //                    CR side = Liabilities + Equity + Revenue
  // Opening balances in seed are stored as absolute values with sign convention:
  //   Assets: positive = debit balance (normal)
  //   Liabilities: positive = credit balance (normal)
  //   Equity: positive = credit balance (normal), negative for Drawings = debit balance
  //   Revenue: positive = credit balance (normal)
  //   Expenses: positive = debit balance (normal)

  let drBalances = 0;  // Assets + Expenses
  let crBalances = 0;  // Liabilities + Equity + Revenue

  for (const acc of accounts) {
    const ob = acc.openingBalance || 0;
    switch (acc.type) {
      case 'ASSET':
        drBalances += ob;  // positive = debit, negative (contra) = credit
        break;
      case 'EXPENSE':
        drBalances += ob;
        break;
      case 'LIABILITY':
        crBalances += ob;
        break;
      case 'EQUITY':
        if (ob >= 0) crBalances += ob;
        else drBalances += Math.abs(ob);  // Drawings
        break;
      case 'REVENUE':
        crBalances += ob;
        break;
    }
  }

  console.log(`  Opening DR total: ${drBalances.toFixed(2)}`);
  console.log(`  Opening CR total: ${crBalances.toFixed(2)}`);
  const imbalance = crBalances - drBalances;
  console.log(`  Imbalance: ${imbalance.toFixed(2)} (CR exceeds DR)`);

  if (Math.abs(imbalance) > 0.01) {
    // Fix by adjusting Retained Earnings (3020) to absorb the imbalance
    // If CR > DR, we need more DR or less CR. Add to Retained Earnings (equity, credit normal)
    // To reduce CR side: reduce Retained Earnings openingBalance
    const retainedEarnings = accounts.find(a => a.code === '3020');
    if (retainedEarnings) {
      const newOB = (retainedEarnings.openingBalance || 0) - imbalance;
      try {
        await api('PUT', `/accounts/${retainedEarnings.id}`, {
          openingBalance: newOB,
          currentBalance: retainedEarnings.currentBalance - imbalance,
        });
        console.log(`  Fixed: Retained Earnings opening balance ${retainedEarnings.openingBalance} → ${newOB}`);
        console.log(`  → Opening balances now balanced`);
      } catch (e) {
        console.log(`  ⚠ Failed to update Retained Earnings: ${e.message}`);
      }
    }
  } else {
    console.log('  → Opening balances already balanced');
  }

  // 5. Recalculate all account currentBalance from opening + journal entries
  console.log('\n── FIX 4: Recalculate Account Balances ──');
  const journals = await api('GET', '/journals');
  const jList = Array.isArray(journals) ? journals : (journals.data || []);

  // Build balance map: start from opening, add journal effects
  const balanceMap = {};
  const refreshedAccounts = await api('GET', '/accounts');
  for (const acc of refreshedAccounts) {
    balanceMap[acc.id] = acc.openingBalance || 0;
  }

  // Sum all POSTED journal lines
  let postedCount = 0;
  for (const je of jList) {
    if (je.status !== 'POSTED') continue;
    postedCount++;
    for (const line of (je.lines || [])) {
      const accId = line.accountId;
      if (!accId || !balanceMap.hasOwnProperty(accId)) continue;
      // Find account type
      const acc = refreshedAccounts.find(a => a.id === accId);
      if (!acc) continue;
      // Convention: debit-normal accounts (Asset, Expense) increment by (DR-CR)
      //             credit-normal accounts (Liability, Equity, Revenue) increment by (CR-DR)
      const dr = line.debitAmount || 0;
      const cr = line.creditAmount || 0;
      if (['ASSET', 'EXPENSE'].includes(acc.type)) {
        balanceMap[accId] += (dr - cr);
      } else {
        balanceMap[accId] += (cr - dr);
      }
    }
  }
  console.log(`  Processed ${postedCount} posted journal entries`);

  // Update accounts where balance differs
  let accFixed = 0;
  for (const acc of refreshedAccounts) {
    const expected = balanceMap[acc.id] || 0;
    const actual = acc.currentBalance || 0;
    if (Math.abs(actual - expected) > 0.01) {
      try {
        await api('PUT', `/accounts/${acc.id}`, { currentBalance: expected });
        accFixed++;
        console.log(`  Fixed: ${acc.code} ${acc.name}: ${actual.toFixed(2)} → ${expected.toFixed(2)}`);
      } catch (e) {
        console.log(`  ⚠ ${acc.code}: ${e.message}`);
      }
    }
  }
  console.log(`  → Fixed ${accFixed} account balances`);

  // 6. Verify final trial balance
  console.log('\n── VERIFICATION ──');
  const finalAccounts = await api('GET', '/accounts');
  let finalDr = 0;
  let finalCr = 0;
  for (const acc of finalAccounts) {
    const bal = acc.currentBalance || 0;
    if (['ASSET', 'EXPENSE'].includes(acc.type)) {
      if (bal >= 0) finalDr += bal;
      else finalCr += Math.abs(bal);
    } else {
      if (bal >= 0) finalCr += bal;
      else finalDr += Math.abs(bal);
    }
  }
  console.log(`  Trial Balance DR: ${finalDr.toFixed(2)}`);
  console.log(`  Trial Balance CR: ${finalCr.toFixed(2)}`);
  console.log(`  Difference: ${Math.abs(finalDr - finalCr).toFixed(2)}`);

  if (Math.abs(finalDr - finalCr) <= 1.0) {
    console.log('  ✅ TRIAL BALANCE IS BALANCED');
  } else {
    console.log('  ⚠ Trial balance still has a difference — may need manual investigation');
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('  REPAIR COMPLETE');
  console.log('═══════════════════════════════════════════\n');
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
