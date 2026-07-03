'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import DocumentAttachments from '@/components/shared/DocumentAttachments';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;

const STATUS_COLORS = { DRAFT:'bg-gray-100 text-gray-600', SENT:'bg-blue-100 text-blue-700', ACCEPTED:'bg-green-100 text-green-700', REJECTED:'bg-red-100 text-red-600', EXPIRED:'bg-orange-100 text-orange-600' };

const BLANK_ITEM = { itemCode:'', itemName:'', description:'', qty:1, uom:'PCS', unitPrice:'', discount:0, gstRate:18 };

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

export default function QuotationsPage() {
  const [quotes, setQuotes] = useState([]);
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [viewDetail, setViewDetail] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [form, setForm] = useState({ leadId:'', customerName:'', customerEmail:'', customerPhone:'', customerAddress:'', validUntil:'', termsConditions:'', notes:'', items:[{...BLANK_ITEM}] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const [qRes, sRes, lRes] = await Promise.all([
      fetch(`${API}/quotations?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/quotations/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/leads?status=QUALIFIED&limit=50`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (qRes.ok) { const d = await qRes.json(); setQuotes(d.data); setTotal(d.total); setTotalPages(d.totalPages); }
    if (sRes.ok) setStats(await sRes.json());
    if (lRes.ok) { const d = await lRes.json(); setLeads(d.data||[]); }
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, [page, search, status]);

  function handleLeadSelect(leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (lead) setForm(f => ({ ...f, leadId, customerName: lead.companyName, customerPhone: lead.phone||f.customerPhone, customerEmail: lead.email||f.customerEmail }));
    else setForm(f => ({ ...f, leadId }));
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
      validUntil: new Date(form.validUntil).toISOString(),
      items: form.items.map(i => ({ ...i, qty: parseFloat(i.qty)||1, unitPrice: parseFloat(i.unitPrice)||0, discount: parseFloat(i.discount)||0, gstRate: parseFloat(i.gstRate)||18 })),
    };
    if (!body.leadId) delete body.leadId;
    ['customerEmail','customerPhone','customerAddress','termsConditions','notes'].forEach(k => { if (!body[k]) delete body[k]; });
    const res = await fetch(`${API}/quotations`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    setSaving(false);
  }

  async function handleAction(id, action, body={}) {
    const res = await fetch(`${API}/quotations/${id}/${action}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    if (res.ok) { fetchAll(); if (viewDetail?.id === id) { const d = await fetch(`${API}/quotations/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } }); if (d.ok) setViewDetail(await d.json()); } }
    else { const d = await res.json(); alert(d.message); }
  }

  async function openDetail(id) {
    const res = await fetch(`${API}/quotations/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setViewDetail(await res.json());
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
            <p className="text-gray-500 text-sm mt-1">Create and manage customer quotations with GST calculations</p>
          </div>
          <button onClick={()=>{ setForm({leadId:'',customerName:'',customerEmail:'',customerPhone:'',customerAddress:'',validUntil:'',termsConditions:'',notes:'',items:[{...BLANK_ITEM}]}); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New Quotation</button>
        </div>

        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-7 gap-3 mb-6">
            {[
              {label:'Total',value:stats.total,color:'bg-gray-50'},
              {label:'Draft',value:stats.draft,color:'bg-gray-50'},
              {label:'Sent',value:stats.sent,color:'bg-blue-50'},
              {label:'Accepted',value:stats.accepted,color:'bg-green-50'},
              {label:'Rejected',value:stats.rejected,color:'bg-red-50'},
              {label:'Expired',value:stats.expired,color:'bg-orange-50'},
              {label:'Pending Value',value:fmt(stats.pendingValue),color:'bg-teal-50'},
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
            <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search quotation number, customer..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
              <option value="">All Status</option>
              {Object.keys(STATUS_COLORS).map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} quotations</span>
          </div>

          <div className="divide-y">
            {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
            : quotes.length===0 ? <div className="text-center py-10 text-gray-400">No quotations found</div>
            : quotes.map(q=>(
              <div key={q.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-wrap cursor-pointer" onClick={()=>openDetail(q.id)}>
                    <span className="font-mono font-bold text-blue-600">{q.quotationNumber}</span>
                    {q.revision > 0 && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Rev {q.revision}</span>}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[q.status]}`}>{q.status}</span>
                    <span className="text-sm font-medium text-gray-800">{q.customerName}</span>
                    <span className="text-xs text-gray-400">Valid: {fmtDate(q.validUntil)}</span>
                    {q.lead && <span className="font-mono text-xs text-green-600">{q.lead.leadNumber}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-800">{fmt(q.totalAmount)}</span>
                    <span className="text-xs text-gray-400">{q.items?.length||0} items</span>
                    {q.status==='DRAFT' && <button onClick={()=>handleAction(q.id,'send')} className="px-2 py-1 text-xs bg-blue-600 text-white rounded">Send</button>}
                    {q.status==='SENT' && <>
                      <button onClick={()=>handleAction(q.id,'accept')} className="px-2 py-1 text-xs bg-green-600 text-white rounded">Accept</button>
                      <button onClick={()=>{setRejectModal(q.id);setRejectReason('');}} className="px-2 py-1 text-xs bg-red-500 text-white rounded">Reject</button>
                    </>}
                    <button onClick={()=>openDetail(q.id)} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">View</button>
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
                  <h2 className="text-lg font-bold">{viewDetail.quotationNumber} {viewDetail.revision>0?`(Rev ${viewDetail.revision})`:''}</h2>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[viewDetail.status]}`}>{viewDetail.status}</span>
                </div>
                <button onClick={()=>setViewDetail(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <div className="text-xs text-gray-500 mb-1 font-semibold">CUSTOMER</div>
                    <div className="font-semibold">{viewDetail.customerName}</div>
                    {viewDetail.customerEmail && <div className="text-sm text-gray-500">{viewDetail.customerEmail}</div>}
                    {viewDetail.customerPhone && <div className="text-sm text-gray-500">{viewDetail.customerPhone}</div>}
                    {viewDetail.customerAddress && <div className="text-xs text-gray-400 mt-1">{viewDetail.customerAddress}</div>}
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-gray-500">Valid Until:</span><span className="font-medium">{fmtDate(viewDetail.validUntil)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Currency:</span><span>{viewDetail.currency}</span></div>
                    {viewDetail.sentDate && <div className="flex justify-between"><span className="text-gray-500">Sent:</span><span>{fmtDate(viewDetail.sentDate)}</span></div>}
                    {viewDetail.acceptedDate && <div className="flex justify-between"><span className="text-gray-500">Accepted:</span><span className="text-green-600">{fmtDate(viewDetail.acceptedDate)}</span></div>}
                    {viewDetail.rejectedReason && <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-600">Rejected: {viewDetail.rejectedReason}</div>}
                  </div>
                </div>

                <table className="w-full text-sm mb-6">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>{['#','Item','Qty','Unit Price','Disc%','Taxable','GST%','GST Amt','Total'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {viewDetail.items?.map((item,i)=>(
                      <tr key={i}>
                        <td className="px-3 py-2 text-xs text-gray-400">{i+1}</td>
                        <td className="px-3 py-2"><div className="font-mono text-xs text-blue-600">{item.itemCode}</div><div className="text-xs">{item.itemName}</div>{item.description&&<div className="text-xs text-gray-400">{item.description}</div>}</td>
                        <td className="px-3 py-2 text-xs">{item.qty} {item.uom}</td>
                        <td className="px-3 py-2 text-xs">{fmt(item.unitPrice)}</td>
                        <td className="px-3 py-2 text-xs">{item.discount}%</td>
                        <td className="px-3 py-2 text-xs">{fmt(item.taxableAmt)}</td>
                        <td className="px-3 py-2 text-xs">{item.gstRate}%</td>
                        <td className="px-3 py-2 text-xs">{fmt(item.gstAmount)}</td>
                        <td className="px-3 py-2 text-xs font-bold">{fmt(item.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end">
                  <div className="w-64 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Subtotal:</span><span>{fmt(viewDetail.subtotal)}</span></div>
                    {viewDetail.discountAmount > 0 && <div className="flex justify-between text-red-500"><span>Discount:</span><span>-{fmt(viewDetail.discountAmount)}</span></div>}
                    <div className="flex justify-between"><span className="text-gray-500">Taxable Amount:</span><span>{fmt(viewDetail.taxableAmount)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Total GST:</span><span>{fmt(viewDetail.totalGst)}</span></div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total:</span><span className="text-blue-700">{fmt(viewDetail.totalAmount)}</span></div>
                  </div>
                </div>

                {viewDetail.termsConditions && <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600"><div className="font-semibold mb-1">Terms & Conditions:</div>{viewDetail.termsConditions}</div>}
                {viewDetail.notes && <div className="mt-2 p-3 bg-blue-50 rounded text-xs text-gray-600"><div className="font-semibold mb-1">Notes:</div>{viewDetail.notes}</div>}

              <DocumentAttachments referenceType="QUOTATION" referenceId={viewDetail?.id} referenceNumber={viewDetail?.quotationNumber} title="Quotation Attachments" />
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                {viewDetail.status==='DRAFT' && <button onClick={()=>handleAction(viewDetail.id,'send')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Send to Customer</button>}
                {viewDetail.status==='SENT' && <>
                  <button onClick={()=>handleAction(viewDetail.id,'accept')} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Accept</button>
                  <button onClick={()=>{setRejectModal(viewDetail.id);setRejectReason('');}} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm">Reject</button>
                </>}
                <button onClick={()=>setViewDetail(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* CREATE MODAL */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-blue-700">New Quotation</h2>
                <button onClick={()=>setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-6">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Link Lead (optional)</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.leadId} onChange={e=>handleLeadSelect(e.target.value)}>
                      <option value="">— Select Qualified Lead —</option>
                      {leads.map(l=><option key={l.id} value={l.id}>{l.leadNumber} — {l.companyName}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-sm text-gray-600 mb-1">Customer Name *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.customerName} onChange={e=>setForm(f=>({...f,customerName:e.target.value}))} /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">Customer Email</label><input type="email" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.customerEmail} onChange={e=>setForm(f=>({...f,customerEmail:e.target.value}))} /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">Phone</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.customerPhone} onChange={e=>setForm(f=>({...f,customerPhone:e.target.value}))} /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">Valid Until *</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.validUntil} onChange={e=>setForm(f=>({...f,validUntil:e.target.value}))} /></div>
                  <div className="col-span-2"><label className="block text-sm text-gray-600 mb-1">Customer Address</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.customerAddress} onChange={e=>setForm(f=>({...f,customerAddress:e.target.value}))} /></div>
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
                              <td className="px-1 py-1"><input className="border rounded px-2 py-1 text-xs w-24 font-mono" value={item.itemCode} onChange={e=>updateItem(i,'itemCode',e.target.value)} placeholder="PCB-001" /></td>
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

                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm text-gray-600 mb-1">Terms & Conditions</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.termsConditions} onChange={e=>setForm(f=>({...f,termsConditions:e.target.value}))} /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">Notes</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={()=>setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Creating...':'Create Quotation'}</button>
              </div>
            </div>
          </div>
        )}

        {/* REJECT MODAL */}
        {rejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold text-red-700">Reject Quotation</h2>
                <button onClick={()=>setRejectModal(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6">
                <label className="block text-sm text-gray-600 mb-2">Rejection Reason *</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="Why is the customer rejecting this quotation?" />
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={()=>setRejectModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={async()=>{ await handleAction(rejectModal,'reject',{rejectedReason:rejectReason}); setRejectModal(null); }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Confirm Reject</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
