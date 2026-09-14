'use client';
import { useState } from 'react';
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

const STAGE_LABELS = {
  PO: 'Purchase Order', GRN: 'GRN', IQC: 'IQC', PUT_AWAY: 'Put-Away',
  RESERVATION: 'Reservation', ISSUE: 'Material Issue', PRODUCTION_RETURN: 'Production Return',
  LOCATION_TRANSFER: 'Location Transfer', STOCK_COUNT: 'Stock Count', RTV: 'RTV', GATE_OUT: 'Gate-Out',
};

export default function TraceItemPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await api(`/trace?q=${encodeURIComponent(query.trim())}`));
    } catch (e) { setError(e.message || 'Not found'); }
    setLoading(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Trace Item</h1>
          <p className="text-gray-500 text-sm mt-1">Search by item code or batch/lot number to see current state and full history in one place.</p>
        </div>

        <div className="flex gap-2 mb-6">
          <input
            placeholder="Item code or batch number..."
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
          />
          <button onClick={search} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Searching...' : 'Trace'}
          </button>
        </div>

        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-4">{error}</div>}

        {result && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <div className="font-semibold text-gray-800">{result.identity.itemName} <span className="text-gray-400 font-mono text-sm">({result.identity.itemCode})</span></div>
              {result.identity.batchNumber && <div className="text-xs text-gray-500 mt-1">Batch: <span className="font-mono">{result.identity.batchNumber}</span> {result.identity.poNumber && `· PO ${result.identity.poNumber}`} {result.identity.grnNumber && `· GRN ${result.identity.grnNumber}`}</div>}

              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Available</div>
                  <div className="text-lg font-bold text-gray-800">{result.currentState.availableQty}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Reserved</div>
                  <div className="text-lg font-bold text-gray-800">{result.currentState.reservedQty}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Free</div>
                  <div className="text-lg font-bold text-green-600">{result.currentState.freeQty}</div>
                </div>
              </div>

              {result.currentState.locations?.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs text-gray-400 mb-1">Current Location(s)</div>
                  <div className="flex gap-2 flex-wrap">
                    {result.currentState.locations.map((l, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">{l.binCode}: {l.qty} ({l.status})</span>
                    ))}
                  </div>
                </div>
              )}

              {result.currentState.batches?.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs text-gray-400 mb-1">Batches</div>
                  <div className="flex gap-2 flex-wrap">
                    {result.currentState.batches.map((b, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-mono">{b.batchNumber}: {b.availableQty} ({b.status})</span>
                    ))}
                  </div>
                </div>
              )}

              {result.note && <div className="text-xs text-gray-400 italic mt-3">{result.note}</div>}
            </div>

            {result.timeline?.length > 0 && (
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="font-semibold text-gray-700 mb-3">History</div>
                <div className="space-y-3">
                  {result.timeline.map((ev, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-24 flex-shrink-0 text-xs text-gray-400">{ev.at ? new Date(ev.at).toLocaleDateString() : ''}</div>
                      <div className="flex-1 pb-3 border-l-2 border-blue-200 pl-3 -mt-0.5">
                        <span className="text-xs font-semibold text-blue-700">{STAGE_LABELS[ev.stage] || ev.stage}</span>
                        <div className="text-sm text-gray-700">{ev.label}</div>
                        {ev.reference && <div className="text-xs text-gray-400 font-mono">{ev.reference}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
