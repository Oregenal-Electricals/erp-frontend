'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { getToken, getUser } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL;

const STATUS_COLORS = {
  PENDING: 'bg-amber-100 text-amber-700',
  RECEIVED: 'bg-green-100 text-green-700',
};

export default function StageTransfersPage() {
  const me = getUser() || {};
  const [transfers, setTransfers] = useState([]);
  const [completedWos, setCompletedWos] = useState([]);
  const [destWos, setDestWos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [giveForm, setGiveForm] = useState({ fromWorkOrderId: '', toWorkOrderId: '', qty: '', remarks: '' });
  const [giveError, setGiveError] = useState('');
  const [giving, setGiving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [transferRes, compRes, draftRes, relRes, ipRes] = await Promise.all([
      fetch(`${API}/stage-transfers`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/work-orders?status=COMPLETED&limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/work-orders?status=DRAFT&limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/work-orders?status=RELEASED&limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/work-orders?status=IN_PROGRESS&limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (transferRes.ok) setTransfers(await transferRes.json());
    const [compData, draftData, relData, ipData] = await Promise.all([
      compRes.ok ? compRes.json() : { data: [] },
      draftRes.ok ? draftRes.json() : { data: [] },
      relRes.ok ? relRes.json() : { data: [] },
      ipRes.ok ? ipRes.json() : { data: [] },
    ]);
    // PROD-006: a stage no longer needs to be fully COMPLETED to hand
    // over output - IN_PROGRESS Work Orders can give a partial
    // transferable quantity too.
    setCompletedWos([...(ipData.data || []), ...(compData.data || [])]);
    setDestWos([...(ipData.data || []), ...(relData.data || []), ...(draftData.data || [])]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function selectedFromWo() {
    return completedWos.find(w => w.id === giveForm.fromWorkOrderId);
  }

  function onFromChange(id) {
    const wo = completedWos.find(w => w.id === id);
    const transferable = wo ? Math.max(0, (wo.completedQty || 0) - (wo.cumulativeHandoverQty || 0)) : '';
    setGiveForm(f => ({ ...f, fromWorkOrderId: id, qty: wo ? String(transferable) : '' }));
  }

  async function handleGive() {
    setGiveError('');
    if (!giveForm.fromWorkOrderId || !giveForm.toWorkOrderId || !giveForm.qty) {
      setGiveError('Select a source, a destination, and a quantity'); return;
    }
    setGiving(true);
    const res = await fetch(`${API}/stage-transfers/give`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({
        fromWorkOrderId: giveForm.fromWorkOrderId, toWorkOrderId: giveForm.toWorkOrderId,
        qty: parseFloat(giveForm.qty), remarks: giveForm.remarks || undefined,
      }),
    });
    const data = await res.json();
    if (res.ok) { setGiveForm({ fromWorkOrderId: '', toWorkOrderId: '', qty: '', remarks: '' }); fetchAll(); }
    else setGiveError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    setGiving(false);
  }

  async function handleReceive(id) {
    await fetch(`${API}/stage-transfers/${id}/receive`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchAll();
  }

  const pending = transfers.filter(t => t.status === 'PENDING');

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Stage Transfer Notes</h1>
          <p className="text-gray-500 text-sm mt-1">Give finished goods from one stage&apos;s Work Order to another, and the receiving stage confirms it.</p>
        </div>

        {/* Give */}
        <div className="bg-white rounded-xl border shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">Give a Transfer</h2>
          {giveError && <div className="mb-3 p-2 bg-red-50 text-red-600 rounded text-sm">{giveError}</div>}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">From (completed Work Order)</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={giveForm.fromWorkOrderId} onChange={e => onFromChange(e.target.value)}>
                <option value="">— Select —</option>
                {completedWos.map(w => <option key={w.id} value={w.id}>{w.woNumber} — {w.productName} ({Math.max(0, (w.completedQty || 0) - (w.cumulativeHandoverQty || 0))} transferable, {w.completedQty} completed)</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">To (destination Work Order)</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={giveForm.toWorkOrderId} onChange={e => setGiveForm(f => ({ ...f, toWorkOrderId: e.target.value }))}>
                <option value="">— Select —</option>
                {destWos.map(w => <option key={w.id} value={w.id}>{w.woNumber} — {w.productName} ({w.status})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Quantity</label>
              <input type="number" min="0.0001" className="w-full border rounded-lg px-3 py-2 text-sm" value={giveForm.qty} onChange={e => setGiveForm(f => ({ ...f, qty: e.target.value }))} />
              {selectedFromWo() && <p className="text-xs text-gray-400 mt-1">Max {selectedFromWo().completedQty} available</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Remarks</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={giveForm.remarks} onChange={e => setGiveForm(f => ({ ...f, remarks: e.target.value }))} />
            </div>
          </div>
          <button onClick={handleGive} disabled={giving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {giving ? 'Giving...' : 'Give Transfer'}
          </button>
        </div>

        {/* Pending to receive */}
        {pending.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <h2 className="font-semibold text-amber-800 mb-3">📦 Pending Receipt</h2>
            <div className="space-y-2">
              {pending.map(t => (
                <div key={t.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-amber-100">
                  <span className="text-sm">
                    <strong>{t.qty}</strong> × {t.itemName} from <span className="font-mono">{t.fromWorkOrder?.woNumber}</span> → <span className="font-mono">{t.toWorkOrder?.woNumber}</span>
                    <span className="text-gray-400 ml-2">given by {t.givenBy?.firstName} {t.givenBy?.lastName}</span>
                  </span>
                  <button onClick={() => handleReceive(t.id)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700">Receive</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All transfers */}
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b font-semibold text-gray-800">All Transfers</div>
          <div className="divide-y">
            {loading ? (
              <div className="p-6 text-center text-gray-400">Loading...</div>
            ) : transfers.length === 0 ? (
              <div className="p-6 text-center text-gray-400">No transfers yet</div>
            ) : transfers.map(t => (
              <div key={t.id} className="p-4 flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-mono text-blue-600">{t.fromWorkOrder?.woNumber}</span>
                  <span className="mx-2 text-gray-400">→</span>
                  <span className="font-mono text-blue-600">{t.toWorkOrder?.woNumber}</span>
                  <span className="ml-3 font-bold">{t.qty}</span>
                  <span className="ml-2 text-gray-500">{t.itemName}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className={`px-2 py-1 rounded-full font-medium ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                  <span>{new Date(t.givenAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
