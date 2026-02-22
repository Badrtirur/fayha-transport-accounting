import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    DollarSign,
    Wallet,
    Receipt,
    Users,
    Files,
    ArrowRight,
    Clock,
    CreditCard,
    BarChart3,
    Target,
    Loader2,
    AlertCircle,
} from 'lucide-react';
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

// ─── Helper ─────────────────────────────────────────────────
const fmtSAR = (n: number) => `SAR ${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// ─── Sub-components ─────────────────────────────────────────

const KPICard = ({ title, value, icon: Icon, gradient, subtitle }: any) => (
    <div className="stat-card group">
        <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-2xl ${gradient} shadow-lg`}>
                <Icon className="h-6 w-6 text-white" />
            </div>
        </div>
        <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
        <p className="text-3xl font-bold text-slate-900 mt-1 tracking-tight">{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
);

const QuickActionCard = ({ icon: Icon, label, description, href, color }: any) => (
    <Link to={href} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-card-hover transition-all duration-300 group cursor-pointer">
        <div className={`h-12 w-12 rounded-2xl ${color} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
            <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 text-sm">{label}</p>
            <p className="text-xs text-slate-500 truncate">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
    </Link>
);

// ─── Main Component ─────────────────────────────────────────

const Dashboard: React.FC = () => {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [customerCount, setCustomerCount] = useState(0);
    const [jobCount, setJobCount] = useState(0);
    const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                setLoading(true);
                setError('');

                const [summaryRes, customersRes, jobsRes, invoicesRes] = await Promise.all([
                    dashboardApi.getSummary().catch(() => null),
                    customersApi.getAll().catch(() => []),
                    jobReferencesApi.getAll().catch(() => []),
                    salesInvoicesApi.getAll().catch(() => []),
                ]);

                if (cancelled) return;

                if (summaryRes) setSummary(summaryRes);
                setCustomerCount(Array.isArray(customersRes) ? customersRes.length : 0);
                setJobCount(Array.isArray(jobsRes) ? jobsRes.length : 0);
                setRecentInvoices(Array.isArray(invoicesRes) ? invoicesRes.slice(0, 6) : []);
            } catch (err: any) {
                if (!cancelled) setError(err.message || 'Failed to load dashboard data');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
                    <p className="text-slate-500 text-sm">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-3 text-center">
                    <AlertCircle className="h-8 w-8 text-red-400" />
                    <p className="text-slate-700 font-medium">Failed to load dashboard</p>
                    <p className="text-sm text-slate-500">{error}</p>
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

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
                    </div>
                    <p className="text-slate-500">Business overview — live data from your system.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link to="/accounting/journals" className="btn-primary">
                        <BarChart3 className="h-4 w-4" />
                        View Journal Entries
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                <KPICard
                    title="Total Revenue"
                    value={fmtSAR(s.totalRevenue)}
                    icon={DollarSign}
                    gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                    subtitle="From revenue accounts"
                />
                <KPICard
                    title="Total Expenses"
                    value={fmtSAR(s.totalExpenses)}
                    icon={Wallet}
                    gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
                    subtitle="From expense accounts"
                />
                <KPICard
                    title="Net Income"
                    value={fmtSAR(s.netIncome)}
                    icon={Target}
                    gradient="bg-gradient-to-br from-violet-500 to-purple-600"
                    subtitle={`${profitMargin}% profit margin`}
                />
                <KPICard
                    title="Outstanding Receivable"
                    value={fmtSAR(s.totalReceivable)}
                    icon={Clock}
                    gradient="bg-gradient-to-br from-amber-500 to-orange-600"
                    subtitle={`${s.unpaidInvoices} unpaid invoices`}
                />
            </div>

            {/* Bank Balances + Quick Actions */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Bank Balances */}
                <div className="xl:col-span-2 bg-white rounded-2xl shadow-card border border-slate-100/80 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Bank Accounts</h3>
                            <p className="text-sm text-slate-500 mt-0.5">Active bank account balances</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-500">Total Balance</p>
                            <p className="text-xl font-bold text-emerald-600">{fmtSAR(s.totalBankBalance)}</p>
                        </div>
                    </div>
                    {s.bankBalances.length > 0 ? (
                        <div className="space-y-3">
                            {s.bankBalances.map((bank) => (
                                <div key={bank.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: bank.color || '#3b82f6' }}>
                                            {(bank.bankName || bank.code || '').substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-slate-900">{bank.bankName || bank.code}</p>
                                            <p className="text-xs text-slate-500">{bank.code}</p>
                                        </div>
                                    </div>
                                    <p className="font-bold text-slate-900">{fmtSAR(Number(bank.currentBalance))}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 text-center py-8">No active bank accounts</p>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900">Quick Actions</h3>
                    <div className="space-y-3">
                        <QuickActionCard icon={Files} label="New Job Reference" description="Create a clearance job" href="/job-reference" color="bg-gradient-to-br from-blue-500 to-indigo-600" />
                        <QuickActionCard icon={Receipt} label="Create Invoice" description="Bill a customer for services" href="/sales-invoice" color="bg-gradient-to-br from-emerald-500 to-teal-600" />
                        <QuickActionCard icon={Users} label="Add Client" description="Register a new client" href="/clients" color="bg-gradient-to-br from-violet-500 to-purple-600" />
                        <QuickActionCard icon={CreditCard} label="Record Payment" description="Log an incoming payment" href="/payment-entry" color="bg-gradient-to-br from-amber-500 to-orange-600" />
                    </div>
                </div>
            </div>

            {/* Recent Journals + Recent Invoices */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Recent Journal Entries */}
                <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Recent Journal Entries</h3>
                            <p className="text-sm text-slate-500 mt-0.5">Latest accounting entries</p>
                        </div>
                        <Link to="/accounting/journals" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                            View All <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {s.recentJournals.length > 0 ? s.recentJournals.slice(0, 6).map((je: any) => (
                            <div key={je.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                                        je.status === 'POSTED' || je.status === 'Posted' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        <Receipt className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <span className="font-bold text-sm text-slate-900">{je.entryNumber}</span>
                                        <p className="text-xs text-slate-500 truncate max-w-[200px]">{je.description}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-sm text-slate-900">{fmtSAR(Number(je.totalDebit || 0))}</p>
                                    <p className="text-xs text-slate-400">{new Date(je.date).toLocaleDateString()}</p>
                                </div>
                            </div>
                        )) : (
                            <p className="text-sm text-slate-400 text-center py-8">No journal entries yet</p>
                        )}
                    </div>
                </div>

                {/* Recent Invoices */}
                <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Recent Invoices</h3>
                            <p className="text-sm text-slate-500 mt-0.5">Latest sales invoices</p>
                        </div>
                        <Link to="/sales-invoice" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                            View All <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {recentInvoices.length > 0 ? recentInvoices.map((inv: any) => (
                            <div key={inv.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                                        inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' :
                                        inv.status === 'OVERDUE' ? 'bg-red-50 text-red-600' :
                                        'bg-blue-50 text-blue-600'
                                    }`}>
                                        <CreditCard className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-slate-900">{inv.invoiceNumber || inv.invoiceNo || '—'}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
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
                                    <p className="font-bold text-sm text-slate-900">{fmtSAR(Number(inv.totalAmount || inv.grandTotal || 0))}</p>
                                    <p className="text-xs text-slate-400">{inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : '—'}</p>
                                </div>
                            </div>
                        )) : (
                            <p className="text-sm text-slate-400 text-center py-8">No invoices yet</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
                    <div className="flex items-center gap-3 mb-3">
                        <Files className="h-5 w-5 opacity-80" />
                        <span className="text-sm font-medium opacity-90">Job References</span>
                    </div>
                    <p className="text-3xl font-bold">{jobCount}</p>
                    <p className="text-xs opacity-70 mt-1">Total in system</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white">
                    <div className="flex items-center gap-3 mb-3">
                        <Users className="h-5 w-5 opacity-80" />
                        <span className="text-sm font-medium opacity-90">Total Clients</span>
                    </div>
                    <p className="text-3xl font-bold">{customerCount}</p>
                    <p className="text-xs opacity-70 mt-1">Registered clients</p>
                </div>
                <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-5 text-white">
                    <div className="flex items-center gap-3 mb-3">
                        <Receipt className="h-5 w-5 opacity-80" />
                        <span className="text-sm font-medium opacity-90">Unpaid Invoices</span>
                    </div>
                    <p className="text-3xl font-bold">{s.unpaidInvoices}</p>
                    <p className="text-xs opacity-70 mt-1">Awaiting payment</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white">
                    <div className="flex items-center gap-3 mb-3">
                        <Wallet className="h-5 w-5 opacity-80" />
                        <span className="text-sm font-medium opacity-90">Payable Outstanding</span>
                    </div>
                    <p className="text-3xl font-bold">{fmtSAR(s.totalPayable)}</p>
                    <p className="text-xs opacity-70 mt-1">{s.unpaidBills} unpaid bills</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
