'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

export default function ProductionPlanningPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [planWarehouseId, setPlanWarehouseId] = useState('');
  const [planView, setPlanView] = useState('bySo'); // 'bySo' | 'byFamily'
  const [planningBoard, setPlanningBoard] = useState(null);
  const [familyBoard, setFamilyBoard] = useState(null);
  const [orderRanking, setOrderRanking] = useState([]);
  const [buildQtys, setBuildQtys] = useState({});
  const [allocResult, setAllocResult] = useState(null);
  const [allocRunning, setAllocRunning] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) return;
    fetch(`${API}/warehouses?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : { data: [] })
      .then(d => setWarehouses(d.data || d || []));
  }, []);

  async function loadPlanningBoard(warehouseId) {
    if (!warehouseId) { setPlanningBoard(null); setFamilyBoard(null); return; }
    setLoading(true); setAllocResult(null);
    const [boardRes, familyRes] = await Promise.all([
      fetch(`${API}/mrp/planning-board?warehouseId=${warehouseId}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/mrp/planning-board-by-family?warehouseId=${warehouseId}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (boardRes.ok) {
      const board = await boardRes.json();
      setPlanningBoard(board);
      setOrderRanking(board.map(so => so.soId));
    }
    if (familyRes.ok) setFamilyBoard(await familyRes.json());
    setBuildQtys({});
    setLoading(false);
  }

  function moveOrder(soId, direction) {
    setOrderRanking(prev => {
      const idx = prev.indexOf(soId);
      const next = [...prev];
      const swapWith = direction === 'up' ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= next.length) return prev;
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next;
    });
  }

  const rankedBoard = planningBoard
    ? orderRanking.map(id => planningBoard.find(so => so.soId === id)).filter(Boolean)
    : [];

  async function handleRunAllocation() {
    // Submit in the exact priority order currently on screen - that's what
    // actually determines who gets scarce material first (see MrpService.
    // runAllocation's own doc comment).
    const orderedIds = planView === 'byFamily'
      ? [
          ...(familyBoard?.families || []).flatMap(f => f.members.map(m => m.soItemId)),
          ...((familyBoard?.ungrouped || []).map(i => i.soItemId)),
        ]
      : rankedBoard.flatMap(so => so.items.map(i => i.soItemId));

    const allocations = orderedIds
      .filter(id => buildQtys[id] && parseFloat(buildQtys[id]) > 0)
      .map(id => ({ soItemId: id, buildQty: parseFloat(buildQtys[id]) }));
    if (allocations.length === 0) { alert('Enter a build quantity for at least one item'); return; }
    setAllocRunning(true); setAllocResult(null);
    const res = await fetch(`${API}/mrp/run-allocation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ warehouseId: planWarehouseId, allocations }),
    });
    const data = await res.json();
    if (res.ok) {
      setAllocResult(data);
      if (data.feasible) { setBuildQtys({}); loadPlanningBoard(planWarehouseId); }
    } else {
      alert(data.message || 'Failed to run allocation');
    }
    setAllocRunning(false);
  }

  // Shared row markup for the By Product Family view - family members and
  // ungrouped items render identically (both are flat, so/customer info
  // has to show inline here, unlike the By Sales Order view where it's
  // shown once per SO group instead).
  function renderFamilyItemRow(m) {
    return (
      <div key={m.soItemId} className="p-4 border-b last:border-b-0">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <span className="font-mono font-bold text-blue-600 text-sm">{m.soNumber}</span>
          <span className="text-sm text-gray-700">{m.customerName}</span>
          <span className="font-mono text-sm text-gray-700">{m.itemCode}</span>
          <span className="text-xs text-gray-400">
            pending {m.pendingQty}{m.alreadyPlannedQty > 0 && ` (already planned ${m.alreadyPlannedQty})`}
          </span>
          <span className="text-xs text-gray-400">Due {new Date(m.deliveryDate).toLocaleDateString('en-IN')}</span>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs text-gray-500">Build Qty</label>
            <input type="number" max={m.remainingToPlan} className="w-24 border rounded px-2 py-1 text-sm"
              value={buildQtys[m.soItemId] || ''}
              onChange={e => {
                const raw = e.target.value;
                const clamped = raw === '' ? '' : String(Math.min(parseFloat(raw) || 0, m.remainingToPlan));
                setBuildQtys(prev => ({ ...prev, [m.soItemId]: clamped }));
              }} />
          </div>
        </div>
        {m.rmRequirements.length > 0 && (
          <table className="w-full text-xs bg-gray-50 rounded">
            <thead className="text-gray-400 uppercase">
              <tr>{['RM Item', 'Qty Needed', 'Status'].map(h => <th key={h} className="text-left px-2 py-1">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {m.rmRequirements.map(rm => (
                <tr key={rm.itemCode}>
                  <td className="px-2 py-1 font-mono">{rm.itemCode} — {rm.itemName}</td>
                  <td className="px-2 py-1">{rm.totalNeeded} {rm.uom}</td>
                  <td className={`px-2 py-1 font-bold ${rm.shortfall > 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {rm.shortfall > 0 ? `Short ${rm.shortfall} ${rm.uom}` : 'Covered'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production Planning</h1>
          <p className="text-gray-500 text-sm mt-1">
            Every open Sales Order still needing production, in one place - rank by priority, enter build
            quantities, and confirm to create Work Orders. Nothing else in the system points here separately;
            this is where the flow from a confirmed order to a released Work Order actually happens.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
          Rank open Sales Orders by priority using the ↑↓ arrows, then type a build quantity for whichever
          items you want to produce. Real available stock for each item&apos;s raw materials is shown alongside
          — Run Allocation checks everything at once and creates Work Orders only if the combined material
          need is actually covered.
        </div>

        <div className="bg-white rounded-xl border p-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">Warehouse (raw material availability checked here)</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={planWarehouseId} onChange={e => { setPlanWarehouseId(e.target.value); loadPlanningBoard(e.target.value); }}>
              <option value="">— Select Warehouse —</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          {planningBoard && (
            <button onClick={handleRunAllocation} disabled={allocRunning} className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
              {allocRunning ? 'Checking...' : 'Run Allocation'}
            </button>
          )}
        </div>

        {planWarehouseId && (
          <div className="flex gap-2">
            <button onClick={() => setPlanView('bySo')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${planView === 'bySo' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              By Sales Order
            </button>
            <button onClick={() => setPlanView('byFamily')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${planView === 'byFamily' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              By Product Family
            </button>
            {planView === 'byFamily' && (
              <span className="text-xs text-gray-400 self-center ml-2">
                Groups Products that share the same upstream build - real shared-pool material availability, not independent guesses per customer.
              </span>
            )}
          </div>
        )}

        {allocResult && (
          <div className="space-y-3">
            {allocResult.createdWorkOrders && allocResult.createdWorkOrders.length > 0 && (
              <div className="rounded-xl p-4 bg-green-50 border border-green-200">
                <div className="font-bold text-green-700 mb-2">✅ Work Orders created and released</div>
                <table className="w-full text-xs">
                  <thead className="text-green-600 uppercase">
                    <tr>{['WO Number', 'Sales Order', 'Product', 'Build Qty', 'Status'].map(h => <th key={h} className="text-left px-2 py-1">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-green-100">
                    {allocResult.createdWorkOrders.map(w => (
                      <tr key={w.woId} className="bg-white">
                        <td className="px-2 py-1 font-mono font-bold">{w.woNumber}</td>
                        <td className="px-2 py-1">{w.soNumber}</td>
                        <td className="px-2 py-1">{w.productCode}</td>
                        <td className="px-2 py-1 font-bold">{w.buildQty}</td>
                        <td className="px-2 py-1">
                          {w.partial ? (
                            <span className="text-orange-600 font-medium">
                              Partial — {w.remainingPending} of {w.requestedQty} still pending
                            </span>
                          ) : (
                            <span className="text-green-600 font-medium">Full</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {allocResult.skipped && allocResult.skipped.length > 0 && (
              <div className="rounded-xl p-4 bg-red-50 border border-red-200">
                <div className="font-bold text-red-700 mb-2">⚠ Skipped — no material currently available</div>
                <table className="w-full text-xs">
                  <thead className="text-red-500 uppercase">
                    <tr>{['Sales Order', 'Item', 'Requested Qty', 'Reason'].map(h => <th key={h} className="text-left px-2 py-1">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {allocResult.skipped.map((s, i) => (
                      <tr key={i} className="bg-white">
                        <td className="px-2 py-1">{s.soNumber}</td>
                        <td className="px-2 py-1 font-mono">{s.itemCode} — {s.itemName}</td>
                        <td className="px-2 py-1 font-bold">{s.requestedQty}</td>
                        <td className="px-2 py-1 text-red-600">{s.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="text-xs text-red-500 mt-2">These stay pending — run allocation again once more stock arrives.</div>
              </div>
            )}

            {allocResult.note && (
              <div className="text-xs text-gray-500 px-1">{allocResult.note}</div>
            )}

            {(!allocResult.createdWorkOrders || allocResult.createdWorkOrders.length === 0) &&
              (!allocResult.skipped || allocResult.skipped.length === 0) && (
              <div className="rounded-xl p-4 bg-gray-50 border border-gray-200 text-gray-500 text-sm">
                No result to show.
              </div>
            )}
          </div>
        )}

        {loading && <div className="text-center py-12 text-gray-400">Loading open Sales Orders...</div>}

        {planView === 'bySo' && (
          <>
            {!loading && planWarehouseId && rankedBoard.length === 0 && (
              <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-16 text-center text-gray-400">
                <div className="text-sm">No open Sales Orders need production right now</div>
              </div>
            )}

            {rankedBoard.map((so, rank) => (
              <div key={so.soId} className="bg-white rounded-xl border shadow-sm">
                <div className="p-4 border-b flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={()=>moveOrder(so.soId,'up')} disabled={rank===0} className="text-gray-400 hover:text-blue-600 disabled:opacity-20 text-xs">▲</button>
                    <button onClick={()=>moveOrder(so.soId,'down')} disabled={rank===rankedBoard.length-1} className="text-gray-400 hover:text-blue-600 disabled:opacity-20 text-xs">▼</button>
                  </div>
                  <span className="w-6 h-6 flex items-center justify-center bg-blue-600 text-white rounded-full text-xs font-bold">{rank+1}</span>
                  <span className="font-mono font-bold text-blue-600">{so.soNumber}</span>
                  <span className="text-gray-700">{so.customerName}</span>
                  <span className="text-xs text-gray-400">Due {new Date(so.deliveryDate).toLocaleDateString('en-IN')}</span>
                </div>
                {so.items.map(item => (
                  <div key={item.soItemId} className="p-4 border-b last:border-b-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm text-gray-700">{item.itemCode}</span>
                      <span className="text-sm text-gray-500">{item.itemName}</span>
                      <span className="text-xs text-gray-400">pending {item.pendingQty}{item.alreadyPlannedQty > 0 && ` (already planned ${item.alreadyPlannedQty})`}</span>
                      {!item.hasBom && <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs">No approved BOM</span>}
                      {item.hasBom && (
                        <div className="ml-auto flex items-center gap-2">
                          <label className="text-xs text-gray-500">Build Qty</label>
                          <input type="number" max={item.remainingToPlan} className="w-24 border rounded px-2 py-1 text-sm"
                            value={buildQtys[item.soItemId] || ''}
                            onChange={e=>{
                              const raw = e.target.value;
                              const clamped = raw === '' ? '' : String(Math.min(parseFloat(raw) || 0, item.remainingToPlan));
                              setBuildQtys(prev=>({...prev, [item.soItemId]: clamped}));
                            }} />
                        </div>
                      )}
                    </div>
                    {item.hasBom && item.rmRequirements.length > 0 && (
                      <table className="w-full text-xs bg-gray-50 rounded">
                        <thead className="text-gray-400 uppercase"><tr>{['RM Item','Qty per Unit','Available Now'].map(h=><th key={h} className="text-left px-2 py-1">{h}</th>)}</tr></thead>
                        <tbody className="divide-y divide-gray-200">
                          {item.rmRequirements.map(rm => (
                            <tr key={rm.itemCode}>
                              <td className="px-2 py-1 font-mono">{rm.itemCode} — {rm.itemName}</td>
                              <td className="px-2 py-1">{rm.totalNeeded} {rm.uom}</td>
                              <td className={`px-2 py-1 font-bold ${rm.available > 0 ? 'text-green-600' : 'text-red-500'}`}>{rm.available} {rm.uom}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

        {planView === 'byFamily' && familyBoard && (
          <>
            {!loading && familyBoard.families.length === 0 && familyBoard.ungrouped.length === 0 && (
              <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-16 text-center text-gray-400">
                <div className="text-sm">No open Sales Orders need production right now</div>
              </div>
            )}

            {familyBoard.families.map(fam => (
              <div key={fam.familyId} className="bg-white rounded-xl border shadow-sm mb-4">
                <div className="p-4 border-b bg-indigo-50">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="font-mono text-xs text-indigo-500">{fam.familyCode}</span>
                      <span className="ml-2 font-bold text-indigo-900">{fam.familyName}</span>
                    </div>
                    <span className="text-xs text-indigo-600">
                      {fam.memberCount} customer order{fam.memberCount === 1 ? '' : 's'} · {fam.totalRemainingToPlan} total units to plan
                    </span>
                  </div>
                  {fam.sharedRmRequirements.length > 0 && (
                    <table className="w-full text-xs bg-white rounded mt-2">
                      <thead className="text-gray-400 uppercase">
                        <tr>{['Shared RM Item', 'Total Needed (all customers)', 'Available Now'].map(h => <th key={h} className="text-left px-2 py-1">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {fam.sharedRmRequirements.map(rm => (
                          <tr key={rm.itemCode}>
                            <td className="px-2 py-1 font-mono">{rm.itemCode} — {rm.itemName}</td>
                            <td className="px-2 py-1">{rm.totalNeeded} {rm.uom}</td>
                            <td className={`px-2 py-1 font-bold ${rm.shortfall > 0 ? 'text-red-500' : 'text-green-600'}`}>
                              {rm.available} {rm.uom}{rm.shortfall > 0 && ` (short ${rm.shortfall})`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                {fam.members.map(m => renderFamilyItemRow(m))}
              </div>
            ))}

            {familyBoard.ungrouped.length > 0 && (
              <div className="bg-white rounded-xl border shadow-sm">
                <div className="p-4 border-b bg-gray-50">
                  <span className="font-bold text-gray-700">Ungrouped items</span>
                  <span className="ml-2 text-xs text-gray-400">not part of any Product Family</span>
                </div>
                {familyBoard.ungrouped.map(m => renderFamilyItemRow(m))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
