'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const REPORTS = [
  {key:'purchase-summary', label:'Purchase Summary', icon:'🛒'},
  {key:'sales-summary', label:'Sales Summary', icon:'💰'},
  {key:'inventory-summary', label:'Inventory Summary', icon:'📦'},
  {key:'production-summary', label:'Production Summary', icon:'🏭'},
  {key:'quality-summary', label:'Quality Summary', icon:'✅'},
  {key:'finance-summary', label:'Finance Summary', icon:'📊'},
];

export default function MisReportsPage() {
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth()+1);
  const [year, setYear] = useState(now.getFullYear());

  async function fetchReport(report) {
    setLoading(true); setError(''); setData(null);
    try {
      const res = await fetch(`${API}/mis-reports/${report.key}?month=${month}&year=${year}`, {headers:{Authorization:`Bearer ${getToken()}`}});
      if (res.ok) setData(await res.json());
      else { const d=await res.json(); setError(d.message||'Failed to load report'); }
    } catch(e) { setError('Report not available'); }
    setLoading(false);
  }

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">MIS Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Management Information System — cross-functional summaries</p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-3">
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b text-sm font-bold text-gray-700">Select Report</div>
              <div className="divide-y">
                {REPORTS.map(r=>(
                  <button key={r.key} onClick={()=>{setSelected(r);setData(null);setError('');}} className={`w-full text-left p-4 hover:bg-gray-50 ${selected?.key===r.key?'bg-indigo-50 border-r-4 border-indigo-600':''}`}>
                    <div className="flex items-center gap-2">
                      <span>{r.icon}</span>
                      <span className={`text-sm font-medium ${selected?.key===r.key?'text-indigo-700':'text-gray-700'}`}>{r.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-12 md:col-span-9">
            {selected ? (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border shadow-sm p-4">
                  <div className="flex gap-3 items-end flex-wrap">
                    <h2 className="font-bold text-gray-800 mr-2">{selected.icon} {selected.label}</h2>
                    <select className="border rounded-lg px-3 py-2 text-sm" value={month} onChange={e=>setMonth(Number(e.target.value))}>
                      {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
                    </select>
                    <input type="number" className="border rounded-lg px-3 py-2 text-sm w-24" value={year} onChange={e=>setYear(Number(e.target.value))} />
                    <button onClick={()=>fetchReport(selected)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">▶ Run</button>
                  </div>
                  {error&&<div className="mt-3 bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                </div>
                {loading&&<div className="text-center py-10 text-gray-400">Loading report...</div>}
                {data&&!loading&&(
                  <div className="bg-white rounded-xl border shadow-sm p-5">
                    <pre className="text-xs text-gray-700 overflow-auto">{JSON.stringify(data, null, 2)}</pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border shadow-sm p-16 text-center">
                <div className="text-5xl mb-4">📊</div>
                <div className="text-gray-400">Select a report from the left panel</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
