import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Receipt,
  Building2,
  FileText,
} from 'lucide-react';
import type { PaymentMethodType } from '../../types';
import type { JobReference } from '../../types';
import { customersApi, jobReferencesApi, paymentEntriesApi, accountsApi, salesInvoicesApi, clientAdvancesApi } from '../../services/api';
import SearchableSelect from '../../components/common/SearchableSelect';
import BalanceBar from '../../components/common/BalanceBar';


interface FormLine {
  id: string;
  paymentStatus: string;
  accountId: string;
  crAmount: number;
  drAmount: number;
}

let lineCounter = 1;
const generateLineId = (): string => `line-${Date.now()}-${lineCounter++}`;

const fmtSAR = (n: number) => `SAR ${n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PaymentEntryForm: React.FC = () => {
  const navigate = useNavigate();

  // Dropdown options
  const [clientOptions, setClientOptions] = useState<{ value: string; label: string }[]>([]);
  const [jobRefOptions, setJobRefOptions] = useState<{ value: string; label: string }[]>([]);
  const [allJobRefs, setAllJobRefs] = useState<JobReference[]>([]);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [ledgerOptions, setLedgerOptions] = useState<{ value: string; label: string }[]>([]);
  const [operationAccounts, setOperationAccounts] = useState<{ value: string; label: string }[]>([]);
  const [invoiceOptions, setInvoiceOptions] = useState<{ value: string; label: string }[]>([]);
  const [costOptions, setCostOptions] = useState<{ value: string; label: string }[]>([]);
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [existingPayments, setExistingPayments] = useState<any[]>([]);

  // Form state
  const [clientId, setClientId] = useState('');
  const [jobRefId, setJobRefId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [costItemIds, setCostItemIds] = useState<string[]>([]);
  const [documentDate, setDocumentDate] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [method, setMethod] = useState<PaymentMethodType>('Cash');
  const entryType = 'Receipt';
  const [ledgerAccountId, setLedgerAccountId] = useState('');
  const [lines, setLines] = useState<FormLine[]>([
    { id: generateLineId(), paymentStatus: '', accountId: '', crAmount: 0, drAmount: 0 },
  ]);

  // Advance state
  const [clientAdvances, setClientAdvances] = useState<any[]>([]);
  const [advanceTotalAvailable, setAdvanceTotalAvailable] = useState(0);
  const [applyAdvance, setApplyAdvance] = useState(false);
  const [advanceApplyAmount, setAdvanceApplyAmount] = useState(0);

  // Load all dropdown data
  useEffect(() => {
    Promise.all([
      customersApi.getAll(),
      jobReferencesApi.getAll(),
      accountsApi.getAll(),
      salesInvoicesApi.getAll(),
      paymentEntriesApi.getAll().catch(() => []),
    ]).then(([clientList, jrList, accountList, invoiceList, peList]) => {
      // Existing payment entries (to check duplicates)
      setExistingPayments(Array.isArray(peList) ? peList : []);
      // Clients
      const clients = Array.isArray(clientList) ? clientList : [];
      setAllClients(clients);
      setClientOptions(clients.map((c: any) => ({ value: c.id, label: c.name })));

      // Job References
      const jrs = Array.isArray(jrList) ? jrList : [];
      setAllJobRefs(jrs);
      setJobRefOptions(jrs.map((j: any) => ({ value: j.id, label: `${j.jobRefNo || j.jobNumber || j.id} — [${j.status || 'N/A'}]` })));

      // Accounts — split into ledger accounts and operation accounts
      const accounts = Array.isArray(accountList) ? accountList : [];
      const allAccOpts = accounts.map((a: any) => ({
        value: a.id,
        label: `[${a.code}] ${a.name}${a.type ? ' - (' + a.type + ')' : ''}`,
      }));
      setLedgerOptions(allAccOpts);
      setOperationAccounts(allAccOpts);

      // Sales Invoices
      const invs = Array.isArray(invoiceList) ? invoiceList : [];
      setAllInvoices(invs);
      setInvoiceOptions(invs.map((inv: any) => ({
        value: inv.id,
        label: inv.invoiceNumber || inv.id,
      })));
    }).catch((err) => {
      console.error('Failed to load dropdown data:', err);
    });
  }, []);

  // Set of invoice IDs that already have a payment entry — exclude from dropdown
  const paidInvoiceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const pe of existingPayments) {
      if (pe.invoiceId) ids.add(pe.invoiceId);
      if (pe.meta?.invoiceId) ids.add(pe.meta.invoiceId);
    }
    return ids;
  }, [existingPayments]);

  // Filter job refs by selected client — exclude jobs whose invoices are all fully paid
  useEffect(() => {
    const formatJR = (j: any) => {
      const refNo = j.jobRefNo || j.jobNumber || j.id;
      // Show invoice total amount in dropdown for quick reference
      const jobInvs = allInvoices.filter((inv: any) => inv.jobReferenceId === j.id);
      const totalDue = jobInvs.reduce((s: number, inv: any) => s + (inv.balanceDue ?? inv.totalAmount ?? 0), 0);
      const totalAmount = jobInvs.reduce((s: number, inv: any) => s + (inv.totalAmount ?? 0), 0);
      const amountLabel = jobInvs.length > 0
        ? ` — ${fmtSAR(totalAmount)}${totalDue > 0 && totalDue !== totalAmount ? ` (Due: ${fmtSAR(totalDue)})` : ''}`
        : '';
      return { value: j.id, label: `${refNo} — [${j.status || 'N/A'}]${amountLabel}` };
    };
    // A job should be hidden if ALL its invoices are PAID and have payment entries
    const hasUnpaidInvoice = (j: any) => {
      const jobInvs = allInvoices.filter((inv: any) => inv.jobReferenceId === j.id);
      if (jobInvs.length === 0) return true; // no invoices yet — still show
      return jobInvs.some((inv: any) => inv.status !== 'PAID' && !paidInvoiceIds.has(inv.id));
    };
    if (clientId) {
      const filtered = allJobRefs
        .filter((j: any) => j.clientId === clientId)
        .filter(hasUnpaidInvoice);
      setJobRefOptions(filtered.map(formatJR));
      // Reset child selections when client changes
      setJobRefId('');
      setInvoiceId('');
      setCostItemIds([]);
    } else {
      setJobRefOptions(allJobRefs.filter(hasUnpaidInvoice).map(formatJR));
    }
  }, [clientId, allInvoices, paidInvoiceIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch client advances when client changes
  useEffect(() => {
    setApplyAdvance(false);
    setAdvanceApplyAmount(0);
    if (clientId) {
      clientAdvancesApi.getByClient(clientId).then((result: any) => {
        setClientAdvances(result.advances || []);
        setAdvanceTotalAvailable(result.totalAvailable || 0);
      }).catch(() => {
        setClientAdvances([]);
        setAdvanceTotalAvailable(0);
      });
    } else {
      setClientAdvances([]);
      setAdvanceTotalAvailable(0);
    }
  }, [clientId]);

  // Auto-detect invoice from job ref — auto-select invoice + all cost items
  useEffect(() => {
    if (!jobRefId) {
      setInvoiceId('');
      setCostItemIds([]);
      setInvoiceOptions([]);
      setCostOptions([]);
      return;
    }

    const isPayable = (inv: any) =>
      !paidInvoiceIds.has(inv.id) &&
      (inv.status === 'INVOICED' || inv.status === 'PARTIAL');

    const jobInvoices = allInvoices
      .filter((inv: any) => inv.jobReferenceId === jobRefId)
      .filter(isPayable);

    if (jobInvoices.length === 0) {
      // Fallback: show client invoices if job has none
      const clientInvs = clientId
        ? allInvoices.filter((inv: any) => inv.clientId === clientId).filter(isPayable)
        : [];
      setInvoiceOptions(clientInvs.map((inv: any) => ({
        value: inv.id,
        label: `${inv.invoiceNumber || inv.id} — ${inv.status} — SAR ${((inv.balanceDue ?? inv.totalAmount) || 0).toLocaleString('en', { minimumFractionDigits: 2 })}`,
      })));
      setInvoiceId('');
      setCostItemIds([]);
      return;
    }

    // Auto-select the first unpaid invoice for this job
    const autoInv = jobInvoices[0];
    setInvoiceId(autoInv.id);
    setInvoiceOptions(jobInvoices.map((inv: any) => ({
      value: inv.id,
      label: `${inv.invoiceNumber || inv.id} — ${inv.status} — SAR ${((inv.balanceDue ?? inv.totalAmount) || 0).toLocaleString('en', { minimumFractionDigits: 2 })}`,
    })));

    // Auto-select ALL cost items from the invoice
    const items = autoInv.items || [];
    if (items.length > 0) {
      setCostOptions(items.map((item: any) => ({
        value: item.id,
        label: `${item.nameEn || item.description || 'Service'} — ${fmtSAR(item.totalAmount || item.amount || 0)}`,
      })));
      setCostItemIds(items.map((item: any) => item.id));
    } else {
      setCostOptions([{
        value: autoInv.id,
        label: `${autoInv.invoiceNumber || autoInv.id} — ${fmtSAR(autoInv.totalAmount || 0)}`,
      }]);
      setCostItemIds([autoInv.id]);
    }
  }, [jobRefId, clientId, allInvoices, paidInvoiceIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // When invoice changes (user manually switches between multiple invoices for a job)
  // rebuild cost items and auto-select all
  const handleInvoiceChange = (newInvoiceId: string) => {
    setInvoiceId(newInvoiceId);
    if (!newInvoiceId) {
      setCostOptions([]);
      setCostItemIds([]);
      return;
    }
    const inv = allInvoices.find((i: any) => i.id === newInvoiceId);
    const items = inv?.items || [];
    if (items.length > 0) {
      setCostOptions(items.map((item: any) => ({
        value: item.id,
        label: `${item.nameEn || item.description || 'Service'} — ${fmtSAR(item.totalAmount || item.amount || 0)}`,
      })));
      setCostItemIds(items.map((item: any) => item.id));
    } else {
      setCostOptions([{
        value: inv?.id || newInvoiceId,
        label: `${inv?.invoiceNumber || newInvoiceId} — ${fmtSAR(inv?.totalAmount || 0)}`,
      }]);
      setCostItemIds([inv?.id || newInvoiceId]);
    }
  };

  // ── Derived: selected invoice object, selected cost items, totals ──
  const selectedInvoice = useMemo(
    () => allInvoices.find((i: any) => i.id === invoiceId),
    [invoiceId, allInvoices]
  );

  const selectedClient = useMemo(
    () => allClients.find((c: any) => c.id === clientId),
    [clientId, allClients]
  );

  const selectedJobRef = useMemo(
    () => allJobRefs.find((j: any) => j.id === jobRefId),
    [jobRefId, allJobRefs]
  );

  // Compute selected cost items with amounts
  const selectedCostDetails = useMemo(() => {
    if (!selectedInvoice || costItemIds.length === 0) return [];
    const items = selectedInvoice.items || [];
    const selectedSet = new Set(costItemIds);
    // If item IDs match invoice line items
    const matched = items.filter((it: any) => selectedSet.has(it.id));
    if (matched.length > 0) return matched;
    // Fallback: if costItemId is the invoice id itself
    if (selectedSet.has(selectedInvoice.id)) {
      return [{ id: selectedInvoice.id, nameEn: selectedInvoice.invoiceNumber, totalAmount: selectedInvoice.totalAmount, amount: selectedInvoice.totalAmount, vatAmount: selectedInvoice.vatAmount || 0 }];
    }
    return [];
  }, [selectedInvoice, costItemIds]);

  const selectedCostTotal = useMemo(
    () => selectedCostDetails.reduce((s: number, it: any) => s + (it.totalAmount || it.amount || 0), 0),
    [selectedCostDetails]
  );

  const invoiceTotal = selectedInvoice?.totalAmount || 0;
  const isFullPayment = costOptions.length > 0 && costItemIds.length === costOptions.length;
  const alreadyPaid = selectedInvoice?.paidAmount || 0;
  const balanceDue = selectedInvoice?.balanceDue ?? (invoiceTotal - alreadyPaid);

  // Check if this invoice already has a payment entry
  const existingPaymentForInvoice = useMemo(() => {
    if (!invoiceId) return null;
    return existingPayments.find((pe: any) => {
      // Check meta.invoiceId or jobRefId match
      if (pe.invoiceId === invoiceId) return true;
      if (pe.meta?.invoiceId === invoiceId) return true;
      return false;
    }) || null;
  }, [invoiceId, existingPayments]);

  // Find Accounts Receivable account for double-entry
  const arAccount = useMemo(() => {
    return ledgerOptions.find(a =>
      a.label.toLowerCase().includes('receivable') ||
      a.label.toLowerCase().includes('trade receivable')
    ) || null;
  }, [ledgerOptions]);

  // Compute the net cash amount after advance
  const netCashAmount = useMemo(() => {
    if (applyAdvance && advanceApplyAmount > 0) {
      return Math.max(0, selectedCostTotal - advanceApplyAmount);
    }
    return selectedCostTotal;
  }, [selectedCostTotal, applyAdvance, advanceApplyAmount]);

  // ── Auto-populate payment lines: DR Bank/Cash, CR Accounts Receivable ──
  useEffect(() => {
    if (selectedCostDetails.length === 0 || selectedCostTotal === 0) return;
    if (!ledgerAccountId) return;

    const bankLabel = ledgerOptions.find(a => a.value === ledgerAccountId)?.label || 'Bank/Cash';
    const arLabel = arAccount?.label || 'Accounts Receivable';
    const arId = arAccount?.value || '';

    const newLines: FormLine[] = [
      {
        id: generateLineId(),
        paymentStatus: `DR: ${bankLabel}`,
        accountId: ledgerAccountId,
        crAmount: 0,
        drAmount: netCashAmount,
      },
      {
        id: generateLineId(),
        paymentStatus: `CR: ${arLabel}`,
        accountId: arId,
        crAmount: selectedCostTotal,
        drAmount: 0,
      },
    ];

    // If advance is applied, add a 3rd line: DR Advance Liability
    if (applyAdvance && advanceApplyAmount > 0) {
      const advLiabilityAcc = ledgerOptions.find(a =>
        a.label.toLowerCase().includes('advance') ||
        a.label.toLowerCase().includes('customer deposit')
      );
      newLines.splice(1, 0, {
        id: generateLineId(),
        paymentStatus: `DR: ${advLiabilityAcc?.label || 'Client Advance Liability'}`,
        accountId: advLiabilityAcc?.value || '',
        crAmount: 0,
        drAmount: advanceApplyAmount,
      });
    }

    setLines(newLines);
  }, [selectedCostTotal, netCashAmount, ledgerAccountId, applyAdvance, advanceApplyAmount]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalCr = lines.reduce((sum, l) => sum + (l.crAmount || 0), 0);
  const totalDr = lines.reduce((sum, l) => sum + (l.drAmount || 0), 0);

  const handleLineChange = (id: string, field: keyof FormLine, value: string | number) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { id: generateLineId(), paymentStatus: '', accountId: '', crAmount: 0, drAmount: 0 },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleSubmit = async () => {
    if (!clientId || !jobRefId || !documentDate) {
      toast.error('Please fill in all required fields (Client, Job Ref, Date).', {
        style: { borderRadius: '12px', background: '#ef4444', color: '#fff' },
      });
      return;
    }
    if (!ledgerAccountId) {
      toast.error('Please select a Ledger Account (Bank/Cash).', {
        style: { borderRadius: '12px', background: '#ef4444', color: '#fff' },
      });
      return;
    }
    if (existingPaymentForInvoice) {
      toast.error(`A payment entry already exists for this invoice (${existingPaymentForInvoice.documentId || existingPaymentForInvoice.id}). Cannot create duplicate.`, {
        style: { borderRadius: '12px', background: '#ef4444', color: '#fff' },
        duration: 5000,
      });
      return;
    }
    if (Math.abs(totalCr - totalDr) > 0.01) {
      toast.error('Debit and Credit must be equal (Dr = Cr).', {
        style: { borderRadius: '12px', background: '#ef4444', color: '#fff' },
      });
      return;
    }
    try {
      // Build appliedAdvances array by distributing the amount across advances
      let appliedAdvancesPayload: { advanceId: string; amount: number }[] | undefined;
      if (applyAdvance && advanceApplyAmount > 0 && clientAdvances.length > 0) {
        appliedAdvancesPayload = [];
        let remaining = advanceApplyAmount;
        for (const adv of clientAdvances) {
          if (remaining <= 0) break;
          const use = Math.min(remaining, adv.remainingAmount || 0);
          if (use > 0) {
            appliedAdvancesPayload.push({ advanceId: adv.id, amount: use });
            remaining -= use;
          }
        }
      }

      await paymentEntriesApi.create({
        clientId,
        jobRefId,
        invoiceId,
        costItemIds: costItemIds.length > 0 ? costItemIds : undefined,
        documentDate,
        documentNumber,
        method,
        entryType,
        ledgerAccountId,
        lines: lines.map((l) => ({
          paymentStatus: l.paymentStatus,
          accountId: l.accountId || undefined,
          crAmount: l.crAmount,
          drAmount: l.drAmount,
        })),
        totalCr,
        totalDr,
        appliedAdvances: appliedAdvancesPayload,
      });
      toast.success('Payment entry created successfully!', {
        style: { borderRadius: '12px', background: '#10b981', color: '#fff' },
      });
      navigate(-1);
    } catch {
      toast.error('Failed to create payment entry.', {
        style: { borderRadius: '12px', background: '#ef4444', color: '#fff' },
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Add Payment Entry</h1>
          <p className="text-slate-500 mt-0.5 text-sm">Create a new payment entry.</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="card-premium p-6 space-y-6">
        {/* Row 1: Client, Job Ref (2-col) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SearchableSelect
            label="Client"
            required
            options={clientOptions}
            value={clientId}
            onChange={setClientId}
            placeholder="Search client..."
          />
          <SearchableSelect
            label="Job ID / Job Ref."
            required
            options={jobRefOptions}
            value={jobRefId}
            onChange={setJobRefId}
            placeholder={clientId ? 'Select job reference...' : 'Select client first...'}
          />
        </div>

        {/* Advance Balance Panel */}
        {clientId && advanceTotalAvailable > 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">A</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-800">
                    Client has {fmtSAR(advanceTotalAvailable)} advance balance available
                  </p>
                  <p className="text-xs text-emerald-600">
                    {clientAdvances.length} active advance{clientAdvances.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyAdvance}
                  onChange={(e) => {
                    setApplyAdvance(e.target.checked);
                    if (e.target.checked) {
                      setAdvanceApplyAmount(Math.min(advanceTotalAvailable, selectedCostTotal || 0));
                    } else {
                      setAdvanceApplyAmount(0);
                    }
                  }}
                  className="w-4 h-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-semibold text-emerald-700">Apply Advance</span>
              </label>
            </div>
            {applyAdvance && (
              <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-emerald-200">
                <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Amount to Apply:</label>
                <input
                  type="number"
                  min="0"
                  max={Math.min(advanceTotalAvailable, selectedCostTotal || advanceTotalAvailable)}
                  step="0.01"
                  value={advanceApplyAmount || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setAdvanceApplyAmount(Math.min(val, advanceTotalAvailable, selectedCostTotal || advanceTotalAvailable));
                  }}
                  className="input-premium w-40 text-sm font-semibold"
                />
                <span className="text-xs text-slate-500">of {fmtSAR(advanceTotalAvailable)} available</span>
                {advanceApplyAmount > 0 && selectedCostTotal > 0 && (
                  <span className="text-xs font-semibold text-emerald-700 ml-auto">
                    Net Cash Payment: {fmtSAR(Math.max(0, selectedCostTotal - advanceApplyAmount))}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Auto-detected Invoice & Cost Items */}
        {jobRefId && invoiceId && selectedInvoice && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-bold text-blue-900">
                    Invoice: {selectedInvoice.invoiceNumber} — {fmtSAR(selectedInvoice.balanceDue ?? selectedInvoice.totalAmount ?? 0)} due
                  </p>
                  <p className="text-xs text-blue-600">
                    {costItemIds.length} cost item{costItemIds.length !== 1 ? 's' : ''} auto-selected | Status: {selectedInvoice.status}
                  </p>
                </div>
              </div>
              {invoiceOptions.length > 1 && (
                <div className="w-64">
                  <SearchableSelect
                    options={invoiceOptions}
                    value={invoiceId}
                    onChange={handleInvoiceChange}
                    placeholder="Switch invoice..."
                  />
                </div>
              )}
            </div>
          </div>
        )}
        {jobRefId && !invoiceId && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <p className="text-sm font-semibold text-amber-800">
                No unpaid invoice found for this job reference.
              </p>
            </div>
          </div>
        )}

        {/* ── Duplicate Warning ── */}
        {existingPaymentForInvoice && (
          <div className="flex items-center gap-3 px-5 py-3.5 bg-rose-50 border border-rose-200 rounded-xl">
            <AlertTriangle className="h-5 w-5 text-rose-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-rose-700">Payment Already Exists</p>
              <p className="text-xs text-rose-600">
                A payment entry <strong>{existingPaymentForInvoice.documentId || ''}</strong> already exists for this invoice
                {existingPaymentForInvoice.amount ? ` (SAR ${Number(existingPaymentForInvoice.amount).toLocaleString('en', { minimumFractionDigits: 2 })})` : ''}.
                You cannot create a duplicate payment for the same invoice.
              </p>
            </div>
          </div>
        )}

        {/* ── Invoice & Account Details Panel ── */}
        {selectedInvoice && (
          <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30 overflow-hidden">
            {/* Payment Status Badge */}
            {costItemIds.length > 0 && (
              <div className={`px-5 py-2.5 flex items-center gap-2 text-sm font-bold ${
                isFullPayment
                  ? 'bg-emerald-500 text-white'
                  : 'bg-amber-500 text-white'
              }`}>
                {isFullPayment ? (
                  <><CheckCircle2 className="h-4 w-4" /> Full Invoice Payment — All Items Selected</>
                ) : (
                  <><AlertCircle className="h-4 w-4" /> Partial Payment — {costItemIds.length} of {costOptions.length} Items Selected</>
                )}
              </div>
            )}

            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Client Details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <Building2 className="h-3.5 w-3.5" /> Client Details
                </div>
                <div className="bg-white rounded-lg p-3 border border-slate-100 space-y-1.5">
                  <p className="text-sm font-bold text-slate-900">{selectedClient?.name || '—'}</p>
                  {selectedClient?.vatNumber && (
                    <p className="text-xs text-slate-500">VAT: {selectedClient.vatNumber}</p>
                  )}
                  {selectedClient?.phone && (
                    <p className="text-xs text-slate-500">Tel: {selectedClient.phone}</p>
                  )}
                  {selectedClient?.email && (
                    <p className="text-xs text-slate-500">{selectedClient.email}</p>
                  )}
                  {(selectedJobRef as any)?.jobRefNo && (
                    <p className="text-xs text-blue-600 font-semibold">Job: {(selectedJobRef as any).jobRefNo || (selectedJobRef as any).jobNumber}</p>
                  )}
                </div>
              </div>

              {/* Invoice & Job Details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <FileText className="h-3.5 w-3.5" /> Invoice Details
                </div>
                <div className="bg-white rounded-lg p-3 border border-slate-100 space-y-1.5">
                  <p className="text-sm font-bold text-slate-900">{selectedInvoice.invoiceNumber}</p>
                  {selectedJobRef && (
                    <p className="text-xs text-blue-700 font-semibold">
                      Job Ref: {(selectedJobRef as any).jobRefNo || (selectedJobRef as any).jobNumber}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    Date: {selectedInvoice.invoiceDate ? new Date(selectedInvoice.invoiceDate).toLocaleDateString() : '—'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Status: <span className={`font-semibold ${selectedInvoice.status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>{selectedInvoice.status || 'DRAFT'}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Method: {selectedInvoice.saleMethod || '—'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Items: {(selectedInvoice.items || []).length} line items
                  </p>
                </div>
              </div>

              {/* Amount Summary */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <Receipt className="h-3.5 w-3.5" /> Amount Details
                </div>
                <div className="bg-white rounded-lg p-3 border border-slate-100 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Invoice Total</span>
                    <span className="font-bold text-slate-900">{fmtSAR(invoiceTotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Already Paid</span>
                    <span className="font-semibold text-emerald-600">{fmtSAR(alreadyPaid)}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-slate-100 pt-1.5">
                    <span className="text-slate-500">Balance Due</span>
                    <span className={`font-bold ${balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtSAR(balanceDue)}</span>
                  </div>
                  {costItemIds.length > 0 && (
                    <>
                      <div className="border-t border-dashed border-slate-200 pt-2 mt-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Selected Items ({costItemIds.length})</span>
                          <span className="font-bold text-blue-700">{fmtSAR(selectedCostTotal)}</span>
                        </div>
                      </div>
                      {applyAdvance && advanceApplyAmount > 0 && (
                        <>
                          <div className="flex justify-between text-xs">
                            <span className="text-emerald-600">Advance Applied</span>
                            <span className="font-bold text-emerald-600">- {fmtSAR(advanceApplyAmount)}</span>
                          </div>
                          <div className="flex justify-between text-xs border-t border-slate-100 pt-1">
                            <span className="text-slate-600 font-semibold">Net Cash Payment</span>
                            <span className="font-bold text-slate-900">{fmtSAR(Math.max(0, selectedCostTotal - advanceApplyAmount))}</span>
                          </div>
                        </>
                      )}
                      {isFullPayment && (
                        <div className="flex justify-between text-xs bg-emerald-50 -mx-3 -mb-3 px-3 py-2 rounded-b-lg border-t border-emerald-100">
                          <span className="font-bold text-emerald-700">Payment Amount</span>
                          <span className="font-bold text-emerald-700">{fmtSAR(selectedCostTotal)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Selected Cost Items Breakdown */}
            {selectedCostDetails.length > 0 && (
              <div className="px-5 pb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-1.5 font-semibold text-slate-500 uppercase tracking-wider">#</th>
                      <th className="text-left py-1.5 font-semibold text-slate-500 uppercase tracking-wider">Cost Item</th>
                      <th className="text-right py-1.5 font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                      <th className="text-right py-1.5 font-semibold text-slate-500 uppercase tracking-wider">VAT</th>
                      <th className="text-right py-1.5 font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCostDetails.map((item: any, idx: number) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="py-1.5 text-slate-400">{idx + 1}</td>
                        <td className="py-1.5 font-medium text-slate-800">{item.nameEn || item.description || 'Service'}</td>
                        <td className="py-1.5 text-right text-slate-700">{fmtSAR(item.amount || 0)}</td>
                        <td className="py-1.5 text-right text-amber-600">{fmtSAR(item.vatAmount || 0)}</td>
                        <td className="py-1.5 text-right font-bold text-slate-900">{fmtSAR(item.totalAmount || item.amount || 0)}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50">
                      <td colSpan={2} className="py-2 font-bold text-slate-700 text-right pr-4">
                        {isFullPayment ? 'FULL PAYMENT TOTAL' : 'SELECTED TOTAL'}
                      </td>
                      <td className="py-2 text-right font-bold text-slate-700">
                        {fmtSAR(selectedCostDetails.reduce((s: number, it: any) => s + (it.amount || 0), 0))}
                      </td>
                      <td className="py-2 text-right font-bold text-amber-600">
                        {fmtSAR(selectedCostDetails.reduce((s: number, it: any) => s + (it.vatAmount || 0), 0))}
                      </td>
                      <td className="py-2 text-right font-bold text-emerald-700">{fmtSAR(selectedCostTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Account Details — Journal Entry Preview */}
        {selectedCostTotal > 0 && ledgerAccountId && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider">
              <FileText className="h-3.5 w-3.5" />
              Account Details — Journal Entry Preview
            </div>
            <div className="bg-white rounded-lg border border-indigo-100 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-indigo-50/70">
                    <th className="text-left py-2 px-3 font-semibold text-indigo-600">Account</th>
                    <th className="text-right py-2 px-3 font-semibold text-indigo-600">Debit (DR)</th>
                    <th className="text-right py-2 px-3 font-semibold text-indigo-600">Credit (CR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-indigo-100">
                    <td className="py-2 px-3 font-medium text-slate-800">
                      {ledgerOptions.find(a => a.value === ledgerAccountId)?.label || 'Bank / Cash'}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700">{fmtSAR(netCashAmount)}</td>
                    <td className="py-2 px-3 text-right text-slate-300">—</td>
                  </tr>
                  {applyAdvance && advanceApplyAmount > 0 && (
                    <tr className="border-t border-indigo-100">
                      <td className="py-2 px-3 font-medium text-slate-800">Client Advance Liability</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700">{fmtSAR(advanceApplyAmount)}</td>
                      <td className="py-2 px-3 text-right text-slate-300">—</td>
                    </tr>
                  )}
                  <tr className="border-t border-indigo-100">
                    <td className="py-2 px-3 font-medium text-slate-800">
                      {arAccount?.label || 'Accounts Receivable'}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-300">—</td>
                    <td className="py-2 px-3 text-right font-bold text-rose-600">{fmtSAR(selectedCostTotal)}</td>
                  </tr>
                  <tr className="border-t-2 border-indigo-200 bg-indigo-50/50">
                    <td className="py-2 px-3 font-bold text-indigo-800">Total</td>
                    <td className="py-2 px-3 text-right font-bold text-indigo-800">{fmtSAR(netCashAmount + (applyAdvance ? advanceApplyAmount : 0))}</td>
                    <td className="py-2 px-3 text-right font-bold text-indigo-800">{fmtSAR(selectedCostTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-indigo-500">
              This journal entry will be auto-created when you submit the payment.
            </p>
          </div>
        )}

        {/* Row 3: Document Date, Document Number, Method, Entry Type (4-col) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Document Date<span className="text-rose-500 ml-0.5">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
                className="input-premium w-full pr-10"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Document Number</label>
            <input
              type="text"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder="Enter Document Number"
              className="input-premium w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethodType)}
              className="input-premium w-full"
            >
              <option value="Cash">Cash</option>
              <option value="Bank">Bank</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Entry Type</label>
            <input
              type="text"
              value="Payment"
              readOnly
              className="input-premium w-full bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Row 4: Ledger Account (full width) */}
        <div>
          <SearchableSelect
            label="Select Ledger For Accounting"
            required
            options={ledgerOptions}
            value={ledgerAccountId}
            onChange={setLedgerAccountId}
            placeholder="Search ledger account..."
          />
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-700">Payment Lines</h3>
            {selectedCostTotal > 0 && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Auto-filled: {fmtSAR(selectedCostTotal)}
              </span>
            )}
          </div>
        </div>

        {/* Payment Lines */}
        <div className="space-y-3">
          {/* Header row */}
          <div className="grid grid-cols-12 gap-3 px-1">
            <div className="col-span-5">
              <span className="text-xs font-semibold text-slate-500">
                Payment Status For Operation<span className="text-rose-500 ml-0.5">*</span>
              </span>
            </div>
            <div className="col-span-3">
              <span className="text-xs font-semibold text-slate-500">
                Cr Amount<span className="text-rose-500 ml-0.5">*</span>
              </span>
            </div>
            <div className="col-span-3">
              <span className="text-xs font-semibold text-slate-500">Dr Amount</span>
            </div>
            <div className="col-span-1" />
          </div>

          {/* Line rows */}
          {lines.map((line) => (
            <div key={line.id} className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-5">
                <SearchableSelect
                  options={operationAccounts}
                  value={line.accountId}
                  onChange={(val) => {
                    handleLineChange(line.id, 'accountId', val);
                    const acc = operationAccounts.find((a) => a.value === val);
                    if (acc) handleLineChange(line.id, 'paymentStatus', acc.label);
                  }}
                  placeholder="Select account..."
                />
              </div>
              <div className="col-span-3">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.crAmount || ''}
                  onChange={(e) => handleLineChange(line.id, 'crAmount', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="input-premium w-full text-sm font-semibold"
                />
              </div>
              <div className="col-span-3">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.drAmount || ''}
                  onChange={(e) => handleLineChange(line.id, 'drAmount', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="input-premium w-full text-sm font-semibold"
                />
              </div>
              <div className="col-span-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={addLine}
                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                  title="Add line"
                >
                  <Plus className="h-4 w-4" />
                </button>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                    title="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Balance Bar */}
        <BalanceBar totalCr={totalCr} totalDr={totalDr} />

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!!existingPaymentForInvoice}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentEntryForm;
