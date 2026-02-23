// ==========================================
// FAYHA TRANSPORTATION - API Client Service
// ==========================================
//
// Comprehensive API client that replaces all localStorage-based services
// with real API calls to the backend. Uses native fetch with typed helpers.
// ==========================================

// ==================== BASE CONFIGURATION ====================

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

const TOKEN_KEY = 'fayha_token';
const REFRESH_TOKEN_KEY = 'fayha_refresh_token';

// ==================== ERROR CLASS ====================

export class ApiError extends Error {
  public status: number;
  public code?: string;
  public details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ==================== GENERIC FETCH WRAPPER ====================

/**
 * Core fetch wrapper with automatic auth headers, JSON parsing,
 * error handling, and response unwrapping.
 *
 * The backend returns `{ success: true, data: ... }` on success
 * and `{ success: false, error: "..." }` on failure. This function
 * unwraps the `data` field automatically.
 */
async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  // Build headers
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach auth token if present
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (networkError) {
    throw new ApiError(
      'Network error: Unable to reach the server. Please check your connection.',
      0,
      'NETWORK_ERROR',
    );
  }

  // Handle 401 - attempt token refresh once
  if (response.status === 401) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      // Retry original request with new token
      const retryHeaders = new Headers(headers);
      const newToken = localStorage.getItem(TOKEN_KEY);
      if (newToken) {
        retryHeaders.set('Authorization', `Bearer ${newToken}`);
      }
      try {
        response = await fetch(url, { ...options, headers: retryHeaders });
      } catch {
        throw new ApiError('Network error after token refresh.', 0, 'NETWORK_ERROR');
      }
      // If still 401 after refresh, clear auth and throw
      if (response.status === 401) {
        clearAuth();
        throw new ApiError('Session expired. Please log in again.', 401, 'UNAUTHORIZED');
      }
    } else {
      clearAuth();
      throw new ApiError('Session expired. Please log in again.', 401, 'UNAUTHORIZED');
    }
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  // Parse response body
  let body: any;
  const contentType = response.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    try {
      body = await response.json();
    } catch {
      throw new ApiError('Invalid JSON response from server.', response.status, 'PARSE_ERROR');
    }
  } else {
    const text = await response.text();
    throw new ApiError(
      text || `Unexpected response type: ${contentType}`,
      response.status,
      'UNEXPECTED_CONTENT_TYPE',
    );
  }

  // Handle non-OK responses
  if (!response.ok) {
    const message = body?.error || body?.message || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, body?.code, body?.details);
  }

  // Unwrap `{ success: true, data: ... }` envelope
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    return body.data as T;
  }

  // Fallback: return entire body
  return body as T;
}

// ==================== AUTH HELPERS ====================

let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempts to refresh the auth token using the stored refresh token.
 * De-duplicates concurrent refresh attempts.
 */
async function attemptTokenRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;

      const body = await res.json();
      const newToken = body?.data?.token;
      if (newToken) {
        localStorage.setItem(TOKEN_KEY, newToken);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/** Clears all auth tokens from localStorage. */
function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// ==================== QUERY PARAMS HELPER ====================

/** Builds a query string from a params object, omitting undefined/null values. */
function buildQuery(params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  if (entries.length === 0) return '';
  const qs = new URLSearchParams(
    entries.map(([k, v]) => [k, String(v)]),
  ).toString();
  return `?${qs}`;
}

// ==================== GENERIC CRUD FACTORY ====================

export interface CrudApi<T> {
  getAll: (params?: Record<string, string>) => Promise<T[]>;
  getById: (id: string) => Promise<T>;
  create: (data: Partial<T>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<void>;
}

/**
 * Creates a set of standard CRUD methods for a given REST resource.
 *
 * @param resource - The resource path segment (e.g. 'accounts', 'job-references')
 * @returns Object with getAll, getById, create, update, and remove methods
 */
export function createCrudApi<T = any>(resource: string): CrudApi<T> {
  const base = `/${resource}`;

  return {
    getAll(params?: Record<string, string>): Promise<T[]> {
      return apiFetch<T[]>(`${base}${buildQuery(params)}`);
    },

    getById(id: string): Promise<T> {
      return apiFetch<T>(`${base}/${id}`);
    },

    create(data: Partial<T>): Promise<T> {
      return apiFetch<T>(base, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update(id: string, data: Partial<T>): Promise<T> {
      return apiFetch<T>(`${base}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    remove(id: string): Promise<void> {
      return apiFetch<void>(`${base}/${id}`, {
        method: 'DELETE',
      });
    },
  };
}

// ====================================================================
// SPECIFIC API INSTANCES
// ====================================================================

// ==================== CORE ACCOUNTING ====================

export const accountsApi = createCrudApi<any>('accounts');

export const journalsApi = {
  ...createCrudApi<any>('journals'),
  /** Post a draft journal entry (changes status to Posted). */
  post: (id: string) =>
    apiFetch<any>(`/journals/${id}/post`, { method: 'POST' }),
  /** Void a posted journal entry with a reason. */
  void: (id: string, reason: string) =>
    apiFetch<any>(`/journals/${id}/void`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

export const paymentsApi = {
  ...createCrudApi<any>('payments'),
  /** Receive a payment (AR). */
  receive: (data: any) =>
    apiFetch<any>('/payments/receive', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  /** Disburse a payment (AP). */
  disburse: (data: any) =>
    apiFetch<any>('/payments/disburse', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const banksApi = {
  ...createCrudApi<any>('banks'),
  /** Get transactions for a specific bank account. */
  getTransactions: (bankId: string, params?: Record<string, string>) =>
    apiFetch<any[]>(`/banks/${bankId}/transactions${buildQuery(params)}`),
  /** Reconcile bank transactions. */
  reconcile: (bankId: string, transactionIds: string[]) =>
    apiFetch<any>(`/banks/${bankId}/reconcile`, {
      method: 'POST',
      body: JSON.stringify({ transactionIds }),
    }),
};

// ==================== CLIENTS & VENDORS ====================

export const customersApi = {
  ...createCrudApi<any>('customers'),
  /** Get a customer's statement of account. */
  getStatement: (customerId: string, params?: Record<string, string>) =>
    apiFetch<any>(`/customers/${customerId}/statement${buildQuery(params)}`),
  /** Import customers from Excel/CSV file. */
  importFromExcel: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch<{ imported: number; skipped: number; errors: string[]; totalRows: number }>(
      '/customers/import',
      { method: 'POST', body: formData },
    );
  },
};

export const clientServicesApi = {
  ...createCrudApi<any>('client-services'),
  getByClient: (clientId: string) =>
    apiFetch<any[]>(`/client-services?clientId=${clientId}`),
  getMerged: (clientId: string) =>
    apiFetch<any[]>(`/client-services/merged?clientId=${clientId}`),
};

export const vendorsApi = createCrudApi<any>('vendors');

export const consigneesApi = createCrudApi<any>('consignees');

// ==================== JOB REFERENCE ====================

export const jobReferencesApi = createCrudApi<any>('job-references');

export const jobCategoriesApi = createCrudApi<any>('job-categories');

export const jobTitlesApi = createCrudApi<any>('job-titles');

export const jobControllersApi = createCrudApi<any>('job-controllers');

export const salesmenApi = createCrudApi<any>('salesmen');

// ==================== SALES ====================

export const salesInvoicesApi = {
  ...createCrudApi<any>('sales-invoices'),
  /** Send a sales invoice to the client / ZATCA. */
  send: (id: string) =>
    apiFetch<any>(`/sales-invoices/${id}/send`, { method: 'POST' }),
  /** Mark a DRAFT invoice as INVOICED and update linked Job Reference. */
  markAsInvoiced: (id: string) =>
    apiFetch<any>(`/sales-invoices/${id}/mark-invoiced`, { method: 'POST' }),
};

export const invoiceServicesApi = createCrudApi<any>('invoice-services');

export const salesQuotesApi = {
  ...createCrudApi<any>('sales-quotes'),
  /** Send a quote to the client. */
  send: (id: string) =>
    apiFetch<any>(`/sales-quotes/${id}/send`, { method: 'POST' }),
  /** Convert a quote to an invoice. */
  convertToInvoice: (id: string) =>
    apiFetch<any>(`/sales-quotes/${id}/convert`, { method: 'POST' }),
};

export const invoicesApi = {
  ...createCrudApi<any>('invoices'),
  /** Send an invoice to the client. */
  send: (id: string) =>
    apiFetch<any>(`/invoices/${id}/send`, { method: 'POST' }),
  /** Get the AR aging report. */
  getAging: () => apiFetch<any>('/invoices/aging'),
};

// ==================== BILLS (AP) ====================

export const billsApi = {
  ...createCrudApi<any>('bills'),
  /** Get the AP aging report. */
  getAging: () => apiFetch<any>('/bills/aging'),
};

// ==================== PAYMENTS & ADVANCES ====================

export const clientAdvancesApi = {
  ...createCrudApi<any>('client-advances'),
  getByClient: (clientId: string) => apiFetch<{ advances: any[]; totalAvailable: number }>(`/client-advances/by-client/${clientId}`),
};

export const paymentEntriesApi = createCrudApi<any>('payment-entries');

// ==================== EXPENSES ====================

export const expenseEntriesApi = createCrudApi<any>('expense-entries');

export const payableExpensesApi = createCrudApi<any>('payable-expenses');

// ==================== OPB (Opening Balances) ====================

export const clientOPBApi = createCrudApi<any>('client-opb');

export const payableOPBApi = createCrudApi<any>('payable-opb');

// ==================== SUPPORTING / OPERATIONS ====================

export const fleetApi = createCrudApi<any>('fleet');

export const terminalsApi = createCrudApi<any>('terminals');

export const portHandlingApi = createCrudApi<any>('port-handling');

export const shipmentsApi = createCrudApi<any>('shipments');

export const dailyWorkOrdersApi = createCrudApi<any>('daily-work-orders');

export const fclLclApi = createCrudApi<any>('fcl-lcl');

export const fileVerificationsApi = createCrudApi<any>('file-verifications');

export const crmLeadsApi = createCrudApi<any>('crm-leads');

export const assetsApi = createCrudApi<any>('assets');

// ==================== RCV / PVC ====================

export const rcvPvcApi = createCrudApi<any>('rcv-pvc');

// ==================== TRANSACTION HISTORY ====================

export const transactionHistoryApi = {
  getAll: (params?: Record<string, string>) =>
    apiFetch<any[]>(`/transactions${buildQuery(params)}`),
  getByEntity: (entityId: string, params?: Record<string, string>) =>
    apiFetch<any[]>(`/transactions/entity/${entityId}${buildQuery(params)}`),
};

// ==================== DASHBOARD ====================

export const dashboardApi = {
  /** Get the main dashboard summary (KPIs, totals, charts). */
  getSummary: () => apiFetch<any>('/dashboard/summary'),
  /** Get the balance sheet report. */
  getBalanceSheet: () => apiFetch<any>('/dashboard/balance-sheet'),
  /** Get the income statement (P&L) report. */
  getIncomeStatement: () => apiFetch<any>('/dashboard/income-statement'),
};

// ==================== ACCOUNTING REPORTS ====================

export const accountingApi = {
  /** Get the trial balance across all leaf accounts. */
  getTrialBalance: () => apiFetch<any>('/accounts/trial-balance'),

  /**
   * Get the general ledger for a specific account.
   * Optionally filter by date range.
   */
  getLedger: (
    accountId: string,
    params?: { startDate?: string; endDate?: string },
  ) =>
    apiFetch<any>(
      `/accounts/${accountId}/ledger${buildQuery(params as Record<string, string>)}`,
    ),
};

// ==================== SOA (Statement of Account) ====================

export const soaApi = {
  /** Get the statement of account for a customer. */
  getCustomerSOA: (
    customerId: string,
    params?: { startDate?: string; endDate?: string },
  ) =>
    apiFetch<any>(
      `/customers/${customerId}/statement${buildQuery(params as Record<string, string>)}`,
    ),

  /** Get the statement of account for a vendor. */
  getVendorSOA: (
    vendorId: string,
    params?: { startDate?: string; endDate?: string },
  ) =>
    apiFetch<any>(
      `/vendors/${vendorId}/statement${buildQuery(params as Record<string, string>)}`,
    ),
};

// ==================== SETTINGS ====================

export const settingsApi = {
  getAll: () => apiFetch<any>('/settings'),
  getByCategory: (category: string) => apiFetch<any>(`/settings/${category}`),
  update: (key: string, value: string) =>
    apiFetch<any>(`/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),
  bulkUpdate: (settings: Record<string, string>) =>
    apiFetch<any>('/settings/bulk', {
      method: 'POST',
      body: JSON.stringify({ settings }),
    }),
};

// ==================== AUTH ====================

export const authApi = {
  /**
   * Log in with email and password.
   * Returns `{ user, token, refreshToken }`.
   */
  login: (email: string, password: string) =>
    apiFetch<{ user: any; token: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  /** Register a new user (requires ADMIN/SUPER_ADMIN token). */
  register: (data: { email: string; password: string; firstName: string; lastName: string; role?: string }) =>
    apiFetch<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Get the currently authenticated user's profile. */
  getProfile: () => apiFetch<any>('/auth/me'),

  /** Refresh the access token using a refresh token. */
  refreshToken: (refreshToken: string) =>
    apiFetch<{ token: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
};

// ==================== AUTO-LOGIN HELPER ====================

/**
 * Ensures the frontend has a valid auth token stored.
 *
 * Since the frontend does not yet have a login page, this function
 * auto-logs in with the default admin credentials when no token is present.
 * Remove this once a proper login flow is implemented.
 */
export async function ensureAuth(): Promise<void> {
  const existingToken = localStorage.getItem(TOKEN_KEY);
  if (existingToken) {
    // Validate the token is still good by hitting /auth/me
    try {
      await authApi.getProfile();
      return; // Token is valid
    } catch {
      // Token is expired or invalid; clear and re-login below
      clearAuth();
    }
  }

  try {
    const result = await authApi.login('admin@fayha-transport.sa', 'admin123');
    localStorage.setItem(TOKEN_KEY, result.token);
    if (result.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
    }
  } catch (error) {
    console.error(
      '[Fayha API] Auto-login failed. Ensure the backend is running at',
      API_BASE,
      error,
    );
  }
}

// ==================== EXPORTS ====================

/** Re-export the base fetch wrapper for custom one-off requests. */
export { apiFetch, API_BASE };
