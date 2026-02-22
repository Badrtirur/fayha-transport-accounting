import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, FileText, Building2, Receipt, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentEntriesApi, customersApi, jobReferencesApi, salesInvoicesApi } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';

const fmtSAR = (n: number) => `SAR ${(n || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PaymentEntryView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [jobRef, setJobRef] = useState<any>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    paymentEntriesApi.getById(id).then(async (pe: any) => {
      setEntry(pe);
      // Load related data
      const promises: Promise<any>[] = [];
      if (pe.clientId) promises.push(customersApi.getById(pe.clientId).catch(() => null));
      else promises.push(Promise.resolve(null));
      if (pe.jobRefId) promises.push(jobReferencesApi.getById(pe.jobRefId).catch(() => null));
      else promises.push(Promise.resolve(null));
      if (pe.invoiceId) promises.push(salesInvoicesApi.getById(pe.invoiceId).catch(() => null));
      else promises.push(Promise.resolve(null));
      const [c, j, inv] = await Promise.all(promises);
      setClient(c);
      setJobRef(j);
      setInvoice(inv);
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load payment entry.');
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate(-1)} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="text-center py-16">
          <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">Payment Entry not found</h3>
        </div>
      </div>
    );
  }

  const lines = entry.lines || [];
  const totalDr = lines.reduce((s: number, l: any) => s + (l.drAmount || 0), 0);
  const totalCr = lines.reduce((s: number, l: any) => s + (l.crAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{entry.documentId}</h1>
          <p className="text-slate-500 text-sm mt-0.5">Payment Entry Details</p>
        </div>
        <StatusBadge status={entry.status || 'POSTED'} />
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Client & Job */}
        <div className="card-premium p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Building2 className="h-3.5 w-3.5" /> Client & Job
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Client</span>
              <span className="font-semibold text-slate-900">{client?.name || entry.clientId || '-'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Job Ref</span>
              <span className="font-mono text-slate-900">{jobRef?.jobRefNo || jobRef?.jobNumber || entry.jobRefId || '-'}</span>
            </div>
            {invoice && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Invoice</span>
                <span className="font-mono text-slate-900">{invoice.invoiceNumber || '-'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment Info */}
        <div className="card-premium p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Receipt className="h-3.5 w-3.5" /> Payment Info
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Date</span>
              <span className="text-slate-900">{entry.documentDate ? new Date(entry.documentDate).toLocaleDateString() : '-'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Method</span>
              <span className="text-slate-900">{entry.method || '-'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Doc Number</span>
              <span className="font-mono text-slate-900">{entry.documentNumber || '-'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Entry Type</span>
              <span className="text-slate-900">{entry.entryType || '-'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Created By</span>
              <span className="text-slate-900">{entry.createdBy || '-'}</span>
            </div>
          </div>
        </div>

        {/* Amount Summary */}
        <div className="card-premium p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Wallet className="h-3.5 w-3.5" /> Amount
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total Debit</span>
              <span className="font-bold text-emerald-700">{fmtSAR(entry.totalDr || totalDr)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total Credit</span>
              <span className="font-bold text-rose-600">{fmtSAR(entry.totalCr || totalCr)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-100 pt-2">
              <span className="text-slate-500">Balanced</span>
              <span className={`font-bold ${entry.isBalanced !== false ? 'text-emerald-600' : 'text-rose-600'}`}>
                {entry.isBalanced !== false ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Journal Lines */}
      <div className="card-premium overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Journal Entry Lines</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table-premium">
            <thead>
              <tr>
                <th>#</th>
                <th>Account</th>
                <th className="text-right">Debit (DR)</th>
                <th className="text-right">Credit (CR)</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line: any, idx: number) => (
                <tr key={line.id || idx}>
                  <td className="text-sm text-slate-500">{idx + 1}</td>
                  <td className="text-sm font-medium text-slate-900">{line.paymentStatus || line.accountId || '-'}</td>
                  <td className="text-sm text-right font-semibold text-emerald-700">
                    {(line.drAmount || 0) > 0 ? fmtSAR(line.drAmount) : '-'}
                  </td>
                  <td className="text-sm text-right font-semibold text-rose-600">
                    {(line.crAmount || 0) > 0 ? fmtSAR(line.crAmount) : '-'}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 border-t-2 border-slate-200">
                <td colSpan={2} className="text-sm font-bold text-slate-900 text-right">Total</td>
                <td className="text-sm text-right font-bold text-emerald-700">{fmtSAR(totalDr)}</td>
                <td className="text-sm text-right font-bold text-rose-600">{fmtSAR(totalCr)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Back button */}
      <div className="flex justify-end">
        <button onClick={() => navigate(-1)} className="btn-secondary">Back</button>
      </div>
    </div>
  );
};

export default PaymentEntryView;
