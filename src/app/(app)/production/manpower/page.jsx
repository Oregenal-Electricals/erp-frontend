'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { getToken, getUser } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL;

const STATUS_COLORS = {
  PENDING: 'bg-gray-100 text-gray-600',
  ACCEPTED: 'bg-green-100 text-green-700',
  QUERIED: 'bg-red-100 text-red-600',
};
const CATEGORY_OPTIONS = ['SMT', 'MI', 'Assembly', 'Packaging', 'STORE', 'QUALITY'];

export default function ManpowerPage() {
  const me = getUser() || {};
  const [allocations, setAllocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sendForm, setSendForm] = useState({ date: new Date().toISOString().slice(0, 10), toUserId: '', count: '', remarks: '' });
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);

  const [distributeFor, setDistributeFor] = useState(null); // allocation being distributed
  const [distLines, setDistLines] = useState([{ toUserId: '', workOrderId: '', category: '', count: '' }]);
  const [distError, setDistError] = useState('');
  const [distResult, setDistResult] = useState(null);
  const [distributing, setDistributing] = useState(false);

  const [queryFor, setQueryFor] = useState(null);
  const [queryMessage, setQueryMessage] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [allocRes, userRes, relRes, ipRes] = await Promise.all([
      fetch(`${API}/manpower/allocations`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/users?limit=200`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/work-orders?status=RELEASED&limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/work-orders?status=IN_PROGRESS&limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (allocRes.ok) setAllocations(await allocRes.json());
    if (userRes.ok) { const d = await userRes.json(); setUsers(d.data || d || []); }
    const [relData, ipData] = await Promise.all([
      relRes.ok ? relRes.json() : { data: [] },
      ipRes.ok ? ipRes.json() : { data: [] },
    ]);
    setWorkOrders([...(ipData.data || []), ...(relData.data || [])]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function userName(id) {
    const u = users.find(x => x.id === id);
    return u ? `${u.firstName} ${u.lastName}` : '—';
  }

  async function handleSend() {
    setSendError('');
    if (!sendForm.toUserId || !sendForm.count) { setSendError('Select a recipient and enter a count'); return; }
    setSending(true);
    const res = await fetch(`${API}/manpower/allocations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ date: sendForm.date, level: 'HR_TO_PLANT', toUserId: sendForm.toUserId, count: parseInt(sendForm.count), remarks: sendForm.remarks || undefined }),
    });
    const data = await res.json();
    if (res.ok) { setSendForm(f => ({ ...f, toUserId: '', count: '', remarks: '' })); fetchAll(); }
    else setSendError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    setSending(false);
  }

  async function handleAccept(id) {
    await fetch(`${API}/manpower/allocations/${id}/accept`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchAll();
  }

  function openDistribute(allocation) {
    setDistributeFor(allocation);
    setDistLines([{ toUserId: '', workOrderId: '', category: allocation.level === 'HR_TO_PLANT' ? 'SMT' : '', count: '' }]);
    setDistError(''); setDistResult(null);
  }

  async function handleDistribute() {
    setDistError(''); setDistResult(null);
    const lines = distLines.filter(l => l.count && (l.toUserId || l.workOrderId)).map(l => ({ toUserId: l.toUserId || undefined, workOrderId: l.workOrderId || undefined, category: l.category || undefined, count: parseInt(l.count) }));
    if (lines.length === 0) { setDistError('Add at least one line with a count and either a recipient or a Work Order'); return; }
    setDistributing(true);
    const res = await fetch(`${API}/manpower/allocations/distribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ parentId: distributeFor.id, lines }),
    });
    const data = await res.json();
    if (res.ok) { setDistResult(data); fetchAll(); }
    else setDistError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    setDistributing(false);
  }

  async function handleRaiseQuery() {
    if (!queryMessage.trim()) return;
    await fetch(`${API}/manpower/queries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ allocationId: queryFor.id, message: queryMessage }),
    });
    setQueryFor(null); setQueryMessage(''); fetchAll();
  }

  async function handleResolveQuery(queryId, response) {
    if (!response?.trim()) return;
    await fetch(`${API}/manpower/queries/${queryId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ response }),
    });
    fetchAll();
  }

  const pendingForMe = allocations.filter(a => a.toUserId === me.id && a.status === 'PENDING');
  const myAllocations = allocations.filter(a => a.toUserId === me.id || a.fromUserId === me.id);
  const openQueriesForMe = allocations.flatMap(a => (a.queries || []).filter(q => q.raisedToUserId === me.id && q.status === 'OPEN').map(q => ({ ...q, allocation: a })));

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manpower Allocation</h1>
          <p className="text-gray-500 text-sm mt-1">HR → Plant Manager → Stage/Store/Quality Head → Line, with accept and query at every step.</p>
        </div>

        {/* Send (HR -> Plant Manager) */}
        <div className="bg-white rounded-xl border shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">Send Today's Manpower to Plant Manager</h2>
          {sendError && <div className="mb-3 p-2 bg-red-50 text-red-600 rounded text-sm">{sendError}</div>}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Date</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={sendForm.date} onChange={e => setSendForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Plant Manager</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={sendForm.toUserId} onChange={e => setSendForm(f => ({ ...f, toUserId: e.target.value }))}>
                <option value="">— Select —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.role})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Total Count</label>
              <input type="number" min="1" className="w-full border rounded-lg px-3 py-2 text-sm" value={sendForm.count} onChange={e => setSendForm(f => ({ ...f, count: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Remarks</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={sendForm.remarks} onChange={e => setSendForm(f => ({ ...f, remarks: e.target.value }))} />
            </div>
          </div>
          <button onClick={handleSend} disabled={sending} className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>

        {/* Pending for me */}
        {pendingForMe.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <h2 className="font-semibold text-amber-800 mb-3">📋 Waiting for Your Acceptance</h2>
            <div className="space-y-2">
              {pendingForMe.map(a => (
                <div key={a.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-amber-100">
                  <span className="text-sm">
                    <strong>{a.count}</strong> from {userName(a.fromUserId)} {a.category ? `— ${a.category}` : ''} <span className="text-gray-400">({new Date(a.date).toLocaleDateString()})</span>
                  </span>
                  <button onClick={() => handleAccept(a.id)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700">Accept</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Open queries directed to me */}
        {openQueriesForMe.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <h2 className="font-semibold text-red-700 mb-3">⚠️ Queries Needing Your Response</h2>
            <div className="space-y-3">
              {openQueriesForMe.map(q => (
                <QueryRow key={q.id} query={q} onResolve={handleResolveQuery} />
              ))}
            </div>
          </div>
        )}

        {/* My allocations */}
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b font-semibold text-gray-800">My Allocations</div>
          <div className="divide-y">
            {loading ? (
              <div className="p-6 text-center text-gray-400">Loading...</div>
            ) : myAllocations.length === 0 ? (
              <div className="p-6 text-center text-gray-400">No allocations yet</div>
            ) : myAllocations.map(a => (
              <div key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-mono text-xs text-gray-400">{a.level}</span>
                    <span className="ml-2">{userName(a.fromUserId)}{a.toUserId ? ` → ${userName(a.toUserId)}` : ''}</span>
                    {a.category && <span className="ml-2 text-blue-600">{a.category}</span>}
                    {a.workOrder && <span className="ml-2 text-purple-600 font-mono text-xs">{a.workOrder.woNumber}</span>}
                    <span className="ml-2 font-bold">{a.count}</span>
                </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[a.status]}`}>{a.status}</span>
                    {a.toUserId === me.id && a.status !== 'PENDING' && a.level !== 'STAGE_TO_LINE' && (
                      <button onClick={() => openDistribute(a)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">Distribute</button>
                    )}
                    {a.toUserId && (a.toUserId === me.id || a.fromUserId === me.id) && (
                      <button onClick={() => setQueryFor(a)} className="text-xs text-red-500 hover:underline">Raise Query</button>
                    )}
                  </div>
                </div>
                {(a.queries || []).length > 0 && (
                  <div className="mt-2 pl-4 border-l-2 border-red-200 space-y-1">
                    {a.queries.map(q => (
                      <div key={q.id} className="text-xs text-gray-600">
                        <span className="text-red-600 font-medium">{q.raisedBy?.firstName}:</span> {q.message}
                        {q.response && <span className="block text-green-700 mt-0.5">↳ {q.response}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Distribute modal */}
        {distributeFor && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
              <div className="p-5 border-b flex justify-between items-center">
                <h2 className="font-bold">Distribute {distributeFor.count} — {distributeFor.category || 'Total'}</h2>
                <button onClick={() => setDistributeFor(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-5 space-y-3">
                {distError && <div className="p-2 bg-red-50 text-red-600 rounded text-sm">{distError}</div>}
                {distResult && (
                  <div className={`p-3 rounded-lg text-sm ${distResult.difference === 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    Distributed {distResult.distributedTotal} of {distResult.parentCount}.
                    {distResult.difference !== 0 && ` Difference: ${distResult.difference > 0 ? '-' : '+'}${Math.abs(distResult.difference)}. Consider raising a query if this looks wrong.`}
                  </div>
                )}
                {distLines.map((line, idx) => (
                  <div key={idx} className="border rounded-lg p-3 space-y-2 bg-gray-50">
                    <div className="grid grid-cols-3 gap-2">
                      <select className="border rounded-lg px-2 py-2 text-sm" value={line.category} onChange={e => setDistLines(prev => prev.map((l, i) => i === idx ? { ...l, category: e.target.value } : l))}>
                        <option value="">— Category —</option>
                        {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select className="border rounded-lg px-2 py-2 text-sm" value={line.toUserId} onChange={e => setDistLines(prev => prev.map((l, i) => i === idx ? { ...l, toUserId: e.target.value } : l))}>
                        <option value="">— Line Incharge (optional) —</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                      </select>
                      <input type="number" min="1" placeholder="Count" className="border rounded-lg px-2 py-2 text-sm" value={line.count} onChange={e => setDistLines(prev => prev.map((l, i) => i === idx ? { ...l, count: e.target.value } : l))} />
                    </div>
                    <select className="w-full border rounded-lg px-2 py-2 text-sm" value={line.workOrderId} onChange={e => setDistLines(prev => prev.map((l, i) => i === idx ? { ...l, workOrderId: e.target.value } : l))}>
                      <option value="">— Work Order (optional) —</option>
                      {workOrders.map(w => <option key={w.id} value={w.id}>{w.woNumber} — {w.productName} ({w.stageName || 'Production'})</option>)}
                    </select>
                    <p className="text-xs text-gray-400">Pick a Line Incharge, a Work Order, or both — at least one is required.</p>
                  </div>
                ))}
                <button onClick={() => setDistLines(prev => [...prev, { toUserId: '', workOrderId: '', category: '', count: '' }])} className="text-xs text-blue-600 hover:underline">+ Add Row</button>
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                <button onClick={() => setDistributeFor(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
                <button onClick={handleDistribute} disabled={distributing} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {distributing ? 'Submitting...' : 'Submit Distribution'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Raise query modal */}
        {queryFor && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b flex justify-between items-center">
                <h2 className="font-bold">Raise Query</h2>
                <button onClick={() => setQueryFor(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-5">
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} placeholder="Describe the discrepancy..." value={queryMessage} onChange={e => setQueryMessage(e.target.value)} />
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                <button onClick={() => setQueryFor(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleRaiseQuery} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium">Send Query</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function QueryRow({ query, onResolve }) {
  const [response, setResponse] = useState('');
  return (
    <div className="bg-white rounded-lg px-4 py-3 border border-red-100">
      <div className="text-sm text-gray-700 mb-2">{query.message}</div>
      <div className="flex gap-2">
        <input className="flex-1 border rounded-lg px-3 py-1.5 text-sm" placeholder="Your response..." value={response} onChange={e => setResponse(e.target.value)} />
        <button onClick={() => onResolve(query.id, response)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700">Resolve</button>
      </div>
    </div>
  );
}
