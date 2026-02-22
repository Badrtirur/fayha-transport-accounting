#!/usr/bin/env node
// Direct database fix for bank transactions still typed as DEBIT
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fixing bank transaction types...');

  // Find all DEBIT transactions from payment entries
  const wrongTxns = await prisma.bankTransaction.findMany({
    where: { documentType: 'PAYMENT', type: 'DEBIT' },
  });

  console.log(`Found ${wrongTxns.length} DEBIT payment transactions to check`);

  let fixed = 0;
  for (const txn of wrongTxns) {
    if (!txn.documentRef) continue;

    const je = await prisma.journalEntry.findFirst({
      where: { entryNumber: txn.documentRef, referenceType: 'PAYMENT_ENTRY' },
      include: { lines: true },
    });
    if (!je) {
      console.log(`  Skip: no journal entry for ${txn.documentRef}`);
      continue;
    }

    let meta = {};
    try { meta = je.notes ? JSON.parse(je.notes) : {}; } catch {}

    // Try matching by ledgerAccountId first
    let bankLine = je.lines.find(l => l.accountId === meta.ledgerAccountId);
    // Fallback: find any DR-only line
    if (!bankLine) {
      bankLine = je.lines.find(l => (l.debitAmount || 0) > 0 && (l.creditAmount || 0) === 0);
    }

    if (bankLine && (bankLine.debitAmount || 0) > (bankLine.creditAmount || 0)) {
      await prisma.bankTransaction.update({
        where: { id: txn.id },
        data: { type: 'CREDIT' },
      });
      fixed++;
      console.log(`  Fixed: ${txn.documentRef} DEBIT → CREDIT (amount: ${txn.amount})`);
    } else {
      console.log(`  Skip: ${txn.documentRef} - no DR bank line found`);
    }
  }

  // Recalculate bank balances
  if (fixed > 0) {
    const banks = await prisma.bankAccount.findMany({ where: { isActive: true } });
    for (const bank of banks) {
      const txns = await prisma.bankTransaction.findMany({ where: { bankAccountId: bank.id } });
      let balance = bank.openingBalance || 0;
      for (const t of txns) {
        balance += t.type === 'CREDIT' ? t.amount : -t.amount;
      }
      await prisma.bankAccount.update({ where: { id: bank.id }, data: { currentBalance: balance } });
      console.log(`  Bank ${bank.bankName}: balance recalculated to ${balance}`);
    }
  }

  console.log(`\nFixed ${fixed} transactions`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
