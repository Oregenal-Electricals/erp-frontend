'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const ALERT_COLORS = { CRITICAL:'bg-red-50 border-red-200 text-red-700', HIGH:'bg-orange-50 border-orange-200 text-orange-700', MEDIUM:'bg-yellow-50 border-yellow-200 text-yellow-700' };
const ALERT_BADGE = { CRITICAL:'bg-red-100 text-red-700', HIGH:'bg-orange-100 text-orange-700', MEDIUM:'bg-yellow-100 text-yellow-700' };
const SEV_COLORS = { MINOR:'bg-gray-100 text-gray-600', MAJOR:'bg-orange-100 text-orange-700', CRITICAL:'bg-red-100 text-red-700' };

export default function QualityDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [ncrSummary, setNcrSummary] = useState(null);
  const [oqcTrend, setOqcTrend] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    const [ovRes, ncrRes, trendRes, alertRes] = await Promise.all([
      fetch(`${API}/quality-dashboard/overview`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/quality-dashboard/ncr-summary`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/quality-dashboard/oqc-trend`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/quality-dashboard/alerts`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (ovRes.ok) setOverview(await ovRes.json());
    if (ncrRes.ok) setNcrSummary(await ncrRes.json());
    if (trendRes.ok) setOqcTrend(await trendRes.json());
    if (alertRes.ok) setAlerts(await alertRes.json());
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  const maxTrend = oqcTrend ? Math.max(...oqcTrend.trend.map(t => t.total), 1) : 1;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quality Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Real-time quality management overview — NCR, CAPA, OQC, Complaints, Supplier</p>
          </div>
          <button onClick={fetchAll} className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">↻ Refresh</button>
        </div>

        {loading && <div className="text-center py-20 text-gray-400">Loading quality data...</div>}

        {!loading && overview && (
          <>
            {/* KPI CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="text-xs text-gray-500 mb-1">NCR Open</div>
                <div className={`text-2xl font-bold ${overview.ncr.open>0?'text-orange-600':'text-green-600'}`}>{overview.ncr.open}</div>
                <div className="text-xs text-gray-400 mt-1">of {overview.ncr.total} total</div>
                {overview.ncr.critical > 0 && <div className="mt-1 text-xs text-red-600 font-bold">⚠ {overview.ncr.critical} critical</div>}
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="text-xs text-gray-500 mb-1">CAPA Overdue</div>
                <div className={`text-2xl font-bold ${overview.capa.overdue>0?'text-red-600':'text-green-600'}`}>{overview.capa.overdue}</div>
                <div className="text-xs text-gray-400 mt-1">{overview.capa.inProgress} in progress</div>
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="text-xs text-gray-500 mb-1">OQC Pass Rate</div>
                <div className={`text-2xl font-bold ${overview.oqc.passRate>=95?'text-green-600':overview.oqc.passRate>=80?'text-yellow-600':'text-red-600'}`}>{overview.oqc.passRate}%</div>
                <div className="text-xs text-gray-400 mt-1">{overview.oqc.released} released</div>
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="text-xs text-gray-500 mb-1">Complaints Open</div>
                <div className={`text-2xl font-bold ${overview.complaints.open>0?'text-orange-600':'text-green-600'}`}>{overview.complaints.open}</div>
                <div className="text-xs text-gray-400 mt-1">of {overview.complaints.total} total</div>
                {overview.complaints.critical > 0 && <div className="mt-1 text-xs text-red-600 font-bold">⚠ {overview.complaints.critical} critical</div>}
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="text-xs text-gray-500 mb-1">Supplier AVL</div>
                <div className={`text-2xl font-bold ${overview.supplier.blacklisted>0?'text-red-600':'text-green-600'}`}>{overview.supplier.blacklisted}</div>
                <div className="text-xs text-gray-400 mt-1">{overview.supplier.probation} on probation</div>
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="text-xs text-gray-500 mb-1">Open CARs</div>
                <div className={`text-2xl font-bold ${overview.supplier.openCars>0?'text-orange-600':'text-green-600'}`}>{overview.supplier.openCars}</div>
                <div className="text-xs text-gray-400 mt-1">RCA Pending: {overview.rca.draft}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* NCR SUMMARY */}
              {ncrSummary && (
                <div className="bg-white rounded-xl border shadow-sm p-5">
                  <h3 className="font-semibold text-gray-700 mb-4">NCR Breakdown</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-2 font-medium">By Source</div>
                      {ncrSummary.bySource.map(s=>(
                        <div key={s.source} className="flex justify-between items-center py-1 border-b last:border-0">
                          <span className="text-xs text-gray-600">{s.source?.replace(/_/g,' ')}</span>
                          <span className="text-xs font-bold bg-gray-100 px-2 py-0.5 rounded">{s.count}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-2 font-medium">By Severity</div>
                      {ncrSummary.bySeverity.map(s=>(
                        <div key={s.severity} className="flex justify-between items-center py-1 border-b last:border-0">
                          <span className={`text-xs px-2 py-0.5 rounded ${SEV_COLORS[s.severity]}`}>{s.severity}</span>
                          <span className="text-xs font-bold">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {ncrSummary.recent.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 mb-2 font-medium">Recent Open NCRs</div>
                      {ncrSummary.recent.map(n=>(
                        <div key={n.ncrNumber} className="flex items-center gap-2 py-1.5 border-b last:border-0">
                          <span className="font-mono text-xs text-red-600 font-bold">{n.ncrNumber}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${SEV_COLORS[n.severity]}`}>{n.severity}</span>
                          <span className="text-xs text-gray-500 truncate flex-1">{n.description?.slice(0,40)}...</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* OQC TREND */}
              {oqcTrend && (
                <div className="bg-white rounded-xl border shadow-sm p-5">
                  <h3 className="font-semibold text-gray-700 mb-4">OQC Pass Rate Trend (6 Months)</h3>
                  <div className="space-y-3">
                    {oqcTrend.trend.map(t=>(
                      <div key={t.label} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-16 font-mono">{t.label}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                          <div className={`h-full rounded-full flex items-center justify-end pr-2 text-xs font-bold ${t.passRate>=95?'bg-green-500 text-white':t.passRate>=80?'bg-yellow-500 text-gray-900':t.total===0?'bg-gray-200 text-gray-600':'bg-red-500 text-white'}`}
                            style={{width: t.total===0?'0%':`${t.passRate}%`, minWidth: t.total>0?'30px':'0'}}>
                            {t.total > 0 && `${t.passRate}%`}
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 w-12 text-right">{t.total} insp.</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-full inline-block"></span>≥95% Pass</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-500 rounded-full inline-block"></span>80-94%</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded-full inline-block"></span>&lt;80%</span>
                  </div>
                </div>
              )}
            </div>

            {/* ALERTS */}
            {alerts && (
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-700">Quality Alerts</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${alerts.total>0?'bg-red-100 text-red-700':'bg-green-100 text-green-700'}`}>{alerts.total} active</span>
                </div>
                {alerts.total === 0 ? (
                  <div className="text-center py-8 text-green-600 font-medium">✅ No active quality alerts</div>
                ) : (
                  <div className="space-y-2">
                    {alerts.alerts.map((a,i)=>(
                      <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${ALERT_COLORS[a.level]}`}>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${ALERT_BADGE[a.level]}`}>{a.level}</span>
                        <span className="text-sm flex-1">{a.message}</span>
                        {a.dueDate && <span className="text-xs opacity-70">Due: {fmtDate(a.dueDate)}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
