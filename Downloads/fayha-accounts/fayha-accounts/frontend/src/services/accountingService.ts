import { Account, JournalEntry } from '../types';
import { accountsApi, journalsApi, accountingApi } from './api';

// ===================================================================
// ACCOUNTING SERVICE - API-backed (replaces dataStore/localStorage)
// ===================================================================

export const getAccounts = async (): Promise<Account[]> => {
  return accountsApi.getAll();
};

export const getAccountById = async (id: string): Promise<Account | undefined> => {
  try {
    return await accountsApi.getById(id);
  } catch {
    return undefined;
  }
};

export const createAccount = async (data: Partial<Account>): Promise<Account> => {
  return accountsApi.create(data);
};

export const updateAccount = async (id: string, data: Partial<Account>): Promise<Account> => {
  return accountsApi.update(id, data);
};

export const deleteAccount = async (id: string): Promise<void> => {
  return accountsApi.remove(id);
};

export const getJournals = async (): Promise<JournalEntry[]> => {
  return journalsApi.getAll();
};

export const getJournalById = async (id: string): Promise<JournalEntry | undefined> => {
  try {
    return await journalsApi.getById(id);
  } catch {
    return undefined;
  }
};

export const createJournal = async (data: Partial<JournalEntry>): Promise<JournalEntry> => {
  return journalsApi.create(data);
};

export const updateJournal = async (id: string, data: Partial<JournalEntry>): Promise<JournalEntry> => {
  return journalsApi.update(id, data);
};

export const deleteJournal = async (id: string): Promise<void> => {
  return journalsApi.remove(id);
};

export const postJournal = async (id: string): Promise<any> => {
  return journalsApi.post(id);
};

export const voidJournal = async (id: string, reason: string): Promise<any> => {
  return journalsApi.void(id, reason);
};

export const getTrialBalance = async (): Promise<any> => {
  return accountingApi.getTrialBalance();
};

export const getLedger = async (accountId: string, params?: { startDate?: string; endDate?: string }): Promise<any> => {
  return accountingApi.getLedger(accountId, params);
};
