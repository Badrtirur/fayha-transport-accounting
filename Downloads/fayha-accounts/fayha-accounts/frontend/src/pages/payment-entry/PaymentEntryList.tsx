import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Plus,
  Eye,
  Printer,
  Trash2,
  FileSpreadsheet,
  FileText,
  Copy,
  Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { PaymentEntry, Client, JobReference, EntryType } from '../../types';
import { paymentEntriesApi, customersApi, jobReferencesApi } from '../../services/api';
import Pagination from '../../components/common/Pagination';

interface PaymentEntryListProps {
  filterType?: EntryType;
}

const entryTypeBadge: Record<EntryType, string> = {
  Receipt: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Payment: 'bg-blue-50 text-blue-700 border-blue-200',
  Contra: 'bg-purple-50 text-purple-700 border-purple-200',
  Journal: 'bg-amber-50 text-amber-700 border-amber-200',
};

const PaymentEntryList: React.FC<PaymentEntryListProps> = ({ filterType }) => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<PaymentEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [jobRefs, setJobRefs] = useState<JobReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    Promise.all([paymentEntriesApi.getAll(), customersApi.getAll(), jobReferencesApi.getAll()]).then(
      ([peList, clientList, jrList]: any) => {
        setEntries(peList);
        setClients(clientList);
        setJobRefs(jrList);
        setLoading(false);
      }
    ).catch(() => {
      setLoading(false);
      toast.error('Failed to load data');
    });
  }, []);


  const formatDate = (d: any): string => {
    if (!d) return '-';
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return String(d);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return String(d); }
  };

  const getClientName = (clientId: string): string => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.name : '-';
  };

  const getJobRefNo = (jobRefId: string): string => {
    const jr = jobRefs.find((j) => j.id === jobRefId);
    return jr ? (jr.jobRefNo || (jr as any).jobNumber || '-') : '-';
  };

  // Apply optional type filter + search
  const filteredEntries = entries
    .filter((e) => (filterType ? e.entryType === filterType : true))
    .filter((e) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        (e.documentId || '').toLowerCase().includes(term) ||
        getClientName(e.clientId).toLowerCase().includes(term) ||
        getJobRefNo(e.jobRefId).toLowerCase().includes(term) ||
        (e.entryType || '').toLowerCase().includes(term) ||
        (e.createdBy || '').toLowerCase().includes(term)
      );
    });

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payment Entry</h1>
            <p className="text-slate-500 mt-0.5 text-sm">
              Manage payment entries.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/sales-income/receive-payment/new')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Payment Entry
        </button>
      </div>

      {/* Toolbar: rows selector + export + search */}
      <div className="card-premium p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Rows per page */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="input-premium py-1.5 px-2 text-xs w-16"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-xs font-medium text-slate-500">rows</span>
            </div>
            {/* Export buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  if (filteredEntries.length === 0) { toast.error('No entries to export'); return; }
                  const headers = ['Document ID', 'Client', 'Job Ref', 'Entry Type', 'Created By', 'Amount', 'Date', 'Justification'];
                  const rows = filteredEntries.map(e => [
                    e.documentId, getClientName(e.clientId), getJobRefNo(e.jobRefId),
                    e.entryType, e.createdBy, (e.totalCr || 0).toString(), e.documentDate, e.justification || '',
                  ]);
                  const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `payment-entries-${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('Payment entries exported successfully');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all border border-slate-200"
                title="Export Excel"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Excel
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all border border-slate-200"
                title="Export PDF"
              >
                <FileText className="h-3.5 w-3.5" />
                PDF
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all border border-slate-200"
                title="Print"
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </button>
              <button
                onClick={() => {
                  if (filteredEntries.length === 0) { toast.error('No entries to copy'); return; }
                  const headers = ['Document ID', 'Client', 'Job Ref', 'Entry Type', 'Created By', 'Amount', 'Date', 'Justification'];
                  const rows = filteredEntries.map(e => [
                    e.documentId, getClientName(e.clientId), getJobRefNo(e.jobRefId),
                    e.entryType, e.createdBy, (e.totalCr || 0).toString(), e.documentDate, e.justification || '',
                  ]);
                  const text = [headers.join('\t'), ...rows.map(row => row.join('\t'))].join('\n');
                  navigator.clipboard.writeText(text).then(() => {
                    toast.success('Copied to clipboard');
                  }).catch(() => {
                    toast.error('Failed to copy to clipboard');
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all border border-slate-200"
                title="Copy"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>
            </div>
          </div>
          {/* Search */}
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search entries..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="input-premium pl-10"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card-premium overflow-hidden">
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="h-4 w-8 skeleton rounded" />
                <div className="h-4 w-28 skeleton rounded" />
                <div className="h-4 w-28 skeleton rounded" />
                <div className="h-4 w-40 skeleton rounded flex-1" />
                <div className="h-4 w-20 skeleton rounded" />
                <div className="h-4 w-24 skeleton rounded" />
                <div className="h-4 w-20 skeleton rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Document ID</th>
                  <th>Job Ref.</th>
                  <th>Entry / By</th>
                  <th>Amount</th>
                  <th>Date / Justification</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEntries.map((entry, index) => (
                  <tr key={entry.id}>
                    <td className="text-sm text-slate-500 font-medium">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-slate-900 font-mono">
                          {entry.documentId}
                        </span>
                        <span className="text-xs text-slate-500">
                          {getClientName(entry.clientId)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm font-medium text-slate-700 font-mono">
                        {getJobRefNo(entry.jobRefId)}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex items-center self-start px-2.5 py-0.5 rounded-full text-xs font-semibold border ${entryTypeBadge[entry.entryType]}`}
                        >
                          {entry.entryType}
                        </span>
                        <span className="text-xs text-slate-500">{entry.createdBy}</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm font-bold text-slate-900">
                        SAR {(entry.totalCr || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-slate-700">{formatDate(entry.documentDate)}</span>
                        <span className="text-xs text-slate-400 truncate max-w-[180px]">
                          {entry.justification || '-'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => navigate(`/payment-entry/${entry.id}/view`)}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => window.print()}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="Print"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Are you sure you want to delete payment entry ${entry.documentId}? This will reverse all accounting entries.`)) return;
                            try {
                              await paymentEntriesApi.remove(entry.id);
                              setEntries((prev) => prev.filter((i) => i.id !== entry.id));
                              toast.success('Payment entry deleted successfully', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
                            } catch {
                              toast.error('Failed to delete payment entry', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
                            }
                          }}
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

          {filteredEntries.length === 0 && (
            <div className="text-center py-16">
              <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">No payment entries found</h3>
              <p className="text-sm text-slate-500">Try adjusting your search or add a new entry.</p>
            </div>
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredEntries.length}
          />
        </div>
      )}
    </div>
  );
};

export default PaymentEntryList;
