'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
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

function NCRTrendChart({ data }) {
  const max = Math.max(...data.map(d=>d.ncrs||0), 1);
  return (
    <div className="flex items-end gap-1 h-28">
      {data.map((d,i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="text-xs text-gray-400">{d.ncrs>0?d.ncrs:''}</div>
          <div className={`${d.ncrs>0?'bg-red-400':'bg-gray-200'} rounded-t w-full transition-all`} style={{height:`${Math.max(4,(d.ncrs||0)/max*100)}%`}}></div>
          <div className="text-xs text-gray-400 truncate w-full text-center">{d.month}</div>
        </div>
      ))}
    </div>
  );
}

function DonutSegments({ data, colors }) {
  const total = Object.values(data||{}).reduce((s,v)=>s+v,0);
  if (!total) return <div className="text-center text-gray-400 py-4">No data</div>;
  return (
    <div className="space-y-2">
      {Object.entries(data||{}).map(([key,val],i)=>{
        const pct = Math.round(val/total*100);
        const color = colors[key] || 'bg-gray-400';
        return (
          <div key={key} className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${color.replace('text-','bg-').split(' ')[0]}`}></div>
            <span className="text-xs text-gray-600 w-28">{key}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-4">
              <div className={`${color.split(' ')[0]} h-4 rounded-full`} style={{width:`${pct}%`}}></div>
            </div>
            <span className="text-sm font-bold w-6">{val}</span>
            <span className="text-xs text-gray-400 w-8">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

export default function QualityAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const res = await fetch(`${API}/analytics/quality-deep`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(()=>{ fetchData(); }, []);

  const score = data?.kpis?.qualityScore || 0;
  const scoreColor = score>=80?'text-green-600':score>=60?'text-yellow-600':'text-red-600';
  const scoreBg = score>=80?'bg-green-50 border-green-200':score>=60?'bg-yellow-50 border-yellow-200':'bg-red-50 border-red-200';

  const SOURCE_COLORS = { IQC:'bg-blue-400', IPQC:'bg-purple-400', OQC:'bg-teal-400', CUSTOMER:'bg-orange-400', SUPPLIER:'bg-red-400' };
  const SEVERITY_COLORS = { CRITICAL:'bg-red-500', MAJOR:'bg-orange-400', MINOR:'bg-yellow-400' };
  const STATUS_COLORS = { OPEN:'bg-red-400', UNDER_REVIEW:'bg-orange-400', CAPA_PENDING:'bg-yellow-400', CLOSED:'bg-green-500' };
  const CAPA_COLORS = { ASSIGNED:'bg-blue-400', IN_PROGRESS:'bg-yellow-400', COMPLETED:'bg-green-400', VERIFIED:'bg-emerald-500' };

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quality Analytics</h1>
            <p className="text-gray-500 text-sm mt-1">NCR trends, CAPA performance and OQC pass rates</p>
          </div>
          <button onClick={fetchData} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">↻ Refresh</button>
        </div>

        {loading ? <div className="text-center py-16 text-gray-400">Loading analytics...</div> : !data ? <div className="text-center py-16 text-gray-400">No data</div> : (
          <div className="space-y-6">
            {/* Quality Score + KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className={`col-span-2 md:col-span-1 ${scoreBg} rounded-xl p-5 border text-center`}>
                <div className="text-xs text-gray-500 mb-1">Quality Score</div>
                <div className={`text-4xl font-bold ${scoreColor}`}>{score}</div>
                <div className="text-xs text-gray-400 mt-1">out of 100</div>
              </div>
              <KpiCard label="Total NCRs" value={data.kpis?.ncrTotal} sub={`${data.kpis?.ncrOpen} open`} color={data.kpis?.ncrOpen>0?'bg-red-50':'bg-green-50'} textColor={data.kpis?.ncrOpen>0?'text-red-700':'text-green-700'} />
              <KpiCard label="Critical NCRs" value={data.kpis?.ncrCritical} sub="High severity" color={data.kpis?.ncrCritical>0?'bg-red-50':'bg-green-50'} textColor={data.kpis?.ncrCritical>0?'text-red-700':'text-green-700'} />
              <KpiCard label="CAPA Rate" value={fmtPct(data.kpis?.capaCompletionRate)} sub={`${data.kpis?.capaCompleted}/${data.kpis?.capaTotal} done`} color={data.kpis?.capaCompletionRate>=80?'bg-green-50':'bg-orange-50'} textColor={data.kpis?.capaCompletionRate>=80?'text-green-700':'text-orange-700'} />
              <KpiCard label="OQC Pass Rate" value={fmtPct(data.kpis?.oqcPassRate)} sub={`${data.kpis?.oqcPassed}/${data.kpis?.oqcTotal} passed`} color={data.kpis?.oqcPassRate>=90?'bg-green-50':'bg-yellow-50'} textColor={data.kpis?.oqcPassRate>=90?'text-green-700':'text-yellow-700'} />
              <KpiCard label="Overdue CAPAs" value={data.kpis?.capaOverdue} sub="Past due date" color={data.kpis?.capaOverdue>0?'bg-red-50':'bg-green-50'} textColor={data.kpis?.capaOverdue>0?'text-red-700':'text-green-700'} />
            </div>

            {/* NCR Trend */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-bold text-gray-700 mb-4">NCR Trend (12 Months)</h3>
              <NCRTrendChart data={data.ncrTrend||[]} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* NCR by Source */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-bold text-gray-700 mb-4">NCR by Source</h3>
                <DonutSegments data={data.bySource||{}} colors={SOURCE_COLORS} />
              </div>

              {/* NCR by Severity */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-bold text-gray-700 mb-4">NCR by Severity</h3>
                <DonutSegments data={data.bySeverity||{}} colors={SEVERITY_COLORS} />
              </div>

              {/* NCR by Status */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-bold text-gray-700 mb-4">NCR Status Distribution</h3>
                <DonutSegments data={data.byStatus||{}} colors={STATUS_COLORS} />
              </div>

              {/* CAPA by Status */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-bold text-gray-700 mb-4">CAPA Status Distribution</h3>
                <DonutSegments data={data.capaByStatus||{}} colors={CAPA_COLORS} />
              </div>
            </div>

            {/* Top Defect Items */}
            {data.topDefectItems?.length > 0 && (
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-bold text-gray-700 mb-4">Top Defect Items</h3>
                <div className="space-y-2">
                  {data.topDefectItems.map((item,i)=>{
                    const max = data.topDefectItems[0]?.count||1;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs flex items-center justify-center font-bold">{i+1}</span>
                        <span className="text-sm text-gray-700 w-48 truncate">{item.itemName}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-4">
                          <div className="bg-red-400 h-4 rounded-full" style={{width:`${(item.count/max*100).toFixed(0)}%`}}></div>
                        </div>
                        <span className="text-sm font-bold text-red-600 w-8">{item.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* OQC Summary */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-bold text-gray-700 mb-4">OQC Inspection Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-gray-700">{data.kpis?.oqcTotal}</div>
                  <div className="text-xs text-gray-500 mt-1">Total Inspections</div>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-green-700">{data.kpis?.oqcPassed}</div>
                  <div className="text-xs text-gray-500 mt-1">Passed ✅</div>
                </div>
                <div className="bg-red-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-red-700">{data.kpis?.oqcFailed}</div>
                  <div className="text-xs text-gray-500 mt-1">Failed ❌</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Pass Rate</span>
                  <span>{fmtPct(data.kpis?.oqcPassRate)}</span>
                </div>
                <div className="bg-gray-200 rounded-full h-4 flex overflow-hidden">
                  <div className="bg-green-500 h-4 transition-all" style={{width:`${data.kpis?.oqcPassRate||0}%`}}></div>
                  <div className="bg-red-400 h-4 transition-all" style={{width:`${100-(data.kpis?.oqcPassRate||0)}%`}}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
