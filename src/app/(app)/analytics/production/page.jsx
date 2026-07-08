'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmtQty = n => Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:1});
const fmtPct = n => `${Number(n||0).toFixed(1)}%`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : '—';

function KpiCard({ label, value, sub, color='bg-blue-50', textColor='text-blue-700' }) {
  return (
    <div className={`${color} rounded-xl p-5 border`}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function TrendChart({ data }) {
  const maxQty = Math.max(...data.map(d=>d.completedQty||0), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d,i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="text-xs text-gray-400">{d.completedQty>0?fmtQty(d.completedQty):''}</div>
          <div className="bg-purple-500 rounded-t w-full transition-all" style={{height:`${Math.max(4,(d.completedQty||0)/maxQty*100)}%`}}></div>
          <div className="text-xs text-gray-400 truncate w-full text-center">{d.month}</div>
        </div>
      ))}
    </div>
  );
}

export default function ProductionAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const res = await fetch(`${API}/analytics/production-deep`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(()=>{ fetchData(); }, []);

  const woTotal = Object.values(data?.woByStatus||{}).reduce((s,v)=>s+v,0);
  const STATUS_COLORS = {DRAFT:'bg-gray-300',RELEASED:'bg-blue-300',IN_PROGRESS:'bg-yellow-400',COMPLETED:'bg-green-500',CANCELLED:'bg-red-400'};
  const PRIORITY_COLORS = {LOW:'bg-gray-100 text-gray-600',MEDIUM:'bg-blue-100 text-blue-700',HIGH:'bg-orange-100 text-orange-700',URGENT:'bg-red-100 text-red-700'};

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Production Analytics</h1>
            <p className="text-gray-500 text-sm mt-1">Work order performance, completion rates and production trends</p>
          </div>
          <button onClick={fetchData} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">↻ Refresh</button>
        </div>

        {loading ? <div className="text-center py-16 text-gray-400">Loading analytics...</div> : !data ? <div className="text-center py-16 text-gray-400">No data</div> : (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Total Work Orders" value={data.kpis?.total} sub={`${data.kpis?.completed} completed`} color="bg-purple-50" textColor="text-purple-700" />
              <KpiCard label="Completion Rate" value={fmtPct(data.kpis?.completionRate)} sub={`${fmtQty(data.kpis?.totalCompleted)} / ${fmtQty(data.kpis?.totalPlanned)} units`} color={data.kpis?.completionRate>=90?'bg-green-50':'bg-yellow-50'} textColor={data.kpis?.completionRate>=90?'text-green-700':'text-yellow-700'} />
              <KpiCard label="Rejection Rate" value={fmtPct(data.kpis?.rejectionRate)} sub={`${fmtQty(data.kpis?.totalRejected)} units rejected`} color={data.kpis?.rejectionRate<5?'bg-green-50':'bg-red-50'} textColor={data.kpis?.rejectionRate<5?'text-green-700':'text-red-700'} />
              <KpiCard label="Avg Cycle Time" value={`${data.kpis?.avgCycleHours}h`} sub="Per work order" color="bg-indigo-50" textColor="text-indigo-700" />
            </div>

            {/* Production Trend */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-bold text-gray-700 mb-4">Monthly Production Output (Completed Qty)</h3>
              <TrendChart data={data.productionTrend||[]} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* WO Status */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-bold text-gray-700 mb-4">Work Order Status Distribution</h3>
                <div className="space-y-3">
                  {['DRAFT','RELEASED','IN_PROGRESS','COMPLETED','CANCELLED'].map(status => {
                    const count = data.woByStatus?.[status]||0;
                    const pct = woTotal>0?Math.round(count/woTotal*100):0;
                    return count>0?(
                      <div key={status} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-24">{status.replace(/_/g,' ')}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-5">
                          <div className={`${STATUS_COLORS[status]} h-5 rounded-full transition-all`} style={{width:`${pct}%`}}></div>
                        </div>
                        <span className="text-sm font-bold w-8">{count}</span>
                        <span className="text-xs text-gray-400 w-8">{pct}%</span>
                      </div>
                    ):null;
                  })}
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between text-sm">
                  <span className="text-gray-500">Total WOs</span>
                  <span className="font-bold">{woTotal}</span>
                </div>
              </div>

              {/* Top Products */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-bold text-gray-700 mb-4">Top Products by Production Volume</h3>
                <div className="space-y-2">
                  {(data.topProducts||[]).map((p,i)=>{
                    const maxQty = data.topProducts?.[0]?.completedQty||1;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center font-bold">{i+1}</span>
                            <div>
                              <div className="font-medium text-gray-700 text-xs truncate max-w-36">{p.productName}</div>
                              <div className="text-xs text-gray-400">{p.productCode} · {p.wos} WOs</div>
                            </div>
                          </div>
                          <span className="font-bold text-purple-600">{fmtQty(p.completedQty)} units</span>
                        </div>
                        <div className="bg-gray-100 rounded-full h-1.5">
                          <div className="bg-purple-400 h-1.5 rounded-full" style={{width:`${(p.completedQty/maxQty*100).toFixed(0)}%`}}></div>
                        </div>
                      </div>
                    );
                  })}
                  {!data.topProducts?.length&&<div className="text-center text-gray-400 py-4">No completed work orders</div>}
                </div>
              </div>
            </div>

            {/* Production Summary */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-bold text-gray-700 mb-4">Production Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-700">{fmtQty(data.kpis?.totalPlanned)}</div>
                  <div className="text-xs text-gray-500 mt-1">Total Planned Qty</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-700">{fmtQty(data.kpis?.totalCompleted)}</div>
                  <div className="text-xs text-gray-500 mt-1">Total Completed Qty</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-xl">
                  <div className="text-2xl font-bold text-red-700">{fmtQty(data.kpis?.totalRejected)}</div>
                  <div className="text-xs text-gray-500 mt-1">Total Rejected Qty</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Completion Progress</span>
                  <span>{fmtPct(data.kpis?.completionRate)}</span>
                </div>
                <div className="bg-gray-200 rounded-full h-4">
                  <div className="bg-green-500 h-4 rounded-full transition-all" style={{width:`${Math.min(100,data.kpis?.completionRate||0)}%`}}></div>
                </div>
              </div>
            </div>

            {/* Overdue WOs */}
            {data.overdueWos?.length > 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <h3 className="font-bold text-red-700 mb-3">⚠ Overdue Work Orders ({data.overdueWos.length})</h3>
                <table className="w-full text-sm">
                  <thead className="bg-red-100 text-xs text-red-700 uppercase">
                    <tr>{['WO Number','Product','Planned End','Status','Priority','Progress'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {data.overdueWos.map((wo,i)=>(
                      <tr key={i} className="hover:bg-red-100">
                        <td className="px-3 py-2 font-mono text-xs text-blue-600">{wo.woNumber}</td>
                        <td className="px-3 py-2 font-medium">{wo.productName}</td>
                        <td className="px-3 py-2 text-red-600 font-bold">{fmtDate(wo.plannedEndDate)}</td>
                        <td className="px-3 py-2"><span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700">{wo.status}</span></td>
                        <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${PRIORITY_COLORS[wo.priority]}`}>{wo.priority}</span></td>
                        <td className="px-3 py-2 text-xs">{fmtQty(wo.completedQty)}/{fmtQty(wo.plannedQty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                <div className="text-3xl mb-2">✅</div>
                <div className="text-green-700 font-semibold">No overdue work orders</div>
                <div className="text-green-600 text-sm mt-1">All production is on schedule</div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
