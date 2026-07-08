'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const TABS = ['WO Completion','Shift Production','Material Consumption','Scrap Analysis','Quality Summary'];
const STATUS_COLORS = { DRAFT:'bg-gray-100 text-gray-600', RELEASED:'bg-blue-100 text-blue-700', IN_PROGRESS:'bg-yellow-100 text-yellow-700', COMPLETED:'bg-green-100 text-green-700', CANCELLED:'bg-red-100 text-red-600' };
const RESULT_COLORS = { PASS:'text-green-600', FAIL:'text-red-600', CONDITIONAL:'text-yellow-600' };

export default function ProductionReportsPage() {
  const [activeTab, setActiveTab] = useState('WO Completion');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [status, setStatus] = useState('');
  const [shift, setShift] = useState('');

  async function fetchData() {
    setLoading(true); setData(null);
    const params = new URLSearchParams();
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    if (status && activeTab==='WO Completion') params.set('status', status);
    if (shift && activeTab==='Shift Production') params.set('shift', shift);

    const endpoints = {
      'WO Completion': 'wo-completion',
      'Shift Production': 'shift-production',
      'Material Consumption': 'material-consumption',
      'Scrap Analysis': 'scrap-analysis',
      'Quality Summary': 'quality-summary',
    };
    const res = await fetch(`${API}/production-reports/${endpoints[activeTab]}?${params}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [activeTab]);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Production Reports</h1>
          <p className="text-gray-500 text-sm mt-1">WO completion, shift production, material consumption, scrap & quality analysis</p>
        </div>

        <div className="flex gap-2 mb-6 border-b overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => { setActiveTab(t); setData(null); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${activeTab===t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border p-4 mb-4 flex gap-3 flex-wrap items-end">
          {['Shift Production','Scrap Analysis','Quality Summary'].includes(activeTab) && (
            <>
              <div><label className="block text-xs text-gray-500 mb-1">From Date</label><input type="date" className="border rounded-lg px-3 py-2 text-sm" value={fromDate} onChange={e=>setFromDate(e.target.value)} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">To Date</label><input type="date" className="border rounded-lg px-3 py-2 text-sm" value={toDate} onChange={e=>setToDate(e.target.value)} /></div>
            </>
          )}
          {activeTab === 'WO Completion' && (
            <div><label className="block text-xs text-gray-500 mb-1">Status</label>
              <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e=>setStatus(e.target.value)}>
                <option value="">All</option>
                {Object.keys(STATUS_COLORS).map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          )}
          {activeTab === 'Shift Production' && (
            <div><label className="block text-xs text-gray-500 mb-1">Shift</label>
              <select className="border rounded-lg px-3 py-2 text-sm" value={shift} onChange={e=>setShift(e.target.value)}>
                <option value="">All</option>
                {['MORNING','EVENING','NIGHT'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          )}
          <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Apply</button>
        </div>

        {loading && <div className="text-center py-12 text-gray-400">Generating report...</div>}

        {!loading && data && activeTab === 'WO Completion' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-xl p-4"><div className="text-2xl font-bold text-blue-700">{data.totalWos}</div><div className="text-xs text-gray-500 mt-1">Total Work Orders</div></div>
              <div className="bg-green-50 rounded-xl p-4"><div className="text-2xl font-bold text-green-700">{data.avgAchievement}%</div><div className="text-xs text-gray-500 mt-1">Avg Achievement</div></div>
              <div className="bg-purple-50 rounded-xl p-4"><div className="text-2xl font-bold text-purple-700">{data.totalCompleted}/{data.totalPlanned}</div><div className="text-xs text-gray-500 mt-1">Completed/Planned</div></div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>{['WO No.','Product','Status','Planned','Completed','Rejected','Achievement','Unit Cost','Total Cost'].map(h=><th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {data.data.map((wo,i)=>(
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs text-blue-600 font-bold">{wo.woNumber}</td>
                      <td className="px-3 py-2 text-xs">{wo.productName}</td>
                      <td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[wo.status]}`}>{wo.status?.replace(/_/g,' ')}</span></td>
                      <td className="px-3 py-2 text-xs">{wo.plannedQty}</td>
                      <td className="px-3 py-2 text-xs font-bold text-green-600">{wo.completedQty}</td>
                      <td className="px-3 py-2 text-xs text-red-500">{wo.rejectedQty}</td>
                      <td className="px-3 py-2 text-xs font-bold">{wo.achievementPct}%</td>
                      <td className="px-3 py-2 text-xs">{fmt(wo.unitCost)}</td>
                      <td className="px-3 py-2 text-xs font-bold">{fmt(wo.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && data && activeTab === 'Shift Production' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {data.byShift.map(s=>(
                <div key={s.shift} className="bg-white rounded-xl border p-4">
                  <div className="text-sm font-semibold text-gray-700">{s.shift}</div>
                  <div className="text-xl font-bold text-green-600 mt-1">{s.goodQty}</div>
                  <div className="text-xs text-gray-400">good · {s.scrapQty} scrap · {s.entries} entries</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
              <div className="p-4 border-b font-semibold text-gray-700">By Operator</div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr>{['Operator','Entries','Good Qty','Scrap Qty'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y">{data.byOperator.map((o,i)=>(<tr key={i}><td className="px-3 py-2 text-xs">{o.operator}</td><td className="px-3 py-2 text-xs">{o.entries}</td><td className="px-3 py-2 text-xs font-bold text-green-600">{o.goodQty}</td><td className="px-3 py-2 text-xs text-red-500">{o.scrapQty}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && data && activeTab === 'Material Consumption' && (
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b flex gap-6"><span className="font-semibold text-gray-700">Material Consumption</span><span className="text-sm text-gray-500">{data.totalItems} items</span><span className="text-sm font-bold text-blue-700">{fmt(data.totalValue)}</span></div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr>{['Item Code','Item Name','UOM','Total Issued','WO Count','Value'].map(h=><th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr></thead>
              <tbody className="divide-y">{data.data.map((d,i)=>(<tr key={i} className="hover:bg-gray-50"><td className="px-3 py-2 font-mono text-xs text-blue-600 font-bold">{d.itemCode}</td><td className="px-3 py-2 text-xs">{d.itemName}</td><td className="px-3 py-2 text-xs text-gray-500">{d.uom}</td><td className="px-3 py-2 text-xs font-bold">{d.totalIssued}</td><td className="px-3 py-2 text-xs">{d.woCount}</td><td className="px-3 py-2 text-xs font-bold">{fmt(d.totalValue)}</td></tr>))}</tbody>
            </table>
          </div>
        )}

        {!loading && data && activeTab === 'Scrap Analysis' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-red-50 rounded-xl p-4"><div className="text-2xl font-bold text-red-700">{data.overallScrapRate}%</div><div className="text-xs text-gray-500 mt-1">Overall Scrap Rate</div></div>
              <div className="bg-green-50 rounded-xl p-4"><div className="text-2xl font-bold text-green-700">{data.totalGood}</div><div className="text-xs text-gray-500 mt-1">Total Good</div></div>
              <div className="bg-red-50 rounded-xl p-4"><div className="text-2xl font-bold text-red-600">{data.totalScrap}</div><div className="text-xs text-gray-500 mt-1">Total Scrap</div></div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b font-semibold text-gray-700">By Product</div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr>{['Product','Good Qty','Scrap Qty','Scrap Rate'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y">{data.byProduct.map((p,i)=>(<tr key={i}><td className="px-3 py-2 text-xs">{p.productName}</td><td className="px-3 py-2 text-xs font-bold text-green-600">{p.totalGood}</td><td className="px-3 py-2 text-xs font-bold text-red-500">{p.totalScrap}</td><td className="px-3 py-2 text-xs font-bold">{p.scrapRate}%</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && data && activeTab === 'Quality Summary' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-4"><div className="text-2xl font-bold text-blue-700">{data.totalInspections}</div><div className="text-xs text-gray-500 mt-1">Total Inspections</div></div>
              <div className="bg-green-50 rounded-xl p-4"><div className="text-2xl font-bold text-green-700">{data.overallPassRate}%</div><div className="text-xs text-gray-500 mt-1">Overall Pass Rate</div></div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b font-semibold text-gray-700">By Inspection Stage</div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr>{['Stage','Total','Pass','Fail','Conditional','Pass Rate'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y">{data.byStage.map((s,i)=>(<tr key={i}><td className="px-3 py-2 text-xs">{s.stage?.replace(/_/g,' ')}</td><td className="px-3 py-2 text-xs">{s.total}</td><td className="px-3 py-2 text-xs font-bold text-green-600">{s.pass}</td><td className="px-3 py-2 text-xs font-bold text-red-600">{s.fail}</td><td className="px-3 py-2 text-xs font-bold text-yellow-600">{s.conditional}</td><td className="px-3 py-2 text-xs font-bold">{s.passRate}%</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && !data && <div className="text-center py-12 text-gray-400">Click Apply to generate report</div>}
      </div>
    </AppLayout>
  );
}
