import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Plus,
  Anchor,
  Edit2,
  Trash2,
  X,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import type { Terminal } from '../../types';
import { terminalsApi } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';


const terminalTypeColors: Record<string, { bg: string; text: string }> = {
  Container: { bg: 'bg-blue-50', text: 'text-blue-700' },
  Bulk: { bg: 'bg-amber-50', text: 'text-amber-700' },
  General: { bg: 'bg-purple-50', text: 'text-purple-700' },
};

const TerminalList: React.FC = () => {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formNameAr, setFormNameAr] = useState('');
  const [formPort, setFormPort] = useState('');
  const [formType, setFormType] = useState('Container');
  const [formStatus, setFormStatus] = useState('Active');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    terminalsApi.getAll().then((data: any) => {
      setTerminals(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => { setTerminals([]); setLoading(false); });
  }, []);

  const handleEdit = (terminal: Terminal) => {
    setEditingId(terminal.id);
    setFormCode(terminal.code || '');
    setFormName(terminal.name || '');
    setFormNameAr(terminal.nameAr || '');
    setFormPort(terminal.port || '');
    setFormType(terminal.type || 'Container');
    setFormStatus(terminal.status || ((terminal as any).isActive === false ? 'Inactive' : 'Active'));
    setShowModal(true);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await terminalsApi.update(id, { status: newStatus, isActive: newStatus === 'Active' });
      setTerminals(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } as any : item));
      toast.success(`Status updated to ${newStatus}`, { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    } catch {
      toast.error('Failed to update status', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this terminal?')) return;
    try {
      await terminalsApi.remove(id);
      setTerminals(prev => prev.filter(t => t.id !== id));
      toast.success('Terminal deleted successfully!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    } catch {
      toast.error('Failed to delete terminal.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Terminals</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage port terminals and handling facilities.</p>
        </div>
        <button onClick={() => { setEditingId(null); setFormCode(''); setFormName(''); setFormNameAr(''); setFormPort(''); setFormType('Container'); setFormStatus('Active'); setShowModal(true); }} className="btn-primary">
          <Plus className="h-4 w-4" />
          Add Terminal
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-12 skeleton rounded" />
                <div className="flex-1 h-4 skeleton rounded" />
                <div className="h-4 w-28 skeleton rounded" />
                <div className="h-6 w-20 skeleton rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Name (AR)</th>
                  <th>Port</th>
                  <th className="text-center">Type</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {terminals.map((terminal, index) => {
                  const typeColor = terminalTypeColors[terminal.type] || { bg: 'bg-slate-50', text: 'text-slate-600' };
                  return (
                    <tr key={terminal.id}>
                      <td className="text-sm text-slate-500 font-medium">{index + 1}</td>
                      <td><span className="text-sm font-bold text-slate-900 font-mono">{terminal.code}</span></td>
                      <td><span className="text-sm font-medium text-slate-900">{terminal.name}</span></td>
                      <td><span className="text-sm text-slate-600" dir="rtl">{terminal.nameAr || '-'}</span></td>
                      <td><span className="text-sm text-slate-600">{terminal.port}</span></td>
                      <td className="text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${typeColor.bg} ${typeColor.text}`}>
                          {terminal.type}
                        </span>
                      </td>
                      <td className="text-center"><StatusBadge status={terminal.status} /></td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleStatusChange(terminal.id, terminal.status === 'Active' ? 'Inactive' : 'Active')}
                            className="p-2 rounded-xl transition-all"
                            title="Toggle Status"
                          >
                            {terminal.status === 'Active' ? <ToggleRight className="h-5 w-5 text-green-600" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                          </button>
                          <button onClick={() => handleEdit(terminal)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Edit">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(terminal.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Delete">
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
        )}

        {!loading && terminals.length === 0 && (
          <div className="text-center py-16">
            <Anchor className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">No terminals found</h3>
            <p className="text-sm text-slate-500">Add your first terminal to get started.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Terminal' : 'Add Terminal'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Code</label>
                <input type="text" className="input-premium" placeholder="e.g. JIP-CT" value={formCode} onChange={(e) => setFormCode(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Name (EN)</label>
                <input type="text" className="input-premium" placeholder="Terminal name..." value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Name (AR)</label>
                <input type="text" className="input-premium" dir="rtl" placeholder="اسم المحطة..." value={formNameAr} onChange={(e) => setFormNameAr(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Port</label>
                <input type="text" className="input-premium" placeholder="Port name..." value={formPort} onChange={(e) => setFormPort(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Type</label>
                <select className="input-premium" value={formType} onChange={(e) => setFormType(e.target.value)}>
                  <option value="Container">Container</option>
                  <option value="Bulk">Bulk</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button disabled={saving} onClick={async () => {
                if (!formName) {
                  toast.error('Please fill in the terminal name.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
                  return;
                }
                setSaving(true);
                const payload = {
                  code: formCode,
                  name: formName,
                  nameAr: formNameAr,
                  port: formPort,
                  type: formType,
                  status: formStatus,
                  isActive: formStatus === 'Active',
                };
                try {
                  if (editingId) {
                    const updated = await terminalsApi.update(editingId, payload);
                    setTerminals(prev => prev.map(t => t.id === editingId ? updated : t));
                    toast.success('Terminal updated successfully!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
                  } else {
                    const created = await terminalsApi.create(payload);
                    setTerminals(prev => [...prev, created]);
                    toast.success('Terminal created successfully!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
                  }
                  setShowModal(false);
                  setEditingId(null);
                  setFormCode(''); setFormName(''); setFormNameAr(''); setFormPort(''); setFormType('Container'); setFormStatus('Active');
                } catch {
                  toast.error('Failed to save terminal.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
                } finally {
                  setSaving(false);
                }
              }} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TerminalList;
