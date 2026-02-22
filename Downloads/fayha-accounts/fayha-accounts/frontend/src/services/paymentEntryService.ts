import type {
  PaymentEntry,
  PaymentEntryLine,
  ClientAdvance,
  EntryType,
  PaymentMethodType,
  TransactionMethod,
} from '../types';
import { paymentsApi, clientAdvancesApi } from './api';

// Re-export imported types for consumers
export type { PaymentEntry, PaymentEntryLine, ClientAdvance, EntryType, PaymentMethodType, TransactionMethod };

// ===================================================================
// PAYMENT ENTRY SERVICE - API-backed (replaces mock data)
// ===================================================================

export const getPaymentEntries = async (): Promise<PaymentEntry[]> => {
  return paymentsApi.getAll();
};

export const getPaymentEntryById = async (id: string): Promise<PaymentEntry | undefined> => {
  try {
    return await paymentsApi.getById(id);
  } catch {
    return undefined;
  }
};

export const createPaymentEntry = async (data: Partial<PaymentEntry>): Promise<PaymentEntry> => {
  return paymentsApi.create(data);
};

export const updatePaymentEntry = async (id: string, data: Partial<PaymentEntry>): Promise<PaymentEntry> => {
  return paymentsApi.update(id, data);
};

export const deletePaymentEntry = async (id: string): Promise<void> => {
  return paymentsApi.remove(id);
};

// ===================================================================
// CLIENT ADVANCE SERVICE - API-backed
// ===================================================================

export const getClientAdvances = async (): Promise<ClientAdvance[]> => {
  return clientAdvancesApi.getAll();
};

export const getClientAdvanceById = async (id: string): Promise<ClientAdvance | undefined> => {
  try {
    return await clientAdvancesApi.getById(id);
  } catch {
    return undefined;
  }
};

export const createClientAdvance = async (data: Partial<ClientAdvance>): Promise<ClientAdvance> => {
  return clientAdvancesApi.create(data);
};

export const updateClientAdvance = async (id: string, data: Partial<ClientAdvance>): Promise<ClientAdvance> => {
  return clientAdvancesApi.update(id, data);
};

export const deleteClientAdvance = async (id: string): Promise<void> => {
  return clientAdvancesApi.remove(id);
};
