import React, { useState, useEffect } from 'react';
import { Eye, Edit2, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { JobCategory } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { jobCategoriesApi } from '../../services/api';
import toast from 'react-hot-toast';

interface CategoryForm {
    name: string;
    nameAr: string;
    description: string;
    status: 'Active' | 'Inactive';
}

const emptyForm: CategoryForm = {
    name: '',
    nameAr: '',
    description: '',
    status: 'Active',
};

const JobCategoryList: React.FC = () => {
    const [categories, setCategories] = useState<JobCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<JobCategory | null>(null);
    const [viewingCategory, setViewingCategory] = useState<JobCategory | null>(null);
    const [formData, setFormData] = useState<CategoryForm>(emptyForm);
    const [submitting, setSubmitting] = useState(false);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const data = await jobCategoriesApi.getAll();
            setCategories(data || []);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to load job categories');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const openAddModal = () => {
        setEditingCategory(null);
        setFormData({ ...emptyForm });
        setModalOpen(true);
    };

    const openEditModal = (category: JobCategory) => {
        setEditingCategory(category);
        setFormData({
            name: category.name || '',
            nameAr: category.nameAr || '',
            description: (category as any).description || '',
            status: category.status || ((category as any).isActive === false ? 'Inactive' : 'Active'),
        });
        setModalOpen(true);
    };

    const openViewModal = (category: JobCategory) => {
        setViewingCategory(category);
        setViewModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error('Category name is required');
            return;
        }
        try {
            setSubmitting(true);
            if (editingCategory) {
                await jobCategoriesApi.update(editingCategory.id, { ...formData, isActive: formData.status === 'Active' });
                toast.success('Category updated successfully');
            } else {
                await jobCategoriesApi.create({ ...formData, isActive: formData.status === 'Active' });
                toast.success('Category added successfully');
            }
            setModalOpen(false);
            fetchCategories();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save category');
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await jobCategoriesApi.update(id, { status: newStatus, isActive: newStatus === 'Active' });
            setCategories(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } as any : item));
            toast.success(`Status updated to ${newStatus}`);
        } catch {
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async (category: JobCategory) => {
        if (!window.confirm(`Are you sure you want to delete "${category.name}"? This action cannot be undone.`)) {
            return;
        }
        try {
            await jobCategoriesApi.remove(category.id);
            toast.success('Category deleted successfully');
            fetchCategories();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to delete category');
        }
    };

    const handleExport = () => {
        if (categories.length === 0) {
            toast.error('No data to export');
            return;
        }
        const headers = ['ID', 'Name', 'Name (Arabic)', 'Status'];
        const rows = categories.map(c => [
            c.id,
            c.name,
            c.nameAr || '',
            c.status,
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `job-categories-export-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Categories exported');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Job Category"
                subtitle="Manage job categories for clearance operations."
                onAdd={openAddModal}
                onExport={handleExport}
                onImport={() => toast.success('Import feature coming soon')}
                addLabel="Add Category"
                showSearch={false}
            />

            <div className="card-premium overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table-premium">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Name</th>
                                <th>Name (Arabic)</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-12">
                                        <div className="animate-spin h-6 w-6 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
                                        <p className="text-sm text-slate-500">Loading categories...</p>
                                    </td>
                                </tr>
                            ) : categories.map((category, index) => (
                                <tr key={category.id}>
                                    <td className="text-sm text-slate-500 font-medium">
                                        {index + 1}
                                    </td>
                                    <td>
                                        <span className="text-sm font-bold text-slate-900">
                                            {category.name}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="text-sm text-slate-600" dir="rtl">
                                            {category.nameAr || '-'}
                                        </span>
                                    </td>
                                    <td>
                                        <StatusBadge status={category.status} />
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleStatusChange(category.id, category.status === 'Active' ? 'Inactive' : 'Active')}
                                                className="p-2 rounded-xl transition-all"
                                                title="Toggle Status"
                                            >
                                                {category.status === 'Active' ? <ToggleRight className="h-5 w-5 text-green-600" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                                            </button>
                                            <button
                                                onClick={() => openViewModal(category)}
                                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                                title="View"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => openEditModal(category)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                title="Edit"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(category)}
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

                {!loading && categories.length === 0 && (
                    <div className="text-center py-16">
                        <Plus className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-900 mb-1">No categories found</h3>
                        <p className="text-sm text-slate-500">Add your first job category to get started.</p>
                    </div>
                )}
            </div>

            {/* Add / Edit Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingCategory ? 'Edit Category' : 'Add Category'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Name *</label>
                        <input name="name" value={formData.name} onChange={handleChange} className="input-premium w-full" placeholder="e.g. Customs Clearance" required />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Name (Arabic)</label>
                        <input name="nameAr" value={formData.nameAr} onChange={handleChange} className="input-premium w-full" placeholder="e.g. تخليص جمركي" dir="rtl" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} className="input-premium w-full" placeholder="Optional description" rows={3} />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting} className="btn-primary px-6 py-2 text-sm font-semibold rounded-xl disabled:opacity-50">
                            {submitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Add Category'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* View Detail Modal */}
            <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Category Details">
                {viewingCategory && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">ID</p>
                                <p className="text-sm font-bold text-slate-900">{viewingCategory.id}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</p>
                                <StatusBadge status={viewingCategory.status} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Name</p>
                                <p className="text-sm font-bold text-slate-900">{viewingCategory.name}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Name (Arabic)</p>
                                <p className="text-sm text-slate-700" dir="rtl">{viewingCategory.nameAr || '-'}</p>
                            </div>
                        </div>
                        {(viewingCategory as any).description && (
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Description</p>
                                <p className="text-sm text-slate-700">{(viewingCategory as any).description}</p>
                            </div>
                        )}
                        <div className="flex justify-end pt-4 border-t border-slate-100">
                            <button onClick={() => setViewModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default JobCategoryList;
