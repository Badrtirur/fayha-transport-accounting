import type { DailyWorkOrder } from '../types';
import { dailyWorkOrdersApi } from './api';

// ===================================================================
// DAILY WORK ORDER SERVICE - API-backed (replaces mock data)
// ===================================================================

export const getDailyWorkOrders = async (): Promise<DailyWorkOrder[]> => {
  return dailyWorkOrdersApi.getAll();
};

export const getDailyWorkOrderById = async (id: string): Promise<DailyWorkOrder | undefined> => {
  try {
    return await dailyWorkOrdersApi.getById(id);
  } catch {
    return undefined;
  }
};

export const createDailyWorkOrder = async (data: Partial<DailyWorkOrder>): Promise<DailyWorkOrder> => {
  return dailyWorkOrdersApi.create(data);
};

export const updateDailyWorkOrder = async (id: string, data: Partial<DailyWorkOrder>): Promise<DailyWorkOrder> => {
  return dailyWorkOrdersApi.update(id, data);
};

export const deleteDailyWorkOrder = async (id: string): Promise<void> => {
  return dailyWorkOrdersApi.remove(id);
};
