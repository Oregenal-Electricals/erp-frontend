'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
async function api(path) {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}
const listOf = d => Array.isArray(d) ? d : (d?.data || []);

const QUICK_LINKS = [
  { href: '/inventory/material-in', label: 'Material In', desc: 'Gate arrivals through Put-Away' },
  { href: '/inventory/stock-hub', label: 'Stock', desc: 'Available, pending, rejected, locations' },
  { href: '/inventory/wo-material-issue', label: 'WO Material Issue', desc: 'Issue material to a Work Order' },
  { href: '/inventory/material-issue-overrides', label: 'Material Issue Overrides', desc: 'Management approval queue' },
];

const TXN_LABELS = {
  GRN_RECEIPT: 'Received (GRN)', IQC_ACCEPT: 'IQC Accepted', IQC_REJECT: 'IQC Rejected',
  ISSUE: 'Issued to WO', RETURN: 'Returned to Store', TRANSFER_IN: 'Transferred In',
  TRANSFER_OUT: 'Transferred Out', ADJUSTMENT: 'Adjustment',
};

export default function InventoryLandingPage() {
  const [stats, setStats] = useState({ pendingArrivals: null, pendingPutaway: null, pendingOverrides: null });
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [balances, setBalances] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api('/gate-inward?status=SENT_TO_STORES&limit=1').then(d => (d.total ?? listOf(d).length)).catch(() => null),
      api('/stock-putaway/pending-iqcs').then(d => d.length).catch(() => null),
      api('/production/material-issue-overrides/pending').then(d => d.length).catch(() => null),
    ]).then(([pendingArrivals, pendingPutaway, pendingOverrides]) => {
      setStats({ pendingArrivals, pendingPutaway, pendingOverrides });
    });
  }, []);

  async function runSearch() {
    if (!search.trim()) return;
    setSearching(true);
    setError('');
    setSelectedItem(null);
    setTimeline([]);
    try {
      const balRes = await api(`/stock-ledger/balance?search=${encodeURIComponent(search)}&limit=20`);
      setBalances(listOf(balRes));
      if (listOf(balRes).length === 0) setError('No item found matching that code or name.');
    } catch (e) { setError('Search failed.'); }
    setSearching(false);
  }

  async function traceItem(itemCode) {
    setSelectedItem(itemCode);
    try { setTimeline(await api(`/stock-ledger/item/${itemCode}`)); }
    catch (e) { setError('Could not load history.'); }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 text-sm mt-1">Search any item to trace its full history, or jump to a screen below.</p>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-4 mb-6">
          <label className="block text-xs text-gray-500 mb-1">Trace Item</label>
          <div className="flex gap-2">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Item code or name..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && runSearch()} />
            <button onClick={runSearch} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">{searching ? 'Searching...' : 'Trace'}</button>
          </div>
          {error && <div className="mt-3 text-xs text-red-600">{error}</div>}

          {balances.length > 0 && !selectedItem && (
            <div className="mt-3 divide-y border rounded-lg">
              {balances.map(b => (
                <button key={b.id} onClick={() => traceItem(b.itemCode)} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex justify-between">
                  <span>{b.itemName} <span className="text-gray-400 font-mono text-xs">({b.itemCode})</span></span>
                  <span className="text-xs text-gray-500">{b.availableQty} avail. @ {b.warehouse?.name}</span>
                </button>
              ))}
            </div>
          )}

          {selectedItem && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-mono font-bold text-blue-600 text-sm">{selectedItem}</div>
                <button onClick={() => { setSelectedItem(null); setTimeline([]); }} className="text-xs text-gray-500 hover:text-gray-700">Back to results</button>
              </div>
              <div className="space-y-2">
                {timeline.length === 0 && <div className="text-xs text-gray-400 py-4 text-center">No ledger history for this item.</div>}
                {timeline.map(t => (
                  <div key={t.id} className="flex items-center justify-between text-xs border-b pb-2">
                    <div>
                      <span className="font-medium">{TXN_LABELS[t.transactionType] || t.transactionType}</span>
                      <span className="text-gray-400 ml-2">{t.warehouse?.name}</span>
                      {t.referenceNumber && <span className="text-gray-400 ml-2 font-mono">{t.referenceNumber}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      {t.inQty > 0 && <span className="text-green-600 font-bold">+{t.inQty}</span>}
                      {t.outQty > 0 && <span className="text-red-600 font-bold">-{t.outQty}</span>}
                      <span className="text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.pendingArrivals ?? '-'}</div>
            <div className="text-xs text-gray-500 mt-1">Pending Gate Arrivals</div>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.pendingPutaway ?? '-'}</div>
            <div className="text-xs text-gray-500 mt-1">Pending Put-Away</div>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.pendingOverrides ?? '-'}</div>
            <div className="text-xs text-gray-500 mt-1">Pending Overrides</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {QUICK_LINKS.map(l => (
            <Link key={l.href} href={l.href} className="bg-white rounded-xl border p-4 hover:border-blue-400 hover:shadow-sm transition">
              <div className="font-semibold text-gray-800">{l.label}</div>
              <div className="text-xs text-gray-500 mt-1">{l.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
