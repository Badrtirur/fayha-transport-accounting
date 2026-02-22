// Mock data removed - all data is now served from the backend API via dashboardApi/accountingApi

export interface FinancialReport {
    id: string;
    name: string;
    type: 'P&L' | 'BalanceSheet' | 'TrialBalance';
    period: string;
    generatedAt: string;
}
