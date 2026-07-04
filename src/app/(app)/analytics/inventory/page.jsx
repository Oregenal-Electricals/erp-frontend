'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;
const fmtQty = n => Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});

function KpiCard({ label, value, sub, color='bg-blue-50', textColor='text-blue-700' }) {
  return (
    <div className={`${color} rounded-xl p-5 border`}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function MovementChart({ data }) {
  const maxIn = Math.max(...data.map(d=>d.inQty||0), 1);
  const maxOut = Math.max(...data.map(d=>d.outQty||0), 1);
  const max = Math.max(maxIn, maxOut, 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d,i) => (
        <div key={i} className="flex-1 flex flex-col items-end gap-0.5">
          <div className="w-full flex gap-0.5 items-end" style={{height:'100%'}}>
            <div className="flex-1 bg-green-400 rounded-t transition-all" style={{height:`${Math.max(2,(d.inQty||0)/max*100)}%`}} title={`In: ${fmtQty(d.inQty)}`}></div>
            <div className="flex-1 bg-red-400 rounded-t transition-all" style={{height:`${Math.max(2,(d.outQty||0)/max*100)}%`}} title={`Out: ${fmtQty(d.outQty)}`}></div>
          </div>
          <div className="text-xs text-gray-400 truncate w-full text-center">{d.month}</div>
        </div>
      ))}
    </div>
  );
}

export default function InventoryAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const res = await fetch(`${API}/analytics/inventory-deep`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(()=>{ fetchData(); }, []);

  const maxWarehouseValue = Math.max(...(data?.byWarehouse||[]).map(w=>w.value||0), 1);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Analytics</h1>
            <p className="text-gray-500 text-sm mt-1">Stock health, movement trends and warehouse distribution</p>
          </div>
          <button onClick={fetchData} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">↻ Refresh</button>
        </div>

        {loading ? <div className="text-center py-16 text-gray-400">Loading analytics...</div> : !data ? <div className="text-center py-16 text-gray-400">No data</div> : (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <KpiCard label="Total SKUs" value={data.kpis?.totalItems} sub="Unique items" color="bg-teal-50" textColor="text-teal-700" />
              <KpiCard label="Total Stock Value" value={fmt(data.kpis?.totalValue)} color="bg-blue-50" textColor="text-blue-700" />
              <KpiCard label="Total Quantity" value={fmtQty(data.kpis?.totalQty)} sub="Units in stock" color="bg-indigo-50" textColor="text-indigo-700" />
              <KpiCard label="Low Stock Items" value={data.kpis?.lowStockCount} sub="Below threshold" color={data.kpis?.lowStockCount>0?'bg-orange-50':'bg-green-50'} textColor={data.kpis?.lowStockCount>0?'text-orange-700':'text-green-700'} />
              <KpiCard label="Zero Stock Items" value={data.kpis?.zeroStockCount} sub="Out of stock" color={data.kpis?.zeroStockCount>0?'bg-red-50':'bg-green-50'} textColor={data.kpis?.zeroStockCount>0?'text-red-700':'text-green-700'} />
            </div>

            {/* Movement Trend */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-700">Stock Movement Trend (12 Months)</h3>
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-400 rounded"></span>Stock In</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded"></span>Stock Out</span>
                </div>
              </div>
              <MovementChart data={data.movementTrend||[]} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Items by Value */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-bold text-gray-700 mb-4">Top Items by Stock Value</h3>
                <div className="space-y-2">
                  {(data.topByValue||[]).map((item,i)=>{
                    const maxVal = data.topByValue?.[0]?.totalValue || 1;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs flex items-center justify-center font-bold">{i+1}</span>
                            <div>
                              <div className="font-medium text-gray-700 text-xs">{item.itemName}</div>
                              <div className="text-xs text-gray-400">{item.itemCode} · {fmtQty(item.availableQty)} units · {item.warehouse}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-teal-600 text-sm">{fmt(item.totalValue)}</div>
                            <div className="text-xs text-gray-400">@ {fmt(item.unitCost)}/unit</div>
                          </div>
                        </div>
                        <div className="bg-gray-100 rounded-full h-1.5">
                          <div className="bg-teal-400 h-1.5 rounded-full" style={{width:`${(item.totalValue/maxVal*100).toFixed(0)}%`}}></div>
                        </div>
                      </div>
                    );
                  })}
                  {!data.topByValue?.length&&<div className="text-center text-gray-400 py-4">No stock data</div>}
                </div>
              </div>

              {/* By Warehouse */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-bold text-gray-700 mb-4">Stock by Warehouse</h3>
                <div className="space-y-4">
                  {(data.byWarehouse||[]).map((w,i)=>(
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <div>
                          <div className="font-medium text-gray-700">{w.name}</div>
                          <div className="text-xs text-gray-400">{w.items} items · {fmtQty(w.qty)} units</div>
                        </div>
                        <div className="font-bold text-blue-600">{fmt(w.value)}</div>
                      </div>
                      <div className="bg-gray-100 rounded-full h-3">
                        <div className="bg-blue-400 h-3 rounded-full" style={{width:`${(w.value/maxWarehouseValue*100).toFixed(0)}%`}}></div>
                      </div>
                      <div className="text-xs text-gray-400 text-right">{((w.value/data.kpis?.totalValue||0)*100).toFixed(1)}% of total value</div>
                    </div>
                  ))}
                  {!data.byWarehouse?.length&&<div className="text-center text-gray-400 py-4">No warehouse data</div>}
                </div>
              </div>
            </div>

            {/* Low Stock Alert */}
            {data.lowStockItems?.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
                <h3 className="font-bold text-orange-700 mb-3">⚠ Low Stock Alert ({data.lowStockItems.length} items)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-orange-100 text-xs text-orange-700 uppercase">
                      <tr>{['Item Code','Item Name','Warehouse','Available Qty','Unit Cost'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-orange-100">
                      {data.lowStockItems.map((item,i)=>(
                        <tr key={i} className="hover:bg-orange-100">
                          <td className="px-3 py-2 font-mono text-xs text-blue-600">{item.itemCode}</td>
                          <td className="px-3 py-2 font-medium">{item.itemName}</td>
                          <td className="px-3 py-2 text-xs text-gray-500">{item.warehouse}</td>
                          <td className="px-3 py-2 font-bold text-orange-600">{fmtQty(item.availableQty)}</td>
                          <td className="px-3 py-2">{fmt(item.unitCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Zero Stock */}
            {data.zeroStockItems?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <h3 className="font-bold text-red-700 mb-3">🚨 Zero Stock Items ({data.zeroStockItems.length} items)</h3>
                <div className="flex flex-wrap gap-2">
                  {data.zeroStockItems.map((item,i)=>(
                    <div key={i} className="bg-white border border-red-200 rounded-lg px-3 py-2 text-sm">
                      <div className="font-mono text-xs text-blue-600">{item.itemCode}</div>
                      <div className="font-medium text-gray-700">{item.itemName}</div>
                      <div className="text-xs text-gray-400">{item.warehouse}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.lowStockItems?.length===0 && data.zeroStockItems?.length===0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                <div className="text-3xl mb-2">✅</div>
                <div className="text-green-700 font-semibold">All stock levels healthy</div>
                <div className="text-green-600 text-sm mt-1">No low stock or zero stock alerts</div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
