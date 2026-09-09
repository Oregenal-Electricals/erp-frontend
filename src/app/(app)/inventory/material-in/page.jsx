'use client';
import { useState, useEffect, useCallback } from 'react';
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
const listOf = d => Array.isArray(d) ? d : (d?.data || []);
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const TABS = ['Gate Arrivals', 'Receive & Verify', 'IQC Handover', 'Put-Away', 'Rejected'];

export default function MaterialInPage() {
  const [activeTab, setActiveTab] = useState('Gate Arrivals');
  const [warehouses, setWarehouses] = useState([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => { api('/warehouses?limit=100').then(d => setWarehouses(listOf(d))).catch(() => {}); }, []);

  function notify(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }
  function fail(e) { setError(e.message || 'Something went wrong'); setTimeout(() => setError(''), 5000); }

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Material In</h1>
          <p className="text-gray-500 text-sm mt-1">Gate → Receive → Verify → IQC → Put-Away / Rejected — one screen, follow the chain.</p>
        </div>

        {toast && <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">{toast}</div>}
        {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>}

        <div className="flex gap-2 mb-6 border-b overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${activeTab===t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {activeTab === 'Gate Arrivals' && <GateArrivalsTab warehouses={warehouses} onDone={() => { notify('Material received - now verify quantities in the next tab'); setActiveTab('Receive & Verify'); }} onError={fail} />}
        {activeTab === 'Receive & Verify' && <ReceiveVerifyTab onSent={() => { notify('Sent to IQC'); setActiveTab('IQC Handover'); }} onSaved={() => notify('Verification saved')} onError={fail} />}
        {activeTab === 'IQC Handover' && <IqcHandoverTab onDone={() => notify('Handed over to IQC')} onError={fail} />}
        {activeTab === 'Put-Away' && <PutAwayTab onDone={() => notify('Put-away completed - material is now Available Stock')} onError={fail} />}
        {activeTab === 'Rejected' && <RejectedTab onDone={() => notify('Rejected material placed and dispositioned')} onError={fail} />}
      </div>
    </AppLayout>
  );
}

// ---------- TAB 1: Gate Arrivals ----------
function GateArrivalsTab({ warehouses, onDone, onError }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [warehouseId, setWarehouseId] = useState('');
  const [itemQtys, setItemQtys] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try { setEntries(listOf(await api('/gate-inward?status=SENT_TO_STORES&limit=50'))); }
    catch (e) { onError(e); }
    setLoading(false);
  }, [onError]);
  useEffect(() => { fetchList(); }, [fetchList]);

  async function expand(entry) {
    if (expandedId === entry.id) { setExpandedId(null); setDetail(null); return; }
    setExpandedId(entry.id);
    try {
      const full = await api(`/gate-inward/${entry.id}`);
      setDetail(full);
      const qtys = {};
      (full.items || []).forEach(it => { qtys[it.id] = it.quantity; });
      setItemQtys(qtys);
      setWarehouseId(warehouses[0]?.id || '');
    } catch (e) { onError(e); }
  }

  async function receive() {
    if (!warehouseId) { onError(new Error('Select a warehouse')); return; }
    setSaving(true);
    try {
      const items = (detail.items || []).map(it => ({
        itemCode: it.itemCode, itemName: it.itemName, uom: it.uom,
        orderedQty: it.quantity, previouslyReceived: 0,
        receivedQty: Number(itemQtys[it.id] ?? it.quantity), unitPrice: 0,
      }));
      await api('/grn', { method: 'POST', body: JSON.stringify({
        grnType: 'DOMESTIC', gateInwardEntryId: detail.id, warehouseId, items,
      }) });
      setExpandedId(null); setDetail(null);
      await fetchList();
      onDone();
    } catch (e) { onError(e); }
    setSaving(false);
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-3">
      {entries.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">Nothing waiting from Gate.</div>}
      {entries.map(e => (
        <div key={e.id} className="bg-white rounded-xl border shadow-sm">
          <button onClick={() => expand(e)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left">
            <div>
              <span className="font-mono text-blue-600 font-bold text-sm">{e.ginNumber}</span>
              <span className="text-xs text-gray-500 ml-3">{e.supplierName}</span>
              {e.poNumber && <span className="text-xs text-gray-400 ml-3">PO: {e.poNumber}</span>}
            </div>
            <span className="text-xs text-gray-400">{expandedId === e.id ? 'Collapse' : 'Receive'}</span>
          </button>
          {expandedId === e.id && detail && (
            <div className="border-t p-4 space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Warehouse</label>
                <select className="border rounded-lg px-3 py-2 text-sm" value={warehouseId} onChange={ev => setWarehouseId(ev.target.value)}>
                  <option value="">Select...</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr>{['Item','UOM','Declared Qty','Receiving Qty'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {(detail.items || []).map(it => (
                    <tr key={it.id}>
                      <td className="px-3 py-2 text-xs">{it.itemName} <span className="text-gray-400 font-mono">({it.itemCode})</span></td>
                      <td className="px-3 py-2 text-xs text-gray-500">{it.uom}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{it.quantity}</td>
                      <td className="px-3 py-2"><input type="number" className="border rounded px-2 py-1 text-xs w-24" value={itemQtys[it.id] ?? ''} onChange={ev => setItemQtys(prev => ({ ...prev, [it.id]: ev.target.value }))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={receive} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Receiving...' : 'Receive Material'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------- TAB 2: Receive & Verify ----------
function ReceiveVerifyTab({ onSent, onSaved, onError }) {
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qtys, setQtys] = useState({});
  const [savingId, setSavingId] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api('/grn?status=DRAFT&limit=50');
      const list = listOf(d);
      setGrns(list);
      const q = {};
      list.forEach(g => (g.items || []).forEach(it => { q[it.id] = it.receivedQty; }));
      setQtys(q);
    } catch (e) { onError(e); }
    setLoading(false);
  }, [onError]);
  useEffect(() => { fetchList(); }, [fetchList]);

  async function saveVerification(grn) {
    setSavingId(grn.id);
    try {
      const items = (grn.items || []).map(it => ({ id: it.id, receivedQty: Number(qtys[it.id]) }));
      await api(`/grn/${grn.id}`, { method: 'PUT', body: JSON.stringify({ items }) });
      onSaved();
      await fetchList();
    } catch (e) { onError(e); }
    setSavingId(null);
  }

  async function sendToIqc(grn) {
    setSavingId(grn.id);
    try {
      await api(`/grn/${grn.id}/submit`, { method: 'POST' });
      onSent();
      await fetchList();
    } catch (e) { onError(e); }
    setSavingId(null);
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-3">
      {grns.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">Nothing pending verification.</div>}
      {grns.map(g => (
        <div key={g.id} className="bg-white rounded-xl border shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-blue-600 font-bold text-sm">{g.grnNumber}</span>
            <span className="text-xs text-gray-400">{g.warehouse?.name}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr>{['Item','UOM','Ordered','Actual Physical Qty'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {(g.items || []).map(it => (
                <tr key={it.id}>
                  <td className="px-3 py-2 text-xs">{it.itemName} <span className="text-gray-400 font-mono">({it.itemCode})</span></td>
                  <td className="px-3 py-2 text-xs text-gray-500">{it.uom}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{it.orderedQty}</td>
                  <td className="px-3 py-2"><input type="number" className="border rounded px-2 py-1 text-xs w-24" value={qtys[it.id] ?? ''} onChange={ev => setQtys(prev => ({ ...prev, [it.id]: ev.target.value }))} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2 mt-3">
            <button onClick={() => saveVerification(g)} disabled={savingId===g.id} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50">Save Verified Qty</button>
            <button onClick={() => sendToIqc(g)} disabled={savingId===g.id} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Send to IQC</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- TAB 3: IQC Handover ----------
function IqcHandoverTab({ onDone, onError }) {
  const [grns, setGrns] = useState([]);
  const [iqcStatus, setIqcStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const list = listOf(await api('/grn?status=IQC_PENDING&limit=50'));
      setGrns(list);
      const statuses = {};
      await Promise.all(list.map(async g => {
        try { statuses[g.id] = await api(`/iqc/grn/${g.id}`); } catch { statuses[g.id] = null; }
      }));
      setIqcStatus(statuses);
    } catch (e) { onError(e); }
    setLoading(false);
  }, [onError]);
  useEffect(() => { fetchList(); }, [fetchList]);

  async function handover(grn) {
    setSavingId(grn.id);
    try {
      await api('/iqc', { method: 'POST', body: JSON.stringify({ grnId: grn.id }) });
      onDone();
      await fetchList();
    } catch (e) { onError(e); }
    setSavingId(null);
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-3">
      {grns.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">Nothing pending IQC handover.</div>}
      {grns.map(g => {
        const iqc = iqcStatus[g.id];
        return (
          <div key={g.id} className="bg-white rounded-xl border shadow-sm p-4 flex items-center justify-between">
            <div>
              <span className="font-mono text-blue-600 font-bold text-sm">{g.grnNumber}</span>
              <span className="text-xs text-gray-400 ml-3">{g.warehouse?.name}</span>
            </div>
            {iqc ? (
              <a href={`/inventory/iqc/${iqc.id}`} className="text-sm text-purple-600 hover:underline">
                In IQC — {iqc.status} (view in Quality)
              </a>
            ) : (
              <button onClick={() => handover(g)} disabled={savingId===g.id} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">
                Handover to IQC
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------- TAB 4: Put-Away ----------
function PutAwayTab({ onDone, onError }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [iqcDetail, setIqcDetail] = useState(null);
  const [bins, setBins] = useState([]);
  const [binAssign, setBinAssign] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try { setPending(await api('/stock-putaway/pending-iqcs')); }
    catch (e) { onError(e); }
    setLoading(false);
  }, [onError]);
  useEffect(() => { fetchList(); }, [fetchList]);

  async function expand(iqc) {
    if (expandedId === iqc.id) { setExpandedId(null); return; }
    setExpandedId(iqc.id);
    try {
      const full = await api(`/iqc/${iqc.id}`);
      setIqcDetail(full);
      const emptyBins = await api(`/rack-bin/bins/empty/${iqc.grn.warehouseId}`);
      setBins(listOf(emptyBins) || emptyBins || []);
      const assign = {};
      (full.items || []).filter(it => it.acceptedQty > 0).forEach(it => { assign[it.id] = { binId: '', qty: it.acceptedQty }; });
      setBinAssign(assign);
    } catch (e) { onError(e); }
  }

  async function confirmPutaway(iqc) {
    const items = Object.entries(binAssign).filter(([, v]) => v.binId && v.qty > 0);
    if (items.length === 0) { onError(new Error('Select a bin and qty for at least one item')); return; }
    setSaving(true);
    try {
      const itemPayload = items.map(([itemId, v]) => {
        const it = (iqcDetail.items || []).find(i => i.id === itemId);
        return { binId: v.binId, itemCode: it.itemCode, itemName: it.itemName, uom: it.uom, qty: Number(v.qty), unitCost: 0 };
      });
      const putaway = await api('/stock-putaway', { method: 'POST', body: JSON.stringify({
        grnId: iqc.grn.grnNumber ? iqc.grnId : iqc.grnId, iqcId: iqc.id, warehouseId: iqc.grn.warehouseId, items: itemPayload,
      }) });
      await api(`/stock-putaway/${putaway.id}/complete`, { method: 'POST' });
      setExpandedId(null);
      await fetchList();
      onDone();
    } catch (e) { onError(e); }
    setSaving(false);
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-3">
      {pending.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">Nothing waiting for put-away.</div>}
      {pending.map(iqc => (
        <div key={iqc.id} className="bg-white rounded-xl border shadow-sm">
          <button onClick={() => expand(iqc)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left">
            <div>
              <span className="font-mono text-green-600 font-bold text-sm">{iqc.iqcNumber}</span>
              <span className="text-xs text-gray-500 ml-3">{iqc.grn?.grnNumber}</span>
              <span className="text-xs text-gray-400 ml-3">{iqc.grn?.warehouse?.name}</span>
            </div>
            <span className="text-xs text-gray-400">{expandedId === iqc.id ? 'Collapse' : 'Put-Away'}</span>
          </button>
          {expandedId === iqc.id && iqcDetail && (
            <div className="border-t p-4 space-y-3">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr>{['Item','Passed Qty','Bin','Qty to Place'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {(iqcDetail.items || []).filter(it => it.acceptedQty > 0).map(it => (
                    <tr key={it.id}>
                      <td className="px-3 py-2 text-xs">{it.itemName}</td>
                      <td className="px-3 py-2 text-xs font-bold text-green-600">{it.acceptedQty}</td>
                      <td className="px-3 py-2">
                        <select className="border rounded px-2 py-1 text-xs" value={binAssign[it.id]?.binId || ''} onChange={ev => setBinAssign(prev => ({ ...prev, [it.id]: { ...prev[it.id], binId: ev.target.value } }))}>
                          <option value="">Select bin...</option>
                          {bins.map(b => <option key={b.id} value={b.id}>{b.code}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2"><input type="number" className="border rounded px-2 py-1 text-xs w-20" value={binAssign[it.id]?.qty ?? ''} onChange={ev => setBinAssign(prev => ({ ...prev, [it.id]: { ...prev[it.id], qty: ev.target.value } }))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={() => confirmPutaway(iqc)} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                {saving ? 'Confirming...' : 'Confirm Put-Away'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------- TAB 5: Rejected ----------
function RejectedTab({ onDone, onError }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [disposition, setDisposition] = useState({});
  const [savingId, setSavingId] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const list = listOf(await api('/rejected-stock?limit=50'));
      setRecords(list.filter(r => r.status !== 'CLOSED'));
    } catch (e) { onError(e); }
    setLoading(false);
  }, [onError]);
  useEffect(() => { fetchList(); }, [fetchList]);

  async function saveDisposition(rec, itemId) {
    const value = disposition[itemId];
    if (!value) { onError(new Error('Select a disposition')); return; }
    setSavingId(itemId);
    try {
      await api(`/rejected-stock/${rec.id}/items/${itemId}/dispose`, { method: 'PUT', body: JSON.stringify({ disposition: value }) });
      onDone();
      await fetchList();
    } catch (e) { onError(e); }
    setSavingId(null);
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-3">
      {records.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">No rejected stock pending disposition.</div>}
      {records.map(rec => (
        <div key={rec.id} className="bg-white rounded-xl border shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-red-600 font-bold text-sm">{rec.rejectionNumber}</span>
            <span className="text-xs text-gray-400">{rec.warehouse?.name}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr>{['Item','Rejected Qty','Disposition','Status',''].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {(rec.items || []).map(it => (
                <tr key={it.id}>
                  <td className="px-3 py-2 text-xs">{it.itemName}</td>
                  <td className="px-3 py-2 text-xs font-bold text-red-600">{it.rejectedQty}</td>
                  <td className="px-3 py-2">
                    {it.disposition === 'PENDING' ? (
                      <select className="border rounded px-2 py-1 text-xs" value={disposition[it.id] || ''} onChange={ev => setDisposition(prev => ({ ...prev, [it.id]: ev.target.value }))}>
                        <option value="">Select...</option>
                        <option value="RTV">Return to Vendor</option>
                        <option value="SCRAPPED">Scrapped</option>
                        <option value="REWORK">Rework</option>
                        <option value="ACCEPTED">Accepted (override)</option>
                      </select>
                    ) : <span className="text-xs text-gray-500">{it.disposition}</span>}
                  </td>
                  <td className="px-3 py-2 text-xs">{it.disposition === 'PENDING' ? <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs">Pending</span> : <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs">Dispositioned</span>}</td>
                  <td className="px-3 py-2">
                    {it.disposition === 'PENDING' && (
                      <button onClick={() => saveDisposition(rec, it.id)} disabled={savingId===it.id} className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50">Save</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
