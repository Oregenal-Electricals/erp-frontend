'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '\u2014';

export default function ProductionTargetsPage() {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [history, setHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [rate, setRate] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function runSearch() {
    if (!search.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const res = await fetch(`${API}/products?search=${encodeURIComponent(search)}&limit=10`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) {
      const d = await res.json();
      setSearchResults(d.data || d || []);
    }
    setSearching(false);
  }

  async function pickProduct(p) {
    setSelectedProduct(p);
    setSearchResults([]);
    setSearch('');
    setError('');
    setRate('');
    setEffectiveFrom('');
    await loadHistory(p.id);
  }

  async function loadHistory(productId) {
    setLoadingHistory(true);
    const res = await fetch(`${API}/production/targets/product/${productId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) setHistory(await res.json());
    else setHistory([]);
    setLoadingHistory(false);
  }

  const current = history && history.length > 0 ? history.find(v => !v.effectiveTo) || history[0] : null;
  const isFirstTime = history && history.length === 0;

  async function submit() {
    if (!selectedProduct || !rate) return;
    setSaving(true);
    setError('');
    const url = isFirstTime
      ? `${API}/production/targets`
      : `${API}/production/targets/product/${selectedProduct.id}/revise`;
    const body = isFirstTime
      ? { productId: selectedProduct.id, piecesPerManHour: Number(rate), ...(effectiveFrom ? { effectiveFrom } : {}) }
      : { piecesPerManHour: Number(rate), effectiveFrom };

    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    if (!res.ok) {
      setError(d.message || 'Something went wrong');
    } else {
      setRate('');
      setEffectiveFrom('');
      await loadHistory(selectedProduct.id);
    }
    setSaving(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Production Targets</h1>
          <p className="text-gray-500 text-sm mt-1">Set or revise the standard productivity target (pieces/man-hour) per product. Revising never edits history - the old target stays valid for the period it was actually effective.</p>
        </div>

        {!selectedProduct && (
          <div className="bg-white rounded-xl border p-4">
            <label className="block text-xs text-gray-500 mb-1">Search Product</label>
            <div className="flex gap-2">
              <input
                className="border rounded-lg px-3 py-2 text-sm flex-1"
                placeholder="Search by product code or name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runSearch()}
              />
              <button onClick={runSearch} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="mt-3 divide-y border rounded-lg">
                {searchResults.map(p => (
                  <button key={p.id} onClick={() => pickProduct(p)} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                    <span className="font-mono text-blue-600 font-bold">{p.code}</span> - {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedProduct && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border p-4 flex items-center justify-between">
              <div>
                <div className="font-mono text-blue-600 font-bold text-sm">{selectedProduct.code}</div>
                <div className="text-gray-700">{selectedProduct.name}</div>
              </div>
              <button onClick={() => { setSelectedProduct(null); setHistory(null); }} className="text-sm text-gray-500 hover:text-gray-700">
                Change Product
              </button>
            </div>

            {loadingHistory && <div className="text-center py-8 text-gray-400">Loading...</div>}

            {!loadingHistory && current && (
              <div className="bg-purple-50 rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-1">Current Target</div>
                <div className="text-2xl font-bold text-purple-700">{current.piecesPerManHour} pcs/man-hour</div>
                <div className="text-xs text-gray-400 mt-1">Effective since {fmtDate(current.effectiveFrom)}</div>
              </div>
            )}

            {!loadingHistory && (
              <div className="bg-white rounded-xl border p-4">
                <div className="font-semibold text-gray-700 mb-3">
                  {isFirstTime ? 'Set Target (first time for this product)' : 'Revise Target'}
                </div>
                {!isFirstTime && (
                  <p className="text-xs text-gray-400 mb-3">Product is already selected above - no need to search again. The current target stays valid for its period; your new value applies only from the date below.</p>
                )}
                <div className="flex gap-3 items-end flex-wrap">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Target (pieces/man-hour)</label>
                    <input type="number" step="0.01" className="border rounded-lg px-3 py-2 text-sm w-40" value={rate} onChange={e => setRate(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Effective From{isFirstTime ? ' (optional, defaults to today)' : ''}</label>
                    <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} />
                  </div>
                  <button
                    onClick={submit}
                    disabled={saving || !rate || (!isFirstTime && !effectiveFrom)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : isFirstTime ? 'Set Target' : 'Revise Target'}
                  </button>
                </div>
                {error && <div className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
              </div>
            )}

            {!loadingHistory && history && history.length > 0 && (
              <div className="bg-white rounded-xl border shadow-sm">
                <div className="p-4 border-b font-semibold text-gray-700">Version History</div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>{['Rate (pcs/man-hr)', 'Effective From', 'Effective To', 'Status'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {history.map((v, i) => (
                      <tr key={i} className={!v.effectiveTo ? 'bg-purple-50' : ''}>
                        <td className="px-3 py-2 text-xs font-bold">{v.piecesPerManHour}</td>
                        <td className="px-3 py-2 text-xs font-mono">{fmtDate(v.effectiveFrom)}</td>
                        <td className="px-3 py-2 text-xs font-mono">{v.effectiveTo ? fmtDate(v.effectiveTo) : 'Current'}</td>
                        <td className="px-3 py-2 text-xs">{!v.effectiveTo ? <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs">Active</span> : <span className="text-gray-400">Historical</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
