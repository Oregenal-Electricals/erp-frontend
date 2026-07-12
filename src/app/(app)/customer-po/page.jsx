'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import DocumentAttachments from '@/components/shared/DocumentAttachments';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';
const fmtDateTime = d => d ? new Date(d).toLocaleString('en-IN') : '—';
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;

const STATUS_COLORS = { RECEIVED:'bg-gray-100 text-gray-600', ACKNOWLEDGED:'bg-blue-100 text-blue-700', IN_PROGRESS:'bg-yellow-100 text-yellow-700', COMPLETED:'bg-green-100 text-green-700', CANCELLED:'bg-red-100 text-red-600' };
const PO_TYPE_COLORS = { WRITTEN:'bg-indigo-100 text-indigo-700', VERBAL:'bg-purple-100 text-purple-700' };

const BLANK_ITEM = { itemCode:'', itemName:'', description:'', qty:1, uom:'PCS', unitPrice:'', discount:0, gstRate:18 };
const BLANK_FORM = { poType:'WRITTEN', customerPoNumber:'', verbalConfirmedBy:'', verbalConfirmedDate:'', quotationId:'', customerName:'', customerEmail:'', customerPhone:'', deliveryAddress:'', poDate:'', deliveryDate:'', currency:'INR', remarks:'', items:[{...BLANK_ITEM}] };

function calcItem(item) {
  const qty = parseFloat(item.qty)||0;
  const unit = parseFloat(item.unitPrice)||0;
  const disc = parseFloat(item.discount)||0;
  const gst = parseFloat(item.gstRate)||0;
  const gross = qty * unit;
  const discAmt = Math.round(gross * disc / 100 * 100) / 100;
  const taxable = Math.round((gross - discAmt) * 100) / 100;
  const gstAmt = Math.round(taxable * gst / 100 * 100) / 100;
  return { taxable, gstAmt, total: Math.round((taxable + gstAmt) * 100) / 100 };
}

export default function CustomerPoPage() {
  const [cpos, setCpos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [poType, setPoType] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewDetail, setViewDetail] = useState(null);
  const [shortages, setShortages] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [increaseModal, setIncreaseModal] = useState(null);
  const [increaseForm, setIncreaseForm] = useState(null);
  const [increaseSaving, setIncreaseSaving] = useState(false);
  const [increaseError, setIncreaseError] = useState('');
  const [form, setForm] = useState({...BLANK_FORM});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (poType) params.set('poType', poType);
    const [cRes, sRes] = await Promise.all([
      fetch(`${API}/customer-po?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/customer-po/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (cRes.ok) { const d = await cRes.json(); setCpos(d.data); setTotal(d.total); setTotalPages(d.totalPages); }
    if (sRes.ok) setStats(await sRes.json());
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, [page, search, status, poType]);

  function addItem() { setForm(f => ({ ...f, items: [...f.items, {...BLANK_ITEM}] })); }
  function removeItem(i) { setForm(f => ({ ...f, items: f.items.filter((_,idx) => idx !== i) })); }
  function updateItem(i, key, val) { setForm(f => { const items = [...f.items]; items[i] = { ...items[i], [key]: val }; return { ...f, items }; }); }

  const totals = form.items.reduce((acc, item) => {
    const c = calcItem(item);
    return { subtotal: acc.subtotal + (parseFloat(item.qty)||0)*(parseFloat(item.unitPrice)||0), gst: acc.gst + c.gstAmt, total: acc.total + c.total };
  }, { subtotal: 0, gst: 0, total: 0 });

  async function handleSave() {
    setSaving(true); setError('');
    const body = {
      poType: form.poType,
      customerName: form.customerName,
      customerEmail: form.customerEmail || undefined,
      customerPhone: form.customerPhone || undefined,
      deliveryAddress: form.deliveryAddress || undefined,
      poDate: new Date(form.poDate).toISOString(),
      deliveryDate: new Date(form.deliveryDate).toISOString(),
      currency: form.currency || 'INR',
      remarks: form.remarks || undefined,
      quotationId: form.quotationId || undefined,
      items: form.items.map(i => ({ ...i, qty: parseFloat(i.qty)||1, unitPrice: parseFloat(i.unitPrice)||0, discount: parseFloat(i.discount)||0, gstRate: parseFloat(i.gstRate)||18 })),
    };
    if (form.poType === 'WRITTEN') {
      body.customerPoNumber = form.customerPoNumber;
    } else {
      body.verbalConfirmedBy = form.verbalConfirmedBy;
      body.verbalConfirmedDate = form.verbalConfirmedDate ? new Date(form.verbalConfirmedDate).toISOString() : new Date().toISOString();
    }
    const url = editingId ? `${API}/customer-po/${editingId}` : `${API}/customer-po`;
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      setShowModal(false); setEditingId(null); fetchAll();
      if (viewDetail && editingId === viewDetail.id) openDetail(viewDetail.id);
    }
    else setError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    setSaving(false);
  }

  function openIncrease(cpo) {
    setIncreaseModal(cpo);
    setIncreaseForm({
      poType: 'VERBAL',
      customerPoNumber: '',
      verbalConfirmedBy: '',
      verbalConfirmedDate: '',
      deliveryDate: '',
      remarks: '',
      items: cpo.items.map(i => ({ itemCode: i.itemCode, itemName: i.itemName, description: '', qty: '', uom: i.uom, unitPrice: i.unitPrice, discount: 0, gstRate: i.gstRate })),
    });
    setIncreaseError('');
  }

  function updateIncreaseItem(i, key, val) {
    setIncreaseForm(f => { const items = [...f.items]; items[i] = { ...items[i], [key]: val }; return { ...f, items }; });
  }

  async function handleIncreaseSave() {
    setIncreaseSaving(true); setIncreaseError('');
    const itemsToSend = increaseForm.items.filter(i => parseFloat(i.qty) > 0);
    if (itemsToSend.length === 0) {
      setIncreaseError('Enter an additional quantity for at least one item.');
      setIncreaseSaving(false);
      return;
    }
    const body = {
      poType: increaseForm.poType,
      deliveryDate: new Date(increaseForm.deliveryDate).toISOString(),
      remarks: increaseForm.remarks || undefined,
      items: itemsToSend.map(i => ({ ...i, qty: parseFloat(i.qty)||1, unitPrice: parseFloat(i.unitPrice)||0, discount: parseFloat(i.discount)||0, gstRate: parseFloat(i.gstRate)||18 })),
    };
    if (increaseForm.poType === 'WRITTEN') body.customerPoNumber = increaseForm.customerPoNumber;
    else {
      body.verbalConfirmedBy = increaseForm.verbalConfirmedBy;
      body.verbalConfirmedDate = increaseForm.verbalConfirmedDate ? new Date(increaseForm.verbalConfirmedDate).toISOString() : new Date().toISOString();
    }
    const res = await fetch(`${API}/customer-po/${increaseModal.id}/increase-quantity`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      setIncreaseModal(null);
      fetchAll();
      openDetail(increaseModal.id);
      alert(`New PO ${data.cpoNumber} created for the increased quantity.`);
    } else {
      setIncreaseError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    }
    setIncreaseSaving(false);
  }

  function openEdit(cpo) {
    setForm({
      poType: cpo.poType,
      customerPoNumber: cpo.poType === 'WRITTEN' ? cpo.customerPoNumber : '',
      verbalConfirmedBy: cpo.verbalConfirmedBy || '',
      verbalConfirmedDate: cpo.verbalConfirmedDate ? cpo.verbalConfirmedDate.split('T')[0] : '',
      quotationId: cpo.quotationId || '',
      customerName: cpo.customerName,
      customerEmail: cpo.customerEmail || '',
      customerPhone: cpo.customerPhone || '',
      deliveryAddress: cpo.deliveryAddress || '',
      poDate: cpo.poDate.split('T')[0],
      deliveryDate: cpo.deliveryDate.split('T')[0],
      currency: cpo.currency || 'INR',
      remarks: cpo.remarks || '',
      items: cpo.items.map(i => ({ itemCode: i.itemCode, itemName: i.itemName, description: i.description || '', qty: i.qty, uom: i.uom, unitPrice: i.unitPrice, discount: i.discount, gstRate: i.gstRate })),
    });
    setEditingId(cpo.id);
    setError('');
    setShowModal(true);
  }

  async function handleAction(id, action, body={}) {
    const res = await fetch(`${API}/customer-po/${id}/${action}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      fetchAll();
      if (viewDetail?.id === id) {
        const d = await fetch(`${API}/customer-po/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
        if (d.ok) setViewDetail(await d.json());
      }
    } else { const d = await res.json(); alert(d.message); }
  }

  async function openDetail(id) {
    const res = await fetch(`${API}/customer-po/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setViewDetail(await res.json());
    const sRes = await fetch(`${API}/customer-po/${id}/shortages`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (sRes.ok) setShortages(await sRes.json());
    else setShortages(null);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer PO</h1>
            <p className="text-gray-500 text-sm mt-1">Log written or verbal customer purchase orders and check material availability</p>
          </div>
          <button onClick={()=>{ setForm({...BLANK_FORM}); setEditingId(null); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New Customer PO</button>
        </div>

        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-8 gap-3 mb-6">
            {[
              {label:'Total',value:stats.total,color:'bg-gray-50'},
              {label:'Received',value:stats.received,color:'bg-gray-50'},
              {label:'Acknowledged',value:stats.acknowledged,color:'bg-blue-50'},
              {label:'In Progress',value:stats.inProgress,color:'bg-yellow-50'},
              {label:'Completed',value:stats.completed,color:'bg-green-50'},
              {label:'Written',value:stats.written,color:'bg-indigo-50'},
              {label:'Verbal',value:stats.verbal,color:'bg-purple-50'},
              {label:'Order Value',value:fmt(stats.totalOrderValue),color:'bg-teal-50'},
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
            <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search PO number, customer..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={poType} onChange={e=>{setPoType(e.target.value);setPage(1);}}>
              <option value="">All Types</option>
              <option value="WRITTEN">Written</option>
              <option value="VERBAL">Verbal</option>
            </select>
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
              <option value="">All Status</option>
              {Object.keys(STATUS_COLORS).map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} orders</span>
          </div>

          <div className="divide-y">
            {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
            : cpos.length===0 ? <div className="text-center py-10 text-gray-400">No customer POs found</div>
            : cpos.map(c=>(
              <div key={c.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-wrap cursor-pointer" onClick={()=>openDetail(c.id)}>
                    <span className="font-mono font-bold text-blue-600">{c.cpoNumber}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${PO_TYPE_COLORS[c.poType]}`}>{c.poType}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                    <span className="text-sm font-medium text-gray-800">{c.customerName}</span>
                    <span className="text-xs text-gray-400">Delivery: {fmtDate(c.deliveryDate)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-800">{fmt(c.totalAmount)}</span>
                    <span className="text-xs text-gray-400">{c.items?.length||0} items</span>
                    {c.status==='RECEIVED' && <button onClick={()=>handleAction(c.id,'acknowledge')} className="px-2 py-1 text-xs bg-blue-600 text-white rounded">Acknowledge</button>}
                    <button onClick={()=>openDetail(c.id)} className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 bg-white rounded hover:bg-gray-100">View</button>
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

        {/* DETAIL MODAL */}
        {viewDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <div>
                  <h2 className="text-lg font-bold">{viewDetail.cpoNumber}</h2>
                  <div className="flex gap-2 mt-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${PO_TYPE_COLORS[viewDetail.poType]}`}>{viewDetail.poType}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[viewDetail.status]}`}>{viewDetail.status}</span>
                  </div>
                </div>
                <button onClick={()=>{setViewDetail(null);setShortages(null);}} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <div className="text-xs text-gray-500 mb-1 font-semibold">CUSTOMER</div>
                    <div className="font-semibold">{viewDetail.customerName}</div>
                    {viewDetail.customerEmail && <div className="text-sm text-gray-500">{viewDetail.customerEmail}</div>}
                    {viewDetail.customerPhone && <div className="text-sm text-gray-500">{viewDetail.customerPhone}</div>}
                    {viewDetail.deliveryAddress && <div className="text-xs text-gray-400 mt-1">{viewDetail.deliveryAddress}</div>}
                  </div>
                  <div className="text-sm space-y-1">
                    {viewDetail.poType === 'WRITTEN' ? (
                      <div className="flex justify-between"><span className="text-gray-500">Customer PO No:</span><span className="font-mono font-medium">{viewDetail.customerPoNumber}</span></div>
                    ) : (
                      <>
                        <div className="flex justify-between"><span className="text-gray-500">Confirmed By:</span><span className="font-medium">{viewDetail.verbalConfirmedBy}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Confirmed Date:</span><span>{fmtDate(viewDetail.verbalConfirmedDate)}</span></div>
                      </>
                    )}
                    <div className="flex justify-between"><span className="text-gray-500">PO Date:</span><span>{fmtDate(viewDetail.poDate)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Delivery Date:</span><span className="font-medium">{fmtDate(viewDetail.deliveryDate)}</span></div>
                    {viewDetail.mrpRunAt && <div className="flex justify-between"><span className="text-gray-500">Shortage Check Run:</span><span>{fmtDateTime(viewDetail.mrpRunAt)}</span></div>}
                    {viewDetail.acknowledgedDate && <div className="flex justify-between"><span className="text-gray-500">Acknowledged:</span><span className="text-blue-600">{fmtDate(viewDetail.acknowledgedDate)}</span></div>}
                    {viewDetail.cancelReason && <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-600">Cancelled: {viewDetail.cancelReason}</div>}
                  </div>
                </div>

                <table className="w-full text-sm mb-6">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>{['#','Item','Qty','Unit Price','Disc%','GST%','Total'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {viewDetail.items?.map((item,i)=>(
                      <tr key={i}>
                        <td className="px-3 py-2 text-xs text-gray-400">{i+1}</td>
                        <td className="px-3 py-2"><div className="font-mono text-xs text-blue-600">{item.itemCode}</div><div className="text-xs">{item.itemName}</div></td>
                        <td className="px-3 py-2 text-xs">{item.qty} {item.uom}</td>
                        <td className="px-3 py-2 text-xs">{fmt(item.unitPrice)}</td>
                        <td className="px-3 py-2 text-xs">{item.discount}%</td>
                        <td className="px-3 py-2 text-xs">{item.gstRate}%</td>
                        <td className="px-3 py-2 text-xs font-bold">{fmt(item.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end mb-6">
                  <div className="w-64 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Subtotal:</span><span>{fmt(viewDetail.subtotal)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Total GST:</span><span>{fmt(viewDetail.totalGst)}</span></div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total:</span><span className="text-blue-700">{fmt(viewDetail.totalAmount)}</span></div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-semibold text-gray-700 mb-3">Material Shortage Check <span className="text-xs font-normal text-gray-400">(runs automatically when the PO is created)</span></h3>

                  {shortages?.itemResults ? (
                    <div className="space-y-2">
                      {shortages.itemResults.map((item, i) => {
                        const style = {
                          CHECKED: 'bg-white border-gray-200',
                          CHECKED_DIRECT_STOCK: 'bg-white border-gray-200',
                          BOM_MISSING: 'bg-orange-50 border-orange-200',
                          NO_PRODUCT_MASTER: 'bg-red-50 border-red-200',
                        }[item.status] || 'bg-white border-gray-200';
                        return (
                          <div key={i} className={`rounded p-3 text-sm border ${style}`}>
                            <div className="flex justify-between font-medium text-gray-800">
                              <span>{item.itemCode} — {item.itemName}</span>
                              <span className="text-xs uppercase text-gray-500">{item.status.replace(/_/g,' ')}</span>
                            </div>
                            {item.message && <div className="text-xs text-gray-600 mt-1">{item.message}</div>}
                            {item.components && item.components.map((c,ci) => (
                              <div key={ci} className={`flex justify-between text-xs mt-1 pl-3 ${c.status==='SHORTAGE' ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                                <span>{c.itemCode} ({c.itemName})</span>
                                <span>need {c.netRequired} {c.uom} / have {c.availableQty} {c.uom} {c.shortage > 0 && `→ short ${c.shortage}`}</span>
                              </div>
                            ))}
                            {item.status === 'CHECKED_DIRECT_STOCK' && (
                              <div className={`text-xs mt-1 ${item.shortage > 0 ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                                need {item.requiredQty} / have {item.availableQty} {item.shortage > 0 && `→ short ${item.shortage}`}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div className="text-xs text-gray-500 mt-2">
                        {shortages.openCount > 0
                          ? `${shortages.openCount} shortage(s) flagged for Purchase.`
                          : shortages.itemResults.every(i => i.status === 'CHECKED' || i.status === 'CHECKED_DIRECT_STOCK')
                            ? 'No shortages — all materials available in stock.'
                            : 'Some items could not be checked — see status above.'}
                        {' '}Checked {fmtDateTime(shortages.mrpRunAt)}.
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">Shortage check has not run yet for this PO.</div>
                  )}
                </div>

                {viewDetail.remarks && <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-gray-600"><div className="font-semibold mb-1">Remarks:</div>{viewDetail.remarks}</div>}

                {viewDetail.amendmentOf && (
                  <div className="mt-4 p-3 bg-purple-50 rounded text-xs text-purple-700">
                    This is an increase-quantity order against <span className="font-mono font-semibold">{viewDetail.amendmentOf.cpoNumber}</span> ({viewDetail.amendmentOf.customerPoNumber})
                  </div>
                )}

                {viewDetail.amendmentChildren && viewDetail.amendmentChildren.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-gray-600 mb-2">Linked Increase Orders</div>
                    <div className="space-y-1">
                      {viewDetail.amendmentChildren.map(child => (
                        <div key={child.id} className="flex justify-between items-center bg-purple-50 rounded p-2 text-xs cursor-pointer hover:bg-purple-100" onClick={()=>openDetail(child.id)}>
                          <span className="font-mono font-medium text-purple-700">{child.cpoNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[child.status]}`}>{child.status}</span>
                          <span className="font-semibold">{fmt(child.totalAmount)}</span>
                          <span className="text-gray-400">{fmtDate(child.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <DocumentAttachments referenceType="CUSTOMER_PO" referenceId={viewDetail?.id} referenceNumber={viewDetail?.cpoNumber} title="Customer PO Attachments" />
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                {viewDetail.status==='RECEIVED' && <button onClick={()=>openEdit(viewDetail)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Edit</button>}
                {!['RECEIVED','CANCELLED'].includes(viewDetail.status) && <button onClick={()=>openIncrease(viewDetail)} className="px-4 py-2 border border-purple-300 text-purple-700 rounded-lg text-sm hover:bg-purple-50">+ Increase Quantity</button>}
                {viewDetail.status==='RECEIVED' && <button onClick={()=>handleAction(viewDetail.id,'acknowledge')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Acknowledge</button>}
                {!['COMPLETED','CANCELLED'].includes(viewDetail.status) && <button onClick={()=>{setCancelModal(viewDetail.id);setCancelReason('');}} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm">Cancel PO</button>}
                <button onClick={()=>{setViewDetail(null);setShortages(null);}} className="px-4 py-2 border rounded-lg text-sm">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* CREATE MODAL */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-blue-700">{editingId ? 'Edit Customer PO' : 'New Customer PO'}</h2>
                <button onClick={()=>{setShowModal(false);setEditingId(null);}} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-6">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}

                <div>
                  <label className="block text-sm text-gray-600 mb-2">PO Type *</label>
                  <div className="flex gap-3">
                    <button type="button" onClick={()=>setForm(f=>({...f,poType:'WRITTEN'}))} className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium ${form.poType==='WRITTEN' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500'}`}>
                      📄 Written PO<div className="text-xs font-normal mt-1">Customer sent a real PO document/number</div>
                    </button>
                    <button type="button" onClick={()=>setForm(f=>({...f,poType:'VERBAL'}))} className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium ${form.poType==='VERBAL' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500'}`}>
                      📞 Verbal PO<div className="text-xs font-normal mt-1">Confirmed by phone, no document yet</div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {form.poType === 'WRITTEN' ? (
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-600 mb-1">Customer PO Number *</label>
                      <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.customerPoNumber} onChange={e=>setForm(f=>({...f,customerPoNumber:e.target.value}))} placeholder="e.g. PO-2026-4521" />
                    </div>
                  ) : (
                    <>
                      <div><label className="block text-sm text-gray-600 mb-1">Confirmed By *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.verbalConfirmedBy} onChange={e=>setForm(f=>({...f,verbalConfirmedBy:e.target.value}))} placeholder="e.g. Rahul - phone call" /></div>
                      <div><label className="block text-sm text-gray-600 mb-1">Confirmed Date</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.verbalConfirmedDate} onChange={e=>setForm(f=>({...f,verbalConfirmedDate:e.target.value}))} /></div>
                    </>
                  )}
                  <div><label className="block text-sm text-gray-600 mb-1">Customer Name *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.customerName} onChange={e=>setForm(f=>({...f,customerName:e.target.value}))} /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">Customer Email</label><input type="email" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.customerEmail} onChange={e=>setForm(f=>({...f,customerEmail:e.target.value}))} /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">Phone</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.customerPhone} onChange={e=>setForm(f=>({...f,customerPhone:e.target.value}))} /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">PO Date *</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.poDate} onChange={e=>setForm(f=>({...f,poDate:e.target.value}))} /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">Delivery Date *</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.deliveryDate} onChange={e=>setForm(f=>({...f,deliveryDate:e.target.value}))} /></div>
                  <div className="col-span-2"><label className="block text-sm text-gray-600 mb-1">Delivery Address</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.deliveryAddress} onChange={e=>setForm(f=>({...f,deliveryAddress:e.target.value}))} /></div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-700">Line Items</h3>
                    <button onClick={addItem} className="px-3 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100">+ Add Item</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500"><tr>{['Item Code','Item Name','Qty','UOM','Unit Price','Disc%','GST%','Total',''].map(h=><th key={h} className="px-2 py-2 text-left">{h}</th>)}</tr></thead>
                      <tbody>
                        {form.items.map((item,i)=>{
                          const c = calcItem(item);
                          return (
                            <tr key={i} className="border-b">
                              <td className="px-1 py-1"><input className="border rounded px-2 py-1 text-xs w-24 font-mono" value={item.itemCode} onChange={e=>updateItem(i,'itemCode',e.target.value)} placeholder="FG-001" /></td>
                              <td className="px-1 py-1"><input className="border rounded px-2 py-1 text-xs w-36" value={item.itemName} onChange={e=>updateItem(i,'itemName',e.target.value)} placeholder="Item name" /></td>
                              <td className="px-1 py-1"><input type="number" className="border rounded px-2 py-1 text-xs w-16" value={item.qty} onChange={e=>updateItem(i,'qty',e.target.value)} /></td>
                              <td className="px-1 py-1"><input className="border rounded px-2 py-1 text-xs w-16" value={item.uom} onChange={e=>updateItem(i,'uom',e.target.value)} /></td>
                              <td className="px-1 py-1"><input type="number" className="border rounded px-2 py-1 text-xs w-24" value={item.unitPrice} onChange={e=>updateItem(i,'unitPrice',e.target.value)} placeholder="0.00" /></td>
                              <td className="px-1 py-1"><input type="number" className="border rounded px-2 py-1 text-xs w-16" value={item.discount} onChange={e=>updateItem(i,'discount',e.target.value)} /></td>
                              <td className="px-1 py-1">
                                <select className="border rounded px-1 py-1 text-xs w-16" value={item.gstRate} onChange={e=>updateItem(i,'gstRate',e.target.value)}>
                                  {[0,5,12,18,28].map(r=><option key={r} value={r}>{r}%</option>)}
                                </select>
                              </td>
                              <td className="px-2 py-1 text-xs font-bold text-blue-700">{fmt(c.total)}</td>
                              <td className="px-1 py-1"><button onClick={()=>removeItem(i)} className="text-red-400 hover:text-red-600 text-lg">×</button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end mt-3">
                    <div className="text-sm space-y-1 w-48">
                      <div className="flex justify-between text-gray-500"><span>Subtotal:</span><span>{fmt(totals.subtotal)}</span></div>
                      <div className="flex justify-between text-gray-500"><span>GST:</span><span>{fmt(totals.gst)}</span></div>
                      <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span className="text-blue-700">{fmt(totals.total)}</span></div>
                    </div>
                  </div>
                </div>

                <div><label className="block text-sm text-gray-600 mb-1">Remarks</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))} /></div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={()=>{setShowModal(false);setEditingId(null);}} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Saving...':editingId?'Save Changes':'Create Customer PO'}</button>
              </div>
            </div>
          </div>
        )}

        {/* CANCEL MODAL */}
        {cancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold text-red-700">Cancel Customer PO</h2>
                <button onClick={()=>setCancelModal(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6">
                <label className="block text-sm text-gray-600 mb-2">Cancellation Reason *</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={cancelReason} onChange={e=>setCancelReason(e.target.value)} placeholder="Why is this PO being cancelled?" />
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={()=>setCancelModal(null)} className="px-4 py-2 border rounded-lg text-sm">Back</button>
                <button onClick={async()=>{ await handleAction(cancelModal,'cancel',{cancelReason}); setCancelModal(null); }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Confirm Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* INCREASE QUANTITY MODAL */}
        {increaseModal && increaseForm && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <div>
                  <h2 className="text-lg font-bold text-purple-700">Increase Quantity</h2>
                  <p className="text-xs text-gray-500 mt-1">Creates a new PO for the extra quantity, linked to <span className="font-mono">{increaseModal.cpoNumber}</span>. The original stays unchanged.</p>
                </div>
                <button onClick={()=>setIncreaseModal(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-6">
                {increaseError && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{increaseError}</div>}

                <div>
                  <label className="block text-sm text-gray-600 mb-2">How was this increase communicated? *</label>
                  <div className="flex gap-3">
                    <button type="button" onClick={()=>setIncreaseForm(f=>({...f,poType:'WRITTEN'}))} className={`flex-1 px-4 py-2 rounded-lg border-2 text-sm font-medium ${increaseForm.poType==='WRITTEN' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500'}`}>📄 Written</button>
                    <button type="button" onClick={()=>setIncreaseForm(f=>({...f,poType:'VERBAL'}))} className={`flex-1 px-4 py-2 rounded-lg border-2 text-sm font-medium ${increaseForm.poType==='VERBAL' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500'}`}>📞 Verbal</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {increaseForm.poType === 'WRITTEN' ? (
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-600 mb-1">Customer PO Number *</label>
                      <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={increaseForm.customerPoNumber} onChange={e=>setIncreaseForm(f=>({...f,customerPoNumber:e.target.value}))} placeholder="e.g. PO-2026-4521-A" />
                    </div>
                  ) : (
                    <div className="col-span-2 grid grid-cols-2 gap-4">
                      <div><label className="block text-sm text-gray-600 mb-1">Confirmed By *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={increaseForm.verbalConfirmedBy} onChange={e=>setIncreaseForm(f=>({...f,verbalConfirmedBy:e.target.value}))} placeholder="e.g. Rahul - phone call" /></div>
                      <div><label className="block text-sm text-gray-600 mb-1">Confirmed Date</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={increaseForm.verbalConfirmedDate} onChange={e=>setIncreaseForm(f=>({...f,verbalConfirmedDate:e.target.value}))} /></div>
                    </div>
                  )}
                  <div className="col-span-2"><label className="block text-sm text-gray-600 mb-1">Delivery Date for Extra Quantity *</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={increaseForm.deliveryDate} onChange={e=>setIncreaseForm(f=>({...f,deliveryDate:e.target.value}))} /></div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Enter Additional Quantity Per Item</h3>
                  <p className="text-xs text-gray-400 mb-3">Leave qty blank/0 for items you don't want to increase.</p>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500"><tr>{['Item','Additional Qty','Unit Price','Total'].map(h=><th key={h} className="px-2 py-2 text-left">{h}</th>)}</tr></thead>
                    <tbody>
                      {increaseForm.items.map((item,i)=>{
                        const c = calcItem(item);
                        return (
                          <tr key={i} className="border-b">
                            <td className="px-2 py-2"><div className="font-mono text-xs text-blue-600">{item.itemCode}</div><div className="text-xs">{item.itemName}</div></td>
                            <td className="px-2 py-1"><input type="number" className="border rounded px-2 py-1 text-xs w-24" value={item.qty} onChange={e=>updateIncreaseItem(i,'qty',e.target.value)} placeholder="0" /></td>
                            <td className="px-2 py-1"><input type="number" className="border rounded px-2 py-1 text-xs w-24" value={item.unitPrice} onChange={e=>updateIncreaseItem(i,'unitPrice',e.target.value)} /></td>
                            <td className="px-2 py-1 text-xs font-bold text-purple-700">{fmt(c.total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div><label className="block text-sm text-gray-600 mb-1">Note (optional)</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={increaseForm.remarks} onChange={e=>setIncreaseForm(f=>({...f,remarks:e.target.value}))} placeholder="Any additional context for this increase..." /></div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={()=>setIncreaseModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleIncreaseSave} disabled={increaseSaving} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm disabled:opacity-50">{increaseSaving?'Creating...':'Create Increase Order'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
