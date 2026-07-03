'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;

const STATUS_COLORS = { DRAFT:'bg-gray-100 text-gray-600', APPROVED:'bg-blue-100 text-blue-700', PARTIAL:'bg-yellow-100 text-yellow-700', PAID:'bg-green-100 text-green-700', OVERDUE:'bg-red-100 text-red-700', CANCELLED:'bg-gray-100 text-gray-400' };
const PAYMENT_MODES = ['BANK_TRANSFER','NEFT','RTGS','CHEQUE','CASH','UPI'];
const TERMS = ['IMMEDIATE','NET_30','NET_45','NET_60','NET_90'];
const TABS = ['Bills','Aging Report'];

export default function ApPage() {
  const [activeTab, setActiveTab] = useState('Bills');
  const [bills, setBills] = useState([]);
  const [stats, setStats] = useState(null);
  const [aging, setAging] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [viewDetail, setViewDetail] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({ amount:'', paymentMode:'NEFT', referenceNumber:'', remarks:'' });
  const [form, setForm] = useState({ vendorBillNumber:'', vendorId:'', vendorName:'', poId:'', billDate:'', paymentTerms:'NET_30', subtotal:'', totalGst:'', totalAmount:'', remarks:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const [bRes, sRes, vRes, pRes, aRes] = await Promise.all([
      fetch(`${API}/ap?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/ap/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/vendors?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/purchase-orders?limit=50`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/ap/aging`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (bRes.ok) { const d = await bRes.json(); setBills(d.data||[]); setTotal(d.total); setTotalPages(d.totalPages||1); }
    if (sRes.ok) setStats(await sRes.json());
    if (vRes.ok) { const d = await vRes.json(); setVendors(d.data||d||[]); }
    if (pRes.ok) { const d = await pRes.json(); setPos(d.data||d||[]); }
    if (aRes.ok) setAging(await aRes.json());
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, [page, search, status]);

  function handleVendorSelect(vendorId) {
    const v = vendors.find(x=>x.id===vendorId);
    setForm(f=>({...f, vendorId, vendorName: v?.name||f.vendorName}));
  }

  function calcTotal() {
    const sub = parseFloat(form.subtotal)||0;
    const gst = parseFloat(form.totalGst)||0;
    setForm(f=>({...f, totalAmount: String(Math.round((sub+gst)*100)/100)}));
  }

  async function handleCreate() {
    setSaving(true); setError('');
    const body = {
      ...form,
      subtotal: parseFloat(form.subtotal)||0,
      totalGst: parseFloat(form.totalGst)||0,
      totalAmount: parseFloat(form.totalAmount)||0,
    };
    if (body.billDate) body.billDate = new Date(body.billDate).toISOString();
    else delete body.billDate;
    ['vendorId','poId','remarks'].forEach(k=>{if(!body[k])delete body[k];});
    const res = await fetch(`${API}/ap`, {
      method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},
      body:JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    setSaving(false);
  }

  async function handlePayment() {
    if (!payForm.amount||parseFloat(payForm.amount)<=0) { setError('Enter valid amount'); return; }
    setSaving(true); setError('');
    const body = { billId:payModal.id, amount:parseFloat(payForm.amount), paymentMode:payForm.paymentMode };
    if (payForm.referenceNumber) body.referenceNumber = payForm.referenceNumber;
    if (payForm.remarks) body.remarks = payForm.remarks;
    const res = await fetch(`${API}/ap/payments`, {
      method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},
      body:JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setPayModal(null); fetchAll(); }
    else setError(data.message||'Failed');
    setSaving(false);
  }

  async function openDetail(id) {
    const res = await fetch(`${API}/ap/${id}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setViewDetail(await res.json());
  }

  const isOverdue = b => ['APPROVED','PARTIAL'].includes(b.status) && new Date(b.dueDate) < new Date();

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Accounts Payable</h1>
            <p className="text-gray-500 text-sm mt-1">Vendor bills, payments and payables aging</p>
          </div>
          <button onClick={()=>{setForm({vendorBillNumber:'',vendorId:'',vendorName:'',poId:'',billDate:'',paymentTerms:'NET_30',subtotal:'',totalGst:'',totalAmount:'',remarks:''});setError('');setShowModal(true);}} className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-medium text-sm">+ Register Bill</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            {[
              {label:'Total',value:stats.total,color:'bg-gray-50'},
              {label:'Approved',value:stats.approved,color:'bg-blue-50'},
              {label:'Partial',value:stats.partial,color:'bg-yellow-50'},
              {label:'Paid',value:stats.paid,color:'bg-green-50'},
              {label:'Overdue',value:stats.overdue,color:'bg-red-50'},
              {label:'Outstanding',value:fmt(stats.totalOutstanding),color:'bg-orange-50'},
              {label:'Total Paid',value:fmt(stats.totalPaid),color:'bg-teal-50'},
            ].map(s=>(
              <div key={s.label} className={`${s.color} rounded-lg p-3 text-center`}>
                <div className="text-base font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-4 border-b">
          {TABS.map(t=><button key={t} onClick={()=>setActiveTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab===t?'border-orange-600 text-orange-600':'border-transparent text-gray-500'}`}>{t}</button>)}
        </div>

        {activeTab==='Bills' && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-4 border-b flex gap-3 flex-wrap">
              <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search bill number, vendor, vendor bill..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
              <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
                <option value="">All Status</option>
                {Object.keys(STATUS_COLORS).map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <span className="text-sm text-gray-500 self-center">{total} bills</span>
            </div>
            <div className="divide-y">
              {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
              : bills.length===0 ? <div className="text-center py-10 text-gray-400">No bills found</div>
              : bills.map(b=>(
                <div key={b.id} className={`p-4 hover:bg-gray-50 ${isOverdue(b)?'border-l-4 border-red-400':''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-wrap cursor-pointer" onClick={()=>openDetail(b.id)}>
                      <span className="font-mono font-bold text-orange-600">{b.billNumber}</span>
                      <span className="font-mono text-xs text-gray-400">#{b.vendorBillNumber}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[b.status]}`}>{b.status}</span>
                      <span className="text-sm font-medium text-gray-800">{b.vendorName}</span>
                      {b.po && <span className="font-mono text-xs text-blue-500">{b.po.poNumber}</span>}
                      {isOverdue(b) && <span className="text-xs text-red-600 font-bold">⚠ OVERDUE</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-bold text-gray-800">{fmt(b.totalAmount)}</div>
                        <div className="text-xs text-orange-600">Outstanding: {fmt(b.outstandingAmount)}</div>
                        <div className="text-xs text-gray-400">Due: {fmtDate(b.dueDate)}</div>
                      </div>
                      {['APPROVED','PARTIAL'].includes(b.status) && (
                        <button onClick={()=>{setPayModal(b);setPayForm({amount:b.outstandingAmount,paymentMode:'NEFT',referenceNumber:'',remarks:''});setError('');}} className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Pay Now</button>
                      )}
                    </div>
                  </div>
                  {b.payments?.length > 0 && <div className="mt-1 text-xs text-gray-400">{b.payments.length} payment(s) · Paid: {fmt(b.payments.reduce((s,p)=>s+p.amount,0))}</div>}
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
        )}

        {activeTab==='Aging Report' && aging && (
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-4">
              {[
                {label:'Current',value:aging.aging.current,color:'bg-green-50 border-green-200'},
                {label:'1-30 Days',value:aging.aging.days30,color:'bg-yellow-50 border-yellow-200'},
                {label:'31-60 Days',value:aging.aging.days60,color:'bg-orange-50 border-orange-200'},
                {label:'61-90 Days',value:aging.aging.days90,color:'bg-red-50 border-red-200'},
                {label:'90+ Days',value:aging.aging.over90,color:'bg-red-100 border-red-300'},
              ].map(s=>(
                <div key={s.label} className={`${s.color} border rounded-xl p-4 text-center`}>
                  <div className="text-lg font-bold text-gray-800">{fmt(s.value)}</div>
                  <div className="text-xs text-gray-600 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            {aging.bills?.length > 0 && (
              <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Bill','Vendor','Bill Date','Due Date','Days Overdue','Total','Outstanding','Status'].map(h=><th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y">
                    {aging.bills.map(b=>(
                      <tr key={b.id} className={`hover:bg-gray-50 ${b.agingDays>90?'bg-red-50':b.agingDays>60?'bg-orange-50':b.agingDays>30?'bg-yellow-50':''}`}>
                        <td className="px-3 py-2 font-mono text-xs text-orange-600 font-bold">{b.billNumber}</td>
                        <td className="px-3 py-2 text-xs">{b.vendorName}</td>
                        <td className="px-3 py-2 text-xs">{fmtDate(b.billDate)}</td>
                        <td className="px-3 py-2 text-xs">{fmtDate(b.dueDate)}</td>
                        <td className={`px-3 py-2 text-xs font-bold ${b.agingDays>0?'text-red-600':'text-green-600'}`}>{b.agingDays>0?b.agingDays+'d':'Current'}</td>
                        <td className="px-3 py-2 text-xs font-bold">{fmt(b.totalAmount)}</td>
                        <td className="px-3 py-2 text-xs font-bold text-orange-600">{fmt(b.outstandingAmount)}</td>
                        <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[b.status]}`}>{b.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {viewDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold">{viewDetail.billNumber}</h2>
                  <span className="text-xs text-gray-400 font-mono">#{viewDetail.vendorBillNumber}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[viewDetail.status]}`}>{viewDetail.status}</span>
                </div>
                <button onClick={()=>setViewDetail(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="text-gray-500">Vendor:</span><span className="font-medium">{viewDetail.vendorName}</span></div>
                    {viewDetail.po && <div className="flex justify-between"><span className="text-gray-500">PO:</span><span className="font-mono text-blue-600">{viewDetail.po.poNumber}</span></div>}
                    <div className="flex justify-between"><span className="text-gray-500">Terms:</span><span>{viewDetail.paymentTerms?.replace(/_/g,' ')}</span></div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="text-gray-500">Bill Date:</span><span>{fmtDate(viewDetail.billDate)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Due Date:</span><span className={isOverdue(viewDetail)?'text-red-600 font-bold':''}>{fmtDate(viewDetail.dueDate)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Subtotal:</span><span>{fmt(viewDetail.subtotal)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">GST:</span><span>{fmt(viewDetail.totalGst)}</span></div>
                    <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span className="text-orange-700">{fmt(viewDetail.totalAmount)}</span></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-3 text-center"><div className="text-lg font-bold text-green-700">{fmt(viewDetail.paidAmount)}</div><div className="text-xs text-gray-500">Paid</div></div>
                  <div className="bg-orange-50 rounded-lg p-3 text-center"><div className="text-lg font-bold text-orange-600">{fmt(viewDetail.outstandingAmount)}</div><div className="text-xs text-gray-500">Outstanding</div></div>
                </div>
                {viewDetail.payments?.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-2">Payment History</div>
                    {viewDetail.payments.map(p=>(
                      <div key={p.id} className="flex justify-between items-center py-2 border-b text-sm">
                        <span className="text-xs text-gray-500">{fmtDate(p.paymentDate)}</span>
                        <span className="text-xs">{p.paymentMode?.replace(/_/g,' ')}</span>
                        {p.referenceNumber && <span className="font-mono text-xs text-gray-400">{p.referenceNumber}</span>}
                        <span className="font-bold text-green-600">{fmt(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                {['APPROVED','PARTIAL'].includes(viewDetail.status) && <button onClick={()=>{setPayModal(viewDetail);setPayForm({amount:viewDetail.outstandingAmount,paymentMode:'NEFT',referenceNumber:'',remarks:''});setError('');setViewDetail(null);}} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Pay Now</button>}
                <button onClick={()=>setViewDetail(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
              </div>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-orange-700">Register Vendor Bill</h2>
                <button onClick={()=>setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm text-gray-600 mb-1">Vendor Bill No. *</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.vendorBillNumber} onChange={e=>setForm(f=>({...f,vendorBillNumber:e.target.value}))} /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">Bill Date</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.billDate} onChange={e=>setForm(f=>({...f,billDate:e.target.value}))} /></div>
                  <div className="col-span-2"><label className="block text-sm text-gray-600 mb-1">Vendor *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.vendorId} onChange={e=>handleVendorSelect(e.target.value)}>
                      <option value="">— Select Vendor —</option>
                      {vendors.map(v=><option key={v.id} value={v.id}>{v.name} ({v.code})</option>)}
                    </select>
                  </div>
                  {!form.vendorId && <div className="col-span-2"><label className="block text-sm text-gray-600 mb-1">Vendor Name (manual)</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.vendorName} onChange={e=>setForm(f=>({...f,vendorName:e.target.value}))} /></div>}
                  <div className="col-span-2"><label className="block text-sm text-gray-600 mb-1">Link PO</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.poId} onChange={e=>setForm(f=>({...f,poId:e.target.value}))}>
                      <option value="">— Optional —</option>
                      {pos.map(p=><option key={p.id} value={p.id}>{p.poNumber}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-sm text-gray-600 mb-1">Payment Terms</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.paymentTerms} onChange={e=>setForm(f=>({...f,paymentTerms:e.target.value}))}>
                      {TERMS.map(t=><option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-sm text-gray-600 mb-1">Subtotal (₹) *</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.subtotal} onChange={e=>setForm(f=>({...f,subtotal:e.target.value}))} onBlur={calcTotal} /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">Total GST (₹)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.totalGst} onChange={e=>setForm(f=>({...f,totalGst:e.target.value}))} onBlur={calcTotal} /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">Total Amount (₹) *</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm font-bold" value={form.totalAmount} onChange={e=>setForm(f=>({...f,totalAmount:e.target.value}))} /></div>
                  <div className="col-span-2"><label className="block text-sm text-gray-600 mb-1">Remarks</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))} /></div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={()=>setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Registering...':'Register Bill'}</button>
              </div>
            </div>
          </div>
        )}

        {payModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b">
                <h2 className="text-lg font-bold text-green-700">Pay Vendor Bill</h2>
                <div className="text-sm text-gray-500 mt-1">{payModal.billNumber} — {payModal.vendorName}</div>
                <div className="text-sm font-bold text-orange-600 mt-1">Outstanding: {fmt(payModal.outstandingAmount)}</div>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div><label className="block text-sm text-gray-600 mb-1">Amount *</label><input type="number" max={payModal.outstandingAmount} className="w-full border rounded-lg px-3 py-2 text-sm" value={payForm.amount} onChange={e=>setPayForm(f=>({...f,amount:e.target.value}))} /></div>
                <div><label className="block text-sm text-gray-600 mb-1">Payment Mode *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={payForm.paymentMode} onChange={e=>setPayForm(f=>({...f,paymentMode:e.target.value}))}>
                    {PAYMENT_MODES.map(m=><option key={m} value={m}>{m.replace(/_/g,' ')}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm text-gray-600 mb-1">Reference (UTR/Cheque)</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={payForm.referenceNumber} onChange={e=>setPayForm(f=>({...f,referenceNumber:e.target.value}))} /></div>
                <div><label className="block text-sm text-gray-600 mb-1">Remarks</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={payForm.remarks} onChange={e=>setPayForm(f=>({...f,remarks:e.target.value}))} /></div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={()=>setPayModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handlePayment} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Paying...':'Pay Now'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
