import React from 'react';
import { Ship } from 'lucide-react';
import { JobReference } from '../../../types';

interface TabProps {
    data: Partial<JobReference>;
    onChange: (field: string, value: any) => void;
    clients?: { value: string; label: string }[];
    consignees?: { value: string; label: string }[];
    salesmen?: { value: string; label: string }[];
    jobTitles?: { value: string; label: string }[];
}

const ShipmentTab: React.FC<TabProps> = ({ data, onChange, salesmen = [] }) => {
    return (
        <div>
            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-sky-100 rounded-lg">
                    <Ship className="w-4 h-4 text-sky-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Shipment Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Origin */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Origin
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter origin"
                        value={data.origin || ''}
                        onChange={(e) => onChange('origin', e.target.value)}
                    />
                </div>

                {/* Destination */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Destination
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter destination"
                        value={data.destination || ''}
                        onChange={(e) => onChange('destination', e.target.value)}
                    />
                </div>

                {/* POL / Port of Loading */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        POL / Port of Loading
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter port of loading"
                        value={data.portOfLoading || ''}
                        onChange={(e) => onChange('portOfLoading', e.target.value)}
                    />
                </div>

                {/* POD / Port of Discharge */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        POD / Port of Discharge
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter port of discharge"
                        value={data.portOfDischarge || ''}
                        onChange={(e) => onChange('portOfDischarge', e.target.value)}
                    />
                </div>

                {/* Shipper Name */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Shipper Name
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter shipper name"
                        value={data.shipperName || ''}
                        onChange={(e) => onChange('shipperName', e.target.value)}
                    />
                </div>

                {/* Freight Forwarder */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Freight Forwarder
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter freight forwarder"
                        value={data.freightForwarder || ''}
                        onChange={(e) => onChange('freightForwarder', e.target.value)}
                    />
                </div>

                {/* Custom Broker */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Custom Broker
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter custom broker"
                        value={data.customBroker || ''}
                        onChange={(e) => onChange('customBroker', e.target.value)}
                    />
                </div>

                {/* Payable */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Payable
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter payable"
                        value={data.payableId || ''}
                        onChange={(e) => onChange('payableId', e.target.value)}
                    />
                </div>

                {/* Salesman */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Salesman<span className="text-rose-500 ml-0.5">*</span>
                    </label>
                    <select
                        className="input-premium"
                        value={data.salesmanId || ''}
                        onChange={(e) => onChange('salesmanId', e.target.value)}
                    >
                        <option value="">Select Salesman</option>
                        {salesmen.map((s) => (
                            <option key={s.value} value={s.value}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Handling */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Handling
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter handling details"
                        value={data.handling || ''}
                        onChange={(e) => onChange('handling', e.target.value)}
                    />
                </div>

                {/* Product Category */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Product Category
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter product category"
                        value={data.productCategory || ''}
                        onChange={(e) => onChange('productCategory', e.target.value)}
                    />
                </div>

                {/* Shipment Priority */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Shipment Priority
                    </label>
                    <select
                        className="input-premium"
                        value={data.shipmentPriority || ''}
                        onChange={(e) => onChange('shipmentPriority', e.target.value)}
                    >
                        <option value="">Select Priority</option>
                        <option value="Normal">Normal</option>
                        <option value="Urgent">Urgent</option>
                        <option value="Critical">Critical</option>
                    </select>
                </div>

                {/* Goods Status */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Goods Status
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter goods status"
                        value={data.goodsStatus || ''}
                        onChange={(e) => onChange('goodsStatus', e.target.value)}
                    />
                </div>

                {/* Hazardous */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Hazardous<span className="text-rose-500 ml-0.5">*</span>
                    </label>
                    <select
                        className="input-premium"
                        value={data.isHazardous === true ? 'YES' : data.isHazardous === false ? 'NO' : ''}
                        onChange={(e) => onChange('isHazardous', e.target.value === 'YES')}
                    >
                        <option value="">Select</option>
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                    </select>
                </div>

                {/* Port */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Port
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter port"
                        value={data.port || ''}
                        onChange={(e) => onChange('port', e.target.value)}
                    />
                </div>

                {/* Packing */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Packing
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter packing details"
                        value={data.packing || ''}
                        onChange={(e) => onChange('packing', e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
};

export default ShipmentTab;
