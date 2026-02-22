import type { Client } from '../types';
import { customersApi } from './api';

// ===================================================================
// CLIENT SERVICE - API-backed (replaces localStorage)
// ===================================================================

export const getClientList = async (): Promise<Client[]> => {
  return customersApi.getAll();
};

export const getClientById = async (id: string): Promise<Client | undefined> => {
  try {
    return await customersApi.getById(id);
  } catch {
    return undefined;
  }
};

export const createClient = async (data: Partial<Client>): Promise<Client> => {
  return customersApi.create(data);
};

export const updateClient = async (id: string, data: Partial<Client>): Promise<Client> => {
  return customersApi.update(id, data);
};

export const deleteClient = async (id: string): Promise<void> => {
  return customersApi.remove(id);
};

