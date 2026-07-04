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

function BarChart({ data, valueKey, labelKey, color='bg-orange-500', formatVal=v=>v }) {
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

export default function PurchaseAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('12');

  async function fetchData() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const res = await fetch(`${API}/analytics/purchase-deep?period=${period}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(()=>{ fetchData(); }, [period]);

  const aging = data?.apAging || {};
  const agingTotal = Object.values(aging).reduce((s,v)=>s+(v||0),0);
  const poTotal = Object.values(data?.poByStatus||{}).reduce((s,v)=>s+v,0);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Analytics</h1>
            <p className="text-gray-500 text-sm mt-1">Spend analysis, vendor performance and AP aging</p>
          </div>
          <select className="border rounded-lg px-3 py-2 text-sm" value={period} onChange={e=>setPeriod(e.target.value)}>
            <option value="6">Last 6 Months</option>
            <option value="12">Last 12 Months</option>
          </select>
        </div>

        {loading ? <div className="text-center py-16 text-gray-400">Loading analytics...</div> : !data ? <div className="text-center py-16 text-gray-400">No data</div> : (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Total Spend" value={fmt(data.kpis?.totalSpend)} sub="AP Bills" color="bg-orange-50" textColor="text-orange-700" />
              <KpiCard label="Purchase Orders" value={data.kpis?.totalPos} sub={`Avg ${fmt(data.kpis?.avgPoValue)}`} color="bg-blue-50" textColor="text-blue-700" />
              <KpiCard label="Payment Rate" value={fmtPct(data.kpis?.paymentRate)} sub="Bills paid" color={data.kpis?.paymentRate>=80?'bg-green-50':'bg-red-50'} textColor={data.kpis?.paymentRate>=80?'text-green-700':'text-red-700'} />
              <KpiCard label="AP Outstanding" value={fmt(data.kpis?.apOutstanding)} sub={`${data.kpis?.totalGrns} GRNs done`} color={data.kpis?.apOutstanding>0?'bg-red-50':'bg-green-50'} textColor={data.kpis?.apOutstanding>0?'text-red-700':'text-green-700'} />
            </div>

            {/* Spend Trend */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-bold text-gray-700 mb-4">Monthly Purchase Spend</h3>
              <BarChart data={data.purchaseTrend||[]} valueKey="spend" labelKey="month" color="bg-orange-400" formatVal={v=>'₹'+(v/1000).toFixed(0)+'K'} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Vendors */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-bold text-gray-700 mb-4">Top Vendors by Spend</h3>
                <div className="space-y-2">
                  {(data.topVendors||[]).slice(0,8).map((v,i)=>{
                    const maxSpend = data.topVendors?.[0]?.spend || 1;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs flex items-center justify-center font-bold">{i+1}</span>
                            <span className="font-medium text-gray-700 truncate max-w-36">{v.name}</span>
                            <span className="text-xs text-gray-400">{v.pos} POs</span>
                          </div>
                          <span className="font-bold text-orange-600">{fmt(v.spend)}</span>
                        </div>
                        <div className="bg-gray-100 rounded-full h-1.5">
                          <div className="bg-orange-400 h-1.5 rounded-full" style={{width:`${(v.spend/maxSpend*100).toFixed(0)}%`}}></div>
                        </div>
                      </div>
                    );
                  })}
                  {!data.topVendors?.length&&<div className="text-center text-gray-400 py-4">No vendor data</div>}
                </div>
              </div>

              {/* PO Status */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-bold text-gray-700 mb-4">PO Pipeline Status</h3>
                <div className="space-y-3">
                  {[
                    {status:'DRAFT',color:'bg-gray-300',label:'Draft'},
                    {status:'APPROVED',color:'bg-blue-400',label:'Approved'},
                    {status:'SENT',color:'bg-purple-400',label:'Sent to Vendor'},
                    {status:'PARTIALLY_RECEIVED',color:'bg-yellow-400',label:'Partially Received'},
                    {status:'CLOSED',color:'bg-green-500',label:'Closed'},
                    {status:'CANCELLED',color:'bg-red-400',label:'Cancelled'},
                  ].map(s=>{
                    const count = data.poByStatus?.[s.status]||0;
                    const pct = poTotal>0?Math.round(count/poTotal*100):0;
                    return count>0?(
                      <div key={s.status} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-28">{s.label}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-5">
                          <div className={`${s.color} h-5 rounded-full transition-all`} style={{width:`${pct}%`}}></div>
                        </div>
                        <span className="text-sm font-bold w-8 text-right">{count}</span>
                        <span className="text-xs text-gray-400 w-8">{pct}%</span>
                      </div>
                    ):null;
                  })}
                </div>
                <div className="mt-4 pt-3 border-t flex justify-between text-sm">
                  <span className="text-gray-500">Total POs</span>
                  <span className="font-bold">{poTotal}</span>
                </div>
              </div>
            </div>

            {/* AP Aging */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-bold text-gray-700 mb-4">AP Aging (Outstanding Vendor Bills)</h3>
              {agingTotal===0 ? (
                <div className="text-center py-6">
                  <div className="text-3xl mb-2">✅</div>
                  <div className="text-gray-500 text-sm">No outstanding vendor bills — all payments up to date</div>
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-3">
                  {[
                    {label:'Current',value:aging.current,color:'bg-green-100 text-green-700 border-green-200'},
                    {label:'1-30 days',value:aging.days1_30,color:'bg-yellow-100 text-yellow-700 border-yellow-200'},
                    {label:'31-60 days',value:aging.days31_60,color:'bg-orange-100 text-orange-700 border-orange-200'},
                    {label:'61-90 days',value:aging.days61_90,color:'bg-red-100 text-red-600 border-red-200'},
                    {label:'90+ days',value:aging.over90,color:'bg-red-200 text-red-800 border-red-300'},
                  ].map(a=>(
                    <div key={a.label} className={`rounded-xl p-4 text-center border ${a.color}`}>
                      <div className="text-lg font-bold">{fmt(a.value||0)}</div>
                      <div className="text-xs mt-1">{a.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
