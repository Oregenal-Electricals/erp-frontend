'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;

const STATUS_COLORS = { DRAFT:'bg-gray-100 text-gray-600', POSTED:'bg-green-100 text-green-700', CANCELLED:'bg-red-100 text-red-600' };
const TYPE_COLORS = { SALES_INVOICE:'bg-blue-100 text-blue-700', RECEIPT:'bg-green-100 text-green-700', PURCHASE_BILL:'bg-orange-100 text-orange-700', PAYMENT:'bg-red-100 text-red-600', JOURNAL:'bg-purple-100 text-purple-700', CREDIT_NOTE:'bg-yellow-100 text-yellow-700', DEBIT_NOTE:'bg-pink-100 text-pink-700' };
const VTYPES = ['SALES_INVOICE','RECEIPT','PURCHASE_BILL','PAYMENT','JOURNAL','CREDIT_NOTE','DEBIT_NOTE'];
const BLANK_ENTRY = { accountId:'', entryType:'DEBIT', amount:'', narration:'' };

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState([]);
  const [stats, setStats] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [vType, setVType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [viewDetail, setViewDetail] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [form, setForm] = useState({ voucherType:'JOURNAL', voucherDate:'', referenceNumber:'', referenceType:'', partyName:'', narration:'', entries:[{...BLANK_ENTRY},{...BLANK_ENTRY}] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (vType) params.set('voucherType', vType);
    if (status) params.set('status', status);
    const [vRes, sRes, aRes] = await Promise.all([
      fetch(`${API}/vouchers?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/vouchers/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/accounts?limit=200`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (vRes.ok) { const d = await vRes.json(); setVouchers(d.data||[]); setTotal(d.total); setTotalPages(d.totalPages||1); }
    if (sRes.ok) setStats(await sRes.json());
    if (aRes.ok) { const d = await aRes.json(); setAccounts(d.data||[]); }
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, [page, search, vType, status]);

  function addEntry() { setForm(f => ({ ...f, entries: [...f.entries, {...BLANK_ENTRY}] })); }
  function removeEntry(i) { if (form.entries.length <= 2) return; setForm(f => ({ ...f, entries: f.entries.filter((_,idx)=>idx!==i) })); }
  function updateEntry(i, key, val) { setForm(f => { const entries=[...f.entries]; entries[i]={...entries[i],[key]:val}; return {...f,entries}; }); }

  const totalDebit = form.entries.filter(e=>e.entryType==='DEBIT').reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const totalCredit = form.entries.filter(e=>e.entryType==='CREDIT').reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  async function handleCreate() {
    setSaving(true); setError('');
    const body = {
      ...form,
      voucherDate: form.voucherDate ? new Date(form.voucherDate).toISOString() : new Date().toISOString(),
      entries: form.entries.filter(e=>e.accountId&&parseFloat(e.amount)>0).map(e=>({...e,amount:parseFloat(e.amount)})),
    };
    ['referenceNumber','referenceType','partyName','narration'].forEach(k=>{if(!body[k])delete body[k];});
    const res = await fetch(`${API}/vouchers`, {
      method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},
      body:JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    setSaving(false);
  }

  async function handlePost(id) {
    const res = await fetch(`${API}/vouchers/${id}/post`, {method:'POST',headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) { fetchAll(); if(viewDetail?.id===id){const d=await fetch(`${API}/vouchers/${id}`,{headers:{Authorization:`Bearer ${getToken()}`}});if(d.ok)setViewDetail(await d.json());} }
    else { const d=await res.json(); alert(d.message); }
  }

  async function handleCancel() {
    if (!cancelReason) { alert('Enter cancellation reason'); return; }
    const res = await fetch(`${API}/vouchers/${cancelModal}/cancel`, {
      method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},
      body:JSON.stringify({cancelReason}),
    });
    if (res.ok) { setCancelModal(null); setCancelReason(''); fetchAll(); }
    else { const d=await res.json(); alert(d.message); }
  }

  async function openDetail(id) {
    const res = await fetch(`${API}/vouchers/${id}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setViewDetail(await res.json());
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Voucher Engine</h1>
            <p className="text-gray-500 text-sm mt-1">Double-entry bookkeeping — Sales Invoices, Receipts, Payments, Journals</p>
          </div>
          <button onClick={()=>{setForm({voucherType:'JOURNAL',voucherDate:'',referenceNumber:'',referenceType:'',partyName:'',narration:'',entries:[{...BLANK_ENTRY},{...BLANK_ENTRY}]});setError('');setShowModal(true);}} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium text-sm">+ New Voucher</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[
              {label:'Total',value:stats.total,color:'bg-gray-50'},
              {label:'Draft',value:stats.draft,color:'bg-gray-50'},
              {label:'Posted',value:stats.posted,color:'bg-green-50'},
              {label:'Cancelled',value:stats.cancelled,color:'bg-red-50'},
              {label:'Posted Value',value:fmt(stats.totalPostedValue),color:'bg-indigo-50'},
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
            <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search voucher number, party, reference..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={vType} onChange={e=>{setVType(e.target.value);setPage(1);}}>
              <option value="">All Types</option>
              {VTYPES.map(t=><option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
            </select>
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
              <option value="">All Status</option>
              {['DRAFT','POSTED','CANCELLED'].map(s=><option key={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} vouchers</span>
          </div>

          <div className="divide-y">
            {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
            : vouchers.length===0 ? <div className="text-center py-10 text-gray-400">No vouchers found</div>
            : vouchers.map(v=>(
              <div key={v.id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={()=>openDetail(v.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono font-bold text-indigo-600">{v.voucherNumber}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[v.voucherType]}`}>{v.voucherType?.replace(/_/g,' ')}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[v.status]}`}>{v.status}</span>
                    {v.partyName && <span className="text-sm text-gray-700">{v.partyName}</span>}
                    {v.referenceNumber && <span className="font-mono text-xs text-gray-400">{v.referenceNumber}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold text-gray-800">{fmt(v.totalAmount)}</div>
                      <div className="text-xs text-gray-400">{fmtDate(v.voucherDate)}</div>
                    </div>
                    {v.status==='DRAFT' && <button onClick={e=>{e.stopPropagation();handlePost(v.id);}} className="px-2 py-1 text-xs bg-green-600 text-white rounded">Post</button>}
                    {v.status==='POSTED' && <button onClick={e=>{e.stopPropagation();setCancelModal(v.id);setCancelReason('');}} className="px-2 py-1 text-xs bg-red-500 text-white rounded">Cancel</button>}
                  </div>
                </div>
                {v.narration && <div className="mt-1 text-xs text-gray-500 line-clamp-1">{v.narration}</div>}
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
                  <h2 className="text-lg font-bold">{viewDetail.voucherNumber}</h2>
                  <span className={`px-2 py-0.5 rounded text-xs ${TYPE_COLORS[viewDetail.voucherType]}`}>{viewDetail.voucherType?.replace(/_/g,' ')}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[viewDetail.status]}`}>{viewDetail.status}</span>
                </div>
                <button onClick={()=>setViewDetail(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="text-gray-500">Date:</span><span>{fmtDate(viewDetail.voucherDate)}</span></div>
                    {viewDetail.partyName && <div className="flex justify-between"><span className="text-gray-500">Party:</span><span className="font-medium">{viewDetail.partyName}</span></div>}
                    {viewDetail.referenceNumber && <div className="flex justify-between"><span className="text-gray-500">Reference:</span><span className="font-mono text-indigo-600">{viewDetail.referenceNumber}</span></div>}
                  </div>
                  <div className="space-y-1">
                    {viewDetail.postedDate && <div className="flex justify-between"><span className="text-gray-500">Posted:</span><span>{fmtDate(viewDetail.postedDate)}</span></div>}
                    {viewDetail.cancelReason && <div className="text-xs text-red-500 bg-red-50 p-2 rounded">Cancelled: {viewDetail.cancelReason}</div>}
                  </div>
                </div>
                {viewDetail.narration && <div className="mb-4 p-3 bg-gray-50 rounded text-sm text-gray-600">{viewDetail.narration}</div>}

                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>{['Account','Type','Debit','Credit','Narration'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {viewDetail.entries?.map((e,i)=>(
                      <tr key={i}>
                        <td className="px-3 py-2 text-xs"><div className="font-mono text-blue-600">{e.account?.accountCode}</div><div>{e.account?.accountName}</div></td>
                        <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-bold ${e.entryType==='DEBIT'?'bg-red-50 text-red-700':'bg-green-50 text-green-700'}`}>{e.entryType}</span></td>
                        <td className="px-3 py-2 text-sm font-bold text-red-600">{e.entryType==='DEBIT'?fmt(e.amount):'-'}</td>
                        <td className="px-3 py-2 text-sm font-bold text-green-600">{e.entryType==='CREDIT'?fmt(e.amount):'-'}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{e.narration||'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold">
                    <tr>
                      <td className="px-3 py-2 text-xs" colSpan={2}>TOTAL</td>
                      <td className="px-3 py-2 text-sm text-red-600">{fmt(viewDetail.entries?.filter(e=>e.entryType==='DEBIT').reduce((s,e)=>s+e.amount,0))}</td>
                      <td className="px-3 py-2 text-sm text-green-600">{fmt(viewDetail.entries?.filter(e=>e.entryType==='CREDIT').reduce((s,e)=>s+e.amount,0))}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                {viewDetail.status==='DRAFT' && <button onClick={()=>handlePost(viewDetail.id)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Post Voucher</button>}
                {viewDetail.status==='POSTED' && <button onClick={()=>{setCancelModal(viewDetail.id);setCancelReason('');setViewDetail(null);}} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm">Cancel Voucher</button>}
                <button onClick={()=>setViewDetail(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
              </div>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-indigo-700">New Voucher</h2>
                <button onClick={()=>setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm text-gray-600 mb-1">Voucher Type *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.voucherType} onChange={e=>setForm(f=>({...f,voucherType:e.target.value}))}>
                      {VTYPES.map(t=><option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-sm text-gray-600 mb-1">Voucher Date</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.voucherDate} onChange={e=>setForm(f=>({...f,voucherDate:e.target.value}))} /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">Party Name</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.partyName} onChange={e=>setForm(f=>({...f,partyName:e.target.value}))} /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">Reference Number</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="SO-2026-0001" value={form.referenceNumber} onChange={e=>setForm(f=>({...f,referenceNumber:e.target.value}))} /></div>
                  <div className="col-span-2"><label className="block text-sm text-gray-600 mb-1">Narration</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.narration} onChange={e=>setForm(f=>({...f,narration:e.target.value}))} /></div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-gray-700 text-sm">Ledger Entries</h3>
                    <button onClick={addEntry} className="px-3 py-1 text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 rounded">+ Add Line</button>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500"><tr>{['Account','Dr/Cr','Amount','Narration',''].map(h=><th key={h} className="px-2 py-2 text-left">{h}</th>)}</tr></thead>
                    <tbody>
                      {form.entries.map((entry,i)=>(
                        <tr key={i} className="border-b">
                          <td className="px-1 py-1">
                            <select className="border rounded px-2 py-1 text-xs w-52" value={entry.accountId} onChange={e=>updateEntry(i,'accountId',e.target.value)}>
                              <option value="">— Select Account —</option>
                              {accounts.map(a=><option key={a.id} value={a.id}>{a.accountCode} — {a.accountName}</option>)}
                            </select>
                          </td>
                          <td className="px-1 py-1">
                            <select className={`border rounded px-2 py-1 text-xs w-20 font-bold ${entry.entryType==='DEBIT'?'text-red-600':'text-green-600'}`} value={entry.entryType} onChange={e=>updateEntry(i,'entryType',e.target.value)}>
                              <option value="DEBIT">DEBIT</option>
                              <option value="CREDIT">CREDIT</option>
                            </select>
                          </td>
                          <td className="px-1 py-1"><input type="number" className="border rounded px-2 py-1 text-xs w-28" placeholder="0.00" value={entry.amount} onChange={e=>updateEntry(i,'amount',e.target.value)} /></td>
                          <td className="px-1 py-1"><input className="border rounded px-2 py-1 text-xs w-36" value={entry.narration} onChange={e=>updateEntry(i,'narration',e.target.value)} /></td>
                          <td className="px-1 py-1"><button onClick={()=>removeEntry(i)} className="text-red-400 hover:text-red-600 text-lg">×</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-end mt-3 gap-6 text-sm">
                    <div className="flex gap-4">
                      <span className="text-red-600 font-bold">Dr: {fmt(totalDebit)}</span>
                      <span className="text-green-600 font-bold">Cr: {fmt(totalCredit)}</span>
                      <span className={`font-bold ${isBalanced?'text-green-600':'text-red-600'}`}>{isBalanced?'✅ Balanced':'⚠ Diff: '+fmt(Math.abs(totalDebit-totalCredit))}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={()=>setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Creating...':'Create Voucher'}</button>
              </div>
            </div>
          </div>
        )}

        {cancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b"><h2 className="text-lg font-bold text-red-700">Cancel Voucher</h2></div>
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
