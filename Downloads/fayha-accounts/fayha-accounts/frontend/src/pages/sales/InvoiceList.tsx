import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import { invoicesApi } from '../../services/api';
import { Invoice } from '../../types';
import { FileText, CheckCircle, Clock, AlertCircle, Eye, Download, Send, Receipt, Trash2 } from 'lucide-react';

const statusConfig: Record<string, { bg: string; text: string; dot: string; icon: any }> = {
    'Draft': { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400', icon: FileText },
    'DRAFT': { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400', icon: FileText },
    'Sent': { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500', icon: Clock },
    'SENT': { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500', icon: Clock },
    'Paid': { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: CheckCircle },
    'PAID': { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: CheckCircle },
    'Overdue': { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500', icon: AlertCircle },
    'OVERDUE': { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500', icon: AlertCircle },
};

const InvoiceList: React.FC = () => {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [activeFilter, setActiveFilter] = useState('All');
    const itemsPerPage = 8;

    const formatDate = (d: any): string => {
        if (!d) return '-';
        try { const date = new Date(d); if (isNaN(date.getTime())) return String(d); return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return String(d); }
    };

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const data = await invoicesApi.getAll();
            setInvoices(Array.isArray(data) ? data : []);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to load invoices', {
                style: { borderRadius: '12px', background: '#ef4444', color: '#fff' },
            });
            setInvoices([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const handleDelete = async (id: string, invoiceNo: string) => {
        if (!window.confirm(`Are you sure you want to delete invoice ${invoiceNo}? This action cannot be undone.`)) {
            return;
        }
        try {
            await invoicesApi.remove(id);
            toast.success('Invoice deleted successfully', {
                style: { borderRadius: '12px', background: '#10b981', color: '#fff' },
            });
            setInvoices(prev => prev.filter(inv => inv.id !== id));
        } catch (error: any) {
            toast.error(error?.message || 'Failed to delete invoice', {
                style: { borderRadius: '12px', background: '#ef4444', color: '#fff' },
            });
        }
    };

    const handleExport = () => {
        if (invoices.length === 0) {
            toast.error('No invoices to export', {
                style: { borderRadius: '12px', background: '#ef4444', color: '#fff' },
            });
            return;
        }

        const headers = ['Invoice No', 'Date', 'Due Date', 'Job ID', 'Status', 'Subtotal', 'VAT Amount', 'Total Amount'];
        const rows = invoices.map(inv => [
            inv.invoiceNo,
            inv.date,
            inv.dueDate,
            inv.jobId,
            inv.status,
            inv.subtotal,
            inv.vatAmount,
            inv.totalAmount,
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(val => `"${val}"`).join(',')),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoices_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success('Invoices exported successfully', {
            style: { borderRadius: '12px', background: '#10b981', color: '#fff' },
        });
    };

    const handleSend = async (id: string) => {
        try {
            await invoicesApi.send(id);
            toast.success('Invoice sent successfully', {
                style: { borderRadius: '12px', background: '#10b981', color: '#fff' },
            });
            fetchInvoices();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to send invoice', {
                style: { borderRadius: '12px', background: '#ef4444', color: '#fff' },
            });
        }
    };

    const filters = ['All', 'Draft', 'Sent', 'Paid', 'Overdue'];
    const filteredInvoices = activeFilter === 'All' ? invoices : invoices.filter(i => i.status?.toUpperCase() === activeFilter.toUpperCase());
    const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const totalAmount = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
    const paidAmount = invoices.filter(i => i.status?.toUpperCase() === 'PAID').reduce((s, i) => s + (i.totalAmount || 0), 0);
    const overdueAmount = invoices.filter(i => i.status?.toUpperCase() === 'OVERDUE').reduce((s, i) => s + (i.totalAmount || 0), 0);
    const pendingAmount = invoices.filter(i => i.status?.toUpperCase() === 'SENT').reduce((s, i) => s + (i.totalAmount || 0), 0);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Invoices"
                subtitle="Manage customer billing, collections, and ZATCA compliance."
                onAdd={() => navigate('/sales-invoice/new')}
                onExport={handleExport}
                onImport={() => toast('Import feature coming soon', {
                    style: { borderRadius: '12px', background: '#3b82f6', color: '#fff' },
                })}
                addLabel="New Invoice"
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600"><Receipt className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">SAR {(totalAmount / 1000).toFixed(0)}K</p><p className="text-xs text-slate-500">Total Invoiced</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><CheckCircle className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">SAR {(paidAmount / 1000).toFixed(0)}K</p><p className="text-xs text-slate-500">Collected</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Clock className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">SAR {(pendingAmount / 1000).toFixed(0)}K</p><p className="text-xs text-slate-500">Pending</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600"><AlertCircle className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">SAR {(overdueAmount / 1000).toFixed(0)}K</p><p className="text-xs text-slate-500">Overdue</p></div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {filters.map((f) => (
                    <button key={f} onClick={() => { setActiveFilter(f); setCurrentPage(1); }}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${activeFilter === f ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        {f}{f !== 'All' && <span className="ml-1.5 opacity-60">{invoices.filter(i => i.status?.toUpperCase() === f.toUpperCase()).length}</span>}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
                {loading ? (
                    <div className="p-8 space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="h-10 w-10 skeleton rounded-xl" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-48 skeleton rounded" />
                                    <div className="h-3 w-32 skeleton rounded" />
                                </div>
                                <div className="h-8 w-20 skeleton rounded-full" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th>Invoice #</th>
                                    <th>Date</th>
                                    <th>Due Date</th>
                                    <th>Job Ref</th>
                                    <th className="text-center">Status</th>
                                    <th className="text-right">Amount</th>
                                    <th className="text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedInvoices.map((inv) => {
                                    const config = statusConfig[inv.status] || statusConfig['Draft'];
                                    const StatusIcon = config.icon;
                                    return (
                                        <tr key={inv.id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                        <FileText className="h-4 w-4" />
                                                    </div>
                                                    <span className="font-bold text-slate-900 font-mono">{inv.invoiceNo}</span>
                                                </div>
                                            </td>
                                            <td><span className="text-sm text-slate-600">{formatDate(inv.date)}</span></td>
                                            <td><span className="text-sm text-slate-600">{formatDate(inv.dueDate)}</span></td>
                                            <td><span className="text-xs font-mono text-slate-500">JOB-{inv.jobId}</span></td>
                                            <td className="text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text}`}>
                                                    <StatusIcon className="h-3 w-3" />
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <div>
                                                    <span className="font-bold text-slate-900">SAR {(inv.totalAmount || 0).toLocaleString()}</span>
                                                    <p className="text-[10px] text-slate-400">VAT: SAR {(inv.vatAmount || 0).toLocaleString()}</p>
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Link to={`/invoices/${inv.id}/preview`} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"><Eye className="h-4 w-4" /></Link>
                                                    <button onClick={() => handleExport()} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Download className="h-4 w-4" /></button>
                                                    {inv.status?.toUpperCase() === 'DRAFT' && (
                                                        <button onClick={() => handleSend(inv.id)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Send className="h-4 w-4" /></button>
                                                    )}
                                                    <button onClick={() => handleDelete(inv.id, inv.invoiceNo)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 className="h-4 w-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {filteredInvoices.length === 0 && (
                            <div className="text-center py-16">
                                <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-slate-900 mb-1">No invoices found</h3>
                                <p className="text-sm text-slate-500">Try adjusting your filter criteria.</p>
                            </div>
                        )}

                        <Pagination
                            currentPage={currentPage}
                            totalPages={Math.ceil(filteredInvoices.length / itemsPerPage)}
                            onPageChange={setCurrentPage}
                            itemsPerPage={itemsPerPage}
                            totalItems={filteredInvoices.length}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default InvoiceList;
