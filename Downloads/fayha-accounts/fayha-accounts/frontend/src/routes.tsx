import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';

// Legacy pages (kept for backward compatibility)
import JobList from './pages/jobs/JobList';
import JobDetails from './pages/jobs/JobDetails';
import CustomerList from './pages/customers/CustomerList';
import VendorList from './pages/vendors/VendorList';
import TruckList from './pages/fleet/TruckList';
import InvoiceList from './pages/sales/InvoiceList';
import InvoiceEditor from './pages/sales/InvoiceEditor';
import InvoicePreview from './pages/sales/InvoicePreview';

// Accounting (Unified Module)
import AccountingModule from './pages/accounting/AccountingModule';
import ChartOfAccounts from './pages/accounting/ChartOfAccounts';
import JournalEntries from './pages/accounting/JournalEntries';
import GeneralLedger from './pages/accounting/GeneralLedger';
import TrialBalance from './pages/accounting/TrialBalance';
import BalanceSheet from './pages/accounting/BalanceSheet';
import IncomeStatement from './pages/accounting/IncomeStatement';
import AgingReports from './pages/accounting/AgingReports';
import BankReconciliation from './pages/accounting/BankReconciliation';
import BankAccounts from './pages/accounting/BankAccounts';
import AssetList from './pages/assets/AssetList';
import BillList from './pages/purchases/BillList';
import FinancialReports from './pages/reports/FinancialReports';
import Settings from './pages/settings/Settings';

// Job Reference Module (Phase 2)
import JobReferenceList from './pages/job-reference/JobReferenceList';
import JobReferenceForm from './pages/job-reference/JobReferenceForm';
import JobCategoryList from './pages/job-reference/JobCategoryList';
import JobTitleList from './pages/job-reference/JobTitleList';
import JobControllerList from './pages/job-reference/JobControllerList';
import ToBeInvoicedList from './pages/job-reference/ToBeInvoicedList';

// Payment Entry & Client Advance Module (Phase 3)
import PaymentEntryListPage from './pages/payment-entry/PaymentEntryList';
import PaymentEntryFormPage from './pages/payment-entry/PaymentEntryForm';
import PaymentEntryViewPage from './pages/payment-entry/PaymentEntryView';
import ClientAdvanceListPage from './pages/sales-income/ClientAdvanceList';
import ReceivePaymentListPage from './pages/sales-income/ReceivePaymentList';

// Sales Invoice Module (Phase 3)
import SalesInvoiceListPage from './pages/sales-invoice/SalesInvoiceList';
import SalesInvoiceEditorPage from './pages/sales-invoice/SalesInvoiceEditor';
import SalesInvoicePreviewPage from './pages/sales-invoice/SalesInvoicePreview';

// Phase 4: Accounting, Expenses & Financial
import PayableExpenseListPage from './pages/payable-expense/PayableExpenseList';
import ExpenseEntryListPage from './pages/expense-entry/ExpenseEntryList';
import ExpenseEntryFormPage from './pages/expense-entry/ExpenseEntryForm';
import ClientOPBListPage from './pages/client-opb/ClientOPBList';
import PayableOPBListPage from './pages/payable-opb/PayableOPBList';
import RcvPvcListPage from './pages/rcv-pvc/RcvPvcList';
import TransactionHistoryListPage from './pages/transaction-history/TransactionHistoryList';
import SOAPageComponent from './pages/soa/SOAPage';

// Phase 5: Supporting Modules
import CRMPageComponent from './pages/crm/CRMPage';
import ClientListPage from './pages/clients/ClientListPage';
import ClientDetailsPage from './pages/clients/ClientDetailsPage';
import ConsigneeListPage from './pages/consignee/ConsigneeList';
import PayableListPage from './pages/payable/PayableList';
import FclLclListPage from './pages/fcl-lcl/FclLclList';
import JobCostCenterPage from './pages/job-cost-center/JobCostCenter';
import FileVerificationListPage from './pages/file-verification/FileVerificationList';
import ShipmentListPage from './pages/shipment/ShipmentList';
import InvoiceServiceListPage from './pages/invoice-service/InvoiceServiceList';
import SalesQuoteListPage from './pages/sales-quote/SalesQuoteList';
import SalesQuoteEditorPage from './pages/sales-quote/SalesQuoteEditor';
import TerminalListPage from './pages/terminal/TerminalList';
import PortHandlingListPage from './pages/port-handling/PortHandlingList';
import DailyWorkOrderListPage from './pages/daily-work-order/DailyWorkOrderList';
import ReportPageComponent from './pages/report/ReportPage';
import DisplayPageComponent from './pages/display/DisplayPage';

// ===================================================================
// Routes
// ===================================================================

const AppRoutes: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<DashboardLayout />}>
                <Route index element={<Dashboard />} />

                {/* ============ CRM ============ */}
                <Route path="crm" element={<CRMPageComponent />} />

                {/* ============ Clients & Consignee ============ */}
                <Route path="clients" element={<ClientListPage />} />
                <Route path="clients/:id" element={<ClientDetailsPage />} />
                <Route path="consignee" element={<ConsigneeListPage />} />

                {/* ============ Payable ============ */}
                <Route path="payable" element={<PayableListPage />} />

                {/* ============ Job Reference ============ */}
                <Route path="job-reference" element={<JobReferenceList />} />
                <Route path="job-reference/new" element={<JobReferenceForm />} />
                <Route path="job-reference/:id" element={<JobReferenceForm />} />
                <Route path="job-reference/category" element={<JobCategoryList />} />
                <Route path="job-reference/title" element={<JobTitleList />} />
                <Route path="job-reference/controller" element={<JobControllerList />} />
                <Route path="job-reference/to-be-invoiced" element={<ToBeInvoicedList />} />

                {/* ============ FCL/LCL ============ */}
                <Route path="fcl-lcl" element={<FclLclListPage />} />

                {/* ============ Job Cost Center ============ */}
                <Route path="job-cost-center" element={<JobCostCenterPage />} />

                {/* ============ File Verification ============ */}
                <Route path="file-verification" element={<FileVerificationListPage />} />

                {/* ============ Shipment ============ */}
                <Route path="shipment" element={<ShipmentListPage />} />

                {/* ============ Invoice Service ============ */}
                <Route path="invoice-service" element={<InvoiceServiceListPage />} />

                {/* ============ Sales Quote ============ */}
                <Route path="sales-quote" element={<SalesQuoteListPage />} />
                <Route path="sales-quote/new" element={<SalesQuoteEditorPage />} />

                {/* ============ Sales Invoice ============ */}
                <Route path="sales-invoice" element={<SalesInvoiceListPage />} />
                <Route path="sales-invoice/new" element={<SalesInvoiceEditorPage />} />
                <Route path="sales-invoice/:id" element={<SalesInvoiceEditorPage />} />
                <Route path="sales-invoice/:id/preview" element={<SalesInvoicePreviewPage />} />

                {/* ============ Terminal & Port ============ */}
                <Route path="terminal" element={<TerminalListPage />} />
                <Route path="port-handling" element={<PortHandlingListPage />} />

                {/* ============ Daily Work Order ============ */}
                <Route path="daily-work-order" element={<DailyWorkOrderListPage />} />

                {/* ============ Sales Income ============ */}
                <Route path="sales-income/client-advance" element={<ClientAdvanceListPage />} />
                <Route path="sales-income/receive-payment" element={<ReceivePaymentListPage />} />
                <Route path="sales-income/receive-payment/new" element={<PaymentEntryFormPage />} />
                <Route path="payment-entry" element={<PaymentEntryListPage />} />
                <Route path="payment-entry/:id/view" element={<PaymentEntryViewPage />} />

                {/* ============ Payable Expense ============ */}
                <Route path="payable-expense" element={<PayableExpenseListPage />} />

                {/* ============ OPB ============ */}
                <Route path="client-opb" element={<ClientOPBListPage />} />
                <Route path="payable-opb" element={<PayableOPBListPage />} />

                {/* ============ Expense Entry ============ */}
                <Route path="expense-entry" element={<ExpenseEntryListPage />} />
                <Route path="expense-entry/new" element={<ExpenseEntryFormPage />} />
                <Route path="expense-entry/:id" element={<ExpenseEntryFormPage />} />
                <Route path="expense-entry/:id/view" element={<ExpenseEntryFormPage />} />

                {/* ============ RCV/PVC ============ */}
                <Route path="rcv-pvc" element={<RcvPvcListPage />} />

                {/* ============ Transaction History ============ */}
                <Route path="transaction-history" element={<TransactionHistoryListPage />} />

                {/* ============ SOA ============ */}
                <Route path="soa" element={<SOAPageComponent />} />

                {/* ============ Report ============ */}
                <Route path="report" element={<ReportPageComponent />} />

                {/* ============ Display ============ */}
                <Route path="display" element={<DisplayPageComponent />} />

                {/* ============ Accounting Module ============ */}
                <Route path="accounting" element={<AccountingModule />} />
                <Route path="accounting/chart-of-accounts" element={<ChartOfAccounts />} />
                <Route path="accounting/journal-entries" element={<JournalEntries />} />
                <Route path="accounting/general-ledger" element={<GeneralLedger />} />
                <Route path="accounting/trial-balance" element={<TrialBalance />} />
                <Route path="accounting/balance-sheet" element={<BalanceSheet />} />
                <Route path="accounting/income-statement" element={<IncomeStatement />} />
                <Route path="accounting/aging-reports" element={<AgingReports />} />
                <Route path="accounting/bank-reconciliation" element={<BankReconciliation />} />
                <Route path="accounting/bank-accounts" element={<BankAccounts />} />
                <Route path="accounting/assets" element={<AssetList />} />
                {/* Legacy accounting routes */}
                <Route path="accounting/coa" element={<ChartOfAccounts />} />
                <Route path="accounting/journals" element={<JournalEntries />} />
                <Route path="accounting/payments" element={<AccountingModule />} />

                {/* ============ Legacy routes (redirects) ============ */}
                <Route path="jobs" element={<JobList />} />
                <Route path="jobs/:id" element={<JobDetails />} />
                <Route path="customers" element={<CustomerList />} />
                <Route path="vendors" element={<VendorList />} />
                <Route path="fleet" element={<TruckList />} />
                <Route path="invoices" element={<InvoiceList />} />
                <Route path="invoices/new" element={<InvoiceEditor />} />
                <Route path="invoices/:id" element={<InvoiceEditor />} />
                <Route path="invoices/:id/preview" element={<InvoicePreview />} />
                <Route path="purchases" element={<BillList />} />
                <Route path="purchases/bills" element={<BillList />} />
                <Route path="reports" element={<FinancialReports />} />

                {/* ============ Settings ============ */}
                <Route path="settings" element={<Settings />} />

                {/* Redirect unknown routes to dashboard */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
};

export default AppRoutes;
