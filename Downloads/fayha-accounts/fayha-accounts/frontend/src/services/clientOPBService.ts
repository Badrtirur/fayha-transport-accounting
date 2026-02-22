import type { ClientOPB } from '../types';
import { clientOPBApi } from './api';

// ===================================================================
// CLIENT OPB SERVICE - API-backed (replaces mock data)
// ===================================================================

export const getClientOPBEntries = async (): Promise<ClientOPB[]> => {
  return clientOPBApi.getAll();
};

export const getClientOPBById = async (id: string): Promise<ClientOPB | undefined> => {
  try {
    return await clientOPBApi.getById(id);
  } catch {
    return undefined;
  }
};

export const createClientOPB = async (data: Partial<ClientOPB>): Promise<ClientOPB> => {
  return clientOPBApi.create(data);
};

export const updateClientOPB = async (id: string, data: Partial<ClientOPB>): Promise<ClientOPB> => {
  return clientOPBApi.update(id, data);
};

export const deleteClientOPB = async (id: string): Promise<void> => {
  return clientOPBApi.remove(id);
};
