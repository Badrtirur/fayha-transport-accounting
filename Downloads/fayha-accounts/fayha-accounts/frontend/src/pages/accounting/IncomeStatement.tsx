import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { dashboardApi } from '../../services/api';
import { TrendingUp, TrendingDown, DollarSign, Percent, Printer, RefreshCw } from 'lucide-react';

interface PLAccount {
  accountCode: string;
  accountName: string;
  subType: string;
  balance: number;
}

interface IncomeStatementData {
  revenue: PLAccount[];
  expenses: PLAccount[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  profitMargin: number;
}

const IncomeStatement: React.FC = () => {
  const [data, setData] = useState<IncomeStatementData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await dashboardApi.getIncomeStatement();
      setData(result);
    } catch {
      setData(null);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const netIncome = data?.netIncome || 0;
  const isProfitable = netIncome >= 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Income Statement"
        subtitle="Profit and loss report showing revenue, expenses, and net income."
        onAdd={() => {}}
        onImport={() => {}}
        onExport={() => {
          if (!data) return;
          const lines = ['Section,Code,Account,Amount'];
          data.revenue.forEach(a => lines.push(`Revenue,${a.accountCode},${a.accountName},${a.balance}`));
          data.expenses.forEach(a => lines.push(`Expenses,${a.accountCode},${a.accountName},${a.balance}`));
          lines.push(`,,Net Income,${data.netIncome}`);
          const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = 'income-statement.csv'; a.click();
        }}
        addLabel=""
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100/80">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><TrendingUp className="h-5 w-5" /></div>
            <div>
              <p className="text-xl font-bold text-slate-900">SAR {(data?.totalRevenue || 0).toLocaleString()}</p>
              <p className="text-xs text-slate-500 font-medium">Total Revenue</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100/80">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-red-50 flex items-center justify-center text-red-600"><TrendingDown className="h-5 w-5" /></div>
            <div>
              <p className="text-xl font-bold text-slate-900">SAR {(data?.totalExpenses || 0).toLocaleString()}</p>
              <p className="text-xs text-slate-500 font-medium">Total Expenses</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100/80">
          <div className="flex items-center gap-3">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${isProfitable ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className={`text-xl font-bold ${isProfitable ? 'text-emerald-600' : 'text-red-600'}`}>
                SAR {Math.abs(netIncome).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 font-medium">{isProfitable ? 'Net Income' : 'Net Loss'}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100/80">
          <div className="flex items-center gap-3">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${isProfitable ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <p className={`text-xl font-bold ${isProfitable ? 'text-blue-600' : 'text-red-600'}`}>{(data?.profitMargin || 0).toFixed(1)}%</p>
              <p className="text-xs text-slate-500 font-medium">Profit Margin</p>
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
          <p className="text-sm text-slate-500">Loading income statement...</p>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Revenue Section */}
          <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-emerald-600 to-emerald-500">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center text-white"><TrendingUp className="h-5 w-5" /></div>
                <div>
                  <h3 className="text-lg font-bold text-white">Revenue</h3>
                  <p className="text-sm text-white/70">SAR {(data.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
            <table className="table-premium">
              <thead>
                <tr>
                  <th className="w-28">Code</th>
                  <th>Account</th>
                  <th className="w-36">Category</th>
                  <th className="text-right w-44">Amount (SAR)</th>
                </tr>
              </thead>
              <tbody>
                {data.revenue.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-sm text-slate-400">No revenue accounts</td></tr>
                ) : data.revenue.map((item) => (
                  <tr key={item.accountCode} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100/80 last:border-0">
                    <td className="py-3 px-4 text-slate-500 font-mono text-sm font-semibold">{item.accountCode}</td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-800">{item.accountName}</td>
                    <td className="py-3 px-4"><span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{item.subType || 'Revenue'}</span></td>
                    <td className="py-3 px-4 text-right text-sm font-bold text-emerald-700">{(item.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50/50 border-t-2 border-emerald-200">
                  <td colSpan={3} className="py-4 px-4 text-right text-sm font-bold text-emerald-800 uppercase tracking-wider">Total Revenue</td>
                  <td className="py-4 px-4 text-right text-lg font-bold text-emerald-700">{(data.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Expenses Section */}
          <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-red-600 to-red-500">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center text-white"><TrendingDown className="h-5 w-5" /></div>
                <div>
                  <h3 className="text-lg font-bold text-white">Expenses</h3>
                  <p className="text-sm text-white/70">SAR {(data.totalExpenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
            <table className="table-premium">
              <thead>
                <tr>
                  <th className="w-28">Code</th>
                  <th>Account</th>
                  <th className="w-36">Category</th>
                  <th className="text-right w-44">Amount (SAR)</th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-sm text-slate-400">No expense accounts</td></tr>
                ) : data.expenses.map((item) => (
                  <tr key={item.accountCode} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100/80 last:border-0">
                    <td className="py-3 px-4 text-slate-500 font-mono text-sm font-semibold">{item.accountCode}</td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-800">{item.accountName}</td>
                    <td className="py-3 px-4"><span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-lg">{item.subType || 'Expense'}</span></td>
                    <td className="py-3 px-4 text-right text-sm font-bold text-red-700">{(item.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-red-50/50 border-t-2 border-red-200">
                  <td colSpan={3} className="py-4 px-4 text-right text-sm font-bold text-red-800 uppercase tracking-wider">Total Expenses</td>
                  <td className="py-4 px-4 text-right text-lg font-bold text-red-700">{(data.totalExpenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Net Income Summary */}
          <div className={`rounded-2xl p-6 ${isProfitable ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-red-600 to-rose-600'} text-white`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">{isProfitable ? 'Net Income' : 'Net Loss'}</h3>
                <p className="text-sm text-white/70 mt-1">Revenue SAR {(data.totalRevenue || 0).toLocaleString()} - Expenses SAR {(data.totalExpenses || 0).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold">SAR {Math.abs(data.netIncome || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                <p className="text-sm text-white/70 mt-1">Profit Margin: {(data.profitMargin || 0).toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-16 text-center">
          <DollarSign className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">Unable to load income statement</h3>
          <p className="text-sm text-slate-500">Please ensure the backend is running.</p>
        </div>
      )}
    </div>
  );
};

export default IncomeStatement;
