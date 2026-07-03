'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import DocumentAttachments from '@/components/shared/DocumentAttachments';

const API = process.env.NEXT_PUBLIC_API_URL;

async function downloadPdf(id) {
  const res = await fetch(`${API}/pdf/ncr/${id}`, {headers:{Authorization:`Bearer ${getToken()}`}});
  if (res.ok) {
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='NCR-'+id+'.pdf'; a.click();
    URL.revokeObjectURL(url);
  } else alert('PDF generation failed');
}

function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const SEVERITY_COLORS = { MINOR:'bg-gray-100 text-gray-600', MAJOR:'bg-orange-100 text-orange-700', CRITICAL:'bg-red-100 text-red-700' };
const STATUS_COLORS = { OPEN:'bg-blue-100 text-blue-700', ROOT_CAUSE_PENDING:'bg-yellow-100 text-yellow-700', CAPA_PENDING:'bg-orange-100 text-orange-700', VERIFICATION_PENDING:'bg-purple-100 text-purple-700', CLOSED:'bg-green-100 text-green-700' };
const SOURCES = ['IQC','IPQC','OQC','CUSTOMER_COMPLAINT','INTERNAL_AUDIT','SUPPLIER','INTERNAL'];
const DISPOSITIONS = ['USE_AS_IS','REWORK','SCRAP','RETURN_TO_VENDOR'];

export default function NcrPage() {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showCapa, setShowCapa] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedDetail, setExpandedDetail] = useState(null);
  const [form, setForm] = useState({ source:'IQC', sourceReferenceNumber:'', itemCode:'', itemName:'', description:'', severity:'MAJOR', qtyAffected:'', detectedBy:'', disposition:'', remarks:'' });
  const [capaForm, setCapaForm] = useState({ rootCause:'', correctiveAction:'', preventiveAction:'', assignedTo:'', dueDate:'' });
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
      fetch(`${API}/ncr?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/ncr/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (recRes.ok) { const d = await recRes.json(); setRecords(d.data); setTotal(d.total); setTotalPages(d.totalPages); }
    if (statsRes.ok) setStats(await statsRes.json());
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, [page, search, status, severity]);

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { ...form, qtyAffected: parseFloat(form.qtyAffected)||0 };
    if (!body.sourceReferenceNumber) delete body.sourceReferenceNumber;
    if (!body.itemCode) delete body.itemCode;
    if (!body.itemName) delete body.itemName;
    if (!body.detectedBy) delete body.detectedBy;
    if (!body.disposition) delete body.disposition;
    if (!body.remarks) delete body.remarks;
    const res = await fetch(`${API}/ncr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    setSaving(false);
  }

  async function handleCreateCapa() {
    setSaving(true);
    const body = { ...capaForm, ncrId: showCapa };
    if (!body.rootCause) delete body.rootCause;
    if (!body.preventiveAction) delete body.preventiveAction;
    if (!body.assignedTo) delete body.assignedTo;
    body.dueDate = new Date(capaForm.dueDate).toISOString();
    const res = await fetch(`${API}/capa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    if (res.ok) { setShowCapa(null); fetchAll(); if (expandedId) handleExpand(expandedId); }
    else { const d = await res.json(); alert(d.message); }
    setSaving(false);
  }

  async function handleClose(id) {
    const res = await fetch(`${API}/ncr/${id}/close`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) fetchAll();
    else { const d = await res.json(); alert(d.message); }
  }

  async function handleExpand(id) {
    if (expandedId === id) { setExpandedId(null); setExpandedDetail(null); return; }
    setExpandedId(id);
    const res = await fetch(`${API}/ncr/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setExpandedDetail(await res.json());
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Non-Conformance Reports (NCR)</h1>
            <p className="text-gray-500 text-sm mt-1">Track quality failures, dispositions and corrective actions</p>
          </div>
          <button onClick={()=>{ setForm({source:'IQC',sourceReferenceNumber:'',itemCode:'',itemName:'',description:'',severity:'MAJOR',qtyAffected:'',detectedBy:'',disposition:'',remarks:''}); setError(''); setShowModal(true); }} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium">+ Raise NCR</button>
        </div>

        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-7 gap-3 mb-6">
            {[
              {label:'Total',value:stats.total,color:'bg-gray-50'},
              {label:'Open',value:stats.open,color:'bg-blue-50'},
              {label:'CAPA Pending',value:stats.capaPending,color:'bg-orange-50'},
              {label:'Closed',value:stats.closed,color:'bg-green-50'},
              {label:'Critical',value:stats.critical,color:'bg-red-50'},
              {label:'Major',value:stats.major,color:'bg-orange-50'},
              {label:'Minor',value:stats.minor,color:'bg-gray-50'},
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
            <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search NCR number, description, item..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
              <option value="">All Status</option>
              {Object.keys(STATUS_COLORS).map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
            </select>
            <select className="border rounded-lg px-3 py-2 text-sm" value={severity} onChange={e=>{setSeverity(e.target.value);setPage(1);}}>
              <option value="">All Severity</option>
              {['MINOR','MAJOR','CRITICAL'].map(s=><option key={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} NCRs</span>
          </div>

          <div className="divide-y">
            {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
            : records.length===0 ? <div className="text-center py-10 text-gray-400">No NCRs found</div>
            : records.map(r => (
              <div key={r.id}>
                <div className="p-4 hover:bg-gray-50 cursor-pointer" onClick={()=>handleExpand(r.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono font-bold text-red-600">{r.ncrNumber}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${SEVERITY_COLORS[r.severity]}`}>{r.severity}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>{r.status?.replace(/_/g,' ')}</span>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">{r.source}</span>
                      {r.itemCode && <span className="font-mono text-xs text-blue-600">{r.itemCode}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{fmtDate(r.createdAt)}</span>
                      {r.status !== 'CLOSED' && (
                        <button onClick={e=>{e.stopPropagation();setShowCapa(r.id);setCapaForm({rootCause:'',correctiveAction:'',preventiveAction:'',assignedTo:'',dueDate:''});}} className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600">+ CAPA</button>
                      )}
                      {r.status === 'VERIFICATION_PENDING' && (
                        <button onClick={e=>{e.stopPropagation();handleClose(r.id);}} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Close NCR</button>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-gray-600 line-clamp-1">{r.description}</div>
                  {r.capaRecords?.length > 0 && <div className="mt-1 text-xs text-gray-400">{r.capaRecords.length} CAPA(s) · {r.capaRecords.filter(c=>c.status==='VERIFIED').length} verified</div>}
                </div>

                {expandedId===r.id && expandedDetail && (
                  <div className="px-6 pb-6 bg-orange-50 border-t space-y-3">
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Description</div>
                        <div className="text-sm text-gray-800">{expandedDetail.description}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-gray-500">Source Ref:</span> {expandedDetail.sourceReferenceNumber||'—'}</div>
                        <div><span className="text-gray-500">Qty Affected:</span> {expandedDetail.qtyAffected}</div>
                        <div><span className="text-gray-500">Detected By:</span> {expandedDetail.detectedBy||'—'}</div>
                        <div><span className="text-gray-500">Disposition:</span> {expandedDetail.disposition||'—'}</div>
                      </div>
                    </div>
                    {expandedDetail.capaRecords?.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-gray-600 mb-2">CAPA Records</div>
                        {expandedDetail.capaRecords.map(c=>(
                          <div key={c.id} className="bg-white rounded-lg p-3 mb-2 text-xs border">
                            <div className="flex justify-between mb-1">
                              <span className="font-mono font-bold text-orange-600">{c.capaNumber}</span>
                              <span className={`px-2 py-1 rounded text-xs ${c.status==='VERIFIED'?'bg-green-100 text-green-700':c.status==='COMPLETED'?'bg-blue-100 text-blue-700':'bg-yellow-100 text-yellow-700'}`}>{c.status}</span>
                            </div>
                            <div><span className="text-gray-500">Corrective:</span> {c.correctiveAction}</div>
                            {c.preventiveAction && <div><span className="text-gray-500">Preventive:</span> {c.preventiveAction}</div>}
                            {c.assignedTo && <div><span className="text-gray-500">Assigned:</span> {c.assignedTo}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-red-700">Raise NCR</h2>
                <button onClick={()=>setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Source *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.source} onChange={e=>setForm(f=>({...f,source:e.target.value}))}>
                      {SOURCES.map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Severity *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.severity} onChange={e=>setForm(f=>({...f,severity:e.target.value}))}>
                      {['MINOR','MAJOR','CRITICAL'].map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Item Code</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.itemCode} onChange={e=>setForm(f=>({...f,itemCode:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Qty Affected</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.qtyAffected} onChange={e=>setForm(f=>({...f,qtyAffected:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Source Reference</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="IQC/IPQC number..." value={form.sourceReferenceNumber} onChange={e=>setForm(f=>({...f,sourceReferenceNumber:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Detected By</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.detectedBy} onChange={e=>setForm(f=>({...f,detectedBy:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Disposition</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.disposition} onChange={e=>setForm(f=>({...f,disposition:e.target.value}))}>
                      <option value="">— Select —</option>
                      {DISPOSITIONS.map(d=><option key={d} value={d}>{d.replace(/_/g,' ')}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Description *</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Describe the non-conformance in detail..." />
                  </div>
                </div>

              <DocumentAttachments referenceType="NCR" referenceId={viewDetail?.id} referenceNumber={viewDetail?.ncrNumber} title="NCR Attachments" />
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={()=>setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Raising...':'Raise NCR'}</button>
              </div>
            </div>
          </div>
        )}

        {showCapa && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold text-orange-700">Create CAPA</h2>
                <button onClick={()=>setShowCapa(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Root Cause</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={capaForm.rootCause} onChange={e=>setCapaForm(f=>({...f,rootCause:e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Corrective Action *</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={capaForm.correctiveAction} onChange={e=>setCapaForm(f=>({...f,correctiveAction:e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Preventive Action</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={capaForm.preventiveAction} onChange={e=>setCapaForm(f=>({...f,preventiveAction:e.target.value}))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Assigned To</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={capaForm.assignedTo} onChange={e=>setCapaForm(f=>({...f,assignedTo:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Due Date *</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={capaForm.dueDate} onChange={e=>setCapaForm(f=>({...f,dueDate:e.target.value}))} />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={()=>setShowCapa(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreateCapa} disabled={saving} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Creating...':'Create CAPA'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
