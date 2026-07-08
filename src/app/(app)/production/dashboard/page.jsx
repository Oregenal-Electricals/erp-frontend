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
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const h = { Authorization: `Bearer ${getToken()}` };
    const [ov, wos, td, al, q] = await Promise.all([
      fetch(`${API}/production-dashboard/overview`, {headers:h}).then(r=>r.ok?r.json():null),
      fetch(`${API}/production-dashboard/active-wos`, {headers:h}).then(r=>r.ok?r.json():[]),
      fetch(`${API}/production-dashboard/today`, {headers:h}).then(r=>r.ok?r.json():null),
      fetch(`${API}/production-dashboard/alerts`, {headers:h}).then(r=>r.ok?r.json():null),
      fetch(`${API}/production-dashboard/quality`, {headers:h}).then(r=>r.ok?r.json():null),
    ]);
    setOverview(ov); setActiveWos(wos||[]); setToday(td); setAlerts(al); setQuality(q);
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Alerts */}
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
