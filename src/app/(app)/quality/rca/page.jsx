'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import DocumentAttachments from '@/components/shared/DocumentAttachments';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const STATUS_COLORS = { DRAFT:'bg-yellow-100 text-yellow-700', COMPLETED:'bg-green-100 text-green-700' };
const METHOD_COLORS = { FIVE_WHY:'bg-blue-100 text-blue-700', FISHBONE:'bg-purple-100 text-purple-700', BOTH:'bg-orange-100 text-orange-700' };
const FISHBONE_CATS = ['Man','Machine','Material','Method','Environment','Measurement'];
const FISHBONE_KEYS = ['fishboneMan','fishboneMachine','fishboneMaterial','fishboneMethod','fishboneEnvironment','fishboneMeasurement'];

export default function RcaPage() {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [ncrs, setNcrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedDetail, setExpandedDetail] = useState(null);
  const [activeTab, setActiveTab] = useState('FIVE_WHY');
  const [form, setForm] = useState({
    ncrId:'', method:'FIVE_WHY', problem:'',
    why1:'', why2:'', why3:'', why4:'', why5:'', rootCause:'',
    fishboneMan:'', fishboneMachine:'', fishboneMaterial:'', fishboneMethod:'', fishboneEnvironment:'', fishboneMeasurement:'',
    conclusion:'', conductedBy:'',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    const [recRes, statsRes, ncrRes] = await Promise.all([
      fetch(`${API}/rca?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/rca/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/ncr?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (recRes.ok) { const d = await recRes.json(); setRecords(d.data); setTotal(d.total); setTotalPages(d.totalPages); }
    if (statsRes.ok) setStats(await statsRes.json());
    if (ncrRes.ok) { const d = await ncrRes.json(); setNcrs((d.data||[]).filter(n => n.status !== 'CLOSED')); }
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, [page]);

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { ...form };
    if (!body.conductedBy) delete body.conductedBy;
    if (!body.rootCause) delete body.rootCause;
    if (!body.conclusion) delete body.conclusion;
    ['why1','why2','why3','why4','why5'].forEach(k => { if (!body[k]) delete body[k]; });
    FISHBONE_KEYS.forEach(k => { if (!body[k]) delete body[k]; });
    const res = await fetch(`${API}/rca`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    setSaving(false);
  }

  async function handleComplete(id) {
    const res = await fetch(`${API}/rca/${id}/complete`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) fetchAll();
    else { const d = await res.json(); alert(d.message); }
  }

  async function handleExpand(id) {
    if (expandedId === id) { setExpandedId(null); setExpandedDetail(null); return; }
    setExpandedId(id);
    const res = await fetch(`${API}/rca/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setExpandedDetail(await res.json());
  }

  const WHY_LABELS = ['Why 1','Why 2','Why 3','Why 4','Why 5'];
  const WHY_KEYS = ['why1','why2','why3','why4','why5'];

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Root Cause Analysis</h1>
            <p className="text-gray-500 text-sm mt-1">5-Why and Fishbone (Ishikawa) analysis linked to NCRs</p>
          </div>
          <button onClick={()=>{ setForm({ncrId:'',method:'FIVE_WHY',problem:'',why1:'',why2:'',why3:'',why4:'',why5:'',rootCause:'',fishboneMan:'',fishboneMachine:'',fishboneMaterial:'',fishboneMethod:'',fishboneEnvironment:'',fishboneMeasurement:'',conclusion:'',conductedBy:''}); setActiveTab('FIVE_WHY'); setError(''); setShowModal(true); }} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium">+ New RCA</button>
        </div>

        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            {[
              {label:'Total',value:stats.total,color:'bg-gray-50'},
              {label:'Draft',value:stats.draft,color:'bg-yellow-50'},
              {label:'Completed',value:stats.completed,color:'bg-green-50'},
              {label:'5-Why',value:stats.fiveWhy,color:'bg-blue-50'},
              {label:'Fishbone',value:stats.fishbone,color:'bg-purple-50'},
              {label:'Both',value:stats.both,color:'bg-orange-50'},
            ].map(s=>(
              <div key={s.label} className={`${s.color} rounded-lg p-3 text-center`}>
                <div className="text-lg font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex justify-between">
            <span className="font-semibold text-gray-700">RCA Records</span>
            <span className="text-sm text-gray-500">{total} records</span>
          </div>
          <div className="divide-y">
            {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
            : records.length===0 ? <div className="text-center py-10 text-gray-400">No RCA records yet</div>
            : records.map(r => (
              <div key={r.id}>
                <div className="p-4 hover:bg-gray-50 cursor-pointer" onClick={()=>handleExpand(r.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono font-bold text-purple-600">{r.rcaNumber}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${METHOD_COLORS[r.method]}`}>{r.method?.replace(/_/g,' ')}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                      <span className="font-mono text-xs text-red-600">{r.ncr?.ncrNumber}</span>
                      <span className="text-xs text-gray-500">{r.conductedBy||'—'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.status==='DRAFT' && <button onClick={e=>{e.stopPropagation();handleComplete(r.id);}} className="px-2 py-1 text-xs bg-green-600 text-white rounded">Complete</button>}
                      <span className="text-gray-400 text-xs">{expandedId===r.id?'▲':'▼'}</span>
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-gray-600 line-clamp-1">{r.problem}</div>
                </div>

                {expandedId===r.id && expandedDetail && (
                  <div className="px-6 pb-6 bg-purple-50 border-t">
                    <div className="mt-3 mb-2 text-xs font-semibold text-gray-500">NCR: {expandedDetail.ncr?.ncrNumber} — {expandedDetail.ncr?.description}</div>

                    {(expandedDetail.method==='FIVE_WHY'||expandedDetail.method==='BOTH') && (
                      <div className="bg-white rounded-xl border p-4 mb-3">
                        <div className="font-semibold text-blue-700 mb-3 text-sm">5-Why Analysis</div>
                        <div className="text-xs font-semibold text-gray-600 mb-2">Problem: {expandedDetail.problem}</div>
                        <div className="space-y-2">
                          {WHY_KEYS.map((k,i)=>expandedDetail[k] && (
                            <div key={k} className="flex gap-3 items-start">
                              <span className={`px-2 py-1 rounded text-xs font-bold text-white ${['bg-blue-400','bg-blue-500','bg-blue-600','bg-blue-700','bg-blue-800'][i]}`}>{WHY_LABELS[i]}</span>
                              <span className="text-sm text-gray-700">{expandedDetail[k]}</span>
                            </div>
                          ))}
                        </div>
                        {expandedDetail.rootCause && <div className="mt-3 p-3 bg-blue-50 rounded-lg"><span className="text-xs font-bold text-blue-700">ROOT CAUSE: </span><span className="text-sm">{expandedDetail.rootCause}</span></div>}
                      </div>
                    )}

                    {(expandedDetail.method==='FISHBONE'||expandedDetail.method==='BOTH') && (
                      <div className="bg-white rounded-xl border p-4 mb-3">
                        <div className="font-semibold text-purple-700 mb-3 text-sm">Fishbone (Ishikawa) Analysis</div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {FISHBONE_CATS.map((cat,i)=>expandedDetail[FISHBONE_KEYS[i]] && (
                            <div key={cat} className="bg-purple-50 rounded-lg p-3">
                              <div className="text-xs font-bold text-purple-700 mb-1">{cat}</div>
                              <div className="text-xs text-gray-600">{expandedDetail[FISHBONE_KEYS[i]]}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {expandedDetail.conclusion && (
                      <div className="bg-green-50 rounded-lg p-3">
                        <span className="text-xs font-bold text-green-700">CONCLUSION: </span>
                        <span className="text-sm">{expandedDetail.conclusion}</span>
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
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-purple-700">New Root Cause Analysis</h2>
                <button onClick={()=>setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">NCR *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.ncrId} onChange={e=>setForm(f=>({...f,ncrId:e.target.value}))}>
                      <option value="">— Select Open NCR —</option>
                      {ncrs.map(n=><option key={n.id} value={n.id}>{n.ncrNumber} — {n.description?.slice(0,50)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Method *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.method} onChange={e=>{setForm(f=>({...f,method:e.target.value}));setActiveTab(e.target.value==='FISHBONE'?'FISHBONE':'FIVE_WHY');}}>
                      <option value="FIVE_WHY">5-Why</option>
                      <option value="FISHBONE">Fishbone</option>
                      <option value="BOTH">Both</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Conducted By</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.conductedBy} onChange={e=>setForm(f=>({...f,conductedBy:e.target.value}))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Problem Statement *</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.problem} onChange={e=>setForm(f=>({...f,problem:e.target.value}))} />
                  </div>
                </div>

                {(form.method==='FIVE_WHY'||form.method==='BOTH') && (
                  <div className="border rounded-xl p-4 bg-blue-50">
                    <div className="font-semibold text-blue-700 mb-3 text-sm">5-Why Analysis</div>
                    {WHY_KEYS.map((k,i)=>(
                      <div key={k} className="mb-3">
                        <label className="block text-xs text-gray-600 mb-1">{WHY_LABELS[i]}</label>
                        <input className="w-full border rounded-lg px-3 py-2 text-sm bg-white" value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={i===0?'Why did this happen?':`Why? (deeper cause)`} />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1 font-semibold">Root Cause</label>
                      <input className="w-full border rounded-lg px-3 py-2 text-sm bg-white font-medium" value={form.rootCause} onChange={e=>setForm(f=>({...f,rootCause:e.target.value}))} placeholder="Final root cause identified..." />
                    </div>
                  </div>
                )}

                {(form.method==='FISHBONE'||form.method==='BOTH') && (
                  <div className="border rounded-xl p-4 bg-purple-50">
                    <div className="font-semibold text-purple-700 mb-3 text-sm">Fishbone (Ishikawa) — 6M Analysis</div>
                    <div className="grid grid-cols-2 gap-3">
                      {FISHBONE_CATS.map((cat,i)=>(
                        <div key={cat}>
                          <label className="block text-xs font-semibold text-purple-700 mb-1">{cat}</label>
                          <textarea className="w-full border rounded-lg px-3 py-2 text-xs bg-white" rows={2} value={form[FISHBONE_KEYS[i]]} onChange={e=>setForm(f=>({...f,[FISHBONE_KEYS[i]]:e.target.value}))} placeholder={`${cat}-related causes...`} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Conclusion / Root Cause Summary *</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.conclusion} onChange={e=>setForm(f=>({...f,conclusion:e.target.value}))} placeholder="Final conclusion and root cause..." />
                </div>

              <DocumentAttachments referenceType="RCA" referenceId={viewDetail?.id} referenceNumber={viewDetail?.rcaNumber} title="RCA Attachments" />
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={()=>setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Creating...':'Create RCA'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
