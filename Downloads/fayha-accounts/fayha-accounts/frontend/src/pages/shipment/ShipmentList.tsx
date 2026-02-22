import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Search,
  Ship,
  Anchor,
  Navigation,
  CheckCircle2,
  MapPin,
  ArrowRight,
  Plus,
  Edit2,
  Trash2,
  X,
  PackageCheck,
} from 'lucide-react';
import type { Shipment, JobReference } from '../../types';
import { shipmentsApi, jobReferencesApi } from '../../services/api';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';

const formatDate = (d: any): string => {
  if (!d) return '-';
  try { const date = new Date(d); if (isNaN(date.getTime())) return String(d); return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return String(d); }
};

const shipmentStatusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  Booked: { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400' },
  'In Transit': { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
  Arrived: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500' },
  Delivered: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

const statusSteps = ['Booked', 'In Transit', 'Arrived', 'Delivered'];

const ShipmentList: React.FC = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [jobRefs, setJobRefs] = useState<JobReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const itemsPerPage = 8;

  // Form state
  const [formOrigin, setFormOrigin] = useState('');
  const [formDestination, setFormDestination] = useState('');
  const [formCarrier, setFormCarrier] = useState('');
  const [formStatus, setFormStatus] = useState('Booked');
  const [formEtd, setFormEtd] = useState('');
  const [formEta, setFormEta] = useState('');
  const [formMode, setFormMode] = useState('Sea');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    Promise.all([shipmentsApi.getAll(), jobReferencesApi.getAll()]).then(([shipData, jrData]) => {
      setShipments(Array.isArray(shipData) ? shipData : []);
      setJobRefs(Array.isArray(jrData) ? jrData : []);
      setLoading(false);
    }).catch(() => { setShipments([]); setJobRefs([]); setLoading(false); });
  }, []);

  const resetForm = () => {
    setFormOrigin(''); setFormDestination(''); setFormCarrier('');
    setFormStatus('Booked'); setFormEtd(''); setFormEta('');
    setFormMode('Sea'); setFormNotes(''); setEditingId(null);
  };

  const handleEdit = (shp: Shipment) => {
    setEditingId(shp.id);
    setFormOrigin(shp.origin || '');
    setFormDestination(shp.destination || '');
    setFormCarrier(shp.carrier || '');
    setFormStatus(shp.status || 'Booked');
    setFormEtd(shp.etd ? new Date(shp.etd).toISOString().split('T')[0] : '');
    setFormEta(shp.eta ? new Date(shp.eta).toISOString().split('T')[0] : '');
    setFormMode((shp as any).modeOfTransport || 'Sea');
    setFormNotes((shp as any).notes || '');
    setShowModal(true);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await shipmentsApi.update(id, { status: newStatus });
      setShipments(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } as any : item));
      toast.success(`Status updated to ${newStatus}`, { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    } catch {
      toast.error('Failed to update status', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this shipment?')) return;
    try {
      await shipmentsApi.remove(id);
      setShipments(prev => prev.filter(s => s.id !== id));
      toast.success('Shipment deleted!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    } catch {
      toast.error('Failed to delete shipment.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    }
  };

  const handleSave = async () => {
    if (!formOrigin || !formDestination) {
      toast.error('Origin and destination are required.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }
    setSaving(true);
    const payload = {
      origin: formOrigin, destination: formDestination, carrier: formCarrier,
      status: editingId ? undefined : formStatus, etd: formEtd || undefined, eta: formEta || undefined,
      modeOfTransport: formMode, notes: formNotes,
    };
    try {
      if (editingId) {
        const updated = await shipmentsApi.update(editingId, payload);
        setShipments(prev => prev.map(s => s.id === editingId ? updated : s));
        toast.success('Shipment updated!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      } else {
        const created = await shipmentsApi.create(payload);
        setShipments(prev => [...prev, created]);
        toast.success('Shipment created!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      }
      setShowModal(false);
      resetForm();
    } catch {
      toast.error('Failed to save shipment.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    } finally {
      setSaving(false);
    }
  };

  const getJobRefNo = (jobRefId: string): string => {
    const job = jobRefs.find((j) => j.id === jobRefId);
    return job ? job.jobRefNo : '-';
  };

  const filtered = shipments.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.shipmentNo || '').toLowerCase().includes(q) ||
      getJobRefNo(s.jobRefId).toLowerCase().includes(q) ||
      (s.carrier || '').toLowerCase().includes(q) ||
      (s.trackingNumber && s.trackingNumber.toLowerCase().includes(q))
    );
  });

  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalShipments = shipments.length;
  const bookedCount = shipments.filter((s) => s.status === 'Booked').length;
  const inTransitCount = shipments.filter((s) => s.status === 'In Transit').length;
  const arrivedCount = shipments.filter((s) => s.status === 'Arrived').length;
  const deliveredCount = shipments.filter((s) => s.status === 'Delivered').length;

  const getStepIndex = (status: string): number => statusSteps.indexOf(status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Shipment Tracking</h1>
          <p className="text-slate-500 mt-1 text-sm">Track shipments, monitor carriers, and view ETD/ETA details.</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary">
          <Plus className="h-4 w-4" />
          Add Shipment
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><Ship className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Total</p>
              <p className="text-2xl font-bold">{totalShipments}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-4 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600"><Anchor className="h-4 w-4" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Booked</p>
              <p className="text-xl font-bold text-slate-900">{bookedCount}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-4 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600"><Navigation className="h-4 w-4" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">In Transit</p>
              <p className="text-xl font-bold text-slate-900">{inTransitCount}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-4 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600"><MapPin className="h-4 w-4" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Arrived</p>
              <p className="text-xl font-bold text-slate-900">{arrivedCount}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-4 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600"><CheckCircle2 className="h-4 w-4" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Delivered</p>
              <p className="text-xl font-bold text-slate-900">{deliveredCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl shadow-card border border-slate-100/80">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} placeholder="Search by shipment #, job ref, carrier, or tracking..." className="input-premium pl-10" />
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
                    <th>Shipment #</th>
                    <th>Job Ref</th>
                    <th>Route</th>
                    <th>Carrier</th>
                    <th>ETD</th>
                    <th>ETA</th>
                    <th>Tracking #</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Progress</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((shp, index) => {
                    const stepIndex = getStepIndex(shp.status);
                    return (
                      <tr key={shp.id}>
                        <td className="text-sm text-slate-500 font-medium">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                        <td><span className="text-sm font-bold text-slate-900 font-mono">{shp.shipmentNo}</span></td>
                        <td><span className="text-xs font-mono text-slate-500">{getJobRefNo(shp.jobRefId)}</span></td>
                        <td>
                          <div className="flex items-center gap-1 text-sm text-slate-700">
                            <span className="truncate max-w-[100px]">{shp.origin.split(',')[0]}</span>
                            <ArrowRight className="h-3 w-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate max-w-[100px]">{shp.destination.split(',')[0]}</span>
                          </div>
                        </td>
                        <td><span className="text-sm font-semibold text-slate-700">{shp.carrier}</span></td>
                        <td><span className="text-sm text-slate-600">{formatDate(shp.etd)}</span></td>
                        <td><span className="text-sm text-slate-600">{formatDate(shp.eta)}</span></td>
                        <td><span className="text-xs font-mono text-slate-500">{shp.trackingNumber || '-'}</span></td>
                        <td className="text-center"><StatusBadge status={shp.status} config={shipmentStatusConfig} /></td>
                        <td>
                          <div className="flex items-center gap-0.5">
                            {statusSteps.map((step, idx) => (
                              <div
                                key={step}
                                className={`h-1.5 flex-1 rounded-full ${
                                  idx <= stepIndex ? 'bg-emerald-500' : 'bg-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {shp.status === 'Booked' && (
                              <button onClick={() => handleStatusChange(shp.id, 'In Transit')} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Mark In Transit">
                                <Navigation className="h-4 w-4" />
                              </button>
                            )}
                            {shp.status === 'In Transit' && (
                              <button onClick={() => handleStatusChange(shp.id, 'Arrived')} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all" title="Mark Arrived">
                                <MapPin className="h-4 w-4" />
                              </button>
                            )}
                            {shp.status === 'Arrived' && (
                              <button onClick={() => handleStatusChange(shp.id, 'Delivered')} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all" title="Mark Delivered">
                                <PackageCheck className="h-4 w-4" />
                              </button>
                            )}
                            <button onClick={() => handleEdit(shp)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Edit">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDelete(shp.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Delete">
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
                <Ship className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">No shipments found</h3>
                <p className="text-sm text-slate-500">Try adjusting your search criteria.</p>
              </div>
            )}

            <Pagination currentPage={currentPage} totalPages={Math.ceil(filtered.length / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={filtered.length} />
          </>
        )}
      </div>
      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Shipment' : 'Add Shipment'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Origin<span className="text-rose-500 ml-0.5">*</span></label>
                <input type="text" className="input-premium w-full" placeholder="e.g. Shanghai, CN" value={formOrigin} onChange={(e) => setFormOrigin(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Destination<span className="text-rose-500 ml-0.5">*</span></label>
                <input type="text" className="input-premium w-full" placeholder="e.g. Jeddah, SA" value={formDestination} onChange={(e) => setFormDestination(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Carrier</label>
                <input type="text" className="input-premium w-full" placeholder="e.g. MAERSK" value={formCarrier} onChange={(e) => setFormCarrier(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Mode</label>
                <select className="input-premium w-full" value={formMode} onChange={(e) => setFormMode(e.target.value)}>
                  <option value="Sea">Sea</option>
                  <option value="Air">Air</option>
                  <option value="Land">Land</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">ETD</label>
                <input type="date" className="input-premium w-full" value={formEtd} onChange={(e) => setFormEtd(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">ETA</label>
                <input type="date" className="input-premium w-full" value={formEta} onChange={(e) => setFormEta(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Notes</label>
                <input type="text" className="input-premium w-full" placeholder="Notes..." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipmentList;
