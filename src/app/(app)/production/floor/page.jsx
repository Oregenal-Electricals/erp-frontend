'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

export default function ProductionFloorPage() {
  const [orders, setOrders] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [goodQty, setGoodQty] = useState('');
  const [scrapQty, setScrapQty] = useState('0');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const [relRes, ipRes] = await Promise.all([
      fetch(`${API}/work-orders?status=RELEASED&limit=50`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/work-orders?status=IN_PROGRESS&limit=50`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    const [relData, ipData] = await Promise.all([relRes.json(), ipRes.json()]);
    const list = [...(ipData.data || []), ...(relData.data || [])];
    setOrders(list);
    setSelectedId(prev => (prev && list.some(o => o.id === prev)) ? prev : (list[0]?.id || ''));
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const selected = orders.find(o => o.id === selectedId);

  useEffect(() => {
    setGoodQty(''); setScrapQty('0'); setMessage(null);
  }, [selectedId]);

  async function handleSubmit() {
    if (!selected) return;
    const good = parseFloat(goodQty) || 0;
    const scrap = parseFloat(scrapQty) || 0;
    if (good <= 0 && scrap <= 0) { setMessage({ type: 'error', text: 'Enter a quantity greater than 0' }); return; }
    setSubmitting(true); setMessage(null);
    try {
      // 1. Start the Work Order if it hasn't been started yet
      if (selected.status === 'RELEASED') {
        await fetch(`${API}/work-orders/${selected.id}/start`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: '{}',
        });
      }

      // 2. Record production
      const peRes = await fetch(`${API}/production-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ workOrderId: selected.id, goodQty: good, scrapQty: scrap, shift: 'MORNING' }),
      });
      const pe = await peRes.json();
      if (!peRes.ok) { setMessage({ type: 'error', text: pe.message || 'Failed to record production' }); setSubmitting(false); return; }

      // 3. Confirm it - this is what actually updates the Work Order's
      // progress and (if it reaches planned qty) completes it and releases
      // the reserved material.
      const confirmRes = await fetch(`${API}/production-entries/${pe.id}/confirm`, {
        method: 'POST', headers: { Authorization: `Bearer ${getToken()}` },
      });
      const confirmed = await confirmRes.json();
      if (!confirmRes.ok) { setMessage({ type: 'error', text: confirmed.message || 'Failed to confirm production' }); setSubmitting(false); return; }

      // 4. Check whether the Work Order is now fully complete
      const woRes = await fetch(`${API}/work-orders/${selected.id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const woNow = await woRes.json();

      if (woNow.status === 'COMPLETED') {
        // 5. Same as the Auto-Create button on the FG Receipts page: create
        // then immediately confirm the receipt, which is also what
        // auto-releases the next routing stage.
        const frRes = await fetch(`${API}/fg-receipts/from-wo/${selected.id}`, {
          method: 'POST', headers: { Authorization: `Bearer ${getToken()}` },
        });
        const fr = await frRes.json();
        if (frRes.ok) {
          await fetch(`${API}/fg-receipts/${fr.id}/confirm`, {
            method: 'POST', headers: { Authorization: `Bearer ${getToken()}` },
          });
        }
        setMessage({ type: 'success', text: `Stage complete! ${good} unit(s) received into stock. The next stage is now ready to start.` });
      } else {
        setMessage({ type: 'success', text: `Recorded ${good} unit(s). ${woNow.plannedQty - woNow.completedQty} remaining on this stage.` });
      }
      await fetchOrders();
    } catch (e) {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    }
    setSubmitting(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Production Floor</h1>
          <p className="text-gray-500 text-sm mt-1">Record what you built — one screen, one click.</p>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 py-12 text-center text-gray-400">
            No active Work Orders right now.
          </div>
        ) : (
          <>
            {orders.length > 1 && (
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-1">Select Work Order</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.woNumber} — {o.productName} ({o.stageName || 'Production'}) — {o.completedQty}/{o.plannedQty}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selected && (
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-xs text-gray-400 font-mono">{selected.woNumber}</div>
                    <div className="text-lg font-bold text-gray-900">{selected.productName}</div>
                    <div className="text-sm text-blue-600 font-medium">Now building: {selected.stageName || 'Production'}</div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${selected.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                    {selected.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6 text-center">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xl font-bold text-gray-800">{selected.plannedQty}</div>
                    <div className="text-xs text-gray-500">Planned</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-xl font-bold text-green-700">{selected.completedQty}</div>
                    <div className="text-xs text-gray-500">Done So Far</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xl font-bold text-blue-700">{selected.plannedQty - selected.completedQty}</div>
                    <div className="text-xs text-gray-500">Remaining</div>
                  </div>
                </div>

                {message && (
                  <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {message.type === 'success' ? '✅ ' : '❌ '}{message.text}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Good Qty *</label>
                    <input type="number" min="0" className="w-full border rounded-lg px-3 py-3 text-lg font-semibold text-center"
                      value={goodQty} onChange={e => setGoodQty(e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Scrap Qty</label>
                    <input type="number" min="0" className="w-full border rounded-lg px-3 py-3 text-lg font-semibold text-center"
                      value={scrapQty} onChange={e => setScrapQty(e.target.value)} placeholder="0" />
                  </div>
                </div>

                <button onClick={handleSubmit} disabled={submitting}
                  className="w-full bg-blue-600 text-white py-3.5 rounded-lg text-base font-bold hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? 'Submitting...' : 'Submit & Complete Stage'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
