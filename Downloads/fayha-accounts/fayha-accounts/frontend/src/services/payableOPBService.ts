import type { PayableOPB } from '../types';
import { payableOPBApi } from './api';

// ===================================================================
// PAYABLE OPB SERVICE - API-backed (replaces mock data)
// ===================================================================

export const getPayableOPBEntries = async (): Promise<PayableOPB[]> => {
  return payableOPBApi.getAll();
};

export const getPayableOPBById = async (id: string): Promise<PayableOPB | undefined> => {
  try {
    return await payableOPBApi.getById(id);
  } catch {
    return undefined;
  }
};

export const createPayableOPB = async (data: Partial<PayableOPB>): Promise<PayableOPB> => {
  return payableOPBApi.create(data);
};

export const updatePayableOPB = async (id: string, data: Partial<PayableOPB>): Promise<PayableOPB> => {
  return payableOPBApi.update(id, data);
};

export const deletePayableOPB = async (id: string): Promise<void> => {
  return payableOPBApi.remove(id);
};
