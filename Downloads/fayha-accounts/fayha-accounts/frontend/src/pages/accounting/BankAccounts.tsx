import React, { useState, useEffect } from 'react';
import {
  Landmark, Plus, Search, Edit2, Trash2, X, Check, Loader2, AlertCircle,
  CreditCard, Building2
} from 'lucide-react';
import { banksApi } from '../../services/api';
import toast from 'react-hot-toast';

interface BankAccount {
  id: string;
  code: string;
  bankName: string;
  bankNameAr?: string;
  accountNumber: string;
  ibanNumber?: string;
  swiftCode?: string;
  branchName?: string;
  branchCode?: string;
  openingBalance: number;
  currentBalance: number;
  color: string;
  isActive: boolean;
  isDefault: boolean;
  _count?: { transactions: number };
}

const COLORS = ['#003366', '#0369a1', '#059669', '#7c3aed', '#dc2626', '#ea580c', '#0891b2', '#4f46e5'];

const emptyForm = {
  code: '',
  bankName: '',
  bankNameAr: '',
  accountNumber: '',
  ibanNumber: '',
  swiftCode: '',
  branchName: '',
  branchCode: '',
  openingBalance: 0,
  color: '#003366',
  isActive: true,
  isDefault: false,
};

const BankAccounts: React.FC = () => {
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const loadBanks = async () => {
    try {
      setLoading(true);
      const data = await banksApi.getAll();
      setBanks(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBanks(); }, []);

  const openAdd = () => {
    setEditId(null);
    setForm({ ...emptyForm, code: `BNK-${Date.now().toString(36).toUpperCase()}` });
    setShowModal(true);
  };

  const openEdit = (bank: BankAccount) => {
    setEditId(bank.id);
    setForm({
      code: bank.code,
      bankName: bank.bankName,
      bankNameAr: bank.bankNameAr || '',
      accountNumber: bank.accountNumber,
      ibanNumber: bank.ibanNumber || '',
      swiftCode: bank.swiftCode || '',
      branchName: bank.branchName || '',
      branchCode: bank.branchCode || '',
      openingBalance: bank.openingBalance,
      color: bank.color,
      isActive: bank.isActive,
      isDefault: bank.isDefault,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.bankName || !form.accountNumber || !form.code) {
      toast.error('Bank name, code, and account number are required');
      return;
    }
    try {
      setSaving(true);
      if (editId) {
        await banksApi.update(editId, form);
        toast.success('Bank account updated');
      } else {
        await banksApi.create(form);
        toast.success('Bank account created');
      }
      setShowModal(false);
      loadBanks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bank account?')) return;
    try {
      await banksApi.remove(id);
      toast.success('Bank account deleted');
      loadBanks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const filtered = banks.filter(b =>
    b.bankName.toLowerCase().includes(search.toLowerCase()) ||
    b.code.toLowerCase().includes(search.toLowerCase()) ||
    (b.accountNumber || '').includes(search)
  );

  const totalBalance = banks.reduce((s, b) => s + Number(b.currentBalance || 0), 0);

  const fmtSAR = (n: number) => `SAR ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bank Accounts</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your company bank accounts</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="h-4 w-4" /> Add Bank Account
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
              <Landmark className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm text-slate-500">Total Accounts</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{banks.length}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm text-slate-500">Total Balance</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{fmtSAR(totalBalance)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm text-slate-500">Active Accounts</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{banks.filter(b => b.isActive).length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search banks..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-10 w-full sm:w-80"
        />
      </div>

      {/* Bank Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No bank accounts found</p>
          <p className="text-sm text-slate-400 mt-1">Add your first bank account to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(bank => (
            <div key={bank.id} className="bg-white rounded-2xl border border-slate-100 shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden">
              {/* Color stripe */}
              <div className="h-1.5" style={{ backgroundColor: bank.color || '#003366' }} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: bank.color || '#003366' }}>
                      {(bank.bankName || '').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{bank.bankName}</h3>
                      {bank.bankNameAr && <p className="text-xs text-slate-400" dir="rtl">{bank.bankNameAr}</p>}
                      <p className="text-xs text-slate-500 font-mono">{bank.code}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(bank)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(bank.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Account No.</span>
                    <span className="font-mono font-semibold text-slate-700">{bank.accountNumber}</span>
                  </div>
                  {bank.ibanNumber && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">IBAN</span>
                      <span className="font-mono font-semibold text-slate-700 text-right max-w-[200px] truncate">{bank.ibanNumber}</span>
                    </div>
                  )}
                  {bank.swiftCode && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">SWIFT</span>
                      <span className="font-mono font-semibold text-slate-700">{bank.swiftCode}</span>
                    </div>
                  )}
                  {bank.branchName && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Branch</span>
                      <span className="font-semibold text-slate-700">{bank.branchName}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Current Balance</p>
                    <p className="text-lg font-bold text-slate-900">{fmtSAR(Number(bank.currentBalance))}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {bank.isDefault && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">DEFAULT</span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${bank.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {bank.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-elevated w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editId ? 'Edit Bank Account' : 'Add Bank Account'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Code *</label>
                  <input className="input w-full" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Bank Color</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setForm({ ...form, color: c })}
                        className={`h-7 w-7 rounded-lg border-2 transition-all ${form.color === c ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Bank Name (EN) *</label>
                  <input className="input w-full" value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Bank Name (AR)</label>
                  <input className="input w-full" dir="rtl" value={form.bankNameAr} onChange={e => setForm({ ...form, bankNameAr: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Account Number *</label>
                  <input className="input w-full font-mono" value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">IBAN</label>
                  <input className="input w-full font-mono" placeholder="SA..." value={form.ibanNumber} onChange={e => setForm({ ...form, ibanNumber: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">SWIFT Code</label>
                  <input className="input w-full font-mono" value={form.swiftCode} onChange={e => setForm({ ...form, swiftCode: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Opening Balance</label>
                  <input className="input w-full" type="number" step="0.01" value={form.openingBalance} onChange={e => setForm({ ...form, openingBalance: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Branch Name</label>
                  <input className="input w-full" value={form.branchName} onChange={e => setForm({ ...form, branchName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Branch Code</label>
                  <input className="input w-full" value={form.branchCode} onChange={e => setForm({ ...form, branchCode: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
                  <span className="text-sm text-slate-700">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isDefault} onChange={e => setForm({ ...form, isDefault: e.target.checked })} className="rounded" />
                  <span className="text-sm text-slate-700">Default Account</span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankAccounts;
