'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const TABS = [
  { key: 'putaway', label: 'Putaway' },
  { key: 'issue', label: 'Issue to Production' },
  { key: 'transfers', label: 'Stage Transfers' },
  { key: 'fgReceipt', label: 'FG Receipt' },
  { key: 'rejected', label: 'Rejected Stock' },
];

export default function StoreManagementPage() {
  const [activeTab, setActiveTab] = useState('putaway');

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Store Management</h1>
          <p className="text-gray-500 text-sm mt-1">
            Everything the store handles day to day, in one place — receive from IQC into a rack, issue
            material to a Work Order, hand off between stages, receive finished goods (or send back a
            rejection with a reason), and track rejected stock through to disposition.
          </p>
        </div>

        <div className="flex gap-1 border-b mb-6 flex-wrap">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'putaway' && <PutawayTab />}
        {activeTab === 'issue' && <IssueTab />}
        {activeTab === 'transfers' && <TransfersTab />}
        {activeTab === 'fgReceipt' && <FgReceiptTab />}
        {activeTab === 'rejected' && <RejectedTab />}
      </div>
    </AppLayout>
  );
}

// ---------------------------------------------------------------------------
// Putaway — approved IQCs waiting to be assigned a rack/bin location
// ---------------------------------------------------------------------------
function PutawayTab() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIqc, setActiveIqc] = useState(null);
  const [items, setItems] = useState([]);
  const [bins, setBins] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/stock-putaway/pending-iqcs`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setPending(await res.json());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function openIqc(iqcSummary) {
    setError('');
    const [iqcRes, binsRes] = await Promise.all([
      fetch(`${API}/iqc/${iqcSummary.id}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/rack-bin/bins/empty/${iqcSummary.grn.warehouseId}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (iqcRes.ok) {
      const iqc = await iqcRes.json();
      const acceptedItems = (iqc.items || []).filter(i => (i.acceptedQty ?? i.qty) > 0);
      setItems(acceptedItems.map(i => ({ ...i, binId: '' })));
      setActiveIqc(iqc);
    }
    if (binsRes.ok) setBins(await binsRes.json());
  }

  function updateBin(idx, binId) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, binId } : it));
  }

  async function submitPutaway() {
    if (items.some(it => !it.binId)) { setError('Assign a bin to every item first'); return; }
    setSaving(true); setError('');
    const res = await fetch(`${API}/stock-putaway`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({
        grnId: activeIqc.grnId, iqcId: activeIqc.id, warehouseId: activeIqc.grn.warehouseId,
        items: items.map(it => ({
          binId: it.binId, itemCode: it.itemCode, itemName: it.itemName, uom: it.uom,
          qty: it.acceptedQty ?? it.qty, unitCost: it.unitCost || 0,
        })),
      }),
    });
    const data = await res.json();
    if (res.ok) { setActiveIqc(null); setItems([]); load(); }
    else setError(data.message || 'Failed to save putaway');
    setSaving(false);
  }

  if (activeIqc) {
    return (
      <div className="bg-white rounded-xl border p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-gray-800">Putaway — {activeIqc.iqcNumber}</h2>
          <button onClick={() => { setActiveIqc(null); setItems([]); }} className="text-sm text-gray-500 hover:underline">Cancel</button>
        </div>
        {error && <div className="mb-3 bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
        <table className="w-full text-sm mb-4">
          <thead className="text-gray-400 text-xs uppercase">
            <tr>{['Item', 'Qty', 'Bin'].map(h => <th key={h} className="text-left px-2 py-2">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {items.map((it, idx) => (
              <tr key={it.id}>
                <td className="px-2 py-2 font-mono">{it.itemCode} — {it.itemName}</td>
                <td className="px-2 py-2">{it.acceptedQty ?? it.qty} {it.uom}</td>
                <td className="px-2 py-2">
                  <select className="border rounded px-2 py-1 text-sm" value={it.binId} onChange={e => updateBin(idx, e.target.value)}>
                    <option value="">— Select Bin —</option>
                    {bins.map(b => <option key={b.id} value={b.id}>{b.binCode || b.code}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={submitPutaway} disabled={saving} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Confirm Putaway'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border">
      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading...</div>
      ) : pending.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">Nothing waiting for putaway right now</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>{['IQC No.', 'GRN', 'Warehouse', 'Approved', 'Action'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {pending.map(iqc => (
              <tr key={iqc.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-blue-600">{iqc.iqcNumber}</td>
                <td className="px-4 py-3">{iqc.grn?.grnNumber}</td>
                <td className="px-4 py-3">{iqc.grn?.warehouse?.name}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(iqc.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3"><button onClick={() => openIqc(iqc)} className="text-blue-600 hover:underline text-sm">Putaway</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Issue to Production — pick an active Work Order, issue its material need
// ---------------------------------------------------------------------------
function IssueTab() {
  const [wos, setWos] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [woRes, whRes] = await Promise.all([
      fetch(`${API}/work-orders?status=RELEASED&limit=50`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/warehouses?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (woRes.ok) { const d = await woRes.json(); setWos(d.data || []); }
    if (whRes.ok) { const d = await whRes.json(); setWarehouses(d.data || []); if (d.data?.length) setWarehouseId(d.data[0].id); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function openWo(wo) {
    setError('');
    const res = await fetch(`${API}/production-issues/from-mrp/${wo.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ workOrderId: wo.id, warehouseId }),
    });
    const data = await res.json();
    if (res.ok) setPreview(data);
    else setError(data.message || 'Failed to prepare material issue');
  }

  async function confirmIssue() {
    setConfirming(true); setError('');
    const res = await fetch(`${API}/production-issues/${preview.id}/confirm`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    const data = await res.json();
    if (res.ok) { setPreview(null); load(); }
    else setError(data.message || 'Failed to confirm issue');
    setConfirming(false);
  }

  if (preview) {
    return (
      <div className="bg-white rounded-xl border p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-gray-800">Material Issue — {preview.issueNumber}</h2>
          <button onClick={() => setPreview(null)} className="text-sm text-gray-500 hover:underline">Cancel</button>
        </div>
        {error && <div className="mb-3 bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
        <table className="w-full text-sm mb-4">
          <thead className="text-gray-400 text-xs uppercase">
            <tr>{['Item', 'Required', 'Issuing'].map(h => <th key={h} className="text-left px-2 py-2">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {(preview.items || []).map(it => (
              <tr key={it.id}>
                <td className="px-2 py-2 font-mono">{it.itemCode} — {it.itemName}</td>
                <td className="px-2 py-2">{it.requiredQty} {it.uom}</td>
                <td className="px-2 py-2 font-bold">{it.issuedQty} {it.uom}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={confirmIssue} disabled={confirming} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
          {confirming ? 'Confirming...' : 'Confirm Issue'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border p-3">
        <label className="block text-xs text-gray-500 mb-1">Warehouse to issue from</label>
        <select className="border rounded-lg px-3 py-2 text-sm" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>
      {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
      <div className="bg-white rounded-xl border">
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading...</div>
        ) : wos.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">No released Work Orders need material right now</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['WO Number', 'Product', 'Stage', 'Qty', 'Action'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {wos.map(wo => (
                <tr key={wo.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-blue-600">{wo.woNumber}</td>
                  <td className="px-4 py-3">{wo.productName}</td>
                  <td className="px-4 py-3">{wo.stageName}</td>
                  <td className="px-4 py-3">{wo.plannedQty}</td>
                  <td className="px-4 py-3"><button onClick={() => openWo(wo)} className="text-blue-600 hover:underline text-sm">Issue Material</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage Transfers — give completed output to the next stage, receive what's
// pending
// ---------------------------------------------------------------------------
function TransfersTab() {
  const [pending, setPending] = useState([]);
  const [completedWos, setCompletedWos] = useState([]);
  const [releasedWos, setReleasedWos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [giveForm, setGiveForm] = useState({ fromWorkOrderId: '', toWorkOrderId: '', qty: '', remarks: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [transferRes, completedRes, releasedRes] = await Promise.all([
      fetch(`${API}/stage-transfers?pending=true`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/work-orders?status=COMPLETED&limit=50`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/work-orders?status=RELEASED&limit=50`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (transferRes.ok) setPending(await transferRes.json());
    if (completedRes.ok) { const d = await completedRes.json(); setCompletedWos(d.data || []); }
    if (releasedRes.ok) { const d = await releasedRes.json(); setReleasedWos(d.data || []); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleGive() {
    if (!giveForm.fromWorkOrderId || !giveForm.toWorkOrderId) { setError('Select both a source and destination Work Order'); return; }
    setSaving(true); setError('');
    const body = { fromWorkOrderId: giveForm.fromWorkOrderId, toWorkOrderId: giveForm.toWorkOrderId, remarks: giveForm.remarks };
    if (giveForm.qty) body.qty = parseFloat(giveForm.qty);
    const res = await fetch(`${API}/stage-transfers/give`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setGiveForm({ fromWorkOrderId: '', toWorkOrderId: '', qty: '', remarks: '' }); load(); }
    else setError(data.message || 'Failed to give transfer');
    setSaving(false);
  }

  async function handleReceive(id) {
    await fetch(`${API}/stage-transfers/${id}/receive`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-bold text-gray-800 mb-3">Give — hand off completed output to the next stage</h2>
        {error && <div className="mb-3 bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From (completed WO)</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={giveForm.fromWorkOrderId} onChange={e => setGiveForm(f => ({ ...f, fromWorkOrderId: e.target.value }))}>
              <option value="">— Select —</option>
              {completedWos.map(wo => <option key={wo.id} value={wo.id}>{wo.woNumber} — {wo.stageName} ({wo.completedQty} completed)</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To (next stage WO)</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={giveForm.toWorkOrderId} onChange={e => setGiveForm(f => ({ ...f, toWorkOrderId: e.target.value }))}>
              <option value="">— Select —</option>
              {releasedWos.map(wo => <option key={wo.id} value={wo.id}>{wo.woNumber} — {wo.stageName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Qty (optional — defaults to full completed qty)</label>
            <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={giveForm.qty} onChange={e => setGiveForm(f => ({ ...f, qty: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Remarks</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={giveForm.remarks} onChange={e => setGiveForm(f => ({ ...f, remarks: e.target.value }))} />
          </div>
        </div>
        <button onClick={handleGive} disabled={saving} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Give'}
        </button>
      </div>

      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b font-bold text-gray-800">Pending receipt</div>
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading...</div>
        ) : pending.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">Nothing waiting to be received</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['Item', 'Qty', 'From', 'To', 'Given At', 'Action'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {pending.map(n => (
                <tr key={n.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono">{n.itemCode} — {n.itemName}</td>
                  <td className="px-4 py-3">{n.qty}</td>
                  <td className="px-4 py-3">{n.fromWorkOrder?.woNumber}</td>
                  <td className="px-4 py-3">{n.toWorkOrder?.woNumber}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(n.givenAt).toLocaleString()}</td>
                  <td className="px-4 py-3"><button onClick={() => handleReceive(n.id)} className="text-green-600 hover:underline text-sm">Receive</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FG Receipt — receive a completed Work Order's finished output into store,
// capturing a real reason for any rejected quantity
// ---------------------------------------------------------------------------
function FgReceiptTab() {
  const [pendingWos, setPendingWos] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [receivedQty, setReceivedQty] = useState('');
  const [rejectedQty, setRejectedQty] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [wosRes, whRes] = await Promise.all([
      fetch(`${API}/fg-receipts/pending-wos`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/warehouses?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (wosRes.ok) setPendingWos(await wosRes.json());
    if (whRes.ok) { const d = await whRes.json(); setWarehouses(d.data || []); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  function openWo(wo) {
    setError('');
    setPreview(wo);
    setReceivedQty(String(wo.completedQty || 0));
    setRejectedQty('0');
    setRejectReason('');
  }

  async function confirmReceipt() {
    setConfirming(true); setError('');
    const warehouseId = preview.warehouseId || warehouses[0]?.id;
    const rejQty = parseFloat(rejectedQty) || 0;
    if (rejQty > 0 && !rejectReason.trim()) { setError('Give a reason for the rejected quantity'); setConfirming(false); return; }

    const res = await fetch(`${API}/fg-receipts/from-wo/${preview.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({
        workOrderId: preview.id, warehouseId,
        receivedQty: parseFloat(receivedQty) || 0, rejectedQty: rejQty,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message || 'Failed to create FG Receipt'); setConfirming(false); return; }

    const confirmRes = await fetch(`${API}/fg-receipts/${data.id}/confirm`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    if (!confirmRes.ok) { const d = await confirmRes.json(); setError(d.message || 'Failed to confirm FG Receipt'); setConfirming(false); return; }

    if (rejQty > 0) {
      await fetch(`${API}/rejected-stock/from-fg-receipt/${data.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
    }

    setPreview(null);
    load();
    setConfirming(false);
  }

  if (preview) {
    return (
      <div className="bg-white rounded-xl border p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-gray-800">FG Receipt — {preview.woNumber}</h2>
          <button onClick={() => setPreview(null)} className="text-sm text-gray-500 hover:underline">Cancel</button>
        </div>
        {error && <div className="mb-3 bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Received (good) Qty</label>
            <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={receivedQty} onChange={e => setReceivedQty(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Rejected Qty</label>
            <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={rejectedQty} onChange={e => setRejectedQty(e.target.value)} />
          </div>
          {parseFloat(rejectedQty) > 0 && (
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Reason for rejection *</label>
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="What's wrong with this quantity?" />
            </div>
          )}
        </div>
        <button onClick={confirmReceipt} disabled={confirming} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
          {confirming ? 'Saving...' : 'Confirm Receipt'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border">
      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading...</div>
      ) : pendingWos.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">No completed Work Orders waiting for FG Receipt</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>{['WO Number', 'Product', 'Stage', 'Completed Qty', 'Action'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {pendingWos.map(wo => (
              <tr key={wo.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-blue-600">{wo.woNumber}</td>
                <td className="px-4 py-3">{wo.productName}</td>
                <td className="px-4 py-3">{wo.stageName}</td>
                <td className="px-4 py-3">{wo.completedQty}</td>
                <td className="px-4 py-3"><button onClick={() => openWo(wo)} className="text-blue-600 hover:underline text-sm">Receive</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rejected Stock — track material that didn't pass through to disposition
// ---------------------------------------------------------------------------
function RejectedTab() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [dispositionForm, setDispositionForm] = useState({ disposition: 'SCRAPPED', dispositionNotes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/rejected-stock?limit=50`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) { const d = await res.json(); setRecords(d.data || []); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function dispose(recordId, itemId) {
    setSaving(true);
    await fetch(`${API}/rejected-stock/${recordId}/items/${itemId}/dispose`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(dispositionForm),
    });
    setSaving(false);
    setDispositionForm({ disposition: 'SCRAPPED', dispositionNotes: '' });
    load();
  }

  return (
    <div className="bg-white rounded-xl border">
      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">No rejected stock records</div>
      ) : (
        <div className="divide-y">
          {records.map(rec => (
            <div key={rec.id}>
              <button onClick={() => setExpanded(expanded === rec.id ? null : rec.id)} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-red-600">{rec.rejectionNumber}</span>
                  <span className="ml-3 text-sm text-gray-600">
                    {rec.iqc?.iqcNumber ? `From IQC ${rec.iqc.iqcNumber}` : rec.fgReceipt?.receiptNumber ? `From FG Receipt ${rec.fgReceipt.receiptNumber} (${rec.fgReceipt.workOrder?.woNumber})` : ''}
                  </span>
                  <span className="ml-3 text-xs text-gray-400">{rec._count?.items || 0} item(s), {rec.totalRejectedQty} total</span>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${rec.status === 'CLOSED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{rec.status}</span>
              </button>
              {expanded === rec.id && (
                <div className="px-4 pb-4">
                  <table className="w-full text-sm">
                    <thead className="text-gray-400 text-xs uppercase">
                      <tr>{['Item', 'Qty', 'Reason', 'Disposition', 'Action'].map(h => <th key={h} className="text-left px-2 py-2">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y">
                      {(rec.items || []).map(item => (
                        <tr key={item.id}>
                          <td className="px-2 py-2 font-mono">{item.itemCode} — {item.itemName}</td>
                          <td className="px-2 py-2">{item.rejectedQty} {item.uom}</td>
                          <td className="px-2 py-2 text-gray-600">{item.rejectionReason || '—'}</td>
                          <td className="px-2 py-2">
                            {item.disposition === 'PENDING' ? (
                              <span className="text-amber-600 font-medium">Pending</span>
                            ) : (
                              <span className="text-green-600 font-medium">{item.disposition}</span>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            {item.disposition === 'PENDING' && (
                              <div className="flex gap-2 items-center">
                                <select className="border rounded px-2 py-1 text-xs" value={dispositionForm.disposition} onChange={e => setDispositionForm(f => ({ ...f, disposition: e.target.value }))}>
                                  {['RTV', 'SCRAPPED', 'REWORK', 'ACCEPTED'].map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <button onClick={() => dispose(rec.id, item.id)} disabled={saving} className="text-blue-600 hover:underline text-xs disabled:opacity-50">Apply</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
