import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, Download, Mail, Shield, Loader2 } from 'lucide-react';
import type { SalesInvoice, Client, JobReference } from '../../types';
import { salesInvoicesApi, customersApi, jobReferencesApi, banksApi, settingsApi } from '../../services/api';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';

// ─── ZATCA TLV QR Code Builder ───────────────────────────────
function buildZatcaTlv(sellerName: string, vatNumber: string, timestamp: string, totalWithVat: number, vatAmount: number): string {
  const encoder = new TextEncoder();
  const tlvParts: Uint8Array[] = [];
  const entries = [
    { tag: 1, value: sellerName },
    { tag: 2, value: vatNumber },
    { tag: 3, value: timestamp },
    { tag: 4, value: totalWithVat.toFixed(2) },
    { tag: 5, value: vatAmount.toFixed(2) },
  ];
  for (const entry of entries) {
    const valueBytes = encoder.encode(entry.value);
    const tlv = new Uint8Array(2 + valueBytes.length);
    tlv[0] = entry.tag;
    tlv[1] = valueBytes.length;
    tlv.set(valueBytes, 2);
    tlvParts.push(tlv);
  }
  const totalLen = tlvParts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const part of tlvParts) {
    result.set(part, offset);
    offset += part.length;
  }
  return btoa(String.fromCharCode(...result));
}

// Default company info (fallback if settings not loaded)
const DEFAULT_COMPANY = {
  name: 'Fayha Transportation For Customs Clearance',
  nameAr: '\u0645\u0624\u0633\u0633\u0629 \u0641\u064a\u062d\u0627\u0621 \u0644\u0644\u0646\u0642\u0644',
  subtitleAr: '\u0644\u0644\u062a\u062e\u0644\u064a\u0635 \u0627\u0644\u062c\u0645\u0631\u0643\u064a',
  vatNumber: '311467026900003',
  crNumber: '4030123456',
  address: 'Jeddah Islamic Port, District 4',
  city: 'Jeddah',
  country: 'Saudi Arabia',
  phone: '+966 12 647 0000',
  email: 'info@fayha.sa',
};

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

        // Load company info from settings
        const map = settingsData?.map || {};
        setCompanyInfo({
          name: map['COMPANY_NAME'] || DEFAULT_COMPANY.name,
          nameAr: map['COMPANY_NAME_AR'] || DEFAULT_COMPANY.nameAr,
          subtitleAr: DEFAULT_COMPANY.subtitleAr,
          vatNumber: map['COMPANY_VAT_NUMBER'] || DEFAULT_COMPANY.vatNumber,
          crNumber: map['COMPANY_CR_NUMBER'] || DEFAULT_COMPANY.crNumber,
          address: map['COMPANY_ADDRESS'] || DEFAULT_COMPANY.address,
          city: map['COMPANY_CITY'] || DEFAULT_COMPANY.city,
          country: map['COMPANY_COUNTRY'] || DEFAULT_COMPANY.country,
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

  // Generate ZATCA QR code when invoice data loads
  useEffect(() => {
    if (!invoice) return;
    const grandTotal = Number(invoice.totalAmount || invoice.grandTotal || 0);
    const vatTotal = (invoice.items || []).reduce((s, i) => s + (i.vatAmount || 0), 0);
    const timestamp = invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString() : new Date().toISOString();
    const tlvBase64 = buildZatcaTlv(
      companyInfo.name,
      companyInfo.vatNumber,
      timestamp,
      grandTotal,
      vatTotal
    );
    QRCode.toDataURL(tlvBase64, { width: 120, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then(url => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [invoice, companyInfo]);

  const handlePrint = () => window.print();

  const handleDownloadPDF = useCallback(async () => {
    if (!printRef.current) return;
    try {
      setDownloading(true);
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');

      let position = 0;
      let remaining = imgHeight;
      const pageHeight = 297; // A4 height in mm

      // Handle multi-page
      while (remaining > 0) {
        if (position > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight);
        remaining -= pageHeight;
        position += pageHeight;
      }

      const invNo = invoice?.invoiceNo || (invoice as any)?.invoiceNumber || 'invoice';
      pdf.save(`${invNo}.pdf`);
      toast.success('PDF downloaded');
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to generate PDF. Use Print instead.');
    } finally {
      setDownloading(false);
    }
  }, [invoice]);

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

  // Normalize invoice items from backend shape to frontend shape
  const normalizedItems = (invoice.items || []).map((i: any) => ({
    ...i,
    name: i.name || i.nameEn || '',
    nameAr: i.nameAr || '',
    vatPercent: i.vatPercent ?? (i.vatRate ? i.vatRate * 100 : 0),
    total: i.total ?? i.totalAmount ?? ((i.amount || 0) + (i.vatAmount || 0)),
  }));

  // Separate taxable vs non-taxable items
  const nonTaxItems = normalizedItems.filter((i: any) => !i.vatPercent || i.vatPercent === 0);
  const taxItems = normalizedItems.filter((i: any) => i.vatPercent && i.vatPercent > 0);
  const nonTaxTotal = nonTaxItems.reduce((s: number, i: any) => s + (i.amount || 0), 0);
  const taxableTotal = taxItems.reduce((s: number, i: any) => s + (i.amount || 0), 0);
  const vatTotal = taxItems.reduce((s: number, i: any) => s + (i.vatAmount || 0), 0);
  const grandTotal = invoice.totalAmount || invoice.grandTotal || (nonTaxTotal + taxableTotal + vatTotal);

  // Build client address
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
      <div ref={printRef} className="max-w-[210mm] mx-auto bg-white shadow-2xl print:shadow-none print:w-full min-h-[297mm] relative overflow-hidden text-slate-900 rounded-xl print:rounded-none">

        {/* ═══ WATERMARK ═══ */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
          <div
            className="text-[120px] font-black text-slate-100 tracking-[0.15em] select-none whitespace-nowrap"
            style={{
              transform: 'rotate(-35deg)',
              opacity: 0.35,
              letterSpacing: '0.12em',
              userSelect: 'none',
            }}
          >
            {companyInfo.name.split(' ')[0]?.toUpperCase() || 'FAYHA'}
          </div>
        </div>

        {/* ═══ TOP DECORATIVE BAR ═══ */}
        <div className="h-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700" />

        {/* ═══ HEADER ═══ */}
        <div className="relative z-10 px-8 pt-5 pb-4 border-b-2 border-emerald-700">
          <div className="flex justify-between items-start">
            {/* Left: Company English */}
            <div className="flex items-center gap-4">
              <div className="h-[70px] w-[70px] rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-800 flex items-center justify-center shadow-lg">
                <span className="text-white font-black text-3xl tracking-tight">
                  {companyInfo.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">{companyInfo.name}</h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-semibold mt-0.5">Customs Clearance & Freight Forwarding</p>
                <div className="flex gap-4 mt-1.5 text-[9px] text-slate-500">
                  <span>Tel: {companyInfo.phone}</span>
                  <span>Email: {companyInfo.email}</span>
                </div>
              </div>
            </div>
            {/* Right: Company Arabic */}
            <div className="text-right">
              <p className="text-2xl font-black text-slate-900" dir="rtl">{companyInfo.nameAr}</p>
              <p className="text-sm text-slate-600" dir="rtl">{companyInfo.subtitleAr}</p>
              <div className="mt-1.5 space-y-0.5 text-[9px] text-slate-500">
                <p>CR No.: <span className="font-mono font-bold text-slate-700">{companyInfo.crNumber}</span></p>
                <p>VAT No.: <span className="font-mono font-bold text-slate-700">{companyInfo.vatNumber}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ INVOICE TITLE STRIP ═══ */}
        <div className="bg-emerald-700 px-8 py-2 flex justify-between items-center">
          <h2 className="text-base font-bold text-white tracking-wider uppercase">Tax Invoice</h2>
          <h2 className="text-base font-bold text-white" dir="rtl">{'\u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629 \u0627\u0644\u0636\u0631\u064a\u0628\u064a\u0629'}</h2>
        </div>

        <div className="relative z-10 px-8 py-5 print:px-6 print:py-4 space-y-5">

          {/* ═══ BILL TO + INVOICE INFO ═══ */}
          <div className="grid grid-cols-2 gap-0 border border-slate-300 rounded-lg overflow-hidden">
            {/* Left: Bill To */}
            <div className="p-4 bg-slate-50 border-r border-slate-300">
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-2">Bill To / {'\u0641\u0627\u062a\u0648\u0631\u0629 \u0625\u0644\u0649'}</p>
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
            <div className="p-4">
              <div className="space-y-1.5 text-[10px]">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Invoice No / {'\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629'}</span>
                  <span className="font-bold font-mono text-emerald-800">{invoice.invoiceNo || (invoice as any).invoiceNumber}</span>
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
          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <div className="bg-slate-100 px-4 py-1.5 border-b border-slate-300">
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
              <tr className="bg-emerald-700 text-white">
                <th className="border border-emerald-800 px-2 py-2 text-center w-8 font-bold">No<br /><span className="font-normal opacity-80" dir="rtl">{'\u0631\u0642\u0645'}</span></th>
                <th className="border border-emerald-800 px-2 py-2 text-left font-bold">Services / Description<br /><span className="font-normal opacity-80" dir="rtl">{'\u062e\u062f\u0645\u0627\u062a / \u0648\u0635\u0641'}</span></th>
                <th className="border border-emerald-800 px-2 py-2 text-right w-20 font-bold">Amount<br /><span className="font-normal opacity-80" dir="rtl">{'\u0627\u0644\u0645\u0628\u0644\u063a'}</span></th>
                <th className="border border-emerald-800 px-2 py-2 text-center w-12 font-bold">VAT%<br /><span className="font-normal opacity-80" dir="rtl">{'\u0636\u0631\u064a\u0628\u0629'}</span></th>
                <th className="border border-emerald-800 px-2 py-2 text-right w-20 font-bold">VAT Amt<br /><span className="font-normal opacity-80" dir="rtl">{'\u0642\u064a\u0645\u0629 \u0627\u0644\u0636\u0631\u064a\u0628\u0629'}</span></th>
                <th className="border border-emerald-800 px-2 py-2 text-right w-24 font-bold">Total (SAR)<br /><span className="font-normal opacity-80" dir="rtl">{'\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a'}</span></th>
              </tr>
            </thead>
            <tbody>
              {normalizedItems.map((item: any, i: number) => (
                <tr key={item.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
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
              {/* Empty rows padding to fill space */}
              {normalizedItems.length < 5 && Array.from({ length: 5 - normalizedItems.length }).map((_, i) => (
                <tr key={`empty-${i}`} className={(normalizedItems.length + i) % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
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
            <div className="w-[320px] border border-slate-300 rounded-lg overflow-hidden text-[10px]">
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
              <div className="flex justify-between px-4 py-2.5 bg-emerald-700 text-white font-bold">
                <span>Total Amount (SAR) {'\u0625\u062c\u0645\u0627\u0644\u064a'}</span>
                <span className="font-mono text-base">{fmtNum(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* ═══ PAYMENT STATUS ═══ */}
          {((invoice.paidAmount || 0) > 0 || (invoice.dueAmount || 0) > 0) && (
            <div className="flex justify-end">
              <div className="w-[320px] border border-slate-200 rounded-lg overflow-hidden text-[10px]">
                <div className="flex justify-between px-4 py-1.5 bg-emerald-50 text-emerald-800">
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
                <div key={idx} className="border border-slate-300 rounded-lg p-3 text-center">
                  <p className="text-[10px] font-bold text-emerald-700 mb-1.5 uppercase tracking-wider">Bank Details / {'\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0628\u0646\u0643'}</p>
                  <div className="text-[9px] text-slate-700 space-y-0.5">
                    <p className="font-bold">{bank.bankName || ''}</p>
                    <p className="text-slate-600">{companyInfo.name}</p>
                    {bank.accountNumber && <p>A/C No: <span className="font-mono">{bank.accountNumber}</span></p>}
                    {bank.ibanNumber && <p>IBAN: <span className="font-mono font-semibold">{bank.ibanNumber}</span></p>}
                    {bank.swiftCode && <p>SWIFT: <span className="font-mono">{bank.swiftCode}</span></p>}
                    {bank.branchName && <p>Branch: {bank.branchName}</p>}
                    {(bank.balance !== undefined && bank.balance !== null) && (
                      <p className="mt-1 font-bold text-emerald-700">Balance: <span className="font-mono">SAR {Number(bank.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
                    )}
                    {(bank.currentBalance !== undefined && bank.currentBalance !== null) && !bank.balance && (
                      <p className="mt-1 font-bold text-emerald-700">Balance: <span className="font-mono">SAR {Number(bank.currentBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ FOOTER: ZATCA QR + SIGNATURES ═══ */}
          <div className="border-t-2 border-emerald-700 pt-4 mt-3">
            <div className="flex items-end justify-between gap-6">
              {/* QR Code + ZATCA info */}
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
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-bold">
                    <Shield className="h-3.5 w-3.5" />
                    ZATCA Phase 2 Compliant
                  </div>
                  <p className="text-[9px] text-slate-500">
                    Status: <span className={invoice.zatcaStatus === 'Synced With Zatca' ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>{invoice.zatcaStatus}</span>
                  </p>
                  {invoice.zatca?.uuid && <p className="text-[7px] font-mono text-slate-400">UUID: {invoice.zatca.uuid}</p>}
                </div>
              </div>

              {/* Signature Areas */}
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

          {/* ═══ VERY BOTTOM: Company address & system note ═══ */}
          <div className="text-center space-y-0.5 pt-2">
            <p className="text-[9px] text-slate-500 font-semibold">{companyInfo.name} | {companyInfo.address}, {companyInfo.city}, {companyInfo.country}</p>
            <p className="text-[8px] text-slate-400">This is a system-generated tax invoice. E-invoice compliant with ZATCA regulations.</p>
            <p className="text-[7px] font-mono text-slate-300">Generated: {new Date().toISOString().split('T')[0]}</p>
          </div>
        </div>

        {/* ═══ BOTTOM DECORATIVE BAR ═══ */}
        <div className="h-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700" />
      </div>
    </div>
  );
};

export default SalesInvoicePreview;
