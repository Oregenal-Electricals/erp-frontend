'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const STATUS_COLORS = {CONFIRMED:'bg-blue-100 text-blue-700',IN_PROGRESS:'bg-yellow-100 text-yellow-700',COMPLETED:'bg-green-100 text-green-700',DRAFT:'bg-gray-100 text-gray-500',CANCELLED:'bg-red-100 text-red-600',DISPATCHED:'bg-indigo-100 text-indigo-700'};

export default function CustomerPortalPage() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [orders, setOrders] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [loading, setLoading] = useState(false);

  useEffect(()=>{
    if (!getToken()) return;
    fetch(`${API}/customer-po?limit=200`, {headers:{Authorization:`Bearer ${getToken()}`}})
      .then(r=>r.ok?r.json():null).then(d=>{ if(d) setCustomers(d.data||d||[]); });
  },[]);

  useEffect(()=>{
    if (!selectedCustomer) return;
    setLoading(true);
    Promise.all([
      fetch(`${API}/customer-portal/dashboard/${selectedCustomer}`, {headers:{Authorization:`Bearer ${getToken()}`}}).then(r=>r.ok?r.json():null),
      fetch(`${API}/customer-portal/orders/${selectedCustomer}`, {headers:{Authorization:`Bearer ${getToken()}`}}).then(r=>r.ok?r.json():null),
      fetch(`${API}/customer-portal/dispatches/${selectedCustomer}`, {headers:{Authorization:`Bearer ${getToken()}`}}).then(r=>r.ok?r.json():null),
      fetch(`${API}/customer-portal/complaints/${selectedCustomer}`, {headers:{Authorization:`Bearer ${getToken()}`}}).then(r=>r.ok?r.json():null),
    ]).then(([dash, orderData, dispatchData, complaintData])=>{
      setDashboard(dash);
      setOrders(orderData?.data||[]);
      setDispatches(dispatchData||[]);
      setComplaints(complaintData||[]);
      setLoading(false);
    });
  },[selectedCustomer]);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Customer Portal</h1>
          <p className="text-gray-500 text-sm mt-1">View customer orders, dispatches and complaints</p>
        </div>

        <div className="mb-6">
          <label className="block text-xs text-gray-500 mb-1">Select Customer</label>
          <select className="border rounded-lg px-3 py-2 text-sm w-80" value={selectedCustomer} onChange={e=>setSelectedCustomer(e.target.value)}>
            <option value="">— Select Customer —</option>
            {customers.map(c=><option key={c.id} value={c.id}>{c.customerName} ({c.cpoNumber})</option>)}
          </select>
        </div>

        {selectedCustomer && (
          <>
            <div className="flex gap-2 mb-4 border-b">
              {['Dashboard','Orders','Dispatches','Complaints'].map(t=>(
                <button key={t} onClick={()=>setActiveTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab===t?'border-indigo-600 text-indigo-600':'border-transparent text-gray-500'}`}>{t}</button>
              ))}
            </div>

            {loading?<div className="text-center py-10 text-gray-400">Loading...</div>:(
              <>
                {activeTab==='Dashboard' && dashboard && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        {label:'Open Orders',value:dashboard.stats?.openOrders||0,color:'bg-blue-50 text-blue-700'},
                        {label:'Pending Deliveries',value:dashboard.stats?.pendingDeliveries||0,color:'bg-yellow-50 text-yellow-700'},
                        {label:'Total Orders',value:dashboard.stats?.totalOrders||0,color:'bg-green-50 text-green-700'},
                      ].map(s=>(
                        <div key={s.label} className={`${s.color} rounded-xl p-5 border text-center`}>
                          <div className="text-2xl font-bold">{s.value}</div>
                          <div className="text-xs mt-1 opacity-70">{s.label}</div>
                        </div>
                      ))}
                    </div>
                    {dashboard.recentOrders?.length>0&&(
                      <div className="bg-white rounded-xl border shadow-sm">
                        <div className="p-4 border-b font-bold text-gray-700">Recent Orders</div>
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['SO No','Amount','Status','Date'].map(h=><th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
                          <tbody className="divide-y">
                            {dashboard.recentOrders.map((o,i)=>(
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-2 font-mono text-xs text-blue-600">{o.soNumber}</td>
                                <td className="px-4 py-2 font-bold text-green-600">{fmt(o.totalAmount)}</td>
                                <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[o.status]||'bg-gray-100'}`}>{o.status}</span></td>
                                <td className="px-4 py-2 text-xs text-gray-400">{fmtDate(o.createdAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab==='Orders' && (
                  <div className="bg-white rounded-xl border shadow-sm">
                    {orders.length===0?<div className="text-center py-10 text-gray-400">No orders found.</div>:(
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['SO No','Amount','Status','Date'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                        <tbody className="divide-y">
                          {orders.map((o,i)=>(
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-xs text-blue-600">{o.soNumber}</td>
                              <td className="px-4 py-2 font-bold">{fmt(o.totalAmount)}</td>
                              <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[o.status]||'bg-gray-100'}`}>{o.status}</span></td>
                              <td className="px-4 py-2 text-xs text-gray-400">{fmtDate(o.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {activeTab==='Dispatches' && (
                  <div className="bg-white rounded-xl border shadow-sm">
                    {dispatches.length===0?<div className="text-center py-10 text-gray-400">No dispatches found.</div>:(
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Dispatch No','Status','Date'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                        <tbody className="divide-y">
                          {dispatches.map((d,i)=>(
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-xs">{d.dispatchNumber}</td>
                              <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[d.status]||'bg-gray-100'}`}>{d.status}</span></td>
                              <td className="px-4 py-2 text-xs text-gray-400">{fmtDate(d.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {activeTab==='Complaints' && (
                  <div className="bg-white rounded-xl border shadow-sm">
                    {complaints.length===0?<div className="text-center py-10 text-gray-400">No complaints found.</div>:(
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Complaint No','Description','Status','Date'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                        <tbody className="divide-y">
                          {complaints.map((c,i)=>(
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-xs">{c.complaintNumber}</td>
                              <td className="px-4 py-2 text-sm">{c.description?.substring(0,50)}...</td>
                              <td className="px-4 py-2"><span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">{c.status}</span></td>
                              <td className="px-4 py-2 text-xs text-gray-400">{fmtDate(c.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {!selectedCustomer && (
          <div className="bg-white rounded-xl border shadow-sm p-16 text-center">
            <div className="text-5xl mb-4">🏢</div>
            <div className="text-gray-400">Select a customer to view their portal</div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
