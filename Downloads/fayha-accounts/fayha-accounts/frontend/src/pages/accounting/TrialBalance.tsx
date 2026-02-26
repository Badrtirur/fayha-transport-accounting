import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { accountingApi } from '../../services/api';
import toast from 'react-hot-toast';
import { Scale, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Printer, RefreshCw } from 'lucide-react';

interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
}

const TrialBalance: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [asOfDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await accountingApi.getTrialBalance();
      setRows(Array.isArray(data) ? data : (data?.accounts || []));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load trial balance');
      setRows([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const totalDebits = rows.reduce((s, r) => s + (r.debit || 0), 0);
  const totalCredits = rows.reduce((s, r) => s + (r.credit || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
  const difference = totalDebits - totalCredits;

  const typeColor: Record<string, string> = {
    ASSET: 'text-blue-600 bg-blue-50',
    LIABILITY: 'text-rose-600 bg-rose-50',
    EQUITY: 'text-purple-600 bg-purple-50',
    REVENUE: 'text-emerald-600 bg-emerald-50',
    EXPENSE: 'text-amber-600 bg-amber-50',
    Asset: 'text-blue-600 bg-blue-50',
    Liability: 'text-rose-600 bg-rose-50',
    Equity: 'text-purple-600 bg-purple-50',
    Revenue: 'text-emerald-600 bg-emerald-50',
    Expense: 'text-amber-600 bg-amber-50',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trial Balance"
        subtitle="Verify that total debits equal total credits across all accounts."
        onAdd={() => {}}
        onImport={() => {}}
        onExport={() => {
          const csv = ['Account Code,Account Name,Type,Debit,Credit', ...rows.map(r => `${r.accountCode},${r.accountName},${r.accountType},${r.debit},${r.credit}`)].join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = `trial-balance-${asOfDate}.csv`; a.click();
        }}
        addLabel=""
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100/80">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><TrendingUp className="h-5 w-5" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">SAR {totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-slate-500 font-medium">Total Debits</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100/80">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><TrendingDown className="h-5 w-5" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">SAR {totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-slate-500 font-medium">Total Credits</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100/80">
          <div className="flex items-center gap-3">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${isBalanced ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              {isBalanced ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </div>
            <div>
              <p className={`text-2xl font-bold ${isBalanced ? 'text-emerald-600' : 'text-red-600'}`}>{isBalanced ? 'Balanced' : 'Unbalanced'}</p>
              <p className="text-xs text-slate-500 font-medium">{isBalanced ? 'Dr = Cr' : `Difference: SAR ${Math.abs(difference).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100/80">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600"><Scale className="h-5 w-5" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{rows.length}</p>
              <p className="text-xs text-slate-500 font-medium">Accounts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-600">As of:</label>
          <input type="date" value={asOfDate} readOnly className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="btn-ghost text-sm"><RefreshCw className="h-4 w-4" /> Refresh</button>
          <button onClick={() => window.print()} className="btn-ghost text-sm"><Printer className="h-4 w-4" /> Print</button>
        </div>
      </div>

      {/* Trial Balance Table */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Trial Balance Report</h3>
          <p className="text-sm text-slate-500 mt-0.5">As of {new Date(asOfDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        {loading ? (
          <div className="p-16 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading trial balance...</p>
          </div>
        ) : (
          <table className="table-premium">
            <thead>
              <tr>
                <th className="w-32">Code</th>
                <th>Account Name</th>
                <th className="w-32">Type</th>
                <th className="text-right w-44">Debit (SAR)</th>
                <th className="text-right w-44">Credit (SAR)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.accountId || row.accountCode}
                  onClick={() => row.accountId && navigate(`/accounting/account/${row.accountId}`)}
                  className="hover:bg-slate-50/80 transition-colors border-b border-slate-100/80 last:border-0 cursor-pointer"
                >
                  <td className="py-3 px-4 text-slate-500 font-mono text-sm font-semibold">{row.accountCode}</td>
                  <td className="py-3 px-4 text-sm font-medium text-blue-700 hover:text-blue-900 underline decoration-blue-200 hover:decoration-blue-500">{row.accountName}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-semibold ${typeColor[row.accountType] || 'text-slate-600 bg-slate-50'}`}>
                      {row.accountType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-bold text-slate-900">
                    {row.debit > 0 ? row.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-bold text-slate-900">
                    {row.credit > 0 ? row.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : <span className="text-slate-300">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200">
                <td colSpan={3} className="py-4 px-4 text-right text-sm font-bold text-slate-900 uppercase tracking-wider">Totals</td>
                <td className="py-4 px-4 text-right text-base font-bold text-blue-700">
                  {totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="py-4 px-4 text-right text-base font-bold text-emerald-700">
                  {totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
              {!isBalanced && (
                <tr className="bg-red-50 border-t border-red-100">
                  <td colSpan={3} className="py-3 px-4 text-right text-sm font-bold text-red-700 uppercase tracking-wider">Difference</td>
                  <td colSpan={2} className="py-3 px-4 text-right text-base font-bold text-red-700">
                    SAR {Math.abs(difference).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
};

export default TrialBalance;
