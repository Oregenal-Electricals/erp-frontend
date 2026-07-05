'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
const TABS = ['Declarations','Save Declaration','TDS Challan','TDS Register','Form 16'];

export default function TdsPage() {
  const [activeTab, setActiveTab] = useState('Declarations');
  const [declarations, setDeclarations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const now = new Date();
  const currentFY = now.getMonth() >= 3 ? `${now.getFullYear()}-${String(now.getFullYear()+1).slice(-2)}` : `${now.getFullYear()-1}-${String(now.getFullYear()).slice(-2)}`;
  const [fy, setFy] = useState(currentFY);
  const [month, setMonth] = useState(now.getMonth()+1);
  const [year, setYear] = useState(now.getFullYear());

  const [form, setForm] = useState({
    employeeId:'', financialYear:currentFY,
    section80C:0, section80D:0, section80G:0, section80E:0,
    otherDeductions:0, rentPaid:0, isMetroCity:false,
    regime:'NEW', remarks:''
  });
  const [form16EmpId, setForm16EmpId] = useState('');
  const [form16Data, setForm16Data] = useState(null);
  const [calcPreview, setCalcPreview] = useState(null);

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const [dRes, eRes] = await Promise.all([
      fetch(`${API}/tds?financialYear=${fy}`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/employees?limit=200`, {headers:{Authorization:`Bearer ${getToken()}`}}),
    ]);
    if (dRes.ok) setDeclarations(await dRes.json());
    if (eRes.ok) { const d=await eRes.json(); setEmployees(d.data||[]); }
    setLoading(false);
  }

  useEffect(()=>{ fetchAll(); },[fy]);

  async function handleSave() {
    setSaving(true); setError('');
    const body = {...form,
      section80C:parseFloat(form.section80C)||0,
      section80D:parseFloat(form.section80D)||0,
      section80G:parseFloat(form.section80G)||0,
      section80E:parseFloat(form.section80E)||0,
      otherDeductions:parseFloat(form.otherDeductions)||0,
      rentPaid:parseFloat(form.rentPaid)||0,
    };
    const res = await fetch(`${API}/tds/declaration`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    const d = await res.json();
    if (res.ok) { setCalcPreview(d); fetchAll(); }
    else setError(Array.isArray(d.message)?d.message.join(', '):d.message||'Failed');
    setSaving(false);
  }

  async function fetchChallan() {
    setLoading(true); setError(''); setData(null);
    const res = await fetch(`${API}/tds/challan?month=${month}&year=${year}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setData(await res.json());
    else { const d=await res.json(); setError(d.message||'Failed'); }
    setLoading(false);
  }

  async function fetchRegister() {
    setLoading(true); setError(''); setData(null);
    const res = await fetch(`${API}/tds/register?financialYear=${fy}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setData(await res.json());
    else { const d=await res.json(); setError(d.message||'Failed'); }
    setLoading(false);
  }

  async function fetchForm16() {
    if (!form16EmpId) return;
    setLoading(true); setError(''); setForm16Data(null);
    const res = await fetch(`${API}/tds/form16/${form16EmpId}?financialYear=${fy}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setForm16Data(await res.json());
    else { const d=await res.json(); setError(d.message||'Failed'); }
    setLoading(false);
  }

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">TDS Management</h1>
          <p className="text-gray-500 text-sm mt-1">Section 192 — TDS on salary, investment declarations and Form 16</p>
        </div>

        <div className="flex gap-2 mb-4 border-b overflow-x-auto">
          {TABS.map(t=><button key={t} onClick={()=>{setActiveTab(t);setError('');setData(null);setCalcPreview(null);}} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${activeTab===t?'border-indigo-600 text-indigo-600':'border-transparent text-gray-500'}`}>{t}</button>)}
        </div>

        {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm mb-4">{error}</div>}

        {/* DECLARATIONS */}
        {activeTab==='Declarations' && (
          <div className="space-y-4">
            <div className="flex gap-3 items-center">
              <div><label className="block text-xs text-gray-500 mb-1">Financial Year</label>
                <select className="border rounded-lg px-3 py-2 text-sm" value={fy} onChange={e=>setFy(e.target.value)}>
                  {['2023-24','2024-25','2025-26','2026-27'].map(y=><option key={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm">
              {loading?<div className="text-center py-10 text-gray-400">Loading...</div>
              :declarations.length===0?<div className="text-center py-10 text-gray-400">No declarations for FY {fy}. Use "Save Declaration" to add.</div>:(
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>{['Employee','PAN','Regime','Annual Gross','Taxable Income','Annual Tax','Monthly TDS','80C','80D'].map(h=><th key={h} className="px-3 py-3 text-left whitespace-nowrap">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {declarations.map(d=>(
                      <tr key={d.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="font-medium">{d.employee?.firstName} {d.employee?.lastName}</div>
                          <div className="text-xs text-gray-400 font-mono">{d.employee?.employeeNumber}</div>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{d.employee?.panNumber||'—'}</td>
                        <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-bold ${d.regime==='NEW'?'bg-blue-100 text-blue-700':'bg-purple-100 text-purple-700'}`}>{d.regime}</span></td>
                        <td className="px-3 py-2 text-gray-600">{fmt((d.employee?.basicSalary+d.employee?.hraAmount)*12||0)}</td>
                        <td className="px-3 py-2 font-medium">{fmt(d.taxableIncome)}</td>
                        <td className="px-3 py-2 text-red-600 font-medium">{fmt(d.annualTax)}</td>
                        <td className="px-3 py-2 font-bold text-orange-600">{fmt(d.monthlyTds)}</td>
                        <td className="px-3 py-2 text-green-600">{fmt(d.section80C)}</td>
                        <td className="px-3 py-2 text-green-600">{fmt(d.section80D)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* SAVE DECLARATION */}
        {activeTab==='Save Declaration' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-bold text-gray-700 mb-4">Investment Declaration</h3>
              <div className="space-y-3">
                <div><label className="block text-xs text-gray-500 mb-1">Employee *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.employeeId} onChange={e=>setForm(f=>({...f,employeeId:e.target.value}))}>
                    <option value="">— Select —</option>
                    {employees.map(e=><option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeNumber})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">Financial Year</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.financialYear} onChange={e=>setForm(f=>({...f,financialYear:e.target.value}))}>
                      {['2023-24','2024-25','2025-26','2026-27'].map(y=><option key={y}>{y}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs text-gray-500 mb-1">Tax Regime</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.regime} onChange={e=>setForm(f=>({...f,regime:e.target.value}))}>
                      <option value="NEW">New Regime</option>
                      <option value="OLD">Old Regime</option>
                    </select>
                  </div>
                </div>
                {form.regime==='OLD' && (
                  <div className="bg-purple-50 rounded-xl p-3 space-y-2">
                    <div className="text-xs font-semibold text-purple-700">Old Regime Deductions</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="block text-xs text-gray-500 mb-1">Section 80C (max ₹1.5L)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.section80C} onChange={e=>setForm(f=>({...f,section80C:e.target.value}))} /></div>
                      <div><label className="block text-xs text-gray-500 mb-1">Section 80D (max ₹25K)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.section80D} onChange={e=>setForm(f=>({...f,section80D:e.target.value}))} /></div>
                      <div><label className="block text-xs text-gray-500 mb-1">Section 80G</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.section80G} onChange={e=>setForm(f=>({...f,section80G:e.target.value}))} /></div>
                      <div><label className="block text-xs text-gray-500 mb-1">Section 80E (edu loan)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.section80E} onChange={e=>setForm(f=>({...f,section80E:e.target.value}))} /></div>
                      <div><label className="block text-xs text-gray-500 mb-1">Other Deductions</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.otherDeductions} onChange={e=>setForm(f=>({...f,otherDeductions:e.target.value}))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <div><label className="block text-xs text-gray-500 mb-1">Monthly Rent Paid (₹)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.rentPaid} onChange={e=>setForm(f=>({...f,rentPaid:e.target.value}))} /></div>
                      <div className="flex items-end pb-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isMetroCity} onChange={e=>setForm(f=>({...f,isMetroCity:e.target.checked}))} />Metro City (50% HRA)</label></div>
                    </div>
                  </div>
                )}
                {form.regime==='NEW' && (
                  <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                    New regime: Only Standard Deduction (₹50,000) applies. Section 80C/80D not applicable. Rebate up to ₹7L income.
                  </div>
                )}
                <div><label className="block text-xs text-gray-500 mb-1">Remarks</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))} /></div>
                <button onClick={handleSave} disabled={saving||!form.employeeId} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving?'Calculating & Saving...':'Calculate & Save TDS'}</button>
              </div>
            </div>

            {/* Calculation Preview */}
            {calcPreview && (
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-bold text-gray-700 mb-4">TDS Calculation Result</h3>
                <div className="space-y-2 text-sm">
                  {[
                    {label:'Annual Gross Salary',value:fmt(calcPreview.annualGross),color:'text-gray-800'},
                    {label:'Standard Deduction',value:`- ${fmt(calcPreview.breakdown?.standardDeduction)}`,color:'text-red-500'},
                    ...(calcPreview.regime==='OLD'?[
                      {label:'HRA Exemption',value:`- ${fmt(calcPreview.breakdown?.hraExemption)}`,color:'text-red-500'},
                      {label:'Section 80C',value:`- ${fmt(calcPreview.breakdown?.section80C)}`,color:'text-red-500'},
                      {label:'Section 80D',value:`- ${fmt(calcPreview.breakdown?.section80D)}`,color:'text-red-500'},
                    ]:[]),
                    {label:'Taxable Income',value:fmt(calcPreview.taxableIncome),color:'text-orange-600 font-bold'},
                    {label:'Annual Tax + Cess',value:fmt(calcPreview.annualTax),color:'text-red-600 font-bold'},
                    {label:'Monthly TDS',value:fmt(calcPreview.monthlyTds),color:'text-indigo-600 font-bold text-lg'},
                  ].map((row,i)=>(
                    <div key={i} className={`flex justify-between py-2 border-b last:border-0 ${i===calcPreview.breakdown?.length-1?'border-t-2 pt-3':''}`}>
                      <span className="text-gray-500">{row.label}</span>
                      <span className={row.color}>{row.value}</span>
                    </div>
                  ))}
                  <div className="mt-3 bg-indigo-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500">Regime: {calcPreview.regime} | FY: {calcPreview.financialYear}</div>
                    <div className="text-xs text-green-600 mt-1">✅ Declaration saved successfully</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TDS CHALLAN */}
        {activeTab==='TDS Challan' && (
          <div className="space-y-4">
            <div className="flex gap-3 items-end">
              <div><label className="block text-xs text-gray-500 mb-1">Month</label>
                <select className="border rounded-lg px-3 py-2 text-sm" value={month} onChange={e=>setMonth(Number(e.target.value))}>
                  {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Year</label>
                <input type="number" className="border rounded-lg px-3 py-2 text-sm w-24" value={year} onChange={e=>setYear(Number(e.target.value))} />
              </div>
              <button onClick={fetchChallan} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Fetch Challan</button>
            </div>
            {loading?<div className="text-center py-10 text-gray-400">Loading...</div>
            :data?(
              <div className="space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 grid grid-cols-3 gap-4 text-center">
                  <div><div className="text-lg font-bold text-orange-700">{data.employeeCount}</div><div className="text-xs text-gray-500">Employees with TDS</div></div>
                  <div><div className="text-lg font-bold text-red-700">{fmt(data.totalTds)}</div><div className="text-xs text-gray-500">Total TDS to Deposit</div></div>
                  <div><div className="text-sm font-bold text-gray-600">Due: {data.dueDate}</div><div className="text-xs text-gray-500">Section {data.section}</div></div>
                </div>
                {data.entries.length===0?<div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400">No TDS deductions this month</div>:(
                  <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                        <tr>{['Emp No','Name','PAN','Gross Salary','TDS Amount'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.entries.map((e,i)=>(
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-mono text-xs text-blue-600">{e.employeeNumber}</td>
                            <td className="px-4 py-2 font-medium">{e.employeeName}</td>
                            <td className="px-4 py-2 font-mono text-xs">{e.panNumber}</td>
                            <td className="px-4 py-2">{fmt(e.grossSalary)}</td>
                            <td className="px-4 py-2 font-bold text-red-600">{fmt(e.tdsAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ):<div className="text-center py-10 text-gray-400">Select month/year and click Fetch</div>}
          </div>
        )}

        {/* TDS REGISTER */}
        {activeTab==='TDS Register' && (
          <div className="space-y-4">
            <div className="flex gap-3 items-end">
              <div><label className="block text-xs text-gray-500 mb-1">Financial Year</label>
                <select className="border rounded-lg px-3 py-2 text-sm" value={fy} onChange={e=>setFy(e.target.value)}>
                  {['2023-24','2024-25','2025-26','2026-27'].map(y=><option key={y}>{y}</option>)}
                </select>
              </div>
              <button onClick={fetchRegister} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Fetch Register</button>
            </div>
            {loading?<div className="text-center py-10 text-gray-400">Loading...</div>
            :data?(
              <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
                <div className="p-4 border-b"><h3 className="font-bold text-gray-700">TDS Register FY {data.financialYear} | Total TDS: {fmt(data.totalTdsDeducted)}</h3></div>
                <table className="w-full text-sm min-w-max">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Employee</th>
                      <th className="px-3 py-2 text-left">PAN</th>
                      <th className="px-3 py-2 text-left">Regime</th>
                      <th className="px-3 py-2 text-right">Taxable Income</th>
                      <th className="px-3 py-2 text-right">Annual Tax</th>
                      <th className="px-3 py-2 text-right">Total TDS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(data.employees||[]).map((e,i)=>(
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="font-medium">{e.employeeName}</div>
                          <div className="text-xs text-gray-400 font-mono">{e.employeeNumber}</div>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{e.panNumber}</td>
                        <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-bold ${e.regime==='NEW'?'bg-blue-100 text-blue-700':'bg-purple-100 text-purple-700'}`}>{e.regime}</span></td>
                        <td className="px-3 py-2 text-right">{fmt(e.taxableIncome)}</td>
                        <td className="px-3 py-2 text-right text-red-600 font-medium">{fmt(e.annualTax)}</td>
                        <td className="px-3 py-2 text-right font-bold text-orange-600">{fmt(e.totalTdsDeducted)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ):<div className="text-center py-10 text-gray-400">Click Fetch to load TDS Register</div>}
          </div>
        )}

        {/* FORM 16 */}
        {activeTab==='Form 16' && (
          <div className="space-y-4">
            <div className="flex gap-3 items-end">
              <div><label className="block text-xs text-gray-500 mb-1">Employee</label>
                <select className="border rounded-lg px-3 py-2 text-sm" value={form16EmpId} onChange={e=>setForm16EmpId(e.target.value)}>
                  <option value="">— Select Employee —</option>
                  {employees.map(e=><option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeNumber})</option>)}
                </select>
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Financial Year</label>
                <select className="border rounded-lg px-3 py-2 text-sm" value={fy} onChange={e=>setFy(e.target.value)}>
                  {['2023-24','2024-25','2025-26','2026-27'].map(y=><option key={y}>{y}</option>)}
                </select>
              </div>
              <button onClick={fetchForm16} disabled={!form16EmpId} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">Generate Form 16</button>
            </div>
            {loading?<div className="text-center py-10 text-gray-400">Loading...</div>
            :form16Data?(
              <div className="bg-white rounded-xl border shadow-sm p-6 max-w-2xl">
                <div className="text-center border-b pb-4 mb-4">
                  <h2 className="text-lg font-bold text-gray-800">FORM 16 — TDS CERTIFICATE</h2>
                  <div className="text-sm text-gray-500">Under Section 203 of Income Tax Act | FY {form16Data.financialYear}</div>
                  <div className="text-xs text-gray-400 mt-1">Section 192 — TDS on Salary</div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div><span className="text-gray-500">Employee:</span> <strong>{form16Data.employee?.firstName} {form16Data.employee?.lastName}</strong></div>
                  <div><span className="text-gray-500">PAN:</span> <strong className="font-mono">{form16Data.employee?.panNumber||'Not Provided'}</strong></div>
                  <div><span className="text-gray-500">Emp No:</span> <strong>{form16Data.employee?.employeeNumber}</strong></div>
                  <div><span className="text-gray-500">Regime:</span> <strong>{form16Data.regime} Regime</strong></div>
                </div>
                <div className="space-y-2 text-sm border rounded-lg p-4 bg-gray-50">
                  <div className="font-semibold text-gray-700 mb-2">Income & Tax Computation</div>
                  {[
                    {label:'Gross Salary Received',value:fmt(form16Data.grossSalary)},
                    {label:'Standard Deduction',value:`(${fmt(form16Data.standardDeduction)})`},
                    ...(form16Data.regime==='OLD'?[
                      {label:'HRA Exemption',value:`(${fmt(form16Data.hraExemption)})`},
                      {label:'Section 80C',value:`(${fmt(form16Data.section80C)})`},
                      {label:'Section 80D',value:`(${fmt(form16Data.section80D)})`},
                    ]:[]),
                    {label:'Taxable Income',value:fmt(form16Data.taxableIncome),bold:true},
                    {label:'Tax on Income + Cess',value:fmt(form16Data.annualTax),bold:true},
                    {label:'TDS Deducted',value:fmt(form16Data.totalTdsDeducted),bold:true},
                    {label:'Balance Tax Payable',value:fmt(form16Data.balanceTax),bold:form16Data.balanceTax>0},
                  ].map((row,i)=>(
                    <div key={i} className={`flex justify-between py-1.5 border-b last:border-0 ${row.bold?'font-bold':''}`}>
                      <span className={row.bold?'text-gray-800':'text-gray-500'}>{row.label}</span>
                      <span className={row.bold?'text-indigo-700':'text-gray-700'}>{row.value}</span>
                    </div>
                  ))}
                </div>
                {form16Data.balanceTax===0&&<div className="mt-3 bg-green-50 rounded-lg p-3 text-center text-green-700 text-sm font-medium">✅ No additional tax payable — TDS fully covered</div>}
                {form16Data.balanceTax>0&&<div className="mt-3 bg-red-50 rounded-lg p-3 text-center text-red-700 text-sm font-medium">⚠ Balance tax payable: {fmt(form16Data.balanceTax)}</div>}
              </div>
            ):<div className="text-center py-10 text-gray-400">Select employee and financial year, then click Generate</div>}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
