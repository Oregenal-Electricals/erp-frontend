'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
export default function QualityDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    if (!getToken()) { setLoading(false); return; }
    fetch(`${API}/quality-dashboard`, {headers:{Authorization:`Bearer ${getToken()}`}})
      .then(r=>r.ok?r.json():null).then(d=>{ setData(d); setLoading(false); })
      .catch(()=>setLoading(false));
  },[]);
  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Quality Dashboard</h1><p className="text-gray-500 text-sm mt-1">IQC, PQC, OQC metrics and NCR tracking</p></div>
        {loading?<div className="text-center py-20 text-gray-400">Loading dashboard...</div>:
        data?(
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {label:'Open NCRs',value:data.openNcrs||0,color:'bg-red-50 text-red-700'},
                {label:'IQC Pending',value:data.iqcPending||0,color:'bg-yellow-50 text-yellow-700'},
                {label:'Pass Rate %',value:(data.passRate||0)+'%',color:'bg-green-50 text-green-700'},
                {label:'Open CAPAs',value:data.openCapas||0,color:'bg-orange-50 text-orange-700'},
              ].map(s=>(
                <div key={s.label} className={`${s.color} rounded-xl p-5 border text-center`}>
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-xs mt-1 opacity-70">{s.label}</div>
                </div>
              ))}
            </div>
            {data.recentNcrs&&(
              <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
                <div className="p-4 border-b font-bold text-gray-700">Recent NCRs</div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['NCR No','Description','Severity','Status'].map(h=><th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y">
                    {data.recentNcrs.map((n,i)=>(
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-xs">{n.ncrNumber}</td>
                        <td className="px-4 py-2">{n.description}</td>
                        <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs ${n.severity==='CRITICAL'?'bg-red-100 text-red-700':'bg-yellow-100 text-yellow-700'}`}>{n.severity}</span></td>
                        <td className="px-4 py-2"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{n.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ):(
          <div className="bg-white rounded-xl border shadow-sm p-16 text-center">
            <div className="text-5xl mb-4">✅</div>
            <div className="text-gray-400">Quality data will appear here once inspections are recorded.</div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
