// ==========================================
// FAYHA TRANSPORTATION - ACCOUNTING SYSTEM
// Frontend Constants & Configuration
// ==========================================

// ==================== THEME ====================
export const COLORS = {
  primary: '#1a1a2e',
  primaryLight: '#16213e',
  secondary: '#0f3460',
  accent: '#e94560',
  
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  info: '#2563eb',
  
  asset: '#2563eb',
  liability: '#dc2626',
  equity: '#7c3aed',
  revenue: '#059669',
  expense: '#d97706',
  
  bg: '#f0f2f5',
  bgCard: '#ffffff',
  border: '#e5e7eb',
  textPrimary: '#1a1a2e',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
};

// ==================== API CONFIGURATION ====================
export const API_CONFIG = {
  // Development
  DEV_URL: 'http://localhost:5000/api/v1',
  
  // Production
  PROD_URL: 'https://api.fayha-transport.sa/api/v1',
  
  // Timeout
  TIMEOUT: 30000,
};

export const API_BASE_URL = import.meta.env.VITE_API_URL || API_CONFIG.DEV_URL;

// ==================== APP INFO ====================
export const APP_INFO = {
  name: 'Fayha Accounts',
  nameAr: 'حسابات فيحاء',
  fullName: 'Fayha Transportation - Accounting & Finance System',
  version: '1.0.0',
  company: 'Fayha Transportation',
  companyAr: 'فيحاء للنقليات',
  supportEmail: 'accounts@fayha-transport.sa',
  supportPhone: '+966-11-XXX-XXXX',
  currency: 'SAR',
  vatRate: 0.15,
};

// ==================== STORAGE KEYS ====================
export const STORAGE_KEYS = {
  TOKEN: 'fayha_auth_token',
  REFRESH_TOKEN: 'fayha_refresh_token',
  USER: 'fayha_user_data',
  SETTINGS: 'fayha_settings',
  THEME: 'fayha_theme',
  SIDEBAR_STATE: 'fayha_sidebar',
  LANGUAGE: 'fayha_language',
};

// ==================== ACCOUNT TYPES ====================
export const ACCOUNT_TYPES = {
  ASSET: { label: 'Assets', labelAr: 'الأصول', code: '1', color: COLORS.asset },
  LIABILITY: { label: 'Liabilities', labelAr: 'الخصوم', code: '2', color: COLORS.liability },
  EQUITY: { label: 'Equity', labelAr: 'حقوق الملكية', code: '3', color: COLORS.equity },
  REVENUE: { label: 'Revenue', labelAr: 'الإيرادات', code: '4', color: COLORS.revenue },
  EXPENSE: { label: 'Expenses', labelAr: 'المصروفات', code: '5', color: COLORS.expense },
};

// ==================== BANK COLORS ====================
export const BANK_COLORS: Record<string, string> = {
  ARB: '#0B6623',
  SNB: '#003366',
  RB: '#8B0000',
  SABB: '#1B4F72',
  ALN: '#5B2C6F',
  BAJ: '#B7950B',
};

// ==================== STATUS MAPS ====================
export const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  PENDING: '#d97706',
  APPROVED: '#2563eb',
  POSTED: '#059669',
  VOIDED: '#dc2626',
  SENT: '#2563eb',
  UNPAID: '#dc2626',
  PARTIAL: '#d97706',
  PAID: '#059669',
  OVERDUE: '#dc2626',
  CANCELLED: '#6b7280',
  RECONCILED: '#059669',
  UNRECONCILED: '#d97706',
  OPEN: '#059669',
  CLOSED: '#6b7280',
  LOCKED: '#dc2626',
};

// ==================== SERVICE TYPES ====================
export const SERVICE_TYPES = [
  { value: 'TRANSPORTATION', label: 'Transportation' },
  { value: 'CLEARANCE', label: 'Customs Clearance' },
  { value: 'FREIGHT', label: 'Freight Forwarding' },
  { value: 'CONTAINER', label: 'Container Handling' },
  { value: 'STORAGE', label: 'Warehouse Storage' },
  { value: 'DOCUMENTATION', label: 'Documentation' },
  { value: 'INSURANCE', label: 'Insurance Handling' },
  { value: 'DEMURRAGE', label: 'Demurrage' },
];

// ==================== EXPENSE TYPES ====================
export const EXPENSE_TYPES = [
  { value: 'FUEL', label: 'Fuel & Diesel' },
  { value: 'MAINTENANCE', label: 'Maintenance & Repair' },
  { value: 'PORT_CHARGES', label: 'Port & Terminal Charges' },
  { value: 'CUSTOMS', label: 'Customs & Govt Fees' },
  { value: 'SALARY', label: 'Salaries & Benefits' },
  { value: 'RENT', label: 'Rent' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'UTILITIES', label: 'Utilities & Communication' },
  { value: 'TOLL', label: 'Toll & Road Charges' },
  { value: 'CONTAINER_LEASE', label: 'Container Lease' },
  { value: 'BANK_CHARGES', label: 'Bank Charges' },
  { value: 'OTHER', label: 'Other' },
];

// ==================== PAYMENT METHODS ====================
export const PAYMENT_METHODS = [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'ONLINE', label: 'Online Payment' },
];

// ==================== NAVIGATION ====================
export const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', labelAr: 'لوحة التحكم', icon: 'LayoutDashboard', path: '/' },
  { key: 'coa', label: 'Chart of Accounts', labelAr: 'دليل الحسابات', icon: 'BookOpen', path: '/accounts' },
  { key: 'journals', label: 'Journal Entries', labelAr: 'القيود اليومية', icon: 'FileText', path: '/journals' },
  { key: 'ledger', label: 'General Ledger', labelAr: 'دفتر الأستاذ', icon: 'Table', path: '/ledger' },
  { key: 'divider1', label: 'RECEIVABLES', isDivider: true },
  { key: 'invoices', label: 'Invoices (AR)', labelAr: 'الفواتير', icon: 'Receipt', path: '/invoices' },
  { key: 'customers', label: 'Customers', labelAr: 'العملاء', icon: 'Users', path: '/customers' },
  { key: 'divider2', label: 'PAYABLES', isDivider: true },
  { key: 'bills', label: 'Bills (AP)', labelAr: 'الفواتير الواردة', icon: 'CreditCard', path: '/bills' },
  { key: 'vendors', label: 'Vendors', labelAr: 'الموردين', icon: 'Truck', path: '/vendors' },
  { key: 'divider3', label: 'BANKING', isDivider: true },
  { key: 'banks', label: 'Bank Accounts', labelAr: 'الحسابات البنكية', icon: 'Landmark', path: '/banks' },
  { key: 'payments', label: 'Payments', labelAr: 'المدفوعات', icon: 'Banknote', path: '/payments' },
  { key: 'divider4', label: 'REPORTS', isDivider: true },
  { key: 'reports', label: 'Financial Reports', labelAr: 'التقارير المالية', icon: 'BarChart3', path: '/reports' },
  { key: 'settings', label: 'Settings', labelAr: 'الإعدادات', icon: 'Settings', path: '/settings' },
];

// ==================== DATE FORMATS ====================
export const DATE_FORMATS = {
  display: 'DD MMM YYYY',
  displayWithTime: 'DD MMM YYYY HH:mm',
  api: 'YYYY-MM-DD',
  time: 'HH:mm',
  full: 'dddd, MMMM DD, YYYY',
};

// ==================== VALIDATION ====================
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[+]?[\d\s-]{8,}$/,
  PASSWORD_MIN_LENGTH: 6,
  ACCOUNT_CODE_REGEX: /^\d{4}$/,
};
