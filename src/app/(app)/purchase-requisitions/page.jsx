'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';

const STATUS_COLORS = {
  DRAFT:'bg-gray-100 text-gray-600',
  PENDING:'bg-yellow-100 text-yellow-700',
  APPROVED:'bg-green-100 text-green-700',
  REJECTED:'bg-red-100 text-red-600',
  CANCELLED:'bg-red-100 text-red-400',
};

export default function PurchaseRequisitionsPage() {
  const [prs, setPrs] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);

  const [form, setForm] = useState({
    title: '',
    requiredDate: '',
    priority: 'NORMAL',
    notes: '',
    items: [{ rawMaterialId: '', quantity: '', uom: '', remarks: '' }]
  });

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    const [prRes, rmRes] = await Promise.all([
      fetch(`${API}/purchase-requisitions?limit=50`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/raw-materials?limit=200`, {headers:{Authorization:`Bearer ${getToken()}`}}),
    ]);
    if (prRes.ok) { const d=await prRes.json(); setPrs(d.data||[]); }
    if (rmRes.ok) { const d=await rmRes.json(); setRawMaterials(d.data||[]); }
    setLoading(false);
  }

  useEffect(()=>{ fetchAll(); },[]);

  function addItem() {
    setForm(f=>({...f, items:[...f.items, {rawMaterialId:'',quantity:'',uom:'',requiredDate:'',remarks:''}]}));
  }

  function removeItem(i) {
    setForm(f=>({...f, items:f.items.filter((_,idx)=>idx!==i)}));
  }

  function updateItem(i, field, val) {
    setForm(f=>({...f, items:f.items.map((item,idx)=>idx===i?{...item,[field]:val}:item)}));
  }

  async function handleSubmit() {
    setSaving(true); setError('');
    const body = {
      title: form.title,
      requiredDate: form.requiredDate,
      priority: form.priority,
      notes: form.notes || undefined,
      items: form.items.filter(i=>i.rawMaterialId && i.quantity).map(i=>{
        const rm = rawMaterials.find(r=>r.id===i.rawMaterialId);
        return {
          rawMaterialId: i.rawMaterialId,
          itemCode: rm?.code || i.rawMaterialId,
          itemName: rm?.name || i.rawMaterialId,
          itemType: 'RAW_MATERIAL',
          uom: i.uom || 'NOS',
          requiredQty: parseFloat(i.quantity),
          notes: i.remarks || undefined,
        };
      })
    };
    if (!body.title) { setError('Enter PR title'); setSaving(false); return; }
    if (!body.requiredDate) { setError('Select required date'); setSaving(false); return; }
    if (!body.items.length) { setError('Add at least one item'); setSaving(false); return; }
    const res = await fetch(`${API}/purchase-requisitions`, {
      method:'POST',
      headers:{'Content-Type':'application/json', Authorization:`Bearer ${getToken()}`},
      body:JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      setShowForm(false);
      setForm({title:'',requiredDate:'',priority:'NORMAL',notes:'',items:[{rawMaterialId:'',quantity:'',uom:'',remarks:''}]});
      fetchAll();
    } else {
      setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    }
    setSaving(false);
  }

  async function handleApprove(id) {
    await fetch(`${API}/purchase-requisitions/${id}/approve`, {method:'PUT', headers:{Authorization:`Bearer ${getToken()}`}});
    fetchAll();
  }

  async function handleCancel(id) {
    if (!confirm('Cancel this PR?')) return;
    await fetch(`${API}/purchase-requisitions/${id}/cancel`, {method:'PUT', headers:{Authorization:`Bearer ${getToken()}`}});
    fetchAll();
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Requisitions</h1>
            <p className="text-gray-500 text-sm mt-1">{prs.length} requisitions</p>
          </div>
          <button onClick={()=>setShowForm(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">
            + New PR
          </button>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
          {loading?<div className="text-center py-16 text-gray-400">Loading...</div>
          :prs.length===0?<div className="text-center py-16"><div className="text-5xl mb-3">📋</div><div className="text-gray-400">No purchase requisitions yet.</div></div>:(
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">PR Number</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Items</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Remarks</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {prs.map(pr=>(
                  <tr key={pr.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600">{pr.prNumber}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(pr.createdAt)}</td>
                    <td className="px-4 py-3">{pr.items?.length||0} items</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[pr.status]||'bg-gray-100'}`}>{pr.status}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{pr.remarks||'—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={()=>setSelected(pr)} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">View</button>
                        {pr.status==='DRAFT'&&<button onClick={()=>handleApprove(pr.id)} className="px-2 py-1 text-xs bg-green-600 text-white rounded">Approve</button>}
                        {pr.status==='DRAFT'&&<button onClick={()=>handleCancel(pr.id)} className="px-2 py-1 text-xs bg-red-500 text-white rounded">Cancel</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-screen overflow-y-auto">
              <div className="p-5 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="font-bold text-gray-800 text-lg">New Purchase Requisition</h2>
                <button onClick={()=>setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="p-5 space-y-4">
                {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">PR Title *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Raw materials for July production" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Required By Date *</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.requiredDate} onChange={e=>setForm(f=>({...f,requiredDate:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Priority</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>
                      {['LOW','NORMAL','HIGH','URGENT'].map(p=><option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Notes</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Additional notes..." />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-600 uppercase">Items</label>
                    <button onClick={addItem} className="px-3 py-1 text-xs bg-indigo-600 text-white rounded">+ Add Item</button>
                  </div>
                  <div className="space-y-3">
                    {form.items.map((item,i)=>(
                      <div key={i} className="border rounded-lg p-3 bg-gray-50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Material *</label>
                            <select className="w-full border rounded-lg px-3 py-2 text-sm bg-white" value={item.rawMaterialId}
                              onChange={e=>{
                                const rm = rawMaterials.find(r=>r.id===e.target.value);
                                updateItem(i,'rawMaterialId',e.target.value);
                                updateItem(i,'uom', rm?.uom?.code || rm?.uomCode || 'NOS');
                              }}>
                              <option value="">— Select Material —</option>
                              {rawMaterials.map(r=><option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Quantity *</label>
                            <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={item.quantity} onChange={e=>updateItem(i,'quantity',e.target.value)} placeholder="0" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">UOM (auto)</label>
                            <input className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 font-bold text-indigo-600" value={item.uom||'—'} readOnly />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Required Date</label>
                            <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={item.requiredDate} onChange={e=>updateItem(i,'requiredDate',e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Item Remarks</label>
                            <input className="w-full border rounded-lg px-3 py-2 text-sm" value={item.remarks} onChange={e=>updateItem(i,'remarks',e.target.value)} />
                          </div>
                          <div className="flex items-end">
                            {form.items.length>1&&<button onClick={()=>removeItem(i)} className="px-3 py-2 text-xs bg-red-50 text-red-600 rounded border border-red-200">Remove</button>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-5 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={()=>setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleSubmit} disabled={saving||!form.title||!form.requiredDate} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving?'Creating...':'Create PR'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Detail Modal */}
        {selected && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="p-5 border-b flex justify-between">
                <div>
                  <h2 className="font-bold text-gray-800">{selected.prNumber}</h2>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[selected.status]}`}>{selected.status}</span>
                </div>
                <button onClick={()=>setSelected(null)} className="text-gray-400">✕</button>
              </div>
              <div className="p-5">
                <div className="text-sm text-gray-600 mb-4">Remarks: {selected.remarks||'—'}</div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr><th className="px-3 py-2 text-left">Material</th><th className="px-3 py-2 text-left">Qty</th><th className="px-3 py-2 text-left">UOM</th><th className="px-3 py-2 text-left">Required</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {(selected.items||[]).map((item,i)=>(
                      <tr key={i}>
                        <td className="px-3 py-2">{item.rawMaterial?.name||item.rawMaterialId}</td>
                        <td className="px-3 py-2 font-bold">{item.quantity}</td>
                        <td className="px-3 py-2">{item.uom}</td>
                        <td className="px-3 py-2 text-xs">{fmtDate(item.requiredDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                {selected.status==='DRAFT'&&<button onClick={()=>{handleApprove(selected.id);setSelected(null);}} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Approve</button>}
                <button onClick={()=>setSelected(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
