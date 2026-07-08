'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmt = n => n ? `₹${Number(n).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '₹0';
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const TABS = ['Summary','Aging','Slow Moving','FIFO Value'];
const AGING_COLORS = {
  '0-30 days': 'bg-green-100 text-green-700',
  '31-60 days': 'bg-yellow-100 text-yellow-700',
  '61-90 days': 'bg-orange-100 text-orange-700',
  '91-180 days': 'bg-red-100 text-red-600',
  '180+ days (Dead Stock)': 'bg-red-200 text-red-800',
};

export default function ValuationPage() {
  const [activeTab, setActiveTab] = useState('Summary');
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [warehouseId, setWarehouseId] = useState('');
  const [slowDays, setSlowDays] = useState('30');

  useEffect(() => {
    fetch(`${API}/warehouses?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : {}).then(d => { const list = d.data || d; setWarehouses(Array.isArray(list) ? list : []); });
  }, []);

  async function fetchData() {
    setLoading(true); setData(null);
    const params = new URLSearchParams();
    if (warehouseId) params.set('warehouseId', warehouseId);
    if (activeTab === 'Slow Moving') params.set('days', slowDays);

    let url = '';
    if (activeTab === 'Summary') url = `${API}/inventory-valuation/summary?${params}`;
    else if (activeTab === 'Aging') url = `${API}/inventory-valuation/aging?${params}`;
    else if (activeTab === 'Slow Moving') url = `${API}/inventory-valuation/slow-moving?${params}`;
    else if (activeTab === 'FIFO Value') url = `${API}/inventory-valuation/fifo-value?${params}`;

    const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [activeTab, warehouseId, slowDays]);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Inventory Valuation</h1>
          <p className="text-gray-500 text-sm mt-1">Stock value analysis, aging, slow-moving and FIFO valuation</p>
        </div>

        <div className="flex gap-2 mb-6 border-b">
          {TABS.map(t => (
            <button key={t} onClick={() => { setActiveTab(t); setData(null); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab===t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border p-4 mb-4 flex gap-3 flex-wrap items-center">
          <select className="border rounded-lg px-3 py-2 text-sm" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
            <option value="">All Warehouses</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          {activeTab === 'Slow Moving' && (
            <select className="border rounded-lg px-3 py-2 text-sm" value={slowDays} onChange={e => setSlowDays(e.target.value)}>
              <option value="30">No movement in 30 days</option>
              <option value="60">No movement in 60 days</option>
              <option value="90">No movement in 90 days</option>
              <option value="180">No movement in 180 days</option>
            </select>
          )}
          <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Refresh</button>
        </div>

        {loading && <div className="text-center py-12 text-gray-400">Calculating valuation...</div>}

        {!loading && data && activeTab === 'Summary' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Grand Total Value', value: fmt(data.grandTotal), color: 'bg-blue-50 text-blue-700', big: true },
                { label: 'Total SKUs', value: data.totalItems, color: 'bg-gray-50 text-gray-700' },
                { label: 'Active Items', value: data.activeItems, color: 'bg-green-50 text-green-700' },
                { label: 'Zero Stock Items', value: data.zeroStockItems, color: 'bg-red-50 text-red-600' },
              ].map(s => (
                <div key={s.label} className={`${s.color} rounded-xl p-4 text-center`}>
                  <div className={`font-bold ${s.big ? 'text-2xl' : 'text-xl'}`}>{s.value}</div>
                  <div className="text-xs mt-1 opacity-70">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b font-semibold text-gray-700">Value by Warehouse</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>{['Warehouse','Items','Total Qty','Stock Value','% of Total'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.byWarehouse.map((w, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{w.warehouse}</td>
                        <td className="px-4 py-3 text-gray-600">{w.items}</td>
                        <td className="px-4 py-3">{w.totalQty?.toFixed(0)}</td>
                        <td className="px-4 py-3 font-bold text-blue-700">{fmt(w.totalValue)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-2">
                              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${data.grandTotal > 0 ? (w.totalValue/data.grandTotal*100).toFixed(0) : 0}%` }}></div>
                            </div>
                            <span className="text-xs text-gray-500">{data.grandTotal > 0 ? (w.totalValue/data.grandTotal*100).toFixed(1) : 0}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!loading && data && activeTab === 'Aging' && (
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-3">
              {data.buckets.map(b => (
                <div key={b.bucket} className={`rounded-xl p-3 text-center ${AGING_COLORS[b.bucket] || 'bg-gray-50'}`}>
                  <div className="text-lg font-bold">{b.items}</div>
                  <div className="text-xs mt-1 font-medium">{b.bucket}</div>
                  <div className="text-xs mt-1 opacity-70">{fmt(b.totalValue)}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b font-semibold text-gray-700">Aging Detail — {data.data.length} items · {fmt(data.totalValue)}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>{['Item Code','Item Name','Warehouse','Qty','Unit Cost','Stock Value','Last Movement','Days','Aging'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.data.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-xs text-blue-600">{r.itemCode}</td>
                        <td className="px-3 py-2 text-xs">{r.itemName}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{r.warehouse}</td>
                        <td className="px-3 py-2 text-xs font-bold">{r.availableQty}</td>
                        <td className="px-3 py-2 text-xs">{fmt(r.unitCost)}</td>
                        <td className="px-3 py-2 text-xs font-bold">{fmt(r.stockValue)}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{fmtDate(r.lastMovementDate)}</td>
                        <td className="px-3 py-2 text-xs font-bold">{r.daysSinceMovement}d</td>
                        <td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs font-medium ${AGING_COLORS[r.agingBucket] || 'bg-gray-100'}`}>{r.agingBucket}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!loading && data && activeTab === 'Slow Moving' && (
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b flex gap-6">
              <div><span className="font-semibold text-gray-700">Slow Moving Stock</span><span className="ml-2 text-xs text-gray-400">No movement in {data.days} days</span></div>
              <div className="text-center"><div className="text-lg font-bold text-orange-600">{data.totalItems}</div><div className="text-xs text-gray-500">Items</div></div>
              <div className="text-center"><div className="text-lg font-bold text-red-600">{fmt(data.totalValue)}</div><div className="text-xs text-gray-500">Value at Risk</div></div>
            </div>
            {data.data.length === 0 ? (
              <div className="text-center py-12 text-green-600 font-medium">✅ No slow-moving stock! All items have recent movements.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>{['Item Code','Item Name','Warehouse','Available Qty','Unit Cost','Stock Value'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.data.map((r, i) => (
                      <tr key={i} className="hover:bg-orange-50">
                        <td className="px-3 py-2 font-mono text-xs text-blue-600">{r.itemCode}</td>
                        <td className="px-3 py-2 text-xs">{r.itemName}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{r.warehouse}</td>
                        <td className="px-3 py-2 text-xs font-bold text-orange-600">{r.availableQty}</td>
                        <td className="px-3 py-2 text-xs">{fmt(r.unitCost)}</td>
                        <td className="px-3 py-2 text-xs font-bold text-red-600">{fmt(r.stockValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!loading && data && activeTab === 'FIFO Value' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-blue-700">{fmt(data.totalFifoValue)}</div>
                <div className="text-xs text-blue-500 mt-1">Total FIFO Value</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-gray-700">{data.totalItems}</div>
                <div className="text-xs text-gray-500 mt-1">Active Item-Warehouse Combinations</div>
              </div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b font-semibold text-gray-700">FIFO Valuation by Item</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>{['Item Code','Item Name','Warehouse','Total Qty','FIFO Value','Avg Cost','Batches'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.data.map((d, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-xs text-blue-600">{d.itemCode}</td>
                        <td className="px-3 py-2 text-xs">{d.itemName}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{d.warehouse}</td>
                        <td className="px-3 py-2 text-xs font-bold">{d.totalQty?.toLocaleString()}</td>
                        <td className="px-3 py-2 text-xs font-bold text-blue-700">{fmt(d.fifoValue)}</td>
                        <td className="px-3 py-2 text-xs">{fmt(d.avgCost)}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{d.batches?.length || 0} batches</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
