import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Eye,
    FileText,
    Receipt,
    Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { JobReference, Client } from '../../types';
import { jobReferencesApi, customersApi, salesInvoicesApi } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';

const ToBeInvoicedList: React.FC = () => {
    const navigate = useNavigate();
    const [jobReferences, setJobReferences] = useState<JobReference[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [bulkGenerating, setBulkGenerating] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    useEffect(() => {
        Promise.all([jobReferencesApi.getAll(), customersApi.getAll()])
            .then(([jobsRaw, clientsRaw]) => {
                const jobs: JobReference[] = Array.isArray(jobsRaw) ? jobsRaw : [];
                const clientList: Client[] = Array.isArray(clientsRaw) ? clientsRaw : [];
                const invoiceable = jobs.filter(
                    (j) => j.status === 'Delivered' || j.status === 'Customs Cleared'
                );
                setJobReferences(invoiceable);
                setClients(clientList);
                setLoading(false);
            })
            .catch((err) => {
                console.error('Failed to load to-be-invoiced data:', err);
                toast.error('Failed to load job data');
                setLoading(false);
            });
    }, []);

    const getClientName = (clientId: string): string => {
        const client = clients.find((c) => c.id === clientId);
        return client ? client.name : '-';
    };

    const handleGenerateInvoice = async (job: JobReference) => {
        setGeneratingId(job.id);
        try {
            const invoice = await salesInvoicesApi.create({
                jobRefId: job.id,
                clientId: job.clientId,
                invoiceDate: new Date().toISOString().split('T')[0],
                saleMethod: 'Credit',
                category: 'Customs Clearance Invoice',
            });
            toast.success(`Invoice created for ${job.jobRefNo}`);
            // Navigate to the new invoice
            const invoiceId = invoice?.id;
            if (invoiceId) {
                navigate(`/sales-invoice/${invoiceId}`);
            } else {
                navigate(`/sales-invoice/new?jobRefId=${job.id}`);
            }
        } catch (err: any) {
            console.error('Failed to generate invoice:', err);
            toast.error(err?.message || 'Failed to generate invoice');
            // Fallback: navigate to new invoice form with pre-filled job ref
            navigate(`/sales-invoice/new?jobRefId=${job.id}`);
        } finally {
            setGeneratingId(null);
        }
    };

    const handleBulkGenerate = async () => {
        if (jobReferences.length === 0) {
            toast.error('No jobs available for invoicing');
            return;
        }
        setBulkGenerating(true);
        let successCount = 0;
        let failCount = 0;

        for (const job of jobReferences) {
            try {
                await salesInvoicesApi.create({
                    jobRefId: job.id,
                    clientId: job.clientId,
                    invoiceDate: new Date().toISOString().split('T')[0],
                    saleMethod: 'Credit',
                    category: 'Customs Clearance Invoice',
                });
                successCount++;
            } catch {
                failCount++;
            }
        }

        if (successCount > 0) {
            toast.success(`Successfully generated ${successCount} invoice(s)`);
        }
        if (failCount > 0) {
            toast.error(`Failed to generate ${failCount} invoice(s)`);
        }
        setBulkGenerating(false);

        // Refresh the list
        try {
            const jobsRaw = await jobReferencesApi.getAll();
            const jobs: JobReference[] = Array.isArray(jobsRaw) ? jobsRaw : [];
            const invoiceable = jobs.filter(
                (j) => j.status === 'Delivered' || j.status === 'Customs Cleared'
            );
            setJobReferences(invoiceable);
        } catch {
            // silently ignore refresh error
        }
    };

    const paginatedJobs = jobReferences.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <PageHeader
                title="To Be Invoiced"
                subtitle="Jobs ready for invoicing - Delivered and Customs Cleared."
                onAdd={handleBulkGenerate}
                onExport={() => toast.success('Exporting...')}
                onImport={() => toast.success('Importing...')}
                addLabel={bulkGenerating ? 'Generating...' : 'Bulk Generate'}
                showSearch={false}
            />

            {/* Summary Card */}
            <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <Receipt className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-xl font-bold text-slate-900">{jobReferences.length}</p>
                    <p className="text-xs text-slate-500">Jobs Ready for Invoicing</p>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="card-premium overflow-hidden">
                    <div className="p-6 space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex gap-4 items-center">
                                <div className="h-4 w-8 skeleton rounded" />
                                <div className="h-4 w-32 skeleton rounded" />
                                <div className="h-4 w-48 skeleton rounded flex-1" />
                                <div className="h-4 w-20 skeleton rounded" />
                                <div className="h-6 w-24 skeleton rounded-full" />
                                <div className="h-4 w-24 skeleton rounded" />
                                <div className="h-4 w-28 skeleton rounded" />
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
                                    <th>Status</th>
                                    <th>Total Cost</th>
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
                                                {job.jobRefNo}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="text-sm font-medium text-slate-700">
                                                {getClientName(job.clientId)}
                                            </span>
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
                                            <StatusBadge status={job.status} />
                                        </td>
                                        <td>
                                            <span className="text-sm font-bold text-slate-900">
                                                SAR {(job.totalPayableCost || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => navigate(`/job-reference/${job.id}`)}
                                                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                                    title="View Job"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleGenerateInvoice(job)}
                                                    disabled={generatingId === job.id}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Generate Invoice"
                                                >
                                                    {generatingId === job.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <FileText className="h-3.5 w-3.5" />
                                                    )}
                                                    {generatingId === job.id ? 'Generating...' : 'Generate Invoice'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {jobReferences.length === 0 && (
                        <div className="text-center py-16">
                            <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-900 mb-1">No jobs to invoice</h3>
                            <p className="text-sm text-slate-500">
                                All delivered and cleared jobs have been invoiced.
                            </p>
                        </div>
                    )}

                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(jobReferences.length / itemsPerPage)}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        totalItems={jobReferences.length}
                    />
                </div>
            )}
        </div>
    );
};

export default ToBeInvoicedList;
