import React, { useEffect, useState } from 'react';
import {
  Package,
  ShieldCheck,
  Ship,
  ClipboardList,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { dashboardApi, jobReferencesApi, shipmentsApi, dailyWorkOrdersApi } from '../../services/api';

// Default chart colors
const STATUS_COLORS: Record<string, string> = {
  Draft: '#94a3b8', Active: '#3b82f6', 'In Progress': '#8b5cf6',
  'Customs Cleared': '#6366f1', Delivered: '#10b981', Invoiced: '#f59e0b',
  Closed: '#64748b', Booked: '#94a3b8', 'In Transit': '#3b82f6',
  Arrived: '#8b5cf6', Pending: '#f59e0b', Completed: '#10b981',
};

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#94a3b8'];

// KPI Card
const KPICard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ElementType;
  gradient: string;
}> = ({ title, value, icon: Icon, gradient }) => (
  <div className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${gradient} text-white shadow-lg`}>
    <div className="flex items-center gap-3">
      <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  </div>
);

const DisplayPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ activeJobs: 0, pendingClearances: 0, shipmentsInTransit: 0, todayWorkOrders: 0 });
  const [jobsByStatus, setJobsByStatus] = useState<any[]>([]);
  const [shipmentsByCarrier, setShipmentsByCarrier] = useState<any[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Try to get dashboard summary first
        let summaryData: any = null;
        try {
          summaryData = await dashboardApi.getSummary();
        } catch {
          // Dashboard summary endpoint may not exist yet
        }

        if (summaryData && summaryData.jobsByStatus) {
          // Use real dashboard data
          setJobsByStatus(summaryData.jobsByStatus.map((j: any) => ({ ...j, color: STATUS_COLORS[j.name] || '#94a3b8' })));
          setShipmentsByCarrier(summaryData.shipmentsByCarrier || []);
          setMonthlyRevenue(summaryData.monthlyRevenue || []);
          setKpis({
            activeJobs: summaryData.activeJobs || 0,
            pendingClearances: summaryData.pendingClearances || 0,
            shipmentsInTransit: summaryData.shipmentsInTransit || 0,
            todayWorkOrders: summaryData.todayWorkOrders || 0,
          });
        } else {
          // Fallback: compute from individual APIs
          const [jobs, shipments, workOrders] = await Promise.all([
            jobReferencesApi.getAll().catch(() => []),
            shipmentsApi.getAll().catch(() => []),
            dailyWorkOrdersApi.getAll().catch(() => []),
          ]);

          const jobsArr = Array.isArray(jobs) ? jobs : [];
          const shipmentsArr = Array.isArray(shipments) ? shipments : [];
          const woArr = Array.isArray(workOrders) ? workOrders : [];

          // KPIs
          const activeJobs = jobsArr.filter((j: any) => j.status && j.status !== 'Closed' && j.status !== 'Draft').length;
          const pendingClearances = jobsArr.filter((j: any) => j.status === 'Active' || j.status === 'In Progress').length;
          const shipmentsInTransit = shipmentsArr.filter((s: any) => s.status === 'In Transit').length;
          const today = new Date().toISOString().split('T')[0];
          const todayWorkOrders = woArr.filter((w: any) => w.date && w.date.toString().startsWith(today)).length || woArr.length;

          setKpis({ activeJobs, pendingClearances, shipmentsInTransit, todayWorkOrders });

          // Jobs by status
          const statusCounts: Record<string, number> = {};
          jobsArr.forEach((j: any) => {
            const s = j.status || 'Draft';
            statusCounts[s] = (statusCounts[s] || 0) + 1;
          });
          setJobsByStatus(Object.entries(statusCounts).map(([name, count]) => ({
            name, count, color: STATUS_COLORS[name] || '#94a3b8',
          })));

          // Shipments by carrier
          const carrierCounts: Record<string, number> = {};
          shipmentsArr.forEach((s: any) => {
            const c = s.carrier || 'Unknown';
            carrierCounts[c] = (carrierCounts[c] || 0) + 1;
          });
          setShipmentsByCarrier(Object.entries(carrierCounts).map(([name, value], i) => ({
            name, value, color: PIE_COLORS[i % PIE_COLORS.length],
          })));

          // No monthly revenue data available from individual APIs
          setMonthlyRevenue([]);
        }
      } catch (err) {
        console.error('Failed to load display data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-slate-900 tracking-tight">Operations Display Board</h1></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 skeleton rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1,2].map(i => <div key={i} className="h-80 skeleton rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Operations Display Board</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Real-time KPIs, operational metrics, and performance charts.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Active Jobs" value={kpis.activeJobs} icon={Package} gradient="from-emerald-500 to-emerald-700" />
        <KPICard title="Pending Clearances" value={kpis.pendingClearances} icon={ShieldCheck} gradient="from-blue-500 to-blue-700" />
        <KPICard title="Shipments In Transit" value={kpis.shipmentsInTransit} icon={Ship} gradient="from-purple-500 to-purple-700" />
        <KPICard title="Today's Work Orders" value={kpis.todayWorkOrders} icon={ClipboardList} gradient="from-amber-500 to-amber-700" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jobs by Status */}
        <div className="card-premium p-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Jobs by Status</h3>
          <div className="h-72">
            {jobsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jobsByStatus} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {jobsByStatus.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">No job data available</div>
            )}
          </div>
        </div>

        {/* Shipments by Carrier */}
        <div className="card-premium p-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Shipments by Carrier</h3>
          <div className="h-72">
            {shipmentsByCarrier.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={shipmentsByCarrier} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {shipmentsByCarrier.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">No shipment data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="card-premium p-6">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Monthly Revenue vs Expenses</h3>
        <div className="h-80">
          {monthlyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyRevenue} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} formatter={(value: number) => [`SAR ${value.toLocaleString()}`, '']} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: '#10b981' }} activeDot={{ r: 7 }} name="Revenue" />
                <Line type="monotone" dataKey="expenses" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, fill: '#f59e0b' }} activeDot={{ r: 7 }} name="Expenses" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">No revenue data available</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DisplayPage;
