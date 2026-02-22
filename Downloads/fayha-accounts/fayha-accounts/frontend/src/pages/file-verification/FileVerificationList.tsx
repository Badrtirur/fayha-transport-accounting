import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Search,
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldX,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type { FileVerification, JobReference } from '../../types';
import { fileVerificationsApi, jobReferencesApi } from '../../services/api';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';

const FileVerificationList: React.FC = () => {
  const [verifications, setVerifications] = useState<FileVerification[]>([]);
  const [jobRefs, setJobRefs] = useState<JobReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formJobRefNum, setFormJobRefNum] = useState('');
  const [formClientName, setFormClientName] = useState('');
  const [formDocumentType, setFormDocumentType] = useState('Bill of Lading');
  const [formNotes, setFormNotes] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    Promise.all([fileVerificationsApi.getAll(), jobReferencesApi.getAll()]).then(([fvData, jrData]) => {
      setVerifications(Array.isArray(fvData) ? fvData : []);
      setJobRefs(Array.isArray(jrData) ? jrData : []);
      setLoading(false);
    }).catch(() => { setVerifications([]); setJobRefs([]); setLoading(false); });
  }, []);

  const handleCreate = async () => {
    if (!formDocumentType) {
      toast.error('Document type is required.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
      return;
    }
    setSaving(true);
    try {
      const created = await fileVerificationsApi.create({
        jobReferenceNum: formJobRefNum || undefined,
        clientName: formClientName || undefined,
        documentType: formDocumentType,
        status: 'Pending',
        notes: formNotes || undefined,
      });
      setVerifications(prev => [...prev, created]);
      toast.success('Verification entry created!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
      setShowModal(false);
      setFormJobRefNum(''); setFormClientName(''); setFormDocumentType('Bill of Lading'); setFormNotes('');
    } catch {
      toast.error('Failed to create entry.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this verification entry?')) return;
    try {
      await fileVerificationsApi.remove(id);
      setVerifications(prev => prev.filter(v => v.id !== id));
      toast.success('Entry deleted!', { style: { borderRadius: '12px', background: '#10b981', color: '#fff' } });
    } catch {
      toast.error('Failed to delete entry.', { style: { borderRadius: '12px', background: '#ef4444', color: '#fff' } });
    }
  };

  const handleApprove = (fv: FileVerification) => {
    const updateData = { status: 'Verified' as const, verifiedBy: 'Current User', verifiedAt: new Date().toISOString() };
    fileVerificationsApi.update(fv.id, updateData).then((updated) => {
      setVerifications((prev) => prev.map((v) => (v.id === fv.id ? updated : v)));
      toast.success(`${fv.fileName} approved successfully!`, {
        style: { borderRadius: '12px', background: '#10b981', color: '#fff' },
      });
    });
  };

  const handleReject = (fv: FileVerification) => {
    const updateData = { status: 'Rejected' as const, verifiedBy: 'Current User', verifiedAt: new Date().toISOString() };
    fileVerificationsApi.update(fv.id, updateData).then((updated) => {
      setVerifications((prev) => prev.map((v) => (v.id === fv.id ? updated : v)));
      toast.success(`${fv.fileName} rejected.`, {
        style: { borderRadius: '12px', background: '#ef4444', color: '#fff' },
      });
    });
  };

  const getJobRefNo = (jobRefId: string): string => {
    const job = jobRefs.find((j) => j.id === jobRefId);
    return job ? job.jobRefNo : '-';
  };

  const filtered = verifications.filter((v) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (v.fileName || '').toLowerCase().includes(q) ||
      (v.documentType || '').toLowerCase().includes(q) ||
      getJobRefNo(v.jobRefId).toLowerCase().includes(q)
    );
  });

  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalFiles = verifications.length;
  const pendingCount = verifications.filter((v) => v.status === 'Pending').length;
  const verifiedCount = verifications.filter((v) => v.status === 'Verified').length;
  const rejectedCount = verifications.filter((v) => v.status === 'Rejected').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">File Verification</h1>
          <p className="text-slate-500 mt-1 text-sm">Verify and manage shipping documents for all job references.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Add Verification
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><FileCheck className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Total Files</p>
              <p className="text-2xl font-bold">{totalFiles}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><Clock className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Pending</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-lg shadow-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><CheckCircle2 className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Verified</p>
              <p className="text-2xl font-bold">{verifiedCount}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center"><XCircle className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Rejected</p>
              <p className="text-2xl font-bold">{rejectedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl shadow-card border border-slate-100/80">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} placeholder="Search by file name, document type, or job ref..." className="input-premium pl-10" />
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
                    <th>Job Ref</th>
                    <th>Document Type</th>
                    <th>File Name</th>
                    <th className="text-center">Status</th>
                    <th>Verified By</th>
                    <th>Date</th>
                    <th>Remarks</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((fv, index) => (
                    <tr key={fv.id}>
                      <td className="text-sm text-slate-500 font-medium">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td><span className="text-xs font-mono text-slate-500">{getJobRefNo(fv.jobRefId)}</span></td>
                      <td><span className="text-sm text-slate-700">{fv.documentType}</span></td>
                      <td><span className="text-sm font-medium text-slate-900">{fv.fileName}</span></td>
                      <td className="text-center"><StatusBadge status={fv.status} /></td>
                      <td><span className="text-sm text-slate-600">{fv.verifiedBy || '-'}</span></td>
                      <td><span className="text-sm text-slate-600">{fv.verifiedAt ? new Date(fv.verifiedAt).toLocaleDateString() : '-'}</span></td>
                      <td><span className="text-sm text-slate-500 truncate max-w-[200px] block">{fv.remarks || '-'}</span></td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {fv.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(fv)}
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                title="Approve"
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleReject(fv)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                title="Reject"
                              >
                                <ShieldX className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button onClick={() => handleDelete(fv.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <FileCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">No files found</h3>
                <p className="text-sm text-slate-500">Try adjusting your search criteria.</p>
              </div>
            )}

            <Pagination currentPage={currentPage} totalPages={Math.ceil(filtered.length / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={filtered.length} />
          </>
        )}
      </div>
      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Add File Verification</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Job Reference #</label>
                <input type="text" className="input-premium w-full" placeholder="e.g. JR-2026-0001" value={formJobRefNum} onChange={(e) => setFormJobRefNum(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Client Name</label>
                <input type="text" className="input-premium w-full" placeholder="Client name..." value={formClientName} onChange={(e) => setFormClientName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Document Type<span className="text-rose-500 ml-0.5">*</span></label>
                <select className="input-premium w-full" value={formDocumentType} onChange={(e) => setFormDocumentType(e.target.value)}>
                  <option value="Bill of Lading">Bill of Lading</option>
                  <option value="Commercial Invoice">Commercial Invoice</option>
                  <option value="Packing List">Packing List</option>
                  <option value="Certificate of Origin">Certificate of Origin</option>
                  <option value="Customs Declaration">Customs Declaration</option>
                  <option value="Insurance Certificate">Insurance Certificate</option>
                  <option value="SASO Certificate">SASO Certificate</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Notes</label>
                <textarea className="input-premium w-full resize-none" rows={2} placeholder="Notes..." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleCreate} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileVerificationList;
