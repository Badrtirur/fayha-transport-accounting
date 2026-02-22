const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fixing bank transaction types (v2)...');

  const wrongTxns = await prisma.bankTransaction.findMany({
    where: { documentType: 'PAYMENT', type: 'DEBIT' },
  });

  let fixed = 0;
  for (const txn of wrongTxns) {
    if (!txn.documentRef) continue;

    // Check if this is a Payment Entry (PE-*) — those should be CREDIT (money in)
    // PVC-* entries are payment vouchers (money out) — leave as DEBIT
    if (txn.documentRef.startsWith('PE-')) {
      const je = await prisma.journalEntry.findFirst({
        where: { entryNumber: txn.documentRef, referenceType: 'PAYMENT_ENTRY' },
      });
      if (je) {
        await prisma.bankTransaction.update({
          where: { id: txn.id },
          data: { type: 'CREDIT' },
        });
        fixed++;
        console.log(`  Fixed: ${txn.documentRef} DEBIT → CREDIT (SAR ${txn.amount})`);
      }
    } else {
      console.log(`  Skip: ${txn.documentRef} (not a PE entry — likely legitimate DEBIT)`);
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
    const old = bank.currentBalance;
    if (Math.abs(old - balance) > 0.01) {
      await prisma.bankAccount.update({ where: { id: bank.id }, data: { currentBalance: balance } });
      console.log(`  Bank ${bank.bankName}: ${old} → ${balance}`);
    }
  }

  console.log(`\nFixed ${fixed} transactions`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
