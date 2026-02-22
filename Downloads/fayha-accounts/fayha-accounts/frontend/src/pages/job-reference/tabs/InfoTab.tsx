import React from 'react';
import { User, Building2, Hash } from 'lucide-react';
import { JobReference } from '../../../types';

interface TabProps {
    data: Partial<JobReference>;
    onChange: (field: string, value: any) => void;
    clients?: { value: string; label: string }[];
    consignees?: { value: string; label: string }[];
    salesmen?: { value: string; label: string }[];
    jobTitles?: { value: string; label: string }[];
    clientsRaw?: any[];
    consigneesRaw?: any[];
}

const toDateStr = (val: any): string => {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
};

const InfoTab: React.FC<TabProps> = ({ data, onChange, clients = [], consignees = [], clientsRaw = [], consigneesRaw = [] }) => {
    const handleClientChange = (clientId: string) => {
        onChange('clientId', clientId);
        const client = clientsRaw.find((c: any) => c.id === clientId);
        if (client) {
            onChange('clientAuthNumber', client.authorizationNumber || '');
            onChange('clientImportNumber', client.importNumber || '');
            onChange('clientExportNumber', client.exportNumber || '');
            onChange('clientAuthExpiry', toDateStr(client.authorizationExpiry));
            onChange('clientImportExpiry', toDateStr(client.importExpiry));
            onChange('clientExportExpiry', toDateStr(client.exportExpiry));
        }
    };

    const handleConsigneeChange = (consigneeId: string) => {
        onChange('consigneeId', consigneeId);
        const consignee = consigneesRaw.find((c: any) => c.id === consigneeId);
        if (consignee) {
            onChange('consigneeAuthNumber', consignee.authorizationNumber || '');
            onChange('consigneeImportNumber', consignee.importNumber || '');
            onChange('consigneeExportNumber', consignee.exportNumber || '');
            onChange('consigneeAuthExpiry', toDateStr(consignee.authorizationExpiry));
            onChange('consigneeImportExpiry', toDateStr(consignee.importExpiry));
            onChange('consigneeExportExpiry', toDateStr(consignee.exportExpiry));
        }
    };
    return (
        <div className="space-y-8">
            {/* Job Reference Number Section */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-violet-100 rounded-lg">
                        <Hash className="w-4 h-4 text-violet-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Job Reference Number</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                            Job Ref No<span className="text-rose-500 ml-0.5">*</span>
                        </label>
                        <input
                            type="text"
                            className="input-premium font-mono font-bold"
                            placeholder="Auto-generated (e.g. JR-2026-0001)"
                            value={data.jobRefNo || ''}
                            onChange={(e) => onChange('jobRefNo', e.target.value)}
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Leave blank to auto-generate on save. Used for invoicing & accounting.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                            Status
                        </label>
                        <select
                            className="input-premium"
                            value={data.status || 'OPEN'}
                            onChange={(e) => onChange('status', e.target.value)}
                        >
                            <option value="OPEN">Open</option>
                            <option value="Draft">Draft</option>
                            <option value="Active">Active</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Customs Cleared">Customs Cleared</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Invoiced">Invoiced</option>
                            <option value="Closed">Closed</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Client Section */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                        <User className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Client Information</h3>
                </div>

                <div className="space-y-4">
                    {/* Client Name */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                            Client Name<span className="text-rose-500 ml-0.5">*</span>
                        </label>
                        <select
                            className="input-premium"
                            value={data.clientId || ''}
                            onChange={(e) => handleClientChange(e.target.value)}
                        >
                            <option value="">Select Client</option>
                            {clients.map((client) => (
                                <option key={client.value} value={client.value}>
                                    {client.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Authorization, Import, Export Numbers */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                Authorization Number
                            </label>
                            <input
                                type="text"
                                className="input-premium"
                                placeholder="Enter authorization number"
                                value={data.clientAuthNumber || ''}
                                onChange={(e) => onChange('clientAuthNumber', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                Import Number
                            </label>
                            <input
                                type="text"
                                className="input-premium"
                                placeholder="Enter import number"
                                value={data.clientImportNumber || ''}
                                onChange={(e) => onChange('clientImportNumber', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                Export Number
                            </label>
                            <input
                                type="text"
                                className="input-premium"
                                placeholder="Enter export number"
                                value={data.clientExportNumber || ''}
                                onChange={(e) => onChange('clientExportNumber', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Authorization, Import, Export Expiry Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                Authorization Expiry Day
                            </label>
                            <input
                                type="date"
                                className="input-premium"
                                value={data.clientAuthExpiry || ''}
                                onChange={(e) => onChange('clientAuthExpiry', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                Import Number Expiry Day
                            </label>
                            <input
                                type="date"
                                className="input-premium"
                                value={data.clientImportExpiry || ''}
                                onChange={(e) => onChange('clientImportExpiry', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                Export Number Expiry Day
                            </label>
                            <input
                                type="date"
                                className="input-premium"
                                value={data.clientExportExpiry || ''}
                                onChange={(e) => onChange('clientExportExpiry', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Consignee Section */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Building2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Consignee Information</h3>
                </div>

                <div className="space-y-4">
                    {/* Consignee Name */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                            Consignee Name<span className="text-rose-500 ml-0.5">*</span>
                        </label>
                        <select
                            className="input-premium"
                            value={data.consigneeId || ''}
                            onChange={(e) => handleConsigneeChange(e.target.value)}
                        >
                            <option value="">Select Consignee</option>
                            {consignees.map((consignee) => (
                                <option key={consignee.value} value={consignee.value}>
                                    {consignee.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Authorization, Import, Export Numbers */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                Authorization Number
                            </label>
                            <input
                                type="text"
                                className="input-premium"
                                placeholder="Enter authorization number"
                                value={data.consigneeAuthNumber || ''}
                                onChange={(e) => onChange('consigneeAuthNumber', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                Import Number
                            </label>
                            <input
                                type="text"
                                className="input-premium"
                                placeholder="Enter import number"
                                value={data.consigneeImportNumber || ''}
                                onChange={(e) => onChange('consigneeImportNumber', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                Export Number
                            </label>
                            <input
                                type="text"
                                className="input-premium"
                                placeholder="Enter export number"
                                value={data.consigneeExportNumber || ''}
                                onChange={(e) => onChange('consigneeExportNumber', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Authorization, Import, Export Expiry Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                Authorization Expiry Day
                            </label>
                            <input
                                type="date"
                                className="input-premium"
                                value={data.consigneeAuthExpiry || ''}
                                onChange={(e) => onChange('consigneeAuthExpiry', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                Import Number Expiry Day
                            </label>
                            <input
                                type="date"
                                className="input-premium"
                                value={data.consigneeImportExpiry || ''}
                                onChange={(e) => onChange('consigneeImportExpiry', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                Export Number Expiry Day
                            </label>
                            <input
                                type="date"
                                className="input-premium"
                                value={data.consigneeExportExpiry || ''}
                                onChange={(e) => onChange('consigneeExportExpiry', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InfoTab;
