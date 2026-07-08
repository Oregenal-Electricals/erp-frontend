'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import DocumentAttachments from '@/components/shared/DocumentAttachments';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const STATUS_COLORS = {
  ASSIGNED:'bg-blue-100 text-blue-700',
  IN_PROGRESS:'bg-yellow-100 text-yellow-700',
  COMPLETED:'bg-purple-100 text-purple-700',
  VERIFIED:'bg-green-100 text-green-700',
};

export default function CapaPage() {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [verifyModal, setVerifyModal] = useState(null);
  const [verifyForm, setVerifyForm] = useState({ effectivenessCheck:'' });
  const [saving, setSaving] = useState(false);

  async function fetchAll() {
    // Fetch health score and escalations
    const [hRes, eRes] = await Promise.all([
      fetch(`${API}/capa-automation/health-score`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/capa-automation/escalations`, {headers:{Authorization:`Bearer ${getToken()}`}}),
    ]);
    if (hRes.ok) { const d = await hRes.json(); setHealth(d); }
    if (eRes.ok) { const d = await eRes.json(); setEscalations(d); }
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (status) params.set('status', status);
    const [recRes, statsRes] = await Promise.all([
      fetch(`${API}/capa?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/capa/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (recRes.ok) { const d = await recRes.json(); setRecords(d.data); setTotal(d.total); setTotalPages(d.totalPages); }
    if (statsRes.ok) setStats(await statsRes.json());
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, [page, status]);

  async function handleStatusUpdate(id, newStatus) {
    const res = await fetch(`${API}/capa/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) fetchAll();
    else { const d = await res.json(); alert(d.message); }
  }

  async function handleVerify() {
    setSaving(true);
    const res = await fetch(`${API}/capa/${verifyModal}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(verifyForm),
    });
    if (res.ok) { setVerifyModal(null); fetchAll(); }
    else { const d = await res.json(); alert(d.message); }
    setSaving(false);
  }

  const isOverdue = r => ['ASSIGNED','IN_PROGRESS'].includes(r.status) && new Date(r.dueDate) < new Date();

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">CAPA Management</h1>
          <p className="text-gray-500 text-sm mt-1">Track corrective and preventive actions linked to NCRs</p>
        </div>

        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            {[
              {label:'Total',value:stats.total,color:'bg-gray-50'},
              {label:'Assigned',value:stats.assigned,color:'bg-blue-50'},
              {label:'In Progress',value:stats.inProgress,color:'bg-yellow-50'},
              {label:'Completed',value:stats.completed,color:'bg-purple-50'},
              {label:'Verified',value:stats.verified,color:'bg-green-50'},
              {label:'Overdue',value:stats.overdue,color:'bg-red-50'},
            ].map(s=>(
              <div key={s.label} className={`${s.color} rounded-lg p-3 text-center`}>
                <div className="text-lg font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex gap-3">
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
              <option value="">All Status</option>
              {Object.keys(STATUS_COLORS).map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} CAPAs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>{['CAPA No.','NCR','Root Cause','Corrective Action','Assigned To','Due Date','Status','Action'].map(h=><th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {loading ? <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading...</td></tr>
                : records.length===0 ? <tr><td colSpan={8} className="text-center py-10 text-gray-400">No CAPAs found</td></tr>
                : records.map(r => (
                  <tr key={r.id} className={`hover:bg-gray-50 ${isOverdue(r)?'bg-red-50':''}`}>
                    <td className="px-3 py-2 font-mono text-xs text-orange-600 font-bold">{r.capaNumber}</td>
                    <td className="px-3 py-2 font-mono text-xs text-red-600">{r.ncr?.ncrNumber}</td>
                    <td className="px-3 py-2 text-xs text-gray-600 max-w-xs truncate">{r.rootCause||'—'}</td>
                    <td className="px-3 py-2 text-xs max-w-xs truncate">{r.correctiveAction}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{r.assignedTo||'—'}</td>
                    <td className={`px-3 py-2 text-xs ${isOverdue(r)?'text-red-600 font-bold':'text-gray-500'}`}>{fmtDate(r.dueDate)}{isOverdue(r)?' ⚠':''}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>{r.status?.replace(/_/g,' ')}</span></td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {r.status==='ASSIGNED' && <button onClick={()=>handleStatusUpdate(r.id,'IN_PROGRESS')} className="px-2 py-1 text-xs bg-yellow-500 text-white rounded">Start</button>}
                        {r.status==='IN_PROGRESS' && <button onClick={()=>handleStatusUpdate(r.id,'COMPLETED')} className="px-2 py-1 text-xs bg-purple-600 text-white rounded">Complete</button>}
                        {r.status==='COMPLETED' && <button onClick={()=>{setVerifyModal(r.id);setVerifyForm({effectivenessCheck:''});}} className="px-2 py-1 text-xs bg-green-600 text-white rounded">Verify</button>}
                      </div>
                    </td>
                  </tr>
                ))}
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

        {verifyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold text-green-700">Verify CAPA Effectiveness</h2>
                <button onClick={()=>setVerifyModal(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6">
                <label className="block text-sm text-gray-600 mb-2">Effectiveness Check *</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={4}
                  placeholder="Describe how you verified the corrective action was effective..."
                  value={verifyForm.effectivenessCheck} onChange={e=>setVerifyForm({effectivenessCheck:e.target.value})} />

              <DocumentAttachments referenceType="CAPA" referenceId={viewDetail?.id} referenceNumber={viewDetail?.capaNumber} title="CAPA Attachments" />
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={()=>setVerifyModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleVerify} disabled={saving||!verifyForm.effectivenessCheck} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Verifying...':'Confirm Verified'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
