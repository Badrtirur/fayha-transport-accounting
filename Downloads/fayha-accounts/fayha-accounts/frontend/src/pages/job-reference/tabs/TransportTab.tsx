import React from 'react';
import { Truck } from 'lucide-react';
import { JobReference } from '../../../types';

interface TabProps {
    data: Partial<JobReference>;
    onChange: (field: string, value: any) => void;
    clients?: { value: string; label: string }[];
    consignees?: { value: string; label: string }[];
    salesmen?: { value: string; label: string }[];
    jobTitles?: { value: string; label: string }[];
}

const airlinesOptions = [
    'Saudi Arabian Airlines (Saudia)',
    'flynas',
    'flyadeal',
    'Emirates',
    'Qatar Airways',
    'Etihad Airways',
    'Turkish Airlines',
    'Lufthansa Cargo',
    'FedEx',
    'DHL Aviation',
    'UPS Airlines',
    'Other'
];

const TransportTab: React.FC<TabProps> = ({ data, onChange }) => {
    return (
        <div>
            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-orange-100 rounded-lg">
                    <Truck className="w-4 h-4 text-orange-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Transportation Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ships Name */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Ships Name
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter ships name"
                        value={data.shipsName || ''}
                        onChange={(e) => onChange('shipsName', e.target.value)}
                    />
                </div>

                {/* Ships Number */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Ships Number
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter ships number"
                        value={data.shipsNumber || ''}
                        onChange={(e) => onChange('shipsNumber', e.target.value)}
                    />
                </div>

                {/* IMO Number */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        IMO Number
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter IMO number"
                        value={data.imoNumber || ''}
                        onChange={(e) => onChange('imoNumber', e.target.value)}
                    />
                </div>

                {/* MMSI Number */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        MMSI Number
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter MMSI number"
                        value={data.mmsiNumber || ''}
                        onChange={(e) => onChange('mmsiNumber', e.target.value)}
                    />
                </div>

                {/* FNR Number */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        FNR Number
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter FNR number"
                        value={data.fnrNumber || ''}
                        onChange={(e) => onChange('fnrNumber', e.target.value)}
                    />
                </div>

                {/* Airlines */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Airlines
                    </label>
                    <select
                        className="input-premium"
                        value={data.airlines || ''}
                        onChange={(e) => onChange('airlines', e.target.value)}
                    >
                        <option value="">Select Airlines</option>
                        {airlinesOptions.map((airline) => (
                            <option key={airline} value={airline}>
                                {airline}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Flight Number */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Flight Number
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter flight number"
                        value={data.flightNumber || ''}
                        onChange={(e) => onChange('flightNumber', e.target.value)}
                    />
                </div>

                {/* Auth NO */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Auth NO
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter auth number"
                        value={data.authNo || ''}
                        onChange={(e) => onChange('authNo', e.target.value)}
                    />
                </div>

                {/* Truck Number */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Truck Number
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter truck number"
                        value={data.truckNumber || ''}
                        onChange={(e) => onChange('truckNumber', e.target.value)}
                    />
                </div>

                {/* Driver Id */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Driver Id
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter driver ID"
                        value={data.driverId || ''}
                        onChange={(e) => onChange('driverId', e.target.value)}
                    />
                </div>

                {/* Driver Name */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Driver Name
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter driver name"
                        value={data.driverName || ''}
                        onChange={(e) => onChange('driverName', e.target.value)}
                    />
                </div>

                {/* Driver Mobile Number */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Driver Mobile Number
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter driver mobile number"
                        value={data.driverMobile || ''}
                        onChange={(e) => onChange('driverMobile', e.target.value)}
                    />
                </div>

                {/* Remarks - Full Width */}
                <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Remarks
                    </label>
                    <textarea
                        className="input-premium min-h-[100px] resize-y"
                        placeholder="Enter transportation remarks..."
                        value={data.transportRemarks || ''}
                        onChange={(e) => onChange('transportRemarks', e.target.value)}
                        rows={4}
                    />
                </div>
            </div>
        </div>
    );
};

export default TransportTab;
