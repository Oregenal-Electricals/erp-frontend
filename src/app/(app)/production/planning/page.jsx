'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

export default function ProductionPlanningPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [planWarehouseId, setPlanWarehouseId] = useState('');
  const [familyBoard, setFamilyBoard] = useState(null);
  const [groupRankings, setGroupRankings] = useState({});
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
    if (!warehouseId) { setFamilyBoard(null); return; }
    setLoading(true); setAllocResult(null);
    const res = await fetch(`${API}/mrp/planning-board-by-family?warehouseId=${warehouseId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const board = await res.json();
      setFamilyBoard(board);
      const rankings = {};
      board.families.forEach(fam => { rankings[fam.groupLabel] = fam.members.map(m => m.soItemId); });
      rankings.ungrouped = board.ungrouped.map(m => m.soItemId);
      setGroupRankings(rankings);
    }
    setBuildQtys({});
    setLoading(false);
  }

  function moveInGroup(groupKey, soItemId, direction) {
    setGroupRankings(prev => {
      const list = prev[groupKey] || [];
      const idx = list.indexOf(soItemId);
      const swapWith = direction === 'up' ? idx - 1 : idx + 1;
      if (idx === -1 || swapWith < 0 || swapWith >= list.length) return prev;
      const next = [...list];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return { ...prev, [groupKey]: next };
    });
  }

  function rankedMembers(groupKey, members) {
    const order = groupRankings[groupKey];
    if (!order) return members;
    return order.map(id => members.find(m => m.soItemId === id)).filter(Boolean);
  }

  async function handleRunAllocation() {
    const orderedIds = [
      ...(familyBoard?.families || []).flatMap(f => rankedMembers(f.groupLabel, f.members).map(m => m.soItemId)),
      ...rankedMembers('ungrouped', familyBoard?.ungrouped || []).map(m => m.soItemId),
    ];

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

  function computeMaxBuildable(fam, orderedGroupMembers) {
    const remaining = new Map(fam.sharedRmRequirements.map(rm => [rm.itemCode, rm.available]));
    const result = {};
    for (const m of orderedGroupMembers) {
      let maxQty = m.remainingToPlan;
      for (const rm of m.rmRequirements) {
        if (!m.remainingToPlan) continue;
        const perUnit = rm.totalNeeded / m.remainingToPlan;
        if (perUnit <= 0) continue;
        const avail = remaining.get(rm.itemCode) ?? 0;
        maxQty = Math.min(maxQty, Math.floor(avail / perUnit));
      }
      maxQty = Math.max(0, maxQty);
      result[m.soItemId] = maxQty;

      const consumedQty = Math.min(parseFloat(buildQtys[m.soItemId]) || 0, maxQty);
      for (const rm of m.rmRequirements) {
        if (!m.remainingToPlan) continue;
        const perUnit = rm.totalNeeded / m.remainingToPlan;
        const currentAvail = remaining.get(rm.itemCode) ?? 0;
        remaining.set(rm.itemCode, Math.max(0, currentAvail - perUnit * consumedQty));
      }
    }
    return result;
  }

  function computeSingleOrderMaxBuildable(m) {
    let maxQty = m.remainingToPlan;
    for (const rm of m.rmRequirements) {
      if (!m.remainingToPlan) continue;
      const perUnit = rm.totalNeeded / m.remainingToPlan;
      if (perUnit <= 0) continue;
      maxQty = Math.min(maxQty, Math.floor(rm.available / perUnit));
    }
    return Math.max(0, maxQty);
  }

  function renderFamilyItemRow(m, maxBuildable, rankInfo) {
    return (
      <div key={m.soItemId} className="p-4 border-b last:border-b-0">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          {rankInfo && (
            <div className="flex flex-col gap-0.5">
              <button onClick={() => rankInfo.onMove('up')} disabled={rankInfo.isFirst} className="text-gray-400 hover:text-blue-600 disabled:opacity-20 text-xs">▲</button>
              <button onClick={() => rankInfo.onMove('down')} disabled={rankInfo.isLast} className="text-gray-400 hover:text-blue-600 disabled:opacity-20 text-xs">▼</button>
            </div>
          )}
          <span className="font-mono font-bold text-blue-600 text-sm">{m.soNumber}</span>
          <span className="text-sm text-gray-700">{m.customerName}</span>
          <span className="font-mono text-sm text-gray-700">{m.itemCode}</span>
          <span className="text-xs text-gray-400">
            pending {m.pendingQty}{m.alreadyPlannedQty > 0 && ` (already planned ${m.alreadyPlannedQty})`}
          </span>
          <span className="text-xs text-gray-400">Due {new Date(m.deliveryDate).toLocaleDateString('en-IN')}</span>
          {maxBuildable !== undefined && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${maxBuildable >= m.remainingToPlan ? 'bg-green-100 text-green-700' : maxBuildable > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
              Max buildable now: {maxBuildable}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs text-gray-500">Build Qty</label>
            <input type="number" max={maxBuildable !== undefined ? maxBuildable : m.remainingToPlan} className="w-24 border rounded px-2 py-1 text-sm"
              value={buildQtys[m.soItemId] || ''}
              onChange={e => {
                const raw = e.target.value;
                const cap = maxBuildable !== undefined ? maxBuildable : m.remainingToPlan;
                const clamped = raw === '' ? '' : String(Math.min(parseFloat(raw) || 0, cap));
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
            Every open Sales Order still needing production, in one place - orders that share the same
            upstream build are grouped so material availability reflects the real shared pool, not an
            independent guess per customer. Rank by priority, enter build quantities, and confirm to
            create Work Orders.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
          Rank orders within a group using the ↑↓ arrows when they share material, then type a build
          quantity for whichever items you want to produce. Real available stock for each item&apos;s raw
          materials is shown alongside — Run Allocation checks everything at once and creates Work Orders
          only if the combined material need is actually covered.
        </div>

        <div className="bg-white rounded-xl border p-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">Warehouse (raw material availability checked here)</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={planWarehouseId} onChange={e => { setPlanWarehouseId(e.target.value); loadPlanningBoard(e.target.value); }}>
              <option value="">— Select Warehouse —</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          {familyBoard && (
            <button onClick={handleRunAllocation} disabled={allocRunning} className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
              {allocRunning ? 'Checking...' : 'Run Allocation'}
            </button>
          )}
        </div>

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

        {familyBoard && (
          <>
            {!loading && familyBoard.families.length === 0 && familyBoard.ungrouped.length === 0 && (
              <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-16 text-center text-gray-400">
                <div className="text-sm">No open Sales Orders need production right now</div>
              </div>
            )}

            {familyBoard.families.map((fam) => {
              const ordered = rankedMembers(fam.groupLabel, fam.members);
              const maxBuildableMap = computeMaxBuildable(fam, ordered);
              return (
              <div key={fam.groupLabel} className="bg-white rounded-xl border shadow-sm mb-4">
                <div className="p-4 border-b bg-indigo-50">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="font-bold text-indigo-900">{fam.groupLabel}</span>
                      <span className="ml-2 font-mono text-xs text-indigo-500">{fam.productCodes.join(', ')}</span>
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
                {ordered.map((m, idx) => renderFamilyItemRow(m, maxBuildableMap[m.soItemId], {
                  onMove: (dir) => moveInGroup(fam.groupLabel, m.soItemId, dir),
                  isFirst: idx === 0,
                  isLast: idx === ordered.length - 1,
                }))}
              </div>
              );
            })}

            {familyBoard.ungrouped.length > 0 && (
              <div className="bg-white rounded-xl border shadow-sm">
                <div className="p-4 border-b bg-gray-50">
                  <span className="font-bold text-gray-700">Other open orders</span>
                  <span className="ml-2 text-xs text-gray-400">not sharing a material pool with anything else right now</span>
                </div>
                {familyBoard.ungrouped.map(m => renderFamilyItemRow(m, computeSingleOrderMaxBuildable(m)))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
