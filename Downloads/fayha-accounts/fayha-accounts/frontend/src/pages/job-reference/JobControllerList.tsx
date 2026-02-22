import React, { useState, useEffect } from 'react';
import { Eye, Edit2, Users, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { JobController } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import { jobControllersApi } from '../../services/api';
import toast from 'react-hot-toast';

interface ControllerForm {
    name: string;
    email: string;
    phone: string;
    department: string;
    status: 'Active' | 'Inactive';
}

const emptyForm: ControllerForm = {
    name: '',
    email: '',
    phone: '',
    department: '',
    status: 'Active',
};

const roleColors: Record<string, string> = {
    Administrator: 'bg-purple-50 text-purple-700 border-purple-200',
    Manager: 'bg-blue-50 text-blue-700 border-blue-200',
    Specialist: 'bg-amber-50 text-amber-700 border-amber-200',
    Coordinator: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const JobControllerList: React.FC = () => {
    const [controllers, setControllers] = useState<JobController[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editingController, setEditingController] = useState<JobController | null>(null);
    const [viewingController, setViewingController] = useState<JobController | null>(null);
    const [formData, setFormData] = useState<ControllerForm>(emptyForm);
    const [submitting, setSubmitting] = useState(false);

    const fetchControllers = async () => {
        try {
            setLoading(true);
            const data = await jobControllersApi.getAll();
            setControllers(data || []);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to load job controllers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchControllers();
    }, []);

    const openAddModal = () => {
        setEditingController(null);
        setFormData({ ...emptyForm });
        setModalOpen(true);
    };

    const openEditModal = (controller: JobController) => {
        setEditingController(controller);
        setFormData({
            name: controller.name || '',
            email: (controller as any).email || '',
            phone: (controller as any).phone || '',
            department: (controller as any).department || '',
            status: (controller as any).status || 'Active',
        });
        setModalOpen(true);
    };

    const openViewModal = (controller: JobController) => {
        setViewingController(controller);
        setViewModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error('Controller name is required');
            return;
        }
        try {
            setSubmitting(true);
            if (editingController) {
                await jobControllersApi.update(editingController.id, formData);
                toast.success('Controller updated successfully');
            } else {
                await jobControllersApi.create(formData);
                toast.success('Controller added successfully');
            }
            setModalOpen(false);
            fetchControllers();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save controller');
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await jobControllersApi.update(id, { status: newStatus });
            setControllers(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } as any : item));
            toast.success(`Status updated to ${newStatus}`);
        } catch {
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async (controller: JobController) => {
        if (!window.confirm(`Are you sure you want to delete "${controller.name}"? This action cannot be undone.`)) {
            return;
        }
        try {
            await jobControllersApi.remove(controller.id);
            toast.success('Controller deleted successfully');
            fetchControllers();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to delete controller');
        }
    };

    const handleExport = () => {
        if (controllers.length === 0) {
            toast.error('No data to export');
            return;
        }
        const headers = ['ID', 'Name', 'Email', 'Phone', 'Department', 'Role', 'Assigned Jobs', 'Status'];
        const rows = controllers.map(c => [
            c.id,
            c.name,
            (c as any).email || '',
            (c as any).phone || '',
            (c as any).department || '',
            c.role || '',
            String(c.assignedJobs || 0),
            (c as any).status || '',
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `job-controllers-export-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Controllers exported');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Job Controller"
                subtitle="Manage controller assignments and job distribution."
                onAdd={openAddModal}
                onExport={handleExport}
                onImport={() => toast.success('Import feature coming soon')}
                addLabel="Add Controller"
                showSearch={false}
            />

            <div className="card-premium overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table-premium">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Name</th>
                                <th>Role</th>
                                <th>Assigned Jobs</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-12">
                                        <div className="animate-spin h-6 w-6 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
                                        <p className="text-sm text-slate-500">Loading controllers...</p>
                                    </td>
                                </tr>
                            ) : controllers.map((controller, index) => (
                                <tr key={controller.id}>
                                    <td className="text-sm text-slate-500 font-medium">
                                        {index + 1}
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center text-slate-500 text-xs font-bold">
                                                {controller.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                                            </div>
                                            <span className="text-sm font-bold text-slate-900">
                                                {controller.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                            roleColors[controller.role] || 'bg-slate-50 text-slate-600 border-slate-200'
                                        }`}>
                                            {controller.role || '-'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-900">
                                                {controller.assignedJobs || 0}
                                            </span>
                                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                                                    style={{ width: `${Math.min(((controller.assignedJobs || 0) / 40) * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleStatusChange(controller.id, (controller as any).status === 'Active' ? 'Inactive' : 'Active')}
                                                className="p-2 rounded-xl transition-all"
                                                title="Toggle Status"
                                            >
                                                {(controller as any).status === 'Active' ? <ToggleRight className="h-5 w-5 text-green-600" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                                            </button>
                                            <button
                                                onClick={() => openViewModal(controller)}
                                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                                title="View"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => openEditModal(controller)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                title="Edit"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(controller)}
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

                {!loading && controllers.length === 0 && (
                    <div className="text-center py-16">
                        <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-900 mb-1">No controllers found</h3>
                        <p className="text-sm text-slate-500">Add your first job controller to get started.</p>
                    </div>
                )}
            </div>

            {/* Add / Edit Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingController ? 'Edit Controller' : 'Add Controller'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Name *</label>
                        <input name="name" value={formData.name} onChange={handleChange} className="input-premium w-full" placeholder="e.g. John Doe" required />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                        <input name="email" type="email" value={formData.email} onChange={handleChange} className="input-premium w-full" placeholder="e.g. john@fayha.com" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
                        <input name="phone" value={formData.phone} onChange={handleChange} className="input-premium w-full" placeholder="e.g. +966 5xx xxx xxx" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Department</label>
                        <input name="department" value={formData.department} onChange={handleChange} className="input-premium w-full" placeholder="e.g. Operations" />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting} className="btn-primary px-6 py-2 text-sm font-semibold rounded-xl disabled:opacity-50">
                            {submitting ? 'Saving...' : editingController ? 'Update Controller' : 'Add Controller'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* View Detail Modal */}
            <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Controller Details">
                {viewingController && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                                {viewingController.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-slate-900">{viewingController.name}</h4>
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                    roleColors[viewingController.role] || 'bg-slate-50 text-slate-600 border-slate-200'
                                }`}>
                                    {viewingController.role || '-'}
                                </span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">ID</p>
                                <p className="text-sm font-bold text-slate-900">{viewingController.id}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Assigned Jobs</p>
                                <p className="text-sm font-bold text-slate-900">{viewingController.assignedJobs || 0}</p>
                            </div>
                            {(viewingController as any).email && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email</p>
                                    <p className="text-sm text-slate-700">{(viewingController as any).email}</p>
                                </div>
                            )}
                            {(viewingController as any).phone && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Phone</p>
                                    <p className="text-sm text-slate-700">{(viewingController as any).phone}</p>
                                </div>
                            )}
                            {(viewingController as any).department && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Department</p>
                                    <p className="text-sm text-slate-700">{(viewingController as any).department}</p>
                                </div>
                            )}
                            {(viewingController as any).status && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</p>
                                    <p className="text-sm text-slate-700">{(viewingController as any).status}</p>
                                </div>
                            )}
                        </div>
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

export default JobControllerList;
