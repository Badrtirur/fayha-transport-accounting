import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { accountsApi, accountingApi } from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Printer, Download, RefreshCw, Calendar, ArrowUpCircle, ArrowDownCircle, Activity, Wallet, FileText } from 'lucide-react';

interface LedgerEntry {
  id: string;
  date: string;
  entryNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference?: string;
}

const fmt = (n: number) => Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Determines whether a debit/credit is IN or OUT for a given account type.
 * - ASSET / EXPENSE: Debit = IN (increases), Credit = OUT (decreases)
 * - LIABILITY / EQUITY / REVENUE: Credit = IN (increases), Debit = OUT (decreases)
 */
const isDebitNormal = (accountType: string): boolean => {
  const t = (accountType || '').toUpperCase();
  return t === 'ASSET' || t === 'EXPENSE';
};

const AccountDetail: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();

  const [account, setAccount] = useState<any>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const [accList, ledgerData] = await Promise.all([
        accountsApi.getAll(),
        accountingApi.getLedger(accountId, { startDate, endDate }),
      ]);

      const acc = ledgerData?.account || accList.find((a: any) => a.id === accountId);
      setAccount(acc || null);

      const ob = Number(ledgerData?.openingBalance || 0);
      setOpeningBalance(ob);

      const rawEntries: any[] = Array.isArray(ledgerData) ? ledgerData : (ledgerData?.entries || []);
      let runningBalance = ob;
      const mapped = rawEntries.map((e: any) => {
        const debit = Number(e.debitAmount || e.debit || 0);
        const credit = Number(e.creditAmount || e.credit || 0);
        runningBalance += debit - credit;
        const je = e.journalEntry || {};
        return {
          ...e,
          debit,
          credit,
          balance: runningBalance,
          date: je.date || e.date || '',
          entryNumber: je.entryNumber || e.entryNumber || '',
          description: e.description || je.description || '',
          reference: je.reference || e.reference || '',
        };
      });
      setEntries(mapped);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load account detail');
      setEntries([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [accountId, startDate, endDate]);

  const accountType = (account?.type || '').toUpperCase();
  const debitNormal = isDebitNormal(accountType);

  // Calculate IN and OUT totals
  const totalIn = entries.reduce((s, e) => s + (debitNormal ? e.debit : e.credit), 0);
  const totalOut = entries.reduce((s, e) => s + (debitNormal ? e.credit : e.debit), 0);
  const netMovement = totalIn - totalOut;
  const currentBalance = entries.length > 0 ? entries[entries.length - 1].balance : openingBalance;

  const getIn = (e: LedgerEntry) => debitNormal ? e.debit : e.credit;
  const getOut = (e: LedgerEntry) => debitNormal ? e.credit : e.debit;

  const typeColor: Record<string, string> = {
    ASSET: 'text-blue-700 bg-blue-50 border-blue-200',
    LIABILITY: 'text-rose-700 bg-rose-50 border-rose-200',
    EQUITY: 'text-purple-700 bg-purple-50 border-purple-200',
    REVENUE: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    EXPENSE: 'text-amber-700 bg-amber-50 border-amber-200',
  };

  const handleExport = () => {
    if (!entries.length) return;
    const lines = [
      'Date,Entry No,Description,IN,OUT,Balance',
      ...entries.map(e =>
        `${e.date},${e.entryNumber},"${e.description}",${getIn(e) || ''},${getOut(e) || ''},${e.balance}`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `account-${account?.code || accountId}-detail.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Report
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="btn-ghost text-sm">
            <Printer className="h-4 w-4" /> Print
          </button>
          <button onClick={handleExport} className="btn-ghost text-sm">
            <Download className="h-4 w-4" /> Export
          </button>
          <button onClick={fetchData} className="btn-ghost text-sm">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Account Header */}
      {account && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <p className="text-sm text-white/70 font-mono">{account.code}</p>
                <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold border ${typeColor[accountType] || 'text-slate-700 bg-slate-50 border-slate-200'}`}>
                  {account.type}
                </span>
              </div>
              <h2 className="text-2xl font-bold">{account.name}</h2>
              <p className="text-sm text-white/60 mt-1">{entries.length} transactions</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/70">Current Balance</p>
              <p className="text-3xl font-bold">SAR {fmt(currentBalance)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100/80">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ArrowDownCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-700">SAR {fmt(totalIn)}</p>
              <p className="text-xs text-slate-500 font-medium">Total IN</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100/80">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <ArrowUpCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-red-700">SAR {fmt(totalOut)}</p>
              <p className="text-xs text-slate-500 font-medium">Total OUT</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100/80">
          <div className="flex items-center gap-3">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${netMovement >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className={`text-xl font-bold ${netMovement >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>SAR {fmt(netMovement)}</p>
              <p className="text-xs text-slate-500 font-medium">Net Movement</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100/80">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">SAR {fmt(openingBalance)}</p>
              <p className="text-xs text-slate-500 font-medium">Opening Balance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-4 flex items-center gap-4 flex-wrap">
        <Calendar className="h-5 w-5 text-slate-400" />
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">From:</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 px-3 rounded-lg border border-slate-200 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">To:</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 px-3 rounded-lg border border-slate-200 text-sm" />
        </div>
      </div>

      {/* Transaction Table */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-16 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading transactions...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Transactions</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {debitNormal
                ? 'Debit = IN (increases balance), Credit = OUT (decreases balance)'
                : 'Credit = IN (increases balance), Debit = OUT (decreases balance)'}
            </p>
          </div>
          <table className="table-premium">
            <thead>
              <tr>
                <th className="w-28">Date</th>
                <th className="w-32">Entry No.</th>
                <th>Description</th>
                <th className="text-right w-40">
                  <span className="inline-flex items-center gap-1 text-emerald-700">IN</span>
                </th>
                <th className="text-right w-40">
                  <span className="inline-flex items-center gap-1 text-red-700">OUT</span>
                </th>
                <th className="text-right w-44">Balance</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-slate-400">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    No transactions in this period
                  </td>
                </tr>
              ) : (
                <>
                  {/* Opening Balance Row */}
                  <tr className="bg-slate-50/50 border-b border-slate-100/80">
                    <td className="py-3 px-4 text-sm text-slate-500" colSpan={3}>
                      <span className="font-semibold text-slate-700">Opening Balance</span>
                    </td>
                    <td className="py-3 px-4" />
                    <td className="py-3 px-4" />
                    <td className="py-3 px-4 text-right text-sm font-bold text-slate-900">
                      SAR {fmt(openingBalance)}
                    </td>
                  </tr>
                  {entries.map((entry, idx) => {
                    const inAmt = getIn(entry);
                    const outAmt = getOut(entry);
                    return (
                      <tr key={entry.id || idx} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100/80 last:border-0">
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {entry.date ? new Date(entry.date).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm font-mono font-medium">
                          <button
                            onClick={() => navigate(`/accounting/journal-entries?highlight=${encodeURIComponent(entry.entryNumber)}`)}
                            className="text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                          >
                            {entry.entryNumber}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-700">{entry.description}</td>
                        <td className="py-3 px-4 text-right text-sm font-bold">
                          {inAmt > 0
                            ? <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">{fmt(inAmt)}</span>
                            : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-bold">
                          {outAmt > 0
                            ? <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded-md">{fmt(outAmt)}</span>
                            : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-bold text-slate-900">
                          SAR {fmt(entry.balance)}
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
            {entries.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={3} className="py-4 px-4 text-right text-sm font-bold text-slate-900 uppercase tracking-wider">Totals</td>
                  <td className="py-4 px-4 text-right text-base font-bold text-emerald-700">
                    {fmt(totalIn)}
                  </td>
                  <td className="py-4 px-4 text-right text-base font-bold text-red-700">
                    {fmt(totalOut)}
                  </td>
                  <td className="py-4 px-4 text-right text-base font-bold text-slate-900">
                    SAR {fmt(currentBalance)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
};

export default AccountDetail;
