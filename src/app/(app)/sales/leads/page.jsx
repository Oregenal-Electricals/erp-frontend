'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import DocumentAttachments from '@/components/shared/DocumentAttachments';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;

const STATUS_COLORS = { NEW:'bg-gray-100 text-gray-600', CONTACTED:'bg-blue-100 text-blue-700', QUALIFIED:'bg-green-100 text-green-700', CONVERTED:'bg-purple-100 text-purple-700', LOST:'bg-red-100 text-red-600' };
const SOURCE_COLORS = { REFERRAL:'bg-green-50 text-green-700', COLD_CALL:'bg-blue-50 text-blue-700', EXHIBITION:'bg-purple-50 text-purple-700', WEBSITE:'bg-yellow-50 text-yellow-700', EXISTING_CUSTOMER:'bg-teal-50 text-teal-700', OTHER:'bg-gray-50 text-gray-600' };
const SOURCES = ['REFERRAL','COLD_CALL','EXHIBITION','WEBSITE','EXISTING_CUSTOMER','OTHER'];
const STATUSES = ['NEW','CONTACTED','QUALIFIED','CONVERTED','LOST'];

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(null);
  const [showLostModal, setShowLostModal] = useState(null);
  const [form, setForm] = useState({ companyName:'', contactPerson:'', phone:'', email:'', source:'COLD_CALL', productInterest:'', estimatedValue:'', followUpDate:'', assignedTo:'', remarks:'' });
  const [updateForm, setUpdateForm] = useState({ status:'', followUpNotes:'', followUpDate:'', estimatedValue:'' });
  const [lostReason, setLostReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (source) params.set('source', source);
    const [recRes, statsRes] = await Promise.all([
      fetch(`${API}/leads?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/leads/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (recRes.ok) { const d = await recRes.json(); setLeads(d.data); setTotal(d.total); setTotalPages(d.totalPages); }
    if (statsRes.ok) setStats(await statsRes.json());
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, [page, search, status, source]);

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { ...form };
    if (body.estimatedValue) body.estimatedValue = parseFloat(body.estimatedValue);
    else delete body.estimatedValue;
    ['phone','email','productInterest','followUpDate','assignedTo','remarks'].forEach(k => { if (!body[k]) delete body[k]; });
    if (body.followUpDate) body.followUpDate = new Date(body.followUpDate).toISOString();
    const res = await fetch(`${API}/leads`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    setSaving(false);
  }

  async function handleUpdate() {
    setSaving(true);
    const body = { ...updateForm };
    if (!body.followUpNotes) delete body.followUpNotes;
    if (!body.followUpDate) delete body.followUpDate;
    else body.followUpDate = new Date(body.followUpDate).toISOString();
    if (body.estimatedValue) body.estimatedValue = parseFloat(body.estimatedValue);
    else delete body.estimatedValue;
    const res = await fetch(`${API}/leads/${showUpdateModal}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    if (res.ok) { setShowUpdateModal(null); fetchAll(); }
    else { const d = await res.json(); alert(d.message); }
    setSaving(false);
  }

  async function handleLost() {
    if (!lostReason) { alert('Please enter a lost reason'); return; }
    setSaving(true);
    const res = await fetch(`${API}/leads/${showLostModal}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ status: 'LOST', lostReason }),
    });
    if (res.ok) { setShowLostModal(null); setLostReason(''); fetchAll(); }
    else { const d = await res.json(); alert(d.message); }
    setSaving(false);
  }

  async function handleConvert(id) {
    const res = await fetch(`${API}/leads/${id}/convert`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) fetchAll();
    else { const d = await res.json(); alert(d.message); }
  }

  const isOverdue = l => l.followUpDate && new Date(l.followUpDate) < new Date() && !['CONVERTED','LOST'].includes(l.status);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lead Management</h1>
            <p className="text-gray-500 text-sm mt-1">Track sales prospects and pipeline from first contact to conversion</p>
          </div>
          <button onClick={()=>{ setForm({companyName:'',contactPerson:'',phone:'',email:'',source:'COLD_CALL',productInterest:'',estimatedValue:'',followUpDate:'',assignedTo:'',remarks:''}); setError(''); setShowModal(true); }} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium">+ Add Lead</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            {[
              {label:'Total',value:stats.total,color:'bg-gray-50'},
              {label:'New',value:stats.new,color:'bg-gray-50'},
              {label:'Contacted',value:stats.contacted,color:'bg-blue-50'},
              {label:'Qualified',value:stats.qualified,color:'bg-green-50'},
              {label:'Converted',value:stats.converted,color:'bg-purple-50'},
              {label:'Lost',value:stats.lost,color:'bg-red-50'},
              {label:'Overdue',value:stats.overdueFollowup,color:'bg-orange-50'},
              {label:'Pipeline',value:fmt(stats.qualifiedPipelineValue),color:'bg-teal-50'},
            ].map(s=>(
              <div key={s.label} className={`${s.color} rounded-lg p-3 text-center`}>
                <div className="text-lg font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex gap-3 flex-wrap">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search lead number, company, contact..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
              <option value="">All Status</option>
              {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <select className="border rounded-lg px-3 py-2 text-sm" value={source} onChange={e=>{setSource(e.target.value);setPage(1);}}>
              <option value="">All Sources</option>
              {SOURCES.map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} leads</span>
          </div>

          <div className="divide-y">
            {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
            : leads.length===0 ? <div className="text-center py-10 text-gray-400">No leads found</div>
            : leads.map(l=>(
              <div key={l.id} className={`p-4 hover:bg-gray-50 ${isOverdue(l)?'border-l-4 border-orange-400':''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono font-bold text-green-600">{l.leadNumber}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[l.status]}`}>{l.status}</span>
                    <span className={`px-2 py-1 rounded text-xs ${SOURCE_COLORS[l.source]}`}>{l.source?.replace(/_/g,' ')}</span>
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{l.companyName}</div>
                      <div className="text-xs text-gray-500">{l.contactPerson} {l.phone && `· ${l.phone}`}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {l.estimatedValue && <span className="text-sm font-bold text-teal-600">{fmt(l.estimatedValue)}</span>}
                    {l.followUpDate && <span className={`text-xs ${isOverdue(l)?'text-orange-600 font-bold':'text-gray-400'}`}>Follow-up: {fmtDate(l.followUpDate)}{isOverdue(l)?' ⚠':''}</span>}
                    {!['CONVERTED','LOST'].includes(l.status) && (
                      <>
                        <button onClick={()=>{setShowUpdateModal(l.id);setUpdateForm({status:l.status,followUpNotes:'',followUpDate:'',estimatedValue:''});}} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">Update</button>
                        {l.status==='QUALIFIED' && <button onClick={()=>handleConvert(l.id)} className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700">Convert</button>}
                        <button onClick={()=>{setShowLostModal(l.id);setLostReason('');}} className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">Lost</button>
                      </>
                    )}
                  </div>
                </div>
                {l.productInterest && <div className="mt-1 text-xs text-gray-500 ml-0">📦 {l.productInterest}</div>}
                {l.followUpNotes && <div className="mt-1 text-xs text-blue-600 ml-0">📝 {l.followUpNotes}</div>}
                {l.lostReason && <div className="mt-1 text-xs text-red-500">❌ Lost: {l.lostReason}</div>}
                {l.assignedTo && <div className="mt-1 text-xs text-gray-400">👤 {l.assignedTo}</div>}
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="p-4 border-t flex justify-center gap-2">
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button>
              <span className="px-3 py-1 text-sm">{page} of {totalPages}</span>
              <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-green-700">Add New Lead</h2>
                <button onClick={()=>setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className="block text-sm text-gray-600 mb-1">Company Name *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.companyName} onChange={e=>setForm(f=>({...f,companyName:e.target.value}))} /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">Contact Person *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.contactPerson} onChange={e=>setForm(f=>({...f,contactPerson:e.target.value}))} /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">Phone</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">Email</label><input type="email" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">Source *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.source} onChange={e=>setForm(f=>({...f,source:e.target.value}))}>
                      {SOURCES.map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2"><label className="block text-sm text-gray-600 mb-1">Product Interest</label><input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. PCB Assembly - 500 units/month" value={form.productInterest} onChange={e=>setForm(f=>({...f,productInterest:e.target.value}))} /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">Estimated Value (₹)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.estimatedValue} onChange={e=>setForm(f=>({...f,estimatedValue:e.target.value}))} /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">Follow-up Date</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.followUpDate} onChange={e=>setForm(f=>({...f,followUpDate:e.target.value}))} /></div>
                  <div className="col-span-2"><label className="block text-sm text-gray-600 mb-1">Assigned To</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.assignedTo} onChange={e=>setForm(f=>({...f,assignedTo:e.target.value}))} /></div>
                </div>

              <DocumentAttachments referenceType="LEAD" referenceId={viewDetail?.id} referenceNumber={viewDetail?.leadNumber} title="Lead Attachments" />
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={()=>setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Adding...':'Add Lead'}</button>
              </div>
            </div>
          </div>
        )}

        {showUpdateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold">Update Lead</h2>
                <button onClick={()=>setShowUpdateModal(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div><label className="block text-sm text-gray-600 mb-1">Status</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={updateForm.status} onChange={e=>setUpdateForm(f=>({...f,status:e.target.value}))}>
                    {['NEW','CONTACTED','QUALIFIED'].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm text-gray-600 mb-1">Follow-up Notes</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={updateForm.followUpNotes} onChange={e=>setUpdateForm(f=>({...f,followUpNotes:e.target.value}))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm text-gray-600 mb-1">Next Follow-up</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={updateForm.followUpDate} onChange={e=>setUpdateForm(f=>({...f,followUpDate:e.target.value}))} /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">Est. Value (₹)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={updateForm.estimatedValue} onChange={e=>setUpdateForm(f=>({...f,estimatedValue:e.target.value}))} /></div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={()=>setShowUpdateModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleUpdate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Saving...':'Update'}</button>
              </div>
            </div>
          </div>
        )}

        {showLostModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold text-red-700">Mark Lead as Lost</h2>
                <button onClick={()=>setShowLostModal(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6">
                <label className="block text-sm text-gray-600 mb-2">Lost Reason *</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} placeholder="Why was this lead lost?" value={lostReason} onChange={e=>setLostReason(e.target.value)} />
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={()=>setShowLostModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleLost} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Saving...':'Mark Lost'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
