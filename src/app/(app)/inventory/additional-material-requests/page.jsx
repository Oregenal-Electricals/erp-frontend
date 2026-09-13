'use client';
import { useState, useEffect, useCallback } from 'react';
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

export default function AdditionalMaterialRequestsPage() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [comments, setComments] = useState({});
  const [approvedQtyForm, setApprovedQtyForm] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try { setPending(await api('/production/additional-material-requests/pending')); }
    catch (e) { setError(e.message); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  function notify(msg) { setToast(msg); setTimeout(() => setToast(''), 4000); }
  function fail(e) { setError(e.message || 'Something went wrong'); setTimeout(() => setError(''), 6000); }

  async function decide(id, action, requestedQty) {
    setBusy(true);
    try {
      const body = { action, comments: comments[id] || '' };
      if (action === 'APPROVED') {
        const entered = approvedQtyForm[id];
        body.approvedQty = entered ? Number(entered) : requestedQty;
      }
      await api(`/production/additional-material-requests/${id}/decide`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      notify(action === 'APPROVED' ? `Additional material approved for ${body.approvedQty}.` : 'Request rejected.');
      await load();
    } catch (e) { fail(e); }
    setBusy(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Additional Material Requests</h1>
          <p className="text-gray-500 text-sm mt-1">Requests to issue material beyond the original approved Work Order requirement. This increases the approved demand - it's separate from a previous-material-status override.</p>
        </div>

        {toast && <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">{toast}</div>}
        {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>}

        {loading && <div className="text-center py-12 text-gray-400">Loading...</div>}
        {!loading && pending.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">No pending additional material requests.</div>}

        <div className="space-y-4">
          {pending.map(r => (
            <div key={r.id} className="bg-white rounded-xl border shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-mono text-blue-600 font-bold text-sm">{r.workOrder?.woNumber}</span>
                  <span className="text-gray-600 ml-2">{r.workOrder?.productName}</span>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">{r.reasonCategory}</span>
              </div>
              <div className="text-xs text-gray-500 mb-3">
                Requesting <span className="font-bold text-gray-700">{r.requestedQty}</span> extra of <span className="font-mono">{r.itemCode}</span> ({r.itemName}) beyond the original approved requirement - requested by {r.requestedBy?.firstName} {r.requestedBy?.lastName}, reason: "{r.reason}"
              </div>
              <div className="flex gap-2 items-end flex-wrap">
                <input type="number" placeholder={`Approve qty (max ${r.requestedQty})`} className="border rounded px-2 py-1 text-xs w-40" value={approvedQtyForm[r.id] || ''} onChange={e => setApprovedQtyForm(prev => ({ ...prev, [r.id]: e.target.value }))} />
                <input className="border rounded px-2 py-1 text-xs flex-1 min-w-[200px]" placeholder="Comments (optional)..." value={comments[r.id] || ''} onChange={e => setComments(prev => ({ ...prev, [r.id]: e.target.value }))} />
                <button onClick={() => decide(r.id, 'APPROVED', r.requestedQty)} disabled={busy} className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50">Approve</button>
                <button onClick={() => decide(r.id, 'REJECTED')} disabled={busy} className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50">Reject</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
