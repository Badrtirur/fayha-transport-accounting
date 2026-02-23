/**
 * Import Chart of Accounts from QzolveAccounting Excel export
 * Preserves the full parent-child hierarchy (4 levels deep)
 *
 * Usage: node prisma/import-coa.cjs
 */

const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

// Map Qzolve types to our system types
function mapAccountType(code) {
  const prefix = code.split('-')[0];
  switch (prefix) {
    case '01': return 'ASSET';
    case '02': return 'LIABILITY';
    case '03': return 'REVENUE';
    case '04': return 'EXPENSE';
    default: return 'ASSET';
  }
}

// Map Qzolve types to subtypes for special accounts
function mapSubType(code, name) {
  const lower = name.toLowerCase();
  if (code.startsWith('01-01-01')) return 'BANK';
  if (code.startsWith('01-01-03')) return 'CASH';
  if (code.startsWith('01-02-01')) return 'ACCOUNTS_RECEIVABLE';
  if (code.startsWith('01-02-03')) return 'PREPAID';
  if (code.startsWith('01-03')) return 'TAX_ASSET';
  if (code.startsWith('01-04')) return 'FIXED_ASSET';
  if (code.startsWith('02-01')) return 'EQUITY';
  if (code.startsWith('02-03-01')) return 'ACCOUNTS_PAYABLE';
  if (code.startsWith('02-03-02')) return 'TAX_LIABILITY';
  if (code.startsWith('02-03-05')) return 'ACCOUNTS_PAYABLE';
  if (code.startsWith('03-01')) return 'SALES_REVENUE';
  if (code.startsWith('03-02')) return 'OTHER_INCOME';
  if (code.startsWith('04-01')) return 'COST_OF_SALES';
  if (code.startsWith('04-02-01')) return 'SALARY_EXPENSE';
  if (code.startsWith('04-02-02')) return 'GENERAL_ADMIN';
  if (code.startsWith('04-02-03')) return 'RENT_EXPENSE';
  if (code.startsWith('04-02-04')) return 'DEPRECIATION';
  if (lower.includes('vat') || lower.includes('tax')) return 'TAX_LIABILITY';
  return null;
}

// Parse balance string like "Dr 7,465.12" or "Cr 14,918.76"
function parseBalance(val) {
  if (!val || val === '-' || val === 0) return 0;
  const str = String(val).trim();
  const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
  if (isNaN(num)) return 0;
  if (str.startsWith('Cr')) return -num;
  return num;
}

// Find parent code from account code
// e.g. "01-01-01-0001" -> "01-01-01", "01-01-01" -> "01-01", "01-01" -> "01"
function getParentCode(code) {
  const parts = code.split('-');
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('-');
}

async function main() {
  const filePath = 'C:/Users/admin1/Downloads/QzolveAccounting (41).xlsx';
  console.log('Reading:', filePath);

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
  const rows = data.slice(1); // skip header

  console.log(`Found ${rows.length} accounts (${rows.filter(r => r.__EMPTY_1 === 'Group').length} groups, ${rows.filter(r => r.__EMPTY_1 === 'Ledger').length} ledgers)`);

  // Parse all rows
  const accounts = rows.map(r => {
    const code = (r.QzolveAccounting || '').trim();
    const name = (r.__EMPTY || '').trim();
    const isGroup = r.__EMPTY_1 === 'Group';
    const openingBalance = parseBalance(r.__EMPTY_2);  // Col D: O/P Balance
    const closingBalance = parseBalance(r.__EMPTY_3);  // Col E: C/L Balance
    const type = mapAccountType(code);
    const subType = mapSubType(code, name);
    const level = code.split('-').length;
    const parentCode = getParentCode(code);

    return { code, name, isGroup, openingBalance, closingBalance, type, subType, level, parentCode };
  }).filter(a => a.code && a.name);

  console.log(`Parsed ${accounts.length} valid accounts`);

  // Build a code -> id map for parent lookups
  const codeToId = new Map();

  // Check how many already exist
  const existing = await prisma.account.findMany({ select: { code: true, id: true } });
  const existingCodes = new Set(existing.map(a => a.code));
  existing.forEach(a => codeToId.set(a.code, a.id));
  console.log(`Existing accounts in DB: ${existing.length}`);

  // Sort by level so parents are created before children
  accounts.sort((a, b) => a.level - b.level);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const acc of accounts) {
    if (existingCodes.has(acc.code)) {
      skipped++;
      continue;
    }

    try {
      const parentId = acc.parentCode ? codeToId.get(acc.parentCode) || null : null;

      const record = await prisma.account.create({
        data: {
          code: acc.code,
          name: acc.name,
          type: acc.type,
          subType: acc.isGroup ? 'GROUP' : (acc.subType || 'GENERAL'),
          level: acc.level,
          parentId: parentId,
          openingBalance: acc.openingBalance,
          currentBalance: acc.closingBalance,
          description: acc.isGroup ? `Group account` : '',
          isActive: true,
        },
      });

      codeToId.set(acc.code, record.id);
      created++;

      if (created % 50 === 0) {
        console.log(`  ... created ${created} accounts`);
      }
    } catch (err) {
      errors++;
      console.error(`  ERROR creating ${acc.code} "${acc.name}":`, err.message);
    }
  }

  console.log('\n=== IMPORT COMPLETE ===');
  console.log(`Created: ${created}`);
  console.log(`Skipped (already exist): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total in DB now: ${created + existing.length}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
