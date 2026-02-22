import type { PortHandling } from '../types';
import { portHandlingApi } from './api';

// ===================================================================
// PORT HANDLING SERVICE - API-backed (replaces mock data)
// ===================================================================

export const getPortHandlingRecords = async (): Promise<PortHandling[]> => {
  return portHandlingApi.getAll();
};

export const getPortHandlingById = async (id: string): Promise<PortHandling | undefined> => {
  try {
    return await portHandlingApi.getById(id);
  } catch {
    return undefined;
  }
};

export const createPortHandling = async (data: Partial<PortHandling>): Promise<PortHandling> => {
  return portHandlingApi.create(data);
};

export const updatePortHandling = async (id: string, data: Partial<PortHandling>): Promise<PortHandling> => {
  return portHandlingApi.update(id, data);
};

export const deletePortHandling = async (id: string): Promise<void> => {
  return portHandlingApi.remove(id);
};
