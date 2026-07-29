'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const PRIORITY_COLORS = { LOW:'bg-gray-100 text-gray-500', MEDIUM:'bg-blue-50 text-blue-600', HIGH:'bg-orange-100 text-orange-600', URGENT:'bg-red-100 text-red-700' };

export default function ProductionDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [activeWos, setActiveWos] = useState([]);
  const [today, setToday] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [quality, setQuality] = useState(null);
  const [hourly, setHourly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const h = { Authorization: `Bearer ${getToken()}` };
    const [ov, wos, td, al, q, hm] = await Promise.all([
      fetch(`${API}/production-dashboard/overview`, {headers:h}).then(r=>r.ok?r.json():null),
      fetch(`${API}/production-dashboard/active-wos`, {headers:h}).then(r=>r.ok?r.json():[]),
      fetch(`${API}/production-dashboard/today`, {headers:h}).then(r=>r.ok?r.json():null),
      fetch(`${API}/production-dashboard/alerts`, {headers:h}).then(r=>r.ok?r.json():null),
      fetch(`${API}/production-dashboard/quality`, {headers:h}).then(r=>r.ok?r.json():null),
      fetch(`${API}/production-dashboard/hourly-monitoring`, {headers:h}).then(r=>r.ok?r.json():null),
    ]);
    setOverview(ov); setActiveWos(wos||[]); setToday(td); setAlerts(al); setQuality(q); setHourly(hm);
    setLastRefresh(new Date()); setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Production Dashboard</h1>
            <p className="text-gray-400 text-xs mt-1">Last refreshed: {lastRefresh.toLocaleTimeString()}</p>
          </div>
          <button onClick={fetchAll} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">↻ Refresh</button>
        </div>

        {loading && <div className="text-center py-20 text-gray-400">Loading dashboard...</div>}

        {!loading && overview && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {[
                { label: 'In Progress', value: overview.workOrders.inProgress, color: 'bg-yellow-500' },
                { label: 'Released', value: overview.workOrders.released, color: 'bg-blue-500' },
                { label: 'Completed', value: overview.workOrders.completed, color: 'bg-green-600' },
                { label: 'Today Output', value: overview.today.goodQty, color: 'bg-purple-600' },
                { label: 'Quality Pass Rate', value: `${overview.quality.overallPassRate}%`, color: overview.quality.overallPassRate>=90?'bg-green-600':'bg-orange-500' },
              ].map(k => (
                <div key={k.label} className={`${k.color} rounded-xl p-5`}>
                  <div className="text-2xl font-bold text-white">{k.value}</div>
                  <div className="text-sm font-medium text-white mt-1 opacity-90">{k.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl border p-4">
                <div className="text-xs text-gray-500 mb-1">Production Cost (Total)</div>
                <div className="text-xl font-bold text-blue-700">{fmt(overview.costs.totalProductionCost)}</div>
                <div className="text-xs text-gray-400 mt-1">Material: {fmt(overview.costs.totalMaterialCost)}</div>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="text-xs text-gray-500 mb-1">FG Receipts</div>
                <div className="text-xl font-bold text-green-700">{overview.fgReceipts.total}</div>
                <div className="text-xs text-orange-500 mt-1">{overview.fgReceipts.pendingFgr} pending receipt</div>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="text-xs text-gray-500 mb-1">Today Scrap</div>
                <div className="text-xl font-bold text-red-600">{overview.today.scrapQty}</div>
                <div className="text-xs text-gray-400 mt-1">{overview.today.entries} entries today</div>
              </div>
            </div>

            {/* Active WOs */}
            <div className="bg-white rounded-xl border shadow-sm mb-6">
              <div className="p-4 border-b font-semibold text-gray-700">Active Work Orders (Released + In Progress)</div>
              <div className="divide-y">
                {activeWos.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">No active work orders</div>}
                {activeWos.map(wo => (
                  <div key={wo.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-blue-600">{wo.woNumber}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${PRIORITY_COLORS[wo.priority]}`}>{wo.priority}</span>
                        <span className="text-sm text-gray-700">{wo.productName}</span>
                        {wo.isOverdue && <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">OVERDUE</span>}
                        {!wo.materialIssued && <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">No material issued</span>}
                      </div>
                      <span className="text-xs text-gray-400">{wo.daysLeft >= 0 ? `${wo.daysLeft}d left` : `${-wo.daysLeft}d overdue`}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${wo.progressPct>=100?'bg-green-500':'bg-blue-500'}`} style={{width:`${Math.min(100,wo.progressPct)}%`}}></div>
                      </div>
                      <span className="text-xs text-gray-500">{wo.completedQty}/{wo.plannedQty} ({wo.progressPct}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hourly Monitoring (Phase D) */}
            {hourly && (
              <div className="bg-white rounded-xl border shadow-sm mb-6">
                <div className="p-4 border-b flex items-center justify-between">
                  <span className="font-semibold text-gray-700">Hourly Monitoring — {hourly.date}</span>
                  <div className="flex gap-3 text-xs">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">{hourly.workOrders.startedToday} started today</span>
                    <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full font-medium">{hourly.workOrders.completedToday} completed today</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-b">
                  <div>
                    <div className="text-xs text-gray-500">Manpower Allocated</div>
                    <div className="text-lg font-bold text-gray-800">{hourly.manpower.totalAllocatedToday}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Idle Headcount</div>
                    <div className={`text-lg font-bold ${hourly.manpower.idleHeadcount>0?'text-orange-600':'text-gray-800'}`}>{hourly.manpower.idleHeadcount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Utilization</div>
                    <div className="text-lg font-bold text-blue-700">{hourly.manpower.utilizationPct}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Overall Good vs Total</div>
                    <div className="text-lg font-bold text-green-700">{hourly.efficiency.overallGoodVsTotalPct}%</div>
                  </div>
                </div>

                {/* Hourly output bar chart */}
                <div className="p-4 border-b">
                  <div className="text-xs font-semibold text-gray-600 mb-2">Output by Hour</div>
                  <div className="flex items-end gap-1 h-24">
                    {hourly.hourlyOutput.map(h => {
                      const maxQty = Math.max(1, ...hourly.hourlyOutput.map(x => x.goodQty + x.scrapQty));
                      const total = h.goodQty + h.scrapQty;
                      const heightPct = Math.max(2, Math.round(total / maxQty * 100));
                      return (
                        <div key={h.hour} className="flex-1 flex flex-col items-center justify-end h-full" title={`${h.hour} — good:${h.goodQty} scrap:${h.scrapQty}`}>
                          <div className="w-full bg-blue-500 rounded-t" style={{ height: `${total > 0 ? heightPct : 2}%`, opacity: total > 0 ? 1 : 0.15 }}></div>
                          <div className="text-[9px] text-gray-400 mt-1 rotate-45 origin-left whitespace-nowrap">{h.hour}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-4 divide-y md:divide-y-0">
                  {/* Stage-wise output */}
                  <div className="p-4">
                    <div className="text-xs font-semibold text-gray-600 mb-2">Output by Stage (Today)</div>
                    {hourly.stageWiseOutput.length === 0 && <div className="text-xs text-gray-400 py-3">No confirmed production entries yet today</div>}
                    {hourly.stageWiseOutput.map(s => (
                      <div key={s.stageName} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0">
                        <span className="font-medium text-gray-700">{s.stageName}</span>
                        <span className="text-gray-500">{s.workOrderCount} WO{s.workOrderCount!==1?'s':''}</span>
                        <span className="text-green-600 font-semibold">{s.goodQty} good</span>
                        <span className="text-red-500">{s.scrapQty} scrap</span>
                      </div>
                    ))}
                  </div>

                  {/* Stage transfers */}
                  <div className="p-4">
                    <div className="text-xs font-semibold text-gray-600 mb-2">Stage Transfers Today ({hourly.transfers.todayCount})</div>
                    {hourly.transfers.list.length === 0 && <div className="text-xs text-gray-400 py-3">No transfers logged today</div>}
                    {hourly.transfers.list.slice(0, 5).map(t => (
                      <div key={t.id} className="text-xs py-1.5 border-b last:border-0">
                        <span className="font-mono text-blue-600">{t.fromWoNumber}</span> → <span className="font-mono text-blue-600">{t.toWoNumber}</span>
                        <span className="text-gray-500 ml-2">{t.itemCode} × {t.qty}</span>
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${t.status==='RECEIVED'?'bg-green-50 text-green-600':'bg-yellow-50 text-yellow-600'}`}>{t.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Manpower costing estimate */}
                <div className="p-4 bg-gray-50 rounded-b-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-600">Manpower Cost Estimate (Today)</span>
                    <span className="text-lg font-bold text-blue-700">{fmt(hourly.costing.totalManpowerCostToday)}</span>
                  </div>
                  {hourly.costing.headcountWithoutRate > 0 && (
                    <div className="text-xs text-orange-500 mb-1">{hourly.costing.headcountWithoutRate} allocated headcount has no matched Employee salary record — excluded from this estimate.</div>
                  )}
                  <div className="text-[10px] text-gray-400 leading-relaxed">{hourly.costing.assumptionNote}</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border shadow-sm">
                <div className="p-4 border-b flex justify-between">
                  <span className="font-semibold text-gray-700">Alerts</span>
                  {alerts?.totalAlerts > 0 && <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold">{alerts.totalAlerts}</span>}
                </div>
                <div className="p-4 space-y-3">
                  {alerts?.overdueWos?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-red-600 mb-1">🔴 OVERDUE WORK ORDERS</div>
                      {alerts.overdueWos.map((w,i)=><div key={i} className="text-xs py-1 flex justify-between"><span className="font-mono text-blue-600">{w.woNumber}</span><span className="text-gray-500">{w.productName}</span></div>)}
                    </div>
                  )}
                  {alerts?.releasedNoIssue?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-yellow-600 mb-1">🟡 RELEASED — NO MATERIAL ISSUED</div>
                      {alerts.releasedNoIssue.map((w,i)=><div key={i} className="text-xs py-1 flex justify-between"><span className="font-mono text-blue-600">{w.woNumber}</span><span className="text-gray-500">{w.productName}</span></div>)}
                    </div>
                  )}
                  {alerts?.failedQc?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-red-600 mb-1">🔴 QC FAILURES</div>
                      {alerts.failedQc.map((q,i)=><div key={i} className="text-xs py-1 flex justify-between"><span className="font-mono text-blue-600">{q.qcNumber}</span><span className="text-gray-500">{q.workOrder?.woNumber}</span></div>)}
                    </div>
                  )}
                  {alerts?.pendingFgr?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-orange-600 mb-1">🟠 COMPLETED — FGR PENDING</div>
                      {alerts.pendingFgr.map((w,i)=><div key={i} className="text-xs py-1 flex justify-between"><span className="font-mono text-blue-600">{w.woNumber}</span><span className="text-gray-500">qty:{w.completedQty}</span></div>)}
                    </div>
                  )}
                  {(!alerts || alerts.totalAlerts === 0) && <div className="text-center py-6 text-green-600 text-sm">✅ No alerts — all good!</div>}
                </div>
              </div>

              {/* Quality */}
              <div className="bg-white rounded-xl border shadow-sm">
                <div className="p-4 border-b font-semibold text-gray-700">Quality Metrics (Recent 20)</div>
                <div className="p-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-2">
                    <span>Overall Pass Rate</span><span>{quality?.overallPassRate}%</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-3 mb-4">
                    <div className={`h-3 rounded-full ${quality?.overallPassRate>=95?'bg-green-500':quality?.overallPassRate>=80?'bg-yellow-500':'bg-red-500'}`} style={{width:`${quality?.overallPassRate||0}%`}}></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      {label:'PASS', value: quality?.byResult?.PASS, color:'text-green-600 bg-green-50'},
                      {label:'FAIL', value: quality?.byResult?.FAIL, color:'text-red-600 bg-red-50'},
                      {label:'CONDITIONAL', value: quality?.byResult?.CONDITIONAL, color:'text-yellow-600 bg-yellow-50'},
                    ].map(r=>(
                      <div key={r.label} className={`rounded-lg p-2 ${r.color}`}>
                        <div className="text-lg font-bold">{r.value||0}</div>
                        <div className="text-xs">{r.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
