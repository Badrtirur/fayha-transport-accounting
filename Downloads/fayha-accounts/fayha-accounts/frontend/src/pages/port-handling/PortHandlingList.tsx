import React, { useEffect, useState } from 'react';
import {
  Search,
  Anchor,
  Clock,
  CheckCircle2,
  DollarSign,
  Eye,
  Edit3,
  Trash2,
  Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { PortHandling, Terminal } from '../../types';
import { portHandlingApi, terminalsApi, jobReferencesApi } from '../../services/api';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';

const formatDate = (d: any): string => {
  if (!d) return '-';
  try { const date = new Date(d); if (isNaN(date.getTime())) return String(d); return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return String(d); }
};

const emptyForm = {
  containerNo: '',
  jobRefId: '',
  terminalId: '',
  date: '',
  handlingType: '',
  status: 'Pending',
  charges: '',
  notes: '',
};

const toastSuccess = (msg: string) =>
  toast.success(msg, { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
const toastError = (msg: string) =>
  toast.error(msg, { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });

const PortHandlingList: React.FC = () => {
  const [records, setRecords] = useState<PortHandling[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [jobRefs, setJobRefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 8;

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PortHandling | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([portHandlingApi.getAll(), terminalsApi.getAll(), jobReferencesApi.getAll()])
      .then(([recData, termData, jrData]: any) => {
        setRecords(Array.isArray(recData) ? recData : []);
        setTerminals(Array.isArray(termData) ? termData : []);
        setJobRefs(Array.isArray(jrData) ? jrData : []);
        setLoading(false);
      })
      .catch(() => {
        setRecords([]);
        setTerminals([]);
        setJobRefs([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getTerminalName = (terminalId: string): string => {
    const t = terminals.find((tm) => tm.id === terminalId);
    return t ? t.name : '-';
  };

  const getJobRefNo = (jobRefId: string): string => {
    const job = jobRefs.find((j: any) => j.id === jobRefId);
    return job ? job.jobRefNo : '-';
  };

  const filtered = records.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.containerNo || '').toLowerCase().includes(q) ||
      getTerminalName(r.terminalId).toLowerCase().includes(q) ||
      getJobRefNo(r.jobRefId).toLowerCase().includes(q)
    );
  });

  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalRecords = records.length;
  const pendingCount = records.filter((r) => r.status === 'Pending').length;
  const completedCount = records.filter((r) => r.status === 'Completed').length;
  const totalCharges = records.reduce((s, r) => s + (r.charges || 0), 0);

  // Handlers
  const handleAdd = () => {
    setFormData({ ...emptyForm });
    setShowAddModal(true);
  };

  const handleView = (rec: PortHandling) => {
    setSelectedRecord(rec);
    setShowViewModal(true);
  };

  const handleEdit = (rec: PortHandling) => {
    setSelectedRecord(rec);
    setFormData({
      containerNo: rec.containerNo || '',
      jobRefId: rec.jobRefId || '',
      terminalId: rec.terminalId || '',
      date: rec.date || '',
      handlingType: rec.handlingType || '',
      status: rec.status || 'Pending',
      charges: String(rec.charges || ''),
      notes: (rec as any).notes || '',
    });
    setShowEditModal(true);
  };

  const handleDelete = async (rec: PortHandling) => {
    if (!window.confirm('Are you sure you want to delete this port handling record? This action cannot be undone.')) return;
    try {
      await portHandlingApi.remove(rec.id);
      toastSuccess('Port handling record deleted successfully');
      fetchData();
    } catch (err: any) {
      toastError(err?.message || 'Failed to delete record');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await portHandlingApi.create({
        containerNo: formData.containerNo,
        jobRefId: formData.jobRefId || undefined,
        terminalId: formData.terminalId,
        date: formData.date,
        handlingType: formData.handlingType,
        status: formData.status,
        charges: parseFloat(formData.charges) || 0,
        notes: formData.notes,
      });
      toastSuccess('Port handling record created successfully');
      setShowAddModal(false);
      fetchData();
    } catch (err: any) {
      toastError(err?.message || 'Failed to create record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setSubmitting(true);
    try {
      await portHandlingApi.update(selectedRecord.id, {
        containerNo: formData.containerNo,
        jobRefId: formData.jobRefId || undefined,
        terminalId: formData.terminalId,
        date: formData.date,
        handlingType: formData.handlingType,
        status: formData.status,
        charges: parseFloat(formData.charges) || 0,
        notes: formData.notes,
      });
      toastSuccess('Port handling record updated successfully');
      setShowEditModal(false);
      setSelectedRecord(null);
      fetchData();
    } catch (err: any) {
      toastError(err?.message || 'Failed to update record');
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
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Container No</label>
          <input
            type="text"
            value={formData.containerNo}
            onChange={(e) => handleFormChange('containerNo', e.target.value)}
            className="input-premium"
            placeholder="ABCD1234567"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Job Reference</label>
          <select
            value={formData.jobRefId}
            onChange={(e) => handleFormChange('jobRefId', e.target.value)}
            className="input-premium"
          >
            <option value="">Select job reference...</option>
            {jobRefs.map((jr: any) => (
              <option key={jr.id} value={jr.id}>{jr.jobRefNo}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Terminal</label>
          <select
            value={formData.terminalId}
            onChange={(e) => handleFormChange('terminalId', e.target.value)}
            className="input-premium"
            required
          >
            <option value="">Select terminal...</option>
            {terminals.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleFormChange('date', e.target.value)}
            className="input-premium"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Handling Type</label>
          <input
            type="text"
            value={formData.handlingType}
            onChange={(e) => handleFormChange('handlingType', e.target.value)}
            className="input-premium"
            placeholder="Loading, Unloading, etc."
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Charges (SAR)</label>
          <input
            type="number"
            step="0.01"
            value={formData.charges}
            onChange={(e) => handleFormChange('charges', e.target.value)}
            className="input-premium"
            placeholder="0.00"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
          <select
            value={formData.status}
            onChange={(e) => handleFormChange('status', e.target.value)}
            className="input-premium"
          >
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => handleFormChange('notes', e.target.value)}
          className="input-premium min-h-[80px]"
          placeholder="Enter notes..."
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
          {submitting ? 'Saving...' : isEdit ? 'Update Record' : 'Create Record'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Port Handling</h1>
          <p className="text-slate-500 mt-1 text-sm">Track port handling charges and container operations.</p>
        </div>
        <button className="btn-primary" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          Add Port Handling
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><Anchor className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Total Records</p>
              <p className="text-2xl font-bold">{totalRecords}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><Clock className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Pending</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-lg shadow-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><CheckCircle2 className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Completed</p>
              <p className="text-2xl font-bold">{completedCount}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><DollarSign className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Total Charges</p>
              <p className="text-lg font-bold">SAR {totalCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl shadow-card border border-slate-100/80">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} placeholder="Search by terminal, job ref, or container..." className="input-premium pl-10" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">{[1, 2, 3, 4, 5].map((i) => (<div key={i} className="flex items-center gap-4"><div className="h-4 w-6 skeleton rounded" /><div className="flex-1 h-4 skeleton rounded" /><div className="h-6 w-20 skeleton rounded-full" /></div>))}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-premium">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Terminal</th>
                    <th>Job Ref</th>
                    <th>Container #</th>
                    <th>Handling Type</th>
                    <th>Date</th>
                    <th className="text-right">Charges</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((rec, index) => (
                    <tr key={rec.id}>
                      <td className="text-sm text-slate-500 font-medium">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td><span className="text-sm font-medium text-slate-900 truncate max-w-[200px] block">{getTerminalName(rec.terminalId)}</span></td>
                      <td><span className="text-xs font-mono text-slate-500">{getJobRefNo(rec.jobRefId)}</span></td>
                      <td><span className="text-sm font-bold text-slate-900 font-mono">{rec.containerNo}</span></td>
                      <td><span className="text-sm text-slate-700">{rec.handlingType}</span></td>
                      <td><span className="text-sm text-slate-600">{formatDate(rec.date)}</span></td>
                      <td className="text-right"><span className="text-sm font-bold text-slate-900">SAR {(rec.charges || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                      <td className="text-center"><StatusBadge status={rec.status} /></td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            onClick={() => handleView(rec)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(rec)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(rec)}
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

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <Anchor className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">No records found</h3>
                <p className="text-sm text-slate-500">Try adjusting your search criteria.</p>
              </div>
            )}

            <Pagination currentPage={currentPage} totalPages={Math.ceil(filtered.length / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={filtered.length} />
          </>
        )}
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Port Handling Record" size="lg">
        {renderForm(handleCreateSubmit, false)}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedRecord(null); }} title="Edit Port Handling Record" size="lg">
        {renderForm(handleEditSubmit, true)}
      </Modal>

      {/* View Modal */}
      <Modal isOpen={showViewModal} onClose={() => { setShowViewModal(false); setSelectedRecord(null); }} title="Port Handling Details" size="lg">
        {selectedRecord && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Container No</p>
                <p className="text-sm font-bold text-slate-900 font-mono">{selectedRecord.containerNo}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Terminal</p>
                <p className="text-sm font-bold text-slate-900">{getTerminalName(selectedRecord.terminalId)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Job Reference</p>
                <p className="text-sm font-bold text-slate-900">{getJobRefNo(selectedRecord.jobRefId)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Date</p>
                <p className="text-sm font-bold text-slate-900">{formatDate(selectedRecord.date)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Handling Type</p>
                <p className="text-sm font-bold text-slate-900">{selectedRecord.handlingType || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                <StatusBadge status={selectedRecord.status} />
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Charges</p>
                <p className="text-lg font-bold text-emerald-600">SAR {(selectedRecord.charges || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-slate-700">{(selectedRecord as any).notes || '-'}</p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => { setShowViewModal(false); setSelectedRecord(null); }}
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

export default PortHandlingList;
