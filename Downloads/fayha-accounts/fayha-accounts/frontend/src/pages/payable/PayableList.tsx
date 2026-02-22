import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Search,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Edit2,
  Trash2,
  X,
  DollarSign,
} from 'lucide-react';
import { payableExpensesApi, vendorsApi } from '../../services/api';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';

const PayableList: React.FC = () => {
  const [payables, setPayables] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const itemsPerPage = 8;

  // Form state
  const [formVendorId, setFormVendorId] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formVatRequired, setFormVatRequired] = useState(true);
  const [formVatPercent, setFormVatPercent] = useState<number>(15);
  const [formVatAmount, setFormVatAmount] = useState<number>(0);
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState('Pending');
  const [formPaymentMethod, setFormPaymentMethod] = useState('Cash');

  useEffect(() => {
    Promise.all([payableExpensesApi.getAll(), vendorsApi.getAll()])
      .then(([peData, vData]: any) => {
        setPayables(Array.isArray(peData) ? peData : []);
        setVendors(Array.isArray(vData) ? vData : []);
        setLoading(false);
      })
      .catch(() => {
        setPayables([]);
        setVendors([]);
        setLoading(false);
      });
  }, []);

  const getVendorName = (vendorId: string): string => {
    const v = vendors.find((v: any) => v.id === vendorId);
    return v ? v.name : vendorId || '-';
  };

  const recalcVat = (amt: number, pct: number, required: boolean) => {
    setFormVatAmount(required ? Math.round(amt * (pct / 100) * 100) / 100 : 0);
  };

  const resetForm = () => {
    setFormVendorId('');
    setFormDate('');
    setFormDueDate('');
    setFormAmount(0);
    setFormVatRequired(true);
    setFormVatPercent(15);
    setFormVatAmount(0);
    setFormCategory('');
    setFormDescription('');
    setFormStatus('Pending');
    setFormPaymentMethod('Cash');
    setEditingId(null);
  };

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setFormVendorId(p.vendorId || '');
    setFormDate(p.date ? new Date(p.date).toISOString().split('T')[0] : '');
    setFormDueDate(p.dueDate ? new Date(p.dueDate).toISOString().split('T')[0] : '');
    setFormAmount(p.amount || 0);
    const pVat = p.vatAmount || 0;
    setFormVatAmount(pVat);
    if (pVat > 0 && p.amount > 0) {
      setFormVatRequired(true);
      setFormVatPercent(Math.round((pVat / p.amount) * 100 * 100) / 100);
    } else {
      setFormVatRequired(pVat > 0);
      setFormVatPercent(15);
    }
    setFormCategory(p.category || '');
    setFormDescription(p.description || '');
    setFormPaymentMethod(p.paymentMethod || 'Cash');
    setShowModal(true);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await payableExpensesApi.update(id, { status: newStatus });
      setPayables(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
      toast.success(`Status updated to ${newStatus}`, { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    } catch {
      toast.error('Failed to update status', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this payable?')) return;
    try {
      await payableExpensesApi.remove(id);
      setPayables((prev) => prev.filter((p) => p.id !== id));
      toast.success('Payable deleted successfully!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    } catch {
      toast.error('Failed to delete payable.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    }
  };

  const handleSave = async () => {
    if (!formVendorId) {
      toast.error('Please select a vendor.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }
    if (!formDate) {
      toast.error('Please select a date.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }
    if (!formAmount || formAmount <= 0) {
      toast.error('Amount must be greater than 0.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }

    setSaving(true);
    const totalAmount = formAmount + formVatAmount;
    const payload = {
      vendorId: formVendorId,
      date: formDate,
      dueDate: formDueDate || undefined,
      amount: formAmount,
      vatAmount: formVatAmount,
      totalAmount,
      balanceDue: totalAmount,
      category: formCategory,
      description: formDescription,
      status: editingId ? undefined : formStatus,
      paymentMethod: formPaymentMethod,
    };

    try {
      if (editingId) {
        const updated = await payableExpensesApi.update(editingId, payload);
        setPayables((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
        toast.success('Payable updated successfully!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      } else {
        const created = await payableExpensesApi.create(payload);
        setPayables((prev) => [...prev, created]);
        toast.success('Payable created successfully!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      }
      setShowModal(false);
      resetForm();
    } catch {
      toast.error('Failed to save payable.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    } finally {
      setSaving(false);
    }
  };

  const filtered = payables.filter((p: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      getVendorName(p.vendorId).toLowerCase().includes(q) ||
      (p.expenseNumber || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  });

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalPayables = payables.reduce((s: number, p: any) => s + (p.totalAmount || p.amount || 0), 0);
  const overduePayables = payables.filter((p: any) => p.status?.toUpperCase() !== 'PAID' && p.dueDate && new Date(p.dueDate) < new Date());
  const overdueAmount = overduePayables.reduce((s: number, p: any) => s + (p.totalAmount || p.amount || 0), 0);
  const paidAmount = payables.filter((p: any) => p.status?.toUpperCase() === 'PAID').reduce((s: number, p: any) => s + (p.totalAmount || p.amount || 0), 0);
  const outstandingAmount = payables.filter((p: any) => p.status?.toUpperCase() !== 'PAID').reduce((s: number, p: any) => s + (p.totalAmount || p.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Vendor Payables</h1>
          <p className="text-slate-500 mt-1 text-sm">Track vendor bills, payment schedules, and outstanding balances.</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary">
          <Plus className="h-4 w-4" />
          Add Payable
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><Wallet className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Total Payables</p>
              <p className="text-lg font-bold">SAR {totalPayables.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><AlertTriangle className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Overdue</p>
              <p className="text-lg font-bold">SAR {overdueAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-lg shadow-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><CheckCircle2 className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Paid</p>
              <p className="text-lg font-bold">SAR {paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><Clock className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Outstanding</p>
              <p className="text-lg font-bold">SAR {outstandingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl shadow-card border border-slate-100/80">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} placeholder="Search by vendor, expense #, or description..." className="input-premium pl-10" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">{[1, 2, 3, 4, 5].map((i) => (<div key={i} className="flex items-center gap-4"><div className="h-4 w-6 skeleton rounded" /><div className="flex-1 h-4 skeleton rounded" /><div className="h-4 w-28 skeleton rounded" /><div className="h-6 w-20 skeleton rounded-full" /></div>))}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-premium">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Expense #</th>
                    <th>Vendor</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th>Due Date</th>
                    <th className="text-right">Amount</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p: any, index: number) => (
                    <tr key={p.id}>
                      <td className="text-sm text-slate-500 font-medium">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td><span className="text-sm font-mono text-indigo-600">{p.expenseNumber || '-'}</span></td>
                      <td><span className="text-sm font-semibold text-slate-900">{getVendorName(p.vendorId)}</span></td>
                      <td><span className="text-sm text-slate-600">{p.category || '-'}</span></td>
                      <td><span className="text-sm text-slate-600">{p.date ? new Date(p.date).toLocaleDateString() : '-'}</span></td>
                      <td><span className={`text-sm ${p.status?.toUpperCase() !== 'PAID' && p.dueDate && new Date(p.dueDate) < new Date() ? 'text-rose-600 font-semibold' : 'text-slate-600'}`}>{p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '-'}</span></td>
                      <td className="text-right"><span className="text-sm font-bold text-slate-900">SAR {(p.totalAmount || p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                      <td className="text-center"><StatusBadge status={p.status || 'Pending'} /></td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {(p.status === 'Pending' || p.status?.toUpperCase() === 'PENDING' || p.status?.toUpperCase() === 'UNPAID') && (
                            <button onClick={() => handleStatusChange(p.id, 'Approved')} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Approve">
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                          {(p.status === 'Approved' || p.status?.toUpperCase() === 'APPROVED') && (
                            <button onClick={() => handleStatusChange(p.id, 'Paid')} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all" title="Mark as Paid">
                              <DollarSign className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={() => handleEdit(p)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Edit"><Edit2 className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Delete"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <Wallet className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">No payables found</h3>
                <p className="text-sm text-slate-500">Add a new vendor payable to get started.</p>
              </div>
            )}

            <Pagination currentPage={currentPage} totalPages={Math.ceil(filtered.length / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={filtered.length} />
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Payable' : 'Add Payable'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Vendor<span className="text-rose-500 ml-0.5">*</span></label>
                <select className="input-premium w-full" value={formVendorId} onChange={(e) => setFormVendorId(e.target.value)}>
                  <option value="">Select Vendor...</option>
                  {vendors.map((v: any) => (<option key={v.id} value={v.id}>{v.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Date<span className="text-rose-500 ml-0.5">*</span></label>
                <input type="date" className="input-premium w-full" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Due Date</label>
                <input type="date" className="input-premium w-full" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Amount<span className="text-rose-500 ml-0.5">*</span></label>
                <input type="number" min="0" step="0.01" className="input-premium w-full" placeholder="0.00" value={formAmount || ''} onChange={(e) => { const v = parseFloat(e.target.value) || 0; setFormAmount(v); recalcVat(v, formVatPercent, formVatRequired); }} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">VAT Required<span className="text-rose-500 ml-0.5">*</span></label>
                <select className="input-premium w-full" value={formVatRequired ? 'Yes' : 'No'} onChange={(e) => { const req = e.target.value === 'Yes'; setFormVatRequired(req); recalcVat(formAmount, formVatPercent, req); }}>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              {formVatRequired && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">VAT %<span className="text-rose-500 ml-0.5">*</span></label>
                  <input type="number" min="0" max="100" step="0.01" className="input-premium w-full" placeholder="15" value={formVatPercent || ''} onChange={(e) => { const pct = parseFloat(e.target.value) || 0; setFormVatPercent(pct); recalcVat(formAmount, pct, true); }} />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">VAT Amount</label>
                <input type="text" className="input-premium w-full bg-slate-50 text-slate-500 cursor-not-allowed" value={formVatAmount.toFixed(2)} readOnly />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Category</label>
                <select className="input-premium w-full" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                  <option value="">Select Category...</option>
                  <option value="Government Fees">Government Fees</option>
                  <option value="Port Charges">Port Charges</option>
                  <option value="Customs">Customs</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Shipping Line">Shipping Line</option>
                  <option value="Inspection">Inspection</option>
                  <option value="Documentation">Documentation</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Payment Method</label>
                <select className="input-premium w-full" value={formPaymentMethod} onChange={(e) => setFormPaymentMethod(e.target.value)}>
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Description</label>
                <textarea className="input-premium w-full resize-none" rows={2} placeholder="Description..." value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayableList;
