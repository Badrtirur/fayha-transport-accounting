// ==========================================
// FAYHA TRANSPORTATION - ACCOUNTING SYSTEM
// TypeScript Type Definitions
// ==========================================

import { Request } from 'express';

// Authenticated User
export interface AuthUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

// Extend Express Request
export interface AuthRequest extends Request {
  user?: AuthUser;
}

// API Response
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: ValidationError[];
  meta?: PaginationMeta;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// Dashboard Types
export interface DashboardSummary {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  totalReceivable: number;
  totalPayable: number;
  totalBankBalance: number;
  unpaidInvoices: number;
  unpaidBills: number;
  overdueInvoices: number;
  overdueBills: number;
}

// Report Types
export interface BalanceSheetData {
  assets: AccountGroupData[];
  liabilities: AccountGroupData[];
  equity: AccountGroupData[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export interface IncomeStatementData {
  revenue: AccountGroupData[];
  expenses: AccountGroupData[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  profitMargin: number;
}

export interface TrialBalanceData {
  accounts: TrialBalanceRow[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

export interface AccountGroupData {
  accountCode: string;
  accountName: string;
  subType: string;
  balance: number;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
}

// Aging Report
export interface AgingBucket {
  current: number;  // 0-30 days
  days30: number;   // 31-60 days
  days60: number;   // 61-90 days
  days90: number;   // 91-120 days
  over120: number;  // 120+ days
  total: number;
}

export interface AgingReportRow {
  id: string;
  code: string;
  name: string;
  buckets: AgingBucket;
}
