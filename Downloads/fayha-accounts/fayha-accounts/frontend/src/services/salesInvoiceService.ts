import type {
  SalesInvoice,
  ServiceGroup,
  InvoiceService,
} from '../types';
import { salesInvoicesApi, invoiceServicesApi } from './api';

// ===================================================================
// SALES INVOICE SERVICE - API-backed (replaces localStorage/mock)
// ===================================================================

export const getSalesInvoices = async (): Promise<SalesInvoice[]> => {
  return salesInvoicesApi.getAll();
};

export const getSalesInvoiceById = async (id: string): Promise<SalesInvoice | undefined> => {
  try {
    return await salesInvoicesApi.getById(id);
  } catch {
    return undefined;
  }
};

export const createSalesInvoice = async (data: Partial<SalesInvoice>): Promise<SalesInvoice> => {
  return salesInvoicesApi.create(data);
};

export const updateSalesInvoice = async (id: string, data: Partial<SalesInvoice>): Promise<SalesInvoice> => {
  return salesInvoicesApi.update(id, data);
};

export const deleteSalesInvoice = async (id: string): Promise<void> => {
  return salesInvoicesApi.remove(id);
};

export const getServiceGroups = async (): Promise<ServiceGroup[]> => {
  // Service groups may be part of invoice services; fetch from the API
  try {
    return await invoiceServicesApi.getAll();
  } catch {
    return [];
  }
};

export const getInvoiceServices = async (): Promise<InvoiceService[]> => {
  return invoiceServicesApi.getAll();
};
