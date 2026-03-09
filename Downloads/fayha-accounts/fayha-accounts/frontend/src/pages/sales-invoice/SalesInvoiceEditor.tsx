import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Mail,
  ChevronDown,
  ChevronUp,
  Package,
  DollarSign,
  Clock,
  Target,
} from 'lucide-react';
import type {
  SalesInvoiceItem,
  ServiceGroup,
  InvoiceService,
  SaleMethod,
  InvoiceCategory,
  Client,
  JobReference,
} from '../../types';
import SearchableSelect from '../../components/common/SearchableSelect';
import {
  salesInvoicesApi,
  invoiceServicesApi,
  customersApi,
  jobReferencesApi,
  clientServicesApi,
} from '../../services/api';

// ===================================================================
// SalesInvoiceEditor Component
// ===================================================================

const SalesInvoiceEditor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditing = Boolean(id);
  const queryJobRefId = searchParams.get('jobRefId') || '';

  // Data state
  const [clients, setClients] = useState<Client[]>([]);
  const [jobReferences, setJobReferences] = useState<JobReference[]>([]);
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);
  const [invoiceServices, setInvoiceServices] = useState<InvoiceService[]>([]);
  const [existingInvoices, setExistingInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [saleMethod, setSaleMethod] = useState<SaleMethod>('Credit');
  const [clientId, setClientId] = useState('');
  const [jobRefId, setJobRefId] = useState('');
  const [note, setNote] = useState('');
  const [termsName, setTermsName] = useState('');
  const [termsContent, setTermsContent] = useState('');
  const [, setCategory] = useState<InvoiceCategory>('Customs Clearance Invoice');
  const [items, setItems] = useState<SalesInvoiceItem[]>([]);

  // UI state
  const [costDetailsOpen, setCostDetailsOpen] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [mergedServices, setMergedServices] = useState<any[] | null>(null);

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [clientData, jobData, serviceData, invoiceData] = await Promise.all([
          customersApi.getAll(),
          jobReferencesApi.getAll(),
          invoiceServicesApi.getAll(),
          salesInvoicesApi.getAll(),
        ]);
        setClients(Array.isArray(clientData) ? clientData : []);
        setJobReferences(Array.isArray(jobData) ? jobData : []);
        const invoices = Array.isArray(invoiceData) ? invoiceData : [];
        setExistingInvoices(invoices);

        // Map backend fields to frontend expected shape
        // Backend: nameEn, serviceGroup, vatApplicable, defaultAmount
        // Frontend: name, groupId, defaultVatPercent
        const rawServices = Array.isArray(serviceData) ? serviceData : [];
        const services = rawServices.map((svc: any) => ({
          ...svc,
          name: svc.name || svc.nameEn || '',
          nameAr: svc.nameAr || '',
          groupId: svc.groupId || svc.serviceGroup || '',
          defaultVatPercent: svc.defaultVatPercent ?? (svc.vatApplicable === false ? 0 : 15),
          defaultAmount: svc.defaultAmount || 0,
        }));
        setInvoiceServices(services);

        // Derive unique service groups from the services' groupId field
        const groupMap = new Map<string, ServiceGroup>();
        for (const svc of services) {
          if (svc.groupId && !groupMap.has(svc.groupId)) {
            groupMap.set(svc.groupId, { id: svc.groupId, name: svc.groupId, nameAr: '' });
          }
        }
        setServiceGroups(Array.from(groupMap.values()));

        if (id) {
          // Editing existing invoice
          try {
            const existing = await salesInvoicesApi.getById(id);
            if (existing) {
              setInvoiceDate(existing.invoiceDate);
              setSaleMethod(existing.saleMethod);
              setClientId(existing.clientId);
              setJobRefId(existing.jobReferenceId || existing.jobRefId || '');
              setNote(existing.note || '');
              setTermsName(existing.termsConditionsName || '');
              setTermsContent(existing.termsConditionsContent || '');
              setCategory(existing.category);
              setItems((existing.items || []).map((it: any) => ({
                ...it,
                name: it.name || it.nameEn || '',
                vatPercent: it.vatPercent ?? (it.vatRate != null ? Math.round(it.vatRate * 100) : 15),
                total: it.total ?? it.totalAmount ?? 0,
              })));
              // Load merged services for editing client
              if (existing.clientId) {
                try {
                  const merged = await clientServicesApi.getMerged(existing.clientId);
                  if (Array.isArray(merged) && merged.length > 0) {
                    setMergedServices(merged);
                  }
                } catch { /* ignore */ }
              }
            }
          } catch {
            // Invoice not found
          }
        } else if (queryJobRefId) {
          // Creating new invoice from Job Reference - pre-fill data
          const jobList = Array.isArray(jobData) ? jobData : [];
          const job = jobList.find((j: any) => j.id === queryJobRefId);
          if (job) {
            // Check if JR already has an invoice
            const existingInv = invoices.find((inv: any) => (inv.jobReferenceId || inv.jobRefId) === queryJobRefId);
            if (existingInv) {
              toast.error(
                `This Job Reference already has an invoice: ${existingInv.invoiceNumber || existingInv.id} (${existingInv.status || 'DRAFT'})`,
                { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' }, duration: 5000 }
              );
              navigate('/sales-invoice');
              return;
            }
            setJobRefId(queryJobRefId);
            setClientId(job.clientId || '');
            // Load client-specific pricing
            if (job.clientId) {
              try {
                const merged = await clientServicesApi.getMerged(job.clientId);
                if (Array.isArray(merged) && merged.length > 0) {
                  setMergedServices(merged);
                }
              } catch { /* ignore */ }
            }
            // Auto-populate expense entries from full JR details
            try {
              const fullJob = await jobReferencesApi.getById(queryJobRefId);
              const expenses: any[] = fullJob?.expenseEntries || [];
              if (expenses.length > 0) {
                const expenseItems: SalesInvoiceItem[] = expenses.map((exp: any, idx: number) => {
                  const amt = exp.totalAmount || 0;
                  return {
                    id: `exp-${Date.now()}-${idx}`,
                    serviceId: '',
                    name: exp.category || 'Expense',
                    nameAr: '',
                    description: `[Reimbursable] ${exp.description || exp.category || 'Expense'}${exp.expenseNumber ? ` (${exp.expenseNumber})` : ''}`,
                    amount: amt,
                    vatPercent: 0,
                    vatAmount: 0,
                    total: amt,
                  };
                });
                setItems(expenseItems);
              }
            } catch { /* ignore - expenses just won't auto-populate */ }
            toast.success(`Pre-filled from Job Reference: ${job.jobRefNo || job.jobNumber || queryJobRefId}`, { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
          }
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      }
      setLoading(false);
    };
    loadData();
  }, [id, queryJobRefId]);

  // Fetch full JR details and auto-populate expense entries as invoice line items
  const handleJobRefChange = async (newJobRefId: string) => {
    if (!newJobRefId) {
      setJobRefId('');
      return;
    }

    // Block if JR already has an invoice (except when editing that same invoice)
    const existingInv = invoiceByJobRef.get(newJobRefId);
    if (existingInv) {
      toast.error(
        `This Job Reference already has an invoice: ${existingInv.invoiceNumber} (${existingInv.status})`,
        { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' }, duration: 4000 }
      );
      return;
    }

    setJobRefId(newJobRefId);
    if (isEditing) return;

    try {
      const fullJob = await jobReferencesApi.getById(newJobRefId);
      const expenses: any[] = fullJob?.expenseEntries || [];
      if (expenses.length === 0) return;

      const expenseItems: SalesInvoiceItem[] = expenses.map((exp: any, idx: number) => {
        const amt = exp.totalAmount || 0;
        return {
          id: `exp-${Date.now()}-${idx}`,
          serviceId: '',
          name: exp.category || 'Expense',
          nameAr: '',
          description: `[Reimbursable] ${exp.description || exp.category || 'Expense'}${exp.expenseNumber ? ` (${exp.expenseNumber})` : ''}`,
          amount: amt,
          vatPercent: 0,
          vatAmount: 0,
          total: amt,
        };
      });

      setItems(expenseItems);
    } catch (err) {
      console.error('Failed to fetch JR expense entries:', err);
    }
  };

  // Get the selected job reference for cost details
  const selectedJob = useMemo(
    () => jobReferences.find((j) => j.id === jobRefId),
    [jobReferences, jobRefId]
  );

  // Filtered services by selected group - prefer mergedServices when client is selected
  const activeServices = mergedServices || invoiceServices;
  const filteredServices = useMemo(
    () =>
      selectedGroupId
        ? activeServices.filter((s) => s.groupId === selectedGroupId)
        : activeServices,
    [activeServices, selectedGroupId]
  );

  // Calculations
  const subTotal = items.reduce((s, i) => s + (i.amount || 0), 0);
  const totalVat = items.reduce((s, i) => s + (i.vatAmount || 0), 0);
  const grandTotal = +(subTotal + totalVat).toFixed(2);

  const containerDetention = selectedJob?.containerDetention || 0;
  const actualJobCost = selectedJob?.totalPayableCost || 0;
  const invoiceAmount = grandTotal;
  const profitability = +(invoiceAmount - actualJobCost).toFixed(2);

  // Handlers
  const handleAddItem = () => {
    if (!selectedServiceId) return;
    const svc = activeServices.find((s) => s.id === selectedServiceId);
    if (!svc) return;

    // Use clientAmount if client has custom pricing, otherwise use default
    const amt = (svc.clientAmount != null ? svc.clientAmount : svc.defaultAmount) || 0;
    const vatPct = (svc.clientVat != null ? svc.clientVat : svc.defaultVatPercent) ?? 15;
    const vatAmt = +(amt * (vatPct / 100)).toFixed(2);

    const isClientPricing = svc.hasClientOverride && svc.clientAmount != null;
    const newItem: SalesInvoiceItem = {
      id: `item-${Date.now()}`,
      serviceId: svc.id,
      name: svc.name,
      nameAr: svc.nameAr,
      description: `${svc.name}${svc.nameAr ? ' - ' + svc.nameAr : ''}${isClientPricing ? ' [Client Rate]' : ''}`,
      amount: amt,
      vatPercent: vatPct,
      vatAmount: vatAmt,
      total: +(amt + vatAmt).toFixed(2),
    };
    setItems((prev) => [...prev, newItem]);
    setSelectedServiceId('');
  };

  const handleUpdateAmount = (index: number, amount: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      item.amount = amount;
      item.vatAmount = +(amount * (item.vatPercent / 100)).toFixed(2);
      item.total = +(amount + item.vatAmount).toFixed(2);
      updated[index] = item;
      return updated;
    });
  };

  const handleUpdateVat = (index: number, vatRequired: boolean, vatPct?: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      item.vatPercent = vatRequired ? (vatPct ?? (item.vatPercent || 15)) : 0;
      item.vatAmount = +(item.amount * (item.vatPercent / 100)).toFixed(2);
      item.total = +(item.amount + item.vatAmount).toFixed(2);
      updated[index] = item;
      return updated;
    });
  };

  const handleUpdateDescription = (index: number, description: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], description };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const validateInvoice = (): boolean => {
    if (!clientId) {
      toast.error('Please select a client.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return false;
    }
    if (!jobRefId) {
      toast.error('Please select a job reference.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return false;
    }
    if (!invoiceDate) {
      toast.error('Please select an invoice date.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return false;
    }
    if (items.length === 0) {
      toast.error('Please add at least one service item.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return false;
    }
    const hasEmptyName = items.some(item => !item.name || !item.name.trim());
    if (hasEmptyName) {
      toast.error('All items must have a name/description.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return false;
    }
    const hasZeroAmount = items.some(item => !item.amount || item.amount <= 0);
    if (hasZeroAmount) {
      toast.error('All items must have an amount greater than zero.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateInvoice()) return;
    try {
      const invoiceData = {
        invoiceDate, saleMethod, clientId, jobReferenceId: jobRefId,
        notes: note, termsConditionsName: termsName, termsConditionsContent: termsContent,
        items: items.map((item, idx) => ({
          lineNumber: idx + 1,
          serviceId: item.serviceId,
          nameEn: item.name,
          nameAr: item.nameAr || '',
          description: item.description,
          amount: item.amount,
          vatRate: (item.vatPercent ?? 15) / 100,
          vatAmount: item.vatAmount,
          totalAmount: item.total,
        })),
        subtotal: subTotal, vatAmount: totalVat, totalAmount: grandTotal,
      };
      if (isEditing && id) {
        await salesInvoicesApi.update(id, invoiceData);
      } else {
        await salesInvoicesApi.create(invoiceData);
      }
      toast.success('Invoice submitted successfully!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      navigate('/sales-invoice');
    } catch {
      toast.error('Failed to submit invoice.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    }
  };

  const handleSubmitWithMail = async () => {
    if (!validateInvoice()) return;

    // Find client email
    const selectedClient = clients.find(c => c.id === clientId);
    if (!selectedClient?.email) {
      toast.error('Selected client does not have an email address configured.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }

    try {
      const invoiceData = {
        invoiceDate, saleMethod, clientId, jobReferenceId: jobRefId,
        notes: note, termsConditionsName: termsName, termsConditionsContent: termsContent,
        items: items.map((item, idx) => ({
          lineNumber: idx + 1,
          serviceId: item.serviceId,
          nameEn: item.name,
          nameAr: item.nameAr || '',
          description: item.description,
          amount: item.amount,
          vatRate: (item.vatPercent ?? 15) / 100,
          vatAmount: item.vatAmount,
          totalAmount: item.total,
        })),
        subtotal: subTotal, vatAmount: totalVat, totalAmount: grandTotal, sentByEmail: true,
      };
      if (isEditing && id) {
        await salesInvoicesApi.update(id, invoiceData);
      } else {
        await salesInvoicesApi.create(invoiceData);
      }
      toast.success(`Invoice submitted! Email will be sent to ${selectedClient.email}`, { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      navigate('/sales-invoice');
    } catch {
      toast.error('Failed to submit invoice.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    }
  };

  // Client options
  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  // Map of jobReferenceId -> invoice info (for duplicate prevention)
  const invoiceByJobRef = useMemo(() => {
    const map = new Map<string, { invoiceNumber: string; status: string; id: string }>();
    for (const inv of existingInvoices) {
      const jrId = inv.jobReferenceId || inv.jobRefId;
      if (jrId) {
        // When editing, exclude the current invoice from the map
        if (isEditing && inv.id === id) continue;
        map.set(jrId, {
          invoiceNumber: inv.invoiceNumber || inv.id,
          status: inv.status || 'DRAFT',
          id: inv.id,
        });
      }
    }
    return map;
  }, [existingInvoices, isEditing, id]);

  // Job reference options - filtered by selected client, tagged with existing invoice status
  const jobOptions = useMemo(() => {
    const toOption = (j: JobReference) => {
      const existing = invoiceByJobRef.get(j.id);
      const baseLabel = j.jobRefNo || (j as any).jobNumber || j.id;
      return {
        value: j.id,
        label: existing
          ? `${baseLabel}  [${existing.status} - ${existing.invoiceNumber}]`
          : baseLabel,
      };
    };
    if (clientId) {
      const filtered = jobReferences.filter((j) => j.clientId === clientId);
      if (filtered.length > 0) return filtered.map(toOption);
    }
    return jobReferences.map(toOption);
  }, [jobReferences, clientId, invoiceByJobRef]);

  // Service group options
  const groupOptions = serviceGroups.map((g) => ({
    value: g.id,
    label: `${g.name}${g.nameAr ? ' - ' + g.nameAr : ''}`,
    labelAr: g.nameAr,
  }));

  // Service options
  const serviceOptions = filteredServices.map((s) => ({
    value: s.id,
    label: `${s.name} - ${s.nameAr}`,
    labelAr: s.nameAr,
  }));

  // Terms options
  const termsOptions = [
    { value: 'Net 30', label: 'Net 30' },
    { value: 'Net 45', label: 'Net 45' },
    { value: 'Net 60', label: 'Net 60' },
    { value: 'Cash on Delivery', label: 'Cash on Delivery' },
    { value: 'Prepaid', label: 'Prepaid' },
  ];

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 skeleton rounded-full" />
          <div className="space-y-2">
            <div className="h-6 w-48 skeleton rounded" />
            <div className="h-4 w-32 skeleton rounded" />
          </div>
        </div>
        <div className="h-96 skeleton rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEditing ? 'Edit Sales Invoice' : 'Sales Invoice'}
          </h1>
          <p className="text-slate-500 text-sm">
            {isEditing ? 'Update invoice details' : 'Create a new sales invoice'}
          </p>
        </div>
      </div>

      {/* Collapsible: Shipment Process Cost Details */}
      <div className="card-premium overflow-hidden">
        <button
          onClick={() => setCostDetailsOpen(!costDetailsOpen)}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50/50 transition-colors"
        >
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Shipment Process Cost Details
          </h2>
          {costDetailsOpen ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </button>

        {costDetailsOpen && (
          <div className="px-5 pb-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Shipment Process Cost */}
              <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-purple-500 to-purple-700 text-white">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                      Shipment Process Cost
                    </p>
                    <p className="text-lg font-bold">
                      {selectedJob?.shipmentProcessCost?.toLocaleString() || '0'} SR
                    </p>
                  </div>
                </div>
              </div>

              {/* Total Payable Cost */}
              <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-teal-500 to-teal-700 text-white">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                      Total Payable Cost
                    </p>
                    <p className="text-lg font-bold">
                      {selectedJob?.totalPayableCost?.toLocaleString() || '0'} SR
                    </p>
                  </div>
                </div>
              </div>

              {/* Container Detention */}
              <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                      Container Detention
                    </p>
                    <p className="text-lg font-bold">
                      {selectedJob?.containerDetention?.toLocaleString() || '0'} SR
                    </p>
                  </div>
                </div>
              </div>

              {/* Estimated Cost */}
              <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-amber-500 to-amber-700 text-white">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                      Estimated Cost
                    </p>
                    <p className="text-lg font-bold">
                      {selectedJob?.estimatedCost?.toLocaleString() || '0'} SR
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Job Reference Info Banner */}
      {selectedJob && (
        <div className="card-premium p-4 bg-gradient-to-r from-blue-50 to-indigo-50/50 border-blue-200/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500 flex items-center justify-center text-white">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Job Reference: {selectedJob.jobRefNo || (selectedJob as any).jobNumber}</p>
                <p className="text-xs text-slate-500">
                  {selectedJob.direction || ''} {selectedJob.modeOfTransport ? `| ${selectedJob.modeOfTransport}` : ''}
                  {(selectedJob as any).origin ? ` | ${(selectedJob as any).origin}` : ''}
                  {(selectedJob as any).destination ? ` → ${(selectedJob as any).destination}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              {(selectedJob as any).financialSummary && (
                <>
                  <div className="text-right">
                    <p className="text-slate-500">Total Expenses</p>
                    <p className="font-bold text-slate-900">SAR {((selectedJob as any).financialSummary?.totalCost || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500">Invoiced</p>
                    <p className="font-bold text-emerald-700">SAR {((selectedJob as any).financialSummary?.totalServiceFees || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dashed separator */}
      <div className="border-t-2 border-dashed border-slate-200" />

      {/* Form Section */}
      <div className="card-premium p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Invoice Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Invoice Date<span className="text-rose-500 ml-0.5">*</span>
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="input-premium"
            />
          </div>

          {/* Sale Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Sale Method
            </label>
            <select
              value={saleMethod}
              onChange={(e) => setSaleMethod(e.target.value as SaleMethod)}
              className="input-premium"
            >
              <option value="Credit">Credit</option>
              <option value="Cash">Cash</option>
            </select>
          </div>

          {/* Client */}
          <SearchableSelect
            label="Client"
            required
            options={clientOptions}
            value={clientId}
            onChange={(val) => {
              setClientId(val);
              setJobRefId(''); // Reset job ref when client changes
              // Load client-specific service pricing
              if (val) {
                clientServicesApi.getMerged(val).then((data) => {
                  if (Array.isArray(data) && data.length > 0) {
                    setMergedServices(data);
                  } else {
                    setMergedServices(null);
                  }
                }).catch(() => setMergedServices(null));
              } else {
                setMergedServices(null);
              }
            }}
            placeholder="Search client..."
          />

          {/* Job ID / Job Ref */}
          <SearchableSelect
            label="Job ID / Job Ref."
            required
            options={jobOptions}
            value={jobRefId}
            onChange={handleJobRefChange}
            placeholder="Search job reference..."
          />

          {/* Note - full width */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="input-premium resize-none"
              placeholder="Add any notes..."
            />
          </div>

          {/* Terms Conditions Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Terms Conditions Name
            </label>
            <select
              value={termsName}
              onChange={(e) => {
                setTermsName(e.target.value);
                const term = termsOptions.find((t) => t.value === e.target.value);
                if (term) {
                  switch (term.value) {
                    case 'Net 30':
                      setTermsContent('Payment due within 30 days from the invoice date.');
                      break;
                    case 'Net 45':
                      setTermsContent('Payment due within 45 days from the invoice date.');
                      break;
                    case 'Net 60':
                      setTermsContent(
                        'Payment due within 60 days from the invoice date. Late payment incurs 2% monthly charge.'
                      );
                      break;
                    case 'Cash on Delivery':
                      setTermsContent(
                        'Full payment required upon delivery of clearance documents.'
                      );
                      break;
                    case 'Prepaid':
                      setTermsContent('Full payment required before service commencement.');
                      break;
                    default:
                      setTermsContent('');
                  }
                }
              }}
              className="input-premium"
            >
              <option value="">Select terms...</option>
              {termsOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Terms Content */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Terms Conditions Content
            </label>
            <textarea
              value={termsContent}
              onChange={(e) => setTermsContent(e.target.value)}
              rows={2}
              className="input-premium resize-none"
              placeholder="Terms and conditions content..."
            />
          </div>
        </div>
      </div>

      {/* ADD Invoice Items Section */}
      <div className="card-premium p-6">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
          ADD Invoice Items
        </h3>

        {/* Service Group + Service dropdowns + Add button */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <SearchableSelect
              label="Service Group"
              options={groupOptions}
              value={selectedGroupId}
              onChange={(val) => {
                setSelectedGroupId(val);
                setSelectedServiceId('');
              }}
              placeholder="Select service group..."
              showArabic
            />
          </div>
          <div className="flex-1">
            <SearchableSelect
              label="Services"
              options={serviceOptions}
              value={selectedServiceId}
              onChange={setSelectedServiceId}
              placeholder="Select service..."
              showArabic
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAddItem}
              disabled={!selectedServiceId}
              className="btn-primary h-[42px] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>

        {/* Line Items Table */}
        {items.length > 0 && (
          <div className="overflow-x-auto invoice-items-table">
            <table className="table-premium" style={{tableLayout:'fixed', width:'100%', minWidth:'1000px'}}>
              <thead>
                <tr>
                  <th style={{width:'12%'}}>Name</th>
                  <th style={{width:'18%'}}>Description</th>
                  <th className="text-right" style={{width:'11%'}}>Amount</th>
                  <th className="text-center" style={{width:'16%'}}>VAT Category</th>
                  <th className="text-center" style={{width:'11%'}}>VAT %</th>
                  <th className="text-right" style={{width:'10%'}}>VAT</th>
                  <th className="text-right" style={{width:'12%'}}>Total</th>
                  <th className="text-center" style={{width:'4%'}}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id} className="group">
                    <td>
                      <div>
                        <span className="text-sm font-semibold text-slate-900 block truncate">
                          {item.name}
                        </span>
                        {item.nameAr && (
                          <span className="text-xs text-slate-400 block truncate" dir="rtl">
                            {item.nameAr}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleUpdateDescription(index, e.target.value)}
                        className="w-full p-2 border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded-lg transition-colors outline-none text-sm"
                        placeholder="Description..."
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.amount || ''}
                        onChange={(e) =>
                          handleUpdateAmount(index, parseFloat(e.target.value) || 0)
                        }
                        className="w-full p-2 text-right border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded-lg transition-colors outline-none font-bold text-sm"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="text-center">
                      <select
                        value={item.vatPercent > 0 ? 'Yes' : 'No'}
                        onChange={(e) => handleUpdateVat(index, e.target.value === 'Yes')}
                        className={`w-full p-2 text-sm font-semibold border rounded-lg transition-colors outline-none text-center ${item.vatPercent === 0 ? 'border-orange-300 bg-orange-50 text-orange-600' : 'border-emerald-300 bg-emerald-50 text-emerald-700'}`}
                      >
                        <option value="Yes">Standard (S)</option>
                        <option value="No">Out of Scope (O)</option>
                      </select>
                    </td>
                    <td className="text-center">
                      {item.vatPercent > 0 ? (
                        <input
                          type="number"
                          value={item.vatPercent}
                          onChange={(e) => handleUpdateVat(index, true, parseFloat(e.target.value) || 0)}
                          className="w-full p-2 text-center text-sm font-bold border border-slate-200 hover:border-slate-300 focus:border-emerald-500 rounded-lg transition-colors outline-none bg-amber-50 text-amber-700"
                          min="0"
                          max="100"
                          step="0.5"
                        />
                      ) : (
                        <span className="text-sm font-bold text-orange-500">0%</span>
                      )}
                    </td>
                    <td className="text-right">
                      <span className="text-sm font-semibold text-slate-600">
                        {(item.vatAmount || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className="text-sm font-bold text-slate-900">
                        {(item.total || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {items.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
            <p className="text-sm text-slate-400">
              No items added yet. Select a service group and service, then click Add.
            </p>
          </div>
        )}
      </div>

      {/* Summary + Totals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Profitability Summary */}
        <div className="card-premium p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500">Container Detention</span>
              <span className="text-sm font-semibold text-slate-900">
                {containerDetention.toLocaleString(undefined, { minimumFractionDigits: 2 })} SR
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500">Actual Job Cost</span>
              <span className="text-sm font-semibold text-slate-900">
                {actualJobCost.toLocaleString(undefined, { minimumFractionDigits: 2 })} SR
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500">Invoice Amount</span>
              <span className="text-sm font-bold text-slate-900">
                {invoiceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} SR
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-semibold text-slate-700">Profitability</span>
              <span
                className={`text-sm font-bold ${
                  profitability >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {profitability >= 0 ? '+' : ''}
                {profitability.toLocaleString(undefined, { minimumFractionDigits: 2 })} SR
              </span>
            </div>
          </div>
        </div>

        {/* Right: Totals */}
        <div className="card-premium p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Totals
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500">Sub Total Amount</span>
              <span className="text-sm font-semibold text-slate-900">
                SAR{' '}
                {subTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500">Total VAT Amount</span>
              <span className="text-sm font-semibold text-amber-700">
                SAR{' '}
                {totalVat.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t-2 border-slate-200">
              <span className="text-base font-bold text-slate-900">Grand Total</span>
              <span className="text-xl font-bold text-slate-900">
                SAR{' '}
                {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <button
          onClick={() => navigate('/sales-invoice')}
          className="btn-ghost"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmitWithMail}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-500/20 transition-all"
        >
          <Mail className="h-4 w-4" />
          Submit With Mail
        </button>
        <button onClick={handleSubmit} className="btn-primary">
          Submit
        </button>
      </div>
    </div>
  );
};

export default SalesInvoiceEditor;
