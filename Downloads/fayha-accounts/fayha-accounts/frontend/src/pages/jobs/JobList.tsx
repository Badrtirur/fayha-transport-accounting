import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    SlidersHorizontal,
    Ship,
    Calendar,
    Eye,
    Edit2,
    Trash2,
    TrendingUp,
    Clock,
    CheckCircle2,
    Package
} from 'lucide-react';
import toast from 'react-hot-toast';
import { jobReferencesApi } from '../../services/api';
import Pagination from '../../components/common/Pagination';

const formatDate = (d: any): string => {
  if (!d) return '-';
  try { const date = new Date(d); if (isNaN(date.getTime())) return String(d); return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return String(d); }
};

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    'Draft': { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400' },
    'Active': { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
    'Customs Cleared': { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500' },
    'Delivered': { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
    'Invoiced': { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    'Closed': { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-500', dot: 'bg-slate-400' }
};

const JobStatusBadge = ({ status }: { status: string }) => {
    const config = statusConfig[status] || statusConfig['Draft'];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
            {status}
        </span>
    );
};

const JobList: React.FC = () => {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [activeFilter, setActiveFilter] = useState('All');
    const itemsPerPage = 5;

    useEffect(() => {
        jobReferencesApi.getAll().then(data => {
            setJobs(Array.isArray(data) ? data : []);
            setLoading(false);
        }).catch(() => {
            toast.error('Failed to load jobs', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
            setJobs([]);
            setLoading(false);
        });
    }, []);

    const handleDelete = async (e: React.MouseEvent, job: any) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to delete job ${job.jobRefNo || job.jobNo || job.id}? This action cannot be undone.`)) return;
        try {
            await jobReferencesApi.remove(job.id);
            setJobs(prev => prev.filter(j => j.id !== job.id));
            toast.success('Job deleted successfully', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
        } catch {
            toast.error('Failed to delete job', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
        }
    };

    const filters = ['All', 'Active', 'Customs Cleared', 'Delivered', 'Invoiced', 'Closed'];
    const filteredJobs = activeFilter === 'All' ? jobs : jobs.filter(j => j.status === activeFilter);

    const paginatedJobs = filteredJobs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const activeCount = jobs.filter(j => j.status === 'Active').length;
    const clearedCount = jobs.filter(j => j.status === 'Customs Cleared' || j.status === 'Delivered').length;
    const totalRevenue = jobs.reduce((s, j) => s + (j.totalServiceFees || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clearance Jobs</h1>
                    <p className="text-slate-500 mt-1 text-sm">Manage shipment clearance operations and tracking.</p>
                </div>
                <button onClick={() => navigate('/job-reference/new')} className="btn-primary">
                    <Plus className="h-4 w-4" />
                    New Job
                </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-4">
                    <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Package className="h-5 w-5" /></div>
                    <div><p className="text-2xl font-bold text-slate-900">{jobs.length}</p><p className="text-xs text-slate-500">Total Jobs</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-4">
                    <div className="h-11 w-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><Clock className="h-5 w-5" /></div>
                    <div><p className="text-2xl font-bold text-slate-900">{activeCount}</p><p className="text-xs text-slate-500">Active</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-4">
                    <div className="h-11 w-11 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600"><CheckCircle2 className="h-5 w-5" /></div>
                    <div><p className="text-2xl font-bold text-slate-900">{clearedCount}</p><p className="text-xs text-slate-500">Cleared</p></div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-4">
                    <div className="h-11 w-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600"><TrendingUp className="h-5 w-5" /></div>
                    <div><p className="text-2xl font-bold text-slate-900">SAR {(totalRevenue / 1000).toFixed(0)}K</p><p className="text-xs text-slate-500">Est. Revenue</p></div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input type="text" placeholder="Search by Job #, Customer, or BL Number..." className="input-premium pl-10" />
                    </div>
                    <button className="btn-secondary"><SlidersHorizontal className="h-4 w-4" />Advanced</button>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {filters.map((f) => (
                        <button key={f} onClick={() => { setActiveFilter(f); setCurrentPage(1); }}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${activeFilter === f ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                            {f}{f !== 'All' && <span className="ml-1.5 opacity-60">{jobs.filter(j => j.status === f).length}</span>}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-2xl p-6 shadow-card border border-slate-100/80">
                            <div className="flex gap-4"><div className="h-12 w-12 rounded-xl skeleton" /><div className="flex-1 space-y-3"><div className="h-4 w-48 skeleton rounded" /><div className="h-3 w-32 skeleton rounded" /></div></div>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4">
                        {paginatedJobs.map((job) => (
                            <Link to={`/jobs/${job.id}`} key={job.id}
                                className="group bg-white rounded-2xl p-5 shadow-card border border-slate-100/80 hover:shadow-card-hover hover:border-emerald-200/60 transition-all duration-300 cursor-pointer relative overflow-hidden block">
                                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-l-2xl" />
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center flex-shrink-0 text-slate-500 group-hover:from-emerald-50 group-hover:to-teal-50 group-hover:text-emerald-600 transition-all duration-300">
                                            <Ship className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{job.jobRefNo || job.jobNo}</h3>
                                                <JobStatusBadge status={job.status || 'Draft'} />
                                            </div>
                                            <p className="font-medium text-slate-700 text-sm">{job.customerName || job.clientName || 'N/A'}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{job.description || ''}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8 text-sm">
                                        <div className="flex flex-col items-center">
                                            <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Arrival</span>
                                            <span className="font-semibold text-slate-700 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400" />{formatDate(job.arrivalDate || job.eta) === '-' ? 'N/A' : formatDate(job.arrivalDate || job.eta)}</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Revenue</span>
                                            <span className="font-bold text-slate-900 flex items-center gap-1"><span className="text-emerald-500 text-xs">SAR</span>{(job.totalServiceFees || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="hidden md:flex items-center gap-2">
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/jobs/${job.id}`); }}
                                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                                title="View"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/job-reference/edit/${job.id}`); }}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                title="Edit"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(e, job)}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center gap-6 text-xs text-slate-500">
                                    <span className="flex items-center gap-1.5"><span className="font-bold text-slate-600">BL:</span><span className="font-mono">{job.blNumber || job.blNo || 'N/A'}</span></span>
                                    <span className="flex items-center gap-1.5"><span className="font-bold text-slate-600">Expenses:</span>SAR {(job.totalReimbursable || 0).toLocaleString()}</span>
                                    <span className="flex items-center gap-1.5 ml-auto text-emerald-600 font-semibold"><span className="font-bold">Profit:</span>SAR {((job.totalServiceFees || 0) - (job.totalReimbursable || 0)).toLocaleString()}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                    {filteredJobs.length === 0 && (
                        <div className="text-center py-16"><Ship className="h-12 w-12 text-slate-300 mx-auto mb-4" /><h3 className="text-lg font-bold text-slate-900 mb-1">No jobs found</h3><p className="text-sm text-slate-500">Try adjusting your search or filter criteria.</p></div>
                    )}
                    <Pagination currentPage={currentPage} totalPages={Math.ceil(filteredJobs.length / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={filteredJobs.length} />
                </>
            )}
        </div>
    );
};

export default JobList;
