import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Search,
  FileSpreadsheet,
  FileText,
  Printer,
  Copy,
  Wallet,
} from 'lucide-react';
import type { ClientAdvance, Client, TransactionMethod, PaymentMethodType } from '../../types';
import { clientAdvancesApi, customersApi } from '../../services/api';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';


const ClientAdvanceList: React.FC = () => {
  const navigate = useNavigate();
  const [advances, setAdvances] = useState<ClientAdvance[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal form state
  const [formTransactionMethod, setFormTransactionMethod] = useState<TransactionMethod>('Credit');
  const [formClientId, setFormClientId] = useState('');
  const [formAccountingMethod, setFormAccountingMethod] = useState('Debit');
  const [formParentGroup, setFormParentGroup] = useState('');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formDate, setFormDate] = useState('');
  const [formReceiptVoucher, setFormReceiptVoucher] = useState('');
  const [formPaymentAgainst, setFormPaymentAgainst] = useState('On Account');
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethodType>('Cash');
  const [formNote, setFormNote] = useState('');

  useEffect(() => {
    Promise.all([clientAdvancesApi.getAll(), customersApi.getAll()]).then(([advList, clientList]: any) => {
      setAdvances(Array.isArray(advList) ? advList : []);
      setClients(Array.isArray(clientList) ? clientList : []);
      setLoading(false);
    }).catch(() => { setAdvances([]); setClients([]); setLoading(false); });
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

  const filteredAdvances = advances.filter((a: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      getClientName(a.clientId).toLowerCase().includes(term) ||
      (a.paymentMethod || '').toLowerCase().includes(term) ||
      (a.reference || '').toLowerCase().includes(term) ||
      (a.description || '').toLowerCase().includes(term) ||
      (a.advanceNumber || '').toLowerCase().includes(term)
    );
  });

  const totalUnfiltered = advances.length;
  const totalPages = Math.ceil(filteredAdvances.length / itemsPerPage);
  const paginatedAdvances = filteredAdvances.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const resetForm = () => {
    setFormTransactionMethod('Credit');
    setFormClientId('');
    setFormAccountingMethod('Debit');
    setFormParentGroup('');
    setFormAmount(0);
    setFormDate('');
    setFormReceiptVoucher('');
    setFormPaymentAgainst('On Account');
    setFormPaymentMethod('Cash');
    setFormNote('');
  };

  const handleEditAdvance = (adv: any) => {
    setEditingId(adv.id);
    setFormClientId(adv.clientId || '');
    setFormAmount(adv.amount || 0);
    setFormDate(adv.date ? new Date(adv.date).toISOString().split('T')[0] : '');
    setFormPaymentMethod(adv.paymentMethod || 'Cash');
    setFormReceiptVoucher(adv.reference || '');
    setFormNote(adv.description || '');
    setModalOpen(true);
  };

  const handleDeleteAdvance = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this advance?')) return;
    try {
      await clientAdvancesApi.remove(id);
      setAdvances(prev => prev.filter(a => a.id !== id));
      toast.success('Client advance deleted!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    } catch {
      toast.error('Failed to delete advance.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    }
  };

  const handleSubmitAdvance = async () => {
    if (!formClientId || !formAmount || !formDate) {
      toast.error('Please fill in all required fields.', {
        style: { borderRadius: '12px', background: '#ef4444', color: '#fff' },
      });
      return;
    }
    if (formAmount <= 0) {
      toast.error('Amount must be greater than 0.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }
    setSaving(true);
    const payload = {
      clientId: formClientId,
      amount: formAmount,
      date: formDate,
      paymentMethod: formPaymentMethod,
      reference: formReceiptVoucher || undefined,
      description: formNote || `${formTransactionMethod} advance - ${formPaymentAgainst}`,
      status: 'ACTIVE',
    };
    try {
      if (editingId) {
        const updated = await clientAdvancesApi.update(editingId, payload);
        setAdvances(prev => prev.map(a => a.id === editingId ? updated : a));
        toast.success('Client advance updated!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      } else {
        const created = await clientAdvancesApi.create(payload);
        setAdvances(prev => [...prev, created]);
        toast.success('Client advance submitted!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      }
      setModalOpen(false);
      setEditingId(null);
      resetForm();
    } catch {
      toast.error('Failed to save client advance.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    } finally {
      setSaving(false);
    }
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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Client Advance</h1>
            <p className="text-slate-500 mt-0.5 text-sm">
              Track client advance payments with debit/credit balance.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingId(null);
              resetForm();
              setModalOpen(true);
            }}
            className="btn-primary"
          >
            Add Client Advance
          </button>
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
                onClick={() => toast('Exporting to Excel...', { icon: '\ud83d\udcca', style: { borderRadius: '12px', background: '#3b82f6', color: '#fff' } })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all border border-slate-200"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Excel
              </button>
              <button
                onClick={() => toast('Generating PDF...', { icon: '\ud83d\udcc4', style: { borderRadius: '12px', background: '#3b82f6', color: '#fff' } })}
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
                  const text = advances.map((a: any) => `${getClientName(a.clientId)}\t${formatDate(a.date)}\t${a.paymentMethod || '-'}\t${a.amount || 0}`).join('\n');
                  navigator.clipboard.writeText(text).then(() => {
                    toast.success('Table data copied to clipboard!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
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
              placeholder="Search client advances..."
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
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="h-4 w-8 skeleton rounded" />
                <div className="h-4 w-48 skeleton rounded flex-1" />
                <div className="h-4 w-24 skeleton rounded" />
                <div className="h-4 w-24 skeleton rounded" />
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
                  <th>#</th>
                  <th>Advance No.</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Payment Method</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Used</th>
                  <th className="text-right">Remaining</th>
                  <th>Utilization</th>
                  <th>Reference</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAdvances.map((adv: any, index) => (
                  <tr key={adv.id}>
                    <td className="text-sm text-slate-500 font-medium">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td>
                      <span className="text-sm font-mono font-medium text-indigo-600">
                        {adv.advanceNumber || '-'}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm font-medium text-slate-700">
                        {getClientName(adv.clientId)}
                      </span>
                    </td>
                    <td className="text-sm text-slate-600 whitespace-nowrap">
                      {formatDate(adv.date)}
                    </td>
                    <td>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700">
                        {adv.paymentMethod || '-'}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className="text-sm font-bold text-slate-900">
                        SAR {(adv.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className="text-sm font-semibold text-amber-600">
                        SAR {(adv.usedAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className={`text-sm font-semibold ${(adv.remainingAmount ?? (adv.amount || 0) - (adv.usedAmount || 0)) > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        SAR {(adv.remainingAmount ?? (adv.amount || 0) - (adv.usedAmount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td>
                      {(() => {
                        const total = adv.amount || 0;
                        const used = adv.usedAmount || 0;
                        const pct = total > 0 ? Math.round((used / total) * 100) : 0;
                        return (
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-slate-400' : pct > 0 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-500 w-8 text-right">{pct}%</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="text-sm text-slate-500">
                      {adv.reference || '-'}
                    </td>
                    <td>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        adv.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' :
                        adv.status === 'USED' ? 'bg-slate-50 text-slate-600' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {adv.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditAdvance(adv)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAdvance(adv.id)}
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

          {filteredAdvances.length === 0 && (
            <div className="text-center py-16">
              <Wallet className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">No client advances found</h3>
              <p className="text-sm text-slate-500">Add a new client advance to get started.</p>
            </div>
          )}

          {/* Pagination Info */}
          <div className="px-6 py-3 border-t border-slate-100 bg-white/50">
            <p className="text-xs text-slate-500">
              Showing {filteredAdvances.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredAdvances.length)} of{' '}
              {filteredAdvances.length} entries
              {searchTerm && ` (filtered from ${totalUnfiltered} total entries)`}
            </p>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredAdvances.length}
          />
        </div>
      )}

      {/* Add Client Advance Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditingId(null); }} title={editingId ? 'Edit Client Advance' : 'Add Client Advance'} size="lg">
        <div className="space-y-4">
          {/* Transaction Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Transaction Method</label>
            <select
              value={formTransactionMethod}
              onChange={(e) => setFormTransactionMethod(e.target.value as TransactionMethod)}
              className="input-premium w-full"
            >
              <option value="Credit">Credit</option>
              <option value="Debit">Debit</option>
            </select>
          </div>

          {/* Client */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Client</label>
            <select
              value={formClientId}
              onChange={(e) => setFormClientId(e.target.value)}
              className="input-premium w-full"
            >
              <option value="">Select Client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Transaction Method In Accounting */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Transaction Method In Accounting
            </label>
            <select
              value={formAccountingMethod}
              onChange={(e) => setFormAccountingMethod(e.target.value)}
              className="input-premium w-full"
            >
              <option value="Debit">Debit</option>
              <option value="Credit">Credit</option>
            </select>
          </div>

          {/* Parent Group In Accounting */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Parent Group In Accounting
            </label>
            <select
              value={formParentGroup}
              onChange={(e) => setFormParentGroup(e.target.value)}
              className="input-premium w-full"
            >
              <option value="">Please Select Ledger</option>
              <option value="[01] Assets">[01] Assets</option>
              <option value="[01-01-01-0004] SNB BANK">[01-01-01-0004] SNB BANK</option>
              <option value="[02-03-01-0003] Trade Receivables">[02-03-01-0003] Trade Receivables</option>
              <option value="[02] Liabilities">[02] Liabilities</option>
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formAmount || ''}
              onChange={(e) => setFormAmount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="input-premium w-full"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Date</label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="input-premium w-full"
            />
          </div>

          {/* Receipt / Voucher Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Receipt / Voucher Number</label>
            <input
              type="text"
              value={formReceiptVoucher}
              onChange={(e) => setFormReceiptVoucher(e.target.value)}
              placeholder="e.g. RCV-2026-0009"
              className="input-premium w-full"
            />
          </div>

          {/* Payment Against */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Payment Against</label>
            <select
              value={formPaymentAgainst}
              onChange={(e) => setFormPaymentAgainst(e.target.value)}
              className="input-premium w-full"
            >
              <option value="On Account">On Account</option>
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Payment Method</label>
            <select
              value={formPaymentMethod}
              onChange={(e) => setFormPaymentMethod(e.target.value as PaymentMethodType)}
              className="input-premium w-full"
            >
              <option value="Cash">Cash</option>
              <option value="Bank">Bank</option>
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Note</label>
            <textarea
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
              className="input-premium w-full resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { setModalOpen(false); setEditingId(null); }}
              className="btn-secondary"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSubmitAdvance}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ClientAdvanceList;
