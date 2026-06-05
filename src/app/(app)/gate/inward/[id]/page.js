'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { clsx } from 'clsx';
import { CheckCircle, XCircle, Send, Package } from 'lucide-react';

const STATUS_STYLES = {
  PENDING:       'bg-yellow-100 text-yellow-700',
  VERIFIED:      'bg-blue-100 text-blue-700',
  SENT_TO_STORES:'bg-purple-100 text-purple-700',
  COMPLETED:     'bg-green-100 text-green-700',
  REJECTED:      'bg-red-100 text-red-700',
};

export default function GateInwardDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [entry, setEntry]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [saving, setSaving]   = useState('');
  const [showReject, setShowReject] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchEntry = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/gate-inward/${id}`);
      setEntry(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchEntry(); }, [id]);

  const handleAction = async (action, body = {}) => {
    setSaving(action); setError('');
    try {
      await api.patch(`/gate-inward/${id}/${action}`, body);
      fetchEntry();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setSaving(''); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const formatNum = (n) => n != null ? n.toLocaleString('en-IN') : '—';

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div></AppLayout>;

  return (
    <AppLayout>
      <PageHeader
        title={entry?.ginNumber || 'Gate Inward'}
        subtitle={entry?.supplierName}
        action={<button onClick={() => router.push('/gate/inward')} className="border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">← Back</button>}
      />

      {error && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm">{error}</div>}

      <div className="grid grid-cols-3 gap-6">
        {/* Main */}
        <div className="col-span-2 space-y-4">

          {/* Material Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><Package size={15} /> Material Details</h3>
            <dl className="grid grid-cols-2 gap-3">
              {[
                { label: 'Material',      value: entry?.materialDescription },
                { label: 'Quantity',      value: `${entry?.quantity} ${entry?.unit}` },
                { label: 'Package Count', value: entry?.packageCount || '—' },
                { label: 'Gross Weight',  value: entry?.grossWeight ? `${entry.grossWeight} kg` : '—' },
                { label: 'Net Weight',    value: entry?.netWeight ? `${entry.netWeight} kg` : '—' },
                { label: 'PO Number',     value: entry?.poNumber || '—' },
                { label: 'Invoice No.',   value: entry?.invoiceNumber || '—' },
                { label: 'Invoice Amount',value: entry?.invoiceAmount ? `₹${formatNum(entry.invoiceAmount)}` : '—' },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="text-xs text-gray-400 font-medium">{item.label}</dt>
                  <dd className="text-sm text-gray-800 font-medium mt-0.5">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Actions</h3>
            <div className="flex flex-wrap gap-2">
              {entry?.status === 'PENDING' && (
                <button onClick={() => handleAction('verify', { remarks: 'Verified at gate' })} disabled={!!saving}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  <CheckCircle size={14} />{saving === 'verify' ? 'Verifying...' : 'Verify'}
                </button>
              )}
              {entry?.status === 'VERIFIED' && (
                <button onClick={() => handleAction('send-to-stores')} disabled={!!saving}
                  className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors">
                  <Send size={14} />{saving === 'send-to-stores' ? 'Sending...' : 'Send to Stores'}
                </button>
              )}
              {entry?.status === 'SENT_TO_STORES' && (
                <button onClick={() => handleAction('complete')} disabled={!!saving}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                  <CheckCircle size={14} />{saving === 'complete' ? 'Completing...' : 'Mark Complete'}
                </button>
              )}
              {!['COMPLETED','REJECTED'].includes(entry?.status) && (
                <button onClick={() => setShowReject(!showReject)}
                  className="flex items-center gap-2 border-2 border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
                  <XCircle size={14} /> Reject
                </button>
              )}
            </div>

            {showReject && (
              <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Rejection Reason <span className="text-red-500">*</span></label>
                <input type="text" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Material does not match PO..."
                  style={{ color: '#111827', backgroundColor: '#ffffff' }}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 mb-3" />
                <div className="flex gap-2">
                  <button onClick={() => { handleAction('reject', { rejectionReason }); setShowReject(false); }}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 transition-colors">
                    Confirm Reject
                  </button>
                  <button onClick={() => setShowReject(false)}
                    className="border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {entry?.status === 'REJECTED' && entry?.rejectionReason && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-bold text-red-700">Rejection Reason:</p>
                <p className="text-sm text-red-600 mt-1">{entry.rejectionReason}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Details</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-400">Status</dt>
                <dd className="mt-0.5">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[entry?.status] || ''}`}>
                    {entry?.status?.replace(/_/g, ' ')}
                  </span>
                </dd>
              </div>
              <div><dt className="text-xs text-gray-400">Plant</dt><dd className="text-sm text-gray-800 mt-0.5">{entry?.plant?.name}</dd></div>
              <div><dt className="text-xs text-gray-400">Received By</dt><dd className="text-sm text-gray-800 mt-0.5">{entry?.receivedBy?.firstName} {entry?.receivedBy?.lastName}</dd></div>
              {entry?.verifiedBy && <div><dt className="text-xs text-gray-400">Verified By</dt><dd className="text-sm text-gray-800 mt-0.5">{entry?.verifiedBy?.firstName} {entry?.verifiedBy?.lastName}</dd></div>}
              {entry?.verifiedAt && <div><dt className="text-xs text-gray-400">Verified At</dt><dd className="text-sm text-gray-800 mt-0.5">{formatDate(entry.verifiedAt)}</dd></div>}
              <div><dt className="text-xs text-gray-400">Created</dt><dd className="text-sm text-gray-800 mt-0.5">{formatDate(entry?.createdAt)}</dd></div>
              {entry?.vehicleLog && (
                <div>
                  <dt className="text-xs text-gray-400">Vehicle</dt>
                  <dd className="text-sm text-gray-800 mt-0.5 font-mono">{entry.vehicleLog.vehicle?.vehicleNumber} ({entry.vehicleLog.logNumber})</dd>
                </div>
              )}
              {entry?.remarks && <div><dt className="text-xs text-gray-400">Remarks</dt><dd className="text-sm text-gray-600 mt-0.5">{entry.remarks}</dd></div>}
            </dl>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
