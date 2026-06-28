'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const RESULT_COLORS = {
  PASS: 'bg-green-100 text-green-700',
  FAIL: 'bg-red-100 text-red-700',
  CONDITIONAL: 'bg-yellow-100 text-yellow-700',
  PENDING: 'bg-gray-100 text-gray-500',
};
const STAGE_COLORS = {
  IN_PROCESS: 'bg-blue-100 text-blue-700',
  FINAL: 'bg-purple-100 text-purple-700',
  INLINE: 'bg-teal-100 text-teal-700',
};

export default function IpqcPage() {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [wos, setWos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [result, setResult] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [completeModal, setCompleteModal] = useState(null);
  const [form, setForm] = useState({ workOrderId:'', inspectionStage:'IN_PROCESS', inspectorName:'', sampleSize:'', passQty:'', failQty:'0', defectDescription:'', remarks:'' });
  const [completeForm, setCompleteForm] = useState({ result:'PASS', correctiveAction:'', remarks:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (result) params.set('result', result);
    const [recRes, statsRes, woRes] = await Promise.all([
      fetch(`${API}/production-qc?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/production-qc/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/work-orders?limit=50`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (recRes.ok) { const d = await recRes.json(); setRecords(d.data); setTotal(d.total); setTotalPages(d.totalPages); }
    if (statsRes.ok) setStats(await statsRes.json());
    if (woRes.ok) { const d = await woRes.json(); setWos(d.data || []); }
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, [page, search, result]);

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { ...form, sampleSize: parseInt(form.sampleSize)||0, passQty: parseInt(form.passQty)||0, failQty: parseInt(form.failQty)||0 };
    if (!body.inspectorName) delete body.inspectorName;
    if (!body.defectDescription) delete body.defectDescription;
    if (!body.remarks) delete body.remarks;
    const res = await fetch(`${API}/production-qc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    setSaving(false);
  }

  async function handleComplete() {
    setSaving(true);
    const body = { ...completeForm };
    if (!body.correctiveAction) delete body.correctiveAction;
    if (!body.remarks) delete body.remarks;
    const res = await fetch(`${API}/production-qc/${completeModal}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    if (res.ok) { setCompleteModal(null); fetchAll(); }
    else { const d = await res.json(); alert(d.message); }
    setSaving(false);
  }

  const passRate = form.sampleSize > 0 ? Math.round((parseInt(form.passQty)||0) / (parseInt(form.sampleSize)||1) * 100) : 0;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">In-Process Quality Control (IPQC)</h1>
            <p className="text-gray-500 text-sm mt-1">Record and track in-process quality inspections during production</p>
          </div>
          <button onClick={() => { setForm({ workOrderId:'', inspectionStage:'IN_PROCESS', inspectorName:'', sampleSize:'', passQty:'', failQty:'0', defectDescription:'', remarks:'' }); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New Inspection</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Pass Rate', value: `${stats.passRate}%`, color: stats.passRate >= 95 ? 'bg-green-50' : stats.passRate >= 80 ? 'bg-yellow-50' : 'bg-red-50' },
              { label: 'PASS', value: stats.passed, color: 'bg-green-50' },
              { label: 'FAIL', value: stats.failed, color: 'bg-red-50' },
              { label: 'CONDITIONAL', value: stats.conditional, color: 'bg-yellow-50' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {stats && stats.totalSampled > 0 && (
          <div className="bg-white rounded-xl border p-4 mb-6">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Overall Pass Rate</span>
              <span>{stats.passRate}% ({stats.totalSampled} units sampled)</span>
            </div>
            <div className="bg-gray-100 rounded-full h-3">
              <div className={`h-3 rounded-full ${stats.passRate>=95?'bg-green-500':stats.passRate>=80?'bg-yellow-500':'bg-red-500'}`} style={{width:`${stats.passRate}%`}}></div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex gap-3">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search QC number..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={result} onChange={e=>{setResult(e.target.value);setPage(1);}}>
              <option value="">All Results</option>
              {['PASS','FAIL','CONDITIONAL','PENDING'].map(r=><option key={r}>{r}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} inspections</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>{['QC No.','Work Order','Product','Stage','Inspector','Date','Sample','Pass','Fail','Pass Rate','Result','Action'].map(h=><th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {loading ? <tr><td colSpan={12} className="text-center py-10 text-gray-400">Loading...</td></tr>
                : records.length===0 ? <tr><td colSpan={12} className="text-center py-10 text-gray-400">No QC records</td></tr>
                : records.map(r => {
                  const rate = r.sampleSize > 0 ? Math.round(r.passQty/r.sampleSize*100) : 0;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs text-blue-600 font-bold">{r.qcNumber}</td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-600">{r.workOrder?.woNumber}</td>
                      <td className="px-3 py-2 text-xs">{r.workOrder?.productName}</td>
                      <td className="px-3 py-2"><span className={`px-2 py-1 rounded text-xs font-medium ${STAGE_COLORS[r.inspectionStage]}`}>{r.inspectionStage?.replace(/_/g,' ')}</span></td>
                      <td className="px-3 py-2 text-xs text-gray-600">{r.inspectorName||'—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{fmtDate(r.inspectionDate)}</td>
                      <td className="px-3 py-2 text-xs font-bold">{r.sampleSize}</td>
                      <td className="px-3 py-2 text-xs font-bold text-green-600">{r.passQty}</td>
                      <td className="px-3 py-2 text-xs font-bold text-red-500">{r.failQty}</td>
                      <td className="px-3 py-2 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-12 bg-gray-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${rate>=95?'bg-green-500':rate>=80?'bg-yellow-500':'bg-red-500'}`} style={{width:`${rate}%`}}></div>
                          </div>
                          <span className={rate>=95?'text-green-600':rate>=80?'text-yellow-600':'text-red-600'}>{rate}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs font-medium ${RESULT_COLORS[r.result]}`}>{r.result}</span></td>
                      <td className="px-3 py-2">
                        {r.result === 'PENDING' && <button onClick={()=>{setCompleteModal(r.id);setCompleteForm({result:'PASS',correctiveAction:'',remarks:''});}} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Record Result</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold">New QC Inspection</h2>
                <button onClick={()=>setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Work Order *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.workOrderId} onChange={e=>setForm(f=>({...f,workOrderId:e.target.value}))}>
                      <option value="">— Select WO —</option>
                      {wos.map(wo=><option key={wo.id} value={wo.id}>{wo.woNumber} — {wo.productName} ({wo.status})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Inspection Stage</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.inspectionStage} onChange={e=>setForm(f=>({...f,inspectionStage:e.target.value}))}>
                      {['IN_PROCESS','FINAL','INLINE'].map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                    </select>
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
                  <div className="flex items-center justify-center bg-gray-50 rounded-lg p-3">
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${passRate>=95?'text-green-600':passRate>=80?'text-yellow-600':'text-red-600'}`}>{passRate}%</div>
                      <div className="text-xs text-gray-500">Pass Rate</div>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Defect Description</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.defectDescription} onChange={e=>setForm(f=>({...f,defectDescription:e.target.value}))} />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={()=>setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Saving...':'Create Inspection'}</button>
              </div>
            </div>
          </div>
        )}

        {completeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold">Record QC Result</h2>
                <button onClick={()=>setCompleteModal(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Result *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['PASS','FAIL','CONDITIONAL'].map(r => (
                      <button key={r} onClick={()=>setCompleteForm(f=>({...f,result:r}))}
                        className={`py-2 rounded-lg text-sm font-medium border-2 ${completeForm.result===r ? (r==='PASS'?'border-green-600 bg-green-50 text-green-700':r==='FAIL'?'border-red-600 bg-red-50 text-red-700':'border-yellow-500 bg-yellow-50 text-yellow-700') : 'border-gray-200 text-gray-600'}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Corrective Action</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={completeForm.correctiveAction} onChange={e=>setCompleteForm(f=>({...f,correctiveAction:e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Remarks</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={completeForm.remarks} onChange={e=>setCompleteForm(f=>({...f,remarks:e.target.value}))} />
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={()=>setCompleteModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleComplete} disabled={saving} className={`px-4 py-2 text-white rounded-lg text-sm disabled:opacity-50 ${completeForm.result==='PASS'?'bg-green-600':completeForm.result==='FAIL'?'bg-red-600':'bg-yellow-500'}`}>{saving?'Saving...':'Confirm Result'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
