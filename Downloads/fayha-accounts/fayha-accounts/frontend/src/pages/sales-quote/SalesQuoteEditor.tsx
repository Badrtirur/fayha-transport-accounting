import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Send,
} from 'lucide-react';
import type {
  SalesInvoiceItem,
  ServiceGroup,
  InvoiceService,
  Client,
} from '../../types';
import SearchableSelect from '../../components/common/SearchableSelect';
import {
  salesQuotesApi,
  invoiceServicesApi,
  customersApi,
} from '../../services/api';

const SalesQuoteEditor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [clients, setClients] = useState<Client[]>([]);
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);
  const [invoiceServices, setInvoiceServices] = useState<InvoiceService[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [clientId, setClientId] = useState('');
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState('');
  const [items, setItems] = useState<SalesInvoiceItem[]>([]);

  // UI state
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [clientData, serviceData] = await Promise.all([
          customersApi.getAll(),
          invoiceServicesApi.getAll(),
        ]);
        setClients(Array.isArray(clientData) ? clientData : []);

        const rawServices = Array.isArray(serviceData) ? serviceData : [];
        // Map backend fields (nameEn/serviceGroup/vatApplicable) to frontend fields (name/groupId/defaultVatPercent)
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
          try {
            const existing = await salesQuotesApi.getById(id);
            if (existing) {
              // SalesQuote doesn't store clientId - try to find client by name
              if (existing.clientName) {
                const matchedClient = clientData && (Array.isArray(clientData) ? clientData : []).find(
                  (c: any) => c.name === existing.clientName
                );
                if (matchedClient) setClientId(matchedClient.id);
              }
              setQuoteDate(existing.quoteDate ? new Date(existing.quoteDate).toISOString().split('T')[0] : existing.date || '');
              setValidUntil(existing.validUntil ? new Date(existing.validUntil).toISOString().split('T')[0] : '');
              // items is stored as JSON string in backend
              const parsedItems = typeof existing.items === 'string' ? JSON.parse(existing.items) : (existing.items || []);
              setItems(Array.isArray(parsedItems) ? parsedItems : []);
            }
          } catch {
            // Quote not found
          }
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      }
      setLoading(false);
    };
    loadData();
  }, [id]);

  const filteredServices = useMemo(
    () => selectedGroupId ? invoiceServices.filter((s) => s.groupId === selectedGroupId) : invoiceServices,
    [invoiceServices, selectedGroupId]
  );

  const subTotal = items.reduce((s, i) => s + (i.amount || 0), 0);
  const totalVat = items.reduce((s, i) => s + (i.vatAmount || 0), 0);
  const grandTotal = +(subTotal + totalVat).toFixed(2);

  const handleAddItem = () => {
    if (!selectedServiceId) return;
    const svc = invoiceServices.find((s) => s.id === selectedServiceId);
    if (!svc) return;

    const newItem: SalesInvoiceItem = {
      id: `qi-${Date.now()}`,
      serviceId: svc.id,
      name: svc.name,
      nameAr: svc.nameAr,
      description: `${svc.name} - ${svc.nameAr}`,
      amount: 0,
      vatPercent: svc.defaultVatPercent,
      vatAmount: 0,
      total: 0,
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

  const handleSaveDraft = async () => {
    if (!clientId) {
      toast.error('Please select a client.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }
    try {
      const selectedClient = clients.find((c) => c.id === clientId);
      const quoteData = {
        clientName: selectedClient?.name || '',
        clientEmail: selectedClient?.email || '',
        clientPhone: selectedClient?.phone || '',
        quoteDate,
        validUntil,
        items: JSON.stringify(items),
        subtotal: subTotal,
        vatAmount: totalVat,
        totalAmount: grandTotal,
        status: 'Draft',
      };
      if (isEditing && id) {
        await salesQuotesApi.update(id, quoteData);
      } else {
        await salesQuotesApi.create(quoteData);
      }
      toast.success('Quote saved as draft!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      navigate('/sales-quote');
    } catch {
      toast.error('Failed to save quote.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    }
  };

  const handleSend = async () => {
    if (!clientId) {
      toast.error('Please select a client.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }
    try {
      const selectedClient = clients.find((c) => c.id === clientId);
      const quoteData = {
        clientName: selectedClient?.name || '',
        clientEmail: selectedClient?.email || '',
        clientPhone: selectedClient?.phone || '',
        quoteDate,
        validUntil,
        items: JSON.stringify(items),
        subtotal: subTotal,
        vatAmount: totalVat,
        totalAmount: grandTotal,
        status: 'Sent',
      };
      if (isEditing && id) {
        await salesQuotesApi.update(id, quoteData);
      } else {
        await salesQuotesApi.create(quoteData);
      }
      toast.success('Quote sent to client!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      navigate('/sales-quote');
    } catch {
      toast.error('Failed to send quote.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    }
  };

  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }));
  const groupOptions = serviceGroups.map((g) => ({
    value: g.id,
    label: `${g.name}${g.nameAr ? ' - ' + g.nameAr : ''}`,
    labelAr: g.nameAr,
  }));
  const serviceOptions = filteredServices.map((s) => ({
    value: s.id,
    label: `${s.name} - ${s.nameAr}`,
    labelAr: s.nameAr,
  }));

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
        <button onClick={() => navigate(-1)} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isEditing ? 'Edit Sales Quote' : 'New Sales Quote'}
          </h1>
          <p className="text-slate-500 text-sm">
            {isEditing ? 'Update quote details' : 'Create a new sales quotation'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="card-premium p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SearchableSelect
            label="Client"
            required
            options={clientOptions}
            value={clientId}
            onChange={setClientId}
            placeholder="Search client..."
          />
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Date<span className="text-rose-500 ml-0.5">*</span>
            </label>
            <input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} className="input-premium" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Valid Until<span className="text-rose-500 ml-0.5">*</span>
            </label>
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="input-premium" />
          </div>
        </div>
      </div>

      {/* Service Items */}
      <div className="card-premium p-6">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Quote Items</h3>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <SearchableSelect
              label="Service Group"
              options={groupOptions}
              value={selectedGroupId}
              onChange={(val) => { setSelectedGroupId(val); setSelectedServiceId(''); }}
              placeholder="Select service group..."
              showArabic
            />
          </div>
          <div className="flex-1">
            <SearchableSelect
              label="Service"
              options={serviceOptions}
              value={selectedServiceId}
              onChange={setSelectedServiceId}
              placeholder="Select service..."
              showArabic
            />
          </div>
          <div className="flex items-end">
            <button onClick={handleAddItem} disabled={!selectedServiceId} className="btn-primary h-[42px] disabled:opacity-40 disabled:cursor-not-allowed">
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>

        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table-premium">
              <thead>
                <tr>
                  <th className="w-[22%]">Name</th>
                  <th className="w-[24%]">Description</th>
                  <th className="text-right w-[14%]">Amount</th>
                  <th className="text-center w-[10%]">VAT %</th>
                  <th className="text-right w-[12%]">VAT</th>
                  <th className="text-right w-[12%]">Total</th>
                  <th className="text-center w-[6%]">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id} className="group">
                    <td>
                      <div>
                        <span className="text-sm font-semibold text-slate-900 block">{item.name}</span>
                        {item.nameAr && <span className="text-xs text-slate-400" dir="rtl">{item.nameAr}</span>}
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
                        onChange={(e) => handleUpdateAmount(index, parseFloat(e.target.value) || 0)}
                        className="w-full p-2 text-right border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded-lg transition-colors outline-none font-bold text-sm"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="text-center"><span className="text-sm font-semibold text-slate-600">{item.vatPercent}%</span></td>
                    <td className="text-right"><span className="text-sm font-semibold text-slate-600">{(item.vatAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                    <td className="text-right"><span className="text-sm font-bold text-slate-900">{(item.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                    <td className="text-center">
                      <button onClick={() => handleRemoveItem(index)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
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
            <p className="text-sm text-slate-400">No items added yet. Select a service group and service, then click Add.</p>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="card-premium p-6 max-w-md ml-auto space-y-3">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Totals</h3>
        <div className="flex justify-between items-center py-2 border-b border-slate-100">
          <span className="text-sm text-slate-500">Sub Total</span>
          <span className="text-sm font-semibold text-slate-900">SAR {subTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-slate-100">
          <span className="text-sm text-slate-500">Total VAT (15%)</span>
          <span className="text-sm font-semibold text-amber-700">SAR {totalVat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between items-center pt-4 border-t-2 border-slate-200">
          <span className="text-base font-bold text-slate-900">Grand Total</span>
          <span className="text-xl font-bold text-slate-900">SAR {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <button onClick={() => navigate('/sales-quote')} className="btn-ghost">Cancel</button>
        <button onClick={handleSaveDraft} className="bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors">
          Save Draft
        </button>
        <button onClick={handleSend} className="btn-primary">
          <Send className="h-4 w-4" />
          Send Quote
        </button>
      </div>
    </div>
  );
};

export default SalesQuoteEditor;
