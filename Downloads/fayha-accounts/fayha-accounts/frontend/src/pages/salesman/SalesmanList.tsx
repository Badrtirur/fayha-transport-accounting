import React, { useEffect, useState } from 'react';
import {
  Search,
  UserRound,
  Eye,
  Edit3,
  Trash2,
  Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Salesman } from '../../types';
import { salesmenApi } from '../../services/api';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  code: '',
  commission: '',
  status: 'Active',
};

const toastSuccess = (msg: string) =>
  toast.success(msg, { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
const toastError = (msg: string) =>
  toast.error(msg, { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });

const SalesmanList: React.FC = () => {
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 8;

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSalesman, setSelectedSalesman] = useState<Salesman | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = () => {
    setLoading(true);
    salesmenApi.getAll()
      .then((data: any) => {
        setSalesmen(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setSalesmen([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = salesmen.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.code || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q)
    );
  });

  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handlers
  const handleAdd = () => {
    setFormData({ ...emptyForm });
    setShowAddModal(true);
  };

  const handleView = (sm: Salesman) => {
    setSelectedSalesman(sm);
    setShowViewModal(true);
  };

  const handleEdit = (sm: Salesman) => {
    setSelectedSalesman(sm);
    setFormData({
      name: sm.name || '',
      email: sm.email || '',
      phone: sm.phone || '',
      code: sm.code || '',
      commission: String(sm.commission || ''),
      status: (sm as any).status || ((sm as any).isActive === false ? 'Inactive' : 'Active'),
    });
    setShowEditModal(true);
  };

  const handleDelete = async (sm: Salesman) => {
    if (!window.confirm(`Are you sure you want to delete salesman "${sm.name}"? This action cannot be undone.`)) return;
    try {
      await salesmenApi.remove(sm.id);
      toastSuccess('Salesman deleted successfully');
      fetchData();
    } catch (err: any) {
      toastError(err?.message || 'Failed to delete salesman');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await salesmenApi.create({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        code: formData.code,
        commission: parseFloat(formData.commission) || 0,
        status: formData.status,
        isActive: formData.status === 'Active',
      });
      toastSuccess('Salesman created successfully');
      setShowAddModal(false);
      fetchData();
    } catch (err: any) {
      toastError(err?.message || 'Failed to create salesman');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalesman) return;
    setSubmitting(true);
    try {
      await salesmenApi.update(selectedSalesman.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        code: formData.code,
        commission: parseFloat(formData.commission) || 0,
        status: formData.status,
        isActive: formData.status === 'Active',
      });
      toastSuccess('Salesman updated successfully');
      setShowEditModal(false);
      setSelectedSalesman(null);
      fetchData();
    } catch (err: any) {
      toastError(err?.message || 'Failed to update salesman');
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
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleFormChange('name', e.target.value)}
            className="input-premium"
            placeholder="Full name"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Code</label>
          <input
            type="text"
            value={formData.code}
            onChange={(e) => handleFormChange('code', e.target.value)}
            className="input-premium"
            placeholder="SM-001"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleFormChange('email', e.target.value)}
            className="input-premium"
            placeholder="email@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone</label>
          <input
            type="text"
            value={formData.phone}
            onChange={(e) => handleFormChange('phone', e.target.value)}
            className="input-premium"
            placeholder="+966 5XX XXX XXXX"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Commission (%)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={formData.commission}
            onChange={(e) => handleFormChange('commission', e.target.value)}
            className="input-premium"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
          <select
            value={formData.status}
            onChange={(e) => handleFormChange('status', e.target.value)}
            className="input-premium"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
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
          {submitting ? 'Saving...' : isEdit ? 'Update Salesman' : 'Create Salesman'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Salesmen</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage salesman records, commissions, and performance.</p>
        </div>
        <button className="btn-primary" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          Add Salesman
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl shadow-card border border-slate-100/80">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search by name, code, or email..."
            className="input-premium pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-6 skeleton rounded" />
                <div className="flex-1 h-4 skeleton rounded" />
                <div className="h-4 w-28 skeleton rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-premium">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th className="text-center">Commission %</th>
                    <th className="text-right">Total Sales</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((sm, index) => (
                    <tr key={sm.id}>
                      <td className="text-sm text-slate-500 font-medium">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <UserRound className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-semibold text-slate-900">{sm.name}</span>
                        </div>
                      </td>
                      <td><span className="text-sm font-mono text-slate-600">{sm.code}</span></td>
                      <td><span className="text-sm text-slate-600">{sm.phone}</span></td>
                      <td><span className="text-sm text-slate-600">{sm.email}</span></td>
                      <td className="text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700">
                          {sm.commission}%
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="text-sm font-bold text-slate-900">
                          SAR {(sm.totalSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            onClick={() => handleView(sm)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(sm)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(sm)}
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
                <UserRound className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">No salesmen found</h3>
                <p className="text-sm text-slate-500">Try adjusting your search criteria.</p>
              </div>
            )}

            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filtered.length / itemsPerPage)}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filtered.length}
            />
          </>
        )}
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Salesman">
        {renderForm(handleCreateSubmit, false)}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedSalesman(null); }} title="Edit Salesman">
        {renderForm(handleEditSubmit, true)}
      </Modal>

      {/* View Modal */}
      <Modal isOpen={showViewModal} onClose={() => { setShowViewModal(false); setSelectedSalesman(null); }} title="Salesman Details">
        {selectedSalesman && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <UserRound className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{selectedSalesman.name}</p>
                <p className="text-sm text-slate-500 font-mono">{selectedSalesman.code}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Email</p>
                <p className="text-sm font-bold text-slate-900">{selectedSalesman.email || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Phone</p>
                <p className="text-sm font-bold text-slate-900">{selectedSalesman.phone || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Commission</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700">
                  {selectedSalesman.commission}%
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  (selectedSalesman as any).status === 'Active'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {(selectedSalesman as any).status || 'Active'}
                </span>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Sales</p>
                <p className="text-lg font-bold text-emerald-600">
                  SAR {(selectedSalesman.totalSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => { setShowViewModal(false); setSelectedSalesman(null); }}
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

export default SalesmanList;
