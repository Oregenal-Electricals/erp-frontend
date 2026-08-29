'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { clsx } from 'clsx';
import { CheckCircle, XCircle, Send, Package, AlertTriangle, Search } from 'lucide-react';

const STATUS_STYLES = {
  PENDING:       'bg-yellow-100 text-yellow-700', // ARRIVED
  VERIFIED:      'bg-blue-100 text-blue-700',
  GATE_IN:       'bg-indigo-100 text-indigo-700',
  SENT_TO_STORES:'bg-purple-100 text-purple-700',
  COMPLETED:     'bg-green-100 text-green-700',
  REJECTED:      'bg-red-100 text-red-700',
  GATE_HOLD_PO_NOT_FOUND: 'bg-red-100 text-red-700',
  GATE_HOLD_PO_CANCELLED: 'bg-red-100 text-red-700',
  GATE_HOLD_PO_CLOSED: 'bg-red-100 text-red-700',
};

export default function GateInwardDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [entry, setEntry]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [saving, setSaving]   = useState('');
  const [showReject, setShowReject] = useState(false);
  const [holdAction, setHoldAction] = useState(null); // 'identify' | 'non-po' | 'reject' | 'return-material' | 'approved-exception' | 'correct-po'
  const [holdRemarks, setHoldRemarks] = useState('');
  const [poOptions, setPoOptions] = useState([]);
  const [poSearch, setPoSearch] = useState('');
  const [selectedPoId, setSelectedPoId] = useState('');
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

  const searchPos = async (q) => {
    setPoSearch(q);
    if (!q.trim()) { setPoOptions([]); return; }
    try {
      const { data } = await api.get(`/purchase-orders?limit=20&status=SENT,PARTIALLY_RECEIVED&search=${encodeURIComponent(q)}`);
      setPoOptions(data?.data || []);
    } catch { /* ignore */ }
  };

  const handleResolveHold = async (path, body) => {
    const key = path.split('/').pop();
    setSaving(key);
    setError('');
    try {
      await api.patch(`/gate-inward/${id}/${path}`, body);
      setHoldAction(null); setHoldRemarks(''); setSelectedPoId(''); setPoSearch(''); setPoOptions([]);
      fetchEntry();
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed');
    } finally { setSaving(''); }
  };
  const formatNum = (n) => n != null ? n.toLocaleString('en-IN') : '—';

  if (loading) return <AppLayout>
      <div className="p-6 max-w-7xl mx-auto"><div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div></div>
    </AppLayout>;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title={entry?.ginNumber || 'Gate Inward'}
        subtitle={entry?.supplierName}
        action={<button onClick={() => router.push('/gate/inward')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">← Back</button>}
      />

      {error && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm">{error}</div>}

      <div className="grid grid-cols-3 gap-6">
        {/* Main */}
        <div className="col-span-2 space-y-4">

          {/* Material Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><Package size={15} /> Material Details</h3>

            {entry?.items && entry.items.length > 0 ? (
              <div className="mb-4">
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Sr. No</th>
                      <th className="px-3 py-2 text-left">Item Code</th>
                      <th className="px-3 py-2 text-left">Material</th>
                      <th className="px-3 py-2 text-left">Qty</th>
                      <th className="px-3 py-2 text-left">UOM</th>
                      <th className="px-3 py-2 text-left">Packages</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {entry.items.map((it, idx) => (
                      <tr key={it.id}>
                        <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-500">{it.itemCode}</td>
                        <td className="px-3 py-2">{it.itemName}</td>
                        <td className="px-3 py-2 font-medium">{formatNum(it.quantity)}</td>
                        <td className="px-3 py-2 text-gray-500">{it.uom}</td>
                        <td className="px-3 py-2 text-gray-500">{it.packageCount ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mb-4">
                <dt className="text-xs text-gray-400 font-medium">Material</dt>
                <dd className="text-sm text-gray-800 font-medium mt-0.5">{entry?.materialDescription}</dd>
              </div>
            )}

            <dl className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Quantity', value: `${formatNum(entry?.quantity)} ${entry?.unit}` },
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

          {/* Gate Hold — PO Not Found */}
          {entry?.status === 'GATE_HOLD_PO_NOT_FOUND' && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5">
              <h3 className="text-sm font-bold text-red-700 mb-1 flex items-center gap-2">
                <AlertTriangle size={16} /> GATE HOLD — PO NOT FOUND
              </h3>
              <p className="text-xs text-red-600 mb-4">
                Referenced PO &quot;{entry?.poNumber}&quot; could not be found. Material is on hold at the gate — it cannot be verified, sent to Store, or receive a GRN until this is resolved. Only Purchase can resolve this.
              </p>

              {!holdAction ? (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setHoldAction('identify')}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                    <Search size={14} /> Identify Correct PO
                  </button>
                  <button onClick={() => setHoldAction('non-po')}
                    className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors">
                    <CheckCircle size={14} /> Authorize as Non-PO Receipt
                  </button>
                  <button onClick={() => setHoldAction('reject')}
                    className="flex items-center gap-2 border-2 border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                    <XCircle size={14} /> Reject Material
                  </button>
                </div>
              ) : holdAction === 'identify' ? (
                <div className="bg-white rounded-lg p-4 border border-red-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Search for the correct PO</label>
                  <input type="text" value={poSearch} onChange={e => searchPos(e.target.value)}
                    placeholder="Search by PO number or vendor..."
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm mb-2" />
                  {poOptions.length > 0 && (
                    <div className="border rounded-lg mb-3 max-h-48 overflow-y-auto">
                      {poOptions.map(po => (
                        <div key={po.id} onClick={() => setSelectedPoId(po.id)}
                          className={`px-3 py-2 text-sm cursor-pointer ${selectedPoId === po.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'}`}>
                          {po.poNumber} — {po.vendor?.name}
                        </div>
                      ))}
                    </div>
                  )}
                  <input type="text" value={holdRemarks} onChange={e => setHoldRemarks(e.target.value)}
                    placeholder="Remarks (optional)"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm mb-3" />
                  <div className="flex gap-2">
                    <button onClick={() => handleResolveHold('resolve-hold/identify-po', { poId: selectedPoId, remarks: holdRemarks || undefined })}
                      disabled={!selectedPoId || !!saving}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
                      {saving === 'identify-po' ? 'Linking...' : 'Confirm PO'}
                    </button>
                    <button onClick={() => setHoldAction(null)} className="border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
              ) : holdAction === 'non-po' ? (
                <div className="bg-white rounded-lg p-4 border border-red-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Authorization Remarks <span className="text-red-500">*</span></label>
                  <input type="text" value={holdRemarks} onChange={e => setHoldRemarks(e.target.value)}
                    placeholder="Why this is approved without a PO..."
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm mb-3" />
                  <div className="flex gap-2">
                    <button onClick={() => handleResolveHold('resolve-hold/authorize-non-po', { remarks: holdRemarks })}
                      disabled={holdRemarks.trim().length < 5 || !!saving}
                      className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-700 disabled:opacity-50">
                      {saving === 'authorize-non-po' ? 'Authorizing...' : 'Confirm Authorization'}
                    </button>
                    <button onClick={() => setHoldAction(null)} className="border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg p-4 border border-red-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Rejection Reason <span className="text-red-500">*</span></label>
                  <input type="text" value={holdRemarks} onChange={e => setHoldRemarks(e.target.value)}
                    placeholder="Why this material is being rejected..."
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm mb-3" />
                  <div className="flex gap-2">
                    <button onClick={() => handleResolveHold('resolve-hold/reject', { rejectionReason: holdRemarks })}
                      disabled={holdRemarks.trim().length < 5 || !!saving}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50">
                      {saving === 'reject' ? 'Rejecting...' : 'Confirm Reject'}
                    </button>
                    <button onClick={() => setHoldAction(null)} className="border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Gate Hold — PO Cancelled/Closed (GATE-004/005) */}
          {['GATE_HOLD_PO_CANCELLED', 'GATE_HOLD_PO_CLOSED'].includes(entry?.status) && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5">
              <h3 className="text-sm font-bold text-red-700 mb-1 flex items-center gap-2">
                <AlertTriangle size={16} /> GATE HOLD — PO {entry?.status === 'GATE_HOLD_PO_CANCELLED' ? 'CANCELLED' : 'CLOSED'}
              </h3>
              <p className="text-xs text-red-600 mb-4">
                Referenced PO {entry?.poNumber} is {entry?.status === 'GATE_HOLD_PO_CANCELLED' ? 'CANCELLED' : 'CLOSED'}. Material is on hold at the gate — it cannot be verified, sent to Store, or receive a GRN until this is resolved. Only Purchase can resolve this. Security cannot reopen a PO.
              </p>

              {!holdAction ? (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setHoldAction('correct-po')}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                    <Search size={14} /> Correct PO Reference
                  </button>
                  <button onClick={() => setHoldAction('approved-exception')}
                    className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors">
                    <CheckCircle size={14} /> Approved Exception
                  </button>
                  <button onClick={() => setHoldAction('return-material')}
                    className="flex items-center gap-2 border-2 border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                    <XCircle size={14} /> Return Material
                  </button>
                </div>
              ) : holdAction === 'correct-po' ? (
                <div className="bg-white rounded-lg p-4 border border-red-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Search for the correct PO</label>
                  <input type="text" value={poSearch} onChange={e => searchPos(e.target.value)}
                    placeholder="Search by PO number or vendor..."
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm mb-2" />
                  {poOptions.length > 0 && (
                    <div className="border rounded-lg mb-3 max-h-48 overflow-y-auto">
                      {poOptions.map(po => (
                        <div key={po.id} onClick={() => setSelectedPoId(po.id)}
                          className={`px-3 py-2 text-sm cursor-pointer ${selectedPoId === po.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'}`}>
                          {po.poNumber} — {po.vendor?.name}
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Reason <span className="text-red-500">*</span></label>
                  <input type="text" value={holdRemarks} onChange={e => setHoldRemarks(e.target.value)}
                    placeholder="Why the original PO reference was wrong..."
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm mb-3" />
                  <div className="flex gap-2">
                    <button onClick={() => handleResolveHold('resolve-status-hold/correct-po', { poId: selectedPoId, reason: holdRemarks })}
                      disabled={!selectedPoId || holdRemarks.trim().length < 5 || !!saving}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
                      {saving === 'correct-po' ? 'Linking...' : 'Confirm PO'}
                    </button>
                    <button onClick={() => setHoldAction(null)} className="border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
              ) : holdAction === 'approved-exception' ? (
                <div className="bg-white rounded-lg p-4 border border-red-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Exception Reason <span className="text-red-500">*</span></label>
                  <input type="text" value={holdRemarks} onChange={e => setHoldRemarks(e.target.value)}
                    placeholder="Why this is approved despite the PO being cancelled/closed..."
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm mb-3" />
                  <div className="flex gap-2">
                    <button onClick={() => handleResolveHold('resolve-status-hold/approved-exception', { reason: holdRemarks })}
                      disabled={holdRemarks.trim().length < 5 || !!saving}
                      className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-700 disabled:opacity-50">
                      {saving === 'approved-exception' ? 'Authorizing...' : 'Confirm Exception'}
                    </button>
                    <button onClick={() => setHoldAction(null)} className="border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg p-4 border border-red-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Return Reason <span className="text-red-500">*</span></label>
                  <input type="text" value={holdRemarks} onChange={e => setHoldRemarks(e.target.value)}
                    placeholder="Why this material is being returned to the vendor..."
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm mb-3" />
                  <div className="flex gap-2">
                    <button onClick={() => handleResolveHold('resolve-status-hold/return-material', { reason: holdRemarks })}
                      disabled={holdRemarks.trim().length < 5 || !!saving}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50">
                      {saving === 'return-material' ? 'Returning...' : 'Confirm Return'}
                    </button>
                    <button onClick={() => setHoldAction(null)} className="border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

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
                <button onClick={() => handleAction('gate-in', { remarks: 'Let in at gate' })} disabled={!!saving}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  <CheckCircle size={14} />{saving === 'gate-in' ? 'Letting in...' : 'Let Vehicle In (Gate-In)'}
                </button>
              )}
              {entry?.status === 'GATE_IN' && (
                <button onClick={() => handleAction('send-to-stores')} disabled={!!saving}
                  className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors">
                  <Send size={14} />{saving === 'send-to-stores' ? 'Sending...' : 'Direct to Store'}
                </button>
              )}
              {entry?.status === 'SENT_TO_STORES' && (
                <button onClick={() => handleAction('complete')} disabled={!!saving}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                  <CheckCircle size={14} />{saving === 'complete' ? 'Completing...' : 'Mark Complete'}
                </button>
              )}
              {!['COMPLETED','REJECTED','GATE_HOLD_PO_NOT_FOUND','GATE_HOLD_PO_CANCELLED','GATE_HOLD_PO_CLOSED'].includes(entry?.status) && (
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
              {(entry?.vehicleNumber || entry?.vehicleLog) && (
                <div>
                  <dt className="text-xs text-gray-400">Vehicle</dt>
                  <dd className="text-sm text-gray-800 mt-0.5 font-mono">
                    {entry?.vehicleNumber || entry?.vehicleLog?.vehicle?.vehicleNumber}
                    {entry?.vehicleLog && ` (${entry.vehicleLog.logNumber})`}
                  </dd>
                </div>
              )}
              {entry?.driverName && <div><dt className="text-xs text-gray-400">Driver</dt><dd className="text-sm text-gray-800 mt-0.5">{entry.driverName}</dd></div>}
              {entry?.gateInBy && <div><dt className="text-xs text-gray-400">Let In By</dt><dd className="text-sm text-gray-800 mt-0.5">{entry.gateInBy.firstName} {entry.gateInBy.lastName}</dd></div>}
              {entry?.gateInAt && <div><dt className="text-xs text-gray-400">Gate-In Time</dt><dd className="text-sm text-gray-800 mt-0.5">{formatDate(entry.gateInAt)}</dd></div>}
              {entry?.holdResolution && (
                <div>
                  <dt className="text-xs text-gray-400">Hold Resolution</dt>
                  <dd className="text-sm text-gray-800 mt-0.5">
                    {entry.holdResolution.replace(/_/g, ' ')} by {entry.holdResolvedBy?.firstName} {entry.holdResolvedBy?.lastName}
                    {entry.holdResolvedAt && <span className="text-xs text-gray-400"> — {formatDate(entry.holdResolvedAt)}</span>}
                  </dd>
                  {entry.holdResolutionRemarks && <dd className="text-xs text-gray-500 mt-0.5">{entry.holdResolutionRemarks}</dd>}
                </div>
              )}
              {entry?.remarks && <div><dt className="text-xs text-gray-400">Remarks</dt><dd className="text-sm text-gray-600 mt-0.5">{entry.remarks}</dd></div>}
            </dl>
          </div>
        </div>
      </div>
    </div>
    </AppLayout>
  );
}
