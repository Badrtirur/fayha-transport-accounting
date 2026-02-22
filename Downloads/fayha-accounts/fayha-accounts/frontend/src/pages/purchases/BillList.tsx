import React, { useEffect, useState, useMemo, useCallback } from 'react';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import { billsApi, vendorsApi, paymentsApi } from '../../services/api';
import { VendorBill } from '../../types';
import toast from 'react-hot-toast';
import { FileText, Calendar, CreditCard, Eye, AlertCircle, CheckCircle, Clock, Trash2, Edit3, Plus, Minus } from 'lucide-react';

const statusConfig: Record<string, { bg: string; text: string; dot: string; icon: any }> = {
    'Open': { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', icon: Clock },
    'UNPAID': { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', icon: Clock },
    'Paid': { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: CheckCircle },
    'PAID': { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: CheckCircle },
    'PARTIAL': { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500', icon: Clock },
    'DRAFT': { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400', icon: Clock },
    'Overdue': { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500', icon: AlertCircle },
    'OVERDUE': { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500', icon: AlertCircle },
};

interface BillLineItem {
    description: string;
    quantity: number;
    unitPrice: number;
    vatPercent: number;
}

const emptyLineItem = (): BillLineItem => ({
    description: '',
    quantity: 1,
    unitPrice: 0,
    vatPercent: 15,
});

interface BillFormState {
    vendorId: string;
    billNumber: string;
    date: string;
    dueDate: string;
    description: string;
    items: BillLineItem[];
}

const emptyBillForm = (): BillFormState => ({
    vendorId: '',
    billNumber: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    description: '',
    items: [emptyLineItem()],
});

interface PayFormState {
    amount: number;
    date: string;
    method: string;
    reference: string;
    notes: string;
}

const emptyPayForm = (): PayFormState => ({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    method: 'Bank Transfer',
    reference: '',
    notes: '',
});

const BillList: React.FC = () => {
    const [bills, setBills] = useState<VendorBill[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const itemsPerPage = 10;

    // Modal states
    const [billModalOpen, setBillModalOpen] = useState(false);
    const [payModalOpen, setPayModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingBillId, setEditingBillId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form states
    const [billForm, setBillForm] = useState<BillFormState>(emptyBillForm());
    const [payForm, setPayForm] = useState<PayFormState>(emptyPayForm());
    const [payBill, setPayBill] = useState<VendorBill | null>(null);
    const [viewBill, setViewBill] = useState<VendorBill | null>(null);

    // Vendor lookup map
    const vendorMap = useMemo(() => {
        const map: Record<string, string> = {};
        vendors.forEach((v) => {
            map[v.id || v._id] = v.name || v.companyName || '-';
        });
        return map;
    }, [vendors]);

    const fetchBills = useCallback(async () => {
        setLoading(true);
        try {
            const data = await billsApi.getAll();
            setBills(Array.isArray(data) ? data : []);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to load bills');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchVendors = useCallback(async () => {
        try {
            const data = await vendorsApi.getAll();
            setVendors(Array.isArray(data) ? data : []);
        } catch (err: any) {
            console.error('Failed to load vendors:', err);
        }
    }, []);

    useEffect(() => {
        fetchBills();
        fetchVendors();
    }, [fetchBills, fetchVendors]);

    // Bill form line-item calculations
    const lineItemTotals = useMemo(() => {
        return billForm.items.map((item) => {
            const subtotal = item.quantity * item.unitPrice;
            const vat = subtotal * (item.vatPercent / 100);
            return { subtotal, vat, total: subtotal + vat };
        });
    }, [billForm.items]);

    const formTotals = useMemo(() => {
        const subtotal = lineItemTotals.reduce((s, t) => s + t.subtotal, 0);
        const vat = lineItemTotals.reduce((s, t) => s + t.vat, 0);
        const grandTotal = lineItemTotals.reduce((s, t) => s + t.total, 0);
        return { subtotal, vat, grandTotal };
    }, [lineItemTotals]);

    // Pagination
    const paginatedBills = bills.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPayable = bills.reduce((s, b) => s + (b.totalAmount || 0), 0);
    const paidTotal = bills.filter(b => b.status?.toUpperCase() === 'PAID').reduce((s, b) => s + (b.totalAmount || 0), 0);
    const overdueTotal = bills.filter(b => b.status?.toUpperCase() === 'OVERDUE').reduce((s, b) => s + (b.totalAmount || 0), 0);
    const openTotal = bills.filter(b => b.status?.toUpperCase() === 'UNPAID' || b.status === 'Open').reduce((s, b) => s + (b.totalAmount || 0), 0);

    const formatDate = (d: any): string => {
        if (!d) return '-';
        try {
            const date = new Date(d);
            if (isNaN(date.getTime())) return String(d);
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch { return String(d); }
    };

    // --- Vendor name resolver ---
    const getVendorName = (vendorId: string) => {
        return vendorMap[vendorId] || '-';
    };

    // --- Handlers ---

    const handleOpenNewBill = () => {
        setEditMode(false);
        setEditingBillId(null);
        setBillForm(emptyBillForm());
        setBillModalOpen(true);
    };

    const handleOpenEditBill = (bill: VendorBill) => {
        setEditMode(true);
        setEditingBillId(bill.id);
        setBillForm({
            vendorId: bill.vendorId,
            billNumber: bill.billNumber || bill.billNo,
            date: bill.billDate || bill.date,
            dueDate: bill.dueDate,
            description: (bill as any).description || '',
            items: bill.items && bill.items.length > 0
                ? bill.items.map((item) => ({
                    description: item.description,
                    quantity: (item as any).quantity || 1,
                    unitPrice: (item as any).unitPrice || item.amount,
                    vatPercent: (item as any).vatPercent || 15,
                }))
                : [emptyLineItem()],
        });
        setBillModalOpen(true);
    };

    const handleBillFormChange = (field: keyof BillFormState, value: any) => {
        setBillForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleLineItemChange = (index: number, field: keyof BillLineItem, value: any) => {
        setBillForm((prev) => {
            const items = [...prev.items];
            items[index] = { ...items[index], [field]: field === 'description' ? value : Number(value) || 0 };
            return { ...prev, items };
        });
    };

    const handleAddLineItem = () => {
        setBillForm((prev) => ({ ...prev, items: [...prev.items, emptyLineItem()] }));
    };

    const handleRemoveLineItem = (index: number) => {
        if (billForm.items.length <= 1) return;
        setBillForm((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    };

    const handleSubmitBill = async () => {
        if (!billForm.vendorId) {
            toast.error('Please select a vendor');
            return;
        }
        if (!billForm.billNumber) {
            toast.error('Please enter a bill number');
            return;
        }
        if (!billForm.date) {
            toast.error('Please enter a date');
            return;
        }
        if (!billForm.dueDate) {
            toast.error('Please enter a due date');
            return;
        }
        if (billForm.items.some((item) => !item.description || item.unitPrice <= 0)) {
            toast.error('All line items must have a description and a unit price greater than 0');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                vendorId: billForm.vendorId,
                billNo: billForm.billNumber,
                date: billForm.date,
                dueDate: billForm.dueDate,
                description: billForm.description,
                status: 'Open',
                items: billForm.items.map((item) => ({
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    vatPercent: item.vatPercent,
                    amount: item.quantity * item.unitPrice,
                })),
                totalAmount: formTotals.grandTotal,
                subtotal: formTotals.subtotal,
                vatAmount: formTotals.vat,
            };

            if (editMode && editingBillId) {
                await billsApi.update(editingBillId, payload);
                toast.success('Bill updated successfully');
            } else {
                await billsApi.create(payload);
                toast.success('Bill created successfully');
            }
            setBillModalOpen(false);
            setBillForm(emptyBillForm());
            await fetchBills();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save bill');
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenPay = (bill: VendorBill) => {
        setPayBill(bill);
        setPayForm({
            ...emptyPayForm(),
            amount: bill.totalAmount || 0,
        });
        setPayModalOpen(true);
    };

    const handleSubmitPayment = async () => {
        if (!payBill) return;
        if (payForm.amount <= 0) {
            toast.error('Amount must be greater than 0');
            return;
        }
        if (!payForm.date) {
            toast.error('Please enter a payment date');
            return;
        }

        setSubmitting(true);
        try {
            await paymentsApi.disburse({
                billId: payBill.id,
                vendorId: payBill.vendorId,
                amount: payForm.amount,
                date: payForm.date,
                method: payForm.method,
                reference: payForm.reference,
                notes: payForm.notes,
            });
            toast.success('Payment disbursed successfully');
            setPayModalOpen(false);
            setPayBill(null);
            setPayForm(emptyPayForm());
            await fetchBills();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to disburse payment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (bill: VendorBill) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete bill ${bill.billNumber || bill.billNo}? This action cannot be undone.`
        );
        if (!confirmed) return;

        try {
            await billsApi.remove(bill.id);
            toast.success('Bill deleted successfully');
            await fetchBills();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to delete bill');
        }
    };

    const handleViewBill = (bill: VendorBill) => {
        setViewBill(bill);
        setViewModalOpen(true);
    };

    const handleExport = () => {
        if (bills.length === 0) {
            toast.error('No bills to export');
            return;
        }

        const headers = ['Bill #', 'Vendor', 'Date', 'Due Date', 'Amount', 'Status'];
        const rows = bills.map((bill) => [
            bill.billNumber || bill.billNo,
            getVendorName(bill.vendorId),
            formatDate(bill.billDate || bill.date),
            formatDate(bill.dueDate),
            bill.totalAmount.toString(),
            bill.status,
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map((row) =>
                row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
            ),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vendor-bills-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Bills exported to CSV');
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Vendor Bills"
                subtitle="Manage payable bills from suppliers and customs."
                onAdd={handleOpenNewBill}
                onExport={handleExport}
                onImport={() => toast.success('Import functionality coming soon')}
                addLabel="New Bill"
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600"><FileText className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">SAR {(totalPayable / 1000).toFixed(0)}K</p><p className="text-xs text-slate-500">Total Bills</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600"><Clock className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">SAR {(openTotal / 1000).toFixed(0)}K</p><p className="text-xs text-slate-500">Open</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><CheckCircle className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">SAR {(paidTotal / 1000).toFixed(0)}K</p><p className="text-xs text-slate-500">Paid</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600"><AlertCircle className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">SAR {(overdueTotal / 1000).toFixed(0)}K</p><p className="text-xs text-slate-500">Overdue</p></div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="text-slate-400 text-sm">Loading bills...</div>
                    </div>
                ) : (
                    <table className="table-premium">
                        <thead>
                            <tr>
                                <th>Bill #</th>
                                <th>Vendor</th>
                                <th>Date</th>
                                <th>Due Date</th>
                                <th className="text-right">Amount</th>
                                <th className="text-center">Status</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedBills.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-slate-400">
                                        No bills found. Click "New Bill" to create one.
                                    </td>
                                </tr>
                            ) : (
                                paginatedBills.map((bill) => {
                                    const config = statusConfig[bill.status] || statusConfig['Open'];
                                    const StatusIcon = config.icon;
                                    return (
                                        <tr key={bill.id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500">
                                                        <FileText className="h-4 w-4" />
                                                    </div>
                                                    <span className="font-bold text-slate-900 font-mono">{bill.billNumber || bill.billNo}</span>
                                                </div>
                                            </td>
                                            <td><span className="text-sm font-medium text-slate-900">{getVendorName(bill.vendorId)}</span></td>
                                            <td><span className="text-sm text-slate-600">{formatDate(bill.billDate || bill.date)}</span></td>
                                            <td>
                                                <span className="text-sm text-slate-600 flex items-center gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                    {formatDate(bill.dueDate)}
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <span className="font-bold text-slate-900">SAR {(bill.totalAmount || 0).toLocaleString()}</span>
                                            </td>
                                            <td className="text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text}`}>
                                                    <StatusIcon className="h-3 w-3" />
                                                    {bill.status}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => handleViewBill(bill)}
                                                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                        title="View"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenEditBill(bill)}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                        title="Edit"
                                                    >
                                                        <Edit3 className="h-4 w-4" />
                                                    </button>
                                                    {bill.status?.toUpperCase() !== 'PAID' && (
                                                        <button
                                                            onClick={() => handleOpenPay(bill)}
                                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                            title="Pay"
                                                        >
                                                            <CreditCard className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(bill)}
                                                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                        title="Delete"
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
                )}
                <Pagination currentPage={currentPage} totalPages={Math.ceil(bills.length / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={bills.length} />
            </div>

            {/* ==================== New / Edit Bill Modal ==================== */}
            <Modal isOpen={billModalOpen} onClose={() => setBillModalOpen(false)} title={editMode ? 'Edit Bill' : 'New Vendor Bill'} size="xl">
                <div className="space-y-5">
                    {/* Top fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Vendor <span className="text-rose-500">*</span></label>
                            <select
                                value={billForm.vendorId}
                                onChange={(e) => handleBillFormChange('vendorId', e.target.value)}
                                className="input-premium w-full"
                            >
                                <option value="">Select vendor...</option>
                                {vendors.map((v) => (
                                    <option key={v.id || v._id} value={v.id || v._id}>
                                        {v.name || v.companyName || `Vendor ${v.id || v._id}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Bill Number <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                value={billForm.billNumber}
                                onChange={(e) => handleBillFormChange('billNumber', e.target.value)}
                                className="input-premium w-full"
                                placeholder="e.g. BILL-001"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date <span className="text-rose-500">*</span></label>
                            <input
                                type="date"
                                value={billForm.date}
                                onChange={(e) => handleBillFormChange('date', e.target.value)}
                                className="input-premium w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Due Date <span className="text-rose-500">*</span></label>
                            <input
                                type="date"
                                value={billForm.dueDate}
                                onChange={(e) => handleBillFormChange('dueDate', e.target.value)}
                                className="input-premium w-full"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                        <input
                            type="text"
                            value={billForm.description}
                            onChange={(e) => handleBillFormChange('description', e.target.value)}
                            className="input-premium w-full"
                            placeholder="Bill description..."
                        />
                    </div>

                    {/* Line Items */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-semibold text-slate-700">Line Items</label>
                            <button
                                type="button"
                                onClick={handleAddLineItem}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add Row
                            </button>
                        </div>
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Description</th>
                                        <th className="text-right px-3 py-2 font-semibold text-slate-600 w-20">Qty</th>
                                        <th className="text-right px-3 py-2 font-semibold text-slate-600 w-28">Unit Price</th>
                                        <th className="text-right px-3 py-2 font-semibold text-slate-600 w-20">VAT %</th>
                                        <th className="text-right px-3 py-2 font-semibold text-slate-600 w-28">Total</th>
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {billForm.items.map((item, idx) => (
                                        <tr key={idx} className="border-b border-slate-100 last:border-0">
                                            <td className="px-2 py-1.5">
                                                <input
                                                    type="text"
                                                    value={item.description}
                                                    onChange={(e) => handleLineItemChange(idx, 'description', e.target.value)}
                                                    className="input-premium w-full text-sm"
                                                    placeholder="Item description"
                                                />
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => handleLineItemChange(idx, 'quantity', e.target.value)}
                                                    className="input-premium w-full text-sm text-right"
                                                    min="1"
                                                />
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <input
                                                    type="number"
                                                    value={item.unitPrice}
                                                    onChange={(e) => handleLineItemChange(idx, 'unitPrice', e.target.value)}
                                                    className="input-premium w-full text-sm text-right"
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <input
                                                    type="number"
                                                    value={item.vatPercent}
                                                    onChange={(e) => handleLineItemChange(idx, 'vatPercent', e.target.value)}
                                                    className="input-premium w-full text-sm text-right"
                                                    min="0"
                                                    max="100"
                                                />
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-semibold text-slate-700">
                                                {(lineItemTotals[idx]?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveLineItem(idx)}
                                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all disabled:opacity-30"
                                                    disabled={billForm.items.length <= 1}
                                                >
                                                    <Minus className="h-3.5 w-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-64 space-y-2 text-sm">
                            <div className="flex justify-between text-slate-600">
                                <span>Subtotal:</span>
                                <span className="font-semibold">SAR {formTotals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>VAT:</span>
                                <span className="font-semibold">SAR {formTotals.vat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-slate-900 font-bold text-base border-t border-slate-200 pt-2">
                                <span>Grand Total:</span>
                                <span>SAR {formTotals.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={() => setBillModalOpen(false)}
                            className="btn-secondary"
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmitBill}
                            className="btn-primary"
                            disabled={submitting}
                        >
                            {submitting ? 'Saving...' : editMode ? 'Update Bill' : 'Create Bill'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ==================== Pay Bill Modal ==================== */}
            <Modal isOpen={payModalOpen} onClose={() => setPayModalOpen(false)} title="Disburse Payment" size="md">
                {payBill && (
                    <div className="space-y-5">
                        {/* Bill reference info */}
                        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Bill:</span>
                                <span className="font-semibold text-slate-900 font-mono">{payBill.billNumber || payBill.billNo}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Vendor:</span>
                                <span className="font-semibold text-slate-900">{getVendorName(payBill.vendorId)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Bill Amount:</span>
                                <span className="font-bold text-slate-900">SAR {(payBill.totalAmount || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Payment fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Amount <span className="text-rose-500">*</span></label>
                                <input
                                    type="number"
                                    value={payForm.amount}
                                    onChange={(e) => setPayForm((prev) => ({ ...prev, amount: Number(e.target.value) || 0 }))}
                                    className="input-premium w-full"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date <span className="text-rose-500">*</span></label>
                                <input
                                    type="date"
                                    value={payForm.date}
                                    onChange={(e) => setPayForm((prev) => ({ ...prev, date: e.target.value }))}
                                    className="input-premium w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Method</label>
                                <select
                                    value={payForm.method}
                                    onChange={(e) => setPayForm((prev) => ({ ...prev, method: e.target.value }))}
                                    className="input-premium w-full"
                                >
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Check">Check</option>
                                    <option value="Cash">Cash</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reference</label>
                                <input
                                    type="text"
                                    value={payForm.reference}
                                    onChange={(e) => setPayForm((prev) => ({ ...prev, reference: e.target.value }))}
                                    className="input-premium w-full"
                                    placeholder="e.g. Transfer #123"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
                            <textarea
                                value={payForm.notes}
                                onChange={(e) => setPayForm((prev) => ({ ...prev, notes: e.target.value }))}
                                className="input-premium w-full"
                                rows={3}
                                placeholder="Additional notes..."
                            />
                        </div>

                        {/* Submit */}
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setPayModalOpen(false)}
                                className="btn-secondary"
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitPayment}
                                className="btn-primary"
                                disabled={submitting}
                            >
                                {submitting ? 'Processing...' : 'Disburse Payment'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ==================== View Bill Modal ==================== */}
            <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Bill Details" size="lg">
                {viewBill && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-slate-500 mb-0.5">Bill Number</p>
                                <p className="text-sm font-bold text-slate-900 font-mono">{viewBill.billNumber || viewBill.billNo}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-0.5">Vendor</p>
                                <p className="text-sm font-bold text-slate-900">{getVendorName(viewBill.vendorId)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-0.5">Date</p>
                                <p className="text-sm text-slate-700">{formatDate(viewBill.billDate || viewBill.date)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-0.5">Due Date</p>
                                <p className="text-sm text-slate-700">{formatDate(viewBill.dueDate)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-0.5">Status</p>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${(statusConfig[viewBill.status] || statusConfig['Open']).bg} ${(statusConfig[viewBill.status] || statusConfig['Open']).text}`}>
                                    {viewBill.status}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-0.5">Total Amount</p>
                                <p className="text-sm font-bold text-slate-900">SAR {(viewBill.totalAmount || 0).toLocaleString()}</p>
                            </div>
                        </div>

                        {viewBill.items && viewBill.items.length > 0 && (
                            <div>
                                <p className="text-sm font-semibold text-slate-700 mb-2">Line Items</p>
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200">
                                                <th className="text-left px-3 py-2 font-semibold text-slate-600">Description</th>
                                                <th className="text-right px-3 py-2 font-semibold text-slate-600">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {viewBill.items.map((item, idx) => (
                                                <tr key={idx} className="border-b border-slate-100 last:border-0">
                                                    <td className="px-3 py-2 text-slate-700">{item.description}</td>
                                                    <td className="px-3 py-2 text-right font-semibold text-slate-900">SAR {(item.amount || 0).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <button onClick={() => setViewModalOpen(false)} className="btn-secondary">
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default BillList;
