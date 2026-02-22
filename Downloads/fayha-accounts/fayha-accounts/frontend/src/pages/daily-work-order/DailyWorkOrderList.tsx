import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Search,
  ClipboardList,
  Clock,
  LoaderCircle,
  CheckCircle2,
  Edit2,
  Trash2,
  Plus,
  X,
  Play,
  CheckCheck,
} from 'lucide-react';
import type { DailyWorkOrder } from '../../types';
import { dailyWorkOrdersApi, jobReferencesApi } from '../../services/api';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';


const priorityColors: Record<string, { bg: string; text: string }> = {
  Low: { bg: 'bg-blue-50', text: 'text-blue-700' },
  Medium: { bg: 'bg-amber-50', text: 'text-amber-700' },
  High: { bg: 'bg-rose-50', text: 'text-rose-700' },
};

const DailyWorkOrderList: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<DailyWorkOrder[]>([]);
  const [jobRefs, setJobRefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formDescription, setFormDescription] = useState('');
  const [formAssignedTo, setFormAssignedTo] = useState('');
  const [formPriority, setFormPriority] = useState('Medium');
  const [formStatus, setFormStatus] = useState('Pending');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const itemsPerPage = 8;

  useEffect(() => {
    Promise.all([dailyWorkOrdersApi.getAll(), jobReferencesApi.getAll()]).then(([woData, jrData]: any) => {
      setWorkOrders(Array.isArray(woData) ? woData : []);
      setJobRefs(Array.isArray(jrData) ? jrData : []);
      setLoading(false);
    }).catch(() => { setWorkOrders([]); setLoading(false); });
  }, []);

  const handleSaveWorkOrder = async () => {
    if (!formDescription || !formAssignedTo) {
      toast.error('Please fill in description and assigned to.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }
    setSaving(true);
    const payload = {
      date: new Date().toISOString().split('T')[0],
      assignedTo: formAssignedTo,
      description: formDescription,
      priority: formPriority,
      status: editingId ? undefined : formStatus,
    };
    try {
      if (editingId) {
        const updated = await dailyWorkOrdersApi.update(editingId, payload);
        setWorkOrders(prev => prev.map(wo => wo.id === editingId ? updated : wo));
        toast.success('Work order updated successfully!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      } else {
        const created = await dailyWorkOrdersApi.create(payload);
        setWorkOrders(prev => [...prev, created]);
        toast.success('Work order created successfully!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      }
      setShowModal(false);
      setEditingId(null);
      setFormDescription(''); setFormAssignedTo(''); setFormPriority('Medium'); setFormStatus('Pending');
    } catch {
      toast.error('Failed to save work order.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await dailyWorkOrdersApi.update(id, { status: newStatus });
      setWorkOrders(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } as any : item));
      toast.success(`Status updated to ${newStatus}`, { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    } catch {
      toast.error('Failed to update status', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    }
  };

  const handleEditWorkOrder = (wo: DailyWorkOrder) => {
    setEditingId(wo.id);
    setFormAssignedTo(wo.assignedTo || '');
    setFormDescription(wo.description || '');
    setFormPriority(wo.priority || 'Medium');
    setFormStatus(wo.status || 'Pending');
    setShowModal(true);
  };

  const handleDeleteWorkOrder = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this work order?')) return;
    try {
      await dailyWorkOrdersApi.remove(id);
      setWorkOrders(prev => prev.filter(wo => wo.id !== id));
      toast.success('Work order deleted successfully!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    } catch {
      toast.error('Failed to delete work order.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    }
  };

  const formatDate = (d: any): string => {
    if (!d) return '-';
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return String(d);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return String(d); }
  };

  const getJobRefNo = (jobRefId: string): string => {
    const job = jobRefs.find((j: any) => j.id === jobRefId);
    return job ? (job.jobRefNo || (job as any).jobNumber || '-') : '-';
  };

  const filtered = workOrders.filter((wo) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (wo.orderNo || '').toLowerCase().includes(q) ||
      (wo.assignedTo || '').toLowerCase().includes(q) ||
      (wo.description || '').toLowerCase().includes(q) ||
      getJobRefNo(wo.jobRefId).toLowerCase().includes(q)
    );
  });

  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalOrders = workOrders.length;
  const pendingCount = workOrders.filter((w) => w.status === 'Pending').length;
  const inProgressCount = workOrders.filter((w) => w.status === 'In Progress').length;
  const completedCount = workOrders.filter((w) => w.status === 'Completed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Daily Work Orders</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage daily work orders, assign tasks, and track progress.</p>
        </div>
        <button onClick={() => { setEditingId(null); setFormDescription(''); setFormAssignedTo(''); setFormPriority('Medium'); setFormStatus('Pending'); setShowModal(true); }} className="btn-primary">
          <Plus className="h-4 w-4" />
          Add Work Order
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><ClipboardList className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Total Orders</p>
              <p className="text-2xl font-bold">{totalOrders}</p>
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
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><LoaderCircle className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">In Progress</p>
              <p className="text-2xl font-bold">{inProgressCount}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><CheckCircle2 className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Completed</p>
              <p className="text-2xl font-bold">{completedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl shadow-card border border-slate-100/80">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} placeholder="Search by order #, assigned to, or description..." className="input-premium pl-10" />
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
                    <th>Order #</th>
                    <th>Date</th>
                    <th>Job Ref</th>
                    <th>Assigned To</th>
                    <th>Description</th>
                    <th className="text-center">Priority</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((wo, index) => {
                    const pColor = priorityColors[wo.priority] || { bg: 'bg-slate-50', text: 'text-slate-600' };
                    return (
                      <tr key={wo.id}>
                        <td className="text-sm text-slate-500 font-medium">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                        <td><span className="text-sm font-bold text-slate-900 font-mono">{wo.orderNo}</span></td>
                        <td><span className="text-sm text-slate-600">{formatDate(wo.date)}</span></td>
                        <td><span className="text-xs font-mono text-slate-500">{getJobRefNo(wo.jobRefId)}</span></td>
                        <td><span className="text-sm text-slate-700">{wo.assignedTo}</span></td>
                        <td><span className="text-sm text-slate-600 truncate max-w-[250px] block">{wo.description}</span></td>
                        <td className="text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${pColor.bg} ${pColor.text}`}>
                            {wo.priority}
                          </span>
                        </td>
                        <td className="text-center"><StatusBadge status={wo.status} /></td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {wo.status === 'Pending' && (
                              <button onClick={() => handleStatusChange(wo.id, 'In Progress')} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Start">
                                <Play className="h-4 w-4" />
                              </button>
                            )}
                            {wo.status === 'In Progress' && (
                              <button onClick={() => handleStatusChange(wo.id, 'Completed')} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all" title="Complete">
                                <CheckCheck className="h-4 w-4" />
                              </button>
                            )}
                            <button onClick={() => handleEditWorkOrder(wo)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Edit">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDeleteWorkOrder(wo.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">No work orders found</h3>
                <p className="text-sm text-slate-500">Try adjusting your search criteria.</p>
              </div>
            )}

            <Pagination currentPage={currentPage} totalPages={Math.ceil(filtered.length / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={filtered.length} />
          </>
        )}
      </div>
      {/* Add Work Order Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Work Order' : 'Add Work Order'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Assigned To<span className="text-rose-500 ml-0.5">*</span></label>
                <input type="text" className="input-premium w-full" placeholder="Person name..." value={formAssignedTo} onChange={(e) => setFormAssignedTo(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Priority</label>
                <select className="input-premium w-full" value={formPriority} onChange={(e) => setFormPriority(e.target.value)}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Description<span className="text-rose-500 ml-0.5">*</span></label>
                <textarea className="input-premium w-full resize-none" rows={3} placeholder="Work order description..." value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => { setShowModal(false); setEditingId(null); }} className="btn-ghost">Cancel</button>
              <button onClick={handleSaveWorkOrder} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyWorkOrderList;
