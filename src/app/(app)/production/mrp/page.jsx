'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }

const STATUS_COLORS = {
  AVAILABLE: 'bg-green-100 text-green-700',
  SHORTAGE: 'bg-red-100 text-red-700',
  NO_STOCK: 'bg-gray-100 text-gray-500',
};

const TABS = ['MRP Calculator','Shortage Report','Material Plan'];

export default function MrpPage() {
  const [activeTab, setActiveTab] = useState('MRP Calculator');
  const [wos, setWos] = useState([]);
  const [selectedWo, setSelectedWo] = useState('');
  const [mrpResult, setMrpResult] = useState(null);
  const [shortageReport, setShortageReport] = useState(null);
  const [materialPlan, setMaterialPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [planStatus, setPlanStatus] = useState('RELEASED,IN_PROGRESS');

  useEffect(() => {
    if (!getToken()) return;
    fetch(`${API}/work-orders?status=RELEASED&limit=50`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : {data:[]})
      .then(d => {
        const list = (d.data || []).filter(w => w.bomId);
        setWos(list);
      });
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

  useEffect(() => {
    if (activeTab === 'Shortage Report') handleShortageReport();
    else if (activeTab === 'Material Plan') handleMaterialPlan();
  }, [activeTab]);

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
      </div>
    </AppLayout>
  );
}
