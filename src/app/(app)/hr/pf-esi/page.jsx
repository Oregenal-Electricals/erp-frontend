'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TABS = ['Statutory Rates','PF Challan','ESI Challan','PF Register','ESI Register'];

export default function PfEsiPage() {
  const [activeTab, setActiveTab] = useState('Statutory Rates');
  const [rates, setRates] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth()+1);
  const [year, setYear] = useState(now.getFullYear());

  async function fetchRates() {
    const res = await fetch(`${API}/pf-esi/rates`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setRates(await res.json());
  }

  async function fetchData(tab) {
    if (!getToken()) return;
    setLoading(true); setError(''); setData(null);
    const endpointMap = {
      'PF Challan': `pf-challan?month=${month}&year=${year}`,
      'ESI Challan': `esi-challan?month=${month}&year=${year}`,
      'PF Register': `pf-register?year=${year}`,
      'ESI Register': `esi-register?year=${year}`,
    };
    const ep = endpointMap[tab];
    if (!ep) { setLoading(false); return; }
    const res = await fetch(`${API}/pf-esi/${ep}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setData(await res.json());
    else { const d=await res.json(); setError(d.message||'Failed'); }
    setLoading(false);
  }

  useEffect(()=>{ fetchRates(); },[]);
  useEffect(()=>{ if (activeTab!=='Statutory Rates') fetchData(activeTab); },[activeTab, month, year]);

  async function exportCsv() {
    if (!data) return;
    const rows = data.entries || data.employees || [];
    if (!rows.length) return;
    const headers = Object.keys(rows[0]).filter(k=>typeof rows[0][k]!=='object');
    const csv = [headers.join(','), ...rows.map(r=>headers.map(h=>JSON.stringify(r[h]||'')).join(','))].join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`${activeTab.replace(' ','-').toLowerCase()}-${month||year}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PF & ESI Management</h1>
            <p className="text-gray-500 text-sm mt-1">Statutory compliance — Provident Fund & Employee State Insurance</p>
          </div>
          {data && (data.entries||data.employees) && (
            <button onClick={exportCsv} className="px-4 py-2 border border-green-300 text-green-700 rounded-lg text-sm hover:bg-green-50">⬇ Export CSV</button>
          )}
        </div>

        <div className="flex gap-2 mb-4 border-b overflow-x-auto">
          {TABS.map(t=><button key={t} onClick={()=>{setActiveTab(t);setData(null);setError('');}} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${activeTab===t?'border-indigo-600 text-indigo-600':'border-transparent text-gray-500'}`}>{t}</button>)}
        </div>

        {/* Period Filter */}
        {activeTab!=='Statutory Rates' && (
          <div className="flex gap-3 mb-4 items-end">
            {(activeTab==='PF Challan'||activeTab==='ESI Challan') && (
              <div><label className="block text-xs text-gray-500 mb-1">Month</label>
                <select className="border rounded-lg px-3 py-2 text-sm" value={month} onChange={e=>setMonth(Number(e.target.value))}>
                  {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
                </select>
              </div>
            )}
            <div><label className="block text-xs text-gray-500 mb-1">Year</label>
              <input type="number" className="border rounded-lg px-3 py-2 text-sm w-24" value={year} onChange={e=>setYear(Number(e.target.value))} />
            </div>
            <button onClick={()=>fetchData(activeTab)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Fetch</button>
          </div>
        )}

        {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm mb-4">{error}</div>}

        {/* STATUTORY RATES */}
        {activeTab==='Statutory Rates' && rates && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-bold text-blue-700 mb-4">🏦 PF (EPF) Rates</h3>
              <div className="space-y-3">
                {[
                  {label:'Employee Contribution',value:rates.pf.employeeRate,color:'text-blue-600'},
                  {label:'Employer EPF',value:rates.pf.employerEpfRate,color:'text-indigo-600'},
                  {label:'Employer EPS (Pension)',value:rates.pf.employerEpsRate,color:'text-purple-600'},
                  {label:'EDLI',value:rates.pf.edliRate,color:'text-gray-600'},
                  {label:'Admin Charges',value:rates.pf.adminRate,color:'text-gray-600'},
                  {label:'PF Wage Ceiling',value:`₹${rates.pf.wageCeiling.toLocaleString('en-IN')}`,color:'text-orange-600'},
                ].map(r=>(
                  <div key={r.label} className="flex justify-between py-2 border-b last:border-0">
                    <span className="text-gray-600 text-sm">{r.label}</span>
                    <span className={`font-bold text-sm ${r.color}`}>{r.value}</span>
                  </div>
                ))}
                <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 mt-2">{rates.pf.note}</div>
              </div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-bold text-green-700 mb-4">🏥 ESI Rates</h3>
              <div className="space-y-3">
                {[
                  {label:'Employee Contribution',value:rates.esi.employeeRate,color:'text-green-600'},
                  {label:'Employer Contribution',value:rates.esi.employerRate,color:'text-teal-600'},
                  {label:'Wage Ceiling',value:`₹${rates.esi.wageCeiling.toLocaleString('en-IN')}`,color:'text-orange-600'},
                ].map(r=>(
                  <div key={r.label} className="flex justify-between py-2 border-b last:border-0">
                    <span className="text-gray-600 text-sm">{r.label}</span>
                    <span className={`font-bold text-sm ${r.color}`}>{r.value}</span>
                  </div>
                ))}
                <div className="bg-green-50 rounded-lg p-3 text-xs text-green-700 mt-2">{rates.esi.note}</div>
              </div>
            </div>
          </div>
        )}

        {/* PF CHALLAN */}
        {activeTab==='PF Challan' && (
          loading?<div className="text-center py-10 text-gray-400">Loading...</div>
          :data?(
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center"><div className="text-lg font-bold text-blue-700">{fmt(data.totals?.totalPfWage)}</div><div className="text-xs text-gray-500">Total PF Wage</div></div>
                <div className="text-center"><div className="text-lg font-bold text-indigo-700">{fmt(data.totals?.totalEpfEmployee)}</div><div className="text-xs text-gray-500">Employee Contrib</div></div>
                <div className="text-center"><div className="text-lg font-bold text-purple-700">{fmt(data.totals?.totalEpfEmployer+data.totals?.totalEps)}</div><div className="text-xs text-gray-500">Employer Contrib</div></div>
                <div className="text-center"><div className="text-lg font-bold text-green-700">{fmt(data.totals?.totalContrib)}</div><div className="text-xs text-gray-500">Total Deposit</div></div>
              </div>
              <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>{['Emp No','Name','PF No','Basic Wage','PF Wage','EPF Emp','EPF Employer','EPS','EDLI','Total'].map(h=><th key={h} className="px-3 py-3 text-left whitespace-nowrap">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {(data.entries||[]).map((e,i)=>(
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-xs text-blue-600">{e.employeeNumber}</td>
                        <td className="px-3 py-2 font-medium">{e.employeeName}</td>
                        <td className="px-3 py-2 font-mono text-xs">{e.pfNumber}</td>
                        <td className="px-3 py-2">{fmt(e.basicWage)}</td>
                        <td className="px-3 py-2 text-orange-600">{fmt(e.pfWage)}</td>
                        <td className="px-3 py-2 text-blue-600 font-medium">{fmt(e.epfEmployee)}</td>
                        <td className="px-3 py-2 text-indigo-600">{fmt(e.epfEmployer)}</td>
                        <td className="px-3 py-2 text-purple-600">{fmt(e.eps)}</td>
                        <td className="px-3 py-2">{fmt(e.edli)}</td>
                        <td className="px-3 py-2 font-bold text-green-600">{fmt(e.totalContrib)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-xs text-orange-700">⚠ Due Date: {data.dueDate} | Run: {data.runNumber} | Status: {data.payrollStatus}</div>
            </div>
          ):<div className="text-center py-10 text-gray-400">Select month/year and click Fetch</div>
        )}

        {/* ESI CHALLAN */}
        {activeTab==='ESI Challan' && (
          loading?<div className="text-center py-10 text-gray-400">Loading...</div>
          :data?(
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center"><div className="text-lg font-bold text-green-700">{data.applicableCount}</div><div className="text-xs text-gray-500">ESI Applicable</div></div>
                <div className="bg-gray-50 border rounded-xl p-4 text-center"><div className="text-lg font-bold text-gray-600">{data.notApplicableCount}</div><div className="text-xs text-gray-500">Not Applicable</div></div>
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-center"><div className="text-lg font-bold text-teal-700">{fmt(data.totals?.totalEsiEmployee)}</div><div className="text-xs text-gray-500">Employee ESI</div></div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center"><div className="text-lg font-bold text-blue-700">{fmt(data.totals?.totalEsi)}</div><div className="text-xs text-gray-500">Total ESI</div></div>
              </div>
              {data.entries?.length>0?(
                <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>{['Emp No','Name','ESI No','Gross Wage','ESI Employee','ESI Employer','Total ESI'].map(h=><th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.entries.map((e,i)=>(
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-xs text-blue-600">{e.employeeNumber}</td>
                          <td className="px-3 py-2 font-medium">{e.employeeName}</td>
                          <td className="px-3 py-2 font-mono text-xs">{e.esiNumber}</td>
                          <td className="px-3 py-2">{fmt(e.grossWage)}</td>
                          <td className="px-3 py-2 text-green-600 font-medium">{fmt(e.esiEmployee)}</td>
                          <td className="px-3 py-2 text-teal-600">{fmt(e.esiEmployer)}</td>
                          <td className="px-3 py-2 font-bold text-blue-600">{fmt(e.totalEsi)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ):<div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400">No ESI applicable employees this month (all gross above ₹21,000)</div>}
              {data.notApplicable?.length>0&&(
                <div className="bg-gray-50 rounded-xl border p-4">
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">Not Applicable ({data.notApplicable.length} employees)</h4>
                  <div className="flex flex-wrap gap-2">{data.notApplicable.map((e,i)=><span key={i} className="px-2 py-1 bg-white border rounded text-xs">{e.employeeName} — {e.reason}</span>)}</div>
                </div>
              )}
            </div>
          ):<div className="text-center py-10 text-gray-400">Select month/year and click Fetch</div>
        )}

        {/* PF REGISTER */}
        {activeTab==='PF Register' && (
          loading?<div className="text-center py-10 text-gray-400">Loading...</div>
          :data?(
            <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
              <div className="p-4 border-b"><h3 className="font-bold text-gray-700">PF Register {data.year} — {data.employees?.length} employees, {data.monthsProcessed?.length} months processed</h3></div>
              <table className="w-full text-xs min-w-max">
                <thead className="bg-gray-50 text-gray-500 uppercase sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Emp No</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">PF No</th>
                    {(data.monthsProcessed||[]).map(m=><th key={m} className="px-3 py-2 text-center">{MONTHS[m-1]}</th>)}
                    <th className="px-3 py-2 text-right">Annual Basic</th>
                    <th className="px-3 py-2 text-right">Annual PF Emp</th>
                    <th className="px-3 py-2 text-right">Annual PF Emplr</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data.employees||[]).map((e,i)=>(
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-blue-600">{e.employeeNumber}</td>
                      <td className="px-3 py-2 font-medium whitespace-nowrap">{e.employeeName}</td>
                      <td className="px-3 py-2 font-mono">{e.pfNumber}</td>
                      {(data.monthsProcessed||[]).map(m=>(
                        <td key={m} className="px-3 py-2 text-center">{e.months[m]?fmt(e.months[m].pfEmployee):'—'}</td>
                      ))}
                      <td className="px-3 py-2 text-right font-medium">{fmt(e.annualBasic)}</td>
                      <td className="px-3 py-2 text-right text-blue-600 font-bold">{fmt(e.annualPfEmployee)}</td>
                      <td className="px-3 py-2 text-right text-indigo-600 font-bold">{fmt(e.annualPfEmployer)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ):<div className="text-center py-10 text-gray-400">Click Fetch to load PF Register</div>
        )}

        {/* ESI REGISTER */}
        {activeTab==='ESI Register' && (
          loading?<div className="text-center py-10 text-gray-400">Loading...</div>
          :data?(
            data.employees?.length===0?
            <div className="bg-gray-50 rounded-xl p-10 text-center text-gray-400">No ESI applicable employees for {data.year}</div>
            :(
              <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
                <div className="p-4 border-b"><h3 className="font-bold text-gray-700">ESI Register {data.year} — {data.employees?.length} employees</h3></div>
                <table className="w-full text-xs min-w-max">
                  <thead className="bg-gray-50 text-gray-500 uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Emp No</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">ESI No</th>
                      {(data.monthsProcessed||[]).map(m=><th key={m} className="px-3 py-2 text-center">{MONTHS[m-1]}</th>)}
                      <th className="px-3 py-2 text-right">Annual ESI Emp</th>
                      <th className="px-3 py-2 text-right">Annual ESI Emplr</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(data.employees||[]).map((e,i)=>(
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-blue-600">{e.employeeNumber}</td>
                        <td className="px-3 py-2 font-medium whitespace-nowrap">{e.employeeName}</td>
                        <td className="px-3 py-2 font-mono">{e.esiNumber}</td>
                        {(data.monthsProcessed||[]).map(m=>(
                          <td key={m} className="px-3 py-2 text-center">{e.months[m]?fmt(e.months[m].esiEmployee):'—'}</td>
                        ))}
                        <td className="px-3 py-2 text-right text-green-600 font-bold">{fmt(e.annualEsiEmployee)}</td>
                        <td className="px-3 py-2 text-right text-teal-600 font-bold">{fmt(e.annualEsiEmployer)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ):<div className="text-center py-10 text-gray-400">Click Fetch to load ESI Register</div>
        )}
      </div>
    </AppLayout>
  );
}
