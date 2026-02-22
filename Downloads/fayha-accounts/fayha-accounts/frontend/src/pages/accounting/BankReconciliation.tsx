import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { banksApi, journalsApi, accountsApi } from '../../services/api';
import { Landmark, CheckCircle2, Clock, RefreshCw, ArrowDownLeft, ArrowUpRight, Search } from 'lucide-react';

interface BankAccount {
  id: string;
  code: string;
  bankName: string;
  bankNameAr?: string;
  accountNumber?: string;
  ibanNumber?: string;
  currentBalance: number;
  color?: string;
}

interface BankTransaction {
  id: string;
  transactionDate: string;
  description: string;
  reference: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  runningBalance: number;
  reconciliationStatus: 'UNRECONCILED' | 'RECONCILED';
  source?: string; // 'bank' | 'journal'
  journalId?: string;
  journalType?: string;
  party?: string;
}

// GL account codes that represent bank/cash accounts
const BANK_CODES = ['1000', '1010', '1011', '1012', '1013', '1014', '1015'];

const BankReconciliation: React.FC = () => {
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [, setGlAccounts] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [selectedBankCode, setSelectedBankCode] = useState('');
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'unreconciled' | 'reconciled' | 'in' | 'out'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Load banks and GL accounts on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [bankData, acctData] = await Promise.allSettled([
          banksApi.getAll(),
          accountsApi.getAll(),
        ]);
        const bankList = bankData.status === 'fulfilled' && Array.isArray(bankData.value) ? bankData.value : [];
        const acctList = acctData.status === 'fulfilled' && Array.isArray(acctData.value) ? acctData.value : [];

        // Merge GL bank accounts if they aren't in the banks list
        const glBanks = acctList.filter((a: any) =>
          BANK_CODES.includes(a.code) || a.subType === 'Bank' || a.sub === 'bank' || a.subtype === 'bank'
        );

        // Combine: use real bank accounts first, then fill from GL accounts
        const merged: BankAccount[] = [];
        for (const bank of bankList) {
          merged.push(bank);
        }
        for (const gl of glBanks) {
          if (!merged.find(b => b.code === gl.code)) {
            merged.push({
              id: gl.id || gl._id || gl.code,
              code: gl.code,
              bankName: gl.name || gl.bankName || `Account ${gl.code}`,
              bankNameAr: gl.nameAr,
              accountNumber: gl.accountNumber || '',
              ibanNumber: gl.iban || gl.ibanNumber || '',
              currentBalance: gl.currentBalance ?? gl.balance ?? 0,
              color: gl.code === '1000' ? '#f59e0b' : '#10b981',
            });
          }
        }

        setBanks(merged);
        setGlAccounts(acctList);
        if (merged.length > 0) {
          setSelectedBankId(merged[0].id);
          setSelectedBankCode(merged[0].code);
        }
      } catch {
        // silent
      }
    };
    loadData();
  }, []);

  // Fetch transactions for selected bank — from BankTransaction records + journal entries
  const fetchTransactions = useCallback(async (bankId: string, bankCode: string) => {
    if (!bankId) return;
    setLoading(true);
    try {
      // Fetch from both sources in parallel
      const [bankTxResult, journalResult] = await Promise.allSettled([
        banksApi.getTransactions(bankId),
        journalsApi.getAll(),
      ]);

      const bankTxns: BankTransaction[] = [];

      // 1. Add BankTransaction records (from the banks API)
      if (bankTxResult.status === 'fulfilled') {
        const data = Array.isArray(bankTxResult.value) ? bankTxResult.value : [];
        for (const tx of data) {
          bankTxns.push({
            ...tx,
            source: 'bank',
          });
        }
      }

      // 2. Extract transactions from journal entry lines that touch this bank account
      if (journalResult.status === 'fulfilled') {
        const journals = Array.isArray(journalResult.value) ? journalResult.value : [];
        const existingRefs = new Set(bankTxns.map(t => t.reference));

        for (const journal of journals) {
          if (!journal.lines || !Array.isArray(journal.lines)) continue;
          for (const line of journal.lines) {
            if (line.acc !== bankCode && line.account?.code !== bankCode) continue;

            const ref = journal.ref || journal.reference || journal.id || journal._id;
            // Skip if already covered by a BankTransaction
            if (existingRefs.has(ref)) continue;

            const dr = Number(line.dr || line.debit || 0);
            const cr = Number(line.cr || line.credit || 0);
            if (dr === 0 && cr === 0) continue;

            const isCredit = dr > 0; // Debit to bank = money IN (credit to the bank's perspective)

            bankTxns.push({
              id: `jnl-${journal.id || journal._id}-${line.acc}-${Math.random().toString(36).slice(2, 6)}`,
              transactionDate: journal.date || journal.createdAt || new Date().toISOString(),
              description: line.desc || line.description || journal.desc || journal.description || '—',
              reference: ref,
              type: isCredit ? 'CREDIT' : 'DEBIT',
              amount: isCredit ? dr : cr,
              runningBalance: 0, // will be computed below
              reconciliationStatus: 'UNRECONCILED',
              source: 'journal',
              journalId: journal.id || journal._id,
              journalType: journal.type,
              party: journal.party || '',
            });
          }
        }
      }

      // Sort by date descending
      bankTxns.sort((a, b) => {
        const dA = new Date(a.transactionDate).getTime();
        const dB = new Date(b.transactionDate).getTime();
        return dB - dA;
      });

      // Compute running balance (from oldest to newest, then reverse for display)
      const reversed = [...bankTxns].reverse();
      let balance = 0;
      for (const tx of reversed) {
        if (tx.type === 'CREDIT') {
          balance += tx.amount;
        } else {
          balance -= tx.amount;
        }
        tx.runningBalance = balance;
      }

      setTransactions(bankTxns);
    } catch {
      setTransactions([]);
    }
    setLoading(false);
    setSelectedIds(new Set());
  }, []);

  useEffect(() => {
    if (selectedBankId && selectedBankCode) {
      fetchTransactions(selectedBankId, selectedBankCode);
    }
  }, [selectedBankId, selectedBankCode, fetchTransactions]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleReconcile = async () => {
    if (selectedIds.size === 0) return;
    // Only reconcile actual bank transactions (not journal-derived)
    const bankOnlyIds = Array.from(selectedIds).filter(id => !id.startsWith('jnl-'));
    try {
      if (bankOnlyIds.length > 0) {
        await banksApi.reconcile(selectedBankId, bankOnlyIds);
      }
      // Mark journal-derived as reconciled locally
      setTransactions(prev => prev.map(t =>
        selectedIds.has(t.id) ? { ...t, reconciliationStatus: 'RECONCILED' as const } : t
      ));
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Reconciliation failed:', err);
    }
  };

  const selectedBank = banks.find(b => b.id === selectedBankId);

  // Apply filters
  const filtered = transactions.filter(t => {
    if (filter === 'unreconciled') return t.reconciliationStatus === 'UNRECONCILED';
    if (filter === 'reconciled') return t.reconciliationStatus === 'RECONCILED';
    if (filter === 'in') return t.type === 'CREDIT';
    if (filter === 'out') return t.type === 'DEBIT';
    return true;
  }).filter(t => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.description.toLowerCase().includes(term) ||
      t.reference.toLowerCase().includes(term) ||
      (t.party || '').toLowerCase().includes(term)
    );
  });

  const totalIn = transactions.filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter(t => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0);
  const unreconciledCount = transactions.filter(t => t.reconciliationStatus === 'UNRECONCILED').length;
  const reconciledCount = transactions.filter(t => t.reconciliationStatus === 'RECONCILED').length;

  const fmtSAR = (n: number) => `SAR ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Reconciliation"
        subtitle="Select a bank account to view all transactions — money in & out"
        onAdd={() => {}}
        onImport={() => {}}
        onExport={() => {}}
        addLabel=""
      />

      {/* Bank Selector Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {banks.map(bank => (
          <button
            key={bank.id}
            onClick={() => { setSelectedBankId(bank.id); setSelectedBankCode(bank.code); }}
            className={`bg-white rounded-2xl p-5 shadow-card border transition-all text-left ${
              selectedBankId === bank.id ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-slate-100/80 hover:border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white"
                style={{ backgroundColor: bank.color || '#10b981' }}>
                <Landmark className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{bank.bankName}</p>
                <p className="text-xs text-slate-500">{bank.code}{bank.accountNumber ? ` | ${bank.accountNumber}` : ''}</p>
              </div>
            </div>
            <p className="text-xl font-bold text-slate-900 mt-3">{fmtSAR(bank.currentBalance)}</p>
            {bank.ibanNumber && <p className="text-[10px] text-slate-400 font-mono mt-1 truncate">{bank.ibanNumber}</p>}
          </button>
        ))}
      </div>

      {/* Selected Bank Details + Summary */}
      {selectedBank && (
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl p-6 border border-emerald-100">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{selectedBank.bankName}</h3>
              <p className="text-sm text-slate-500">
                GL Code: {selectedBank.code}
                {selectedBank.accountNumber ? ` | Acct: ${selectedBank.accountNumber}` : ''}
                {selectedBank.ibanNumber ? ` | IBAN: ${selectedBank.ibanNumber}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs text-emerald-600 font-semibold uppercase">Money In</p>
                <p className="text-lg font-bold text-emerald-700">{fmtSAR(totalIn)}</p>
                <p className="text-xs text-slate-400">{transactions.filter(t => t.type === 'CREDIT').length} transactions</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-red-600 font-semibold uppercase">Money Out</p>
                <p className="text-lg font-bold text-red-700">{fmtSAR(totalOut)}</p>
                <p className="text-xs text-slate-400">{transactions.filter(t => t.type === 'DEBIT').length} transactions</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-600 font-semibold uppercase">Net</p>
                <p className={`text-lg font-bold ${totalIn - totalOut >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtSAR(totalIn - totalOut)}</p>
                <p className="text-xs text-slate-400">{transactions.length} total</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search + Filter + Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 outline-none w-64"
            />
          </div>
          {/* Filters */}
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filter === 'all' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
            All ({transactions.length})
          </button>
          <button onClick={() => setFilter('in')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filter === 'in' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
            <ArrowDownLeft className="h-3.5 w-3.5 inline mr-1" /> In ({transactions.filter(t => t.type === 'CREDIT').length})
          </button>
          <button onClick={() => setFilter('out')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filter === 'out' ? 'bg-red-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
            <ArrowUpRight className="h-3.5 w-3.5 inline mr-1" /> Out ({transactions.filter(t => t.type === 'DEBIT').length})
          </button>
          <button onClick={() => setFilter('unreconciled')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filter === 'unreconciled' ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
            <Clock className="h-3.5 w-3.5 inline mr-1" /> Unreconciled ({unreconciledCount})
          </button>
          <button onClick={() => setFilter('reconciled')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filter === 'reconciled' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
            <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" /> Reconciled ({reconciledCount})
          </button>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button onClick={handleReconcile} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20">
              <CheckCircle2 className="h-4 w-4 inline mr-1" /> Reconcile ({selectedIds.size})
            </button>
          )}
          <button onClick={() => selectedBankId && fetchTransactions(selectedBankId, selectedBankCode)} className="btn-ghost text-sm p-2 rounded-lg hover:bg-slate-100">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading transactions...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Landmark className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">No transactions</h3>
            <p className="text-sm text-slate-500">
              {selectedBankId
                ? searchTerm
                  ? 'No transactions match your search.'
                  : 'No transactions found for this bank account. Transactions appear here when journal entries (receipts, payments, transfers) touch this bank account.'
                : 'Select a bank account to view all its transactions.'}
            </p>
          </div>
        ) : (
          <table className="table-premium">
            <thead>
              <tr>
                <th className="w-12">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300" onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(new Set(filtered.filter(t => t.reconciliationStatus === 'UNRECONCILED').map(t => t.id)));
                    } else {
                      setSelectedIds(new Set());
                    }
                  }} />
                </th>
                <th className="w-28">Date</th>
                <th>Description</th>
                <th className="w-32">Reference</th>
                <th className="w-24">Source</th>
                <th className="w-24">Type</th>
                <th className="text-right w-36">In (DR)</th>
                <th className="text-right w-36">Out (CR)</th>
                <th className="text-right w-36">Balance</th>
                <th className="w-32">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(tx => (
                <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100/80 last:border-0">
                  <td className="py-3 px-4">
                    {tx.reconciliationStatus === 'UNRECONCILED' && (
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={selectedIds.has(tx.id)} onChange={() => toggleSelect(tx.id)} />
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{new Date(tx.transactionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="py-3 px-4">
                    <div className="text-sm text-slate-800 font-medium">{tx.description}</div>
                    {tx.party && <div className="text-xs text-slate-400">{tx.party}</div>}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-500 font-mono">{tx.reference}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-semibold ${
                      tx.source === 'journal' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {tx.source === 'journal' ? (tx.journalType || 'Journal') : 'Bank'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                      tx.type === 'CREDIT' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {tx.type === 'CREDIT' ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                      {tx.type === 'CREDIT' ? 'IN' : 'OUT'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-bold text-emerald-700">
                    {tx.type === 'CREDIT' ? fmtSAR(tx.amount) : ''}
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-bold text-red-700">
                    {tx.type === 'DEBIT' ? fmtSAR(tx.amount) : ''}
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-semibold text-slate-800">
                    {fmtSAR(tx.runningBalance)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold ${
                      tx.reconciliationStatus === 'RECONCILED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {tx.reconciliationStatus === 'RECONCILED' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {tx.reconciliationStatus === 'RECONCILED' ? 'Reconciled' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold">
                <td colSpan={6} className="py-3 px-4 text-right text-sm text-slate-700">TOTALS</td>
                <td className="py-3 px-4 text-right text-sm text-emerald-700">{fmtSAR(filtered.filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0))}</td>
                <td className="py-3 px-4 text-right text-sm text-red-700">{fmtSAR(filtered.filter(t => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0))}</td>
                <td className="py-3 px-4 text-right text-sm text-slate-800">{filtered.length > 0 ? fmtSAR(filtered[filtered.length - 1]?.runningBalance || 0) : '—'}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
};

export default BankReconciliation;
