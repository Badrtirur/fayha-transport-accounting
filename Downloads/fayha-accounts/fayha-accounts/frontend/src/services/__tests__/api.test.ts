// ==========================================
// API Service — Unit Tests (Vitest)
// ==========================================
// Tests that API service objects expose the correct methods.
// Does NOT make real HTTP calls — just validates structure.
// ==========================================

import { describe, it, expect } from 'vitest';
import {
  accountsApi,
  customersApi,
  vendorsApi,
  journalsApi,
  invoicesApi,
  billsApi,
  paymentsApi,
  banksApi,
  salesInvoicesApi,
  invoiceServicesApi,
  salesQuotesApi,
  consigneesApi,
  jobCategoriesApi,
  jobTitlesApi,
  jobControllersApi,
  salesmenApi,
  jobReferencesApi,
  clientAdvancesApi,
  expenseEntriesApi,
  payableExpensesApi,
  clientOPBApi,
  payableOPBApi,
  terminalsApi,
  shipmentsApi,
  dailyWorkOrdersApi,
  fleetApi,
  assetsApi,
  rcvPvcApi,
  settingsApi,
  dashboardApi,
  authApi,
} from '../api';

// ─── CRUD API shape ──────────────────────────────────────────────

function expectCrudMethods(api: any, name: string) {
  it(`${name} has getAll method`, () => {
    expect(typeof api.getAll).toBe('function');
  });
  it(`${name} has getById method`, () => {
    expect(typeof api.getById).toBe('function');
  });
  it(`${name} has create method`, () => {
    expect(typeof api.create).toBe('function');
  });
  it(`${name} has update method`, () => {
    expect(typeof api.update).toBe('function');
  });
  it(`${name} has remove method`, () => {
    expect(typeof api.remove).toBe('function');
  });
}

// ─── Tests ───────────────────────────────────────────────────────

describe('Auth API', () => {
  it('has login method', () => {
    expect(typeof authApi.login).toBe('function');
  });
  it('has getProfile method', () => {
    expect(typeof authApi.getProfile).toBe('function');
  });
});

describe('Accounts API', () => {
  expectCrudMethods(accountsApi, 'accountsApi');
});

describe('Customers API', () => {
  expectCrudMethods(customersApi, 'customersApi');
});

describe('Vendors API', () => {
  expectCrudMethods(vendorsApi, 'vendorsApi');
});

describe('Banks API', () => {
  expectCrudMethods(banksApi, 'banksApi');
});

describe('Sales Invoices API', () => {
  expectCrudMethods(salesInvoicesApi, 'salesInvoicesApi');
  it('has send method', () => {
    expect(typeof salesInvoicesApi.send).toBe('function');
  });
  it('has markAsInvoiced method', () => {
    expect(typeof salesInvoicesApi.markAsInvoiced).toBe('function');
  });
  it('has reportToZatca method', () => {
    expect(typeof salesInvoicesApi.reportToZatca).toBe('function');
  });
});

describe('Sales Quotes API', () => {
  expectCrudMethods(salesQuotesApi, 'salesQuotesApi');
  it('has send method', () => {
    expect(typeof salesQuotesApi.send).toBe('function');
  });
  it('has convertToInvoice method', () => {
    expect(typeof salesQuotesApi.convertToInvoice).toBe('function');
  });
});

describe('Journal API', () => {
  it('has getAll method', () => {
    expect(typeof journalsApi.getAll).toBe('function');
  });
  it('has getById method', () => {
    expect(typeof journalsApi.getById).toBe('function');
  });
});

describe('Dashboard API', () => {
  it('has getSummary method', () => {
    expect(typeof dashboardApi.getSummary).toBe('function');
  });
  it('has getBalanceSheet method', () => {
    expect(typeof dashboardApi.getBalanceSheet).toBe('function');
  });
  it('has getIncomeStatement method', () => {
    expect(typeof dashboardApi.getIncomeStatement).toBe('function');
  });
});

describe('Settings API', () => {
  it('has getAll method', () => {
    expect(typeof settingsApi.getAll).toBe('function');
  });
  it('has update method', () => {
    expect(typeof settingsApi.update).toBe('function');
  });
});

describe('CRUD APIs exist with standard methods', () => {
  const apis = [
    ['invoiceServicesApi', invoiceServicesApi],
    ['consigneesApi', consigneesApi],
    ['jobCategoriesApi', jobCategoriesApi],
    ['jobTitlesApi', jobTitlesApi],
    ['jobControllersApi', jobControllersApi],
    ['salesmenApi', salesmenApi],
    ['jobReferencesApi', jobReferencesApi],
    ['clientAdvancesApi', clientAdvancesApi],
    ['expenseEntriesApi', expenseEntriesApi],
    ['payableExpensesApi', payableExpensesApi],
    ['clientOPBApi', clientOPBApi],
    ['payableOPBApi', payableOPBApi],
    ['terminalsApi', terminalsApi],
    ['shipmentsApi', shipmentsApi],
    ['dailyWorkOrdersApi', dailyWorkOrdersApi],
    ['fleetApi', fleetApi],
    ['assetsApi', assetsApi],
    ['rcvPvcApi', rcvPvcApi],
  ] as const;

  for (const [name, api] of apis) {
    expectCrudMethods(api, name);
  }
});
