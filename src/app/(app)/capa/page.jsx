'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const STATUS_COLORS = {OPEN:'bg-red-100 text-red-700',IN_PROGRESS:'bg-yellow-100 text-yellow-700',CLOSED:'bg-green-100 text-green-700',VERIFIED:'bg-blue-100 text-blue-700'};

export default function CapaPage() {
  const [capas, setCapas] = useState([]);
  const [ncrs, setNcrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ncrId:'',title:'',rootCause:'',correctiveAction:'',preventiveAction:'',responsiblePerson:'',targetDate:'',remarks:''});

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    const [capaRes,ncrRes] = await Promise.all([
      fetch(`${API}/capa?limit=50`,{headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/ncr?status=OPEN&limit=100`,{headers:{Authorization:`Bearer ${getToken()}`}}),
    ]);
    if (capaRes.ok) { const d=await capaRes.json(); setCapas(d.data||[]); }
    if (ncrRes.ok) { const d=await ncrRes.json(); setNcrs(d.data||[]); }
    setLoading(false);
  }
  useEffect(()=>{ fetchAll(); },[]);

  async function handleSubmit() {
    setSaving(true); setError('');
    const body = {...form, ncrId:form.ncrId||undefined};
    const res = await fetch(`${API}/capa`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    const data = await res.json();
    if (res.ok) { setShowForm(false); setForm({ncrId:'',title:'',rootCause:'',correctiveAction:'',preventiveAction:'',responsiblePerson:'',targetDate:'',remarks:''}); fetchAll(); }
    else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    setSaving(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-bold text-gray-900">✅ CAPA Management</h1><p className="text-gray-500 text-sm mt-1">{capas.length} CAPAs</p></div>
          <button onClick={()=>setShowForm(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">+ New CAPA</button>
        </div>
        <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
          {loading?<div className="text-center py-16 text-gray-400">Loading...</div>
          :capas.length===0?<div className="text-center py-16"><div className="text-5xl mb-3">✅</div><div className="text-gray-400">No CAPAs yet.</div></div>:(
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th className="px-4 py-3 text-left">CAPA No</th><th className="px-4 py-3 text-left">Title</th><th className="px-4 py-3 text-left">NCR Ref</th><th className="px-4 py-3 text-left">Responsible</th><th className="px-4 py-3 text-left">Target Date</th><th className="px-4 py-3 text-left">Status</th></tr></thead>
              <tbody className="divide-y">
                {capas.map(c=>(
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-indigo-600">{c.capaNumber}</td>
                    <td className="px-4 py-3 font-medium">{c.title}</td>
                    <td className="px-4 py-3 text-xs font-mono text-red-600">{c.ncr?.ncrNumber||'—'}</td>
                    <td className="px-4 py-3 text-xs">{c.responsiblePerson}</td>
                    <td className="px-4 py-3 text-xs">{fmtDate(c.targetDate)}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[c.status]||'bg-gray-100'}`}>{c.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {showForm&&(
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="p-5 border-b flex justify-between"><h2 className="font-bold text-gray-800">New CAPA</h2><button onClick={()=>setShowForm(false)} className="text-gray-400">✕</button></div>
              <div className="p-5 space-y-4">
                {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div><label className="block text-xs text-gray-500 mb-1">Linked NCR (optional)</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.ncrId} onChange={e=>setForm(f=>({...f,ncrId:e.target.value}))}>
                    <option value="">— Select NCR (optional) —</option>
                    {ncrs.map(n=><option key={n.id} value={n.id}>{n.ncrNumber} — {n.title}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Title *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Root Cause *</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.rootCause} onChange={e=>setForm(f=>({...f,rootCause:e.target.value}))} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Corrective Action *</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.correctiveAction} onChange={e=>setForm(f=>({...f,correctiveAction:e.target.value}))} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Preventive Action</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.preventiveAction} onChange={e=>setForm(f=>({...f,preventiveAction:e.target.value}))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-gray-500 mb-1">Responsible Person *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.responsiblePerson} onChange={e=>setForm(f=>({...f,responsiblePerson:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Target Date *</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.targetDate} onChange={e=>setForm(f=>({...f,targetDate:e.target.value}))} /></div>
                </div>
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                <button onClick={()=>setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleSubmit} disabled={saving||!form.title||!form.rootCause||!form.correctiveAction||!form.responsiblePerson} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Creating...':'Create CAPA'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
