import type { RcvPvc } from '../types';
import { rcvPvcApi } from './api';

// ===================================================================
// RCV/PVC SERVICE - API-backed (replaces mock data)
// ===================================================================

export const getRcvPvcEntries = async (): Promise<RcvPvc[]> => {
  return rcvPvcApi.getAll();
};

export const getRcvPvcById = async (id: string): Promise<RcvPvc | undefined> => {
  try {
    return await rcvPvcApi.getById(id);
  } catch {
    return undefined;
  }
};

export const createRcvPvc = async (data: Partial<RcvPvc>): Promise<RcvPvc> => {
  return rcvPvcApi.create(data);
};

export const updateRcvPvc = async (id: string, data: Partial<RcvPvc>): Promise<RcvPvc> => {
  return rcvPvcApi.update(id, data);
};

export const deleteRcvPvc = async (id: string): Promise<void> => {
  return rcvPvcApi.remove(id);
};
