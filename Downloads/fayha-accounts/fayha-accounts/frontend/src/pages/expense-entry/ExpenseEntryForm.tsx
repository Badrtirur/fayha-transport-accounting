import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import type { JobReference } from '../../types';
import { expenseEntriesApi, vendorsApi, customersApi, jobReferencesApi, accountsApi, banksApi } from '../../services/api';
import SearchableSelect from '../../components/common/SearchableSelect';

const ExpenseEntryForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id && id !== 'new');
  const queryJobRefId = searchParams.get('jobRefId') || '';

  // Dropdown data
  const [customerOptions, setCustomerOptions] = useState<{ value: string; label: string }[]>([]);
  const [vendorOptions, setVendorOptions] = useState<{ value: string; label: string }[]>([]);
  const [jobRefOptions, setJobRefOptions] = useState<{ value: string; label: string }[]>([]);
  const [allJobRefs, setAllJobRefs] = useState<JobReference[]>([]);
  const [accountOptions, setAccountOptions] = useState<{ value: string; label: string }[]>([]);
  const [bankOptions, setBankOptions] = useState<{ value: string; label: string }[]>([]);

  // Form state
  const [entryNo, setEntryNo] = useState('Auto-generated');
  const [date, setDate] = useState('');
  const [clientId, setClientId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [vatRequired, setVatRequired] = useState(true);
  const [vatPercent, setVatPercent] = useState<number>(15);
  const [vatAmount, setVatAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [jobRefId, setJobRefId] = useState('');
  const [receiptNo, setReceiptNo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [bankAccountId, setBankAccountId] = useState('');
  const [category, setCategory] = useState('');

  // Calculate totals
  const totalAmount = amount + vatAmount;

  useEffect(() => {
    Promise.all([
      customersApi.getAll(),
      vendorsApi.getAll(),
      jobReferencesApi.getAll(),
      accountsApi.getAll(),
      banksApi.getAll(),
    ]).then(([customerData, clientData, jrData, accountData, bankData]) => {
      const customerList = Array.isArray(customerData) ? customerData : [];
      const clientList = Array.isArray(clientData) ? clientData : [];
      const jrList = Array.isArray(jrData) ? jrData : [];
      const accounts = Array.isArray(accountData) ? accountData : [];
      const banks = Array.isArray(bankData) ? bankData : [];

      setCustomerOptions(customerList.map((c: any) => ({ value: c.id, label: c.name })));
      setVendorOptions(clientList.map((c: any) => ({ value: c.id, label: c.name })));
      setAllJobRefs(jrList);
      setJobRefOptions(jrList.map((j: any) => ({ value: j.id, label: j.jobRefNo || j.jobNumber || j.id })));
      setAccountOptions(accounts.map((a: any) => ({
        value: a.id,
        label: `[${a.code}] ${a.name}`,
      })));
      setBankOptions(banks.map((b: any) => ({
        value: b.id,
        label: `${b.bankName} - ${b.accountNumber || b.accountName || ''}`,
      })));
    }).catch((err) => {
      console.error('Failed to load dropdown data:', err);
    });
  }, []);

  // Load existing entry for edit mode
  useEffect(() => {
    if (isEdit && id) {
      expenseEntriesApi.getById(id).then((entry: any) => {
        if (entry) {
          setEntryNo(entry.expenseNumber || entry.entryNo || '');
          setDate(entry.date ? entry.date.slice(0, 10) : '');
          setClientId(entry.clientId || '');
          setVendorId(entry.vendorId || '');
          setAccountId(entry.accountId || '');
          setAmount(entry.amount || 0);
          const entryVat = entry.vatAmount || 0;
          setVatAmount(entryVat);
          if (entryVat > 0 && entry.amount > 0) {
            setVatRequired(true);
            setVatPercent(Math.round((entryVat / entry.amount) * 100 * 100) / 100);
          } else {
            setVatRequired(entryVat > 0);
            setVatPercent(15);
          }
          setDescription(entry.description || '');
          setJobRefId(entry.jobRefId || '');
          setReceiptNo(entry.reference || entry.receiptNo || '');
          setPaymentMethod(entry.paymentMethod || 'Cash');
          setBankAccountId(entry.bankAccountId || '');
          setCategory(entry.category || '');
        }
      }).catch((err: any) => {
        console.error('Failed to load expense entry:', err);
      });
    } else if (queryJobRefId) {
      // Pre-fill jobRefId from URL query param (e.g., from Job Reference list)
      setJobRefId(queryJobRefId);
    }
  }, [isEdit, id, queryJobRefId]);

  // Filter job refs by selected customer or vendor
  useEffect(() => {
    const filterBy = clientId || vendorId;
    if (filterBy) {
      const filtered = allJobRefs.filter((j: any) => j.clientId === filterBy);
      if (filtered.length > 0) {
        setJobRefOptions(filtered.map((j: any) => ({ value: j.id, label: j.jobRefNo || j.jobNumber || j.id })));
      } else {
        setJobRefOptions(allJobRefs.map((j: any) => ({ value: j.id, label: j.jobRefNo || j.jobNumber || j.id })));
      }
    } else {
      setJobRefOptions(allJobRefs.map((j: any) => ({ value: j.id, label: j.jobRefNo || j.jobNumber || j.id })));
    }
  }, [clientId, vendorId, allJobRefs]);

  // Auto-calculate VAT when amount or vatPercent changes
  const recalcVat = (amt: number, pct: number, required: boolean) => {
    setVatAmount(required ? Math.round(amt * (pct / 100) * 100) / 100 : 0);
  };
  const handleAmountChange = (val: number) => {
    setAmount(val);
    recalcVat(val, vatPercent, vatRequired);
  };

  const handleSubmit = async () => {
    if (!date) {
      toast.error('Please select a date.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }
    if (!accountId) {
      toast.error('Please select an expense account.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }
    if (!amount || amount <= 0) {
      toast.error('Amount must be greater than zero.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }
    if ((paymentMethod === 'Bank' || paymentMethod === 'Cheque') && !bankAccountId) {
      toast.error('Please select a bank account for bank/cheque payments.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }
    try {
      const payload: any = {
        date: new Date(date).toISOString(),
        clientId: clientId || undefined,
        vendorId: vendorId || undefined,
        accountId,
        amount,
        vatAmount,
        totalAmount,
        paymentMethod,
        bankAccountId: (paymentMethod === 'Bank' || paymentMethod === 'Cheque') ? bankAccountId : undefined,
        category: category || undefined,
        description: description || undefined,
        reference: receiptNo || undefined,
        jobRefId: jobRefId || undefined,
        status: 'PENDING',
      };

      if (isEdit && id) {
        await expenseEntriesApi.update(id, payload);
      } else {
        await expenseEntriesApi.create(payload);
      }
      toast.success(`Expense entry ${isEdit ? 'updated' : 'created'} successfully!`, {
        style: { borderRadius: '12px', background: '#10b981', color: '#fff' },
      });
      navigate(-1);
    } catch (error) {
      toast.error('Failed to save expense entry. Please try again.', {
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isEdit ? 'Edit Expense Entry' : 'Add Expense Entry'}
          </h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            {isEdit ? 'Update the expense entry details below.' : 'Create a new expense entry for tracking.'}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="card-premium p-6 space-y-6">
        {/* Row 1: Entry No, Date (2 col) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Entry No
            </label>
            <input
              type="text"
              value={entryNo}
              readOnly
              className="input-premium w-full bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Date<span className="text-rose-500 ml-0.5">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-premium w-full pr-10"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Row 2: Customer, Vendor, Account (dynamic from API) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SearchableSelect
            label="Customer"
            options={customerOptions}
            value={clientId}
            onChange={setClientId}
            placeholder="Search customer..."
          />
          <SearchableSelect
            label="Vendor"
            options={vendorOptions}
            value={vendorId}
            onChange={setVendorId}
            placeholder="Search vendor..."
          />
          <SearchableSelect
            label="Expense Account"
            required
            options={accountOptions}
            value={accountId}
            onChange={setAccountId}
            placeholder="Select account..."
          />
        </div>

        {/* Row 3: Amount, VAT Required, VAT %, VAT Amount, Total */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Amount (SAR)<span className="text-rose-500 ml-0.5">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount || ''}
              onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="input-premium w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              VAT Required<span className="text-rose-500 ml-0.5">*</span>
            </label>
            <select
              value={vatRequired ? 'Yes' : 'No'}
              onChange={(e) => {
                const required = e.target.value === 'Yes';
                setVatRequired(required);
                recalcVat(amount, vatPercent, required);
              }}
              className="input-premium w-full"
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          {vatRequired && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                VAT %<span className="text-rose-500 ml-0.5">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={vatPercent || ''}
                onChange={(e) => {
                  const pct = parseFloat(e.target.value) || 0;
                  setVatPercent(pct);
                  recalcVat(amount, pct, true);
                }}
                placeholder="15"
                className="input-premium w-full"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              VAT Amount
            </label>
            <input
              type="text"
              value={vatAmount.toFixed(2)}
              readOnly
              className="input-premium w-full bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Total Amount (SAR)
            </label>
            <input
              type="text"
              value={totalAmount.toFixed(2)}
              readOnly
              className="input-premium w-full bg-slate-50 text-slate-700 font-bold cursor-not-allowed"
            />
          </div>
        </div>

        {/* Row 4: Payment Method, Bank Account, Receipt No (3 col) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Payment Method<span className="text-rose-500 ml-0.5">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="input-premium w-full"
            >
              <option value="Cash">Cash</option>
              <option value="Bank">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>
          {paymentMethod === 'Bank' || paymentMethod === 'Cheque' ? (
            <SearchableSelect
              label="Bank Account"
              required
              options={bankOptions}
              value={bankAccountId}
              onChange={setBankAccountId}
              placeholder="Select bank account..."
            />
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Customs, Transport"
                className="input-premium w-full"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Receipt No</label>
            <input
              type="text"
              value={receiptNo}
              onChange={(e) => setReceiptNo(e.target.value)}
              placeholder="e.g. RCT-2026-0109"
              className="input-premium w-full"
            />
          </div>
        </div>

        {/* Row 5: Job Ref (searchable) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SearchableSelect
            label="Job Reference"
            options={jobRefOptions}
            value={jobRefId}
            onChange={setJobRefId}
            placeholder="Search job ref..."
          />
        </div>

        {/* Row 6: Description (full width) */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter expense description..."
            rows={3}
            className="input-premium w-full resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="btn-primary"
          >
            {isEdit ? 'Update' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseEntryForm;
