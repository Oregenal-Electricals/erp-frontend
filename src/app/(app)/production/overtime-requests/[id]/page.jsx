'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import ApprovalTimeline from '@/components/shared/ApprovalTimeline';
import { usePermissions } from '@/hooks/usePermissions';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const money = n => (n === null || n === undefined || isNaN(n)) ? '—' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const STATUS_COLORS = {
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700', APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700', CANCELLED: 'bg-gray-100 text-gray-500',
};

// Small detail page for a single Overtime Request (Production Recording
// point 1 — Shift Board "Request Overtime" → Plant Manager → Management
// approval). The actual Approve/Reject buttons live inside the generic
// ApprovalTimeline component below, same as BOM/Product — this page just
// shows the request's own fields and, for whoever holds
// OVERTIME_REQUEST_ADJUST, a way to narrow the approved men/hours before
// acting on the workflow (a separate call from Approve/Reject itself; see
// OvertimeRequestService.adjust()).
export default function OvertimeRequestDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { can } = usePermissions();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adjustMen, setAdjustMen] = useState('');
  const [adjustHours, setAdjustHours] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/overtime-requests/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || 'Could not load this overtime request');
      const data = await res.json();
      setRequest(data);
      setAdjustMen(data.approvedMenCount ?? data.requestedMenCount ?? '');
      setAdjustHours(data.approvedHours ?? data.requestedHours ?? '');
    } catch (e) {
      setError(e.message || 'Could not load this overtime request');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleAdjust() {
    setAdjusting(true); setAdjustError('');
    try {
      const res = await fetch(`${API}/overtime-requests/${id}/adjust`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          approvedMenCount: adjustMen === '' ? undefined : Number(adjustMen),
          approvedHours: adjustHours === '' ? undefined : Number(adjustHours),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Adjust failed');
      await load();
    } catch (e) {
      setAdjustError(e.message || 'Adjust failed');
    } finally {
      setAdjusting(false);
    }
  }

  const requesterName = request?.requestedByUser
    ? `${request.requestedByUser.firstName || ''} ${request.requestedByUser.lastName || ''}`.trim() || request.requestedByUser.email
    : '—';

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <button onClick={() => router.back()} className="text-xs text-gray-400 hover:text-gray-600 mb-3">← Back</button>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : !request ? (
          <p className="text-sm text-gray-400">Overtime request not found.</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1">
              <h1 className="text-lg font-semibold font-mono text-gray-900">{request.requestNumber}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[request.status] || 'bg-gray-100 text-gray-600'}`}>
                {request.status?.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {request.workOrder?.woNumber} · {request.workOrder?.productName || request.workOrder?.productCode}
              {request.workOrder?.stageName ? ` · ${request.workOrder.stageName}` : ''}
            </p>

            <div className="bg-white rounded-xl shadow-sm border p-5 grid grid-cols-2 gap-4 text-sm">
              <div><div className="text-xs text-gray-400 uppercase">Shift date</div><div className="font-medium">{fmtDate(request.shiftDate)}</div></div>
              <div><div className="text-xs text-gray-400 uppercase">Requested by</div><div className="font-medium">{requesterName}</div></div>
              <div><div className="text-xs text-gray-400 uppercase">Requested</div><div className="font-medium">{request.requestedMenCount} men × {request.requestedHours} hrs</div></div>
              <div><div className="text-xs text-gray-400 uppercase">Approved</div><div className="font-medium">{request.approvedMenCount != null ? `${request.approvedMenCount} men × ${request.approvedHours} hrs` : '—'}</div></div>
              <div><div className="text-xs text-gray-400 uppercase">Estimated OT cost</div><div className="font-medium">{money(request.estimatedOtCost)} <span className="text-gray-400 text-xs">({request.otMultiplierSnapshot ?? '—'}x rate)</span></div></div>
              <div className="col-span-2"><div className="text-xs text-gray-400 uppercase">Reason</div><div className="font-medium">{request.reason}</div></div>
            </div>

            {can('OVERTIME_REQUEST_ADJUST') && request.status === 'PENDING_APPROVAL' && (
              <div className="bg-white rounded-xl shadow-sm border p-5 mt-6">
                <h3 className="font-semibold text-gray-800 mb-1">Narrow the approved men/hours</h3>
                <p className="text-xs text-gray-400 mb-3">Optional — leave as the requested figures to approve exactly what was asked for. This only sets the ceiling; it does not itself approve or reject the request below.</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] uppercase text-gray-500 mb-1">Approved men</label>
                    <input type="number" min="0" value={adjustMen} onChange={e => setAdjustMen(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-gray-500 mb-1">Approved hours</label>
                    <input type="number" min="0" step="0.5" value={adjustHours} onChange={e => setAdjustHours(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
                  </div>
                </div>
                {adjustError && <p className="text-xs text-red-600 mb-2">{adjustError}</p>}
                <button onClick={handleAdjust} disabled={adjusting}
                  className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-sm disabled:opacity-50">
                  {adjusting ? 'Saving…' : 'Save approved men/hours'}
                </button>
              </div>
            )}

            <ApprovalTimeline documentType="OVERTIME_REQUEST" documentId={id} onDone={load} />
          </>
        )}
      </div>
    </AppLayout>
  );
}
