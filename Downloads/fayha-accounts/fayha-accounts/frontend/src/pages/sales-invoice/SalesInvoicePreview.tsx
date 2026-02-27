import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, Download, Mail, Shield, Loader2 } from 'lucide-react';
import type { SalesInvoice, Client, JobReference } from '../../types';
import { salesInvoicesApi, customersApi, jobReferencesApi, banksApi, settingsApi } from '../../services/api';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import { buildZatcaTlv } from '../../utils/zatca';

// ─── Fayha Arabia Company Logo (real image) ───────────────────────────────
const LOGO_URL = '/fayha-logo.png';
const FayhaLogo: React.FC<{ size?: number; className?: string; opacity?: number; watermark?: boolean }> = ({ size = 60, className = '', opacity = 1, watermark = false }) => (
  <img
    src={LOGO_URL}
    alt="Fayha Arabia Company"
    width={size}
    height={size}
    className={className}
    style={{
      opacity: watermark ? 0.08 : opacity,
      objectFit: 'contain',
    }}
    crossOrigin="anonymous"
  />
);

// Default company info
const DEFAULT_COMPANY = {
  name: 'Fayha Arabia Company',
  nameAr: '\u0634\u0631\u0643\u0629 \u0641\u064a\u062d\u0627 \u0623\u0631\u0627\u0628\u064a\u0627',
  subtitleAr: '\u0644\u0644\u062a\u062e\u0644\u064a\u0635 \u0627\u0644\u062c\u0645\u0631\u0643\u064a',
  vatNumber: '311467026900003',
  crNumber: '1010616141',
  address: 'Building No: 8298, Prince Muhammad Ibn Abdulrahman Ibn Abdulaziz, Al Mishael Dist., Riyadh 14325, Saudi Arabia',
  addressAr: '\u0631\u0642\u0645 \u0627\u0644\u0645\u0628\u0646\u0649: \u0668\u0662\u0669\u0668\u060c \u0627\u0644\u0623\u0645\u064a\u0631 \u0645\u062d\u0645\u062f \u0628\u0646 \u0639\u0628\u062f\u0627\u0644\u0631\u062d\u0645\u0646 \u0628\u0646 \u0639\u0628\u062f\u0627\u0644\u0639\u0632\u064a\u0632\u060c \u062d\u064a \u0627\u0644\u0645\u0634\u0627\u0639\u0644\u060c \u0627\u0644\u0631\u0645\u0632 \u0627\u0644\u0628\u0631\u064a\u062f\u064a\u060c \u0627\u0644\u0631\u064a\u0627\u0636\u060c \u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629',
  city: 'Riyadh',
  country: 'Saudi Arabia',
  phone1: '050 057 1423',
  phone2: '050 243 4321',
  phone: '050 057 1423',
  email: 'info@fayha.sa',
};

const BRAND_BLUE = '#1e3a6e';
const BRAND_BLUE_LIGHT = '#2a4f8f';

const SalesInvoicePreview: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [invoice, setInvoice] = useState<SalesInvoice | null>(null);
  const [client, setClient] = useState<any>(null);
  const [jobRef, setJobRef] = useState<any>(null);
  const [banks, setBanks] = useState<any[]>([]);
  const [companyInfo, setCompanyInfo] = useState(DEFAULT_COMPANY);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [invData, clientData, jobData, bankData, settingsData] = await Promise.all([
          id ? salesInvoicesApi.getById(id).catch(() => null) : Promise.resolve(null),
          customersApi.getAll(),
          jobReferencesApi.getAll(),
          banksApi.getAll().catch(() => []),
          settingsApi.getAll().catch(() => ({ map: {} })),
        ]);
        const clients = Array.isArray(clientData) ? clientData : [];
        const jobs = Array.isArray(jobData) ? jobData : [];
        setBanks(Array.isArray(bankData) ? bankData.slice(0, 2) : []);

        const map = settingsData?.map || {};
        setCompanyInfo({
          name: map['COMPANY_NAME'] || DEFAULT_COMPANY.name,
          nameAr: map['COMPANY_NAME_AR'] || DEFAULT_COMPANY.nameAr,
          subtitleAr: DEFAULT_COMPANY.subtitleAr,
          vatNumber: map['COMPANY_VAT_NUMBER'] || DEFAULT_COMPANY.vatNumber,
          crNumber: map['COMPANY_CR_NUMBER'] || DEFAULT_COMPANY.crNumber,
          address: map['COMPANY_ADDRESS'] || DEFAULT_COMPANY.address,
          addressAr: DEFAULT_COMPANY.addressAr,
          city: map['COMPANY_CITY'] || DEFAULT_COMPANY.city,
          country: map['COMPANY_COUNTRY'] || DEFAULT_COMPANY.country,
          phone1: DEFAULT_COMPANY.phone1,
          phone2: DEFAULT_COMPANY.phone2,
          phone: map['COMPANY_PHONE'] || DEFAULT_COMPANY.phone,
          email: map['COMPANY_EMAIL'] || DEFAULT_COMPANY.email,
        });

        if (invData) {
          setInvoice(invData);
          setClient(clients.find((c: Client) => c.id === invData.clientId) || invData.client || null);
          setJobRef(jobs.find((j: JobReference) => j.id === (invData.jobReferenceId || invData.jobRefId)) || invData.jobReference || null);
        }
      } catch (err) {
        console.error('Failed to load invoice data:', err);
      }
      setLoading(false);
    };
    loadData();
  }, [id]);

  useEffect(() => {
    if (!invoice) return;
    const grandTotal = Number(invoice.totalAmount || invoice.grandTotal || 0);
    const vatTotal = (invoice.items || []).reduce((s, i) => s + (i.vatAmount || 0), 0);
    const timestamp = invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString() : new Date().toISOString();
    const tlvBase64 = buildZatcaTlv(companyInfo.name, companyInfo.vatNumber, timestamp, grandTotal, vatTotal);
    QRCode.toDataURL(tlvBase64, { width: 120, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then(url => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [invoice, companyInfo]);

  const handlePrint = () => window.print();

  const handleDownloadPDF = useCallback(async () => {
    if (!id) return;
    try {
      setDownloading(true);
      // Try server-side PDF generation first
      const result = await salesInvoicesApi.generatePdf(id);
      if (result?.url) {
        // Build absolute URL for download
        const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
        const downloadUrl = baseUrl.replace(/\/api\/v1$/, '') + result.url;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${invoice?.invoiceNo || (invoice as any)?.invoiceNumber || 'invoice'}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(result.cached ? 'PDF downloaded (cached)' : 'PDF generated and downloaded');
        return;
      }
    } catch (serverErr) {
      console.warn('Server PDF failed, falling back to client-side:', serverErr);
    }

    // Fallback: client-side PDF generation
    if (!printRef.current) {
      toast.error('Failed to generate PDF.');
      setDownloading(false);
      return;
    }
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');

      let position = 0;
      let remaining = imgHeight;
      const pageHeight = 297;

      while (remaining > 0) {
        if (position > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight);
        remaining -= pageHeight;
        position += pageHeight;
      }

      const invNo = invoice?.invoiceNo || (invoice as any)?.invoiceNumber || 'invoice';
      pdf.save(`${invNo}.pdf`);
      toast.success('PDF downloaded (client-side)');
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to generate PDF. Use Print instead.');
    } finally {
      setDownloading(false);
    }
  }, [id, invoice]);

  const handleEmail = () => {
    const invNo = invoice?.invoiceNo || (invoice as any)?.invoiceNumber || '';
    const subject = encodeURIComponent(`Invoice ${invNo} - ${companyInfo.name}`);
    const body = encodeURIComponent(`Dear Customer,\n\nPlease find attached Invoice ${invNo}.\n\nBest regards,\n${companyInfo.name}`);
    window.open(`mailto:${client?.email || ''}?subject=${subject}&body=${body}`, '_self');
    toast.success('Email client opened');
  };

  const fmtDate = (d: any) => {
    if (!d) return '';
    try {
      const dt = new Date(d);
      return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`;
    } catch { return ''; }
  };

  const fmtNum = (n: number) => (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading || !invoice) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="h-12 w-12 skeleton rounded-xl mx-auto" />
          <div className="h-4 w-32 skeleton rounded mx-auto" />
        </div>
      </div>
    );
  }

  const normalizedItems = (invoice.items || []).map((i: any) => ({
    ...i,
    name: i.name || i.nameEn || '',
    nameAr: i.nameAr || '',
    vatPercent: i.vatPercent ?? (i.vatRate ? i.vatRate * 100 : 0),
    total: i.total ?? i.totalAmount ?? ((i.amount || 0) + (i.vatAmount || 0)),
  }));

  const nonTaxItems = normalizedItems.filter((i: any) => !i.vatPercent || i.vatPercent === 0);
  const taxItems = normalizedItems.filter((i: any) => i.vatPercent && i.vatPercent > 0);
  const nonTaxTotal = nonTaxItems.reduce((s: number, i: any) => s + (i.amount || 0), 0);
  const taxableTotal = taxItems.reduce((s: number, i: any) => s + (i.amount || 0), 0);
  const vatTotal = taxItems.reduce((s: number, i: any) => s + (i.vatAmount || 0), 0);
  const grandTotal = invoice.totalAmount || invoice.grandTotal || (nonTaxTotal + taxableTotal + vatTotal);

  const clientAddress = [
    client?.buildingNumber,
    client?.streetName,
    client?.district,
    client?.city,
    client?.postalCode,
  ].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen bg-slate-100 p-8 print:p-0 print:bg-white">
      {/* Toolbar */}
      <div className="max-w-[210mm] mx-auto mb-6 flex items-center justify-between print:hidden">
        <button onClick={() => navigate(-1)} className="btn-ghost">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex gap-2">
          <button onClick={handleEmail} className="btn-secondary"><Mail className="h-4 w-4" /> Email Invoice</button>
          <button onClick={handleDownloadPDF} disabled={downloading} className="btn-secondary">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PDF
          </button>
          <button onClick={handlePrint} className="btn-primary"><Printer className="h-4 w-4" /> Print</button>
        </div>
      </div>

      {/* A4 Paper */}
      <div ref={printRef} className="max-w-[210mm] mx-auto bg-white shadow-2xl print:shadow-none print:w-full min-h-[297mm] relative overflow-hidden text-slate-900 print:rounded-none" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>

        {/* ═══ WATERMARK - Faded logo in center (matches letterhead) ═══ */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <FayhaLogo size={320} opacity={1} watermark />
        </div>

        {/* ═══ HEADER - Matching letterhead ═══ */}
        <div className="relative z-10 px-8 pt-6 pb-0">
          <div className="flex justify-between items-center">
            {/* Left: Logo + Company Name */}
            <div className="flex items-center gap-4">
              <FayhaLogo size={65} />
              <div>
                <p className="text-[22px] font-black" style={{ color: BRAND_BLUE }} dir="rtl">
                  {companyInfo.nameAr}
                </p>
                <p className="text-[17px] font-extrabold tracking-wide" style={{ color: BRAND_BLUE }}>
                  Fayha Arabia Company
                </p>
              </div>
            </div>

            {/* Right: CR Number in blue box */}
            <div className="text-right px-5 py-2.5 rounded-sm" style={{ backgroundColor: BRAND_BLUE }}>
              <p className="text-white text-[11px] font-bold" dir="rtl">
                {'\u0633.\u062a: \u0667\u0660\u0661\u0666\u0664\u0661\u0667\u0664\u0660\u0669'}
              </p>
              <p className="text-white text-[11px] font-bold">
                C.R: {companyInfo.crNumber}
              </p>
            </div>
          </div>
        </div>

        {/* Blue separator line */}
        <div className="mx-8 mt-3 h-[3px]" style={{ backgroundColor: BRAND_BLUE }} />

        {/* ═══ INVOICE TITLE STRIP ═══ */}
        <div className="mx-8 mt-4 px-6 py-2 flex justify-between items-center rounded-sm" style={{ backgroundColor: BRAND_BLUE }}>
          <h2 className="text-sm font-bold text-white tracking-wider uppercase">Tax Invoice</h2>
          <h2 className="text-sm font-bold text-white" dir="rtl">{'\u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629 \u0627\u0644\u0636\u0631\u064a\u0628\u064a\u0629'}</h2>
        </div>

        <div className="relative z-10 px-8 py-4 print:px-6 print:py-3 space-y-4">

          {/* ═══ BILL TO + INVOICE INFO ═══ */}
          <div className="grid grid-cols-2 gap-0 border border-slate-300 rounded overflow-hidden">
            {/* Left: Bill To */}
            <div className="p-3 bg-slate-50 border-r border-slate-300">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: BRAND_BLUE }}>Bill To / {'\u0641\u0627\u062a\u0648\u0631\u0629 \u0625\u0644\u0649'}</p>
              <p className="text-sm font-bold text-slate-900">{client?.name || 'N/A'}</p>
              {client?.nameAr && <p className="text-xs text-slate-600" dir="rtl">{client.nameAr}</p>}
              <div className="mt-2 space-y-0.5 text-[10px] text-slate-600">
                {clientAddress && <p>Address: {clientAddress}</p>}
                <p>Country: {client?.country || 'SAUDI ARABIA'}</p>
                {client?.contactPerson && <p>Attn: {client.contactPerson}</p>}
                {(client?.contactPersonPhone || client?.phone) && <p>Tel: {client.contactPersonPhone || client.phone}</p>}
                {client?.vatNumber && <p>VAT ID: <span className="font-mono">{client.vatNumber}</span></p>}
              </div>
            </div>

            {/* Right: Invoice Details */}
            <div className="p-3">
              <div className="space-y-1.5 text-[10px]">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Invoice No / {'\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629'}</span>
                  <span className="font-bold font-mono" style={{ color: BRAND_BLUE }}>{invoice.invoiceNo || (invoice as any).invoiceNumber}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Invoice Date / {'\u062a\u0627\u0631\u064a\u062e'}</span>
                  <span className="font-bold">{fmtDate(invoice.invoiceDate)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Sales Method</span>
                  <span className="font-bold">{invoice.saleMethod || 'CREDIT'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Mode of Shipment</span>
                  <span className="font-bold">{jobRef?.direction || 'Import'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Job Ref. No</span>
                  <span className="font-bold font-mono">{jobRef?.jobRefNo || jobRef?.jobNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">VAT ID</span>
                  <span className="font-mono text-slate-700">{companyInfo.vatNumber}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ JOB DETAILS ═══ */}
          <div className="border border-slate-300 rounded overflow-hidden">
            <div className="px-4 py-1.5 border-b border-slate-300" style={{ backgroundColor: '#eef2f7' }}>
              <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">{'\u062a\u0641\u0627\u0635\u064a\u0644'} / Shipment Details</h4>
            </div>
            <div className="p-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[10px]">
              <div className="flex gap-2"><span className="text-slate-500 font-semibold min-w-[130px]">Job:</span><span className="text-slate-800">Clearance</span></div>
              <div className="flex gap-2"><span className="text-slate-500 font-semibold min-w-[130px]">Job Details:</span><span className="text-slate-800">{jobRef?.jobDescription || (jobRef as any)?.hsCode || ''}</span></div>
              <div className="flex gap-2"><span className="text-slate-500 font-semibold min-w-[130px]">Customer Ref / PO:</span><span className="text-slate-800">{(jobRef as any)?.customerRefNo || ''}</span></div>
              <div className="flex gap-2"><span className="text-slate-500 font-semibold min-w-[130px]">Cargo Description:</span><span className="text-slate-800">{(jobRef as any)?.cargoDescription || ''}</span></div>
              <div className="flex gap-2"><span className="text-slate-500 font-semibold min-w-[130px]">Origin:</span><span className="text-slate-800">{(jobRef as any)?.pol || (jobRef as any)?.origin || ''}</span></div>
              <div className="flex gap-2"><span className="text-slate-500 font-semibold min-w-[130px]">GWeight (Kg):</span><span className="text-slate-800">{(jobRef as any)?.grossWeight || ''}</span></div>
              <div className="flex gap-2"><span className="text-slate-500 font-semibold min-w-[130px]">Destination:</span><span className="text-slate-800">{(jobRef as any)?.pod || (jobRef as any)?.destination || ''}</span></div>
              <div className="flex gap-2"><span className="text-slate-500 font-semibold min-w-[130px]">CWeight (Kg):</span><span className="text-slate-800">{(jobRef as any)?.chargeableWeight || ''}</span></div>
              <div className="flex gap-2"><span className="text-slate-500 font-semibold min-w-[130px]">Shipper Name:</span><span className="text-slate-800">{(jobRef as any)?.shipper || ''}</span></div>
              <div className="flex gap-2"><span className="text-slate-500 font-semibold min-w-[130px]">Container:</span><span className="text-slate-800">{(jobRef as any)?.fclLclType || ''}</span></div>
              <div className="flex gap-2"><span className="text-slate-500 font-semibold min-w-[130px]">Consignee:</span><span className="text-slate-800">{(jobRef as any)?.consigneeName || ''}</span></div>
              <div className="flex gap-2"><span className="text-slate-500 font-semibold min-w-[130px]">Vessel / Airline:</span><span className="text-slate-800">{(jobRef as any)?.vesselName || (jobRef as any)?.airlines || ''}</span></div>
              <div className="flex gap-2"><span className="text-slate-500 font-semibold min-w-[130px]">AWB / BL NO:</span><span className="text-slate-800 font-mono">{jobRef?.awbBl || (jobRef as any)?.awbBlNumber || ''}</span></div>
              <div className="flex gap-2"><span className="text-slate-500 font-semibold min-w-[130px]">Pieces:</span><span className="text-slate-800">{(jobRef as any)?.packages || ''}</span></div>
              <div className="flex gap-2"><span className="text-slate-500 font-semibold min-w-[130px]">HAWB / HBL NO:</span><span className="text-slate-800 font-mono">{(jobRef as any)?.hawbHbl || ''}</span></div>
              <div className="flex gap-2"><span className="text-slate-500 font-semibold min-w-[130px]">MAWB / MBL NO:</span><span className="text-slate-800 font-mono">{(jobRef as any)?.mawbMbl || ''}</span></div>
            </div>
          </div>

          {/* ═══ LINE ITEMS TABLE ═══ */}
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr style={{ backgroundColor: BRAND_BLUE }}>
                <th className="border px-2 py-2 text-center w-8 font-bold text-white" style={{ borderColor: BRAND_BLUE_LIGHT }}>No<br /><span className="font-normal opacity-80" dir="rtl">{'\u0631\u0642\u0645'}</span></th>
                <th className="border px-2 py-2 text-left font-bold text-white" style={{ borderColor: BRAND_BLUE_LIGHT }}>Services / Description<br /><span className="font-normal opacity-80" dir="rtl">{'\u062e\u062f\u0645\u0627\u062a / \u0648\u0635\u0641'}</span></th>
                <th className="border px-2 py-2 text-right w-20 font-bold text-white" style={{ borderColor: BRAND_BLUE_LIGHT }}>Amount<br /><span className="font-normal opacity-80" dir="rtl">{'\u0627\u0644\u0645\u0628\u0644\u063a'}</span></th>
                <th className="border px-2 py-2 text-center w-12 font-bold text-white" style={{ borderColor: BRAND_BLUE_LIGHT }}>VAT%<br /><span className="font-normal opacity-80" dir="rtl">{'\u0636\u0631\u064a\u0628\u0629'}</span></th>
                <th className="border px-2 py-2 text-right w-20 font-bold text-white" style={{ borderColor: BRAND_BLUE_LIGHT }}>VAT Amt<br /><span className="font-normal opacity-80" dir="rtl">{'\u0642\u064a\u0645\u0629 \u0627\u0644\u0636\u0631\u064a\u0628\u0629'}</span></th>
                <th className="border px-2 py-2 text-right w-24 font-bold text-white" style={{ borderColor: BRAND_BLUE_LIGHT }}>Total (SAR)<br /><span className="font-normal opacity-80" dir="rtl">{'\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a'}</span></th>
              </tr>
            </thead>
            <tbody>
              {normalizedItems.map((item: any, i: number) => (
                <tr key={item.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}>
                  <td className="border border-slate-200 px-2 py-1.5 text-center font-semibold text-slate-500">{i + 1}</td>
                  <td className="border border-slate-200 px-2 py-1.5 font-semibold text-slate-800">
                    {item.name}
                    {item.nameAr && <span className="text-slate-400 ml-1 text-[9px]" dir="rtl">({item.nameAr})</span>}
                    {item.description && item.description !== item.name && <span className="block text-[9px] text-slate-500 font-normal mt-0.5">{item.description}</span>}
                  </td>
                  <td className="border border-slate-200 px-2 py-1.5 text-right font-mono text-slate-800">{fmtNum(item.amount)}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-center font-semibold">{item.vatPercent || 0}%</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-right font-mono text-slate-600">{fmtNum(item.vatAmount)}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-right font-mono font-bold text-slate-900">{fmtNum(item.total)}</td>
                </tr>
              ))}
              {normalizedItems.length < 5 && Array.from({ length: 5 - normalizedItems.length }).map((_, i) => (
                <tr key={`empty-${i}`} className={(normalizedItems.length + i) % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}>
                  <td className="border border-slate-200 px-2 py-1.5 text-center text-slate-300">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1.5">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1.5">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1.5">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1.5">&nbsp;</td>
                  <td className="border border-slate-200 px-2 py-1.5">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ═══ SUMMARY TOTALS ═══ */}
          <div className="flex justify-end">
            <div className="w-[320px] border border-slate-300 rounded overflow-hidden text-[10px]">
              <div className="flex justify-between px-4 py-1.5 border-b border-slate-200 bg-slate-50">
                <span className="font-semibold text-slate-600">Non Taxable Amount (SAR)</span>
                <span className="font-bold font-mono text-slate-800">{fmtNum(nonTaxTotal)}</span>
              </div>
              <div className="flex justify-between px-4 py-1.5 border-b border-slate-200 bg-slate-50">
                <span className="font-semibold text-slate-600">Taxable Amount (SAR)</span>
                <span className="font-bold font-mono text-slate-800">{fmtNum(taxableTotal)}</span>
              </div>
              <div className="flex justify-between px-4 py-1.5 border-b border-slate-200">
                <span className="font-semibold text-slate-600">VAT Amount (SAR) {'\u0636\u0631\u064a\u0628\u0629 \u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629'}</span>
                <span className="font-bold font-mono text-amber-700">{fmtNum(vatTotal)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5 text-white font-bold" style={{ backgroundColor: BRAND_BLUE }}>
                <span>Total Amount (SAR) {'\u0625\u062c\u0645\u0627\u0644\u064a'}</span>
                <span className="font-mono text-base">{fmtNum(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* ═══ PAYMENT STATUS ═══ */}
          {((invoice.paidAmount || 0) > 0 || (invoice.dueAmount || 0) > 0) && (
            <div className="flex justify-end">
              <div className="w-[320px] border border-slate-200 rounded overflow-hidden text-[10px]">
                <div className="flex justify-between px-4 py-1.5 bg-blue-50 text-blue-900">
                  <span className="font-semibold">Paid Amount</span>
                  <span className="font-bold font-mono">{fmtNum(invoice.paidAmount)}</span>
                </div>
                <div className="flex justify-between px-4 py-1.5 bg-rose-50 text-rose-800 border-t border-slate-200">
                  <span className="font-semibold">Balance Due</span>
                  <span className="font-bold font-mono">{fmtNum(invoice.dueAmount || 0)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ═══ NOTICE ═══ */}
          <div className="text-center text-[8px] text-slate-400 border-t border-slate-200 pt-2">
            **** Errors or omissions, if any, must be reported within seven (7) days from the date of invoice ****
          </div>

          {/* ═══ BANK DETAILS ═══ */}
          {banks.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {banks.map((bank: any, idx: number) => (
                <div key={idx} className="border border-slate-300 rounded p-3 text-center">
                  <p className="text-[10px] font-bold mb-1.5 uppercase tracking-wider" style={{ color: BRAND_BLUE }}>Bank Details / {'\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0628\u0646\u0643'}</p>
                  <div className="text-[9px] text-slate-700 space-y-0.5">
                    <p className="font-bold">{bank.bankName || ''}</p>
                    <p className="text-slate-600">{companyInfo.name}</p>
                    {bank.accountNumber && <p>A/C No: <span className="font-mono">{bank.accountNumber}</span></p>}
                    {bank.ibanNumber && <p>IBAN: <span className="font-mono font-semibold">{bank.ibanNumber}</span></p>}
                    {bank.swiftCode && <p>SWIFT: <span className="font-mono">{bank.swiftCode}</span></p>}
                    {bank.branchName && <p>Branch: {bank.branchName}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ ZATCA QR + SIGNATURES ═══ */}
          <div className="border-t-2 pt-4 mt-3" style={{ borderColor: BRAND_BLUE }}>
            <div className="flex items-end justify-between gap-6">
              <div className="flex gap-3 items-end">
                <div className="h-[90px] w-[90px] border-2 border-slate-800 p-1 rounded bg-white flex-shrink-0">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="ZATCA QR Code" className="h-full w-full rounded" />
                  ) : (
                    <div className="h-full w-full bg-slate-900 rounded flex items-center justify-center text-white text-[7px] text-center font-bold leading-tight">
                      ZATCA<br />QR CODE<br />PHASE 2
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: BRAND_BLUE }}>
                    <Shield className="h-3.5 w-3.5" />
                    ZATCA Phase 2 Compliant
                  </div>
                  <p className="text-[9px] text-slate-500">
                    Status: <span className={invoice.zatcaStatus === 'Synced With Zatca' ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>{invoice.zatcaStatus}</span>
                  </p>
                  {((invoice as any).zatcaUuid || invoice.zatca?.uuid) && (
                    <p className="text-[7px] font-mono text-slate-400">UUID: {(invoice as any).zatcaUuid || invoice.zatca?.uuid}</p>
                  )}
                  {(invoice as any).zatcaHash && (
                    <p className="text-[7px] font-mono text-slate-400">HASH: {(invoice as any).zatcaHash}</p>
                  )}
                  {(invoice as any).zatcaClearanceId && (
                    <p className="text-[7px] font-mono text-emerald-500">CLEARANCE: {(invoice as any).zatcaClearanceId}</p>
                  )}
                  {invoice.zatcaStatus === 'Rejected' && (
                    <p className="text-[7px] font-bold text-red-600">REJECTED BY ZATCA</p>
                  )}
                </div>
              </div>

              <div className="flex gap-8">
                <div className="text-center">
                  <div className="w-32 border-b-2 border-slate-400 mb-1 h-8" />
                  <p className="text-[9px] text-slate-500 font-semibold">Authorized Signature</p>
                  <p className="text-[8px] text-slate-400" dir="rtl">{'\u062a\u0648\u0642\u064a\u0639 \u0645\u0639\u062a\u0645\u062f'}</p>
                </div>
                <div className="text-center">
                  <div className="w-32 border-b-2 border-slate-400 mb-1 h-8" />
                  <p className="text-[9px] text-slate-500 font-semibold">Customer Stamp</p>
                  <p className="text-[8px] text-slate-400" dir="rtl">{'\u062e\u062a\u0645 \u0627\u0644\u0639\u0645\u064a\u0644'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ FOOTER - Matching letterhead blue bar ═══ */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <div className="text-center py-3 px-6 text-white" style={{ backgroundColor: BRAND_BLUE }}>
            {/* Phone numbers */}
            <div className="flex justify-center items-center gap-6 text-[10px] font-bold mb-1.5">
              <span>{'\u260e'} {companyInfo.phone1} {'\u00a9'}</span>
              <span>{'\u260e'} {companyInfo.phone2} {'\u00a9'}</span>
            </div>
            {/* Arabic address */}
            <p className="text-[9px] leading-relaxed mb-1" dir="rtl">
              {'\u{1f4cd}'} {companyInfo.addressAr}
            </p>
            {/* English address */}
            <p className="text-[9px] leading-relaxed opacity-90">
              {'\u{1f4cd}'} {companyInfo.address}
            </p>
          </div>
        </div>

        {/* Bottom padding to prevent content overlapping footer */}
        <div className="h-[90px]" />
      </div>
    </div>
  );
};

export default SalesInvoicePreview;
