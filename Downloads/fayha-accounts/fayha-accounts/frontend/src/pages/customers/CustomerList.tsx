import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { customersApi } from '../../services/api';
import toast from 'react-hot-toast';
import { Users, Phone, Mail, MapPin, TrendingUp, Eye, Edit2, Trash2, Building2, Star } from 'lucide-react';

const isValidPhone = (phone: string): boolean => {
    if (!phone) return true;
    const cleaned = phone.replace(/[\s\-()]/g, '');
    return /^(\+?\d{7,15})$/.test(cleaned);
};

const isValidEmail = (email: string): boolean => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

interface JobStatusCounts {
    open: number;
    inProgress: number;
    invoiced: number;
    closed: number;
}

interface Customer {
    id: string;
    _id?: string;
    name: string;
    nameAr?: string;
    contactPerson: string;
    email: string;
    phone: string;
    phoneAlt?: string;
    address?: string;
    city?: string;
    country?: string;
    vatNumber?: string;
    crNumber?: string;
    balance: number;
    status: 'Active' | 'Inactive';
    location: string;
    totalJobs: number;
    totalInvoices: number;
    jobStatusCounts: JobStatusCounts;
    rating: number;
    lastActivity: string;
}

const emptyForm: {
    name: string;
    nameAr: string;
    email: string;
    phone: string;
    phoneAlt: string;
    address: string;
    city: string;
    country: string;
    vatNumber: string;
    crNumber: string;
    contactPerson: string;
} = {
    name: '',
    nameAr: '',
    email: '',
    phone: '',
    phoneAlt: '',
    address: '',
    city: '',
    country: 'Saudi Arabia',
    vatNumber: '',
    crNumber: '',
    contactPerson: '',
};

const CustomerList: React.FC = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [searchTerm, setSearchTerm] = useState('');
    const itemsPerPage = 8;

    const filteredCustomers = useMemo(() => {
        if (!searchTerm.trim()) return customers;
        const q = searchTerm.toLowerCase();
        return customers.filter(c =>
            c.name?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.phone?.includes(q) ||
            c.city?.toLowerCase().includes(q) ||
            c.vatNumber?.includes(q) ||
            c.crNumber?.includes(q)
        );
    }, [customers, searchTerm]);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const data = await customersApi.getAll();
            const mapped = (data || []).map((c: any) => ({
                ...c,
                id: c.id || c._id || '',
                balance: c.outstandingBalance ?? 0,
                status: c.isActive === false ? 'Inactive' : 'Active',
                contactPerson: c.contactPerson || '',
                email: c.email || '',
                phone: c.phone || '',
                city: c.city || '',
                location: c.location || c.city || '',
                rating: c.rating ?? 0,
                totalJobs: c.totalJobs ?? 0,
                totalInvoices: c.totalInvoices ?? 0,
                jobStatusCounts: c.jobStatusCounts ?? { open: 0, inProgress: 0, invoiced: 0, closed: 0 },
                lastActivity: c.lastActivity || '',
            }));
            setCustomers(mapped);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to load customers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const handleOpenAdd = () => {
        setEditingCustomer(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const handleOpenEdit = (customer: Customer) => {
        setEditingCustomer(customer);
        setForm({
            name: customer.name || '',
            nameAr: customer.nameAr || '',
            email: customer.email || '',
            phone: customer.phone || '',
            phoneAlt: customer.phoneAlt || '',
            address: customer.address || '',
            city: customer.city || customer.location || '',
            country: customer.country || 'Saudi Arabia',
            vatNumber: customer.vatNumber || '',
            crNumber: customer.crNumber || '',
            contactPerson: customer.contactPerson || '',
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) { toast.error('Customer name is required.'); return; }
        if (!form.email.trim()) { toast.error('Email is required.'); return; }
        if (!isValidEmail(form.email)) { toast.error('Please enter a valid email address.'); return; }
        if (form.phone && !isValidPhone(form.phone)) { toast.error('Please enter a valid phone number (e.g. +966 5X XXX XXXX).'); return; }
        if (form.phoneAlt && !isValidPhone(form.phoneAlt)) { toast.error('Please enter a valid mobile number (e.g. +966 5X XXX XXXX).'); return; }
        try {
            if (editingCustomer) {
                const id = editingCustomer._id || editingCustomer.id;
                await customersApi.update(id, form);
                toast.success('Customer updated successfully');
            } else {
                const code = `CL-${Date.now().toString(36).toUpperCase()}`;
                await customersApi.create({ ...form, code, isActive: true });
                toast.success('Customer created successfully');
            }
            setModalOpen(false);
            setEditingCustomer(null);
            setForm(emptyForm);
            fetchCustomers();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save customer');
        }
    };

    const handleDelete = async (customer: Customer) => {
        if (!window.confirm(`Are you sure you want to delete "${customer.name}"? This action cannot be undone.`)) return;
        try {
            const id = customer._id || customer.id;
            await customersApi.remove(id);
            toast.success('Customer deleted successfully');
            fetchCustomers();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to delete customer');
        }
    };

    const handleExport = () => {
        if (customers.length === 0) {
            toast.error('No customers to export');
            return;
        }
        const headers = ['Name', 'Name (Arabic)', 'Contact Person', 'Email', 'Phone', 'City', 'Country', 'Tax Number', 'CR Number', 'Balance', 'Status'];
        const rows = customers.map(c => [
            c.name,
            c.nameAr || '',
            c.contactPerson,
            c.email,
            c.phone,
            c.city || c.location || '',
            c.country || '',
            c.vatNumber || '',
            c.crNumber || '',
            c.balance,
            c.status,
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `customers_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Customers exported successfully');
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

    const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalBalance = filteredCustomers.reduce((s, c) => s + (c.balance || 0), 0);
    const activeCount = filteredCustomers.filter(c => c.status === 'Active').length;
    const avgRating = customers.length > 0 ? (customers.reduce((s, c) => s + (c.rating || 0), 0) / customers.length).toFixed(1) : '0.0';

    return (
        <div className="space-y-6">
            <PageHeader title="Customers" subtitle="Manage client profiles, balances, and relationship history." onAdd={handleOpenAdd} onExport={handleExport} onImport={handleImport} addLabel="Add Customer" searchValue={searchTerm} onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1); }} />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Users className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">{customers.length}</p><p className="text-xs text-slate-500">Total</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><TrendingUp className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">{activeCount}</p><p className="text-xs text-slate-500">Active</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600"><Building2 className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">SAR {(totalBalance / 1000).toFixed(0)}K</p><p className="text-xs text-slate-500">Outstanding</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600"><Star className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">{avgRating}</p><p className="text-xs text-slate-500">Avg. Rating</p></div>
                </div>
            </div>

            {loading ? (
                <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-12 text-center text-slate-500">Loading customers...</div>
            ) : customers.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-12 text-center text-slate-500">No customers found. Click "Add Customer" to create one.</div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {paginatedCustomers.map((customer) => (
                    <div key={customer._id || customer.id} className="card-interactive p-5 group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20">
                                    {customer.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{customer.name}</h3>
                                    <p className="text-xs text-slate-500">{customer.contactPerson}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className={`h-2 w-2 rounded-full ${customer.status === 'Active' ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                                <span className="text-[10px] font-semibold text-slate-500">{customer.status}</span>
                            </div>
                        </div>

                        <div className="space-y-2.5 text-sm text-slate-600 mb-4">
                            <div className="flex items-center gap-2.5"><Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" /><span className="truncate text-xs">{customer.email}</span></div>
                            <div className="flex items-center gap-2.5"><Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" /><span className="text-xs">{customer.phone}</span></div>
                            <div className="flex items-center gap-2.5"><MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" /><span className="text-xs">{customer.city || customer.location}</span></div>
                        </div>

                        <div className="py-3 border-t border-b border-slate-100/80 mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-lg font-bold text-slate-900">{customer.totalJobs || 0}</p>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Job References</p>
                            </div>
                            {customer.totalJobs > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {customer.jobStatusCounts.open > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">{customer.jobStatusCounts.open} Open</span>}
                                {customer.jobStatusCounts.inProgress > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">{customer.jobStatusCounts.inProgress} In Progress</span>}
                                {customer.jobStatusCounts.invoiced > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700">{customer.jobStatusCounts.invoiced} Invoiced</span>}
                                {customer.jobStatusCounts.closed > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">{customer.jobStatusCounts.closed} Closed</span>}
                            </div>
                            )}
                        </div>

                        <div className="flex justify-between items-center">
                            <div>
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Balance</span>
                                <p className={`text-lg font-bold ${(customer.balance || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>SAR {(customer.balance || 0).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => navigate(`/clients/${customer._id || customer.id}`)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="View"><Eye className="h-4 w-4" /></button>
                                <button onClick={() => handleOpenEdit(customer)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Edit"><Edit2 className="h-4 w-4" /></button>
                                <button onClick={() => handleDelete(customer)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Delete"><Trash2 className="h-4 w-4" /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            )}

            {filteredCustomers.length > 0 && (
                <Pagination currentPage={currentPage} totalPages={Math.ceil(filteredCustomers.length / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={filteredCustomers.length} />
            )}

            <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditingCustomer(null); }} title={editingCustomer ? 'Edit Customer' : 'Add New Customer'} size="lg">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Name (English) *</label>
                            <input type="text" className="input-premium w-full" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Al-Marai Logistics" />
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
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Mobile</label>
                            <input type="text" className="input-premium w-full" value={form.phoneAlt} onChange={e => setForm({ ...form, phoneAlt: e.target.value })} placeholder="+966 5X XXX XXXX" />
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
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">CR Number</label>
                            <input type="text" className="input-premium w-full" value={form.crNumber} onChange={e => setForm({ ...form, crNumber: e.target.value })} placeholder="Commercial Registration #" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onClick={() => { setModalOpen(false); setEditingCustomer(null); }} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary">{editingCustomer ? 'Update Customer' : 'Create Customer'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default CustomerList;
