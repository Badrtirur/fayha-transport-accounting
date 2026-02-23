import React, { useEffect, useState } from 'react';
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Settings,
  Edit2,
  Trash2,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { ServiceGroup, InvoiceService } from '../../types';
import { invoiceServicesApi, jobCategoriesApi, accountsApi } from '../../services/api';
import Modal from '../../components/common/Modal';

interface ServiceFormData {
  name: string;
  nameAr: string;
  groupId: string;
  defaultAmount: number;
  vatRequired: boolean;
  defaultVatPercent: number;
  description: string;
  ledgerAccountId: string;
}

const emptyForm: ServiceFormData = {
  name: '',
  nameAr: '',
  groupId: '',
  defaultAmount: 0,
  vatRequired: true,
  defaultVatPercent: 15,
  description: '',
  ledgerAccountId: '',
};

const InvoiceServiceList: React.FC = () => {
  const [groups, setGroups] = useState<ServiceGroup[]>([]);
  const [services, setServices] = useState<InvoiceService[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<InvoiceService | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [groupsRaw, servicesRaw, accountsRaw] = await Promise.all([
        jobCategoriesApi.getAll(),
        invoiceServicesApi.getAll(),
        accountsApi.getAll(),
      ]);
      const accts = Array.isArray(accountsRaw) ? accountsRaw.filter((a: any) => a.isActive) : [];
      setAccounts(accts);
      const jobCategories: ServiceGroup[] = Array.isArray(groupsRaw) ? groupsRaw : [];
      const rawServices: any[] = Array.isArray(servicesRaw) ? servicesRaw : [];

      // Normalize backend fields to frontend shape
      // serviceGroup is a string name like "CLEARANCE", "TRANSPORT", etc.
      const serviceData: InvoiceService[] = rawServices.map((s: any) => ({
        ...s,
        name: s.nameEn || s.name || '',
        nameAr: s.nameAr || '',
        groupId: s.serviceGroup || s.groupId || '',
        defaultVatPercent: s.defaultVatPercent ?? (s.vatApplicable === false ? 0 : 15),
        defaultAmount: s.defaultAmount || 0,
        ledgerAccountId: s.ledgerAccountId || '',
        description: s.description || '',
      }));
      setServices(serviceData);

      // Build unified group list using serviceGroup string names
      // Each group uses its name as the id for consistent lookup
      const serviceGroupNames = new Set(rawServices.map((s: any) => s.serviceGroup).filter(Boolean));

      // Start with groups from actual services
      const allGroupMap = new Map<string, ServiceGroup>();
      serviceGroupNames.forEach((sg: string) => {
        // Check if a job category matches by name
        const matchingCat = jobCategories.find((g) => g.name === sg);
        allGroupMap.set(sg, {
          id: sg,
          name: sg,
          nameAr: matchingCat?.nameAr || '',
        } as ServiceGroup);
      });
      // Also add any job categories that don't have services yet
      jobCategories.forEach((g) => {
        if (!allGroupMap.has(g.name)) {
          allGroupMap.set(g.name, { id: g.name, name: g.name, nameAr: g.nameAr || '' } as ServiceGroup);
        }
      });
      const allGroups = Array.from(allGroupMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      setGroups(allGroups);
      // Expand all groups by default
      setExpandedGroups(new Set(allGroups.map((g) => g.id)));
    } catch (err) {
      console.error('Failed to load invoice services data:', err);
      toast.error('Failed to load invoice services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const getGroupServices = (groupId: string): InvoiceService[] =>
    services.filter((s) => s.groupId === groupId);

  // Open modal for creating
  const handleOpenCreate = () => {
    setEditingService(null);
    setFormData({ ...emptyForm, groupId: groups.length > 0 ? groups[0].id : '' });
    setShowModal(true);
  };

  // Open modal for editing
  const handleOpenEdit = (svc: InvoiceService) => {
    setEditingService(svc);
    setFormData({
      name: svc.name || '',
      nameAr: svc.nameAr || '',
      groupId: svc.groupId || '',
      defaultAmount: svc.defaultAmount || 0,
      vatRequired: (svc.defaultVatPercent ?? 15) > 0,
      defaultVatPercent: svc.defaultVatPercent ?? 15,
      description: (svc as any).description || '',
      ledgerAccountId: (svc as any).ledgerAccountId || '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingService(null);
    setFormData(emptyForm);
  };

  const handleFormChange = (field: keyof ServiceFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Service name (EN) is required');
      return;
    }
    if (!formData.groupId) {
      toast.error('Please select a group');
      return;
    }

    setSaving(true);
    try {
      // Map frontend field names to backend field names
      const backendData: any = {
        nameEn: formData.name,
        nameAr: formData.nameAr,
        serviceGroup: formData.groupId,
        vatApplicable: formData.vatRequired,
        defaultVatPercent: formData.vatRequired ? formData.defaultVatPercent : 0,
        defaultAmount: formData.defaultAmount || 0,
        ledgerAccountId: formData.ledgerAccountId || null,
        description: formData.description || null,
      };
      if (editingService) {
        await invoiceServicesApi.update(editingService.id, backendData);
        toast.success('Service updated successfully');
      } else {
        await invoiceServicesApi.create(backendData);
        toast.success('Service created successfully');
      }
      handleCloseModal();
      await loadData();
    } catch (err: any) {
      console.error('Failed to save service:', err);
      toast.error(err?.message || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (svc: InvoiceService) => {
    if (!window.confirm(`Are you sure you want to delete "${svc.name}"?`)) return;

    setDeletingId(svc.id);
    try {
      await invoiceServicesApi.remove(svc.id);
      toast.success('Service deleted successfully');
      await loadData();
    } catch (err: any) {
      console.error('Failed to delete service:', err);
      toast.error(err?.message || 'Failed to delete service');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoice Services</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Manage bilingual service items for invoicing. Grouped by service category.
          </p>
        </div>
        <button onClick={handleOpenCreate} className="btn-primary">
          <Plus className="h-4 w-4" />
          Add New Service
        </button>
      </div>

      {/* Service Groups */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card-premium p-4">
              <div className="flex items-center gap-4">
                <div className="h-6 w-6 skeleton rounded" />
                <div className="h-5 w-48 skeleton rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const groupServices = getGroupServices(group.id);
            const isExpanded = expandedGroups.has(group.id);

            return (
              <div key={group.id} className="card-premium overflow-hidden">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    )}
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Settings className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm font-bold text-slate-900">{group.name}</h3>
                        {group.nameAr && (
                          <p className="text-xs text-slate-400" dir="rtl">{group.nameAr}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                    {groupServices.length} services
                  </span>
                </button>

                {/* Group Services Table */}
                {isExpanded && groupServices.length > 0 && (
                  <div className="border-t border-slate-100">
                    <div className="overflow-x-auto">
                      <table className="table-premium">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Service Name (EN)</th>
                            <th>Service Name (AR)</th>
                            <th>Group</th>
                            <th className="text-right">Default Amount</th>
                            <th>Ledger Account</th>
                            <th className="text-center">VAT</th>
                            <th className="text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupServices.map((svc, index) => (
                            <tr key={svc.id}>
                              <td className="text-sm text-slate-500 font-medium">{index + 1}</td>
                              <td>
                                <span className="text-sm font-semibold text-slate-900">{svc.name}</span>
                              </td>
                              <td>
                                <span className="text-sm text-slate-600" dir="rtl">{svc.nameAr}</span>
                              </td>
                              <td>
                                <span className="text-xs text-slate-500">{group.name}</span>
                              </td>
                              <td className="text-right">
                                <span className="text-sm font-bold text-slate-900">
                                  {svc.defaultAmount
                                    ? `SAR ${(svc.defaultAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                    : '-'}
                                </span>
                              </td>
                              <td>
                                {(() => {
                                  const acct = accounts.find((a: any) => a.id === (svc as any).ledgerAccountId);
                                  return acct ? (
                                    <span className="text-xs text-slate-600">{acct.code} - {acct.name}</span>
                                  ) : (
                                    <span className="text-xs text-slate-400">-</span>
                                  );
                                })()}
                              </td>
                              <td className="text-center">
                                {svc.defaultVatPercent > 0 ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700">
                                    {svc.defaultVatPercent}%
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-50 text-slate-400">
                                    No VAT
                                  </span>
                                )}
                              </td>
                              <td className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => handleOpenEdit(svc)}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                    title="Edit"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(svc)}
                                    disabled={deletingId === svc.id}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-50"
                                    title="Delete"
                                  >
                                    {deletingId === svc.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {isExpanded && groupServices.length === 0 && (
                  <div className="border-t border-slate-100 p-6 text-center">
                    <p className="text-sm text-slate-400">No services in this group yet.</p>
                  </div>
                )}
              </div>
            );
          })}

          {groups.length === 0 && !loading && (
            <div className="card-premium p-12 text-center">
              <Settings className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">No service groups found</h3>
              <p className="text-sm text-slate-500">Create job categories first to organize services.</p>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Service Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingService ? 'Edit Service' : 'Add New Service'}
        size="md"
      >
        <div className="space-y-4">
          {/* Service Name (EN) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Service Name (EN) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              placeholder="e.g. Customs Clearance Fee"
              className="input-premium"
            />
          </div>

          {/* Service Name (AR) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Service Name (AR)
            </label>
            <input
              type="text"
              value={formData.nameAr}
              onChange={(e) => handleFormChange('nameAr', e.target.value)}
              placeholder="e.g. رسوم التخليص الجمركي"
              className="input-premium"
              dir="rtl"
            />
          </div>

          {/* Group */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Service Group <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.groupId}
              onChange={(e) => handleFormChange('groupId', e.target.value)}
              className="input-premium"
            >
              <option value="">Select a group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Default Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Default Amount (SAR)
            </label>
            <input
              type="number"
              value={formData.defaultAmount || ''}
              onChange={(e) => handleFormChange('defaultAmount', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="input-premium"
            />
          </div>

          {/* Ledger Account */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ledger Account
            </label>
            <select
              value={formData.ledgerAccountId}
              onChange={(e) => handleFormChange('ledgerAccountId', e.target.value)}
              className="input-premium"
            >
              <option value="">-- No Ledger Account --</option>
              {accounts
                .sort((a: any, b: any) => (a.code || '').localeCompare(b.code || ''))
                .map((acct: any) => (
                  <option key={acct.id} value={acct.id}>
                    {acct.code} - {acct.name}{acct.nameAr ? ` (${acct.nameAr})` : ''}
                  </option>
                ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">Revenue account linked to this service for journal entries</p>
          </div>

          {/* VAT Required + VAT % */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                VAT Required <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.vatRequired ? 'Yes' : 'No'}
                onChange={(e) => {
                  const req = e.target.value === 'Yes';
                  handleFormChange('vatRequired', req as any);
                  if (!req) handleFormChange('defaultVatPercent', 0);
                  else if (formData.defaultVatPercent === 0) handleFormChange('defaultVatPercent', 15);
                }}
                className="input-premium"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            {formData.vatRequired && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  VAT %
                </label>
                <input
                  type="number"
                  value={formData.defaultVatPercent}
                  onChange={(e) => handleFormChange('defaultVatPercent', parseFloat(e.target.value) || 0)}
                  placeholder="15"
                  min="0"
                  max="100"
                  step="0.5"
                  className="input-premium"
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
              placeholder="Optional description..."
              rows={3}
              className="input-premium"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={handleCloseModal}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingService ? (
                'Update Service'
              ) : (
                'Create Service'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InvoiceServiceList;
