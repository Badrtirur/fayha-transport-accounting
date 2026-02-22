import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Search,
  Eye,
  Edit3,
  Trash2,
  ChevronDown,
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle,
  DollarSign,
  FileText,
  X,
  CheckCircle,
  Send,
} from 'lucide-react';
import type { RcvPvc, Client } from '../../types';
import { rcvPvcApi, customersApi, vendorsApi } from '../../services/api';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import SearchableSelect from '../../components/common/SearchableSelect';


type TabFilter = 'All' | 'RCV' | 'PVC';

const RcvPvcList: React.FC = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<RcvPvc[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [activeTab, setActiveTab] = useState<TabFilter>('All');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Edit/Create modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RcvPvc | null>(null);
  const [editType, setEditType] = useState<'RCV' | 'PVC'>('RCV');
  const [editDate, setEditDate] = useState('');
  const [editClientId, setEditClientId] = useState('');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editReference, setEditReference] = useState('');
  const [editStatus, setEditStatus] = useState('DRAFT');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    Promise.all([rcvPvcApi.getAll(), customersApi.getAll(), vendorsApi.getAll()]).then(([rpList, clientList, vendorList]: any) => {
      setEntries(Array.isArray(rpList) ? rpList : []);
      setClients(Array.isArray(clientList) ? clientList : []);
      setVendors(Array.isArray(vendorList) ? vendorList : []);
      setLoading(false);
    }).catch(() => {
      setEntries([]);
      setClients([]);
      setVendors([]);
      setLoading(false);
    });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getEntityName = (entry: RcvPvc): string => {
    // Use included relations from backend first
    if ((entry as any).customer?.name) return (entry as any).customer.name;
    if ((entry as any).vendor?.name) return (entry as any).vendor.name;
    // Fallback to lookup
    if (entry.clientId) {
      const client = clients.find((c) => c.id === entry.clientId);
      if (client) return client.name;
    }
    if (entry.vendorId) {
      const vendor = vendors.find((v: any) => v.id === entry.vendorId);
      if (vendor) return vendor.name;
    }
    return '-';
  };

  // Filter by tab
  const tabFiltered = entries.filter((e) => {
    if (activeTab === 'All') return true;
    return e.type === activeTab;
  });

  // Filter by search
  const filteredEntries = tabFiltered.filter((e) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (e.voucherNo || '').toLowerCase().includes(term) ||
      getEntityName(e).toLowerCase().includes(term) ||
      (e.reference || '').toLowerCase().includes(term) ||
      (e.type || '').toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const totalVouchers = entries.length;
  const rcvCount = entries.filter((e) => e.type === 'RCV').length;
  const pvcCount = entries.filter((e) => e.type === 'PVC').length;
  const totalAmount = entries.reduce((sum, e) => sum + (e.amount || 0), 0);

  const handleAddNew = (type: 'RCV' | 'PVC') => {
    setDropdownOpen(false);
    setIsCreating(true);
    setEditingEntry(null);
    setEditType(type);
    setEditDate(new Date().toISOString().split('T')[0]);
    setEditClientId('');
    setEditAmount(0);
    setEditReference('');
    setEditStatus('DRAFT');
    setEditNotes('');
    setEditModalOpen(true);
  };

  const handleOpenEdit = (entry: RcvPvc) => {
    setIsCreating(false);
    setEditingEntry(entry);
    setEditType(entry.type);
    setEditDate(entry.date ? new Date(entry.date).toISOString().split('T')[0] : '');
    setEditClientId(entry.clientId || entry.vendorId || '');
    setEditAmount(entry.amount || 0);
    setEditReference(entry.reference || '');
    setEditStatus(entry.status?.toUpperCase() || 'DRAFT');
    setEditNotes(entry.notes || '');
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!isCreating && !editingEntry) return;
    if (!editDate) {
      toast.error('Please select a date.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }
    if (!editAmount || editAmount <= 0) {
      toast.error('Amount must be greater than zero.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }

    const currentType = isCreating ? editType : editingEntry!.type;
    const payload: any = {
      date: editDate,
      amount: editAmount,
      reference: editReference,
      status: isCreating ? editStatus : undefined,
      notes: editNotes,
    };
    if (currentType === 'RCV') {
      payload.clientId = editClientId || null;
      payload.vendorId = null;
    } else {
      payload.vendorId = editClientId || null;
      payload.clientId = null;
    }

    try {
      if (isCreating) {
        payload.type = editType;
        const created = await rcvPvcApi.create(payload);
        setEntries(prev => [...prev, created]);
        toast.success(`${editType === 'RCV' ? 'Receipt Voucher' : 'Payment Voucher'} created!`, {
          style: { borderRadius: '12px', background: '#10b981', color: '#fff' },
        });
      } else {
        const updated = await rcvPvcApi.update(editingEntry!.id, payload);
        setEntries(prev => prev.map(e => e.id === editingEntry!.id ? { ...e, ...updated } : e));
        toast.success('Voucher updated successfully!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      }
      setEditModalOpen(false);
      setEditingEntry(null);
      setIsCreating(false);
    } catch (err: any) {
      toast.error(err?.message || (isCreating ? 'Failed to create voucher.' : 'Failed to update voucher.'), {
        style: { borderRadius: '12px', background: '#ef4444', color: '#fff' },
      });
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await rcvPvcApi.update(id, { status: newStatus });
      setEntries(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } as any : item));
      toast.success(`Status updated to ${newStatus}`, { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    } catch {
      toast.error('Failed to update status', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    }
  };

  const handleDeleteVoucher = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this voucher?')) {
      try {
        await rcvPvcApi.remove(id);
        setEntries(prev => prev.filter((e) => e.id !== id));
        toast.success('Voucher deleted successfully!', {
          style: { borderRadius: '12px', background: '#10b981', color: '#fff' },
        });
      } catch {
        toast.error('Failed to delete voucher.', {
          style: { borderRadius: '12px', background: '#ef4444', color: '#fff' },
        });
      }
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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Receipt / Payment Vouchers</h1>
            <p className="text-slate-500 mt-0.5 text-sm">
              Manage receipt vouchers (RCV) and payment vouchers (PVC).
            </p>
          </div>
        </div>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="btn-primary flex items-center gap-2"
          >
            Add New
            <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
              <button
                onClick={() => handleAddNew('RCV')}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex items-center gap-2"
              >
                <ArrowDownCircle className="h-4 w-4 text-emerald-500" />
                Receipt Voucher (RCV)
              </button>
              <button
                onClick={() => handleAddNew('PVC')}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2"
              >
                <ArrowUpCircle className="h-4 w-4 text-blue-500" />
                Payment Voucher (PVC)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-premium p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Total Vouchers</p>
              <p className="text-2xl font-bold text-emerald-900 mt-1">{totalVouchers}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <FileText className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="card-premium p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">RCV Count</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{rcvCount}</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <ArrowDownCircle className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="card-premium p-5 bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">PVC Count</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">{pvcCount}</p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <ArrowUpCircle className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="card-premium p-5 bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Total Amount</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">
                SAR {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <DollarSign className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Filters + Search */}
      <div className="card-premium p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {(['All', 'RCV', 'PVC'] as TabFilter[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                  activeTab === tab
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search vouchers..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="input-premium pl-10"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card-premium overflow-hidden">
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="h-4 w-28 skeleton rounded" />
                <div className="h-4 w-16 skeleton rounded" />
                <div className="h-4 w-20 skeleton rounded" />
                <div className="h-4 w-40 skeleton rounded flex-1" />
                <div className="h-4 w-24 skeleton rounded" />
                <div className="h-4 w-20 skeleton rounded" />
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
                  <th>Voucher No</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Client / Vendor</th>
                  <th>Amount</th>
                  <th>Reference</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <span className="text-sm font-bold text-slate-900 font-mono">
                        {entry.voucherNo}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                          entry.type === 'RCV'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {entry.type}
                      </span>
                    </td>
                    <td className="text-sm text-slate-700 whitespace-nowrap">{entry.date ? new Date(entry.date).toLocaleDateString() : '-'}</td>
                    <td>
                      <span className="text-sm font-medium text-slate-700 truncate max-w-[180px] block">
                        {getEntityName(entry)}
                      </span>
                    </td>
                    <td className="text-sm font-bold text-slate-900 whitespace-nowrap">
                      SAR {(entry.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className="text-sm text-slate-600 truncate max-w-[200px] block">
                        {entry.reference || '-'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={entry.status} />
                    </td>
                    <td>
                      <div className="flex items-center gap-0.5">
                        {entry.status?.toUpperCase() === 'DRAFT' && (
                          <button
                            onClick={() => handleStatusChange(entry.id, 'APPROVED')}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {entry.status?.toUpperCase() === 'APPROVED' && (
                          <button
                            onClick={() => handleStatusChange(entry.id, 'POSTED')}
                            className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                            title="Post"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const details = `Voucher: ${entry.voucherNo}\nType: ${entry.type}\nDate: ${entry.date ? new Date(entry.date).toLocaleDateString() : '-'}\nAmount: SAR ${(entry.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}\nReference: ${entry.reference || '-'}\nStatus: ${entry.status}\nClient/Vendor: ${getEntityName(entry)}`;
                            toast(details, { duration: 5000, style: { borderRadius: '12px', background: '#1e293b', color: '#fff', whiteSpace: 'pre-line', fontSize: '13px' } });
                          }}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(entry)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteVoucher(entry.id)}
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
              <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">No vouchers found</h3>
              <p className="text-sm text-slate-500">Try adjusting your search or add a new voucher.</p>
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

      {/* Edit/Create Modal */}
      {editModalOpen && (isCreating || editingEntry) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {isCreating ? 'New' : 'Edit'} {(isCreating ? editType : editingEntry!.type) === 'RCV' ? 'Receipt' : 'Payment'} Voucher
              </h2>
              <button onClick={() => { setEditModalOpen(false); setEditingEntry(null); setIsCreating(false); }} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!isCreating && editingEntry && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Voucher No</label>
                  <input type="text" value={editingEntry.voucherNo || ''} readOnly className="input-premium w-full bg-slate-50 text-slate-500 cursor-not-allowed" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Date<span className="text-rose-500 ml-0.5">*</span></label>
                <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="input-premium w-full" />
              </div>
              <div className="md:col-span-2">
                <SearchableSelect
                  label={(isCreating ? editType : editingEntry!.type) === 'RCV' ? 'Client' : 'Vendor'}
                  options={(isCreating ? editType : editingEntry!.type) === 'RCV'
                    ? clients.map(c => ({ value: c.id, label: c.name }))
                    : vendors.map((v: any) => ({ value: v.id, label: v.name }))}
                  value={editClientId}
                  onChange={setEditClientId}
                  placeholder={(isCreating ? editType : editingEntry!.type) === 'RCV' ? 'Select client...' : 'Select vendor...'}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Amount (SAR)<span className="text-rose-500 ml-0.5">*</span></label>
                <input type="number" min="0" step="0.01" value={editAmount || ''} onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)} className="input-premium w-full" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Reference</label>
                <input type="text" value={editReference} onChange={(e) => setEditReference(e.target.value)} placeholder="e.g. CHQ-001" className="input-premium w-full" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => { setEditModalOpen(false); setEditingEntry(null); setIsCreating(false); }} className="btn-ghost">Cancel</button>
              <button onClick={handleSaveEdit} className="btn-primary">{isCreating ? 'Create' : 'Update'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RcvPvcList;
