import type { Terminal } from '../types';
import { terminalsApi } from './api';

// ===================================================================
// TERMINAL SERVICE - API-backed (replaces mock data)
// ===================================================================

export const getTerminals = async (): Promise<Terminal[]> => {
  return terminalsApi.getAll();
};

export const getTerminalById = async (id: string): Promise<Terminal | undefined> => {
  try {
    return await terminalsApi.getById(id);
  } catch {
    return undefined;
  }
};

export const createTerminal = async (data: Partial<Terminal>): Promise<Terminal> => {
  return terminalsApi.create(data);
};

export const updateTerminal = async (id: string, data: Partial<Terminal>): Promise<Terminal> => {
  return terminalsApi.update(id, data);
};

export const deleteTerminal = async (id: string): Promise<void> => {
  return terminalsApi.remove(id);
};
