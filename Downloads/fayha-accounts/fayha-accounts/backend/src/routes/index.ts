// ==========================================
// FAYHA TRANSPORTATION - API Routes
// ==========================================

import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
import { authController } from '../controllers/auth.controller';
import { accountController } from '../controllers/account.controller';
import { journalController } from '../controllers/journal.controller';
import { invoiceController } from '../controllers/invoice.controller';
import { billController } from '../controllers/bill.controller';
import { paymentController } from '../controllers/payment.controller';
import { bankController, customerController, vendorController, dashboardController, settingsController } from '../controllers/bank.controller';
import {
  consigneeController,
  jobCategoryController,
  jobTitleController,
  jobControllerCtrl,
  salesmanController,
  jobReferenceController,
  salesInvoiceController,
  invoiceServiceController,
  clientAdvanceController,
  expenseEntryController,
  payableExpenseController,
  clientOPBController,
  payableOPBController,
  terminalController,
  portHandlingController,
  shipmentController,
  dailyWorkOrderController,
  salesQuoteController,
  fclLclController,
  fileVerificationController,
  crmLeadController,
  paymentEntryController,
  fleetController,
  assetController,
  rcvPvcController,
  clientServiceController,
  customerImportController,
} from '../controllers/clearance.controller';
import { transactionController } from '../controllers/transaction.controller';
import { documentController } from '../controllers/document.controller';

const router = Router();

// Helper: standard CRUD routes for a resource
function crudRoutes(path: string, ctrl: any) {
  router.get(path, authenticate, ctrl.getAll);
  router.get(`${path}/:id`, authenticate, ctrl.getById);
  router.post(path, authenticate, ctrl.create);
  router.put(`${path}/:id`, authenticate, ctrl.update);
  router.delete(`${path}/:id`, authenticate, ctrl.remove);
}

// ==================== AUTH ====================
router.post('/auth/login', authController.login);
router.post('/auth/register', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), authController.register);
router.get('/auth/me', authenticate, authController.getProfile);
router.post('/auth/refresh', authController.refreshToken);

// ==================== DASHBOARD ====================
router.get('/dashboard/summary', authenticate, dashboardController.getSummary);
router.get('/dashboard/balance-sheet', authenticate, dashboardController.getBalanceSheet);
router.get('/dashboard/income-statement', authenticate, dashboardController.getIncomeStatement);

// ==================== CHART OF ACCOUNTS ====================
router.get('/accounts', authenticate, accountController.getAll);
router.get('/accounts/trial-balance', authenticate, accountController.getTrialBalance);
router.get('/accounts/:id', authenticate, accountController.getById);
router.get('/accounts/:id/ledger', authenticate, accountController.getLedger);
router.post('/accounts', authenticate, accountController.create);
router.put('/accounts/:id', authenticate, accountController.update);

// ==================== JOURNAL ENTRIES ====================
router.get('/journals', authenticate, journalController.getAll);
router.get('/journals/:id', authenticate, journalController.getById);
router.post('/journals', authenticate, journalController.create);
router.post('/journals/:id/post', authenticate, journalController.postEntry);
router.post('/journals/:id/void', authenticate, journalController.voidEntry);

// ==================== INVOICES (AR) ====================
router.get('/invoices', authenticate, invoiceController.getAll);
router.get('/invoices/aging', authenticate, invoiceController.getAgingReport);
router.get('/invoices/:id', authenticate, invoiceController.getById);
router.post('/invoices', authenticate, invoiceController.create);
router.post('/invoices/:id/send', authenticate, invoiceController.sendInvoice);

// ==================== BILLS (AP) ====================
router.get('/bills', authenticate, billController.getAll);
router.get('/bills/aging', authenticate, billController.getAgingReport);
router.get('/bills/:id', authenticate, billController.getById);
router.post('/bills', authenticate, billController.create);

// ==================== PAYMENTS ====================
router.get('/payments', authenticate, paymentController.getAll);
router.post('/payments/receive', authenticate, paymentController.receivePayment);
router.post('/payments/disburse', authenticate, paymentController.disbursePayment);

// ==================== BANK ACCOUNTS ====================
router.get('/banks', authenticate, bankController.getAll);
router.get('/banks/:id', authenticate, bankController.getById);
router.get('/banks/:id/transactions', authenticate, bankController.getTransactions);
router.post('/banks', authenticate, bankController.create);
router.put('/banks/:id', authenticate, bankController.update);
router.delete('/banks/:id', authenticate, bankController.delete);
router.post('/banks/:id/reconcile', authenticate, bankController.reconcile);
router.post('/banks/repair-payment-types', authenticate, bankController.repairPaymentTransactionTypes);

// ==================== CUSTOMERS ====================
router.get('/customers', authenticate, customerController.getAll);
router.get('/customers/:id', authenticate, customerController.getById);
router.get('/customers/:id/statement', authenticate, customerController.getStatement);
router.post('/customers', authenticate, customerController.create);
router.post('/customers/import', authenticate, upload.single('file'), customerImportController.importFromExcel);
router.put('/customers/:id', authenticate, customerController.update);
router.delete('/customers/:id', authenticate, customerController.delete);

// ==================== VENDORS ====================
router.get('/vendors', authenticate, vendorController.getAll);
router.get('/vendors/:id/statement', authenticate, vendorController.getStatement);
router.get('/vendors/:id', authenticate, vendorController.getById);
router.post('/vendors', authenticate, vendorController.create);
router.put('/vendors/:id', authenticate, vendorController.update);
router.delete('/vendors/:id', authenticate, vendorController.delete);

// ==================== CLIENT SERVICES ====================
router.get('/client-services/merged', authenticate, clientServiceController.getMerged);
router.get('/client-services', authenticate, clientServiceController.getAll);
router.get('/client-services/:id', authenticate, clientServiceController.getById);
router.post('/client-services', authenticate, clientServiceController.create);
router.put('/client-services/:id', authenticate, clientServiceController.update);
router.delete('/client-services/:id', authenticate, clientServiceController.remove);

// ==================== CLEARANCE ENTITIES ====================
crudRoutes('/consignees', consigneeController);
crudRoutes('/job-categories', jobCategoryController);
crudRoutes('/job-titles', jobTitleController);
crudRoutes('/job-controllers', jobControllerCtrl);
crudRoutes('/salesmen', salesmanController);
crudRoutes('/job-references', jobReferenceController);
router.post('/sales-invoices/:id/send', authenticate, salesInvoiceController.send);
router.post('/sales-invoices/:id/mark-invoiced', authenticate, salesInvoiceController.markAsInvoiced);
router.post('/sales-invoices/:id/report-zatca', authenticate, salesInvoiceController.reportToZatca);
router.post('/sales-invoices/:id/pdf', authenticate, salesInvoiceController.generatePdf);
crudRoutes('/sales-invoices', salesInvoiceController);

// ==================== DOCUMENTS ====================
router.get('/documents/:id/download', authenticate, documentController.download);
router.get('/documents/entity/:entityType/:entityId', authenticate, documentController.getByEntity);
crudRoutes('/invoice-services', invoiceServiceController);
router.get('/client-advances/by-client/:clientId', authenticate, clientAdvanceController.getByClient);
crudRoutes('/client-advances', clientAdvanceController);
crudRoutes('/expense-entries', expenseEntryController);
crudRoutes('/payable-expenses', payableExpenseController);
crudRoutes('/client-opb', clientOPBController);
crudRoutes('/payable-opb', payableOPBController);
crudRoutes('/terminals', terminalController);
crudRoutes('/port-handling', portHandlingController);
crudRoutes('/shipments', shipmentController);
crudRoutes('/daily-work-orders', dailyWorkOrderController);
router.post('/sales-quotes/:id/send', authenticate, salesQuoteController.send);
router.post('/sales-quotes/:id/convert', authenticate, salesQuoteController.convertToInvoice);
crudRoutes('/sales-quotes', salesQuoteController);
crudRoutes('/fcl-lcl', fclLclController);
crudRoutes('/file-verifications', fileVerificationController);
crudRoutes('/crm-leads', crmLeadController);

// ==================== TRANSACTIONS ====================
router.get('/transactions', authenticate, transactionController.getAll);
router.get('/transactions/entity/:entityId', authenticate, transactionController.getByEntity);

// ==================== FLEET ====================
crudRoutes('/fleet', fleetController);

// ==================== ASSETS ====================
crudRoutes('/assets', assetController);

// ==================== RCV/PVC ====================
router.get('/rcv-pvc', authenticate, rcvPvcController.getAll);
router.get('/rcv-pvc/:id', authenticate, rcvPvcController.getById);
router.post('/rcv-pvc', authenticate, rcvPvcController.create);
router.put('/rcv-pvc/:id', authenticate, rcvPvcController.update);
router.delete('/rcv-pvc/:id', authenticate, rcvPvcController.remove);

// ==================== PAYMENT ENTRIES (Journal-backed) ====================
router.get('/payment-entries', authenticate, paymentEntryController.getAll);
router.get('/payment-entries/:id', authenticate, paymentEntryController.getById);
router.post('/payment-entries', authenticate, paymentEntryController.create);
router.delete('/payment-entries/:id', authenticate, paymentEntryController.remove);

// ==================== SETTINGS ====================
router.get('/settings', authenticate, settingsController.getAll);
router.get('/settings/:category', authenticate, settingsController.getByCategory);
router.put('/settings/:key', authenticate, settingsController.update);
router.post('/settings/bulk', authenticate, settingsController.bulkUpdate);

export default router;
