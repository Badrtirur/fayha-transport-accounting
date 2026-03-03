import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Eye,
  Edit3,
  Trash2,
  DollarSign,
  Clock,
  CheckCircle2,
  Wallet,
  Receipt,
  Plus,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { PayableExpense, JobReference } from '../../types';
import { payableExpensesApi, vendorsApi, jobReferencesApi, banksApi } from '../../services/api';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';

const formatDate = (d: any): string => {
  if (!d) return '-';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return String(d); }
};

const emptyForm = {
  vendorId: '',
  jobRefId: '',
  bankAccountId: '',
  expenseDate: '',
  dueDate: '',
  amount: '',
  vatRequired: 'Yes',
  vatPercent: '15',
  vatAmount: '',
  description: '',
  invoiceNo: '',
  category: '',
  status: 'Pending',
  paymentMethod: 'Cash',
};

const toastSuccess = (msg: string) =>
  toast.success(msg, { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
const toastError = (msg: string) =>
  toast.error(msg, { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });

const PayableExpenseList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryJobRefId = searchParams.get('jobRefId') || '';
  const [expenses, setExpenses] = useState<PayableExpense[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [jobRefs, setJobRefs] = useState<JobReference[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<PayableExpense | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([payableExpensesApi.getAll(), vendorsApi.getAll(), jobReferencesApi.getAll(), banksApi.getAll()])
      .then(([expData, clientList, jrList, bankList]: any) => {
        setExpenses(Array.isArray(expData) ? expData : []);
        setClients(Array.isArray(clientList) ? clientList : []);
        setJobRefs(Array.isArray(jrList) ? jrList : []);
        setBanks(Array.isArray(bankList) ? bankList : []);
        setLoading(false);
      })
      .catch(() => {
        setExpenses([]);
        setClients([]);
        setJobRefs([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
    // Auto-open add modal if jobRefId is in URL query
    if (queryJobRefId) {
      setFormData({ ...emptyForm, jobRefId: queryJobRefId });
      setShowAddModal(true);
    }
  }, []);

  const getVendorName = (vendorId: string): string => {
    const client = clients.find((c) => c.id === vendorId);
    return client ? client.name : '-';
  };

  const getJobRefNo = (jobRefId?: string): string => {
    if (!jobRefId) return '-';
    const jr = jobRefs.find((j) => j.id === jobRefId);
    return jr ? (jr.jobRefNo || (jr as any).jobNumber || '-') : '-';
  };

  const filteredExpenses = expenses.filter((e) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      getVendorName(e.vendorId).toLowerCase().includes(term) ||
      (e.category || '').toLowerCase().includes(term) ||
      (e.description || '').toLowerCase().includes(term) ||
      (e.status || '').toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const paginatedExpenses = filteredExpenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stat calculations
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
  const pendingCount = expenses.filter((e) => (e.status || '').toUpperCase() === 'PENDING' || (e.status || '').toUpperCase() === 'UNPAID').length;
  const approvedCount = expenses.filter((e) => (e.status || '').toUpperCase() === 'APPROVED').length;
  const paidCount = expenses.filter((e) => (e.status || '').toUpperCase() === 'PAID').length;

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const apiStatus = newStatus === 'Paid' ? 'PAID' : newStatus === 'Approved' ? 'APPROVED' : 'UNPAID';
      await payableExpensesApi.update(id, { status: apiStatus });
      setExpenses(prev => prev.map(item => item.id === id ? { ...item, status: apiStatus } as any : item));
      toastSuccess(`Status updated to ${newStatus}`);
    } catch {
      toastError('Failed to update status');
    }
  };

  // Handlers
  const handleAdd = () => {
    setFormData({ ...emptyForm });
    setShowAddModal(true);
  };

  const handleView = (exp: PayableExpense) => {
    setSelectedExpense(exp);
    setShowViewModal(true);
  };

  const handleEdit = (exp: PayableExpense) => {
    setSelectedExpense(exp);
    setFormData({
      vendorId: exp.vendorId || '',
      jobRefId: (exp as any).jobRefId || '',
      bankAccountId: (exp as any).bankAccountId || '',
      expenseDate: exp.expenseDate || '',
      dueDate: (exp as any).dueDate || '',
      amount: String(exp.amount || ''),
      vatRequired: ((exp as any).vatAmount > 0) ? 'Yes' : 'No',
      vatPercent: ((exp as any).vatAmount > 0 && exp.amount > 0) ? String(Math.round(((exp as any).vatAmount / exp.amount) * 100 * 100) / 100) : '15',
      vatAmount: String((exp as any).vatAmount || ''),
      description: exp.description || '',
      invoiceNo: (exp as any).invoiceNo || '',
      category: exp.category || '',
      status: exp.status || 'Pending',
      paymentMethod: (exp as any).paymentMethod || 'Cash',
    });
    setShowEditModal(true);
  };

  const handleDelete = async (exp: PayableExpense) => {
    if (!window.confirm(`Are you sure you want to delete this expense? This action cannot be undone.`)) return;
    try {
      await payableExpensesApi.remove(exp.id);
      toastSuccess('Expense deleted successfully');
      fetchData();
    } catch (err: any) {
      toastError(err?.message || 'Failed to delete expense');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const amt = parseFloat(formData.amount) || 0;
      const vat = formData.vatRequired === 'Yes' ? Math.round(amt * ((parseFloat(formData.vatPercent) || 15) / 100) * 100) / 100 : 0;
      await payableExpensesApi.create({
        vendorId: formData.vendorId,
        jobRefId: formData.jobRefId || undefined,
        bankAccountId: formData.bankAccountId || undefined,
        date: formData.expenseDate ? new Date(formData.expenseDate).toISOString() : undefined,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        amount: amt,
        vatAmount: vat,
        totalAmount: amt + vat,
        balanceDue: amt + vat,
        description: formData.description,
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        status: formData.status === 'Paid' ? 'PAID' : formData.status === 'Approved' ? 'APPROVED' : 'UNPAID',
      });
      toastSuccess('Expense created successfully');
      setShowAddModal(false);
      fetchData();
    } catch (err: any) {
      toastError(err?.message || 'Failed to create expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;
    setSubmitting(true);
    try {
      const editAmt = parseFloat(formData.amount) || 0;
      const editVat = formData.vatRequired === 'Yes' ? Math.round(editAmt * ((parseFloat(formData.vatPercent) || 15) / 100) * 100) / 100 : 0;
      await payableExpensesApi.update(selectedExpense.id, {
        vendorId: formData.vendorId,
        jobRefId: formData.jobRefId || undefined,
        bankAccountId: formData.bankAccountId || undefined,
        date: formData.expenseDate ? new Date(formData.expenseDate).toISOString() : undefined,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        amount: editAmt,
        vatAmount: editVat,
        totalAmount: editAmt + editVat,
        balanceDue: editAmt + editVat,
        description: formData.description,
        category: formData.category,
        paymentMethod: formData.paymentMethod,
      });
      toastSuccess('Expense updated successfully');
      setShowEditModal(false);
      setSelectedExpense(null);
      fetchData();
    } catch (err: any) {
      toastError(err?.message || 'Failed to update expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const renderForm = (onSubmit: (e: React.FormEvent) => void, isEdit: boolean) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Vendor</label>
          <select
            value={formData.vendorId}
            onChange={(e) => handleFormChange('vendorId', e.target.value)}
            className="input-premium"
            required
          >
            <option value="">Select vendor...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Job Reference</label>
          <select
            value={formData.jobRefId}
            onChange={(e) => handleFormChange('jobRefId', e.target.value)}
            className="input-premium"
          >
            <option value="">Select job reference...</option>
            {jobRefs.map((jr) => (
              <option key={jr.id} value={jr.id}>{jr.jobRefNo}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date<span className="text-rose-500 ml-0.5">*</span></label>
          <input
            type="date"
            value={formData.expenseDate}
            onChange={(e) => handleFormChange('expenseDate', e.target.value)}
            className="input-premium"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Due Date</label>
          <input
            type="date"
            value={formData.dueDate}
            onChange={(e) => handleFormChange('dueDate', e.target.value)}
            className="input-premium"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Amount (SAR)<span className="text-rose-500 ml-0.5">*</span></label>
          <input
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => handleFormChange('amount', e.target.value)}
            className="input-premium"
            placeholder="0.00"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">VAT Required<span className="text-rose-500 ml-0.5">*</span></label>
          <select
            value={formData.vatRequired}
            onChange={(e) => handleFormChange('vatRequired', e.target.value)}
            className="input-premium"
          >
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        {formData.vatRequired === 'Yes' && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">VAT %<span className="text-rose-500 ml-0.5">*</span></label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.vatPercent}
              onChange={(e) => handleFormChange('vatPercent', e.target.value)}
              className="input-premium"
              placeholder="15"
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">VAT Amount</label>
          <input
            type="text"
            value={formData.vatRequired === 'Yes' ? (Math.round((parseFloat(formData.amount) || 0) * ((parseFloat(formData.vatPercent) || 15) / 100) * 100) / 100).toFixed(2) : '0.00'}
            readOnly
            className="input-premium bg-slate-50 text-slate-500 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Payment Method</label>
          <select
            value={formData.paymentMethod}
            onChange={(e) => handleFormChange('paymentMethod', e.target.value)}
            className="input-premium"
          >
            <option value="Cash">Cash</option>
            <option value="Bank">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
        {(formData.paymentMethod === 'Bank' || formData.paymentMethod === 'Cheque') && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Bank Account<span className="text-rose-500 ml-0.5">*</span></label>
            <select
              value={formData.bankAccountId}
              onChange={(e) => handleFormChange('bankAccountId', e.target.value)}
              className="input-premium"
              required
            >
              <option value="">Select bank account...</option>
              {banks.filter((b: any) => b.isActive !== false).map((b: any) => (
                <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber || ''}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
          <input
            type="text"
            value={formData.category}
            onChange={(e) => handleFormChange('category', e.target.value)}
            className="input-premium"
            placeholder="Transport, Customs, etc."
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => handleFormChange('description', e.target.value)}
          className="input-premium min-h-[80px]"
          placeholder="Enter description..."
          rows={3}
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
          className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary"
        >
          {submitting ? 'Saving...' : isEdit ? 'Update Expense' : 'Create Expense'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payable Expenses</h1>
            <p className="text-slate-500 mt-0.5 text-sm">
              Manage vendor payable expenses across all job references.
            </p>
          </div>
        </div>
        <button className="btn-primary" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          Add Expense
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-premium p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Total Expenses</p>
              <p className="text-2xl font-bold text-emerald-900 mt-1">
                SAR {totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <DollarSign className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="card-premium p-5 bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">{pendingCount}</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="card-premium p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Approved</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{approvedCount}</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <CheckCircle2 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="card-premium p-5 bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Paid</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">{paidCount}</p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <Wallet className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card-premium p-4">
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="input-premium pl-10"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card-premium overflow-hidden">
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="h-4 w-20 skeleton rounded" />
                <div className="h-4 w-40 skeleton rounded flex-1" />
                <div className="h-4 w-28 skeleton rounded" />
                <div className="h-4 w-24 skeleton rounded" />
                <div className="h-4 w-20 skeleton rounded" />
                <div className="h-4 w-16 skeleton rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vendor</th>
                  <th>Job Ref</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>VAT</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedExpenses.map((exp) => (
                  <tr key={exp.id}>
                    <td className="text-sm text-slate-700 whitespace-nowrap">{formatDate((exp as any).date || exp.expenseDate)}</td>
                    <td>
                      <span className="text-sm font-medium text-slate-900 truncate max-w-[180px] block">
                        {getVendorName(exp.vendorId)}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm font-medium text-slate-700 font-mono">
                        {getJobRefNo(exp.jobRefId)}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                        {exp.category}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-slate-600 truncate max-w-[200px] block">
                        {exp.description}
                      </span>
                    </td>
                    <td className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                      SAR {(exp.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-sm text-slate-600 whitespace-nowrap">
                      SAR {(exp.vatAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-sm font-bold text-slate-900 whitespace-nowrap">
                      SAR {(exp.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <StatusBadge status={exp.status} />
                    </td>
                    <td>
                      <div className="flex items-center gap-0.5">
                        {(exp.status?.toUpperCase() === 'PENDING' || exp.status?.toUpperCase() === 'UNPAID' || exp.status === 'Pending') && (
                          <button
                            onClick={() => handleStatusChange(exp.id, 'Approved')}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {(exp.status?.toUpperCase() === 'APPROVED' || exp.status === 'Approved') && (
                          <button
                            onClick={() => handleStatusChange(exp.id, 'Paid')}
                            className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                            title="Mark as Paid"
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleView(exp)}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(exp)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(exp)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredExpenses.length === 0 && (
            <div className="text-center py-16">
              <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">No payable expenses found</h3>
              <p className="text-sm text-slate-500">Try adjusting your search or add a new expense.</p>
            </div>
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredExpenses.length}
          />
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Payable Expense" size="lg">
        {renderForm(handleCreateSubmit, false)}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedExpense(null); }} title="Edit Payable Expense" size="lg">
        {renderForm(handleEditSubmit, true)}
      </Modal>

      {/* View Modal */}
      <Modal isOpen={showViewModal} onClose={() => { setShowViewModal(false); setSelectedExpense(null); }} title="Expense Details" size="lg">
        {selectedExpense && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Vendor</p>
                <p className="text-sm font-bold text-slate-900">{getVendorName(selectedExpense.vendorId)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Job Reference</p>
                <p className="text-sm font-bold text-slate-900">{getJobRefNo(selectedExpense.jobRefId)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Date</p>
                <p className="text-sm font-bold text-slate-900">{formatDate((selectedExpense as any).date || selectedExpense.expenseDate)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Invoice No</p>
                <p className="text-sm font-bold text-slate-900">{(selectedExpense as any).invoiceNo || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Category</p>
                <p className="text-sm font-bold text-slate-900">{selectedExpense.category}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                <StatusBadge status={selectedExpense.status} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Amount</p>
                <p className="text-sm font-bold text-slate-900">SAR {(selectedExpense.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">VAT</p>
                <p className="text-sm font-bold text-slate-900">SAR {(selectedExpense.vatAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Amount</p>
                <p className="text-lg font-bold text-emerald-600">SAR {(selectedExpense.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm text-slate-700">{selectedExpense.description || '-'}</p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => { setShowViewModal(false); setSelectedExpense(null); }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PayableExpenseList;
