import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { invoicesApi, billsApi } from '../../services/api';
import { Clock, Users, Building, RefreshCw } from 'lucide-react';

interface AgingBucket {
  entityName: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  over120: number;
  total: number;
}

const AgingReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ar' | 'ap'>('ar');
  const [arData, setArData] = useState<AgingBucket[]>([]);
  const [apData, setApData] = useState<AgingBucket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ar, ap] = await Promise.all([
        invoicesApi.getAging().catch(() => []),
        billsApi.getAging().catch(() => []),
      ]);
      setArData(Array.isArray(ar) ? ar : (ar?.buckets || []));
      setApData(Array.isArray(ap) ? ap : (ap?.buckets || []));
    } catch {
      setArData([]);
      setApData([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const data = activeTab === 'ar' ? arData : apData;
  const totals = data.reduce((acc, row) => ({
    current: acc.current + (row.current || 0),
    days30: acc.days30 + (row.days30 || 0),
    days60: acc.days60 + (row.days60 || 0),
    days90: acc.days90 + (row.days90 || 0),
    over120: acc.over120 + (row.over120 || 0),
    total: acc.total + (row.total || 0),
  }), { current: 0, days30: 0, days60: 0, days90: 0, over120: 0, total: 0 });

  const bucketColors = [
    { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    { bg: 'bg-blue-50', text: 'text-blue-700' },
    { bg: 'bg-amber-50', text: 'text-amber-700' },
    { bg: 'bg-orange-50', text: 'text-orange-700' },
    { bg: 'bg-red-50', text: 'text-red-700' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aging Reports"
        subtitle="Accounts receivable and payable aging analysis."
        onAdd={() => {}}
        onImport={() => {}}
        onExport={() => {
          const lines = ['Entity,Current,1-30 Days,31-60 Days,61-90 Days,90+ Days,Total', ...data.map(r => `"${r.entityName}",${r.current},${r.days30},${r.days60},${r.days90},${r.over120},${r.total}`)];
          const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = `aging-${activeTab}.csv`; a.click();
        }}
        addLabel=""
      />

      {/* Tabs */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveTab('ar')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'ar' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Users className="h-4 w-4" />
          Accounts Receivable (AR)
        </button>
        <button
          onClick={() => setActiveTab('ap')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'ap' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Building className="h-4 w-4" />
          Accounts Payable (AP)
        </button>
        <button onClick={fetchData} className="ml-auto btn-ghost text-sm"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Current', value: totals.current, ...bucketColors[0] },
          { label: '1-30 Days', value: totals.days30, ...bucketColors[1] },
          { label: '31-60 Days', value: totals.days60, ...bucketColors[2] },
          { label: '61-90 Days', value: totals.days90, ...bucketColors[3] },
          { label: '90+ Days', value: totals.over120, ...bucketColors[4] },
        ].map((bucket) => (
          <div key={bucket.label} className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80">
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-3 w-3 rounded-full ${bucket.bg.replace('bg-', 'bg-').replace('-50', '-400')}`} />
              <span className="text-xs font-semibold text-slate-500">{bucket.label}</span>
            </div>
            <p className={`text-lg font-bold ${bucket.text}`}>SAR {(bucket.value || 0).toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Aging Table */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
        <div className={`p-5 border-b border-slate-100 bg-gradient-to-r ${activeTab === 'ar' ? 'from-emerald-600 to-emerald-500' : 'from-rose-600 to-rose-500'}`}>
          <h3 className="text-lg font-bold text-white">{activeTab === 'ar' ? 'Accounts Receivable' : 'Accounts Payable'} Aging</h3>
          <p className="text-sm text-white/70">Total: SAR {(totals.total || 0).toLocaleString()} across {data.length} {activeTab === 'ar' ? 'customers' : 'vendors'}</p>
        </div>

        {loading ? (
          <div className="p-16 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading aging report...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="p-16 text-center">
            <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">No aging data</h3>
            <p className="text-sm text-slate-500">No outstanding {activeTab === 'ar' ? 'invoices' : 'bills'} found.</p>
          </div>
        ) : (
          <table className="table-premium">
            <thead>
              <tr>
                <th>{activeTab === 'ar' ? 'Customer' : 'Vendor'}</th>
                <th className="text-right w-32">Current</th>
                <th className="text-right w-32">1-30 Days</th>
                <th className="text-right w-32">31-60 Days</th>
                <th className="text-right w-32">61-90 Days</th>
                <th className="text-right w-32">90+ Days</th>
                <th className="text-right w-36">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100/80 last:border-0">
                  <td className="py-3 px-4 text-sm font-medium text-slate-800">{row.entityName}</td>
                  <td className="py-3 px-4 text-right text-sm font-semibold text-emerald-700">{row.current > 0 ? (row.current || 0).toLocaleString() : '-'}</td>
                  <td className="py-3 px-4 text-right text-sm font-semibold text-blue-700">{row.days30 > 0 ? (row.days30 || 0).toLocaleString() : '-'}</td>
                  <td className="py-3 px-4 text-right text-sm font-semibold text-amber-700">{row.days60 > 0 ? (row.days60 || 0).toLocaleString() : '-'}</td>
                  <td className="py-3 px-4 text-right text-sm font-semibold text-orange-700">{row.days90 > 0 ? (row.days90 || 0).toLocaleString() : '-'}</td>
                  <td className="py-3 px-4 text-right text-sm font-semibold text-red-700">{row.over120 > 0 ? (row.over120 || 0).toLocaleString() : '-'}</td>
                  <td className="py-3 px-4 text-right text-sm font-bold text-slate-900">{(row.total || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200">
                <td className="py-4 px-4 text-sm font-bold text-slate-900 uppercase tracking-wider">Totals</td>
                <td className="py-4 px-4 text-right text-sm font-bold text-emerald-700">{(totals.current || 0).toLocaleString()}</td>
                <td className="py-4 px-4 text-right text-sm font-bold text-blue-700">{(totals.days30 || 0).toLocaleString()}</td>
                <td className="py-4 px-4 text-right text-sm font-bold text-amber-700">{(totals.days60 || 0).toLocaleString()}</td>
                <td className="py-4 px-4 text-right text-sm font-bold text-orange-700">{(totals.days90 || 0).toLocaleString()}</td>
                <td className="py-4 px-4 text-right text-sm font-bold text-red-700">{(totals.over120 || 0).toLocaleString()}</td>
                <td className="py-4 px-4 text-right text-base font-bold text-slate-900">{(totals.total || 0).toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
};

export default AgingReports;
