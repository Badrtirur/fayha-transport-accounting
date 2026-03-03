import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { vendorsApi } from '../../services/api';
import toast from 'react-hot-toast';
import { Truck, Phone, Building2, Globe, Eye, Edit2, Trash2, MapPin, Banknote, Archive } from 'lucide-react';

const isValidPhone = (phone: string): boolean => {
    if (!phone) return true;
    const cleaned = phone.replace(/[\s\-()]/g, '');
    return /^(\+?\d{7,15})$/.test(cleaned);
};

const isValidEmail = (email: string): boolean => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

interface Vendor {
    id: string;
    _id?: string;
    name: string;
    nameAr?: string;
    vendorType: string;
    type?: string;
    contactPerson?: string;
    phone: string;
    email: string;
    address?: string;
    city?: string;
    country?: string;
    taxNumber?: string;
    vatNumber?: string;
    category?: string;
    balance: number;
    location: string;
    totalBills: number;
    status: 'Active' | 'Inactive';
}

const emptyForm: {
    name: string;
    nameAr: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
    vatNumber: string;
    category: string;
    contactPerson: string;
} = {
    name: '',
    nameAr: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'Saudi Arabia',
    vatNumber: '',
    category: 'Supplier',
    contactPerson: '',
};

const vendorTypeOptions = ['Supplier', 'Transporter', 'Government'];

const typeConfig: Record<string, { icon: any; bg: string; text: string }> = {
    'Government': { icon: Building2, bg: 'bg-blue-50', text: 'text-blue-600' },
    'Transporter': { icon: Truck, bg: 'bg-amber-50', text: 'text-amber-600' },
    'Supplier': { icon: Globe, bg: 'bg-purple-50', text: 'text-purple-600' },
    'Inspector': { icon: Globe, bg: 'bg-purple-50', text: 'text-purple-600' },
};

const VendorList: React.FC = () => {
    const navigate = useNavigate();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [searchTerm, setSearchTerm] = useState('');
    const itemsPerPage = 8;

    const filteredVendors = useMemo(() => {
        if (!searchTerm.trim()) return vendors;
        const q = searchTerm.toLowerCase();
        return vendors.filter(v =>
            v.name?.toLowerCase().includes(q) ||
            v.email?.toLowerCase().includes(q) ||
            v.phone?.includes(q) ||
            v.city?.toLowerCase().includes(q) ||
            v.contactPerson?.toLowerCase().includes(q) ||
            (v.category || v.type || '').toLowerCase().includes(q)
        );
    }, [vendors, searchTerm]);

    const fetchVendors = async () => {
        try {
            setLoading(true);
            const data = await vendorsApi.getAll();
            const mapped = (data || []).map((v: any) => ({
                ...v,
                id: v.id || v._id || '',
                balance: v.outstandingBalance ?? 0,
                status: v.isActive === false ? 'Inactive' : 'Active',
                vendorType: v.vendorType || v.type || 'Supplier',
                contactPerson: v.contactPerson || '',
                email: v.email || '',
                phone: v.phone || '',
                city: v.city || '',
                location: v.location || v.city || '',
                totalBills: v.totalBills ?? 0,
            }));
            setVendors(mapped);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to load vendors');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVendors();
    }, []);

    const handleOpenAdd = () => {
        setEditingVendor(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const handleOpenEdit = (vendor: Vendor) => {
        setEditingVendor(vendor);
        setForm({
            name: vendor.name || '',
            nameAr: vendor.nameAr || '',
            email: vendor.email || '',
            phone: vendor.phone || '',
            address: vendor.address || '',
            city: vendor.city || vendor.location || '',
            country: vendor.country || 'Saudi Arabia',
            vatNumber: vendor.taxNumber || vendor.vatNumber || '',
            category: vendor.vendorType || vendor.category || vendor.type || 'Supplier',
            contactPerson: vendor.contactPerson || '',
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) { toast.error('Vendor name is required.'); return; }
        if (!form.email.trim()) { toast.error('Email is required.'); return; }
        if (!isValidEmail(form.email)) { toast.error('Please enter a valid email address.'); return; }
        if (form.phone && !isValidPhone(form.phone)) { toast.error('Please enter a valid phone number (e.g. +966 5X XXX XXXX).'); return; }
        try {
            if (editingVendor) {
                const id = editingVendor._id || editingVendor.id;
                await vendorsApi.update(id, form);
                toast.success('Vendor updated successfully');
            } else {
                const code = `VND-${Date.now().toString(36).toUpperCase()}`;
                await vendorsApi.create({ ...form, code, isActive: true });
                toast.success('Vendor created successfully');
            }
            setModalOpen(false);
            setEditingVendor(null);
            setForm(emptyForm);
            fetchVendors();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save vendor');
        }
    };

    const handleDelete = async (vendor: Vendor) => {
        if (!window.confirm(`Are you sure you want to delete "${vendor.name}"? This action cannot be undone.`)) return;
        try {
            const id = vendor._id || vendor.id;
            await vendorsApi.remove(id);
            toast.success('Vendor deleted successfully');
            fetchVendors();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to delete vendor');
        }
    };

    const handleExport = () => {
        if (vendors.length === 0) {
            toast.error('No vendors to export');
            return;
        }
        const headers = ['Name', 'Name (Arabic)', 'Type', 'Contact Person', 'Email', 'Phone', 'City', 'Country', 'Tax Number', 'Balance', 'Status'];
        const rows = vendors.map(v => [
            v.name,
            v.nameAr || '',
            v.vendorType || v.type || '',
            v.contactPerson || '',
            v.email,
            v.phone,
            v.city || v.location || '',
            v.country || '',
            v.taxNumber || '',
            v.balance,
            v.status,
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vendors_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Vendors exported successfully');
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

    const paginatedVendors = filteredVendors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPayable = vendors.reduce((s, v) => s + (v.balance || 0), 0);
    const govCount = vendors.filter(v => (v.vendorType || v.type) === 'Government').length;
    const transporterCount = vendors.filter(v => (v.vendorType || v.type) === 'Transporter').length;

    return (
        <div className="space-y-6">
            <PageHeader title="Vendors" subtitle="Manage suppliers, transporters, and government bodies." onAdd={handleOpenAdd} onExport={handleExport} onImport={handleImport} addLabel="Add Vendor" searchValue={searchTerm} onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1); }} />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600"><Archive className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">{vendors.length}</p><p className="text-xs text-slate-500">Total Vendors</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Building2 className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">{govCount}</p><p className="text-xs text-slate-500">Government</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600"><Truck className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">{transporterCount}</p><p className="text-xs text-slate-500">Transporters</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600"><Banknote className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">SAR {(totalPayable || 0).toLocaleString()}</p><p className="text-xs text-slate-500">Total Payable</p></div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-500">Loading vendors...</div>
                ) : vendors.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">No vendors found. Click "Add Vendor" to create one.</div>
                ) : (
                <>
                <table className="table-premium">
                    <thead><tr><th>Vendor</th><th>Type</th><th>Contact</th><th>Location</th><th className="text-center">Bills</th><th className="text-right">Balance Due</th><th className="text-center">Status</th><th className="text-center">Actions</th></tr></thead>
                    <tbody>
                        {paginatedVendors.map(vendor => {
                            const vType = vendor.vendorType || vendor.type || 'Supplier';
                            const typeConf = typeConfig[vType] || typeConfig['Supplier'];
                            const TypeIcon = typeConf.icon;
                            return (
                                <tr key={vendor._id || vendor.id}>
                                    <td><div className="flex items-center gap-3"><div className={`h-10 w-10 rounded-xl ${typeConf.bg} flex items-center justify-center ${typeConf.text}`}><TypeIcon className="h-5 w-5" /></div><div><p className="font-bold text-slate-900 text-sm">{vendor.name}</p>{vendor.contactPerson && <p className="text-xs text-slate-500">{vendor.contactPerson}</p>}</div></div></td>
                                    <td><span className="badge-neutral">{vType}</span></td>
                                    <td><div className="space-y-1"><p className="text-xs text-slate-600 flex items-center gap-1.5"><Phone className="h-3 w-3 text-slate-400" />{vendor.phone}</p><p className="text-xs text-slate-500 truncate max-w-[150px]">{vendor.email}</p></div></td>
                                    <td><span className="text-sm text-slate-600 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" />{vendor.city || vendor.location}</span></td>
                                    <td className="text-center"><span className="font-bold text-sm text-slate-900">{vendor.totalBills || 0}</span></td>
                                    <td className="text-right"><span className={`font-bold text-sm ${(vendor.balance || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>SAR {(vendor.balance || 0).toLocaleString()}</span></td>
                                    <td className="text-center"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${vendor.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}><span className={`h-1.5 w-1.5 rounded-full ${vendor.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />{vendor.status}</span></td>
                                    <td className="text-center"><div className="flex items-center justify-center gap-1"><button onClick={() => navigate(`/vendors/${vendor._id || vendor.id}`)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="View"><Eye className="h-4 w-4" /></button><button onClick={() => handleOpenEdit(vendor)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit"><Edit2 className="h-4 w-4" /></button><button onClick={() => handleDelete(vendor)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete"><Trash2 className="h-4 w-4" /></button></div></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <Pagination currentPage={currentPage} totalPages={Math.ceil(filteredVendors.length / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={filteredVendors.length} />
                </>
                )}
            </div>

            <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditingVendor(null); }} title={editingVendor ? 'Edit Vendor' : 'Add New Vendor'} size="lg">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Name (English) *</label>
                            <input type="text" className="input-premium w-full" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Fast Track Logistics" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Name (Arabic)</label>
                            <input type="text" className="input-premium w-full" dir="rtl" value={form.nameAr} onChange={e => setForm({ ...form, nameAr: e.target.value })} placeholder="الاسم بالعربي" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Email *</label>
                            <input type="email" className="input-premium w-full" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required placeholder="email@company.com" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
                            <input type="text" className="input-premium w-full" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+966 5X XXX XXXX" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Vendor Type *</label>
                            <select className="input-premium w-full" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required>
                                {vendorTypeOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Person</label>
                            <input type="text" className="input-premium w-full" value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} placeholder="Primary contact name" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Address</label>
                            <input type="text" className="input-premium w-full" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Street address" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">City</label>
                            <input type="text" className="input-premium w-full" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="e.g. Jeddah" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Country</label>
                            <input type="text" className="input-premium w-full" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="e.g. Saudi Arabia" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Tax Number (VAT)</label>
                            <input type="text" className="input-premium w-full" value={form.vatNumber} onChange={e => setForm({ ...form, vatNumber: e.target.value })} placeholder="3XXXXXXXXXX0003" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onClick={() => { setModalOpen(false); setEditingVendor(null); }} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary">{editingVendor ? 'Update Vendor' : 'Create Vendor'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default VendorList;
