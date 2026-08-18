'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

export default function DeleteApprovalsPage() {
  const [requests, setRequests] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectComments, setRejectComments] = useState('');
  const [error, setError] = useState('');

  const fetchPending = useCallback(async () => {
    setLoading(true); setError('');
    const res = await fetch(`${API}/delete-requests/pending`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setRequests(await res.json());
    else setError('Failed to load pending delete requests');
    setLoading(false);
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  async function handleApprove(id) {
    setActingId(id);
    const res = await fetch(`${API}/delete-requests/${id}/approve`, {
      method: 'POST', headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) fetchPending();
    else { const d = await res.json(); alert(d.message || 'Approve failed'); }
    setActingId(null);
  }

  async function handleReject(id) {
    setActingId(id);
    const res = await fetch(`${API}/delete-requests/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ comments: rejectComments }),
    });
    if (res.ok) { setRejectingId(null); setRejectComments(''); fetchPending(); }
    else { const d = await res.json(); alert(d.message || 'Reject failed'); }
    setActingId(null);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Delete Approvals</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real users&apos; deletions across every module land here when they don&apos;t have approval authority
            themselves. Nothing is deleted until you approve it — reject if the reason doesn&apos;t hold up.
          </p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm">{error}</div>}

        {loading && <div className="text-center py-12 text-gray-400">Loading...</div>}

        {!loading && requests && requests.length === 0 && (
          <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-16 text-center text-gray-400">
            <div className="text-sm">No pending delete requests right now</div>
          </div>
        )}

        {!loading && requests && requests.length > 0 && (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{r.tableName}</span>
                      <span className="font-semibold text-gray-900">{r.recordLabel}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{r.reason}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Requested by <span className="font-medium">{r.requestedByName}</span> on{' '}
                      {new Date(r.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {rejectingId !== r.id && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleApprove(r.id)}
                        disabled={actingId === r.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                      >
                        {actingId === r.id ? 'Working...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => setRejectingId(r.id)}
                        disabled={actingId === r.id}
                        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                {rejectingId === r.id && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <label className="block text-sm text-gray-600">Reason for rejecting (optional, shown to the requester)</label>
                    <textarea
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      rows={2}
                      value={rejectComments}
                      onChange={(e) => setRejectComments(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReject(r.id)}
                        disabled={actingId === r.id}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
                      >
                        {actingId === r.id ? 'Working...' : 'Confirm Reject'}
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectComments(''); }}
                        className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
