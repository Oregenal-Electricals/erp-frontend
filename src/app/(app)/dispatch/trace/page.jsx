'use client';
import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
function authHeaders() { return { Authorization: `Bearer ${getToken()}` }; }

const SEARCH_TYPES = [
  { key: 'packageNumber', label: 'Package No', placeholder: 'PKG-000001' },
  { key: 'gateOutNumber', label: 'Gate-Out No', placeholder: 'GO-2026-0001' },
  { key: 'soNumber', label: 'Sales Order No', placeholder: 'SO-2026-0001' },
];

export default function TraceDispatchPage() {
  const [searchType, setSearchType] = useState('gateOutNumber');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(''); setResults(null);
    const res = await fetch(`${API}/dispatch-reconciliation/trace?${searchType}=${encodeURIComponent(query.trim())}`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) { setError(data.message || 'Nothing found for this reference'); setLoading(false); return; }
    setResults(data);
    setLoading(false);
  }

  const current = SEARCH_TYPES.find(t => t.key === searchType);

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-lg font-semibold mb-4">Trace Dispatch</h1>
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <select className="border rounded px-2 py-1.5 text-sm" value={searchType} onChange={e => setSearchType(e.target.value)}>
            {SEARCH_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <input className="border rounded px-2 py-1.5 text-sm flex-1" placeholder={current.placeholder} value={query} onChange={e => setQuery(e.target.value)} />
          <button disabled={loading} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">Search</button>
        </form>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {results && results.map(r => (
          <div key={r.packageId} className="bg-white rounded-xl shadow-sm border p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-sm text-indigo-600">{r.packageNumber}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{r.currentStatus}</span>
            </div>
            <div className="space-y-2 mb-3">
              {r.timeline.map((t, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                  <span className="text-gray-500 w-44 flex-shrink-0">{t.stage.replaceAll('_', ' ')}</span>
                  <span className="font-mono text-gray-800">{t.ref}</span>
                  {t.vehicleNumber && <span className="text-xs text-gray-400">{t.vehicleNumber}</span>}
                  <span className="text-xs text-gray-400 ml-auto">{new Date(t.at).toLocaleString()}</span>
                </div>
              ))}
            </div>
            {r.sourceTrace?.length > 0 && (
              <div className="border-t pt-2 text-xs text-gray-500">
                {r.sourceTrace.map((s, i) => (
                  <div key={i}>{s.itemCode} ({s.saleType}) — {s.source === 'BATCH' ? `Batch ${s.batchNumber}` : s.source === 'WORK_ORDER' ? `${s.workOrderNumber} / ${s.stageName}` : 'Untracked'}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
