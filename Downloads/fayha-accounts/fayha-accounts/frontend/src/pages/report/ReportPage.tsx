import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { dashboardApi, accountingApi } from '../../services/api';

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
    description: 'Payment collection tracking and outstanding balance analysis.',
    icon: DollarSign,
    gradient: 'from-rose-500 to-rose-700',
  },
];

const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState('2026-02-06');
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerate = async (reportId: string) => {
    setGenerating(reportId);
    try {
      switch (reportId) {
        case 'financial-summary': {
          await dashboardApi.getSummary();
          toast.success('Financial summary generated');
          navigate('/dashboard');
          break;
        }
        case 'profit-loss': {
          await dashboardApi.getIncomeStatement();
          toast.success('Profit & Loss report generated');
          navigate('/dashboard');
          break;
        }
        case 'balance-sheet': {
          await dashboardApi.getBalanceSheet();
          toast.success('Balance Sheet report generated');
          navigate('/dashboard');
          break;
        }
        case 'trial-balance': {
          await accountingApi.getTrialBalance();
          toast.success('Trial Balance report generated');
          navigate('/accounting/trial-balance');
          break;
        }
        case 'aging-report': {
          toast.success('Aging report generated');
          navigate('/dashboard');
          break;
        }
        case 'collection-report': {
          toast.success('Collection report generated');
          navigate('/accounting/payments');
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
