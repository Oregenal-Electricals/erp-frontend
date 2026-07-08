'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmt = n => n ? '₹'+Number(n).toLocaleString('en-IN',{maximumFractionDigits:2}) : '—';
const STATUS_COLORS = {DRAFT:'bg-gray-100 text-gray-600',CONFIRMED:'bg-blue-100 text-blue-700',IN_PROGRESS:'bg-yellow-100 text-yellow-700',COMPLETED:'bg-green-100 text-green-700',CANCELLED:'bg-red-100 text-red-600'};

export default function SalesOrdersPage() {
  const [sos, setSos] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({customerName:'',customerGstin:'',deliveryDate:'',paymentTerms:'NET_30',remarks:'',soItems:[{itemId:'',quantity:'',unitPrice:'',uom:'NOS'}]});

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    const [soRes,itemRes] = await Promise.all([
      fetch(`${API}/sales-orders?limit=50`,{headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/items?limit=200`,{headers:{Authorization:`Bearer ${getToken()}`}}),
    ]);
    if (soRes.ok) { const d=await soRes.json(); setSos(d.data||[]); }
    if (itemRes.ok) { const d=await itemRes.json(); setItems(d.data||d||[]); }
    setLoading(false);
  }
  useEffect(()=>{ fetchAll(); },[]);

  function addItem() { setForm(f=>({...f,soItems:[...f.soItems,{itemId:'',quantity:'',unitPrice:'',uom:'NOS'}]})); }
  function removeItem(i) { setForm(f=>({...f,soItems:f.soItems.filter((_,idx)=>idx!==i)})); }
  function updateItem(i,field,val) { setForm(f=>({...f,soItems:f.soItems.map((item,idx)=>idx===i?{...item,[field]:val}:item)})); }
  const totalAmount = form.soItems.reduce((s,i)=>s+(parseFloat(i.quantity)||0)*(parseFloat(i.unitPrice)||0),0);

  async function handleSubmit() {
    setSaving(true); setError('');
    const body = {
      customerName:form.customerName,
      customerGstin:form.customerGstin||undefined,
      deliveryDate:form.deliveryDate||undefined,
      paymentTerms:form.paymentTerms,
      remarks:form.remarks||undefined,
      items:form.soItems.filter(i=>i.itemId&&i.quantity&&i.unitPrice).map(i=>({
        itemId:i.itemId,
        quantity:parseFloat(i.quantity),
        unitPrice:parseFloat(i.unitPrice),
        uom:i.uom,
      }))
    };
    if (!body.customerName) { setError('Enter customer name'); setSaving(false); return; }
    if (!body.items.length) { setError('Add at least one item'); setSaving(false); return; }
    const res = await fetch(`${API}/sales-orders`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    const data = await res.json();
    if (res.ok) { setShowForm(false); setForm({customerName:'',customerGstin:'',deliveryDate:'',paymentTerms:'NET_30',remarks:'',soItems:[{itemId:'',quantity:'',unitPrice:'',uom:'NOS'}]}); fetchAll(); }
    else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    setSaving(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-bold text-gray-900">💼 Sales Orders</h1><p className="text-gray-500 text-sm mt-1">{sos.length} sales orders</p></div>
          <button onClick={()=>setShowForm(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">+ New SO</button>
        </div>
        <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
          {loading?<div className="text-center py-16 text-gray-400">Loading...</div>
          :sos.length===0?<div className="text-center py-16"><div className="text-5xl mb-3">💼</div><div className="text-gray-400">No sales orders yet.</div></div>:(
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th className="px-4 py-3 text-left">SO Number</th><th className="px-4 py-3 text-left">Customer</th><th className="px-4 py-3 text-left">Items</th><th className="px-4 py-3 text-left">Total</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Date</th></tr></thead>
              <tbody className="divide-y">
                {sos.map(so=>(
                  <tr key={so.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600">{so.soNumber}</td>
                    <td className="px-4 py-3 font-medium">{so.customerName}</td>
                    <td className="px-4 py-3">{so.items?.length||0} items</td>
                    <td className="px-4 py-3 font-bold text-green-600">{fmt(so.totalAmount)}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[so.status]||'bg-gray-100'}`}>{so.status}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(so.createdAt)}</td>
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
                <div><h2 className="font-bold text-gray-800 text-lg">New Sales Order</h2><p className="text-xs text-gray-400">Total: <span className="font-bold text-green-600">{fmt(totalAmount)}</span></p></div>
                <button onClick={()=>setShowForm(false)} className="text-gray-400">✕</button>
              </div>
              <div className="p-5 space-y-4">
                {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-gray-500 mb-1">Customer Name *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.customerName} onChange={e=>setForm(f=>({...f,customerName:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Customer GSTIN</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.customerGstin} onChange={e=>setForm(f=>({...f,customerGstin:e.target.value}))} placeholder="29XXXXX1234X1ZX" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Delivery Date</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.deliveryDate} onChange={e=>setForm(f=>({...f,deliveryDate:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Payment Terms</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.paymentTerms} onChange={e=>setForm(f=>({...f,paymentTerms:e.target.value}))}>
                      {['NET_15','NET_30','NET_45','NET_60','ADVANCE','COD'].map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Remarks</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))} /></div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-600 uppercase">Products</label>
                    <button onClick={addItem} className="px-3 py-1 text-xs bg-indigo-600 text-white rounded">+ Add Item</button>
                  </div>
                  <div className="space-y-3">
                    {form.soItems.map((item,i)=>(
                      <div key={i} className="border rounded-lg p-3 bg-gray-50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Product *</label>
                            <select className="w-full border rounded-lg px-3 py-2 text-sm bg-white" value={item.itemId}
                              onChange={e=>{
                                const it = items.find(r=>r.id===e.target.value);
                                updateItem(i,'itemId',e.target.value);
                                if(it) { updateItem(i,'unitPrice',it.salesRate||it.standardCost||''); updateItem(i,'uom',it.uom?.code||'NOS'); }
                              }}>
                              <option value="">— Select Product —</option>
                              {items.map(it=><option key={it.id} value={it.id}>{it.itemName} ({it.itemCode})</option>)}
                            </select>
                          </div>
                          <div><label className="block text-xs text-gray-500 mb-1">Quantity *</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={item.quantity} onChange={e=>updateItem(i,'quantity',e.target.value)} /></div>
                          <div><label className="block text-xs text-gray-500 mb-1">Unit Price *</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={item.unitPrice} onChange={e=>updateItem(i,'unitPrice',e.target.value)} /></div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-500">Line total: <span className="font-bold text-green-600">{fmt((parseFloat(item.quantity)||0)*(parseFloat(item.unitPrice)||0))}</span></span>
                          {form.soItems.length>1&&<button onClick={()=>removeItem(i)} className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded border border-red-200">Remove</button>}
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
                  <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving?'Creating...':'Create SO'}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
