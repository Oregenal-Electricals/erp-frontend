'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmt = n => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—';
const TABS = ['Pending Approvals','All Requests','Workflow Definitions'];
const STATUS_COLORS = { PENDING:'bg-yellow-100 text-yellow-700', APPROVED:'bg-green-100 text-green-700', REJECTED:'bg-red-100 text-red-700', CANCELLED:'bg-gray-100 text-gray-500' };
const DOC_ICONS = { PURCHASE_ORDER:'🛒', SALES_ORDER:'📋', AP_BILL:'🧾', CREDIT_OVERRIDE:'💳', VOUCHER:'📒' };

export default function WorkflowsPage() {
  const [activeTab, setActiveTab] = useState('Pending Approvals');
  const [requests, setRequests] = useState([]);
  const [pending, setPending] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [viewDetail, setViewDetail] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [actionForm, setActionForm] = useState({ action:"APPROVED", comments:"" });
  const [seeding, setSeeding] = useState(false);
  const [saving, setSaving] = useState(false);

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (statusFilter) params.set('status', statusFilter);
    const [rRes, pRes, wRes, sRes] = await Promise.all([
      fetch(`${API}/workflows/requests?${params}`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/workflows/requests?status=PENDING&limit=50`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/workflows/definitions`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/workflows/stats`, {headers:{Authorization:`Bearer ${getToken()}`}}),
    ]);
    if (rRes.ok) { const d=await rRes.json(); setRequests(d.data||[]); setTotal(d.total); setTotalPages(d.totalPages||1); }
    if (pRes.ok) { const d=await pRes.json(); setPending(d.data||[]); }
    if (wRes.ok) setWorkflows(await wRes.json());
    if (sRes.ok) setStats(await sRes.json());
    setLoading(false);
  }

  useEffect(()=>{ fetchAll(); },[page, statusFilter, activeTab]);

  async function handleSeed() {
    setSeeding(true);
    const res = await fetch(`${API}/workflows/seed`,{method:'POST',headers:{Authorization:`Bearer ${getToken()}`}});
    const d = await res.json(); alert(d.message); fetchAll(); setSeeding(false);
  }

  async function handleAction() {
    setSaving(true);
    const res = await fetch(`${API}/workflows/requests/${actionModal.id}/action`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(actionForm)});
    if (res.ok) { setActionModal(null); fetchAll(); if (viewDetail?.id===actionModal.id) setViewDetail(null); }
    else { const d=await res.json(); alert(d.message); }
    setSaving(false);
  }

  async function handleCancel(id) {
    const res = await fetch(`${API}/workflows/requests/${id}/cancel`,{method:'POST',headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) fetchAll();
    else { const d=await res.json(); alert(d.message); }
  }

  async function openDetail(id) {
    const res = await fetch(`${API}/workflows/requests/${id}`,{headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setViewDetail(await res.json());
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Approval Workflows</h1>
            <p className="text-gray-500 text-sm mt-1">Multi-level document approval — PO, SO, Bills, Vouchers</p>
          </div>
          <button onClick={handleSeed} disabled={seeding} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">{seeding?'Seeding...':'Seed Default Workflows'}</button>
        </div>

        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            {[
              {label:'Active Workflows',value:stats.activeWorkflows,color:'bg-indigo-50'},
              {label:'Total Requests',value:stats.total,color:'bg-gray-50'},
              {label:'Pending',value:stats.pending,color:stats.pending>0?'bg-yellow-50':'bg-gray-50'},
              {label:'Approved',value:stats.approved,color:'bg-green-50'},
              {label:'Rejected',value:stats.rejected,color:stats.rejected>0?'bg-red-50':'bg-gray-50'},
              {label:'Cancelled',value:stats.cancelled,color:'bg-gray-50'},
            ].map(s=>(
              <div key={s.label} className={`${s.color} rounded-lg p-3 text-center`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-4 border-b">
          {TABS.map(t=><button key={t} onClick={()=>setActiveTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab===t?'border-indigo-600 text-indigo-600':'border-transparent text-gray-500'}`}>{t}{t==='Pending Approvals'&&stats?.pending>0&&<span className="ml-2 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full">{stats.pending}</span>}</button>)}
        </div>

        {activeTab==='Pending Approvals' && (
          <div className="space-y-3">
            {loading?<div className="text-center py-10 text-gray-400">Loading...</div>
            :pending.length===0?<div className="text-center py-16"><div className="text-4xl mb-3">✅</div><div className="text-gray-500">No pending approvals</div></div>
            :pending.map(r=>(
              <div key={r.id} className="bg-white rounded-xl border-l-4 border-yellow-400 shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{DOC_ICONS[r.documentType]||'📄'}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800">{r.documentNumber}</span>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{r.documentType.replace(/_/g,' ')}</span>
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-bold">Level {r.currentLevel}/{r.totalLevels}</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">{r.workflow?.name} · Submitted {fmtDate(r.createdAt)}</div>
                      {r.remarks && <div className="text-xs text-gray-400 mt-0.5">{r.remarks}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.amount && <span className="font-bold text-gray-700">{fmt(r.amount)}</span>}
                    <button onClick={()=>openDetail(r.id)} className="px-3 py-1 text-xs border rounded hover:bg-gray-50">View</button>
                    <button onClick={()=>{ setActionModal(r); setActionForm(f=>({...f,action:'APPROVED',comments:''})); }} className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Approve</button>
                    <button onClick={()=>{ setActionModal(r); setActionForm(f=>({...f,action:'REJECTED',comments:''})); }} className="px-3 py-1 text-xs bg-red-500 text-white rounded">Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab==='All Requests' && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-4 border-b flex gap-3">
              <select className="border rounded-lg px-3 py-2 text-sm" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1);}}>
                <option value="">All Status</option>
                {['PENDING','APPROVED','REJECTED','CANCELLED'].map(s=><option key={s}>{s}</option>)}
              </select>
              <span className="text-sm text-gray-500 self-center">{total} requests</span>
            </div>
            {requests.length===0?<div className="text-center py-10 text-gray-400">No requests found</div>
            :(
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Document','Type','Workflow','Amount','Level','Status','Submitted','Action'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {requests.map(r=>(
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><span className="mr-2">{DOC_ICONS[r.documentType]||'📄'}</span><span className="font-mono text-sm font-bold text-indigo-600">{r.documentNumber}</span></td>
                      <td className="px-4 py-3 text-xs">{r.documentType.replace(/_/g,' ')}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{r.workflow?.name||'—'}</td>
                      <td className="px-4 py-3 text-sm">{fmt(r.amount)}</td>
                      <td className="px-4 py-3 text-xs">{r.currentLevel}/{r.totalLevels}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[r.status]}`}>{r.status}</span></td>
                      <td className="px-4 py-3 text-xs">{fmtDate(r.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={()=>openDetail(r.id)} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">View</button>
                          {r.status==='PENDING' && <>
                            <button onClick={()=>{ setActionModal(r); setActionForm(f=>({...f,action:'APPROVED',comments:''})); }} className="px-2 py-1 text-xs bg-green-600 text-white rounded">✓</button>
                            <button onClick={()=>{ setActionModal(r); setActionForm(f=>({...f,action:'REJECTED',comments:''})); }} className="px-2 py-1 text-xs bg-red-500 text-white rounded">✗</button>
                            <button onClick={()=>handleCancel(r.id)} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">Cancel</button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {totalPages>1&&<div className="p-4 border-t flex justify-center gap-2"><button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button><span className="px-3 py-1 text-sm">{page} of {totalPages}</span><button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button></div>}
          </div>
        )}

        {activeTab==='Workflow Definitions' && (
          <div className="space-y-3">
            {workflows.length===0?<div className="text-center py-10 text-gray-400">No workflows. Click "Seed Default Workflows".</div>
            :workflows.map(wf=>(
              <div key={wf.id} className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{DOC_ICONS[wf.documentType]||'📄'}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-800">{wf.name}</span>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{wf.documentType.replace(/_/g,' ')}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{wf.levels} Level{wf.levels>1?'s':''}</span>
                        {wf.triggerCondition==='ABOVE_AMOUNT'&&<span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Above {fmt(wf.triggerAmount)}</span>}
                        {wf.triggerCondition==='ALWAYS'&&<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Always</span>}
                        {!wf.isActive&&<span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">INACTIVE</span>}
                      </div>
                      {wf.description&&<div className="text-sm text-gray-500 mt-1">{wf.description}</div>}
                      <div className="flex gap-2 mt-2">
                        {wf.steps?.map(s=>(
                          <div key={s.id} className="flex items-center gap-1 text-xs bg-gray-50 border rounded-lg px-3 py-1.5">
                            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">{s.level}</span>
                            <span>{s.stepName}</span>
                            {s.timeoutHours&&<span className="text-gray-400">· {s.timeoutHours}h</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{wf._count?.requests||0} requests</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{DOC_ICONS[viewDetail.documentType]||'📄'}</span>
                  <div>
                    <h2 className="text-lg font-bold">{viewDetail.documentNumber}</h2>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[viewDetail.status]}`}>{viewDetail.status}</span>
                  </div>
                </div>
                <button onClick={()=>setViewDetail(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="text-gray-500">Document Type:</span><span>{viewDetail.documentType.replace(/_/g,' ')}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Workflow:</span><span>{viewDetail.workflow?.name||'—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Amount:</span><span className="font-bold">{fmt(viewDetail.amount)}</span></div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="text-gray-500">Submitted:</span><span>{fmtDate(viewDetail.createdAt)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Level:</span><span>{viewDetail.currentLevel}/{viewDetail.totalLevels}</span></div>
                  </div>
                </div>
                {viewDetail.remarks&&<div className="p-3 bg-gray-50 rounded text-sm">{viewDetail.remarks}</div>}

                <div>
                  <div className="font-semibold text-gray-700 mb-2 text-sm">Approval Steps</div>
                  {viewDetail.workflow?.steps?.map(step=>{
                    const action = viewDetail.actions?.find(a=>a.level===step.level);
                    return (
                      <div key={step.id} className={`flex items-center gap-3 py-3 border-b ${viewDetail.currentLevel===step.level&&viewDetail.status==='PENDING'?'bg-yellow-50 -mx-2 px-2 rounded':''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${action?.action==='APPROVED'?'bg-green-100 text-green-700':action?.action==='REJECTED'?'bg-red-100 text-red-700':viewDetail.currentLevel===step.level?'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-400':'bg-gray-100 text-gray-400'}`}>{step.level}</div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{step.stepName}</div>
                          {action&&<div className="text-xs text-gray-500 mt-0.5">{action.action} on {fmtDate(action.actionDate)}{action.comments && <span> — {action.comments}</span>}</div>}
                          {!action&&viewDetail.currentLevel===step.level&&viewDetail.status==='PENDING'&&<div className="text-xs text-yellow-600 mt-0.5">⏳ Awaiting approval</div>}
                          {!action&&viewDetail.currentLevel!==step.level&&<div className="text-xs text-gray-400 mt-0.5">Not yet reached</div>}
                        </div>
                        <span className={`text-xs font-bold ${action?.action==='APPROVED'?'text-green-600':action?.action==='REJECTED'?'text-red-600':'text-gray-300'}`}>{action?.action||'—'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                {viewDetail.status==='PENDING'&&<>
                  <button onClick={()=>{ setActionModal(viewDetail); setActionForm(f=>({...f,action:'APPROVED',comments:''})); setViewDetail(null); }} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Approve</button>
                  <button onClick={()=>{ setActionModal(viewDetail); setActionForm(f=>({...f,action:'REJECTED',comments:''})); setViewDetail(null); }} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm">Reject</button>
                </>}
                <button onClick={()=>setViewDetail(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
              </div>
            </div>
          </div>
        )}

        {actionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className={`p-6 border-b flex justify-between ${actionForm.action==='APPROVED'?'border-green-200 bg-green-50':'border-red-200 bg-red-50'}`}>
                <h2 className={`text-lg font-bold ${actionForm.action==='APPROVED'?'text-green-700':'text-red-700'}`}>{actionForm.action==='APPROVED'?'✅ Approve':'❌ Reject'} — {actionModal.documentNumber}</h2>
                <button onClick={()=>setActionModal(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex gap-3">
                  <button onClick={()=>setActionForm(f=>({...f,action:"APPROVED"}))} className={`flex-1 py-2 rounded-lg text-sm font-medium ${actionForm.action==='APPROVED'?'bg-green-600 text-white':'border hover:bg-gray-50'}`}>✅ Approve</button>
                  <button onClick={()=>setActionForm(f=>({...f,action:"REJECTED"}))} className={`flex-1 py-2 rounded-lg text-sm font-medium ${actionForm.action==='REJECTED'?'bg-red-500 text-white':'border hover:bg-gray-50'}`}>❌ Reject</button>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Comments {actionForm.action==='REJECTED'?'*':'(optional)'}</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={actionForm.comments} onChange={e=>setActionForm(f=>({...f,comments:e.target.value}))} placeholder={actionForm.action==='APPROVED'?'Optional approval note...':'Reason for rejection (required)'} />
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={()=>setActionModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleAction} disabled={saving||(actionForm.action==='REJECTED'&&!actionForm.comments)} className={`px-4 py-2 text-white rounded-lg text-sm disabled:opacity-50 ${actionForm.action==='APPROVED'?'bg-green-600':'bg-red-500'}`}>{saving?'Processing...':(actionForm.action==='APPROVED'?'Confirm Approve':'Confirm Reject')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
