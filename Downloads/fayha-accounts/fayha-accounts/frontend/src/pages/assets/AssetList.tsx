import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import { assetsApi } from '../../services/api';
import toast from 'react-hot-toast';
import { Monitor, Truck, Box, TrendingDown, Eye, Edit2, Trash2, Building2, Wrench, CheckCircle2, XCircle } from 'lucide-react';

interface Asset {
    id: string;
    _id?: string;
    name: string;
    category: string;
    type?: string;
    purchaseDate: string;
    cost: number;
    purchaseCost?: number;
    currentValue: number;
    depreciationRate?: number;
    location: string;
    status: 'Active' | 'Maintenance' | 'Disposed';
}

const emptyForm: {
    name: string;
    category: string;
    purchaseDate: string;
    cost: number;
    currentValue: number;
    location: string;
    status: 'Active' | 'Maintenance' | 'Disposed';
} = {
    name: '',
    category: 'Equipment',
    purchaseDate: '',
    cost: 0,
    currentValue: 0,
    location: '',
    status: 'Active',
};

const categoryOptions = ['Equipment', 'Vehicle', 'Furniture', 'IT Equipment'];
// Status options now managed via action buttons in the table

const typeConfig: Record<string, { icon: any; bg: string; text: string }> = {
    'Vehicle': { icon: Truck, bg: 'bg-blue-50', text: 'text-blue-600' },
    'IT Equipment': { icon: Monitor, bg: 'bg-purple-50', text: 'text-purple-600' },
    'Furniture': { icon: Box, bg: 'bg-amber-50', text: 'text-amber-600' },
    'Equipment': { icon: Wrench, bg: 'bg-emerald-50', text: 'text-emerald-600' },
};

const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
    'Active': { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2 },
    'Maintenance': { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: Wrench },
    'Disposed': { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-500', icon: XCircle },
};

const formatDate = (d: any): string => {
    if (!d) return '-';
    try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return String(d);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return String(d); }
};

const AssetList: React.FC = () => {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [form, setForm] = useState<typeof emptyForm>(emptyForm);

    const fetchAssets = async () => {
        try {
            setLoading(true);
            const data = await assetsApi.getAll();
            setAssets(data || []);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to load assets');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssets();
    }, []);

    const handleOpenAdd = () => {
        setEditingAsset(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const handleOpenEdit = (asset: Asset) => {
        setEditingAsset(asset);
        setForm({
            name: asset.name || '',
            category: asset.category || asset.type || 'Equipment',
            purchaseDate: asset.purchaseDate || '',
            cost: asset.cost || asset.purchaseCost || 0,
            currentValue: asset.currentValue || 0,
            location: asset.location || '',
            status: asset.status || 'Active',
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingAsset) {
                const id = editingAsset._id || editingAsset.id;
                await assetsApi.update(id, form);
                toast.success('Asset updated successfully');
            } else {
                await assetsApi.create(form);
                toast.success('Asset created successfully');
            }
            setModalOpen(false);
            setEditingAsset(null);
            setForm(emptyForm);
            fetchAssets();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save asset');
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await assetsApi.update(id, { status: newStatus });
            setAssets(prev => prev.map(item => (item._id || item.id) === id ? { ...item, status: newStatus } as any : item));
            toast.success(`Status updated to ${newStatus}`);
        } catch {
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async (asset: Asset) => {
        if (!window.confirm(`Are you sure you want to delete "${asset.name}"? This action cannot be undone.`)) return;
        try {
            const id = asset._id || asset.id;
            await assetsApi.remove(id);
            toast.success('Asset deleted successfully');
            fetchAssets();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to delete asset');
        }
    };

    const handleExport = () => {
        if (assets.length === 0) {
            toast.error('No assets to export');
            return;
        }
        const headers = ['Name', 'Category', 'Purchase Date', 'Cost', 'Current Value', 'Location', 'Status'];
        const rows = assets.map(a => [
            a.name,
            a.category || a.type || '',
            a.purchaseDate,
            a.cost || a.purchaseCost || 0,
            a.currentValue,
            a.location,
            a.status,
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `assets_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Assets exported successfully');
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.onchange = async (e: any) => {
            const file = e.target.files?.[0];
            if (!file) return;
            toast.success(`File "${file.name}" selected. Import processing is not yet implemented on the backend.`);
        };
        input.click();
    };

    const totalOriginal = assets.reduce((s, a) => s + (a.cost || a.purchaseCost || 0), 0);
    const totalCurrent = assets.reduce((s, a) => s + (a.currentValue || 0), 0);
    const totalDepreciation = totalOriginal - totalCurrent;
    const activeCount = assets.filter(a => a.status === 'Active').length;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Fixed Assets"
                subtitle="Track equipment, vehicles, and their depreciation."
                onAdd={handleOpenAdd}
                onExport={handleExport}
                onImport={handleImport}
                addLabel="Add Asset"
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Building2 className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">SAR {(totalOriginal / 1000).toFixed(0)}K</p><p className="text-xs text-slate-500">Original Cost</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><CheckCircle2 className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">SAR {(totalCurrent / 1000).toFixed(0)}K</p><p className="text-xs text-slate-500">Current Value</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600"><TrendingDown className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">SAR {(totalDepreciation / 1000).toFixed(0)}K</p><p className="text-xs text-slate-500">Depreciation</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600"><Wrench className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">{activeCount}/{assets.length}</p><p className="text-xs text-slate-500">Active Assets</p></div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-500">Loading assets...</div>
                ) : assets.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">No assets found. Click "Add Asset" to create one.</div>
                ) : (
                <table className="table-premium">
                    <thead>
                        <tr>
                            <th>Asset Name</th>
                            <th>Category</th>
                            <th>Location</th>
                            <th>Purchase Date</th>
                            <th className="text-right">Original Cost</th>
                            <th className="text-right">Current Value</th>
                            <th className="text-center">Depreciation</th>
                            <th className="text-center">Status</th>
                            <th className="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.map((asset) => {
                            const cat = asset.category || asset.type || 'Equipment';
                            const typeConf = typeConfig[cat] || typeConfig['Equipment'];
                            const TypeIcon = typeConf.icon;
                            const statusConf = statusConfig[asset.status] || statusConfig['Active'];
                            const StatusIcon = statusConf.icon;
                            const origCost = asset.cost || asset.purchaseCost || 0;
                            const depPercent = origCost > 0 ? ((origCost - asset.currentValue) / origCost) * 100 : 0;

                            return (
                                <tr key={asset._id || asset.id}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className={`h-9 w-9 rounded-xl ${typeConf.bg} flex items-center justify-center ${typeConf.text}`}>
                                                <TypeIcon className="h-4 w-4" />
                                            </div>
                                            <span className="font-semibold text-slate-900 text-sm">{asset.name}</span>
                                        </div>
                                    </td>
                                    <td><span className="badge-neutral">{cat}</span></td>
                                    <td><span className="text-sm text-slate-600">{asset.location}</span></td>
                                    <td><span className="text-sm text-slate-600">{formatDate(asset.purchaseDate)}</span></td>
                                    <td className="text-right"><span className="text-sm text-slate-600">SAR {(origCost || 0).toLocaleString()}</span></td>
                                    <td className="text-right"><span className="font-bold text-slate-900">SAR {(asset.currentValue || 0).toLocaleString()}</span></td>
                                    <td className="text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                <div className={`h-full rounded-full ${depPercent > 75 ? 'bg-rose-500' : depPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(depPercent, 100)}%` }} />
                                            </div>
                                            <span className="text-[10px] font-semibold text-slate-500">{depPercent.toFixed(0)}%</span>
                                        </div>
                                    </td>
                                    <td className="text-center">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConf.bg} ${statusConf.text}`}>
                                            <StatusIcon className="h-3 w-3" />
                                            {asset.status}
                                        </span>
                                    </td>
                                    <td className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            {asset.status === 'Active' && (
                                                <button onClick={() => handleStatusChange(asset._id || asset.id, 'Maintenance')} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all" title="Send to Maintenance">
                                                    <Wrench className="h-4 w-4" />
                                                </button>
                                            )}
                                            {asset.status === 'Active' && (
                                                <button onClick={() => handleStatusChange(asset._id || asset.id, 'Disposed')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all" title="Dispose">
                                                    <XCircle className="h-4 w-4" />
                                                </button>
                                            )}
                                            {asset.status === 'Maintenance' && (
                                                <button onClick={() => handleStatusChange(asset._id || asset.id, 'Active')} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Activate">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                </button>
                                            )}
                                            <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="View"><Eye className="h-4 w-4" /></button>
                                            <button onClick={() => handleOpenEdit(asset)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit"><Edit2 className="h-4 w-4" /></button>
                                            <button onClick={() => handleDelete(asset)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                )}
            </div>

            <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditingAsset(null); }} title={editingAsset ? 'Edit Asset' : 'Add New Asset'} size="lg">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Asset Name *</label>
                            <input
                                type="text"
                                className="input-premium w-full"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                required
                                placeholder="e.g. Mercedes Actros - KSA 1234"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Category *</label>
                            <select
                                className="input-premium w-full"
                                value={form.category}
                                onChange={e => setForm({ ...form, category: e.target.value })}
                                required
                            >
                                {categoryOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Purchase Date *</label>
                            <input
                                type="date"
                                className="input-premium w-full"
                                value={form.purchaseDate}
                                onChange={e => setForm({ ...form, purchaseDate: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Cost (SAR) *</label>
                            <input
                                type="number"
                                className="input-premium w-full"
                                value={form.cost || ''}
                                onChange={e => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
                                required
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Current Value (SAR) *</label>
                            <input
                                type="number"
                                className="input-premium w-full"
                                value={form.currentValue || ''}
                                onChange={e => setForm({ ...form, currentValue: parseFloat(e.target.value) || 0 })}
                                required
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Location *</label>
                            <input
                                type="text"
                                className="input-premium w-full"
                                value={form.location}
                                onChange={e => setForm({ ...form, location: e.target.value })}
                                required
                                placeholder="e.g. Head Office"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onClick={() => { setModalOpen(false); setEditingAsset(null); }} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary">{editingAsset ? 'Update Asset' : 'Create Asset'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default AssetList;
