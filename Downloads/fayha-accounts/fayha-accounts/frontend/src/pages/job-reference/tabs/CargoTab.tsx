import React from 'react';
import { Package } from 'lucide-react';
import { JobReference } from '../../../types';

interface TabProps {
    data: Partial<JobReference>;
    onChange: (field: string, value: any) => void;
    clients?: { value: string; label: string }[];
    consignees?: { value: string; label: string }[];
    salesmen?: { value: string; label: string }[];
    jobTitles?: { value: string; label: string }[];
}

const currencyOptions = [
    'SAR', 'USD', 'EUR', 'GBP', 'AED', 'KWD', 'BHD', 'OMR', 'QAR', 'EGP', 'INR', 'CNY', 'JPY'
];

const CargoTab: React.FC<TabProps> = ({ data, onChange }) => {
    return (
        <div>
            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-amber-100 rounded-lg">
                    <Package className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Cargo Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Commercial Invoice No */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Commercial Invoice No
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter commercial invoice number"
                        value={data.commercialInvoiceNo || ''}
                        onChange={(e) => onChange('commercialInvoiceNo', e.target.value)}
                    />
                </div>

                {/* Commercial Invoice Value */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Commercial Invoice Value
                    </label>
                    <input
                        type="number"
                        className="input-premium"
                        placeholder="0.00"
                        value={data.commercialInvoiceValue ?? ''}
                        onChange={(e) => onChange('commercialInvoiceValue', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                </div>

                {/* Commercial Invoice Currency */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Commercial Invoice Currency
                    </label>
                    <select
                        className="input-premium"
                        value={data.commercialInvoiceCurrency || 'SAR'}
                        onChange={(e) => onChange('commercialInvoiceCurrency', e.target.value)}
                    >
                        {currencyOptions.map((currency) => (
                            <option key={currency} value={currency}>
                                {currency}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Manifest No */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Manifest No
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter manifest number"
                        value={data.manifestNo || ''}
                        onChange={(e) => onChange('manifestNo', e.target.value)}
                    />
                </div>

                {/* Entity */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Entity
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter entity"
                        value={data.entity || ''}
                        onChange={(e) => onChange('entity', e.target.value)}
                    />
                </div>

                {/* CBM */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        CBM
                    </label>
                    <input
                        type="number"
                        className="input-premium"
                        placeholder="0.00"
                        value={data.cbm ?? ''}
                        onChange={(e) => onChange('cbm', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                </div>

                {/* Cargo Size */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Cargo Size
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter cargo size"
                        value={data.cargoSize || ''}
                        onChange={(e) => onChange('cargoSize', e.target.value)}
                    />
                </div>

                {/* Gross Weight */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Gross Weight
                    </label>
                    <input
                        type="number"
                        className="input-premium"
                        placeholder="0.00"
                        value={data.grossWeight ?? ''}
                        onChange={(e) => onChange('grossWeight', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                </div>

                {/* Chargeable Weight */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Chargeable Weight
                    </label>
                    <input
                        type="number"
                        className="input-premium"
                        placeholder="0.00"
                        value={data.chargeableWeight ?? ''}
                        onChange={(e) => onChange('chargeableWeight', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                </div>

                {/* Number of Packages */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Number of Packages
                    </label>
                    <input
                        type="number"
                        className="input-premium"
                        placeholder="0"
                        value={data.numberOfPackages ?? ''}
                        onChange={(e) => onChange('numberOfPackages', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    />
                </div>

                {/* Number of Pieces */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Number of Pieces
                    </label>
                    <input
                        type="number"
                        className="input-premium"
                        placeholder="0"
                        value={data.numberOfPieces ?? ''}
                        onChange={(e) => onChange('numberOfPieces', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    />
                </div>

                {/* No. of Pallets */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        No. Of Pallets
                    </label>
                    <input
                        type="number"
                        className="input-premium"
                        placeholder="0"
                        value={data.numberOfPallets ?? ''}
                        onChange={(e) => onChange('numberOfPallets', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    />
                </div>

                {/* Cargo Description - Full Width */}
                <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Cargo Description
                    </label>
                    <textarea
                        className="input-premium min-h-[100px] resize-y"
                        placeholder="Describe the cargo contents..."
                        value={data.cargoDescription || ''}
                        onChange={(e) => onChange('cargoDescription', e.target.value)}
                        rows={4}
                    />
                </div>
            </div>
        </div>
    );
};

export default CargoTab;
