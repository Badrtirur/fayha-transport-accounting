import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Edit3,
  Trash2,
  Plus,
  FileSpreadsheet,
  FileText,
  Printer,
  Copy,
  DollarSign,
  FileEdit,
  CheckCircle2,
  Receipt,
  X,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { ExpenseEntry, JobReference } from '../../types';
import { expenseEntriesApi, customersApi, vendorsApi, jobReferencesApi, accountsApi } from '../../services/api';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';

const formatDate = (d: any): string => {
  if (!d) return '-';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(d);
  }
};

const ExpenseEntryList: React.FC = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [jobRefs, setJobRefs] = useState<JobReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClientId, setFilterClientId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    Promise.all([
      expenseEntriesApi.getAll(),
      customersApi.getAll(),
      vendorsApi.getAll(),
      jobReferencesApi.getAll(),
      accountsApi.getAll(),
    ]).then(
      ([entryList, customerList, vendorList, jrList, accountList]: any) => {
        setEntries(Array.isArray(entryList) ? entryList : []);
        setCustomers(Array.isArray(customerList) ? customerList : []);
        setVendors(Array.isArray(vendorList) ? vendorList : []);
        setJobRefs(Array.isArray(jrList) ? jrList : []);
        setAccounts(Array.isArray(accountList) ? accountList : []);
        setLoading(false);
      }
    ).catch(() => {
      setLoading(false);
      toast.error('Failed to load data');
    });
  }, []);

  const getCustomerName = (clientId?: string): string => {
    if (!clientId) return '-';
    const customer = customers.find((c) => c.id === clientId);
    return customer ? customer.name : '-';
  };

  const getVendorName = (vendorId?: string): string => {
    if (!vendorId) return '-';
    const vendor = vendors.find((v) => v.id === vendorId);
    return vendor ? vendor.name : '-';
  };

  const getJobRefNo = (jobRefId?: string): string => {
    if (!jobRefId) return '-';
    const jr = jobRefs.find((j) => j.id === jobRefId);
    return jr ? (jr.jobRefNo || (jr as any).jobNumber || jobRefId) : '-';
  };

  const getAccountName = (accountId?: string): string => {
    if (!accountId) return '-';
    const acc = accounts.find((a: any) => a.id === accountId);
    return acc ? (acc.name || acc.code || accountId) : '-';
  };

  const filteredEntries = entries
    .filter((e) => !filterClientId || e.clientId === filterClientId)
    .filter((e) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        (e.expenseNumber || e.entryNo || '').toLowerCase().includes(term) ||
        getCustomerName(e.clientId).toLowerCase().includes(term) ||
        getVendorName(e.vendorId).toLowerCase().includes(term) ||
        (e.category || '').toLowerCase().includes(term) ||
        (e.description || '').toLowerCase().includes(term) ||
        (e.status || '').toLowerCase().includes(term)
      );
    });

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats — handle both uppercase and mixed-case statuses
  const totalEntries = entries.length;
  const draftCount = entries.filter((e) => {
    const s = (e.status || '').toUpperCase();
    return s === 'DRAFT' || s === 'PENDING';
  }).length;
  const postedCount = entries.filter((e) => {
    const s = (e.status || '').toUpperCase();
    return s === 'POSTED';
  }).length;
  const totalAmount = entries.reduce((sum, e) => sum + (e.totalAmount || e.amount || 0), 0);

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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Expense Entries</h1>
            <p className="text-slate-500 mt-0.5 text-sm">
              Track and manage all expense entries across job references.
            </p>
          </div>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => navigate('/expense-entry/new')}
        >
          <Plus className="h-4 w-4" />
          Add New
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-premium p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Total Entries</p>
              <p className="text-2xl font-bold text-emerald-900 mt-1">{totalEntries}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <Receipt className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="card-premium p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Draft / Pending</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{draftCount}</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <FileEdit className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="card-premium p-5 bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Posted</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">{postedCount}</p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <CheckCircle2 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="card-premium p-5 bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Total Amount</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">
                SAR {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <DollarSign className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card-premium p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
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
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  if (filteredEntries.length === 0) { toast.error('No entries to export'); return; }
                  const headers = ['Entry No', 'Date', 'Customer', 'Vendor', 'Category', 'Account', 'Description', 'Amount', 'VAT', 'Total', 'Job Ref', 'Status'];
                  const rows = filteredEntries.map(e => [
                    e.expenseNumber || e.entryNo,
                    formatDate(e.date),
                    getCustomerName(e.clientId),
                    getVendorName(e.vendorId),
                    e.category || '',
                    getAccountName(e.accountId),
                    e.description,
                    (e.amount || 0).toString(),
                    (e.vatAmount || 0).toString(),
                    (e.totalAmount || e.amount || 0).toString(),
                    getJobRefNo(e.jobRefId),
                    e.status,
                  ]);
                  const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `expense-entries-${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('Expense entries exported successfully');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all border border-slate-200"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Excel
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all border border-slate-200"
              >
                <FileText className="h-3.5 w-3.5" />
                PDF
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all border border-slate-200"
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </button>
              <button
                onClick={() => {
                  if (filteredEntries.length === 0) { toast.error('No entries to copy'); return; }
                  const headers = ['Entry No', 'Date', 'Customer', 'Vendor', 'Category', 'Account', 'Description', 'Amount', 'VAT', 'Total', 'Job Ref', 'Status'];
                  const rows = filteredEntries.map(e => [
                    e.expenseNumber || e.entryNo,
                    formatDate(e.date),
                    getCustomerName(e.clientId),
                    getVendorName(e.vendorId),
                    e.category || '',
                    getAccountName(e.accountId),
                    e.description,
                    (e.amount || 0).toString(),
                    (e.vatAmount || 0).toString(),
                    (e.totalAmount || e.amount || 0).toString(),
                    getJobRefNo(e.jobRefId),
                    e.status,
                  ]);
                  const text = [headers.join('\t'), ...rows.map(row => row.join('\t'))].join('\n');
                  navigator.clipboard.writeText(text).then(() => {
                    toast.success('Copied to clipboard');
                  }).catch(() => {
                    toast.error('Failed to copy to clipboard');
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all border border-slate-200"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>
            </div>
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search expense entries..."
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

      {/* Active Customer Filter Chip */}
      {filterClientId && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200/60 rounded-xl">
          <User className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-semibold text-indigo-700">
            Filtered by Customer: {getCustomerName(filterClientId)}
          </span>
          <span className="text-xs text-indigo-500 ml-1">
            ({filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'})
          </span>
          <button
            onClick={() => { setFilterClientId(''); setCurrentPage(1); }}
            className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="card-premium overflow-hidden">
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="h-4 w-24 skeleton rounded" />
                <div className="h-4 w-20 skeleton rounded" />
                <div className="h-4 w-40 skeleton rounded flex-1" />
                <div className="h-4 w-24 skeleton rounded" />
                <div className="h-4 w-20 skeleton rounded" />
                <div className="h-4 w-16 skeleton rounded" />
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
                  <th>Entry No</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Vendor</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">VAT</th>
                  <th className="text-right">Total</th>
                  <th>Job Ref</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <span className="text-sm font-bold text-slate-900 font-mono">
                        {entry.expenseNumber || entry.entryNo || '-'}
                      </span>
                    </td>
                    <td className="text-sm text-slate-700 whitespace-nowrap">
                      {formatDate(entry.date)}
                    </td>
                    <td>
                      {entry.clientId ? (
                        <button
                          onClick={() => { setFilterClientId(entry.clientId!); setCurrentPage(1); }}
                          className="text-sm font-medium text-slate-700 hover:text-indigo-600 hover:underline truncate max-w-[160px] block text-left transition-colors"
                          title={`Filter by ${getCustomerName(entry.clientId)}`}
                        >
                          {getCustomerName(entry.clientId)}
                        </button>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td>
                      <span className="text-sm font-medium text-slate-700 truncate max-w-[160px] block">
                        {getVendorName(entry.vendorId)}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                        {entry.category || '-'}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-slate-600 truncate max-w-[200px] block">
                        {entry.description || '-'}
                      </span>
                    </td>
                    <td className="text-sm font-bold text-slate-900 whitespace-nowrap text-right">
                      {(entry.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-sm text-slate-600 whitespace-nowrap text-right">
                      {(entry.vatAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-sm font-bold text-emerald-700 whitespace-nowrap text-right">
                      {(entry.totalAmount || entry.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className="text-sm font-medium text-slate-700 font-mono">
                        {getJobRefNo(entry.jobRefId)}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={entry.status} />
                    </td>
                    <td>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => navigate(`/expense-entry/${entry.id}`)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Are you sure you want to delete expense entry ${entry.expenseNumber || entry.entryNo}?`)) return;
                            try {
                              await expenseEntriesApi.remove(entry.id);
                              setEntries((prev) => prev.filter((i) => i.id !== entry.id));
                              toast.success('Expense entry deleted successfully', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
                            } catch {
                              toast.error('Failed to delete expense entry', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
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
              <h3 className="text-lg font-bold text-slate-900 mb-1">No expense entries found</h3>
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

export default ExpenseEntryList;
