'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmt = n => n ? '₹'+Number(n).toLocaleString('en-IN',{maximumFractionDigits:2}) : '—';
const STATUS_COLORS = {DRAFT:'bg-gray-100 text-gray-600',PENDING:'bg-yellow-100 text-yellow-700',APPROVED:'bg-green-100 text-green-700',SENT:'bg-blue-100 text-blue-700',CLOSED:'bg-indigo-100 text-indigo-700',CANCELLED:'bg-red-100 text-red-600'};

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({vendorId:'',deliveryDate:'',paymentTerms:'NET_30',remarks:'',items:[{rawMaterialId:'',quantity:'',unitPrice:'',uom:'',remarks:''}]});

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    const [poRes,vendorRes,rmRes] = await Promise.all([
      fetch(`${API}/purchase-orders?limit=50`,{headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/vendors?limit=100`,{headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/raw-materials?limit=200`,{headers:{Authorization:`Bearer ${getToken()}`}}),
    ]);
    if (poRes.ok) { const d=await poRes.json(); setPos(d.data||[]); }
    if (vendorRes.ok) { const d=await vendorRes.json(); setVendors(d.data||[]); }
    if (rmRes.ok) { const d=await rmRes.json(); setRawMaterials(d.data||[]); }
    setLoading(false);
  }
  useEffect(()=>{ fetchAll(); },[]);

  function addItem() { setForm(f=>({...f,items:[...f.items,{rawMaterialId:'',quantity:'',unitPrice:'',uom:'',remarks:''}]})); }
  function removeItem(i) { setForm(f=>({...f,items:f.items.filter((_,idx)=>idx!==i)})); }
  function updateItem(i,field,val) { setForm(f=>({...f,items:f.items.map((item,idx)=>idx===i?{...item,[field]:val}:item)})); }

  const totalAmount = form.items.reduce((s,i)=>s+(parseFloat(i.quantity)||0)*(parseFloat(i.unitPrice)||0),0);

  async function handleSubmit() {
    setSaving(true); setError('');
    const body = {
      vendorId:form.vendorId,
      deliveryDate:form.deliveryDate||undefined,
      paymentTerms:form.paymentTerms,
      notes:form.remarks||undefined,
      items:form.items.filter(i=>i.rawMaterialId&&i.quantity&&i.unitPrice).map(i=>{
        const rm = rawMaterials.find(r=>r.id===i.rawMaterialId);
        return {
          itemCode: rm?.code || '',
          itemName: rm?.name || '',
          orderedQty: parseFloat(i.quantity),
          unitPrice: parseFloat(i.unitPrice),
          uom: i.uom || 'NOS',
        };
      })
    };
    if (!body.vendorId) { setError('Select a vendor'); setSaving(false); return; }
    if (!body.items.length) { setError('Add at least one item with price'); setSaving(false); return; }
    const res = await fetch(`${API}/purchase-orders`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    const data = await res.json();
    if (res.ok) { setShowForm(false); setForm({vendorId:'',deliveryDate:'',paymentTerms:'NET_30',remarks:'',items:[{rawMaterialId:'',quantity:'',unitPrice:'',uom:'',remarks:''}]}); fetchAll(); }
    else {
      const detail = Array.isArray(data.errors) ? data.errors.join(' | ') : '';
      const summary = Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed';
      setError(detail ? `${summary}: ${detail}` : summary);
    }
    setSaving(false);
  }

  async function handleApprove(id) {
    const res = await fetch(`${API}/purchase-orders/${id}/approve`,{method:'POST',headers:{Authorization:`Bearer ${getToken()}`}});
    if (!res.ok) {
      const d = await res.json().catch(()=>({}));
      alert(d.message || 'Failed to approve PO - check you have permission to approve purchase orders.');
      return;
    }
    fetchAll();
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-bold text-gray-900">🛒 Purchase Orders</h1><p className="text-gray-500 text-sm mt-1">{pos.length} purchase orders</p></div>
          <button onClick={()=>setShowForm(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">+ New PO</button>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
          {loading?<div className="text-center py-16 text-gray-400">Loading...</div>
          :pos.length===0?<div className="text-center py-16"><div className="text-5xl mb-3">🛒</div><div className="text-gray-400">No purchase orders yet.</div></div>:(
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr><th className="px-4 py-3 text-left">PO Number</th><th className="px-4 py-3 text-left">Vendor</th><th className="px-4 py-3 text-left">Items</th><th className="px-4 py-3 text-left">Total</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Actions</th></tr>
              </thead>
              <tbody className="divide-y">
                {pos.map(po=>(
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600">{po.poNumber}</td>
                    <td className="px-4 py-3"><div className="font-medium">{po.vendor?.name}</div><div className="text-xs text-gray-400">{po.vendor?.code}</div></td>
                    <td className="px-4 py-3">{po.items?.length||0} items</td>
                    <td className="px-4 py-3 font-bold text-green-600">{fmt(po.totalAmount)}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[po.status]||'bg-gray-100'}`}>{po.status}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(po.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={async ()=>{
                          const res = await fetch(`${API}/purchase-orders/${po.id}`,{headers:{Authorization:`Bearer ${getToken()}`}});
                          if (res.ok) setSelected(await res.json());
                          else setSelected(po);
                        }} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">View</button>
                        {po.status==='DRAFT'&&<button onClick={()=>handleApprove(po.id)} className="px-2 py-1 text-xs bg-green-600 text-white rounded">Approve</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create PO Modal */}
        {showForm&&(
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
              <div className="p-5 border-b flex justify-between sticky top-0 bg-white">
                <div><h2 className="font-bold text-gray-800 text-lg">New Purchase Order</h2><p className="text-xs text-gray-400">Total: <span className="font-bold text-green-600">{fmt(totalAmount)}</span></p></div>
                <button onClick={()=>setShowForm(false)} className="text-gray-400">✕</button>
              </div>
              <div className="p-5 space-y-4">
                {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Vendor *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.vendorId} onChange={e=>setForm(f=>({...f,vendorId:e.target.value}))}>
                      <option value="">— Select Vendor —</option>
                      {vendors.map(v=><option key={v.id} value={v.id}>{v.name} ({v.code})</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs text-gray-500 mb-1">Delivery Date</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.deliveryDate} onChange={e=>setForm(f=>({...f,deliveryDate:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Payment Terms</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.paymentTerms} onChange={e=>setForm(f=>({...f,paymentTerms:e.target.value}))}>
                      {['NET_15','NET_30','NET_45','NET_60','IMMEDIATE','ADVANCE'].map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Remarks</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))} /></div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-600 uppercase">Items</label>
                    <button onClick={addItem} className="px-3 py-1 text-xs bg-indigo-600 text-white rounded">+ Add Item</button>
                  </div>
                  <div className="space-y-3">
                    {form.items.map((item,i)=>(
                      <div key={i} className="border rounded-lg p-3 bg-gray-50">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Material *</label>
                            <select className="w-full border rounded-lg px-3 py-2 text-sm bg-white" value={item.rawMaterialId}
                              onChange={e=>{
                                const rm = rawMaterials.find(r=>r.id===e.target.value);
                                updateItem(i,'rawMaterialId',e.target.value);
                                updateItem(i,'uom',rm?.uom?.code||'NOS');
                                updateItem(i,'unitPrice',rm?.standardRate||'');
                              }}>
                              <option value="">— Select —</option>
                              {rawMaterials.map(r=><option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
                            </select>
                          </div>
                          <div><label className="block text-xs text-gray-500 mb-1">Qty *</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={item.quantity} onChange={e=>updateItem(i,'quantity',e.target.value)} /></div>
                          <div><label className="block text-xs text-gray-500 mb-1">Unit Price *</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={item.unitPrice} onChange={e=>updateItem(i,'unitPrice',e.target.value)} /></div>
                          <div><label className="block text-xs text-gray-500 mb-1">UOM (auto)</label><input className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-100 font-bold text-indigo-600" value={item.uom||'—'} readOnly /></div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-500">Line total: <span className="font-bold text-green-600">{fmt((parseFloat(item.quantity)||0)*(parseFloat(item.unitPrice)||0))}</span></span>
                          {form.items.length>1&&<button onClick={()=>removeItem(i)} className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded border border-red-200">Remove</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-5 border-t flex justify-between items-center sticky bottom-0 bg-white">
                <div className="text-sm font-bold">Total: <span className="text-green-600">{fmt(totalAmount)}</span></div>
                <div className="flex gap-3">
                  <button onClick={()=>setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                  <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving?'Creating...':'Create PO'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Detail Modal */}
        {selected&&(
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="p-5 border-b flex justify-between">
                <div><h2 className="font-bold text-gray-800">{selected.poNumber}</h2><div className="flex gap-2 mt-1"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[selected.status]}`}>{selected.status}</span></div></div>
                <button onClick={()=>setSelected(null)} className="text-gray-400">✕</button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-400 text-xs">Vendor</span><div className="font-medium">{selected.vendor?.name}</div></div>
                  <div><span className="text-gray-400 text-xs">Total Amount</span><div className="font-bold text-green-600">{fmt(selected.totalAmount)}</div></div>
                  <div><span className="text-gray-400 text-xs">Payment Terms</span><div>{selected.paymentTerms}</div></div>
                  <div><span className="text-gray-400 text-xs">Delivery Date</span><div>{fmtDate(selected.deliveryDate)}</div></div>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th className="px-3 py-2 text-left">Material</th><th className="px-3 py-2 text-left">Qty</th><th className="px-3 py-2 text-left">Price</th><th className="px-3 py-2 text-left">Total</th></tr></thead>
                  <tbody className="divide-y">
                    {(selected.items||[]).map((item,i)=>(
                      <tr key={i}>
                        <td className="px-3 py-2">{item.itemName || item.itemCode}</td>
                        <td className="px-3 py-2">{item.orderedQty} {item.uom}</td>
                        <td className="px-3 py-2">{fmt(item.unitPrice)}</td>
                        <td className="px-3 py-2 font-bold">{fmt(item.orderedQty*item.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                {selected.status==='DRAFT'&&<button onClick={()=>{handleApprove(selected.id);setSelected(null);}} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Approve PO</button>}
                <button onClick={()=>setSelected(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
