'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const STATUS_COLORS = {DRAFT:'bg-gray-100 text-gray-600',COMPLETED:'bg-green-100 text-green-700',PARTIAL:'bg-yellow-100 text-yellow-700'};

export default function GrnPage() {
  const [grns, setGrns] = useState([]);
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedPo, setSelectedPo] = useState(null);
  const [form, setForm] = useState({purchaseOrderId:'',receivedDate:'',vehicleNumber:'',driverName:'',remarks:'',items:[]});

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    const [grnRes, poRes] = await Promise.all([
      fetch(`${API}/grn?limit=50`,{headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/purchase-orders?status=APPROVED&limit=100`,{headers:{Authorization:`Bearer ${getToken()}`}}),
    ]);
    if (grnRes.ok) { const d=await grnRes.json(); setGrns(d.data||[]); }
    if (poRes.ok) { const d=await poRes.json(); setPos(d.data||[]); }
    setLoading(false);
  }
  useEffect(()=>{ fetchAll(); },[]);

  function handlePoSelect(poId) {
    const po = pos.find(p=>p.id===poId);
    setSelectedPo(po);
    setForm(f=>({...f, purchaseOrderId:poId,
      items:(po?.items||[]).map(i=>({
        poItemId:i.id,
        rawMaterialId:i.rawMaterialId,
        name:i.rawMaterial?.name||'',
        orderedQty:i.quantity,
        receivedQty:i.quantity,
        rejectedQty:0,
        uom:i.uom,
        unitPrice:i.unitPrice,
      }))
    }));
  }

  async function handleSubmit() {
    setSaving(true); setError('');
    const body = {
      purchaseOrderId:form.purchaseOrderId,
      receivedDate:form.receivedDate||new Date().toISOString().split('T')[0],
      vehicleNumber:form.vehicleNumber||undefined,
      driverName:form.driverName||undefined,
      remarks:form.remarks||undefined,
      items:form.items.map(i=>({
        poItemId:i.poItemId,
        rawMaterialId:i.rawMaterialId,
        receivedQty:parseFloat(i.receivedQty),
        rejectedQty:parseFloat(i.rejectedQty)||0,
        uom:i.uom,
        unitPrice:parseFloat(i.unitPrice),
      }))
    };
    if (!body.purchaseOrderId) { setError('Select a PO'); setSaving(false); return; }
    const res = await fetch(`${API}/grn`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    const data = await res.json();
    if (res.ok) { setShowForm(false); setForm({purchaseOrderId:'',receivedDate:'',vehicleNumber:'',driverName:'',remarks:'',items:[]}); setSelectedPo(null); fetchAll(); }
    else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    setSaving(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-bold text-gray-900">📦 Goods Receipt Notes</h1><p className="text-gray-500 text-sm mt-1">{grns.length} GRNs</p></div>
          <button onClick={()=>setShowForm(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">+ New GRN</button>
        </div>
        <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
          {loading?<div className="text-center py-16 text-gray-400">Loading...</div>
          :grns.length===0?<div className="text-center py-16"><div className="text-5xl mb-3">📦</div><div className="text-gray-400">No GRNs yet.</div></div>:(
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th className="px-4 py-3 text-left">GRN No</th><th className="px-4 py-3 text-left">PO No</th><th className="px-4 py-3 text-left">Vendor</th><th className="px-4 py-3 text-left">Items</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Date</th></tr></thead>
              <tbody className="divide-y">
                {grns.map(g=>(
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600">{g.grnNumber}</td>
                    <td className="px-4 py-3 font-mono text-xs">{g.purchaseOrder?.poNumber}</td>
                    <td className="px-4 py-3">{g.purchaseOrder?.vendor?.name}</td>
                    <td className="px-4 py-3">{g.items?.length||0} items</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[g.status]||'bg-gray-100'}`}>{g.status}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(g.receivedDate||g.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {showForm&&(
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
              <div className="p-5 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="font-bold text-gray-800 text-lg">New GRN</h2>
                <button onClick={()=>setShowForm(false)} className="text-gray-400">✕</button>
              </div>
              <div className="p-5 space-y-4">
                {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Purchase Order *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.purchaseOrderId} onChange={e=>handlePoSelect(e.target.value)}>
                      <option value="">— Select Approved PO —</option>
                      {pos.map(p=><option key={p.id} value={p.id}>{p.poNumber} — {p.vendor?.name}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs text-gray-500 mb-1">Received Date</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.receivedDate} onChange={e=>setForm(f=>({...f,receivedDate:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Vehicle Number</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.vehicleNumber} onChange={e=>setForm(f=>({...f,vehicleNumber:e.target.value}))} placeholder="KA-01-AB-1234" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Driver Name</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.driverName} onChange={e=>setForm(f=>({...f,driverName:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Remarks</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))} /></div>
                </div>
                {form.items.length>0&&(
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase block mb-2">Items from PO</label>
                    <table className="w-full text-sm border rounded-lg overflow-hidden">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th className="px-3 py-2 text-left">Material</th><th className="px-3 py-2 text-left">Ordered</th><th className="px-3 py-2 text-left">Received *</th><th className="px-3 py-2 text-left">Rejected</th><th className="px-3 py-2 text-left">UOM</th></tr></thead>
                      <tbody className="divide-y">
                        {form.items.map((item,i)=>(
                          <tr key={i} className="bg-white">
                            <td className="px-3 py-2 font-medium">{item.name}</td>
                            <td className="px-3 py-2 text-gray-500">{item.orderedQty}</td>
                            <td className="px-3 py-2"><input type="number" className="w-24 border rounded px-2 py-1 text-sm" value={item.receivedQty} onChange={e=>setForm(f=>({...f,items:f.items.map((it,idx)=>idx===i?{...it,receivedQty:e.target.value}:it)}))} /></td>
                            <td className="px-3 py-2"><input type="number" className="w-20 border rounded px-2 py-1 text-sm" value={item.rejectedQty} onChange={e=>setForm(f=>({...f,items:f.items.map((it,idx)=>idx===i?{...it,rejectedQty:e.target.value}:it)}))} /></td>
                            <td className="px-3 py-2 font-bold text-indigo-600">{item.uom}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="p-5 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={()=>setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleSubmit} disabled={saving||!form.purchaseOrderId} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving?'Creating...':'Create GRN'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
