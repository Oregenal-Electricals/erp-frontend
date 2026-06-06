'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { clsx } from 'clsx';
import { CheckCircle, XCircle, BadgeCheck, RotateCcw, Lock } from 'lucide-react';

const STATUS_STYLES = {
  PENDING:  'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  ISSUED:   'bg-purple-100 text-purple-700',
  RETURNED: 'bg-teal-100 text-teal-700',
  EXPIRED:  'bg-orange-100 text-orange-700',
  CLOSED:   'bg-green-100 text-green-700',
  CANCELLED:'bg-red-100 text-red-700',
};

const STATUS_STEPS = ['PENDING','APPROVED','ISSUED','RETURNED/CLOSED'];

export default function GatePassDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [pass, setPass]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [saving, setSaving]   = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const fetchPass = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/gate-passes/${id}`);
      setPass(data);
    } catch (err) { setError(err.response?.data?.message || 'Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPass(); }, [id]);

  const handleAction = async (action, body = {}) => {
    setSaving(action); setError('');
    try {
      await api.patch(`/gate-passes/${id}/${action}`, body);
      fetchPass();
    } catch (err) { setError(err.response?.data?.message || 'Action failed'); }
    finally { setSaving(''); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const getStep = () => {
    const s = pass?.status;
    if (s === 'PENDING')  return 0;
    if (s === 'APPROVED') return 1;
    if (s === 'ISSUED')   return 2;
    if (['RETURNED','CLOSED'].includes(s)) return 3;
    return 0;
  };

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div></AppLayout>;

  return (
    <AppLayout>
      <PageHeader
        title={pass?.passNumber || 'Gate Pass'}
        subtitle={`${pass?.type?.replace('_', '-')} · ${pass?.carrierName}`}
        action={<button onClick={() => router.push('/gate/passes')} className="border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">← Back</button>}
      />

      {error && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm">{error}</div>}

      {/* Progress */}
      {!['CANCELLED','EXPIRED'].includes(pass?.status) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex items-center justify-between">
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className="flex items-center flex-1">
                <div className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                  i < getStep() ? 'bg-green-500 text-white' :
                  i === getStep() ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                )}>
                  {i < getStep() ? '✓' : i + 1}
                </div>
                <p className={clsx('text-xs ml-2 font-medium shrink-0', i <= getStep() ? 'text-gray-800' : 'text-gray-400')}>
                  {step}
                </p>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={clsx('flex-1 h-0.5 mx-3', i < getStep() ? 'bg-green-500' : 'bg-gray-200')} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Main */}
        <div className="col-span-2 space-y-4">

          {/* Item Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Item & Carrier Details</h3>
            <dl className="grid grid-cols-2 gap-3">
              {[
                { label: 'Item',            value: pass?.itemDescription },
                { label: 'Quantity',        value: `${pass?.quantity} ${pass?.unit}` },
                { label: 'Estimated Value', value: pass?.estimatedValue ? `₹${pass.estimatedValue.toLocaleString('en-IN')}` : '—' },
                { label: 'Purpose',         value: pass?.purpose },
                { label: 'Carrier',         value: pass?.carrierName },
                { label: 'Mobile',          value: pass?.carrierMobile || '—' },
                { label: 'ID Proof',        value: pass?.carrierIdProof || '—' },
                { label: 'Vehicle',         value: pass?.vehicleNumber || '—' },
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
              {pass?.status === 'PENDING' && (
                <button onClick={() => handleAction('approve', { remarks: 'Approved' })} disabled={!!saving}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  <CheckCircle size={14} />{saving === 'approve' ? 'Approving...' : 'Approve'}
                </button>
              )}
              {pass?.status === 'APPROVED' && (
                <button onClick={() => handleAction('issue')} disabled={!!saving}
                  className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors">
                  <BadgeCheck size={14} />{saving === 'issue' ? 'Issuing...' : 'Issue Pass'}
                </button>
              )}
              {pass?.status === 'ISSUED' && pass?.type === 'RETURNABLE' && (
                <button onClick={() => handleAction('return', { remarks: 'Items returned at gate' })} disabled={!!saving}
                  className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">
                  <RotateCcw size={14} />{saving === 'return' ? 'Marking...' : 'Mark Returned'}
                </button>
              )}
              {['ISSUED','RETURNED'].includes(pass?.status) && (
                <button onClick={() => handleAction('close')} disabled={!!saving}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                  <Lock size={14} />{saving === 'close' ? 'Closing...' : 'Close Pass'}
                </button>
              )}
              {!['ISSUED','CLOSED','CANCELLED'].includes(pass?.status) && (
                <button onClick={() => setShowCancel(!showCancel)}
                  className="flex items-center gap-2 border-2 border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
                  <XCircle size={14} /> Cancel
                </button>
              )}
            </div>

            {showCancel && (
              <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Cancel Reason <span className="text-red-500">*</span></label>
                <input type="text" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Request withdrawn..."
                  style={{ color: '#111827', backgroundColor: '#ffffff' }}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none mb-3" />
                <div className="flex gap-2">
                  <button onClick={() => { handleAction('cancel', { cancelReason }); setShowCancel(false); }}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700">Confirm Cancel</button>
                  <button onClick={() => setShowCancel(false)}
                    className="border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Pass Info</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-400">Status</dt>
                <dd className="mt-0.5">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[pass?.status] || ''}`}>
                    {pass?.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Type</dt>
                <dd className="text-sm font-medium mt-0.5">
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full', pass?.type === 'RETURNABLE' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600')}>
                    {pass?.type?.replace('_', ' ')}
                  </span>
                </dd>
              </div>
              <div><dt className="text-xs text-gray-400">Plant</dt><dd className="text-sm text-gray-800 mt-0.5">{pass?.plant?.name}</dd></div>
              <div><dt className="text-xs text-gray-400">Requested By</dt><dd className="text-sm text-gray-800 mt-0.5">{pass?.requestedBy?.firstName} {pass?.requestedBy?.lastName}</dd></div>
              <div><dt className="text-xs text-gray-400">Created</dt><dd className="text-sm text-gray-800 mt-0.5">{formatDate(pass?.createdAt)}</dd></div>
              {pass?.validFrom && <div><dt className="text-xs text-gray-400">Valid From</dt><dd className="text-sm text-gray-800 mt-0.5">{formatDate(pass.validFrom)}</dd></div>}
              {pass?.validTo && <div><dt className="text-xs text-gray-400">Return By</dt><dd className="text-sm text-gray-800 mt-0.5">{formatDate(pass.validTo)}</dd></div>}
              {pass?.authorizedBy && <div><dt className="text-xs text-gray-400">Approved By</dt><dd className="text-sm text-gray-800 mt-0.5">{pass.authorizedBy.firstName} {pass.authorizedBy.lastName}</dd></div>}
              {pass?.issuedBy && <div><dt className="text-xs text-gray-400">Issued By</dt><dd className="text-sm text-gray-800 mt-0.5">{pass.issuedBy.firstName} {pass.issuedBy.lastName}</dd></div>}
              {pass?.issuedAt && <div><dt className="text-xs text-gray-400">Issued At</dt><dd className="text-sm text-gray-800 mt-0.5">{formatDate(pass.issuedAt)}</dd></div>}
              {pass?.returnedAt && <div><dt className="text-xs text-gray-400">Returned At</dt><dd className="text-sm text-gray-800 mt-0.5">{formatDate(pass.returnedAt)}</dd></div>}
              {pass?.cancelReason && <div><dt className="text-xs text-red-500">Cancel Reason</dt><dd className="text-sm text-red-600 mt-0.5">{pass.cancelReason}</dd></div>}
              {pass?.remarks && <div><dt className="text-xs text-gray-400">Remarks</dt><dd className="text-sm text-gray-600 mt-0.5">{pass.remarks}</dd></div>}
            </dl>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
