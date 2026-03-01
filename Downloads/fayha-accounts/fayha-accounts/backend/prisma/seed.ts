// ==========================================
// FAYHA TRANSPORTATION - Database Seeder
// Comprehensive seed data for all entities
// ==========================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Fayha Transportation Database...\n');

  // Clear existing data (order matters for foreign keys)
  await prisma.rcvPvc.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.salesInvoiceItem.deleteMany();
  await prisma.salesInvoice.deleteMany();
  await prisma.containerDetail.deleteMany();
  await prisma.expenseEntry.deleteMany();
  await prisma.jobReference.deleteMany();
  await prisma.clientAdvance.deleteMany();
  await prisma.clientOPB.deleteMany();
  await prisma.payableOPB.deleteMany();
  await prisma.payableExpense.deleteMany();
  await prisma.clientService.deleteMany();
  await prisma.invoiceService.deleteMany();
  await prisma.fileVerification.deleteMany();
  await prisma.dailyWorkOrder.deleteMany();
  await prisma.salesQuote.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.portHandling.deleteMany();
  await prisma.terminal.deleteMany();
  await prisma.fclLcl.deleteMany();
  await prisma.cRMLead.deleteMany();
  await prisma.creditNote.deleteMany();
  await prisma.debitNote.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.billLineItem.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.journalLine.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.bankTransaction.deleteMany();
  await prisma.bankReconciliation.deleteMany();
  await prisma.customerContact.deleteMany();
  await prisma.vendorContact.deleteMany();
  await prisma.budgetLine.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.account.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.consignee.deleteMany();
  await prisma.jobTitle.deleteMany();
  await prisma.jobCategory.deleteMany();
  await prisma.jobController.deleteMany();
  await prisma.salesman.deleteMany();
  await prisma.fiscalPeriod.deleteMany();
  await prisma.fiscalYear.deleteMany();
  await prisma.counter.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.vatReturn.deleteMany();
  await prisma.user.deleteMany();

  // ==================== USERS ====================
  console.log('Creating users...');
  const hashedPassword = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@fayha-transport.sa',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      firstNameAr: 'مدير',
      lastNameAr: 'النظام',
      role: 'SUPER_ADMIN',
      phone: '+966-11-000-0001',
    }
  });

  await prisma.user.createMany({
    data: [
      { email: 'accountant@fayha-transport.sa', password: hashedPassword, firstName: 'Ahmed', lastName: 'Al-Rashidi', firstNameAr: 'أحمد', lastNameAr: 'الراشدي', role: 'ACCOUNTANT', phone: '+966-11-000-0002' },
      { email: 'finance@fayha-transport.sa', password: hashedPassword, firstName: 'Mohammed', lastName: 'Al-Harbi', firstNameAr: 'محمد', lastNameAr: 'الحربي', role: 'FINANCE_MANAGER', phone: '+966-11-000-0003' },
      { email: 'ap@fayha-transport.sa', password: hashedPassword, firstName: 'Fatima', lastName: 'Al-Zahrani', firstNameAr: 'فاطمة', lastNameAr: 'الزهراني', role: 'AP_CLERK', phone: '+966-11-000-0004' },
      { email: 'ar@fayha-transport.sa', password: hashedPassword, firstName: 'Sara', lastName: 'Al-Otaibi', firstNameAr: 'سارة', lastNameAr: 'العتيبي', role: 'AR_CLERK', phone: '+966-11-000-0005' },
      { email: 'cashier@fayha-transport.sa', password: hashedPassword, firstName: 'Khalid', lastName: 'Al-Dosari', firstNameAr: 'خالد', lastNameAr: 'الدوسري', role: 'CASHIER', phone: '+966-11-000-0006' },
    ]
  });
  console.log('✅ 6 Users created');

  // ==================== BANK ACCOUNTS ====================
  console.log('Creating bank accounts...');
  const banks = await Promise.all([
    prisma.bankAccount.create({ data: { code: 'ARB', bankName: 'Al Rajhi Bank', bankNameAr: 'بنك الراجحي', accountNumber: '2100001234567', ibanNumber: 'SA0380000210000123456', swiftCode: 'RJHISARI', branchName: 'Riyadh Main', openingBalance: 485000, currentBalance: 485000, color: '#0B6623', isDefault: true } }),
    prisma.bankAccount.create({ data: { code: 'SNB', bankName: 'Saudi National Bank (SNB)', bankNameAr: 'البنك الأهلي السعودي', accountNumber: '3200009876543', ibanNumber: 'SA0310000320000987654', swiftCode: 'NCBKSAJE', branchName: 'Olaya Branch', openingBalance: 312000, currentBalance: 312000, color: '#003366' } }),
    prisma.bankAccount.create({ data: { code: 'RB', bankName: 'Riyad Bank', bankNameAr: 'بنك الرياض', accountNumber: '1400005556789', ibanNumber: 'SA0220000140000555678', swiftCode: 'RIBLSARI', branchName: 'Industrial City', openingBalance: 198500, currentBalance: 198500, color: '#8B0000' } }),
    prisma.bankAccount.create({ data: { code: 'SABB', bankName: 'Saudi British Bank (SABB)', bankNameAr: 'البنك السعودي البريطاني', accountNumber: '0850003334567', ibanNumber: 'SA0345000085000333456', swiftCode: 'SABBSARI', branchName: 'King Fahad Road', openingBalance: 267000, currentBalance: 267000, color: '#1B4F72' } }),
    prisma.bankAccount.create({ data: { code: 'ALN', bankName: 'Alinma Bank', bankNameAr: 'بنك الإنماء', accountNumber: '6800007771234', ibanNumber: 'SA0505000680000777123', swiftCode: 'INMASARI', branchName: 'Exit 5 Branch', openingBalance: 145000, currentBalance: 145000, color: '#5B2C6F' } }),
    prisma.bankAccount.create({ data: { code: 'BAJ', bankName: 'Bank AlJazira', bankNameAr: 'بنك الجزيرة', accountNumber: '0120004449876', ibanNumber: 'SA0460000012000444987', swiftCode: 'BJAZSAJE', branchName: 'Malaz Branch', openingBalance: 89500, currentBalance: 89500, color: '#B7950B' } }),
  ]);
  console.log('✅ 6 Bank accounts created');

  // ==================== CHART OF ACCOUNTS ====================
  console.log('Creating Chart of Accounts...');
  const accounts = [
    { code: '1010', name: 'Cash on Hand', nameAr: 'النقد في الصندوق', type: 'ASSET', subType: 'CURRENT_ASSET', openingBalance: 25000 },
    { code: '1020', name: 'Al Rajhi Bank', nameAr: 'بنك الراجحي', type: 'ASSET', subType: 'BANK', openingBalance: 485000, isBankAccount: true },
    { code: '1021', name: 'Saudi National Bank', nameAr: 'البنك الأهلي', type: 'ASSET', subType: 'BANK', openingBalance: 312000, isBankAccount: true },
    { code: '1022', name: 'Riyad Bank', nameAr: 'بنك الرياض', type: 'ASSET', subType: 'BANK', openingBalance: 198500, isBankAccount: true },
    { code: '1023', name: 'SABB Bank', nameAr: 'البنك السعودي البريطاني', type: 'ASSET', subType: 'BANK', openingBalance: 267000, isBankAccount: true },
    { code: '1024', name: 'Alinma Bank', nameAr: 'بنك الإنماء', type: 'ASSET', subType: 'BANK', openingBalance: 145000, isBankAccount: true },
    { code: '1025', name: 'Bank AlJazira', nameAr: 'بنك الجزيرة', type: 'ASSET', subType: 'BANK', openingBalance: 89500, isBankAccount: true },
    { code: '1100', name: 'Accounts Receivable', nameAr: 'ذمم مدينة', type: 'ASSET', subType: 'CURRENT_ASSET', openingBalance: 342000, isSubLedger: true },
    { code: '1200', name: 'Prepaid Expenses', nameAr: 'مصاريف مدفوعة مقدماً', type: 'ASSET', subType: 'CURRENT_ASSET', openingBalance: 45000 },
    { code: '1210', name: 'Input VAT', nameAr: 'ضريبة القيمة المضافة المدخلة', type: 'ASSET', subType: 'CURRENT_ASSET', openingBalance: 0 },
    { code: '1300', name: 'Vehicles & Fleet', nameAr: 'المركبات والأسطول', type: 'ASSET', subType: 'FIXED_ASSET', openingBalance: 1200000 },
    { code: '1310', name: 'Containers & Equipment', nameAr: 'الحاويات والمعدات', type: 'ASSET', subType: 'FIXED_ASSET', openingBalance: 450000 },
    { code: '1320', name: 'Office Equipment', nameAr: 'معدات مكتبية', type: 'ASSET', subType: 'FIXED_ASSET', openingBalance: 85000 },
    { code: '1330', name: 'Warehouse Equipment', nameAr: 'معدات المستودعات', type: 'ASSET', subType: 'FIXED_ASSET', openingBalance: 320000 },
    { code: '1400', name: 'Accumulated Depreciation', nameAr: 'الاستهلاك المتراكم', type: 'ASSET', subType: 'CONTRA_ASSET', openingBalance: -280000 },
    { code: '2010', name: 'Accounts Payable', nameAr: 'ذمم دائنة', type: 'LIABILITY', subType: 'CURRENT_LIABILITY', openingBalance: 178000, isSubLedger: true },
    { code: '2020', name: 'Accrued Expenses', nameAr: 'مصاريف مستحقة', type: 'LIABILITY', subType: 'CURRENT_LIABILITY', openingBalance: 45000 },
    { code: '2030', name: 'VAT Payable', nameAr: 'ضريبة القيمة المضافة المستحقة', type: 'LIABILITY', subType: 'CURRENT_LIABILITY', openingBalance: 67500 },
    { code: '2040', name: 'Salaries Payable', nameAr: 'رواتب مستحقة', type: 'LIABILITY', subType: 'CURRENT_LIABILITY', openingBalance: 125000 },
    { code: '2050', name: 'Customs Duties Payable', nameAr: 'رسوم جمركية مستحقة', type: 'LIABILITY', subType: 'CURRENT_LIABILITY', openingBalance: 89000 },
    { code: '2060', name: 'GOSI Payable', nameAr: 'التأمينات الاجتماعية', type: 'LIABILITY', subType: 'CURRENT_LIABILITY', openingBalance: 32000 },
    { code: '2100', name: 'Vehicle Loans', nameAr: 'قروض المركبات', type: 'LIABILITY', subType: 'LONG_TERM_LIABILITY', openingBalance: 450000 },
    { code: '2110', name: 'Equipment Financing', nameAr: 'تمويل المعدات', type: 'LIABILITY', subType: 'LONG_TERM_LIABILITY', openingBalance: 180000 },
    { code: '3010', name: "Owner's Capital", nameAr: 'رأس مال المالك', type: 'EQUITY', subType: 'CAPITAL', openingBalance: 2000000 },
    { code: '3020', name: 'Retained Earnings', nameAr: 'الأرباح المحتجزة', type: 'EQUITY', subType: 'RETAINED_EARNINGS', openingBalance: -58500 },
    { code: '3030', name: 'Drawings', nameAr: 'المسحوبات', type: 'EQUITY', subType: 'DRAWINGS', openingBalance: -50000 },
    { code: '4010', name: 'Transportation Revenue', nameAr: 'إيرادات النقل', type: 'REVENUE', subType: 'OPERATING_REVENUE', openingBalance: 890000 },
    { code: '4020', name: 'Customs Clearance Fees', nameAr: 'رسوم التخليص الجمركي', type: 'REVENUE', subType: 'OPERATING_REVENUE', openingBalance: 425000 },
    { code: '4030', name: 'Freight Forwarding Income', nameAr: 'إيرادات الشحن', type: 'REVENUE', subType: 'OPERATING_REVENUE', openingBalance: 312000 },
    { code: '4040', name: 'Container Handling Revenue', nameAr: 'إيرادات مناولة الحاويات', type: 'REVENUE', subType: 'OPERATING_REVENUE', openingBalance: 198000 },
    { code: '4050', name: 'Warehouse Storage Income', nameAr: 'إيرادات التخزين', type: 'REVENUE', subType: 'OPERATING_REVENUE', openingBalance: 145000 },
    { code: '4060', name: 'Documentation Service Fees', nameAr: 'رسوم خدمات التوثيق', type: 'REVENUE', subType: 'OPERATING_REVENUE', openingBalance: 78000 },
    { code: '4070', name: 'Demurrage Recovery', nameAr: 'استرداد غرامات التأخير', type: 'REVENUE', subType: 'OTHER_REVENUE', openingBalance: 34000 },
    { code: '5010', name: 'Driver Salaries & Benefits', nameAr: 'رواتب ومزايا السائقين', type: 'EXPENSE', subType: 'OPERATING_EXPENSE', openingBalance: 320000 },
    { code: '5020', name: 'Staff Salaries & Benefits', nameAr: 'رواتب ومزايا الموظفين', type: 'EXPENSE', subType: 'OPERATING_EXPENSE', openingBalance: 245000 },
    { code: '5030', name: 'Fuel & Diesel Expenses', nameAr: 'مصاريف الوقود والديزل', type: 'EXPENSE', subType: 'OPERATING_EXPENSE', openingBalance: 185000 },
    { code: '5040', name: 'Vehicle Maintenance & Repair', nameAr: 'صيانة وإصلاح المركبات', type: 'EXPENSE', subType: 'OPERATING_EXPENSE', openingBalance: 95000 },
    { code: '5050', name: 'Customs & Government Fees', nameAr: 'رسوم جمركية وحكومية', type: 'EXPENSE', subType: 'OPERATING_EXPENSE', openingBalance: 112000 },
    { code: '5060', name: 'Port & Terminal Charges', nameAr: 'رسوم الميناء والمحطات', type: 'EXPENSE', subType: 'OPERATING_EXPENSE', openingBalance: 78000 },
    { code: '5070', name: 'Warehouse Rent', nameAr: 'إيجار المستودع', type: 'EXPENSE', subType: 'OPERATING_EXPENSE', openingBalance: 96000 },
    { code: '5080', name: 'Office Rent', nameAr: 'إيجار المكتب', type: 'EXPENSE', subType: 'OPERATING_EXPENSE', openingBalance: 60000 },
    { code: '5090', name: 'Insurance Expense', nameAr: 'مصاريف التأمين', type: 'EXPENSE', subType: 'OPERATING_EXPENSE', openingBalance: 45000 },
    { code: '5100', name: 'Depreciation Expense', nameAr: 'مصاريف الاستهلاك', type: 'EXPENSE', subType: 'DEPRECIATION', openingBalance: 72000 },
    { code: '5110', name: 'Utilities & Communication', nameAr: 'خدمات واتصالات', type: 'EXPENSE', subType: 'ADMINISTRATIVE_EXPENSE', openingBalance: 28000 },
    { code: '5120', name: 'Toll & Road Charges', nameAr: 'رسوم الطرق', type: 'EXPENSE', subType: 'OPERATING_EXPENSE', openingBalance: 35000 },
    { code: '5130', name: 'Container Lease Expenses', nameAr: 'مصاريف تأجير الحاويات', type: 'EXPENSE', subType: 'OPERATING_EXPENSE', openingBalance: 52000 },
    { code: '5140', name: 'Bank Charges & Interest', nameAr: 'رسوم بنكية وفوائد', type: 'EXPENSE', subType: 'FINANCIAL_EXPENSE', openingBalance: 18000 },
    { code: '5150', name: 'Miscellaneous Expenses', nameAr: 'مصاريف متنوعة', type: 'EXPENSE', subType: 'ADMINISTRATIVE_EXPENSE', openingBalance: 15000 },
  ];

  for (const acc of accounts) {
    await prisma.account.create({
      data: {
        code: acc.code,
        name: acc.name,
        nameAr: acc.nameAr,
        type: acc.type,
        subType: acc.subType,
        openingBalance: acc.openingBalance,
        currentBalance: acc.openingBalance,
        isSystemAccount: true,
        isBankAccount: (acc as any).isBankAccount || false,
        isSubLedger: (acc as any).isSubLedger || false,
      }
    });
  }
  console.log(`✅ ${accounts.length} Accounts created`);

  // Link Bank Accounts to their Chart of Accounts entries via bankId
  const bankCodeMap: Record<string, string> = {
    'ARB': '1020',   // Al Rajhi Bank
    'SNB': '1021',   // Saudi National Bank
    'RB': '1022',    // Riyad Bank
    'SABB': '1023',  // SABB Bank
    'ALN': '1024',   // Alinma Bank
    'BAJ': '1025',   // Bank AlJazira
  };
  for (let i = 0; i < banks.length; i++) {
    const bankCode = banks[i].code;
    const accountCode = bankCodeMap[bankCode];
    if (accountCode) {
      await prisma.account.updateMany({
        where: { code: accountCode },
        data: { bankId: banks[i].id },
      });
    }
  }
  console.log('✅ Bank accounts linked to chart of accounts');

  // ==================== CUSTOMERS ====================
  console.log('Creating customers...');
  const customers = await Promise.all([
    prisma.customer.create({ data: { code: 'CUST-001', name: 'IKEA Saudi Arabia', nameAr: 'ايكيا السعودية', contactPerson: 'Omar Al-Fayed', phone: '+966-11-215-3000', email: 'logistics@ikea.sa', city: 'Riyadh', category: 'Retail', paymentTermDays: 30, outstandingBalance: 125000, creditLimit: 500000, vatNumber: '300012345600003', crNumber: '1010123456' } }),
    prisma.customer.create({ data: { code: 'CUST-002', name: 'Panda Retail Company', nameAr: 'شركة بنده للتجزئة', contactPerson: 'Hassan Ibrahim', phone: '+966-11-287-3456', email: 'supply@panda.sa', city: 'Jeddah', category: 'FMCG', paymentTermDays: 15, outstandingBalance: 87000, creditLimit: 300000, vatNumber: '300034567800003', crNumber: '4030234567' } }),
    prisma.customer.create({ data: { code: 'CUST-003', name: 'SABIC Logistics', nameAr: 'سابك للخدمات اللوجستية', contactPerson: 'Tariq Al-Shammari', phone: '+966-13-225-8000', email: 'shipping@sabic.sa', city: 'Jubail', category: 'Petrochemical', paymentTermDays: 45, outstandingBalance: 65000, creditLimit: 1000000, vatNumber: '300056789100003', crNumber: '2050345678' } }),
    prisma.customer.create({ data: { code: 'CUST-004', name: 'Abdul Latif Jameel', nameAr: 'عبداللطيف جميل', contactPerson: 'Nasser Al-Qahtani', phone: '+966-12-669-3000', email: 'import@alj.sa', city: 'Jeddah', category: 'Automotive', paymentTermDays: 30, outstandingBalance: 45000, creditLimit: 750000, vatNumber: '300078901200003', crNumber: '4030456789' } }),
    prisma.customer.create({ data: { code: 'CUST-005', name: 'Extra Electronics', nameAr: 'اكسترا للإلكترونيات', contactPerson: 'Fahad Al-Mutairi', phone: '+966-11-477-2000', email: 'warehouse@extra.sa', city: 'Riyadh', category: 'Electronics', paymentTermDays: 30, outstandingBalance: 20000, creditLimit: 200000, vatNumber: '300090123400003', crNumber: '1010567890' } }),
    prisma.customer.create({ data: { code: 'CUST-006', name: 'Almarai Company', nameAr: 'شركة المراعي', contactPerson: 'Ali Al-Subaie', phone: '+966-11-470-0005', email: 'logistics@almarai.sa', city: 'Riyadh', category: 'Food & Dairy', paymentTermDays: 30, outstandingBalance: 95000, creditLimit: 800000, vatNumber: '300012345700003', crNumber: '1010678901' } }),
    prisma.customer.create({ data: { code: 'CUST-007', name: 'Saudi Aramco Base Oil', nameAr: 'أرامكو السعودية - زيوت', contactPerson: 'Faisal Al-Ghamdi', phone: '+966-13-880-0001', email: 'supply@aramco.sa', city: 'Dhahran', category: 'Oil & Gas', paymentTermDays: 60, outstandingBalance: 210000, creditLimit: 2000000, vatNumber: '300011111100003', crNumber: '2050000001' } }),
    prisma.customer.create({ data: { code: 'CUST-008', name: 'Jarir Bookstore', nameAr: 'مكتبة جرير', contactPerson: 'Mohammed Al-Qahtani', phone: '+966-11-211-0003', email: 'imports@jarir.sa', city: 'Riyadh', category: 'Retail', paymentTermDays: 30, outstandingBalance: 35000, creditLimit: 250000, vatNumber: '300022222200003', crNumber: '1010789012' } }),
  ]);
  console.log('✅ 8 Customers created');

  // ==================== CONSIGNEES ====================
  console.log('Creating consignees...');
  const consignees = await Promise.all([
    prisma.consignee.create({ data: { code: 'CON-001', name: 'IKEA Distribution Center', nameAr: 'مركز توزيع ايكيا', contactPerson: 'Warehouse Manager', phone: '+966-11-215-4000', city: 'Riyadh', warehouseLocation: 'Industrial Area 2, Riyadh' } }),
    prisma.consignee.create({ data: { code: 'CON-002', name: 'Panda Central Warehouse', nameAr: 'مستودع بنده المركزي', contactPerson: 'Receiving Dept', phone: '+966-12-699-1200', city: 'Jeddah', warehouseLocation: 'South Jeddah Industrial' } }),
    prisma.consignee.create({ data: { code: 'CON-003', name: 'SABIC Jubail Plant', nameAr: 'مصنع سابك الجبيل', contactPerson: 'Raw Materials', phone: '+966-13-340-5000', city: 'Jubail', warehouseLocation: 'Royal Commission, Jubail' } }),
    prisma.consignee.create({ data: { code: 'CON-004', name: 'Almarai Dairy Plant', nameAr: 'مصنع ألبان المراعي', contactPerson: 'Logistics Dept', phone: '+966-11-470-1234', city: 'Al Kharj', warehouseLocation: 'Al Kharj Industrial Zone' } }),
    prisma.consignee.create({ data: { code: 'CON-005', name: 'Aramco Ras Tanura Terminal', nameAr: 'محطة أرامكو رأس تنورة', contactPerson: 'Terminal Ops', phone: '+966-13-670-1111', city: 'Ras Tanura', warehouseLocation: 'Ras Tanura Port Facility' } }),
  ]);
  console.log('✅ 5 Consignees created');

  // ==================== VENDORS ====================
  console.log('Creating vendors...');
  const vendors = await Promise.all([
    prisma.vendor.create({ data: { code: 'VND-001', name: 'Saudi Customs Authority', nameAr: 'هيئة الجمارك السعودية', contactPerson: 'Government Portal', phone: '+966-11-401-3456', email: 'support@customs.gov.sa', city: 'Riyadh', category: 'Government', paymentTermDays: 0, outstandingBalance: 89000 } }),
    prisma.vendor.create({ data: { code: 'VND-002', name: 'Jeddah Islamic Port', nameAr: 'ميناء جدة الإسلامي', contactPerson: 'Port Operations', phone: '+966-12-647-8901', email: 'ops@jeddahport.sa', city: 'Jeddah', category: 'Port Services', paymentTermDays: 15, outstandingBalance: 34000 } }),
    prisma.vendor.create({ data: { code: 'VND-003', name: 'Al Madinah Fuel Station', nameAr: 'محطة وقود المدينة', contactPerson: 'Supply Dept', phone: '+966-14-823-4567', email: 'supply@madinahfuel.sa', city: 'Riyadh', category: 'Fuel Supplier', paymentTermDays: 7, outstandingBalance: 22000 } }),
    prisma.vendor.create({ data: { code: 'VND-004', name: 'Gulf Auto Workshop', nameAr: 'ورشة الخليج للسيارات', contactPerson: 'Service Manager', phone: '+966-11-456-7890', email: 'service@gulfauto.sa', city: 'Riyadh', category: 'Maintenance', paymentTermDays: 30, outstandingBalance: 15000 } }),
    prisma.vendor.create({ data: { code: 'VND-005', name: 'Riyadh Container Services', nameAr: 'خدمات حاويات الرياض', contactPerson: 'Lease Dept', phone: '+966-11-234-5678', email: 'lease@riyadhcontainer.sa', city: 'Riyadh', category: 'Container Leasing', paymentTermDays: 30, outstandingBalance: 18000 } }),
    prisma.vendor.create({ data: { code: 'VND-006', name: 'National Insurance Co.', nameAr: 'شركة التأمين الوطنية', contactPerson: 'Claims Dept', phone: '+966-11-567-8901', email: 'claims@natins.sa', city: 'Riyadh', category: 'Insurance', paymentTermDays: 30, outstandingBalance: 0 } }),
    prisma.vendor.create({ data: { code: 'VND-007', name: 'Saudi Telecom (STC)', nameAr: 'الاتصالات السعودية', contactPerson: 'Business Support', phone: '900', email: 'business@stc.sa', city: 'Riyadh', category: 'Utilities', paymentTermDays: 30, outstandingBalance: 0 } }),
    prisma.vendor.create({ data: { code: 'VND-008', name: 'King Abdulaziz Port (Dammam)', nameAr: 'ميناء الملك عبدالعزيز', contactPerson: 'Port Admin', phone: '+966-13-857-1000', email: 'admin@dammamport.sa', city: 'Dammam', category: 'Port Services', paymentTermDays: 15, outstandingBalance: 42000 } }),
  ]);
  console.log('✅ 8 Vendors created');

  // ==================== JOB CATEGORIES ====================
  console.log('Creating job categories & titles...');
  const categories = await Promise.all([
    prisma.jobCategory.create({ data: { code: 'IMP', name: 'Import Clearance', nameAr: 'تخليص استيراد' } }),
    prisma.jobCategory.create({ data: { code: 'EXP', name: 'Export Clearance', nameAr: 'تخليص تصدير' } }),
    prisma.jobCategory.create({ data: { code: 'FWD', name: 'Freight Forwarding', nameAr: 'شحن بحري/جوي' } }),
    prisma.jobCategory.create({ data: { code: 'TRN', name: 'Transportation', nameAr: 'نقل بري' } }),
    prisma.jobCategory.create({ data: { code: 'WHS', name: 'Warehousing', nameAr: 'تخزين' } }),
  ]);

  const titles = await Promise.all([
    prisma.jobTitle.create({ data: { code: 'IMP-SEA', name: 'Sea Import', nameAr: 'استيراد بحري', categoryId: categories[0].id } }),
    prisma.jobTitle.create({ data: { code: 'IMP-AIR', name: 'Air Import', nameAr: 'استيراد جوي', categoryId: categories[0].id } }),
    prisma.jobTitle.create({ data: { code: 'IMP-LND', name: 'Land Import', nameAr: 'استيراد بري', categoryId: categories[0].id } }),
    prisma.jobTitle.create({ data: { code: 'EXP-SEA', name: 'Sea Export', nameAr: 'تصدير بحري', categoryId: categories[1].id } }),
    prisma.jobTitle.create({ data: { code: 'EXP-AIR', name: 'Air Export', nameAr: 'تصدير جوي', categoryId: categories[1].id } }),
    prisma.jobTitle.create({ data: { code: 'FWD-FCL', name: 'FCL Shipment', nameAr: 'شحن حاوية كاملة', categoryId: categories[2].id } }),
    prisma.jobTitle.create({ data: { code: 'FWD-LCL', name: 'LCL Shipment', nameAr: 'شحن أقل من حاوية', categoryId: categories[2].id } }),
    prisma.jobTitle.create({ data: { code: 'TRN-LOC', name: 'Local Transport', nameAr: 'نقل محلي', categoryId: categories[3].id } }),
    prisma.jobTitle.create({ data: { code: 'TRN-GCC', name: 'GCC Transport', nameAr: 'نقل خليجي', categoryId: categories[3].id } }),
  ]);
  console.log('✅ 5 Categories & 9 Titles created');

  // ==================== JOB CONTROLLERS ====================
  console.log('Creating job controllers...');
  const controllers = await Promise.all([
    prisma.jobController.create({ data: { code: 'CTRL-001', name: 'Salem Al-Otaibi', nameAr: 'سالم العتيبي', phone: '+966-50-111-2233', email: 'salem@fayha-transport.sa' } }),
    prisma.jobController.create({ data: { code: 'CTRL-002', name: 'Nawaf Al-Shammari', nameAr: 'نواف الشمري', phone: '+966-50-222-3344', email: 'nawaf@fayha-transport.sa' } }),
    prisma.jobController.create({ data: { code: 'CTRL-003', name: 'Bandar Al-Ghamdi', nameAr: 'بندر الغامدي', phone: '+966-50-333-4455', email: 'bandar@fayha-transport.sa' } }),
  ]);
  console.log('✅ 3 Job Controllers created');

  // ==================== SALESMEN ====================
  console.log('Creating salesmen...');
  const salesmen = await Promise.all([
    prisma.salesman.create({ data: { code: 'SM-001', name: 'Abdullah Al-Mutairi', nameAr: 'عبدالله المطيري', phone: '+966-55-100-2001', email: 'abdullah.sm@fayha-transport.sa', commission: 3.5 } }),
    prisma.salesman.create({ data: { code: 'SM-002', name: 'Turki Al-Harbi', nameAr: 'تركي الحربي', phone: '+966-55-200-3002', email: 'turki.sm@fayha-transport.sa', commission: 4.0 } }),
    prisma.salesman.create({ data: { code: 'SM-003', name: 'Saud Al-Qahtani', nameAr: 'سعود القحطاني', phone: '+966-55-300-4003', email: 'saud.sm@fayha-transport.sa', commission: 3.0 } }),
  ]);
  console.log('✅ 3 Salesmen created');

  // ==================== INVOICE SERVICES ====================
  console.log('Creating invoice services...');
  const services = await Promise.all([
    // CLEARANCE group
    prisma.invoiceService.create({ data: { code: 'SVC-001', nameEn: 'Clearance Charges', nameAr: 'رسوم التخليص', serviceGroup: 'CLEARANCE', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-002', nameEn: 'Clearance Charge at SILA', nameAr: 'رسوم التخليص في سيلا', serviceGroup: 'CLEARANCE', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-003', nameEn: 'Charges at Origin', nameAr: 'رسوم في بلد المنشأ', serviceGroup: 'CLEARANCE', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-004', nameEn: 'Empty Container Return Charges', nameAr: 'رسوم إرجاع الحاوية الفارغة', serviceGroup: 'CLEARANCE', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-005', nameEn: 'Tabadul Charge', nameAr: 'رسوم تبادل', serviceGroup: 'CLEARANCE', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-006', nameEn: 'Fasah Appointment Fee', nameAr: 'رسوم موعد فسح', serviceGroup: 'CLEARANCE', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-007', nameEn: 'Truck Entry Pass Charges', nameAr: 'رسوم تصريح دخول الشاحنة', serviceGroup: 'CLEARANCE', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-008', nameEn: 'Boarder - Toll Fee', nameAr: 'رسوم عبور الحدود', serviceGroup: 'CLEARANCE', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-009', nameEn: 'Pullout', nameAr: 'سحب الحاوية', serviceGroup: 'CLEARANCE', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-010', nameEn: 'Mukalafa', nameAr: 'مخالفة', serviceGroup: 'CLEARANCE', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-011', nameEn: 'Empty Appointment Fee', nameAr: 'رسوم موعد الحاوية الفارغة', serviceGroup: 'CLEARANCE', defaultAmount: 0 } }),
    // LABOUR group
    prisma.invoiceService.create({ data: { code: 'SVC-012', nameEn: 'Labour and Handling Charges', nameAr: 'رسوم العمالة والمناولة', serviceGroup: 'LABOUR', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-013', nameEn: 'Additional Labour Charges', nameAr: 'رسوم عمالة إضافية', serviceGroup: 'LABOUR', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-014', nameEn: 'Additional Handling Charges', nameAr: 'رسوم مناولة إضافية', serviceGroup: 'LABOUR', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-015', nameEn: 'Labour Charge', nameAr: 'رسوم العمالة', serviceGroup: 'LABOUR', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-016', nameEn: 'Loading & Unloading Charge', nameAr: 'رسوم التحميل والتفريغ', serviceGroup: 'LABOUR', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-017', nameEn: 'Handling Charge', nameAr: 'رسوم المناولة', serviceGroup: 'LABOUR', defaultAmount: 0 } }),
    // DOCUMENTATION group
    prisma.invoiceService.create({ data: { code: 'SVC-018', nameEn: 'Documentation Charges', nameAr: 'رسوم التوثيق', serviceGroup: 'DOCUMENTATION', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-019', nameEn: 'LAB TEST Report Charges', nameAr: 'رسوم تقرير الفحص المخبري', serviceGroup: 'DOCUMENTATION', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-020', nameEn: 'Export Chamber Service', nameAr: 'خدمة الغرفة التجارية للتصدير', serviceGroup: 'DOCUMENTATION', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-021', nameEn: 'Documents Courier Service Charges', nameAr: 'رسوم خدمة بريد المستندات', serviceGroup: 'DOCUMENTATION', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-022', nameEn: 'Translation', nameAr: 'ترجمة', serviceGroup: 'DOCUMENTATION', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-023', nameEn: 'Postage and Delivery', nameAr: 'بريد وتوصيل', serviceGroup: 'DOCUMENTATION', defaultAmount: 0 } }),
    // TRANSPORT group
    prisma.invoiceService.create({ data: { code: 'SVC-024', nameEn: 'TRANSPORTATION', nameAr: 'النقل', serviceGroup: 'TRANSPORT', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-025', nameEn: 'Additional Transportation Charges', nameAr: 'رسوم نقل إضافية', serviceGroup: 'TRANSPORT', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-026', nameEn: 'Weench Truck Charges', nameAr: 'رسوم شاحنة الونش', serviceGroup: 'TRANSPORT', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-027', nameEn: 'Local Transportation Charges', nameAr: 'رسوم النقل المحلي', serviceGroup: 'TRANSPORT', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-028', nameEn: 'International Transportation Charges', nameAr: 'رسوم النقل الدولي', serviceGroup: 'TRANSPORT', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-029', nameEn: 'Storage Transportation', nameAr: 'نقل التخزين', serviceGroup: 'TRANSPORT', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-030', nameEn: 'Transportation', nameAr: 'نقل', serviceGroup: 'TRANSPORT', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-031', nameEn: 'Dumping Container Charges', nameAr: 'رسوم إنزال الحاوية', serviceGroup: 'TRANSPORT', defaultAmount: 0 } }),
    // FREIGHT group
    prisma.invoiceService.create({ data: { code: 'SVC-032', nameEn: 'Air Freight Charges', nameAr: 'رسوم الشحن الجوي', serviceGroup: 'FREIGHT', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-033', nameEn: 'Sea Freight Charges', nameAr: 'رسوم الشحن البحري', serviceGroup: 'FREIGHT', defaultAmount: 0 } }),
    // STORAGE group
    prisma.invoiceService.create({ data: { code: 'SVC-034', nameEn: 'Storage Charges', nameAr: 'رسوم التخزين', serviceGroup: 'STORAGE', defaultAmount: 0 } }),
    // SABER group
    prisma.invoiceService.create({ data: { code: 'SVC-035', nameEn: 'Saber Service Charges (SCOC)', nameAr: 'رسوم خدمة سابر (شهادة مطابقة)', serviceGroup: 'SABER', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-036', nameEn: 'Saber PCOC Services', nameAr: 'خدمات سابر PCOC', serviceGroup: 'SABER', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-037', nameEn: 'SFDA Service Charges', nameAr: 'رسوم خدمة الغذاء والدواء', serviceGroup: 'SABER', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-038', nameEn: 'Saber Expense', nameAr: 'مصاريف سابر', serviceGroup: 'SABER', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-039', nameEn: 'SFDA&FASAH REGISTRATION CHARGE', nameAr: 'رسوم تسجيل هيئة الغذاء والدواء وفسح', serviceGroup: 'SABER', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-040', nameEn: 'SABER DOCUMENTATION & SADAD PAYMENT', nameAr: 'توثيق سابر ودفع سداد', serviceGroup: 'SABER', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-041', nameEn: 'SASO PAYMENT', nameAr: 'دفع هيئة المواصفات والمقاييس', serviceGroup: 'SABER', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-042', nameEn: 'SADAD PAYMENTS', nameAr: 'مدفوعات سداد', serviceGroup: 'SABER', defaultAmount: 0 } }),
    // EQUIPMENT group
    prisma.invoiceService.create({ data: { code: 'SVC-043', nameEn: 'Crane Charges', nameAr: 'رسوم الرافعة', serviceGroup: 'EQUIPMENT', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-044', nameEn: 'Lashing Service Charges', nameAr: 'رسوم خدمة الربط', serviceGroup: 'EQUIPMENT', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-045', nameEn: 'Forklift Charges', nameAr: 'رسوم الرافعة الشوكية', serviceGroup: 'EQUIPMENT', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-046', nameEn: 'LASHING BELT', nameAr: 'حزام الربط', serviceGroup: 'EQUIPMENT', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-047', nameEn: 'Purchase Safety Helmet', nameAr: 'شراء خوذة سلامة', serviceGroup: 'EQUIPMENT', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-048', nameEn: 'Purchase Safety Jacket', nameAr: 'شراء سترة سلامة', serviceGroup: 'EQUIPMENT', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-049', nameEn: 'RENTAL EQUIPMENTS', nameAr: 'تأجير معدات', serviceGroup: 'EQUIPMENT', defaultAmount: 0 } }),
    // INTERNAL group
    prisma.invoiceService.create({ data: { code: 'SVC-050', nameEn: 'Internal Clearance Charges (Branch)', nameAr: 'رسوم التخليص الداخلي (الفرع)', serviceGroup: 'INTERNAL', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-051', nameEn: 'Internal Additional Transportation Charges (BRANCH)', nameAr: 'رسوم نقل إضافية داخلية (الفرع)', serviceGroup: 'INTERNAL', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-052', nameEn: 'Internal Storage Charges', nameAr: 'رسوم التخزين الداخلي', serviceGroup: 'INTERNAL', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-053', nameEn: 'Internal Branch Truck Entry Pass Charges', nameAr: 'رسوم تصريح دخول شاحنة الفرع الداخلي', serviceGroup: 'INTERNAL', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-054', nameEn: 'Internal Saber PCOC Services', nameAr: 'خدمات سابر PCOC الداخلية', serviceGroup: 'INTERNAL', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-055', nameEn: 'Internal Transportation Charges (BRANCH)', nameAr: 'رسوم النقل الداخلي (الفرع)', serviceGroup: 'INTERNAL', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-056', nameEn: 'Internal Labour Charges (BRANCH)', nameAr: 'رسوم العمالة الداخلية (الفرع)', serviceGroup: 'INTERNAL', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-057', nameEn: 'Internal Documentation Charges (BRANCH)', nameAr: 'رسوم التوثيق الداخلي (الفرع)', serviceGroup: 'INTERNAL', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-058', nameEn: 'Internal Additional Labour Charges (BRANCH)', nameAr: 'رسوم عمالة إضافية داخلية (الفرع)', serviceGroup: 'INTERNAL', defaultAmount: 0 } }),
    // OTHER group
    prisma.invoiceService.create({ data: { code: 'SVC-059', nameEn: 'Local Purchase', nameAr: 'مشتريات محلية', serviceGroup: 'OTHER', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-060', nameEn: 'Sample Collection Charge', nameAr: 'رسوم جمع العينات', serviceGroup: 'OTHER', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-061', nameEn: 'SGP-Reefer Monitoring Charges', nameAr: 'رسوم مراقبة حاويات التبريد', serviceGroup: 'OTHER', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-062', nameEn: 'Container Cleaning Charges', nameAr: 'رسوم تنظيف الحاوية', serviceGroup: 'OTHER', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-063', nameEn: 'Container Shifting Charge', nameAr: 'رسوم نقل الحاوية', serviceGroup: 'OTHER', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-064', nameEn: 'Other Charges', nameAr: 'رسوم أخرى', serviceGroup: 'OTHER', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-065', nameEn: 'IPS CHARGES', nameAr: 'رسوم IPS', serviceGroup: 'OTHER', defaultAmount: 0 } }),
    prisma.invoiceService.create({ data: { code: 'SVC-066', nameEn: 'Waiting Charge', nameAr: 'رسوم الانتظار', serviceGroup: 'OTHER', defaultAmount: 0 } }),
  ]);
  console.log('✅ 66 Invoice Services created');

  // ==================== TERMINALS ====================
  console.log('Creating terminals...');
  await prisma.terminal.createMany({
    data: [
      { code: 'SAJED-1', name: 'Jeddah Islamic Port - Terminal 1', nameAr: 'ميناء جدة الإسلامي - محطة 1', port: 'Jeddah Islamic Port', city: 'Jeddah' },
      { code: 'SAJED-2', name: 'Jeddah Islamic Port - Container Terminal', nameAr: 'ميناء جدة - محطة الحاويات', port: 'Jeddah Islamic Port', city: 'Jeddah' },
      { code: 'SADAM-1', name: 'King Abdulaziz Port - Terminal 1', nameAr: 'ميناء الملك عبدالعزيز - محطة 1', port: 'King Abdulaziz Port', city: 'Dammam' },
      { code: 'SADAM-2', name: 'King Abdulaziz Port - RCTL', nameAr: 'ميناء الدمام - محطة الحاويات', port: 'King Abdulaziz Port', city: 'Dammam' },
      { code: 'SARUH', name: 'King Fahad Industrial Port', nameAr: 'ميناء الملك فهد الصناعي', port: 'Jubail Commercial Port', city: 'Jubail' },
      { code: 'SARYD', name: 'Riyadh Dry Port', nameAr: 'ميناء الرياض الجاف', port: 'Dry Port', city: 'Riyadh' },
      { code: 'SAKFI', name: 'King Fahad International Airport', nameAr: 'مطار الملك فهد الدولي', port: 'Air Port', city: 'Dammam' },
      { code: 'SAKJA', name: 'King Abdulaziz International Airport', nameAr: 'مطار الملك عبدالعزيز الدولي', port: 'Air Port', city: 'Jeddah' },
    ]
  });
  console.log('✅ 8 Terminals created');

  // ==================== PORT HANDLING ====================
  console.log('Creating port handling entries...');
  await prisma.portHandling.createMany({
    data: [
      { code: 'PH-001', name: 'Container Loading 20ft', nameAr: 'تحميل حاوية 20 قدم', portName: 'Jeddah', handlingType: 'LOADING', defaultRate: 1500 },
      { code: 'PH-002', name: 'Container Loading 40ft', nameAr: 'تحميل حاوية 40 قدم', portName: 'Jeddah', handlingType: 'LOADING', defaultRate: 2200 },
      { code: 'PH-003', name: 'Container Unloading 20ft', nameAr: 'تفريغ حاوية 20 قدم', portName: 'Dammam', handlingType: 'UNLOADING', defaultRate: 1500 },
      { code: 'PH-004', name: 'Container Unloading 40ft', nameAr: 'تفريغ حاوية 40 قدم', portName: 'Dammam', handlingType: 'UNLOADING', defaultRate: 2200 },
      { code: 'PH-005', name: 'Reefer Plug-in', nameAr: 'توصيل مبرد', portName: 'Jeddah', handlingType: 'REEFER', defaultRate: 800 },
      { code: 'PH-006', name: 'Hazmat Handling', nameAr: 'مناولة مواد خطرة', portName: 'Jubail', handlingType: 'HAZMAT', defaultRate: 4500 },
    ]
  });
  console.log('✅ 6 Port Handling entries created');

  // ==================== FCL/LCL ====================
  console.log('Creating FCL/LCL types...');
  await prisma.fclLcl.createMany({
    data: [
      { code: 'FCL-20', name: 'FCL 20ft Standard', containerType: '20GP', defaultRate: 3500 },
      { code: 'FCL-40', name: 'FCL 40ft Standard', containerType: '40GP', defaultRate: 5500 },
      { code: 'FCL-40HC', name: 'FCL 40ft High Cube', containerType: '40HC', defaultRate: 6000 },
      { code: 'FCL-20RF', name: 'FCL 20ft Reefer', containerType: '20RF', defaultRate: 5500 },
      { code: 'FCL-40RF', name: 'FCL 40ft Reefer', containerType: '40RF', defaultRate: 8000 },
      { code: 'LCL', name: 'LCL (Less than Container)', containerType: 'LCL', defaultRate: 85 },
      { code: 'FCL-20OT', name: 'FCL 20ft Open Top', containerType: '20OT', defaultRate: 4500 },
      { code: 'FCL-40FR', name: 'FCL 40ft Flat Rack', containerType: '40FR', defaultRate: 7000 },
    ]
  });
  console.log('✅ 8 FCL/LCL types created');

  // ==================== FISCAL YEAR ====================
  console.log('Creating fiscal year...');
  const fy = await prisma.fiscalYear.create({
    data: {
      name: 'FY 2026',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      isCurrent: true,
      status: 'OPEN',
    }
  });

  for (let m = 0; m < 12; m++) {
    const start = new Date(2026, m, 1);
    const end = new Date(2026, m + 1, 0);
    await prisma.fiscalPeriod.create({
      data: {
        fiscalYearId: fy.id,
        name: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        periodNumber: m + 1,
        startDate: start,
        endDate: end,
        status: 'OPEN',
      }
    });
  }
  console.log('✅ Fiscal year & 12 periods created');

  // ==================== JOB REFERENCES ====================
  console.log('Creating job references...');
  const jobRefs = await Promise.all([
    prisma.jobReference.create({
      data: {
        jobNumber: 'JOB-2026-0001', status: 'COMPLETED', clientId: customers[0].id, consigneeId: consignees[0].id,
        direction: 'IMPORT', modeOfTransport: 'SEA', categoryId: categories[0].id, titleId: titles[0].id,
        salesmanId: salesmen[0].id, controllerId: controllers[0].id,
        awbBl: 'MAEU12345678', origin: 'Shanghai, China', destination: 'Jeddah, Saudi Arabia',
        pol: 'CNSHA', pod: 'SAJED', shipper: 'IKEA Global Supply',
        commercialInvoiceNo: 'CI-2026-1001', commercialInvoiceValue: 285000, grossWeight: 18500, netWeight: 17200, packages: 450,
        containers: { create: [
          { containerNumber: 'MAEU1234567', containerType: '40HC', sealNumber: 'SL001234', weight: 9500 },
          { containerNumber: 'MAEU7654321', containerType: '40HC', sealNumber: 'SL005678', weight: 9000 },
        ]}
      }
    }),
    prisma.jobReference.create({
      data: {
        jobNumber: 'JOB-2026-0002', status: 'IN_PROGRESS', clientId: customers[1].id, consigneeId: consignees[1].id,
        direction: 'IMPORT', modeOfTransport: 'SEA', categoryId: categories[0].id, titleId: titles[0].id,
        salesmanId: salesmen[1].id, controllerId: controllers[1].id,
        awbBl: 'OOLU98765432', origin: 'Dubai, UAE', destination: 'Dammam, Saudi Arabia',
        pol: 'AEJEA', pod: 'SADAM', shipper: 'Panda Trading FZCO',
        commercialInvoiceNo: 'CI-2026-1002', commercialInvoiceValue: 175000, grossWeight: 12000, packages: 280,
        containers: { create: [
          { containerNumber: 'OOLU5551234', containerType: '20GP', sealNumber: 'SL009876', weight: 12000 },
        ]}
      }
    }),
    prisma.jobReference.create({
      data: {
        jobNumber: 'JOB-2026-0003', status: 'OPEN', clientId: customers[2].id, consigneeId: consignees[2].id,
        direction: 'IMPORT', modeOfTransport: 'SEA', categoryId: categories[2].id, titleId: titles[5].id,
        salesmanId: salesmen[2].id, controllerId: controllers[2].id,
        awbBl: 'HLCU77788899', origin: 'Houston, USA', destination: 'Jubail, Saudi Arabia',
        pol: 'USHOU', pod: 'SARUH', shipper: 'SABIC Americas Inc.',
        commercialInvoiceNo: 'CI-2026-1003', commercialInvoiceValue: 520000, grossWeight: 42000, packages: 150, pallets: 50,
        isHazardous: true,
        containers: { create: [
          { containerNumber: 'HLCU1112233', containerType: '20GP', sealNumber: 'SL111222', weight: 21000 },
          { containerNumber: 'HLCU4445566', containerType: '20GP', sealNumber: 'SL333444', weight: 21000 },
        ]}
      }
    }),
    prisma.jobReference.create({
      data: {
        jobNumber: 'JOB-2026-0004', status: 'IN_PROGRESS', clientId: customers[5].id, consigneeId: consignees[3].id,
        direction: 'IMPORT', modeOfTransport: 'AIR', categoryId: categories[0].id, titleId: titles[1].id,
        salesmanId: salesmen[0].id, controllerId: controllers[0].id,
        awbBl: '176-12345678', origin: 'Amsterdam, Netherlands', destination: 'Riyadh, Saudi Arabia',
        pol: 'NLAMS', pod: 'SARYD', shipper: 'Almarai Europe BV',
        airline: 'Saudia Cargo', flightNumber: 'SV6723',
        commercialInvoiceNo: 'CI-2026-1004', commercialInvoiceValue: 95000, grossWeight: 3200, packages: 120,
      }
    }),
    prisma.jobReference.create({
      data: {
        jobNumber: 'JOB-2026-0005', status: 'COMPLETED', clientId: customers[6].id, consigneeId: consignees[4].id,
        direction: 'EXPORT', modeOfTransport: 'SEA', categoryId: categories[1].id, titleId: titles[3].id,
        salesmanId: salesmen[1].id, controllerId: controllers[1].id,
        awbBl: 'EGLV44556677', origin: 'Jubail, Saudi Arabia', destination: 'Mumbai, India',
        pol: 'SARUH', pod: 'INNSA', shipper: 'Saudi Aramco',
        commercialInvoiceNo: 'CI-2026-1005', commercialInvoiceValue: 780000, grossWeight: 65000, packages: 80,
        containers: { create: [
          { containerNumber: 'EGLV1234001', containerType: '20GP', sealNumber: 'SL501001', weight: 22000 },
          { containerNumber: 'EGLV1234002', containerType: '20GP', sealNumber: 'SL501002', weight: 22000 },
          { containerNumber: 'EGLV1234003', containerType: '20GP', sealNumber: 'SL501003', weight: 21000 },
        ]}
      }
    }),
  ]);
  console.log('✅ 5 Job References with containers created');

  // ==================== SALES INVOICES ====================
  console.log('Creating sales invoices...');
  await prisma.salesInvoice.create({
    data: {
      invoiceNumber: 'SINV-2026-0001', clientId: customers[0].id, jobReferenceId: jobRefs[0].id,
      salesmanId: salesmen[0].id, invoiceDate: new Date('2026-01-15'), dueDate: new Date('2026-02-14'),
      saleMethod: 'CREDIT', subtotal: 9100, vatRate: 0.15, vatAmount: 1365, totalAmount: 10465, balanceDue: 10465,
      status: 'SENT',
      items: { create: [
        { lineNumber: 1, serviceId: services[0].id, nameEn: 'Clearance Charges', nameAr: 'رسوم التخليص', amount: 1500, vatRate: 0.15, vatAmount: 225, totalAmount: 1725 },
        { lineNumber: 2, serviceId: services[11].id, nameEn: 'Labour and Handling Charges', nameAr: 'رسوم العمالة والمناولة', amount: 2800, vatRate: 0.15, vatAmount: 420, totalAmount: 3220 },
        { lineNumber: 3, serviceId: services[25].id, nameEn: 'Local Transportation Charges', nameAr: 'رسوم النقل المحلي', amount: 3500, vatRate: 0.15, vatAmount: 525, totalAmount: 4025 },
        { lineNumber: 4, serviceId: services[17].id, nameEn: 'Documentation Charges', nameAr: 'رسوم التوثيق', amount: 500, vatRate: 0.15, vatAmount: 75, totalAmount: 575 },
        { lineNumber: 5, serviceId: services[6].id, nameEn: 'Truck Entry Pass Charges', nameAr: 'رسوم تصريح دخول الشاحنة', amount: 350, vatRate: 0.15, vatAmount: 52.5, totalAmount: 402.5 },
        { lineNumber: 6, serviceId: services[41].id, nameEn: 'SASO Payment', nameAr: 'دفع ساسو', amount: 450, vatRate: 0.15, vatAmount: 67.5, totalAmount: 517.5 },
      ]}
    }
  });

  await prisma.salesInvoice.create({
    data: {
      invoiceNumber: 'SINV-2026-0002', clientId: customers[1].id, jobReferenceId: jobRefs[1].id,
      salesmanId: salesmen[1].id, invoiceDate: new Date('2026-01-28'), dueDate: new Date('2026-02-12'),
      saleMethod: 'CREDIT', subtotal: 5650, vatRate: 0.15, vatAmount: 847.5, totalAmount: 6497.5, balanceDue: 6497.5,
      status: 'DRAFT',
      items: { create: [
        { lineNumber: 1, serviceId: services[0].id, nameEn: 'Clearance Charges', nameAr: 'رسوم التخليص', amount: 1500, vatRate: 0.15, vatAmount: 225, totalAmount: 1725 },
        { lineNumber: 2, serviceId: services[11].id, nameEn: 'Labour and Handling Charges', nameAr: 'رسوم العمالة والمناولة', amount: 2800, vatRate: 0.15, vatAmount: 420, totalAmount: 3220 },
        { lineNumber: 3, serviceId: services[17].id, nameEn: 'Documentation Charges', nameAr: 'رسوم التوثيق', amount: 350, vatRate: 0.15, vatAmount: 52.5, totalAmount: 402.5 },
        { lineNumber: 4, serviceId: services[30].id, nameEn: 'Sea Freight Charges', nameAr: 'رسوم الشحن البحري', amount: 1000, vatRate: 0.15, vatAmount: 150, totalAmount: 1150 },
      ]}
    }
  });

  await prisma.salesInvoice.create({
    data: {
      invoiceNumber: 'SINV-2026-0003', clientId: customers[6].id, jobReferenceId: jobRefs[4].id,
      salesmanId: salesmen[1].id, invoiceDate: new Date('2026-02-01'), dueDate: new Date('2026-04-01'),
      saleMethod: 'CREDIT', subtotal: 15500, vatRate: 0.15, vatAmount: 2325, totalAmount: 17825, balanceDue: 0, paidAmount: 17825,
      status: 'PAID',
      items: { create: [
        { lineNumber: 1, serviceId: services[0].id, nameEn: 'Clearance Charges', nameAr: 'رسوم التخليص', amount: 2500, vatRate: 0.15, vatAmount: 375, totalAmount: 2875 },
        { lineNumber: 2, serviceId: services[30].id, nameEn: 'Sea Freight Charges', nameAr: 'رسوم الشحن البحري', amount: 8500, vatRate: 0.15, vatAmount: 1275, totalAmount: 9775 },
        { lineNumber: 3, serviceId: services[11].id, nameEn: 'Labour and Handling Charges', nameAr: 'رسوم العمالة والمناولة', amount: 4500, vatRate: 0.15, vatAmount: 675, totalAmount: 5175 },
      ]}
    }
  });
  console.log('✅ 3 Sales Invoices created');

  // ==================== SHIPMENTS ====================
  console.log('Creating shipments...');
  await prisma.shipment.createMany({
    data: [
      { shipmentNumber: 'SHP-2026-0001', origin: 'Shanghai, China', destination: 'Jeddah, KSA', status: 'DELIVERED', modeOfTransport: 'SEA', carrier: 'Maersk Line', etd: new Date('2026-01-01'), eta: new Date('2026-01-20'), atd: new Date('2026-01-01'), ata: new Date('2026-01-19') },
      { shipmentNumber: 'SHP-2026-0002', origin: 'Dubai, UAE', destination: 'Dammam, KSA', status: 'IN_TRANSIT', modeOfTransport: 'SEA', carrier: 'OOCL', etd: new Date('2026-02-05'), eta: new Date('2026-02-08') },
      { shipmentNumber: 'SHP-2026-0003', origin: 'Houston, USA', destination: 'Jubail, KSA', status: 'IN_TRANSIT', modeOfTransport: 'SEA', carrier: 'Hapag-Lloyd', etd: new Date('2026-01-25'), eta: new Date('2026-02-20') },
      { shipmentNumber: 'SHP-2026-0004', origin: 'Amsterdam, Netherlands', destination: 'Riyadh, KSA', status: 'IN_TRANSIT', modeOfTransport: 'AIR', carrier: 'Saudia Cargo', etd: new Date('2026-02-10'), eta: new Date('2026-02-11') },
      { shipmentNumber: 'SHP-2026-0005', origin: 'Jubail, KSA', destination: 'Mumbai, India', status: 'DELIVERED', modeOfTransport: 'SEA', carrier: 'Evergreen', etd: new Date('2026-01-10'), eta: new Date('2026-01-25'), atd: new Date('2026-01-10'), ata: new Date('2026-01-24') },
    ]
  });
  console.log('✅ 5 Shipments created');

  // ==================== DAILY WORK ORDERS ====================
  console.log('Creating daily work orders...');
  await prisma.dailyWorkOrder.createMany({
    data: [
      { orderNumber: 'DWO-2026-0001', date: new Date('2026-02-13'), assignedTo: 'Salem Al-Otaibi', description: 'Customs clearance for JOB-2026-0002 at Dammam Port', location: 'King Abdulaziz Port, Dammam', status: 'IN_PROGRESS', priority: 'HIGH' },
      { orderNumber: 'DWO-2026-0002', date: new Date('2026-02-13'), assignedTo: 'Nawaf Al-Shammari', description: 'Collect container OOLU5551234 from Dammam Port', location: 'King Abdulaziz Port, Dammam', status: 'PENDING', priority: 'HIGH' },
      { orderNumber: 'DWO-2026-0003', date: new Date('2026-02-13'), assignedTo: 'Driver - Faisal', description: 'Deliver 2 containers to IKEA Distribution Center, Riyadh', location: 'Industrial Area 2, Riyadh', status: 'COMPLETED', priority: 'NORMAL', completedAt: new Date('2026-02-13T14:30:00') },
      { orderNumber: 'DWO-2026-0004', date: new Date('2026-02-14'), assignedTo: 'Bandar Al-Ghamdi', description: 'SABIC hazmat clearance documentation for JOB-2026-0003', location: 'Jubail Commercial Port', status: 'PENDING', priority: 'URGENT' },
      { orderNumber: 'DWO-2026-0005', date: new Date('2026-02-14'), assignedTo: 'Salem Al-Otaibi', description: 'Air cargo clearance at KFIA for Almarai shipment', location: 'King Fahad International Airport', status: 'PENDING', priority: 'HIGH' },
    ]
  });
  console.log('✅ 5 Daily Work Orders created');

  // ==================== SALES QUOTES ====================
  console.log('Creating sales quotes...');
  await prisma.salesQuote.createMany({
    data: [
      { quoteNumber: 'SQ-2026-0001', clientName: 'New Vision Trading', clientEmail: 'info@newvision.sa', clientPhone: '+966-11-555-1234', quoteDate: new Date('2026-02-10'), validUntil: new Date('2026-03-10'), subtotal: 12500, vatAmount: 1875, totalAmount: 14375, status: 'SENT', items: JSON.stringify([{ service: 'Full Import Clearance Package', amount: 12500 }]) },
      { quoteNumber: 'SQ-2026-0002', clientName: 'Gulf Petrochemical Co.', clientEmail: 'logistics@gulfpetro.sa', clientPhone: '+966-13-444-5678', quoteDate: new Date('2026-02-11'), validUntil: new Date('2026-03-11'), subtotal: 28000, vatAmount: 4200, totalAmount: 32200, status: 'DRAFT', items: JSON.stringify([{ service: 'Hazmat Import Clearance', amount: 15000 }, { service: 'Special Transport', amount: 13000 }]) },
      { quoteNumber: 'SQ-2026-0003', clientName: 'Jarir Bookstore', clientEmail: 'imports@jarir.sa', clientPhone: '+966-11-211-0003', quoteDate: new Date('2026-02-12'), validUntil: new Date('2026-03-12'), subtotal: 8500, vatAmount: 1275, totalAmount: 9775, status: 'ACCEPTED', items: JSON.stringify([{ service: 'Air Import Clearance', amount: 5000 }, { service: 'Local Delivery', amount: 3500 }]) },
    ]
  });
  console.log('✅ 3 Sales Quotes created');

  // ==================== FILE VERIFICATIONS ====================
  console.log('Creating file verifications...');
  await prisma.fileVerification.createMany({
    data: [
      { fileNumber: 'FV-2026-0001', jobReferenceNum: 'JOB-2026-0001', clientName: 'IKEA Saudi Arabia', documentType: 'Bill of Lading', status: 'VERIFIED', verifiedBy: 'Ahmed Al-Rashidi', verifiedAt: new Date('2026-01-16') },
      { fileNumber: 'FV-2026-0002', jobReferenceNum: 'JOB-2026-0001', clientName: 'IKEA Saudi Arabia', documentType: 'Commercial Invoice', status: 'VERIFIED', verifiedBy: 'Ahmed Al-Rashidi', verifiedAt: new Date('2026-01-16') },
      { fileNumber: 'FV-2026-0003', jobReferenceNum: 'JOB-2026-0002', clientName: 'Panda Retail Company', documentType: 'Bill of Lading', status: 'PENDING' },
      { fileNumber: 'FV-2026-0004', jobReferenceNum: 'JOB-2026-0003', clientName: 'SABIC Logistics', documentType: 'MSDS Certificate', status: 'PENDING', notes: 'Hazmat documentation required' },
      { fileNumber: 'FV-2026-0005', jobReferenceNum: 'JOB-2026-0004', clientName: 'Almarai Company', documentType: 'Airway Bill', status: 'IN_REVIEW', verifiedBy: 'Sara Al-Otaibi' },
    ]
  });
  console.log('✅ 5 File Verifications created');

  // ==================== CRM LEADS ====================
  console.log('Creating CRM leads...');
  await prisma.cRMLead.createMany({
    data: [
      { name: 'Hassan Al-Qahtani', company: 'Al-Qahtani Imports', email: 'hassan@alqahtani.sa', phone: '+966-55-678-9012', source: 'REFERRAL', status: 'QUALIFIED', priority: 'HIGH', assignedTo: 'Abdullah Al-Mutairi', nextFollowUp: new Date('2026-02-15'), notes: 'Interested in full clearance package for electronics import from China' },
      { name: 'Nora Al-Fahad', company: 'Nora Fashion House', email: 'nora@norafashion.sa', phone: '+966-50-123-4567', source: 'WEBSITE', status: 'NEW', priority: 'MEDIUM', notes: 'Textile imports from Turkey, needs air freight quotes' },
      { name: 'Mansour Trading Group', company: 'Mansour Trading', email: 'info@mansour-trade.sa', phone: '+966-11-333-4444', source: 'COLD_CALL', status: 'CONTACTED', priority: 'HIGH', assignedTo: 'Turki Al-Harbi', nextFollowUp: new Date('2026-02-18'), notes: 'Large volume FMCG imports, potential monthly contract' },
      { name: 'Dr. Ahmed Pharmacy', company: 'Ahmed Pharma Ltd', email: 'supply@ahmedpharma.sa', phone: '+966-12-555-6789', source: 'EXHIBITION', status: 'NEW', priority: 'LOW', notes: 'Pharmaceutical imports, requires cold chain logistics' },
    ]
  });
  console.log('✅ 4 CRM Leads created');

  // ==================== EXPENSE ENTRIES ====================
  console.log('Creating expense entries...');
  await prisma.expenseEntry.createMany({
    data: [
      { expenseNumber: 'EXP-2026-0001', date: new Date('2026-01-15'), amount: 3500, vatAmount: 525, totalAmount: 4025, paymentMethod: 'BANK_TRANSFER', category: 'Fuel', description: 'Monthly diesel for fleet vehicles', reference: 'FUEL-JAN-2026', status: 'APPROVED', jobRefId: jobRefs[0].id },
      { expenseNumber: 'EXP-2026-0002', date: new Date('2026-01-20'), amount: 8500, vatAmount: 1275, totalAmount: 9775, paymentMethod: 'BANK_TRANSFER', category: 'Port Charges', description: 'Jeddah Port terminal handling for JOB-2026-0001', reference: 'PORT-001', status: 'APPROVED', jobRefId: jobRefs[0].id },
      { expenseNumber: 'EXP-2026-0003', date: new Date('2026-02-01'), amount: 2200, vatAmount: 330, totalAmount: 2530, paymentMethod: 'CASH', category: 'Maintenance', description: 'Truck repair - vehicle plate BHA 1234', reference: 'MNT-FEB-001', status: 'PENDING', jobRefId: jobRefs[1].id },
      { expenseNumber: 'EXP-2026-0004', date: new Date('2026-02-05'), amount: 1200, vatAmount: 180, totalAmount: 1380, paymentMethod: 'BANK_TRANSFER', category: 'Office', description: 'Office supplies and printer cartridges', reference: 'OFF-FEB-001', status: 'APPROVED' },
      { expenseNumber: 'EXP-2026-0005', date: new Date('2026-02-10'), amount: 45000, vatAmount: 6750, totalAmount: 51750, paymentMethod: 'BANK_TRANSFER', category: 'Government Fees', description: 'Customs duties for SABIC import JOB-2026-0003', reference: 'CUST-003', status: 'PENDING', jobRefId: jobRefs[2].id },
    ]
  });
  console.log('✅ 5 Expense Entries created (linked to job references)');

  // Update job references with financial fields
  await prisma.jobReference.update({ where: { id: jobRefs[0].id }, data: { totalPayableCost: 13800, containerDetention: 0, estimatedCost: 15000, shipmentProcessCost: 9775 } });
  await prisma.jobReference.update({ where: { id: jobRefs[1].id }, data: { totalPayableCost: 2530, containerDetention: 500, estimatedCost: 8000, shipmentProcessCost: 2530 } });
  await prisma.jobReference.update({ where: { id: jobRefs[2].id }, data: { totalPayableCost: 51750, containerDetention: 0, estimatedCost: 55000, shipmentProcessCost: 45000 } });
  await prisma.jobReference.update({ where: { id: jobRefs[4].id }, data: { totalPayableCost: 12000, containerDetention: 2500, estimatedCost: 18000, shipmentProcessCost: 10000 } });
  console.log('✅ Job References updated with financial fields');

  // ==================== JOURNAL ENTRIES ====================
  console.log('Creating journal entries...');

  // Fetch created accounts and fiscal periods for journal entries
  const dbAccounts = await prisma.account.findMany({ orderBy: { code: 'asc' } });
  const janPeriod = await prisma.fiscalPeriod.findFirst({ where: { periodNumber: 1, fiscalYearId: fy.id } });
  const febPeriod = await prisma.fiscalPeriod.findFirst({ where: { periodNumber: 2, fiscalYearId: fy.id } });

  // Helper: account indices match the seed order (sorted by code asc)
  // 0=Cash(1010), 1=AlRajhi(1020), 2=SNB(1021), 7=AR(1100), 9=InputVAT(1210),
  // 15=AP(2010), 16=AccruedExp(2020), 17=VATPayable(2030), 18=SalariesPayable(2040), 19=CustomsDuties(2050),
  // 26=TransportRevenue(4010), 27=CustomsFees(4020), 28=FreightIncome(4030), 29=ContainerRevenue(4040),
  // 33=DriverSalaries(5010), 34=StaffSalaries(5020), 37=CustomsGovFees(5050), 38=PortCharges(5060),
  // 41=Insurance(5090)

  // JE-1: Revenue recognition - Sales invoice posting (IKEA transport services)
  const je1 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2026-0001',
      date: new Date('2026-01-10'),
      description: 'Revenue recognition - IKEA transport invoice INV-2026-0001',
      reference: 'INV-2026-0001',
      referenceType: 'SALES_INVOICE',
      totalDebit: 57500,
      totalCredit: 57500,
      status: 'POSTED',
      postedAt: new Date('2026-01-10'),
      fiscalPeriodId: janPeriod!.id,
      createdById: admin.id,
      approvedById: admin.id,
      approvedAt: new Date('2026-01-10'),
      lines: {
        create: [
          { lineNumber: 1, accountId: dbAccounts[7].id, debitAmount: 57500, creditAmount: 0, description: 'IKEA - Accounts Receivable', customerId: customers[0].id },
          { lineNumber: 2, accountId: dbAccounts[26].id, debitAmount: 0, creditAmount: 50000, description: 'Transportation revenue - IKEA shipment' },
          { lineNumber: 3, accountId: dbAccounts[17].id, debitAmount: 0, creditAmount: 7500, description: 'Output VAT 15%' },
        ]
      }
    }
  });

  // JE-2: Customs duties expense (SABIC import clearance)
  const je2 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2026-0002',
      date: new Date('2026-01-15'),
      description: 'Customs duties - SABIC import clearance JOB-2026-0003',
      reference: 'CUST-DUTY-001',
      referenceType: 'EXPENSE',
      totalDebit: 45000,
      totalCredit: 45000,
      status: 'POSTED',
      postedAt: new Date('2026-01-15'),
      fiscalPeriodId: janPeriod!.id,
      createdById: admin.id,
      approvedById: admin.id,
      approvedAt: new Date('2026-01-15'),
      lines: {
        create: [
          { lineNumber: 1, accountId: dbAccounts[37].id, debitAmount: 45000, creditAmount: 0, description: 'Customs & government fees - SABIC import' },
          { lineNumber: 2, accountId: dbAccounts[19].id, debitAmount: 0, creditAmount: 45000, description: 'Customs duties payable', vendorId: vendors[0].id },
        ]
      }
    }
  });

  // JE-3: Port & terminal charges (Jeddah Port handling)
  const je3 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2026-0003',
      date: new Date('2026-01-20'),
      description: 'Port charges - Jeddah terminal handling for IKEA shipment',
      reference: 'PORT-JED-001',
      referenceType: 'EXPENSE',
      totalDebit: 9775,
      totalCredit: 9775,
      status: 'POSTED',
      postedAt: new Date('2026-01-20'),
      fiscalPeriodId: janPeriod!.id,
      createdById: admin.id,
      approvedById: admin.id,
      approvedAt: new Date('2026-01-20'),
      lines: {
        create: [
          { lineNumber: 1, accountId: dbAccounts[38].id, debitAmount: 8500, creditAmount: 0, description: 'Port & terminal charges - Jeddah' },
          { lineNumber: 2, accountId: dbAccounts[9].id, debitAmount: 1275, creditAmount: 0, description: 'Input VAT on port charges' },
          { lineNumber: 3, accountId: dbAccounts[15].id, debitAmount: 0, creditAmount: 9775, description: 'Accounts payable - Jeddah Islamic Port', vendorId: vendors[1].id },
        ]
      }
    }
  });

  // JE-4: Client advance receipt (Aramco advance payment)
  const je4 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2026-0004',
      date: new Date('2026-01-05'),
      description: 'Client advance received - Saudi Aramco Base Oil export services',
      reference: 'ADV-2026-0002',
      referenceType: 'CLIENT_ADVANCE',
      totalDebit: 100000,
      totalCredit: 100000,
      status: 'POSTED',
      postedAt: new Date('2026-01-05'),
      fiscalPeriodId: janPeriod!.id,
      createdById: admin.id,
      approvedById: admin.id,
      approvedAt: new Date('2026-01-05'),
      lines: {
        create: [
          { lineNumber: 1, accountId: dbAccounts[1].id, debitAmount: 100000, creditAmount: 0, description: 'Cash received - Al Rajhi Bank' },
          { lineNumber: 2, accountId: dbAccounts[16].id, debitAmount: 0, creditAmount: 100000, description: 'Client advance liability - Aramco', customerId: customers[6].id },
        ]
      }
    }
  });

  // JE-5: Payment received from customer (Panda Retail - AR collection)
  const je5 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2026-0005',
      date: new Date('2026-01-25'),
      description: 'Payment received - Panda Retail outstanding balance',
      reference: 'RCV-2026-0001',
      referenceType: 'PAYMENT',
      totalDebit: 87000,
      totalCredit: 87000,
      status: 'POSTED',
      postedAt: new Date('2026-01-25'),
      fiscalPeriodId: janPeriod!.id,
      createdById: admin.id,
      approvedById: admin.id,
      approvedAt: new Date('2026-01-25'),
      lines: {
        create: [
          { lineNumber: 1, accountId: dbAccounts[1].id, debitAmount: 87000, creditAmount: 0, description: 'Payment deposited - Al Rajhi Bank' },
          { lineNumber: 2, accountId: dbAccounts[7].id, debitAmount: 0, creditAmount: 87000, description: 'Accounts receivable - Panda Retail', customerId: customers[1].id },
        ]
      }
    }
  });

  // JE-6: Vendor bill posting (Gulf Auto Workshop - vehicle maintenance)
  const je6 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2026-0006',
      date: new Date('2026-02-01'),
      description: 'Vendor bill - Gulf Auto Workshop vehicle maintenance',
      reference: 'BILL-2026-0001',
      referenceType: 'BILL',
      totalDebit: 2530,
      totalCredit: 2530,
      status: 'POSTED',
      postedAt: new Date('2026-02-01'),
      fiscalPeriodId: febPeriod!.id,
      createdById: admin.id,
      approvedById: admin.id,
      approvedAt: new Date('2026-02-01'),
      lines: {
        create: [
          { lineNumber: 1, accountId: dbAccounts[36].id, debitAmount: 2200, creditAmount: 0, description: 'Vehicle maintenance & repair expense' },
          { lineNumber: 2, accountId: dbAccounts[9].id, debitAmount: 330, creditAmount: 0, description: 'Input VAT on maintenance' },
          { lineNumber: 3, accountId: dbAccounts[15].id, debitAmount: 0, creditAmount: 2530, description: 'Accounts payable - Gulf Auto Workshop', vendorId: vendors[3].id },
        ]
      }
    }
  });

  // JE-7: Salary expense posting (January staff salaries)
  const je7 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2026-0007',
      date: new Date('2026-01-31'),
      description: 'January 2026 staff salaries payment',
      reference: 'SAL-JAN-2026',
      referenceType: 'SALARY',
      totalDebit: 125000,
      totalCredit: 125000,
      status: 'POSTED',
      postedAt: new Date('2026-01-31'),
      fiscalPeriodId: janPeriod!.id,
      createdById: admin.id,
      approvedById: admin.id,
      approvedAt: new Date('2026-01-31'),
      lines: {
        create: [
          { lineNumber: 1, accountId: dbAccounts[33].id, debitAmount: 72000, creditAmount: 0, description: 'Driver salaries & benefits - January' },
          { lineNumber: 2, accountId: dbAccounts[34].id, debitAmount: 53000, creditAmount: 0, description: 'Staff salaries & benefits - January' },
          { lineNumber: 3, accountId: dbAccounts[1].id, debitAmount: 0, creditAmount: 125000, description: 'Paid via Al Rajhi Bank' },
        ]
      }
    }
  });

  // JE-8: Bank deposit (transfer cash to SNB)
  const je8 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2026-0008',
      date: new Date('2026-02-03'),
      description: 'Bank deposit - Cash transferred to Saudi National Bank',
      reference: 'DEP-2026-0001',
      referenceType: 'BANK_DEPOSIT',
      totalDebit: 15000,
      totalCredit: 15000,
      status: 'POSTED',
      postedAt: new Date('2026-02-03'),
      fiscalPeriodId: febPeriod!.id,
      createdById: admin.id,
      approvedById: admin.id,
      approvedAt: new Date('2026-02-03'),
      lines: {
        create: [
          { lineNumber: 1, accountId: dbAccounts[2].id, debitAmount: 15000, creditAmount: 0, description: 'Deposit to Saudi National Bank' },
          { lineNumber: 2, accountId: dbAccounts[0].id, debitAmount: 0, creditAmount: 15000, description: 'Cash transferred from petty cash' },
        ]
      }
    }
  });

  // JE-9: Insurance expense (Fleet insurance renewal)
  const je9 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2026-0009',
      date: new Date('2026-02-05'),
      description: 'Fleet insurance premium - National Insurance Co. Q1 2026',
      reference: 'INS-2026-Q1',
      referenceType: 'EXPENSE',
      totalDebit: 18750,
      totalCredit: 18750,
      status: 'POSTED',
      postedAt: new Date('2026-02-05'),
      fiscalPeriodId: febPeriod!.id,
      createdById: admin.id,
      approvedById: admin.id,
      approvedAt: new Date('2026-02-05'),
      lines: {
        create: [
          { lineNumber: 1, accountId: dbAccounts[41].id, debitAmount: 18750, creditAmount: 0, description: 'Insurance expense - Fleet coverage Q1' },
          { lineNumber: 2, accountId: dbAccounts[1].id, debitAmount: 0, creditAmount: 18750, description: 'Paid via Al Rajhi Bank', vendorId: vendors[5].id },
        ]
      }
    }
  });

  // JE-10: Freight forwarding revenue recognition (Abdul Latif Jameel)
  const je10 = await prisma.journalEntry.create({
    data: {
      entryNumber: 'JE-2026-0010',
      date: new Date('2026-02-08'),
      description: 'Revenue recognition - Abdul Latif Jameel freight forwarding services',
      reference: 'INV-2026-0005',
      referenceType: 'SALES_INVOICE',
      totalDebit: 34500,
      totalCredit: 34500,
      status: 'POSTED',
      postedAt: new Date('2026-02-08'),
      fiscalPeriodId: febPeriod!.id,
      createdById: admin.id,
      approvedById: admin.id,
      approvedAt: new Date('2026-02-08'),
      lines: {
        create: [
          { lineNumber: 1, accountId: dbAccounts[7].id, debitAmount: 34500, creditAmount: 0, description: 'Accounts receivable - Abdul Latif Jameel', customerId: customers[3].id },
          { lineNumber: 2, accountId: dbAccounts[28].id, debitAmount: 0, creditAmount: 30000, description: 'Freight forwarding income' },
          { lineNumber: 3, accountId: dbAccounts[17].id, debitAmount: 0, creditAmount: 4500, description: 'Output VAT 15%' },
        ]
      }
    }
  });

  console.log('✅ 10 Journal Entries created (POSTED with lines)');

  // ==================== PAYABLE EXPENSES ====================
  console.log('Creating payable expenses...');
  await prisma.payableExpense.createMany({
    data: [
      { expenseNumber: 'PE-2026-0001', vendorId: vendors[1].id, date: new Date('2026-01-20'), dueDate: new Date('2026-02-04'), amount: 8500, vatAmount: 1275, totalAmount: 9775, balanceDue: 9775, category: 'Port Charges', description: 'Terminal handling charges JOB-2026-0001', status: 'UNPAID' },
      { expenseNumber: 'PE-2026-0002', vendorId: vendors[2].id, date: new Date('2026-01-31'), dueDate: new Date('2026-02-07'), amount: 12000, vatAmount: 1800, totalAmount: 13800, balanceDue: 0, paidAmount: 13800, category: 'Fuel', description: 'January fuel supply', status: 'PAID' },
      { expenseNumber: 'PE-2026-0003', vendorId: vendors[0].id, date: new Date('2026-02-05'), dueDate: new Date('2026-02-05'), amount: 45000, vatAmount: 0, totalAmount: 45000, balanceDue: 45000, category: 'Government Fees', description: 'Customs duties for SABIC hazmat import', status: 'UNPAID' },
      { expenseNumber: 'PE-2026-0004', vendorId: vendors[7].id, date: new Date('2026-02-08'), dueDate: new Date('2026-02-23'), amount: 6500, vatAmount: 975, totalAmount: 7475, balanceDue: 7475, category: 'Port Charges', description: 'Dammam port storage charges', status: 'UNPAID' },
    ]
  });
  console.log('✅ 4 Payable Expenses created');

  // ==================== CLIENT ADVANCES ====================
  console.log('Creating client advances...');
  await prisma.clientAdvance.createMany({
    data: [
      { advanceNumber: 'ADV-2026-0001', clientId: customers[0].id, amount: 50000, date: new Date('2026-01-10'), paymentMethod: 'BANK_TRANSFER', reference: 'IKEA-ADV-001', description: 'Advance payment for Q1 clearance services', status: 'ACTIVE', usedAmount: 10465, remainingAmount: 39535 },
      { advanceNumber: 'ADV-2026-0002', clientId: customers[6].id, amount: 100000, date: new Date('2026-01-05'), paymentMethod: 'BANK_TRANSFER', reference: 'ARAMCO-ADV-001', description: 'Advance for export services', status: 'ACTIVE', usedAmount: 17825, remainingAmount: 82175 },
      { advanceNumber: 'ADV-2026-0003', clientId: customers[2].id, amount: 75000, date: new Date('2026-02-01'), paymentMethod: 'CHEQUE', reference: 'SABIC-ADV-001', description: 'Advance for hazmat clearance', status: 'ACTIVE', usedAmount: 0, remainingAmount: 75000 },
    ]
  });
  console.log('✅ 3 Client Advances created');

  // ==================== CLIENT OPB ====================
  console.log('Creating Client OPB...');
  await prisma.clientOPB.createMany({
    data: [
      { clientId: customers[0].id, date: new Date('2026-01-01'), debitAmount: 125000, description: 'Opening balance from FY 2025', reference: 'OPB-2025' },
      { clientId: customers[1].id, date: new Date('2026-01-01'), debitAmount: 87000, description: 'Opening balance from FY 2025', reference: 'OPB-2025' },
      { clientId: customers[2].id, date: new Date('2026-01-01'), debitAmount: 65000, description: 'Opening balance from FY 2025', reference: 'OPB-2025' },
      { clientId: customers[5].id, date: new Date('2026-01-01'), debitAmount: 95000, description: 'Opening balance from FY 2025', reference: 'OPB-2025' },
      { clientId: customers[6].id, date: new Date('2026-01-01'), debitAmount: 210000, description: 'Opening balance from FY 2025', reference: 'OPB-2025' },
    ]
  });
  console.log('✅ 5 Client OPB entries created');

  // ==================== PAYABLE OPB ====================
  console.log('Creating Payable OPB...');
  await prisma.payableOPB.createMany({
    data: [
      { vendorId: vendors[0].id, date: new Date('2026-01-01'), creditAmount: 89000, description: 'Opening balance - customs duties', reference: 'OPB-2025' },
      { vendorId: vendors[1].id, date: new Date('2026-01-01'), creditAmount: 34000, description: 'Opening balance - port charges', reference: 'OPB-2025' },
      { vendorId: vendors[2].id, date: new Date('2026-01-01'), creditAmount: 22000, description: 'Opening balance - fuel', reference: 'OPB-2025' },
      { vendorId: vendors[4].id, date: new Date('2026-01-01'), creditAmount: 18000, description: 'Opening balance - container lease', reference: 'OPB-2025' },
      { vendorId: vendors[7].id, date: new Date('2026-01-01'), creditAmount: 42000, description: 'Opening balance - Dammam port', reference: 'OPB-2025' },
    ]
  });
  console.log('✅ 5 Payable OPB entries created');

  // ==================== VEHICLES (FLEET) ====================
  console.log('Creating vehicles...');
  await prisma.vehicle.createMany({
    data: [
      { plateNumber: 'BHA 1234', make: 'Mercedes-Benz', model: 'Actros 2545', year: 2023, type: 'TRUCK', driver: 'Faisal Al-Otaibi', status: 'ACTIVE', location: 'Riyadh Depot', fuelLevel: 85, mileage: 45200, nextServiceDate: new Date('2026-03-15') },
      { plateNumber: 'BHA 5678', make: 'Volvo', model: 'FH16', year: 2024, type: 'TRUCK', driver: 'Saeed Al-Malki', status: 'ACTIVE', location: 'Jeddah Port', fuelLevel: 62, mileage: 28900, nextServiceDate: new Date('2026-04-01') },
      { plateNumber: 'BHA 9012', make: 'Scania', model: 'R500', year: 2022, type: 'TRUCK', driver: 'Hamad Al-Dosari', status: 'IN_SERVICE', location: 'Gulf Auto Workshop', fuelLevel: 30, mileage: 78500, nextServiceDate: new Date('2026-02-20') },
      { plateNumber: 'TRL 3456', make: 'Schmitz', model: 'Cargobull', year: 2023, type: 'TRAILER', driver: null, status: 'ACTIVE', location: 'Riyadh Depot', fuelLevel: 0, mileage: 35000 },
      { plateNumber: 'TRL 7890', make: 'Krone', model: 'Cool Liner', year: 2024, type: 'REEFER_TRAILER', driver: null, status: 'ACTIVE', location: 'Dammam Port', fuelLevel: 0, mileage: 12500, nextServiceDate: new Date('2026-05-01') },
    ]
  });
  console.log('✅ 5 Vehicles created');

  // ==================== ASSETS ====================
  console.log('Creating assets...');
  await prisma.asset.createMany({
    data: [
      { name: 'Forklift - Toyota 8FBN25', category: 'Equipment', purchaseDate: new Date('2024-06-15'), cost: 125000, currentValue: 100000, depreciationRate: 10, location: 'Riyadh Warehouse', status: 'ACTIVE' },
      { name: 'Container Spreader - Bromma', category: 'Equipment', purchaseDate: new Date('2023-03-01'), cost: 85000, currentValue: 63750, depreciationRate: 10, location: 'Jeddah Port Office', status: 'ACTIVE' },
      { name: 'Dell PowerEdge R750 Server', category: 'IT Equipment', purchaseDate: new Date('2025-01-10'), cost: 42000, currentValue: 37800, depreciationRate: 20, location: 'Head Office - IT Room', status: 'ACTIVE' },
      { name: 'Isuzu NPR Delivery Van', category: 'Vehicle', purchaseDate: new Date('2024-09-20'), cost: 95000, currentValue: 80750, depreciationRate: 15, location: 'Riyadh Depot', status: 'ACTIVE' },
      { name: 'Weighbridge Scale - 60 Ton', category: 'Equipment', purchaseDate: new Date('2022-11-05'), cost: 180000, currentValue: 126000, depreciationRate: 10, location: 'Riyadh Warehouse', status: 'ACTIVE' },
    ]
  });
  console.log('✅ 5 Assets created');

  // ==================== RCV/PVC VOUCHERS ====================
  console.log('Creating RCV/PVC vouchers...');
  await prisma.rcvPvc.createMany({
    data: [
      { type: 'RCV', voucherNo: 'RCV-2026-0001', date: new Date('2026-01-20'), clientId: customers[0].id, amount: 50000, reference: 'IKEA-ADV-001', status: 'POSTED', notes: 'Advance payment from IKEA' },
      { type: 'RCV', voucherNo: 'RCV-2026-0002', date: new Date('2026-02-01'), clientId: customers[6].id, amount: 17825, reference: 'SINV-2026-0003', status: 'POSTED', notes: 'Full payment for Aramco export invoice' },
      { type: 'PVC', voucherNo: 'PVC-2026-0001', date: new Date('2026-01-31'), vendorId: vendors[2].id, amount: 13800, reference: 'PE-2026-0002', status: 'POSTED', notes: 'January fuel payment' },
      { type: 'PVC', voucherNo: 'PVC-2026-0002', date: new Date('2026-02-05'), vendorId: vendors[0].id, amount: 45000, reference: 'CUST-DUTIES-003', status: 'DRAFT', notes: 'Customs duties for SABIC import' },
      { type: 'RCV', voucherNo: 'RCV-2026-0003', date: new Date('2026-02-10'), clientId: customers[2].id, amount: 75000, reference: 'SABIC-ADV-001', status: 'POSTED', notes: 'Advance from SABIC for hazmat clearance' },
    ]
  });
  console.log('✅ 5 RCV/PVC Vouchers created');

  // ==================== BANK TRANSACTIONS ====================
  console.log('Creating bank transactions for reconciliation...');
  await prisma.bankTransaction.createMany({
    data: [
      // Al Rajhi Bank transactions
      { bankAccountId: banks[0].id, transactionDate: new Date('2026-01-05'), type: 'CREDIT', description: 'Client advance received - Saudi Aramco', reference: 'ADV-2026-0002', amount: 100000, documentType: 'RECEIPT', documentRef: 'RCV-2026-0001', reconciliationStatus: 'RECONCILED' },
      { bankAccountId: banks[0].id, transactionDate: new Date('2026-01-10'), type: 'CREDIT', description: 'Client advance received - IKEA', reference: 'ADV-2026-0001', amount: 50000, documentType: 'RECEIPT', documentRef: 'RCV-2026-0002', reconciliationStatus: 'RECONCILED' },
      { bankAccountId: banks[0].id, transactionDate: new Date('2026-01-25'), type: 'CREDIT', description: 'Payment received - Panda Retail', reference: 'RCV-2026-0001', amount: 87000, documentType: 'RECEIPT', documentRef: 'RCV-2026-0003', reconciliationStatus: 'RECONCILED' },
      { bankAccountId: banks[0].id, transactionDate: new Date('2026-01-31'), type: 'DEBIT', description: 'Staff salaries - January 2026', reference: 'SAL-JAN-2026', amount: 125000, documentType: 'PAYMENT_VOUCHER', documentRef: 'PVC-SAL-001', reconciliationStatus: 'RECONCILED' },
      { bankAccountId: banks[0].id, transactionDate: new Date('2026-01-31'), type: 'DEBIT', description: 'Fuel payment - Al Madinah Fuel', reference: 'PE-2026-0002', amount: 13800, documentType: 'PAYMENT_VOUCHER', documentRef: 'PVC-2026-0001', reconciliationStatus: 'RECONCILED' },
      { bankAccountId: banks[0].id, transactionDate: new Date('2026-02-03'), type: 'DEBIT', description: 'Cash transfer to SNB', reference: 'DEP-2026-0001', amount: 15000, documentType: 'TRANSFER', documentRef: 'TRF-001', reconciliationStatus: 'UNRECONCILED' },
      { bankAccountId: banks[0].id, transactionDate: new Date('2026-02-05'), type: 'DEBIT', description: 'Insurance premium - National Insurance', reference: 'INS-2026-Q1', amount: 18750, documentType: 'PAYMENT_VOUCHER', documentRef: 'PVC-INS-001', reconciliationStatus: 'UNRECONCILED' },
      { bankAccountId: banks[0].id, transactionDate: new Date('2026-02-10'), type: 'CREDIT', description: 'SABIC advance payment', reference: 'SABIC-ADV-001', amount: 75000, documentType: 'RECEIPT', documentRef: 'RCV-2026-0003', reconciliationStatus: 'UNRECONCILED' },
      // SNB transactions
      { bankAccountId: banks[1].id, transactionDate: new Date('2026-02-03'), type: 'CREDIT', description: 'Transfer from Al Rajhi', reference: 'DEP-2026-0001', amount: 15000, documentType: 'TRANSFER', documentRef: 'TRF-001', reconciliationStatus: 'UNRECONCILED' },
      { bankAccountId: banks[1].id, transactionDate: new Date('2026-02-08'), type: 'DEBIT', description: 'Port charges - Jeddah Islamic Port', reference: 'PE-2026-0001', amount: 9775, documentType: 'PAYMENT_VOUCHER', documentRef: 'PVC-PORT-001', reconciliationStatus: 'UNRECONCILED' },
      // Riyad Bank transactions
      { bankAccountId: banks[2].id, transactionDate: new Date('2026-02-01'), type: 'CREDIT', description: 'Aramco export invoice payment', reference: 'SINV-2026-0003', amount: 17825, documentType: 'RECEIPT', documentRef: 'RCV-2026-0002', reconciliationStatus: 'UNRECONCILED' },
      { bankAccountId: banks[2].id, transactionDate: new Date('2026-02-08'), type: 'DEBIT', description: 'Dammam port storage charges', reference: 'PE-2026-0004', amount: 7475, documentType: 'PAYMENT_VOUCHER', documentRef: 'PVC-PORT-002', reconciliationStatus: 'UNRECONCILED' },
    ]
  });
  console.log('✅ 12 Bank Transactions created');

  // =====================================================================
  // EXPANDED DATA - Adding 100+ more records across all sections
  // =====================================================================

  // ==================== ADDITIONAL CUSTOMERS (7 more = 15 total) ====================
  console.log('Creating additional customers...');
  const moreCustomers = await Promise.all([
    prisma.customer.create({ data: { code: 'CUST-009', name: 'Bin Laden Group', nameAr: 'مجموعة بن لادن', contactPerson: 'Khalid Ibrahim', phone: '+966-12-640-1000', email: 'logistics@binladen.sa', city: 'Jeddah', category: 'Construction', paymentTermDays: 45, outstandingBalance: 180000, creditLimit: 1500000, vatNumber: '300033333300003', crNumber: '4030111222' } }),
    prisma.customer.create({ data: { code: 'CUST-010', name: 'STC (Saudi Telecom)', nameAr: 'الاتصالات السعودية', contactPerson: 'Nasser Al-Dossari', phone: '+966-11-452-0000', email: 'procurement@stc.sa', city: 'Riyadh', category: 'Telecom', paymentTermDays: 30, outstandingBalance: 42000, creditLimit: 600000, vatNumber: '300044444400003', crNumber: '1010222333' } }),
    prisma.customer.create({ data: { code: 'CUST-011', name: 'Mobily (Etihad Etisalat)', nameAr: 'موبايلي', contactPerson: 'Saleh Al-Qahtani', phone: '+966-11-450-5000', email: 'supply@mobily.sa', city: 'Riyadh', category: 'Telecom', paymentTermDays: 30, outstandingBalance: 28000, creditLimit: 400000, vatNumber: '300055555500003', crNumber: '1010333444' } }),
    prisma.customer.create({ data: { code: 'CUST-012', name: 'Nahdi Medical Company', nameAr: 'شركة النهدي الطبية', contactPerson: 'Dr. Ayman Bakr', phone: '+966-12-669-5000', email: 'warehouse@nahdi.sa', city: 'Jeddah', category: 'Healthcare', paymentTermDays: 30, outstandingBalance: 55000, creditLimit: 500000, vatNumber: '300066666600003', crNumber: '4030444555' } }),
    prisma.customer.create({ data: { code: 'CUST-013', name: 'Al Faisaliah Group', nameAr: 'مجموعة الفيصلية', contactPerson: 'Omar Al-Faisal', phone: '+966-11-465-2000', email: 'imports@alfaisaliah.sa', city: 'Riyadh', category: 'Conglomerate', paymentTermDays: 45, outstandingBalance: 115000, creditLimit: 2000000, vatNumber: '300077777700003', crNumber: '1010555666' } }),
    prisma.customer.create({ data: { code: 'CUST-014', name: 'Saudi Electricity Company', nameAr: 'الشركة السعودية للكهرباء', contactPerson: 'Saad Al-Shammari', phone: '+966-11-474-0000', email: 'logistics@se.com.sa', city: 'Riyadh', category: 'Utilities', paymentTermDays: 60, outstandingBalance: 320000, creditLimit: 5000000, vatNumber: '300088888800003', crNumber: '1010666777' } }),
    prisma.customer.create({ data: { code: 'CUST-015', name: 'ACWA Power', nameAr: 'أكوا باور', contactPerson: 'Majid Al-Harbi', phone: '+966-11-510-0000', email: 'procurement@acwapower.com', city: 'Riyadh', category: 'Energy', paymentTermDays: 45, outstandingBalance: 195000, creditLimit: 3000000, vatNumber: '300099999900003', crNumber: '1010777888' } }),
  ]);
  console.log('✅ 7 More Customers created (15 total)');

  // ==================== ADDITIONAL CONSIGNEES (3 more = 8 total) ====================
  console.log('Creating additional consignees...');
  await Promise.all([
    prisma.consignee.create({ data: { code: 'CON-006', name: 'Bin Laden Construction Site', nameAr: 'موقع إنشاء بن لادن', contactPerson: 'Site Manager', phone: '+966-12-640-2000', city: 'Jeddah', warehouseLocation: 'King Abdullah Economic City' } }),
    prisma.consignee.create({ data: { code: 'CON-007', name: 'STC Warehouse Riyadh', nameAr: 'مستودع STC الرياض', contactPerson: 'Receiving Dept', phone: '+966-11-452-1111', city: 'Riyadh', warehouseLocation: 'Industrial Area 3, Riyadh' } }),
    prisma.consignee.create({ data: { code: 'CON-008', name: 'Nahdi Distribution Center', nameAr: 'مركز توزيع النهدي', contactPerson: 'Warehouse Ops', phone: '+966-12-669-6000', city: 'Jeddah', warehouseLocation: 'South Jeddah Logistics Zone' } }),
  ]);
  console.log('✅ 3 More Consignees created (8 total)');

  // ==================== ADDITIONAL VENDORS (4 more = 12 total) ====================
  console.log('Creating additional vendors...');
  const moreVendors = await Promise.all([
    prisma.vendor.create({ data: { code: 'VND-009', name: 'DHL Express Saudi', nameAr: 'دي إتش إل إكسبرس', contactPerson: 'Courier Ops', phone: '+966-11-474-1111', email: 'ops@dhl.sa', city: 'Riyadh', category: 'Courier', paymentTermDays: 15, outstandingBalance: 8500 } }),
    prisma.vendor.create({ data: { code: 'VND-010', name: 'Maersk Line Saudi', nameAr: 'ميرسك لاين', contactPerson: 'Booking Dept', phone: '+966-12-647-2222', email: 'booking@maersk.sa', city: 'Jeddah', category: 'Shipping Line', paymentTermDays: 30, outstandingBalance: 65000 } }),
    prisma.vendor.create({ data: { code: 'VND-011', name: 'Arabian Auto Agency', nameAr: 'الوكالة العربية للسيارات', contactPerson: 'Fleet Sales', phone: '+966-11-456-3333', email: 'fleet@arabianauto.sa', city: 'Riyadh', category: 'Vehicle Dealer', paymentTermDays: 60, outstandingBalance: 0 } }),
    prisma.vendor.create({ data: { code: 'VND-012', name: 'SEC Power Supply', nameAr: 'توريدات الكهرباء', contactPerson: 'Commercial Dept', phone: '+966-11-474-4444', email: 'commercial@sec.sa', city: 'Riyadh', category: 'Utilities', paymentTermDays: 30, outstandingBalance: 12000 } }),
  ]);
  console.log('✅ 4 More Vendors created (12 total)');

  // ==================== ADDITIONAL SALESMEN (2 more = 5 total) ====================
  console.log('Creating additional salesmen...');
  const moreSalesmen = await Promise.all([
    prisma.salesman.create({ data: { code: 'SM-004', name: 'Faris Al-Dosari', nameAr: 'فارس الدوسري', phone: '+966-55-400-5004', email: 'faris.sm@fayha-transport.sa', commission: 3.5 } }),
    prisma.salesman.create({ data: { code: 'SM-005', name: 'Rakan Al-Otaibi', nameAr: 'راكان العتيبي', phone: '+966-55-500-6005', email: 'rakan.sm@fayha-transport.sa', commission: 4.5 } }),
  ]);
  console.log('✅ 2 More Salesmen created (5 total)');

  // ==================== ADDITIONAL JOB REFERENCES (10 more = 15 total) ====================
  console.log('Creating additional job references...');
  const moreJobRefs = await Promise.all([
    prisma.jobReference.create({ data: { jobNumber: 'JOB-2026-0006', status: 'COMPLETED', clientId: customers[3].id, direction: 'IMPORT', modeOfTransport: 'SEA', categoryId: categories[0].id, titleId: titles[0].id, salesmanId: salesmen[0].id, controllerId: controllers[0].id, awbBl: 'MAEU22233344', origin: 'Tokyo, Japan', destination: 'Jeddah, KSA', pol: 'JPTYO', pod: 'SAJED', shipper: 'Toyota Motor Corp', commercialInvoiceNo: 'CI-2026-1006', commercialInvoiceValue: 450000, grossWeight: 35000, packages: 200, containers: { create: [{ containerNumber: 'MAEU2223001', containerType: '40HC', sealNumber: 'SL201001', weight: 18000 }, { containerNumber: 'MAEU2223002', containerType: '40HC', sealNumber: 'SL201002', weight: 17000 }] } } }),
    prisma.jobReference.create({ data: { jobNumber: 'JOB-2026-0007', status: 'IN_PROGRESS', clientId: moreCustomers[0].id, direction: 'IMPORT', modeOfTransport: 'SEA', categoryId: categories[2].id, titleId: titles[5].id, salesmanId: salesmen[1].id, controllerId: controllers[1].id, awbBl: 'EGLV55566677', origin: 'Hamburg, Germany', destination: 'Jeddah, KSA', pol: 'DEHAM', pod: 'SAJED', shipper: 'ThyssenKrupp AG', commercialInvoiceNo: 'CI-2026-1007', commercialInvoiceValue: 890000, grossWeight: 72000, packages: 50, pallets: 50, containers: { create: [{ containerNumber: 'EGLV5556001', containerType: '40FR', sealNumber: 'SL301001', weight: 24000 }, { containerNumber: 'EGLV5556002', containerType: '40FR', sealNumber: 'SL301002', weight: 24000 }, { containerNumber: 'EGLV5556003', containerType: '40FR', sealNumber: 'SL301003', weight: 24000 }] } } }),
    prisma.jobReference.create({ data: { jobNumber: 'JOB-2026-0008', status: 'OPEN', clientId: moreCustomers[1].id, direction: 'IMPORT', modeOfTransport: 'AIR', categoryId: categories[0].id, titleId: titles[1].id, salesmanId: moreSalesmen[0].id, controllerId: controllers[0].id, awbBl: '180-87654321', origin: 'Shenzhen, China', destination: 'Riyadh, KSA', pol: 'CNSZN', pod: 'SARYD', shipper: 'Huawei Technologies', airline: 'Emirates SkyCargo', flightNumber: 'EK3412', commercialInvoiceNo: 'CI-2026-1008', commercialInvoiceValue: 320000, grossWeight: 4500, packages: 300 } }),
    prisma.jobReference.create({ data: { jobNumber: 'JOB-2026-0009', status: 'COMPLETED', clientId: moreCustomers[3].id, direction: 'IMPORT', modeOfTransport: 'AIR', categoryId: categories[0].id, titleId: titles[1].id, salesmanId: moreSalesmen[1].id, controllerId: controllers[2].id, awbBl: '176-11122233', origin: 'Basel, Switzerland', destination: 'Jeddah, KSA', pol: 'CHBSL', pod: 'SAKJA', shipper: 'Novartis Pharma AG', airline: 'Saudia Cargo', flightNumber: 'SV6891', commercialInvoiceNo: 'CI-2026-1009', commercialInvoiceValue: 2100000, grossWeight: 1200, packages: 80, notes: 'Temperature controlled - pharmaceutical cargo' } }),
    prisma.jobReference.create({ data: { jobNumber: 'JOB-2026-0010', status: 'IN_PROGRESS', clientId: moreCustomers[4].id, direction: 'IMPORT', modeOfTransport: 'SEA', categoryId: categories[2].id, titleId: titles[5].id, salesmanId: salesmen[2].id, controllerId: controllers[1].id, awbBl: 'OOLU33344455', origin: 'Rotterdam, Netherlands', destination: 'Dammam, KSA', pol: 'NLRTM', pod: 'SADAM', shipper: 'Siemens AG', commercialInvoiceNo: 'CI-2026-1010', commercialInvoiceValue: 1500000, grossWeight: 95000, packages: 120, containers: { create: [{ containerNumber: 'OOLU3334001', containerType: '40OT', sealNumber: 'SL401001', weight: 32000 }, { containerNumber: 'OOLU3334002', containerType: '40OT', sealNumber: 'SL401002', weight: 32000 }, { containerNumber: 'OOLU3334003', containerType: '40OT', sealNumber: 'SL401003', weight: 31000 }] } } }),
    prisma.jobReference.create({ data: { jobNumber: 'JOB-2026-0011', status: 'OPEN', clientId: moreCustomers[5].id, direction: 'IMPORT', modeOfTransport: 'SEA', categoryId: categories[0].id, titleId: titles[0].id, salesmanId: moreSalesmen[0].id, controllerId: controllers[0].id, awbBl: 'HLCU88899900', origin: 'Mumbai, India', destination: 'Dammam, KSA', pol: 'INNSA', pod: 'SADAM', shipper: 'Bharat Heavy Electricals', commercialInvoiceNo: 'CI-2026-1011', commercialInvoiceValue: 780000, grossWeight: 52000, packages: 40 } }),
    prisma.jobReference.create({ data: { jobNumber: 'JOB-2026-0012', status: 'COMPLETED', clientId: moreCustomers[6].id, direction: 'IMPORT', modeOfTransport: 'SEA', categoryId: categories[2].id, titleId: titles[5].id, salesmanId: moreSalesmen[1].id, controllerId: controllers[2].id, awbBl: 'CMAU11122233', origin: 'Busan, South Korea', destination: 'Jubail, KSA', pol: 'KRPUS', pod: 'SARUH', shipper: 'Samsung Engineering', commercialInvoiceNo: 'CI-2026-1012', commercialInvoiceValue: 2800000, grossWeight: 120000, packages: 60 } }),
    prisma.jobReference.create({ data: { jobNumber: 'JOB-2026-0013', status: 'IN_PROGRESS', clientId: customers[7].id, direction: 'IMPORT', modeOfTransport: 'AIR', categoryId: categories[0].id, titleId: titles[1].id, salesmanId: salesmen[0].id, controllerId: controllers[0].id, awbBl: '176-44455566', origin: 'London, UK', destination: 'Riyadh, KSA', pol: 'GBLHR', pod: 'SARYD', shipper: 'Apple Distribution Int.', airline: 'British Airways Cargo', flightNumber: 'BA129', commercialInvoiceNo: 'CI-2026-1013', commercialInvoiceValue: 950000, grossWeight: 2800, packages: 500 } }),
    prisma.jobReference.create({ data: { jobNumber: 'JOB-2026-0014', status: 'OPEN', clientId: customers[4].id, direction: 'IMPORT', modeOfTransport: 'LAND', categoryId: categories[3].id, titleId: titles[7].id, salesmanId: salesmen[1].id, controllerId: controllers[1].id, awbBl: 'LND-2026-001', origin: 'Dubai, UAE', destination: 'Riyadh, KSA', truckPlate: 'KSA-TRK-4455', driverName: 'Ahmad Al-Balushi', driverPhone: '+971-50-111-2233', commercialInvoiceNo: 'CI-2026-1014', commercialInvoiceValue: 125000, grossWeight: 18000, packages: 90 } }),
    prisma.jobReference.create({ data: { jobNumber: 'JOB-2026-0015', status: 'COMPLETED', clientId: customers[5].id, direction: 'EXPORT', modeOfTransport: 'SEA', categoryId: categories[1].id, titleId: titles[3].id, salesmanId: salesmen[2].id, controllerId: controllers[2].id, awbBl: 'MAEU99900011', origin: 'Jeddah, KSA', destination: 'Dar es Salaam, Tanzania', pol: 'SAJED', pod: 'TZDAR', shipper: 'Almarai Company', commercialInvoiceNo: 'CI-2026-1015', commercialInvoiceValue: 420000, grossWeight: 28000, packages: 600, containers: { create: [{ containerNumber: 'MAEU9990001', containerType: '40RF', sealNumber: 'SL501001', weight: 14000 }, { containerNumber: 'MAEU9990002', containerType: '40RF', sealNumber: 'SL501002', weight: 14000 }] } } }),
  ]);
  console.log('✅ 10 More Job References created (15 total)');

  // ==================== ADDITIONAL SALES INVOICES (7 more = 10 total) ====================
  console.log('Creating additional sales invoices...');
  await prisma.salesInvoice.create({ data: { invoiceNumber: 'SINV-2026-0004', clientId: customers[3].id, jobReferenceId: moreJobRefs[0].id, salesmanId: salesmen[0].id, invoiceDate: new Date('2026-02-05'), dueDate: new Date('2026-03-07'), saleMethod: 'CREDIT', subtotal: 12800, vatRate: 0.15, vatAmount: 1920, totalAmount: 14720, balanceDue: 14720, status: 'SENT', items: { create: [{ lineNumber: 1, serviceId: services[0].id, nameEn: 'Clearance Charges', nameAr: 'رسوم التخليص', amount: 2500, vatRate: 0.15, vatAmount: 375, totalAmount: 2875 }, { lineNumber: 2, serviceId: services[23].id, nameEn: 'TRANSPORTATION', nameAr: 'النقل', amount: 6800, vatRate: 0.15, vatAmount: 1020, totalAmount: 7820 }, { lineNumber: 3, serviceId: services[11].id, nameEn: 'Labour Charges', nameAr: 'رسوم العمالة', amount: 3500, vatRate: 0.15, vatAmount: 525, totalAmount: 4025 }] } } });
  await prisma.salesInvoice.create({ data: { invoiceNumber: 'SINV-2026-0005', clientId: moreCustomers[0].id, jobReferenceId: moreJobRefs[1].id, salesmanId: salesmen[1].id, invoiceDate: new Date('2026-02-08'), dueDate: new Date('2026-03-25'), saleMethod: 'CREDIT', subtotal: 28500, vatRate: 0.15, vatAmount: 4275, totalAmount: 32775, balanceDue: 32775, status: 'DRAFT', items: { create: [{ lineNumber: 1, serviceId: services[0].id, nameEn: 'Clearance Charges', nameAr: 'رسوم التخليص', amount: 4500, vatRate: 0.15, vatAmount: 675, totalAmount: 5175 }, { lineNumber: 2, serviceId: services[30].id, nameEn: 'Sea Freight Charges', nameAr: 'رسوم شحن بحري', amount: 18000, vatRate: 0.15, vatAmount: 2700, totalAmount: 20700 }, { lineNumber: 3, serviceId: services[11].id, nameEn: 'Labour and Handling', nameAr: 'عمالة ومناولة', amount: 6000, vatRate: 0.15, vatAmount: 900, totalAmount: 6900 }] } } });
  await prisma.salesInvoice.create({ data: { invoiceNumber: 'SINV-2026-0006', clientId: moreCustomers[3].id, jobReferenceId: moreJobRefs[3].id, salesmanId: moreSalesmen[1].id, invoiceDate: new Date('2026-02-10'), dueDate: new Date('2026-03-12'), saleMethod: 'CREDIT', subtotal: 8200, vatRate: 0.15, vatAmount: 1230, totalAmount: 9430, balanceDue: 0, paidAmount: 9430, status: 'PAID', items: { create: [{ lineNumber: 1, serviceId: services[0].id, nameEn: 'Clearance Charges', nameAr: 'رسوم التخليص', amount: 3500, vatRate: 0.15, vatAmount: 525, totalAmount: 4025 }, { lineNumber: 2, serviceId: services[29].id, nameEn: 'Air Freight Charges', nameAr: 'رسوم شحن جوي', amount: 4700, vatRate: 0.15, vatAmount: 705, totalAmount: 5405 }] } } });
  await prisma.salesInvoice.create({ data: { invoiceNumber: 'SINV-2026-0007', clientId: moreCustomers[1].id, jobReferenceId: moreJobRefs[2].id, salesmanId: moreSalesmen[0].id, invoiceDate: new Date('2026-02-12'), dueDate: new Date('2026-03-14'), saleMethod: 'CREDIT', subtotal: 6500, vatRate: 0.15, vatAmount: 975, totalAmount: 7475, balanceDue: 7475, status: 'SENT', items: { create: [{ lineNumber: 1, serviceId: services[0].id, nameEn: 'Clearance Charges', nameAr: 'رسوم التخليص', amount: 2000, vatRate: 0.15, vatAmount: 300, totalAmount: 2300 }, { lineNumber: 2, serviceId: services[29].id, nameEn: 'Air Freight', nameAr: 'شحن جوي', amount: 4500, vatRate: 0.15, vatAmount: 675, totalAmount: 5175 }] } } });
  await prisma.salesInvoice.create({ data: { invoiceNumber: 'SINV-2026-0008', clientId: moreCustomers[4].id, jobReferenceId: moreJobRefs[4].id, salesmanId: salesmen[2].id, invoiceDate: new Date('2026-02-14'), dueDate: new Date('2026-03-31'), saleMethod: 'CREDIT', subtotal: 42000, vatRate: 0.15, vatAmount: 6300, totalAmount: 48300, balanceDue: 48300, status: 'SENT', items: { create: [{ lineNumber: 1, serviceId: services[0].id, nameEn: 'Clearance Charges', nameAr: 'رسوم التخليص', amount: 5000, vatRate: 0.15, vatAmount: 750, totalAmount: 5750 }, { lineNumber: 2, serviceId: services[30].id, nameEn: 'Sea Freight', nameAr: 'شحن بحري', amount: 25000, vatRate: 0.15, vatAmount: 3750, totalAmount: 28750 }, { lineNumber: 3, serviceId: services[11].id, nameEn: 'Labour', nameAr: 'عمالة', amount: 8000, vatRate: 0.15, vatAmount: 1200, totalAmount: 9200 }, { lineNumber: 4, serviceId: services[40].id, nameEn: 'Crane Charges', nameAr: 'رسوم رافعة', amount: 4000, vatRate: 0.15, vatAmount: 600, totalAmount: 4600 }] } } });
  await prisma.salesInvoice.create({ data: { invoiceNumber: 'SINV-2026-0009', clientId: customers[5].id, jobReferenceId: moreJobRefs[9].id, salesmanId: salesmen[2].id, invoiceDate: new Date('2026-02-16'), dueDate: new Date('2026-03-18'), saleMethod: 'CREDIT', subtotal: 18500, vatRate: 0.15, vatAmount: 2775, totalAmount: 21275, balanceDue: 10000, paidAmount: 11275, status: 'PARTIAL', items: { create: [{ lineNumber: 1, serviceId: services[0].id, nameEn: 'Clearance Charges', nameAr: 'رسوم التخليص', amount: 3500, vatRate: 0.15, vatAmount: 525, totalAmount: 4025 }, { lineNumber: 2, serviceId: services[30].id, nameEn: 'Sea Freight', nameAr: 'شحن بحري', amount: 12000, vatRate: 0.15, vatAmount: 1800, totalAmount: 13800 }, { lineNumber: 3, serviceId: services[17].id, nameEn: 'Documentation', nameAr: 'توثيق', amount: 3000, vatRate: 0.15, vatAmount: 450, totalAmount: 3450 }] } } });
  await prisma.salesInvoice.create({ data: { invoiceNumber: 'SINV-2026-0010', clientId: moreCustomers[6].id, jobReferenceId: moreJobRefs[6].id, salesmanId: moreSalesmen[1].id, invoiceDate: new Date('2026-02-18'), dueDate: new Date('2026-04-04'), saleMethod: 'CREDIT', subtotal: 55000, vatRate: 0.15, vatAmount: 8250, totalAmount: 63250, balanceDue: 63250, status: 'INVOICED', items: { create: [{ lineNumber: 1, serviceId: services[0].id, nameEn: 'Clearance Charges', nameAr: 'رسوم التخليص', amount: 8000, vatRate: 0.15, vatAmount: 1200, totalAmount: 9200 }, { lineNumber: 2, serviceId: services[30].id, nameEn: 'Sea Freight', nameAr: 'شحن بحري', amount: 35000, vatRate: 0.15, vatAmount: 5250, totalAmount: 40250 }, { lineNumber: 3, serviceId: services[11].id, nameEn: 'Labour', nameAr: 'عمالة', amount: 12000, vatRate: 0.15, vatAmount: 1800, totalAmount: 13800 }] } } });
  console.log('✅ 7 More Sales Invoices created (10 total)');

  // ==================== ADDITIONAL EXPENSE ENTRIES (10 more = 15 total) ====================
  console.log('Creating additional expense entries...');
  await prisma.expenseEntry.createMany({
    data: [
      { expenseNumber: 'EXP-2026-0006', date: new Date('2026-02-11'), amount: 4200, vatAmount: 630, totalAmount: 4830, paymentMethod: 'BANK_TRANSFER', category: 'Storage', description: 'Warehouse storage fees for Bin Laden shipment', reference: 'STR-FEB-001', status: 'APPROVED', jobRefId: moreJobRefs[1].id },
      { expenseNumber: 'EXP-2026-0007', date: new Date('2026-02-12'), amount: 1800, vatAmount: 270, totalAmount: 2070, paymentMethod: 'CASH', category: 'Transport', description: 'Local delivery charges to STC warehouse', reference: 'TRN-FEB-001', status: 'APPROVED', jobRefId: moreJobRefs[2].id },
      { expenseNumber: 'EXP-2026-0008', date: new Date('2026-02-13'), amount: 6500, vatAmount: 975, totalAmount: 7475, paymentMethod: 'BANK_TRANSFER', category: 'Port Charges', description: 'Dammam port container handling - SEC shipment', reference: 'PORT-FEB-002', status: 'APPROVED', jobRefId: moreJobRefs[5].id },
      { expenseNumber: 'EXP-2026-0009', date: new Date('2026-02-14'), amount: 15000, vatAmount: 2250, totalAmount: 17250, paymentMethod: 'BANK_TRANSFER', category: 'Customs Charges', description: 'Import customs duties for Al Faisaliah Group', reference: 'CUST-FEB-001', status: 'PENDING', jobRefId: moreJobRefs[4].id },
      { expenseNumber: 'EXP-2026-0010', date: new Date('2026-02-15'), amount: 2800, vatAmount: 420, totalAmount: 3220, paymentMethod: 'CASH', category: 'Fuel', description: 'Diesel refueling for fleet - February batch 1', reference: 'FUEL-FEB-001', status: 'APPROVED' },
      { expenseNumber: 'EXP-2026-0011', date: new Date('2026-02-16'), amount: 3500, vatAmount: 525, totalAmount: 4025, paymentMethod: 'BANK_TRANSFER', category: 'Insurance', description: 'Vehicle insurance renewal - BHA 5678', reference: 'INS-VEH-002', status: 'APPROVED' },
      { expenseNumber: 'EXP-2026-0012', date: new Date('2026-02-17'), amount: 8000, vatAmount: 1200, totalAmount: 9200, paymentMethod: 'BANK_TRANSFER', category: 'Container Detention', description: 'Container detention charges - Maersk Line', reference: 'DET-FEB-001', status: 'PENDING', jobRefId: moreJobRefs[0].id },
      { expenseNumber: 'EXP-2026-0013', date: new Date('2026-02-18'), amount: 950, vatAmount: 142.5, totalAmount: 1092.5, paymentMethod: 'CASH', category: 'Office Supplies', description: 'Printer paper, toner, and stationery', reference: 'OFF-FEB-002', status: 'APPROVED' },
      { expenseNumber: 'EXP-2026-0014', date: new Date('2026-02-19'), amount: 125000, vatAmount: 0, totalAmount: 125000, paymentMethod: 'BANK_TRANSFER', category: 'Salary', description: 'February 2026 staff salaries', reference: 'SAL-FEB-2026', status: 'APPROVED' },
      { expenseNumber: 'EXP-2026-0015', date: new Date('2026-02-20'), amount: 5500, vatAmount: 825, totalAmount: 6325, paymentMethod: 'BANK_TRANSFER', category: 'Maintenance', description: 'Truck repair and tire replacement - BHA 9012', reference: 'MNT-FEB-002', status: 'APPROVED', jobRefId: moreJobRefs[3].id },
    ]
  });
  console.log('✅ 10 More Expense Entries created (15 total)');

  // ==================== ADDITIONAL JOURNAL ENTRIES (15 more = 25 total) ====================
  console.log('Creating additional journal entries...');

  // JE-11: Revenue - Abdul Latif Jameel import clearance
  await prisma.journalEntry.create({ data: { entryNumber: 'JE-2026-0011', date: new Date('2026-02-05'), description: 'Revenue - Abdul Latif Jameel import clearance SINV-2026-0004', reference: 'SINV-2026-0004', referenceType: 'SALES_INVOICE', totalDebit: 14720, totalCredit: 14720, status: 'POSTED', postedAt: new Date('2026-02-05'), fiscalPeriodId: febPeriod!.id, createdById: admin.id, approvedById: admin.id, approvedAt: new Date('2026-02-05'), lines: { create: [{ lineNumber: 1, accountId: dbAccounts[7].id, debitAmount: 14720, creditAmount: 0, description: 'AR - Abdul Latif Jameel', customerId: customers[3].id }, { lineNumber: 2, accountId: dbAccounts[26].id, debitAmount: 0, creditAmount: 12800, description: 'Transport revenue' }, { lineNumber: 3, accountId: dbAccounts[17].id, debitAmount: 0, creditAmount: 1920, description: 'Output VAT 15%' }] } } });

  // JE-12: Bin Laden Group freight forwarding
  await prisma.journalEntry.create({ data: { entryNumber: 'JE-2026-0012', date: new Date('2026-02-08'), description: 'Revenue - Bin Laden Group freight forwarding SINV-2026-0005', reference: 'SINV-2026-0005', referenceType: 'SALES_INVOICE', totalDebit: 32775, totalCredit: 32775, status: 'POSTED', postedAt: new Date('2026-02-08'), fiscalPeriodId: febPeriod!.id, createdById: admin.id, approvedById: admin.id, approvedAt: new Date('2026-02-08'), lines: { create: [{ lineNumber: 1, accountId: dbAccounts[7].id, debitAmount: 32775, creditAmount: 0, description: 'AR - Bin Laden Group', customerId: moreCustomers[0].id }, { lineNumber: 2, accountId: dbAccounts[28].id, debitAmount: 0, creditAmount: 28500, description: 'Freight forwarding income' }, { lineNumber: 3, accountId: dbAccounts[17].id, debitAmount: 0, creditAmount: 4275, description: 'Output VAT 15%' }] } } });

  // JE-13: Nahdi Medical paid invoice
  await prisma.journalEntry.create({ data: { entryNumber: 'JE-2026-0013', date: new Date('2026-02-10'), description: 'Revenue - Nahdi Medical air clearance SINV-2026-0006 (PAID)', reference: 'SINV-2026-0006', referenceType: 'SALES_INVOICE', totalDebit: 9430, totalCredit: 9430, status: 'POSTED', postedAt: new Date('2026-02-10'), fiscalPeriodId: febPeriod!.id, createdById: admin.id, approvedById: admin.id, approvedAt: new Date('2026-02-10'), lines: { create: [{ lineNumber: 1, accountId: dbAccounts[1].id, debitAmount: 9430, creditAmount: 0, description: 'Cash received - Al Rajhi Bank' }, { lineNumber: 2, accountId: dbAccounts[27].id, debitAmount: 0, creditAmount: 8200, description: 'Customs clearance fees revenue' }, { lineNumber: 3, accountId: dbAccounts[17].id, debitAmount: 0, creditAmount: 1230, description: 'Output VAT 15%' }] } } });

  // JE-14: Storage expense posting
  await prisma.journalEntry.create({ data: { entryNumber: 'JE-2026-0014', date: new Date('2026-02-11'), description: 'Warehouse storage expense - Bin Laden shipment', reference: 'EXP-2026-0006', referenceType: 'EXPENSE', totalDebit: 4830, totalCredit: 4830, status: 'POSTED', postedAt: new Date('2026-02-11'), fiscalPeriodId: febPeriod!.id, createdById: admin.id, approvedById: admin.id, approvedAt: new Date('2026-02-11'), lines: { create: [{ lineNumber: 1, accountId: dbAccounts[39].id, debitAmount: 4200, creditAmount: 0, description: 'Warehouse rent expense' }, { lineNumber: 2, accountId: dbAccounts[9].id, debitAmount: 630, creditAmount: 0, description: 'Input VAT on storage' }, { lineNumber: 3, accountId: dbAccounts[1].id, debitAmount: 0, creditAmount: 4830, description: 'Paid via Al Rajhi Bank' }] } } });

  // JE-15: Port charges - Dammam
  await prisma.journalEntry.create({ data: { entryNumber: 'JE-2026-0015', date: new Date('2026-02-13'), description: 'Port charges - Dammam container handling for SEC', reference: 'EXP-2026-0008', referenceType: 'EXPENSE', totalDebit: 7475, totalCredit: 7475, status: 'POSTED', postedAt: new Date('2026-02-13'), fiscalPeriodId: febPeriod!.id, createdById: admin.id, approvedById: admin.id, approvedAt: new Date('2026-02-13'), lines: { create: [{ lineNumber: 1, accountId: dbAccounts[38].id, debitAmount: 6500, creditAmount: 0, description: 'Port & terminal charges - Dammam' }, { lineNumber: 2, accountId: dbAccounts[9].id, debitAmount: 975, creditAmount: 0, description: 'Input VAT on port charges' }, { lineNumber: 3, accountId: dbAccounts[15].id, debitAmount: 0, creditAmount: 7475, description: 'AP - King Abdulaziz Port', vendorId: vendors[7].id }] } } });

  // JE-16: Customs duties - Al Faisaliah
  await prisma.journalEntry.create({ data: { entryNumber: 'JE-2026-0016', date: new Date('2026-02-14'), description: 'Customs duties - Al Faisaliah Group import', reference: 'EXP-2026-0009', referenceType: 'EXPENSE', totalDebit: 17250, totalCredit: 17250, status: 'POSTED', postedAt: new Date('2026-02-14'), fiscalPeriodId: febPeriod!.id, createdById: admin.id, approvedById: admin.id, approvedAt: new Date('2026-02-14'), lines: { create: [{ lineNumber: 1, accountId: dbAccounts[37].id, debitAmount: 15000, creditAmount: 0, description: 'Customs & government fees' }, { lineNumber: 2, accountId: dbAccounts[9].id, debitAmount: 2250, creditAmount: 0, description: 'Input VAT on customs' }, { lineNumber: 3, accountId: dbAccounts[19].id, debitAmount: 0, creditAmount: 17250, description: 'Customs duties payable', vendorId: vendors[0].id }] } } });

  // JE-17: Fuel expense
  await prisma.journalEntry.create({ data: { entryNumber: 'JE-2026-0017', date: new Date('2026-02-15'), description: 'Diesel fuel expense - February batch 1', reference: 'EXP-2026-0010', referenceType: 'EXPENSE', totalDebit: 3220, totalCredit: 3220, status: 'POSTED', postedAt: new Date('2026-02-15'), fiscalPeriodId: febPeriod!.id, createdById: admin.id, approvedById: admin.id, approvedAt: new Date('2026-02-15'), lines: { create: [{ lineNumber: 1, accountId: dbAccounts[35].id, debitAmount: 2800, creditAmount: 0, description: 'Fuel & diesel expenses' }, { lineNumber: 2, accountId: dbAccounts[9].id, debitAmount: 420, creditAmount: 0, description: 'Input VAT on fuel' }, { lineNumber: 3, accountId: dbAccounts[0].id, debitAmount: 0, creditAmount: 3220, description: 'Paid from petty cash' }] } } });

  // JE-18: Al Faisaliah revenue
  await prisma.journalEntry.create({ data: { entryNumber: 'JE-2026-0018', date: new Date('2026-02-14'), description: 'Revenue - Al Faisaliah Group import clearance SINV-2026-0008', reference: 'SINV-2026-0008', referenceType: 'SALES_INVOICE', totalDebit: 48300, totalCredit: 48300, status: 'POSTED', postedAt: new Date('2026-02-14'), fiscalPeriodId: febPeriod!.id, createdById: admin.id, approvedById: admin.id, approvedAt: new Date('2026-02-14'), lines: { create: [{ lineNumber: 1, accountId: dbAccounts[7].id, debitAmount: 48300, creditAmount: 0, description: 'AR - Al Faisaliah Group', customerId: moreCustomers[4].id }, { lineNumber: 2, accountId: dbAccounts[26].id, debitAmount: 0, creditAmount: 42000, description: 'Transportation revenue' }, { lineNumber: 3, accountId: dbAccounts[17].id, debitAmount: 0, creditAmount: 6300, description: 'Output VAT 15%' }] } } });

  // JE-19: Insurance expense
  await prisma.journalEntry.create({ data: { entryNumber: 'JE-2026-0019', date: new Date('2026-02-16'), description: 'Vehicle insurance renewal - BHA 5678', reference: 'EXP-2026-0011', referenceType: 'EXPENSE', totalDebit: 4025, totalCredit: 4025, status: 'POSTED', postedAt: new Date('2026-02-16'), fiscalPeriodId: febPeriod!.id, createdById: admin.id, approvedById: admin.id, approvedAt: new Date('2026-02-16'), lines: { create: [{ lineNumber: 1, accountId: dbAccounts[41].id, debitAmount: 3500, creditAmount: 0, description: 'Insurance expense' }, { lineNumber: 2, accountId: dbAccounts[9].id, debitAmount: 525, creditAmount: 0, description: 'Input VAT on insurance' }, { lineNumber: 3, accountId: dbAccounts[1].id, debitAmount: 0, creditAmount: 4025, description: 'Paid via Al Rajhi Bank' }] } } });

  // JE-20: ACWA Power revenue
  await prisma.journalEntry.create({ data: { entryNumber: 'JE-2026-0020', date: new Date('2026-02-18'), description: 'Revenue - ACWA Power import clearance SINV-2026-0010', reference: 'SINV-2026-0010', referenceType: 'SALES_INVOICE', totalDebit: 63250, totalCredit: 63250, status: 'POSTED', postedAt: new Date('2026-02-18'), fiscalPeriodId: febPeriod!.id, createdById: admin.id, approvedById: admin.id, approvedAt: new Date('2026-02-18'), lines: { create: [{ lineNumber: 1, accountId: dbAccounts[7].id, debitAmount: 63250, creditAmount: 0, description: 'AR - ACWA Power', customerId: moreCustomers[6].id }, { lineNumber: 2, accountId: dbAccounts[28].id, debitAmount: 0, creditAmount: 55000, description: 'Freight forwarding income' }, { lineNumber: 3, accountId: dbAccounts[17].id, debitAmount: 0, creditAmount: 8250, description: 'Output VAT 15%' }] } } });

  // JE-21: February salaries
  await prisma.journalEntry.create({ data: { entryNumber: 'JE-2026-0021', date: new Date('2026-02-19'), description: 'February 2026 staff salaries payment', reference: 'SAL-FEB-2026', referenceType: 'SALARY', totalDebit: 125000, totalCredit: 125000, status: 'POSTED', postedAt: new Date('2026-02-19'), fiscalPeriodId: febPeriod!.id, createdById: admin.id, approvedById: admin.id, approvedAt: new Date('2026-02-19'), lines: { create: [{ lineNumber: 1, accountId: dbAccounts[33].id, debitAmount: 72000, creditAmount: 0, description: 'Driver salaries - February' }, { lineNumber: 2, accountId: dbAccounts[34].id, debitAmount: 53000, creditAmount: 0, description: 'Staff salaries - February' }, { lineNumber: 3, accountId: dbAccounts[1].id, debitAmount: 0, creditAmount: 125000, description: 'Paid via Al Rajhi Bank' }] } } });

  // JE-22: Depreciation for February
  await prisma.journalEntry.create({ data: { entryNumber: 'JE-2026-0022', date: new Date('2026-02-20'), description: 'Monthly depreciation - February 2026', reference: 'DEP-FEB-2026', referenceType: 'DEPRECIATION', totalDebit: 6000, totalCredit: 6000, status: 'POSTED', postedAt: new Date('2026-02-20'), fiscalPeriodId: febPeriod!.id, createdById: admin.id, approvedById: admin.id, approvedAt: new Date('2026-02-20'), lines: { create: [{ lineNumber: 1, accountId: dbAccounts[42].id, debitAmount: 6000, creditAmount: 0, description: 'Depreciation expense - Feb 2026' }, { lineNumber: 2, accountId: dbAccounts[14].id, debitAmount: 0, creditAmount: 6000, description: 'Accumulated depreciation' }] } } });

  // JE-23: Vendor payment - Customs duties
  await prisma.journalEntry.create({ data: { entryNumber: 'JE-2026-0023', date: new Date('2026-02-20'), description: 'Vendor payment - Saudi Customs Authority duties', reference: 'PVC-2026-0003', referenceType: 'PAYMENT', totalDebit: 45000, totalCredit: 45000, status: 'POSTED', postedAt: new Date('2026-02-20'), fiscalPeriodId: febPeriod!.id, createdById: admin.id, approvedById: admin.id, approvedAt: new Date('2026-02-20'), lines: { create: [{ lineNumber: 1, accountId: dbAccounts[19].id, debitAmount: 45000, creditAmount: 0, description: 'Customs duties payable - cleared', vendorId: vendors[0].id }, { lineNumber: 2, accountId: dbAccounts[1].id, debitAmount: 0, creditAmount: 45000, description: 'Paid via Al Rajhi Bank' }] } } });

  // JE-24: Almarai partial payment received
  await prisma.journalEntry.create({ data: { entryNumber: 'JE-2026-0024', date: new Date('2026-02-21'), description: 'Partial payment received - Almarai Company SINV-2026-0009', reference: 'RCV-2026-0004', referenceType: 'PAYMENT', totalDebit: 11275, totalCredit: 11275, status: 'POSTED', postedAt: new Date('2026-02-21'), fiscalPeriodId: febPeriod!.id, createdById: admin.id, approvedById: admin.id, approvedAt: new Date('2026-02-21'), lines: { create: [{ lineNumber: 1, accountId: dbAccounts[2].id, debitAmount: 11275, creditAmount: 0, description: 'Deposited to SNB' }, { lineNumber: 2, accountId: dbAccounts[7].id, debitAmount: 0, creditAmount: 11275, description: 'AR - Almarai partial payment', customerId: customers[5].id }] } } });

  // JE-25: VAT settlement for January
  await prisma.journalEntry.create({ data: { entryNumber: 'JE-2026-0025', date: new Date('2026-02-22'), description: 'VAT settlement - January 2026 net VAT payable', reference: 'VAT-JAN-2026', referenceType: 'TAX', totalDebit: 5500, totalCredit: 5500, status: 'POSTED', postedAt: new Date('2026-02-22'), fiscalPeriodId: febPeriod!.id, createdById: admin.id, approvedById: admin.id, approvedAt: new Date('2026-02-22'), lines: { create: [{ lineNumber: 1, accountId: dbAccounts[17].id, debitAmount: 5500, creditAmount: 0, description: 'VAT payable settlement' }, { lineNumber: 2, accountId: dbAccounts[1].id, debitAmount: 0, creditAmount: 5500, description: 'VAT payment via Al Rajhi' }] } } });

  // JE-26: DRAFT - Pending vendor invoice (not yet posted)
  await prisma.journalEntry.create({ data: { entryNumber: 'JE-2026-0026', date: new Date('2026-02-23'), description: 'DRAFT - Pending vendor invoice for container leasing', reference: 'DRAFT-LEASE-001', referenceType: 'EXPENSE', totalDebit: 18000, totalCredit: 18000, status: 'DRAFT', fiscalPeriodId: febPeriod!.id, createdById: admin.id, lines: { create: [{ lineNumber: 1, accountId: dbAccounts[45].id, debitAmount: 18000, creditAmount: 0, description: 'Container lease expense - pending' }, { lineNumber: 2, accountId: dbAccounts[15].id, debitAmount: 0, creditAmount: 18000, description: 'AP - container leasing vendor' }] } } });

  console.log('✅ 16 More Journal Entries created (26 total)');

  // ==================== ADDITIONAL SHIPMENTS (5 more = 10 total) ====================
  console.log('Creating additional shipments...');
  await prisma.shipment.createMany({
    data: [
      { shipmentNumber: 'SHP-2026-0006', origin: 'Hamburg, Germany', destination: 'Jeddah, KSA', status: 'IN_TRANSIT', modeOfTransport: 'SEA', carrier: 'Evergreen', etd: new Date('2026-02-10'), eta: new Date('2026-03-05') },
      { shipmentNumber: 'SHP-2026-0007', origin: 'Shenzhen, China', destination: 'Riyadh, KSA', status: 'IN_TRANSIT', modeOfTransport: 'AIR', carrier: 'Emirates SkyCargo', etd: new Date('2026-02-15'), eta: new Date('2026-02-16') },
      { shipmentNumber: 'SHP-2026-0008', origin: 'Basel, Switzerland', destination: 'Jeddah, KSA', status: 'DELIVERED', modeOfTransport: 'AIR', carrier: 'Saudia Cargo', etd: new Date('2026-02-01'), eta: new Date('2026-02-02'), atd: new Date('2026-02-01'), ata: new Date('2026-02-02') },
      { shipmentNumber: 'SHP-2026-0009', origin: 'Rotterdam, Netherlands', destination: 'Dammam, KSA', status: 'IN_TRANSIT', modeOfTransport: 'SEA', carrier: 'MSC', etd: new Date('2026-02-08'), eta: new Date('2026-03-01') },
      { shipmentNumber: 'SHP-2026-0010', origin: 'Jeddah, KSA', destination: 'Dar es Salaam, Tanzania', status: 'DELIVERED', modeOfTransport: 'SEA', carrier: 'Maersk Line', etd: new Date('2026-02-05'), eta: new Date('2026-02-18'), atd: new Date('2026-02-05'), ata: new Date('2026-02-17') },
    ]
  });
  console.log('✅ 5 More Shipments created (10 total)');

  // ==================== ADDITIONAL DAILY WORK ORDERS (5 more = 10 total) ====================
  console.log('Creating additional daily work orders...');
  await prisma.dailyWorkOrder.createMany({
    data: [
      { orderNumber: 'DWO-2026-0006', date: new Date('2026-02-15'), assignedTo: 'Salem Al-Otaibi', description: 'Customs clearance for STC equipment at Riyadh Dry Port', location: 'Riyadh Dry Port', status: 'IN_PROGRESS', priority: 'HIGH' },
      { orderNumber: 'DWO-2026-0007', date: new Date('2026-02-16'), assignedTo: 'Nawaf Al-Shammari', description: 'Container inspection for Al Faisaliah Group heavy equipment', location: 'King Abdulaziz Port, Dammam', status: 'PENDING', priority: 'URGENT' },
      { orderNumber: 'DWO-2026-0008', date: new Date('2026-02-17'), assignedTo: 'Driver - Saeed', description: 'Deliver pharmaceutical cargo to Nahdi Distribution Center', location: 'South Jeddah Logistics Zone', status: 'COMPLETED', priority: 'HIGH', completedAt: new Date('2026-02-17T16:00:00') },
      { orderNumber: 'DWO-2026-0009', date: new Date('2026-02-18'), assignedTo: 'Bandar Al-Ghamdi', description: 'ACWA Power - Samsung Engineering equipment documentation', location: 'Jubail Commercial Port', status: 'IN_PROGRESS', priority: 'NORMAL' },
      { orderNumber: 'DWO-2026-0010', date: new Date('2026-02-19'), assignedTo: 'Driver - Faisal', description: 'Reefer container delivery - Almarai export to Tanzania', location: 'Jeddah Islamic Port', status: 'COMPLETED', priority: 'HIGH', completedAt: new Date('2026-02-19T11:30:00') },
    ]
  });
  console.log('✅ 5 More Daily Work Orders created (10 total)');

  // ==================== ADDITIONAL SALES QUOTES (3 more = 6 total) ====================
  console.log('Creating additional sales quotes...');
  await prisma.salesQuote.createMany({
    data: [
      { quoteNumber: 'SQ-2026-0004', clientName: 'Al Othaim Markets', clientEmail: 'logistics@othaim.sa', clientPhone: '+966-11-286-0000', quoteDate: new Date('2026-02-15'), validUntil: new Date('2026-03-15'), subtotal: 15000, vatAmount: 2250, totalAmount: 17250, status: 'SENT', items: JSON.stringify([{ service: 'Import Clearance + Transport', amount: 15000 }]) },
      { quoteNumber: 'SQ-2026-0005', clientName: 'Zamil Steel Buildings', clientEmail: 'supply@zamil.sa', clientPhone: '+966-13-358-0000', quoteDate: new Date('2026-02-18'), validUntil: new Date('2026-03-18'), subtotal: 45000, vatAmount: 6750, totalAmount: 51750, status: 'DRAFT', items: JSON.stringify([{ service: 'FCL Sea Import Clearance', amount: 25000 }, { service: 'Heavy Equipment Transport', amount: 20000 }]) },
      { quoteNumber: 'SQ-2026-0006', clientName: 'Tanmiah Food Company', clientEmail: 'warehouse@tanmiah.sa', clientPhone: '+966-11-477-1234', quoteDate: new Date('2026-02-20'), validUntil: new Date('2026-03-20'), subtotal: 9800, vatAmount: 1470, totalAmount: 11270, status: 'ACCEPTED', items: JSON.stringify([{ service: 'Cold Chain Import Clearance', amount: 6300 }, { service: 'Reefer Transport', amount: 3500 }]) },
    ]
  });
  console.log('✅ 3 More Sales Quotes created (6 total)');

  // ==================== ADDITIONAL FILE VERIFICATIONS (3 more = 8 total) ====================
  console.log('Creating additional file verifications...');
  await prisma.fileVerification.createMany({
    data: [
      { fileNumber: 'FV-2026-0006', jobReferenceNum: 'JOB-2026-0007', clientName: 'Bin Laden Group', documentType: 'Bill of Lading', status: 'IN_REVIEW', verifiedBy: 'Ahmed Al-Rashidi' },
      { fileNumber: 'FV-2026-0007', jobReferenceNum: 'JOB-2026-0009', clientName: 'Nahdi Medical Company', documentType: 'Pharma Certificate', status: 'VERIFIED', verifiedBy: 'Sara Al-Otaibi', verifiedAt: new Date('2026-02-03'), notes: 'Temperature control certificate verified' },
      { fileNumber: 'FV-2026-0008', jobReferenceNum: 'JOB-2026-0012', clientName: 'ACWA Power', documentType: 'Certificate of Origin', status: 'PENDING', notes: 'Awaiting Korean embassy attestation' },
    ]
  });
  console.log('✅ 3 More File Verifications created (8 total)');

  // ==================== ADDITIONAL CRM LEADS (4 more = 8 total) ====================
  console.log('Creating additional CRM leads...');
  await prisma.cRMLead.createMany({
    data: [
      { name: 'Rashid Al-Dosari', company: 'National Water Company', email: 'logistics@nwc.sa', phone: '+966-11-600-0000', source: 'REFERRAL', status: 'QUALIFIED', priority: 'HIGH', assignedTo: 'Abdullah Al-Mutairi', nextFollowUp: new Date('2026-02-25'), notes: 'Large pipe imports from Germany, monthly volumes' },
      { name: 'Salem Al-Obaidi', company: 'Riyadh Metro Company', email: 'supply@riyadhmetro.sa', phone: '+966-11-255-0000', source: 'COLD_CALL', status: 'NEW', priority: 'HIGH', notes: 'Metro construction parts - ongoing project 3 years' },
      { name: 'Fatimah Al-Sharif', company: 'Saudi Steel Pipe Co.', email: 'imports@saudisteel.sa', phone: '+966-13-340-8000', source: 'EXHIBITION', status: 'CONTACTED', priority: 'MEDIUM', assignedTo: 'Turki Al-Harbi', nextFollowUp: new Date('2026-03-01'), notes: 'Raw materials import from India and China' },
      { name: 'Ibrahim Al-Naimi', company: 'Tasnee (NATIONAL INDUSTRIALIZATION)', email: 'logistics@tasnee.sa', phone: '+966-11-401-0000', source: 'LINKEDIN', status: 'PROPOSAL', priority: 'HIGH', assignedTo: 'Saud Al-Qahtani', nextFollowUp: new Date('2026-02-28'), notes: 'Chemical import clearance - potential annual contract SAR 2M+' },
    ]
  });
  console.log('✅ 4 More CRM Leads created (8 total)');

  // ==================== ADDITIONAL PAYABLE EXPENSES (4 more = 8 total) ====================
  console.log('Creating additional payable expenses...');
  await prisma.payableExpense.createMany({
    data: [
      { expenseNumber: 'PE-2026-0005', vendorId: vendors[4].id, date: new Date('2026-02-10'), dueDate: new Date('2026-03-12'), amount: 18000, vatAmount: 2700, totalAmount: 20700, balanceDue: 20700, category: 'Container Leasing', description: 'Feb container lease charges', status: 'UNPAID' },
      { expenseNumber: 'PE-2026-0006', vendorId: moreVendors[0].id, date: new Date('2026-02-12'), dueDate: new Date('2026-02-27'), amount: 3500, vatAmount: 525, totalAmount: 4025, balanceDue: 4025, category: 'Courier', description: 'DHL document courier services', status: 'UNPAID' },
      { expenseNumber: 'PE-2026-0007', vendorId: moreVendors[1].id, date: new Date('2026-02-15'), dueDate: new Date('2026-03-17'), amount: 65000, vatAmount: 9750, totalAmount: 74750, balanceDue: 74750, category: 'Shipping', description: 'Maersk sea freight charges', status: 'UNPAID' },
      { expenseNumber: 'PE-2026-0008', vendorId: moreVendors[3].id, date: new Date('2026-02-18'), dueDate: new Date('2026-03-20'), amount: 8500, vatAmount: 1275, totalAmount: 9775, balanceDue: 0, paidAmount: 9775, category: 'Utilities', description: 'February electricity bill', status: 'PAID' },
    ]
  });
  console.log('✅ 4 More Payable Expenses created (8 total)');

  // ==================== ADDITIONAL CLIENT ADVANCES (2 more = 5 total) ====================
  console.log('Creating additional client advances...');
  await prisma.clientAdvance.createMany({
    data: [
      { advanceNumber: 'ADV-2026-0004', clientId: moreCustomers[4].id, amount: 200000, date: new Date('2026-02-10'), paymentMethod: 'BANK_TRANSFER', reference: 'FAISALIAH-ADV-001', description: 'Advance for heavy equipment import clearance', status: 'ACTIVE', usedAmount: 48300, remainingAmount: 151700 },
      { advanceNumber: 'ADV-2026-0005', clientId: moreCustomers[6].id, amount: 150000, date: new Date('2026-02-15'), paymentMethod: 'BANK_TRANSFER', reference: 'ACWA-ADV-001', description: 'Advance for Samsung Engineering import', status: 'ACTIVE', usedAmount: 63250, remainingAmount: 86750 },
    ]
  });
  console.log('✅ 2 More Client Advances created (5 total)');

  // ==================== ADDITIONAL OPB (3+3 more) ====================
  console.log('Creating additional OPB entries...');
  await prisma.clientOPB.createMany({
    data: [
      { clientId: moreCustomers[0].id, date: new Date('2026-01-01'), debitAmount: 180000, description: 'Opening balance - Bin Laden Group', reference: 'OPB-2025' },
      { clientId: moreCustomers[4].id, date: new Date('2026-01-01'), debitAmount: 115000, description: 'Opening balance - Al Faisaliah Group', reference: 'OPB-2025' },
      { clientId: moreCustomers[5].id, date: new Date('2026-01-01'), debitAmount: 320000, description: 'Opening balance - Saudi Electricity Company', reference: 'OPB-2025' },
    ]
  });
  await prisma.payableOPB.createMany({
    data: [
      { vendorId: moreVendors[0].id, date: new Date('2026-01-01'), creditAmount: 8500, description: 'Opening balance - DHL Express', reference: 'OPB-2025' },
      { vendorId: moreVendors[1].id, date: new Date('2026-01-01'), creditAmount: 65000, description: 'Opening balance - Maersk Line', reference: 'OPB-2025' },
      { vendorId: moreVendors[3].id, date: new Date('2026-01-01'), creditAmount: 12000, description: 'Opening balance - SEC Power', reference: 'OPB-2025' },
    ]
  });
  console.log('✅ 3+3 More OPB entries created (8+8 total)');

  // ==================== ADDITIONAL VEHICLES (3 more = 8 total) ====================
  console.log('Creating additional vehicles...');
  await prisma.vehicle.createMany({
    data: [
      { plateNumber: 'BHA 3456', make: 'MAN', model: 'TGX 26.480', year: 2024, type: 'TRUCK', driver: 'Yousef Al-Harbi', status: 'ACTIVE', location: 'Dammam Port', fuelLevel: 78, mileage: 15200, nextServiceDate: new Date('2026-04-15') },
      { plateNumber: 'BHA 7890', make: 'DAF', model: 'XF 530', year: 2023, type: 'TRUCK', driver: 'Nasser Al-Qahtani', status: 'ACTIVE', location: 'Jeddah Depot', fuelLevel: 55, mileage: 52300, nextServiceDate: new Date('2026-03-20') },
      { plateNumber: 'TRL 1234', make: 'Schmitz', model: 'Flat Bed', year: 2024, type: 'TRAILER', driver: null, status: 'ACTIVE', location: 'Jubail Port', fuelLevel: 0, mileage: 8500 },
    ]
  });
  console.log('✅ 3 More Vehicles created (8 total)');

  // ==================== ADDITIONAL ASSETS (3 more = 8 total) ====================
  console.log('Creating additional assets...');
  await prisma.asset.createMany({
    data: [
      { name: 'Reach Stacker - Kalmar DRG450', category: 'Equipment', purchaseDate: new Date('2024-01-15'), cost: 450000, currentValue: 382500, depreciationRate: 10, location: 'Dammam Port', status: 'ACTIVE' },
      { name: 'HP LaserJet Pro MFP (x3)', category: 'IT Equipment', purchaseDate: new Date('2025-06-01'), cost: 15000, currentValue: 12750, depreciationRate: 20, location: 'Head Office', status: 'ACTIVE' },
      { name: 'Container Chassis - 40ft (x5)', category: 'Equipment', purchaseDate: new Date('2023-09-10'), cost: 250000, currentValue: 187500, depreciationRate: 10, location: 'Riyadh Depot', status: 'ACTIVE' },
    ]
  });
  console.log('✅ 3 More Assets created (8 total)');

  // ==================== ADDITIONAL RCV/PVC (3 more = 8 total) ====================
  console.log('Creating additional RCV/PVC vouchers...');
  await prisma.rcvPvc.createMany({
    data: [
      { type: 'RCV', voucherNo: 'RCV-2026-0004', date: new Date('2026-02-21'), clientId: customers[5].id, amount: 11275, reference: 'SINV-2026-0009', status: 'POSTED', notes: 'Partial payment from Almarai' },
      { type: 'PVC', voucherNo: 'PVC-2026-0003', date: new Date('2026-02-20'), vendorId: vendors[0].id, amount: 45000, reference: 'CUST-DUTY', status: 'POSTED', notes: 'Customs duties payment' },
      { type: 'RCV', voucherNo: 'RCV-2026-0005', date: new Date('2026-02-10'), clientId: moreCustomers[3].id, amount: 9430, reference: 'SINV-2026-0006', status: 'POSTED', notes: 'Nahdi Medical full payment' },
    ]
  });
  console.log('✅ 3 More RCV/PVC Vouchers created (8 total)');

  // ==================== ADDITIONAL BANK TRANSACTIONS (13 more = 25 total) ====================
  console.log('Creating additional bank transactions...');
  await prisma.bankTransaction.createMany({
    data: [
      // Al Rajhi (banks[0])
      { bankAccountId: banks[0].id, transactionDate: new Date('2026-02-10'), type: 'CREDIT', description: 'Nahdi Medical payment received', reference: 'SINV-2026-0006', amount: 9430, documentType: 'RECEIPT', documentRef: 'RCV-2026-0005', reconciliationStatus: 'UNRECONCILED' },
      { bankAccountId: banks[0].id, transactionDate: new Date('2026-02-11'), type: 'DEBIT', description: 'Warehouse storage payment', reference: 'EXP-2026-0006', amount: 4830, documentType: 'PAYMENT_VOUCHER', reconciliationStatus: 'UNRECONCILED' },
      { bankAccountId: banks[0].id, transactionDate: new Date('2026-02-16'), type: 'DEBIT', description: 'Vehicle insurance - BHA 5678', reference: 'EXP-2026-0011', amount: 4025, documentType: 'PAYMENT_VOUCHER', reconciliationStatus: 'UNRECONCILED' },
      { bankAccountId: banks[0].id, transactionDate: new Date('2026-02-19'), type: 'DEBIT', description: 'February staff salaries', reference: 'SAL-FEB-2026', amount: 125000, documentType: 'PAYMENT_VOUCHER', reconciliationStatus: 'UNRECONCILED' },
      { bankAccountId: banks[0].id, transactionDate: new Date('2026-02-20'), type: 'DEBIT', description: 'Customs duties payment', reference: 'PVC-2026-0003', amount: 45000, documentType: 'PAYMENT_VOUCHER', reconciliationStatus: 'UNRECONCILED' },
      { bankAccountId: banks[0].id, transactionDate: new Date('2026-02-22'), type: 'DEBIT', description: 'VAT settlement January', reference: 'VAT-JAN-2026', amount: 5500, documentType: 'PAYMENT_VOUCHER', reconciliationStatus: 'UNRECONCILED' },
      // SNB (banks[1])
      { bankAccountId: banks[1].id, transactionDate: new Date('2026-02-21'), type: 'CREDIT', description: 'Almarai partial payment', reference: 'SINV-2026-0009', amount: 11275, documentType: 'RECEIPT', documentRef: 'RCV-2026-0004', reconciliationStatus: 'UNRECONCILED' },
      // Riyad Bank (banks[2])
      { bankAccountId: banks[2].id, transactionDate: new Date('2026-02-13'), type: 'DEBIT', description: 'Port charges Dammam - SEC', reference: 'EXP-2026-0008', amount: 7475, documentType: 'PAYMENT_VOUCHER', reconciliationStatus: 'UNRECONCILED' },
      // SABB (banks[3])
      { bankAccountId: banks[3].id, transactionDate: new Date('2026-02-10'), type: 'CREDIT', description: 'Al Faisaliah Group advance', reference: 'ADV-2026-0004', amount: 200000, documentType: 'RECEIPT', reconciliationStatus: 'RECONCILED' },
      { bankAccountId: banks[3].id, transactionDate: new Date('2026-02-18'), type: 'DEBIT', description: 'Maersk freight charges', reference: 'PE-2026-0007', amount: 74750, documentType: 'PAYMENT_VOUCHER', reconciliationStatus: 'UNRECONCILED' },
      // Alinma (banks[4])
      { bankAccountId: banks[4].id, transactionDate: new Date('2026-02-15'), type: 'CREDIT', description: 'ACWA Power advance', reference: 'ADV-2026-0005', amount: 150000, documentType: 'RECEIPT', reconciliationStatus: 'RECONCILED' },
      { bankAccountId: banks[4].id, transactionDate: new Date('2026-02-18'), type: 'DEBIT', description: 'SEC electricity bill', reference: 'PE-2026-0008', amount: 9775, documentType: 'PAYMENT_VOUCHER', reconciliationStatus: 'RECONCILED' },
      // Bank AlJazira (banks[5])
      { bankAccountId: banks[5].id, transactionDate: new Date('2026-02-12'), type: 'DEBIT', description: 'DHL courier services', reference: 'PE-2026-0006', amount: 4025, documentType: 'PAYMENT_VOUCHER', reconciliationStatus: 'UNRECONCILED' },
    ]
  });
  console.log('✅ 13 More Bank Transactions created (25 total)');

  // ==================== COUNTERS ====================
  const counters = [
    { name: 'INVOICE', prefix: 'INV', value: 0, year: 2026 },
    { name: 'BILL', prefix: 'BILL', value: 0, year: 2026 },
    { name: 'PAYMENT', prefix: 'PAY', value: 0, year: 2026 },
    { name: 'JOURNAL', prefix: 'JE', value: 25, year: 2026 },
    { name: 'SALES_INVOICE', prefix: 'SINV', value: 10, year: 2026 },
    { name: 'JOB', prefix: 'JOB', value: 15, year: 2026 },
    { name: 'EXPENSE', prefix: 'EXP', value: 15, year: 2026 },
    { name: 'ADVANCE', prefix: 'ADV', value: 5, year: 2026 },
    { name: 'SHIPMENT', prefix: 'SHP', value: 10, year: 2026 },
    { name: 'DWO', prefix: 'DWO', value: 10, year: 2026 },
    { name: 'QUOTE', prefix: 'SQ', value: 6, year: 2026 },
    { name: 'PAYABLE_EXPENSE', prefix: 'PE', value: 8, year: 2026 },
    { name: 'RCV_PVC', prefix: 'RCV', value: 5, year: 2026 },
    { name: 'FILE_VERIFICATION', prefix: 'FV', value: 8, year: 2026 },
  ];
  for (const c of counters) {
    await prisma.counter.upsert({ where: { name_year: { name: c.name, year: c.year } }, update: { value: c.value, prefix: c.prefix }, create: c });
  }

  // ==================== SETTINGS ====================
  await prisma.setting.createMany({
    data: [
      { key: 'COMPANY_NAME', value: 'Fayha Arabia Company', type: 'STRING', category: 'COMPANY' },
      { key: 'COMPANY_NAME_AR', value: 'شركة فيحا أرابيا', type: 'STRING', category: 'COMPANY' },
      { key: 'COMPANY_CR_NUMBER', value: '1010616141', type: 'STRING', category: 'COMPANY' },
      { key: 'COMPANY_VAT_NUMBER', value: '314257580500003', type: 'STRING', category: 'COMPANY' },
      { key: 'COMPANY_ADDRESS', value: 'Building No: 8298, Prince Muhammad Ibn Abdulrahman Ibn Abdulaziz, Al Mishael Dist., Riyadh 14325, Saudi Arabia', type: 'STRING', category: 'COMPANY' },
      { key: 'COMPANY_CITY', value: 'Riyadh', type: 'STRING', category: 'COMPANY' },
      { key: 'COMPANY_DISTRICT', value: 'Al Mishael Dist.', type: 'STRING', category: 'COMPANY' },
      { key: 'COMPANY_STREET', value: 'Prince Muhammad Ibn Abdulrahman Ibn Abdulaziz', type: 'STRING', category: 'COMPANY' },
      { key: 'COMPANY_BUILDING_NO', value: '8298', type: 'STRING', category: 'COMPANY' },
      { key: 'COMPANY_POSTAL_CODE', value: '14325', type: 'STRING', category: 'COMPANY' },
      { key: 'COMPANY_COUNTRY', value: 'SA', type: 'STRING', category: 'COMPANY' },
      { key: 'COMPANY_PHONE', value: '050 057 1423', type: 'STRING', category: 'COMPANY' },
      { key: 'COMPANY_EMAIL', value: 'info@fayha.sa', type: 'STRING', category: 'COMPANY' },
      { key: 'VAT_RATE', value: '0.15', type: 'NUMBER', category: 'TAX' },
      { key: 'DEFAULT_CURRENCY', value: 'SAR', type: 'STRING', category: 'ACCOUNTING' },
      { key: 'FISCAL_YEAR_START', value: '01-01', type: 'STRING', category: 'ACCOUNTING' },
      { key: 'DEFAULT_PAYMENT_TERMS', value: '30', type: 'NUMBER', category: 'ACCOUNTING' },
      { key: 'INVOICE_PREFIX', value: 'INV', type: 'STRING', category: 'NUMBERING' },
      { key: 'BILL_PREFIX', value: 'BILL', type: 'STRING', category: 'NUMBERING' },
      { key: 'AUTO_POST_JOURNALS', value: 'false', type: 'BOOLEAN', category: 'ACCOUNTING' },
    ]
  });
  console.log('✅ Settings & counters created');

  console.log('\n🎉 Database seeded successfully with EXPANDED data!');
  console.log('\n📋 Summary (100+ entries across all sections):');
  console.log('   Users:             6');
  console.log('   Bank Accounts:     6');
  console.log('   Chart of Accounts: 48');
  console.log('   Customers:         15');
  console.log('   Consignees:        8');
  console.log('   Vendors:           12');
  console.log('   Job Categories:    5');
  console.log('   Job Titles:        9');
  console.log('   Job Controllers:   3');
  console.log('   Salesmen:          5');
  console.log('   Invoice Services:  66');
  console.log('   Terminals:         8');
  console.log('   Port Handling:     6');
  console.log('   FCL/LCL Types:     8');
  console.log('   Job References:    15');
  console.log('   Sales Invoices:    10');
  console.log('   Shipments:         10');
  console.log('   Daily Work Orders: 10');
  console.log('   Sales Quotes:      6');
  console.log('   File Verifications: 8');
  console.log('   CRM Leads:         8');
  console.log('   Expense Entries:   15');
  console.log('   Payable Expenses:  8');
  console.log('   Client Advances:   5');
  console.log('   Client OPB:        8');
  console.log('   Payable OPB:       8');
  console.log('   Vehicles (Fleet):  8');
  console.log('   Assets:            8');
  console.log('   RCV/PVC Vouchers:  8');
  console.log('   Journal Entries:   25');
  console.log('   Bank Transactions: 25');
  console.log('   ──────────────────────');
  console.log('   TOTAL RECORDS:     350+');
  console.log('\n📋 Login Credentials:');
  console.log('   Admin:      admin@fayha-transport.sa / admin123');
  console.log('   Accountant: accountant@fayha-transport.sa / admin123');
  console.log('   Finance:    finance@fayha-transport.sa / admin123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
