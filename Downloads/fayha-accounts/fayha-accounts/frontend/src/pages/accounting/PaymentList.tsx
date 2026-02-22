import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import { paymentsApi, customersApi, vendorsApi, invoicesApi, billsApi } from '../../services/api';
import { Payment } from '../../types';
import toast from 'react-hot-toast';
import {
    Banknote, CreditCard, CheckCircle, Eye, TrendingUp, Clock, Wallet,
    Trash2, X, Loader2, Plus,
} from 'lucide-react';

const methodConfig: Record<string, { bg: string; text: string }> = {
    'Bank Transfer': { bg: 'bg-blue-50', text: 'text-blue-700' },
    'Check': { bg: 'bg-amber-50', text: 'text-amber-700' },
    'Cash': { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    'Credit Card': { bg: 'bg-purple-50', text: 'text-purple-700' },
};

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    'Draft': { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400' },
    'Posted': { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    'Void': { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' },
};

const PAYMENT_METHODS = ['Bank Transfer', 'Check', 'Cash', 'Credit Card'];

const emptyReceiveForm = {
    customerId: '',
    invoiceId: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    method: 'Bank Transfer',
    reference: '',
    notes: '',
};

const emptyDisburseForm = {
    vendorId: '',
    billId: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    method: 'Bank Transfer',
    reference: '',
    notes: '',
};

const formatDate = (d: any): string => {
    if (!d) return '-';
    try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return String(d);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return String(d); }
};

const PaymentList: React.FC = () => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // View modal
    const [viewPayment, setViewPayment] = useState<Payment | null>(null);

    // Delete confirmation
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Create Payment modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'receive' | 'disburse'>('receive');
    const [submitting, setSubmitting] = useState(false);

    // Receive form state
    const [receiveForm, setReceiveForm] = useState(emptyReceiveForm);

    // Disburse form state
    const [disburseForm, setDisburseForm] = useState(emptyDisburseForm);

    // Lookup data
    const [customers, setCustomers] = useState<any[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [bills, setBills] = useState<any[]>([]);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const data = await paymentsApi.getAll();
            setPayments(Array.isArray(data) ? data : []);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to load payments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, []);

    // Fetch lookup data when create modal opens
    useEffect(() => {
        if (!showCreateModal) return;
        const loadLookups = async () => {
            try {
                const [custData, vendData, invData, billData] = await Promise.all([
                    customersApi.getAll(),
                    vendorsApi.getAll(),
                    invoicesApi.getAll(),
                    billsApi.getAll(),
                ]);
                setCustomers(Array.isArray(custData) ? custData : []);
                setVendors(Array.isArray(vendData) ? vendData : []);
                setInvoices(Array.isArray(invData) ? invData : []);
                setBills(Array.isArray(billData) ? billData : []);
            } catch {
                // Silently fail - selects will just be empty
            }
        };
        loadLookups();
    }, [showCreateModal]);

    // --- Delete handler ---
    const handleDelete = async (id: string) => {
        try {
            await paymentsApi.remove(id);
            setPayments(prev => prev.filter(p => p.id !== id));
            toast.success('Payment deleted successfully');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to delete payment');
        } finally {
            setDeleteId(null);
        }
    };

    // --- Receive Payment handler ---
    const handleReceive = async () => {
        if (!receiveForm.customerId || !receiveForm.amount || !receiveForm.date) {
            toast.error('Please fill in all required fields');
            return;
        }
        try {
            setSubmitting(true);
            await paymentsApi.receive({
                customerId: receiveForm.customerId,
                invoiceId: receiveForm.invoiceId || undefined,
                amount: parseFloat(receiveForm.amount),
                date: receiveForm.date,
                method: receiveForm.method,
                reference: receiveForm.reference || undefined,
                notes: receiveForm.notes || undefined,
            });
            toast.success('Payment received successfully');
            setShowCreateModal(false);
            setReceiveForm(emptyReceiveForm);
            fetchPayments();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to receive payment');
        } finally {
            setSubmitting(false);
        }
    };

    // --- Disburse Payment handler ---
    const handleDisburse = async () => {
        if (!disburseForm.vendorId || !disburseForm.amount || !disburseForm.date) {
            toast.error('Please fill in all required fields');
            return;
        }
        try {
            setSubmitting(true);
            await paymentsApi.disburse({
                vendorId: disburseForm.vendorId,
                billId: disburseForm.billId || undefined,
                amount: parseFloat(disburseForm.amount),
                date: disburseForm.date,
                method: disburseForm.method,
                reference: disburseForm.reference || undefined,
                notes: disburseForm.notes || undefined,
            });
            toast.success('Payment disbursed successfully');
            setShowCreateModal(false);
            setDisburseForm(emptyDisburseForm);
            fetchPayments();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to disburse payment');
        } finally {
            setSubmitting(false);
        }
    };

    const openCreateModal = () => {
        setReceiveForm(emptyReceiveForm);
        setDisburseForm(emptyDisburseForm);
        setActiveTab('receive');
        setShowCreateModal(true);
    };

    const handleExportPayments = () => {
        if (payments.length === 0) {
            toast.error('No payments to export');
            return;
        }
        const headers = ['Payment #', 'Date', 'Customer', 'Method', 'Amount', 'Status'];
        const rows = payments.map(p => [
            p.paymentNumber || p.paymentNo || (p as any).reference || `PAY-${p.id?.slice(-6)}`,
            formatDate(p.paymentDate || p.date),
            (p as any).customer?.name || (p as any).customerName || '-',
            p.paymentMethod || p.method,
            (p.amount || 0).toString(),
            p.status,
        ]);
        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Payments exported successfully');
    };

    const paginatedPayments = payments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalReceived = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const postedCount = payments.filter(p => p.status === 'Posted').length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mx-auto mb-4" />
                    <p className="text-sm text-slate-500 font-medium">Loading payments...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Received Payments"
                subtitle="Track customer payments and bank receipts."
                onAdd={openCreateModal}
                onExport={handleExportPayments}
                onImport={() => toast.success('Import functionality coming soon')}
                addLabel="New Payment"
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><TrendingUp className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">SAR {(totalReceived / 1000).toFixed(0)}K</p><p className="text-xs text-slate-500">Total Received</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Wallet className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">{payments.length}</p><p className="text-xs text-slate-500">Total Payments</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600"><CheckCircle className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">{postedCount}</p><p className="text-xs text-slate-500">Posted</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600"><Clock className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">{payments.filter(p => p.status === 'Draft').length}</p><p className="text-xs text-slate-500">Pending</p></div>
                </div>
            </div>

            {/* Payments Table */}
            <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
                <table className="table-premium">
                    <thead>
                        <tr>
                            <th>Payment #</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Method</th>
                            <th className="text-right">Amount</th>
                            <th className="text-center">Status</th>
                            <th className="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedPayments.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-16 text-slate-400">
                                    <Banknote className="h-12 w-12 mx-auto mb-3 text-slate-200" />
                                    <p className="font-semibold">No payments found</p>
                                    <p className="text-sm mt-1">Click "Receive Payment" to record a new payment.</p>
                                </td>
                            </tr>
                        ) : (
                            paginatedPayments.map((pay) => {
                                const method = methodConfig[pay.method] || methodConfig['Bank Transfer'];
                                const status = statusConfig[pay.status] || statusConfig['Draft'];
                                return (
                                    <tr key={pay.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                                    <Banknote className="h-4 w-4" />
                                                </div>
                                                <span className="font-bold text-slate-900 font-mono">{pay.paymentNumber || pay.paymentNo || (pay as any).reference || `PAY-${pay.id?.slice(-6)}`}</span>
                                            </div>
                                        </td>
                                        <td><span className="text-sm text-slate-600">{formatDate(pay.paymentDate || pay.date)}</span></td>
                                        <td>
                                            <span className="text-sm font-medium text-slate-900">
                                                {(pay as any).customer?.name || (pay as any).customerName || '-'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold ${method.bg} ${method.text}`}>
                                                <CreditCard className="h-3 w-3" />
                                                {pay.paymentMethod || pay.method}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <span className="font-bold text-slate-900">SAR {(pay.amount || 0).toLocaleString()}</span>
                                        </td>
                                        <td className="text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${status.bg} ${status.text}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                                                {pay.status}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => setViewPayment(pay)}
                                                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                    title="View details"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteId(pay.id)}
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                    title="Delete payment"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
                {payments.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(payments.length / itemsPerPage)}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        totalItems={payments.length}
                    />
                )}
            </div>

            {/* View Payment Modal */}
            {viewPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md mx-4">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">Payment Details</h3>
                            <button onClick={() => setViewPayment(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 mb-1">Payment #</p>
                                    <p className="text-sm font-bold text-slate-900 font-mono">{viewPayment.paymentNumber || viewPayment.paymentNo || (viewPayment as any).reference || `PAY-${viewPayment.id?.slice(-6)}`}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 mb-1">Date</p>
                                    <p className="text-sm text-slate-900">{formatDate(viewPayment.paymentDate || viewPayment.date)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 mb-1">Amount</p>
                                    <p className="text-sm font-bold text-emerald-700">SAR {(viewPayment.amount || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 mb-1">Method</p>
                                    <p className="text-sm text-slate-900">{viewPayment.paymentMethod || viewPayment.method}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 mb-1">Status</p>
                                    <p className="text-sm text-slate-900">{viewPayment.status}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 mb-1">Customer</p>
                                    <p className="text-sm text-slate-900">{(viewPayment as any).customer?.name || (viewPayment as any).customerName || '-'}</p>
                                </div>
                                {(viewPayment as any).invoiceId && (
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 mb-1">Invoice</p>
                                        <p className="text-sm text-slate-900">{(viewPayment as any).invoiceId}</p>
                                    </div>
                                )}
                                {(viewPayment as any).reference && (
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 mb-1">Reference</p>
                                        <p className="text-sm text-slate-900">{(viewPayment as any).reference}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100">
                            <button onClick={() => setViewPayment(null)} className="btn-ghost">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm mx-4 p-6">
                        <div className="text-center">
                            <div className="h-12 w-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="h-6 w-6 text-rose-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Payment?</h3>
                            <p className="text-sm text-slate-500 mb-6">This action cannot be undone. The payment record will be permanently removed.</p>
                            <div className="flex items-center justify-center gap-3">
                                <button onClick={() => setDeleteId(null)} className="btn-ghost">Cancel</button>
                                <button
                                    onClick={() => handleDelete(deleteId)}
                                    className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Payment Modal */}
            <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Payment" size="lg">
                <div className="space-y-5">
                    {/* Tabs */}
                    <div className="flex border-b border-slate-200">
                        <button
                            onClick={() => setActiveTab('receive')}
                            className={`flex-1 py-2.5 text-sm font-semibold text-center border-b-2 transition-colors ${
                                activeTab === 'receive'
                                    ? 'border-emerald-500 text-emerald-700'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            <Plus className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
                            Receive Payment (AR)
                        </button>
                        <button
                            onClick={() => setActiveTab('disburse')}
                            className={`flex-1 py-2.5 text-sm font-semibold text-center border-b-2 transition-colors ${
                                activeTab === 'disburse'
                                    ? 'border-blue-500 text-blue-700'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            <Wallet className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
                            Disburse Payment (AP)
                        </button>
                    </div>

                    {/* Receive Payment Form */}
                    {activeTab === 'receive' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Customer <span className="text-rose-500">*</span></label>
                                    <select
                                        value={receiveForm.customerId}
                                        onChange={e => setReceiveForm(p => ({ ...p, customerId: e.target.value }))}
                                        className="input-premium w-full"
                                    >
                                        <option value="">Select customer...</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name || c.companyName || `Customer #${c.id}`}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Invoice</label>
                                    <select
                                        value={receiveForm.invoiceId}
                                        onChange={e => setReceiveForm(p => ({ ...p, invoiceId: e.target.value }))}
                                        className="input-premium w-full"
                                    >
                                        <option value="">Select invoice (optional)...</option>
                                        {invoices.map(inv => (
                                            <option key={inv.id} value={inv.id}>{inv.invoiceNo || inv.number || `INV-${inv.id?.slice(-6)}`}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Amount (SAR) <span className="text-rose-500">*</span></label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={receiveForm.amount}
                                        onChange={e => setReceiveForm(p => ({ ...p, amount: e.target.value }))}
                                        className="input-premium w-full"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Date <span className="text-rose-500">*</span></label>
                                    <input
                                        type="date"
                                        value={receiveForm.date}
                                        onChange={e => setReceiveForm(p => ({ ...p, date: e.target.value }))}
                                        className="input-premium w-full"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Payment Method <span className="text-rose-500">*</span></label>
                                    <select
                                        value={receiveForm.method}
                                        onChange={e => setReceiveForm(p => ({ ...p, method: e.target.value }))}
                                        className="input-premium w-full"
                                    >
                                        {PAYMENT_METHODS.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Reference</label>
                                    <input
                                        type="text"
                                        value={receiveForm.reference}
                                        onChange={e => setReceiveForm(p => ({ ...p, reference: e.target.value }))}
                                        className="input-premium w-full"
                                        placeholder="e.g. CHK-12345"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Notes</label>
                                <textarea
                                    value={receiveForm.notes}
                                    onChange={e => setReceiveForm(p => ({ ...p, notes: e.target.value }))}
                                    className="input-premium w-full"
                                    rows={3}
                                    placeholder="Additional notes..."
                                />
                            </div>
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button onClick={() => setShowCreateModal(false)} className="btn-ghost">Cancel</button>
                                <button
                                    onClick={handleReceive}
                                    disabled={submitting || !receiveForm.customerId || !receiveForm.amount || !receiveForm.date}
                                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                                    ) : (
                                        <><Plus className="h-4 w-4" /> Receive Payment</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Disburse Payment Form */}
                    {activeTab === 'disburse' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Vendor <span className="text-rose-500">*</span></label>
                                    <select
                                        value={disburseForm.vendorId}
                                        onChange={e => setDisburseForm(p => ({ ...p, vendorId: e.target.value }))}
                                        className="input-premium w-full"
                                    >
                                        <option value="">Select vendor...</option>
                                        {vendors.map(v => (
                                            <option key={v.id} value={v.id}>{v.name || v.companyName || `Vendor #${v.id}`}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Bill</label>
                                    <select
                                        value={disburseForm.billId}
                                        onChange={e => setDisburseForm(p => ({ ...p, billId: e.target.value }))}
                                        className="input-premium w-full"
                                    >
                                        <option value="">Select bill (optional)...</option>
                                        {bills.map(b => (
                                            <option key={b.id} value={b.id}>{b.billNo || b.number || `BILL-${b.id?.slice(-6)}`}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Amount (SAR) <span className="text-rose-500">*</span></label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={disburseForm.amount}
                                        onChange={e => setDisburseForm(p => ({ ...p, amount: e.target.value }))}
                                        className="input-premium w-full"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Date <span className="text-rose-500">*</span></label>
                                    <input
                                        type="date"
                                        value={disburseForm.date}
                                        onChange={e => setDisburseForm(p => ({ ...p, date: e.target.value }))}
                                        className="input-premium w-full"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Payment Method <span className="text-rose-500">*</span></label>
                                    <select
                                        value={disburseForm.method}
                                        onChange={e => setDisburseForm(p => ({ ...p, method: e.target.value }))}
                                        className="input-premium w-full"
                                    >
                                        {PAYMENT_METHODS.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Reference</label>
                                    <input
                                        type="text"
                                        value={disburseForm.reference}
                                        onChange={e => setDisburseForm(p => ({ ...p, reference: e.target.value }))}
                                        className="input-premium w-full"
                                        placeholder="e.g. CHK-12345"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Notes</label>
                                <textarea
                                    value={disburseForm.notes}
                                    onChange={e => setDisburseForm(p => ({ ...p, notes: e.target.value }))}
                                    className="input-premium w-full"
                                    rows={3}
                                    placeholder="Additional notes..."
                                />
                            </div>
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button onClick={() => setShowCreateModal(false)} className="btn-ghost">Cancel</button>
                                <button
                                    onClick={handleDisburse}
                                    disabled={submitting || !disburseForm.vendorId || !disburseForm.amount || !disburseForm.date}
                                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                                    ) : (
                                        <><Banknote className="h-4 w-4" /> Disburse Payment</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default PaymentList;
