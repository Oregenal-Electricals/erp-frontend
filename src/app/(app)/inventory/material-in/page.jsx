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

const TABS = ['Gate Arrivals', 'Receive & Verify', 'IQC Handover', 'Put-Away', 'Discrepancies', 'Rejected', 'Hold'];

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
        {activeTab === 'Receive & Verify' && <ReceiveVerifyTab onSent={() => { notify('Sent to IQC'); setActiveTab('IQC Handover'); }} onSaved={() => notify('Verification saved')} onFlagged={() => notify('Discrepancy raised - see the Discrepancies tab')} onError={fail} />}
        {activeTab === 'IQC Handover' && <IqcHandoverTab onDone={(msg) => notify(msg || 'Handed over to IQC')} onReversed={() => notify('GRN reversed')} onError={fail} />}
        {activeTab === 'Put-Away' && <PutAwayTab onDone={() => notify('Put-away completed - material is now Available Stock')} onError={fail} />}
        {activeTab === 'Discrepancies' && <DiscrepanciesTab warehouses={warehouses} onDone={() => notify('Saved')} onError={fail} />}
        {activeTab === 'Rejected' && <RejectedTab onDone={() => notify('Rejected material placed and dispositioned')} onError={fail} />}
        {activeTab === 'Hold' && <HoldTab onDone={() => notify('Reinspection recorded')} onError={fail} />}
      </div>
    </AppLayout>
  );
}

// ---------- TAB 1: Gate Arrivals ----------
function GateArrivalsTab({ warehouses, onDone, onError }) {
  const [pos, setPos] = useState([]);
  const [poId, setPoId] = useState('');
  useEffect(() => { api('/purchase-orders?limit=200').then(d => setPos(listOf(d))).catch(() => {}); }, []);
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
      setPoId(full.poId || '');
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
        grnType: 'DOMESTIC', gateInwardEntryId: detail.id, warehouseId,
        ...(detail.poId ? {} : { poId }), items,
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
              {!detail.poId && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Purchase Order (this Gate entry has no PO linked - select one to receive against)</label>
                  <select className="border rounded-lg px-3 py-2 text-sm" value={poId} onChange={ev => setPoId(ev.target.value)}>
                    <option value="">Select PO...</option>
                    {pos.map(p => <option key={p.id} value={p.id}>{p.poNumber}</option>)}
                  </select>
                </div>
              )}
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
const PROBLEM_TYPES = ['WRONG_MATERIAL', 'SPECIFICATION_MISMATCH', 'BATCH_MISMATCH', 'UOM_MISMATCH', 'VISIBLE_DAMAGE', 'LABEL_MISMATCH', 'MIXED_MATERIAL', 'DOCUMENT_MISMATCH', 'UNKNOWN'];

function ReceiveVerifyTab({ onSent, onSaved, onFlagged, onError }) {
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qtys, setQtys] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [flagItem, setFlagItem] = useState(null); // { grnItemId, itemName, receivedQty, heldQty }
  const [flagForm, setFlagForm] = useState({ affectedQty: '', problemType: 'WRONG_MATERIAL', damageType: '', reason: '' });
  const [flagSaving, setFlagSaving] = useState(false);

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

  function openFlag(it) {
    setFlagItem(it);
    setFlagForm({ affectedQty: '', problemType: 'WRONG_MATERIAL', damageType: '', reason: '' });
  }

  async function submitFlag() {
    if (!flagForm.affectedQty || Number(flagForm.affectedQty) <= 0) { onError(new Error('Enter an affected quantity')); return; }
    setFlagSaving(true);
    try {
      await api(`/grn-discrepancies/grn-item/${flagItem.id}`, { method: 'POST', body: JSON.stringify({
        affectedQty: Number(flagForm.affectedQty), problemType: flagForm.problemType,
        ...(flagForm.problemType === 'VISIBLE_DAMAGE' && flagForm.damageType ? { damageType: flagForm.damageType } : {}),
        ...(flagForm.reason ? { reason: flagForm.reason } : {}),
      }) });
      setFlagItem(null);
      onFlagged();
      await fetchList();
    } catch (e) { onError(e); }
    setFlagSaving(false);
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
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr>{['Item','UOM','Ordered','Actual Physical Qty','Held',''].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {(g.items || []).map(it => (
                <tr key={it.id}>
                  <td className="px-3 py-2 text-xs">{it.itemName} <span className="text-gray-400 font-mono">({it.itemCode})</span></td>
                  <td className="px-3 py-2 text-xs text-gray-500">{it.uom}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{it.orderedQty}</td>
                  <td className="px-3 py-2"><input type="number" className="border rounded px-2 py-1 text-xs w-24" value={qtys[it.id] ?? ''} onChange={ev => setQtys(prev => ({ ...prev, [it.id]: ev.target.value }))} /></td>
                  <td className="px-3 py-2 text-xs">{it.heldQty > 0 ? <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">{it.heldQty} held</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-2"><button onClick={() => openFlag(it)} className="text-xs text-orange-600 hover:underline">Flag Issue</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2 mt-3">
            <button onClick={() => saveVerification(g)} disabled={savingId===g.id} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50">Save Verified Qty</button>
            <button onClick={() => sendToIqc(g)} disabled={savingId===g.id} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Send to IQC</button>
          </div>
          {g.items?.some(it => it.heldQty > 0) && <p className="text-xs text-gray-400 mt-2">Held quantities are excluded from what goes to IQC - resolve them from the Discrepancies tab.</p>}
        </div>
      ))}

      {flagItem && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <h3 className="font-bold text-gray-900 mb-1">Flag a Discrepancy</h3>
            <p className="text-xs text-gray-500 mb-4">{flagItem.itemName} ({flagItem.itemCode}) — received {flagItem.receivedQty}, already held {flagItem.heldQty || 0}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Problem Type</label>
                <select className="border rounded-lg px-3 py-2 text-sm w-full" value={flagForm.problemType} onChange={ev => setFlagForm(f => ({ ...f, problemType: ev.target.value }))}>
                  {PROBLEM_TYPES.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              {flagForm.problemType === 'VISIBLE_DAMAGE' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Damage Type</label>
                  <select className="border rounded-lg px-3 py-2 text-sm w-full" value={flagForm.damageType} onChange={ev => setFlagForm(f => ({ ...f, damageType: ev.target.value }))}>
                    <option value="">Select...</option>
                    <option value="PACKAGING_DAMAGED">Packaging Damaged</option>
                    <option value="MATERIAL_DAMAGED">Material Damaged</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Affected Quantity</label>
                <input type="number" className="border rounded-lg px-3 py-2 text-sm w-full" value={flagForm.affectedQty} onChange={ev => setFlagForm(f => ({ ...f, affectedQty: ev.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Reason / Notes</label>
                <textarea className="border rounded-lg px-3 py-2 text-sm w-full" rows={2} value={flagForm.reason} onChange={ev => setFlagForm(f => ({ ...f, reason: ev.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setFlagItem(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={submitFlag} disabled={flagSaving} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50">{flagSaving ? 'Saving...' : 'Flag Discrepancy'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- TAB 3: IQC Handover ----------
function IqcHandoverTab({ onDone, onReversed, onError }) {
  const [grns, setGrns] = useState([]);
  const [iqcByGrn, setIqcByGrn] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [reverseId, setReverseId] = useState(null);
  const [reverseReason, setReverseReason] = useState('');
  const [handoverGrn, setHandoverGrn] = useState(null);
  const [confirmIqc, setConfirmIqc] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const list = listOf(await api('/grn?status=IQC_PENDING&limit=50'));
      setGrns(list);
      const byGrn = {};
      await Promise.all(list.map(async g => {
        try { byGrn[g.id] = listOf(await api(`/iqc/grn/${g.id}`)); } catch { byGrn[g.id] = []; }
      }));
      setIqcByGrn(byGrn);
    } catch (e) { onError(e); }
    setLoading(false);
  }, [onError]);
  useEffect(() => { fetchList(); }, [fetchList]);

  function remainingQty(item) {
    return Math.max(item.receivedQty - (item.heldQty || 0) - (item.sentToIqcQty || 0), 0);
  }

  function openHandover(grn) {
    const qtys = {};
    (grn.items || []).forEach(it => { const r = remainingQty(it); if (r > 0) qtys[it.id] = r; });
    setHandoverGrn({ grn, qtys });
  }

  async function submitHandover() {
    const items = Object.entries(handoverGrn.qtys).filter(([, q]) => Number(q) > 0).map(([grnItemId, qty]) => ({ grnItemId, qty: Number(qty) }));
    if (items.length === 0) { onError(new Error('Enter a quantity for at least one item')); return; }
    setSavingId(handoverGrn.grn.id);
    try {
      const r = await api('/iqc', { method: 'POST', body: JSON.stringify({ grnId: handoverGrn.grn.id, items }) });
      setHandoverGrn(null);
      onDone(r.skippedIqc ? 'Material accepted directly - IQC not required' : 'Sent to IQC - awaiting QC receipt confirmation');
      await fetchList();
    } catch (e) { onError(e); }
    setSavingId(null);
  }

  function openConfirm(iqc) {
    const qtys = {};
    (iqc.items || []).forEach(it => { qtys[it.id] = it.receivedQty; });
    setConfirmIqc({ iqc, qtys });
  }

  async function submitConfirm() {
    const items = Object.entries(confirmIqc.qtys).map(([itemId, confirmedQty]) => ({ itemId, confirmedQty: Number(confirmedQty) }));
    setSavingId(confirmIqc.iqc.id);
    try {
      const r = await api(`/iqc/${confirmIqc.iqc.id}/confirm-receipt`, { method: 'POST', body: JSON.stringify({ items }) });
      setConfirmIqc(null);
      onDone(r.handoverMismatches?.length > 0
        ? `Receipt confirmed - ${r.handoverMismatches.length} item(s) short of what Store sent`
        : 'Receipt confirmed - matches what Store sent');
      await fetchList();
    } catch (e) { onError(e); }
    setSavingId(null);
  }

  async function confirmReverse() {
    if (!reverseReason.trim()) { onError(new Error('A reason is required to reverse a GRN')); return; }
    setSavingId(reverseId);
    try {
      await api(`/grn/${reverseId}/reverse`, { method: 'POST', body: JSON.stringify({ reason: reverseReason }) });
      setReverseId(null); setReverseReason('');
      onReversed();
      await fetchList();
    } catch (e) { onError(e); }
    setSavingId(null);
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-3">
      {grns.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">Nothing pending IQC handover.</div>}
      {grns.map(g => {
        const inspections = iqcByGrn[g.id] || [];
        const totalRemaining = (g.items || []).reduce((s, it) => s + remainingQty(it), 0);
        return (
          <div key={g.id} className="bg-white rounded-xl border shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-mono text-blue-600 font-bold text-sm">{g.grnNumber}</span>
                <span className="text-xs text-gray-400 ml-3">{g.warehouse?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {inspections.length === 0 && (
                  <button onClick={() => { setReverseId(g.id); setReverseReason(''); }} className="px-3 py-2 text-red-600 text-xs hover:bg-red-50 rounded-lg">Reverse GRN</button>
                )}
                {totalRemaining > 0 && (
                  <button onClick={() => openHandover(g)} disabled={savingId===g.id} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">
                    {inspections.length > 0 ? 'Send More to IQC' : 'Handover to IQC'}
                  </button>
                )}
              </div>
            </div>
            {inspections.length > 0 && (
              <div className="space-y-1 mt-2">
                {inspections.map(iqc => (
                  <div key={iqc.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                    <a href={`/inventory/iqc/${iqc.id}`} className="text-purple-600 hover:underline font-mono">{iqc.iqcNumber}</a>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${iqc.status==='AWAITING_QC_RECEIPT' ? 'bg-orange-100 text-orange-700' : iqc.status==='APPROVED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{iqc.status.replace(/_/g,' ')}</span>
                    {iqc.status === 'AWAITING_QC_RECEIPT' ? (
                      <button onClick={() => openConfirm(iqc)} className="text-blue-600 hover:underline">Confirm Receipt</button>
                    ) : <span className="text-gray-400">(view in Quality)</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {handoverGrn && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5">
            <h3 className="font-bold text-gray-900 mb-1">Send to IQC</h3>
            <p className="text-xs text-gray-500 mb-4">Adjust quantities to send a partial batch - the remainder stays eligible for a later handover.</p>
            <div className="space-y-2">
              {(handoverGrn.grn.items || []).filter(it => remainingQty(it) > 0).map(it => (
                <div key={it.id} className="flex items-center justify-between gap-3">
                  <div className="text-xs">
                    <div>{it.itemName} <span className="text-gray-400 font-mono">({it.itemCode})</span></div>
                    <div className="text-gray-400">Remaining eligible: {remainingQty(it)}</div>
                  </div>
                  <input type="number" className="border rounded px-2 py-1 text-xs w-24" value={handoverGrn.qtys[it.id] ?? ''} onChange={ev => setHandoverGrn(h => ({ ...h, qtys: { ...h.qtys, [it.id]: ev.target.value } }))} />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setHandoverGrn(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={submitHandover} disabled={savingId===handoverGrn.grn.id} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">{savingId===handoverGrn.grn.id ? 'Sending...' : 'Send to IQC'}</button>
            </div>
          </div>
        </div>
      )}

      {confirmIqc && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5">
            <h3 className="font-bold text-gray-900 mb-1">Confirm Physical Receipt</h3>
            <p className="text-xs text-gray-500 mb-4">Enter what was actually, physically received - a shortfall from what Store sent is flagged as a handover mismatch, not silently accepted.</p>
            <div className="space-y-2">
              {(confirmIqc.iqc.items || []).map(it => (
                <div key={it.id} className="flex items-center justify-between gap-3">
                  <div className="text-xs">
                    <div>{it.itemName} <span className="text-gray-400 font-mono">({it.itemCode})</span></div>
                    <div className="text-gray-400">Store sent: {it.receivedQty}</div>
                  </div>
                  <input type="number" className="border rounded px-2 py-1 text-xs w-24" value={confirmIqc.qtys[it.id] ?? ''} onChange={ev => setConfirmIqc(c => ({ ...c, qtys: { ...c.qtys, [it.id]: ev.target.value } }))} />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmIqc(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={submitConfirm} disabled={savingId===confirmIqc.iqc.id} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{savingId===confirmIqc.iqc.id ? 'Confirming...' : 'Confirm Receipt'}</button>
            </div>
          </div>
        </div>
      )}

      {reverseId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <h3 className="font-bold text-gray-900 mb-1">Reverse GRN</h3>
            <p className="text-xs text-gray-500 mb-4">This can only be undone by a fresh receipt - it does not restore this GRN.</p>
            <label className="block text-xs text-gray-500 mb-1">Reason</label>
            <textarea className="border rounded-lg px-3 py-2 text-sm w-full" rows={3} value={reverseReason} onChange={ev => setReverseReason(ev.target.value)} />
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setReverseId(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={confirmReverse} disabled={savingId===reverseId} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">{savingId===reverseId ? 'Reversing...' : 'Reverse GRN'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- TAB 4: Put-Away ----------
function PutAwayTab({ onDone, onError }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
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
      const emptyBins = await api(`/rack-bin/bins/empty/${iqc.grn.warehouseId}`);
      setBins(listOf(emptyBins) || emptyBins || []);
      const assign = {};
      // STORE-008 section 34: default to remainingPutAwayQty (what's
      // still eligible), not the full acceptedQty - a line can already
      // have some of it put away from an earlier partial batch.
      (iqc.items || []).filter(it => it.remainingPutAwayQty > 0).forEach(it => { assign[it.id] = { binId: '', qty: it.remainingPutAwayQty }; });
      setBinAssign(assign);
    } catch (e) { onError(e); }
  }

  async function confirmPutaway(iqc) {
    const items = Object.entries(binAssign).filter(([, v]) => v.binId && v.qty > 0);
    if (items.length === 0) { onError(new Error('Select a bin and qty for at least one item')); return; }
    setSaving(true);
    try {
      const itemPayload = items.map(([itemId, v]) => {
        const it = (iqc.items || []).find(i => i.id === itemId);
        // iqcItemId is what lets the backend cross-check this qty against
        // remaining acceptedQty and block an over-put-away attempt -
        // without it the check is silently skipped entirely.
        return { binId: v.binId, iqcItemId: it.id, itemCode: it.itemCode, itemName: it.itemName, uom: it.uom, qty: Number(v.qty), unitCost: 0 };
      });
      const putaway = await api('/stock-putaway', { method: 'POST', body: JSON.stringify({
        grnId: iqc.grnId, iqcId: iqc.id, warehouseId: iqc.grn.warehouseId, items: itemPayload,
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
          {expandedId === iqc.id && (
            <div className="border-t p-4 space-y-3">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr>{['Item','Remaining to Place','Bin','Qty to Place'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {(iqc.items || []).filter(it => it.remainingPutAwayQty > 0).map(it => (
                    <tr key={it.id}>
                      <td className="px-3 py-2 text-xs">{it.itemName}</td>
                      <td className="px-3 py-2 text-xs font-bold text-green-600">{it.remainingPutAwayQty}</td>
                      <td className="px-3 py-2">
                        <select className="border rounded px-2 py-1 text-xs" value={binAssign[it.id]?.binId || ''} onChange={ev => setBinAssign(prev => ({ ...prev, [it.id]: { ...prev[it.id], binId: ev.target.value } }))}>
                          <option value="">Select bin...</option>
                          {bins.map(b => <option key={b.id} value={b.id}>{b.code}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2"><input type="number" max={it.remainingPutAwayQty} className="border rounded px-2 py-1 text-xs w-20" value={binAssign[it.id]?.qty ?? ''} onChange={ev => setBinAssign(prev => ({ ...prev, [it.id]: { ...prev[it.id], qty: ev.target.value } }))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-400">Placing less than the remaining qty leaves the rest eligible for a later put-away batch.</p>
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

// ---------- TAB 5: Discrepancies (STORE-003/004/005) ----------
function DiscrepanciesTab({ warehouses, onDone, onError }) {
  const [subTab, setSubTab] = useState('Quantity'); // Quantity (short/excess) vs Material (wrong/damage/mismatch)
  const [shortages, setShortages] = useState([]);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [excessForm, setExcessForm] = useState(null); // { id, qty, reason }
  const [segregate, setSegregate] = useState(null); // { id, binId }
  const [bins, setBins] = useState([]);
  const [resolveDirect, setResolveDirect] = useState(null); // { id, resolution, reason }
  const [requestAuth, setRequestAuth] = useState(null); // { id, resolution, reason }

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([
        api('/store-receiving/shortages?limit=100'),
        api('/grn-discrepancies?limit=100'),
      ]);
      setShortages(listOf(s).filter(r => r.status !== 'RESOLVED' && r.status !== 'APPROVED_SHORT_CLOSURE' && r.status !== 'APPROVED_EXCESS'));
      setDiscrepancies(listOf(d).filter(r => r.status !== 'RESOLVED' && r.status !== 'CANCELLED'));
    } catch (e) { onError(e); }
    setLoading(false);
  }, [onError]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function openSegregate(rec) {
    setSegregate({ id: rec.id, binId: '' });
    try {
      const wid = rec.grn?.warehouseId;
      if (wid) { const b = await api(`/rack-bin/bins/empty/${wid}`); setBins(listOf(b) || b || []); }
    } catch { setBins([]); }
  }

  async function saveExcessApproval() {
    if (!excessForm.qty || Number(excessForm.qty) <= 0) { onError(new Error('Enter a quantity to approve')); return; }
    setBusyId(excessForm.id);
    try {
      await api(`/store-receiving/shortages/${excessForm.id}/approve-excess`, { method: 'POST', body: JSON.stringify({ qty: Number(excessForm.qty), reason: excessForm.reason || 'Approved' }) });
      setExcessForm(null); onDone(); await fetchAll();
    } catch (e) { onError(e); }
    setBusyId(null);
  }

  async function purchaseReview(id, purchaseStatus) {
    setBusyId(id);
    try { await api(`/grn-discrepancies/${id}/purchase-review`, { method: 'POST', body: JSON.stringify({ purchaseStatus }) }); onDone(); await fetchAll(); }
    catch (e) { onError(e); }
    setBusyId(null);
  }

  async function qcReview(id, qcStatus) {
    setBusyId(id);
    try { await api(`/grn-discrepancies/${id}/qc-review`, { method: 'POST', body: JSON.stringify({ qcStatus }) }); onDone(); await fetchAll(); }
    catch (e) { onError(e); }
    setBusyId(null);
  }

  async function saveSegregate() {
    if (!segregate.binId) { onError(new Error('Select a bin')); return; }
    setBusyId(segregate.id);
    try {
      await api(`/grn-discrepancies/${segregate.id}/segregate`, { method: 'POST', body: JSON.stringify({ binId: segregate.binId }) });
      setSegregate(null); onDone(); await fetchAll();
    } catch (e) { onError(e); }
    setBusyId(null);
  }

  async function saveResolveDirect() {
    if (!resolveDirect.reason?.trim()) { onError(new Error('A reason is required')); return; }
    setBusyId(resolveDirect.id);
    try {
      await api(`/grn-discrepancies/${resolveDirect.id}/resolve-direct`, { method: 'POST', body: JSON.stringify({ resolution: resolveDirect.resolution, reason: resolveDirect.reason }) });
      setResolveDirect(null); onDone(); await fetchAll();
    } catch (e) { onError(e); }
    setBusyId(null);
  }

  async function saveRequestAuth() {
    if (!requestAuth.reason?.trim()) { onError(new Error('A reason is required')); return; }
    setBusyId(requestAuth.id);
    try {
      await api(`/grn-discrepancies/${requestAuth.id}/request-resolution`, { method: 'POST', body: JSON.stringify({ resolution: requestAuth.resolution, reason: requestAuth.reason }) });
      setRequestAuth(null); onDone(); await fetchAll();
    } catch (e) { onError(e); }
    setBusyId(null);
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['Quantity', 'Material'].map(t => (
          <button key={t} onClick={() => setSubTab(t)} className={`px-3 py-1.5 text-xs font-medium rounded-full ${subTab===t ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {t === 'Quantity' ? 'Short / Excess' : 'Wrong / Damaged / Mismatch'}
          </button>
        ))}
      </div>

      {subTab === 'Quantity' && (
        <div className="space-y-3">
          {shortages.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">No open short/excess quantity issues.</div>}
          {shortages.map(s => (
            <div key={s.id} className="bg-white rounded-xl border shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-sm font-bold">{s.discrepancyNumber}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${s.discrepancyType === 'EXCESS' ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'}`}>{s.discrepancyType}</span>
                  <span className="text-xs text-gray-400 ml-3">{s.grnItem?.grn?.grnNumber || s.storeReceivingItem?.storeReceiving?.receivingNumber}</span>
                </div>
                <span className="text-xs text-gray-500">{s.status}</span>
              </div>
              <p className="text-sm text-gray-700 mt-1">{s.itemName} <span className="text-gray-400 font-mono text-xs">({s.itemCode})</span> — expected {s.expectedQty}, received {s.actualQty}</p>
              {s.discrepancyType === 'EXCESS' ? (
                <p className="text-xs text-gray-500 mt-1">Excess {s.excessQty} · approved so far {s.approvedExcessQty} · outstanding {s.outstandingExcessQty}</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">Short {s.shortQty} · outstanding {s.outstandingQty}</p>
              )}
              {s.discrepancyType === 'EXCESS' && s.outstandingExcessQty > 0 && (
                <button onClick={() => setExcessForm({ id: s.id, qty: '', reason: '' })} className="mt-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs hover:bg-purple-700">Approve Excess</button>
              )}
            </div>
          ))}
        </div>
      )}

      {subTab === 'Material' && (
        <div className="space-y-3">
          {discrepancies.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">No open material discrepancies.</div>}
          {discrepancies.map(d => (
            <div key={d.id} className="bg-white rounded-xl border shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-sm font-bold">{d.discrepancyNumber}</span>
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">{d.problemType?.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-gray-400 ml-3">{d.grn?.grnNumber}</span>
                </div>
                <span className="text-xs text-gray-500">{d.status}</span>
              </div>
              <p className="text-sm text-gray-700 mt-1">{d.itemName} <span className="text-gray-400 font-mono text-xs">({d.itemCode})</span> — affected {d.affectedQty}</p>
              {d.reason && <p className="text-xs text-gray-500 mt-1">{d.reason}</p>}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                <span>Purchase: <b>{d.purchaseStatus}</b></span>
                <span>QC: <b>{d.qcStatus}</b></span>
                {d.holdBinId ? <span className="text-green-600">Segregated to a hold bin</span> : d.status !== 'RESOLVED' && <button onClick={() => openSegregate(d)} className="text-blue-600 hover:underline">Segregate to bin</button>}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {d.purchaseStatus === 'NOTIFIED' && (
                  <>
                    <button disabled={busyId===d.id} onClick={() => purchaseReview(d.id, 'COMMERCIALLY_ACCEPTED')} className="px-3 py-1 bg-gray-100 rounded-lg text-xs hover:bg-gray-200">Purchase: Accept</button>
                    <button disabled={busyId===d.id} onClick={() => purchaseReview(d.id, 'RETURN_REQUIRED')} className="px-3 py-1 bg-gray-100 rounded-lg text-xs hover:bg-gray-200">Purchase: Return</button>
                    <button disabled={busyId===d.id} onClick={() => purchaseReview(d.id, 'REPLACEMENT_REQUIRED')} className="px-3 py-1 bg-gray-100 rounded-lg text-xs hover:bg-gray-200">Purchase: Replace</button>
                  </>
                )}
                {d.qcStatus === 'PENDING' && (
                  <>
                    <button disabled={busyId===d.id} onClick={() => qcReview(d.id, 'ACCEPTED')} className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-xs hover:bg-green-100">QC: Accept</button>
                    <button disabled={busyId===d.id} onClick={() => qcReview(d.id, 'REJECTED')} className="px-3 py-1 bg-red-50 text-red-700 rounded-lg text-xs hover:bg-red-100">QC: Reject</button>
                  </>
                )}
                {!d.resolutionApprovalRequestId && d.status !== 'RESOLVED' && (
                  <>
                    <button disabled={busyId===d.id} onClick={() => setRequestAuth({ id: d.id, resolution: 'ACCEPT_AUTHORIZED', reason: '' })} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs hover:bg-blue-100">Request Authorized Accept</button>
                    <button disabled={busyId===d.id} onClick={() => setResolveDirect({ id: d.id, resolution: 'RETURN_TO_VENDOR', reason: '' })} className="px-3 py-1 bg-gray-100 rounded-lg text-xs hover:bg-gray-200">Resolve (Return/Replace/Hold/Other)</button>
                  </>
                )}
                {d.resolutionApprovalRequestId && <span className="text-xs text-blue-600">Resolution requested - awaiting approval</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {excessForm && (
        <Modal title="Approve Excess" onClose={() => setExcessForm(null)}>
          <label className="block text-xs text-gray-500 mb-1">Quantity to approve</label>
          <input type="number" className="border rounded-lg px-3 py-2 text-sm w-full mb-3" value={excessForm.qty} onChange={ev => setExcessForm(f => ({ ...f, qty: ev.target.value }))} />
          <label className="block text-xs text-gray-500 mb-1">Reason</label>
          <textarea className="border rounded-lg px-3 py-2 text-sm w-full" rows={2} value={excessForm.reason} onChange={ev => setExcessForm(f => ({ ...f, reason: ev.target.value }))} />
          <ModalActions onCancel={() => setExcessForm(null)} onSave={saveExcessApproval} saving={busyId===excessForm.id} label="Approve" color="purple" />
        </Modal>
      )}

      {segregate && (
        <Modal title="Segregate to Hold Bin" onClose={() => setSegregate(null)}>
          <label className="block text-xs text-gray-500 mb-1">Bin</label>
          <select className="border rounded-lg px-3 py-2 text-sm w-full" value={segregate.binId} onChange={ev => setSegregate(s => ({ ...s, binId: ev.target.value }))}>
            <option value="">Select an empty bin...</option>
            {bins.map(b => <option key={b.id} value={b.id}>{b.code}</option>)}
          </select>
          <ModalActions onCancel={() => setSegregate(null)} onSave={saveSegregate} saving={busyId===segregate.id} label="Segregate" color="blue" />
        </Modal>
      )}

      {resolveDirect && (
        <Modal title="Resolve Discrepancy" onClose={() => setResolveDirect(null)}>
          <label className="block text-xs text-gray-500 mb-1">Resolution</label>
          <select className="border rounded-lg px-3 py-2 text-sm w-full mb-3" value={resolveDirect.resolution} onChange={ev => setResolveDirect(r => ({ ...r, resolution: ev.target.value }))}>
            <option value="RETURN_TO_VENDOR">Return to Vendor</option>
            <option value="REPLACE">Replace</option>
            <option value="HOLD_INVESTIGATION">Hold for Investigation</option>
            <option value="OTHER">Other</option>
          </select>
          <label className="block text-xs text-gray-500 mb-1">Reason</label>
          <textarea className="border rounded-lg px-3 py-2 text-sm w-full" rows={2} value={resolveDirect.reason} onChange={ev => setResolveDirect(r => ({ ...r, reason: ev.target.value }))} />
          <ModalActions onCancel={() => setResolveDirect(null)} onSave={saveResolveDirect} saving={busyId===resolveDirect.id} label="Resolve" color="gray" />
        </Modal>
      )}

      {requestAuth && (
        <Modal title="Request Authorized Resolution" onClose={() => setRequestAuth(null)}>
          <p className="text-xs text-gray-500 mb-3">This sends the material for management approval before it can become usable stock.</p>
          <label className="block text-xs text-gray-500 mb-1">Resolution</label>
          <select className="border rounded-lg px-3 py-2 text-sm w-full mb-3" value={requestAuth.resolution} onChange={ev => setRequestAuth(r => ({ ...r, resolution: ev.target.value }))}>
            <option value="ACCEPT_AUTHORIZED">Accept (Authorized)</option>
            <option value="RECLASSIFY">Reclassify</option>
          </select>
          <label className="block text-xs text-gray-500 mb-1">Reason</label>
          <textarea className="border rounded-lg px-3 py-2 text-sm w-full" rows={2} value={requestAuth.reason} onChange={ev => setRequestAuth(r => ({ ...r, reason: ev.target.value }))} />
          <ModalActions onCancel={() => setRequestAuth(null)} onSave={saveRequestAuth} saving={busyId===requestAuth.id} label="Send for Approval" color="blue" />
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
        <h3 className="font-bold text-gray-900 mb-3">{title}</h3>
        {children}
      </div>
    </div>
  );
}
function ModalActions({ onCancel, onSave, saving, label, color }) {
  const colors = { purple: 'bg-purple-600 hover:bg-purple-700', blue: 'bg-blue-600 hover:bg-blue-700', gray: 'bg-gray-700 hover:bg-gray-800' };
  return (
    <div className="flex justify-end gap-2 mt-5">
      <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
      <button onClick={onSave} disabled={saving} className={`px-4 py-2 text-white rounded-lg text-sm disabled:opacity-50 ${colors[color]}`}>{saving ? 'Saving...' : label}</button>
    </div>
  );
}

// ---------- TAB 6: Rejected ----------
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

// ---------- TAB 7: Hold (STORE-008) ----------
function HoldTab({ onDone, onError }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reinspect, setReinspect] = useState({});
  const [savingId, setSavingId] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const list = listOf(await api('/hold-stock?limit=50'));
      setRecords(list.filter(r => r.status !== 'CLOSED'));
    } catch (e) { onError(e); }
    setLoading(false);
  }, [onError]);
  useEffect(() => { fetchList(); }, [fetchList]);

  function startReinspect(item) {
    setReinspect(prev => ({ ...prev, [item.id]: { passQty: item.holdQty, failQty: 0, notes: '' } }));
  }

  async function submitReinspect(rec, item) {
    const r = reinspect[item.id];
    if (!r) return;
    const total = Number(r.passQty) + Number(r.failQty);
    if (total <= 0) { onError(new Error('Enter a pass or fail quantity')); return; }
    if (total > item.holdQty) { onError(new Error(`Reinspected qty (${total}) cannot exceed held qty (${item.holdQty})`)); return; }
    setSavingId(item.id);
    try {
      await api(`/hold-stock/${rec.id}/items/${item.id}/reinspect`, {
        method: 'POST',
        body: JSON.stringify({ passQty: Number(r.passQty), failQty: Number(r.failQty), notes: r.notes || undefined }),
      });
      setReinspect(prev => { const n = { ...prev }; delete n[item.id]; return n; });
      onDone();
      await fetchList();
    } catch (e) { onError(e); }
    setSavingId(null);
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-3">
      {records.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">No hold stock pending reinspection.</div>}
      {records.map(rec => (
        <div key={rec.id} className="bg-white rounded-xl border shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-orange-600 font-bold text-sm">{rec.holdNumber}</span>
            <span className="text-xs text-gray-400">{rec.warehouse?.name}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr>{['Item', 'Hold Qty', 'Reason', 'Reinspection', ''].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {(rec.items || []).map(it => (
                <tr key={it.id}>
                  <td className="px-3 py-2 text-xs">{it.itemName}</td>
                  <td className="px-3 py-2 text-xs font-bold text-orange-600">{it.holdQty}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{it.holdReason || '-'}</td>
                  <td className="px-3 py-2">
                    {it.reinspectionStatus === 'PENDING' ? (
                      reinspect[it.id] ? (
                        <div className="flex items-center gap-2">
                          <div>
                            <label className="block text-[10px] text-gray-400">Pass</label>
                            <input type="number" className="border rounded px-2 py-1 text-xs w-16" value={reinspect[it.id].passQty} onChange={ev => setReinspect(prev => ({ ...prev, [it.id]: { ...prev[it.id], passQty: ev.target.value } }))} />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-400">Fail</label>
                            <input type="number" className="border rounded px-2 py-1 text-xs w-16" value={reinspect[it.id].failQty} onChange={ev => setReinspect(prev => ({ ...prev, [it.id]: { ...prev[it.id], failQty: ev.target.value } }))} />
                          </div>
                        </div>
                      ) : (
                        <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs">Pending decision</span>
                      )
                    ) : (
                      <span className="text-xs text-gray-500">{it.reinspectionStatus} (P{it.reinspectedPassQty}/F{it.reinspectedFailQty})</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {it.reinspectionStatus === 'PENDING' && (
                      reinspect[it.id] ? (
                        <button onClick={() => submitReinspect(rec, it)} disabled={savingId===it.id} className="px-3 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 disabled:opacity-50">
                          {savingId===it.id ? 'Saving...' : 'Submit'}
                        </button>
                      ) : (
                        <button onClick={() => startReinspect(it)} className="px-3 py-1 border text-orange-600 rounded text-xs hover:bg-orange-50">Reinspect</button>
                      )
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
