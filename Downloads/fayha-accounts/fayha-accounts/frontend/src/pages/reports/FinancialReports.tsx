import React, { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import { dashboardApi, accountingApi } from '../../services/api';
import {
    FileText, Download, BarChart3, PieChart, TrendingUp,
    Calendar, Eye, RefreshCw, Clock, Loader2,
} from 'lucide-react';

// ---------- Local types ----------

interface GeneratedReport {
    id: string;
    name: string;
    type: 'P&L' | 'Balance Sheet' | 'Cash Flow' | 'Trial Balance';
    period: string;
    generatedAt: string;
    csvData: string;          // pre-built CSV payload for download
    rawData: Record<string, unknown>;
}

// ---------- Helpers ----------

const fmtDate = () =>
    new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const fmtTimestamp = () =>
    new Date().toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Trigger a browser download of a string as a file. */
function downloadFile(filename: string, content: string, mime = 'text/csv;charset=utf-8;') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/** Escape a value for CSV (handles commas, quotes, newlines). */
function csvEscape(val: unknown): string {
    const s = val == null ? '' : String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

/** Convert an array of objects to CSV text. */
function toCsv(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const lines = [
        headers.map(csvEscape).join(','),
        ...rows.map(row => headers.map(h => csvEscape(row[h])).join(',')),
    ];
    return lines.join('\n');
}

// ---------- CSV builders per report type ----------

function buildIncomeStatementCsv(data: any): string {
    const rows: Record<string, unknown>[] = [];

    // Revenue section
    if (data.revenue?.items) {
        rows.push({ Section: 'Revenue', Account: '', Amount: '' });
        for (const item of data.revenue.items) {
            rows.push({ Section: '', Account: item.name || item.account, Amount: item.amount ?? item.total ?? 0 });
        }
        rows.push({ Section: '', Account: 'Total Revenue', Amount: data.revenue.total ?? '' });
    }

    // Expenses section
    if (data.expenses?.items) {
        rows.push({ Section: 'Expenses', Account: '', Amount: '' });
        for (const item of data.expenses.items) {
            rows.push({ Section: '', Account: item.name || item.account, Amount: item.amount ?? item.total ?? 0 });
        }
        rows.push({ Section: '', Account: 'Total Expenses', Amount: data.expenses.total ?? '' });
    }

    rows.push({ Section: 'Net Income', Account: '', Amount: data.netIncome ?? data.net ?? '' });

    // Fallback: if the data has no expected structure, dump all top-level keys
    if (rows.length <= 1) {
        return toCsv(Array.isArray(data) ? data : [data]);
    }
    return toCsv(rows);
}

function buildBalanceSheetCsv(data: any): string {
    const rows: Record<string, unknown>[] = [];

    const addSection = (label: string, section: any) => {
        if (!section?.items && !Array.isArray(section)) return;
        rows.push({ Section: label, Account: '', Amount: '' });
        const items = section.items || section;
        if (Array.isArray(items)) {
            for (const item of items) {
                rows.push({ Section: '', Account: item.name || item.account, Amount: item.amount ?? item.balance ?? 0 });
            }
        }
        if (section.total != null) {
            rows.push({ Section: '', Account: `Total ${label}`, Amount: section.total });
        }
    };

    addSection('Assets', data.assets);
    addSection('Liabilities', data.liabilities);
    addSection('Equity', data.equity);

    if (rows.length === 0) {
        return toCsv(Array.isArray(data) ? data : [data]);
    }
    return toCsv(rows);
}

function buildTrialBalanceCsv(data: any): string {
    const items: any[] = Array.isArray(data) ? data : data.accounts || data.items || [data];
    const rows = items.map((item: any) => ({
        Code: item.code ?? item.accountCode ?? '',
        Account: item.name ?? item.accountName ?? item.account ?? '',
        Debit: item.debit ?? item.debitBalance ?? 0,
        Credit: item.credit ?? item.creditBalance ?? 0,
    }));
    return toCsv(rows);
}

function buildCashFlowCsv(incomeData: any, balanceData: any): string {
    const rows: Record<string, unknown>[] = [];

    const netIncome = incomeData.netIncome ?? incomeData.net ?? 0;
    rows.push({ Section: 'Operating Activities', Item: 'Net Income', Amount: netIncome });

    // Derive rough operating cash flow from income statement
    const totalRevenue = incomeData.revenue?.total ?? 0;
    const totalExpenses = incomeData.expenses?.total ?? 0;
    rows.push({ Section: '', Item: 'Total Revenue', Amount: totalRevenue });
    rows.push({ Section: '', Item: 'Total Expenses', Amount: totalExpenses });
    rows.push({ Section: '', Item: 'Net Operating Cash Flow', Amount: netIncome });

    // Investing placeholder from balance sheet
    const totalAssets = balanceData.assets?.total ?? 0;
    rows.push({ Section: 'Investing Activities', Item: 'Total Assets (ref)', Amount: totalAssets });

    // Financing placeholder from balance sheet
    const totalLiabilities = balanceData.liabilities?.total ?? 0;
    const totalEquity = balanceData.equity?.total ?? 0;
    rows.push({ Section: 'Financing Activities', Item: 'Total Liabilities (ref)', Amount: totalLiabilities });
    rows.push({ Section: '', Item: 'Total Equity (ref)', Amount: totalEquity });

    return toCsv(rows);
}

// ---------- Type config ----------

const typeConfig: Record<string, { icon: any; bg: string; text: string; gradient: string }> = {
    'P&L': { icon: BarChart3, bg: 'bg-emerald-50', text: 'text-emerald-600', gradient: 'from-emerald-500 to-teal-600' },
    'Balance Sheet': { icon: PieChart, bg: 'bg-blue-50', text: 'text-blue-600', gradient: 'from-blue-500 to-indigo-600' },
    'Cash Flow': { icon: TrendingUp, bg: 'bg-purple-50', text: 'text-purple-600', gradient: 'from-purple-500 to-violet-600' },
    'Trial Balance': { icon: FileText, bg: 'bg-amber-50', text: 'text-amber-600', gradient: 'from-amber-500 to-orange-600' },
};

const reportCards = [
    { type: 'P&L' as const, label: 'Profit & Loss', desc: 'Income vs Expenses' },
    { type: 'Balance Sheet' as const, label: 'Balance Sheet', desc: 'Assets, Liabilities & Equity' },
    { type: 'Cash Flow' as const, label: 'Cash Flow', desc: 'Operating, Investing, Financing' },
    { type: 'Trial Balance' as const, label: 'Trial Balance', desc: 'Debit & Credit Totals' },
];

// ==========================================================================
// Component
// ==========================================================================

const FinancialReports: React.FC = () => {
    const [reports, setReports] = useState<GeneratedReport[]>([]);
    const [generating, setGenerating] = useState<string | null>(null);
    const [previewId, setPreviewId] = useState<string | null>(null);

    // ---- Generate a single report ----

    const generate = useCallback(async (type: GeneratedReport['type']) => {
        if (generating) return; // prevent double-clicks
        setGenerating(type);

        try {
            let csvData = '';
            let rawData: any = {};
            let name = '';
            const period = `As of ${fmtDate()}`;

            switch (type) {
                case 'P&L': {
                    const data = await dashboardApi.getIncomeStatement();
                    rawData = data;
                    csvData = buildIncomeStatementCsv(data);
                    name = 'Income Statement (P&L)';
                    break;
                }
                case 'Balance Sheet': {
                    const data = await dashboardApi.getBalanceSheet();
                    rawData = data;
                    csvData = buildBalanceSheetCsv(data);
                    name = 'Balance Sheet';
                    break;
                }
                case 'Cash Flow': {
                    const [incomeData, balanceData] = await Promise.all([
                        dashboardApi.getIncomeStatement(),
                        dashboardApi.getBalanceSheet(),
                    ]);
                    rawData = { incomeStatement: incomeData, balanceSheet: balanceData };
                    csvData = buildCashFlowCsv(incomeData, balanceData);
                    name = 'Cash Flow Statement';
                    break;
                }
                case 'Trial Balance': {
                    const data = await accountingApi.getTrialBalance();
                    rawData = data;
                    csvData = buildTrialBalanceCsv(data);
                    name = 'Trial Balance';
                    break;
                }
            }

            const report: GeneratedReport = {
                id: uid(),
                name,
                type,
                period,
                generatedAt: fmtTimestamp(),
                csvData,
                rawData,
            };

            setReports(prev => [report, ...prev]);
            toast.success(`${name} generated successfully`);
        } catch (err: any) {
            console.error(`Failed to generate ${type}:`, err);
            toast.error(err?.message || `Failed to generate ${type} report`);
        } finally {
            setGenerating(null);
        }
    }, [generating]);

    // ---- Download single CSV ----

    const downloadCsv = useCallback((report: GeneratedReport) => {
        const filename = `${report.name.replace(/[^a-zA-Z0-9]/g, '_')}_${report.id}.csv`;
        downloadFile(filename, report.csvData);
        toast.success(`Downloaded ${report.name}`);
    }, []);

    // ---- Export all reports ----

    const exportAll = useCallback(() => {
        if (reports.length === 0) {
            toast.error('No reports to export. Generate at least one report first.');
            return;
        }

        // Combine all CSVs separated by a header row for each
        const sections = reports.map(r => {
            return `\n--- ${r.name} (${r.period}) ---\n${r.csvData}`;
        });
        const combined = sections.join('\n\n');
        downloadFile(`All_Financial_Reports_${Date.now()}.csv`, combined);
        toast.success(`Exported ${reports.length} report(s)`);
    }, [reports]);

    // ---- Generate all reports (PageHeader "Generate Report" button) ----

    const generateAll = useCallback(async () => {
        for (const card of reportCards) {
            await generate(card.type);
        }
    }, [generate]);

    // ---- Preview modal ----

    const previewReport = reports.find(r => r.id === previewId);

    // ---- Render ----

    return (
        <div className="space-y-6">
            <PageHeader
                title="Financial Reports"
                subtitle="Generate and view key financial statements and analytics."
                onAdd={generateAll}
                onExport={exportAll}
                onImport={() => toast('Import is not supported for financial reports', { icon: 'ℹ️' })}
                addLabel="Generate All Reports"
                showSearch={false}
            />

            {/* Quick Generate Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {reportCards.map((item) => {
                    const config = typeConfig[item.type] || typeConfig['P&L'];
                    const Icon = config.icon;
                    const isLoading = generating === item.type;
                    return (
                        <button
                            key={item.type}
                            onClick={() => generate(item.type)}
                            disabled={!!generating}
                            className="bg-white rounded-2xl p-5 shadow-card border border-slate-100/80 hover:shadow-card-hover hover:border-emerald-200/60 transition-all text-left group disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white shadow-lg mb-3`}>
                                {isLoading
                                    ? <Loader2 className="h-5 w-5 animate-spin" />
                                    : <Icon className="h-5 w-5" />
                                }
                            </div>
                            <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                                {isLoading ? 'Generating...' : `Generate ${item.label}`}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                        </button>
                    );
                })}
            </div>

            {/* Reports List */}
            <div className="card-premium overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Generated Reports</h3>
                        <p className="text-sm text-slate-500 mt-0.5">View and download previously generated reports.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {reports.length > 0 && (
                            <button onClick={exportAll} className="btn-ghost">
                                <Download className="h-4 w-4" />
                                Export All CSV
                            </button>
                        )}
                        <button onClick={() => setReports([])} className="btn-ghost">
                            <RefreshCw className="h-4 w-4" />
                            Clear
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-5">
                    {reports.map((report) => {
                        const config = typeConfig[report.type] || typeConfig['P&L'];
                        const Icon = config.icon;
                        return (
                            <div key={report.id} className="bg-white rounded-xl border border-slate-100 p-5 hover:shadow-md hover:border-emerald-200/60 transition-all group cursor-pointer relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))` }} />

                                <div className="flex justify-between items-start mb-4">
                                    <div className={`h-12 w-12 rounded-xl ${config.bg} flex items-center justify-center ${config.text} group-hover:scale-110 transition-transform`}>
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setPreviewId(report.id)}
                                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            title="Preview"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => downloadCsv(report)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            title="Download CSV"
                                        >
                                            <Download className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-base font-bold text-slate-900 mb-1 group-hover:text-emerald-700 transition-colors">{report.name}</h3>
                                <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-4">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>{report.period}</span>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                                        <Clock className="h-3 w-3" />
                                        {report.generatedAt}
                                    </span>
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${config.bg} ${config.text}`}>
                                        {report.type}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {reports.length === 0 && (
                    <div className="text-center py-16">
                        <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-900 mb-1">No reports generated yet</h3>
                        <p className="text-sm text-slate-500">Click one of the cards above or "Generate All Reports" to create financial statements.</p>
                    </div>
                )}
            </div>

            {/* CSV Preview Modal */}
            {previewReport && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPreviewId(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{previewReport.name}</h3>
                                <p className="text-sm text-slate-500">{previewReport.period}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => downloadCsv(previewReport)} className="btn-ghost">
                                    <Download className="h-4 w-4" />
                                    Download CSV
                                </button>
                                <button onClick={() => setPreviewId(null)} className="btn-ghost">
                                    Close
                                </button>
                            </div>
                        </div>
                        <div className="p-5 overflow-auto flex-1">
                            <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap bg-slate-50 rounded-xl p-4 border border-slate-100">
                                {previewReport.csvData || 'No data available.'}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinancialReports;
