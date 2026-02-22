import type { FileVerification } from '../types';
import { fileVerificationsApi } from './api';

// ===================================================================
// FILE VERIFICATION SERVICE - API-backed (replaces mock data)
// ===================================================================

export const getFileVerifications = async (): Promise<FileVerification[]> => {
  return fileVerificationsApi.getAll();
};

export const getFileVerificationById = async (id: string): Promise<FileVerification | undefined> => {
  try {
    return await fileVerificationsApi.getById(id);
  } catch {
    return undefined;
  }
};

export const createFileVerification = async (data: Partial<FileVerification>): Promise<FileVerification> => {
  return fileVerificationsApi.create(data);
};

export const updateFileVerification = async (id: string, data: Partial<FileVerification>): Promise<FileVerification> => {
  return fileVerificationsApi.update(id, data);
};

export const deleteFileVerification = async (id: string): Promise<void> => {
  return fileVerificationsApi.remove(id);
};
