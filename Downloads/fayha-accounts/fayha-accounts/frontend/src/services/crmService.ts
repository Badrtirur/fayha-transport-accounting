import type { CRMLead } from '../types';
import { crmLeadsApi } from './api';

// ===================================================================
// CRM SERVICE - API-backed (replaces mock data)
// ===================================================================

export const getCRMLeads = async (): Promise<CRMLead[]> => {
  return crmLeadsApi.getAll();
};

export const getCRMLeadById = async (id: string): Promise<CRMLead | undefined> => {
  try {
    return await crmLeadsApi.getById(id);
  } catch {
    return undefined;
  }
};

export const createCRMLead = async (data: Partial<CRMLead>): Promise<CRMLead> => {
  return crmLeadsApi.create(data);
};

export const updateCRMLead = async (id: string, data: Partial<CRMLead>): Promise<CRMLead> => {
  return crmLeadsApi.update(id, data);
};

export const deleteCRMLead = async (id: string): Promise<void> => {
  return crmLeadsApi.remove(id);
};
