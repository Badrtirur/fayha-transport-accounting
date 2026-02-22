// ===================================================================
// FAYHA CLEARANCE ERP - Type Definitions
// ===================================================================

// ===== ENUMS / UNION TYPES =====

export type Direction = 'Import' | 'Export';
export type ModeOfTransport = 'Air' | 'Sea' | 'Land';
export type JobCategoryType = 'Domestic' | 'International';
export type FclLclType = 'FCL' | 'LCL';
export type FclLclContainerType = '20ft' | '40ft' | 'LCL' | 'AIR PALLET' | 'BREAK BULK';
export type BLStatus = 'Original BL' | 'Telex Release' | 'Sea Waybill' | 'Express BL';
export type GoodsStatus = 'In Transit' | 'At Port' | 'In Customs' | 'Released' | 'Delivered';
export type ShipmentPriority = 'Normal' | 'Urgent' | 'Critical';
export type SaleMethod = 'Credit' | 'Cash';
export type EntryType = 'Payment' | 'Receipt' | 'Contra' | 'Journal';
export type PaymentMethodType = 'Cash' | 'Bank';
export type TransactionMethod = 'Credit' | 'Debit';
export type InvoiceCategory = 'Branch Invoice' | 'Freight Forwarder Invoice' | 'Customs Clearance Invoice';
export type ZatcaStatus = 'Due' | 'Pending Synchronization' | 'Synced With Zatca';

// Legacy types (kept for backward compatibility with existing pages)
export type JobStatus = 'Draft' | 'Active' | 'Customs Cleared' | 'Delivered' | 'Invoiced' | 'Closed';
export type ExpenseCategory = 'Customs Duty' | 'Port Fees' | 'Inspection' | 'Transportation' | 'Agency Service' | 'Other';
export type PaymentMethod = 'Bank Transfer' | 'Check' | 'Cash' | 'Credit Card';

// ===== LEGACY INTERFACES (existing pages still use these) =====

export interface Job {
  id: string;
  jobNo: string;
  customerName: string;
  description: string;
  status: JobStatus;
  arrivalDate: string;
  blNumber?: string;
  totalReimbursable: number;
  totalServiceFees: number;
  totalCost: number;
  netProfit: number;
}

export interface JobExpense {
  id: string;
  jobId: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  isReimbursable: boolean;
  paidBy: 'Company' | 'Client';
  date: string;
  attachments?: string[];
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  jobId: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  zatca?: {
    uuid: string;
    submissionId: string;
    previousHash: string;
    currentHash: string;
    qrCode: string;
    timestamp: string;
  };
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
}

export interface InvoiceItem {
  id: string;
  description: string;
  amount: number;
  isTaxable: boolean;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
  type: string;
  subType?: string;
  description?: string;
  level: number;
  parentId?: string;
  openingBalance?: number;
  currentBalance?: number;
  balance?: number;
  isActive?: boolean;
  isSystemAccount?: boolean;
  isBankAccount?: boolean;
  isSubLedger?: boolean;
  bankId?: string;
  isGroup?: boolean;
  parent?: Account;
  children?: Account[];
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  /** @deprecated use entryNumber */
  entryNo?: string;
  date: string;
  description: string;
  reference?: string;
  referenceType?: string;
  totalDebit?: number;
  totalCredit?: number;
  lines: JournalLine[];
  status: 'Draft' | 'Posted' | 'Void' | 'DRAFT' | 'POSTED' | 'VOIDED';
  notes?: string;
  createdAt?: string;
}

export interface JournalLine {
  id: string;
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  /** @deprecated use debitAmount */
  debit?: number;
  /** @deprecated use creditAmount */
  credit?: number;
  description?: string;
  account?: Account;
}

export interface VendorBill {
  id: string;
  vendorId: string;
  billNo: string;
  billNumber?: string;
  date: string;
  billDate?: string;
  dueDate: string;
  status: string;
  items: BillItem[];
  totalAmount: number;
  balanceDue?: number;
  vendor?: { id: string; name: string };
}

export interface BillItem {
  id: string;
  description: string;
  accountId: string;
  amount: number;
}

export interface Payment {
  id: string;
  paymentNo: string;
  paymentNumber?: string;
  date: string;
  paymentDate?: string;
  customerId: string;
  amount: number;
  method: string;
  paymentMethod?: string;
  reference?: string;
  status: string;
  direction?: string;
  customer?: { id: string; name: string; code?: string };
}

// ===================================================================
// NEW CLEARANCE ERP TYPES
// ===================================================================

// ===== CLIENT =====

export interface Client {
  id: string;
  code?: string;
  name: string;
  nameAr?: string;
  clientType?: string;
  contactPerson: string;
  contactPersonPhone?: string;
  phone: string;
  phoneAlt?: string;
  email: string;
  password?: string;
  designation?: string;
  salesmanId?: string;
  website?: string;
  address: string;
  streetName?: string;
  streetNameAr?: string;
  buildingNumber?: string;
  buildingNumberAr?: string;
  district?: string;
  districtAr?: string;
  city: string;
  cityAr?: string;
  country?: string;
  postalCode?: string;
  postalCodeAr?: string;
  vatNumber?: string;
  crNumber?: string;
  creditLimit?: number;
  paymentTermDays?: number;
  authorizationNumber?: string;
  authorizationExpiry?: string;
  notifyBefore?: number;
  importNumber?: string;
  importExpiry?: string;
  exportNumber?: string;
  exportExpiry?: string;
  parentAccountId?: string;
  ledgerCode?: string;
  ledgerNote?: string;
  isOtherBranch?: boolean;
  isActive?: boolean;
  balance?: number;
  totalInvoiced?: number;
  totalPaid?: number;
  outstandingBalance?: number;
  status?: 'Active' | 'Inactive';
  totalJobs?: number;
  notes?: string;
  category?: string;
}

// ===== CLIENT SERVICE =====

export interface ClientService {
  id: string;
  clientId: string;
  serviceId: string;
  customAmount?: number | null;
  customVat?: number | null;
  notes?: string | null;
  isActive: boolean;
  service?: InvoiceService;
}

// ===== CONSIGNEE =====

export interface Consignee {
  id: string;
  name: string;
  nameAr?: string;
  authorizationNumber?: string;
  importNumber?: string;
  exportNumber?: string;
  authExpiry?: string;
  importExpiry?: string;
  exportExpiry?: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
}

// ===== JOB REFERENCE (7-Tab Entity) =====

export type JobReferenceStatus = 'Draft' | 'Active' | 'In Progress' | 'Customs Cleared' | 'Delivered' | 'Invoiced' | 'Closed';

export interface JobReference {
  id: string;
  jobRefNo: string;
  status: JobReferenceStatus;
  createdAt: string;
  updatedAt: string;

  // Tab 1: Info
  clientId: string;
  clientAuthNumber?: string;
  clientImportNumber?: string;
  clientExportNumber?: string;
  clientAuthExpiry?: string;
  clientImportExpiry?: string;
  clientExportExpiry?: string;
  consigneeId: string;
  consigneeAuthNumber?: string;
  consigneeImportNumber?: string;
  consigneeExportNumber?: string;
  consigneeAuthExpiry?: string;
  consigneeImportExpiry?: string;
  consigneeExportExpiry?: string;

  // Tab 2: Job Reference
  direction: Direction;
  modeOfTransport: ModeOfTransport;
  jobCategory: JobCategoryType;
  jobTitleId: string;
  jobDescription?: string;
  fclLcl: FclLclType;
  documentationDate: string;
  poCustomerRefNo: string;
  poDate?: string;
  awbBl?: string;
  awbBlStatus?: BLStatus;
  hawbHbl?: string;
  hawbHblStatus?: BLStatus;
  mabl?: string;
  mablStatus?: BLStatus;

  // Tab 3: Shipment Details
  origin?: string;
  destination?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  shipperName?: string;
  freightForwarder?: string;
  customBroker?: string;
  payableId?: string;
  salesmanId: string;
  handling?: string;
  productCategory?: string;
  shipmentPriority?: ShipmentPriority;
  goodsStatus?: GoodsStatus;
  isHazardous: boolean;
  port?: string;
  packing?: string;

  // Tab 4: Cargo Information
  commercialInvoiceNo?: string;
  commercialInvoiceValue?: number;
  commercialInvoiceCurrency: string;
  manifestNo?: string;
  entity?: string;
  cbm?: number;
  cargoSize?: string;
  grossWeight?: number;
  chargeableWeight?: number;
  numberOfPackages?: number;
  numberOfPieces?: number;
  numberOfPallets?: number;
  cargoDescription?: string;

  // Tab 5: Transportation Details
  shipsName?: string;
  shipsNumber?: string;
  imoNumber?: string;
  mmsiNumber?: string;
  fnrNumber?: string;
  airlines?: string;
  flightNumber?: string;
  authNo?: string;
  truckNumber?: string;
  driverId?: string;
  driverName?: string;
  driverMobile?: string;
  transportRemarks?: string;

  // Tab 6: Delivery Info
  placeOfDelivery?: string;
  deliveryAddress?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;

  // Tab 7: FCL/LCL Details
  containers: ContainerDetail[];

  // Notes
  notes?: string;

  // Financial
  totalPayableCost: number;
  containerDetention: number;
  estimatedCost: number;
  shipmentProcessCost: number;
}

export interface ContainerDetail {
  id: string;
  type: FclLclContainerType;
  uniqueNumber: string;
  deliveryDate: string;
  deliveryPoint: string;
  cargoDescription: string;
  quantity: number;
}

// ===== JOB REFERENCE LOOKUP TABLES =====

export interface JobCategory {
  id: string;
  name: string;
  nameAr?: string;
  status: 'Active' | 'Inactive';
}

export interface JobTitle {
  id: string;
  name: string;
  nameAr?: string;
  categoryId: string;
  status: 'Active' | 'Inactive';
}

export interface JobController {
  id: string;
  name: string;
  role: string;
  assignedJobs: number;
}

// ===== SALES INVOICE =====

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  /** @deprecated use invoiceNumber */
  invoiceNo?: string;
  invoiceDate: string;
  dueDate?: string;
  saleMethod: SaleMethod;
  clientId: string;
  jobReferenceId?: string;
  /** @deprecated use jobReferenceId */
  jobRefId?: string;
  salesmanId?: string;
  branch?: string;
  note?: string;
  notes?: string;
  termsConditionsName?: string;
  termsConditionsContent?: string;
  category?: InvoiceCategory;

  items: SalesInvoiceItem[];
  client?: Client;
  jobReference?: any;
  salesman?: any;

  containerDetention?: number;
  actualJobCost?: number;
  invoiceAmount?: number;
  profitability?: number;

  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  /** @deprecated use subtotal */
  subTotal?: number;
  /** @deprecated use vatAmount */
  totalVat?: number;
  /** @deprecated use totalAmount */
  grandTotal?: number;

  paidAmount: number;
  balanceDue?: number;
  dueAmount?: number;

  status: 'Due' | 'Paid' | 'Partial' | 'Overdue' | 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'INVOICED';
  zatcaStatus: ZatcaStatus;
  zatca?: {
    uuid: string;
    submissionId: string;
    previousHash: string;
    currentHash: string;
    qrCode: string;
    timestamp: string;
  };
}

export interface ServiceGroup {
  id: string;
  name: string;
  nameAr?: string;
}

export interface InvoiceService {
  id: string;
  code?: string;
  groupId: string;
  /** Backend field name */
  serviceGroup?: string;
  name: string;
  /** Backend field name */
  nameEn?: string;
  nameAr: string;
  defaultAmount?: number;
  defaultVatPercent: number;
  /** Backend field: boolean for VAT applicability */
  vatApplicable?: boolean;
  isActive?: boolean;
}

export interface SalesInvoiceItem {
  id: string;
  serviceId: string;
  name: string;
  /** Backend field name */
  nameEn?: string;
  nameAr?: string;
  description: string;
  amount: number;
  vatPercent: number;
  /** Backend field name */
  vatRate?: number;
  vatAmount: number;
  total: number;
  /** Backend field name */
  totalAmount?: number;
  lineNumber?: number;
}

// ===== PAYMENT ENTRY =====

export interface PaymentEntry {
  id: string;
  documentId: string;
  documentDate: string;
  documentNumber: string;
  clientId: string;
  jobRefId: string;
  invoiceId?: string;
  method: PaymentMethodType;
  entryType: EntryType;
  ledgerAccountId: string;
  paymentStatusForOperation: string;
  lines: PaymentEntryLine[];
  totalCr: number;
  totalDr: number;
  isBalanced: boolean;
  justification?: string;
  createdBy: string;
  createdAt: string;
}

export interface PaymentEntryLine {
  id: string;
  description?: string;
  crAmount: number;
  drAmount: number;
}

// ===== CLIENT ADVANCE =====

export interface ClientAdvance {
  id: string;
  advanceNumber?: string;
  /** @deprecated use advanceNumber */
  receiptVoucherNumber?: string;
  clientId: string;
  amount: number;
  date: string;
  paymentMethod?: string;
  bankAccountId?: string;
  reference?: string;
  description?: string;
  status?: string;
  usedAmount?: number;
  remainingAmount?: number;
  // Legacy fields kept for backward compat
  transactionMethod?: TransactionMethod;
  accountingMethod?: string;
  parentGroupId?: string;
  paymentAgainst?: string;
  note?: string;
  totalDebit?: number;
  totalCredit?: number;
  client?: any;
}

// ===== ACCOUNTING ENTRIES =====

export interface AccountingEntry {
  id: string;
  date: string;
  number: string;
  ledgerDr: string;
  ledgerCr: string;
  type: EntryType;
  tag?: string;
  debitAmount: number;
  creditAmount: number;
}

// ===== CRM =====

export interface CRMLead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Won' | 'Lost';
  priority?: string;
  assignedTo: string;
  notes?: string;
  nextFollowUp?: string;
  createdAt: string;
}

// ===== SALESMAN =====

export interface Salesman {
  id: string;
  name: string;
  code: string;
  phone: string;
  email: string;
  commission: number;
  totalSales: number;
}

// ===== SALES QUOTE =====

export interface SalesQuote {
  id: string;
  quoteNumber: string;
  quoteNo?: string;
  clientId?: string;
  clientName?: string;
  date: string;
  quoteDate?: string;
  validUntil: string;
  items: SalesInvoiceItem[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  subTotal?: number;
  totalVat?: number;
  grandTotal?: number;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired' | 'DRAFT' | 'SENT';
  notes?: string;
}

// ===== SOA (Statement of Account) =====

export interface SOAEntry {
  id: string;
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

// ===== DAILY WORK ORDER =====

export interface DailyWorkOrder {
  id: string;
  orderNo: string;
  date: string;
  jobRefId: string;
  assignedTo: string;
  description: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  priority: 'Low' | 'Medium' | 'High';
}

// ===== PAYABLE EXPENSE =====

export interface PayableExpense {
  id: string;
  expenseNumber?: string;
  vendorId: string;
  jobRefId?: string;
  bankAccountId?: string;
  date?: string;
  /** @deprecated use date */
  expenseDate?: string;
  dueDate?: string;
  category: string;
  description: string;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  paidAmount?: number;
  balanceDue?: number;
  paymentMethod?: string;
  status: 'Pending' | 'Approved' | 'Paid' | 'PENDING' | 'APPROVED' | 'PAID';
  vendor?: any;
  jobReference?: any;
  bankAccount?: any;
}

// ===== EXPENSE ENTRY =====

export interface ExpenseEntry {
  id: string;
  expenseNumber: string;
  /** @deprecated use expenseNumber */
  entryNo?: string;
  date: string;
  clientId?: string;
  vendorId?: string;
  accountId?: string;
  amount: number;
  vatAmount?: number;
  totalAmount?: number;
  paymentMethod?: string;
  bankAccountId?: string;
  category?: string;
  description?: string;
  reference?: string;
  jobRefId?: string;
  receiptNo?: string;
  status: 'Draft' | 'Posted' | 'PENDING' | 'POSTED';
  notes?: string;
}

// ===== OPB (Opening Balance) =====

export interface ClientOPB {
  id: string;
  clientId: string;
  date: string;
  debitAmount: number;
  creditAmount: number;
  description?: string;
}

export interface PayableOPB {
  id: string;
  vendorId: string;
  date: string;
  debitAmount: number;
  creditAmount: number;
  description?: string;
}

// ===== TERMINAL / PORT HANDLING =====

export interface Terminal {
  id: string;
  name: string;
  nameAr?: string;
  code: string;
  port: string;
  type: 'Container' | 'Bulk' | 'General';
  status: 'Active' | 'Inactive';
}

export interface PortHandling {
  id: string;
  terminalId: string;
  jobRefId: string;
  containerNo: string;
  handlingType: string;
  date: string;
  charges: number;
  status: 'Pending' | 'Completed';
}

// ===== SHIPMENT =====

export interface Shipment {
  id: string;
  shipmentNo: string;
  jobRefId: string;
  origin: string;
  destination: string;
  carrier: string;
  etd: string;
  eta: string;
  status: 'Booked' | 'In Transit' | 'Arrived' | 'Delivered';
  trackingNumber?: string;
}

// ===== FILE VERIFICATION =====

export interface FileVerification {
  id: string;
  jobRefId: string;
  documentType: string;
  fileName: string;
  status: 'Pending' | 'Verified' | 'Rejected';
  verifiedBy?: string;
  verifiedAt?: string;
  remarks?: string;
}

// ===== RCV/PVC =====

export interface RcvPvc {
  id: string;
  type: 'RCV' | 'PVC';
  voucherNo: string;
  date: string;
  clientId?: string;
  vendorId?: string;
  amount: number;
  reference?: string;
  status: string;
  notes?: string;
  customer?: any;
  vendor?: any;
}

// ===== TRANSACTION HISTORY =====

export interface TransactionRecord {
  id: string;
  date: string;
  type: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  relatedEntity?: string;
  direction?: 'IN' | 'OUT' | 'NEUTRAL';
  source?: string;
  status?: string;
}
