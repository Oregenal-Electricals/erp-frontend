'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';

const STATUS_COLORS = {APPROVED:'bg-blue-100 text-blue-700',SENT:'bg-yellow-100 text-yellow-700',CLOSED:'bg-green-100 text-green-700',DRAFT:'bg-gray-100 text-gray-500',CANCELLED:'bg-red-100 text-red-600'};

export default function VendorPortalPage() {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [pos, setPos] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [loading, setLoading] = useState(false);

  useEffect(()=>{
    if (!getToken()) return;
    fetch(`${API}/vendors?limit=200`, {headers:{Authorization:`Bearer ${getToken()}`}})
      .then(r=>r.ok?r.json():null).then(d=>{ if(d) setVendors(d.data||d||[]); });
  },[]);

  useEffect(()=>{
    if (!selectedVendor) return;
    setLoading(true);
    Promise.all([
      fetch(`${API}/vendor-portal/dashboard/${selectedVendor}`, {headers:{Authorization:`Bearer ${getToken()}`}}).then(r=>r.ok?r.json():null),
      fetch(`${API}/vendor-portal/purchase-orders/${selectedVendor}`, {headers:{Authorization:`Bearer ${getToken()}`}}).then(r=>r.ok?r.json():null),
      fetch(`${API}/vendor-portal/rfqs/${selectedVendor}`, {headers:{Authorization:`Bearer ${getToken()}`}}).then(r=>r.ok?r.json():null),
    ]).then(([dash, poData, rfqData])=>{
      setDashboard(dash);
      setPos(poData?.data||[]);
      setRfqs(rfqData||[]);
      setLoading(false);
    });
  },[selectedVendor]);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Vendor Portal</h1>
          <p className="text-gray-500 text-sm mt-1">View vendor POs, RFQs and quotations</p>
        </div>

        <div className="mb-6">
          <label className="block text-xs text-gray-500 mb-1">Select Vendor</label>
          <select className="border rounded-lg px-3 py-2 text-sm w-80" value={selectedVendor} onChange={e=>setSelectedVendor(e.target.value)}>
            <option value="">— Select Vendor —</option>
            {vendors.map(v=><option key={v.id} value={v.id}>{v.name} ({v.code})</option>)}
          </select>
        </div>

        {selectedVendor && (
          <>
            <div className="flex gap-2 mb-4 border-b">
              {['Dashboard','Purchase Orders','RFQs'].map(t=>(
                <button key={t} onClick={()=>setActiveTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab===t?'border-indigo-600 text-indigo-600':'border-transparent text-gray-500'}`}>{t}</button>
              ))}
            </div>

            {loading?<div className="text-center py-10 text-gray-400">Loading...</div>:(
              <>
                {activeTab==='Dashboard' && dashboard && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        {label:'Open POs',value:dashboard.stats?.openPOs||0,color:'bg-blue-50 text-blue-700'},
                        {label:'Pending RFQs',value:dashboard.stats?.pendingRFQs||0,color:'bg-yellow-50 text-yellow-700'},
                        {label:'Total POs',value:dashboard.stats?.totalPOs||0,color:'bg-green-50 text-green-700'},
                      ].map(s=>(
                        <div key={s.label} className={`${s.color} rounded-xl p-5 border text-center`}>
                          <div className="text-2xl font-bold">{s.value}</div>
                          <div className="text-xs mt-1 opacity-70">{s.label}</div>
                        </div>
                      ))}
                    </div>
                    {dashboard.recentPOs?.length>0&&(
                      <div className="bg-white rounded-xl border shadow-sm">
                        <div className="p-4 border-b font-bold text-gray-700">Recent Purchase Orders</div>
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['PO No','Amount','Status','Date'].map(h=><th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
                          <tbody className="divide-y">
                            {dashboard.recentPOs.map((p,i)=>(
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-2 font-mono text-xs text-blue-600">{p.poNumber}</td>
                                <td className="px-4 py-2 font-bold text-green-600">{fmt(p.totalAmount)}</td>
                                <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[p.status]||'bg-gray-100'}`}>{p.status}</span></td>
                                <td className="px-4 py-2 text-xs text-gray-400">{fmtDate(p.createdAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab==='Purchase Orders' && (
                  <div className="bg-white rounded-xl border shadow-sm">
                    {pos.length===0?<div className="text-center py-10 text-gray-400">No purchase orders found.</div>:(
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['PO No','Amount','Status','Date'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                        <tbody className="divide-y">
                          {pos.map((p,i)=>(
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-xs text-blue-600">{p.poNumber}</td>
                              <td className="px-4 py-2 font-bold text-green-600">{fmt(p.totalAmount)}</td>
                              <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[p.status]||'bg-gray-100'}`}>{p.status}</span></td>
                              <td className="px-4 py-2 text-xs text-gray-400">{fmtDate(p.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {activeTab==='RFQs' && (
                  <div className="bg-white rounded-xl border shadow-sm">
                    {rfqs.length===0?<div className="text-center py-10 text-gray-400">No RFQs found.</div>:(
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['RFQ No','Status','Date'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                        <tbody className="divide-y">
                          {rfqs.map((r,i)=>(
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-xs text-blue-600">{r.rfqNumber}</td>
                              <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[r.status]||'bg-gray-100'}`}>{r.status}</span></td>
                              <td className="px-4 py-2 text-xs text-gray-400">{fmtDate(r.createdAt)}</td>
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

        {!selectedVendor && (
          <div className="bg-white rounded-xl border shadow-sm p-16 text-center">
            <div className="text-5xl mb-4">🏪</div>
            <div className="text-gray-400">Select a vendor to view their portal</div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
