import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, Save, Send, Printer, FileText, CheckCircle2, Shield, QrCode, AlertTriangle } from 'lucide-react';
import { Invoice, InvoiceItem } from '../../types';
import { invoicesApi, jobReferencesApi } from '../../services/api';

const InvoiceEditor: React.FC = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const jobId = searchParams.get('jobId');

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [invoice, setInvoice] = useState<Partial<Invoice>>({
        invoiceNo: 'DRAFT',
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Draft',
        items: [],
        subtotal: 0,
        vatAmount: 0,
        totalAmount: 0
    });

    useEffect(() => {
        if (id) {
            // Editing existing invoice - load from API
            setLoading(true);
            invoicesApi.getById(id)
                .then(data => {
                    if (data) {
                        setInvoice(data);
                    }
                })
                .catch((error: any) => {
                    toast.error(error?.message || 'Failed to load invoice', {
                        style: { borderRadius: '12px', background: '#ef4444', color: '#fff' },
                    });
                })
                .finally(() => setLoading(false));
        } else if (jobId) {
            // Creating new invoice from a job reference
            setLoading(true);
            jobReferencesApi.getById(jobId)
                .then(job => {
                    if (job) {
                        const newItems: InvoiceItem[] = [
                            { id: '1', description: `Clearance Services for Job ${job.jobNo}`, amount: job.totalServiceFees, isTaxable: true },
                            { id: '2', description: 'Reimbursable Expenses (Customs/Port)', amount: job.totalReimbursable, isTaxable: false }
                        ];
                        setInvoice(prev => ({
                            ...prev,
                            jobId: job.id,
                            items: newItems
                        }));
                    }
                })
                .catch((error: any) => {
                    toast.error(error?.message || 'Failed to load job reference', {
                        style: { borderRadius: '12px', background: '#ef4444', color: '#fff' },
                    });
                })
                .finally(() => setLoading(false));
        }
    }, [jobId, id]);

    useEffect(() => {
        const subtotal = (invoice.items || []).reduce((sum, item) => sum + (item.amount || 0), 0);
        const taxableAmount = (invoice.items || []).reduce((sum, item) => item.isTaxable ? sum + (item.amount || 0) : sum, 0);
        const vat = taxableAmount * 0.15;

        setInvoice(prev => ({
            ...prev,
            subtotal,
            vatAmount: vat,
            totalAmount: subtotal + vat
        }));
    }, [invoice.items]);

    const handleAddItem = () => {
        const newItem: InvoiceItem = {
            id: Date.now().toString(),
            description: '',
            amount: 0,
            isTaxable: true
        };
        setInvoice(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
    };

    const handleUpdateItem = (index: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...(invoice.items || [])];
        newItems[index] = { ...newItems[index], [field]: value };
        setInvoice(prev => ({ ...prev, items: newItems }));
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...(invoice.items || [])];
        newItems.splice(index, 1);
        setInvoice(prev => ({ ...prev, items: newItems }));
    };

    const handleSaveDraft = async () => {
        setSaving(true);
        try {
            const payload = { ...invoice, status: 'Draft' as const };
            if (id) {
                await invoicesApi.update(id, payload);
                toast.success('Invoice draft updated successfully', {
                    style: { borderRadius: '12px', background: '#10b981', color: '#fff' },
                });
            } else {
                await invoicesApi.create(payload);
                toast.success('Invoice draft saved successfully', {
                    style: { borderRadius: '12px', background: '#10b981', color: '#fff' },
                });
            }
            navigate('/invoices');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to save invoice', {
                style: { borderRadius: '12px', background: '#ef4444', color: '#fff' },
            });
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAndSend = async () => {
        setSaving(true);
        try {
            let savedInvoice: any;
            const payload = { ...invoice, status: 'Sent' as const };
            if (id) {
                savedInvoice = await invoicesApi.update(id, payload);
            } else {
                savedInvoice = await invoicesApi.create(payload);
            }

            // Send the invoice after saving
            const savedId = savedInvoice?.id || id;
            if (savedId) {
                await invoicesApi.send(savedId);
            }

            toast.success('Invoice saved and sent successfully', {
                style: { borderRadius: '12px', background: '#10b981', color: '#fff' },
            });
            navigate('/invoices');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to save and send invoice', {
                style: { borderRadius: '12px', background: '#ef4444', color: '#fff' },
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 skeleton rounded-full" />
                <div className="space-y-2"><div className="h-6 w-48 skeleton rounded" /><div className="h-4 w-32 skeleton rounded" /></div>
            </div>
            <div className="h-96 skeleton rounded-2xl" />
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            {id ? 'Edit Invoice' : 'New Invoice'}
                        </h1>
                        <p className="text-slate-500 text-sm">
                            {jobId ? `Linked to Job #${jobId}` : 'Manual Invoice'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleSaveDraft} disabled={saving} className="btn-ghost">
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button onClick={() => navigate(`/invoices/${id || 'new'}/preview`)} className="btn-secondary">
                        <Printer className="h-4 w-4" />
                        Preview PDF
                    </button>
                    <button onClick={handleSaveAndSend} disabled={saving} className="btn-primary">
                        <Send className="h-4 w-4" />
                        {saving ? 'Sending...' : 'Save & Send'}
                    </button>
                </div>
            </div>

            {/* Invoice Card */}
            <div className="card-premium overflow-hidden">
                {/* Top Info */}
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-100">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Bill To (Customer)</label>
                            <input
                                type="text"
                                className="input-premium"
                                placeholder="Search Customer..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Invoice Date</label>
                                <input
                                    type="date"
                                    value={invoice.date}
                                    onChange={e => setInvoice({ ...invoice, date: e.target.value })}
                                    className="input-premium"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Due Date</label>
                                <input
                                    type="date"
                                    value={invoice.dueDate}
                                    onChange={e => setInvoice({ ...invoice, dueDate: e.target.value })}
                                    className="input-premium"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="text-right space-y-3">
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">INVOICE</h2>
                        <p className="text-slate-500 font-mono">#{invoice.invoiceNo}</p>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase tracking-wide">
                            <FileText className="h-3 w-3" />
                            {invoice.status}
                        </div>
                    </div>
                </div>

                {/* Line Items */}
                <div className="p-8">
                    <table className="min-w-full mb-6">
                        <thead>
                            <tr className="border-b-2 border-slate-200">
                                <th className="text-left py-3 text-xs font-bold text-slate-400 uppercase tracking-wider w-[50%]">Item Details</th>
                                <th className="text-right py-3 text-xs font-bold text-slate-400 uppercase tracking-wider w-[20%]">Amount (SAR)</th>
                                <th className="text-center py-3 text-xs font-bold text-slate-400 uppercase tracking-wider w-[20%]">Taxable (15%)</th>
                                <th className="w-[10%]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {invoice.items?.map((item, index) => (
                                <tr key={item.id} className="group">
                                    <td className="py-3">
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                                            className="w-full p-2.5 border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded-xl transition-colors outline-none text-sm"
                                            placeholder="Description"
                                        />
                                    </td>
                                    <td className="py-3">
                                        <input
                                            type="number"
                                            value={item.amount}
                                            onChange={(e) => handleUpdateItem(index, 'amount', parseFloat(e.target.value) || 0)}
                                            className="w-full p-2.5 text-right border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded-xl transition-colors outline-none font-bold text-sm"
                                        />
                                    </td>
                                    <td className="py-3 text-center">
                                        <label className="inline-flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={item.isTaxable}
                                                onChange={(e) => handleUpdateItem(index, 'isTaxable', e.target.checked)}
                                                className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                                            />
                                            <span className="text-xs text-slate-500">{item.isTaxable ? '15%' : '0%'}</span>
                                        </label>
                                    </td>
                                    <td className="py-3 text-right">
                                        <button onClick={() => handleRemoveItem(index)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <button onClick={handleAddItem} className="flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-xl transition-all">
                        <Plus className="h-4 w-4" />
                        Add Line Item
                    </button>
                </div>

                {/* Footer / Totals */}
                <div className="bg-slate-50/80 p-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* ZATCA Compliance Section */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Shield className="h-4 w-4 text-emerald-500" />
                            ZATCA Phase 2 Compliance
                        </h3>
                        <div className="space-y-3 text-xs font-mono text-slate-500 break-all">
                            <div className="p-2.5 bg-slate-50 rounded-lg">
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">UUID</span>
                                {invoice.zatca?.uuid || 'Generating on Finalize...'}
                            </div>
                            <div className="p-2.5 bg-slate-50 rounded-lg">
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Previous Hash</span>
                                {invoice.zatca?.previousHash || 'Pending Chain...'}
                            </div>
                            <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
                                <QrCode className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                <span className="text-slate-400 text-xs">QR Code Generated on Finalize</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <div className="w-72 space-y-3">
                            <div className="flex justify-between text-sm text-slate-600 p-2">
                                <span>Subtotal</span>
                                <span className="font-semibold">SAR {(invoice.subtotal || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-600 p-2 bg-amber-50 rounded-lg">
                                <span className="flex items-center gap-1.5">
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                    VAT (15%)
                                </span>
                                <span className="font-semibold text-amber-700">SAR {(invoice.vatAmount || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xl font-bold text-slate-900 pt-4 border-t-2 border-slate-200">
                                <span className="text-base">Total</span>
                                <span>SAR {(invoice.totalAmount || 0).toLocaleString()}</span>
                            </div>

                            <div className="flex items-center gap-2 pt-2 text-xs text-emerald-600">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span className="font-semibold">ZATCA Phase 2 Ready</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceEditor;
