'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import DocumentAttachments from '@/components/shared/DocumentAttachments';

const API = process.env.NEXT_PUBLIC_API_URL;

async function downloadPdf(id) {
  const res = await fetch(`${API}/pdf/dispatch/${id}`, {headers:{Authorization:`Bearer ${getToken()}`}});
  if (res.ok) {
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='Challan-'+id+'.pdf'; a.click();
    URL.revokeObjectURL(url);
  } else alert('PDF generation failed');
}

function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;

const STATUS_COLORS = { DISPATCHED:'bg-blue-100 text-blue-700', DELIVERED:'bg-green-100 text-green-700', CANCELLED:'bg-red-100 text-red-600' };
const TRANSPORT_ICONS = { ROAD:'🚚', RAIL:'🚂', AIR:'✈️', COURIER:'📦' };

export default function DispatchPage() {
  const [dispatches, setDispatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [approvedPlans, setApprovedPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [viewDetail, setViewDetail] = useState(null);
  const [planDetail, setPlanDetail] = useState(null);
  const [soItems, setSoItems] = useState([]);
  const [form, setForm] = useState({ planId:'', dispatchDate:'', deliveryAddress:'', vehicleNumber:'', transporterName:'', driverName:'', driverPhone:'', lrNumber:'', ewayBillNumber:'', remarks:'', items:[] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const [dRes, sRes, pRes] = await Promise.all([
      fetch(`${API}/dispatches?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/dispatches/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/dispatch-plans?status=APPROVED&limit=50`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (dRes.ok) { const d = await dRes.json(); setDispatches(d.data); setTotal(d.total); setTotalPages(d.totalPages); }
    if (sRes.ok) setStats(await sRes.json());
    if (pRes.ok) { const d = await pRes.json(); setApprovedPlans(d.data||[]); }
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, [page, search, status]);

  async function handlePlanSelect(planId) {
    setForm(f => ({ ...f, planId, items:[] }));
    setPlanDetail(null); setSoItems([]);
    if (!planId) return;
    const pRes = await fetch(`${API}/dispatch-plans/${planId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!pRes.ok) return;
    const pd = await pRes.json();
    setPlanDetail(pd);
    const soRes = await fetch(`${API}/sales-orders/${pd.soId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    const soData = soRes.ok ? await soRes.json() : null;
    setSoItems(soData?.items||[]);
    setForm(f => ({
      ...f, planId,
      deliveryAddress: pd.deliveryAddress||f.deliveryAddress,
      vehicleNumber: pd.vehicleNumber||f.vehicleNumber,
      transporterName: pd.transporterName||f.transporterName,
      driverName: pd.driverName||f.driverName,
      driverPhone: pd.driverPhone||f.driverPhone,
      items: pd.items.map(pi => {
        const soItem = soData?.items?.find(s => s.id === pi.soItemId);
        return { planItemId:pi.id, soItemId:pi.soItemId, itemCode:pi.itemCode, itemName:pi.itemName, plannedQty:pi.plannedQty, dispatchedQty:pi.plannedQty, uom:pi.uom, unitPrice:soItem?.unitPrice||0, gstRate:soItem?.gstRate||18 };
      }),
    }));
  }

  function updateItemQty(i, val) {
    setForm(f => {
      const items = [...f.items];
      items[i] = { ...items[i], dispatchedQty: Math.min(parseFloat(val)||0, items[i].plannedQty) };
      return { ...f, items };
    });
  }

  async function handleCreate() {
    setSaving(true); setError('');
    const body = {
      ...form,
      dispatchDate: form.dispatchDate ? new Date(form.dispatchDate).toISOString() : new Date().toISOString(),
      items: form.items.filter(i => i.dispatchedQty > 0),
    };
    ['deliveryAddress','vehicleNumber','transporterName','driverName','driverPhone','lrNumber','ewayBillNumber','remarks'].forEach(k => { if (!body[k]) delete body[k]; });
    const res = await fetch(`${API}/dispatches`, {
      method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    setSaving(false);
  }

  async function openDetail(id) {
    const res = await fetch(`${API}/dispatches/${id}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setViewDetail(await res.json());
  }

  async function handleMarkDelivered(id) {
    const res = await fetch(`${API}/dispatches/${id}/deliver`, {
      method: 'POST', headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();
    if (res.ok) { setViewDetail(data); fetchAll(); }
    else alert(data.message || 'Failed to mark delivered');
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dispatch</h1>
            <p className="text-gray-500 text-sm mt-1">Execute dispatches from approved dispatch plans — Delivery Challans</p>
          </div>
          <button onClick={()=>{setForm({planId:'',dispatchDate:'',deliveryAddress:'',vehicleNumber:'',transporterName:'',driverName:'',driverPhone:'',lrNumber:'',ewayBillNumber:'',remarks:'',items:[]});setPlanDetail(null);setSoItems([]);setError('');setShowModal(true);}} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium">+ Create Dispatch</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[
              {label:'Total',value:stats.total,color:'bg-gray-50'},
              {label:'Dispatched',value:stats.dispatched,color:'bg-blue-50'},
              {label:'Delivered',value:stats.delivered,color:'bg-green-50'},
              {label:'Cancelled',value:stats.cancelled,color:'bg-red-50'},
              {label:'Total Qty',value:stats.totalQtyDispatched,color:'bg-purple-50'},
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
            <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search dispatch number, customer, LR number..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
              <option value="">All Status</option>
              {Object.keys(STATUS_COLORS).map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} dispatches</span>
          </div>

          <div className="divide-y">
            {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
            : dispatches.length===0 ? <div className="text-center py-10 text-gray-400">No dispatches found</div>
            : dispatches.map(d=>(
              <div key={d.id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={()=>openDetail(d.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono font-bold text-purple-600">{d.dispatchNumber}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[d.status]}`}>{d.status}</span>
                    <span className="text-sm font-medium text-gray-800">{d.customerName}</span>
                    {d.salesOrder && <span className="font-mono text-xs text-indigo-600">{d.salesOrder.soNumber}</span>}
                    {d.dispatchPlan && <span className="font-mono text-xs text-orange-500">{d.dispatchPlan.planNumber}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{TRANSPORT_ICONS[d.dispatchPlan?.transportMode]||'🚚'}</span>
                    {d.vehicleNumber && <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{d.vehicleNumber}</span>}
                    <span className="text-xs text-gray-400">{fmtDate(d.dispatchDate)}</span>
                    <span className="text-xs text-gray-400">{d.items?.length||0} items</span>
                  </div>
                </div>
                {d.lrNumber && <div className="mt-1 text-xs text-gray-500">LR: {d.lrNumber} {d.ewayBillNumber?`| EWB: ${d.ewayBillNumber}`:''}</div>}
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
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold">{viewDetail.dispatchNumber}</h2>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[viewDetail.status]}`}>{viewDetail.status}</span>
                  <span className="text-xl">{TRANSPORT_ICONS[viewDetail.dispatchPlan?.transportMode]||'🚚'}</span>
                </div>
                <button onClick={()=>setViewDetail(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Customer:</span><span className="font-medium">{viewDetail.customerName}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">SO:</span><span className="font-mono text-indigo-600">{viewDetail.salesOrder?.soNumber}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">CPO:</span><span className="font-mono text-teal-600">{viewDetail.salesOrder?.cpo?.cpoNumber}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Dispatch Date:</span><span className="font-medium">{fmtDate(viewDetail.dispatchDate)}</span></div>
                    {viewDetail.deliveryAddress && <div><span className="text-gray-500">Address:</span><div className="text-xs mt-0.5">{viewDetail.deliveryAddress}</div></div>}
                  </div>
                  <div className="space-y-2 text-sm">
                    {viewDetail.vehicleNumber && <div className="flex justify-between"><span className="text-gray-500">Vehicle:</span><span className="font-mono font-bold">{viewDetail.vehicleNumber}</span></div>}
                    {viewDetail.transporterName && <div className="flex justify-between"><span className="text-gray-500">Transporter:</span><span>{viewDetail.transporterName}</span></div>}
                    {viewDetail.driverName && <div className="flex justify-between"><span className="text-gray-500">Driver:</span><span>{viewDetail.driverName} {viewDetail.driverPhone?`(${viewDetail.driverPhone})`:''}</span></div>}
                    {viewDetail.lrNumber && <div className="flex justify-between"><span className="text-gray-500">LR Number:</span><span className="font-mono font-bold text-blue-600">{viewDetail.lrNumber}</span></div>}
                    {viewDetail.ewayBillNumber && <div className="flex justify-between"><span className="text-gray-500">E-Way Bill:</span><span className="font-mono font-bold text-green-600">{viewDetail.ewayBillNumber}</span></div>}
                  </div>
                </div>

                <table className="w-full text-sm mb-4">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Item Code','Item Name','Dispatched Qty','UOM','Unit Price','GST%','Total'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y">
                    {viewDetail.items?.map((item,i)=>(
                      <tr key={i}>
                        <td className="px-3 py-2 font-mono text-xs text-blue-600">{item.itemCode}</td>
                        <td className="px-3 py-2 text-xs">{item.itemName}</td>
                        <td className="px-3 py-2 text-xs font-bold text-purple-600">{item.dispatchedQty}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{item.uom}</td>
                        <td className="px-3 py-2 text-xs">{fmt(item.unitPrice)}</td>
                        <td className="px-3 py-2 text-xs">{item.gstRate}%</td>
                        <td className="px-3 py-2 text-xs font-bold">{fmt(item.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {viewDetail.remarks && <div className="p-3 bg-gray-50 rounded text-xs"><span className="font-semibold">Remarks: </span>{viewDetail.remarks}</div>}

              <DocumentAttachments referenceType="DISPATCH" referenceId={viewDetail?.id} referenceNumber={viewDetail?.dispatchNumber} title="Dispatch Attachments" />
              </div>
              <div className="p-6 border-t flex justify-end sticky bottom-0 bg-white">
                {viewDetail?.status==='DISPATCHED' && <button onClick={()=>handleMarkDelivered(viewDetail.id)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Mark Delivered</button>}
                <button onClick={()=>setViewDetail(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
                <button onClick={()=>downloadPdf(viewDetail?.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">⬇ PDF</button>
              </div>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-purple-700">Create Dispatch — Delivery Challan</h2>
                <button onClick={()=>setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Approved Dispatch Plan *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.planId} onChange={e=>handlePlanSelect(e.target.value)}>
                      <option value="">— Select Approved Plan —</option>
                      {approvedPlans.map(p=><option key={p.id} value={p.id}>{p.planNumber} | {p.customerName} | {fmtDate(p.plannedDate)} | {TRANSPORT_ICONS[p.transportMode]} {p.vehicleNumber||''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Dispatch Date</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.dispatchDate} onChange={e=>setForm(f=>({...f,dispatchDate:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Vehicle Number</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.vehicleNumber} onChange={e=>setForm(f=>({...f,vehicleNumber:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">LR Number</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="Lorry Receipt No." value={form.lrNumber} onChange={e=>setForm(f=>({...f,lrNumber:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">E-Way Bill Number</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="GST E-Way Bill No." value={form.ewayBillNumber} onChange={e=>setForm(f=>({...f,ewayBillNumber:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Transporter</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.transporterName} onChange={e=>setForm(f=>({...f,transporterName:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Driver</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.driverName} onChange={e=>setForm(f=>({...f,driverName:e.target.value}))} />
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
                      <thead className="bg-gray-50 text-xs text-gray-500"><tr>{['Item Code','Item Name','Planned','Dispatch Qty','UOM'].map(h=><th key={h} className="px-2 py-2 text-left">{h}</th>)}</tr></thead>
                      <tbody>
                        {form.items.map((item,i)=>(
                          <tr key={i} className="border-b">
                            <td className="px-2 py-1 font-mono text-xs text-blue-600">{item.itemCode}</td>
                            <td className="px-2 py-1 text-xs">{item.itemName}</td>
                            <td className="px-2 py-1 text-xs text-orange-600 font-bold">{item.plannedQty}</td>
                            <td className="px-2 py-1">
                              <input type="number" min="0" max={item.plannedQty} className="border rounded px-2 py-1 text-xs w-20" value={item.dispatchedQty} onChange={e=>updateItemQty(i,e.target.value)} />
                            </td>
                            <td className="px-2 py-1 text-xs text-gray-500">{item.uom}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Remarks</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))} />
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={()=>setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Dispatching...':'Create Dispatch'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
