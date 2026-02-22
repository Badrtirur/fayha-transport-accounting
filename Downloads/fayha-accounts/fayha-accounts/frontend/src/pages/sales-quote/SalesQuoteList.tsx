import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  FileText,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Edit2,
  Download,
  Trash2,
  ArrowRightCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { SalesQuote, Client } from '../../types';
import { salesQuotesApi, customersApi } from '../../services/api';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';

const quoteStatusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  Draft: { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400' },
  Sent: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
  Accepted: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  Rejected: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' },
  Expired: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
};

const SalesQuoteList: React.FC = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<SalesQuote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 8;

  useEffect(() => {
    Promise.all([salesQuotesApi.getAll(), customersApi.getAll()]).then(([quoteData, clientData]: any) => {
      setQuotes(quoteData);
      setClients(clientData);
      setLoading(false);
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

  const filtered = quotes.filter((q) => {
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return (
      ((q.quoteNumber || q.quoteNo || '') || '').toLowerCase().includes(s) ||
      ((q as any).clientName || getClientName(q.clientId || '')).toLowerCase().includes(s)
    );
  });

  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalQuotes = quotes.length;
  const draftCount = quotes.filter((q) => q.status === 'Draft').length;
  const sentCount = quotes.filter((q) => q.status === 'Sent').length;
  const acceptedCount = quotes.filter((q) => q.status === 'Accepted').length;
  const expiredCount = quotes.filter((q) => q.status === 'Expired').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales Quotes</h1>
          <p className="text-slate-500 mt-1 text-sm">Create, manage, and track sales quotations.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 inline-flex items-center gap-2 transition-colors">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button onClick={() => navigate('/sales-quote/new')} className="btn-primary">
            <Plus className="h-4 w-4" />
            New Quote
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><FileText className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Total</p>
              <p className="text-2xl font-bold">{totalQuotes}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-4 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600"><Clock className="h-4 w-4" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Draft</p>
              <p className="text-xl font-bold text-slate-900">{draftCount}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-4 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600"><Send className="h-4 w-4" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Sent</p>
              <p className="text-xl font-bold text-slate-900">{sentCount}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-4 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600"><CheckCircle2 className="h-4 w-4" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Accepted</p>
              <p className="text-xl font-bold text-slate-900">{acceptedCount}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-4 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600"><AlertCircle className="h-4 w-4" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Expired</p>
              <p className="text-xl font-bold text-slate-900">{expiredCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl shadow-card border border-slate-100/80">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} placeholder="Search by quote # or client..." className="input-premium pl-10" />
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
                    <th>Quote #</th>
                    <th>Client</th>
                    <th>Date</th>
                    <th>Valid Until</th>
                    <th className="text-center">Items</th>
                    <th className="text-right">Grand Total</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((q, index) => (
                    <tr key={q.id}>
                      <td className="text-sm text-slate-500 font-medium">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td><span className="text-sm font-bold text-slate-900 font-mono">{q.quoteNumber || q.quoteNo || '-'}</span></td>
                      <td><span className="text-sm font-medium text-slate-700 truncate max-w-[200px] block">{(q as any).clientName || getClientName(q.clientId || '')}</span></td>
                      <td><span className="text-sm text-slate-600">{formatDate((q as any).quoteDate || q.date)}</span></td>
                      <td><span className="text-sm text-slate-600">{formatDate(q.validUntil)}</span></td>
                      <td className="text-center"><span className="text-sm font-semibold text-slate-700">{(typeof q.items === 'string' ? JSON.parse(q.items) : (q.items || [])).length}</span></td>
                      <td className="text-right"><span className="text-sm font-bold text-slate-900">SAR {(q.totalAmount || q.grandTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                      <td className="text-center"><StatusBadge status={q.status} config={quoteStatusConfig} /></td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => navigate(`/sales-quote/${q.id}/preview`)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="View">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => navigate(`/sales-quote/${q.id}`)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Edit">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (!window.confirm(`Convert quote ${(q.quoteNumber || q.quoteNo || '')} to invoice?`)) return;
                              try {
                                await salesQuotesApi.convertToInvoice(q.id);
                                toast.success('Quote converted to invoice', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
                                navigate('/sales-invoice');
                              } catch {
                                toast.error('Failed to convert quote', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Convert to Invoice"
                          >
                            <ArrowRightCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (!window.confirm(`Are you sure you want to delete quote ${(q.quoteNumber || q.quoteNo || '')}?`)) return;
                              try {
                                await salesQuotesApi.remove(q.id);
                                setQuotes((prev) => prev.filter((item) => item.id !== q.id));
                                toast.success('Quote deleted successfully', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
                              } catch {
                                toast.error('Failed to delete quote', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
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

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">No quotes found</h3>
                <p className="text-sm text-slate-500">Try adjusting your search criteria.</p>
              </div>
            )}

            <Pagination currentPage={currentPage} totalPages={Math.ceil(filtered.length / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={filtered.length} />
          </>
        )}
      </div>
    </div>
  );
};

export default SalesQuoteList;
