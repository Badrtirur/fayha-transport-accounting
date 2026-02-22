import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Package,
    Clock,
    CheckCircle2,
    Truck,
    Eye,
    Edit2,
    Trash2,
    FileText,
    Receipt,
    DollarSign,
    MoreVertical,
    X,
    User,
    Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { JobReference, Client } from '../../types';
import { jobReferencesApi, customersApi } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';

const formatDate = (d: any): string => {
  if (!d) return '-';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return String(d); }
};

const JobReferenceList: React.FC = () => {
    const navigate = useNavigate();
    const [jobReferences, setJobReferences] = useState<JobReference[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [activeFilter, setActiveFilter] = useState('All');
    const [filterClientId, setFilterClientId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [openActions, setOpenActions] = useState<string | null>(null);
    const itemsPerPage = 8;

    // Close dropdown on outside click
    useEffect(() => {
        const handler = () => setOpenActions(null);
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, []);

    useEffect(() => {
        Promise.all([jobReferencesApi.getAll(), customersApi.getAll()]).then(([jobs, clientList]: any) => {
            setJobReferences(jobs);
            setClients(clientList);
            setLoading(false);
        }).catch(() => {
            setLoading(false);
            toast.error('Failed to load data');
        });
    }, []);

    const getClientName = (clientId: string): string => {
        const client = clients.find((c) => c.id === clientId);
        return client ? client.name : '-';
    };

    const filters = ['All', 'Draft', 'Active', 'In Progress', 'Customs Cleared', 'Delivered', 'Invoiced', 'Closed'];

    const filteredJobs = jobReferences
        .filter((j) => activeFilter === 'All' || j.status === activeFilter)
        .filter((j) => !filterClientId || j.clientId === filterClientId)
        .filter((j) => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return (
                (j.jobRefNo || '').toLowerCase().includes(q) ||
                getClientName(j.clientId).toLowerCase().includes(q) ||
                (j.direction || '').toLowerCase().includes(q) ||
                (j.modeOfTransport || '').toLowerCase().includes(q)
            );
        });

    const paginatedJobs = filteredJobs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const totalCount = jobReferences.length;
    const activeCount = jobReferences.filter((j) => j.status === 'Active').length;
    const clearedCount = jobReferences.filter((j) => j.status === 'Customs Cleared').length;
    const deliveredCount = jobReferences.filter((j) => j.status === 'Delivered').length;

    const handleExportJobReferences = () => {
        if (jobReferences.length === 0) {
            toast.error('No job references to export');
            return;
        }
        const headers = ['Job Ref No', 'Client', 'Direction', 'Mode of Transport', 'Status', 'Documentation Date'];
        const rows = jobReferences.map(j => [
            j.jobRefNo,
            getClientName(j.clientId),
            j.direction,
            j.modeOfTransport,
            j.status,
            formatDate(j.documentationDate),
        ]);
        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `job-references-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Job references exported successfully');
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <PageHeader
                title="Job Reference"
                subtitle="Manage job references, track shipments, and monitor clearance operations."
                onAdd={() => navigate('/job-reference/new')}
                onExport={handleExportJobReferences}
                onImport={() => toast.success('Import functionality coming soon')}
                addLabel="Add Job Reference"
                showSearch={false}
            />

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <Package className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-slate-900">{totalCount}</p>
                        <p className="text-xs text-slate-500">Total Jobs</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Clock className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-slate-900">{activeCount}</p>
                        <p className="text-xs text-slate-500">Active</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-slate-900">{clearedCount}</p>
                        <p className="text-xs text-slate-500">Customs Cleared</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                        <Truck className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-slate-900">{deliveredCount}</p>
                        <p className="text-xs text-slate-500">Delivered</p>
                    </div>
                </div>
            </div>

            {/* Filter Pills */}
            <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {filters.map((f) => (
                        <button
                            key={f}
                            onClick={() => {
                                setActiveFilter(f);
                                setCurrentPage(1);
                            }}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                                activeFilter === f
                                    ? 'bg-slate-900 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {f}
                            {f !== 'All' && (
                                <span className="ml-1.5 opacity-60">
                                    {jobReferences.filter((j) => j.status === f).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-4">
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        placeholder="Search by job ref #, client, direction..."
                        className="input-premium pl-10"
                    />
                </div>
            </div>

            {/* Active Customer Filter Chip */}
            {filterClientId && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200/60 rounded-xl">
                    <User className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-semibold text-indigo-700">
                        Filtered by Customer: {getClientName(filterClientId)}
                    </span>
                    <span className="text-xs text-indigo-500 ml-1">
                        ({filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'})
                    </span>
                    <button
                        onClick={() => { setFilterClientId(''); setCurrentPage(1); }}
                        className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors"
                    >
                        <X className="h-3.5 w-3.5" />
                        Clear
                    </button>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="card-premium overflow-hidden">
                    <div className="p-6 space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex gap-4 items-center">
                                <div className="h-4 w-8 skeleton rounded" />
                                <div className="h-4 w-32 skeleton rounded" />
                                <div className="h-4 w-48 skeleton rounded flex-1" />
                                <div className="h-4 w-20 skeleton rounded" />
                                <div className="h-4 w-20 skeleton rounded" />
                                <div className="h-6 w-24 skeleton rounded-full" />
                                <div className="h-4 w-24 skeleton rounded" />
                                <div className="h-4 w-16 skeleton rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="card-premium overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Job Ref No</th>
                                    <th>Client</th>
                                    <th>Direction</th>
                                    <th>Mode</th>
                                    <th>Status</th>
                                    <th>Documentation Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedJobs.map((job, index) => (
                                    <tr key={job.id}>
                                        <td className="text-sm text-slate-500 font-medium">
                                            {(currentPage - 1) * itemsPerPage + index + 1}
                                        </td>
                                        <td>
                                            <span className="text-sm font-bold text-slate-900 font-mono">
                                                {(job.jobRefNo || (job as any).jobNumber || '-')}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => { setFilterClientId(job.clientId); setCurrentPage(1); }}
                                                className="text-sm font-medium text-slate-700 hover:text-indigo-600 hover:underline text-left transition-colors"
                                                title={`Filter by ${getClientName(job.clientId)}`}
                                            >
                                                {getClientName(job.clientId)}
                                            </button>
                                        </td>
                                        <td>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                                job.direction === 'Import'
                                                    ? 'bg-blue-50 text-blue-700'
                                                    : 'bg-amber-50 text-amber-700'
                                            }`}>
                                                {job.direction}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="text-sm text-slate-600">
                                                {job.modeOfTransport}
                                            </span>
                                        </td>
                                        <td>
                                            <StatusBadge status={job.status} />
                                        </td>
                                        <td>
                                            <span className="text-sm text-slate-600">
                                                {formatDate(job.documentationDate)}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => navigate(`/job-reference/${job.id}`)}
                                                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                                    title="View"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/job-reference/${job.id}/edit`)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                {/* More Actions dropdown */}
                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setOpenActions(openActions === job.id ? null : job.id); }}
                                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                                                        title="More Actions"
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </button>
                                                    {openActions === job.id && (
                                                        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-elevated border border-slate-100 py-1 z-50">
                                                            <button
                                                                onClick={() => { setOpenActions(null); navigate(`/sales-invoice/new?jobRefId=${job.id}`); }}
                                                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                                            >
                                                                <FileText className="h-4 w-4" />
                                                                Generate Invoice
                                                            </button>
                                                            <button
                                                                onClick={() => { setOpenActions(null); navigate(`/expense-entry/new?jobRefId=${job.id}`); }}
                                                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                                            >
                                                                <Receipt className="h-4 w-4" />
                                                                Add Expense Entry
                                                            </button>
                                                            <button
                                                                onClick={() => { setOpenActions(null); navigate(`/payable-expense?jobRefId=${job.id}`); }}
                                                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                                                            >
                                                                <DollarSign className="h-4 w-4" />
                                                                Add Payable Expense
                                                            </button>
                                                            <div className="border-t border-slate-100 my-1" />
                                                            <button
                                                                onClick={async () => {
                                                                    setOpenActions(null);
                                                                    if (!window.confirm(`Are you sure you want to delete job reference ${job.jobRefNo}?`)) return;
                                                                    try {
                                                                        await jobReferencesApi.remove(job.id);
                                                                        setJobReferences((prev) => prev.filter((j) => j.id !== job.id));
                                                                        toast.success('Job reference deleted successfully', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
                                                                    } catch {
                                                                        toast.error('Failed to delete job reference', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
                                                                    }
                                                                }}
                                                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredJobs.length === 0 && (
                        <div className="text-center py-16">
                            <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-900 mb-1">No job references found</h3>
                            <p className="text-sm text-slate-500">Try adjusting your filter criteria.</p>
                        </div>
                    )}

                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(filteredJobs.length / itemsPerPage)}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        totalItems={filteredJobs.length}
                    />
                </div>
            )}
        </div>
    );
};

export default JobReferenceList;
