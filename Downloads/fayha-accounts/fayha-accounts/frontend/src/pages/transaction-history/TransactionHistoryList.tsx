import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Search,
  FileSpreadsheet,
  FileText,
  Printer,
  Copy,
  Calendar,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
} from 'lucide-react';
import type { TransactionRecord } from '../../types';
import { transactionHistoryApi } from '../../services/api';
import Pagination from '../../components/common/Pagination';

const typeBadgeColors: Record<string, string> = {
  'SALES_INVOICE': 'bg-blue-100 text-blue-800',
  'EXPENSE_ENTRY': 'bg-red-100 text-red-800',
  'EXPENSE': 'bg-red-100 text-red-800',
  'PAYABLE_EXPENSE': 'bg-orange-100 text-orange-800',
  'PAYMENT': 'bg-green-100 text-green-800',
  'PAYMENT_RECEIVED': 'bg-emerald-100 text-emerald-800',
  'PAYMENT_ENTRY': 'bg-green-100 text-green-800',
  'CLIENT_ADVANCE': 'bg-cyan-100 text-cyan-800',
  'RCV': 'bg-emerald-100 text-emerald-800',
  'PVC': 'bg-amber-100 text-amber-800',
  'BILL': 'bg-orange-100 text-orange-800',
  'PURCHASE_BILL': 'bg-orange-100 text-orange-800',
  'INVOICE': 'bg-blue-100 text-blue-800',
  'SALARY': 'bg-purple-100 text-purple-800',
  'BANK_DEPOSIT': 'bg-teal-100 text-teal-800',
  'JOURNAL': 'bg-slate-100 text-slate-800',
};

const typeLabels: Record<string, string> = {
  'SALES_INVOICE': 'Sales Invoice',
  'EXPENSE_ENTRY': 'Expense',
  'EXPENSE': 'Expense',
  'PAYABLE_EXPENSE': 'Payable Expense',
  'PAYMENT': 'Payment',
  'PAYMENT_RECEIVED': 'Payment Received',
  'PAYMENT_ENTRY': 'Payment Entry',
  'CLIENT_ADVANCE': 'Client Advance',
  'RCV': 'Receipt Voucher',
  'PVC': 'Payment Voucher',
  'BILL': 'Bill',
  'PURCHASE_BILL': 'Purchase Bill',
  'INVOICE': 'Invoice',
  'SALARY': 'Salary',
  'BANK_DEPOSIT': 'Bank Deposit',
  'JOURNAL': 'Journal Entry',
};

// Direction classification for client-side fallback
const IN_TYPES = new Set([
  'RCV', 'PAYMENT_RECEIVED', 'CLIENT_ADVANCE', 'SALES_INVOICE', 'BANK_DEPOSIT', 'INVOICE',
]);
const OUT_TYPES = new Set([
  'PVC', 'PAYMENT', 'EXPENSE_ENTRY', 'EXPENSE', 'PAYABLE_EXPENSE', 'PURCHASE_BILL', 'BILL', 'SALARY', 'PAYMENT_ENTRY',
]);

function getDirection(txn: any): 'IN' | 'OUT' | 'NEUTRAL' {
  if (txn.direction) return txn.direction;
  if (IN_TYPES.has(txn.type)) return 'IN';
  if (OUT_TYPES.has(txn.type)) return 'OUT';
  return 'NEUTRAL';
}

const TransactionHistoryList: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  useEffect(() => {
    transactionHistoryApi.getAll().then((data) => {
      const raw = Array.isArray(data) ? data : [];
      // Normalize date to YYYY-MM-DD string for filtering and display
      const normalized = raw.map((t: any) => ({
        ...t,
        date: t.date ? new Date(t.date).toISOString().split('T')[0] : '',
      }));
      setTransactions(normalized);
    }).catch(() => {
      setTransactions([]);
      toast.error('Failed to load transaction history.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  // Get unique transaction types for filter dropdown
  const uniqueTypes = Array.from(new Set(transactions.map((t) => t.type)));

  // Apply filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t: any) => {
      // Date range filter
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      // Type filter
      if (typeFilter && t.type !== typeFilter) return false;
      // Direction filter
      if (directionFilter !== 'ALL') {
        const dir = getDirection(t);
        if (dir !== directionFilter) return false;
      }
      // Search
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        (t.reference || '').toLowerCase().includes(term) ||
        (t.description || '').toLowerCase().includes(term) ||
        (t.type || '').toLowerCase().includes(term) ||
        (t.relatedEntity || '').toLowerCase().includes(term)
      );
    });
  }, [transactions, dateFrom, dateTo, typeFilter, directionFilter, searchTerm]);

  // Summary stats
  const summaryStats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    for (const t of filteredTransactions) {
      const dir = getDirection(t);
      if (dir === 'IN') totalIn += (t.credit || 0);
      if (dir === 'OUT') totalOut += (t.debit || 0);
    }
    return {
      count: filteredTransactions.length,
      totalIn,
      totalOut,
      netFlow: totalIn - totalOut,
    };
  }, [filteredTransactions]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // CSV Export
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error('No transactions to export.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }
    const lines = [
      'Date,Type,Direction,Reference,Description,Debit,Credit,Balance,Related Entity',
      ...filteredTransactions.map((t: any) =>
        `${t.date},"${typeLabels[t.type] || t.type}","${getDirection(t)}","${t.reference}","${t.description}",${t.debit},${t.credit},${t.balance},"${t.relatedEntity || ''}"`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transaction-history${dateFrom ? `-from-${dateFrom}` : ''}${dateTo ? `-to-${dateTo}` : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
  };

  // Copy to clipboard
  const handleCopyToClipboard = () => {
    if (filteredTransactions.length === 0) {
      toast.error('No transactions to copy.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }
    const lines = [
      'Date\tType\tDirection\tReference\tDescription\tDebit\tCredit\tBalance\tRelated Entity',
      ...filteredTransactions.map((t: any) =>
        `${t.date}\t${typeLabels[t.type] || t.type}\t${getDirection(t)}\t${t.reference}\t${t.description}\t${t.debit}\t${t.credit}\t${t.balance}\t${t.relatedEntity || ''}`
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      toast.success('Copied to clipboard!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    }).catch(() => {
      toast.error('Failed to copy to clipboard.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    });
  };

  const formatCurrency = (value: number) =>
    `SAR ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Transaction History</h1>
            <p className="text-slate-500 mt-0.5 text-sm">
              Complete log of all financial transactions.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-premium p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Activity className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Transactions</p>
              <p className="text-xl font-bold text-slate-900">{summaryStats.count}</p>
            </div>
          </div>
        </div>
        <div className="card-premium p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Money In</p>
              <p className="text-xl font-bold text-emerald-700">{formatCurrency(summaryStats.totalIn)}</p>
            </div>
          </div>
        </div>
        <div className="card-premium p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Money Out</p>
              <p className="text-xl font-bold text-red-700">{formatCurrency(summaryStats.totalOut)}</p>
            </div>
          </div>
        </div>
        <div className="card-premium p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Net Flow</p>
              <p className={`text-xl font-bold ${summaryStats.netFlow >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {formatCurrency(summaryStats.netFlow)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Toolbar */}
      <div className="card-premium p-4">
        <div className="flex flex-col gap-4">
          {/* Row 1: Date range + Type filter + Direction filter */}
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">From</label>
                <div className="relative">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setCurrentPage(1);
                    }}
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
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="input-premium pr-10"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="input-premium"
                >
                  <option value="">All Types</option>
                  {uniqueTypes.map((type) => (
                    <option key={type} value={type}>
                      {typeLabels[type] || type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Direction</label>
                <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden">
                  {(['ALL', 'IN', 'OUT'] as const).map((dir) => (
                    <button
                      key={dir}
                      onClick={() => {
                        setDirectionFilter(dir);
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold transition-all ${
                        directionFilter === dir
                          ? dir === 'IN'
                            ? 'bg-emerald-500 text-white'
                            : dir === 'OUT'
                            ? 'bg-red-500 text-white'
                            : 'bg-slate-700 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {dir === 'ALL' ? 'All' : dir === 'IN' ? 'Money In' : 'Money Out'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Rows per page + Export + Search */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-3 border-t border-slate-100">
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
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all border border-slate-200"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </button>
                <button
                  onClick={handleCopyToClipboard}
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
                placeholder="Search transactions..."
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
      </div>

      {/* Table */}
      {loading ? (
        <div className="card-premium overflow-hidden">
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="h-4 w-20 skeleton rounded" />
                <div className="h-4 w-20 skeleton rounded" />
                <div className="h-4 w-24 skeleton rounded" />
                <div className="h-4 w-48 skeleton rounded flex-1" />
                <div className="h-4 w-20 skeleton rounded" />
                <div className="h-4 w-20 skeleton rounded" />
                <div className="h-4 w-24 skeleton rounded" />
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
                  <th>Date</th>
                  <th>Type</th>
                  <th>Direction</th>
                  <th>Reference</th>
                  <th>Description</th>
                  <th>Debit</th>
                  <th>Credit</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((txn: any) => {
                  const dir = getDirection(txn);
                  return (
                    <tr key={txn.id}>
                      <td className="text-sm text-slate-700 whitespace-nowrap">{txn.date}</td>
                      <td>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            typeBadgeColors[txn.type] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {typeLabels[txn.type] || txn.type}
                        </span>
                      </td>
                      <td>
                        {dir === 'IN' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <ArrowDownLeft className="h-3.5 w-3.5" />
                            IN
                          </span>
                        ) : dir === 'OUT' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            OUT
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                            --
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="text-sm font-medium text-slate-900 font-mono">
                          {txn.reference}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm text-slate-700 truncate max-w-[280px] block">
                            {txn.description}
                          </span>
                          {txn.relatedEntity && (
                            <span className="text-xs text-slate-400 truncate max-w-[280px] block">
                              {txn.relatedEntity}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                        {(txn.debit || 0) > 0
                          ? formatCurrency(txn.debit || 0)
                          : '-'}
                      </td>
                      <td className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                        {(txn.credit || 0) > 0
                          ? formatCurrency(txn.credit || 0)
                          : '-'}
                      </td>
                      <td>
                        <span className={`text-sm font-bold whitespace-nowrap ${
                          (txn.balance || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'
                        }`}>
                          {formatCurrency(txn.balance || 0)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-16">
              <History className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">No transactions found</h3>
              <p className="text-sm text-slate-500">Try adjusting your filters or search term.</p>
            </div>
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredTransactions.length}
          />
        </div>
      )}
    </div>
  );
};

export default TransactionHistoryList;
