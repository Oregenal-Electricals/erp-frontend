'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const STATUS_COLORS = {DRAFT:'bg-gray-100 text-gray-600',RELEASED:'bg-blue-100 text-blue-700',IN_PROGRESS:'bg-yellow-100 text-yellow-700',COMPLETED:'bg-green-100 text-green-700',CANCELLED:'bg-red-100 text-red-600'};

export default function WorkOrdersPage() {
  const [wos, setWos] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({itemId:'',plannedQty:'',plannedStartDate:'',plannedEndDate:'',priority:'NORMAL',remarks:''});

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    const [woRes, itemRes] = await Promise.all([
      fetch(`${API}/work-orders?limit=50`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/items?limit=200&itemType=FINISHED_GOOD`, {headers:{Authorization:`Bearer ${getToken()}`}}),
    ]);
    if (woRes.ok) { const d=await woRes.json(); setWos(d.data||[]); }
    if (itemRes.ok) { const d=await itemRes.json(); setItems(d.data||d||[]); }
    setLoading(false);
  }
  useEffect(()=>{ fetchAll(); },[]);

  async function handleSubmit() {
    setSaving(true); setError('');
    const body = {...form, plannedQty:parseFloat(form.plannedQty)};
    const res = await fetch(`${API}/work-orders`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    const data = await res.json();
    if (res.ok) { setShowForm(false); setForm({itemId:'',plannedQty:'',plannedStartDate:'',plannedEndDate:'',priority:'NORMAL',remarks:''}); fetchAll(); }
    else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    setSaving(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-bold text-gray-900">⚙️ Work Orders</h1><p className="text-gray-500 text-sm mt-1">{wos.length} work orders</p></div>
          <button onClick={()=>setShowForm(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">+ New Work Order</button>
        </div>
        <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
          {loading?<div className="text-center py-16 text-gray-400">Loading...</div>
          :wos.length===0?<div className="text-center py-16"><div className="text-5xl mb-3">⚙️</div><div className="text-gray-400">No work orders yet.</div></div>:(
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th className="px-4 py-3 text-left">WO Number</th><th className="px-4 py-3 text-left">Product</th><th className="px-4 py-3 text-left">Qty</th><th className="px-4 py-3 text-left">Priority</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Date</th></tr></thead>
              <tbody className="divide-y">
                {wos.map(wo=>(
                  <tr key={wo.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600">{wo.woNumber}</td>
                    <td className="px-4 py-3">{wo.item?.itemName||wo.itemId}</td>
                    <td className="px-4 py-3 font-bold">{wo.plannedQty}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs">{wo.priority}</span></td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[wo.status]||'bg-gray-100'}`}>{wo.status}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(wo.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-5 border-b flex justify-between"><h2 className="font-bold text-gray-800">New Work Order</h2><button onClick={()=>setShowForm(false)} className="text-gray-400">✕</button></div>
              <div className="p-5 space-y-4">
                {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div><label className="block text-xs text-gray-500 mb-1">Product *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.itemId} onChange={e=>setForm(f=>({...f,itemId:e.target.value}))}>
                    <option value="">— Select Product —</option>
                    {items.map(i=><option key={i.id} value={i.id}>{i.itemName} ({i.itemCode})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-gray-500 mb-1">Planned Qty *</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.plannedQty} onChange={e=>setForm(f=>({...f,plannedQty:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Priority</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>
                      {['LOW','NORMAL','HIGH','URGENT'].map(p=><option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs text-gray-500 mb-1">Start Date</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.plannedStartDate} onChange={e=>setForm(f=>({...f,plannedStartDate:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">End Date</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.plannedEndDate} onChange={e=>setForm(f=>({...f,plannedEndDate:e.target.value}))} /></div>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Remarks</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))} /></div>
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                <button onClick={()=>setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleSubmit} disabled={saving||!form.itemId||!form.plannedQty} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Creating...':'Create WO'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
