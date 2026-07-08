'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import DocumentAttachments from '@/components/shared/DocumentAttachments';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const STATUS_COLORS = { DRAFT:'bg-gray-100 text-gray-600', APPROVED:'bg-green-100 text-green-700', DISPATCHED:'bg-purple-100 text-purple-700', CANCELLED:'bg-red-100 text-red-600' };
const TRANSPORT_ICONS = { ROAD:'🚚', RAIL:'🚂', AIR:'✈️', COURIER:'📦' };

export default function DispatchPlanningPage() {
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState(null);
  const [salesOrders, setSalesOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [viewDetail, setViewDetail] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [pendingItems, setPendingItems] = useState([]);
  const [form, setForm] = useState({ soId:'', plannedDate:'', deliveryAddress:'', transportMode:'ROAD', transporterName:'', vehicleNumber:'', driverName:'', driverPhone:'', remarks:'', items:[] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const [pRes, sRes, soRes] = await Promise.all([
      fetch(`${API}/dispatch-plans?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/dispatch-plans/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/sales-orders?status=CONFIRMED&limit=50`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (pRes.ok) { const d = await pRes.json(); setPlans(d.data); setTotal(d.total); setTotalPages(d.totalPages); }
    if (sRes.ok) setStats(await sRes.json());
    if (soRes.ok) { const d = await soRes.json(); setSalesOrders(d.data||[]); }
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, [page, search, status]);

  async function handleSoSelect(soId) {
    setForm(f => ({ ...f, soId, items:[] }));
    setPendingItems([]);
    if (!soId) return;
    const res = await fetch(`${API}/dispatch-plans/pending-so-items/${soId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const d = await res.json();
      setPendingItems(d.items||[]);
      setForm(f => ({
        ...f, soId,
        items: (d.items||[]).map(i => ({ soItemId:i.id, itemCode:i.itemCode, itemName:i.itemName, plannedQty:i.pendingQty, uom:i.uom, maxQty:i.pendingQty })),
      }));
    }
  }

  function updateItemQty(i, val) {
    setForm(f => {
      const items = [...f.items];
      const max = items[i].maxQty;
      items[i] = { ...items[i], plannedQty: Math.min(parseFloat(val)||0, max) };
      return { ...f, items };
    });
  }

  async function handleCreate() {
    setSaving(true); setError('');
    const body = {
      ...form,
      plannedDate: new Date(form.plannedDate).toISOString(),
      items: form.items.filter(i => i.plannedQty > 0).map(i => ({ soItemId:i.soItemId, itemCode:i.itemCode, itemName:i.itemName, plannedQty:i.plannedQty, uom:i.uom })),
    };
    ['deliveryAddress','transporterName','vehicleNumber','driverName','driverPhone','remarks'].forEach(k => { if (!body[k]) delete body[k]; });
    if (body.items.length === 0) { setError('At least one item with qty > 0 required'); setSaving(false); return; }
    const res = await fetch(`${API}/dispatch-plans`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    setSaving(false);
  }

  async function handleApprove(id) {
    const res = await fetch(`${API}/dispatch-plans/${id}/approve`, { method:'POST', headers:{Authorization:`Bearer ${getToken()}`} });
    if (res.ok) { fetchAll(); if (viewDetail?.id===id) { const d = await fetch(`${API}/dispatch-plans/${id}`,{headers:{Authorization:`Bearer ${getToken()}`}}); if(d.ok) setViewDetail(await d.json()); } }
    else { const d = await res.json(); alert(d.message); }
  }

  async function handleCancel() {
    if (!cancelReason) { alert('Enter cancellation reason'); return; }
    const res = await fetch(`${API}/dispatch-plans/${cancelModal}/cancel`, {
      method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},
      body: JSON.stringify({cancelReason}),
    });
    if (res.ok) { setCancelModal(null); setCancelReason(''); fetchAll(); }
    else { const d = await res.json(); alert(d.message); }
  }

  async function openDetail(id) {
    const res = await fetch(`${API}/dispatch-plans/${id}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setViewDetail(await res.json());
  }

  const isOverdue = p => p.status==='APPROVED' && new Date(p.plannedDate) < new Date();

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dispatch Planning</h1>
            <p className="text-gray-500 text-sm mt-1">Plan and approve dispatch of sales order items to customers</p>
          </div>
          <button onClick={()=>{setForm({soId:'',plannedDate:'',deliveryAddress:'',transportMode:'ROAD',transporterName:'',vehicleNumber:'',driverName:'',driverPhone:'',remarks:'',items:[]});setPendingItems([]);setError('');setShowModal(true);}} className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-medium">+ New Dispatch Plan</button>
        </div>

        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            {[
              {label:'Total',value:stats.total,color:'bg-gray-50'},
              {label:'Draft',value:stats.draft,color:'bg-gray-50'},
              {label:'Approved',value:stats.approved,color:'bg-green-50'},
              {label:'Dispatched',value:stats.dispatched,color:'bg-purple-50'},
              {label:'Cancelled',value:stats.cancelled,color:'bg-red-50'},
              {label:'Overdue',value:stats.overdue,color:'bg-orange-50'},
            ].map(s=>(
              <div key={s.label} className={`${s.color} rounded-lg p-3 text-center`}>
                <div className="text-lg font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex gap-3 flex-wrap">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search plan number, customer, vehicle..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
              <option value="">All Status</option>
              {Object.keys(STATUS_COLORS).map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} plans</span>
          </div>

          <div className="divide-y">
            {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
            : plans.length===0 ? <div className="text-center py-10 text-gray-400">No dispatch plans found</div>
            : plans.map(p=>(
              <div key={p.id} className={`p-4 hover:bg-gray-50 ${isOverdue(p)?'border-l-4 border-orange-400':''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-wrap cursor-pointer" onClick={()=>openDetail(p.id)}>
                    <span className="font-mono font-bold text-orange-600">{p.planNumber}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                    <span className="text-sm font-medium text-gray-800">{p.customerName}</span>
                    {p.salesOrder && <span className="font-mono text-xs text-indigo-600">{p.salesOrder.soNumber}</span>}
                    <span className="text-lg">{TRANSPORT_ICONS[p.transportMode]||'🚚'}</span>
                    {p.vehicleNumber && <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{p.vehicleNumber}</span>}
                    {isOverdue(p) && <span className="text-xs text-orange-600 font-bold">⚠ OVERDUE</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Planned: {fmtDate(p.plannedDate)}</span>
                    <span className="text-xs text-gray-400">{p.items?.length||0} items</span>
                    {p.status==='DRAFT' && <button onClick={()=>handleApprove(p.id)} className="px-2 py-1 text-xs bg-green-600 text-white rounded">Approve</button>}
                    {!['DISPATCHED','CANCELLED'].includes(p.status) && <button onClick={()=>{setCancelModal(p.id);setCancelReason('');}} className="px-2 py-1 text-xs bg-red-500 text-white rounded">Cancel</button>}
                    <button onClick={()=>openDetail(p.id)} className="px-2 py-1 text-xs border rounded">View</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="p-4 border-t flex justify-center gap-2">
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button>
              <span className="px-3 py-1 text-sm">{page} of {totalPages}</span>
              <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </div>

        {viewDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold">{viewDetail.planNumber}</h2>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[viewDetail.status]}`}>{viewDetail.status}</span>
                  <span className="text-xl">{TRANSPORT_ICONS[viewDetail.transportMode]}</span>
                </div>
                <button onClick={()=>setViewDetail(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Customer:</span><span className="font-medium">{viewDetail.customerName}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">SO:</span><span className="font-mono text-indigo-600">{viewDetail.salesOrder?.soNumber}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Planned Date:</span><span className={isOverdue(viewDetail)?'text-orange-600 font-bold':''}>{fmtDate(viewDetail.plannedDate)}</span></div>
                    {viewDetail.deliveryAddress && <div><span className="text-gray-500">Address:</span><div className="text-xs mt-0.5">{viewDetail.deliveryAddress}</div></div>}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Transport:</span><span>{viewDetail.transportMode}</span></div>
                    {viewDetail.transporterName && <div className="flex justify-between"><span className="text-gray-500">Transporter:</span><span>{viewDetail.transporterName}</span></div>}
                    {viewDetail.vehicleNumber && <div className="flex justify-between"><span className="text-gray-500">Vehicle:</span><span className="font-mono font-bold">{viewDetail.vehicleNumber}</span></div>}
                    {viewDetail.driverName && <div className="flex justify-between"><span className="text-gray-500">Driver:</span><span>{viewDetail.driverName} {viewDetail.driverPhone?`(${viewDetail.driverPhone})`:''}</span></div>}
                    {viewDetail.approvedDate && <div className="flex justify-between"><span className="text-gray-500">Approved:</span><span>{fmtDate(viewDetail.approvedDate)}</span></div>}
                  </div>
                </div>

                <table className="w-full text-sm mb-4">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Item Code','Item Name','Planned Qty','UOM'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y">
                    {viewDetail.items?.map((item,i)=>(
                      <tr key={i}>
                        <td className="px-3 py-2 font-mono text-xs text-blue-600">{item.itemCode}</td>
                        <td className="px-3 py-2 text-xs">{item.itemName}</td>
                        <td className="px-3 py-2 text-xs font-bold">{item.plannedQty}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{item.uom}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {viewDetail.remarks && <div className="p-3 bg-gray-50 rounded text-xs"><span className="font-semibold">Remarks: </span>{viewDetail.remarks}</div>}
                {viewDetail.cancelReason && <div className="p-3 bg-red-50 rounded text-xs text-red-600 mt-2"><span className="font-semibold">Cancelled: </span>{viewDetail.cancelReason}</div>}

              <DocumentAttachments referenceType="DISPATCH_PLAN" referenceId={viewDetail?.id} referenceNumber={viewDetail?.planNumber} title="Plan Attachments" />
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                {viewDetail.status==='DRAFT' && <button onClick={()=>handleApprove(viewDetail.id)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Approve Plan</button>}
                {!['DISPATCHED','CANCELLED'].includes(viewDetail.status) && <button onClick={()=>{setCancelModal(viewDetail.id);setCancelReason('');setViewDetail(null);}} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm">Cancel Plan</button>}
                <button onClick={()=>setViewDetail(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
              </div>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-orange-700">New Dispatch Plan</h2>
                <button onClick={()=>setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Sales Order *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.soId} onChange={e=>handleSoSelect(e.target.value)}>
                      <option value="">— Select Confirmed SO —</option>
                      {salesOrders.map(s=><option key={s.id} value={s.id}>{s.soNumber} — {s.customerName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Planned Date *</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.plannedDate} onChange={e=>setForm(f=>({...f,plannedDate:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Transport Mode</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.transportMode} onChange={e=>setForm(f=>({...f,transportMode:e.target.value}))}>
                      {['ROAD','RAIL','AIR','COURIER'].map(m=><option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Transporter Name</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.transporterName} onChange={e=>setForm(f=>({...f,transporterName:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Vehicle Number</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="MH-12-AB-1234" value={form.vehicleNumber} onChange={e=>setForm(f=>({...f,vehicleNumber:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Driver Name</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.driverName} onChange={e=>setForm(f=>({...f,driverName:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Driver Phone</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.driverPhone} onChange={e=>setForm(f=>({...f,driverPhone:e.target.value}))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Delivery Address</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.deliveryAddress} onChange={e=>setForm(f=>({...f,deliveryAddress:e.target.value}))} />
                  </div>
                </div>

                {form.items.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-2">Items to Dispatch</div>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500"><tr>{['Item Code','Item Name','Pending','Dispatch Qty','UOM'].map(h=><th key={h} className="px-2 py-2 text-left">{h}</th>)}</tr></thead>
                      <tbody>
                        {form.items.map((item,i)=>(
                          <tr key={i} className="border-b">
                            <td className="px-2 py-1 font-mono text-xs text-blue-600">{item.itemCode}</td>
                            <td className="px-2 py-1 text-xs">{item.itemName}</td>
                            <td className="px-2 py-1 text-xs text-orange-600 font-bold">{item.maxQty}</td>
                            <td className="px-2 py-1">
                              <input type="number" min="0" max={item.maxQty} className="border rounded px-2 py-1 text-xs w-20" value={item.plannedQty} onChange={e=>updateItemQty(i,e.target.value)} />
                            </td>
                            <td className="px-2 py-1 text-xs text-gray-500">{item.uom}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {form.soId && form.items.length === 0 && <div className="text-center py-4 text-gray-400 text-sm">No pending items for this SO</div>}

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Remarks</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))} />
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={()=>setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Creating...':'Create Plan'}</button>
              </div>
            </div>
          </div>
        )}

        {cancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b"><h2 className="text-lg font-bold text-red-700">Cancel Dispatch Plan</h2></div>
              <div className="p-6">
                <label className="block text-sm text-gray-600 mb-2">Cancellation Reason *</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={cancelReason} onChange={e=>setCancelReason(e.target.value)} />
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={()=>setCancelModal(null)} className="px-4 py-2 border rounded-lg text-sm">Back</button>
                <button onClick={handleCancel} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Confirm Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
