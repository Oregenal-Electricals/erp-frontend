'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

  async function downloadSlip(empId, month, year) {
    const res = await fetch(`${API}/salary-slip/download/${empId}?month=${month}&year=${year}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=`salary-slip-${month}-${year}.pdf`; a.click();
      URL.revokeObjectURL(url);
    }
  }

  async function downloadBulkSlips(runId, runNumber) {
    const res = await fetch(`${API}/salary-slip/bulk/${runId}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=`salary-slips-${runNumber}.pdf`; a.click();
      URL.revokeObjectURL(url);
    }
  }
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const STATUS_COLORS = {
  DRAFT:'bg-yellow-100 text-yellow-700',
  APPROVED:'bg-blue-100 text-blue-700',
  PAID:'bg-green-100 text-green-700'
};

export default function PayrollPage() {
  const [runs, setRuns] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editEntry, setEditEntry] = useState(null);
  const [editForm, setEditForm] = useState({tdsAmount:0,otherDeductions:0,otherAllowances:0,remarks:''});

  const now = new Date();
  const [runMonth, setRunMonth] = useState(now.getMonth()+1);
  const [runYear, setRunYear] = useState(now.getFullYear());
  const [runRemarks, setRunRemarks] = useState('');
  const [activeTab, setActiveTab] = useState('Payroll Runs');

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const [rRes, sRes] = await Promise.all([
      fetch(`${API}/payroll`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/payroll/stats`, {headers:{Authorization:`Bearer ${getToken()}`}}),
    ]);
    if (rRes.ok) { const d=await rRes.json(); setRuns(d.data||[]); }
    if (sRes.ok) setStats(await sRes.json());
    setLoading(false);
  }

  async function fetchRun(id) {
    const res = await fetch(`${API}/payroll/${id}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setSelectedRun(await res.json());
  }

  useEffect(()=>{ fetchAll(); },[]);

  async function handleRunPayroll() {
    setSaving(true); setError('');
    const res = await fetch(`${API}/payroll/run`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify({month:runMonth,year:runYear,remarks:runRemarks})});
    const data = await res.json();
    if (res.ok) { fetchAll(); fetchRun(data.id); setActiveTab('Payroll Register'); }
    else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    setSaving(false);
  }

  async function handleRecalculate(id) {
    if (!confirm('Recalculate payroll? This will delete and re-process all entries.')) return;
    setSaving(true);
    const res = await fetch(`${API}/payroll/${id}/recalculate`,{method:'POST',headers:{Authorization:`Bearer ${getToken()}`}});
    const data = await res.json();
    if (res.ok) { fetchAll(); fetchRun(data.id); }
    else setError(data.message||'Failed');
    setSaving(false);
  }

  async function handleApprove(id, action) {
    setSaving(true); setError('');
    const res = await fetch(`${API}/payroll/${id}/approve`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify({action,remarks:''})});
    const data = await res.json();
    if (res.ok) { fetchAll(); fetchRun(id); }
    else setError(data.message||'Failed');
    setSaving(false);
  }

  async function handleUpdateEntry() {
    setSaving(true); setError('');
    const body = {tdsAmount:parseFloat(editForm.tdsAmount)||0,otherDeductions:parseFloat(editForm.otherDeductions)||0,otherAllowances:parseFloat(editForm.otherAllowances)||0,remarks:editForm.remarks};
    const res = await fetch(`${API}/payroll/entries/${editEntry.id}`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    const data = await res.json();
    if (res.ok) { setEditEntry(null); fetchRun(editEntry.payrollRunId); }
    else setError(data.message||'Failed');
    setSaving(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payroll Engine</h1>
            <p className="text-gray-500 text-sm mt-1">Monthly payroll processing, approvals and register</p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              {label:'Total Runs',value:stats.total,color:'bg-gray-50'},
              {label:'Draft',value:stats.draft,color:'bg-yellow-50'},
              {label:'Approved',value:stats.approved,color:'bg-blue-50'},
              {label:'Paid',value:stats.paid,color:'bg-green-50'},
            ].map(s=>(
              <div key={s.label} className={`${s.color} rounded-xl p-3 text-center border`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-4 border-b">
          {['Payroll Runs','Run Payroll','Payroll Register'].map(t=><button key={t} onClick={()=>setActiveTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab===t?'border-indigo-600 text-indigo-600':'border-transparent text-gray-500'}`}>{t}</button>)}
        </div>

        {activeTab==='Payroll Runs' && (
          <div className="bg-white rounded-xl border shadow-sm">
            {loading?<div className="text-center py-10 text-gray-400">Loading...</div>
            :runs.length===0?<div className="text-center py-10 text-gray-400">No payroll runs yet. Use "Run Payroll" to process.</div>:(
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>{['Run No','Month','Employees','Gross','Deductions','Net Pay','OT','Status',''].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {runs.map(r=>(
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-blue-600 font-bold">{r.runNumber}</td>
                      <td className="px-4 py-3 font-medium">{MONTHS[r.month-1]} {r.year}</td>
                      <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-bold">{r.totalEmployees}</span></td>
                      <td className="px-4 py-3 font-medium text-gray-800">{fmt(r.totalGross)}</td>
                      <td className="px-4 py-3 text-red-600">{fmt(r.totalDeductions)}</td>
                      <td className="px-4 py-3 font-bold text-green-600">{fmt(r.totalNetPay)}</td>
                      <td className="px-4 py-3 text-orange-600">{fmt(r.totalOt)}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[r.status]}`}>{r.status}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={()=>{fetchRun(r.id);setActiveTab('Payroll Register');}} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">View</button>
                          {r.status==='DRAFT' && <button onClick={()=>handleApprove(r.id,'APPROVED')} disabled={saving} className="px-2 py-1 text-xs bg-blue-600 text-white rounded">Approve</button>}
                          {r.status==='APPROVED' && <button onClick={()=>handleApprove(r.id,'PAID')} disabled={saving} className="px-2 py-1 text-xs bg-green-600 text-white rounded">Mark Paid</button>}
                          {r.status==='DRAFT' && <button onClick={()=>handleRecalculate(r.id)} disabled={saving} className="px-2 py-1 text-xs border text-orange-600 border-orange-300 rounded">Recalc</button>}
                          {r.status!=='DRAFT' && <button onClick={()=>downloadBulkSlips(r.id,r.runNumber)} className="px-2 py-1 text-xs bg-red-600 text-white rounded">⬇ Slips</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab==='Run Payroll' && (
          <div className="bg-white rounded-xl border shadow-sm p-6 max-w-md">
            <h2 className="font-bold text-gray-800 mb-4">Process Monthly Payroll</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 mb-4 space-y-1">
              <div>✅ Calculates from attendance records (OT, LOP, present days)</div>
              <div>✅ Applies PF (12% basic), ESI (0.75% if gross ≤ ₹21,000)</div>
              <div>✅ Deducts Loss of Pay for absent days</div>
              <div>✅ Includes OT amount from attendance</div>
            </div>
            {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm mb-4">{error}</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-gray-500 mb-1">Month *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={runMonth} onChange={e=>setRunMonth(Number(e.target.value))}>
                    {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Year *</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={runYear} onChange={e=>setRunYear(Number(e.target.value))} />
                </div>
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Remarks</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={runRemarks} onChange={e=>setRunRemarks(e.target.value)} placeholder="e.g. July 2026 payroll" />
              </div>
              <button onClick={handleRunPayroll} disabled={saving} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving?'Processing...':'▶ Run Payroll'}</button>
            </div>
          </div>
        )}

        {activeTab==='Payroll Register' && (
          <div className="space-y-4">
            {!selectedRun ? (
              <div className="text-center py-10 text-gray-400">Select a payroll run from "Payroll Runs" tab to view the register.</div>
            ) : (
              <>
                <div className="bg-white rounded-xl border shadow-sm p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="font-bold text-gray-800 text-lg">{selectedRun.runNumber} — {MONTHS[selectedRun.month-1]} {selectedRun.year}</h2>
                      <div className="flex gap-3 mt-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${STATUS_COLORS[selectedRun.status]}`}>{selectedRun.status}</span>
                        <span className="text-xs text-gray-400">{selectedRun.totalEmployees} employees</span>
                        {selectedRun.processedAt&&<span className="text-xs text-gray-400">Processed: {fmtDate(selectedRun.processedAt)}</span>}
                        {selectedRun.approvedAt&&<span className="text-xs text-gray-400">Approved: {fmtDate(selectedRun.approvedAt)}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {selectedRun.status==='DRAFT' && <button onClick={()=>handleApprove(selectedRun.id,'APPROVED')} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Approve</button>}
                      {selectedRun.status==='APPROVED' && <button onClick={()=>handleApprove(selectedRun.id,'PAID')} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Mark Paid</button>}
                      {selectedRun.status==='DRAFT' && <button onClick={()=>handleRecalculate(selectedRun.id)} disabled={saving} className="px-4 py-2 border text-orange-600 rounded-lg text-sm">Recalculate</button>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                    {[
                      {label:'Total Gross',value:fmt(selectedRun.totalGross),color:'text-gray-800'},
                      {label:'Total PF',value:fmt(selectedRun.totalPf),color:'text-blue-600'},
                      {label:'Total ESI',value:fmt(selectedRun.totalEsi),color:'text-purple-600'},
                      {label:'Total OT',value:fmt(selectedRun.totalOt),color:'text-orange-600'},
                      {label:'Total Net Pay',value:fmt(selectedRun.totalNetPay),color:'text-green-600 text-lg font-bold'},
                    ].map(s=>(
                      <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
                        <div className={`font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}

                <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
                  <table className="w-full text-xs min-w-max">
                    <thead className="bg-gray-50 text-gray-500 uppercase sticky top-0">
                      <tr>{['Employee','Dept','Days','Present','Absent','Basic','HRA','Conv','OT Hrs','OT Amt','Gross','PF','ESI','TDS','LOP','Ded.','Net Pay',''].map(h=><th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y">
                      {(selectedRun.entries||[]).map(e=>(
                        <tr key={e.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="font-medium">{e.employee?.firstName} {e.employee?.lastName}</div>
                            <div className="text-gray-400 font-mono">{e.employee?.employeeNumber}</div>
                          </td>
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{e.employee?.department?.name}</td>
                          <td className="px-3 py-2 text-center">{e.workingDays}</td>
                          <td className="px-3 py-2 text-center text-green-600 font-medium">{e.presentDays}</td>
                          <td className="px-3 py-2 text-center text-red-600">{e.absentDays}</td>
                          <td className="px-3 py-2">{fmt(e.basicSalary)}</td>
                          <td className="px-3 py-2">{fmt(e.hraAmount)}</td>
                          <td className="px-3 py-2">{fmt(e.conveyanceAmount)}</td>
                          <td className="px-3 py-2 text-orange-600">{e.otHours}h</td>
                          <td className="px-3 py-2 text-orange-600">{fmt(e.otAmount)}</td>
                          <td className="px-3 py-2 font-bold">{fmt(e.grossEarnings)}</td>
                          <td className="px-3 py-2 text-blue-600">{fmt(e.pfEmployee)}</td>
                          <td className="px-3 py-2 text-purple-600">{fmt(e.esiEmployee)}</td>
                          <td className="px-3 py-2">{fmt(e.tdsAmount)}</td>
                          <td className="px-3 py-2 text-red-600">{e.lopDays>0?`${e.lopDays}d`:'—'}</td>
                          <td className="px-3 py-2 text-red-600 font-medium">{fmt(e.totalDeductions)}</td>
                          <td className="px-3 py-2 font-bold text-green-600">{fmt(e.netPay)}</td>
                          <td className="px-3 py-2">
                            <button onClick={()=>downloadSlip(e.employeeId,selectedRun.month,selectedRun.year)} className="px-2 py-1 text-xs bg-red-600 text-white rounded">⬇ Slip</button>
                            {selectedRun.status==='DRAFT' && (
                              <button onClick={()=>{setEditEntry({...e,payrollRunId:selectedRun.id});setEditForm({tdsAmount:e.tdsAmount,otherDeductions:e.otherDeductions,otherAllowances:e.otherAllowances,remarks:e.remarks||''});setError('');}} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">Edit</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* EDIT ENTRY MODAL */}
        {editEntry && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b flex justify-between">
                <h2 className="font-bold text-gray-800">Edit Entry — {editEntry.employee?.firstName} {editEntry.employee?.lastName}</h2>
                <button onClick={()=>setEditEntry(null)} className="text-gray-400">✕</button>
              </div>
              <div className="p-5 space-y-3">
                {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                  <div>Gross: <strong>{fmt(editEntry.grossEarnings)}</strong> | PF: <strong>{fmt(editEntry.pfEmployee)}</strong> | ESI: <strong>{fmt(editEntry.esiEmployee)}</strong></div>
                  <div>Net Pay (current): <strong className="text-green-600">{fmt(editEntry.netPay)}</strong></div>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">TDS Amount (₹)</label><input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={editForm.tdsAmount} onChange={e=>setEditForm(f=>({...f,tdsAmount:e.target.value}))} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Other Deductions (₹)</label><input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={editForm.otherDeductions} onChange={e=>setEditForm(f=>({...f,otherDeductions:e.target.value}))} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Other Allowances (₹)</label><input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={editForm.otherAllowances} onChange={e=>setEditForm(f=>({...f,otherAllowances:e.target.value}))} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Remarks</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={editForm.remarks} onChange={e=>setEditForm(f=>({...f,remarks:e.target.value}))} /></div>
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                <button onClick={()=>setEditEntry(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleUpdateEntry} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Saving...':'Update'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
