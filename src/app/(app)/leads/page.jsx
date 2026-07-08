'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const STATUS_COLORS = {NEW:'bg-blue-100 text-blue-700',CONTACTED:'bg-yellow-100 text-yellow-700',QUALIFIED:'bg-green-100 text-green-700',LOST:'bg-red-100 text-red-600',WON:'bg-green-200 text-green-800'};

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({customerName:'',contactPerson:'',email:'',phone:'',source:'DIRECT',status:'NEW',expectedValue:'',expectedCloseDate:'',remarks:''});

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    const res = await fetch(`${API}/leads?limit=50`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) { const d=await res.json(); setLeads(d.data||[]); }
    setLoading(false);
  }
  useEffect(()=>{ fetchAll(); },[]);

  async function handleSubmit() {
    setSaving(true); setError('');
    const body = {...form, expectedValue:parseFloat(form.expectedValue)||undefined};
    const res = await fetch(`${API}/leads`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    const data = await res.json();
    if (res.ok) { setShowForm(false); setForm({customerName:'',contactPerson:'',email:'',phone:'',source:'DIRECT',status:'NEW',expectedValue:'',expectedCloseDate:'',remarks:''}); fetchAll(); }
    else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    setSaving(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-bold text-gray-900">🎯 Lead Management</h1><p className="text-gray-500 text-sm mt-1">{leads.length} leads</p></div>
          <button onClick={()=>setShowForm(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">+ New Lead</button>
        </div>
        <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
          {loading?<div className="text-center py-16 text-gray-400">Loading...</div>
          :leads.length===0?<div className="text-center py-16"><div className="text-5xl mb-3">🎯</div><div className="text-gray-400">No leads yet. Create your first lead.</div></div>:(
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th className="px-4 py-3 text-left">Lead No</th><th className="px-4 py-3 text-left">Customer</th><th className="px-4 py-3 text-left">Contact</th><th className="px-4 py-3 text-left">Source</th><th className="px-4 py-3 text-left">Value</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Date</th></tr></thead>
              <tbody className="divide-y">
                {leads.map(l=>(
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-indigo-600">{l.leadNumber}</td>
                    <td className="px-4 py-3 font-medium">{l.customerName}</td>
                    <td className="px-4 py-3 text-xs">{l.contactPerson}<br/>{l.phone}</td>
                    <td className="px-4 py-3 text-xs">{l.source}</td>
                    <td className="px-4 py-3 font-bold">₹{Number(l.expectedValue||0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[l.status]||'bg-gray-100'}`}>{l.status}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(l.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-5 border-b flex justify-between"><h2 className="font-bold text-gray-800">New Lead</h2><button onClick={()=>setShowForm(false)} className="text-gray-400">✕</button></div>
              <div className="p-5 space-y-4">
                {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-gray-500 mb-1">Customer Name *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.customerName} onChange={e=>setForm(f=>({...f,customerName:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Contact Person</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.contactPerson} onChange={e=>setForm(f=>({...f,contactPerson:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Email</label><input type="email" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Phone</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Source</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.source} onChange={e=>setForm(f=>({...f,source:e.target.value}))}>
                      {['DIRECT','REFERRAL','WEBSITE','EXHIBITION','COLD_CALL','TENDER'].map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs text-gray-500 mb-1">Expected Value (₹)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.expectedValue} onChange={e=>setForm(f=>({...f,expectedValue:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Expected Close Date</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.expectedCloseDate} onChange={e=>setForm(f=>({...f,expectedCloseDate:e.target.value}))} /></div>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Remarks</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))} /></div>
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                <button onClick={()=>setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleSubmit} disabled={saving||!form.customerName} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Creating...':'Create Lead'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
