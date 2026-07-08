'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

  async function downloadExcel(endpoint, filename) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=filename+'.xlsx'; a.click();
      URL.revokeObjectURL(url);
    }
  }

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const TABS = ['My Tasks','All Tasks','Create Task'];
const PRIORITIES = ['LOW','MEDIUM','HIGH','URGENT'];
const CATEGORIES = ['QUALITY','PURCHASE','SALES','FINANCE','PRODUCTION','GENERAL'];
const STATUSES = ['OPEN','IN_PROGRESS','COMPLETED','CANCELLED'];
const PRIORITY_COLORS = { LOW:'bg-gray-100 text-gray-600', MEDIUM:'bg-blue-100 text-blue-700', HIGH:'bg-orange-100 text-orange-700', URGENT:'bg-red-100 text-red-700' };
const STATUS_COLORS = { OPEN:'bg-yellow-100 text-yellow-700', IN_PROGRESS:'bg-blue-100 text-blue-700', COMPLETED:'bg-green-100 text-green-700', CANCELLED:'bg-gray-100 text-gray-500' };
const CAT_ICONS = { QUALITY:'🔍', PURCHASE:'🛒', SALES:'📋', FINANCE:'💰', PRODUCTION:'⚙️', GENERAL:'📌' };

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState('My Tasks');
  const [tasks, setTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [viewDetail, setViewDetail] = useState(null);
  const [comment, setComment] = useState('');
  const [completionNote, setCompletionNote] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(null);
  const [form, setForm] = useState({ title:'', description:'', assignedTo:'', dueDate:'', priority:'MEDIUM', category:'GENERAL', referenceType:'', referenceNumber:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ page, limit:20 });
    if (statusFilter) params.set('status', statusFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    const [tRes, mRes, sRes, uRes] = await Promise.all([
      fetch(`${API}/tasks?${params}`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/tasks?myTasks=true&status=OPEN&limit=50`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/tasks/stats`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/users?limit=100`, {headers:{Authorization:`Bearer ${getToken()}`}}),
    ]);
    if (tRes.ok) { const d=await tRes.json(); setTasks(d.data||[]); setTotal(d.total); setTotalPages(d.totalPages||1); }
    if (mRes.ok) { const d=await mRes.json(); setMyTasks(d.data||[]); }
    if (sRes.ok) setStats(await sRes.json());
    if (uRes.ok) { const d=await uRes.json(); setUsers(d.data||d||[]); }
    setLoading(false);
  }

  useEffect(()=>{ fetchAll(); },[page, statusFilter, priorityFilter, categoryFilter]);

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { ...form, dueDate: new Date(form.dueDate).toISOString() };
    if (!body.description) delete body.description;
    if (!body.referenceType) delete body.referenceType;
    if (!body.referenceNumber) delete body.referenceNumber;
    const res = await fetch(`${API}/tasks`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    const data = await res.json();
    if (res.ok) { setForm({title:'',description:'',assignedTo:'',dueDate:'',priority:'MEDIUM',category:'GENERAL',referenceType:'',referenceNumber:''}); setActiveTab('All Tasks'); fetchAll(); }
    else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    setSaving(false);
  }

  async function handleStatus(id, status, note) {
    const body = { status };
    if (note) body.completionNote = note;
    const res = await fetch(`${API}/tasks/${id}/status`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    if (res.ok) { fetchAll(); if(viewDetail?.id===id){const d=await fetch(`${API}/tasks/${id}`,{headers:{Authorization:`Bearer ${getToken()}`}});if(d.ok)setViewDetail(await d.json());} }
    else { const d=await res.json(); alert(d.message); }
  }

  async function handleComment() {
    if (!comment.trim()) return;
    const res = await fetch(`${API}/tasks/${viewDetail.id}/comments`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify({comment})});
    if (res.ok) { setComment(''); const d=await fetch(`${API}/tasks/${viewDetail.id}`,{headers:{Authorization:`Bearer ${getToken()}`}});if(d.ok)setViewDetail(await d.json()); }
  }

  async function openDetail(id) {
    const res = await fetch(`${API}/tasks/${id}`,{headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setViewDetail(await res.json());
  }

  const isOverdue = t => ['OPEN','IN_PROGRESS'].includes(t.status) && new Date(t.dueDate) < new Date();
  const getUserName = id => users.find(u=>u.id===id)?.name || users.find(u=>u.id===id)?.email || id?.substring(0,8)+'...';

  function TaskCard({ t, compact=false }) {
    return (
      <div className={`bg-white rounded-xl border shadow-sm p-4 ${isOverdue(t)?'border-l-4 border-red-400':t.priority==='URGENT'?'border-l-4 border-orange-500':''} cursor-pointer hover:shadow-md transition-shadow`} onClick={()=>openDetail(t.id)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 flex-1">
            <span className="text-lg mt-0.5">{CAT_ICONS[t.category]||'📌'}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-gray-400">{t.taskNumber}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[t.status]}`}>{t.status.replace(/_/g,' ')}</span>
                {isOverdue(t) && <span className="text-xs text-red-600 font-bold">⚠ OVERDUE</span>}
              </div>
              <div className="font-medium text-gray-800 mt-1 text-sm">{t.title}</div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                <span>Due: {fmtDate(t.dueDate)}</span>
                <span>→ {getUserName(t.assignedTo)}</span>
                {t.referenceNumber && <span className="font-mono bg-gray-100 px-1.5 rounded">{t.referenceNumber}</span>}
                {t._count?.comments > 0 && <span>💬 {t._count.comments}</span>}
              </div>
            </div>
          </div>
          {!compact && t.status!=='COMPLETED' && t.status!=='CANCELLED' && (
            <div className="flex flex-col gap-1" onClick={e=>e.stopPropagation()}>
              {t.status==='OPEN' && <button onClick={()=>handleStatus(t.id,'IN_PROGRESS')} className="px-2 py-1 text-xs bg-blue-600 text-white rounded">Start</button>}
              {t.status==='IN_PROGRESS' && <button onClick={()=>{setShowCompleteModal(t);setCompletionNote('');}} className="px-2 py-1 text-xs bg-green-600 text-white rounded">Complete</button>}
              <button onClick={()=>handleStatus(t.id,'CANCELLED')} className="px-2 py-1 text-xs border rounded text-gray-500">Cancel</button>
          <button onClick={()=>downloadExcel('/excel/tasks','Tasks')} className="px-3 py-2 text-sm border border-green-300 text-green-700 rounded-lg hover:bg-green-50">⬇ Excel</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
            <p className="text-gray-500 text-sm mt-1">Assign, track and complete tasks across all departments</p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-7 gap-3 mb-6">
            {[
              {label:'Total',value:stats.total,color:'bg-gray-50'},
              {label:'My Open',value:stats.myOpen,color:stats.myOpen>0?'bg-yellow-50':'bg-gray-50'},
              {label:'Open',value:stats.open,color:'bg-yellow-50'},
              {label:'In Progress',value:stats.inProgress,color:'bg-blue-50'},
              {label:'Completed',value:stats.completed,color:'bg-green-50'},
              {label:'Cancelled',value:stats.cancelled,color:'bg-gray-50'},
              {label:'Overdue',value:stats.overdue,color:stats.overdue>0?'bg-red-50':'bg-gray-50'},
            ].map(s=>(
              <div key={s.label} className={`${s.color} rounded-lg p-3 text-center`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-4 border-b">
          {TABS.map(t=><button key={t} onClick={()=>setActiveTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab===t?'border-indigo-600 text-indigo-600':'border-transparent text-gray-500'}`}>{t}{t==='My Tasks'&&stats?.myOpen>0&&<span className="ml-2 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">{stats.myOpen}</span>}</button>)}
        </div>

        {activeTab==='My Tasks' && (
          <div className="space-y-3">
            {loading?<div className="text-center py-10 text-gray-400">Loading...</div>
            :myTasks.length===0?<div className="text-center py-16"><div className="text-4xl mb-3">✅</div><div className="text-gray-500">No open tasks assigned to you</div></div>
            :myTasks.map(t=><TaskCard key={t.id} t={t} />)}
          </div>
        )}

        {activeTab==='All Tasks' && (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <select className="border rounded-lg px-3 py-2 text-sm" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1);}}>
                <option value="">All Status</option>
                {STATUSES.map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
              </select>
              <select className="border rounded-lg px-3 py-2 text-sm" value={priorityFilter} onChange={e=>{setPriorityFilter(e.target.value);setPage(1);}}>
                <option value="">All Priority</option>
                {PRIORITIES.map(p=><option key={p}>{p}</option>)}
              </select>
              <select className="border rounded-lg px-3 py-2 text-sm" value={categoryFilter} onChange={e=>{setCategoryFilter(e.target.value);setPage(1);}}>
                <option value="">All Categories</option>
                {CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
              <span className="text-sm text-gray-500 self-center">{total} tasks</span>
            </div>
            <div className="space-y-3">
              {loading?<div className="text-center py-10 text-gray-400">Loading...</div>
              :tasks.length===0?<div className="text-center py-10 text-gray-400">No tasks found</div>
              :tasks.map(t=><TaskCard key={t.id} t={t} />)}
            </div>
            {totalPages>1&&<div className="flex justify-center gap-2"><button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button><span className="px-3 py-1 text-sm">{page} of {totalPages}</span><button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button></div>}
          </div>
        )}

        {activeTab==='Create Task' && (
          <div className="bg-white rounded-xl border shadow-sm p-6 max-w-2xl">
            <h2 className="font-bold text-gray-800 mb-4">New Task</h2>
            {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm mb-4">{error}</div>}
            <div className="space-y-4">
              <div><label className="block text-sm text-gray-600 mb-1">Title *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="What needs to be done?" /></div>
              <div><label className="block text-sm text-gray-600 mb-1">Description</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-gray-600 mb-1">Assign To *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.assignedTo} onChange={e=>setForm(f=>({...f,assignedTo:e.target.value}))}>
                    <option value="">— Select User —</option>
                    {users.map(u=><option key={u.id} value={u.id}>{u.name||u.email}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm text-gray-600 mb-1">Due Date *</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))} /></div>
                <div><label className="block text-sm text-gray-600 mb-1">Priority</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>
                    {PRIORITIES.map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm text-gray-600 mb-1">Category</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                    {CATEGORIES.map(c=><option key={c}>{CAT_ICONS[c]} {c}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm text-gray-600 mb-1">Reference Type</label><input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="NCR, PO, SO, INVOICE..." value={form.referenceType} onChange={e=>setForm(f=>({...f,referenceType:e.target.value}))} /></div>
                <div><label className="block text-sm text-gray-600 mb-1">Reference Number</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="NCR-2026-0001" value={form.referenceNumber} onChange={e=>setForm(f=>({...f,referenceNumber:e.target.value}))} /></div>
              </div>
              <button onClick={handleCreate} disabled={saving||!form.title||!form.assignedTo||!form.dueDate} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Creating...':'Create Task'}</button>
            </div>
          </div>
        )}

        {/* DETAIL MODAL */}
        {viewDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{CAT_ICONS[viewDetail.category]||'📌'}</span>
                  <div>
                    <div className="font-mono text-xs text-gray-400">{viewDetail.taskNumber}</div>
                    <div className="font-bold text-gray-800">{viewDetail.title}</div>
                  </div>
                </div>
                <button onClick={()=>setViewDetail(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${PRIORITY_COLORS[viewDetail.priority]}`}>{viewDetail.priority}</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${STATUS_COLORS[viewDetail.status]}`}>{viewDetail.status.replace(/_/g,' ')}</span>
                  <span className="px-2 py-1 rounded text-xs bg-indigo-100 text-indigo-700">{viewDetail.category}</span>
                  {isOverdue(viewDetail) && <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700 font-bold">⚠ OVERDUE</span>}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Assigned To:</span><span>{getUserName(viewDetail.assignedTo)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Due Date:</span><span className={isOverdue(viewDetail)?'text-red-600 font-bold':''}>{fmtDate(viewDetail.dueDate)}</span></div>
                  {viewDetail.referenceNumber && <div className="flex justify-between"><span className="text-gray-500">Reference:</span><span className="font-mono text-blue-600">{viewDetail.referenceNumber}</span></div>}
                  {viewDetail.completedDate && <div className="flex justify-between"><span className="text-gray-500">Completed:</span><span className="text-green-600">{fmtDate(viewDetail.completedDate)}</span></div>}
                </div>
                {viewDetail.description && <div className="p-3 bg-gray-50 rounded text-sm">{viewDetail.description}</div>}
                {viewDetail.completionNote && <div className="p-3 bg-green-50 rounded text-sm"><span className="font-semibold text-green-700">Completion Note: </span>{viewDetail.completionNote}</div>}

                {viewDetail.comments?.length > 0 && (
                  <div>
                    <div className="font-semibold text-gray-700 text-sm mb-2">Comments ({viewDetail.comments.length})</div>
                    {viewDetail.comments.map(c=>(
                      <div key={c.id} className="flex gap-2 py-2 border-b text-sm">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">{getUserName(c.commentBy).substring(0,1).toUpperCase()}</div>
                        <div><div className="text-xs text-gray-400 mb-0.5">{getUserName(c.commentBy)} · {fmtDate(c.createdAt)}</div><div>{c.comment}</div></div>
                      </div>
                    ))}
                  </div>
                )}

                {viewDetail.status!=='COMPLETED'&&viewDetail.status!=='CANCELLED' && (
                  <div className="flex gap-2">
                    <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Add a comment..." value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleComment()} />
                    <button onClick={handleComment} disabled={!comment.trim()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">Add</button>
                  </div>
                )}
              </div>
              <div className="p-6 border-t flex justify-end gap-2 sticky bottom-0 bg-white">
                {viewDetail.status==='OPEN'&&<button onClick={()=>handleStatus(viewDetail.id,'IN_PROGRESS')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Start Task</button>}
                {viewDetail.status==='IN_PROGRESS'&&<button onClick={()=>{setShowCompleteModal(viewDetail);setCompletionNote('');setViewDetail(null);}} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Mark Complete</button>}
                {['OPEN','IN_PROGRESS'].includes(viewDetail.status)&&<button onClick={()=>handleStatus(viewDetail.id,'CANCELLED')} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>}
                <button onClick={()=>setViewDetail(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* COMPLETE MODAL */}
        {showCompleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b bg-green-50"><h2 className="text-lg font-bold text-green-700">✅ Complete Task</h2><div className="text-sm text-gray-600 mt-1">{showCompleteModal.title}</div></div>
              <div className="p-6">
                <label className="block text-sm text-gray-600 mb-2">Completion Note</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={completionNote} onChange={e=>setCompletionNote(e.target.value)} placeholder="What was done / outcome..." />
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={()=>setShowCompleteModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={()=>{ handleStatus(showCompleteModal.id,'COMPLETED',completionNote); setShowCompleteModal(null); }} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Confirm Complete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
