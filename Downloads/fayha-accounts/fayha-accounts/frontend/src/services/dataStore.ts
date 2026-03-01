import type {
  PaymentEntry, ExpenseEntry, SOAEntry,
} from '../types';
// ensureAuth import removed - auth is now handled by Login page

// ===================================================================
// FAYHA CLEARANCE ERP - Central Data Store
// Now delegates to API via ensureAuth; localStorage usage removed.
// ===================================================================

// ===================================================================
// ID & Document ID generators (kept for backward compatibility)
// ===================================================================

export const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const generateDocumentId = (prefix: string): string => {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `${prefix}-${year}-${seq}`;
};

// ===================================================================
// PUBLIC API: Initialize (now async - authenticates with backend)
// ===================================================================

export const initializeDataStore = async (): Promise<void> => {
  // Auth is now handled by the Login page; this is a no-op kept for compatibility.
};

// ===================================================================
// PUBLIC API: Backward-compatible stubs
// These are kept so that any code still importing from dataStore
// will not break at compile time. They return empty/no-op values.
// All real data access should go through the individual service files.
// ===================================================================

export const getAll = <T>(_collection: string): T[] => [];

export const getById = <T extends { id: string }>(_collection: string, _id: string): T | undefined => undefined;

export const create = <T extends { id: string }>(_collection: string, item: T): T => item;

export const update = <T extends { id: string }>(_collection: string, _id: string, _updates: Partial<T>): T | undefined => undefined;

export const remove = (_collection: string, _id: string): boolean => false;

// ===================================================================
// ACCOUNTING stubs (backward compatibility)
// ===================================================================

export const createPaymentEntryWithJournal = (entry: PaymentEntry): PaymentEntry => entry;

export const createExpenseWithJournal = (expense: ExpenseEntry): ExpenseEntry => expense;

export const getTrialBalance = (): any[] => [];

export const getGeneralLedger = (_accountId: string): any[] => [];

export const getBankCashSummary = (): any[] => [];

export const getClientSOA = (_clientId: string): SOAEntry[] => [];

// ===================================================================
// UTILITY stubs (backward compatibility)
// ===================================================================

export const saveCollection = <T>(_key: string, _data: T[]): void => {
  // No-op: data is persisted via API
};

export const loadCollection = <T>(_key: string, fallback: T[]): T[] => fallback;
