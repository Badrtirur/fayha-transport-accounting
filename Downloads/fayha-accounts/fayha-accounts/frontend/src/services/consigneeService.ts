import type { Consignee } from '../types';
import { consigneesApi } from './api';

// ===================================================================
// CONSIGNEE SERVICE - API-backed (replaces localStorage)
// ===================================================================

export const getConsignees = async (): Promise<Consignee[]> => {
  return consigneesApi.getAll();
};

export const getConsigneeById = async (id: string): Promise<Consignee | undefined> => {
  try {
    return await consigneesApi.getById(id);
  } catch {
    return undefined;
  }
};

export const createConsignee = async (data: Partial<Consignee>): Promise<Consignee> => {
  return consigneesApi.create(data);
};

export const updateConsignee = async (id: string, data: Partial<Consignee>): Promise<Consignee> => {
  return consigneesApi.update(id, data);
};

export const deleteConsignee = async (id: string): Promise<void> => {
  return consigneesApi.remove(id);
};

