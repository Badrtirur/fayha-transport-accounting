import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Users,
  UserPlus,
  Award,
  Trophy,
  Eye,
  Edit2,
  Trash2,
  X,
  ArrowRight,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { CRMLead } from '../../types';
import { crmLeadsApi } from '../../services/api';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';

const isValidPhone = (phone: string): boolean => {
  if (!phone) return true;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^(\+?\d{7,15})$/.test(cleaned);
};

const isValidEmail = (email: string): boolean => {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const statusTabs = ['All', 'New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'] as const;

const crmStatusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  New: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
  Contacted: { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  Qualified: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500' },
  Proposal: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  Won: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  Lost: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' },
};

const CRMPage: React.FC = () => {
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formCompany, setFormCompany] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSource, setFormSource] = useState('Website');
  const [, setFormStatus] = useState('New');
  const itemsPerPage = 8;

  useEffect(() => {
    crmLeadsApi.getAll().then((data: any) => {
      setLeads(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => { setLeads([]); setLoading(false); });
  }, []);

  const resetForm = () => {
    setFormCompany(''); setFormContactPerson(''); setFormEmail(''); setFormPhone('');
    setFormSource('Website'); setFormStatus('New'); setEditingId(null);
  };

  const handleOpenEdit = (lead: CRMLead) => {
    setEditingId(lead.id);
    setFormCompany(lead.company || '');
    setFormContactPerson(lead.name || '');
    setFormEmail(lead.email || '');
    setFormPhone(lead.phone || '');
    setFormSource(lead.source || 'Website');
    setFormStatus(lead.status || 'New');
    setShowModal(true);
  };

  const crmStatusFlow: Record<string, string> = {
    New: 'Contacted',
    Contacted: 'Qualified',
    Qualified: 'Proposal',
    Proposal: 'Won',
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await crmLeadsApi.update(id, { status: newStatus });
      setLeads(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } as any : item));
      toast.success(`Status updated to ${newStatus}`, { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    } catch {
      toast.error('Failed to update status', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    }
  };

  const handleDelete = async (lead: CRMLead) => {
    if (!window.confirm(`Are you sure you want to delete lead "${lead.company}"? This action cannot be undone.`)) return;
    try {
      await crmLeadsApi.remove(lead.id);
      setLeads(prev => prev.filter(l => l.id !== lead.id));
      toast.success('Lead deleted successfully!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    } catch {
      toast.error('Failed to delete lead.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    }
  };

  const handleSaveLead = async () => {
    if (!formCompany.trim() || !formContactPerson.trim()) {
      toast.error('Please fill in company and contact name.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }
    if (formEmail && !isValidEmail(formEmail)) {
      toast.error('Please enter a valid email address.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }
    if (formPhone && !isValidPhone(formPhone)) {
      toast.error('Please enter a valid phone number (e.g. +966 5X XXX XXXX).', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }
    setSaving(true);
    const payload = {
      name: formContactPerson,
      company: formCompany,
      email: formEmail,
      phone: formPhone,
      source: formSource,
      status: editingId ? undefined : 'New',
      assignedTo: 'Unassigned',
    };
    try {
      if (editingId) {
        const updated = await crmLeadsApi.update(editingId, payload);
        setLeads(prev => prev.map(l => l.id === editingId ? { ...l, ...updated } : l));
        toast.success('Lead updated successfully!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      } else {
        const created = await crmLeadsApi.create(payload);
        setLeads(prev => [...prev, created]);
        toast.success('Lead added successfully!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      }
      setShowModal(false);
      resetForm();
    } catch {
      toast.error('Failed to save lead.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    } finally {
      setSaving(false);
    }
  };

  const filtered = leads
    .filter((l) => activeTab === 'All' || l.status === activeTab)
    .filter((l) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (l.company || '').toLowerCase().includes(q) ||
        (l.name || '').toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q)
      );
    });

  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.status === 'New').length;
  const qualifiedLeads = leads.filter((l) => l.status === 'Qualified').length;
  const wonLeads = leads.filter((l) => l.status === 'Won').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CRM Pipeline</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage leads, track pipeline, and close deals.</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary">
          <Plus className="h-4 w-4" />
          Add New Lead
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Total Leads</p>
              <p className="text-2xl font-bold">{totalLeads}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">New</p>
              <p className="text-2xl font-bold">{newLeads}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-lg shadow-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Qualified</p>
              <p className="text-2xl font-bold">{qualifiedLeads}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Won</p>
              <p className="text-2xl font-bold">{wonLeads}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {statusTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === tab
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab}
            {tab !== 'All' && (
              <span className="ml-1.5 opacity-60">
                {leads.filter((l) => l.status === tab).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl shadow-card border border-slate-100/80">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search by company, contact, or email..."
            className="input-premium pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-6 skeleton rounded" />
                <div className="flex-1 h-4 skeleton rounded" />
                <div className="h-4 w-28 skeleton rounded" />
                <div className="h-4 w-24 skeleton rounded" />
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
                    <th>Company</th>
                    <th>Contact</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Source</th>
                    <th className="text-center">Status</th>
                    <th>Assigned To</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((lead, index) => (
                    <tr key={lead.id}>
                      <td className="text-sm text-slate-500 font-medium">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td>
                        <span className="text-sm font-semibold text-slate-900">{lead.company}</span>
                      </td>
                      <td>
                        <span className="text-sm text-slate-700">{lead.name}</span>
                      </td>
                      <td>
                        <span className="text-sm text-slate-600">{lead.email}</span>
                      </td>
                      <td>
                        <span className="text-sm text-slate-600">{lead.phone}</span>
                      </td>
                      <td>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600">
                          {lead.source}
                        </span>
                      </td>
                      <td className="text-center">
                        <StatusBadge status={lead.status} config={crmStatusConfig} />
                      </td>
                      <td>
                        <span className="text-sm text-slate-600">{lead.assignedTo}</span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {crmStatusFlow[lead.status] && lead.status !== 'Won' && lead.status !== 'Lost' && (
                            <button
                              onClick={() => handleStatusChange(lead.id, crmStatusFlow[lead.status])}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              title={`Move to ${crmStatusFlow[lead.status]}`}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          )}
                          {lead.status !== 'Won' && lead.status !== 'Lost' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(lead.id, 'Won')}
                                className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                                title="Mark as Won"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleStatusChange(lead.id, 'Lost')}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                title="Mark as Lost"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              const details = `Company: ${lead.company}\nContact: ${lead.name}\nEmail: ${lead.email || '-'}\nPhone: ${lead.phone || '-'}\nSource: ${lead.source}\nStatus: ${lead.status}\nAssigned: ${lead.assignedTo || '-'}`;
                              toast(details, { duration: 5000, style: { borderRadius: '12px', background: '#1e293b', color: '#fff', whiteSpace: 'pre-line', fontSize: '13px' } });
                            }}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(lead)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(lead)}
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
                <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">No leads found</h3>
                <p className="text-sm text-slate-500">Try adjusting your filter or search criteria.</p>
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

      {/* Add/Edit Lead Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Lead' : 'Add New Lead'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Company<span className="text-rose-500 ml-0.5">*</span></label>
                <input type="text" className="input-premium w-full" placeholder="Company name..." value={formCompany} onChange={(e) => setFormCompany(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Contact Person<span className="text-rose-500 ml-0.5">*</span></label>
                <input type="text" className="input-premium w-full" placeholder="Contact name..." value={formContactPerson} onChange={(e) => setFormContactPerson(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email</label>
                <input type="email" className="input-premium w-full" placeholder="email@example.com" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Phone</label>
                <input type="text" className="input-premium w-full" placeholder="+966 5X XXX XXXX" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Source</label>
                <select className="input-premium w-full" value={formSource} onChange={(e) => setFormSource(e.target.value)}>
                  <option value="Website">Website</option>
                  <option value="Referral">Referral</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Cold Call">Cold Call</option>
                  <option value="Exhibition">Exhibition</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="btn-ghost">Cancel</button>
              <button onClick={handleSaveLead} disabled={saving} className="btn-primary">{saving ? 'Saving...' : editingId ? 'Update' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMPage;
