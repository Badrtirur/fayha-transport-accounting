import React from 'react';
import { MapPin } from 'lucide-react';
import { JobReference } from '../../../types';

interface TabProps {
    data: Partial<JobReference>;
    onChange: (field: string, value: any) => void;
    clients?: { value: string; label: string }[];
    consignees?: { value: string; label: string }[];
    salesmen?: { value: string; label: string }[];
    jobTitles?: { value: string; label: string }[];
}

const DeliveryTab: React.FC<TabProps> = ({ data, onChange }) => {
    return (
        <div>
            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-teal-100 rounded-lg">
                    <MapPin className="w-4 h-4 text-teal-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Delivery Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Place of Delivery / Warehouse */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Place of Delivery / Warehouse
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter place of delivery or warehouse"
                        value={data.placeOfDelivery || ''}
                        onChange={(e) => onChange('placeOfDelivery', e.target.value)}
                    />
                </div>

                {/* Delivery Address */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Delivery Address
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter delivery address"
                        value={data.deliveryAddress || ''}
                        onChange={(e) => onChange('deliveryAddress', e.target.value)}
                    />
                </div>

                {/* Contact Person Name */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Contact Person Name
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter contact person name"
                        value={data.contactPersonName || ''}
                        onChange={(e) => onChange('contactPersonName', e.target.value)}
                    />
                </div>

                {/* Contact Person Phone */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Contact Person Phone
                    </label>
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Enter contact person phone"
                        value={data.contactPersonPhone || ''}
                        onChange={(e) => onChange('contactPersonPhone', e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
};

export default DeliveryTab;
