import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  SlidersHorizontal,
  FileText,
  MoreVertical,
  Pencil,
  FileDown,
  Download,
  Printer,
  MessageCircle,
  ShieldCheck,
  Receipt,
  Trash2,
  CheckCircle,
  X,
  User,
  Banknote,
  ChevronDown,
  ChevronUp,
  Building2,
  CreditCard,
  CalendarCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { SalesInvoice, InvoiceCategory, Client } from '../../types';
import { salesInvoicesApi, customersApi, jobReferencesApi, banksApi, journalsApi, clientAdvancesApi, API_BASE } from '../../services/api';
import Pagination from '../../components/common/Pagination';

const formatDate = (d: any): string => {
  if (!d) return '-';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return String(d); }
};

// ===================================================================
// ZATCA status badge config
// ===================================================================

const zatcaConfig: Record<string, { bg: string; text: string; border: string }> = {
  Due: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
  GENERATED: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
  PENDING: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
  'Pending Synchronization': {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  'Synced With Zatca': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  Rejected: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  },
};

const statusColors: Record<string, { bg: string; text: string }> = {
  Due: { bg: 'bg-blue-50', text: 'text-blue-700' },
  Paid: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  PAID: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  Partial: { bg: 'bg-amber-50', text: 'text-amber-700' },
  PARTIAL: { bg: 'bg-amber-50', text: 'text-amber-700' },
  Overdue: { bg: 'bg-rose-50', text: 'text-rose-700' },
  OVERDUE: { bg: 'bg-rose-50', text: 'text-rose-700' },
  UNPAID: { bg: 'bg-blue-50', text: 'text-blue-700' },
  SENT: { bg: 'bg-cyan-50', text: 'text-cyan-700' },
  DRAFT: { bg: 'bg-slate-50', text: 'text-slate-700' },
  INVOICED: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
};

// ===================================================================
// Circular progress indicator component
// ===================================================================

const CircleProgress: React.FC<{
  percentage: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}> = ({ percentage, color, size = 56, strokeWidth = 5 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
};

// ===================================================================
// Category filter tabs
// ===================================================================

const categoryFilters: { label: string; value: InvoiceCategory | 'All' }[] = [
  { label: 'All Invoices', value: 'All' },
  { label: 'Branch Invoice', value: 'Branch Invoice' },
  { label: 'Freight Forwarder Invoice', value: 'Freight Forwarder Invoice' },
  { label: 'Customs Clearance Invoice', value: 'Customs Clearance Invoice' },
];

// ===================================================================
// SalesInvoiceList Component
// ===================================================================

const SalesInvoiceList: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [jobRefs, setJobRefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState<InvoiceCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [filterClientId, setFilterClientId] = useState('');
  const [banks, setBanks] = useState<any[]>([]);

  // Expanded row for transaction details
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [paymentJournals, setPaymentJournals] = useState<Record<string, any>>({});

  // Client advance balances — keyed by clientId
  const [clientAdvanceBalances, setClientAdvanceBalances] = useState<Record<string, number>>({});

  // Receive Payment — now handled via Payment Entry form

  const itemsPerPage = 8;

  useEffect(() => {
    Promise.all([salesInvoicesApi.getAll(), customersApi.getAll(), jobReferencesApi.getAll(), banksApi.getAll()]).then(([invData, clientData, jrData, bankData]: any) => {
      setInvoices(Array.isArray(invData) ? invData : []);
      setClients(Array.isArray(clientData) ? clientData : []);
      setJobRefs(Array.isArray(jrData) ? jrData : []);
      setBanks(Array.isArray(bankData) ? bankData : []);
      setLoading(false);

      // Load advance balances for all unique clients
      const clientIds = new Set<string>((Array.isArray(invData) ? invData : []).map((i: any) => i.clientId).filter(Boolean));
      clientIds.forEach((cid) => {
        clientAdvancesApi.getByClient(cid).then((result: any) => {
          if (result.totalAvailable > 0) {
            setClientAdvanceBalances((prev) => ({ ...prev, [cid]: result.totalAvailable }));
          }
        }).catch(() => {});
      });
    }).catch(() => { setLoading(false); });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = () => setOpenDropdown(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Helpers
  const getClientName = (clientId: string): string => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.name : '-';
  };

  const getJobRefNo = (jobRefId: string): string => {
    const job = jobRefs.find((j: any) => j.id === jobRefId);
    return job ? (job.jobRefNo || job.jobNumber) : '-';
  };

  const getBankName = (bankId: string): string => {
    const bank = banks.find((b: any) => b.id === bankId);
    return bank ? `${bank.bankName}${bank.accountNumber ? ' - ' + bank.accountNumber : ''}` : bankId || '—';
  };

  // Toggle expanded row — loads payment journal for that invoice
  const toggleExpandRow = async (invId: string) => {
    if (expandedRow === invId) {
      setExpandedRow(null);
      return;
    }
    setExpandedRow(invId);
    // Load payment journals for this invoice if not already cached
    if (!paymentJournals[invId]) {
      try {
        const allJournals = await journalsApi.getAll();
        const journals = Array.isArray(allJournals) ? allJournals : [];
        // Find journals referencing this invoice
        const inv = invoices.find(i => i.id === invId);
        const invNumber = inv?.invoiceNumber || inv?.invoiceNo || '';
        const related = journals.filter((j: any) =>
          j.reference === invNumber ||
          j.description?.includes(invNumber) ||
          (j.notes && j.notes.includes(invId))
        );
        setPaymentJournals(prev => ({ ...prev, [invId]: related }));
      } catch {
        setPaymentJournals(prev => ({ ...prev, [invId]: [] }));
      }
    }
  };

  // Receive Payment — redirects to Payment Entry form (proper accounting flow)

  // Filter & search
  const filtered = invoices
    .filter((inv) => activeCategory === 'All' || inv.category === activeCategory)
    .filter((inv) => !filterClientId || inv.clientId === filterClientId)
    .filter((inv) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (inv.invoiceNumber || inv.invoiceNo || '').toLowerCase().includes(q) ||
        getClientName(inv.clientId).toLowerCase().includes(q) ||
        getJobRefNo(inv.jobReferenceId || inv.jobRefId || '').toLowerCase().includes(q)
      );
    });

  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const totalCount = invoices.length;
  const totalAmount = invoices.reduce((s, i) => s + (i.totalAmount || i.grandTotal || 0), 0);
  const paidAmount = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
  const unpaidAmount = invoices.reduce((s, i) => s + (i.balanceDue || i.dueAmount || 0), 0);
  const overdueInvoices = invoices.filter((i) => i.status === 'Overdue');
  const overdueAmount = overdueInvoices.reduce((s, i) => s + (i.balanceDue || i.dueAmount || 0), 0);

  const paidPercent = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
  const unpaidPercent = totalAmount > 0 ? Math.round((unpaidAmount / totalAmount) * 100) : 0;
  const overduePercent = totalAmount > 0 ? Math.round((overdueAmount / totalAmount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales Invoice</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Manage sales invoices, ZATCA e-invoicing, and payment tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/sales-invoice/new" className="btn-primary">
            <Plus className="h-4 w-4" />
            Add Invoice
          </Link>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categoryFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setActiveCategory(f.value);
              setCurrentPage(1);
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
              activeCategory === f.value
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
            {f.value !== 'All' && (
              <span className="ml-1.5 opacity-60">
                {invoices.filter((i) => i.category === f.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL INVOICE */}
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100/80 flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            <CircleProgress percentage={100} color="#6366f1" />
            <span className="absolute text-xs font-bold text-indigo-600">{totalCount}</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Invoice
            </p>
            <p className="text-lg font-bold text-slate-900">
              SAR {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* PAID */}
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100/80 flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            <CircleProgress percentage={paidPercent} color="#10b981" />
            <span className="absolute text-xs font-bold text-emerald-600">{paidPercent}%</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paid</p>
            <p className="text-lg font-bold text-slate-900">
              SAR {paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* UNPAID */}
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100/80 flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            <CircleProgress percentage={unpaidPercent} color="#f59e0b" />
            <span className="absolute text-xs font-bold text-amber-600">{unpaidPercent}%</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unpaid</p>
            <p className="text-lg font-bold text-slate-900">
              SAR {unpaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* OVER DUE */}
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100/80 flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            <CircleProgress percentage={overduePercent} color="#ef4444" />
            <span className="absolute text-xs font-bold text-rose-600">{overduePercent}%</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Over Due
            </p>
            <p className="text-lg font-bold text-slate-900">
              SAR {overdueAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl shadow-card border border-slate-100/80">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by invoice #, client, or job reference..."
            className="input-premium pl-10"
          />
        </div>
        <button className="btn-secondary">
          <SlidersHorizontal className="h-4 w-4" />
          Filter
        </button>
      </div>

      {/* Active Customer Filter Chip */}
      {filterClientId && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200/60 rounded-xl">
          <User className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-semibold text-indigo-700">
            Filtered by Customer: {getClientName(filterClientId)}
          </span>
          <span className="text-xs text-indigo-500 ml-1">
            ({filtered.length} {filtered.length === 1 ? 'invoice' : 'invoices'})
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
      <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-6 skeleton rounded" />
                <div className="h-4 w-20 skeleton rounded" />
                <div className="flex-1 h-4 skeleton rounded" />
                <div className="h-4 w-28 skeleton rounded" />
                <div className="h-4 w-24 skeleton rounded" />
                <div className="h-6 w-28 skeleton rounded-full" />
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
                    <th>Date</th>
                    <th>Client</th>
                    <th>Job Reference</th>
                    <th>Invoice ID</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Paid Amount</th>
                    <th className="text-right">Due Amount</th>
                    <th className="text-center">Payment Info</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((inv, index) => {
                    const zConfig = zatcaConfig[inv.zatcaStatus] || zatcaConfig['Due'];
                    const sColor = statusColors[inv.status] || statusColors['Due'];
                    const isDropdownOpen = openDropdown === inv.id;

                    return (
                      <React.Fragment key={inv.id}>
                      <tr>
                        {/* # */}
                        <td className="text-sm text-slate-500 font-medium">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>

                        {/* Date */}
                        <td>
                          <span className="text-sm text-slate-600">{formatDate(inv.invoiceDate)}</span>
                        </td>

                        {/* Client */}
                        <td>
                          <button
                            onClick={() => { setFilterClientId(inv.clientId); setCurrentPage(1); }}
                            className="text-sm font-medium text-slate-900 hover:text-indigo-600 hover:underline truncate max-w-[200px] block text-left transition-colors"
                            title={`Filter by ${getClientName(inv.clientId)}`}
                          >
                            {getClientName(inv.clientId)}
                          </button>
                          {clientAdvanceBalances[inv.clientId] > 0 && inv.status !== 'PAID' && (
                            <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Advance: SAR {clientAdvanceBalances[inv.clientId].toLocaleString('en', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </td>

                        {/* Job Reference */}
                        <td>
                          <span className="text-xs font-mono text-slate-500">
                            {getJobRefNo(inv.jobReferenceId || inv.jobRefId || '')}
                          </span>
                        </td>

                        {/* Invoice ID */}
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                              <FileText className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-sm font-bold text-slate-900 font-mono">
                              {inv.invoiceNumber || inv.invoiceNo}
                            </span>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="text-right">
                          <span className="text-sm font-bold text-slate-900">
                            {(inv.totalAmount || inv.grandTotal || 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </td>

                        {/* Paid Amount */}
                        <td className="text-right">
                          <span className="text-sm font-semibold text-emerald-700">
                            {(inv.paidAmount || 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </td>

                        {/* Due Amount */}
                        <td className="text-right">
                          <span
                            className={`text-sm font-semibold ${
                              (inv.balanceDue || inv.dueAmount || 0) > 0 ? 'text-rose-600' : 'text-slate-400'
                            }`}
                          >
                            {(inv.balanceDue || inv.dueAmount || 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </td>

                        {/* Payment Info */}
                        <td className="text-center">
                          {inv.status === 'PAID' || (inv.paidAmount || 0) > 0 ? (
                            <button
                              onClick={() => toggleExpandRow(inv.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-all"
                            >
                              <Banknote className="h-3 w-3" />
                              {inv.status === 'PAID' ? 'Paid' : 'Partial'}
                              {expandedRow === inv.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">No payment</span>
                          )}
                        </td>

                        {/* Status (ZATCA badge) */}
                        <td className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${sColor.bg} ${sColor.text}`}
                            >
                              {inv.status}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${zConfig.bg} ${zConfig.text} ${zConfig.border}`}
                            >
                              {inv.zatcaStatus}
                            </span>
                          </div>
                        </td>

                        {/* Actions Dropdown */}
                        <td className="text-center">
                          <div className="relative inline-block">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdown(isDropdownOpen ? null : inv.id);
                              }}
                              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {isDropdownOpen && (
                              <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-slate-200 z-50 py-1">
                                <button
                                  onClick={() => {
                                    navigate(`/sales-invoice/${inv.id}`);
                                    setOpenDropdown(null);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                                >
                                  <Pencil className="h-3.5 w-3.5 text-slate-400" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    navigate(`/sales-invoice/${inv.id}/preview`);
                                    setOpenDropdown(null);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                                >
                                  <FileDown className="h-3.5 w-3.5 text-slate-400" />
                                  PDF Preview
                                </button>
                                <button
                                  onClick={async () => {
                                    setOpenDropdown(null);
                                    const toastId = toast.loading('Generating PDF...');
                                    try {
                                      const result = await salesInvoicesApi.generatePdf(inv.id);
                                      if (result?.url) {
                                        const baseUrl = API_BASE.replace(/\/api\/v1$/, '');
                                        const link = document.createElement('a');
                                        link.href = baseUrl + result.url;
                                        link.download = `${inv.invoiceNumber || inv.invoiceNo || 'invoice'}.pdf`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        toast.success(result.cached ? 'PDF downloaded' : 'PDF generated', { id: toastId });
                                      }
                                    } catch (err: any) {
                                      toast.error(err?.message || 'PDF generation failed', { id: toastId });
                                    }
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                                >
                                  <Download className="h-3.5 w-3.5 text-slate-400" />
                                  Download PDF
                                </button>
                                <button
                                  onClick={() => {
                                    toast('Letterhead PDF generation - Coming soon', { icon: 'ℹ️' });
                                    setOpenDropdown(null);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                                >
                                  <Printer className="h-3.5 w-3.5 text-slate-400" />
                                  Letterhead
                                </button>
                                <button
                                  onClick={() => {
                                    toast('WhatsApp invoice sharing - Coming soon', { icon: 'ℹ️' });
                                    setOpenDropdown(null);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                                >
                                  <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                                  WhatsApp Invoice
                                </button>
                                <div className="border-t border-slate-100 my-1" />
                                {inv.status === 'DRAFT' && (
                                <button
                                  onClick={async () => {
                                    setOpenDropdown(null);
                                    try {
                                      await salesInvoicesApi.markAsInvoiced(inv.id);
                                      setInvoices((prev) => prev.map((i) => i.id === inv.id ? { ...i, status: 'INVOICED' as any } : i));
                                      toast.success(`Invoice ${inv.invoiceNumber || inv.invoiceNo} marked as invoiced`, { style: { borderRadius: '12px', background: '#6366f1', color: '#fff' } });
                                    } catch (err: any) {
                                      toast.error(err?.message || 'Failed to mark as invoiced', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
                                    }
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-indigo-700 hover:bg-indigo-50 flex items-center gap-2.5"
                                >
                                  <CheckCircle className="h-3.5 w-3.5 text-indigo-500" />
                                  Mark as Invoiced
                                </button>
                                )}
                                {inv.status !== 'DRAFT' && inv.status !== 'PAID' && (
                                <button
                                  onClick={() => {
                                    setOpenDropdown(null);
                                    navigate('/sales-income/receive-payment/new');
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5"
                                >
                                  <Banknote className="h-3.5 w-3.5 text-emerald-500" />
                                  Receive Payment
                                </button>
                                )}
                                {inv.status !== 'DRAFT' && inv.status !== 'PAID' && inv.zatcaStatus !== 'Synced With Zatca' && (
                                <button
                                  onClick={async () => {
                                    setOpenDropdown(null);
                                    const invoiceLabel = inv.invoiceNumber || inv.invoiceNo;
                                    const toastId = toast.loading(`Reporting ${invoiceLabel} to ZATCA...`);
                                    try {
                                      setInvoices((prev) => prev.map((i) => i.id === inv.id ? { ...i, zatcaStatus: 'Pending Synchronization' } : i));
                                      const res = await salesInvoicesApi.reportToZatca(inv.id);
                                      if (res.zatcaStatus === 'Synced With Zatca' || res.zatcaClearanceId) {
                                        setInvoices((prev) => prev.map((i) => i.id === inv.id ? { ...i, ...res } : i));
                                        toast.success(`${invoiceLabel} synced with ZATCA`, { id: toastId, style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
                                      } else {
                                        setInvoices((prev) => prev.map((i) => i.id === inv.id ? { ...i, zatcaStatus: 'Rejected' } : i));
                                        toast.error(`ZATCA rejected ${invoiceLabel}`, { id: toastId, style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
                                      }
                                    } catch (err: any) {
                                      setInvoices((prev) => prev.map((i) => i.id === inv.id ? { ...i, zatcaStatus: 'Rejected' } : i));
                                      toast.error(err?.message || `Failed to report ${invoiceLabel} to ZATCA`, { id: toastId, style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
                                    }
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-blue-700 hover:bg-blue-50 flex items-center gap-2.5"
                                >
                                  <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                                  Report To Zatca
                                </button>
                                )}
                                <div className="border-t border-slate-100 my-1" />
                                <button
                                  onClick={async () => {
                                    setOpenDropdown(null);
                                    if (!window.confirm(`Are you sure you want to delete invoice ${inv.invoiceNumber || inv.invoiceNo}?`)) return;
                                    try {
                                      await salesInvoicesApi.remove(inv.id);
                                      setInvoices((prev) => prev.filter((i) => i.id !== inv.id));
                                      toast.success('Invoice deleted successfully', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
                                    } catch {
                                      toast.error('Failed to delete invoice', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
                                    }
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-rose-700 hover:bg-rose-50 flex items-center gap-2.5"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Transaction Details Row */}
                      {expandedRow === inv.id && (
                        <tr>
                          <td colSpan={11} className="p-0 bg-gradient-to-r from-slate-50 to-blue-50/30">
                            <div className="px-6 py-4 space-y-3">
                              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                <CreditCard className="h-3.5 w-3.5" />
                                Payment & Transaction History
                              </h4>

                              {/* Payment Summary Cards */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-white rounded-lg p-3 border border-slate-100">
                                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Invoice Total</p>
                                  <p className="text-sm font-bold text-slate-900">SAR {(inv.totalAmount || inv.grandTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-slate-100">
                                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Paid Amount</p>
                                  <p className="text-sm font-bold text-emerald-600">SAR {(inv.paidAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-slate-100">
                                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Balance Due</p>
                                  <p className={`text-sm font-bold ${(inv.balanceDue || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    SAR {(inv.balanceDue || inv.dueAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-slate-100">
                                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Payment Status</p>
                                  <p className={`text-sm font-bold ${inv.status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {inv.status === 'PAID' ? 'FULLY PAID' : 'PARTIAL'}
                                  </p>
                                </div>
                              </div>

                              {/* Journal Entries / Transaction Records */}
                              {paymentJournals[inv.id] && paymentJournals[inv.id].length > 0 ? (
                                <div className="bg-white rounded-lg border border-slate-100 overflow-hidden">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="text-left px-3 py-2 font-semibold text-slate-500">Date</th>
                                        <th className="text-left px-3 py-2 font-semibold text-slate-500">Entry #</th>
                                        <th className="text-left px-3 py-2 font-semibold text-slate-500">Description</th>
                                        <th className="text-left px-3 py-2 font-semibold text-slate-500">Method</th>
                                        <th className="text-left px-3 py-2 font-semibold text-slate-500">Bank Account</th>
                                        <th className="text-right px-3 py-2 font-semibold text-slate-500">Amount</th>
                                        <th className="text-center px-3 py-2 font-semibold text-slate-500">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {paymentJournals[inv.id].map((je: any) => {
                                        let payInfo: any = {};
                                        try { payInfo = je.notes ? JSON.parse(je.notes) : {}; } catch { /* ignore */ }
                                        return (
                                          <tr key={je.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                            <td className="px-3 py-2.5">
                                              <div className="flex items-center gap-1.5">
                                                <CalendarCheck className="h-3 w-3 text-slate-400" />
                                                {formatDate(je.date)}
                                              </div>
                                            </td>
                                            <td className="px-3 py-2.5 font-mono font-semibold text-slate-700">{je.entryNumber}</td>
                                            <td className="px-3 py-2.5 text-slate-600 max-w-[200px] truncate">{je.description}</td>
                                            <td className="px-3 py-2.5">
                                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                                payInfo.paymentMethod === 'Bank' ? 'bg-blue-50 text-blue-700' :
                                                payInfo.paymentMethod === 'Cheque' ? 'bg-purple-50 text-purple-700' :
                                                'bg-amber-50 text-amber-700'
                                              }`}>
                                                {payInfo.paymentMethod === 'Bank' ? <Building2 className="h-2.5 w-2.5" /> :
                                                 payInfo.paymentMethod === 'Cheque' ? <FileText className="h-2.5 w-2.5" /> :
                                                 <Banknote className="h-2.5 w-2.5" />}
                                                {payInfo.paymentMethod || je.referenceType || '—'}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2.5">
                                              {payInfo.bankAccountId ? (
                                                <span className="text-slate-700 font-medium">{getBankName(payInfo.bankAccountId)}</span>
                                              ) : (
                                                <span className="text-slate-400">Cash</span>
                                              )}
                                              {payInfo.reference && (
                                                <span className="block text-[10px] text-slate-400">Ref: {payInfo.reference}</span>
                                              )}
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-bold text-emerald-700">
                                              SAR {(je.totalDebit || je.totalCredit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-3 py-2.5 text-center">
                                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                                je.status === 'POSTED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                              }`}>
                                                {je.status}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              ) : paymentJournals[inv.id] ? (
                                <div className="bg-white rounded-lg border border-slate-100 p-4 text-center text-xs text-slate-400">
                                  No transaction records found for this invoice.
                                </div>
                              ) : (
                                <div className="bg-white rounded-lg border border-slate-100 p-4 text-center text-xs text-slate-400">
                                  Loading transaction history...
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">No invoices found</h3>
                <p className="text-sm text-slate-500">
                  Try adjusting your filter or search criteria.
                </p>
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

      {/* Receive Payment now handled via Payment Entry form */}
    </div>
  );
};

export default SalesInvoiceList;
