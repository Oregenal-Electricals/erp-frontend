'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';

const STATUS_COLORS = {
  PENDING:'bg-yellow-100 text-yellow-700',
  APPROVED:'bg-green-100 text-green-700',
  REJECTED:'bg-red-100 text-red-600',
  CANCELLED:'bg-gray-100 text-gray-500'
};

const TABS = ['Applications','Leave Balances','Apply Leave','Leave Types','Allocate'];

export default function LeavePage() {
  const [activeTab, setActiveTab] = useState('Applications');
  const [applications, setApplications] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [approveModal, setApproveModal] = useState(null);
  const [approveForm, setApproveForm] = useState({action:'APPROVED',rejectionReason:'',remarks:''});
  const [typeModal, setTypeModal] = useState(false);
  const [editType, setEditType] = useState(null);
  const [balEmpId, setBalEmpId] = useState('');
  const [balances, setBalances] = useState([]);

  const now = new Date();
  const [statusFilter, setStatusFilter] = useState('');
  const [empFilter, setEmpFilter] = useState('');

  const [applyForm, setApplyForm] = useState({
    leaveTypeId:'', fromDate:'', toDate:'', reason:'', remarks:''
  });

  const [typeForm, setTypeForm] = useState({
    code:'', name:'', daysAllowed:0, isPaid:true,
    carryForward:false, maxCarryForward:0,
    applicableGender:'ALL', requiresApproval:true, description:''
  });

  const [allocForm, setAllocForm] = useState({
    employeeId:'', leaveTypeId:'',
    year:now.getFullYear(), allocated:0, carryForward:0
  });
  const [bulkForm, setBulkForm] = useState({leaveTypeId:'', year:now.getFullYear()});

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({limit:50});
    if (statusFilter) params.set('status', statusFilter);
    if (empFilter) params.set('employeeId', empFilter);
    const [aRes, tRes, eRes, sRes] = await Promise.all([
      fetch(`${API}/leave?${params}`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/leave/types`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/employees?limit=200`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/leave/stats`, {headers:{Authorization:`Bearer ${getToken()}`}}),
    ]);
    if (aRes.ok) { const d=await aRes.json(); setApplications(d.data||[]); }
    if (tRes.ok) setLeaveTypes(await tRes.json());
    if (eRes.ok) { const d=await eRes.json(); setEmployees(d.data||[]); }
    if (sRes.ok) setStats(await sRes.json());
    setLoading(false);
  }

  useEffect(()=>{ fetchAll(); },[statusFilter, empFilter]);

  async function fetchBalance() {
    if (!balEmpId) return;
    const res = await fetch(`${API}/leave/balance/${balEmpId}?year=${now.getFullYear()}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setBalances(await res.json());
  }
  useEffect(()=>{ fetchBalance(); },[balEmpId]);

  async function handleApply() {
    setSaving(true); setError('');
    const res = await fetch(`${API}/leave/apply`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(applyForm)});
    const data = await res.json();
    if (res.ok) { fetchAll(); setActiveTab('Applications'); setApplyForm({leaveTypeId:'',fromDate:'',toDate:'',reason:'',remarks:''}); }
    else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    setSaving(false);
  }

  async function handleApprove() {
    setSaving(true); setError('');
    const res = await fetch(`${API}/leave/${approveModal.id}/approve`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(approveForm)});
    const data = await res.json();
    if (res.ok) { setApproveModal(null); fetchAll(); }
    else setError(data.message||'Failed');
    setSaving(false);
  }

  async function handleCancel(id) {
    if (!confirm('Cancel this leave application?')) return;
    const res = await fetch(`${API}/leave/${id}/cancel`,{method:'PUT',headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) fetchAll();
  }

  async function handleTypeSave() {
    setSaving(true); setError('');
    const url = editType ? `${API}/leave/types/${editType.id}` : `${API}/leave/types`;
    const method = editType ? 'PUT' : 'POST';
    const body = {...typeForm, daysAllowed:parseFloat(typeForm.daysAllowed), maxCarryForward:parseFloat(typeForm.maxCarryForward)};
    const res = await fetch(url,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    const data = await res.json();
    if (res.ok) { setTypeModal(false); setEditType(null); fetchAll(); }
    else setError(data.message||'Failed');
    setSaving(false);
  }

  async function handleAllocate() {
    setSaving(true); setError('');
    const body = {...allocForm, allocated:parseFloat(allocForm.allocated), carryForward:parseFloat(allocForm.carryForward)};
    const res = await fetch(`${API}/leave/allocate`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    const data = await res.json();
    if (res.ok) { alert('Leave allocated successfully!'); }
    else setError(data.message||'Failed');
    setSaving(false);
  }

  async function handleBulkAllocate() {
    setSaving(true); setError('');
    const res = await fetch(`${API}/leave/bulk-allocate`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(bulkForm)});
    const data = await res.json();
    if (res.ok) alert(`Bulk allocated: ${data.created} created, ${data.updated} skipped`);
    else setError(data.message||'Failed');
    setSaving(false);
  }

  const days = applyForm.fromDate && applyForm.toDate ?
    Math.max(1, Math.floor((new Date(applyForm.toDate)-new Date(applyForm.fromDate))/86400000)+1) : 0;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
            <p className="text-gray-500 text-sm mt-1">Leave applications, balances and approvals</p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[
              {label:'Total',value:stats.total,color:'bg-gray-50'},
              {label:'Pending',value:stats.pending,color:'bg-yellow-50'},
              {label:'Approved',value:stats.approved,color:'bg-green-50'},
              {label:'Rejected',value:stats.rejected,color:'bg-red-50'},
              {label:'Leave Types',value:stats.leaveTypes,color:'bg-blue-50'},
            ].map(s=>(
              <div key={s.label} className={`${s.color} rounded-xl p-3 text-center border`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-4 border-b overflow-x-auto">
          {TABS.map(t=><button key={t} onClick={()=>{setActiveTab(t);setError('');}} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${activeTab===t?'border-indigo-600 text-indigo-600':'border-transparent text-gray-500'}`}>{t}</button>)}
        </div>

        {activeTab==='Applications' && (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <select className="border rounded-lg px-3 py-2 text-sm" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                <option value="">All Status</option>
                {['PENDING','APPROVED','REJECTED','CANCELLED'].map(s=><option key={s}>{s}</option>)}
              </select>
              <select className="border rounded-lg px-3 py-2 text-sm" value={empFilter} onChange={e=>setEmpFilter(e.target.value)}>
                <option value="">All Employees</option>
                {employees.map(e=><option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeNumber})</option>)}
              </select>
            </div>
            <div className="bg-white rounded-xl border shadow-sm">
              {loading?<div className="text-center py-10 text-gray-400">Loading...</div>
              :applications.length===0?<div className="text-center py-10 text-gray-400">No leave applications found.</div>:(
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>{['App No','Employee','Leave Type','From','To','Days','Status','Applied On',''].map(h=><th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {applications.map(a=>(
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-xs text-blue-600">{a.applicationNumber}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{a.employee?.firstName} {a.employee?.lastName}</div>
                          <div className="text-xs text-gray-400">{a.employee?.department?.name}</div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">{a.leaveType?.code}</span>
                          <span className="text-xs text-gray-500 ml-1">{a.leaveType?.isPaid?'Paid':'Unpaid'}</span>
                        </td>
                        <td className="px-3 py-2 text-xs">{fmtDate(a.fromDate)}</td>
                        <td className="px-3 py-2 text-xs">{fmtDate(a.toDate)}</td>
                        <td className="px-3 py-2 font-bold text-center">{a.days}</td>
                        <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[a.status]}`}>{a.status}</span></td>
                        <td className="px-3 py-2 text-xs text-gray-400">{fmtDate(a.createdAt)}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            {a.status==='PENDING' && <button onClick={()=>{setApproveModal(a);setApproveForm({action:'APPROVED',rejectionReason:'',remarks:''}); setError('');}} className="px-2 py-1 text-xs bg-green-600 text-white rounded">Review</button>}
                            {['PENDING','APPROVED'].includes(a.status) && <button onClick={()=>handleCancel(a.id)} className="px-2 py-1 text-xs border text-red-600 border-red-300 rounded">Cancel</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab==='Leave Balances' && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <select className="border rounded-lg px-3 py-2 text-sm" value={balEmpId} onChange={e=>setBalEmpId(e.target.value)}>
                <option value="">— Select Employee —</option>
                {employees.map(e=><option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeNumber})</option>)}
              </select>
            </div>
            {balEmpId && balances.length>0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {balances.map(b=>(
                  <div key={b.id} className="bg-white rounded-xl border shadow-sm p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-bold text-gray-800">{b.leaveType?.name}</div>
                        <div className="text-xs text-gray-400">{b.leaveType?.code} · {b.leaveType?.isPaid?'Paid':'Unpaid'}</div>
                      </div>
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{b.year}</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Allocated</span><span className="font-bold">{b.allocated}d</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Used</span><span className="text-red-600 font-medium">{b.used}d</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Pending</span><span className="text-yellow-600 font-medium">{b.pending}d</span></div>
                      <div className="flex justify-between border-t pt-1"><span className="text-gray-700 font-semibold">Available</span><span className="text-green-600 font-bold text-lg">{b.available}d</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {balEmpId && balances.length===0 && <div className="text-center py-10 text-gray-400">No leave balances for this employee. Please allocate leaves first.</div>}
            {!balEmpId && <div className="text-center py-10 text-gray-400">Select an employee to view leave balances.</div>}
          </div>
        )}

        {activeTab==='Apply Leave' && (
          <div className="bg-white rounded-xl border shadow-sm p-6 max-w-lg">
            <h2 className="font-bold text-gray-800 mb-4">Apply for Leave</h2>
            <p className="text-xs text-gray-400 mb-4">Note: Employee must have a linked user account to apply for leave.</p>
            {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm mb-4">{error}</div>}
            <div className="space-y-4">
              <div><label className="block text-xs text-gray-500 mb-1">Leave Type *</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={applyForm.leaveTypeId} onChange={e=>setApplyForm(f=>({...f,leaveTypeId:e.target.value}))}>
                  <option value="">— Select —</option>
                  {leaveTypes.map(t=><option key={t.id} value={t.id}>{t.name} ({t.daysAllowed}d/yr, {t.isPaid?'Paid':'Unpaid'})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-gray-500 mb-1">From Date *</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={applyForm.fromDate} onChange={e=>setApplyForm(f=>({...f,fromDate:e.target.value}))} />
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">To Date *</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={applyForm.toDate} onChange={e=>setApplyForm(f=>({...f,toDate:e.target.value}))} />
                </div>
              </div>
              {days>0 && <div className="bg-blue-50 rounded-lg px-3 py-2 text-sm text-blue-700 font-medium">📅 {days} day{days>1?'s':''} leave requested</div>}
              <div><label className="block text-xs text-gray-500 mb-1">Reason *</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={applyForm.reason} onChange={e=>setApplyForm(f=>({...f,reason:e.target.value}))} />
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Remarks</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={applyForm.remarks} onChange={e=>setApplyForm(f=>({...f,remarks:e.target.value}))} />
              </div>
              <button onClick={handleApply} disabled={saving||!applyForm.leaveTypeId||!applyForm.fromDate||!applyForm.toDate||!applyForm.reason} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving?'Submitting...':'Submit Application'}</button>
            </div>
          </div>
        )}

        {activeTab==='Leave Types' && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={()=>{setTypeForm({code:'',name:'',daysAllowed:0,isPaid:true,carryForward:false,maxCarryForward:0,applicableGender:'ALL',requiresApproval:true,description:''});setEditType(null);setError('');setTypeModal(true);}} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">+ New Leave Type</button>
            </div>
            <div className="bg-white rounded-xl border shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>{['Code','Name','Days/Yr','Paid?','Carry Forward','Gender','Approval',''].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {leaveTypes.map(t=>(
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600">{t.code}</td>
                      <td className="px-4 py-3 font-medium">{t.name}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-bold">{t.daysAllowed}d</span></td>
                      <td className="px-4 py-3">{t.isPaid?<span className="text-green-600">✅ Paid</span>:<span className="text-gray-400">Unpaid</span>}</td>
                      <td className="px-4 py-3 text-xs">{t.carryForward?`Yes (max ${t.maxCarryForward}d)`:'No'}</td>
                      <td className="px-4 py-3 text-xs">{t.applicableGender}</td>
                      <td className="px-4 py-3">{t.requiresApproval?<span className="text-orange-600 text-xs">Required</span>:<span className="text-green-600 text-xs">Auto</span>}</td>
                      <td className="px-4 py-3"><button onClick={()=>{setTypeForm({code:t.code,name:t.name,daysAllowed:t.daysAllowed,isPaid:t.isPaid,carryForward:t.carryForward,maxCarryForward:t.maxCarryForward,applicableGender:t.applicableGender,requiresApproval:t.requiresApproval,description:t.description||''});setEditType(t);setError('');setTypeModal(true);}} className="px-3 py-1 text-xs border rounded hover:bg-gray-50">Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab==='Allocate' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Individual */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-bold text-gray-700 mb-4">Individual Allocation</h3>
              {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm mb-3">{error}</div>}
              <div className="space-y-3">
                <div><label className="block text-xs text-gray-500 mb-1">Employee *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={allocForm.employeeId} onChange={e=>setAllocForm(f=>({...f,employeeId:e.target.value}))}>
                    <option value="">— Select —</option>
                    {employees.map(e=><option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeNumber})</option>)}
                  </select>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Leave Type *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={allocForm.leaveTypeId} onChange={e=>setAllocForm(f=>({...f,leaveTypeId:e.target.value}))}>
                    <option value="">— Select —</option>
                    {leaveTypes.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="block text-xs text-gray-500 mb-1">Year</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={allocForm.year} onChange={e=>setAllocForm(f=>({...f,year:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Days</label><input type="number" step="0.5" className="w-full border rounded-lg px-3 py-2 text-sm" value={allocForm.allocated} onChange={e=>setAllocForm(f=>({...f,allocated:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Carry Fwd</label><input type="number" step="0.5" className="w-full border rounded-lg px-3 py-2 text-sm" value={allocForm.carryForward} onChange={e=>setAllocForm(f=>({...f,carryForward:e.target.value}))} /></div>
                </div>
                <button onClick={handleAllocate} disabled={saving||!allocForm.employeeId||!allocForm.leaveTypeId} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving?'Allocating...':'Allocate Leave'}</button>
              </div>
            </div>

            {/* Bulk */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-bold text-gray-700 mb-4">Bulk Allocation</h3>
              <p className="text-xs text-gray-400 mb-4">Allocates standard days (from leave type config) to all active employees at once.</p>
              <div className="space-y-3">
                <div><label className="block text-xs text-gray-500 mb-1">Leave Type *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={bulkForm.leaveTypeId} onChange={e=>setBulkForm(f=>({...f,leaveTypeId:e.target.value}))}>
                    <option value="">— Select —</option>
                    {leaveTypes.map(t=><option key={t.id} value={t.id}>{t.name} ({t.daysAllowed}d)</option>)}
                  </select>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Year *</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={bulkForm.year} onChange={e=>setBulkForm(f=>({...f,year:Number(e.target.value)}))} />
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">Applies to all ACTIVE employees. Skips employees who already have allocation for this year.</div>
                <button onClick={handleBulkAllocate} disabled={saving||!bulkForm.leaveTypeId} className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving?'Processing...':'Bulk Allocate All Employees'}</button>
              </div>
            </div>
          </div>
        )}

        {/* APPROVE/REJECT MODAL */}
        {approveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b flex justify-between">
                <h2 className="font-bold text-gray-800">Review Leave — {approveModal.applicationNumber}</h2>
                <button onClick={()=>setApproveModal(null)} className="text-gray-400">✕</button>
              </div>
              <div className="p-5 space-y-4">
                {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                  <div><span className="text-gray-500">Employee:</span> <strong>{approveModal.employee?.firstName} {approveModal.employee?.lastName}</strong></div>
                  <div><span className="text-gray-500">Leave Type:</span> <strong>{approveModal.leaveType?.name}</strong></div>
                  <div><span className="text-gray-500">Dates:</span> <strong>{fmtDate(approveModal.fromDate)} → {fmtDate(approveModal.toDate)} ({approveModal.days} days)</strong></div>
                  <div><span className="text-gray-500">Reason:</span> {approveModal.reason}</div>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Decision *</label>
                  <div className="flex gap-3">
                    <button onClick={()=>setApproveForm(f=>({...f,action:'APPROVED'}))} className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 ${approveForm.action==='APPROVED'?'border-green-500 bg-green-50 text-green-700':'border-gray-200 text-gray-500'}`}>✅ Approve</button>
                    <button onClick={()=>setApproveForm(f=>({...f,action:'REJECTED'}))} className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 ${approveForm.action==='REJECTED'?'border-red-500 bg-red-50 text-red-700':'border-gray-200 text-gray-500'}`}>❌ Reject</button>
                  </div>
                </div>
                {approveForm.action==='REJECTED' && (
                  <div><label className="block text-xs text-gray-500 mb-1">Rejection Reason *</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={approveForm.rejectionReason} onChange={e=>setApproveForm(f=>({...f,rejectionReason:e.target.value}))} />
                  </div>
                )}
                <div><label className="block text-xs text-gray-500 mb-1">Remarks</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={approveForm.remarks} onChange={e=>setApproveForm(f=>({...f,remarks:e.target.value}))} />
                </div>
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                <button onClick={()=>setApproveModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleApprove} disabled={saving||(approveForm.action==='REJECTED'&&!approveForm.rejectionReason)} className={`px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${approveForm.action==='APPROVED'?'bg-green-600':'bg-red-600'}`}>{saving?'Saving...':approveForm.action==='APPROVED'?'Approve':'Reject'}</button>
              </div>
            </div>
          </div>
        )}

        {/* LEAVE TYPE MODAL */}
        {typeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b flex justify-between">
                <h2 className="font-bold text-gray-800">{editType?'Edit':'New'} Leave Type</h2>
                <button onClick={()=>setTypeModal(false)} className="text-gray-400">✕</button>
              </div>
              <div className="p-5 space-y-3">
                {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">Code *</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase" value={typeForm.code} onChange={e=>setTypeForm(f=>({...f,code:e.target.value.toUpperCase()}))} disabled={!!editType} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Name *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={typeForm.name} onChange={e=>setTypeForm(f=>({...f,name:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Days/Year *</label><input type="number" step="0.5" className="w-full border rounded-lg px-3 py-2 text-sm" value={typeForm.daysAllowed} onChange={e=>setTypeForm(f=>({...f,daysAllowed:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Applicable Gender</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={typeForm.applicableGender} onChange={e=>setTypeForm(f=>({...f,applicableGender:e.target.value}))}>
                      {['ALL','MALE','FEMALE'].map(g=><option key={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={typeForm.isPaid} onChange={e=>setTypeForm(f=>({...f,isPaid:e.target.checked}))} />Paid Leave</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={typeForm.requiresApproval} onChange={e=>setTypeForm(f=>({...f,requiresApproval:e.target.checked}))} />Requires Approval</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={typeForm.carryForward} onChange={e=>setTypeForm(f=>({...f,carryForward:e.target.checked}))} />Carry Forward</label>
                </div>
                {typeForm.carryForward && <div><label className="block text-xs text-gray-500 mb-1">Max Carry Forward Days</label><input type="number" step="0.5" className="w-full border rounded-lg px-3 py-2 text-sm" value={typeForm.maxCarryForward} onChange={e=>setTypeForm(f=>({...f,maxCarryForward:e.target.value}))} /></div>}
                <div><label className="block text-xs text-gray-500 mb-1">Description</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={typeForm.description} onChange={e=>setTypeForm(f=>({...f,description:e.target.value}))} /></div>
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                <button onClick={()=>setTypeModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleTypeSave} disabled={saving||!typeForm.code||!typeForm.name} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Saving...':'Save'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
