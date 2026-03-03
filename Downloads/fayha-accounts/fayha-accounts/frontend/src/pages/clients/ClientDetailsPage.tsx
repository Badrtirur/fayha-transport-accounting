import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  Package,
  Calendar,
  CreditCard,
  ClipboardList,
  Edit3,
  Trash2,
  Loader2,
  Plus,
  Settings,
  X,
  Wallet,
} from 'lucide-react';
import type { Client } from '../../types';
import {
  customersApi,
  jobReferencesApi,
  salesInvoicesApi,
  paymentEntriesApi,
  clientAdvancesApi,
  soaApi,
  clientServicesApi,
  invoiceServicesApi,
} from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import SearchableSelect from '../../components/common/SearchableSelect';

type TabKey = 'overview' | 'jobs' | 'invoices' | 'payments' | 'advances' | 'services' | 'soa';

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Overview', icon: Building2 },
  { key: 'jobs', label: 'Jobs', icon: Package },
  { key: 'invoices', label: 'Invoices', icon: FileText },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'advances', label: 'Advances', icon: Wallet },
  { key: 'services', label: 'Services', icon: Settings },
  { key: 'soa', label: 'SOA', icon: ClipboardList },
];

const ClientDetailsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Tab data states
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [soaEntries, setSoaEntries] = useState<any[]>([]);
  const [soaLoading, setSoaLoading] = useState(false);
  const [advances, setAdvances] = useState<any[]>([]);
  const [advancesLoading, setAdvancesLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Services tab state
  const [clientServices, setClientServices] = useState<any[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [serviceForm, setServiceForm] = useState({ serviceId: '', customAmount: '', customVat: '', notes: '' });

  useEffect(() => {
    if (id) {
      customersApi.getById(id).then((data) => {
        setClient(data || null);
        setLoading(false);
      }).catch(() => {
        setClient(null);
        setLoading(false);
      });
    }
  }, [id]);

  // Load tab data when tab changes
  useEffect(() => {
    if (!id) return;

    if (activeTab === 'jobs' && jobs.length === 0 && !jobsLoading) {
      setJobsLoading(true);
      jobReferencesApi.getAll().then((data) => {
        const all = Array.isArray(data) ? data : [];
        setJobs(all.filter((j: any) => j.clientId === id));
      }).catch(() => {
        setJobs([]);
        toast.error('Failed to load jobs.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      }).finally(() => setJobsLoading(false));
    }

    if (activeTab === 'invoices' && invoices.length === 0 && !invoicesLoading) {
      setInvoicesLoading(true);
      salesInvoicesApi.getAll().then((data) => {
        const all = Array.isArray(data) ? data : [];
        setInvoices(all.filter((inv: any) => inv.clientId === id));
      }).catch(() => {
        setInvoices([]);
        toast.error('Failed to load invoices.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      }).finally(() => setInvoicesLoading(false));
    }

    if (activeTab === 'payments' && payments.length === 0 && !paymentsLoading) {
      setPaymentsLoading(true);
      paymentEntriesApi.getAll().then((data) => {
        const all = Array.isArray(data) ? data : [];
        setPayments(all.filter((p: any) => p.clientId === id));
      }).catch(() => {
        setPayments([]);
        toast.error('Failed to load payments.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      }).finally(() => setPaymentsLoading(false));
    }

    if ((activeTab === 'advances' || activeTab === 'overview') && advances.length === 0 && !advancesLoading) {
      setAdvancesLoading(true);
      clientAdvancesApi.getAll().then((data) => {
        const all = Array.isArray(data) ? data : [];
        setAdvances(all.filter((a: any) => a.clientId === id));
      }).catch(() => {
        setAdvances([]);
      }).finally(() => setAdvancesLoading(false));
    }

    if (activeTab === 'services' && clientServices.length === 0 && !servicesLoading) {
      setServicesLoading(true);
      Promise.all([
        clientServicesApi.getByClient(id),
        invoiceServicesApi.getAll(),
      ]).then(([csData, svcData]) => {
        setClientServices(Array.isArray(csData) ? csData : []);
        setAllServices(Array.isArray(svcData) ? svcData : []);
      }).catch(() => {
        toast.error('Failed to load services.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      }).finally(() => setServicesLoading(false));
    }

    if (activeTab === 'soa' && soaEntries.length === 0 && !soaLoading) {
      setSoaLoading(true);
      soaApi.getCustomerSOA(id).then((data: any) => {
        const entries = data?.entries || (Array.isArray(data) ? data : []);
        setSoaEntries(entries);
      }).catch(() => {
        setSoaEntries([]);
        toast.error('Failed to load statement of account.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      }).finally(() => setSoaLoading(false));
    }
  }, [activeTab, id]);

  const handleDelete = async () => {
    if (!id) return;
    const confirmed = window.confirm('Are you sure you want to delete this client? This action cannot be undone.');
    if (!confirmed) return;

    setDeleting(true);
    try {
      await customersApi.remove(id);
      toast.success('Client deleted successfully!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      navigate('/clients');
    } catch {
      toast.error('Failed to delete client.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveService = async () => {
    if (!serviceForm.serviceId && !editingService) {
      toast.error('Please select a service.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }
    try {
      const payload: any = {
        customAmount: serviceForm.customAmount ? Number(serviceForm.customAmount) : null,
        customVat: serviceForm.customVat ? Number(serviceForm.customVat) : null,
        notes: serviceForm.notes || null,
      };
      if (editingService) {
        const updated = await clientServicesApi.update(editingService.id, payload);
        setClientServices(prev => prev.map(cs => cs.id === editingService.id ? updated : cs));
        toast.success('Service updated!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      } else {
        const created = await clientServicesApi.create({ clientId: id, serviceId: serviceForm.serviceId, ...payload });
        setClientServices(prev => [...prev, created]);
        toast.success('Service added!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      }
      setShowServiceModal(false);
      setEditingService(null);
      setServiceForm({ serviceId: '', customAmount: '', customVat: '', notes: '' });
    } catch {
      toast.error('Failed to save service.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    }
  };

  const handleDeleteService = async (cs: any) => {
    if (!window.confirm('Remove this service from the client?')) return;
    try {
      await clientServicesApi.remove(cs.id);
      setClientServices(prev => prev.filter(s => s.id !== cs.id));
      toast.success('Service removed!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    } catch {
      toast.error('Failed to remove service.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    }
  };

  const serviceOptions = allServices
    .filter((svc: any) => !clientServices.some(cs => cs.serviceId === svc.id))
    .map((svc: any) => ({
      value: svc.id,
      label: `${svc.nameEn || svc.name} - ${svc.nameAr || ''}`,
    }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 skeleton rounded-full" />
          <div className="space-y-2">
            <div className="h-6 w-48 skeleton rounded" />
            <div className="h-4 w-32 skeleton rounded" />
          </div>
        </div>
        <div className="h-48 skeleton rounded-2xl" />
        <div className="h-96 skeleton rounded-2xl" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/clients')} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="text-center py-16">
          <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">Client not found</h3>
          <p className="text-sm text-slate-500">The requested client could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/clients')} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{client.name}</h1>
            <StatusBadge status={client.status || (client.isActive !== false ? 'Active' : 'Inactive')} />
          </div>
          {client.nameAr && (
            <p className="text-slate-500 text-sm mt-0.5" dir="rtl">{client.nameAr}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/clients?edit=${id}`)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-200"
          >
            <Edit3 className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all border border-rose-200 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </button>
        </div>
      </div>

      {/* Client Info Card */}
      <div className="card-premium p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Information</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Building2 className="h-4 w-4 text-slate-400" />
                {client.contactPerson}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Phone className="h-4 w-4 text-slate-400" />
                {client.phone}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Mail className="h-4 w-4 text-slate-400" />
                {client.email}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <MapPin className="h-4 w-4 text-slate-400" />
                {client.address}, {client.city}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Authorization</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Auth #</span>
                <span className="font-mono text-slate-900">{client.authorizationNumber || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Import #</span>
                <span className="font-mono text-slate-900">{client.importNumber || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Export #</span>
                <span className="font-mono text-slate-900">{client.exportNumber || '-'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expiry Dates</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Auth Expiry</span>
                <span className="flex items-center gap-1 text-slate-900">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {client.authorizationExpiry || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Import Expiry</span>
                <span className="flex items-center gap-1 text-slate-900">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {client.importExpiry || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Export Expiry</span>
                <span className="flex items-center gap-1 text-slate-900">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {client.exportExpiry || '-'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Financial</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">VAT Number</span>
                <span className="font-mono text-slate-900">{client.vatNumber || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">CR Number</span>
                <span className="font-mono text-slate-900">{client.crNumber || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Balance</span>
                <span className="font-bold text-slate-900">
                  SAR {(client.outstandingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Jobs</span>
                <span className="font-bold text-emerald-600">{client.totalJobs}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
        <div className="flex items-center gap-1 p-2 border-b border-slate-100 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <div className="flex items-center gap-3">
                    <Package className="h-8 w-8 text-emerald-600" />
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{client.totalJobs}</p>
                      <p className="text-xs text-slate-500">Total Jobs</p>
                    </div>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-lg font-bold text-slate-900">
                        SAR {(client.outstandingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-slate-500">Outstanding Balance</p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-purple-600" />
                    <div>
                      <p className="text-lg font-bold text-slate-900">
                        SAR {(client.totalInvoiced || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-slate-500">Total Invoiced</p>
                    </div>
                  </div>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-8 w-8 text-amber-600" />
                    <div>
                      <p className="text-lg font-bold text-slate-900">
                        SAR {(client.totalPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-slate-500">Total Paid</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Advance Balance Summary */}
              {advancesLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                </div>
              ) : (() => {
                const totalAdvance = advances.reduce((s, a) => s + (a.amount || 0), 0);
                const totalUsed = advances.reduce((s, a) => s + (a.usedAmount || 0), 0);
                const totalRemaining = advances.reduce((s, a) => s + (a.remainingAmount || 0), 0);
                const activeCount = advances.filter(a => a.status === 'ACTIVE' || a.status === 'PARTIAL').length;
                if (advances.length === 0) return null;
                return (
                  <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl p-5 border border-indigo-100">
                    <div className="flex items-center gap-2 mb-4">
                      <Wallet className="h-5 w-5 text-indigo-600" />
                      <h3 className="text-sm font-bold text-indigo-900">Client Advance Summary</h3>
                      <span className="ml-auto text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                        {advances.length} advance{advances.length !== 1 ? 's' : ''} | {activeCount} active
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Total Advanced</p>
                        <p className="text-lg font-bold text-slate-900">
                          SAR {totalAdvance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Used / Applied</p>
                        <p className="text-lg font-bold text-amber-700">
                          SAR {totalUsed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Remaining Available</p>
                        <p className="text-lg font-bold text-emerald-700">
                          SAR {totalRemaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    {totalAdvance > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>Utilization</span>
                          <span>{totalAdvance > 0 ? Math.round((totalUsed / totalAdvance) * 100) : 0}%</span>
                        </div>
                        <div className="w-full bg-indigo-100 rounded-full h-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full transition-all"
                            style={{ width: `${totalAdvance > 0 ? Math.min(100, (totalUsed / totalAdvance) * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === 'jobs' && (
            <>
              {jobsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-900 mb-1">No Jobs Found</h3>
                  <p className="text-sm text-slate-500">No job references linked to this client yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-premium">
                    <thead>
                      <tr>
                        <th>Job Ref No</th>
                        <th>Status</th>
                        <th>Direction</th>
                        <th>Mode</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((job) => (
                        <tr key={job.id}>
                          <td>
                            <span className="text-sm font-medium text-slate-900 font-mono">{job.jobRefNo}</span>
                          </td>
                          <td>
                            <StatusBadge status={job.status} />
                          </td>
                          <td className="text-sm text-slate-700">{job.direction || '-'}</td>
                          <td className="text-sm text-slate-700">{job.modeOfTransport || '-'}</td>
                          <td className="text-sm text-slate-700 whitespace-nowrap">{job.createdAt ? new Date(job.createdAt).toLocaleDateString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === 'invoices' && (
            <>
              {invoicesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-900 mb-1">No Invoices Found</h3>
                  <p className="text-sm text-slate-500">No sales invoices for this client yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-premium">
                    <thead>
                      <tr>
                        <th>Invoice No</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Paid</th>
                        <th>Due</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id}>
                          <td>
                            <span className="text-sm font-medium text-slate-900 font-mono">{(inv as any).invoiceNumber || inv.invoiceNo}</span>
                          </td>
                          <td className="text-sm text-slate-700 whitespace-nowrap">{inv.invoiceDate || '-'}</td>
                          <td className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                            SAR {((inv as any).totalAmount || inv.grandTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="text-sm text-slate-700 whitespace-nowrap">
                            SAR {(inv.paidAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="text-sm font-semibold text-rose-700 whitespace-nowrap">
                            SAR {((inv as any).balanceDue || inv.dueAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td>
                            <StatusBadge status={inv.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === 'payments' && (
            <>
              {paymentsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-900 mb-1">No Payments Found</h3>
                  <p className="text-sm text-slate-500">No payment history for this client yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-premium">
                    <thead>
                      <tr>
                        <th>Entry No</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Doc Number</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((pmt) => (
                        <tr key={pmt.id}>
                          <td>
                            <span className="text-sm font-medium text-slate-900 font-mono">{pmt.documentId || '-'}</span>
                          </td>
                          <td className="text-sm text-slate-700 whitespace-nowrap">{pmt.documentDate ? new Date(pmt.documentDate).toLocaleDateString() : '-'}</td>
                          <td className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                            SAR {(pmt.totalDr || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="text-sm text-slate-700">{pmt.method || '-'}</td>
                          <td className="text-sm text-slate-700 font-mono">{pmt.documentNumber || '-'}</td>
                          <td>
                            <StatusBadge status={pmt.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === 'advances' && (
            <>
              {advancesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
                </div>
              ) : advances.length === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-900 mb-1">No Advances Found</h3>
                  <p className="text-sm text-slate-500">No client advances recorded yet.</p>
                </div>
              ) : (
                <div>
                  {/* Summary Cards */}
                  {(() => {
                    const totalAdvance = advances.reduce((s, a) => s + (a.amount || 0), 0);
                    const totalUsed = advances.reduce((s, a) => s + (a.usedAmount || 0), 0);
                    const totalRemaining = advances.reduce((s, a) => s + (a.remainingAmount || 0), 0);
                    return (
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 text-center">
                          <p className="text-xs text-slate-500 mb-1">Total Advanced</p>
                          <p className="text-xl font-bold text-indigo-700">SAR {totalAdvance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 text-center">
                          <p className="text-xs text-slate-500 mb-1">Used / Applied</p>
                          <p className="text-xl font-bold text-amber-700">SAR {totalUsed.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 text-center">
                          <p className="text-xs text-slate-500 mb-1">Remaining Available</p>
                          <p className="text-xl font-bold text-emerald-700">SAR {totalRemaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Advances Table */}
                  <div className="overflow-x-auto">
                    <table className="table-premium">
                      <thead>
                        <tr>
                          <th>Advance No</th>
                          <th>Date</th>
                          <th>Method</th>
                          <th className="text-right">Amount</th>
                          <th className="text-right">Used</th>
                          <th className="text-right">Remaining</th>
                          <th>Utilization</th>
                          <th>Reference</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {advances.map((adv) => {
                          const pct = adv.amount > 0 ? Math.round(((adv.usedAmount || 0) / adv.amount) * 100) : 0;
                          return (
                            <tr key={adv.id}>
                              <td>
                                <span className="text-sm font-medium text-slate-900 font-mono">{adv.advanceNumber || '-'}</span>
                              </td>
                              <td className="text-sm text-slate-700 whitespace-nowrap">
                                {adv.date ? new Date(adv.date).toLocaleDateString() : '-'}
                              </td>
                              <td className="text-sm text-slate-700">{adv.paymentMethod || '-'}</td>
                              <td className="text-sm font-semibold text-slate-900 whitespace-nowrap text-right">
                                SAR {(adv.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="text-sm font-semibold text-amber-700 whitespace-nowrap text-right">
                                SAR {(adv.usedAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="text-sm font-semibold text-emerald-700 whitespace-nowrap text-right">
                                SAR {(adv.remainingAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td>
                                <div className="flex items-center gap-2 min-w-[120px]">
                                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full transition-all ${pct >= 100 ? 'bg-rose-500' : pct > 0 ? 'bg-amber-500' : 'bg-slate-200'}`}
                                      style={{ width: `${Math.min(100, pct)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-slate-500 font-mono w-8 text-right">{pct}%</span>
                                </div>
                              </td>
                              <td className="text-sm text-slate-700 font-mono">{adv.reference || '-'}</td>
                              <td>
                                <StatusBadge status={adv.status} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'services' && (
            <>
              {servicesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-700">Assigned Services ({clientServices.length})</h3>
                    <button
                      onClick={() => { setEditingService(null); setServiceForm({ serviceId: '', customAmount: '', customVat: '', notes: '' }); setShowServiceModal(true); }}
                      className="btn-primary text-sm"
                    >
                      <Plus className="h-4 w-4" />
                      Add Service
                    </button>
                  </div>
                  {clientServices.length === 0 ? (
                    <div className="text-center py-12">
                      <Settings className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-slate-900 mb-1">No Services Assigned</h3>
                      <p className="text-sm text-slate-500">Add services with custom pricing for this client.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="table-premium">
                        <thead>
                          <tr>
                            <th>Service Name</th>
                            <th>Group</th>
                            <th className="text-right">Default Amount</th>
                            <th className="text-right">Client Amount</th>
                            <th className="text-center">VAT %</th>
                            <th>Notes</th>
                            <th className="text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clientServices.map((cs: any) => {
                            const svc = cs.service || {};
                            const hasOverride = cs.customAmount != null && cs.customAmount !== svc.defaultAmount;
                            return (
                              <tr key={cs.id}>
                                <td>
                                  <div>
                                    <span className="text-sm font-semibold text-slate-900">{svc.nameEn || svc.name || '-'}</span>
                                    {svc.nameAr && <span className="text-xs text-slate-400 block" dir="rtl">{svc.nameAr}</span>}
                                  </div>
                                </td>
                                <td><span className="text-sm text-slate-600">{svc.serviceGroup || svc.groupId || '-'}</span></td>
                                <td className="text-right"><span className="text-sm text-slate-500">{(svc.defaultAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                                <td className="text-right">
                                  <span className={`text-sm font-bold ${hasOverride ? 'text-blue-700' : 'text-slate-500'}`}>
                                    {cs.customAmount != null ? cs.customAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                  </span>
                                  {hasOverride && <span className="ml-1 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">Custom</span>}
                                </td>
                                <td className="text-center"><span className="text-sm text-slate-600">{cs.customVat != null ? `${cs.customVat}%` : (svc.vatApplicable === false ? '0%' : '15%')}</span></td>
                                <td><span className="text-sm text-slate-500 truncate max-w-[150px] block">{cs.notes || '-'}</span></td>
                                <td className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => {
                                        setEditingService(cs);
                                        setServiceForm({
                                          serviceId: cs.serviceId,
                                          customAmount: cs.customAmount != null ? String(cs.customAmount) : '',
                                          customVat: cs.customVat != null ? String(cs.customVat) : '',
                                          notes: cs.notes || '',
                                        });
                                        setShowServiceModal(true);
                                      }}
                                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                      title="Edit"
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteService(cs)}
                                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                      title="Remove"
                                    >
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
                </div>
              )}
            </>
          )}

          {activeTab === 'soa' && (
            <>
              {soaLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
                </div>
              ) : soaEntries.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-900 mb-1">No SOA Entries</h3>
                  <p className="text-sm text-slate-500">No statement of account entries for this client yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-premium">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Reference</th>
                        <th>Description</th>
                        <th>Debit</th>
                        <th>Credit</th>
                        <th>Running Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {soaEntries.map((entry: any, idx: number) => (
                        <tr key={entry.id || idx}>
                          <td className="text-sm text-slate-700 whitespace-nowrap">{entry.date || '-'}</td>
                          <td>
                            <span className="text-sm font-medium text-slate-900 font-mono">{entry.reference || '-'}</span>
                          </td>
                          <td>
                            <span className="text-sm text-slate-600 truncate max-w-[300px] block">{entry.description || '-'}</span>
                          </td>
                          <td className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                            {(entry.debit || 0) > 0
                              ? `SAR ${(entry.debit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                              : '-'}
                          </td>
                          <td className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                            {(entry.credit || 0) > 0
                              ? `SAR ${(entry.credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                              : '-'}
                          </td>
                          <td>
                            <span className={`text-sm font-bold whitespace-nowrap ${(entry.balance || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                              SAR {(entry.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{editingService ? 'Edit Service Pricing' : 'Add Service'}</h2>
              <button onClick={() => { setShowServiceModal(false); setEditingService(null); }} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {!editingService && (
                <SearchableSelect
                  label="Service"
                  required
                  options={serviceOptions}
                  value={serviceForm.serviceId}
                  onChange={(val) => setServiceForm(prev => ({ ...prev, serviceId: val }))}
                  placeholder="Select service..."
                />
              )}
              {editingService && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Service</label>
                  <p className="text-sm font-semibold text-slate-900">{editingService.service?.nameEn || editingService.service?.name || '-'}</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Custom Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-premium w-full"
                  placeholder="Leave empty to use default"
                  value={serviceForm.customAmount}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, customAmount: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Custom VAT %</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-premium w-full"
                  placeholder="Leave empty to use default (15%)"
                  value={serviceForm.customVat}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, customVat: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Notes</label>
                <textarea
                  className="input-premium w-full resize-none"
                  rows={2}
                  placeholder="Optional notes..."
                  value={serviceForm.notes}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => { setShowServiceModal(false); setEditingService(null); }} className="btn-secondary">Cancel</button>
              <button onClick={handleSaveService} className="btn-primary">{editingService ? 'Update' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetailsPage;
