import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Users,
  UserCheck,
  UserX,
  Wallet,
  Eye,
  Edit2,
  Trash2,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import type { Client } from '../../types';
import { customersApi, accountsApi, salesmenApi } from '../../services/api';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import SearchableSelect from '../../components/common/SearchableSelect';

const emptyForm = {
  clientType: 'Business Client',
  name: '',
  nameAr: '',
  crNumber: '',
  vatNumber: '',
  postalCode: '',
  postalCodeAr: '',
  city: '',
  cityAr: '',
  district: '',
  districtAr: '',
  streetName: '',
  streetNameAr: '',
  buildingNumber: '',
  buildingNumberAr: '',
  country: 'SAUDI ARABIA',
  contactPerson: '',
  contactPersonPhone: '',
  phone: '',
  designation: '',
  salesmanId: '',
  email: '',
  password: '',
  authorizationNumber: '',
  authorizationExpiry: '',
  notifyBefore: '0',
  importNumber: '',
  importExpiry: '',
  exportNumber: '',
  exportExpiry: '',
  parentAccountId: '',
  ledgerCode: '',
  ledgerNote: '',
  isOtherBranch: false,
};

const ClientListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [accountOptions, setAccountOptions] = useState<{ value: string; label: string }[]>([]);
  const [salesmanOptions, setSalesmanOptions] = useState<{ value: string; label: string }[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[]; totalRows: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsPerPage = 8;

  const toDateStr = (d: any) => {
    if (!d) return '';
    try { return new Date(d).toISOString().slice(0, 10); } catch { return ''; }
  };

  useEffect(() => {
    customersApi.getAll().then((data: any) => {
      const arr = Array.isArray(data) ? data : [];
      const mapped = arr.map((c: any) => ({
        ...c,
        contactPerson: c.contactPerson || '',
        email: c.email || '',
        phone: c.phone || '',
        address: c.address || '',
        city: c.city || '',
        balance: c.outstandingBalance ?? c.balance ?? 0,
        status: c.isActive === false ? 'Inactive' : (c.status || 'Active'),
        totalJobs: c.totalJobs || 0,
      }));
      setClients(mapped);
      setLoading(false);
    }).catch(() => { setClients([]); setLoading(false); });

    // Load dropdown data for the form
    Promise.all([accountsApi.getAll(), salesmenApi.getAll()]).then(([accList, smList]) => {
      const accounts = Array.isArray(accList) ? accList : [];
      const salesmen = Array.isArray(smList) ? smList : [];
      setAccountOptions(accounts.map((a: any) => ({
        value: a.id,
        label: `[${a.code}] ${a.name}`,
      })));
      setSalesmanOptions(salesmen.map((s: any) => ({
        value: s.id,
        label: s.name,
      })));
    }).catch(() => {});
  }, []);

  const setField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveClient = async () => {
    if (!form.name) {
      toast.error('Please enter a client name.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        nameAr: form.nameAr || undefined,
        clientType: form.clientType,
        crNumber: form.crNumber || undefined,
        vatNumber: form.vatNumber || undefined,
        postalCode: form.postalCode || undefined,
        postalCodeAr: form.postalCodeAr || undefined,
        city: form.city || undefined,
        cityAr: form.cityAr || undefined,
        district: form.district || undefined,
        districtAr: form.districtAr || undefined,
        streetName: form.streetName || undefined,
        streetNameAr: form.streetNameAr || undefined,
        buildingNumber: form.buildingNumber || undefined,
        buildingNumberAr: form.buildingNumberAr || undefined,
        country: form.country || 'SAUDI ARABIA',
        contactPerson: form.contactPerson || undefined,
        contactPersonPhone: form.contactPersonPhone || undefined,
        phone: form.phone || undefined,
        designation: form.designation || undefined,
        salesmanId: form.salesmanId || undefined,
        email: form.email || undefined,
        password: form.password || undefined,
        authorizationNumber: form.authorizationNumber || undefined,
        authorizationExpiry: form.authorizationExpiry ? new Date(form.authorizationExpiry).toISOString() : undefined,
        notifyBefore: form.notifyBefore ? Number(form.notifyBefore) : 0,
        importNumber: form.importNumber || undefined,
        importExpiry: form.importExpiry ? new Date(form.importExpiry).toISOString() : undefined,
        exportNumber: form.exportNumber || undefined,
        exportExpiry: form.exportExpiry ? new Date(form.exportExpiry).toISOString() : undefined,
        parentAccountId: form.parentAccountId || undefined,
        ledgerCode: form.ledgerCode || undefined,
        ledgerNote: form.ledgerNote || undefined,
        isOtherBranch: form.isOtherBranch,
        isActive: true,
      };

      if (editingClient) {
        const updated = await customersApi.update(editingClient.id, payload);
        const mapped = { ...updated, contactPerson: updated.contactPerson || '', email: updated.email || '', phone: updated.phone || '', address: updated.address || '', city: updated.city || '', balance: updated.outstandingBalance ?? 0, status: updated.isActive === false ? 'Inactive' : 'Active', totalJobs: 0 };
        setClients(prev => prev.map(c => c.id === editingClient.id ? mapped : c));
        toast.success('Client updated successfully!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      } else {
        const created = await customersApi.create(payload);
        const mapped = { ...created, contactPerson: created.contactPerson || '', email: created.email || '', phone: created.phone || '', address: created.address || '', city: created.city || '', balance: 0, status: 'Active', totalJobs: 0 };
        setClients(prev => [...prev, mapped]);
        toast.success('Client added successfully!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      }
      setShowModal(false);
      setEditingClient(null);
      setForm({ ...emptyForm });
    } catch {
      toast.error('Failed to save client.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClient = async (client: Client) => {
    if (!window.confirm(`Are you sure you want to delete "${client.name}"? This action cannot be undone.`)) return;
    try {
      await customersApi.remove(client.id);
      setClients(prev => prev.filter(c => c.id !== client.id));
      toast.success('Client deleted successfully!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    } catch {
      toast.error('Failed to delete client.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    }
  };

  // Auto-open edit modal when navigated from client details with ?edit=id
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && clients.length > 0 && !showModal) {
      const client = clients.find(c => c.id === editId);
      if (client) {
        openEditModal(client);
        setSearchParams({}, { replace: true });
      }
    }
  }, [clients, searchParams]);

  const openEditModal = (client: any) => {
    setEditingClient(client);
    setForm({
      clientType: client.clientType || 'Business Client',
      name: client.name || '',
      nameAr: client.nameAr || '',
      crNumber: client.crNumber || '',
      vatNumber: client.vatNumber || '',
      postalCode: client.postalCode || '',
      postalCodeAr: client.postalCodeAr || '',
      city: client.city || '',
      cityAr: client.cityAr || '',
      district: client.district || '',
      districtAr: client.districtAr || '',
      streetName: client.streetName || '',
      streetNameAr: client.streetNameAr || '',
      buildingNumber: client.buildingNumber || '',
      buildingNumberAr: client.buildingNumberAr || '',
      country: client.country || 'SAUDI ARABIA',
      contactPerson: client.contactPerson || '',
      contactPersonPhone: client.contactPersonPhone || '',
      phone: client.phone || '',
      designation: client.designation || '',
      salesmanId: client.salesmanId || '',
      email: client.email || '',
      password: client.password || '',
      authorizationNumber: client.authorizationNumber || '',
      authorizationExpiry: toDateStr(client.authorizationExpiry),
      notifyBefore: String(client.notifyBefore || 0),
      importNumber: client.importNumber || '',
      importExpiry: toDateStr(client.importExpiry),
      exportNumber: client.exportNumber || '',
      exportExpiry: toDateStr(client.exportExpiry),
      parentAccountId: client.parentAccountId || '',
      ledgerCode: client.ledgerCode || '',
      ledgerNote: client.ledgerNote || '',
      isOtherBranch: client.isOtherBranch || false,
    });
    setShowModal(true);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    try {
      const result = await customersApi.importFromExcel(file);
      setImportResult(result);
      if (result.imported > 0) {
        // Refresh clients list
        const data = await customersApi.getAll();
        const arr = Array.isArray(data) ? data : [];
        setClients(arr.map((c: any) => ({
          ...c,
          contactPerson: c.contactPerson || '',
          email: c.email || '',
          phone: c.phone || '',
          address: c.address || '',
          city: c.city || '',
          balance: c.outstandingBalance ?? c.balance ?? 0,
          status: c.isActive === false ? 'Inactive' : (c.status || 'Active'),
          totalJobs: c.totalJobs || 0,
        })));
        toast.success(`${result.imported} clients imported successfully!`, { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      }
    } catch {
      toast.error('Failed to import file.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['Name', 'Name (AR)', 'Client Type', 'CR Number', 'VAT Number', 'Contact Person', 'Phone', 'Email', 'City', 'Country', 'Address', 'Postal Code', 'Street Name', 'District', 'Building Number', 'Authorization Number', 'Import Number', 'Export Number', 'Credit Limit', 'Payment Terms (Days)'];
    const csvContent = headers.join(',') + '\n' + headers.map(() => '').join(',') + '\n';
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = clients.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.nameAr && c.nameAr.includes(searchQuery)) ||
      (c.contactPerson || '').toLowerCase().includes(q) ||
      (c.crNumber || '').includes(q) ||
      (c.vatNumber || '').includes(q) ||
      (c.city || '').toLowerCase().includes(q)
    );
  });

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === 'Active').length;
  const inactiveClients = clients.filter((c) => c.status === 'Inactive').length;
  const totalBalance = clients.reduce((s, c) => s + (c.balance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clients</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage client records, authorization details, and balances.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImportFile}
            className="hidden"
          />
          <button onClick={handleDownloadTemplate} className="bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 inline-flex items-center gap-2 transition-colors" title="Download import template">
            <FileSpreadsheet className="h-4 w-4" />
            Template
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importLoading}
            className="bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 inline-flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {importLoading ? 'Importing...' : 'Import'}
          </button>
          <button onClick={() => toast('Exporting to Excel...', { icon: '\ud83d\udcca', style: { borderRadius: '12px', background: '#3b82f6', color: '#fff' } })} className="bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 inline-flex items-center gap-2 transition-colors">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button onClick={() => { setEditingClient(null); setForm({ ...emptyForm }); setShowModal(true); }} className="btn-primary">
            <Plus className="h-4 w-4" />
            Add New Client
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><Users className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Total Clients</p>
              <p className="text-2xl font-bold">{totalClients}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><UserCheck className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Active</p>
              <p className="text-2xl font-bold">{activeClients}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-lg shadow-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><UserX className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Inactive</p>
              <p className="text-2xl font-bold">{inactiveClients}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><Wallet className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Total Balance</p>
              <p className="text-lg font-bold">SAR {totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl shadow-card border border-slate-100/80">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} placeholder="Search by name, CR number, VAT ID, or city..." className="input-premium pl-10" />
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
                    <th>CR Number</th>
                    <th>VAT ID</th>
                    <th>Contact</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th className="text-right">Balance</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((client, index) => (
                    <tr key={client.id}>
                      <td className="text-sm text-slate-500 font-medium">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td><span className="text-sm font-semibold text-slate-900 truncate max-w-[200px] block">{client.name}</span></td>
                      <td><span className="text-sm text-slate-600" dir="rtl">{client.nameAr || '-'}</span></td>
                      <td><span className="text-xs font-mono text-slate-500">{client.crNumber || '-'}</span></td>
                      <td><span className="text-xs font-mono text-slate-500">{client.vatNumber || '-'}</span></td>
                      <td><span className="text-sm text-slate-700">{client.contactPerson || '-'}</span></td>
                      <td><span className="text-sm text-slate-600">{client.phone || '-'}</span></td>
                      <td><span className="text-sm text-slate-600">{client.city || '-'}</span></td>
                      <td className="text-right"><span className="text-sm font-bold text-slate-900">SAR {(client.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                      <td className="text-center"><StatusBadge status={client.status || (client.isActive !== false ? 'Active' : 'Inactive')} /></td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => navigate(`/clients/${client.id}`)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="View"><Eye className="h-4 w-4" /></button>
                          <button onClick={() => openEditModal(client)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Edit"><Edit2 className="h-4 w-4" /></button>
                          <button onClick={() => handleDeleteClient(client)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Delete"><Trash2 className="h-4 w-4" /></button>
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
                <h3 className="text-lg font-bold text-slate-900 mb-1">No clients found</h3>
                <p className="text-sm text-slate-500">Try adjusting your search criteria.</p>
              </div>
            )}
            <Pagination currentPage={currentPage} totalPages={Math.ceil(filtered.length / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={filtered.length} />
          </>
        )}
      </div>

      {/* Import Results Modal */}
      {importResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Import Results</h2>
              <button onClick={() => setImportResult(null)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-emerald-700">{importResult.imported}</p>
                  <p className="text-xs text-emerald-600">Imported</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                  <AlertCircle className="h-6 w-6 text-amber-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-amber-700">{importResult.skipped}</p>
                  <p className="text-xs text-amber-600">Skipped</p>
                </div>
                <div className="bg-rose-50 rounded-xl p-3 text-center border border-rose-100">
                  <X className="h-6 w-6 text-rose-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-rose-700">{importResult.errors.length}</p>
                  <p className="text-xs text-rose-600">Errors</p>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="bg-rose-50 rounded-xl p-3 border border-rose-100 max-h-40 overflow-y-auto">
                  <p className="text-xs font-semibold text-rose-700 mb-2">Error Details:</p>
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-rose-600 mb-1">{err}</p>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100">
              <button onClick={() => setImportResult(null)} className="btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Client Modal - Full Form matching MMO Clearance */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{editingClient ? 'Edit Client' : 'Add New Client'}</h2>
              <button onClick={() => { setShowModal(false); setEditingClient(null); }} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X className="h-5 w-5" /></button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="overflow-y-auto px-6 py-4 space-y-5 flex-1">
              {/* Client Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Client Type<span className="text-rose-500 ml-0.5">*</span></label>
                <select className="input-premium w-full" value={form.clientType} onChange={(e) => setField('clientType', e.target.value)}>
                  <option value="Business Client">Business Client</option>
                  <option value="Individual">Individual</option>
                </select>
              </div>

              {/* Name / Name Arabic */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Name<span className="text-rose-500 ml-0.5">*</span></label>
                  <input type="text" className="input-premium w-full" placeholder="Client name..." value={form.name} onChange={(e) => setField('name', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Name Arabic<span className="text-rose-500 ml-0.5">*</span></label>
                  <input type="text" className="input-premium w-full" dir="rtl" placeholder="...اسم العميل" value={form.nameAr} onChange={(e) => setField('nameAr', e.target.value)} />
                </div>
              </div>

              {/* CR Number / VAT ID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">CR Number<span className="text-rose-500 ml-0.5">*</span></label>
                  <input type="text" className="input-premium w-full" placeholder="e.g. 4031023768" value={form.crNumber} onChange={(e) => setField('crNumber', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Vat ID<span className="text-rose-500 ml-0.5">*</span></label>
                  <input type="text" className="input-premium w-full" placeholder="e.g. 311268551200003" value={form.vatNumber} onChange={(e) => setField('vatNumber', e.target.value)} />
                </div>
              </div>

              {/* Postal Zone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Postal Zone<span className="text-rose-500 ml-0.5">*</span></label>
                  <input type="text" className="input-premium w-full" placeholder="e.g. 24352" value={form.postalCode} onChange={(e) => setField('postalCode', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Postal Zone Arabic</label>
                  <input type="text" className="input-premium w-full" dir="rtl" placeholder="Enter Postal Zone Arabic" value={form.postalCodeAr} onChange={(e) => setField('postalCodeAr', e.target.value)} />
                </div>
              </div>

              {/* City */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">City Name<span className="text-rose-500 ml-0.5">*</span></label>
                  <input type="text" className="input-premium w-full" placeholder="e.g. MAKKAH" value={form.city} onChange={(e) => setField('city', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">City Name Arabic</label>
                  <input type="text" className="input-premium w-full" dir="rtl" placeholder="Enter City Name Arabic" value={form.cityAr} onChange={(e) => setField('cityAr', e.target.value)} />
                </div>
              </div>

              {/* District */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">City Sub-division Name (District)<span className="text-rose-500 ml-0.5">*</span></label>
                  <input type="text" className="input-premium w-full" placeholder="e.g. Al Kakiyah Dist." value={form.district} onChange={(e) => setField('district', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">City Sub-division Name (District) Arabic</label>
                  <input type="text" className="input-premium w-full" dir="rtl" placeholder="Enter District Arabic" value={form.districtAr} onChange={(e) => setField('districtAr', e.target.value)} />
                </div>
              </div>

              {/* Street */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Street Name<span className="text-rose-500 ml-0.5">*</span></label>
                  <input type="text" className="input-premium w-full" placeholder="e.g. Al Kakiyah Dist." value={form.streetName} onChange={(e) => setField('streetName', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Street Name Arabic</label>
                  <input type="text" className="input-premium w-full" dir="rtl" placeholder="Enter Street Name Arabic" value={form.streetNameAr} onChange={(e) => setField('streetNameAr', e.target.value)} />
                </div>
              </div>

              {/* Building */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Building Number<span className="text-rose-500 ml-0.5">*</span></label>
                  <input type="text" className="input-premium w-full" placeholder="e.g. 7004" value={form.buildingNumber} onChange={(e) => setField('buildingNumber', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Building Number Arabic</label>
                  <input type="text" className="input-premium w-full" dir="rtl" placeholder="Enter Building Number Arabic" value={form.buildingNumberAr} onChange={(e) => setField('buildingNumberAr', e.target.value)} />
                </div>
              </div>

              {/* Country / Contact Person */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Country<span className="text-rose-500 ml-0.5">*</span></label>
                  <select className="input-premium w-full" value={form.country} onChange={(e) => setField('country', e.target.value)}>
                    <option value="SAUDI ARABIA">SAUDI ARABIA</option>
                    <option value="UAE">UAE</option>
                    <option value="BAHRAIN">BAHRAIN</option>
                    <option value="KUWAIT">KUWAIT</option>
                    <option value="QATAR">QATAR</option>
                    <option value="OMAN">OMAN</option>
                    <option value="EGYPT">EGYPT</option>
                    <option value="JORDAN">JORDAN</option>
                    <option value="CHINA">CHINA</option>
                    <option value="INDIA">INDIA</option>
                    <option value="USA">USA</option>
                    <option value="UK">UK</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Contact Person</label>
                  <input type="text" className="input-premium w-full" placeholder="Enter Contact Person" value={form.contactPerson} onChange={(e) => setField('contactPerson', e.target.value)} />
                </div>
              </div>

              {/* Contact Phone / Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Contact Person Phone Number<span className="text-rose-500 ml-0.5">*</span></label>
                  <input type="text" className="input-premium w-full" placeholder="+966 XX XXX XXXX" value={form.contactPersonPhone} onChange={(e) => setField('contactPersonPhone', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Phone</label>
                  <input type="text" className="input-premium w-full" placeholder="Enter Phone" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
                </div>
              </div>

              {/* Designation / Sales Man */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Designation</label>
                  <input type="text" className="input-premium w-full" placeholder="Enter Client Designation" value={form.designation} onChange={(e) => setField('designation', e.target.value)} />
                </div>
                <SearchableSelect
                  label="Sales Man"
                  options={salesmanOptions}
                  value={form.salesmanId}
                  onChange={(val) => setField('salesmanId', val)}
                  placeholder="Select salesman..."
                />
              </div>

              {/* Email / Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email (User Name)<span className="text-rose-500 ml-0.5">*</span></label>
                  <input type="email" className="input-premium w-full" placeholder="client@email.com" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Password</label>
                  <input type="password" className="input-premium w-full" placeholder="Enter Password" value={form.password} onChange={(e) => setField('password', e.target.value)} />
                </div>
              </div>

              {/* Authorization Section */}
              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-sm font-bold text-slate-700 mb-3">Authorization & Customs</h3>
              </div>

              {/* Authorization / Expiry */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Authorization</label>
                  <input type="text" className="input-premium w-full" placeholder="Authorization Number" value={form.authorizationNumber} onChange={(e) => setField('authorizationNumber', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Authorization Expiry</label>
                  <input type="date" className="input-premium w-full" value={form.authorizationExpiry} onChange={(e) => setField('authorizationExpiry', e.target.value)} />
                </div>
              </div>

              {/* Notify Before */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Notify Before (days)</label>
                  <input type="number" className="input-premium w-full" min="0" placeholder="0" value={form.notifyBefore} onChange={(e) => setField('notifyBefore', e.target.value)} />
                </div>
              </div>

              {/* Import / Export */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Import Number</label>
                  <input type="text" className="input-premium w-full" placeholder="Enter Import Number" value={form.importNumber} onChange={(e) => setField('importNumber', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Export Number</label>
                  <input type="text" className="input-premium w-full" placeholder="Enter Export Number" value={form.exportNumber} onChange={(e) => setField('exportNumber', e.target.value)} />
                </div>
              </div>

              {/* Import / Export Expiry */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Expiry Import Number</label>
                  <input type="date" className="input-premium w-full" value={form.importExpiry} onChange={(e) => setField('importExpiry', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Expiry Export Number</label>
                  <input type="date" className="input-premium w-full" value={form.exportExpiry} onChange={(e) => setField('exportExpiry', e.target.value)} />
                </div>
              </div>

              {/* Accounting Section */}
              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-sm font-bold text-slate-700 mb-3">Accounting</h3>
              </div>

              {/* Parent Group In Accounting */}
              <SearchableSelect
                label="Parent Group In Accounting"
                options={accountOptions}
                value={form.parentAccountId}
                onChange={(val) => setField('parentAccountId', val)}
                placeholder="Select accounting parent group..."
              />

              {/* Ledger Code / Ledger Note */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Ledger Code</label>
                  <input type="text" className="input-premium w-full" placeholder="e.g. 01-02-01-0086" value={form.ledgerCode} onChange={(e) => setField('ledgerCode', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Ledger Note</label>
                  <textarea className="input-premium w-full resize-none" rows={2} placeholder="Ledger notes..." value={form.ledgerNote} onChange={(e) => setField('ledgerNote', e.target.value)} />
                </div>
              </div>

              {/* Is Our Other Branch */}
              <div className="flex items-center gap-3">
                <input type="checkbox" id="isOtherBranch" className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" checked={form.isOtherBranch} onChange={(e) => setField('isOtherBranch', e.target.checked)} />
                <label htmlFor="isOtherBranch" className="text-sm font-medium text-slate-700">Is Our Other Branch</label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => { setShowModal(false); setEditingClient(null); }} className="btn-secondary">Close</button>
              <button onClick={handleSaveClient} disabled={saving} className="btn-primary">{saving ? 'Saving...' : editingClient ? 'Update' : 'Submit'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientListPage;
