import React from 'react';
import { FileText } from 'lucide-react';
import { JobReference } from '../../../types';

interface TabProps {
    data: Partial<JobReference>;
    onChange: (field: string, value: any) => void;
    clients?: { value: string; label: string }[];
    consignees?: { value: string; label: string }[];
    salesmen?: { value: string; label: string }[];
    jobTitles?: { value: string; label: string }[];
}

const blStatusOptions = ['Original BL', 'Telex Release', 'Sea Waybill', 'Express BL'];

const JobRefTab: React.FC<TabProps> = ({ data, onChange, jobTitles = [] }) => {
    return (
        <div>
            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-violet-100 rounded-lg">
                    <FileText className="w-4 h-4 text-violet-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Job Reference Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Direction */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Direction<span className="text-rose-500 ml-0.5">*</span>
                    </label>
                    <select
                        className="input-premium"
                        value={data.direction || ''}
                        onChange={(e) => onChange('direction', e.target.value)}
                    >
                        <option value="">Select Direction</option>
                        <option value="Import">Import</option>
                        <option value="Export">Export</option>
                    </select>
                </div>

                {/* Mode Of Transport */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Mode Of Transport<span className="text-rose-500 ml-0.5">*</span>
                    </label>
                    <select
                        className="input-premium"
                        value={data.modeOfTransport || ''}
                        onChange={(e) => onChange('modeOfTransport', e.target.value)}
                    >
                        <option value="">Select Mode</option>
                        <option value="Air">Air</option>
                        <option value="Sea">Sea</option>
                        <option value="Land">Land</option>
                    </select>
                </div>

                {/* Job Category */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Job Category<span className="text-rose-500 ml-0.5">*</span>
                    </label>
                    <select
                        className="input-premium"
                        value={data.jobCategory || ''}
                        onChange={(e) => onChange('jobCategory', e.target.value)}
                    >
                        <option value="">Select Category</option>
                        <option value="Domestic">Domestic</option>
                        <option value="International">International</option>
                    </select>
                </div>

                {/* Job Title */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Job Title<span className="text-rose-500 ml-0.5">*</span>
                    </label>
                    <select
                        className="input-premium"
                        value={data.jobTitleId || ''}
                        onChange={(e) => onChange('jobTitleId', e.target.value)}
                    >
                        <option value="">Select Job Title</option>
                        {jobTitles.map((jt) => (
                            <option key={jt.value} value={jt.value}>
                                {jt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Job Description - Full Width */}
                <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Job Description
                    </label>
                    <textarea
                        className="input-premium min-h-[80px] resize-y"
                        placeholder="Enter job description"
                        value={data.jobDescription || ''}
                        onChange={(e) => onChange('jobDescription', e.target.value)}
                        rows={3}
                    />
                </div>

                {/* FCL/LCL */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        FCL/LCL/Pallet<span className="text-rose-500 ml-0.5">*</span>
                    </label>
                    <select
                        className="input-premium"
                        value={data.fclLcl || ''}
                        onChange={(e) => onChange('fclLcl', e.target.value)}
                    >
                        <option value="">Select Type</option>
                        <option value="FCL">FCL</option>
                        <option value="LCL">LCL</option>
                    </select>
                </div>

                {/* Documentation Date */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Documentation Date<span className="text-rose-500 ml-0.5">*</span>
                    </label>
                    <input
                        type="date"
                        className="input-premium"
                        value={data.documentationDate || ''}
                        onChange={(e) => onChange('documentationDate', e.target.value)}
                    />
                </div>

                {/* PO / Customer Ref No */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        PO / Customer Ref No<span className="text-rose-500 ml-0.5">*</span>
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter PO / Customer Ref No"
                        value={data.poCustomerRefNo || ''}
                        onChange={(e) => onChange('poCustomerRefNo', e.target.value)}
                    />
                </div>

                {/* PO Date */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        PO Date
                    </label>
                    <input
                        type="date"
                        className="input-premium"
                        value={data.poDate || ''}
                        onChange={(e) => onChange('poDate', e.target.value)}
                    />
                </div>

                {/* AWB/BL */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        AWB/BL
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter AWB/BL number"
                        value={data.awbBl || ''}
                        onChange={(e) => onChange('awbBl', e.target.value)}
                    />
                </div>

                {/* AWB/BL Status */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        AWB/BL Status
                    </label>
                    <select
                        className="input-premium"
                        value={data.awbBlStatus || ''}
                        onChange={(e) => onChange('awbBlStatus', e.target.value)}
                    >
                        <option value="">Select Status</option>
                        {blStatusOptions.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                </div>

                {/* HAWB/HBL */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        HAWB/HBL
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter HAWB/HBL number"
                        value={data.hawbHbl || ''}
                        onChange={(e) => onChange('hawbHbl', e.target.value)}
                    />
                </div>

                {/* HAWB/HBL Status */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        HAWB/HBL Status
                    </label>
                    <select
                        className="input-premium"
                        value={data.hawbHblStatus || ''}
                        onChange={(e) => onChange('hawbHblStatus', e.target.value)}
                    >
                        <option value="">Select Status</option>
                        {blStatusOptions.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                </div>

                {/* MABL */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        MABL
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter MABL number"
                        value={data.mabl || ''}
                        onChange={(e) => onChange('mabl', e.target.value)}
                    />
                </div>

                {/* MABL Status */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        MABL Status
                    </label>
                    <select
                        className="input-premium"
                        value={data.mablStatus || ''}
                        onChange={(e) => onChange('mablStatus', e.target.value)}
                    >
                        <option value="">Select Status</option>
                        {blStatusOptions.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};

export default JobRefTab;
