'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;
const fmtPct = n => `${Number(n||0).toFixed(1)}%`;

function KpiCard({ label, value, sub, color='bg-blue-50', textColor='text-blue-700' }) {
  return (
    <div className={`${color} rounded-xl p-5 border`}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function BarChart({ data, valueKey, labelKey, color='bg-blue-500', formatVal=v=>v }) {
  const max = Math.max(...data.map(d=>d[valueKey]||0), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d,i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="text-xs text-gray-400">{d[valueKey]>0?formatVal(d[valueKey]):''}</div>
          <div className={`${color} rounded-t w-full transition-all`} style={{height:`${Math.max(4,(d[valueKey]||0)/max*100)}%`}}></div>
          <div className="text-xs text-gray-400 truncate w-full text-center">{d[labelKey]}</div>
        </div>
      ))}
    </div>
  );
}

function FunnelBar({ label, value, max, color='bg-blue-500' }) {
  const pct = max > 0 ? Math.round(value/max*100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-xs text-gray-600 text-right">{label}</div>
      <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
        <div className={`${color} h-6 rounded-full transition-all`} style={{width:`${pct}%`}}></div>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">{value}</span>
      </div>
      <div className="w-10 text-xs text-gray-400">{pct}%</div>
    </div>
  );
}

export default function SalesAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('12');

  async function fetchData() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const res = await fetch(`${API}/analytics/sales-deep?period=${period}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(()=>{ fetchData(); }, [period]);

  const aging = data?.aging || {};
  const agingTotal = Object.values(aging).reduce((s,v)=>s+(v||0),0);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales Analytics</h1>
            <p className="text-gray-500 text-sm mt-1">Revenue trends, customer analysis and order pipeline</p>
          </div>
          <select className="border rounded-lg px-3 py-2 text-sm" value={period} onChange={e=>setPeriod(e.target.value)}>
            <option value="6">Last 6 Months</option>
            <option value="12">Last 12 Months</option>
          </select>
        </div>

        {loading ? <div className="text-center py-16 text-gray-400">Loading analytics...</div> : !data ? <div className="text-center py-16 text-gray-400">No data</div> : (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <KpiCard label="Total Revenue" value={fmt(data.kpis?.totalRevenue)} color="bg-blue-50" textColor="text-blue-700" />
              <KpiCard label="Total Orders" value={data.kpis?.totalOrders} sub="Sales orders" color="bg-indigo-50" textColor="text-indigo-700" />
              <KpiCard label="Avg Order Value" value={fmt(data.kpis?.avgOrderValue)} color="bg-purple-50" textColor="text-purple-700" />
              <KpiCard label="Collection Rate" value={fmtPct(data.kpis?.collectionRate)} sub="Payments received" color={data.kpis?.collectionRate>=80?'bg-green-50':'bg-orange-50'} textColor={data.kpis?.collectionRate>=80?'text-green-700':'text-orange-700'} />
              <KpiCard label="Dispatch Rate" value={fmtPct(data.kpis?.dispatchRate)} sub="Orders dispatched" color={data.kpis?.dispatchRate>=80?'bg-green-50':'bg-yellow-50'} textColor={data.kpis?.dispatchRate>=80?'text-green-700':'text-yellow-700'} />
            </div>

            {/* Revenue Trend */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-bold text-gray-700 mb-4">Revenue Trend</h3>
              <BarChart data={data.salesTrend||[]} valueKey="revenue" labelKey="month" color="bg-blue-500" formatVal={v=>'₹'+(v/1000).toFixed(0)+'K'} />
              <div className="mt-3 grid grid-cols-3 gap-4 text-center">
                {(data.salesTrend||[]).filter(m=>m.revenue>0).slice(-3).map((m,i)=>(
                  <div key={i} className="bg-gray-50 rounded-lg p-2">
                    <div className="text-sm font-bold text-gray-700">{fmt(m.revenue)}</div>
                    <div className="text-xs text-gray-400">{m.month} ({m.orders} orders)</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Order Funnel */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-bold text-gray-700 mb-4">Sales Funnel</h3>
                <div className="space-y-2">
                  {[
                    {label:'Leads',value:data.funnel?.leads||0,color:'bg-gray-400'},
                    {label:'Quotations',value:data.funnel?.quotes||0,color:'bg-blue-400'},
                    {label:'Customer POs',value:data.funnel?.cpos||0,color:'bg-indigo-500'},
                    {label:'Sales Orders',value:data.funnel?.sos||0,color:'bg-purple-500'},
                    {label:'Dispatched',value:data.funnel?.dispatches||0,color:'bg-green-500'},
                    {label:'Delivered',value:data.funnel?.deliveries||0,color:'bg-emerald-600'},
                  ].map(f=><FunnelBar key={f.label} label={f.label} value={f.value} max={data.funnel?.leads||1} color={f.color} />)}
                </div>
              </div>

              {/* Top Customers */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-bold text-gray-700 mb-4">Top Customers</h3>
                <div className="space-y-2">
                  {(data.topCustomers||[]).slice(0,8).map((c,i)=>(
                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">{i+1}</span>
                        <span className="text-sm font-medium text-gray-700 truncate max-w-36">{c.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-blue-600">{fmt(c.revenue)}</div>
                        {c.outstanding>0&&<div className="text-xs text-orange-500">Due: {fmt(c.outstanding)}</div>}
                      </div>
                    </div>
                  ))}
                  {!data.topCustomers?.length&&<div className="text-center text-gray-400 py-4">No customer data</div>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SO Status Breakdown */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-bold text-gray-700 mb-4">Order Status Distribution</h3>
                <div className="space-y-2">
                  {Object.entries(data.soByStatus||{}).map(([status, count])=>{
                    const colors = {DRAFT:'bg-gray-200 text-gray-600',CONFIRMED:'bg-blue-100 text-blue-700',IN_PROGRESS:'bg-yellow-100 text-yellow-700',COMPLETED:'bg-green-100 text-green-700',CANCELLED:'bg-red-100 text-red-600'};
                    const total = Object.values(data.soByStatus||{}).reduce((s,v)=>s+v,0);
                    const pct = total>0?Math.round(count/total*100):0;
                    return (
                      <div key={status} className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium w-28 text-center ${colors[status]||'bg-gray-100 text-gray-600'}`}>{status}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-4">
                          <div className="bg-blue-500 h-4 rounded-full" style={{width:`${pct}%`}}></div>
                        </div>
                        <span className="text-sm font-bold w-8 text-right">{count}</span>
                        <span className="text-xs text-gray-400 w-8">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AR Aging */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-bold text-gray-700 mb-4">AR Aging (Outstanding)</h3>
                {agingTotal===0 ? (
                  <div className="text-center py-8">
                    <div className="text-3xl mb-2">✅</div>
                    <div className="text-gray-500 text-sm">No outstanding invoices</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[
                      {label:'Current (not due)',value:aging.current,color:'bg-green-500'},
                      {label:'1-30 days',value:aging.days1_30,color:'bg-yellow-400'},
                      {label:'31-60 days',value:aging.days31_60,color:'bg-orange-400'},
                      {label:'61-90 days',value:aging.days61_90,color:'bg-red-400'},
                      {label:'90+ days',value:aging.over90,color:'bg-red-700'},
                    ].map(a=>(
                      <div key={a.label} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-28">{a.label}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-5">
                          <div className={`${a.color} h-5 rounded-full`} style={{width:`${agingTotal>0?(a.value||0)/agingTotal*100:0}%`}}></div>
                        </div>
                        <span className="text-xs font-bold w-24 text-right">{fmt(a.value||0)}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t flex justify-between text-sm font-bold">
                      <span>Total Outstanding</span>
                      <span className="text-orange-600">{fmt(agingTotal)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
