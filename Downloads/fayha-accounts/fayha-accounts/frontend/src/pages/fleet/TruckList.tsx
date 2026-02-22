import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import { fleetApi } from '../../services/api';
import toast from 'react-hot-toast';
import { Truck, MapPin, User, Calendar, AlertTriangle, Fuel, Gauge, Wrench, CheckCircle2, Navigation, Clock, Edit2, Trash2 } from 'lucide-react';

const formatDate = (d: any): string => {
  if (!d) return '-';
  try { const date = new Date(d); if (isNaN(date.getTime())) return String(d); return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return String(d); }
};

interface TruckRecord {
    id: string;
    plateNumber: string;
    make: string;
    model: string;
    year: string;
    type: 'Truck' | 'Trailer' | 'Tanker';
    driver: string;
    status: 'Active' | 'Maintenance' | 'Out of Service';
    location?: string;
    fuelLevel: number;
    nextServiceDate: string;
    mileage: number;
    jobRef?: string;
}

const emptyForm: Omit<TruckRecord, 'id'> = {
    plateNumber: '',
    make: '',
    model: '',
    year: '',
    type: 'Truck',
    driver: '',
    status: 'Active',
    location: '',
    fuelLevel: 100,
    nextServiceDate: '',
    mileage: 0,
};

const TruckList: React.FC = () => {
    const [trucks, setTrucks] = useState<TruckRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTruck, setEditingTruck] = useState<TruckRecord | null>(null);
    const [formData, setFormData] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);

    const fetchTrucks = async () => {
        try {
            setLoading(true);
            const data = await fleetApi.getAll();
            setTrucks(data || []);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to load fleet data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrucks();
    }, []);

    const active = trucks.filter(t => t.status === 'Active').length;
    const maintenanceCount = trucks.filter(t => t.status === 'Maintenance').length;
    const outOfService = trucks.filter(t => t.status === 'Out of Service').length;

    const openAddModal = () => {
        setEditingTruck(null);
        setFormData({ ...emptyForm });
        setModalOpen(true);
    };

    const openEditModal = (truck: TruckRecord) => {
        setEditingTruck(truck);
        setFormData({
            plateNumber: truck.plateNumber,
            make: truck.make || '',
            model: truck.model || '',
            year: truck.year || '',
            type: truck.type,
            driver: truck.driver || '',
            status: truck.status,
            location: truck.location || '',
            fuelLevel: truck.fuelLevel,
            nextServiceDate: truck.nextServiceDate || '',
            mileage: truck.mileage,
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.plateNumber.trim()) {
            toast.error('Plate number is required');
            return;
        }
        try {
            setSubmitting(true);
            if (editingTruck) {
                await fleetApi.update(editingTruck.id, formData);
                toast.success('Vehicle updated successfully');
            } else {
                await fleetApi.create(formData);
                toast.success('Vehicle added successfully');
            }
            setModalOpen(false);
            fetchTrucks();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save vehicle');
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await fleetApi.update(id, { status: newStatus });
            setTrucks(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } as any : item));
            toast.success(`Status updated to ${newStatus}`);
        } catch {
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async (truck: TruckRecord) => {
        if (!window.confirm(`Are you sure you want to delete vehicle ${truck.plateNumber}? This action cannot be undone.`)) {
            return;
        }
        try {
            await fleetApi.remove(truck.id);
            toast.success('Vehicle deleted successfully');
            fetchTrucks();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to delete vehicle');
        }
    };

    const handleExport = () => {
        if (trucks.length === 0) {
            toast.error('No data to export');
            return;
        }
        const headers = ['Plate Number', 'Make', 'Model', 'Year', 'Type', 'Driver', 'Status', 'Fuel Level', 'Next Service Date', 'Mileage'];
        const rows = trucks.map(t => [
            t.plateNumber,
            t.make || '',
            t.model || '',
            t.year || '',
            t.type,
            t.driver || '',
            t.status,
            String(t.fuelLevel),
            t.nextServiceDate || '',
            String(t.mileage),
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `fleet-export-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Fleet data exported');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'fuelLevel' || name === 'mileage' ? Number(value) : value,
        }));
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Active': return { bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', badge: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: <CheckCircle2 className="h-3 w-3" /> };
            case 'Maintenance': return { bg: 'bg-gradient-to-br from-amber-500 to-orange-600', badge: 'bg-amber-50 border-amber-200 text-amber-700', icon: <Wrench className="h-3 w-3" /> };
            case 'Out of Service': return { bg: 'bg-gradient-to-br from-rose-500 to-pink-600', badge: 'bg-rose-50 border-rose-200 text-rose-700', icon: <AlertTriangle className="h-3 w-3" /> };
            default: return { bg: 'bg-gradient-to-br from-slate-500 to-slate-600', badge: 'bg-slate-50 border-slate-200 text-slate-700', icon: <Truck className="h-3 w-3" /> };
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Fleet Management"
                subtitle="Track vehicles, drivers, fuel levels, and maintenance schedules."
                onAdd={openAddModal}
                onExport={handleExport}
                onImport={() => toast.success('Import feature coming soon')}
                addLabel="Add Vehicle"
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600"><Truck className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">{trucks.length}</p><p className="text-xs text-slate-500">Total Fleet</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><CheckCircle2 className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">{active}</p><p className="text-xs text-slate-500">Active</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600"><Wrench className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">{maintenanceCount}</p><p className="text-xs text-slate-500">Maintenance</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600"><AlertTriangle className="h-5 w-5" /></div>
                    <div><p className="text-xl font-bold text-slate-900">{outOfService}</p><p className="text-xs text-slate-500">Out of Service</p></div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-16">
                    <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-sm text-slate-500">Loading fleet data...</p>
                </div>
            ) : trucks.length === 0 ? (
                <div className="card-premium text-center py-16">
                    <Truck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 mb-1">No vehicles found</h3>
                    <p className="text-sm text-slate-500">Add your first vehicle to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {trucks.map((truck) => {
                        const statusStyle = getStatusColor(truck.status);
                        return (
                            <div key={truck.id} className="card-premium overflow-hidden group">
                                <div className="p-5 border-b border-slate-100/80 flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className={`h-12 w-12 rounded-2xl ${statusStyle.bg} flex items-center justify-center text-white shadow-lg`}>
                                            <Truck className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-lg">{truck.plateNumber}</h3>
                                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{truck.make} {truck.model} {truck.year ? `(${truck.year})` : ''}</p>
                                        </div>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusStyle.badge}`}>
                                        {statusStyle.icon}
                                        {truck.status}
                                    </span>
                                </div>

                                <div className="p-5 space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex items-center gap-2.5 text-sm text-slate-600">
                                            <User className="h-4 w-4 text-slate-400" />
                                            <span className="font-medium text-xs">{truck.driver || 'Unassigned'}</span>
                                        </div>
                                        <div className="flex items-center gap-2.5 text-sm text-slate-600">
                                            <MapPin className="h-4 w-4 text-slate-400" />
                                            <span className="text-xs truncate">{truck.location || 'N/A'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                                        <Navigation className="h-4 w-4 text-slate-400" />
                                        <span className="text-xs font-semibold uppercase tracking-wider">{truck.type}</span>
                                    </div>

                                    {truck.jobRef && (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl">
                                            <Clock className="h-3.5 w-3.5 text-blue-500" />
                                            <span className="text-xs font-semibold text-blue-700">Active: {truck.jobRef}</span>
                                        </div>
                                    )}

                                    <div>
                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                            <span className="text-slate-500 flex items-center gap-1"><Fuel className="h-3 w-3" /> Fuel Level</span>
                                            <span className={`font-bold ${truck.fuelLevel > 50 ? 'text-emerald-600' : truck.fuelLevel > 25 ? 'text-amber-600' : 'text-rose-600'}`}>{truck.fuelLevel}%</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-1000 ${truck.fuelLevel > 50 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : truck.fuelLevel > 25 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-rose-500 to-red-400'}`} style={{ width: `${truck.fuelLevel}%` }} />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span className="flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5" />{(truck.mileage || 0).toLocaleString()} km</span>
                                        <span className={`flex items-center gap-1.5 ${truck.status === 'Maintenance' ? 'text-rose-600 font-semibold' : ''}`}>
                                            {truck.status === 'Maintenance' ? <AlertTriangle className="h-3.5 w-3.5" /> : <Calendar className="h-3.5 w-3.5" />}
                                            Service: {truck.nextServiceDate ? formatDate(truck.nextServiceDate) : 'N/A'}
                                        </span>
                                    </div>
                                </div>

                                <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100/80 flex gap-2">
                                    {truck.status === 'Active' && (
                                        <button
                                            onClick={() => handleStatusChange(truck.id, 'Maintenance')}
                                            className="flex-1 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <Wrench className="h-3.5 w-3.5" /> Maintenance
                                        </button>
                                    )}
                                    {truck.status === 'Active' && (
                                        <button
                                            onClick={() => handleStatusChange(truck.id, 'Out of Service')}
                                            className="flex-1 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <AlertTriangle className="h-3.5 w-3.5" /> Out of Service
                                        </button>
                                    )}
                                    {(truck.status === 'Maintenance' || truck.status === 'Out of Service') && (
                                        <button
                                            onClick={() => handleStatusChange(truck.id, 'Active')}
                                            className="flex-1 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <CheckCircle2 className="h-3.5 w-3.5" /> Activate
                                        </button>
                                    )}
                                    <button
                                        onClick={() => openEditModal(truck)}
                                        className="flex-1 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <Edit2 className="h-3.5 w-3.5" /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(truck)}
                                        className="flex-1 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" /> Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add / Edit Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingTruck ? 'Edit Vehicle' : 'Add Vehicle'} size="lg">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Plate Number *</label>
                            <input name="plateNumber" value={formData.plateNumber} onChange={handleChange} className="input-premium w-full" placeholder="e.g. KSA-1234" required />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Make</label>
                            <input name="make" value={formData.make} onChange={handleChange} className="input-premium w-full" placeholder="e.g. Volvo" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Model</label>
                            <input name="model" value={formData.model} onChange={handleChange} className="input-premium w-full" placeholder="e.g. FH16" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Year</label>
                            <input name="year" value={formData.year} onChange={handleChange} className="input-premium w-full" placeholder="e.g. 2024" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Type *</label>
                            <select name="type" value={formData.type} onChange={handleChange} className="input-premium w-full">
                                <option value="Truck">Truck</option>
                                <option value="Trailer">Trailer</option>
                                <option value="Tanker">Tanker</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Driver</label>
                            <input name="driver" value={formData.driver} onChange={handleChange} className="input-premium w-full" placeholder="Driver name" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Fuel Level (%)</label>
                            <input name="fuelLevel" type="number" min="0" max="100" value={formData.fuelLevel} onChange={handleChange} className="input-premium w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Next Service Date</label>
                            <input name="nextServiceDate" type="date" value={formData.nextServiceDate} onChange={handleChange} className="input-premium w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Mileage (km)</label>
                            <input name="mileage" type="number" min="0" value={formData.mileage} onChange={handleChange} className="input-premium w-full" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting} className="btn-primary px-6 py-2 text-sm font-semibold rounded-xl disabled:opacity-50">
                            {submitting ? 'Saving...' : editingTruck ? 'Update Vehicle' : 'Add Vehicle'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default TruckList;
