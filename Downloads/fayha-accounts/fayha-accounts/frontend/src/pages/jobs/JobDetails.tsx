import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Ship,
    FileText,
    Plus,
    Calendar,
    MapPin,
    Clock,
    TrendingUp,
    Receipt,
    Download,
    Eye,
    Edit2,
    Trash2,
    CheckCircle2,
    Package,
    Truck,
    Upload,
    Banknote
} from 'lucide-react';
import toast from 'react-hot-toast';
import { jobReferencesApi, salesInvoicesApi, expenseEntriesApi } from '../../services/api';

const statusConfig: Record<string, { bg: string; text: string; dot: string; icon: any }> = {
    'Draft': { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400', icon: FileText },
    'Active': { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500', icon: Clock },
    'Customs Cleared': { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500', icon: CheckCircle2 },
    'Delivered': { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', icon: Truck },
    'Invoiced': { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: Receipt },
    'Closed': { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-500', dot: 'bg-slate-400', icon: Package },
};

const OverviewTab = ({ job }: { job: any }) => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <div className="card-premium p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
                    <Ship className="h-5 w-5 text-indigo-500" />
                    Shipment Details
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                    <div className="p-3 bg-slate-50 rounded-xl">
                        <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">BL Number</dt>
                        <dd className="text-sm text-slate-900 font-bold font-mono">{job.blNumber || job.blNo || 'N/A'}</dd>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                        <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Arrival Date</dt>
                        <dd className="text-sm text-slate-900 font-semibold flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {job.arrivalDate || job.eta || 'N/A'}
                        </dd>
                    </div>
                    <div className="sm:col-span-2 p-3 bg-slate-50 rounded-xl">
                        <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</dt>
                        <dd className="text-sm text-slate-700 leading-relaxed">{job.description || 'N/A'}</dd>
                    </div>
                </dl>
            </div>

            <div className="card-premium p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Job Timeline
                </h3>
                <div className="space-y-0">
                    {[
                        { label: 'Job Created', date: job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A', done: true },
                        { label: 'Documents Submitted', date: 'N/A', done: true },
                        { label: 'Customs Inspection', date: 'N/A', done: true },
                        { label: 'Duty Payment', date: 'N/A', done: job.status !== 'Active' && job.status !== 'Draft' },
                        { label: 'Customs Cleared', date: 'N/A', done: job.status === 'Delivered' || job.status === 'Invoiced' || job.status === 'Closed' },
                        { label: 'Delivery', date: 'Pending', done: job.status === 'Delivered' || job.status === 'Invoiced' || job.status === 'Closed' },
                    ].map((step, i) => (
                        <div key={i} className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step.done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    {step.done ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                </div>
                                {i < 5 && <div className={`w-0.5 h-8 ${step.done ? 'bg-emerald-200' : 'bg-slate-100'}`} />}
                            </div>
                            <div className="pb-6">
                                <p className={`text-sm font-semibold ${step.done ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</p>
                                <p className="text-xs text-slate-500">{step.date}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <div className="space-y-6">
            <div className="card-premium p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    Financial Summary
                </h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                        <span className="text-sm text-slate-600">Reimbursables</span>
                        <span className="font-bold text-slate-900">SAR {(job.totalReimbursable || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl">
                        <span className="text-sm text-emerald-800">Agency Fees</span>
                        <span className="font-bold text-emerald-700">SAR {(job.totalServiceFees || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl">
                        <span className="text-sm text-blue-800">Total Cost</span>
                        <span className="font-bold text-blue-700">SAR {(job.totalCost || 0).toLocaleString()}</span>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-900">Net Profit</span>
                        <span className="font-bold text-xl text-emerald-600">SAR {(job.netProfit || 0).toLocaleString()}</span>
                    </div>
                </div>

                <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-500">Profit Margin</span>
                        <span className="font-bold text-emerald-600">{(job.totalServiceFees || 0) > 0 ? (((job.netProfit || 0) / (job.totalServiceFees || 1)) * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000" style={{ width: `${(job.totalServiceFees || 0) > 0 ? Math.min(((job.netProfit || 0) / (job.totalServiceFees || 1)) * 100, 100) : 0}%` }} />
                    </div>
                </div>

                <Link to={`/invoices/new?jobId=${job.id}`} className="btn-primary w-full mt-6 justify-center">
                    <Receipt className="h-4 w-4" />
                    Generate Invoice
                </Link>
            </div>

            <div className="card-premium p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-4">Quick Info</h3>
                <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">{job.port || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <Truck className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">{job.containerType || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <Package className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">{job.cargoDescription || job.description || 'N/A'}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const JobDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [job, setJob] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [expenses, setExpenses] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loadingExpenses, setLoadingExpenses] = useState(false);
    const [loadingInvoices, setLoadingInvoices] = useState(false);

    useEffect(() => {
        if (id) {
            jobReferencesApi.getById(id).then(data => {
                setJob(data || null);
            }).catch(() => {
                toast.error('Failed to load job details', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
            });
        }
    }, [id]);

    useEffect(() => {
        if (id && activeTab === 'expenses' && expenses.length === 0 && !loadingExpenses) {
            setLoadingExpenses(true);
            expenseEntriesApi.getAll().then(data => {
                const allExpenses = Array.isArray(data) ? data : [];
                const jobExpenses = allExpenses.filter((e: any) => e.jobRefId === id || e.jobId === id);
                setExpenses(jobExpenses);
            }).catch(() => {
                toast.error('Failed to load expenses', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
                setExpenses([]);
            }).finally(() => setLoadingExpenses(false));
        }
    }, [id, activeTab]);

    useEffect(() => {
        if (id && activeTab === 'invoices' && invoices.length === 0 && !loadingInvoices) {
            setLoadingInvoices(true);
            salesInvoicesApi.getAll().then(data => {
                const allInvoices = Array.isArray(data) ? data : [];
                const jobInvoices = allInvoices.filter((inv: any) => inv.jobRefId === id || inv.jobId === id);
                setInvoices(jobInvoices);
            }).catch(() => {
                toast.error('Failed to load invoices', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
                setInvoices([]);
            }).finally(() => setLoadingInvoices(false));
        }
    }, [id, activeTab]);

    const handleDelete = async () => {
        if (!job) return;
        if (!window.confirm(`Are you sure you want to delete job ${job.jobRefNo || job.jobNo || job.id}? This action cannot be undone.`)) return;
        try {
            await jobReferencesApi.remove(job.id);
            toast.success('Job deleted successfully', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
            navigate('/jobs');
        } catch {
            toast.error('Failed to delete job', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
        }
    };

    if (!job) return (
        <div className="space-y-6">
            <div className="h-8 w-48 skeleton rounded-lg" />
            <div className="flex gap-4">
                <div className="h-14 w-14 skeleton rounded-xl" />
                <div className="space-y-2">
                    <div className="h-6 w-64 skeleton rounded" />
                    <div className="h-4 w-40 skeleton rounded" />
                </div>
            </div>
            <div className="h-12 skeleton rounded-xl" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-96 skeleton rounded-2xl" />
                <div className="h-96 skeleton rounded-2xl" />
            </div>
        </div>
    );

    const config = statusConfig[job.status] || statusConfig['Draft'];
    const StatusIcon = config.icon;

    const totalExpenseAmount = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
    const reimbursableAmount = expenses.filter((e: any) => e.isReimbursable).reduce((s: number, e: any) => s + (e.amount || 0), 0);
    const serviceFeeAmount = expenses.filter((e: any) => !e.isReimbursable).reduce((s: number, e: any) => s + (e.amount || 0), 0);

    const tabs = [
        { key: 'overview', label: 'Overview', icon: Eye },
        { key: 'expenses', label: 'Expenses', icon: Banknote, count: expenses.length },
        { key: 'invoices', label: 'Invoices', icon: Receipt, count: invoices.length },
        { key: 'documents', label: 'Documents', icon: FileText, count: 0 },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 text-sm text-slate-500">
                <Link to="/jobs" className="hover:text-emerald-600 flex items-center gap-1.5 transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    <span>Clearance Jobs</span>
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-slate-900 font-semibold">{job.jobRefNo || job.jobNo}</span>
            </div>

            <div className="card-premium p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
                            <Ship className="h-7 w-7" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl font-bold text-slate-900">{job.customerName || job.clientName || 'N/A'}</h1>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text}`}>
                                    <StatusIcon className="h-3 w-3" />
                                    {job.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                <span className="flex items-center gap-1.5 font-mono font-semibold">
                                    <FileText className="h-3.5 w-3.5" />
                                    {job.jobRefNo || job.jobNo}
                                </span>
                                <span className="text-slate-300">|</span>
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {job.arrivalDate || job.eta || 'N/A'}
                                </span>
                                {(job.blNumber || job.blNo) && (
                                    <>
                                        <span className="text-slate-300">|</span>
                                        <span className="font-mono text-xs">BL: {job.blNumber || job.blNo}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => navigate(`/job-reference/edit/${job.id}`)} className="btn-ghost"><Edit2 className="h-4 w-4" /> Edit</button>
                        <button onClick={handleDelete} className="btn-ghost text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /> Delete</button>
                        <button className="btn-secondary"><Download className="h-4 w-4" /> Export</button>
                        <Link to={`/invoices/new?jobId=${job.id}`} className="btn-primary">
                            <Receipt className="h-4 w-4" /> Generate Invoice
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
                    <div className="text-center">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Reimbursables</p>
                        <p className="text-lg font-bold text-slate-900">SAR {(job.totalReimbursable || 0).toLocaleString()}</p>
                    </div>
                    <div className="text-center border-l border-slate-100">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Service Fees</p>
                        <p className="text-lg font-bold text-emerald-600">SAR {(job.totalServiceFees || 0).toLocaleString()}</p>
                    </div>
                    <div className="text-center border-l border-slate-100">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Cost</p>
                        <p className="text-lg font-bold text-blue-600">SAR {(job.totalCost || 0).toLocaleString()}</p>
                    </div>
                    <div className="text-center border-l border-slate-100">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Net Profit</p>
                        <p className="text-lg font-bold text-emerald-600">SAR {(job.netProfit || 0).toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-1.5 flex gap-1">
                {tabs.map((tab) => {
                    const TabIcon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.key
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            <TabIcon className="h-4 w-4" />
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-white/20' : 'bg-slate-100'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div>
                {activeTab === 'overview' && <OverviewTab job={job} />}

                {activeTab === 'expenses' && (
                    <div className="card-premium overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Expense Ledger</h3>
                                <p className="text-sm text-slate-500 mt-0.5">Track all costs and payments associated with this job.</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="btn-secondary"><Download className="h-4 w-4" /> Export</button>
                                <Link to={`/expense-entry/new?jobRefId=${job.id}`} className="btn-primary"><Plus className="h-4 w-4" /> Add Expense</Link>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 p-6 bg-slate-50/50">
                            <div className="bg-white p-4 rounded-xl border border-slate-100">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Expenses</p>
                                <p className="text-xl font-bold text-slate-900">SAR {totalExpenseAmount.toLocaleString()}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-100">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Reimbursable</p>
                                <p className="text-xl font-bold text-blue-600">SAR {reimbursableAmount.toLocaleString()}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-100">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Service Fees</p>
                                <p className="text-xl font-bold text-emerald-600">SAR {serviceFeeAmount.toLocaleString()}</p>
                            </div>
                        </div>

                        {loadingExpenses ? (
                            <div className="p-8 text-center text-slate-500">Loading expenses...</div>
                        ) : expenses.length === 0 ? (
                            <div className="p-8 text-center">
                                <Banknote className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-sm font-semibold text-slate-900 mb-1">No expenses found</p>
                                <p className="text-xs text-slate-500">Add expenses to track costs for this job.</p>
                            </div>
                        ) : (
                            <table className="table-premium">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Category</th>
                                        <th>Description</th>
                                        <th>Paid By</th>
                                        <th className="text-center">Type</th>
                                        <th className="text-right">Amount</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expenses.map((expense: any) => (
                                        <tr key={expense.id}>
                                            <td><span className="text-sm text-slate-600 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400" />{expense.date || expense.entryDate || 'N/A'}</span></td>
                                            <td><span className="font-semibold text-slate-900 text-sm">{expense.category || expense.expenseType || 'N/A'}</span></td>
                                            <td><span className="text-sm text-slate-500">{expense.description || expense.remarks || 'N/A'}</span></td>
                                            <td>
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${expense.paidBy === 'Company' ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-700'}`}>
                                                    {expense.paidBy || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className={expense.isReimbursable ? 'badge-info' : 'badge-success'}>
                                                    {expense.isReimbursable ? 'Reimbursable' : 'Service Fee'}
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <span className="font-bold text-slate-900">SAR {(expense.amount || 0).toLocaleString()}</span>
                                            </td>
                                            <td className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 className="h-3.5 w-3.5" /></button>
                                                    <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 className="h-3.5 w-3.5" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-50">
                                        <td colSpan={5} className="text-right font-bold text-slate-900 py-4 px-6">Total Expenses</td>
                                        <td className="text-right font-bold text-slate-900 py-4 px-6">SAR {totalExpenseAmount.toLocaleString()}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        )}
                    </div>
                )}

                {activeTab === 'invoices' && (
                    <div className="card-premium overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Invoices</h3>
                                <p className="text-sm text-slate-500 mt-0.5">History of invoices generated for this job.</p>
                            </div>
                            <Link to={`/invoices/new?jobId=${job.id}`} className="btn-primary">
                                <Plus className="h-4 w-4" /> New Invoice
                            </Link>
                        </div>
                        {loadingInvoices ? (
                            <div className="p-8 text-center text-slate-500">Loading invoices...</div>
                        ) : invoices.length === 0 ? (
                            <div className="p-8 text-center">
                                <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-sm font-semibold text-slate-900 mb-1">No invoices found</p>
                                <p className="text-xs text-slate-500">Generate an invoice for this job to get started.</p>
                            </div>
                        ) : (
                            <table className="table-premium">
                                <thead>
                                    <tr>
                                        <th>Invoice #</th>
                                        <th>Date</th>
                                        <th className="text-center">Status</th>
                                        <th className="text-right">Amount</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((inv: any) => (
                                        <tr key={inv.id}>
                                            <td><span className="font-bold text-slate-900 font-mono">{inv.invoiceNo || inv.id}</span></td>
                                            <td><span className="text-sm text-slate-600 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400" />{inv.date || inv.invoiceDate || 'N/A'}</span></td>
                                            <td className="text-center">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-blue-50 border-blue-200 text-blue-700">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                                    {inv.status || 'Draft'}
                                                </span>
                                            </td>
                                            <td className="text-right"><span className="font-bold text-slate-900">SAR {(inv.totalAmount || inv.total || 0).toLocaleString()}</span></td>
                                            <td className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Link to={`/sales-invoice/${inv.id}/preview`} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"><Eye className="h-4 w-4" /></Link>
                                                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Download className="h-4 w-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="card-premium overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Documents</h3>
                                <p className="text-sm text-slate-500 mt-0.5">Manage job-related documents and attachments.</p>
                            </div>
                            <button className="btn-primary"><Upload className="h-4 w-4" /> Upload Document</button>
                        </div>
                        <div className="p-8 text-center">
                            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                            <p className="text-sm font-semibold text-slate-900 mb-1">No documents uploaded</p>
                            <p className="text-xs text-slate-500">Upload documents related to this job.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JobDetails;
