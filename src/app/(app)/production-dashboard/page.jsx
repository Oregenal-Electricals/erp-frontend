'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
export default function ProductionDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    if (!getToken()) { setLoading(false); return; }
    fetch(`${API}/production-dashboard`, {headers:{Authorization:`Bearer ${getToken()}`}})
      .then(r=>r.ok?r.json():null).then(d=>{ setData(d); setLoading(false); })
      .catch(()=>setLoading(false));
  },[]);
  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Production Dashboard</h1><p className="text-gray-500 text-sm mt-1">Real-time production metrics, OEE and work orders</p></div>
        {loading?<div className="text-center py-20 text-gray-400">Loading dashboard...</div>:
        data?(
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {label:'Active Work Orders',value:data.activeWorkOrders||0,color:'bg-blue-50 text-blue-700'},
                {label:'Today Output',value:data.todayOutput||0,color:'bg-green-50 text-green-700'},
                {label:'OEE %',value:(data.oee||0)+'%',color:'bg-orange-50 text-orange-700'},
                {label:'Pending Orders',value:data.pendingOrders||0,color:'bg-yellow-50 text-yellow-700'},
              ].map(s=>(
                <div key={s.label} className={`${s.color} rounded-xl p-5 border text-center`}>
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-xs mt-1 opacity-70">{s.label}</div>
                </div>
              ))}
            </div>
            {data.workOrders&&(
              <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
                <div className="p-4 border-b font-bold text-gray-700">Recent Work Orders</div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['WO No','Product','Qty','Status'].map(h=><th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y">
                    {data.workOrders.map((w,i)=>(
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-xs">{w.woNumber}</td>
                        <td className="px-4 py-2">{w.product}</td>
                        <td className="px-4 py-2">{w.qty}</td>
                        <td className="px-4 py-2"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{w.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ):(
          <div className="bg-white rounded-xl border shadow-sm p-16 text-center">
            <div className="text-5xl mb-4">🏭</div>
            <div className="text-gray-400">Production data will appear here once work orders are created.</div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
