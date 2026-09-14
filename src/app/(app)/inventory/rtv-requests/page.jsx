'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data;
}
function listOf(d) { return Array.isArray(d) ? d : (d?.data || []); }

export default function RtvRequestsPage() {
  return (
    <Suspense fallback={null}>
      <RtvRequestsInner />
    </Suspense>
  );
}

function RtvRequestsInner() {
  const params = useSearchParams();
  const rejectedStockItemId = params.get('rejectedStockItemId');

  const [pending, setPending] = useState([]);
  const [readyForGateOut, setReadyForGateOut] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const [requestQty, setRequestQty] = useState('');
  const [requestReason, setRequestReason] = useState('IQC_FAILED');
  const [approveForm, setApproveForm] = useState({});
  const [prepareForm, setPrepareForm] = useState({});
  const [gateOutForm, setGateOutForm] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, r] = await Promise.all([api('/rtv/pending'), api('/rtv/ready-for-gate-out')]);
      setPending(listOf(p)); setReadyForGateOut(listOf(r));
    } catch (e) { /* silent */ }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  function notify(msg) { setToast(msg); setTimeout(() => setToast(''), 4000); }
  function fail(e) { setError(e.message || 'Something went wrong'); setTimeout(() => setError(''), 6000); }

  async function submitRequest() {
    if (!requestQty || Number(requestQty) <= 0) { fail(new Error('Enter the RTV qty')); return; }
    setBusy(true);
    try {
      await api('/rtv', { method: 'POST', body: JSON.stringify({ rejectedStockItemId, requestedQty: Number(requestQty), reason: requestReason }) });
      notify('RTV requested - waiting on Purchase authorization.');
      setRequestQty('');
      await load();
    } catch (e) { fail(e); }
    setBusy(false);
  }

  async function decide(id, action, requestedQty) {
    setBusy(true);
    try {
      const entered = approveForm[id];
      const body = { action };
      if (action === 'AUTHORIZED') body.approvedQty = entered ? Number(entered) : requestedQty;
      await api(`/rtv/${id}/decide`, { method: 'POST', body: JSON.stringify(body) });
      notify(action === 'AUTHORIZED' ? 'RTV authorized' : 'RTV rejected');
      await load();
    } catch (e) { fail(e); }
    setBusy(false);
  }

  async function prepare(id) {
    const qty = prepareForm[id];
    if (!qty) { fail(new Error('Enter the qty actually picked')); return; }
    setBusy(true);
    try {
      await api(`/rtv/${id}/prepare`, { method: 'POST', body: JSON.stringify({ preparedQty: Number(qty) }) });
      notify('RTV prepared - ready for Gate-Out');
      await load();
    } catch (e) { fail(e); }
    setBusy(false);
  }

  async function gateOut(id) {
    const form = gateOutForm[id] || {};
    if (!form.qty) { fail(new Error('Enter the Gate-Out qty')); return; }
    setBusy(true);
    try {
      await api(`/rtv/${id}/gate-out`, { method: 'POST', body: JSON.stringify({ qty: Number(form.qty), vehicleNumber: form.vehicleNumber, challanNumber: form.challanNumber }) });
      notify('Gate-Out confirmed');
      await load();
    } catch (e) { fail(e); }
    setBusy(false);
  }

  async function cancel(id) {
    setBusy(true);
    try { await api(`/rtv/${id}/cancel`, { method: 'POST' }); notify('RTV cancelled'); await load(); }
    catch (e) { fail(e); }
    setBusy(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Return to Vendor (RTV)</h1>
          <p className="text-gray-500 text-sm mt-1">Rejected material stays in plant custody until actual Gate-Out - preparing an RTV never makes it disappear early.</p>
        </div>

        {toast && <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">{toast}</div>}
        {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>}

        {rejectedStockItemId && (
          <div className="bg-white rounded-xl border shadow-sm p-4 mb-6">
            <div className="font-semibold text-gray-700 mb-2">Request Return to Vendor</div>
            <div className="flex gap-2 items-end flex-wrap">
              <input type="number" placeholder="Qty to return" className="border rounded px-2 py-1 text-xs w-32" value={requestQty} onChange={e => setRequestQty(e.target.value)} />
              <select className="border rounded px-2 py-1 text-xs" value={requestReason} onChange={e => setRequestReason(e.target.value)}>
                <option value="IQC_FAILED">IQC Failed</option>
                <option value="WRONG_SPECIFICATION">Wrong Specification</option>
                <option value="DAMAGE">Damage</option>
                <option value="WRONG_MATERIAL">Wrong Material</option>
                <option value="SUPPLIER_QUALITY_REJECTION">Supplier Quality Rejection</option>
                <option value="EXCESS_MATERIAL_RETURN">Excess Material Return</option>
                <option value="OTHER">Other</option>
              </select>
              <button onClick={submitRequest} disabled={busy} className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50">Request RTV</button>
            </div>
          </div>
        )}

        {loading && <div className="text-center py-8 text-gray-400">Loading...</div>}

        <div className="mb-6">
          <div className="font-semibold text-gray-700 mb-2">Pending Purchase Authorization</div>
          {!loading && pending.length === 0 && <div className="text-center py-6 text-gray-400 bg-white rounded-xl border">Nothing pending.</div>}
          <div className="space-y-3">
            {pending.map(r => (
              <div key={r.id} className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-mono text-blue-600 font-bold text-sm">{r.rtvNumber}</span>
                    <span className="text-gray-600 ml-2">{r.itemName} ({r.itemCode})</span>
                  </div>
                  <span className="text-xs text-gray-400">{r.vendor?.name}</span>
                </div>
                <div className="text-xs text-gray-500 mb-2">Requested {r.requestedQty} {r.uom} - reason: {r.reason} - by {r.requestedBy?.firstName} {r.requestedBy?.lastName}</div>
                <div className="flex gap-2 items-end flex-wrap">
                  <input type="number" placeholder={`Approve qty (max ${r.requestedQty})`} className="border rounded px-2 py-1 text-xs w-40" value={approveForm[r.id] || ''} onChange={e => setApproveForm(prev => ({ ...prev, [r.id]: e.target.value }))} />
                  <button onClick={() => decide(r.id, 'AUTHORIZED', r.requestedQty)} disabled={busy} className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50">Authorize</button>
                  <button onClick={() => decide(r.id, 'REJECTED')} disabled={busy} className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="font-semibold text-gray-700 mb-2">Preparation / Gate-Out</div>
          {!loading && readyForGateOut.length === 0 && <div className="text-center py-6 text-gray-400 bg-white rounded-xl border">Nothing ready.</div>}
          <div className="space-y-3">
            {readyForGateOut.map(r => (
              <div key={r.id} className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-mono text-blue-600 font-bold text-sm">{r.rtvNumber}</span>
                    <span className="text-gray-600 ml-2">{r.itemName} ({r.itemCode})</span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${r.status === 'PARTIALLY_GATE_OUT' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{r.status}</span>
                  </div>
                  <span className="text-xs text-gray-400">{r.vendor?.name}</span>
                </div>
                <div className="text-xs text-gray-500 mb-2">Approved {r.approvedQty} - Prepared {r.preparedQty} - Gated Out {r.gateOutQty}</div>
                {r.status !== 'PARTIALLY_GATE_OUT' && r.preparedQty === 0 && (
                  <div className="flex gap-2 items-end flex-wrap mb-2">
                    <input type="number" placeholder={`Physically picked qty (max ${r.approvedQty})`} className="border rounded px-2 py-1 text-xs w-56" value={prepareForm[r.id] || ''} onChange={e => setPrepareForm(prev => ({ ...prev, [r.id]: e.target.value }))} />
                    <button onClick={() => prepare(r.id)} disabled={busy} className="px-3 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-800 disabled:opacity-50">Confirm Picked</button>
                  </div>
                )}
                {r.preparedQty > 0 && r.gateOutQty < r.preparedQty && (
                  <div className="flex gap-2 items-end flex-wrap">
                    <input type="number" placeholder={`Gate-Out qty (max ${r.preparedQty - r.gateOutQty})`} className="border rounded px-2 py-1 text-xs w-48" value={gateOutForm[r.id]?.qty || ''} onChange={e => setGateOutForm(prev => ({ ...prev, [r.id]: { ...prev[r.id], qty: e.target.value } }))} />
                    <input placeholder="Vehicle no." className="border rounded px-2 py-1 text-xs w-28" value={gateOutForm[r.id]?.vehicleNumber || ''} onChange={e => setGateOutForm(prev => ({ ...prev, [r.id]: { ...prev[r.id], vehicleNumber: e.target.value } }))} />
                    <input placeholder="Challan no." className="border rounded px-2 py-1 text-xs w-28" value={gateOutForm[r.id]?.challanNumber || ''} onChange={e => setGateOutForm(prev => ({ ...prev, [r.id]: { ...prev[r.id], challanNumber: e.target.value } }))} />
                    <button onClick={() => gateOut(r.id)} disabled={busy} className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50">Confirm Gate-Out</button>
                  </div>
                )}
                <button onClick={() => cancel(r.id)} disabled={busy} className="mt-2 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded text-xs hover:bg-red-100 disabled:opacity-50">Cancel remaining</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
