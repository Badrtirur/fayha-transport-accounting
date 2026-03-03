import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Landmark,
  Scale,
  Clock,
  DollarSign,
  Calendar,
  Download,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { dashboardApi, accountingApi, invoicesApi, billsApi } from '../../services/api';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
}

const reportCards: ReportCard[] = [
  {
    id: 'financial-summary',
    title: 'Financial Summary',
    description: 'Overview of revenue, expenses, and net income for the selected period.',
    icon: BarChart3,
    gradient: 'from-emerald-500 to-emerald-700',
  },
  {
    id: 'profit-loss',
    title: 'Profit & Loss',
    description: 'Detailed P&L statement showing income, COGS, and operating expenses.',
    icon: TrendingUp,
    gradient: 'from-blue-500 to-blue-700',
  },
  {
    id: 'balance-sheet',
    title: 'Balance Sheet',
    description: 'Assets, liabilities, and equity snapshot at a point in time.',
    icon: Landmark,
    gradient: 'from-purple-500 to-purple-700',
  },
  {
    id: 'trial-balance',
    title: 'Trial Balance',
    description: 'All account balances with debit and credit totals for verification.',
    icon: Scale,
    gradient: 'from-indigo-500 to-indigo-700',
  },
  {
    id: 'aging-report',
    title: 'Aging Report',
    description: 'Accounts receivable aging analysis by 30/60/90+ day buckets.',
    icon: Clock,
    gradient: 'from-amber-500 to-amber-700',
  },
  {
    id: 'collection-report',
    title: 'Collection Report',
    description: 'Accounts payable aging analysis and outstanding vendor balances.',
    icon: DollarSign,
    gradient: 'from-rose-500 to-rose-700',
  },
];

const fmtNum = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const downloadCsv = (filename: string, csvContent: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

const ReportPage: React.FC = () => {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-01-01`;
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerate = async (reportId: string) => {
    setGenerating(reportId);
    try {
      switch (reportId) {
        case 'financial-summary': {
          const data = await dashboardApi.getSummary();
          const rows = [
            ['Financial Summary Report'],
            [`Period: ${dateFrom} to ${dateTo}`],
            [''],
            ['Metric', 'Amount (SAR)'],
            ['Total Revenue', fmtNum(data.totalRevenue || 0)],
            ['Total Expenses', fmtNum(data.totalExpenses || 0)],
            ['Net Income', fmtNum(data.netIncome || 0)],
            [''],
            ['Outstanding Receivable', fmtNum(data.totalReceivable || 0)],
            ['Outstanding Payable', fmtNum(data.totalPayable || 0)],
            ['Total Bank Balance', fmtNum(data.totalBankBalance || 0)],
            [''],
            ['Unpaid Invoices', String(data.unpaidInvoices || 0)],
            ['Unpaid Bills', String(data.unpaidBills || 0)],
          ];
          if (data.bankBalances?.length > 0) {
            rows.push([''], ['Bank Account', 'Balance (SAR)']);
            data.bankBalances.forEach((b: any) => {
              rows.push([b.bankName || b.code, fmtNum(Number(b.currentBalance || 0))]);
            });
          }
          downloadCsv(`financial-summary-${dateTo}.csv`, rows.map(r => r.map(escapeCsv).join(',')).join('\n'));
          toast.success('Financial Summary downloaded');
          break;
        }
        case 'profit-loss': {
          const data = await dashboardApi.getIncomeStatement();
          const rows = [
            ['Profit & Loss Statement'],
            [`Period: ${dateFrom} to ${dateTo}`],
            [''],
            ['Code', 'Account Name', 'Type', 'Amount (SAR)'],
          ];
          rows.push(['', '--- REVENUE ---', '', '']);
          (data.revenue || []).forEach((a: any) => {
            rows.push([a.accountCode, a.accountName, a.subType || 'Revenue', fmtNum(a.balance || 0)]);
          });
          rows.push(['', 'Total Revenue', '', fmtNum(data.totalRevenue || 0)]);
          rows.push(['']);
          rows.push(['', '--- EXPENSES ---', '', '']);
          (data.expenses || []).forEach((a: any) => {
            rows.push([a.accountCode, a.accountName, a.subType || 'Expense', fmtNum(a.balance || 0)]);
          });
          rows.push(['', 'Total Expenses', '', fmtNum(data.totalExpenses || 0)]);
          rows.push(['']);
          rows.push(['', 'NET INCOME', '', fmtNum(data.netIncome || 0)]);
          rows.push(['', 'Profit Margin', '', `${(data.profitMargin || 0).toFixed(1)}%`]);
          downloadCsv(`profit-loss-${dateTo}.csv`, rows.map(r => r.map(escapeCsv).join(',')).join('\n'));
          toast.success('Profit & Loss report downloaded');
          break;
        }
        case 'balance-sheet': {
          const data = await dashboardApi.getBalanceSheet();
          const rows = [
            ['Balance Sheet'],
            [`As of: ${dateTo}`],
            [''],
            ['Code', 'Account Name', 'Type', 'Balance (SAR)'],
          ];
          rows.push(['', '--- ASSETS ---', '', '']);
          (data.assets || []).forEach((a: any) => {
            rows.push([a.accountCode, a.accountName, a.subType || 'Asset', fmtNum(a.balance || 0)]);
          });
          rows.push(['', 'Total Assets', '', fmtNum(data.totalAssets || 0)]);
          rows.push(['']);
          rows.push(['', '--- LIABILITIES ---', '', '']);
          (data.liabilities || []).forEach((a: any) => {
            rows.push([a.accountCode, a.accountName, a.subType || 'Liability', fmtNum(a.balance || 0)]);
          });
          rows.push(['', 'Total Liabilities', '', fmtNum(data.totalLiabilities || 0)]);
          rows.push(['']);
          rows.push(['', '--- EQUITY ---', '', '']);
          (data.equity || []).forEach((a: any) => {
            rows.push([a.accountCode, a.accountName, a.subType || 'Equity', fmtNum(a.balance || 0)]);
          });
          rows.push(['', 'Net Income (Retained)', '', fmtNum(data.netIncome || 0)]);
          rows.push(['', 'Total Equity', '', fmtNum(data.totalEquity || 0)]);
          rows.push(['']);
          rows.push(['', 'Total Liabilities + Equity', '', fmtNum((data.totalLiabilities || 0) + (data.totalEquity || 0))]);
          downloadCsv(`balance-sheet-${dateTo}.csv`, rows.map(r => r.map(escapeCsv).join(',')).join('\n'));
          toast.success('Balance Sheet report downloaded');
          break;
        }
        case 'trial-balance': {
          const data = await accountingApi.getTrialBalance();
          const accounts = Array.isArray(data) ? data : (data.accounts || []);
          const rows = [
            ['Trial Balance'],
            [`As of: ${dateTo}`],
            [''],
            ['Code', 'Account Name', 'Type', 'Debit (SAR)', 'Credit (SAR)'],
          ];
          accounts.forEach((a: any) => {
            rows.push([a.accountCode, a.accountName, a.accountType || '', fmtNum(a.debit || 0), fmtNum(a.credit || 0)]);
          });
          rows.push(['']);
          rows.push(['', 'TOTALS', '', fmtNum(data.totalDebits || 0), fmtNum(data.totalCredits || 0)]);
          rows.push(['', `Balanced: ${data.isBalanced ? 'YES' : 'NO'}`, '', '', '']);
          downloadCsv(`trial-balance-${dateTo}.csv`, rows.map(r => r.map(escapeCsv).join(',')).join('\n'));
          toast.success('Trial Balance report downloaded');
          break;
        }
        case 'aging-report': {
          const data = await invoicesApi.getAging();
          const items = Array.isArray(data) ? data : [];
          const rows = [
            ['Accounts Receivable Aging Report'],
            [`As of: ${dateTo}`],
            [''],
            ['Customer Code', 'Customer Name', 'Current (SAR)', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days', 'Total (SAR)'],
          ];
          let grandTotal = 0;
          items.forEach((item: any) => {
            const b = item.buckets || item;
            rows.push([
              item.code || '', item.name || '',
              fmtNum(b.current || 0), fmtNum(b.days30 || 0), fmtNum(b.days60 || 0),
              fmtNum(b.days90 || 0), fmtNum(b.over120 || 0), fmtNum(b.total || 0),
            ]);
            grandTotal += (b.total || 0);
          });
          rows.push(['']);
          rows.push(['', 'GRAND TOTAL', '', '', '', '', '', fmtNum(grandTotal)]);
          downloadCsv(`aging-report-ar-${dateTo}.csv`, rows.map(r => r.map(escapeCsv).join(',')).join('\n'));
          toast.success('AR Aging Report downloaded');
          break;
        }
        case 'collection-report': {
          const data = await billsApi.getAging();
          const items = Array.isArray(data) ? data : [];
          const rows = [
            ['Accounts Payable Aging Report'],
            [`As of: ${dateTo}`],
            [''],
            ['Vendor Code', 'Vendor Name', 'Current (SAR)', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days', 'Total (SAR)'],
          ];
          let grandTotal = 0;
          items.forEach((item: any) => {
            const b = item.buckets || item;
            rows.push([
              item.code || '', item.name || '',
              fmtNum(b.current || 0), fmtNum(b.days30 || 0), fmtNum(b.days60 || 0),
              fmtNum(b.days90 || 0), fmtNum(b.over120 || 0), fmtNum(b.total || 0),
            ]);
            grandTotal += (b.total || 0);
          });
          rows.push(['']);
          rows.push(['', 'GRAND TOTAL', '', '', '', '', '', fmtNum(grandTotal)]);
          downloadCsv(`aging-report-ap-${dateTo}.csv`, rows.map(r => r.map(escapeCsv).join(',')).join('\n'));
          toast.success('AP Aging Report downloaded');
          break;
        }
        default:
          toast.error('Unknown report type');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reports</h1>
        <p className="text-slate-500 mt-1 text-sm">Generate financial reports, analyze performance, and export data.</p>
      </div>

      {/* Date Range Selector */}
      <div className="card-premium p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Calendar className="h-4 w-4 text-slate-400" />
            Report Period
          </div>
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input-premium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input-premium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportCards.map((report) => {
          const Icon = report.icon;
          return (
            <div
              key={report.id}
              className="card-premium overflow-hidden group hover:shadow-lg transition-all duration-300"
            >
              <div className="p-6 space-y-4">
                <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${report.gradient} flex items-center justify-center shadow-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{report.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{report.description}</p>
                </div>
                <button
                  onClick={() => handleGenerate(report.id)}
                  disabled={generating === report.id}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all group-hover:bg-emerald-50 group-hover:text-emerald-700 group-hover:border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating === report.id ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Download className="h-4 w-4" /> Generate Report</>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReportPage;
