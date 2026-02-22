import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Search,
  Edit2,
  Trash2,
  Plus,
  Building2,
  TrendingUp,
  TrendingDown,
  Scale,
  BookOpen,
} from 'lucide-react';
import type { PayableOPB } from '../../types';
import { payableOPBApi, vendorsApi } from '../../services/api';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';


const PayableOPBList: React.FC = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<PayableOPB[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal form state
  const [formVendorId, setFormVendorId] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formDebit, setFormDebit] = useState<number>(0);
  const [formCredit, setFormCredit] = useState<number>(0);
  const [formDescription, setFormDescription] = useState('');

  useEffect(() => {
    Promise.all([payableOPBApi.getAll(), vendorsApi.getAll()]).then(([opbList, clientList]: any) => {
      setEntries(Array.isArray(opbList) ? opbList : []);
      setClients(Array.isArray(clientList) ? clientList : []);
      setLoading(false);
    }).catch(() => {
      setEntries([]);
      setClients([]);
      setLoading(false);
    });
  }, []);

  const formatDate = (d: any): string => {
    if (!d) return '-';
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return String(d);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return String(d); }
  };

  const getVendorName = (vendorId: string): string => {
    const client = clients.find((c) => c.id === vendorId);
    return client ? client.name : '-';
  };

  const filteredEntries = entries.filter((e) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      getVendorName(e.vendorId).toLowerCase().includes(term) ||
      (e.description || '').toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const uniqueVendors = new Set(entries.map((e) => e.vendorId)).size;
  const totalDebit = entries.reduce((sum, e) => sum + (e.debitAmount || 0), 0);
  const totalCredit = entries.reduce((sum, e) => sum + (e.creditAmount || 0), 0);
  const netBalance = totalDebit - totalCredit;

  const resetForm = () => {
    setFormVendorId('');
    setFormDate('');
    setFormDebit(0);
    setFormCredit(0);
    setFormDescription('');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        await payableOPBApi.remove(id);
        setEntries(prev => prev.filter((e) => e.id !== id));
        toast.success('Entry deleted successfully!', {
          style: { borderRadius: '12px', background: '#10b981', color: '#fff' },
        });
      } catch {
        toast.error('Failed to delete entry.', {
          style: { borderRadius: '12px', background: '#ef4444', color: '#fff' },
        });
      }
    }
  };

  const handleEdit = (entry: PayableOPB) => {
    setEditingId(entry.id);
    setFormVendorId(entry.vendorId || '');
    setFormDate(entry.date ? new Date(entry.date).toISOString().split('T')[0] : '');
    setFormDebit(entry.debitAmount || 0);
    setFormCredit(entry.creditAmount || 0);
    setFormDescription(entry.description || '');
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formVendorId || !formDate) {
      toast.error('Please fill in Vendor and Date.', {
        style: { borderRadius: '12px', background: '#ef4444', color: '#fff' },
      });
      return;
    }
    setSaving(true);
    const payload = {
      vendorId: formVendorId,
      date: formDate,
      debitAmount: formDebit,
      creditAmount: formCredit,
      description: formDescription,
    };
    try {
      if (editingId) {
        const updated = await payableOPBApi.update(editingId, payload);
        setEntries(prev => prev.map(e => e.id === editingId ? updated : e));
        toast.success('Entry updated successfully!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      } else {
        const created = await payableOPBApi.create(payload);
        setEntries(prev => [...prev, created]);
        toast.success('Entry created successfully!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      }
      setModalOpen(false);
      setEditingId(null);
      resetForm();
    } catch {
      toast.error('Failed to save entry.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    } finally {
      setSaving(false);
    }
  };

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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payable Opening Balance</h1>
            <p className="text-slate-500 mt-0.5 text-sm">
              Manage vendor/payable opening balance entries for the fiscal year.
            </p>
          </div>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => {
            setEditingId(null);
            resetForm();
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add New
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-premium p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Total Vendors</p>
              <p className="text-2xl font-bold text-emerald-900 mt-1">{uniqueVendors}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <Building2 className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="card-premium p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total Debit</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                SAR {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="card-premium p-5 bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Total Credit</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                SAR {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <TrendingDown className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="card-premium p-5 bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Net Balance</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">
                SAR {netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <Scale className="h-6 w-6 text-amber-600" />
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
            placeholder="Search vendor balances..."
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
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="h-4 w-40 skeleton rounded flex-1" />
                <div className="h-4 w-24 skeleton rounded" />
                <div className="h-4 w-24 skeleton rounded" />
                <div className="h-4 w-24 skeleton rounded" />
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
                  <th>Vendor Name</th>
                  <th>Date</th>
                  <th>Debit</th>
                  <th>Credit</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <span className="text-sm font-medium text-slate-900">
                        {getVendorName(entry.vendorId)}
                      </span>
                    </td>
                    <td className="text-sm text-slate-700 whitespace-nowrap">{formatDate(entry.date)}</td>
                    <td className="text-sm font-bold text-slate-900 whitespace-nowrap">
                      SAR {(entry.debitAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-sm font-bold text-slate-900 whitespace-nowrap">
                      SAR {(entry.creditAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className="text-sm text-slate-600 truncate max-w-[250px] block">
                        {entry.description || '-'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
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

          {filteredEntries.length === 0 && (
            <div className="text-center py-16">
              <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">No opening balance entries found</h3>
              <p className="text-sm text-slate-500">Add a new payable opening balance to get started.</p>
            </div>
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredEntries.length}
          />
        </div>
      )}

      {/* Add New Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditingId(null); }} title={editingId ? 'Edit Payable Opening Balance' : 'Add Payable Opening Balance'} size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Vendor<span className="text-rose-500 ml-0.5">*</span>
            </label>
            <select
              value={formVendorId}
              onChange={(e) => setFormVendorId(e.target.value)}
              className="input-premium w-full"
            >
              <option value="">Select Vendor...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Date<span className="text-rose-500 ml-0.5">*</span>
            </label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="input-premium w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Debit Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formDebit || ''}
                onChange={(e) => setFormDebit(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="input-premium w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Credit Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formCredit || ''}
                onChange={(e) => setFormCredit(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="input-premium w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Description</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Opening balance description..."
              rows={3}
              className="input-premium w-full resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { setModalOpen(false); setEditingId(null); }}
              className="btn-secondary"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PayableOPBList;
