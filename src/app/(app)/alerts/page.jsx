'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—';
const TABS = ['Templates','Alert Log','Trigger Alert'];

const EVENT_TYPES = ['INVOICE_OVERDUE','DISPATCH_CREATED','PAYMENT_RECEIVED','CREDIT_HOLD','LOW_STOCK','PO_APPROVED','SO_CONFIRMED','DELIVERY_CONFIRMED','NCR_RAISED','CAPA_OVERDUE'];
const EVENT_ICONS = { INVOICE_OVERDUE:'⚠️', DISPATCH_CREATED:'🚚', PAYMENT_RECEIVED:'💰', CREDIT_HOLD:'🚨', LOW_STOCK:'📦', PO_APPROVED:'✅', SO_CONFIRMED:'📋', DELIVERY_CONFIRMED:'🎯', NCR_RAISED:'🔍', CAPA_OVERDUE:'⏰' };
const STATUS_COLORS = { SENT:'bg-green-100 text-green-700', FAILED:'bg-red-100 text-red-700', PENDING:'bg-yellow-100 text-yellow-700' };

export default function AlertsPage() {
  const [activeTab, setActiveTab] = useState('Templates');
  const [templates, setTemplates] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [logFilter, setLogFilter] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [triggerForm, setTriggerForm] = useState({ eventType:'INVOICE_OVERDUE', referenceNumber:'', variables:'' });
  const [triggerResult, setTriggerResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const logParams = new URLSearchParams({ page: logPage, limit: 20 });
    if (logFilter) logParams.set('status', logFilter);
    const [tRes, lRes, sRes] = await Promise.all([
      fetch(`${API}/alerts/templates`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/alerts/logs?${logParams}`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/alerts/stats`, {headers:{Authorization:`Bearer ${getToken()}`}}),
    ]);
    if (tRes.ok) setTemplates(await tRes.json());
    if (lRes.ok) { const d=await lRes.json(); setLogs(d.data||[]); setLogTotal(d.total); setLogTotalPages(d.totalPages||1); }
    if (sRes.ok) setStats(await sRes.json());
    setLoading(false);
  }

  useEffect(()=>{ fetchAll(); },[logPage, logFilter]);

  async function handleSeed() {
    setSeeding(true);
    const res = await fetch(`${API}/alerts/seed`,{method:'POST',headers:{Authorization:`Bearer ${getToken()}`}});
    const d = await res.json();
    alert(d.message);
    fetchAll();
    setSeeding(false);
  }

  async function handleUpdateTemplate() {
    setSaving(true); setError('');
    const body = { subject:editModal.subject, bodyTemplate:editModal.bodyTemplate, recipientEmails:editModal.recipientEmails, isActive:editModal.isActive };
    const res = await fetch(`${API}/alerts/templates/${editModal.id}`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    const data = await res.json();
    if (res.ok) { setEditModal(null); fetchAll(); }
    else setError(data.message||'Failed');
    setSaving(false);
  }

  async function handleTrigger() {
    setSaving(true); setTriggerResult(null);
    let variables = {};
    try { if (triggerForm.variables) variables = JSON.parse(triggerForm.variables); } catch(e) { setError('Variables must be valid JSON'); setSaving(false); return; }
    const body = { eventType:triggerForm.eventType, referenceNumber:triggerForm.referenceNumber||undefined, variables };
    const res = await fetch(`${API}/alerts/trigger`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    const data = await res.json();
    setTriggerResult(data);
    if (res.ok) fetchAll();
    setSaving(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alert Management</h1>
            <p className="text-gray-500 text-sm mt-1">Email/SMS alert templates, trigger history and configuration</p>
          </div>
          <button onClick={handleSeed} disabled={seeding} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">{seeding?'Seeding...':'Seed Default Templates'}</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[
              {label:'Active Templates',value:stats.activeTemplates,color:'bg-blue-50'},
              {label:'Total Sent',value:stats.total,color:'bg-gray-50'},
              {label:'Sent',value:stats.sent,color:'bg-green-50'},
              {label:'Failed',value:stats.failed,color:stats.failed>0?'bg-red-50':'bg-gray-50'},
              {label:'Pending',value:stats.pending,color:'bg-yellow-50'},
            ].map(s=>(
              <div key={s.label} className={`${s.color} rounded-lg p-3 text-center`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-4 border-b">
          {TABS.map(t=><button key={t} onClick={()=>setActiveTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab===t?'border-purple-600 text-purple-600':'border-transparent text-gray-500'}`}>{t}</button>)}
        </div>

        {activeTab==='Templates' && (
          <div className="space-y-3">
            {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
            : templates.length===0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">📧</div>
                <div className="text-gray-500">No templates yet. Click "Seed Default Templates" to get started.</div>
              </div>
            ) : templates.map(t=>(
              <div key={t.id} className={`bg-white rounded-xl border shadow-sm p-4 ${!t.isActive?'opacity-50':''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{EVENT_ICONS[t.eventType]||'🔔'}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-800">{t.eventType.replace(/_/g,' ')}</span>
                        <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">{t.channel}</span>
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{t.recipients}</span>
                        {!t.isActive && <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-600">INACTIVE</span>}
                      </div>
                      <div className="text-sm font-medium text-gray-700 mt-1">Subject: {t.subject}</div>
                      {t.recipientEmails && <div className="text-xs text-gray-400 mt-0.5">To: {t.recipientEmails}</div>}
                      <div className="text-xs text-gray-400 mt-1 line-clamp-2 font-mono bg-gray-50 p-2 rounded">{t.bodyTemplate.substring(0,150)}...</div>
                    </div>
                  </div>
                  <button onClick={()=>setEditModal({...t})} className="px-3 py-1 text-xs border rounded hover:bg-gray-50 whitespace-nowrap">Edit</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab==='Alert Log' && (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-4 border-b flex gap-3">
              <select className="border rounded-lg px-3 py-2 text-sm" value={logFilter} onChange={e=>{setLogFilter(e.target.value);setLogPage(1);}}>
                <option value="">All Status</option>
                {['SENT','FAILED','PENDING'].map(s=><option key={s}>{s}</option>)}
              </select>
              <span className="text-sm text-gray-500 self-center">{logTotal} logs</span>
            </div>
            {logs.length===0 ? <div className="text-center py-10 text-gray-400">No alert logs yet</div>
            : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Event','Channel','Recipient','Subject','Status','Sent At','Reference'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {logs.map(l=>(
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2"><span className="text-lg mr-1">{EVENT_ICONS[l.eventType]||'🔔'}</span><span className="text-xs">{l.eventType.replace(/_/g,' ')}</span></td>
                      <td className="px-4 py-2 text-xs">{l.channel}</td>
                      <td className="px-4 py-2 text-xs font-mono">{l.recipient}</td>
                      <td className="px-4 py-2 text-xs max-w-xs truncate">{l.subject||'—'}</td>
                      <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[l.status]}`}>{l.status}</span></td>
                      <td className="px-4 py-2 text-xs">{fmtDate(l.sentAt||l.createdAt)}</td>
                      <td className="px-4 py-2 font-mono text-xs text-blue-600">{l.referenceNumber||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {logTotalPages > 1 && (
              <div className="p-4 border-t flex justify-center gap-2">
                <button disabled={logPage===1} onClick={()=>setLogPage(p=>p-1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button>
                <span className="px-3 py-1 text-sm">{logPage} of {logTotalPages}</span>
                <button disabled={logPage===logTotalPages} onClick={()=>setLogPage(p=>p+1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
              </div>
            )}
          </div>
        )}

        {activeTab==='Trigger Alert' && (
          <div className="bg-white rounded-xl border shadow-sm p-6 max-w-2xl">
            <h2 className="font-bold text-gray-800 mb-4">Manually Trigger Alert</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Event Type *</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={triggerForm.eventType} onChange={e=>setTriggerForm(f=>({...f,eventType:e.target.value}))}>
                  {EVENT_TYPES.map(t=><option key={t} value={t}>{EVENT_ICONS[t]} {t.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Reference Number</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="INV-2026-0001" value={triggerForm.referenceNumber} onChange={e=>setTriggerForm(f=>({...f,referenceNumber:e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Variables (JSON)</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm font-mono" rows={6} value={triggerForm.variables} onChange={e=>setTriggerForm(f=>({...f,variables:e.target.value}))} placeholder='{"customerName":"Tech Solutions","invoiceNumber":"INV-2026-0001","amount":"335120","customerEmail":"ar@customer.com"}' />
                <div className="text-xs text-gray-400 mt-1">Variables replace {{placeholder}} in templates</div>
              </div>
              {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
              <button onClick={handleTrigger} disabled={saving} className="w-full py-2 bg-purple-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Triggering...':'Send Alert'}</button>
              {triggerResult && (
                <div className={`rounded-xl p-4 ${triggerResult.sent?'bg-green-50 border border-green-200':'bg-red-50 border border-red-200'}`}>
                  <div className={`font-bold mb-1 ${triggerResult.sent?'text-green-700':'text-red-700'}`}>{triggerResult.sent?'✅ Alert Sent':'❌ Alert Failed'}</div>
                  {triggerResult.sent ? <div className="text-sm text-gray-600">Sent to {triggerResult.recipientCount} recipient(s)</div>
                  : <div className="text-sm text-red-600">{triggerResult.reason}</div>}
                </div>
              )}
            </div>
          </div>
        )}

        {editModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <div>
                  <h2 className="text-lg font-bold">{editModal.eventType.replace(/_/g,' ')}</h2>
                  <div className="text-xs text-gray-400">{editModal.channel} → {editModal.recipients}</div>
                </div>
                <button onClick={()=>setEditModal(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div><label className="block text-sm text-gray-600 mb-1">Subject</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={editModal.subject} onChange={e=>setEditModal(m=>({...m,subject:e.target.value}))} /></div>
                <div><label className="block text-sm text-gray-600 mb-1">Body Template</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm font-mono" rows={8} value={editModal.bodyTemplate} onChange={e=>setEditModal(m=>({...m,bodyTemplate:e.target.value}))} /></div>
                <div><label className="block text-sm text-gray-600 mb-1">Recipient Emails (comma-separated)</label><input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="alerts@company.com, manager@company.com" value={editModal.recipientEmails||''} onChange={e=>setEditModal(m=>({...m,recipientEmails:e.target.value}))} /></div>
                <div className="flex items-center gap-2"><input type="checkbox" id="isActive" checked={editModal.isActive} onChange={e=>setEditModal(m=>({...m,isActive:e.target.checked}))} /><label htmlFor="isActive" className="text-sm text-gray-600">Active</label></div>
                <div className="bg-blue-50 rounded p-3 text-xs text-blue-700">
                  <div className="font-semibold mb-1">Available variables:</div>
                  <div className="font-mono">{"{{customerName}} {{invoiceNumber}} {{amount}} {{soNumber}} {{poNumber}} {{paymentMode}} {{transport}} {{lrNumber}}"}</div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={()=>setEditModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleUpdateTemplate} disabled={saving} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Saving...':'Save Template'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
