import type { SalesQuote } from '../types';
import { salesQuotesApi } from './api';

// ===================================================================
// SALES QUOTE SERVICE - API-backed (replaces mock data)
// ===================================================================

export const getSalesQuotes = async (): Promise<SalesQuote[]> => {
  return salesQuotesApi.getAll();
};

export const getSalesQuoteById = async (id: string): Promise<SalesQuote | undefined> => {
  try {
    return await salesQuotesApi.getById(id);
  } catch {
    return undefined;
  }
};

export const createSalesQuote = async (data: Partial<SalesQuote>): Promise<SalesQuote> => {
  return salesQuotesApi.create(data);
};

export const updateSalesQuote = async (id: string, data: Partial<SalesQuote>): Promise<SalesQuote> => {
  return salesQuotesApi.update(id, data);
};

export const deleteSalesQuote = async (id: string): Promise<void> => {
  return salesQuotesApi.remove(id);
};
