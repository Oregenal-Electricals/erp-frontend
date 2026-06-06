'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { clsx } from 'clsx';
import { CheckCircle, Truck, Package, XCircle } from 'lucide-react';

const STATUS_STYLES = {
  PENDING:    'bg-yellow-100 text-yellow-700',
  APPROVED:   'bg-blue-100 text-blue-700',
  DISPATCHED: 'bg-purple-100 text-purple-700',
  DELIVERED:  'bg-green-100 text-green-700',
  CANCELLED:  'bg-red-100 text-red-700',
};

const STATUS_STEPS = ['PENDING','APPROVED','DISPATCHED','DELIVERED'];

export default function GateOutwardDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [entry, setEntry]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const fetchEntry = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/gate-outward/${id}`);
      setEntry(data);
    } catch (err) { setError(err.response?.data?.message || 'Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEntry(); }, [id]);

  const handleAction = async (action, body = {}) => {
    setSaving(action); setError('');
    try {
      await api.patch(`/gate-outward/${id}/${action}`, body);
      fetchEntry();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setSaving(''); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div></AppLayout>;

  const currentStep = STATUS_STEPS.indexOf(entry?.status);

  return (
    <AppLayout>
      <PageHeader
        title={entry?.goeNumber || 'Gate Outward'}
        subtitle={entry?.customerName}
        action={<button onClick={() => router.push('/gate/outward')} className="border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">← Back</button>}
      />

      {error && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm">{error}</div>}

      {/* Progress Steps */}
      {entry?.status !== 'CANCELLED' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex items-center justify-between">
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className="flex items-center flex-1">
                <div className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                  i < currentStep ? 'bg-green-500 text-white' :
                  i === currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                )}>
                  {i < currentStep ? '✓' : i + 1}
                </div>
                <p className={clsx('text-xs ml-2 font-medium', i <= currentStep ? 'text-gray-800' : 'text-gray-400')}>
                  {step}
                </p>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={clsx('flex-1 h-0.5 mx-3', i < currentStep ? 'bg-green-500' : 'bg-gray-200')} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Main */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><Package size={15} /> Material & Order Details</h3>
            <dl className="grid grid-cols-2 gap-3">
              {[
                { label: 'Material',        value: entry?.materialDescription },
                { label: 'Quantity',        value: `${entry?.quantity} ${entry?.unit}` },
                { label: 'Package Count',   value: entry?.packageCount || '—' },
                { label: 'Gross Weight',    value: entry?.grossWeight ? `${entry.grossWeight} kg` : '—' },
                { label: 'Net Weight',      value: entry?.netWeight ? `${entry.netWeight} kg` : '—' },
                { label: 'Sales Order#',    value: entry?.salesOrderNumber || '—' },
                { label: 'Delivery Challan',value: entry?.deliveryChallanNumber || '—' },
                { label: 'Invoice Amount',  value: entry?.invoiceAmount ? `₹${entry.invoiceAmount.toLocaleString('en-IN')}` : '—' },
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
                <button onClick={() => handleAction('approve', { remarks: 'Approved for dispatch' })} disabled={!!saving}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  <CheckCircle size={14} />{saving === 'approve' ? 'Approving...' : 'Approve'}
                </button>
              )}
              {entry?.status === 'APPROVED' && (
                <button onClick={() => handleAction('dispatch')} disabled={!!saving}
                  className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors">
                  <Truck size={14} />{saving === 'dispatch' ? 'Dispatching...' : 'Mark Dispatched'}
                </button>
              )}
              {entry?.status === 'DISPATCHED' && (
                <button onClick={() => handleAction('delivered')} disabled={!!saving}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                  <CheckCircle size={14} />{saving === 'delivered' ? 'Updating...' : 'Mark Delivered'}
                </button>
              )}
              {!['DISPATCHED','DELIVERED','CANCELLED'].includes(entry?.status) && (
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
                  placeholder="Customer cancelled order..."
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
            <h3 className="text-sm font-bold text-gray-700 mb-4">Details</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-400">Status</dt>
                <dd className="mt-0.5">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[entry?.status] || ''}`}>
                    {entry?.status}
                  </span>
                </dd>
              </div>
              <div><dt className="text-xs text-gray-400">Plant</dt><dd className="text-sm text-gray-800 mt-0.5">{entry?.plant?.name}</dd></div>
              <div><dt className="text-xs text-gray-400">Customer</dt><dd className="text-sm text-gray-800 mt-0.5">{entry?.customerName}</dd></div>
              {entry?.customerAddress && <div><dt className="text-xs text-gray-400">Address</dt><dd className="text-sm text-gray-600 mt-0.5">{entry.customerAddress}</dd></div>}
              <div><dt className="text-xs text-gray-400">Created By</dt><dd className="text-sm text-gray-800 mt-0.5">{entry?.createdByUser?.firstName} {entry?.createdByUser?.lastName}</dd></div>
              <div><dt className="text-xs text-gray-400">Created</dt><dd className="text-sm text-gray-800 mt-0.5">{formatDate(entry?.createdAt)}</dd></div>
              {entry?.authorizedBy && <div><dt className="text-xs text-gray-400">Approved By</dt><dd className="text-sm text-gray-800 mt-0.5">{entry.authorizedBy.firstName} {entry.authorizedBy.lastName}</dd></div>}
              {entry?.dispatchedBy && <div><dt className="text-xs text-gray-400">Dispatched By</dt><dd className="text-sm text-gray-800 mt-0.5">{entry.dispatchedBy.firstName} {entry.dispatchedBy.lastName}</dd></div>}
              {entry?.dispatchedAt && <div><dt className="text-xs text-gray-400">Dispatched At</dt><dd className="text-sm text-gray-800 mt-0.5">{formatDate(entry.dispatchedAt)}</dd></div>}
              {entry?.vehicleLog && <div><dt className="text-xs text-gray-400">Vehicle</dt><dd className="text-sm font-mono text-gray-800 mt-0.5">{entry.vehicleLog.vehicle?.vehicleNumber}</dd></div>}
              {entry?.cancelReason && <div><dt className="text-xs text-red-500">Cancel Reason</dt><dd className="text-sm text-red-600 mt-0.5">{entry.cancelReason}</dd></div>}
            </dl>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
