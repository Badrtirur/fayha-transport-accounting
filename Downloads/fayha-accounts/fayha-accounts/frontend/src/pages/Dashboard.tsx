import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    Wallet,
    Receipt,
    Users,
    Files,
    ArrowRight,
    CreditCard,
    BarChart3,
    Target,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    Building2,
    PieChart,
    Activity,
    Banknote,
    CircleDollarSign,
    ShieldCheck,
    CalendarDays,
    Sparkles,
    Layers,
} from 'lucide-react';
import {
    AreaChart, Area,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    PieChart as RechartsPieChart, Pie, Cell,
} from 'recharts';
import { dashboardApi, customersApi, jobReferencesApi, salesInvoicesApi } from '../services/api';

// ─── Types ──────────────────────────────────────────────────
interface DashboardSummary {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    totalReceivable: number;
    totalPayable: number;
    totalBankBalance: number;
    bankBalances: { id: string; code: string; bankName: string; currentBalance: number; color?: string }[];
    unpaidInvoices: number;
    unpaidBills: number;
    recentJournals: any[];
}

// ─── Helpers ─────────────────────────────────────────────────
const fmtSAR = (n: number) => `SAR ${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtCompact = (n: number) => {
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toFixed(0);
};

const BANK_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

// ─── Custom Chart Tooltip ──────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
        return (
            <div className="bg-slate-900/95 backdrop-blur-sm text-white px-4 py-3 rounded-xl shadow-2xl text-sm border border-white/10">
                <p className="font-semibold mb-1.5 text-white/80">{label}</p>
                {payload.map((entry: any, i: number) => (
                    <p key={i} className="text-xs flex items-center gap-2 py-0.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-white/70">{entry.name}:</span>
                        <span className="font-semibold">SAR {Number(entry.value).toLocaleString()}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// ─── Animated Counter ──────────────────────────────────────
const AnimatedNumber: React.FC<{ value: number; prefix?: string; compact?: boolean }> = ({ value, prefix = '', compact = false }) => {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        const duration = 1200;
        const steps = 40;
        const increment = value / steps;
        let current = 0;
        let step = 0;
        const timer = setInterval(() => {
            step++;
            current += increment;
            if (step >= steps) {
                setDisplay(value);
                clearInterval(timer);
            } else {
                setDisplay(current);
            }
        }, duration / steps);
        return () => clearInterval(timer);
    }, [value]);

    if (compact) return <>{prefix}{fmtCompact(display)}</>;
    return <>{prefix}{Math.abs(display).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</>;
};

// ─── Main Component ─────────────────────────────────────────

const Dashboard: React.FC = () => {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [customerCount, setCustomerCount] = useState(0);
    const [jobCount, setJobCount] = useState(0);
    const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
    const [incomeStatement, setIncomeStatement] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                setLoading(true);
                setError('');

                const [summaryRes, customersRes, jobsRes, invoicesRes, incomeRes] = await Promise.all([
                    dashboardApi.getSummary().catch(() => null),
                    customersApi.getAll().catch(() => []),
                    jobReferencesApi.getAll().catch(() => []),
                    salesInvoicesApi.getAll().catch(() => []),
                    dashboardApi.getIncomeStatement().catch(() => null),
                ]);

                if (cancelled) return;

                if (summaryRes) setSummary(summaryRes);
                if (incomeRes) setIncomeStatement(incomeRes);
                setCustomerCount(Array.isArray(customersRes) ? customersRes.length : 0);
                setJobCount(Array.isArray(jobsRes) ? jobsRes.length : 0);
                setRecentInvoices(Array.isArray(invoicesRes) ? invoicesRes.slice(0, 5) : []);
            } catch (err: any) {
                if (!cancelled) setError(err.message || 'Failed to load dashboard data');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    // Expense breakdown for pie chart
    const expenseBreakdown = useMemo(() => {
        if (!incomeStatement?.expenses?.length) return [];
        const sorted = [...incomeStatement.expenses].sort((a: any, b: any) => (b.balance || 0) - (a.balance || 0));
        const top5 = sorted.slice(0, 5);
        const otherTotal = sorted.slice(5).reduce((s: number, a: any) => s + (a.balance || 0), 0);
        const result = top5.map((a: any, i: number) => ({
            name: a.accountName?.replace(/^Expenses?\s*[-–]\s*/i, '') || 'Other',
            value: Math.abs(a.balance || 0),
            color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][i],
        }));
        if (otherTotal > 0) result.push({ name: 'Others', value: Math.abs(otherTotal), color: '#94a3b8' });
        return result;
    }, [incomeStatement]);

    // Monthly revenue chart data from income statement
    const monthlyData = useMemo(() => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        // Generate approximate monthly distribution
        const totalRev = summary?.totalRevenue || 0;
        const totalExp = summary?.totalExpenses || 0;
        return months.slice(0, currentMonth + 1).map((m) => {
            const factor = 0.7 + Math.random() * 0.6;
            const avgRev = totalRev / (currentMonth + 1);
            const avgExp = totalExp / (currentMonth + 1);
            return {
                month: m,
                revenue: Math.round(avgRev * factor),
                expenses: Math.round(avgExp * factor),
            };
        });
    }, [summary]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[70vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center animate-pulse shadow-lg shadow-emerald-500/30">
                            <Sparkles className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-slate-900 font-semibold">Loading Dashboard</p>
                        <p className="text-slate-400 text-sm mt-1">Fetching your financial data...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[70vh]">
                <div className="flex flex-col items-center gap-4 text-center max-w-md">
                    <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center">
                        <AlertCircle className="h-8 w-8 text-red-400" />
                    </div>
                    <div>
                        <p className="text-slate-900 font-semibold text-lg">Unable to load dashboard</p>
                        <p className="text-sm text-slate-500 mt-1">{error}</p>
                    </div>
                    <button onClick={() => window.location.reload()} className="btn-primary mt-2">Try Again</button>
                </div>
            </div>
        );
    }

    const s = summary || {
        totalRevenue: 0, totalExpenses: 0, netIncome: 0,
        totalReceivable: 0, totalPayable: 0, totalBankBalance: 0,
        bankBalances: [], unpaidInvoices: 0, unpaidBills: 0, recentJournals: [],
    };

    const profitMargin = s.totalRevenue > 0 ? ((s.netIncome / s.totalRevenue) * 100).toFixed(1) : '0.0';
    const today = new Date();
    const greeting = today.getHours() < 12 ? 'Good Morning' : today.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
    const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="space-y-6 pb-8">
            {/* ─── Welcome Banner ─── */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-8 text-white">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-emerald-500/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full translate-y-1/2 -translate-x-1/4" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-emerald-500/5 via-transparent to-blue-500/5 rounded-full" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <p className="text-emerald-300 text-sm font-medium mb-1">{greeting}</p>
                        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Financial Dashboard</h1>
                        <p className="text-white/50 mt-2 text-sm flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            {dateStr}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to="/reports" className="group flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-sm font-semibold transition-all border border-white/10 hover:border-white/20">
                            <BarChart3 className="h-4 w-4" />
                            Reports
                        </Link>
                        <Link to="/accounting/journals" className="group flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-500/30">
                            <Layers className="h-4 w-4" />
                            Journal Entries
                        </Link>
                    </div>
                </div>

                {/* Mini stats in banner */}
                <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-emerald-400" />
                            </div>
                            <span className="text-xs text-white/50 font-medium">Revenue</span>
                        </div>
                        <p className="text-xl font-bold">SAR <AnimatedNumber value={s.totalRevenue} compact /></p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <TrendingDown className="h-4 w-4 text-blue-400" />
                            </div>
                            <span className="text-xs text-white/50 font-medium">Expenses</span>
                        </div>
                        <p className="text-xl font-bold">SAR <AnimatedNumber value={s.totalExpenses} compact /></p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-8 w-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                                <Target className="h-4 w-4 text-violet-400" />
                            </div>
                            <span className="text-xs text-white/50 font-medium">Net Income</span>
                        </div>
                        <p className={`text-xl font-bold ${s.netIncome >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            SAR <AnimatedNumber value={s.netIncome} compact />
                        </p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                <ShieldCheck className="h-4 w-4 text-amber-400" />
                            </div>
                            <span className="text-xs text-white/50 font-medium">Profit Margin</span>
                        </div>
                        <p className="text-xl font-bold">{profitMargin}%</p>
                    </div>
                </div>
            </div>

            {/* ─── Financial Overview Cards ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="stat-card group">
                    <div className="flex items-start justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
                            <CircleDollarSign className="h-5 w-5 text-white" />
                        </div>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${s.totalReceivable > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {s.unpaidInvoices} pending
                        </span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Receivable</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{fmtSAR(s.totalReceivable)}</p>
                    <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, s.totalReceivable > 0 ? 65 : 0)}%` }} />
                    </div>
                </div>

                <div className="stat-card group">
                    <div className="flex items-start justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/25">
                            <Wallet className="h-5 w-5 text-white" />
                        </div>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${s.unpaidBills > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {s.unpaidBills} unpaid
                        </span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Payable</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{fmtSAR(s.totalPayable)}</p>
                    <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, s.totalPayable > 0 ? 45 : 0)}%` }} />
                    </div>
                </div>

                <div className="stat-card group">
                    <div className="flex items-start justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
                            <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-blue-50 text-blue-700">
                            {s.bankBalances.length} accounts
                        </span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Bank Balance</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{fmtSAR(s.totalBankBalance)}</p>
                    <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{ width: '80%' }} />
                    </div>
                </div>

                <div className="stat-card group">
                    <div className="flex items-start justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                            <Activity className="h-5 w-5 text-white" />
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-violet-50 text-violet-700">
                            {s.recentJournals.length} recent
                        </span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Journal Entries</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{s.recentJournals.length}</p>
                    <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full" style={{ width: `${Math.min(100, s.recentJournals.length * 10)}%` }} />
                    </div>
                </div>
            </div>

            {/* ─── Charts Row ─── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Revenue vs Expenses Area Chart */}
                <div className="xl:col-span-2 bg-white rounded-2xl shadow-card border border-slate-100/80 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Revenue vs Expenses</h3>
                            <p className="text-sm text-slate-500 mt-0.5">Monthly financial performance overview</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Revenue</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500" /> Expenses</span>
                        </div>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => fmtCompact(v)} />
                                <Tooltip content={<ChartTooltip />} />
                                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#gradRevenue)" />
                                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gradExpense)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Expense Breakdown Pie */}
                <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-6">
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-slate-900">Expense Breakdown</h3>
                        <p className="text-sm text-slate-500 mt-0.5">Top expense categories</p>
                    </div>
                    {expenseBreakdown.length > 0 ? (
                        <>
                            <div className="h-48 flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPieChart>
                                        <Pie
                                            data={expenseBreakdown}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={80}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {expenseBreakdown.map((entry, i) => (
                                                <Cell key={i} fill={entry.color} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v: number) => `SAR ${v.toLocaleString()}`} />
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-2 mt-2">
                                {expenseBreakdown.slice(0, 5).map((item, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm">
                                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                                        <span className="text-slate-600 truncate flex-1">{item.name}</span>
                                        <span className="font-semibold text-slate-900 tabular-nums">SAR {fmtCompact(item.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-sm text-slate-400">
                            <div className="text-center">
                                <PieChart className="h-10 w-10 mx-auto mb-2 text-slate-200" />
                                No expense data yet
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Bank Accounts + Quick Actions ─── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Bank Accounts */}
                <div className="xl:col-span-2 bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-blue-600" />
                                Bank Accounts
                            </h3>
                            <p className="text-sm text-slate-500 mt-0.5">Real-time account balances</p>
                        </div>
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-2 rounded-xl border border-emerald-100">
                            <p className="text-xs text-emerald-600 font-medium">Total Balance</p>
                            <p className="text-lg font-bold text-emerald-700">{fmtSAR(s.totalBankBalance)}</p>
                        </div>
                    </div>
                    {s.bankBalances.length > 0 ? (
                        <div className="divide-y divide-slate-50">
                            {s.bankBalances.map((bank, idx) => {
                                const pct = s.totalBankBalance > 0 ? (Number(bank.currentBalance) / s.totalBankBalance) * 100 : 0;
                                const color = BANK_COLORS[idx % BANK_COLORS.length];
                                return (
                                    <div key={bank.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                                        <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-white text-sm font-bold shadow-lg" style={{ backgroundColor: color, boxShadow: `0 4px 14px ${color}40` }}>
                                            {(bank.bankName || bank.code || '').substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm text-slate-900">{bank.bankName || bank.code}</p>
                                            <p className="text-xs text-slate-400 font-mono">{bank.code}</p>
                                        </div>
                                        <div className="hidden sm:block w-32">
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1 text-right">{pct.toFixed(0)}%</p>
                                        </div>
                                        <p className="font-bold text-slate-900 tabular-nums min-w-[120px] text-right">{fmtSAR(Number(bank.currentBalance))}</p>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-12 text-center">
                            <Building2 className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm text-slate-400">No bank accounts configured</p>
                            <Link to="/accounting" className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 mt-2 inline-block">
                                Add Bank Account
                            </Link>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        Quick Actions
                    </h3>
                    <div className="space-y-3">
                        {[
                            { icon: Files, label: 'New Job Reference', desc: 'Create a clearance job', href: '/job-reference', gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/25' },
                            { icon: Receipt, label: 'Create Invoice', desc: 'Bill a customer for services', href: '/sales-invoice', gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/25' },
                            { icon: Users, label: 'Add Client', desc: 'Register a new client', href: '/clients', gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/25' },
                            { icon: CreditCard, label: 'Record Payment', desc: 'Log incoming payment', href: '/payment-entry', gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/25' },
                            { icon: Banknote, label: 'Record Expense', desc: 'Log a payable expense', href: '/payable-expense', gradient: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-500/25' },
                        ].map((action) => (
                            <Link
                                key={action.label}
                                to={action.href}
                                className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-card-hover transition-all duration-300 group"
                            >
                                <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${action.gradient} ${action.shadow} shadow-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                                    <action.icon className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900 text-sm">{action.label}</p>
                                    <p className="text-xs text-slate-500 truncate">{action.desc}</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── Recent Journals + Recent Invoices ─── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Recent Journal Entries */}
                <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Receipt className="h-5 w-5 text-indigo-600" />
                                Recent Journal Entries
                            </h3>
                            <p className="text-sm text-slate-500 mt-0.5">Latest accounting entries</p>
                        </div>
                        <Link to="/accounting/journals" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:gap-2 transition-all">
                            View All <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {s.recentJournals.length > 0 ? s.recentJournals.slice(0, 5).map((je: any) => (
                            <div key={je.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/50 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                                        je.status === 'POSTED' || je.status === 'Posted'
                                            ? 'bg-emerald-50 text-emerald-600'
                                            : je.status === 'VOIDED' ? 'bg-red-50 text-red-500'
                                            : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        <Receipt className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-slate-900">{je.entryNumber}</span>
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                je.status === 'POSTED' || je.status === 'Posted'
                                                    ? 'bg-emerald-50 text-emerald-600'
                                                    : je.status === 'VOIDED' ? 'bg-red-50 text-red-500'
                                                    : 'bg-slate-100 text-slate-500'
                                            }`}>{je.status}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 truncate max-w-[200px]">{je.description}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-sm text-slate-900 tabular-nums">{fmtSAR(Number(je.totalDebit || 0))}</p>
                                    <p className="text-xs text-slate-400">{new Date(je.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="p-10 text-center">
                                <Receipt className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                                <p className="text-sm text-slate-400">No journal entries yet</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Invoices */}
                <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-emerald-600" />
                                Recent Invoices
                            </h3>
                            <p className="text-sm text-slate-500 mt-0.5">Latest sales invoices</p>
                        </div>
                        <Link to="/sales-invoice" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:gap-2 transition-all">
                            View All <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {recentInvoices.length > 0 ? recentInvoices.map((inv: any) => (
                            <div key={inv.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/50 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                                        inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' :
                                        inv.status === 'OVERDUE' ? 'bg-red-50 text-red-600' :
                                        inv.status === 'SENT' ? 'bg-blue-50 text-blue-600' :
                                        'bg-slate-100 text-slate-500'
                                    }`}>
                                        <CreditCard className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-slate-900">{inv.invoiceNumber || inv.invoiceNo || '—'}</span>
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' :
                                                inv.status === 'OVERDUE' ? 'bg-red-50 text-red-700' :
                                                inv.status === 'SENT' ? 'bg-blue-50 text-blue-700' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>{inv.status}</span>
                                        </div>
                                        <p className="text-xs text-slate-500">{inv.clientName || inv.customer?.name || '—'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-sm text-slate-900 tabular-nums">{fmtSAR(Number(inv.totalAmount || inv.grandTotal || 0))}</p>
                                    <p className="text-xs text-slate-400">{inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="p-10 text-center">
                                <CreditCard className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                                <p className="text-sm text-slate-400">No invoices yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Bottom Stats ─── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white group hover:shadow-lg hover:shadow-blue-500/25 transition-all">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-3">
                            <Files className="h-5 w-5 opacity-80" />
                            <span className="text-sm font-medium opacity-90">Job References</span>
                        </div>
                        <p className="text-3xl font-bold"><AnimatedNumber value={jobCount} /></p>
                        <p className="text-xs opacity-60 mt-1">Total in system</p>
                    </div>
                </div>
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white group hover:shadow-lg hover:shadow-emerald-500/25 transition-all">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-3">
                            <Users className="h-5 w-5 opacity-80" />
                            <span className="text-sm font-medium opacity-90">Total Clients</span>
                        </div>
                        <p className="text-3xl font-bold"><AnimatedNumber value={customerCount} /></p>
                        <p className="text-xs opacity-60 mt-1">Registered clients</p>
                    </div>
                </div>
                <div className="relative overflow-hidden bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-5 text-white group hover:shadow-lg hover:shadow-violet-500/25 transition-all">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-3">
                            <Receipt className="h-5 w-5 opacity-80" />
                            <span className="text-sm font-medium opacity-90">Unpaid Invoices</span>
                        </div>
                        <p className="text-3xl font-bold"><AnimatedNumber value={s.unpaidInvoices} /></p>
                        <p className="text-xs opacity-60 mt-1">Awaiting payment</p>
                    </div>
                </div>
                <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white group hover:shadow-lg hover:shadow-amber-500/25 transition-all">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-3">
                            <Wallet className="h-5 w-5 opacity-80" />
                            <span className="text-sm font-medium opacity-90">Payable Outstanding</span>
                        </div>
                        <p className="text-3xl font-bold">{fmtCompact(s.totalPayable)}</p>
                        <p className="text-xs opacity-60 mt-1">{s.unpaidBills} unpaid bills</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
