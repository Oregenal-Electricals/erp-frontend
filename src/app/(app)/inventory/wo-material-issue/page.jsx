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

export default function WoMaterialIssuePage() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedWo, setSelectedWo] = useState(null);
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [draftIssue, setDraftIssue] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [returnForm, setReturnForm] = useState({});
  const [overrideReason, setOverrideReason] = useState('');
  const [activeOverride, setActiveOverride] = useState(null);

  useEffect(() => { api('/warehouses?limit=100').then(d => setWarehouses(listOf(d))).catch(() => {}); }, []);

  function notify(msg) { setToast(msg); setTimeout(() => setToast(''), 4000); }
  function fail(e) { setError(e.message || 'Something went wrong'); setTimeout(() => setError(''), 6000); }

  async function runSearch() {
    if (!search.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const [released, inProgress] = await Promise.all([
        api(`/work-orders?status=RELEASED&search=${encodeURIComponent(search)}&limit=10`),
        api(`/work-orders?status=IN_PROGRESS&search=${encodeURIComponent(search)}&limit=10`),
      ]);
      setResults([...listOf(released), ...listOf(inProgress)]);
    } catch (e) { fail(e); }
    setSearching(false);
  }

  const loadStatus = useCallback(async (wo) => {
    setLoadingStatus(true);
    setDraftIssue(null);
    try {
      setStatus(await api(`/production/material-returns/status/${wo.id}`));
      setActiveOverride(null);
    }
    catch (e) { fail(e); }
    setLoadingStatus(false);
  }, []);

  async function requestOverride() {
    if (!overrideReason.trim()) { fail(new Error('Enter a reason for the override request')); return; }
    setBusy(true);
    try {
      const override = await api('/production/material-issue-overrides', {
        method: 'POST',
        body: JSON.stringify({ workOrderId: selectedWo.id, reason: overrideReason }),
      });
      setActiveOverride(override);
      notify('Override requested - waiting on management approval (5-hour window).');
      setOverrideReason('');
    } catch (e) { fail(e); }
    setBusy(false);
  }

  async function pickWo(wo) {
    setSelectedWo(wo);
    setResults([]);
    setSearch('');
    await loadStatus(wo);
  }

  async function issueMaterial() {
    setBusy(true);
    try {
      const issue = await api(`/production-issues/from-mrp/${selectedWo.id}`, { method: 'POST' });
      setDraftIssue(issue);
      notify('Draft created - review the required material below, then confirm.');
    } catch (e) { fail(e); }
    setBusy(false);
  }

  async function confirmIssue() {
    setBusy(true);
    try {
      await api(`/production-issues/${draftIssue.id}/confirm`, { method: 'POST' });
      notify('Material issued to the department. Stock reduced.');
      setDraftIssue(null);
      await loadStatus(selectedWo);
    } catch (e) { fail(e); }
    setBusy(false);
  }

  async function submitReturn(item) {
    const qty = Number(returnForm[item.itemCode]?.qty);
    const warehouseId = returnForm[item.itemCode]?.warehouseId;
    if (!qty || qty <= 0) { fail(new Error('Enter a qty to return')); return; }
    if (!warehouseId) { fail(new Error('Select a warehouse')); return; }
    setBusy(true);
    try {
      await api('/production/material-returns', {
        method: 'POST',
        body: JSON.stringify({
          workOrderId: selectedWo.id, warehouseId,
          itemCode: item.itemCode, itemName: item.itemName, uom: item.uom,
          qty, reason: returnForm[item.itemCode]?.reason || 'EXCESS_UNUSED',
        }),
      });
      notify(`Returned ${qty} ${item.uom} of ${item.itemCode} to Store`);
      setReturnForm(prev => ({ ...prev, [item.itemCode]: { ...prev[item.itemCode], qty: '' } }));
      await loadStatus(selectedWo);
    } catch (e) { fail(e); }
    setBusy(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Work Order Material Issue</h1>
          <p className="text-gray-500 text-sm mt-1">Select a Work Order, check previous material status, then issue.</p>
        </div>

        {toast && <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">{toast}</div>}
        {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>}

        {!selectedWo && (
          <div className="bg-white rounded-xl border p-4">
            <label className="block text-xs text-gray-500 mb-1">Search Work Order (RELEASED / IN_PROGRESS)</label>
            <div className="flex gap-2">
              <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="WO number or product..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && runSearch()} />
              <button onClick={runSearch} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">{searching ? 'Searching...' : 'Search'}</button>
            </div>
            {results.length > 0 && (
              <div className="mt-3 divide-y border rounded-lg">
                {results.map(w => (
                  <button key={w.id} onClick={() => pickWo(w)} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                    <span className="font-mono text-blue-600 font-bold">{w.woNumber}</span> - {w.productName} <span className="text-xs text-gray-400">({w.status})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedWo && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border p-4 flex items-center justify-between">
              <div>
                <div className="font-mono text-blue-600 font-bold text-sm">{selectedWo.woNumber}</div>
                <div className="text-gray-700">{selectedWo.productName}</div>
              </div>
              <button onClick={() => { setSelectedWo(null); setStatus(null); setDraftIssue(null); }} className="text-sm text-gray-500 hover:text-gray-700">Change Work Order</button>
            </div>

            {loadingStatus && <div className="text-center py-8 text-gray-400">Checking previous material status...</div>}

            {!loadingStatus && status && (
              <div className={`rounded-xl border p-4 ${status.overallStatus === 'CLEAR' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${status.overallStatus === 'CLEAR' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className={`font-bold ${status.overallStatus === 'CLEAR' ? 'text-green-700' : 'text-red-700'}`}>
                    Previous Material Status: {status.overallStatus === 'CLEAR' ? 'CLEAR - new issue allowed' : 'PENDING - normal new issue blocked'}
                  </span>
                </div>
                {status.items.length > 0 && (
                  <table className="w-full text-sm mt-3">
                    <thead className="text-gray-500 text-xs uppercase"><tr>{['Item','Issued','Consumed (est.)','Returned','Outstanding','Status'].map(h=><th key={h} className="px-2 py-1 text-left">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-200">
                      {status.items.map(it => (
                        <tr key={it.itemCode}>
                          <td className="px-2 py-1 text-xs">{it.itemName} <span className="text-gray-400 font-mono">({it.itemCode})</span></td>
                          <td className="px-2 py-1 text-xs">{it.issuedQty}</td>
                          <td className="px-2 py-1 text-xs">{it.standardConsumed}</td>
                          <td className="px-2 py-1 text-xs">{it.returnedQty}</td>
                          <td className="px-2 py-1 text-xs font-bold">{it.outstandingQty} {it.uom}</td>
                          <td className="px-2 py-1 text-xs">{it.status === 'CLEAR' ? <span className="text-green-600">Clear</span> : <span className="text-red-600">Pending</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {!loadingStatus && status?.overallStatus === 'CLEAR' && !draftIssue && (
              <button onClick={issueMaterial} disabled={busy} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {busy ? 'Preparing...' : 'Issue Material (calculate requirement from BOM)'}
              </button>
            )}

            {draftIssue && (
              <div className="bg-white rounded-xl border shadow-sm">
                <div className="p-4 border-b font-semibold text-gray-700">Required Material - {draftIssue.issueNumber}</div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr>{['Item','UOM','Required Qty'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y">
                    {(draftIssue.items || []).map(it => (
                      <tr key={it.id}>
                        <td className="px-3 py-2 text-xs">{it.itemName} <span className="text-gray-400 font-mono">({it.itemCode})</span></td>
                        <td className="px-3 py-2 text-xs text-gray-500">{it.uom}</td>
                        <td className="px-3 py-2 text-xs font-bold">{it.requiredQty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-4">
                  <button onClick={confirmIssue} disabled={busy} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                    {busy ? 'Issuing...' : 'Confirm Issue to Department'}
                  </button>
                </div>
              </div>
            )}

            {!loadingStatus && status?.overallStatus === 'PENDING' && (
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="font-semibold text-gray-700 mb-2">Request Management Override</div>
                <p className="text-xs text-gray-400 mb-3">If the outstanding quantity can't be returned or accounted for right now, request a one-time exception. Management has a 5-hour window to decide.</p>
                {activeOverride ? (
                  <div className="text-xs px-3 py-2 rounded-lg bg-blue-50 text-blue-700">
                    Override requested (status: {activeOverride.status}) - waiting on approval. Deadline: {new Date(activeOverride.deadlineAt).toLocaleString()}
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap items-end">
                    <input className="border rounded px-2 py-1 text-xs flex-1 min-w-[200px]" placeholder="Reason for override..." value={overrideReason} onChange={e => setOverrideReason(e.target.value)} />
                    <button onClick={requestOverride} disabled={busy} className="px-3 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 disabled:opacity-50">Request Override</button>
                  </div>
                )}
              </div>
            )}

            {!loadingStatus && status?.overallStatus === 'PENDING' && (
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="font-semibold text-gray-700 mb-2">Return Outstanding Material to Store</div>
                <p className="text-xs text-gray-400 mb-3">Returning material here clears the outstanding quantity and allows a new issue.</p>
                {status.items.filter(i => i.status === 'PENDING').map(it => (
                  <div key={it.itemCode} className="flex gap-2 items-end flex-wrap mb-3 pb-3 border-b last:border-0">
                    <div className="text-xs text-gray-600 w-40">{it.itemName} ({it.itemCode})<br/><span className="text-red-600 font-bold">{it.outstandingQty} {it.uom} outstanding</span></div>
                    <input type="number" placeholder="Qty" className="border rounded px-2 py-1 text-xs w-24" value={returnForm[it.itemCode]?.qty || ''} onChange={e => setReturnForm(prev => ({ ...prev, [it.itemCode]: { ...prev[it.itemCode], qty: e.target.value } }))} />
                    <select className="border rounded px-2 py-1 text-xs" value={returnForm[it.itemCode]?.warehouseId || ''} onChange={e => setReturnForm(prev => ({ ...prev, [it.itemCode]: { ...prev[it.itemCode], warehouseId: e.target.value } }))}>
                      <option value="">Warehouse...</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                    <select className="border rounded px-2 py-1 text-xs" value={returnForm[it.itemCode]?.reason || 'EXCESS_UNUSED'} onChange={e => setReturnForm(prev => ({ ...prev, [it.itemCode]: { ...prev[it.itemCode], reason: e.target.value } }))}>
                      <option value="EXCESS_UNUSED">Excess Unused</option>
                      <option value="REJECTED_MATERIAL">Rejected Material</option>
                      <option value="OTHER">Other</option>
                    </select>
                    <button onClick={() => submitReturn(it)} disabled={busy} className="px-3 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-800 disabled:opacity-50">Return</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
