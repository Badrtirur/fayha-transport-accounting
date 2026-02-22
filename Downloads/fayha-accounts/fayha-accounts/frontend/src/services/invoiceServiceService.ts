import type { ServiceGroup, InvoiceService } from '../types';
import { invoiceServicesApi } from './api';

// ===================================================================
// INVOICE SERVICE SERVICE - API-backed (replaces mock data)
// ===================================================================

export const getInvoiceServiceGroups = async (): Promise<ServiceGroup[]> => {
  // Service groups are fetched from the invoice-services API
  try {
    return await invoiceServicesApi.getAll();
  } catch {
    return [];
  }
};

export const getInvoiceServiceItems = async (): Promise<InvoiceService[]> => {
  return invoiceServicesApi.getAll();
};

export const createInvoiceService = async (data: Partial<InvoiceService>): Promise<InvoiceService> => {
  return invoiceServicesApi.create(data);
};

export const updateInvoiceService = async (id: string, data: Partial<InvoiceService>): Promise<InvoiceService> => {
  return invoiceServicesApi.update(id, data);
};

export const deleteInvoiceService = async (id: string): Promise<void> => {
  return invoiceServicesApi.remove(id);
};
