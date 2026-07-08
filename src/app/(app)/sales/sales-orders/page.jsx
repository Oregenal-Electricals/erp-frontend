'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import DocumentAttachments from '@/components/shared/DocumentAttachments';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

  async function downloadExcel(endpoint, filename) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=filename+'.xlsx'; a.click();
      URL.revokeObjectURL(url);
    }
  }

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;

const STATUS_COLORS = { DRAFT:'bg-gray-100 text-gray-600', CONFIRMED:'bg-blue-100 text-blue-700', IN_PRODUCTION:'bg-yellow-100 text-yellow-700', DISPATCHED:'bg-purple-100 text-purple-700', COMPLETED:'bg-green-100 text-green-700', CANCELLED:'bg-red-100 text-red-600' };
const BLANK_ITEM = { itemCode:'', itemName:'', qty:1, uom:'PCS', unitPrice:'', discount:0, gstRate:18 };

function calcItem(item) {
  const qty = parseFloat(item.qty)||0;
  const unit = parseFloat(item.unitPrice)||0;
  const disc = parseFloat(item.discount)||0;
  const gst = parseFloat(item.gstRate)||0;
  const gross = qty * unit;
  const discAmt = Math.round(gross * disc / 100 * 100) / 100;
  const taxable = gross - discAmt;
  const gstAmt = Math.round(taxable * gst / 100 * 100) / 100;
  return { total: Math.round((taxable + gstAmt) * 100) / 100, gstAmt };
}

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [cpos, setCpos] = useState([]);
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
  const [form, setForm] = useState({ cpoId:'', deliveryDate:'', remarks:'', items:[{...BLANK_ITEM}] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const [oRes, sRes, cRes] = await Promise.all([
      fetch(`${API}/sales-orders?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/sales-orders/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/customer-po?status=ACKNOWLEDGED&limit=50`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (oRes.ok) { const d = await oRes.json(); setOrders(d.data); setTotal(d.total); setTotalPages(d.totalPages); }
    if (sRes.ok) setStats(await sRes.json());
    if (cRes.ok) { const d = await cRes.json(); setCpos(d.data||[]); }
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, [page, search, status]);

  function handleCpoSelect(cpoId) {
    const cpo = cpos.find(c => c.id === cpoId);
    if (cpo) {
      const items = cpo.items?.map(i => ({ itemCode:i.itemCode, itemName:i.itemName, qty:i.qty, uom:i.uom, unitPrice:i.unitPrice, discount:i.discount||0, gstRate:i.gstRate||18, cpoItemId:i.id })) || [{...BLANK_ITEM}];
      setForm(f => ({ ...f, cpoId, deliveryDate: cpo.deliveryDate ? new Date(cpo.deliveryDate).toISOString().split('T')[0] : f.deliveryDate, items }));
    } else {
      setForm(f => ({ ...f, cpoId }));
    }
  }

  function addItem() { setForm(f => ({ ...f, items: [...f.items, {...BLANK_ITEM}] })); }
  function removeItem(i) { setForm(f => ({ ...f, items: f.items.filter((_,idx) => idx !== i) })); }
  function updateItem(i, key, val) { setForm(f => { const items = [...f.items]; items[i] = { ...items[i], [key]: val }; return { ...f, items }; }); }

  const totals = form.items.reduce((acc, item) => {
    const c = calcItem(item);
    return { subtotal: acc.subtotal + (parseFloat(item.qty)||0)*(parseFloat(item.unitPrice)||0), gst: acc.gst + c.gstAmt, total: acc.total + c.total };
  }, { subtotal: 0, gst: 0, total: 0 });

  async function handleCreate() {
    setSaving(true); setError('');
    const body = {
      ...form,
      deliveryDate: new Date(form.deliveryDate).toISOString(),
      items: form.items.map(i => ({ ...i, qty: parseFloat(i.qty)||1, unitPrice: parseFloat(i.unitPrice)||0, discount: parseFloat(i.discount)||0, gstRate: parseFloat(i.gstRate)||18 })),
    };
    if (!body.remarks) delete body.remarks;
    const res = await fetch(`${API}/sales-orders`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    setSaving(false);
  }

  async function handleConfirm(id) {
    const res = await fetch(`${API}/sales-orders/${id}/confirm`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) { fetchAll(); if (viewDetail?.id===id) { const d = await fetch(`${API}/sales-orders/${id}`, {headers:{Authorization:`Bearer ${getToken()}`}}); if (d.ok) setViewDetail(await d.json()); } }
    else { const d = await res.json(); alert(d.message); }
  }

  async function handleCancel() {
    if (!cancelReason) { alert('Please enter cancellation reason'); return; }
    const res = await fetch(`${API}/sales-orders/${cancelModal}/cancel`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ cancelReason }),
    });
    if (res.ok) { setCancelModal(null); setCancelReason(''); fetchAll(); }
    else { const d = await res.json(); alert(d.message); }
  }

  async function openDetail(id) {
    const res = await fetch(`${API}/sales-orders/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setViewDetail(await res.json());
  }

  const isOverdue = o => ['CONFIRMED','IN_PRODUCTION'].includes(o.status) && new Date(o.deliveryDate) < new Date();

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales Orders</h1>
            <p className="text-gray-500 text-sm mt-1">Internal fulfillment commitments created from Customer POs</p>
          </div>
          <button onClick={()=>{ setForm({cpoId:'',deliveryDate:'',remarks:'',items:[{...BLANK_ITEM}]}); setError(''); setShowModal(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium">+ Create SO</button>
          <button onClick={()=>downloadExcel('/excel/sales-orders','Sales Orders')} className="px-3 py-2 text-sm border border-green-300 text-green-700 rounded-lg hover:bg-green-50">⬇ Excel</button>
        </div>

        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-9 gap-3 mb-6">
            {[
              {label:'Total',value:stats.total,color:'bg-gray-50'},
              {label:'Draft',value:stats.draft,color:'bg-gray-50'},
              {label:'Confirmed',value:stats.confirmed,color:'bg-blue-50'},
              {label:'In Production',value:stats.inProduction,color:'bg-yellow-50'},
              {label:'Dispatched',value:stats.dispatched,color:'bg-purple-50'},
              {label:'Completed',value:stats.completed,color:'bg-green-50'},
              {label:'Cancelled',value:stats.cancelled,color:'bg-red-50'},
              {label:'Overdue',value:stats.overdue,color:'bg-orange-50'},
              {label:'Order Value',value:fmt(stats.totalValue),color:'bg-indigo-50'},
            ].map(s=>(
              <div key={s.label} className={`${s.color} rounded-lg p-3 text-center`}>
                <div className="text-base font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex gap-3 flex-wrap">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search SO number, customer..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
              <option value="">All Status</option>
              {Object.keys(STATUS_COLORS).map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} SOs</span>
          </div>

          <div className="divide-y">
            {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
            : orders.length===0 ? <div className="text-center py-10 text-gray-400">No sales orders found</div>
            : orders.map(o=>(
              <div key={o.id} className={`p-4 hover:bg-gray-50 ${isOverdue(o)?'border-l-4 border-orange-400':''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-wrap cursor-pointer" onClick={()=>openDetail(o.id)}>
                    <span className="font-mono font-bold text-indigo-600">{o.soNumber}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[o.status]}`}>{o.status.replace(/_/g,' ')}</span>
                    <span className="text-sm font-medium text-gray-800">{o.customerName}</span>
                    {o.cpo && <span className="font-mono text-xs text-teal-600">{o.cpo.cpoNumber}</span>}
                    {isOverdue(o) && <span className="text-xs text-orange-600 font-bold">⚠ OVERDUE</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold text-gray-800">{fmt(o.totalAmount)}</div>
                      <div className="text-xs text-gray-400">Delivery: {fmtDate(o.deliveryDate)}</div>
                    </div>
                    {o.status==='DRAFT' && <button onClick={()=>handleConfirm(o.id)} className="px-2 py-1 text-xs bg-blue-600 text-white rounded">Confirm</button>}
                    {!['COMPLETED','CANCELLED','DISPATCHED'].includes(o.status) && <button onClick={()=>{setCancelModal(o.id);setCancelReason('');}} className="px-2 py-1 text-xs bg-red-500 text-white rounded">Cancel</button>}
                    <button onClick={()=>openDetail(o.id)} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">View</button>
                  </div>
                </div>
                <div className="mt-1 flex gap-4 text-xs text-gray-400">
                  <span>{o.items?.length||0} items</span>
                  {o.items?.some(i=>i.dispatchedQty>0) && <span className="text-purple-600">Partially dispatched</span>}
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
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold">{viewDetail.soNumber}</h2>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[viewDetail.status]}`}>{viewDetail.status.replace(/_/g,' ')}</span>
                  {viewDetail.cpo && <span className="font-mono text-xs text-teal-600">{viewDetail.cpo.cpoNumber} / {viewDetail.cpo.customerPoNumber}</span>}
                </div>
                <button onClick={()=>setViewDetail(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <div className="text-xs text-gray-500 mb-1 font-semibold">CUSTOMER</div>
                    <div className="font-semibold">{viewDetail.customerName}</div>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-gray-500">Delivery Date:</span><span className={isOverdue(viewDetail)?'text-orange-600 font-bold':''}>{fmtDate(viewDetail.deliveryDate)}</span></div>
                    {viewDetail.confirmedDate && <div className="flex justify-between"><span className="text-gray-500">Confirmed:</span><span>{fmtDate(viewDetail.confirmedDate)}</span></div>}
                    {viewDetail.cancelReason && <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-600">Cancelled: {viewDetail.cancelReason}</div>}
                  </div>
                </div>

                <table className="w-full text-sm mb-6">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>{['#','Item','Qty','Unit Price','GST%','Total','Dispatched','Pending'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {viewDetail.items?.map((item,i)=>(
                      <tr key={i}>
                        <td className="px-3 py-2 text-xs text-gray-400">{i+1}</td>
                        <td className="px-3 py-2"><div className="font-mono text-xs text-blue-600">{item.itemCode}</div><div className="text-xs">{item.itemName}</div></td>
                        <td className="px-3 py-2 text-xs">{item.qty} {item.uom}</td>
                        <td className="px-3 py-2 text-xs">{fmt(item.unitPrice)}</td>
                        <td className="px-3 py-2 text-xs">{item.gstRate}%</td>
                        <td className="px-3 py-2 text-xs font-bold">{fmt(item.totalAmount)}</td>
                        <td className="px-3 py-2 text-xs text-purple-600">{item.dispatchedQty}</td>
                        <td className={`px-3 py-2 text-xs font-bold ${item.pendingQty>0?'text-orange-600':'text-green-600'}`}>{item.pendingQty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end">
                  <div className="w-56 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Subtotal:</span><span>{fmt(viewDetail.subtotal)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Total GST:</span><span>{fmt(viewDetail.totalGst)}</span></div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total:</span><span className="text-indigo-700">{fmt(viewDetail.totalAmount)}</span></div>
                  </div>
                </div>
                {viewDetail.remarks && <div className="mt-4 p-3 bg-gray-50 rounded text-xs"><div className="font-semibold mb-1">Remarks:</div>{viewDetail.remarks}</div>}

              <DocumentAttachments referenceType="SALES_ORDER" referenceId={viewDetail?.id} referenceNumber={viewDetail?.soNumber} title="SO Attachments" />
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                {viewDetail.status==='DRAFT' && <button onClick={()=>handleConfirm(viewDetail.id)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Confirm SO</button>}
                {!['COMPLETED','CANCELLED','DISPATCHED'].includes(viewDetail.status) && <button onClick={()=>{setCancelModal(viewDetail.id);setCancelReason('');setViewDetail(null);}} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm">Cancel SO</button>}
                <button onClick={()=>setViewDetail(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
              </div>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-indigo-700">Create Sales Order</h2>
                <button onClick={()=>setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-6">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Customer PO *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.cpoId} onChange={e=>handleCpoSelect(e.target.value)}>
                      <option value="">— Select Acknowledged CPO —</option>
                      {cpos.map(c=><option key={c.id} value={c.id}>{c.cpoNumber} | {c.customerPoNumber} | {c.customerName} | {fmt(c.totalAmount)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Committed Delivery Date *</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.deliveryDate} onChange={e=>setForm(f=>({...f,deliveryDate:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Remarks</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-700">SO Line Items</h3>
                    <button onClick={addItem} className="px-3 py-1 text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 rounded">+ Add Item</button>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500"><tr>{['Item Code','Item Name','Qty','UOM','Unit Price','GST%','Total',''].map(h=><th key={h} className="px-2 py-2 text-left">{h}</th>)}</tr></thead>
                    <tbody>
                      {form.items.map((item,i)=>{
                        const c = calcItem(item);
                        return (
                          <tr key={i} className="border-b">
                            <td className="px-1 py-1"><input className="border rounded px-2 py-1 text-xs w-24 font-mono" value={item.itemCode} onChange={e=>updateItem(i,'itemCode',e.target.value)} /></td>
                            <td className="px-1 py-1"><input className="border rounded px-2 py-1 text-xs w-36" value={item.itemName} onChange={e=>updateItem(i,'itemName',e.target.value)} /></td>
                            <td className="px-1 py-1"><input type="number" className="border rounded px-2 py-1 text-xs w-16" value={item.qty} onChange={e=>updateItem(i,'qty',e.target.value)} /></td>
                            <td className="px-1 py-1"><input className="border rounded px-2 py-1 text-xs w-14" value={item.uom} onChange={e=>updateItem(i,'uom',e.target.value)} /></td>
                            <td className="px-1 py-1"><input type="number" className="border rounded px-2 py-1 text-xs w-24" value={item.unitPrice} onChange={e=>updateItem(i,'unitPrice',e.target.value)} /></td>
                            <td className="px-1 py-1">
                              <select className="border rounded px-1 py-1 text-xs w-16" value={item.gstRate} onChange={e=>updateItem(i,'gstRate',e.target.value)}>
                                {[0,5,12,18,28].map(r=><option key={r} value={r}>{r}%</option>)}
                              </select>
                            </td>
                            <td className="px-2 py-1 text-xs font-bold text-indigo-700">{fmt(c.total)}</td>
                            <td className="px-1 py-1"><button onClick={()=>removeItem(i)} className="text-red-400 hover:text-red-600 text-lg">×</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="flex justify-end mt-3">
                    <div className="text-sm space-y-1 w-48">
                      <div className="flex justify-between text-gray-500"><span>Subtotal:</span><span>{fmt(totals.subtotal)}</span></div>
                      <div className="flex justify-between text-gray-500"><span>GST:</span><span>{fmt(totals.gst)}</span></div>
                      <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span className="text-indigo-700">{fmt(totals.total)}</span></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={()=>setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Creating...':'Create SO'}</button>
              </div>
            </div>
          </div>
        )}

        {cancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold text-red-700">Cancel Sales Order</h2>
                <button onClick={()=>setCancelModal(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6">
                <label className="block text-sm text-gray-600 mb-2">Cancellation Reason *</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={cancelReason} onChange={e=>setCancelReason(e.target.value)} placeholder="Why is this SO being cancelled?" />
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
