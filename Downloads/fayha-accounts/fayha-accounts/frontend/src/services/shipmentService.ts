import type { Shipment } from '../types';
import { shipmentsApi } from './api';

// ===================================================================
// SHIPMENT SERVICE - API-backed (replaces mock data)
// ===================================================================

export const getShipments = async (): Promise<Shipment[]> => {
  return shipmentsApi.getAll();
};

export const getShipmentById = async (id: string): Promise<Shipment | undefined> => {
  try {
    return await shipmentsApi.getById(id);
  } catch {
    return undefined;
  }
};

export const createShipment = async (data: Partial<Shipment>): Promise<Shipment> => {
  return shipmentsApi.create(data);
};

export const updateShipment = async (id: string, data: Partial<Shipment>): Promise<Shipment> => {
  return shipmentsApi.update(id, data);
};

export const deleteShipment = async (id: string): Promise<void> => {
  return shipmentsApi.remove(id);
};
