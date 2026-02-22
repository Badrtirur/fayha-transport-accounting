import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Calculator,
  BarChart3,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { JobReference, Client } from '../../types';
import { jobReferencesApi, customersApi } from '../../services/api';
import Pagination from '../../components/common/Pagination';

const JobCostCenter: React.FC = () => {
  const [jobs, setJobs] = useState<JobReference[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 8;

  useEffect(() => {
    Promise.all([jobReferencesApi.getAll(), customersApi.getAll()])
      .then(([jobsRaw, clientsRaw]) => {
        const jobData: JobReference[] = Array.isArray(jobsRaw) ? jobsRaw : [];
        const clientData: Client[] = Array.isArray(clientsRaw) ? clientsRaw : [];
        setJobs(jobData);
        setClients(clientData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load job cost center data:', err);
        toast.error('Failed to load job cost center data');
        setLoading(false);
      });
  }, []);

  const getClientName = (clientId: string): string => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.name : '-';
  };

  const filtered = jobs.filter((j) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (j.jobRefNo || '').toLowerCase().includes(q) || getClientName(j.clientId).toLowerCase().includes(q);
  });

  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalJobs = jobs.length;
  const totalCost = jobs.reduce((s, j) => s + (j.totalPayableCost || 0), 0);
  const avgCost = totalJobs > 0 ? totalCost / totalJobs : 0;
  const highestCost = jobs.reduce((max, j) => Math.max(max, j.totalPayableCost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Job Cost Center</h1>
        <p className="text-slate-500 mt-1 text-sm">Analyze job costs, profitability, and cost breakdowns.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><BarChart3 className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Total Jobs</p>
              <p className="text-2xl font-bold">{totalJobs}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><DollarSign className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Total Cost</p>
              <p className="text-lg font-bold">SAR {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-lg shadow-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><Calculator className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Avg Cost/Job</p>
              <p className="text-lg font-bold">SAR {avgCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><TrendingUp className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Highest Cost</p>
              <p className="text-lg font-bold">SAR {highestCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl shadow-card border border-slate-100/80">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} placeholder="Search by job ref or client..." className="input-premium pl-10" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">{[1, 2, 3, 4, 5].map((i) => (<div key={i} className="flex items-center gap-4"><div className="h-4 w-6 skeleton rounded" /><div className="flex-1 h-4 skeleton rounded" /><div className="h-4 w-28 skeleton rounded" /></div>))}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-premium">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Job Ref</th>
                    <th>Client</th>
                    <th className="text-right">Total Payable</th>
                    <th className="text-right">Container Detention</th>
                    <th className="text-right">Estimated Cost</th>
                    <th className="text-right">Shipment Cost</th>
                    <th className="text-right">Profit / Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((job, index) => {
                    const profitLoss = (job.estimatedCost || 0) - (job.totalPayableCost || 0);
                    return (
                      <tr key={job.id}>
                        <td className="text-sm text-slate-500 font-medium">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                        <td><span className="text-sm font-bold text-slate-900 font-mono">{job.jobRefNo}</span></td>
                        <td><span className="text-sm font-medium text-slate-700 truncate max-w-[200px] block">{getClientName(job.clientId)}</span></td>
                        <td className="text-right"><span className="text-sm font-semibold text-slate-900">SAR {(job.totalPayableCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                        <td className="text-right"><span className="text-sm text-slate-600">SAR {(job.containerDetention || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                        <td className="text-right"><span className="text-sm text-slate-600">SAR {(job.estimatedCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                        <td className="text-right"><span className="text-sm text-slate-600">SAR {(job.shipmentProcessCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                        <td className="text-right">
                          <span className={`text-sm font-bold ${profitLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {profitLoss >= 0 ? '+' : ''}SAR {profitLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">No jobs found</h3>
                <p className="text-sm text-slate-500">Try adjusting your search criteria.</p>
              </div>
            )}

            <Pagination currentPage={currentPage} totalPages={Math.ceil(filtered.length / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={filtered.length} />
          </>
        )}
      </div>
    </div>
  );
};

export default JobCostCenter;
