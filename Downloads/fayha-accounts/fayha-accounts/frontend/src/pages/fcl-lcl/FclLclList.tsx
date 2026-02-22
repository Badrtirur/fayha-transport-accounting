import React, { useEffect, useState } from 'react';
import {
  Search,
  Container,
  Box,
  Truck,
  Package,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { ContainerDetail, JobReference, Client } from '../../types';
import { jobReferencesApi, customersApi } from '../../services/api';
import Pagination from '../../components/common/Pagination';

const formatDate = (d: any): string => {
  if (!d) return '-';
  try { const date = new Date(d); if (isNaN(date.getTime())) return String(d); return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return String(d); }
};

const containerTypeColors: Record<string, { bg: string; text: string }> = {
  '20ft': { bg: 'bg-blue-50', text: 'text-blue-700' },
  '40ft': { bg: 'bg-purple-50', text: 'text-purple-700' },
  'LCL': { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  'AIR PALLET': { bg: 'bg-amber-50', text: 'text-amber-700' },
  'BREAK BULK': { bg: 'bg-rose-50', text: 'text-rose-700' },
};

interface FlatContainer extends ContainerDetail {
  jobRefNo: string;
  jobRefId: string;
  clientName: string;
}

const FclLclList: React.FC = () => {
  const [containers, setContainers] = useState<FlatContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    Promise.all([jobReferencesApi.getAll(), customersApi.getAll()])
      .then(([jobsRaw, clientsRaw]) => {
        const jobs: JobReference[] = Array.isArray(jobsRaw) ? jobsRaw : [];
        const clients: Client[] = Array.isArray(clientsRaw) ? clientsRaw : [];
        const flat: FlatContainer[] = [];
        jobs.forEach((job) => {
          const client = clients.find((c) => c.id === job.clientId);
          (job.containers || []).forEach((ctr) => {
            flat.push({
              ...ctr,
              jobRefNo: job.jobRefNo,
              jobRefId: job.id,
              clientName: client ? client.name : '-',
            });
          });
        });
        setContainers(flat);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load FCL/LCL data:', err);
        toast.error('Failed to load container data');
        setLoading(false);
      });
  }, []);

  const filtered = containers.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.uniqueNumber || '').toLowerCase().includes(q) ||
      (c.jobRefNo || '').toLowerCase().includes(q) ||
      (c.clientName || '').toLowerCase().includes(q)
    );
  });

  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalContainers = containers.length;
  const count20ft = containers.filter((c) => c.type === '20ft').length;
  const count40ft = containers.filter((c) => c.type === '40ft').length;
  const countLCL = containers.filter((c) => c.type === 'LCL').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">FCL / LCL Containers</h1>
        <p className="text-slate-500 mt-1 text-sm">Track containers, pallets, and break bulk shipments across all jobs.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><Container className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Total Containers</p>
              <p className="text-2xl font-bold">{totalContainers}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><Box className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">20ft</p>
              <p className="text-2xl font-bold">{count20ft}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-lg shadow-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><Truck className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">40ft</p>
              <p className="text-2xl font-bold">{count40ft}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><Package className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">LCL</p>
              <p className="text-2xl font-bold">{countLCL}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl shadow-card border border-slate-100/80">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} placeholder="Search by container #, job ref, or client..." className="input-premium pl-10" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">{[1, 2, 3, 4, 5].map((i) => (<div key={i} className="flex items-center gap-4"><div className="h-4 w-6 skeleton rounded" /><div className="flex-1 h-4 skeleton rounded" /><div className="h-6 w-20 skeleton rounded-full" /></div>))}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-premium">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Container #</th>
                    <th>Type</th>
                    <th>Job Ref</th>
                    <th>Delivery Date</th>
                    <th>Delivery Point</th>
                    <th>Cargo Description</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((ctr, index) => {
                    const typeColor = containerTypeColors[ctr.type] || { bg: 'bg-slate-50', text: 'text-slate-600' };
                    return (
                      <tr key={`${ctr.jobRefId}-${ctr.id}`}>
                        <td className="text-sm text-slate-500 font-medium">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                        <td><span className="text-sm font-bold text-slate-900 font-mono">{ctr.uniqueNumber}</span></td>
                        <td>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${typeColor.bg} ${typeColor.text}`}>
                            {ctr.type}
                          </span>
                        </td>
                        <td><span className="text-xs font-mono text-slate-500">{ctr.jobRefNo}</span></td>
                        <td><span className="text-sm text-slate-600">{formatDate(ctr.deliveryDate)}</span></td>
                        <td><span className="text-sm text-slate-600 truncate max-w-[180px] block">{ctr.deliveryPoint}</span></td>
                        <td><span className="text-sm text-slate-600 truncate max-w-[200px] block">{ctr.cargoDescription}</span></td>
                        <td className="text-center">
                          <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="View">
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <Container className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">No containers found</h3>
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

export default FclLclList;
