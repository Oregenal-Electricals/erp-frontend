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

export default function MaterialIssueOverridesPage() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [comments, setComments] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try { setPending(await api('/production/material-issue-overrides/pending')); }
    catch (e) { setError(e.message); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  function notify(msg) { setToast(msg); setTimeout(() => setToast(''), 4000); }
  function fail(e) { setError(e.message || 'Something went wrong'); setTimeout(() => setError(''), 6000); }

  async function decide(id, action) {
    setBusy(true);
    try {
      await api(`/production/material-issue-overrides/${id}/decide`, {
        method: 'POST',
        body: JSON.stringify({ action, comments: comments[id] || '' }),
      });
      notify(action === 'APPROVED' ? 'Override approved.' : 'Override rejected.');
      await load();
    } catch (e) { fail(e); }
    setBusy(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Material Issue Overrides</h1>
          <p className="text-gray-500 text-sm mt-1">Requests to issue material despite an unreconciled previous issue. Each request has a 5-hour decision window.</p>
        </div>

        {toast && <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">{toast}</div>}
        {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>}

        {loading && <div className="text-center py-12 text-gray-400">Loading...</div>}
        {!loading && pending.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">No pending override requests.</div>}

        <div className="space-y-4">
          {pending.map(o => (
            <div key={o.id} className="bg-white rounded-xl border shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-mono text-blue-600 font-bold text-sm">{o.workOrder?.woNumber}</span>
                  <span className="text-gray-600 ml-2">{o.workOrder?.productName}</span>
                </div>
                <span className="text-xs text-gray-400">Deadline: {new Date(o.deadlineAt).toLocaleString()}</span>
              </div>
              <div className="text-xs text-gray-500 mb-2">Requested by {o.requestedBy?.firstName} {o.requestedBy?.lastName} - "{o.reason}"</div>
              <table className="w-full text-xs mb-3">
                <thead className="text-gray-400 uppercase"><tr>{['Item','Issued','Outstanding'].map(h=><th key={h} className="px-2 py-1 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {(o.itemsSnapshot || []).map(it => (
                    <tr key={it.itemCode}>
                      <td className="px-2 py-1">{it.itemName} <span className="text-gray-400 font-mono">({it.itemCode})</span></td>
                      <td className="px-2 py-1">{it.issuedQty}</td>
                      <td className="px-2 py-1 font-bold text-red-600">{it.outstandingQty} {it.uom}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex gap-2 items-end flex-wrap">
                <input className="border rounded px-2 py-1 text-xs flex-1 min-w-[200px]" placeholder="Comments (optional)..." value={comments[o.id] || ''} onChange={e => setComments(prev => ({ ...prev, [o.id]: e.target.value }))} />
                <button onClick={() => decide(o.id, 'APPROVED')} disabled={busy} className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50">Approve</button>
                <button onClick={() => decide(o.id, 'REJECTED')} disabled={busy} className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50">Reject</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
