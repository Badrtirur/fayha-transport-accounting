import type {
  JobReference,
  JobReferenceStatus,
  ContainerDetail,
  JobCategory,
  JobTitle,
  JobController,
  Client,
  Consignee,
  Salesman,
} from '../types';
import {
  jobReferencesApi,
  jobCategoriesApi,
  jobTitlesApi,
  salesmenApi,
  customersApi,
  consigneesApi,
} from './api';

// Re-export imported types so consumers can use them from this service
export type { JobReferenceStatus, ContainerDetail, JobController };

// ===================================================================
// JOB REFERENCE SERVICE - API-backed (replaces localStorage)
// ===================================================================

export const getJobReferences = async (): Promise<JobReference[]> => {
  return jobReferencesApi.getAll();
};

export const getJobReferenceById = async (id: string): Promise<JobReference | undefined> => {
  try {
    return await jobReferencesApi.getById(id);
  } catch {
    return undefined;
  }
};

export const createJobReference = async (data: Partial<JobReference>): Promise<JobReference> => {
  return jobReferencesApi.create(data);
};

export const updateJobReference = async (id: string, data: Partial<JobReference>): Promise<JobReference> => {
  return jobReferencesApi.update(id, data);
};

export const deleteJobReference = async (id: string): Promise<void> => {
  return jobReferencesApi.remove(id);
};

export const getClients = async (): Promise<Client[]> => {
  return customersApi.getAll();
};

export const getConsignees = async (): Promise<Consignee[]> => {
  return consigneesApi.getAll();
};

export const getSalesmen = async (): Promise<Salesman[]> => {
  return salesmenApi.getAll();
};

export const getJobCategories = async (): Promise<JobCategory[]> => {
  return jobCategoriesApi.getAll();
};

export const getJobTitles = async (): Promise<JobTitle[]> => {
  return jobTitlesApi.getAll();
};

export const getToBeInvoiced = async (): Promise<JobReference[]> => {
  const all = await jobReferencesApi.getAll();
  return all.filter((j: any) => j.status === 'Delivered' || j.status === 'Customs Cleared');
};
