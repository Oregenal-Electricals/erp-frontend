'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
const TABS = ['Dashboard','Credit Limits','Credit Holds'];

function UtilBar({ pct }) {
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-orange-400' : pct >= 50 ? 'bg-yellow-400' : 'bg-green-500';
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all`} style={{width:`${Math.min(100,pct)}%`}}></div>
    </div>
  );
}

export default function CreditControlPage() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [limits, setLimits] = useState([]);
  const [holds, setHolds] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [releaseModal, setReleaseModal] = useState(null);
  const [releaseReason, setReleaseReason] = useState('');
  const [checkModal, setCheckModal] = useState(false);
  const [form, setForm] = useState({ customerName:'', creditLimit:'', creditDays:30, notes:'' });
  const [checkForm, setCheckForm] = useState({ customerName:'', orderAmount:'' });
  const [checkResult, setCheckResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const [dRes, sRes] = await Promise.all([
      fetch(`${API}/credit-control/dashboard`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/credit-control/stats`, {headers:{Authorization:`Bearer ${getToken()}`}}),
    ]);
    if (dRes.ok) { const d = await dRes.json(); setDashboard(d); setLimits(d.limits||[]); }
    if (sRes.ok) setStats(await sRes.json());
    const hRes = await fetch(`${API}/credit-control/holds`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (hRes.ok) setHolds(await hRes.json());
    setLoading(false);
  }

  useEffect(()=>{ fetchAll(); },[]);

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { ...form, creditLimit:parseFloat(form.creditLimit)||0, creditDays:parseInt(form.creditDays)||30 };
    if (!body.notes) delete body.notes;
    const res = await fetch(`${API}/credit-control/limits`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    setSaving(false);
  }

  async function handleUpdate() {
    setSaving(true); setError('');
    const body = { creditLimit:parseFloat(editModal.creditLimit)||0, creditDays:parseInt(editModal.creditDays)||30, notes:editModal.notes };
    const res = await fetch(`${API}/credit-control/limits/${editModal.id}`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    const data = await res.json();
    if (res.ok) { setEditModal(null); fetchAll(); }
    else setError(data.message||'Failed');
    setSaving(false);
  }

  async function handleRelease() {
    if (!releaseReason) { alert('Enter release reason'); return; }
    const res = await fetch(`${API}/credit-control/holds/${releaseModal}/release`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify({releaseReason})});
    if (res.ok) { setReleaseModal(null); setReleaseReason(''); fetchAll(); }
    else { const d=await res.json(); alert(d.message); }
  }

  async function handleCheck() {
    setSaving(true); setCheckResult(null);
    const body = { customerName:checkForm.customerName, orderAmount:parseFloat(checkForm.orderAmount)||0 };
    const res = await fetch(`${API}/credit-control/check`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    if (res.ok) setCheckResult(await res.json());
    setSaving(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Credit Control</h1>
            <p className="text-gray-500 text-sm mt-1">Customer credit limits, real-time AR exposure and hold management</p>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>{setCheckForm({customerName:'',orderAmount:''});setCheckResult(null);setCheckModal(true);}} className="px-4 py-2 border border-blue-300 text-blue-600 rounded-lg text-sm hover:bg-blue-50">Credit Check</button>
            <button onClick={()=>{setForm({customerName:'',creditLimit:'',creditDays:30,notes:''});setError('');setShowModal(true);}} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm">+ Set Credit Limit</button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              {label:'Customers with Limits',value:stats.totalLimits,color:'bg-blue-50'},
              {label:'Total Holds',value:stats.totalHolds,color:'bg-gray-50'},
              {label:'Active Holds',value:stats.activeHolds,color:stats.activeHolds>0?'bg-red-50':'bg-green-50'},
              {label:'Value on Hold',value:fmt(stats.holdValue),color:stats.holdValue>0?'bg-orange-50':'bg-gray-50'},
            ].map(s=>(
              <div key={s.label} className={`${s.color} rounded-xl p-4 text-center`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-4 border-b">
          {TABS.map(t=><button key={t} onClick={()=>setActiveTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab===t?'border-blue-600 text-blue-600':'border-transparent text-gray-500'}`}>{t}</button>)}
        </div>

        {activeTab==='Dashboard' && dashboard && (
          <div className="space-y-4">
            {dashboard.overLimit.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="font-bold text-red-700 mb-2">🚨 Over Credit Limit ({dashboard.overLimit.length})</div>
                {dashboard.overLimit.map(c=>(
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-red-100 text-sm">
                    <span className="font-medium text-red-700">{c.customerName}</span>
                    <span>Limit: {fmt(c.creditLimit)}</span>
                    <span className="font-bold text-red-600">Outstanding: {fmt(c.outstandingAmount)}</span>
                    <span className="text-red-500">Excess: {fmt(c.outstandingAmount-c.creditLimit)}</span>
                  </div>
                ))}
              </div>
            )}
            {dashboard.atRisk.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="font-bold text-orange-700 mb-2">⚠ At Risk — 80%+ Utilized ({dashboard.atRisk.length})</div>
                {dashboard.atRisk.map(c=>(
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-orange-100 text-sm">
                    <span className="font-medium">{c.customerName}</span>
                    <div className="w-32"><UtilBar pct={c.utilizationPct} /></div>
                    <span className="text-orange-600 font-bold">{c.utilizationPct}% used</span>
                    <span>Available: {fmt(c.availableCredit)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <div className="font-bold text-gray-700 mb-3">Portfolio Summary</div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 rounded-lg p-3"><div className="text-lg font-bold">{fmt(dashboard.totalExposure)}</div><div className="text-xs text-gray-500">Total AR Exposure</div></div>
                <div className="bg-gray-50 rounded-lg p-3"><div className="text-lg font-bold">{fmt(dashboard.totalLimit)}</div><div className="text-xs text-gray-500">Total Credit Limit</div></div>
                <div className={`rounded-lg p-3 ${dashboard.utilizationPct>=80?'bg-red-50':dashboard.utilizationPct>=50?'bg-yellow-50':'bg-green-50'}`}><div className="text-lg font-bold">{dashboard.utilizationPct}%</div><div className="text-xs text-gray-500">Portfolio Utilization</div></div>
              </div>
            </div>
          </div>
        )}

        {activeTab==='Credit Limits' && (
          <div className="bg-white rounded-xl shadow-sm border">
            {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
            : limits.length===0 ? <div className="text-center py-10 text-gray-400">No credit limits set. Click "+ Set Credit Limit" to add one.</div>
            : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Customer','Credit Limit','Outstanding','Available','Utilization','Days','Status','Action'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {limits.map(l=>(
                    <tr key={l.id} className={`hover:bg-gray-50 ${l.isOverLimit?'bg-red-50':''}`}>
                      <td className="px-4 py-3 font-medium">{l.customerName}</td>
                      <td className="px-4 py-3">{fmt(l.creditLimit)}</td>
                      <td className={`px-4 py-3 font-bold ${l.isOverLimit?'text-red-600':'text-gray-700'}`}>{fmt(l.outstandingAmount)}</td>
                      <td className={`px-4 py-3 font-bold ${l.availableCredit===0?'text-red-600':'text-green-600'}`}>{fmt(l.availableCredit)}</td>
                      <td className="px-4 py-3 w-36">
                        <div className="flex items-center gap-2">
                          <UtilBar pct={l.utilizationPct} />
                          <span className="text-xs whitespace-nowrap">{l.utilizationPct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">{l.creditDays}d</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${l.isOverLimit?'bg-red-100 text-red-700':l.utilizationPct>=80?'bg-orange-100 text-orange-700':'bg-green-100 text-green-700'}`}>{l.isOverLimit?'OVER LIMIT':l.utilizationPct>=80?'AT RISK':'HEALTHY'}</span></td>
                      <td className="px-4 py-3"><button onClick={()=>setEditModal({...l})} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab==='Credit Holds' && (
          <div className="bg-white rounded-xl shadow-sm border">
            {holds.length===0 ? <div className="text-center py-10 text-gray-400">No credit holds</div>
            : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Customer','Reference','Hold Amount','Outstanding','Limit','Status','Reason','Action'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {holds.map(h=>(
                    <tr key={h.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{h.customerName}</td>
                      <td className="px-4 py-3 font-mono text-xs">{h.referenceNumber}<div className="text-gray-400">{h.referenceType}</div></td>
                      <td className="px-4 py-3 font-bold text-orange-600">{fmt(h.holdAmount)}</td>
                      <td className="px-4 py-3 text-xs">{fmt(h.outstandingAtHold)}</td>
                      <td className="px-4 py-3 text-xs">{fmt(h.creditLimitAtHold)}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-bold ${h.status==='HELD'?'bg-red-100 text-red-700':h.status==='RELEASED'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{h.status}</span></td>
                      <td className="px-4 py-3 text-xs max-w-xs truncate text-gray-500">{h.releaseReason||h.holdReason}</td>
                      <td className="px-4 py-3">{h.status==='HELD'&&<button onClick={()=>{setReleaseModal(h.id);setReleaseReason('');}} className="px-2 py-1 text-xs bg-green-600 text-white rounded">Release</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* CREATE MODAL */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between"><h2 className="text-lg font-bold">Set Credit Limit</h2><button onClick={()=>setShowModal(false)} className="text-gray-400 text-xl">✕</button></div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div><label className="block text-sm text-gray-600 mb-1">Customer Name *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.customerName} onChange={e=>setForm(f=>({...f,customerName:e.target.value}))} /></div>
                <div><label className="block text-sm text-gray-600 mb-1">Credit Limit (₹) *</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.creditLimit} onChange={e=>setForm(f=>({...f,creditLimit:e.target.value}))} /></div>
                <div><label className="block text-sm text-gray-600 mb-1">Credit Days</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.creditDays} onChange={e=>setForm(f=>({...f,creditDays:e.target.value}))} /></div>
                <div><label className="block text-sm text-gray-600 mb-1">Notes</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={()=>setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Saving...':'Set Limit'}</button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT MODAL */}
        {editModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between"><h2 className="text-lg font-bold">Edit Credit Limit — {editModal.customerName}</h2><button onClick={()=>setEditModal(null)} className="text-gray-400 text-xl">✕</button></div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div><label className="block text-sm text-gray-600 mb-1">Credit Limit (₹)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={editModal.creditLimit} onChange={e=>setEditModal(m=>({...m,creditLimit:e.target.value}))} /></div>
                <div><label className="block text-sm text-gray-600 mb-1">Credit Days</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={editModal.creditDays} onChange={e=>setEditModal(m=>({...m,creditDays:e.target.value}))} /></div>
                <div><label className="block text-sm text-gray-600 mb-1">Notes</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={editModal.notes||''} onChange={e=>setEditModal(m=>({...m,notes:e.target.value}))} /></div>
                <div className="bg-blue-50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Current Outstanding:</span><span className="font-bold text-orange-600">{fmt(editModal.outstandingAmount)}</span></div>
                  <div className="flex justify-between mt-1"><span className="text-gray-500">New Available:</span><span className="font-bold text-green-600">{fmt(Math.max(0,(parseFloat(editModal.creditLimit)||0)-(editModal.outstandingAmount||0)))}</span></div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={()=>setEditModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleUpdate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Saving...':'Update'}</button>
              </div>
            </div>
          </div>
        )}

        {/* RELEASE MODAL */}
        {releaseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b"><h2 className="text-lg font-bold text-green-700">Release Credit Hold</h2></div>
              <div className="p-6">
                <label className="block text-sm text-gray-600 mb-2">Release Reason *</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={releaseReason} onChange={e=>setReleaseReason(e.target.value)} placeholder="Management override / payment received / etc." />
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={()=>setReleaseModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleRelease} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Release Hold</button>
              </div>
            </div>
          </div>
        )}

        {/* CREDIT CHECK MODAL */}
        {checkModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between"><h2 className="text-lg font-bold text-blue-700">Credit Check</h2><button onClick={()=>setCheckModal(false)} className="text-gray-400 text-xl">✕</button></div>
              <div className="p-6 space-y-4">
                <div><label className="block text-sm text-gray-600 mb-1">Customer Name</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={checkForm.customerName} onChange={e=>setCheckForm(f=>({...f,customerName:e.target.value}))} /></div>
                <div><label className="block text-sm text-gray-600 mb-1">Order Amount (₹)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={checkForm.orderAmount} onChange={e=>setCheckForm(f=>({...f,orderAmount:e.target.value}))} /></div>
                <button onClick={handleCheck} disabled={saving} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Checking...':'Run Credit Check'}</button>
                {checkResult && (
                  <div className={`rounded-xl p-4 ${checkResult.allowed?'bg-green-50 border border-green-200':'bg-red-50 border border-red-200'}`}>
                    <div className={`text-lg font-bold mb-2 ${checkResult.allowed?'text-green-700':'text-red-700'}`}>{checkResult.allowed?'✅ CREDIT APPROVED':'❌ CREDIT BLOCKED'}</div>
                    <div className="text-sm text-gray-700 mb-3">{checkResult.reason}</div>
                    {checkResult.position.hasLimit && (
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-gray-500">Credit Limit:</span><span>{fmt(checkResult.position.creditLimit)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Outstanding:</span><span>{fmt(checkResult.position.outstandingAmount)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Available:</span><span className={checkResult.position.availableCredit>0?'text-green-600':'text-red-600'}>{fmt(checkResult.position.availableCredit)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">This Order:</span><span>{fmt(parseFloat(checkForm.orderAmount)||0)}</span></div>
                        <div className="mt-2"><UtilBar pct={checkResult.position.utilizationPct} /></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
