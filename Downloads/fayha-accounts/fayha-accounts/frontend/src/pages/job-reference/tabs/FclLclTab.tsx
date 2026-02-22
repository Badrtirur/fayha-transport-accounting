import React from 'react';
import { Container, Plus, Trash2 } from 'lucide-react';
import { JobReference, ContainerDetail, FclLclContainerType } from '../../../types';

interface TabProps {
    data: Partial<JobReference>;
    onChange: (field: string, value: any) => void;
    clients?: { value: string; label: string }[];
    consignees?: { value: string; label: string }[];
    salesmen?: { value: string; label: string }[];
    jobTitles?: { value: string; label: string }[];
}

const containerTypeOptions: FclLclContainerType[] = ['20ft', '40ft', 'LCL', 'AIR PALLET', 'BREAK BULK'];

const FclLclTab: React.FC<TabProps> = ({ data, onChange }) => {
    const containers: ContainerDetail[] = data.containers || [];

    const handleAddRow = () => {
        const newContainer: ContainerDetail = {
            id: Date.now().toString(),
            type: '20ft',
            uniqueNumber: '',
            deliveryDate: '',
            deliveryPoint: '',
            cargoDescription: '',
            quantity: 1,
        };
        onChange('containers', [...containers, newContainer]);
    };

    const handleRemoveRow = (id: string) => {
        onChange('containers', containers.filter((c) => c.id !== id));
    };

    const handleRowChange = (id: string, field: keyof ContainerDetail, value: any) => {
        onChange(
            'containers',
            containers.map((c) =>
                c.id === id ? { ...c, [field]: value } : c
            )
        );
    };

    const totalCount = containers.reduce((sum, c) => sum + (c.quantity || 0), 0);

    return (
        <div>
            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-indigo-100 rounded-lg">
                    <Container className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">FCL / LCL Details</h3>
            </div>

            {/* FCL/LCL Type Selector */}
            <div className="mb-6 max-w-xs">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    FCL/LCL Type
                </label>
                <select
                    className="input-premium"
                    value={data.fclLcl || ''}
                    onChange={(e) => onChange('fclLcl', e.target.value)}
                >
                    <option value="">Select Type</option>
                    {containerTypeOptions.map((type) => (
                        <option key={type} value={type}>
                            {type}
                        </option>
                    ))}
                </select>
            </div>

            {/* Dynamic Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 w-12">#</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">FCL/LCL Type</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Unique Number</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Delivery Date</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Delivery Point</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Cargo Description</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 w-24">Quantity</th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 w-20">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {containers.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-sm">
                                        No container details added yet. Click "Add" to add a row.
                                    </td>
                                </tr>
                            ) : (
                                containers.map((container, index) => (
                                    <tr
                                        key={container.id}
                                        className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                                    >
                                        <td className="px-4 py-2 text-slate-500 font-medium">
                                            {index + 1}
                                        </td>
                                        <td className="px-4 py-2">
                                            <select
                                                className="input-premium"
                                                value={container.type}
                                                onChange={(e) =>
                                                    handleRowChange(container.id, 'type', e.target.value as FclLclContainerType)
                                                }
                                            >
                                                {containerTypeOptions.map((type) => (
                                                    <option key={type} value={type}>
                                                        {type}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="text"
                                                className="input-premium"
                                                placeholder="Unique number"
                                                value={container.uniqueNumber}
                                                onChange={(e) =>
                                                    handleRowChange(container.id, 'uniqueNumber', e.target.value)
                                                }
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="date"
                                                className="input-premium"
                                                value={container.deliveryDate}
                                                onChange={(e) =>
                                                    handleRowChange(container.id, 'deliveryDate', e.target.value)
                                                }
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="text"
                                                className="input-premium"
                                                placeholder="Delivery point"
                                                value={container.deliveryPoint}
                                                onChange={(e) =>
                                                    handleRowChange(container.id, 'deliveryPoint', e.target.value)
                                                }
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="text"
                                                className="input-premium"
                                                placeholder="Cargo description"
                                                value={container.cargoDescription}
                                                onChange={(e) =>
                                                    handleRowChange(container.id, 'cargoDescription', e.target.value)
                                                }
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                className="input-premium"
                                                placeholder="0"
                                                min={1}
                                                value={container.quantity}
                                                onChange={(e) =>
                                                    handleRowChange(
                                                        container.id,
                                                        'quantity',
                                                        e.target.value ? parseInt(e.target.value, 10) : 0
                                                    )
                                                }
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveRow(container.id)}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                title="Delete row"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer: Add Button + Total */}
            <div className="flex items-center justify-between mt-4">
                <button
                    type="button"
                    onClick={handleAddRow}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-100 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add
                </button>

                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-xl">
                    <span className="text-xs font-semibold text-slate-500">Total FCL/LCL:</span>
                    <span className="text-sm font-bold text-slate-700">{totalCount}</span>
                </div>
            </div>
        </div>
    );
};

export default FclLclTab;
