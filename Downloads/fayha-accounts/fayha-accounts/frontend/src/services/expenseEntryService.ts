import type { ExpenseEntry } from '../types';
import { expenseEntriesApi } from './api';

// ===================================================================
// EXPENSE ENTRY SERVICE - API-backed (replaces mock data)
// ===================================================================

export const getExpenseEntries = async (): Promise<ExpenseEntry[]> => {
  return expenseEntriesApi.getAll();
};

export const getExpenseEntryById = async (id: string): Promise<ExpenseEntry | undefined> => {
  try {
    return await expenseEntriesApi.getById(id);
  } catch {
    return undefined;
  }
};

export const createExpenseEntry = async (data: Partial<ExpenseEntry>): Promise<ExpenseEntry> => {
  return expenseEntriesApi.create(data);
};

export const updateExpenseEntry = async (id: string, data: Partial<ExpenseEntry>): Promise<ExpenseEntry> => {
  return expenseEntriesApi.update(id, data);
};

export const deleteExpenseEntry = async (id: string): Promise<void> => {
  return expenseEntriesApi.remove(id);
};
