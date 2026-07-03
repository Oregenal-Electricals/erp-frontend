'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import DocumentAttachments from '@/components/shared/DocumentAttachments';

const API = process.env.NEXT_PUBLIC_API_URL;

async function downloadPdf(id) {
  const res = await fetch(`${API}/pdf/invoice/${id}`, {headers:{Authorization:`Bearer ${getToken()}`}});
  if (res.ok) {
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='Invoice-'+id+'.pdf'; a.click();
    URL.revokeObjectURL(url);
  } else alert('PDF generation failed');
}

function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }

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

const STATUS_COLORS = { DRAFT:'bg-gray-100 text-gray-600', SENT:'bg-blue-100 text-blue-700', PARTIAL:'bg-yellow-100 text-yellow-700', PAID:'bg-green-100 text-green-700', OVERDUE:'bg-red-100 text-red-700', CANCELLED:'bg-gray-100 text-gray-400' };
const PAYMENT_MODES = ['BANK_TRANSFER','NEFT','RTGS','CHEQUE','CASH','UPI'];
const TABS = ['Invoices','Aging Report'];

export default function ArPage() {
  const [activeTab, setActiveTab] = useState('Invoices');
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [aging, setAging] = useState(null);
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [viewDetail, setViewDetail] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({ amount:'', paymentMode:'BANK_TRANSFER', referenceNumber:'', remarks:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const [iRes, sRes, dRes, aRes] = await Promise.all([
      fetch(`${API}/ar?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/ar/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/dispatches?status=DELIVERED&limit=50`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/ar/aging`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (iRes.ok) { const d = await iRes.json(); setInvoices(d.data||[]); setTotal(d.total); setTotalPages(d.totalPages||1); }
    if (sRes.ok) setStats(await sRes.json());
    if (dRes.ok) { const d = await dRes.json(); setDispatches(d.data||[]); }
    if (aRes.ok) setAging(await aRes.json());
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, [page, search, status]);

  async function handleCreateFromDispatch(dispatchId) {
    setSaving(true);
    const res = await fetch(`${API}/ar/from-dispatch/${dispatchId}`, { method:'POST', headers:{Authorization:`Bearer ${getToken()}`} });
    const data = await res.json();
    if (res.ok) { fetchAll(); alert(`Invoice ${data.invoiceNumber} created for ₹${data.totalAmount.toLocaleString()}`); }
    else alert(data.message);
    setSaving(false);
  }

  async function handlePayment() {
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) { setError('Enter valid amount'); return; }
    setSaving(true); setError('');
    const body = { invoiceId: payModal.id, amount: parseFloat(payForm.amount), paymentMode: payForm.paymentMode };
    if (payForm.referenceNumber) body.referenceNumber = payForm.referenceNumber;
    if (payForm.remarks) body.remarks = payForm.remarks;
    const res = await fetch(`${API}/ar/payments`, {
      method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setPayModal(null); fetchAll(); }
    else setError(data.message||'Failed');
    setSaving(false);
  }

  async function openDetail(id) {
    const res = await fetch(`${API}/ar/${id}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setViewDetail(await res.json());
  }

  const isOverdue = inv => ['SENT','PARTIAL'].includes(inv.status) && new Date(inv.dueDate) < new Date();

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Accounts Receivable</h1>
            <p className="text-gray-500 text-sm mt-1">Customer invoices, payments and aging analysis</p>
          </div>
          <div className="flex gap-2">
            {dispatches.length > 0 && (
              <select className="border rounded-lg px-3 py-2 text-sm" onChange={e=>{ if(e.target.value) handleCreateFromDispatch(e.target.value); e.target.value=''; }} defaultValue="">
                <option value="">+ Invoice from Dispatch</option>
                {dispatches.map(d=><option key={d.id} value={d.id}>{d.dispatchNumber} — {d.customerName}</option>)}
              </select>
            )}
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            {[
              {label:'Total',value:stats.total,color:'bg-gray-50'},
              {label:'Sent',value:stats.sent,color:'bg-blue-50'},
              {label:'Partial',value:stats.partial,color:'bg-yellow-50'},
              {label:'Paid',value:stats.paid,color:'bg-green-50'},
              {label:'Overdue',value:stats.overdue,color:'bg-red-50'},
              {label:'Outstanding',value:fmt(stats.totalOutstanding),color:'bg-orange-50'},
              {label:'Collected',value:fmt(stats.totalCollected),color:'bg-teal-50'},
            ].map(s=>(
              <div key={s.label} className={`${s.color} rounded-lg p-3 text-center`}>
                <div className="text-base font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-4 border-b">
          {TABS.map(t=><button key={t} onClick={()=>setActiveTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab===t?'border-blue-600 text-blue-600':'border-transparent text-gray-500'}`}>{t}</button>)}
        </div>

        {activeTab==='Invoices' && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-4 border-b flex gap-3 flex-wrap">
              <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search invoice, customer..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
              <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
                <option value="">All Status</option>
                {Object.keys(STATUS_COLORS).map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <span className="text-sm text-gray-500 self-center">{total} invoices</span>
            </div>
            <div className="divide-y">
              {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
              : invoices.length===0 ? <div className="text-center py-10 text-gray-400">No invoices found</div>
              : invoices.map(inv=>(
                <div key={inv.id} className={`p-4 hover:bg-gray-50 ${isOverdue(inv)?'border-l-4 border-red-400':''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-wrap cursor-pointer" onClick={()=>openDetail(inv.id)}>
                      <span className="font-mono font-bold text-blue-600">{inv.invoiceNumber}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[inv.status]}`}>{inv.status}</span>
                      <span className="text-sm font-medium text-gray-800">{inv.customerName}</span>
                      {inv.salesOrder && <span className="font-mono text-xs text-indigo-500">{inv.salesOrder.soNumber}</span>}
                      {inv.dispatch && <span className="font-mono text-xs text-purple-500">{inv.dispatch.dispatchNumber}</span>}
                      {isOverdue(inv) && <span className="text-xs text-red-600 font-bold">⚠ OVERDUE</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-bold text-gray-800">{fmt(inv.totalAmount)}</div>
                        <div className="text-xs text-orange-600">Outstanding: {fmt(inv.outstandingAmount)}</div>
                        <div className="text-xs text-gray-400">Due: {fmtDate(inv.dueDate)}</div>
                      </div>
                      {['SENT','PARTIAL'].includes(inv.status) && (
                        <button onClick={()=>{setPayModal(inv);setPayForm({amount:inv.outstandingAmount,paymentMode:'BANK_TRANSFER',referenceNumber:'',remarks:''});setError('');}} className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Record Payment</button>
                      )}
                    </div>
                  </div>
                  {inv.payments?.length > 0 && (
                    <div className="mt-1 text-xs text-gray-400">{inv.payments.length} payment(s) · Paid: {fmt(inv.payments.reduce((s,p)=>s+p.amount,0))}</div>
                  )}
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
                {label:'Current (not due)',value:aging.aging.current,color:'bg-green-50 border-green-200'},
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
            {aging.invoices.length > 0 && (
              <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Invoice','Customer','Invoice Date','Due Date','Days Overdue','Total','Outstanding','Status'].map(h=><th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y">
                    {aging.invoices.map(inv=>(
                      <tr key={inv.id} className={`hover:bg-gray-50 ${inv.agingDays>90?'bg-red-50':inv.agingDays>60?'bg-orange-50':inv.agingDays>30?'bg-yellow-50':''}`}>
                        <td className="px-3 py-2 font-mono text-xs text-blue-600 font-bold">{inv.invoiceNumber}</td>
                        <td className="px-3 py-2 text-xs">{inv.customerName}</td>
                        <td className="px-3 py-2 text-xs">{fmtDate(inv.invoiceDate)}</td>
                        <td className="px-3 py-2 text-xs">{fmtDate(inv.dueDate)}</td>
                        <td className={`px-3 py-2 text-xs font-bold ${inv.agingDays>0?'text-red-600':'text-green-600'}`}>{inv.agingDays > 0 ? inv.agingDays+'d' : 'Current'}</td>
                        <td className="px-3 py-2 text-xs font-bold">{fmt(inv.totalAmount)}</td>
                        <td className="px-3 py-2 text-xs font-bold text-orange-600">{fmt(inv.outstandingAmount)}</td>
                        <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[inv.status]}`}>{inv.status}</span></td>
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
                  <h2 className="text-lg font-bold">{viewDetail.invoiceNumber}</h2>
                  <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[viewDetail.status]}`}>{viewDetail.status}</span>
                </div>
                <button onClick={()=>setViewDetail(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="text-gray-500">Customer:</span><span className="font-medium">{viewDetail.customerName}</span></div>
                    {viewDetail.salesOrder && <div className="flex justify-between"><span className="text-gray-500">SO:</span><span className="font-mono text-indigo-600">{viewDetail.salesOrder.soNumber}</span></div>}
                    {viewDetail.dispatch && <div className="flex justify-between"><span className="text-gray-500">Dispatch:</span><span className="font-mono text-purple-600">{viewDetail.dispatch.dispatchNumber}</span></div>}
                    <div className="flex justify-between"><span className="text-gray-500">Payment Terms:</span><span>{viewDetail.paymentTerms?.replace(/_/g,' ')}</span></div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="text-gray-500">Invoice Date:</span><span>{fmtDate(viewDetail.invoiceDate)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Due Date:</span><span className={isOverdue(viewDetail)?'text-red-600 font-bold':''}>{fmtDate(viewDetail.dueDate)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Subtotal:</span><span>{fmt(viewDetail.subtotal)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Total GST:</span><span>{fmt(viewDetail.totalGst)}</span></div>
                    <div className="flex justify-between font-bold text-lg border-t pt-1"><span>Total:</span><span className="text-blue-700">{fmt(viewDetail.totalAmount)}</span></div>
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
                        <span className="font-mono text-xs text-gray-500">{fmtDate(p.paymentDate)}</span>
                        <span className="text-xs">{p.paymentMode?.replace(/_/g,' ')}</span>
                        {p.referenceNumber && <span className="font-mono text-xs text-gray-400">{p.referenceNumber}</span>}
                        <span className="font-bold text-green-600">{fmt(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

              <DocumentAttachments referenceType="AR_INVOICE" referenceId={viewDetail?.id} referenceNumber={viewDetail?.invoiceNumber} title="Invoice Attachments" />
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                {['SENT','PARTIAL'].includes(viewDetail.status) && <button onClick={()=>{setPayModal(viewDetail);setPayForm({amount:viewDetail.outstandingAmount,paymentMode:'BANK_TRANSFER',referenceNumber:'',remarks:''});setError('');setViewDetail(null);}} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Record Payment</button>}
                <button onClick={()=>setViewDetail(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
                <button onClick={()=>downloadPdf(viewDetail?.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">⬇ PDF</button>
              </div>
            </div>
          </div>
        )}

        {payModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b">
                <h2 className="text-lg font-bold text-green-700">Record Payment</h2>
                <div className="text-sm text-gray-500 mt-1">{payModal.invoiceNumber} — {payModal.customerName}</div>
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
                <div><label className="block text-sm text-gray-600 mb-1">Reference Number (UTR/Cheque)</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={payForm.referenceNumber} onChange={e=>setPayForm(f=>({...f,referenceNumber:e.target.value}))} /></div>
                <div><label className="block text-sm text-gray-600 mb-1">Remarks</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={payForm.remarks} onChange={e=>setPayForm(f=>({...f,remarks:e.target.value}))} /></div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={()=>setPayModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handlePayment} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Recording...':'Record Payment'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
