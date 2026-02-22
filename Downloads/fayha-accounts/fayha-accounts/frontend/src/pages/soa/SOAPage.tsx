import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Calendar,
  Printer,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  TrendingDown,
  Scale,
  FileSearch,
} from 'lucide-react';
import type { SOAEntry, Client } from '../../types';
import { soaApi, customersApi, vendorsApi } from '../../services/api';
import SearchableSelect from '../../components/common/SearchableSelect';

type EntityType = 'customer' | 'vendor';

const SOAPage: React.FC = () => {
  const navigate = useNavigate();
  const [entityType, setEntityType] = useState<EntityType>('customer');
  const [customers, setCustomers] = useState<Client[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [entityOptions, setEntityOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [entries, setEntries] = useState<SOAEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const formatDate = (d: any): string => {
    if (!d) return '-';
    try { const date = new Date(d); if (isNaN(date.getTime())) return String(d); return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return String(d); }
  };

  // Load customers
  useEffect(() => {
    customersApi.getAll().then((data) => {
      const list = (Array.isArray(data) ? data : []).map((c: any) => ({
        ...c,
        id: c.id || c._id || '',
        balance: c.balance ?? c.outstandingBalance ?? 0,
        city: c.city || '',
        vatNumber: c.vatNumber || c.taxNumber || '',
        crNumber: c.crNumber || '',
      }));
      setCustomers(list);
    }).catch(() => {
      setCustomers([]);
      toast.error('Failed to load customers.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    });

    vendorsApi.getAll().then((data) => {
      const list = (Array.isArray(data) ? data : []).map((v: any) => ({
        ...v,
        id: v.id || v._id || '',
        balance: v.balance ?? v.outstandingBalance ?? 0,
        city: v.city || '',
        vatNumber: v.vatNumber || v.taxNumber || '',
        crNumber: v.crNumber || '',
      }));
      setVendors(list);
    }).catch(() => {
      setVendors([]);
      toast.error('Failed to load vendors.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    });
  }, []);

  // Update entity options when type or data changes
  useEffect(() => {
    setSelectedEntityId('');
    setEntries([]);
    if (entityType === 'customer') {
      setEntityOptions(customers.map((c) => ({ value: c.id, label: c.name })));
    } else {
      setEntityOptions(vendors.map((v: any) => ({ value: v.id, label: v.name })));
    }
  }, [entityType, customers, vendors]);

  // Fetch SOA when entity changes
  useEffect(() => {
    if (selectedEntityId) {
      setLoading(true);
      const params = {
        ...(dateFrom ? { startDate: dateFrom } : {}),
        ...(dateTo ? { endDate: dateTo } : {}),
      };
      const fetchSOA = entityType === 'customer'
        ? soaApi.getCustomerSOA(selectedEntityId, params)
        : soaApi.getVendorSOA(selectedEntityId, params);

      fetchSOA.then((data: any) => {
        // Backend returns { customer/vendor, entries, ... } - extract entries array
        const entryList = Array.isArray(data) ? data : (data?.entries || []);
        setEntries(entryList);
      }).catch(() => {
        setEntries([]);
        toast.error('Failed to load statement of account.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      }).finally(() => {
        setLoading(false);
      });
    } else {
      setEntries([]);
    }
  }, [selectedEntityId, dateFrom, dateTo, entityType]);

  const selectedEntity = entityType === 'customer'
    ? customers.find((c) => c.id === selectedEntityId)
    : vendors.find((v: any) => v.id === selectedEntityId);

  // Apply date range filter (client-side fallback in case backend doesn't filter)
  const filteredEntries = entries.filter((e) => {
    if (dateFrom && e.date < dateFrom) return false;
    if (dateTo && e.date > dateTo) return false;
    return true;
  });

  // Summary calculations
  const totalDebit = filteredEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCredit = filteredEntries.reduce((sum, e) => sum + (e.credit || 0), 0);
  const netBalance = filteredEntries.length > 0 ? (filteredEntries[filteredEntries.length - 1].balance || 0) : 0;

  // CSV Export
  const handleExportCSV = () => {
    if (filteredEntries.length === 0) {
      toast.error('No entries to export.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }
    const entityName = selectedEntity?.name || 'unknown';
    const lines = [
      'Date,Reference,Description,Debit,Credit,Running Balance',
      ...filteredEntries.map((e) =>
        `${e.date},"${e.reference}","${e.description}",${e.debit},${e.credit},${e.balance}`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soa-${entityName.replace(/\s+/g, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Statement of Account</h1>
            <p className="text-slate-500 mt-0.5 text-sm">
              View detailed statement of account per client or vendor with running balance.
            </p>
          </div>
        </div>
        {selectedEntityId && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all border border-slate-200"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all border border-slate-200"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all border border-slate-200"
            >
              <FileText className="h-3.5 w-3.5" />
              PDF
            </button>
          </div>
        )}
      </div>

      {/* Entity Type Toggle + Selector & Date Range */}
      <div className="card-premium p-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Type</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as EntityType)}
              className="input-premium"
            >
              <option value="customer">Customer</option>
              <option value="vendor">Vendor</option>
            </select>
          </div>
          <div className="flex-1 max-w-md">
            <SearchableSelect
              label={entityType === 'customer' ? 'Select Customer' : 'Select Vendor'}
              required
              options={entityOptions}
              value={selectedEntityId}
              onChange={setSelectedEntityId}
              placeholder={entityType === 'customer' ? 'Search customer...' : 'Search vendor...'}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">From</label>
            <div className="relative">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input-premium pr-10"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">To</label>
            <div className="relative">
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input-premium pr-10"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Entity Info Banner */}
      {selectedEntity && (
        <div className="card-premium p-4 bg-gradient-to-r from-slate-50 to-slate-100/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-slate-900">{selectedEntity.name}</p>
              <p className="text-xs text-slate-500">
                {selectedEntity.city || '-'} | VAT: {selectedEntity.vatNumber || 'N/A'} | CR: {selectedEntity.crNumber || 'N/A'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Current Balance</p>
              <p className="text-lg font-bold text-emerald-700">
                SAR {(selectedEntity.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SOA Table */}
      {!selectedEntityId ? (
        <div className="card-premium overflow-hidden">
          <div className="text-center py-20">
            <FileSearch className="h-14 w-14 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">Select a {entityType === 'customer' ? 'Customer' : 'Vendor'}</h3>
            <p className="text-sm text-slate-500">Choose a {entityType} above to view their statement of account.</p>
          </div>
        </div>
      ) : loading ? (
        <div className="card-premium overflow-hidden">
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="h-4 w-20 skeleton rounded" />
                <div className="h-4 w-28 skeleton rounded" />
                <div className="h-4 w-48 skeleton rounded flex-1" />
                <div className="h-4 w-24 skeleton rounded" />
                <div className="h-4 w-24 skeleton rounded" />
                <div className="h-4 w-28 skeleton rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="card-premium overflow-hidden">
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
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="text-sm text-slate-700 whitespace-nowrap">{formatDate(entry.date)}</td>
                      <td>
                        <span className="text-sm font-medium text-slate-900 font-mono">
                          {entry.reference}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm text-slate-600 truncate max-w-[300px] block">
                          {entry.description}
                        </span>
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
                        <span
                          className={`text-sm font-bold whitespace-nowrap ${
                            (entry.balance || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          SAR {(entry.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredEntries.length === 0 && (
              <div className="text-center py-16">
                <FileSearch className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">No SOA entries found</h3>
                <p className="text-sm text-slate-500">No entries match the selected date range.</p>
              </div>
            )}
          </div>

          {/* Summary Card */}
          {filteredEntries.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card-premium p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total Debit</p>
                    <p className="text-xl font-bold text-blue-900 mt-1">
                      SAR {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-xl">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="card-premium p-5 bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Total Credit</p>
                    <p className="text-xl font-bold text-purple-900 mt-1">
                      SAR {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-500/10 rounded-xl">
                    <TrendingDown className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>
              <div className="card-premium p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Net Balance</p>
                    <p className={`text-xl font-bold mt-1 ${netBalance >= 0 ? 'text-emerald-900' : 'text-rose-700'}`}>
                      SAR {netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-500/10 rounded-xl">
                    <Scale className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SOAPage;
