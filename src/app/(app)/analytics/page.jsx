'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;
const fmtN = n => Number(n||0).toLocaleString('en-IN');

const TABS = ['Executive','Sales','Purchase','Inventory','Quality','Finance'];

function KPICard({ label, value, sub, color='bg-white', textColor='text-gray-800', icon }) {
  return (
    <div className={`${color} rounded-xl p-5 shadow-sm border`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</div>
          <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
          {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
        </div>
        {icon && <span className="text-2xl opacity-60">{icon}</span>}
      </div>
    </div>
  );
}

function MiniBar({ data, valueKey, labelKey, color='bg-blue-500' }) {
  if (!data?.length) return <div className="text-gray-400 text-sm text-center py-4">No data</div>;
  const max = Math.max(...data.map(d => d[valueKey] || 0));
  return (
    <div className="space-y-2">
      {data.map((d,i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="text-xs text-gray-500 w-24 truncate">{d[labelKey]}</div>
          <div className="flex-1 bg-gray-100 rounded-full h-4">
            <div className={`${color} h-4 rounded-full`} style={{width: max > 0 ? `${(d[valueKey]||0)/max*100}%` : '0%'}}></div>
          </div>
          <div className="text-xs font-medium text-gray-700 w-20 text-right">{typeof d[valueKey] === 'number' && d[valueKey] > 1000 ? fmt(d[valueKey]) : fmtN(d[valueKey])}</div>
        </div>
      ))}
    </div>
  );
}

function TrendLine({ data, valueKey, labelKey }) {
  if (!data?.length) return <div className="text-gray-400 text-sm text-center py-4">No data</div>;
  const max = Math.max(...data.map(d => d[valueKey] || 0));
  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((d,i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full bg-blue-500 rounded-t" style={{height: max > 0 ? `${Math.max(4,(d[valueKey]||0)/max*80)}px` : '4px'}}></div>
          <div className="text-xs text-gray-400 truncate w-full text-center">{d[labelKey]}</div>
        </div>
      ))}
    </div>
  );
}

function PipelineBar({ data }) {
  if (!data || !Object.keys(data).length) return <div className="text-gray-400 text-sm">No data</div>;
  const total = Object.values(data).reduce((s,v) => s + Number(v), 0);
  const COLORS = ['bg-blue-500','bg-green-500','bg-yellow-500','bg-orange-500','bg-red-500','bg-purple-500','bg-gray-400'];
  return (
    <div>
      <div className="flex rounded-full overflow-hidden h-5 mb-3">
        {Object.entries(data).map(([k,v],i) => (
          <div key={k} className={COLORS[i%COLORS.length]} style={{width:`${Number(v)/total*100}%`}} title={`${k}: ${v}`}></div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(data).map(([k,v],i) => (
          <div key={k} className="flex items-center gap-1 text-xs">
            <div className={`w-2 h-2 rounded-full ${COLORS[i%COLORS.length]}`}></div>
            <span className="text-gray-500">{k}:</span><span className="font-medium">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('Executive');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  async function fetchTab(tab) {
    if (!getToken()) return;
    setLoading(true);
    const endpointMap = { Executive:'executive', Sales:'sales', Purchase:'purchase', Inventory:'inventory', Quality:'quality', Finance:'finance' };
    const endpoint = endpointMap[tab];
    const res = await fetch(`${API}/analytics/${endpoint}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) { const json = await res.json(); setData(d => ({...d, [tab]: json})); }
    setLoading(false);
  }

  useEffect(() => { fetchTab(activeTab); }, [activeTab]);

  const d = data[activeTab] || {};

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time business intelligence across all modules</p>
        </div>

        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 overflow-x-auto">
          {TABS.map(t=>(
            <button key={t} onClick={()=>setActiveTab(t)} className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${activeTab===t?'bg-white shadow text-indigo-600':'text-gray-500 hover:text-gray-700'}`}>{t}</button>
          ))}
        </div>

        {loading && <div className="text-center py-16 text-gray-400">Loading analytics...</div>}

        {/* EXECUTIVE */}
        {!loading && activeTab==='Executive' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard label="Revenue MTD" value={fmt(d.kpis?.revenueMTD)} sub="Current month" color="bg-blue-50" textColor="text-blue-700" icon="💰" />
              <KPICard label="AR Outstanding" value={fmt(d.kpis?.arOutstanding)} sub={`${d.kpis?.arCount||0} invoices`} color="bg-orange-50" textColor="text-orange-700" icon="📄" />
              <KPICard label="Open Tasks" value={fmtN(d.kpis?.openTasks)} sub="Pending action" color="bg-yellow-50" textColor="text-yellow-700" icon="📌" />
              <KPICard label="Low Stock Items" value={fmtN(d.kpis?.lowStockItems)} sub="Need reorder" color={d.kpis?.lowStockItems > 0 ? 'bg-red-50' : 'bg-green-50'} textColor={d.kpis?.lowStockItems > 0 ? 'text-red-700' : 'text-green-700'} icon="📦" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-semibold text-gray-700 mb-4">Revenue Trend (6 Months)</h3>
                <TrendLine data={d.revenueTrend} valueKey="revenue" labelKey="month" />
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-semibold text-gray-700 mb-4">Top Customers</h3>
                <MiniBar data={d.topCustomers} valueKey="revenue" labelKey="name" color="bg-blue-500" />
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-semibold text-gray-700 mb-3">Sales Order Pipeline</h3>
                <PipelineBar data={d.orderPipeline} />
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-semibold text-gray-700 mb-3">Purchase Order Pipeline</h3>
                <PipelineBar data={d.purchasePipeline} />
              </div>
            </div>

            {d.recentOrders?.length > 0 && (
              <div className="bg-white rounded-xl border shadow-sm">
                <div className="p-4 border-b font-semibold text-gray-700">Recent Sales Orders</div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['SO Number','Customer','Amount','Status'].map(h=><th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y">
                    {d.recentOrders.slice(0,5).map(o=>(
                      <tr key={o.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-xs text-blue-600">{o.soNumber}</td>
                        <td className="px-4 py-2">{o.customerName}</td>
                        <td className="px-4 py-2">{fmt(o.totalAmount)}</td>
                        <td className="px-4 py-2"><span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">{o.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SALES */}
        {!loading && activeTab==='Sales' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <KPICard label="Total Dispatched" value={fmtN(d.totalDispatched)} icon="🚚" color="bg-blue-50" textColor="text-blue-700" />
              <KPICard label="Total Delivered" value={fmtN(d.totalDelivered)} icon="✅" color="bg-green-50" textColor="text-green-700" />
              <KPICard label="Dispatch Rate" value={`${d.dispatchRate||0}%`} icon="📊" color="bg-indigo-50" textColor="text-indigo-700" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-semibold text-gray-700 mb-4">Sales Trend</h3>
                <TrendLine data={d.salesTrend} valueKey="revenue" labelKey="month" />
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-semibold text-gray-700 mb-4">Top Customers by Revenue</h3>
                <MiniBar data={d.topCustomers} valueKey="revenue" labelKey="customerName" color="bg-green-500" />
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-semibold text-gray-700 mb-3">SO Status Distribution</h3>
                <PipelineBar data={d.soByStatus} />
              </div>
            </div>
          </div>
        )}

        {/* PURCHASE */}
        {!loading && activeTab==='Purchase' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-semibold text-gray-700 mb-4">Purchase Spend Trend</h3>
                <TrendLine data={d.purchaseTrend} valueKey="spend" labelKey="month" />
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-semibold text-gray-700 mb-4">Top Vendors by Spend</h3>
                <MiniBar data={d.topVendors} valueKey="totalSpend" labelKey="vendorName" color="bg-orange-400" />
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-semibold text-gray-700 mb-3">PO Status Distribution</h3>
                <PipelineBar data={d.poByStatus} />
              </div>
            </div>
          </div>
        )}

        {/* INVENTORY */}
        {!loading && activeTab==='Inventory' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard label="Total Items" value={fmtN(d.totalItems)} icon="📦" color="bg-blue-50" textColor="text-blue-700" />
              <KPICard label="Total Quantity" value={fmtN(d.totalQty)} icon="🔢" color="bg-indigo-50" textColor="text-indigo-700" />
              <KPICard label="Total Value" value={fmt(d.totalValue)} icon="💎" color="bg-green-50" textColor="text-green-700" />
              <KPICard label="Low Stock" value={fmtN(d.lowStockCount)} sub={`${d.zeroStockCount||0} at zero`} icon="⚠️" color={d.lowStockCount > 0 ? 'bg-red-50' : 'bg-gray-50'} textColor={d.lowStockCount > 0 ? 'text-red-700' : 'text-gray-700'} />
            </div>
            {d.lowStockItems?.length > 0 && (
              <div className="bg-white rounded-xl border shadow-sm">
                <div className="p-4 border-b font-semibold text-red-600">⚠ Low Stock Items</div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Item Code','Item Name','Available','Reorder Level'].map(h=><th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y">
                    {d.lowStockItems.map((item,i)=>(
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-xs text-blue-600">{item.itemCode}</td>
                        <td className="px-4 py-2">{item.itemName}</td>
                        <td className="px-4 py-2 font-bold text-red-600">{item.availableQty}</td>
                        <td className="px-4 py-2 text-gray-500">{item.reorderLevel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {d.byWarehouse?.length > 0 && (
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-semibold text-gray-700 mb-4">Stock by Warehouse</h3>
                <MiniBar data={d.byWarehouse} valueKey="totalValue" labelKey="warehouse" color="bg-indigo-500" />
              </div>
            )}
          </div>
        )}

        {/* QUALITY */}
        {!loading && activeTab==='Quality' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard label="Total NCRs" value={fmtN(d.ncrByStatus ? Object.values(d.ncrByStatus).reduce((s,v)=>s+Number(v),0) : 0)} icon="🔍" color="bg-red-50" textColor="text-red-700" />
              <KPICard label="CAPA Pending" value={fmtN(d.capa?.pending||0)} icon="⏳" color="bg-orange-50" textColor="text-orange-700" />
              <KPICard label="CAPA Completed" value={fmtN(d.capa?.completed||0)} icon="✅" color="bg-green-50" textColor="text-green-700" />
              <KPICard label="CAPA Overdue" value={fmtN(d.capa?.overdue||0)} icon="🚨" color={d.capa?.overdue > 0 ? 'bg-red-50' : 'bg-gray-50'} textColor={d.capa?.overdue > 0 ? 'text-red-700' : 'text-gray-700'} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-semibold text-gray-700 mb-4">NCR Trend (6 Months)</h3>
                <TrendLine data={d.ncrTrend} valueKey="count" labelKey="month" />
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-semibold text-gray-700 mb-4">NCR by Source</h3>
                <MiniBar data={Object.entries(d.ncrBySource||{}).map(([k,v])=>({source:k,count:v}))} valueKey="count" labelKey="source" color="bg-red-400" />
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-semibold text-gray-700 mb-3">NCR by Status</h3>
                <PipelineBar data={d.ncrByStatus} />
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-semibold text-gray-700 mb-3">NCR by Severity</h3>
                <PipelineBar data={d.ncrBySeverity} />
              </div>
            </div>
          </div>
        )}

        {/* FINANCE */}
        {!loading && activeTab==='Finance' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-semibold text-gray-700 mb-4">P&L Trend (6 Months)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Month','Revenue','COGS','Gross Profit','Net Profit'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y">
                    {(d.plTrend||[]).map((row,i)=>(
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-xs font-bold">{row.month}</td>
                        <td className="px-3 py-2 text-blue-600">{fmt(row.revenue)}</td>
                        <td className="px-3 py-2 text-orange-600">{fmt(row.cogs)}</td>
                        <td className="px-3 py-2 text-green-600">{fmt(row.grossProfit)}</td>
                        <td className={`px-3 py-2 font-bold ${row.netProfit>=0?'text-green-700':'text-red-600'}`}>{fmt(row.netProfit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {d.arAging?.length > 0 && (
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-semibold text-gray-700 mb-4">AR Aging Analysis</h3>
                <MiniBar data={d.arAging} valueKey="amount" labelKey="bucket" color="bg-orange-400" />
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
