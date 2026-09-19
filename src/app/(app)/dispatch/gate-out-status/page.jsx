'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
function authHeaders(json) { const h = { Authorization: `Bearer ${getToken()}` }; if (json) h['Content-Type'] = 'application/json'; return h; }

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'READY_FOR_GATE_OUT', label: 'Ready for Gate-Out' },
  { key: 'GATED_OUT', label: 'Gate-Out Completed' },
];

export default function GateOutStatusPage() {
  const [filter, setFilter] = useState('READY_FOR_GATE_OUT');
  const [confirmations, setConfirmations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const qs = filter ? `?status=${filter}` : '';
    const res = await fetch(`${API}/dispatch-confirmation${qs}`, { headers: authHeaders() });
    const d = await res.json();
    if (res.ok) setConfirmations(Array.isArray(d) ? d : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

  async function handleGateOut(dc) {
    setBusy(dc.id); setError('');
    const res = await fetch(`${API}/dispatch-gate-out`, {
      method: 'POST', headers: authHeaders(true),
      body: JSON.stringify({ dispatchConfirmationId: dc.id, actualVehicleNumber: dc.transportAssignment?.vehicleNumber }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message || 'Gate-Out failed'); setBusy(''); return; }
    setBusy('');
    load();
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-lg font-semibold mb-4">Gate-Out Status</h1>
        <div className="flex gap-2 mb-4">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1 rounded-full text-xs font-medium ${filter === f.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{f.label}</button>
          ))}
        </div>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : confirmations.length === 0 ? (
          <p className="text-sm text-gray-400">No dispatch confirmations in this state.</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border divide-y">
            {confirmations.map(dc => (
              <div key={dc.id} className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-mono text-sm text-indigo-600">{dc.confirmationNumber}</span>
                  <span className="text-sm text-gray-500 ml-2">{dc.customerName}</span>
                  <span className="text-xs text-gray-400 ml-2">{dc.transportAssignment?.vehicleNumber}</span>
                  <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{dc.status}</span>
                </div>
                {dc.status === 'READY_FOR_GATE_OUT' && (
                  <button disabled={busy === dc.id} onClick={() => handleGateOut(dc)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50">Confirm Gate-Out</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
