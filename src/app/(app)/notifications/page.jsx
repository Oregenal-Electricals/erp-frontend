'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';

const TYPE_CONFIG = {
  SO_CREATED:      { icon:'📋', color:'bg-blue-100 text-blue-700',   label:'Sales Order' },
  PO_APPROVED:     { icon:'✅', color:'bg-green-100 text-green-700',  label:'PO Approved' },
  INVOICE_OVERDUE: { icon:'⚠️', color:'bg-red-100 text-red-700',     label:'Overdue Invoice' },
  CREDIT_HOLD:     { icon:'🚨', color:'bg-red-100 text-red-700',     label:'Credit Hold' },
  STOCK_LOW:       { icon:'📦', color:'bg-orange-100 text-orange-700',label:'Low Stock' },
  DISPATCH_DONE:   { icon:'🚚', color:'bg-purple-100 text-purple-700',label:'Dispatch' },
  PAYMENT_RECEIVED:{ icon:'💰', color:'bg-green-100 text-green-700',  label:'Payment' },
  QUALITY_ALERT:   { icon:'🔍', color:'bg-yellow-100 text-yellow-700',label:'Quality' },
  TASK_ASSIGNED:   { icon:'📌', color:'bg-indigo-100 text-indigo-700',label:'Task' },
};

const PRIORITY_COLORS = { LOW:'border-l-gray-300', MEDIUM:'border-l-blue-400', HIGH:'border-l-orange-400', URGENT:'border-l-red-500' };
const PRIORITY_DOTS = { LOW:'bg-gray-300', MEDIUM:'bg-blue-400', HIGH:'bg-orange-400', URGENT:'bg-red-500' };

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (filter==='unread') params.set('unreadOnly','true');
    const [nRes, cRes] = await Promise.all([
      fetch(`${API}/notifications?${params}`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/notifications/unread-count`, {headers:{Authorization:`Bearer ${getToken()}`}}),
    ]);
    if (nRes.ok) { const d=await nRes.json(); setNotifications(d.data||[]); setTotal(d.total); setTotalPages(d.totalPages||1); setUnreadCount(d.unreadCount||0); }
    if (cRes.ok) { const d=await cRes.json(); setUnreadCount(d.unreadCount); }
    setLoading(false);
  }

  useEffect(()=>{ fetchAll(); },[page,filter]);

  async function handleMarkRead(ids) {
    const body = ids ? {ids} : {};
    const res = await fetch(`${API}/notifications/mark-read`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    if (res.ok) { fetchAll(); }
  }

  async function handleClearOld() {
    const res = await fetch(`${API}/notifications/clear-old`,{method:'POST',headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) fetchAll();
  }

  const getConfig = type => TYPE_CONFIG[type] || { icon:'🔔', color:'bg-gray-100 text-gray-600', label:type };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">{unreadCount}</span>}
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && <button onClick={()=>handleMarkRead()} className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">Mark All Read</button>}
            <button onClick={handleClearOld} className="px-3 py-2 text-sm text-gray-500 border rounded-lg hover:bg-gray-50">Clear Old</button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
          {[{key:'all',label:'All'},{key:'unread',label:`Unread (${unreadCount})`}].map(f=>(
            <button key={f.key} onClick={()=>{setFilter(f.key);setPage(1);}} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter===f.key?'bg-white shadow text-gray-800':'text-gray-500'}`}>{f.label}</button>
          ))}
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-16 text-gray-400">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🔔</div>
              <div className="text-gray-500 font-medium">{filter==='unread'?'No unread notifications':'No notifications yet'}</div>
              <div className="text-gray-400 text-sm mt-1">Notifications will appear here when actions occur in the system</div>
            </div>
          ) : notifications.map(n => {
            const cfg = getConfig(n.type);
            return (
              <div key={n.id} className={`bg-white rounded-xl border-l-4 ${PRIORITY_COLORS[n.priority]} shadow-sm p-4 ${!n.isRead?'border border-blue-100 bg-blue-50/30':''} hover:shadow-md transition-shadow`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-xl mt-0.5">{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800 text-sm">{n.title}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOTS[n.priority]}`}></span>
                          {n.priority}
                        </span>
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>{fmtDate(n.createdAt)}</span>
                        {n.referenceNumber && <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{n.referenceNumber}</span>}
                        {n.isRead && n.readAt && <span>Read {fmtDate(n.readAt)}</span>}
                      </div>
                    </div>
                  </div>
                  {!n.isRead && (
                    <button onClick={()=>handleMarkRead([n.id])} className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap px-2 py-1 rounded hover:bg-blue-50">Mark read</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button>
            <span className="px-3 py-1 text-sm text-gray-500">{page} of {totalPages}</span>
            <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
