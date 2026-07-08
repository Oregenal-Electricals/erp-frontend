'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
const BLANK_LINE = { transactionDate:'', description:'', referenceNumber:'', creditAmount:'', debitAmount:'', balance:'' };

export default function BankReconPage() {
  const [statements, setStatements] = useState([]);
  const [stats, setStats] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewDetail, setViewDetail] = useState(null);
  const [suggestions, setSuggestions] = useState({});
  const [form, setForm] = useState({ bankAccountId:'', bankAccountName:'', period:'', openingBalance:'', remarks:'', lines:[{...BLANK_LINE}] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const [sRes, stRes, bRes] = await Promise.all([
      fetch(`${API}/bank-reconciliation`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/bank-reconciliation/stats`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/bank-reconciliation/bank-accounts`, {headers:{Authorization:`Bearer ${getToken()}`}}),
    ]);
    if (sRes.ok) setStatements(await sRes.json());
    if (stRes.ok) setStats(await stRes.json());
    if (bRes.ok) setBankAccounts(await bRes.json());
    setLoading(false);
  }

  useEffect(()=>{ fetchAll(); },[]);

  function addLine() { setForm(f=>({...f,lines:[...f.lines,{...BLANK_LINE}]})); }
  function removeLine(i) { if(form.lines.length<=1)return; setForm(f=>({...f,lines:f.lines.filter((_,idx)=>idx!==i)})); }
  function updateLine(i,k,v) { setForm(f=>{const lines=[...f.lines];lines[i]={...lines[i],[k]:v};return{...f,lines};}); }

  function handleBankSelect(id) {
    const bank = bankAccounts.find(b=>b.id===id);
    setForm(f=>({...f, bankAccountId:id, bankAccountName:bank?.accountName||f.bankAccountName}));
  }

  const totalCredits = form.lines.reduce((s,l)=>s+(parseFloat(l.creditAmount)||0),0);
  const totalDebits = form.lines.reduce((s,l)=>s+(parseFloat(l.debitAmount)||0),0);
  const closingBalance = (parseFloat(form.openingBalance)||0) + totalCredits - totalDebits;

  async function handleCreate() {
    setSaving(true); setError('');
    const body = {
      ...form, openingBalance: parseFloat(form.openingBalance)||0,
      lines: form.lines.filter(l=>l.transactionDate&&l.description).map(l=>({
        transactionDate: new Date(l.transactionDate).toISOString(),
        description: l.description, referenceNumber: l.referenceNumber||undefined,
        creditAmount: parseFloat(l.creditAmount)||0, debitAmount: parseFloat(l.debitAmount)||0,
        balance: parseFloat(l.balance)||0,
      })),
    };
    if (!body.remarks) delete body.remarks;
    const res = await fetch(`${API}/bank-reconciliation`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    setSaving(false);
  }

  async function openDetail(id) {
    const res = await fetch(`${API}/bank-reconciliation/${id}`,{headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) { setViewDetail(await res.json()); setSuggestions({}); }
  }

  async function fetchSuggestions(lineId) {
    if (suggestions[lineId]) return;
    const res = await fetch(`${API}/bank-reconciliation/suggestions/${lineId}`,{headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) { const d = await res.json(); setSuggestions(s=>({...s,[lineId]:d})); }
  }

  async function handleReconcile(lineId, voucherEntryId) {
    const res = await fetch(`${API}/bank-reconciliation/reconcile`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify({lineId,voucherEntryId})});
    if (res.ok) { openDetail(viewDetail.id); fetchAll(); }
    else { const d=await res.json(); alert(d.message); }
  }

  async function handleUnreconcile(lineId) {
    const res = await fetch(`${API}/bank-reconciliation/unreconcile/${lineId}`,{method:'POST',headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) { openDetail(viewDetail.id); fetchAll(); }
    else { const d=await res.json(); alert(d.message); }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bank Reconciliation</h1>
            <p className="text-gray-500 text-sm mt-1">Match bank statement transactions with ledger vouchers</p>
          </div>
          <button onClick={()=>{setForm({bankAccountId:'',bankAccountName:'',period:'',openingBalance:'',remarks:'',lines:[{...BLANK_LINE}]});setError('');setShowModal(true);}} className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 font-medium text-sm">+ Import Statement</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              {label:'Total Statements',value:stats.total,color:'bg-gray-50'},
              {label:'Reconciled',value:stats.reconciled,color:'bg-green-50'},
              {label:'In Progress',value:stats.draft,color:'bg-yellow-50'},
              {label:'Unreconciled Lines',value:stats.unreconciledLines,color:stats.unreconciledLines>0?'bg-red-50':'bg-green-50'},
            ].map(s=>(
              <div key={s.label} className={`${s.color} rounded-xl p-4 text-center`}>
                <div className="text-2xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b"><span className="text-sm text-gray-500">{statements.length} statements</span></div>
          {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
          : statements.length===0 ? <div className="text-center py-10 text-gray-400">No bank statements yet. Import one to start reconciliation.</div>
          : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Bank Account','Period','Opening','Credits','Debits','Closing','Reconciled','Status',''].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                {statements.map(s=>(
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-sm">{s.bankAccountName}</td>
                    <td className="px-4 py-3 font-mono text-sm font-bold">{s.period}</td>
                    <td className="px-4 py-3 text-xs">{fmt(s.openingBalance)}</td>
                    <td className="px-4 py-3 text-xs text-green-600">{fmt(s.totalCredits)}</td>
                    <td className="px-4 py-3 text-xs text-red-600">{fmt(s.totalDebits)}</td>
                    <td className="px-4 py-3 text-xs font-bold">{fmt(s.closingBalance)}</td>
                    <td className="px-4 py-3 text-xs">{s.reconciledCount}/{s.reconciledCount+s.unreconciledCount}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${s.status==='RECONCILED'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{s.status}</span></td>
                    <td className="px-4 py-3"><button onClick={()=>openDetail(s.id)} className="px-3 py-1 text-xs border rounded hover:bg-gray-50">Reconcile</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* DETAIL / RECONCILIATION MODAL */}
        {viewDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <div>
                  <h2 className="text-lg font-bold">{viewDetail.bankAccountName} — {viewDetail.period}</h2>
                  <div className="flex gap-4 text-sm mt-1">
                    <span className="text-gray-500">Opening: <span className="font-bold">{fmt(viewDetail.openingBalance)}</span></span>
                    <span className="text-green-600">Credits: <span className="font-bold">{fmt(viewDetail.totalCredits)}</span></span>
                    <span className="text-red-600">Debits: <span className="font-bold">{fmt(viewDetail.totalDebits)}</span></span>
                    <span className="text-gray-800">Closing: <span className="font-bold">{fmt(viewDetail.closingBalance)}</span></span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${viewDetail.status==='RECONCILED'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{viewDetail.status}</span>
                  </div>
                </div>
                <button onClick={()=>setViewDetail(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6">
                <div className="space-y-2">
                  {viewDetail.lines.map(line=>(
                    <div key={line.id} className={`border rounded-lg p-3 ${line.isReconciled?'bg-green-50 border-green-200':'bg-white'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-gray-400 w-20">{fmtDate(line.transactionDate)}</span>
                          <span className="text-sm font-medium">{line.description}</span>
                          {line.referenceNumber && <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{line.referenceNumber}</span>}
                        </div>
                        <div className="flex items-center gap-4">
                          {line.creditAmount > 0 && <span className="text-green-600 font-bold text-sm">+{fmt(line.creditAmount)}</span>}
                          {line.debitAmount > 0 && <span className="text-red-600 font-bold text-sm">-{fmt(line.debitAmount)}</span>}
                          {line.balance > 0 && <span className="text-xs text-gray-400">{fmt(line.balance)}</span>}
                          {line.isReconciled ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-green-600 font-bold">✅ Reconciled</span>
                              <button onClick={()=>handleUnreconcile(line.id)} className="text-xs text-red-500 underline">Undo</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button onClick={()=>{handleReconcile(line.id);fetchSuggestions(line.id);}} className="px-2 py-1 text-xs bg-green-600 text-white rounded">Mark Reconciled</button>
                              <button onClick={()=>fetchSuggestions(line.id)} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">Suggestions</button>
                            </div>
                          )}
                        </div>
                      </div>
                      {suggestions[line.id]?.length > 0 && !line.isReconciled && (
                        <div className="mt-2 pl-24">
                          <div className="text-xs text-gray-500 mb-1">Matching voucher entries:</div>
                          {suggestions[line.id].map(s=>(
                            <div key={s.id} className="flex items-center justify-between text-xs bg-blue-50 px-3 py-1 rounded mb-1">
                              <span className="font-mono text-blue-600">{s.voucher.voucherNumber}</span>
                              <span>{s.voucher.partyName||'—'}</span>
                              <span className="font-bold">{fmt(s.amount)}</span>
                              <span className="text-gray-400">{fmtDate(s.voucher.voucherDate)}</span>
                              <button onClick={()=>handleReconcile(line.id,s.id)} className="px-2 py-0.5 bg-blue-600 text-white rounded">Match</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 border-t flex justify-between sticky bottom-0 bg-white">
                <div className="text-sm text-gray-500">{viewDetail.reconciledCount}/{viewDetail.lines.length} lines reconciled</div>
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
                <h2 className="text-lg font-bold text-teal-700">Import Bank Statement</h2>
                <button onClick={()=>setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2"><label className="block text-sm text-gray-600 mb-1">Bank Account *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.bankAccountId} onChange={e=>handleBankSelect(e.target.value)}>
                      <option value="">— Select Bank Account —</option>
                      {bankAccounts.map(b=><option key={b.id} value={b.id}>{b.accountCode} — {b.accountName} (Bal: {fmt(b.currentBalance)})</option>)}
                    </select>
                  </div>
                  <div><label className="block text-sm text-gray-600 mb-1">Period * (YYYY-MM)</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="2026-07" value={form.period} onChange={e=>setForm(f=>({...f,period:e.target.value}))} /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">Opening Balance (₹) *</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.openingBalance} onChange={e=>setForm(f=>({...f,openingBalance:e.target.value}))} /></div>
                  <div className="col-span-2"><label className="block text-sm text-gray-600 mb-1">Remarks</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))} /></div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-gray-700 text-sm">Statement Lines</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-green-600">Credits: {fmt(totalCredits)}</span>
                      <span className="text-xs text-red-600">Debits: {fmt(totalDebits)}</span>
                      <span className="text-xs font-bold">Closing: {fmt(closingBalance)}</span>
                      <button onClick={addLine} className="px-3 py-1 text-xs bg-teal-50 text-teal-600 border border-teal-200 rounded">+ Add Line</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500"><tr>{['Date','Description','Reference','Credit (In)','Debit (Out)','Balance',''].map(h=><th key={h} className="px-2 py-2 text-left">{h}</th>)}</tr></thead>
                      <tbody>
                        {form.lines.map((line,i)=>(
                          <tr key={i} className="border-b">
                            <td className="px-1 py-1"><input type="date" className="border rounded px-2 py-1 text-xs w-28" value={line.transactionDate} onChange={e=>updateLine(i,'transactionDate',e.target.value)} /></td>
                            <td className="px-1 py-1"><input className="border rounded px-2 py-1 text-xs w-48" value={line.description} onChange={e=>updateLine(i,'description',e.target.value)} placeholder="Transaction description" /></td>
                            <td className="px-1 py-1"><input className="border rounded px-2 py-1 text-xs w-32 font-mono" value={line.referenceNumber} onChange={e=>updateLine(i,'referenceNumber',e.target.value)} placeholder="UTR/Cheque" /></td>
                            <td className="px-1 py-1"><input type="number" className="border rounded px-2 py-1 text-xs w-24 text-green-700" value={line.creditAmount} onChange={e=>updateLine(i,'creditAmount',e.target.value)} placeholder="0" /></td>
                            <td className="px-1 py-1"><input type="number" className="border rounded px-2 py-1 text-xs w-24 text-red-700" value={line.debitAmount} onChange={e=>updateLine(i,'debitAmount',e.target.value)} placeholder="0" /></td>
                            <td className="px-1 py-1"><input type="number" className="border rounded px-2 py-1 text-xs w-24" value={line.balance} onChange={e=>updateLine(i,'balance',e.target.value)} placeholder="0" /></td>
                            <td className="px-1 py-1"><button onClick={()=>removeLine(i)} className="text-red-400 hover:text-red-600 text-lg">×</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={()=>setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Importing...':'Import Statement'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
