import type { SOAEntry } from '../types';
import { customersApi } from './api';

// ===================================================================
// SOA SERVICE - API-backed (replaces mock data)
// ===================================================================

export const getSOAEntries = async (clientId: string): Promise<SOAEntry[]> => {
  try {
    return await customersApi.getStatement(clientId);
  } catch {
    return [];
  }
};
