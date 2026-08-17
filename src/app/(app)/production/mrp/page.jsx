'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const STATUS_COLORS = {
  AVAILABLE: 'bg-green-100 text-green-700',
  SHORTAGE: 'bg-red-100 text-red-700',
  NO_STOCK: 'bg-gray-100 text-gray-500',
};

const TABS = ['MRP Calculator','Shortage Report','Material Plan','Production Planning'];

export default function MrpPage() {
  const [activeTab, setActiveTab] = useState('MRP Calculator');
  const [wos, setWos] = useState([]);
  const [selectedWo, setSelectedWo] = useState('');
  const [mrpResult, setMrpResult] = useState(null);
  const [shortageReport, setShortageReport] = useState(null);
  const [materialPlan, setMaterialPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [planStatus, setPlanStatus] = useState('RELEASED,IN_PROGRESS');

  const [warehouses, setWarehouses] = useState([]);
  const [planWarehouseId, setPlanWarehouseId] = useState('');
  const [planView, setPlanView] = useState('bySo'); // 'bySo' | 'byFamily'
  const [planningBoard, setPlanningBoard] = useState(null);
  const [familyBoard, setFamilyBoard] = useState(null);
  const [orderRanking, setOrderRanking] = useState([]);
  const [buildQtys, setBuildQtys] = useState({});
  const [allocResult, setAllocResult] = useState(null);
  const [allocRunning, setAllocRunning] = useState(false);

  useEffect(() => {
    if (!getToken()) return;
    fetch(`${API}/work-orders?status=RELEASED&limit=50`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : {data:[]})
      .then(d => {
        const list = (d.data || []).filter(w => w.bomId);
        setWos(list);
      });
    fetch(`${API}/warehouses?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : { data: [] })
      .then(d => setWarehouses(d.data || d || []));
  }, []);

  async function handleCalculate() {
    if (!selectedWo) return;
    setLoading(true); setMrpResult(null);
    const res = await fetch(`${API}/mrp/calculate/${selectedWo}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setMrpResult(await res.json());
    setLoading(false);
  }

  async function handleShortageReport() {
    setLoading(true); setShortageReport(null);
    const res = await fetch(`${API}/mrp/shortage-report`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setShortageReport(await res.json());
    setLoading(false);
  }

  async function handleMaterialPlan() {
    setLoading(true); setMaterialPlan(null);
    const res = await fetch(`${API}/mrp/material-plan?status=${planStatus}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setMaterialPlan(await res.json());
    setLoading(false);
  }

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

  async function handleRunAllocation() {
    // Submit in the exact priority order currently on screen - this is what
    // actually determines who gets scarce material first (see MrpService.
    // runAllocation's own doc comment). Previously this used
    // Object.entries(buildQtys) which is really just "order the user typed
    // into the fields in", silently ignoring the ↑↓ ranking; fixed here
    // since the family view's shared-pool preview numbers only mean
    // anything if the real submission honors the same order they were
    // computed in.
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

  useEffect(() => {
    if (activeTab === 'Shortage Report') handleShortageReport();
    else if (activeTab === 'Material Plan') handleMaterialPlan();
  }, [activeTab]);

  const rankedBoard = planningBoard
    ? orderRanking.map(id => planningBoard.find(so => so.soId === id)).filter(Boolean)
    : [];

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
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Material Requirement Planning</h1>
          <p className="text-gray-500 text-sm mt-1">Calculate material needs for work orders and identify shortages</p>
        </div>

        <div className="flex gap-2 mb-6 border-b">
          {TABS.map(t => (
            <button key={t} onClick={() => { setActiveTab(t); setMrpResult(null); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab===t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {activeTab === 'MRP Calculator' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border p-4 flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">Select Work Order (Released/In-Progress with BOM)</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={selectedWo} onChange={e => setSelectedWo(e.target.value)}>
                  <option value="">— Select Work Order —</option>
                  {wos.map(wo => <option key={wo.id} value={wo.id}>{wo.woNumber} — {wo.productName} (qty: {wo.plannedQty})</option>)}
                </select>
              </div>
              <button onClick={handleCalculate} disabled={!selectedWo || loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Calculating...' : 'Calculate MRP'}
              </button>
            </div>

            {mrpResult && (
              <div className="space-y-4">
                <div className={`rounded-xl p-4 ${mrpResult.summary.canProduce ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`text-lg font-bold ${mrpResult.summary.canProduce ? 'text-green-700' : 'text-red-700'}`}>
                        {mrpResult.summary.canProduce ? '✅ Can Produce' : '❌ Material Shortage'}
                      </span>
                      <span className="ml-3 text-sm text-gray-600">{mrpResult.workOrder.woNumber} — {mrpResult.workOrder.productName} × {mrpResult.workOrder.plannedQty}</span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-green-600">✓ {mrpResult.summary.availableComponents} available</span>
                      {mrpResult.summary.shortageComponents > 0 && <span className="text-red-600">✗ {mrpResult.summary.shortageComponents} shortage</span>}
                      {mrpResult.summary.noStockComponents > 0 && <span className="text-gray-500">○ {mrpResult.summary.noStockComponents} no stock</span>}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">BOM: {mrpResult.bom.bomNumber} v{mrpResult.bom.version} | Warehouse: {mrpResult.workOrder.warehouse}</div>
                </div>

                <div className="bg-white rounded-xl border shadow-sm">
                  <div className="p-4 border-b font-semibold text-gray-700">Material Requirements — {mrpResult.requirements.length} components</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>{['Seq','Item Code','Item Name','UOM','Type','Qty/Unit','Waste%','Gross Req.','Net Required','Available','Shortage','Status'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y">
                        {mrpResult.requirements.map((r, i) => (
                          <tr key={i} className={`hover:bg-gray-50 ${r.shortage > 0 ? 'bg-red-50' : ''}`}>
                            <td className="px-3 py-2 text-xs text-gray-400">{r.sequence}</td>
                            <td className="px-3 py-2 font-mono text-xs text-blue-600 font-bold">{r.itemCode}</td>
                            <td className="px-3 py-2 text-xs">{r.itemName}</td>
                            <td className="px-3 py-2 text-xs text-gray-500">{r.uom}</td>
                            <td className="px-3 py-2 text-xs text-gray-500">{r.itemType?.replace(/_/g,' ')}</td>
                            <td className="px-3 py-2 text-xs">{r.qtyPer}</td>
                            <td className="px-3 py-2 text-xs text-orange-500">{r.wastagePercent}%</td>
                            <td className="px-3 py-2 text-xs">{r.grossRequired?.toFixed(2)}</td>
                            <td className="px-3 py-2 text-xs font-bold">{r.netRequired?.toFixed(2)}</td>
                            <td className={`px-3 py-2 text-xs font-bold ${r.availableQty > 0 ? 'text-green-600' : 'text-gray-400'}`}>{r.availableQty}</td>
                            <td className={`px-3 py-2 text-xs font-bold ${r.shortage > 0 ? 'text-red-600' : 'text-gray-300'}`}>{r.shortage > 0 ? r.shortage.toFixed(2) : '—'}</td>
                            <td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>{r.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {!mrpResult && !loading && (
              <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-16 text-center text-gray-400">
                <div className="text-4xl mb-3">🔄</div>
                <div className="text-sm">Select a work order and click Calculate MRP</div>
                <div className="text-xs mt-1">Only work orders with linked BOM are shown</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Shortage Report' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">Active WOs (Released + In Progress) with material shortages</div>
              <button onClick={handleShortageReport} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">↻ Refresh</button>
            </div>
            {loading && <div className="text-center py-12 text-gray-400">Analyzing shortages...</div>}
            {shortageReport && (
              <>
                <div className={`p-4 rounded-xl ${shortageReport.wosWithShortage > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  <span className="font-semibold">{shortageReport.wosWithShortage > 0 ? `⚠️ ${shortageReport.wosWithShortage} Work Order(s) have material shortages` : '✅ No shortages — all work orders have sufficient material'}</span>
                  <span className="ml-3 text-sm text-gray-500">({shortageReport.totalWOs} total active WOs checked)</span>
                </div>
                {shortageReport.data.map((wo, i) => (
                  <div key={i} className="bg-white rounded-xl border shadow-sm">
                    <div className="p-4 border-b flex gap-4">
                      <span className="font-mono font-bold text-blue-600">{wo.woNumber}</span>
                      <span className="text-gray-700">{wo.productName}</span>
                      <span className="text-gray-400">qty={wo.plannedQty}</span>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">{wo.status}</span>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>{['Item Code','Item Name','UOM','Required','Available','Shortage'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y">
                        {wo.shortageItems.map((item, j) => (
                          <tr key={j} className="bg-red-50">
                            <td className="px-3 py-2 font-mono text-xs text-blue-600">{item.itemCode}</td>
                            <td className="px-3 py-2 text-xs">{item.itemName}</td>
                            <td className="px-3 py-2 text-xs text-gray-500">{item.uom}</td>
                            <td className="px-3 py-2 text-xs font-bold">{item.required?.toFixed(2)}</td>
                            <td className="px-3 py-2 text-xs text-gray-400">{item.available}</td>
                            <td className="px-3 py-2 text-xs font-bold text-red-600">{item.shortage?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {activeTab === 'Material Plan' && (
          <div className="space-y-4">
            <div className="flex gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">WO Status Filter</label>
                <select className="border rounded-lg px-3 py-2 text-sm" value={planStatus} onChange={e => setPlanStatus(e.target.value)}>
                  <option value="RELEASED">Released Only</option>
                  <option value="RELEASED,IN_PROGRESS">Released + In Progress</option>
                  <option value="IN_PROGRESS">In Progress Only</option>
                </select>
              </div>
              <button onClick={handleMaterialPlan} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Generate Plan</button>
            </div>
            {loading && <div className="text-center py-12 text-gray-400">Calculating material plan...</div>}
            {materialPlan && (
              <div className="bg-white rounded-xl border shadow-sm">
                <div className="p-4 border-b flex gap-6">
                  <span className="font-semibold text-gray-700">Aggregate Material Plan</span>
                  <span className="text-sm text-gray-500">{materialPlan.totalWOs} WOs · {materialPlan.totalItems} items</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <tr>{['Item Code','Item Name','UOM','WOs','Total Required','Available','Shortage','Status'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y">
                      {materialPlan.data.map((item, i) => (
                        <tr key={i} className={`hover:bg-gray-50 ${item.totalShortage > 0 ? 'bg-red-50' : ''}`}>
                          <td className="px-3 py-2 font-mono text-xs text-blue-600 font-bold">{item.itemCode}</td>
                          <td className="px-3 py-2 text-xs">{item.itemName}</td>
                          <td className="px-3 py-2 text-xs text-gray-500">{item.uom}</td>
                          <td className="px-3 py-2 text-xs text-gray-500">{item.woCount}</td>
                          <td className="px-3 py-2 text-xs font-bold">{item.totalRequired?.toFixed(2)}</td>
                          <td className="px-3 py-2 text-xs text-green-600">{item.totalAvailable}</td>
                          <td className={`px-3 py-2 text-xs font-bold ${item.totalShortage > 0 ? 'text-red-600' : 'text-gray-300'}`}>{item.totalShortage > 0 ? item.totalShortage.toFixed(2) : '—'}</td>
                          <td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs font-medium ${item.totalShortage > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{item.totalShortage > 0 ? 'SHORTAGE' : 'OK'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Production Planning' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
              Rank open Sales Orders by priority using the ↑↓ arrows, then type a build quantity for whichever items you want to produce. Real available stock for each item's raw materials is shown alongside — Run Allocation checks everything at once and creates Work Orders only if the combined material need is actually covered.
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
        )}
      </div>
    </AppLayout>
  );
}
