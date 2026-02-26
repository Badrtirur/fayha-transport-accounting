import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { accountsApi, accountingApi } from '../../services/api';
import toast from 'react-hot-toast';
import { BookOpen, Search, ChevronRight, Calendar, Printer, RefreshCw, FileText } from 'lucide-react';

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

const GeneralLedger: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    accountsApi.getAll().then((accs: any[]) => {
      setAccounts(accs);
      // Auto-select account from URL param ?accountId=xxx
      const paramAccountId = searchParams.get('accountId');
      if (paramAccountId && !selectedAccountId) {
        setSelectedAccountId(paramAccountId);
      }
    }).catch((err: any) => {
      toast.error(err?.message || 'Failed to load accounts');
    });
  }, []);

  const fetchLedger = async (accountId: string) => {
    if (!accountId) return;
    setLoading(true);
    try {
      const data = await accountingApi.getLedger(accountId, { startDate, endDate });
      const acc = accounts.find(a => a.id === accountId);
      setSelectedAccount(data?.account || acc || null);
      // Backend returns { account, entries: JournalLine[], openingBalance, currentBalance }
      // Each JournalLine has nested journalEntry with date, entryNumber, description
      const rawEntries: any[] = Array.isArray(data) ? data : (data?.entries || []);
      // Calculate running balance starting from opening balance
      let runningBalance = Number(data?.openingBalance || 0);
      const withBalance = rawEntries.map((e: any) => {
        const debit = Number(e.debitAmount || e.debit || 0);
        const credit = Number(e.creditAmount || e.credit || 0);
        runningBalance += debit - credit;
        // Flatten nested journalEntry fields
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
      setEntries(withBalance);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load ledger entries');
      setEntries([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedAccountId) fetchLedger(selectedAccountId);
  }, [selectedAccountId, startDate, endDate]);

  const filteredAccounts = accounts.filter(a =>
    !searchTerm || a.name?.toLowerCase().includes(searchTerm.toLowerCase()) || a.code?.includes(searchTerm)
  );

  const totalDebits = entries.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredits = entries.reduce((s, e) => s + (e.credit || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="General Ledger"
        subtitle="View detailed transaction history for each account."
        onAdd={() => {}}
        onImport={() => {}}
        onExport={() => {
          if (!entries.length) return;
          const lines = ['Date,Entry No,Description,Debit,Credit,Balance', ...entries.map(e => `${e.date},${e.entryNumber},"${e.description}",${e.debit},${e.credit},${e.balance}`)];
          const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = `ledger-${selectedAccount?.code || 'all'}.csv`; a.click();
        }}
        addLabel=""
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Account Selector Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden sticky top-6">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Select Account</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {filteredAccounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => setSelectedAccountId(acc.id)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex items-center gap-2 ${
                    selectedAccountId === acc.id ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 font-mono">{acc.code}</p>
                    <p className="text-sm font-medium text-slate-800 truncate">{acc.name}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
                </button>
              ))}
              {filteredAccounts.length === 0 && (
                <div className="p-6 text-center text-sm text-slate-400">No accounts found</div>
              )}
            </div>
          </div>
        </div>

        {/* Ledger Detail */}
        <div className="lg:col-span-3 space-y-4">
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
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => selectedAccountId && fetchLedger(selectedAccountId)} className="btn-ghost text-sm"><RefreshCw className="h-4 w-4" /></button>
              <button onClick={() => window.print()} className="btn-ghost text-sm"><Printer className="h-4 w-4" /></button>
            </div>
          </div>

          {!selectedAccountId ? (
            <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-16 text-center">
              <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">Select an Account</h3>
              <p className="text-sm text-slate-500">Choose an account from the left panel to view its ledger entries.</p>
            </div>
          ) : loading ? (
            <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-16 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full mx-auto mb-3" />
              <p className="text-sm text-slate-500">Loading ledger...</p>
            </div>
          ) : (
            <>
              {/* Account Header */}
              {selectedAccount && (
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/70 font-mono">{selectedAccount.code}</p>
                      <h3 className="text-xl font-bold">{selectedAccount.name}</h3>
                      <p className="text-sm text-white/70 mt-1">Type: {selectedAccount.type} | {entries.length} transactions</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold">SAR {Number(selectedAccount.currentBalance || selectedAccount.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      <p className="text-sm text-white/70">Current Balance</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Ledger Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-card border border-slate-100/80 text-center">
                  <p className="text-lg font-bold text-blue-700">SAR {totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-slate-500">Total Debits</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-card border border-slate-100/80 text-center">
                  <p className="text-lg font-bold text-emerald-700">SAR {totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-slate-500">Total Credits</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-card border border-slate-100/80 text-center">
                  <p className={`text-lg font-bold ${totalDebits - totalCredits >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                    {totalDebits - totalCredits !== 0 && (
                      <span className={`text-xs mr-1 ${totalDebits - totalCredits > 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                        {totalDebits - totalCredits > 0 ? 'Dr' : 'Cr'}
                      </span>
                    )}
                    SAR {Math.abs(totalDebits - totalCredits).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-slate-500">Net Movement</p>
                </div>
              </div>

              {/* Ledger Table */}
              <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
                <table className="table-premium">
                  <thead>
                    <tr>
                      <th className="w-28">Date</th>
                      <th className="w-32">Entry No.</th>
                      <th>Description</th>
                      <th className="text-right w-36">Debit</th>
                      <th className="text-right w-36">Credit</th>
                      <th className="text-right w-40">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.length === 0 ? (
                      <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">
                        <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        No transactions in this period
                      </td></tr>
                    ) : entries.map((entry, idx) => (
                      <tr key={entry.id || idx} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100/80 last:border-0">
                        <td className="py-3 px-4 text-sm text-slate-600">{entry.date ? new Date(entry.date).toLocaleDateString() : '-'}</td>
                        <td className="py-3 px-4 text-sm font-mono text-indigo-600 font-medium">{entry.entryNumber}</td>
                        <td className="py-3 px-4 text-sm text-slate-700">{entry.description}</td>
                        <td className="py-3 px-4 text-right text-sm font-bold">
                          {entry.debit > 0 ? <span className="text-blue-700">{(entry.debit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-bold">
                          {entry.credit > 0 ? <span className="text-emerald-700">{(entry.credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-bold text-slate-900">
                          {(entry.balance || 0) !== 0 && (
                            <span className={`text-[10px] font-semibold mr-1 ${(entry.balance || 0) > 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                              {(entry.balance || 0) > 0 ? 'Dr' : 'Cr'}
                            </span>
                          )}
                          {Math.abs(entry.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {entries.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-50 border-t-2 border-slate-200">
                        <td colSpan={3} className="py-4 px-4 text-right text-sm font-bold text-slate-900 uppercase tracking-wider">Totals</td>
                        <td className="py-4 px-4 text-right text-base font-bold text-blue-700">{totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4 text-right text-base font-bold text-emerald-700">{totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4 text-right text-base font-bold text-slate-900">
                          {entries.length > 0 ? (
                            <>
                              {(entries[entries.length - 1].balance || 0) !== 0 && (
                                <span className={`text-xs mr-1 ${(entries[entries.length - 1].balance || 0) > 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                                  {(entries[entries.length - 1].balance || 0) > 0 ? 'Dr' : 'Cr'}
                                </span>
                              )}
                              {Math.abs(entries[entries.length - 1].balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </>
                          ) : '0.00'}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeneralLedger;
