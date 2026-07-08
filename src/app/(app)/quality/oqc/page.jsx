'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import DocumentAttachments from '@/components/shared/DocumentAttachments';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const RESULT_COLORS = { PASS:'bg-green-100 text-green-700', FAIL:'bg-red-100 text-red-700', CONDITIONAL:'bg-yellow-100 text-yellow-700', PENDING:'bg-gray-100 text-gray-500' };
const STATUS_COLORS = { PENDING:'bg-gray-100 text-gray-600', COMPLETED:'bg-blue-100 text-blue-700', RELEASED:'bg-green-100 text-green-700' };
const CHECK_COLORS = { PASS:'text-green-600 font-bold', FAIL:'text-red-600 font-bold', NA:'text-gray-400' };
const CHECKS = ['PASS','FAIL','NA'];
const CHECK_PARAMS = [{key:'visualCheck',label:'Visual'},{key:'dimensionalCheck',label:'Dimensional'},{key:'functionalCheck',label:'Functional'},{key:'packagingCheck',label:'Packaging'},{key:'labellingCheck',label:'Labelling'}];

export default function OqcPage() {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [fgReceipts, setFgReceipts] = useState([]);
  const [wos, setWos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [result, setResult] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedDetail, setExpandedDetail] = useState(null);
  const [form, setForm] = useState({ fgReceiptId:'', workOrderId:'', itemCode:'', itemName:'', customerName:'', lotNumber:'', batchNumber:'', inspectorName:'', sampleSize:'', passQty:'', failQty:'0', visualCheck:'PASS', dimensionalCheck:'PASS', functionalCheck:'PASS', packagingCheck:'PASS', labellingCheck:'PASS', cocNumber:'', defectsFound:'', remarks:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (result) params.set('result', result);
    if (status) params.set('status', status);
    const [recRes, statsRes, fgrRes, woRes] = await Promise.all([
      fetch(`${API}/oqc?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/oqc/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/fg-receipts?status=RECEIVED&limit=50`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/work-orders?status=COMPLETED&limit=50`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (recRes.ok) { const d = await recRes.json(); setRecords(d.data); setTotal(d.total); setTotalPages(d.totalPages); }
    if (statsRes.ok) setStats(await statsRes.json());
    if (fgrRes.ok) { const d = await fgrRes.json(); setFgReceipts(d.data || []); }
    if (woRes.ok) { const d = await woRes.json(); setWos(d.data || []); }
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, [page, search, result, status]);

  function handleFgrSelect(fgrId) {
    const fgr = fgReceipts.find(f => f.id === fgrId);
    if (fgr) setForm(f => ({ ...f, fgReceiptId: fgrId, workOrderId: fgr.workOrderId||f.workOrderId, itemCode: fgr.itemCode, itemName: fgr.itemName, batchNumber: fgr.batchNumber||f.batchNumber }));
    else setForm(f => ({ ...f, fgReceiptId: fgrId }));
  }

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { ...form, sampleSize: parseInt(form.sampleSize)||0, passQty: parseInt(form.passQty)||0, failQty: parseInt(form.failQty)||0 };
    ['fgReceiptId','workOrderId','customerName','lotNumber','batchNumber','inspectorName','cocNumber','defectsFound','remarks'].forEach(k => { if (!body[k]) delete body[k]; });
    const res = await fetch(`${API}/oqc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    setSaving(false);
  }

  async function handleRelease(id) {
    const res = await fetch(`${API}/oqc/${id}/release`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) fetchAll();
    else { const d = await res.json(); alert(d.message); }
  }

  async function handleExpand(id) {
    if (expandedId === id) { setExpandedId(null); setExpandedDetail(null); return; }
    setExpandedId(id);
    const res = await fetch(`${API}/oqc/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setExpandedDetail(await res.json());
  }

  const passRate = r => r.sampleSize > 0 ? Math.round(r.passQty/r.sampleSize*100) : 0;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Outgoing Quality Control (OQC)</h1>
            <p className="text-gray-500 text-sm mt-1">Final quality inspection before dispatch to customer</p>
          </div>
          <button onClick={()=>{ setForm({fgReceiptId:'',workOrderId:'',itemCode:'',itemName:'',customerName:'',lotNumber:'',batchNumber:'',inspectorName:'',sampleSize:'',passQty:'',failQty:'0',visualCheck:'PASS',dimensionalCheck:'PASS',functionalCheck:'PASS',packagingCheck:'PASS',labellingCheck:'PASS',cocNumber:'',defectsFound:'',remarks:''}); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New OQC</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              {label:'Pass Rate', value:`${stats.passRate}%`, color:stats.passRate>=95?'bg-green-50':stats.passRate>=80?'bg-yellow-50':'bg-red-50'},
              {label:'PASS', value:stats.pass, color:'bg-green-50'},
              {label:'FAIL', value:stats.fail, color:'bg-red-50'},
              {label:'Released', value:stats.released, color:'bg-blue-50'},
            ].map(s=>(
              <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex gap-3 flex-wrap">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search OQC number, item, customer..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={result} onChange={e=>{setResult(e.target.value);setPage(1);}}>
              <option value="">All Results</option>
              {['PASS','FAIL','CONDITIONAL','PENDING'].map(r=><option key={r}>{r}</option>)}
            </select>
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
              <option value="">All Status</option>
              {['PENDING','COMPLETED','RELEASED'].map(s=><option key={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} inspections</span>
          </div>

          <div className="divide-y">
            {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
            : records.length===0 ? <div className="text-center py-10 text-gray-400">No OQC records found</div>
            : records.map(r => (
              <div key={r.id}>
                <div className="p-4 hover:bg-gray-50 cursor-pointer" onClick={()=>handleExpand(r.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono font-bold text-blue-600">{r.oqcNumber}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${RESULT_COLORS[r.result]}`}>{r.result}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                      <span className="font-mono text-xs text-gray-600">{r.itemCode}</span>
                      {r.customerName && <span className="text-xs text-gray-500">{r.customerName}</span>}
                      <span className="text-xs text-gray-400">{fmtDate(r.inspectionDate)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={`text-sm font-bold ${passRate(r)>=95?'text-green-600':passRate(r)>=80?'text-yellow-600':'text-red-600'}`}>{passRate(r)}%</div>
                        <div className="text-xs text-gray-400">{r.passQty}/{r.sampleSize}</div>
                      </div>
                      {r.result==='PASS' && r.status==='COMPLETED' && (
                        <button onClick={e=>{e.stopPropagation();handleRelease(r.id);}} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Release</button>
                      )}
                      <span className="text-gray-400 text-xs">{expandedId===r.id?'▲':'▼'}</span>
                    </div>
                  </div>
                </div>

                {expandedId===r.id && expandedDetail && (
                  <div className="px-6 pb-6 bg-blue-50 border-t">
                    <div className="grid grid-cols-2 gap-6 mt-4">
                      <div className="bg-white rounded-xl border p-4">
                        <div className="text-sm font-semibold text-gray-700 mb-3">Inspection Parameters</div>
                        {CHECK_PARAMS.map(p=>(
                          <div key={p.key} className="flex justify-between py-1.5 border-b last:border-0">
                            <span className="text-sm text-gray-600">{p.label} Check</span>
                            <span className={`text-sm ${CHECK_COLORS[expandedDetail[p.key]||'NA']}`}>{expandedDetail[p.key]||'NA'}</span>
                          </div>
                        ))}
                        <div className="mt-3 pt-3 border-t flex justify-between">
                          <span className="text-sm font-semibold">Pass Rate</span>
                          <span className={`text-sm font-bold ${passRate(expandedDetail)>=95?'text-green-600':'text-orange-600'}`}>{passRate(expandedDetail)}% ({expandedDetail.passQty}/{expandedDetail.sampleSize})</span>
                        </div>
                      </div>
                      <div className="bg-white rounded-xl border p-4">
                        <div className="text-sm font-semibold text-gray-700 mb-3">Details</div>
                        <div className="space-y-2 text-xs">
                          {expandedDetail.lotNumber && <div className="flex justify-between"><span className="text-gray-500">Lot No:</span><span className="font-mono">{expandedDetail.lotNumber}</span></div>}
                          {expandedDetail.batchNumber && <div className="flex justify-between"><span className="text-gray-500">Batch:</span><span className="font-mono">{expandedDetail.batchNumber}</span></div>}
                          {expandedDetail.cocNumber && <div className="flex justify-between"><span className="text-gray-500">CoC No:</span><span className="font-mono text-green-600 font-bold">{expandedDetail.cocNumber}</span></div>}
                          {expandedDetail.inspectorName && <div className="flex justify-between"><span className="text-gray-500">Inspector:</span><span>{expandedDetail.inspectorName}</span></div>}
                          {expandedDetail.workOrder && <div className="flex justify-between"><span className="text-gray-500">Work Order:</span><span className="font-mono text-blue-600">{expandedDetail.workOrder.woNumber}</span></div>}
                          {expandedDetail.fgReceipt && <div className="flex justify-between"><span className="text-gray-500">FG Receipt:</span><span className="font-mono">{expandedDetail.fgReceipt.receiptNumber}</span></div>}
                        </div>
                        {expandedDetail.defectsFound && (
                          <div className="mt-3 p-2 bg-red-50 rounded text-xs text-red-700">
                            <div className="font-bold mb-1">Defects Found:</div>
                            <div>{expandedDetail.defectsFound}</div>
                          </div>
                        )}
                        {expandedDetail.releasedDate && (
                          <div className="mt-3 p-2 bg-green-50 rounded text-xs text-green-700">
                            ✅ Released for dispatch on {fmtDate(expandedDetail.releasedDate)}
                          </div>
                        )}
                      </div>
                    </div>
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
                <h2 className="text-lg font-bold">New OQC Inspection</h2>
                <button onClick={()=>setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">FG Receipt (optional)</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.fgReceiptId} onChange={e=>handleFgrSelect(e.target.value)}>
                      <option value="">— Select FG Receipt —</option>
                      {fgReceipts.map(f=><option key={f.id} value={f.id}>{f.receiptNumber} — {f.itemCode} (qty:{f.receivedQty})</option>)}
                    </select>
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
                    <label className="block text-sm text-gray-600 mb-1">Customer Name</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.customerName} onChange={e=>setForm(f=>({...f,customerName:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Inspector Name</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.inspectorName} onChange={e=>setForm(f=>({...f,inspectorName:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Sample Size *</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.sampleSize} onChange={e=>setForm(f=>({...f,sampleSize:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Pass Qty *</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.passQty} onChange={e=>setForm(f=>({...f,passQty:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Fail Qty</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.failQty} onChange={e=>setForm(f=>({...f,failQty:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">CoC Number</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="Certificate of Conformance No." value={form.cocNumber} onChange={e=>setForm(f=>({...f,cocNumber:e.target.value}))} />
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">Inspection Parameters</div>
                  <div className="grid grid-cols-5 gap-2">
                    {CHECK_PARAMS.map(p=>(
                      <div key={p.key}>
                        <label className="block text-xs text-gray-500 mb-1">{p.label}</label>
                        <select className="w-full border rounded px-2 py-1.5 text-xs" value={form[p.key]} onChange={e=>setForm(f=>({...f,[p.key]:e.target.value}))}>
                          {CHECKS.map(c=><option key={c}>{c}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Defects Found</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.defectsFound} onChange={e=>setForm(f=>({...f,defectsFound:e.target.value}))} />
                </div>

              <DocumentAttachments referenceType="OQC" referenceId={viewDetail?.id} referenceNumber={viewDetail?.oqcNumber} title="OQC Attachments" />
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={()=>setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Saving...':'Create OQC'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
