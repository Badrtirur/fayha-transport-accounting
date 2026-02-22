import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Warehouse,
  Eye,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';
import type { Consignee } from '../../types';
import { consigneesApi } from '../../services/api';
import Pagination from '../../components/common/Pagination';

const isValidPhone = (phone: string): boolean => {
  if (!phone) return true; // optional field
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^(\+?\d{7,15})$/.test(cleaned);
};

const ConsigneeList: React.FC = () => {
  const [consignees, setConsignees] = useState<Consignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const itemsPerPage = 8;

  // Modal form state
  const [formName, setFormName] = useState('');
  const [formNameAr, setFormNameAr] = useState('');
  const [formAuthNum, setFormAuthNum] = useState('');
  const [formImportNum, setFormImportNum] = useState('');
  const [formExportNum, setFormExportNum] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');

  const resetForm = () => {
    setFormName(''); setFormNameAr(''); setFormAuthNum(''); setFormImportNum('');
    setFormExportNum(''); setFormContact(''); setFormPhone(''); setFormAddress('');
    setEditingId(null);
  };

  useEffect(() => {
    consigneesApi.getAll().then((data: any) => {
      setConsignees(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => { setConsignees([]); setLoading(false); });
  }, []);

  const filtered = consignees.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.nameAr && c.nameAr.includes(searchQuery)) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(q))
    );
  });

  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleOpenEdit = (consignee: Consignee) => {
    setEditingId(consignee.id);
    setFormName(consignee.name || '');
    setFormNameAr(consignee.nameAr || '');
    setFormAuthNum(consignee.authorizationNumber || '');
    setFormImportNum(consignee.importNumber || '');
    setFormExportNum(consignee.exportNumber || '');
    setFormContact(consignee.contactPerson || '');
    setFormPhone(consignee.phone || '');
    setFormAddress(consignee.address || '');
    setShowModal(true);
  };

  const handleDelete = async (consignee: Consignee) => {
    if (!window.confirm(`Are you sure you want to delete "${consignee.name}"? This action cannot be undone.`)) return;
    try {
      await consigneesApi.remove(consignee.id);
      setConsignees(prev => prev.filter(c => c.id !== consignee.id));
      toast.success('Consignee deleted successfully!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    } catch {
      toast.error('Failed to delete consignee.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Please enter a consignee name.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }
    if (formPhone && !isValidPhone(formPhone)) {
      toast.error('Please enter a valid phone number (e.g. +966 5X XXX XXXX).', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }
    setSaving(true);
    const payload = {
      name: formName,
      nameAr: formNameAr,
      authorizationNumber: formAuthNum,
      importNumber: formImportNum,
      exportNumber: formExportNum,
      contactPerson: formContact,
      phone: formPhone,
      address: formAddress,
    };
    try {
      if (editingId) {
        const updated = await consigneesApi.update(editingId, payload);
        setConsignees(prev => prev.map(c => c.id === editingId ? { ...c, ...updated } : c));
        toast.success('Consignee updated successfully!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      } else {
        const created = await consigneesApi.create(payload);
        setConsignees(prev => [...prev, created]);
        toast.success('Consignee saved successfully!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      }
      setShowModal(false);
      resetForm();
    } catch {
      toast.error('Failed to save consignee.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Consignees</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage consignee records and authorization details.</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary">
          <Plus className="h-4 w-4" />
          Add New
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
            placeholder="Search by name or contact..."
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
                    <th>Name (AR)</th>
                    <th>Authorization #</th>
                    <th>Import #</th>
                    <th>Export #</th>
                    <th>Contact</th>
                    <th>Phone</th>
                    <th>Address</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((consignee, index) => (
                    <tr key={consignee.id}>
                      <td className="text-sm text-slate-500 font-medium">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td>
                        <span className="text-sm font-semibold text-slate-900">{consignee.name}</span>
                      </td>
                      <td>
                        <span className="text-sm text-slate-600" dir="rtl">{consignee.nameAr || '-'}</span>
                      </td>
                      <td>
                        <span className="text-xs font-mono text-slate-500">{consignee.authorizationNumber || '-'}</span>
                      </td>
                      <td>
                        <span className="text-xs font-mono text-slate-500">{consignee.importNumber || '-'}</span>
                      </td>
                      <td>
                        <span className="text-xs font-mono text-slate-500">{consignee.exportNumber || '-'}</span>
                      </td>
                      <td>
                        <span className="text-sm text-slate-700">{consignee.contactPerson || '-'}</span>
                      </td>
                      <td>
                        <span className="text-sm text-slate-600">{consignee.phone || '-'}</span>
                      </td>
                      <td>
                        <span className="text-sm text-slate-600 truncate max-w-[200px] block">{consignee.address || '-'}</span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              const details = `Name: ${consignee.name}\nName (AR): ${consignee.nameAr || '-'}\nAuth #: ${consignee.authorizationNumber || '-'}\nImport #: ${consignee.importNumber || '-'}\nExport #: ${consignee.exportNumber || '-'}\nContact: ${consignee.contactPerson || '-'}\nPhone: ${consignee.phone || '-'}\nAddress: ${consignee.address || '-'}`;
                              toast(details, { duration: 5000, style: { borderRadius: '12px', background: '#1e293b', color: '#fff', whiteSpace: 'pre-line', fontSize: '13px' } });
                            }}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(consignee)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(consignee)}
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
                <Warehouse className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">No consignees found</h3>
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Consignee' : 'Add New Consignee'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Name (EN)<span className="text-rose-500 ml-0.5">*</span></label>
                <input type="text" className="input-premium" placeholder="Enter name..." value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Name (AR)</label>
                <input type="text" className="input-premium" dir="rtl" placeholder="الاسم بالعربية..." value={formNameAr} onChange={(e) => setFormNameAr(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Authorization #</label>
                <input type="text" className="input-premium" placeholder="AUTH-XXX-XXXX" value={formAuthNum} onChange={(e) => setFormAuthNum(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Import #</label>
                <input type="text" className="input-premium" placeholder="IMP-XXX-XXXXX" value={formImportNum} onChange={(e) => setFormImportNum(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Export #</label>
                <input type="text" className="input-premium" placeholder="EXP-XXX-XXXXX" value={formExportNum} onChange={(e) => setFormExportNum(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Contact Person</label>
                <input type="text" className="input-premium" placeholder="Contact name..." value={formContact} onChange={(e) => setFormContact(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Phone</label>
                <input type="text" className="input-premium" placeholder="+966 5X XXX XXXX" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Address</label>
                <input type="text" className="input-premium" placeholder="Full address..." value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : editingId ? 'Update' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsigneeList;
