const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const wrongTxns = await prisma.bankTransaction.findMany({
    where: { documentType: 'PAYMENT', type: 'DEBIT' },
  });

  for (const txn of wrongTxns) {
    console.log(`\n═══ Transaction: ${txn.documentRef} ═══`);
    console.log(`  Amount: ${txn.amount}, Type: ${txn.type}, Description: ${txn.description}`);

    if (!txn.documentRef) { console.log('  No documentRef'); continue; }

    // Try finding journal entry
    const je = await prisma.journalEntry.findFirst({
      where: { entryNumber: txn.documentRef },
      include: { lines: true },
    });

    if (!je) {
      console.log('  No journal entry found');
      // Check if it's a different reference type
      const je2 = await prisma.journalEntry.findFirst({
        where: { reference: txn.documentRef },
        include: { lines: true },
      });
      if (je2) {
        console.log(`  Found by reference: ${je2.entryNumber} (referenceType: ${je2.referenceType})`);
      }
      continue;
    }

    console.log(`  JE: ${je.entryNumber}, referenceType: ${je.referenceType}, status: ${je.status}`);
    let meta = {};
    try { meta = je.notes ? JSON.parse(je.notes) : {}; } catch {}
    console.log(`  Meta ledgerAccountId: ${meta.ledgerAccountId || 'NONE'}`);
    console.log(`  Meta entryType: ${meta.entryType || 'NONE'}`);

    console.log('  Lines:');
    for (const line of je.lines) {
      console.log(`    Account: ${line.accountId} | DR: ${line.debitAmount} | CR: ${line.creditAmount} | Desc: ${line.description}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
