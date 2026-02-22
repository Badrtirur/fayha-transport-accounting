import React, { useEffect, useState } from 'react';
import {
  Eye,
  Edit3,
  Trash2,
  FileText,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { JobTitle } from '../../types';
import { jobTitlesApi, jobCategoriesApi } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';

const emptyForm = {
  name: '',
  nameAr: '',
  categoryId: '',
  description: '',
  status: 'Active',
};

const toastSuccess = (msg: string) =>
  toast.success(msg, { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
const toastError = (msg: string) =>
  toast.error(msg, { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });

const JobTitleList: React.FC = () => {
  const [titles, setTitles] = useState<JobTitle[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState<JobTitle | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([jobTitlesApi.getAll(), jobCategoriesApi.getAll()])
      .then(([titlesData, catsData]: any) => {
        setTitles(Array.isArray(titlesData) ? titlesData : []);
        setCategories(Array.isArray(catsData) ? catsData : []);
        setLoading(false);
      })
      .catch(() => {
        setTitles([]);
        setCategories([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find((c: any) => c.id === categoryId);
    return category ? category.name : '-';
  };

  const filtered = titles.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (t.name || '').toLowerCase().includes(q) ||
      getCategoryName(t.categoryId).toLowerCase().includes(q) ||
      (t.status || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handlers
  const handleAdd = () => {
    setFormData({ ...emptyForm });
    setShowAddModal(true);
  };

  const handleView = (title: JobTitle) => {
    setSelectedTitle(title);
    setShowViewModal(true);
  };

  const handleEdit = (title: JobTitle) => {
    setSelectedTitle(title);
    setFormData({
      name: title.name || '',
      nameAr: title.nameAr || '',
      categoryId: title.categoryId || '',
      description: (title as any).description || '',
      status: title.status || ((title as any).isActive === false ? 'Inactive' : 'Active'),
    });
    setShowEditModal(true);
  };

  const handleDelete = async (title: JobTitle) => {
    if (!window.confirm(`Are you sure you want to delete job title "${title.name}"? This action cannot be undone.`)) return;
    try {
      await jobTitlesApi.remove(title.id);
      toastSuccess('Job title deleted successfully');
      fetchData();
    } catch (err: any) {
      toastError(err?.message || 'Failed to delete job title');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await jobTitlesApi.create({
        name: formData.name,
        nameAr: formData.nameAr,
        categoryId: formData.categoryId,
        description: formData.description,
        status: formData.status,
        isActive: formData.status === 'Active',
      });
      toastSuccess('Job title created successfully');
      setShowAddModal(false);
      fetchData();
    } catch (err: any) {
      toastError(err?.message || 'Failed to create job title');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTitle) return;
    setSubmitting(true);
    try {
      await jobTitlesApi.update(selectedTitle.id, {
        name: formData.name,
        nameAr: formData.nameAr,
        categoryId: formData.categoryId,
        description: formData.description,
        status: formData.status,
        isActive: formData.status === 'Active',
      });
      toastSuccess('Job title updated successfully');
      setShowEditModal(false);
      setSelectedTitle(null);
      fetchData();
    } catch (err: any) {
      toastError(err?.message || 'Failed to update job title');
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
            placeholder="Job title name"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Name (Arabic)</label>
          <input
            type="text"
            value={formData.nameAr}
            onChange={(e) => handleFormChange('nameAr', e.target.value)}
            className="input-premium"
            placeholder="Arabic name"
            dir="rtl"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
          <select
            value={formData.categoryId}
            onChange={(e) => handleFormChange('categoryId', e.target.value)}
            className="input-premium"
            required
          >
            <option value="">Select category...</option>
            {categories.map((cat: any) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
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
          {submitting ? 'Saving...' : isEdit ? 'Update Job Title' : 'Create Job Title'}
        </button>
      </div>
    </form>
  );

  const handleExportJobTitles = () => {
    if (titles.length === 0) {
      toast.error('No job titles to export');
      return;
    }
    const headers = ['Name', 'Name (Arabic)', 'Category', 'Status'];
    const rows = titles.map(t => [
      t.name,
      t.nameAr || '',
      getCategoryName(t.categoryId),
      t.status,
    ]);
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-titles-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Job titles exported successfully');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Title"
        subtitle="Manage job titles and their associated categories."
        onAdd={handleAdd}
        onExport={handleExportJobTitles}
        onImport={() => toast.success('Import functionality coming soon')}
        addLabel="Add Title"
        showSearch={false}
      />

      {/* Search */}
      <div className="card-premium p-4">
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search job titles..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="input-premium pl-10"
          />
        </div>
      </div>

      <div className="card-premium overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-6 skeleton rounded" />
                <div className="flex-1 h-4 skeleton rounded" />
                <div className="h-4 w-28 skeleton rounded" />
                <div className="h-6 w-20 skeleton rounded-full" />
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
                    <th>Category</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((title, index) => (
                    <tr key={title.id}>
                      <td className="text-sm text-slate-500 font-medium">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td>
                        <span className="text-sm font-bold text-slate-900">
                          {title.name}
                        </span>
                      </td>
                      <td>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600">
                          {getCategoryName(title.categoryId)}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={title.status} />
                      </td>
                      <td>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => handleView(title)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(title)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(title)}
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
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">No job titles found</h3>
                <p className="text-sm text-slate-500">Add your first job title to get started.</p>
              </div>
            )}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filtered.length}
            />
          </>
        )}
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Job Title">
        {renderForm(handleCreateSubmit, false)}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedTitle(null); }} title="Edit Job Title">
        {renderForm(handleEditSubmit, true)}
      </Modal>

      {/* View Modal */}
      <Modal isOpen={showViewModal} onClose={() => { setShowViewModal(false); setSelectedTitle(null); }} title="Job Title Details">
        {selectedTitle && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Name</p>
                <p className="text-sm font-bold text-slate-900">{selectedTitle.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Name (Arabic)</p>
                <p className="text-sm font-bold text-slate-900" dir="rtl">{selectedTitle.nameAr || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Category</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600">
                  {getCategoryName(selectedTitle.categoryId)}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                <StatusBadge status={selectedTitle.status} />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm text-slate-700">{(selectedTitle as any).description || '-'}</p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => { setShowViewModal(false); setSelectedTitle(null); }}
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

export default JobTitleList;
