import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { dashboardApi } from '../../services/api';
import toast from 'react-hot-toast';
import { Wallet, TrendingDown, Landmark, Scale, Printer, RefreshCw } from 'lucide-react';

interface BSAccount {
  accountId?: string;
  accountCode: string;
  accountName: string;
  subType: string;
  balance: number;
}

interface BalanceSheetData {
  assets: BSAccount[];
  liabilities: BSAccount[];
  equity: BSAccount[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

const SectionTable: React.FC<{ title: string; icon: any; items: BSAccount[]; total: number; color: string; gradient: string; onAccountClick?: (accountId: string) => void }> = ({ title, icon: Icon, items, total, color, gradient, onAccountClick }) => (
  <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
    <div className={`p-5 border-b border-slate-100 bg-gradient-to-r ${gradient}`}>
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center text-white`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="text-sm text-white/70">SAR {(total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
      </div>
    </div>
    <table className="table-premium">
      <thead>
        <tr>
          <th className="w-28">Code</th>
          <th>Account</th>
          <th className="w-36">Sub-Type</th>
          <th className="text-right w-44">Balance (SAR)</th>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <tr><td colSpan={4} className="py-8 text-center text-sm text-slate-400">No accounts found</td></tr>
        ) : items.map((item) => (
          <tr
            key={item.accountCode}
            onClick={() => item.accountId && onAccountClick?.(item.accountId)}
            className="hover:bg-slate-50/80 transition-colors border-b border-slate-100/80 last:border-0 cursor-pointer"
          >
            <td className="py-3 px-4 text-slate-500 font-mono text-sm font-semibold">{item.accountCode}</td>
            <td className="py-3 px-4 text-sm font-medium text-blue-700 hover:text-blue-900 underline decoration-blue-200 hover:decoration-blue-500">{item.accountName}</td>
            <td className="py-3 px-4">
              <span className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">{item.subType || '-'}</span>
            </td>
            <td className="py-3 px-4 text-right text-sm font-bold text-slate-900">
              {(item.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className={`bg-slate-50 border-t-2 border-slate-200`}>
          <td colSpan={3} className={`py-4 px-4 text-right text-sm font-bold ${color} uppercase tracking-wider`}>Total {title}</td>
          <td className={`py-4 px-4 text-right text-lg font-bold ${color}`}>
            {(total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
);

const BalanceSheet: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await dashboardApi.getBalanceSheet();
      setData(result);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load balance sheet');
      setData(null);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const liabilitiesPlusEquity = (data?.totalLiabilities || 0) + (data?.totalEquity || 0);
  const isBalanced = data ? Math.abs(data.totalAssets - liabilitiesPlusEquity) < 0.01 : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Balance Sheet"
        subtitle="Financial position showing assets, liabilities, and equity."
        onAdd={() => {}}
        onImport={() => {}}
        onExport={() => {
          if (!data) return;
          const lines = ['Section,Code,Account,Balance'];
          data.assets.forEach(a => lines.push(`Assets,${a.accountCode},${a.accountName},${a.balance}`));
          data.liabilities.forEach(a => lines.push(`Liabilities,${a.accountCode},${a.accountName},${a.balance}`));
          data.equity.forEach(a => lines.push(`Equity,${a.accountCode},${a.accountName},${a.balance}`));
          const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = 'balance-sheet.csv'; a.click();
        }}
        addLabel=""
      />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100/80">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Wallet className="h-5 w-5" /></div>
            <div>
              <p className="text-xl font-bold text-slate-900">SAR {(data?.totalAssets || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-xs text-slate-500 font-medium">Total Assets</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100/80">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600"><TrendingDown className="h-5 w-5" /></div>
            <div>
              <p className="text-xl font-bold text-slate-900">SAR {(data?.totalLiabilities || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-xs text-slate-500 font-medium">Total Liabilities</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100/80">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600"><Landmark className="h-5 w-5" /></div>
            <div>
              <p className="text-xl font-bold text-slate-900">SAR {(data?.totalEquity || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-xs text-slate-500 font-medium">Total Equity</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100/80">
          <div className="flex items-center gap-3">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${isBalanced ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <p className={`text-xl font-bold ${isBalanced ? 'text-emerald-600' : 'text-red-600'}`}>{isBalanced ? 'Balanced' : 'Unbalanced'}</p>
              <p className="text-xs text-slate-500 font-medium">Assets = L + E</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-end gap-2">
        <button onClick={fetchData} className="btn-ghost text-sm"><RefreshCw className="h-4 w-4" /> Refresh</button>
        <button onClick={() => window.print()} className="btn-ghost text-sm"><Printer className="h-4 w-4" /> Print</button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-16 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading balance sheet...</p>
        </div>
      ) : data ? (
        <div className="space-y-6">
          <SectionTable title="Assets" icon={Wallet} items={data.assets} total={data.totalAssets} color="text-blue-700" gradient="from-blue-600 to-blue-500" onAccountClick={(id) => navigate(`/accounting/account/${id}`)} />
          <SectionTable title="Liabilities" icon={TrendingDown} items={data.liabilities} total={data.totalLiabilities} color="text-rose-700" gradient="from-rose-600 to-rose-500" onAccountClick={(id) => navigate(`/accounting/account/${id}`)} />
          <SectionTable title="Equity" icon={Landmark} items={data.equity} total={data.totalEquity} color="text-purple-700" gradient="from-purple-600 to-purple-500" onAccountClick={(id) => navigate(`/accounting/account/${id}`)} />

          {/* Accounting Equation */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
            <h3 className="text-lg font-bold mb-4">Accounting Equation</h3>
            <div className="flex items-center justify-center gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-blue-400">SAR {(data.totalAssets || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                <p className="text-sm text-slate-400 mt-1">Total Assets</p>
              </div>
              <span className="text-2xl text-slate-500">=</span>
              <div>
                <p className="text-3xl font-bold text-rose-400">SAR {(data.totalLiabilities || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                <p className="text-sm text-slate-400 mt-1">Total Liabilities</p>
              </div>
              <span className="text-2xl text-slate-500">+</span>
              <div>
                <p className="text-3xl font-bold text-purple-400">SAR {(data.totalEquity || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                <p className="text-sm text-slate-400 mt-1">Total Equity</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-16 text-center">
          <Scale className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">Unable to load balance sheet</h3>
          <p className="text-sm text-slate-500">Please ensure the backend is running.</p>
        </div>
      )}
    </div>
  );
};

export default BalanceSheet;
