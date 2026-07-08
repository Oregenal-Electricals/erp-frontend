'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import DocumentAttachments from '@/components/shared/DocumentAttachments';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const STATUS_COLORS = { OPEN:'bg-blue-100 text-blue-700', INVESTIGATING:'bg-yellow-100 text-yellow-700', RESPONDED:'bg-purple-100 text-purple-700', CLOSED:'bg-green-100 text-green-700' };
const SEV_COLORS = { MINOR:'bg-gray-100 text-gray-600', MAJOR:'bg-orange-100 text-orange-700', CRITICAL:'bg-red-100 text-red-700' };
const TYPES = ['FUNCTIONAL','VISUAL','WRONG_ITEM','DAMAGED','DOCUMENTATION','PERFORMANCE'];
const REQUESTS = ['REPLACEMENT','CREDIT_NOTE','REPAIR','NONE'];

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [respondModal, setRespondModal] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedDetail, setExpandedDetail] = useState(null);
  const [form, setForm] = useState({ customerName:'', customerPo:'', invoiceNumber:'', itemCode:'', itemName:'', batchNumber:'', complaintType:'FUNCTIONAL', description:'', qtyAffected:'', customerRequest:'REPLACEMENT', severity:'MAJOR', assignedTo:'', remarks:'' });
  const [respondForm, setRespondForm] = useState({ rootCause:'', correctiveAction:'', eighthDNumber:'', remarks:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (severity) params.set('severity', severity);
    const [recRes, statsRes] = await Promise.all([
      fetch(`${API}/customer-complaints?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/customer-complaints/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (recRes.ok) { const d = await recRes.json(); setComplaints(d.data); setTotal(d.total); setTotalPages(d.totalPages); }
    if (statsRes.ok) setStats(await statsRes.json());
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, [page, search, status, severity]);

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { ...form, qtyAffected: parseFloat(form.qtyAffected)||0 };
    ['customerPo','invoiceNumber','batchNumber','assignedTo','remarks'].forEach(k=>{ if (!body[k]) delete body[k]; });
    const res = await fetch(`${API}/customer-complaints`, {
      method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    setSaving(false);
  }

  async function handleStatusUpdate(id, newStatus) {
    const res = await fetch(`${API}/customer-complaints/${id}`, {
      method:'PUT', headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},
      body: JSON.stringify({status:newStatus}),
    });
    if (res.ok) fetchAll();
    else { const d = await res.json(); alert(d.message); }
  }

  async function handleRespond() {
    setSaving(true);
    const body = {...respondForm};
    if (!body.eighthDNumber) delete body.eighthDNumber;
    if (!body.remarks) delete body.remarks;
    const res = await fetch(`${API}/customer-complaints/${respondModal}/respond`, {
      method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},
      body: JSON.stringify(body),
    });
    if (res.ok) { setRespondModal(null); fetchAll(); }
    else { const d = await res.json(); alert(d.message); }
    setSaving(false);
  }

  async function handleClose(id) {
    const res = await fetch(`${API}/customer-complaints/${id}/close`, { method:'POST', headers:{Authorization:`Bearer ${getToken()}`} });
    if (res.ok) fetchAll();
    else { const d = await res.json(); alert(d.message); }
  }

  async function handleExpand(id) {
    if (expandedId===id) { setExpandedId(null); setExpandedDetail(null); return; }
    setExpandedId(id);
    const res = await fetch(`${API}/customer-complaints/${id}`, { headers:{Authorization:`Bearer ${getToken()}`} });
    if (res.ok) setExpandedDetail(await res.json());
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Complaints</h1>
            <p className="text-gray-500 text-sm mt-1">Track, investigate and resolve customer quality complaints</p>
          </div>
          <button onClick={()=>{setForm({customerName:'',customerPo:'',invoiceNumber:'',itemCode:'',itemName:'',batchNumber:'',complaintType:'FUNCTIONAL',description:'',qtyAffected:'',customerRequest:'REPLACEMENT',severity:'MAJOR',assignedTo:'',remarks:''});setError('');setShowModal(true);}} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium">+ Register Complaint</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mb-6">
            {[
              {label:'Total',value:stats.total,color:'bg-gray-50'},
              {label:'Open',value:stats.open,color:'bg-blue-50'},
              {label:'Investigating',value:stats.investigating,color:'bg-yellow-50'},
              {label:'Responded',value:stats.responded,color:'bg-purple-50'},
              {label:'Closed',value:stats.closed,color:'bg-green-50'},
              {label:'Critical',value:stats.critical,color:'bg-red-50'},
              {label:'Major',value:stats.major,color:'bg-orange-50'},
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
            <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search CC number, customer, item..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
              <option value="">All Status</option>
              {Object.keys(STATUS_COLORS).map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <select className="border rounded-lg px-3 py-2 text-sm" value={severity} onChange={e=>{setSeverity(e.target.value);setPage(1);}}>
              <option value="">All Severity</option>
              {['MINOR','MAJOR','CRITICAL'].map(s=><option key={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} complaints</span>
          </div>

          <div className="divide-y">
            {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
            : complaints.length===0 ? <div className="text-center py-10 text-gray-400">No complaints found</div>
            : complaints.map(c=>(
              <div key={c.id}>
                <div className="p-4 hover:bg-gray-50 cursor-pointer" onClick={()=>handleExpand(c.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono font-bold text-red-600">{c.complaintNumber}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${SEV_COLORS[c.severity]}`}>{c.severity}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">{c.complaintType?.replace(/_/g,' ')}</span>
                      <span className="text-xs font-medium text-gray-700">{c.customerName}</span>
                      <span className="font-mono text-xs text-blue-600">{c.itemCode}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{fmtDate(c.complaintDate)}</span>
                      {c.status==='OPEN' && <button onClick={e=>{e.stopPropagation();handleStatusUpdate(c.id,'INVESTIGATING');}} className="px-2 py-1 text-xs bg-yellow-500 text-white rounded">Investigate</button>}
                      {['OPEN','INVESTIGATING'].includes(c.status) && <button onClick={e=>{e.stopPropagation();setRespondModal(c.id);setRespondForm({rootCause:'',correctiveAction:'',eighthDNumber:'',remarks:''});}} className="px-2 py-1 text-xs bg-purple-600 text-white rounded">Respond</button>}
                      {c.status==='RESPONDED' && <button onClick={e=>{e.stopPropagation();handleClose(c.id);}} className="px-2 py-1 text-xs bg-green-600 text-white rounded">Close</button>}
                      <span className="text-gray-400 text-xs">{expandedId===c.id?'▲':'▼'}</span>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-gray-600 line-clamp-1">{c.description}</div>
                  {c.qtyAffected > 0 && <div className="mt-1 text-xs text-orange-500">Qty affected: {c.qtyAffected} units · Request: {c.customerRequest?.replace(/_/g,' ')||'—'}</div>}
                </div>

                {expandedId===c.id && expandedDetail && (
                  <div className="px-6 pb-6 bg-red-50 border-t">
                    <div className="grid grid-cols-2 gap-6 mt-4">
                      <div className="bg-white rounded-xl border p-4">
                        <div className="text-sm font-semibold text-gray-700 mb-3">Complaint Details</div>
                        <div className="space-y-2 text-xs">
                          {expandedDetail.customerPo && <div className="flex justify-between"><span className="text-gray-500">Customer PO:</span><span className="font-mono">{expandedDetail.customerPo}</span></div>}
                          {expandedDetail.invoiceNumber && <div className="flex justify-between"><span className="text-gray-500">Invoice:</span><span className="font-mono">{expandedDetail.invoiceNumber}</span></div>}
                          {expandedDetail.batchNumber && <div className="flex justify-between"><span className="text-gray-500">Batch:</span><span className="font-mono">{expandedDetail.batchNumber}</span></div>}
                          <div className="flex justify-between"><span className="text-gray-500">Qty Affected:</span><span className="font-bold text-red-600">{expandedDetail.qtyAffected}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Customer Request:</span><span>{expandedDetail.customerRequest?.replace(/_/g,' ')||'—'}</span></div>
                          {expandedDetail.assignedTo && <div className="flex justify-between"><span className="text-gray-500">Assigned To:</span><span>{expandedDetail.assignedTo}</span></div>}
                        </div>
                        <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-700">{expandedDetail.description}</div>
                      </div>
                      <div className="bg-white rounded-xl border p-4">
                        <div className="text-sm font-semibold text-gray-700 mb-3">Investigation & Response</div>
                        {expandedDetail.rootCause ? (
                          <div className="space-y-2 text-xs">
                            <div><span className="font-semibold text-gray-600">Root Cause:</span><div className="mt-1 text-gray-700">{expandedDetail.rootCause}</div></div>
                            <div><span className="font-semibold text-gray-600">Corrective Action:</span><div className="mt-1 text-gray-700">{expandedDetail.correctiveAction}</div></div>
                            {expandedDetail.eighthDNumber && <div className="flex justify-between"><span className="text-gray-500">8D Report:</span><span className="font-mono text-blue-600 font-bold">{expandedDetail.eighthDNumber}</span></div>}
                            {expandedDetail.responseDate && <div className="flex justify-between"><span className="text-gray-500">Responded:</span><span>{fmtDate(expandedDetail.responseDate)}</span></div>}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-400 text-xs">Investigation pending</div>
                        )}
                        {expandedDetail.closedDate && (
                          <div className="mt-3 p-2 bg-green-50 rounded text-xs text-green-700">✅ Closed on {fmtDate(expandedDetail.closedDate)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-red-700">Register Customer Complaint</h2>
                <button onClick={()=>setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Customer Name *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.customerName} onChange={e=>setForm(f=>({...f,customerName:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Customer PO</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.customerPo} onChange={e=>setForm(f=>({...f,customerPo:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Invoice Number</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.invoiceNumber} onChange={e=>setForm(f=>({...f,invoiceNumber:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Item Code *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.itemCode} onChange={e=>setForm(f=>({...f,itemCode:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Item Name *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.itemName} onChange={e=>setForm(f=>({...f,itemName:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Complaint Type *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.complaintType} onChange={e=>setForm(f=>({...f,complaintType:e.target.value}))}>
                      {TYPES.map(t=><option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Severity *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.severity} onChange={e=>setForm(f=>({...f,severity:e.target.value}))}>
                      {['MINOR','MAJOR','CRITICAL'].map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Qty Affected</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.qtyAffected} onChange={e=>setForm(f=>({...f,qtyAffected:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Customer Request</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.customerRequest} onChange={e=>setForm(f=>({...f,customerRequest:e.target.value}))}>
                      {REQUESTS.map(r=><option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Assigned To</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.assignedTo} onChange={e=>setForm(f=>({...f,assignedTo:e.target.value}))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Description *</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Describe the customer complaint in detail..." />
                  </div>
                </div>

              <DocumentAttachments referenceType="COMPLAINT" referenceId={viewDetail?.id} referenceNumber={viewDetail?.complaintNumber} title="Complaint Attachments" />
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={()=>setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Registering...':'Register Complaint'}</button>
              </div>
            </div>
          </div>
        )}

        {respondModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold text-purple-700">Respond to Customer</h2>
                <button onClick={()=>setRespondModal(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Root Cause *</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={respondForm.rootCause} onChange={e=>setRespondForm(f=>({...f,rootCause:e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Corrective Action *</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={respondForm.correctiveAction} onChange={e=>setRespondForm(f=>({...f,correctiveAction:e.target.value}))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">8D Report Number</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={respondForm.eighthDNumber} onChange={e=>setRespondForm(f=>({...f,eighthDNumber:e.target.value}))} placeholder="8D-2026-0001" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Remarks</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={respondForm.remarks} onChange={e=>setRespondForm(f=>({...f,remarks:e.target.value}))} />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={()=>setRespondModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleRespond} disabled={saving} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Sending...':'Send Response'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
