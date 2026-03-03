import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { accountsApi } from '../../services/api';
import { Account } from '../../types';
import toast from 'react-hot-toast';
import {
    Folder, FileText, ChevronRight, ChevronDown, TrendingUp, TrendingDown, Wallet, Landmark,
    DollarSign, BarChart3, Plus, Edit3, Trash2, X, Loader2,
} from 'lucide-react';

const typeConfig: Record<string, { bg: string; text: string; icon: any; label: string }> = {
    'ASSET': { bg: 'bg-blue-50', text: 'text-blue-600', icon: Wallet, label: 'Asset' },
    'Asset': { bg: 'bg-blue-50', text: 'text-blue-600', icon: Wallet, label: 'Asset' },
    'LIABILITY': { bg: 'bg-rose-50', text: 'text-rose-600', icon: TrendingDown, label: 'Liability' },
    'Liability': { bg: 'bg-rose-50', text: 'text-rose-600', icon: TrendingDown, label: 'Liability' },
    'EQUITY': { bg: 'bg-purple-50', text: 'text-purple-600', icon: Landmark, label: 'Equity' },
    'Equity': { bg: 'bg-purple-50', text: 'text-purple-600', icon: Landmark, label: 'Equity' },
    'REVENUE': { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: TrendingUp, label: 'Revenue' },
    'Revenue': { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: TrendingUp, label: 'Revenue' },
    'EXPENSE': { bg: 'bg-amber-50', text: 'text-amber-600', icon: DollarSign, label: 'Expense' },
    'Expense': { bg: 'bg-amber-50', text: 'text-amber-600', icon: DollarSign, label: 'Expense' },
};

interface TreeNode extends Account {
    children: TreeNode[];
    depth: number;
}

const ACCOUNT_TYPES = [
    { value: 'ASSET', label: 'Asset' },
    { value: 'LIABILITY', label: 'Liability' },
    { value: 'EQUITY', label: 'Equity' },
    { value: 'REVENUE', label: 'Revenue' },
    { value: 'EXPENSE', label: 'Expense' },
] as const;

const emptyForm = { code: '', name: '', type: 'ASSET', subType: 'GENERAL', parentId: '', description: '', balance: 0 };

const ChartOfAccounts: React.FC = () => {
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Tree expand/collapse state
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [form, setForm] = useState<typeof emptyForm>({ ...emptyForm });

    // Delete confirmation
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const raw = await accountsApi.getAll();
            const list = Array.isArray(raw) ? raw : [];
            // Build a set of IDs that are parents (have children)
            const parentIds = new Set(list.map((a: any) => a.parentId).filter(Boolean));
            // Map backend fields to frontend expected fields
            const mapped = list.map((a: any) => ({
                ...a,
                balance: a.balance ?? a.currentBalance ?? a.openingBalance ?? 0,
                isGroup: a.isGroup || a.subType === 'GROUP' || parentIds.has(a.id),
            }));
            setAccounts(mapped);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to load accounts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    // Build tree structure from flat list
    const tree = useMemo(() => {
        const map = new Map<string, TreeNode>();
        const roots: TreeNode[] = [];

        // First pass: create TreeNode for each account
        for (const acc of accounts) {
            map.set(acc.id, { ...acc, children: [], depth: 0 });
        }

        // Second pass: link children to parents
        for (const acc of accounts) {
            const node = map.get(acc.id)!;
            if (acc.parentId && map.has(acc.parentId)) {
                const parent = map.get(acc.parentId)!;
                parent.children.push(node);
            } else {
                roots.push(node);
            }
        }

        // Third pass: compute depths
        const setDepth = (nodes: TreeNode[], depth: number) => {
            for (const n of nodes) {
                n.depth = depth;
                n.children.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
                setDepth(n.children, depth + 1);
            }
        };
        roots.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
        setDepth(roots, 0);

        return roots;
    }, [accounts]);

    // On first load, auto-expand root level
    useEffect(() => {
        if (tree.length > 0 && expanded.size === 0) {
            setExpanded(new Set(tree.map(n => n.id)));
        }
    }, [tree]);

    const toggleExpand = useCallback((id: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const expandAll = useCallback(() => {
        const allGroupIds = accounts.filter(a => a.isGroup).map(a => a.id);
        setExpanded(new Set(allGroupIds));
    }, [accounts]);

    const collapseAll = useCallback(() => {
        setExpanded(new Set());
    }, []);

    // Flatten tree for rendering based on expanded state
    const visibleRows = useMemo(() => {
        const rows: TreeNode[] = [];
        const walk = (nodes: TreeNode[]) => {
            for (const node of nodes) {
                rows.push(node);
                if (node.isGroup && expanded.has(node.id)) {
                    walk(node.children);
                }
            }
        };
        walk(tree);
        return rows;
    }, [tree, expanded]);

    const totalAssets = accounts.filter(a => (a.type || '').toUpperCase() === 'ASSET' && !a.isGroup).reduce((s, a) => s + (a.balance || 0), 0);
    const totalLiabilities = accounts.filter(a => (a.type || '').toUpperCase() === 'LIABILITY' && !a.isGroup).reduce((s, a) => s + (a.balance || 0), 0);
    const totalRevenue = accounts.filter(a => (a.type || '').toUpperCase() === 'REVENUE' && !a.isGroup).reduce((s, a) => s + (a.balance || 0), 0);

    // --- Add / Edit handlers ---
    const openAddModal = () => {
        setEditingAccount(null);
        setForm({ ...emptyForm });
        setShowModal(true);
    };

    const handleParentChange = async (parentId: string) => {
        setForm(p => ({ ...p, parentId }));
        if (!parentId || editingAccount) return;
        try {
            const { nextCode } = await accountsApi.getNextCode(parentId);
            const parent = accounts.find(a => a.id === parentId);
            setForm(p => ({
                ...p,
                code: nextCode,
                type: parent?.type || p.type,
            }));
        } catch {
            // Silent fail — user can still type code manually
        }
    };

    const openEditModal = (account: Account) => {
        setEditingAccount(account);
        setForm({
            code: account.code || '',
            name: account.name || '',
            type: account.type || 'ASSET',
            subType: account.subType || 'GENERAL',
            parentId: account.parentId || '',
            description: (account as any).description || '',
            balance: account.balance || 0,
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.code.trim() || !form.name.trim()) {
            toast.error('Code and Name are required');
            return;
        }
        setSaving(true);
        try {
            if (editingAccount) {
                const updated = await accountsApi.update(editingAccount.id, {
                    code: form.code,
                    name: form.name,
                    type: form.type,
                    parentId: form.parentId || undefined,
                    description: form.description,
                    openingBalance: form.balance,
                });
                setAccounts(prev => prev.map(a => a.id === editingAccount.id ? { ...a, ...updated, balance: updated.currentBalance ?? updated.openingBalance ?? form.balance } : a));
                toast.success('Account updated successfully');
            } else {
                const created = await accountsApi.create({
                    code: form.code,
                    name: form.name,
                    type: form.type,
                    subType: form.subType || 'General',
                    parentId: form.parentId || undefined,
                    description: form.description,
                    openingBalance: form.balance,
                });
                setAccounts(prev => [...prev, { ...created, balance: created.currentBalance ?? created.openingBalance ?? form.balance }]);
                toast.success('Account created successfully');
            }
            setShowModal(false);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save account');
        } finally {
            setSaving(false);
        }
    };

    // --- Delete handler ---
    const handleDelete = async (id: string) => {
        try {
            await accountsApi.remove(id);
            setAccounts(prev => prev.filter(a => a.id !== id));
            toast.success('Account deleted successfully');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to delete account');
        } finally {
            setDeleteId(null);
        }
    };

    const handleExportAccounts = () => {
        if (accounts.length === 0) {
            toast.error('No accounts to export');
            return;
        }
        const headers = ['Code', 'Account Name', 'Type', 'Balance', 'Is Group', 'Parent ID'];
        const rows = accounts.map(a => [
            a.code,
            a.name,
            a.type,
            (a.balance || 0).toString(),
            a.isGroup ? 'Yes' : 'No',
            a.parentId || '',
        ]);
        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chart-of-accounts-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Chart of Accounts exported successfully');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mx-auto mb-4" />
                    <p className="text-sm text-slate-500 font-medium">Loading accounts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Chart of Accounts"
                subtitle="Manage your general ledger accounts hierarchy."
                onAdd={openAddModal}
                onExport={handleExportAccounts}
                onImport={() => toast.success('Import functionality coming soon')}
                addLabel="Add Account"
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Wallet className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">SAR {totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p><p className="text-xs text-slate-500">Total Assets</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600"><TrendingDown className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">SAR {totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p><p className="text-xs text-slate-500">Liabilities</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><TrendingUp className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">SAR {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p><p className="text-xs text-slate-500">Revenue</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600"><BarChart3 className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">{accounts.length}</p><p className="text-xs text-slate-500">Total Accounts</p></div>
                </div>
            </div>

            {/* Expand / Collapse controls */}
            <div className="flex items-center gap-2">
                <button onClick={expandAll} className="text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-all">
                    Expand All
                </button>
                <button onClick={collapseAll} className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-50 transition-all">
                    Collapse All
                </button>
                <span className="text-xs text-slate-400 ml-2">{visibleRows.length} of {accounts.length} accounts shown</span>
            </div>

            {/* Accounts Tree Table */}
            <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
                <table className="table-premium">
                    <thead>
                        <tr>
                            <th className="w-32">Code</th>
                            <th>Account Name</th>
                            <th className="w-40">Type</th>
                            <th className="text-right w-48">Balance (Dr/Cr)</th>
                            <th className="text-center w-32">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleRows.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center py-16 text-slate-400">
                                    <Folder className="h-12 w-12 mx-auto mb-3 text-slate-200" />
                                    <p className="font-semibold">No accounts found</p>
                                    <p className="text-sm mt-1">Click "Add Account" to create your first account.</p>
                                </td>
                            </tr>
                        ) : (
                            visibleRows.map(account => {
                                const indent = account.depth * 24;
                                const isGroup = account.isGroup;
                                const isExpanded = expanded.has(account.id);
                                const config = typeConfig[account.type] || typeConfig['Asset'];
                                const hasChildren = isGroup && account.children.length > 0;

                                return (
                                    <tr key={account.id} className={`hover:bg-slate-50/80 transition-colors border-b border-slate-100/80 last:border-0 group ${account.depth === 0 ? 'bg-slate-50/40' : ''}`}>
                                        <td className="py-3 pr-4 font-mono text-sm font-semibold" style={{ paddingLeft: '1.5rem' }}>
                                            <span className="text-slate-400">{account.code}</span>
                                        </td>
                                        <td className="py-3 pr-4" style={{ paddingLeft: `${indent + 12}px` }}>
                                            <div className="flex items-center gap-2">
                                                {/* Expand/Collapse toggle for group accounts */}
                                                {hasChildren ? (
                                                    <button
                                                        onClick={() => toggleExpand(account.id)}
                                                        className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-slate-200/60 transition-colors flex-shrink-0"
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                                                        ) : (
                                                            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                                        )}
                                                    </button>
                                                ) : (
                                                    <span className="w-6 flex-shrink-0" />
                                                )}
                                                {isGroup ? (
                                                    <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 flex-shrink-0">
                                                        <Folder className="h-3.5 w-3.5" />
                                                    </div>
                                                ) : (
                                                    <div className="h-7 w-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                                                        <FileText className="h-3.5 w-3.5" />
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => navigate(`/accounting/account/${account.id}`)}
                                                    className={`text-sm text-left hover:underline hover:text-blue-600 transition-colors ${isGroup ? 'font-bold text-slate-900' : 'text-slate-700 font-medium'}`}
                                                >
                                                    {account.name}
                                                </button>
                                                {hasChildren && !isExpanded && (
                                                    <span className="text-xs text-slate-400 ml-1">({account.children.length})</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold ${config.bg} ${config.text}`}>
                                                {config.label || account.type}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            {(account.balance || 0) !== 0 ? (
                                                <span className={`text-sm font-bold ${(account.balance || 0) > 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                                                    <span className={`text-xs font-semibold mr-1 ${(account.balance || 0) > 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                                                        {(account.balance || 0) > 0 ? 'Dr' : 'Cr'}
                                                    </span>
                                                    SAR {Math.abs(account.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-slate-300">—</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEditModal(account)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="Edit account"
                                                >
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteId(account.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                    title="Delete account"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg mx-4">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">
                                {editingAccount ? 'Edit Account' : 'Add New Account'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Account Code <span className="text-rose-500">*</span></label>
                                    <input
                                        type="text"
                                        value={form.code}
                                        onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                                        className={`input-premium w-full ${form.parentId && !editingAccount ? 'bg-slate-50 text-slate-600' : ''}`}
                                        placeholder="Auto-generated when parent selected"
                                        readOnly={!!(form.parentId && !editingAccount)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Account Name <span className="text-rose-500">*</span></label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                        className="input-premium w-full"
                                        placeholder="e.g. Short-term Investments"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Account Type <span className="text-rose-500">*</span></label>
                                    <select
                                        value={form.type}
                                        onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                                        className="input-premium w-full"
                                    >
                                        {ACCOUNT_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Parent Account</label>
                                    <select
                                        value={form.parentId}
                                        onChange={e => handleParentChange(e.target.value)}
                                        className="input-premium w-full"
                                    >
                                        <option value="">-- No Parent (Root) --</option>
                                        {accounts
                                            .filter(a => !editingAccount || a.id !== editingAccount.id)
                                            .sort((a, b) => (a.code || '').localeCompare(b.code || ''))
                                            .map(a => (
                                                <option key={a.id} value={a.id}>
                                                    {a.code} - {a.name} ({a.type})
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Description</label>
                                <input
                                    type="text"
                                    value={form.description}
                                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                    className="input-premium w-full"
                                    placeholder="Optional description..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Opening Balance</label>
                                <input
                                    type="number"
                                    value={form.balance}
                                    onChange={e => setForm(p => ({ ...p, balance: parseFloat(e.target.value) || 0 }))}
                                    className="input-premium w-full"
                                    placeholder="0.00"
                                    step="0.01"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100">
                            <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !form.code.trim() || !form.name.trim()}
                                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                {editingAccount ? 'Update Account' : 'Add Account'}
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
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Account?</h3>
                            <p className="text-sm text-slate-500 mb-6">This action cannot be undone. The account and its data will be permanently removed.</p>
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

export default ChartOfAccounts;
