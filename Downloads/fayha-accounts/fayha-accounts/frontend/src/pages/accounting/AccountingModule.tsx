import React, { useState, useEffect, useMemo, useCallback } from 'react';
import TabNav from '../../components/common/TabNav';
import Modal from '../../components/common/Modal';
import BalanceBar from '../../components/common/BalanceBar';
import SearchableSelect from '../../components/common/SearchableSelect';
import { accountsApi, journalsApi, banksApi } from '../../services/api';
import { Account, JournalEntry, JournalLine } from '../../types';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Area, AreaChart,
} from 'recharts';
import {
  LayoutDashboard, BookOpen, Landmark, FileText, Scale, Building2,
  TrendingUp, TrendingDown, DollarSign, Wallet, PiggyBank,
  Plus, Printer, Download, Search, ChevronDown, ChevronRight,
  FileSpreadsheet, Eye, Edit2, Trash2, CheckCircle2,
  Clock, XCircle, Filter, CreditCard, Banknote, ArrowRight,
  AlertTriangle, BarChart3, PieChart as PieChartIcon, Activity,
} from 'lucide-react';

// ===================================================================
// CONSTANTS
// ===================================================================

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Fallback mock bank accounts (used when real data from banksApi is unavailable)
const fallbackBankAccounts = [
  { id: 'bank-1', name: 'Al Rajhi Bank', code: '1120', balance: 245680.50, lastTx: '2024-12-28', sparkline: [18, 22, 19, 25, 28, 24, 30, 27, 32, 29, 35, 33] },
  { id: 'bank-2', name: 'SNB (Saudi National Bank)', code: '1130', balance: 128450.00, lastTx: '2024-12-27', sparkline: [12, 15, 14, 18, 16, 20, 22, 19, 24, 21, 23, 25] },
  { id: 'bank-3', name: 'Riyad Bank', code: '1140', balance: 67200.75, lastTx: '2024-12-26', sparkline: [8, 10, 9, 12, 11, 14, 13, 15, 14, 16, 18, 17] },
  { id: 'bank-4', name: 'Cash on Hand', code: '1110', balance: 5320.00, lastTx: '2024-12-28', sparkline: [5, 4, 6, 5, 7, 6, 8, 7, 5, 6, 4, 5] },
];



// ===================================================================
// CUSTOM CHART TOOLTIP
// ===================================================================

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm border border-slate-700">
        <p className="font-semibold mb-1.5">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs opacity-90 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}: SAR {Number(entry.value).toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ===================================================================
// MINI SPARKLINE COMPONENT
// ===================================================================

const MiniSparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 120;
  const h = 32;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ===================================================================
// FORMAT HELPERS
// ===================================================================

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtCompact = (n: number) => {
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toFixed(0);
};
const formatDate = (d: any): string => {
  if (!d) return '-';
  try { const date = new Date(d); if (isNaN(date.getTime())) return String(d); return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return String(d); }
};

// ===================================================================
// OVERVIEW TAB
// ===================================================================

const OverviewTab: React.FC<{
  accounts: Account[];
  journals: JournalEntry[];
  banks: any[];
  onNavigate: (tab: string) => void;
}> = ({ accounts, journals, banks, onNavigate }) => {
  const typeMatch = (a: Account, t: string) => (a.type || '').toUpperCase() === t;
  const totalAssets = accounts.filter(a => typeMatch(a, 'ASSET') && !a.isGroup).reduce((s, a) => s + (a.balance || 0), 0);
  const totalLiabilities = accounts.filter(a => typeMatch(a, 'LIABILITY') && !a.isGroup).reduce((s, a) => s + (a.balance || 0), 0);
  const totalRevenue = accounts.filter(a => typeMatch(a, 'REVENUE') && !a.isGroup).reduce((s, a) => s + (a.balance || 0), 0);
  const totalExpenses = accounts.filter(a => typeMatch(a, 'EXPENSE') && !a.isGroup).reduce((s, a) => s + (a.balance || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const bankCashBalance = banks.reduce((s, b) => s + (b.currentBalance || b.balance || 0), 0);

  // Compute real account type distribution from accounts data
  const computedAccountTypeDistribution = useMemo(() => {
    const tm = (a: Account, t: string) => (a.type || '').toUpperCase() === t;
    const assetTotal = accounts.filter(a => tm(a, 'ASSET') && !a.isGroup).reduce((s, a) => s + Math.abs(a.balance || 0), 0);
    const liabilityTotal = accounts.filter(a => tm(a, 'LIABILITY') && !a.isGroup).reduce((s, a) => s + Math.abs(a.balance || 0), 0);
    const equityTotal = accounts.filter(a => tm(a, 'EQUITY') && !a.isGroup).reduce((s, a) => s + Math.abs(a.balance || 0), 0);
    const revenueTotal = accounts.filter(a => tm(a, 'REVENUE') && !a.isGroup).reduce((s, a) => s + Math.abs(a.balance || 0), 0);
    const expenseTotal = accounts.filter(a => tm(a, 'EXPENSE') && !a.isGroup).reduce((s, a) => s + Math.abs(a.balance || 0), 0);

    return [
      { name: 'Assets', value: assetTotal, color: '#3b82f6' },
      { name: 'Liabilities', value: liabilityTotal, color: '#f43f5e' },
      { name: 'Equity', value: equityTotal, color: '#8b5cf6' },
      { name: 'Revenue', value: revenueTotal, color: '#10b981' },
      { name: 'Expenses', value: expenseTotal, color: '#f59e0b' },
    ].filter(item => item.value > 0); // Only show non-zero items
  }, [accounts]);

  // Compute monthly revenue/expenses from journals (simplified - groups by month)
  const computedMonthlyRevenueExpenses = useMemo(() => {
    // Initialize 12 months with zero values
    const monthlyData = MONTHS.map(month => ({ month, revenue: 0, expenses: 0 }));

    // Process journal entries
    journals.forEach(journal => {
      if (journal.status?.toUpperCase() !== 'POSTED') return; // Only count posted journals

      const journalDate = new Date(journal.date);
      const monthIndex = journalDate.getMonth();

      journal.lines?.forEach((line: JournalLine) => {
        const account = accounts.find(a => a.id === line.accountId);
        if (!account) return;

        const accType = (account.type || '').toUpperCase();
        if (accType === 'REVENUE') {
          // Revenue increases with credits
          monthlyData[monthIndex].revenue += line.creditAmount || 0;
        } else if (accType === 'EXPENSE') {
          // Expenses increase with debits
          monthlyData[monthIndex].expenses += line.debitAmount || 0;
        }
      });
    });

    return monthlyData;
  }, [journals, accounts]);

  // Compute cash flow from bank/cash account transactions
  const computedCashFlowData = useMemo(() => {
    // Initialize 12 months with zero values
    const monthlyData = MONTHS.map(month => ({ month, inflow: 0, outflow: 0, net: 0 }));

    // Get all bank and cash account IDs
    const bankCashAccountIds = new Set(
      accounts
        .filter(a => !a.isGroup && (a.name?.toLowerCase().includes('bank') || a.name?.toLowerCase().includes('cash')))
        .map(a => a.id)
    );

    // Process journal entries affecting bank/cash accounts
    journals.forEach(journal => {
      if (journal.status?.toUpperCase() !== 'POSTED') return;

      const journalDate = new Date(journal.date);
      const monthIndex = journalDate.getMonth();

      journal.lines?.forEach((line: JournalLine) => {
        if (!bankCashAccountIds.has(line.accountId)) return;

        // Debits to bank/cash = money in (inflow)
        if (line.debitAmount) {
          monthlyData[monthIndex].inflow += line.debitAmount;
        }
        // Credits to bank/cash = money out (outflow)
        if (line.creditAmount) {
          monthlyData[monthIndex].outflow += line.creditAmount;
        }
      });
    });

    // Calculate net for each month
    monthlyData.forEach(d => {
      d.net = d.inflow - d.outflow;
    });

    return monthlyData;
  }, [journals, accounts]);

  const recentJournals = journals.slice(0, 5);

  const statCards = [
    { label: 'Total Assets', value: totalAssets, gradient: 'from-emerald-500 to-teal-600', icon: TrendingUp },
    { label: 'Total Liabilities', value: totalLiabilities, gradient: 'from-rose-500 to-pink-600', icon: TrendingDown },
    { label: 'Total Revenue', value: totalRevenue, gradient: 'from-blue-500 to-indigo-600', icon: DollarSign },
    { label: 'Total Expenses', value: totalExpenses, gradient: 'from-amber-500 to-orange-600', icon: Wallet },
    { label: 'Net Profit', value: netProfit, gradient: netProfit >= 0 ? 'from-green-500 to-emerald-600' : 'from-red-500 to-rose-600', icon: PiggyBank },
    { label: 'Bank & Cash Balance', value: bankCashBalance, gradient: 'from-purple-500 to-violet-600', icon: Building2 },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-5 text-white shadow-lg relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-6 translate-x-6" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-5 w-5 opacity-80" />
                  <span className="text-xs font-medium opacity-90">{card.label}</span>
                </div>
                <p className="text-2xl font-bold tracking-tight">SAR {fmtCompact(card.value)}</p>
                <p className="text-[11px] opacity-70 mt-1">{fmt(card.value)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue vs Expenses Bar Chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-card border border-slate-100/80 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                Revenue vs Expenses
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">Monthly comparison for the current year</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-emerald-500" /><span className="text-slate-500">Revenue</span></div>
              <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-rose-400" /><span className="text-slate-500">Expenses</span></div>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={computedMonthlyRevenueExpenses} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => `${fmtCompact(v)}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="expenses" fill="#fb7185" radius={[4, 4, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Account Type Distribution Pie Chart */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-purple-500" />
              Account Distribution
            </h3>
          </div>
          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={computedAccountTypeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {computedAccountTypeDistribution.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={computedAccountTypeDistribution[index].color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2.5 mt-4">
            {computedAccountTypeDistribution.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-slate-600">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-slate-900">SAR {fmtCompact(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cash Flow Trend */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              Cash Flow Trend
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">Monthly inflow, outflow & net cash position</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-emerald-500" /><span className="text-slate-500">Inflow</span></div>
            <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-rose-400" /><span className="text-slate-500">Outflow</span></div>
            <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-blue-500" /><span className="text-slate-500">Net</span></div>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={computedCashFlowData}>
              <defs>
                <linearGradient id="cfInflow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cfOutflow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fb7185" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => `${fmtCompact(v)}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="inflow" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#cfInflow)" name="Inflow" />
              <Area type="monotone" dataKey="outflow" stroke="#fb7185" strokeWidth={2} fillOpacity={1} fill="url(#cfOutflow)" name="Outflow" />
              <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Net Cash" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Journal Entries & Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Journal Entries */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Recent Journal Entries</h3>
              <p className="text-sm text-slate-500 mt-0.5">Last 5 transactions recorded</p>
            </div>
            <button onClick={() => onNavigate('journals')} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <table className="table-premium">
            <thead>
              <tr>
                <th>Entry #</th>
                <th>Date</th>
                <th>Description</th>
                <th className="text-right">Debit</th>
                <th className="text-right">Credit</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentJournals.map(j => {
                const totalDr = j.lines.reduce((s, l) => s + (l.debitAmount || l.debit || 0), 0);
                const totalCr = j.lines.reduce((s, l) => s + (l.creditAmount || l.credit || 0), 0);
                return (
                  <tr key={j.id} className="hover:bg-slate-50/80 transition-colors">
                    <td><span className="font-mono font-bold text-slate-900 text-sm">{(j.entryNumber || j.entryNo || '')}</span></td>
                    <td><span className="text-sm text-slate-600">{j.date}</span></td>
                    <td><span className="text-sm text-slate-700">{j.description}</span></td>
                    <td className="text-right"><span className="font-semibold text-sm text-slate-900">SAR {fmt(totalDr)}</span></td>
                    <td className="text-right"><span className="font-semibold text-sm text-slate-900">SAR {fmt(totalCr)}</span></td>
                    <td className="text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        (j.status || '').toUpperCase() === 'POSTED' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                        (j.status || '').toUpperCase() === 'DRAFT' ? 'bg-slate-50 border-slate-200 text-slate-600' :
                        'bg-rose-50 border-rose-200 text-rose-700'
                      }`}>
                        {(j.status || '').toUpperCase() === 'POSTED' ? <CheckCircle2 className="h-3 w-3" /> : (j.status || '').toUpperCase() === 'DRAFT' ? <Clock className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {(j.status || '').toUpperCase() === 'POSTED' ? 'Posted' : (j.status || '').toUpperCase() === 'DRAFT' ? 'Draft' : 'Void'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Quick Actions</h3>
          <div className="space-y-3">
            <button onClick={() => onNavigate('journals')} className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-card transition-all duration-300 group cursor-pointer text-left">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm">New Journal Entry</p>
                <p className="text-xs text-slate-500">Record a new double-entry transaction</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </button>
            <button onClick={() => onNavigate('bank-cash')} className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-card transition-all duration-300 group cursor-pointer text-left">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm">New Payment</p>
                <p className="text-xs text-slate-500">Record a payment or receipt</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </button>
            <button onClick={() => onNavigate('trial-balance')} className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-purple-200 hover:shadow-card transition-all duration-300 group cursor-pointer text-left">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <Scale className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm">View Trial Balance</p>
                <p className="text-xs text-slate-500">Verify debit/credit balance</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===================================================================
// CHART OF ACCOUNTS TAB
// ===================================================================

const ChartOfAccountsTab: React.FC<{
  accounts: Account[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
}> = ({ accounts, setAccounts }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccount, setNewAccount] = useState({
    code: '',
    name: '',
    type: 'ASSET' as string,
    subType: '',
    parentId: '',
    isGroup: false,
  });

  const typeConfig: Record<string, { bg: string; text: string; label: string }> = {
    'ASSET': { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Asset' },
    'LIABILITY': { bg: 'bg-rose-50', text: 'text-rose-600', label: 'Liability' },
    'EQUITY': { bg: 'bg-purple-50', text: 'text-purple-600', label: 'Equity' },
    'REVENUE': { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Revenue' },
    'EXPENSE': { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Expense' },
  };

  const toggleGroup = (id: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const isChildHidden = (account: Account): boolean => {
    if (!account.parentId) return false;
    if (collapsedGroups.has(account.parentId)) return true;
    const parent = accounts.find(a => a.id === account.parentId);
    if (parent) return isChildHidden(parent);
    return false;
  };

  const filteredAccounts = accounts.filter(a => {
    if (searchTerm) {
      return (a.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (a.code || '').includes(searchTerm);
    }
    return !isChildHidden(a);
  });

  const groupAccounts = accounts.filter(a => a.isGroup);
  const parentOptions = [
    { value: '', label: '-- No Parent (Root) --' },
    ...groupAccounts.map(a => ({ value: a.id, label: `${a.code} - ${a.name}` })),
  ];

  const handleAddAccount = async () => {
    const parent = accounts.find(a => a.id === newAccount.parentId);
    const level = parent ? parent.level + 1 : 1;
    try {
      const created = await accountsApi.create({
        code: newAccount.code,
        name: newAccount.name,
        type: newAccount.type,
        subType: newAccount.subType || 'General',
        level,
        parentId: newAccount.parentId || undefined,
        balance: 0,
        isGroup: newAccount.isGroup,
      });
      setAccounts(prev => [...prev, created]);
      toast.success('Account created successfully');
      setShowAddModal(false);
      setNewAccount({ code: '', name: '', type: 'ASSET', subType: '', parentId: '', isGroup: false });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create account');
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search accounts by name or code..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="input-premium w-full pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => collapsedGroups.size > 0 ? setCollapsedGroups(new Set()) : setCollapsedGroups(new Set(groupAccounts.map(g => g.id)))}
            className="btn-ghost text-sm"
          >
            {collapsedGroups.size > 0 ? 'Expand All' : 'Collapse All'}
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm">
            <Plus className="h-4 w-4" /> Add Account
          </button>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
        <table className="table-premium">
          <thead>
            <tr>
              <th className="w-32">Code</th>
              <th>Account Name</th>
              <th className="w-32">Type</th>
              <th className="text-right w-40">Balance (SAR)</th>
              <th className="text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.map(account => {
              const config = typeConfig[(account.type || '').toUpperCase()] || typeConfig['ASSET'];
              const paddingLeft = (account.level - 1) * 24 + 16;
              const isCollapsed = collapsedGroups.has(account.id);
              return (
                <tr key={account.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100/80 last:border-0">
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-sm font-semibold text-slate-400">{account.code}</span>
                  </td>
                  <td className="py-3.5" style={{ paddingLeft: `${paddingLeft}px` }}>
                    <div className="flex items-center gap-2.5">
                      {account.isGroup ? (
                        <button
                          onClick={() => toggleGroup(account.id)}
                          className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 hover:bg-indigo-100 transition-colors"
                        >
                          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      ) : (
                        <div className="h-7 w-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                          <FileText className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <span className={`text-sm ${account.isGroup ? 'font-bold text-slate-900' : 'text-slate-700 font-medium'}`}>
                        {account.name}
                      </span>
                      {account.isGroup && (
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">GROUP</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${config.bg} ${config.text}`}>
                      {config.label || account.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className={`text-sm font-bold ${(account.balance || 0) >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                      {fmt(Math.abs((account.balance || 0)))}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"><Eye className="h-3.5 w-3.5" /></button>
                      <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Account Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Account" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Account Code <span className="text-rose-500">*</span></label>
              <input
                type="text"
                value={newAccount.code}
                onChange={e => setNewAccount(p => ({ ...p, code: e.target.value }))}
                className="input-premium w-full"
                placeholder="e.g. 1150"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Account Name <span className="text-rose-500">*</span></label>
              <input
                type="text"
                value={newAccount.name}
                onChange={e => setNewAccount(p => ({ ...p, name: e.target.value }))}
                className="input-premium w-full"
                placeholder="e.g. Short-term Investments"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Account Type <span className="text-rose-500">*</span></label>
              <select
                value={newAccount.type}
                onChange={e => setNewAccount(p => ({ ...p, type: e.target.value }))}
                className="input-premium w-full"
              >
                <option value="ASSET">Asset</option>
                <option value="LIABILITY">Liability</option>
                <option value="EQUITY">Equity</option>
                <option value="REVENUE">Revenue</option>
                <option value="EXPENSE">Expense</option>
              </select>
            </div>
            <SearchableSelect
              label="Parent Account"
              options={parentOptions}
              value={newAccount.parentId}
              onChange={v => setNewAccount(p => ({ ...p, parentId: v }))}
              placeholder="Select parent..."
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={newAccount.isGroup}
                onChange={e => setNewAccount(p => ({ ...p, isGroup: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
            <span className="text-sm font-medium text-slate-700">Is Group Account</span>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button onClick={() => setShowAddModal(false)} className="btn-ghost">Cancel</button>
            <button
              onClick={handleAddAccount}
              disabled={!newAccount.code || !newAccount.name}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" /> Add Account
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ===================================================================
// GENERAL LEDGER TAB
// ===================================================================

const GeneralLedgerTab: React.FC<{
  accounts: Account[];
  journals: JournalEntry[];
}> = ({ accounts, journals }) => {
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [dateFrom, setDateFrom] = useState('2024-01-01');
  const [dateTo, setDateTo] = useState('2024-12-31');

  const accountOptions = accounts
    .filter(a => !a.isGroup)
    .map(a => ({ value: a.id, label: `${a.code} - ${a.name}` }));

  const ledgerEntries = useMemo(() => {
    if (!selectedAccountId) return [];
    const entries: { date: string; reference: string; description: string; debit: number; credit: number }[] = [];
    journals
      .filter(j => (j.status || '').toUpperCase() === 'POSTED' && j.date >= dateFrom && j.date <= dateTo)
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach(j => {
        j.lines.forEach(line => {
          if (line.accountId === selectedAccountId) {
            entries.push({
              date: j.date,
              reference: (j.entryNumber || j.entryNo || ''),
              description: line.description || j.description,
              debit: line.debitAmount || line.debit || 0,
              credit: line.creditAmount || line.credit || 0,
            });
          }
        });
      });
    return entries;
  }, [selectedAccountId, journals, dateFrom, dateTo]);

  const runningBalances = useMemo(() => {
    let balance = 0;
    return ledgerEntries.map(e => {
      balance += e.debit - e.credit;
      return { ...e, balance };
    });
  }, [ledgerEntries]);

  const totalDebit = ledgerEntries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = ledgerEntries.reduce((s, e) => s + e.credit, 0);
  const closingBalance = totalDebit - totalCredit;

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SearchableSelect
            label="Select Account"
            options={accountOptions}
            value={selectedAccountId}
            onChange={setSelectedAccountId}
            placeholder="Choose an account..."
            required
          />
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="input-premium w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="input-premium w-full"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {selectedAccountId && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80">
            <p className="text-xs font-semibold text-slate-500 mb-1">Opening Balance</p>
            <p className="text-xl font-bold text-slate-900">SAR 0.00</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80">
            <p className="text-xs font-semibold text-slate-500 mb-1">Total Debit</p>
            <p className="text-xl font-bold text-emerald-600">SAR {fmt(totalDebit)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80">
            <p className="text-xs font-semibold text-slate-500 mb-1">Total Credit</p>
            <p className="text-xl font-bold text-rose-600">SAR {fmt(totalCredit)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80">
            <p className="text-xs font-semibold text-slate-500 mb-1">Closing Balance</p>
            <p className={`text-xl font-bold ${closingBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              SAR {fmt(Math.abs(closingBalance))} {closingBalance < 0 ? 'Cr' : 'Dr'}
            </p>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      {selectedAccountId ? (
        <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                General Ledger: {accounts.find(a => a.id === selectedAccountId)?.code} - {accounts.find(a => a.id === selectedAccountId)?.name}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">{ledgerEntries.length} transactions found</p>
            </div>
            <button className="btn-ghost text-sm"><Download className="h-4 w-4" /> Export</button>
          </div>
          <table className="table-premium">
            <thead>
              <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Description</th>
                <th className="text-right">Debit (SAR)</th>
                <th className="text-right">Credit (SAR)</th>
                <th className="text-right">Balance (SAR)</th>
              </tr>
            </thead>
            <tbody>
              {runningBalances.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">No transactions found for the selected period.</td></tr>
              ) : (
                runningBalances.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td><span className="text-sm text-slate-600">{formatDate(entry.date)}</span></td>
                    <td><span className="font-mono text-sm font-semibold text-blue-600">{entry.reference}</span></td>
                    <td><span className="text-sm text-slate-700">{entry.description}</span></td>
                    <td className="text-right">
                      {entry.debit > 0 ? <span className="font-semibold text-sm text-slate-900">{fmt(entry.debit)}</span> : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="text-right">
                      {entry.credit > 0 ? <span className="font-semibold text-sm text-slate-900">{fmt(entry.credit)}</span> : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="text-right">
                      <span className={`font-bold text-sm ${entry.balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                        {fmt(Math.abs(entry.balance))} {entry.balance < 0 ? 'Cr' : 'Dr'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
              {runningBalances.length > 0 && (
                <tr className="bg-slate-50/80 font-bold border-t-2 border-slate-200">
                  <td colSpan={3} className="text-right text-xs uppercase tracking-wider text-slate-500 py-3.5 px-4">Totals</td>
                  <td className="text-right py-3.5 px-4"><span className="text-emerald-700">{fmt(totalDebit)}</span></td>
                  <td className="text-right py-3.5 px-4"><span className="text-rose-700">{fmt(totalCredit)}</span></td>
                  <td className="text-right py-3.5 px-4">
                    <span className={closingBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}>
                      {fmt(Math.abs(closingBalance))} {closingBalance < 0 ? 'Cr' : 'Dr'}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-16 text-center">
          <Landmark className="h-16 w-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-400">Select an Account</h3>
          <p className="text-sm text-slate-400 mt-1">Choose an account from the dropdown above to view its general ledger.</p>
        </div>
      )}
    </div>
  );
};

// ===================================================================
// JOURNAL ENTRIES TAB
// ===================================================================

const JournalEntriesTab: React.FC<{
  accounts: Account[];
  journals: JournalEntry[];
  setJournals: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
}> = ({ accounts, journals, setJournals }) => {
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  // New entry form state
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDescription, setNewDescription] = useState('');
  const [newLines, setNewLines] = useState<JournalLine[]>([
    { id: `nl-${Date.now()}-1`, accountId: '', debitAmount: 0, creditAmount: 0, description: '' },
    { id: `nl-${Date.now()}-2`, accountId: '', debitAmount: 0, creditAmount: 0, description: '' },
  ]);

  const accountOptions = accounts
    .filter(a => !a.isGroup)
    .map(a => ({ value: a.id, label: `${a.code} - ${a.name}` }));

  const statusConfig: Record<string, { bg: string; text: string; label: string; Icon: React.FC<any> }> = {
    'DRAFT': { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600', label: 'Draft', Icon: Clock },
    'POSTED': { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Posted', Icon: CheckCircle2 },
    'VOID': { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', label: 'Void', Icon: XCircle },
  };

  const toggleExpand = (id: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredJournals = journals.filter(j => {
    if (statusFilter !== 'All' && (j.status || '').toUpperCase() !== statusFilter.toUpperCase()) return false;
    if (typeFilter !== 'All') {
      // Type filter is illustrative - entry type tag based on description keywords
      const desc = (j.description || '').toLowerCase();
      if (typeFilter === 'Receipt' && !desc.includes('receipt') && !desc.includes('received') && !desc.includes('customer payment')) return false;
      if (typeFilter === 'Payment' && !desc.includes('payment') && !desc.includes('paid') && !desc.includes('vendor')) return false;
      if (typeFilter === 'Contra' && !desc.includes('contra') && !desc.includes('transfer')) return false;
      if (typeFilter === 'Journal' && (desc.includes('receipt') || desc.includes('payment') || desc.includes('contra'))) return false;
    }
    return true;
  });

  const totalDr = newLines.reduce((s, l) => s + ((l.debitAmount || l.debit || 0) || 0), 0);
  const totalCr = newLines.reduce((s, l) => s + ((l.creditAmount || l.credit || 0) || 0), 0);

  const addLine = () => {
    setNewLines(prev => [...prev, { id: `nl-${Date.now()}`, accountId: '', debitAmount: 0, creditAmount: 0, description: '' }]);
  };

  const removeLine = (id: string) => {
    if (newLines.length <= 2) return;
    setNewLines(prev => prev.filter(l => l.id !== id));
  };

  const updateLine = (id: string, field: keyof JournalLine, value: any) => {
    setNewLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const handleSave = async (status: 'DRAFT' | 'POSTED') => {
    const isBalanced = Math.abs(totalDr - totalCr) < 0.01;
    if (!isBalanced) return;
    if (!newDescription.trim()) return;

    try {
      const payload = {
        date: newDate,
        description: newDescription,
        status,
        lines: newLines.filter(l => l.accountId && ((l.debitAmount || l.debit || 0) > 0 || (l.creditAmount || l.credit || 0) > 0)),
      };
      const created = await journalsApi.create(payload);
      setJournals(prev => [created, ...prev]);
      toast.success(status === 'POSTED' ? 'Journal entry posted successfully' : 'Journal entry saved as draft');
      setShowNewEntry(false);
      setNewDescription('');
      setNewLines([
        { id: `nl-${Date.now()}-1`, accountId: '', debitAmount: 0, creditAmount: 0, description: '' },
        { id: `nl-${Date.now()}-2`, accountId: '', debitAmount: 0, creditAmount: 0, description: '' },
      ]);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save journal entry');
    }
  };

  const getAccountName = (accountId: string) => {
    const acc = accounts.find(a => a.id === accountId);
    return acc ? `${acc.code} - ${acc.name}` : `Account #${accountId}`;
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-premium text-sm py-2">
              <option value="All">All Types</option>
              <option value="Receipt">Receipt</option>
              <option value="Payment">Payment</option>
              <option value="Contra">Contra</option>
              <option value="Journal">Journal</option>
            </select>
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-premium text-sm py-2">
            <option value="All">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Posted">Posted</option>
            <option value="Void">Void</option>
          </select>
        </div>
        <button onClick={() => setShowNewEntry(true)} className="btn-primary text-sm">
          <Plus className="h-4 w-4" /> New Journal Entry
        </button>
      </div>

      {/* New Entry Modal */}
      <Modal isOpen={showNewEntry} onClose={() => setShowNewEntry(false)} title="New Journal Entry" size="xl">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Date <span className="text-rose-500">*</span></label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="input-premium w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Description <span className="text-rose-500">*</span></label>
              <input
                type="text"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                className="input-premium w-full"
                placeholder="Enter journal description..."
              />
            </div>
          </div>

          {/* Lines Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr className="text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-3 py-2.5 text-left font-semibold w-[40%]">Account</th>
                  <th className="px-3 py-2.5 text-left font-semibold w-[18%]">Description</th>
                  <th className="px-3 py-2.5 text-right font-semibold w-[16%]">Debit</th>
                  <th className="px-3 py-2.5 text-right font-semibold w-[16%]">Credit</th>
                  <th className="px-3 py-2.5 text-center font-semibold w-[10%]"></th>
                </tr>
              </thead>
              <tbody>
                {newLines.map((line) => (
                  <tr key={line.id} className="border-t border-slate-100">
                    <td className="p-2">
                      <SearchableSelect
                        options={accountOptions}
                        value={line.accountId}
                        onChange={v => updateLine(line.id, 'accountId', v)}
                        placeholder="Select account..."
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={line.description || ''}
                        onChange={e => updateLine(line.id, 'description', e.target.value)}
                        className="input-premium w-full text-sm"
                        placeholder="Note"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={line.debitAmount || ''}
                        onChange={e => updateLine(line.id, 'debitAmount', parseFloat(e.target.value) || 0)}
                        className="input-premium w-full text-right text-sm"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={line.creditAmount || ''}
                        onChange={e => updateLine(line.id, 'creditAmount', parseFloat(e.target.value) || 0)}
                        className="input-premium w-full text-right text-sm"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => removeLine(line.id)}
                        disabled={newLines.length <= 2}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={addLine} className="btn-ghost text-sm">
            <Plus className="h-4 w-4" /> Add Line
          </button>

          {/* Balance Bar */}
          <BalanceBar totalDr={totalDr} totalCr={totalCr} />

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button onClick={() => setShowNewEntry(false)} className="btn-ghost">Cancel</button>
            <button
              onClick={() => handleSave('DRAFT')}
              disabled={Math.abs(totalDr - totalCr) > 0.01 || !newDescription.trim()}
              className="btn-ghost border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Clock className="h-4 w-4" /> Save as Draft
            </button>
            <button
              onClick={() => handleSave('POSTED')}
              disabled={Math.abs(totalDr - totalCr) > 0.01 || !newDescription.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="h-4 w-4" /> Post Entry
            </button>
          </div>
        </div>
      </Modal>

      {/* Journal Entries List */}
      <div className="space-y-4">
        {filteredJournals.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-16 text-center">
            <BookOpen className="h-16 w-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-400">No Journal Entries Found</h3>
            <p className="text-sm text-slate-400 mt-1">Adjust your filters or create a new journal entry.</p>
          </div>
        ) : (
          filteredJournals.map(journal => {
            const config = statusConfig[(journal.status || '').toUpperCase()] || statusConfig['DRAFT'];
            const { Icon: StatusIcon } = config;
            const isExpanded = expandedEntries.has(journal.id);
            const jTotalDr = journal.lines.reduce((s, l) => s + (l.debitAmount || l.debit || 0), 0);
            const jTotalCr = journal.lines.reduce((s, l) => s + (l.creditAmount || l.credit || 0), 0);
            return (
              <div key={journal.id} className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
                <button
                  onClick={() => toggleExpand(journal.id)}
                  className="w-full p-5 border-b border-slate-100/80 bg-slate-50/30 flex justify-between items-center hover:bg-slate-50/60 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{journal.entryNumber || journal.entryNo}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{journal.date} &middot; {journal.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-slate-900">SAR {fmt(jTotalDr)}</p>
                      <p className="text-[10px] text-slate-500">Dr = Cr</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text}`}>
                      <StatusIcon className="h-3 w-3" />
                      {config.label || journal.status}
                    </span>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-3">
                    <table className="min-w-full">
                      <thead>
                        <tr className="text-xs text-slate-400">
                          <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider w-1/2">Account</th>
                          <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider">Description</th>
                          <th className="px-4 py-2.5 text-right font-semibold uppercase tracking-wider">Debit (SAR)</th>
                          <th className="px-4 py-2.5 text-right font-semibold uppercase tracking-wider">Credit (SAR)</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {journal.lines.map((line, idx) => (
                          <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                            <td className="px-4 py-2.5 text-slate-700 font-medium">{getAccountName(line.accountId)}</td>
                            <td className="px-4 py-2.5 text-slate-500 text-xs">{line.description || '-'}</td>
                            <td className="px-4 py-2.5 text-right">
                              {(line.debitAmount || 0) > 0 ? <span className="font-bold text-slate-900">{fmt(line.debitAmount || 0)}</span> : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              {(line.creditAmount || 0) > 0 ? <span className="font-bold text-slate-900">{fmt(line.creditAmount || 0)}</span> : <span className="text-slate-300">-</span>}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50/80 font-bold text-slate-900">
                          <td className="px-4 py-3 text-right text-xs uppercase tracking-wider text-slate-500" colSpan={2}>Totals</td>
                          <td className="px-4 py-3 text-right">{fmt(jTotalDr)}</td>
                          <td className="px-4 py-3 text-right">{fmt(jTotalCr)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ===================================================================
// TRIAL BALANCE TAB
// ===================================================================

const TrialBalanceTab: React.FC<{
  accounts: Account[];
  journals: JournalEntry[];
}> = ({ accounts, journals: _journals }) => {
  const [dateFrom, setDateFrom] = useState('2024-01-01');
  const [dateTo, setDateTo] = useState('2024-12-31');

  const trialBalanceData = useMemo(() => {
    return accounts
      .filter(a => !a.isGroup && (a.balance || 0) !== 0)
      .map(a => {
        const typeUpper = (a.type || '').toUpperCase();
        const isDebitNatural = typeUpper === 'ASSET' || typeUpper === 'EXPENSE';
        return {
          code: a.code,
          name: a.name,
          type: a.type,
          debitBalance: isDebitNatural ? (a.balance || 0) : 0,
          creditBalance: !isDebitNatural ? (a.balance || 0) : 0,
        };
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [accounts]);

  const totalDebit = trialBalanceData.reduce((s, r) => s + (r.debitBalance || 0), 0);
  const totalCredit = trialBalanceData.reduce((s, r) => s + (r.creditBalance || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const typeConfig: Record<string, { bg: string; text: string; label: string }> = {
    'ASSET': { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Asset' },
    'LIABILITY': { bg: 'bg-rose-50', text: 'text-rose-600', label: 'Liability' },
    'EQUITY': { bg: 'bg-purple-50', text: 'text-purple-600', label: 'Equity' },
    'REVENUE': { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Revenue' },
    'EXPENSE': { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Expense' },
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-premium text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-premium text-sm" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-sm"><Printer className="h-4 w-4" /> Print</button>
          <button className="btn-ghost text-sm"><Download className="h-4 w-4" /> Export</button>
        </div>
      </div>

      {/* Balance Status */}
      <div className={`rounded-2xl p-4 border flex items-center gap-3 ${isBalanced ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
        {isBalanced ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">Trial Balance is in equilibrium. Total Debit = Total Credit = SAR {fmt(totalDebit)}</span>
          </>
        ) : (
          <>
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <span className="text-sm font-semibold text-rose-700">Trial Balance is NOT balanced. Difference: SAR {fmt(Math.abs(totalDebit - totalCredit))}</span>
          </>
        )}
      </div>

      {/* Trial Balance Table */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Trial Balance</h3>
          <p className="text-sm text-slate-500 mt-0.5">Period: {dateFrom} to {dateTo}</p>
        </div>
        <table className="table-premium">
          <thead>
            <tr>
              <th className="w-28">Code</th>
              <th>Account Name</th>
              <th className="w-28">Type</th>
              <th className="text-right w-40">Debit Balance (SAR)</th>
              <th className="text-right w-40">Credit Balance (SAR)</th>
            </tr>
          </thead>
          <tbody>
            {trialBalanceData.map(row => {
              const config = typeConfig[(row.type || '').toUpperCase()] || typeConfig['ASSET'];
              return (
                <tr key={row.code} className="hover:bg-slate-50/80 transition-colors">
                  <td><span className="font-mono text-sm font-semibold text-slate-400">{row.code}</span></td>
                  <td><span className="text-sm font-medium text-slate-700">{row.name}</span></td>
                  <td>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${config.bg} ${config.text}`}>
                      {config.label || row.type}
                    </span>
                  </td>
                  <td className="text-right">
                    {(row.debitBalance || 0) > 0 ? <span className="font-semibold text-sm text-slate-900">{fmt(row.debitBalance || 0)}</span> : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="text-right">
                    {(row.creditBalance || 0) > 0 ? <span className="font-semibold text-sm text-slate-900">{fmt(row.creditBalance || 0)}</span> : <span className="text-slate-300">-</span>}
                  </td>
                </tr>
              );
            })}
            {/* Total Row */}
            <tr className="bg-slate-50/80 border-t-2 border-slate-300">
              <td colSpan={3} className="py-4 px-4 text-right text-xs uppercase tracking-wider text-slate-600 font-bold">Grand Total</td>
              <td className="py-4 px-4 text-right">
                <span className="text-lg font-bold text-emerald-700">{fmt(totalDebit)}</span>
              </td>
              <td className="py-4 px-4 text-right">
                <span className="text-lg font-bold text-rose-700">{fmt(totalCredit)}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ===================================================================
// BANK & CASH TAB
// ===================================================================

const BankCashTab: React.FC<{ banks: any[] }> = ({ banks }) => {
  const [recentTxns, setRecentTxns] = useState<any[]>([]);

  useEffect(() => {
    import('../../services/api').then(({ transactionHistoryApi }) => {
      transactionHistoryApi.getAll().then((data: any) => {
        const raw = Array.isArray(data) ? data : [];
        setRecentTxns(raw.slice(0, 10)); // Show latest 10
      }).catch(() => setRecentTxns([]));
    });
  }, []);

  const bankCardColors = [
    { gradient: 'from-emerald-500 to-teal-600', sparkColor: '#a7f3d0' },
    { gradient: 'from-blue-500 to-indigo-600', sparkColor: '#bfdbfe' },
    { gradient: 'from-violet-500 to-purple-600', sparkColor: '#ddd6fe' },
    { gradient: 'from-amber-500 to-orange-600', sparkColor: '#fde68a' },
  ];

  // Use real bank data with fallback to mock data
  const activeBankAccounts = banks.length > 0 ? banks : fallbackBankAccounts;
  const totalBankCash = activeBankAccounts.reduce((s, b) => s + (b.currentBalance || b.balance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Total Balance */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-300">Total Bank & Cash Balance</p>
          <p className="text-3xl font-bold tracking-tight mt-1">SAR {fmt(totalBankCash)}</p>
          <p className="text-xs text-slate-400 mt-1">Across {activeBankAccounts.length} accounts</p>
        </div>
        <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center">
          <Building2 className="h-7 w-7 text-white" />
        </div>
      </div>

      {/* Bank Account Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {activeBankAccounts.map((bank, idx) => {
          const colors = bankCardColors[idx % bankCardColors.length];
          const bankBalance = bank.currentBalance || bank.balance || 0;
          const bankCode = bank.accountCode || bank.code || 'N/A';
          const bankName = bank.bankName || bank.name || 'Unknown Bank';
          const lastTransaction = bank.lastTransaction || bank.lastTx || 'N/A';
          const sparklineData = bank.sparkline || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

          return (
            <div key={bank.id} className={`bg-gradient-to-br ${colors.gradient} rounded-2xl p-5 text-white shadow-lg relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {bankCode === '1110' || bankName.toLowerCase().includes('cash') ? <Banknote className="h-5 w-5 opacity-80" /> : <Building2 className="h-5 w-5 opacity-80" />}
                    <span className="text-xs font-medium opacity-90 truncate">{bankName}</span>
                  </div>
                  <span className="text-[10px] opacity-60 font-mono">{bankCode}</span>
                </div>
                <p className="text-2xl font-bold tracking-tight mb-2">SAR {fmt(bankBalance)}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] opacity-70">Last: {lastTransaction}</span>
                  {sparklineData.length > 0 && <MiniSparkline data={sparklineData} color={colors.sparkColor} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transaction List */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Recent Bank & Cash Transactions</h3>
            <p className="text-sm text-slate-500 mt-0.5">Combined transaction list across all accounts</p>
          </div>
          <button className="btn-ghost text-sm"><Download className="h-4 w-4" /> Export</button>
        </div>
        <table className="table-premium">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Reference</th>
              <th>Account</th>
              <th className="text-right">Debit (SAR)</th>
              <th className="text-right">Credit (SAR)</th>
              <th className="text-right">Balance (SAR)</th>
            </tr>
          </thead>
          <tbody>
            {recentTxns.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-sm text-slate-400 py-8">No transactions found</td></tr>
            ) : recentTxns.map((tx: any) => (
              <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                <td><span className="text-sm text-slate-600">{formatDate(tx.date)}</span></td>
                <td><span className="text-sm text-slate-700 font-medium">{tx.description}</span></td>
                <td><span className="font-mono text-sm text-blue-600 font-semibold">{tx.reference}</span></td>
                <td>
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
                    {tx.type || 'Journal'}
                  </span>
                </td>
                <td className="text-right">
                  {(tx.debit || 0) > 0 ? <span className="font-semibold text-sm text-emerald-700">{fmt(tx.debit)}</span> : <span className="text-slate-300">-</span>}
                </td>
                <td className="text-right">
                  {(tx.credit || 0) > 0 ? <span className="font-semibold text-sm text-rose-600">{fmt(tx.credit)}</span> : <span className="text-slate-300">-</span>}
                </td>
                <td className="text-right">
                  <span className="font-bold text-sm text-slate-900">{fmt(tx.balance || 0)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ===================================================================
// MAIN ACCOUNTING MODULE COMPONENT
// ===================================================================

const AccountingModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedAccounts, fetchedJournals, fetchedBanks] = await Promise.all([
        accountsApi.getAll(),
        journalsApi.getAll(),
        banksApi.getAll(),
      ]);
      setAccounts(Array.isArray(fetchedAccounts) ? fetchedAccounts : []);
      setJournals(Array.isArray(fetchedJournals) ? fetchedJournals : []);
      setBanks(Array.isArray(fetchedBanks) ? fetchedBanks : []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load accounting data');
      // Fallback to extended mock data for demo purposes
      setAccounts([]);
      setJournals([]);
      setBanks(fallbackBankAccounts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleNavigate = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const tabs = [
    { key: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: 'coa', label: 'Chart of Accounts', icon: <BookOpen className="h-4 w-4" />, count: accounts.length },
    { key: 'ledger', label: 'General Ledger', icon: <Landmark className="h-4 w-4" /> },
    { key: 'journals', label: 'Journal Entries', icon: <FileSpreadsheet className="h-4 w-4" />, count: journals.length },
    { key: 'trial-balance', label: 'Trial Balance', icon: <Scale className="h-4 w-4" /> },
    { key: 'bank-cash', label: 'Bank & Cash', icon: <Building2 className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500 font-medium">Loading accounting module...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Accounting</h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            Unified accounting dashboard &mdash; Chart of Accounts, General Ledger, Journal Entries, Trial Balance & Bank/Cash
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-sm">
            <Printer className="h-4 w-4" /> Print
          </button>
          <button className="btn-ghost text-sm">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'overview' && (
          <OverviewTab accounts={accounts} journals={journals} banks={banks} onNavigate={handleNavigate} />
        )}
        {activeTab === 'coa' && (
          <ChartOfAccountsTab accounts={accounts} setAccounts={setAccounts} />
        )}
        {activeTab === 'ledger' && (
          <GeneralLedgerTab accounts={accounts} journals={journals} />
        )}
        {activeTab === 'journals' && (
          <JournalEntriesTab accounts={accounts} journals={journals} setJournals={setJournals} />
        )}
        {activeTab === 'trial-balance' && (
          <TrialBalanceTab accounts={accounts} journals={journals} />
        )}
        {activeTab === 'bank-cash' && (
          <BankCashTab banks={banks} />
        )}
      </div>
    </div>
  );
};

export default AccountingModule;
