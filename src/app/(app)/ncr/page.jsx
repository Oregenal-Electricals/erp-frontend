'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const SEVERITY_COLORS = {LOW:'bg-green-100 text-green-700',MEDIUM:'bg-yellow-100 text-yellow-700',HIGH:'bg-orange-100 text-orange-700',CRITICAL:'bg-red-100 text-red-700'};
const STATUS_COLORS = {OPEN:'bg-red-100 text-red-700',IN_PROGRESS:'bg-yellow-100 text-yellow-700',CLOSED:'bg-green-100 text-green-700'};

export default function NcrPage() {
  const [ncrs, setNcrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({title:'',description:'',severity:'MEDIUM',area:'INCOMING',defectType:'',quantity:''});

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    const res = await fetch(`${API}/ncr?limit=50`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) { const d=await res.json(); setNcrs(d.data||[]); }
    setLoading(false);
  }
  useEffect(()=>{ fetchAll(); },[]);

  async function handleSubmit() {
    setSaving(true); setError('');
    const body = {...form, quantity:parseFloat(form.quantity)||undefined};
    const res = await fetch(`${API}/ncr`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    const data = await res.json();
    if (res.ok) { setShowForm(false); setForm({title:'',description:'',severity:'MEDIUM',area:'INCOMING',defectType:'',quantity:''}); fetchAll(); }
    else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    setSaving(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-bold text-gray-900">⚠️ Non-Conformance Reports</h1><p className="text-gray-500 text-sm mt-1">{ncrs.length} NCRs</p></div>
          <button onClick={()=>setShowForm(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium">+ Raise NCR</button>
        </div>
        <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
          {loading?<div className="text-center py-16 text-gray-400">Loading...</div>
          :ncrs.length===0?<div className="text-center py-16"><div className="text-5xl mb-3">⚠️</div><div className="text-gray-400">No NCRs raised.</div></div>:(
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th className="px-4 py-3 text-left">NCR No</th><th className="px-4 py-3 text-left">Title</th><th className="px-4 py-3 text-left">Area</th><th className="px-4 py-3 text-left">Severity</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Date</th></tr></thead>
              <tbody className="divide-y">
                {ncrs.map(n=>(
                  <tr key={n.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-red-600">{n.ncrNumber}</td>
                    <td className="px-4 py-3 font-medium">{n.title}</td>
                    <td className="px-4 py-3 text-xs">{n.area}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-bold ${SEVERITY_COLORS[n.severity]||'bg-gray-100'}`}>{n.severity}</span></td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[n.status]||'bg-gray-100'}`}>{n.status}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(n.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-5 border-b flex justify-between"><h2 className="font-bold text-gray-800">Raise NCR</h2><button onClick={()=>setShowForm(false)} className="text-gray-400">✕</button></div>
              <div className="p-5 space-y-4">
                {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div><label className="block text-xs text-gray-500 mb-1">Title *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Description *</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-gray-500 mb-1">Severity</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.severity} onChange={e=>setForm(f=>({...f,severity:e.target.value}))}>
                      {['LOW','MEDIUM','HIGH','CRITICAL'].map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs text-gray-500 mb-1">Area</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.area} onChange={e=>setForm(f=>({...f,area:e.target.value}))}>
                      {['INCOMING','IN_PROCESS','OUTGOING','CUSTOMER','SUPPLIER'].map(a=><option key={a}>{a}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs text-gray-500 mb-1">Defect Type</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.defectType} onChange={e=>setForm(f=>({...f,defectType:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Quantity Affected</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))} /></div>
                </div>
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                <button onClick={()=>setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleSubmit} disabled={saving||!form.title||!form.description} className="px-6 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Raising...':'Raise NCR'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
