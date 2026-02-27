import React, { useState, useEffect } from 'react';
import {
    Building2, Users, Shield, Globe, Bell, Palette, Database,
    Save, Mail, Phone, MapPin, FileText, Eye, Edit2,
    Plus, Trash2, Crown, Clock, Loader2, CheckCircle2,
    Landmark, X, Check
} from 'lucide-react';
import { settingsApi, banksApi, zatcaApi } from '../../services/api';

interface CompanyProfile {
    name: string;
    nameAr: string;
    crNumber: string;
    vatNumber: string;
    address: string;
    city: string;
    country: string;
    phone: string;
    email: string;
    website: string;
}

interface UserRecord {
    id: string;
    name: string;
    email: string;
    role: 'Admin' | 'Accountant' | 'Manager' | 'Viewer';
    status: 'Active' | 'Inactive';
    lastLogin: string;
}

const users: UserRecord[] = [];

const roleConfig: Record<string, { bg: string; text: string; icon: any }> = {
    'Admin': { bg: 'bg-rose-50', text: 'text-rose-700', icon: Crown },
    'Manager': { bg: 'bg-blue-50', text: 'text-blue-700', icon: Shield },
    'Accountant': { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: FileText },
    'Viewer': { bg: 'bg-slate-50', text: 'text-slate-600', icon: Eye },
};

const SETTINGS_KEYS: Record<keyof CompanyProfile, string> = {
    name: 'COMPANY_NAME',
    nameAr: 'COMPANY_NAME_AR',
    crNumber: 'COMPANY_CR_NUMBER',
    vatNumber: 'COMPANY_VAT_NUMBER',
    address: 'COMPANY_ADDRESS',
    city: 'COMPANY_CITY',
    country: 'COMPANY_COUNTRY',
    phone: 'COMPANY_PHONE',
    email: 'COMPANY_EMAIL',
    website: 'COMPANY_WEBSITE',
};

const DEFAULT_COMPANY: CompanyProfile = {
    name: 'Fayha Arabia Logistics',
    nameAr: 'فيحـــا أرابيـــــا اللوجستية',
    crNumber: '7016417409',
    vatNumber: '311467026900003',
    address: 'Building number: 8298, Prince Mohammed bin Abdulrahman bin Abdulaziz Street, Al Mashael District, Riyadh, Kingdom of Saudi Arabia',
    city: 'Riyadh',
    country: 'Saudi Arabia',
    phone: '050 057 1423',
    email: 'info@fayha.sa',
    website: 'www.fayha.sa',
};

const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState('company');
    const [company, setCompany] = useState<CompanyProfile>(DEFAULT_COMPANY);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Bank details state
    const [banks, setBanks] = useState<any[]>([]);
    const [showBankModal, setShowBankModal] = useState(false);
    const [editBankId, setEditBankId] = useState<string | null>(null);
    const [bankForm, setBankForm] = useState({ code: '', bankName: '', bankNameAr: '', accountNumber: '', ibanNumber: '', swiftCode: '', branchName: '', branchCode: '', openingBalance: 0, color: '#003366', isActive: true, isDefault: false });
    const [savingBank, setSavingBank] = useState(false);

    // ZATCA onboarding state
    const [zatcaStatus, setZatcaStatus] = useState<any>(null);
    const [zatcaLoading, setZatcaLoading] = useState(false);
    const [zatcaOtp, setZatcaOtp] = useState('123345');
    const [zatcaMessage, setZatcaMessage] = useState('');

    const loadZatcaStatus = async () => {
        try {
            const data = await zatcaApi.getStatus();
            setZatcaStatus(data);
        } catch { setZatcaStatus(null); }
    };

    const handleZatcaAction = async (action: () => Promise<any>, successMsg: string) => {
        try {
            setZatcaLoading(true);
            setZatcaMessage('');
            const result = await action();
            setZatcaMessage(result?.message || successMsg);
            await loadZatcaStatus();
        } catch (err: any) {
            setZatcaMessage(`Error: ${err.message || 'Operation failed'}`);
        } finally {
            setZatcaLoading(false);
        }
    };

    const BANK_COLORS = ['#003366', '#0369a1', '#059669', '#7c3aed', '#dc2626', '#ea580c', '#0891b2', '#4f46e5'];

    const loadBanks = async () => {
        try {
            const data = await banksApi.getAll();
            setBanks(Array.isArray(data) ? data : []);
        } catch { setBanks([]); }
    };

    const openAddBank = () => {
        setEditBankId(null);
        setBankForm({ code: `BNK-${Date.now().toString(36).toUpperCase()}`, bankName: '', bankNameAr: '', accountNumber: '', ibanNumber: '', swiftCode: '', branchName: '', branchCode: '', openingBalance: 0, color: '#003366', isActive: true, isDefault: false });
        setShowBankModal(true);
    };

    const openEditBank = (bank: any) => {
        setEditBankId(bank.id);
        setBankForm({ code: bank.code || '', bankName: bank.bankName || '', bankNameAr: bank.bankNameAr || '', accountNumber: bank.accountNumber || '', ibanNumber: bank.ibanNumber || '', swiftCode: bank.swiftCode || '', branchName: bank.branchName || '', branchCode: bank.branchCode || '', openingBalance: bank.openingBalance || 0, color: bank.color || '#003366', isActive: bank.isActive !== false, isDefault: bank.isDefault || false });
        setShowBankModal(true);
    };

    const handleSaveBank = async () => {
        if (!bankForm.bankName || !bankForm.accountNumber) return;
        try {
            setSavingBank(true);
            if (editBankId) {
                await banksApi.update(editBankId, bankForm);
            } else {
                await banksApi.create(bankForm);
            }
            setShowBankModal(false);
            loadBanks();
        } catch (err: any) {
            alert(err.message || 'Failed to save bank');
        } finally { setSavingBank(false); }
    };

    const handleDeleteBank = async (id: string) => {
        if (!confirm('Delete this bank account?')) return;
        try {
            await banksApi.remove(id);
            loadBanks();
        } catch (err: any) {
            alert(err.message || 'Failed to delete');
        }
    };

    // Load settings from backend
    useEffect(() => {
        loadSettings();
        loadBanks();
        loadZatcaStatus();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const result = await settingsApi.getAll();
            // Backend returns { settings: [...], map: {...} } inside data envelope
            const map = result?.map || {};

            setCompany({
                name: map['COMPANY_NAME'] || DEFAULT_COMPANY.name,
                nameAr: map['COMPANY_NAME_AR'] || DEFAULT_COMPANY.nameAr,
                crNumber: map['COMPANY_CR_NUMBER'] || DEFAULT_COMPANY.crNumber,
                vatNumber: map['COMPANY_VAT_NUMBER'] || DEFAULT_COMPANY.vatNumber,
                address: map['COMPANY_ADDRESS'] || DEFAULT_COMPANY.address,
                city: map['COMPANY_CITY'] || DEFAULT_COMPANY.city,
                country: map['COMPANY_COUNTRY'] || DEFAULT_COMPANY.country,
                phone: map['COMPANY_PHONE'] || DEFAULT_COMPANY.phone,
                email: map['COMPANY_EMAIL'] || DEFAULT_COMPANY.email,
                website: map['COMPANY_WEBSITE'] || DEFAULT_COMPANY.website,
            });
        } catch (err) {
            console.error('Failed to load settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const settings: Record<string, string> = {};
            for (const [field, key] of Object.entries(SETTINGS_KEYS)) {
                settings[key] = company[field as keyof CompanyProfile];
            }
            await settingsApi.bulkUpdate(settings);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('Failed to save settings:', err);
            alert('Failed to save settings. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { key: 'company', label: 'Company Profile', icon: Building2 },
        { key: 'users', label: 'Users & Roles', icon: Users },
        { key: 'preferences', label: 'Preferences', icon: Palette },
        { key: 'integrations', label: 'Integrations', icon: Database },
        { key: 'zatca', label: 'ZATCA', icon: Shield },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
                <p className="text-slate-500 mt-1 text-sm">Manage your company profile, users, preferences, and system integrations.</p>
            </div>

            <div className="flex gap-6">
                {/* Sidebar Tabs */}
                <div className="w-56 flex-shrink-0">
                    <div className="card-premium p-2 space-y-1">
                        {tabs.map((tab) => {
                            const TabIcon = tab.icon;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.key
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                >
                                    <TabIcon className="h-4 w-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {activeTab === 'company' && (
                        <div className="card-premium p-6 space-y-6">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Company Profile</h2>
                                    <p className="text-sm text-slate-500 mt-0.5">This information appears on invoices and official documents.</p>
                                </div>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || loading}
                                    className="btn-primary disabled:opacity-50"
                                >
                                    {saving ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                                    ) : saved ? (
                                        <><CheckCircle2 className="h-4 w-4" /> Saved!</>
                                    ) : (
                                        <><Save className="h-4 w-4" /> Save Changes</>
                                    )}
                                </button>
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Company Name (English)</label>
                                            <input type="text" value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} className="input-premium" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Company Name (Arabic)</label>
                                            <input type="text" value={company.nameAr} onChange={e => setCompany({ ...company, nameAr: e.target.value })} className="input-premium text-right" dir="rtl" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">CR Number</label>
                                            <input type="text" value={company.crNumber} onChange={e => setCompany({ ...company, crNumber: e.target.value })} className="input-premium font-mono" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">VAT Number</label>
                                            <input type="text" value={company.vatNumber} onChange={e => setCompany({ ...company, vatNumber: e.target.value })} className="input-premium font-mono" />
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100">
                                        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" /> Address</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                            <div className="md:col-span-3">
                                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Street Address</label>
                                                <input type="text" value={company.address} onChange={e => setCompany({ ...company, address: e.target.value })} className="input-premium" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">City</label>
                                                <input type="text" value={company.city} onChange={e => setCompany({ ...company, city: e.target.value })} className="input-premium" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Country</label>
                                                <input type="text" value={company.country} onChange={e => setCompany({ ...company, country: e.target.value })} className="input-premium" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100">
                                        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /> Contact</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Phone</label>
                                                <input type="text" value={company.phone} onChange={e => setCompany({ ...company, phone: e.target.value })} className="input-premium" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email</label>
                                                <input type="text" value={company.email} onChange={e => setCompany({ ...company, email: e.target.value })} className="input-premium" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Website</label>
                                                <input type="text" value={company.website} onChange={e => setCompany({ ...company, website: e.target.value })} className="input-premium" />
                                            </div>
                                        </div>
                                    </div>
                                    {/* Bank Details Section */}
                                    <div className="pt-4 border-t border-slate-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Landmark className="h-4 w-4 text-slate-400" /> Bank Details</h3>
                                            <button onClick={openAddBank} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all border border-emerald-200">
                                                <Plus className="h-3 w-3" /> Add Bank
                                            </button>
                                        </div>
                                        {banks.length === 0 ? (
                                            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                                                <Landmark className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                                <p className="text-sm text-slate-500">No bank accounts added yet.</p>
                                                <p className="text-xs text-slate-400 mt-1">Add your bank details to show them on invoices.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {banks.map((bank: any) => (
                                                    <div key={bank.id} className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                        <div className="flex items-start gap-3">
                                                            <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ backgroundColor: bank.color || '#003366' }}>
                                                                {(bank.bankName || '').substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                <p className="text-sm font-bold text-slate-900">{bank.bankName}</p>
                                                                {bank.bankNameAr && <p className="text-xs text-slate-500" dir="rtl">{bank.bankNameAr}</p>}
                                                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-600">
                                                                    <span>A/C: <span className="font-mono font-semibold">{bank.accountNumber}</span></span>
                                                                    {bank.ibanNumber && <span>IBAN: <span className="font-mono font-semibold">{bank.ibanNumber}</span></span>}
                                                                    {bank.swiftCode && <span>SWIFT: <span className="font-mono font-semibold">{bank.swiftCode}</span></span>}
                                                                    {bank.branchName && <span>Branch: {bank.branchName}</span>}
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    {bank.isDefault && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">DEFAULT</span>}
                                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${bank.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                                        {bank.isActive ? 'ACTIVE' : 'INACTIVE'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1 flex-shrink-0">
                                                            <button onClick={() => openEditBank(bank)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button onClick={() => handleDeleteBank(bank.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Bank Add/Edit Modal */}
                    {showBankModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                            <div className="bg-white rounded-2xl shadow-elevated w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                    <h2 className="text-lg font-bold text-slate-900">{editBankId ? 'Edit Bank Account' : 'Add Bank Account'}</h2>
                                    <button onClick={() => setShowBankModal(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="h-4 w-4" /></button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Code</label>
                                            <input className="input-premium w-full font-mono" value={bankForm.code} onChange={e => setBankForm({ ...bankForm, code: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Color</label>
                                            <div className="flex gap-1.5 flex-wrap">
                                                {BANK_COLORS.map(c => (
                                                    <button key={c} onClick={() => setBankForm({ ...bankForm, color: c })} className={`h-7 w-7 rounded-lg border-2 transition-all ${bankForm.color === c ? 'border-slate-900 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Bank Name (EN) <span className="text-rose-500">*</span></label>
                                            <input className="input-premium w-full" value={bankForm.bankName} onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })} placeholder="e.g. Al Rajhi Bank" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Bank Name (AR)</label>
                                            <input className="input-premium w-full text-right" dir="rtl" value={bankForm.bankNameAr} onChange={e => setBankForm({ ...bankForm, bankNameAr: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Account Number <span className="text-rose-500">*</span></label>
                                            <input className="input-premium w-full font-mono" value={bankForm.accountNumber} onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">IBAN</label>
                                            <input className="input-premium w-full font-mono" placeholder="SA..." value={bankForm.ibanNumber} onChange={e => setBankForm({ ...bankForm, ibanNumber: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">SWIFT Code</label>
                                            <input className="input-premium w-full font-mono" value={bankForm.swiftCode} onChange={e => setBankForm({ ...bankForm, swiftCode: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Opening Balance</label>
                                            <input className="input-premium w-full" type="number" step="0.01" value={bankForm.openingBalance} onChange={e => setBankForm({ ...bankForm, openingBalance: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Branch Name</label>
                                            <input className="input-premium w-full" value={bankForm.branchName} onChange={e => setBankForm({ ...bankForm, branchName: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Branch Code</label>
                                            <input className="input-premium w-full" value={bankForm.branchCode} onChange={e => setBankForm({ ...bankForm, branchCode: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={bankForm.isActive} onChange={e => setBankForm({ ...bankForm, isActive: e.target.checked })} className="rounded" />
                                            <span className="text-sm text-slate-700">Active</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={bankForm.isDefault} onChange={e => setBankForm({ ...bankForm, isDefault: e.target.checked })} className="rounded" />
                                            <span className="text-sm text-slate-700">Default Account</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                                    <button onClick={() => setShowBankModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">Cancel</button>
                                    <button onClick={handleSaveBank} disabled={savingBank} className="btn-primary">
                                        {savingBank ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                        {editBankId ? 'Update' : 'Create'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="card-premium overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Users & Roles</h2>
                                    <p className="text-sm text-slate-500 mt-0.5">Manage team members and their access levels.</p>
                                </div>
                                <button className="btn-primary"><Plus className="h-4 w-4" /> Add User</button>
                            </div>

                            <table className="table-premium">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th>Last Login</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => {
                                        const role = roleConfig[user.role] || roleConfig['Viewer'];
                                        const RoleIcon = role.icon;
                                        return (
                                            <tr key={user.id}>
                                                <td>
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                                            {user.name.split(' ').map(w => w[0]).join('')}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-900 text-sm">{user.name}</p>
                                                            <p className="text-xs text-slate-500">{user.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${role.bg} ${role.text}`}>
                                                        <RoleIcon className="h-3 w-3" />
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${user.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                        {user.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="text-sm text-slate-500 flex items-center gap-1.5">
                                                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                                                        {user.lastLogin}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 className="h-4 w-4" /></button>
                                                        <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 className="h-4 w-4" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'preferences' && (
                        <div className="card-premium p-6 space-y-6">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Preferences</h2>
                                    <p className="text-sm text-slate-500 mt-0.5">Customize system behavior and appearance.</p>
                                </div>
                                <button className="btn-primary"><Save className="h-4 w-4" /> Save</button>
                            </div>

                            <div className="space-y-4">
                                {[
                                    { label: 'Default Currency', value: 'SAR - Saudi Riyal', icon: Globe },
                                    { label: 'VAT Rate', value: '15%', icon: FileText },
                                    { label: 'Fiscal Year Start', value: 'January 1', icon: Clock },
                                    { label: 'Invoice Prefix', value: 'INV-', icon: FileText },
                                    { label: 'Job Number Prefix', value: 'JOB-', icon: FileText },
                                ].map((pref, i) => {
                                    const PrefIcon = pref.icon;
                                    return (
                                        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <PrefIcon className="h-4 w-4 text-slate-400" />
                                                <span className="text-sm font-semibold text-slate-700">{pref.label}</span>
                                            </div>
                                            <span className="text-sm font-bold text-slate-900">{pref.value}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><Bell className="h-4 w-4 text-slate-400" /> Notifications</h3>
                                <div className="space-y-3">
                                    {[
                                        { label: 'Email notifications for new payments', enabled: true },
                                        { label: 'Alert when bills are overdue', enabled: true },
                                        { label: 'Weekly financial summary', enabled: false },
                                        { label: 'Job status change notifications', enabled: true },
                                    ].map((notif, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors">
                                            <span className="text-sm text-slate-700">{notif.label}</span>
                                            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notif.enabled ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                                                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm ${notif.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'integrations' && (
                        <div className="card-premium p-6 space-y-6">
                            <div className="pb-4 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-900">Integrations</h2>
                                <p className="text-sm text-slate-500 mt-0.5">Connect with external services and APIs.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {[
                                    { name: 'ZATCA E-Invoice', desc: 'Saudi tax authority integration for Phase 2 compliance', status: 'Connected', icon: Shield, color: 'emerald' },
                                    { name: 'Bank API', desc: 'Automated bank reconciliation and payment tracking', status: 'Not Connected', icon: Database, color: 'slate' },
                                    { name: 'SMS Gateway', desc: 'Send invoice and payment notifications via SMS', status: 'Connected', icon: Mail, color: 'blue' },
                                    { name: 'Backup Storage', desc: 'Automated cloud backup for all financial data', status: 'Connected', icon: Database, color: 'purple' },
                                ].map((integration, i) => {
                                    const IntIcon = integration.icon;
                                    const isConnected = integration.status === 'Connected';
                                    return (
                                        <div key={i} className="p-5 border border-slate-100 rounded-xl hover:border-emerald-200 hover:shadow-sm transition-all">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className={`h-10 w-10 rounded-xl bg-${integration.color}-50 flex items-center justify-center text-${integration.color}-600`}>
                                                    <IntIcon className="h-5 w-5" />
                                                </div>
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${isConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                    {integration.status}
                                                </span>
                                            </div>
                                            <h4 className="font-bold text-slate-900 text-sm">{integration.name}</h4>
                                            <p className="text-xs text-slate-500 mt-1">{integration.desc}</p>
                                            <button className={`mt-4 text-xs font-semibold ${isConnected ? 'text-slate-500 hover:text-slate-700' : 'text-emerald-600 hover:text-emerald-700'}`}>
                                                {isConnected ? 'Configure' : 'Connect'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'zatca' && (
                        <div className="card-premium p-6 space-y-6">
                            <div className="pb-4 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-900">ZATCA E-Invoicing Onboarding</h2>
                                <p className="text-sm text-slate-500 mt-0.5">Configure ZATCA Phase 2 sandbox integration. Complete all 4 steps to enable real invoice reporting.</p>
                            </div>

                            {zatcaMessage && (
                                <div className={`p-3 rounded-lg text-sm ${zatcaMessage.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                    {zatcaMessage}
                                </div>
                            )}

                            <div className="space-y-4">
                                {/* Step 1: Generate CSR */}
                                <div className={`p-5 border rounded-xl transition-all ${(zatcaStatus?.step || 0) >= 1 ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${(zatcaStatus?.step || 0) >= 1 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                {(zatcaStatus?.step || 0) >= 1 ? <Check className="h-4 w-4" /> : '1'}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-900 text-sm">Generate CSR</h4>
                                                <p className="text-xs text-slate-500">Generate Certificate Signing Request and keypair</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleZatcaAction(() => zatcaApi.generateCsr(), 'CSR generated successfully')}
                                            disabled={zatcaLoading}
                                            className="btn-primary text-xs disabled:opacity-50"
                                        >
                                            {zatcaLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Generate CSR'}
                                        </button>
                                    </div>
                                </div>

                                {/* Step 2: Get Compliance CSID */}
                                <div className={`p-5 border rounded-xl transition-all ${(zatcaStatus?.step || 0) >= 2 ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${(zatcaStatus?.step || 0) >= 2 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                {(zatcaStatus?.step || 0) >= 2 ? <Check className="h-4 w-4" /> : '2'}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-900 text-sm">Get Compliance CSID</h4>
                                                <p className="text-xs text-slate-500">Enter OTP from ZATCA portal (use 123345 for sandbox)</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={zatcaOtp}
                                                onChange={(e) => setZatcaOtp(e.target.value)}
                                                placeholder="OTP"
                                                className="input-field w-28 text-xs"
                                                disabled={(zatcaStatus?.step || 0) < 1}
                                            />
                                            <button
                                                onClick={() => handleZatcaAction(() => zatcaApi.getComplianceCsid(zatcaOtp), 'Compliance CSID obtained')}
                                                disabled={zatcaLoading || (zatcaStatus?.step || 0) < 1}
                                                className="btn-primary text-xs disabled:opacity-50"
                                            >
                                                {zatcaLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Get CSID'}
                                            </button>
                                        </div>
                                    </div>
                                    {zatcaStatus?.complianceCsid && (
                                        <p className="text-xs text-slate-400 mt-2 font-mono">CSID: {zatcaStatus.complianceCsid}</p>
                                    )}
                                </div>

                                {/* Step 3: Compliance Check */}
                                <div className={`p-5 border rounded-xl transition-all ${(zatcaStatus?.step || 0) >= 3 ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${(zatcaStatus?.step || 0) >= 3 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                {(zatcaStatus?.step || 0) >= 3 ? <Check className="h-4 w-4" /> : '3'}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-900 text-sm">Run Compliance Check</h4>
                                                <p className="text-xs text-slate-500">Submit test invoices (standard + simplified) for validation</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleZatcaAction(() => zatcaApi.complianceCheck(), 'Compliance check passed')}
                                            disabled={zatcaLoading || (zatcaStatus?.step || 0) < 2}
                                            className="btn-primary text-xs disabled:opacity-50"
                                        >
                                            {zatcaLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Run Check'}
                                        </button>
                                    </div>
                                </div>

                                {/* Step 4: Get Production CSID */}
                                <div className={`p-5 border rounded-xl transition-all ${(zatcaStatus?.step || 0) >= 4 ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${(zatcaStatus?.step || 0) >= 4 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                {(zatcaStatus?.step || 0) >= 4 ? <Check className="h-4 w-4" /> : '4'}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-900 text-sm">Get Production CSID</h4>
                                                <p className="text-xs text-slate-500">Exchange compliance CSID for production credentials</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleZatcaAction(() => zatcaApi.getProductionCsid(), 'Production CSID obtained - onboarding complete!')}
                                            disabled={zatcaLoading || (zatcaStatus?.step || 0) < 3}
                                            className="btn-primary text-xs disabled:opacity-50"
                                        >
                                            {zatcaLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Get Production CSID'}
                                        </button>
                                    </div>
                                    {zatcaStatus?.productionCsid && (
                                        <p className="text-xs text-slate-400 mt-2 font-mono">PCSID: {zatcaStatus.productionCsid}</p>
                                    )}
                                </div>
                            </div>

                            {/* Status summary */}
                            <div className="mt-6 p-4 bg-slate-50 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield className="h-4 w-4 text-slate-600" />
                                    <h4 className="font-semibold text-slate-900 text-sm">Status</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div><span className="text-slate-500">Environment:</span> <span className="font-medium">Sandbox (Simulation)</span></div>
                                    <div><span className="text-slate-500">Current Step:</span> <span className="font-medium">{zatcaStatus?.step || 0} / 4</span></div>
                                    <div><span className="text-slate-500">Onboarded:</span> <span className={`font-medium ${zatcaStatus?.isOnboarded ? 'text-emerald-600' : 'text-amber-600'}`}>{zatcaStatus?.isOnboarded ? 'Yes' : 'No'}</span></div>
                                    <div><span className="text-slate-500">API URL:</span> <span className="font-medium font-mono text-[10px]">gw-fatoora.zatca.gov.sa/simulation</span></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
