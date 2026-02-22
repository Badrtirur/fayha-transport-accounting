import type { TransactionRecord } from '../types';
import { transactionHistoryApi } from './api';

// ===================================================================
// TRANSACTION HISTORY SERVICE - API-backed (replaces mock data)
// ===================================================================

export const getTransactionHistory = async (): Promise<TransactionRecord[]> => {
  return transactionHistoryApi.getAll();
};

export const getTransactionsByEntity = async (entityId: string): Promise<TransactionRecord[]> => {
  return transactionHistoryApi.getByEntity(entityId);
};
