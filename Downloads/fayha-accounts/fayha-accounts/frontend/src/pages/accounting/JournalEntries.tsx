import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { journalsApi, accountsApi } from '../../services/api';
import { JournalEntry } from '../../types';
import toast from 'react-hot-toast';
import {
    FileText, CheckCircle2, Clock, XCircle, BookOpen, Hash,
    Plus, Trash2, Send, Ban, X, Loader2, ChevronDown, ChevronRight,
    Search,
} from 'lucide-react';

const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
    'Draft': { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600', icon: Clock },
    'DRAFT': { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600', icon: Clock },
    'Posted': { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2 },
    'POSTED': { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2 },
    'Void': { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', icon: XCircle },
    'Voided': { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', icon: XCircle },
    'VOIDED': { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', icon: XCircle },
};

const JournalEntries: React.FC = () => {
    const [journals, setJournals] = useState<JournalEntry[]>([]);
    const [accountOptions, setAccountOptions] = useState<{ value: string; label: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // New entry form
    const [showNewEntry, setShowNewEntry] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
    const [newEntryType, setNewEntryType] = useState<'Receipt' | 'Payment' | 'Contra' | 'Journal'>('Journal');
    const [newDescription, setNewDescription] = useState('');
    const [newLines, setNewLines] = useState([
        { id: `nl-1`, accountId: '', debitAmount: 0, creditAmount: 0, description: '' },
        { id: `nl-2`, accountId: '', debitAmount: 0, creditAmount: 0, description: '' },
    ]);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Void modal
    const [voidId, setVoidId] = useState<string | null>(null);
    const [voidReason, setVoidReason] = useState('');

    // Delete confirmation
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const fetchJournals = async () => {
        try {
            setLoading(true);
            const [data, acctData] = await Promise.all([
                journalsApi.getAll(),
                accountsApi.getAll(),
            ]);
            setJournals(Array.isArray(data) ? data : []);
            const accounts = Array.isArray(acctData) ? acctData : [];
            setAccountOptions(accounts.map((a: any) => ({
                value: a.id,
                label: `[${a.code}] ${a.name}`,
            })));
        } catch (err: any) {
            toast.error(err?.message || 'Failed to load journal entries');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJournals();
    }, []);

    // Apply filters
    const filteredJournals = journals.filter(j => {
        // Status filter
        if (statusFilter !== 'All') {
            const s = j.status?.toUpperCase();
            if (statusFilter === 'DRAFT' && s !== 'DRAFT') return false;
            if (statusFilter === 'POSTED' && s !== 'POSTED') return false;
            if (statusFilter === 'VOIDED' && s !== 'VOIDED') return false;
        }
        // Date range filter
        if (dateFrom && j.date) {
            const jDate = new Date(j.date).toISOString().split('T')[0];
            if (jDate < dateFrom) return false;
        }
        if (dateTo && j.date) {
            const jDate = new Date(j.date).toISOString().split('T')[0];
            if (jDate > dateTo) return false;
        }
        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const entryNum = (j.entryNumber || j.entryNo || '').toLowerCase();
            const desc = (j.description || '').toLowerCase();
            if (!entryNum.includes(term) && !desc.includes(term)) return false;
        }
        return true;
    });

    const totalDebits = filteredJournals.reduce((s, j) => {
        const lines = Array.isArray(j.lines) ? j.lines : [];
        return s + lines.reduce((ls, l) => ls + (l.debitAmount || l.debit || 0), 0);
    }, 0);
    const postedCount = filteredJournals.filter(j => j.status === 'Posted' || j.status === 'POSTED').length;

    // --- New entry line management ---
    const addLine = () => {
        setNewLines(prev => [...prev, { id: `nl-${Date.now()}`, accountId: '', debitAmount: 0, creditAmount: 0, description: '' }]);
    };

    const removeLine = (id: string) => {
        if (newLines.length <= 2) return;
        setNewLines(prev => prev.filter(l => l.id !== id));
    };

    const updateLine = (id: string, field: string, value: any) => {
        setNewLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    const totalDr = newLines.reduce((s, l) => s + (l.debitAmount || 0), 0);
    const totalCr = newLines.reduce((s, l) => s + (l.creditAmount || 0), 0);
    const isBalanced = Math.abs(totalDr - totalCr) < 0.01;

    // --- Save new entry ---
    const handleSave = async (status: 'Draft' | 'Posted') => {
        if (!newDate) {
            toast.error('Date is required');
            return;
        }
        if (!newDescription.trim()) {
            toast.error('Description is required');
            return;
        }
        const validLines = newLines.filter(l => l.accountId && (l.debitAmount > 0 || l.creditAmount > 0));
        if (validLines.length < 2) {
            toast.error('At least 2 lines with account and amount are required');
            return;
        }
        if (!isBalanced) {
            toast.error('Debits and credits must be equal');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                date: newDate,
                entryType: newEntryType,
                description: newDescription,
                status,
                lines: newLines.filter(l => l.accountId && (l.debitAmount > 0 || l.creditAmount > 0)),
            };
            const created = await journalsApi.create(payload);
            if (status === 'Posted' && created?.id) {
                // Post the entry after creation (backend always creates as DRAFT)
                try {
                    const posted = await journalsApi.post(created.id);
                    setJournals(prev => [{ ...created, ...posted, status: 'POSTED' }, ...prev]);
                } catch {
                    setJournals(prev => [created, ...prev]);
                    toast.error('Entry saved as draft but failed to post. You can post it manually.');
                    return;
                }
            } else {
                setJournals(prev => [created, ...prev]);
            }
            toast.success(status === 'Posted' ? 'Journal entry posted successfully' : 'Journal entry saved as draft');
            setShowNewEntry(false);
            setNewDescription('');
            setNewEntryType('Journal');
            setNewDate(new Date().toISOString().split('T')[0]);
            setNewLines([
                { id: `nl-1`, accountId: '', debitAmount: 0, creditAmount: 0, description: '' },
                { id: `nl-2`, accountId: '', debitAmount: 0, creditAmount: 0, description: '' },
            ]);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save journal entry');
        } finally {
            setSaving(false);
        }
    };

    // --- Post a draft ---
    const handlePost = async (id: string) => {
        try {
            const updated = await journalsApi.post(id);
            setJournals(prev => prev.map(j => j.id === id ? { ...j, ...updated, status: updated?.status || 'Posted' } : j));
            toast.success('Journal entry posted successfully');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to post journal entry');
        }
    };

    // --- Void a posted entry ---
    const handleVoid = async () => {
        if (!voidId || !voidReason.trim()) {
            toast.error('Please provide a reason for voiding');
            return;
        }
        try {
            const updated = await journalsApi.void(voidId, voidReason);
            setJournals(prev => prev.map(j => j.id === voidId ? { ...j, ...updated, status: updated?.status || 'Voided' } : j));
            toast.success('Journal entry voided successfully');
            setVoidId(null);
            setVoidReason('');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to void journal entry');
        }
    };

    // --- Delete ---
    const handleDelete = async (id: string) => {
        try {
            await journalsApi.remove(id);
            setJournals(prev => prev.filter(j => j.id !== id));
            toast.success('Journal entry deleted successfully');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to delete journal entry');
        } finally {
            setDeleteId(null);
        }
    };

    const handleExportJournals = () => {
        if (journals.length === 0) {
            toast.error('No journal entries to export');
            return;
        }
        const headers = ['Entry #', 'Date', 'Description', 'Status', 'Total Debits', 'Total Credits'];
        const rows = journals.map(j => {
            const lines = Array.isArray(j.lines) ? j.lines : [];
            const totalDr = lines.reduce((s, l) => s + (l.debitAmount || l.debit || 0), 0);
            const totalCr = lines.reduce((s, l) => s + (l.creditAmount || l.credit || 0), 0);
            return [
                j.entryNumber || j.entryNo || `JE-${j.id?.slice(-6)}`,
                j.date,
                j.description,
                j.status,
                totalDr.toString(),
                totalCr.toString(),
            ];
        });
        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `journal-entries-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Journal entries exported successfully');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mx-auto mb-4" />
                    <p className="text-sm text-slate-500 font-medium">Loading journal entries...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Entries"
                subtitle="Record and view manual double-entry transactions (Receipt, Payment, Contra, Journal)."
                onAdd={() => setShowNewEntry(true)}
                onExport={handleExportJournals}
                onImport={() => toast.success('Import functionality coming soon')}
                addLabel="New Entry"
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600"><BookOpen className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">{filteredJournals.length}</p><p className="text-xs text-slate-500">Total Entries</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><CheckCircle2 className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">{postedCount}</p><p className="text-xs text-slate-500">Posted</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Hash className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">SAR {totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p><p className="text-xs text-slate-500">Total Debits</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600"><Clock className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">{filteredJournals.filter(j => j.status === 'Draft' || j.status === 'DRAFT').length}</p><p className="text-xs text-slate-500">Drafts</p></div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by entry # or description..."
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); }}
                            className="input-premium pl-10 w-full"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="input-premium py-2 text-sm"
                        >
                            <option value="All">All Status</option>
                            <option value="DRAFT">Draft</option>
                            <option value="POSTED">Posted</option>
                            <option value="VOIDED">Voided</option>
                        </select>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            className="input-premium py-2 text-sm"
                            title="From date"
                        />
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            className="input-premium py-2 text-sm"
                            title="To date"
                        />
                        {(searchTerm || statusFilter !== 'All' || dateFrom || dateTo) && (
                            <button
                                onClick={() => { setSearchTerm(''); setStatusFilter('All'); setDateFrom(''); setDateTo(''); }}
                                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                            >
                                <X className="h-3 w-3" /> Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Journal Entries List */}
            <div className="space-y-4">
                {filteredJournals.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-16 text-center">
                        <BookOpen className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-400">No Journal Entries</h3>
                        <p className="text-sm text-slate-400 mt-1">Click "New Entry" to create your first journal entry.</p>
                    </div>
                ) : (
                    filteredJournals.map(journal => {
                        const config = statusConfig[journal.status] || statusConfig['Draft'];
                        const StatusIcon = config.icon;
                        const lines = Array.isArray(journal.lines) ? journal.lines : [];
                        const isExpanded = expandedId === journal.id;

                        return (
                            <div key={journal.id} className="card-premium overflow-hidden">
                                {/* Header */}
                                <div
                                    className="p-5 border-b border-slate-100/80 bg-slate-50/30 flex justify-between items-center cursor-pointer hover:bg-slate-50/60 transition-colors"
                                    onClick={() => setExpandedId(isExpanded ? null : journal.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-11 w-11 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-base">{journal.entryNumber || journal.entryNo || `JE-${journal.id?.slice(-6)}`}</h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {(journal as any).entryType && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mr-2">{(journal as any).entryType}</span>}
                                                {journal.date ? new Date(journal.date).toLocaleDateString() : '-'} &middot; {journal.description}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text}`}>
                                            <StatusIcon className="h-3 w-3" />
                                            {journal.status}
                                        </span>
                                        {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                                    </div>
                                </div>

                                {/* Expanded content */}
                                {isExpanded && (
                                    <>
                                        {/* Lines table */}
                                        <div className="p-3">
                                            <table className="min-w-full">
                                                <thead>
                                                    <tr className="text-xs text-slate-400">
                                                        <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider w-1/2">Account</th>
                                                        <th className="px-4 py-2.5 text-right font-semibold uppercase tracking-wider">Debit (SAR)</th>
                                                        <th className="px-4 py-2.5 text-right font-semibold uppercase tracking-wider">Credit (SAR)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-sm">
                                                    {lines.map((line, idx) => (
                                                        <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                                                            <td className="px-4 py-2.5 text-slate-700 font-medium">
                                                                {(line as any).account?.name ? `[${(line as any).account.code}] ${(line as any).account.name}` : (line as any).accountName || `Account #${line.accountId}`}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-right">
                                                                {(line.debitAmount || line.debit || 0) > 0 ? (
                                                                    <span className="font-bold text-slate-900">{(line.debitAmount || line.debit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                                ) : (
                                                                    <span className="text-slate-300">-</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-right">
                                                                {(line.creditAmount || line.credit || 0) > 0 ? (
                                                                    <span className="font-bold text-slate-900">{(line.creditAmount || line.credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                                ) : (
                                                                    <span className="text-slate-300">-</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-slate-50/80 font-bold text-slate-900">
                                                        <td className="px-4 py-3 text-right text-xs uppercase tracking-wider text-slate-500">Totals</td>
                                                        <td className="px-4 py-3 text-right">{lines.reduce((s, l) => s + (l.debitAmount || l.debit || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                        <td className="px-4 py-3 text-right">{lines.reduce((s, l) => s + (l.creditAmount || l.credit || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="px-5 py-3 border-t border-slate-100/80 bg-slate-50/30 flex items-center justify-end gap-2">
                                            {(journal.status === 'Draft' || journal.status === 'DRAFT') && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handlePost(journal.id); }}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors"
                                                >
                                                    <Send className="h-3.5 w-3.5" /> Post
                                                </button>
                                            )}
                                            {(journal.status === 'Posted' || journal.status === 'POSTED') && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setVoidId(journal.id); }}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors"
                                                >
                                                    <Ban className="h-3.5 w-3.5" /> Void
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setDeleteId(journal.id); }}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-colors"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" /> Delete
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* New Entry Modal */}
            {showNewEntry && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">New Entry</h3>
                            <button onClick={() => setShowNewEntry(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-5">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Entry Type <span className="text-rose-500">*</span></label>
                                    <select value={newEntryType} onChange={e => setNewEntryType(e.target.value as any)} className="input-premium w-full">
                                        <option value="Receipt">Receipt</option>
                                        <option value="Payment">Payment</option>
                                        <option value="Contra">Contra</option>
                                        <option value="Journal">Journal</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Date <span className="text-rose-500">*</span></label>
                                    <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="input-premium w-full" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Description <span className="text-rose-500">*</span></label>
                                    <input
                                        type="text"
                                        value={newDescription}
                                        onChange={e => setNewDescription(e.target.value)}
                                        className="input-premium w-full"
                                        placeholder="Enter description..."
                                    />
                                </div>
                            </div>

                            {/* Lines */}
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-slate-50">
                                        <tr className="text-xs text-slate-500 uppercase tracking-wider">
                                            <th className="px-3 py-2.5 text-left font-semibold">Account</th>
                                            <th className="px-3 py-2.5 text-left font-semibold">Description</th>
                                            <th className="px-3 py-2.5 text-right font-semibold">Debit</th>
                                            <th className="px-3 py-2.5 text-right font-semibold">Credit</th>
                                            <th className="px-3 py-2.5 text-center font-semibold w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {newLines.map(line => (
                                            <tr key={line.id} className="border-t border-slate-100">
                                                <td className="p-2">
                                                    <select
                                                        value={line.accountId}
                                                        onChange={e => updateLine(line.id, 'accountId', e.target.value)}
                                                        className="input-premium w-full text-sm"
                                                    >
                                                        <option value="">Select account...</option>
                                                        {accountOptions.map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="text"
                                                        value={line.description}
                                                        onChange={e => updateLine(line.id, 'description', e.target.value)}
                                                        className="input-premium w-full text-sm"
                                                        placeholder="Note"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="number"
                                                        value={line.debitAmount || ''}
                                                        onChange={e => updateLine(line.id, 'debitAmount', parseFloat(e.target.value) || 0)}
                                                        className="input-premium w-full text-right text-sm"
                                                        placeholder="0.00"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="number"
                                                        value={line.creditAmount || ''}
                                                        onChange={e => updateLine(line.id, 'creditAmount', parseFloat(e.target.value) || 0)}
                                                        className="input-premium w-full text-right text-sm"
                                                        placeholder="0.00"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </td>
                                                <td className="p-2 text-center">
                                                    <button
                                                        onClick={() => removeLine(line.id)}
                                                        disabled={newLines.length <= 2}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center justify-between">
                                <button onClick={addLine} className="btn-ghost text-sm">
                                    <Plus className="h-4 w-4" /> Add Line
                                </button>
                                <div className="text-sm">
                                    <span className={`font-semibold ${isBalanced ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        Dr: {totalDr.toLocaleString()} | Cr: {totalCr.toLocaleString()}
                                        {isBalanced ? ' (Balanced)' : ` (Diff: ${Math.abs(totalDr - totalCr).toLocaleString()})`}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100">
                            <button onClick={() => setShowNewEntry(false)} className="btn-ghost">Cancel</button>
                            <button
                                onClick={() => handleSave('Draft')}
                                disabled={saving || !isBalanced || !newDescription.trim()}
                                className="btn-ghost border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />} Save as Draft
                            </button>
                            <button
                                onClick={() => handleSave('Posted')}
                                disabled={saving || !isBalanced || !newDescription.trim()}
                                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Post Entry
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Void Reason Modal */}
            {voidId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm mx-4 p-6">
                        <div className="text-center mb-4">
                            <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                                <Ban className="h-6 w-6 text-amber-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Void Journal Entry?</h3>
                            <p className="text-sm text-slate-500 mb-4">Please provide a reason for voiding this entry.</p>
                        </div>
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Reason <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                value={voidReason}
                                onChange={e => setVoidReason(e.target.value)}
                                className="input-premium w-full"
                                placeholder="Enter reason for voiding..."
                                autoFocus
                            />
                        </div>
                        <div className="flex items-center justify-center gap-3">
                            <button onClick={() => { setVoidId(null); setVoidReason(''); }} className="btn-ghost">Cancel</button>
                            <button
                                onClick={handleVoid}
                                disabled={!voidReason.trim()}
                                className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Void Entry
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm mx-4 p-6">
                        <div className="text-center">
                            <div className="h-12 w-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="h-6 w-6 text-rose-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Journal Entry?</h3>
                            <p className="text-sm text-slate-500 mb-6">This action cannot be undone.</p>
                            <div className="flex items-center justify-center gap-3">
                                <button onClick={() => setDeleteId(null)} className="btn-ghost">Cancel</button>
                                <button
                                    onClick={() => handleDelete(deleteId)}
                                    className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JournalEntries;
