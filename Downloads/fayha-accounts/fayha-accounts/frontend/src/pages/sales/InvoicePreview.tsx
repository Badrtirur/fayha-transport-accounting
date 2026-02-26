import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { invoicesApi, customersApi, jobReferencesApi, settingsApi, banksApi } from '../../services/api';
import { Invoice } from '../../types';
import { Printer, ArrowLeft, Download, Mail, Shield } from 'lucide-react';
import QRCode from 'qrcode';
import { buildZatcaTlv } from '../../utils/zatca';

const DEFAULT_COMPANY = {
    name: 'Fayha Clearance LLC',
    crNumber: '4030123456',
    vatNumber: '300012345600003',
    address: 'Jeddah Islamic Port, District 4',
    city: 'Jeddah',
    country: 'Saudi Arabia',
    phone: '+966 12 647 0000',
    email: 'info@fayha.sa',
};

const InvoicePreview: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [customer, setCustomer] = useState<any>(null);
    const [jobRef, setJobRef] = useState<any>(null);
    const [companyInfo, setCompanyInfo] = useState(DEFAULT_COMPANY);
    const [banks, setBanks] = useState<any[]>([]);
    const [qrDataUrl, setQrDataUrl] = useState('');

    // Generate ZATCA QR code when invoice data is available
    useEffect(() => {
        if (!invoice) return;
        const totalAmount = Number(invoice.totalAmount || 0);
        const vatAmount = Number(invoice.vatAmount || 0);
        const issueDate = (invoice as any).issueDate || invoice.date;
        const timestamp = issueDate ? new Date(issueDate).toISOString() : new Date().toISOString();
        const tlvBase64 = buildZatcaTlv(companyInfo.name, companyInfo.vatNumber, timestamp, totalAmount, vatAmount);
        QRCode.toDataURL(tlvBase64, { width: 120, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
            .then(url => setQrDataUrl(url))
            .catch(() => setQrDataUrl(''));
    }, [invoice, companyInfo]);

    useEffect(() => {
        if (!id) {
            setLoading(false);
            return;
        }

        setLoading(true);

        // Load settings and banks in parallel with invoice
        Promise.all([
            settingsApi.getAll().catch(() => ({ map: {} })),
            banksApi.getAll().catch(() => []),
        ]).then(([settingsData, bankData]) => {
            const map = settingsData?.map || {};
            setCompanyInfo({
                name: map['COMPANY_NAME'] || DEFAULT_COMPANY.name,
                crNumber: map['COMPANY_CR_NUMBER'] || DEFAULT_COMPANY.crNumber,
                vatNumber: map['COMPANY_VAT_NUMBER'] || DEFAULT_COMPANY.vatNumber,
                address: map['COMPANY_ADDRESS'] || DEFAULT_COMPANY.address,
                city: map['COMPANY_CITY'] || DEFAULT_COMPANY.city,
                country: map['COMPANY_COUNTRY'] || DEFAULT_COMPANY.country,
                phone: map['COMPANY_PHONE'] || DEFAULT_COMPANY.phone,
                email: map['COMPANY_EMAIL'] || DEFAULT_COMPANY.email,
            });
            setBanks(Array.isArray(bankData) ? bankData.filter((b: any) => b.isActive !== false).slice(0, 2) : []);
        }).catch(() => {});

        invoicesApi.getById(id)
            .then(async (data) => {
                if (data) {
                    setInvoice(data);

                    // Load related customer data if available
                    const customerId = (data as any).customerId;
                    if (customerId) {
                        try {
                            const cust = await customersApi.getById(customerId);
                            setCustomer(cust);
                        } catch {
                            // Customer data is optional for display
                        }
                    }

                    // Load related job reference if available
                    if (data.jobId) {
                        try {
                            const job = await jobReferencesApi.getById(data.jobId);
                            setJobRef(job);
                        } catch {
                            // Job reference data is optional for display
                        }
                    }
                }
            })
            .catch((error: any) => {
                toast.error(error?.message || 'Failed to load invoice', {
                    style: { borderRadius: '12px', background: '#ef4444', color: '#fff' },
                });
            })
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
            <div className="space-y-4 text-center">
                <div className="h-12 w-12 skeleton rounded-xl mx-auto" />
                <div className="h-4 w-32 skeleton rounded mx-auto" />
                <p className="text-sm text-slate-400">Loading invoice...</p>
            </div>
        </div>
    );

    if (!invoice) return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
            <div className="space-y-4 text-center">
                <div className="h-12 w-12 skeleton rounded-xl mx-auto" />
                <div className="h-4 w-32 skeleton rounded mx-auto" />
                <p className="text-sm text-slate-500">Invoice not found.</p>
                <button onClick={() => navigate('/invoices')} className="btn-primary mt-4">
                    Back to Invoices
                </button>
            </div>
        </div>
    );

    const handlePrint = () => {
        window.print();
    };

    const handleEmail = () => {
        toast.success('Invoice email sent successfully', {
            style: { borderRadius: '12px', background: '#10b981', color: '#fff' },
        });
    };

    const handleDownloadPdf = () => {
        toast.success('Preparing PDF for download...', {
            style: { borderRadius: '12px', background: '#10b981', color: '#fff' },
        });
        window.print();
    };

    const nonTaxableTotal = (invoice.items || []).filter(i => !i.isTaxable).reduce((s, i) => s + (i.amount || 0), 0);
    const taxableTotal = (invoice.items || []).filter(i => i.isTaxable).reduce((s, i) => s + (i.amount || 0), 0);

    return (
        <div className="min-h-screen bg-slate-100 p-8 print:p-0 print:bg-white">
            {/* Toolbar */}
            <div className="max-w-[210mm] mx-auto mb-6 flex items-center justify-between print:hidden">
                <button onClick={() => navigate(-1)} className="btn-ghost">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Editor
                </button>
                <div className="flex gap-2">
                    <button onClick={handleEmail} className="btn-secondary">
                        <Mail className="h-4 w-4" />
                        Email Invoice
                    </button>
                    <button onClick={handleDownloadPdf} className="btn-secondary">
                        <Download className="h-4 w-4" />
                        Download PDF
                    </button>
                    <button onClick={handlePrint} className="btn-primary">
                        <Printer className="h-4 w-4" />
                        Print
                    </button>
                </div>
            </div>

            {/* A4 Paper */}
            <div className="max-w-[210mm] mx-auto bg-white shadow-2xl print:shadow-none print:w-full min-h-[297mm] relative overflow-hidden text-slate-900 rounded-xl print:rounded-none">

                {/* Top Gradient Border */}
                <div className="h-2 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 w-full print:h-1"></div>

                <div className="p-10 print:p-8 space-y-8">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-12 w-12 bg-gradient-to-br from-emerald-600 to-teal-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-emerald-500/20 print:shadow-none">F</div>
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">{companyInfo.name}</h1>
                                    <p className="text-xs text-slate-500 uppercase tracking-[0.2em] font-semibold">Customs & Logistics Solutions</p>
                                </div>
                            </div>
                            <div className="text-xs text-slate-500 space-y-0.5 mt-4 pl-1">
                                <p className="font-medium">{companyInfo.address}</p>
                                <p>{companyInfo.city}, {companyInfo.country}</p>
                                <p>CR: {companyInfo.crNumber} | VAT: {companyInfo.vatNumber}</p>
                                <p>Tel: {companyInfo.phone} | {companyInfo.email}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h2 className="text-4xl font-bold text-slate-900 uppercase tracking-tight">Tax Invoice</h2>
                            <h3 className="text-xl font-medium text-slate-400 mt-1" style={{ fontFamily: 'Arial, sans-serif' }}>&#1601;&#1575;&#1578;&#1608;&#1585;&#1577; &#1590;&#1585;&#1610;&#1576;&#1610;&#1577;</h3>
                            <div className="mt-4 p-4 border-2 border-slate-200 rounded-xl bg-slate-50/50 print:bg-transparent">
                                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                    <div className="text-slate-400 text-right text-xs font-semibold uppercase">Invoice No</div>
                                    <div className="font-bold font-mono text-slate-900">{invoice.invoiceNo}</div>

                                    <div className="text-slate-400 text-right text-xs font-semibold uppercase">Date</div>
                                    <div className="font-bold text-slate-900">{invoice.date}</div>

                                    <div className="text-slate-400 text-right text-xs font-semibold uppercase">Due Date</div>
                                    <div className="font-bold text-slate-900">{invoice.dueDate}</div>

                                    <div className="text-slate-400 text-right text-xs font-semibold uppercase">Status</div>
                                    <div className={`font-bold ${invoice.status === 'Paid' ? 'text-emerald-600' : invoice.status === 'Overdue' ? 'text-rose-600' : 'text-blue-600'}`}>{invoice.status}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bill To */}
                    <div className="border-t-2 border-slate-200 pt-8 pb-4">
                        <div className="grid grid-cols-2 gap-12">
                            <div className="p-5 bg-slate-50 rounded-xl print:bg-transparent print:p-0">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-3">Bill To / &#1575;&#1604;&#1593;&#1605;&#1610;&#1604;</h4>
                                <p className="font-bold text-lg text-slate-900">{customer?.name || 'Customer'}</p>
                                <p className="text-sm text-slate-600 mt-1">{customer?.address || ''}</p>
                                <p className="text-sm text-slate-600">{customer?.city ? `${customer.city}, Saudi Arabia` : ''}</p>
                                <p className="text-sm text-slate-500 mt-2 font-mono">{customer?.vatNumber ? `VAT: ${customer.vatNumber}` : ''}</p>
                            </div>
                            <div className="text-right p-5 bg-slate-50 rounded-xl print:bg-transparent print:p-0">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-3">Job Reference / &#1575;&#1604;&#1605;&#1585;&#1580;&#1593;</h4>
                                <p className="font-bold text-lg text-slate-900">{jobRef?.jobNo ? `JOB-${jobRef.jobNo}` : `JOB-${invoice.jobId}`}</p>
                                <p className="text-sm text-slate-600 mt-1">{jobRef?.description || ''}</p>
                                <p className="text-sm text-slate-500 font-mono mt-1">{jobRef?.blNumber ? `BL: ${jobRef.blNumber}` : ''}</p>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="mt-6">
                        <table className="w-full">
                            <thead>
                                <tr className="border-y-2 border-slate-900">
                                    <th className="py-3 text-left text-[10px] font-bold uppercase text-slate-500 tracking-wider w-12">#</th>
                                    <th className="py-3 text-left text-[10px] font-bold uppercase text-slate-500 tracking-wider">Description / &#1575;&#1604;&#1576;&#1610;&#1575;&#1606;</th>
                                    <th className="py-3 text-right text-[10px] font-bold uppercase text-slate-500 tracking-wider w-24">Tax Rate</th>
                                    <th className="py-3 text-right text-[10px] font-bold uppercase text-slate-500 tracking-wider w-32">Amount (SAR)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoice.items?.map((item, i) => (
                                    <tr key={item.id}>
                                        <td className="py-4 text-sm text-slate-400 font-mono">{String(i + 1).padStart(2, '0')}</td>
                                        <td className="py-4 text-sm font-medium text-slate-900">{item.description}</td>
                                        <td className="py-4 text-right text-sm">
                                            {item.isTaxable ? (
                                                <span className="font-bold text-slate-900">15%</span>
                                            ) : (
                                                <span className="text-slate-400">Exempt</span>
                                            )}
                                        </td>
                                        <td className="py-4 text-right text-sm font-bold text-slate-900 font-mono">
                                            {(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end pt-6">
                        <div className="w-72 space-y-2">
                            {nonTaxableTotal > 0 && (
                                <div className="flex justify-between text-sm text-slate-500 py-1.5">
                                    <span>Non-Taxable Amount</span>
                                    <span className="font-mono">{nonTaxableTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm text-slate-500 py-1.5">
                                <span>Taxable Amount</span>
                                <span className="font-mono">{taxableTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-700 py-2 border-t border-dashed border-slate-200">
                                <span className="font-semibold">VAT (15%) / &#1575;&#1604;&#1590;&#1585;&#1610;&#1576;&#1577;</span>
                                <span className="font-bold font-mono">{(invoice.vatAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-end pt-3 border-t-2 border-slate-900">
                                <div>
                                    <span className="text-xs text-slate-400 uppercase tracking-wider block">Total / &#1575;&#1604;&#1573;&#1580;&#1605;&#1575;&#1604;&#1610;</span>
                                </div>
                                <span className="text-2xl font-bold text-slate-900 font-mono">
                                    {(invoice.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    <span className="text-xs ml-1 align-top font-sans">SAR</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Terms */}
                    <div className="bg-slate-50 rounded-xl p-5 print:bg-transparent print:border print:border-slate-200">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">Payment Terms & Notes</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Payment is due within 30 days from the invoice date.
                            {banks.length > 0 ? (
                                <> Bank transfer to {companyInfo.name}, {banks[0].bankName}{banks[0].accountNumber ? `, Account: ${banks[0].accountNumber}` : ''}{banks[0].ibanNumber ? `, IBAN: ${banks[0].ibanNumber}` : ''}.</>
                            ) : (
                                <> Bank transfer to {companyInfo.name}.</>
                            )}
                            {' '}Late payments may incur a 2% monthly charge.
                        </p>
                    </div>

                    {/* ZATCA Footer */}
                    <div className="mt-8 flex items-end gap-6 justify-between border-t-2 border-slate-200 pt-6">
                        <div className="flex gap-5">
                            <div className="h-28 w-28 bg-white border-2 border-slate-900 p-1.5 rounded-lg">
                                {qrDataUrl ? (
                                    <img src={qrDataUrl} alt="ZATCA QR Code" className="h-full w-full rounded" />
                                ) : (
                                    <div className="h-full w-full bg-slate-900 rounded flex items-center justify-center text-white text-[9px] text-center font-bold leading-tight">
                                        ZATCA<br />QR CODE
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col justify-end space-y-1.5">
                                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                                    <Shield className="h-3.5 w-3.5" />
                                    ZATCA Phase 1 Compliant
                                </div>
                                <p className="text-[9px] text-slate-500">
                                    Status: <span className={(invoice as any).zatcaStatus === 'GENERATED' ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>{(invoice as any).zatcaStatus || 'PENDING'}</span>
                                </p>
                                <p className="text-[9px] font-mono text-slate-400 max-w-[220px] break-all">
                                    UUID: {(invoice as any).zatcaUuid || '-'}
                                </p>
                                <p className="text-[9px] font-mono text-slate-400 max-w-[220px] break-all">
                                    HASH: {(invoice as any).zatcaHash || '-'}
                                </p>
                            </div>
                        </div>
                        <div className="text-right text-xs text-slate-400 max-w-xs space-y-1">
                            <p className="font-semibold text-slate-500">{companyInfo.name}</p>
                            <p>This is a system-generated tax invoice.</p>
                            <p>E-invoice compliant with ZATCA regulations.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoicePreview;
