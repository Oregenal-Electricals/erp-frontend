'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
export default function Page() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  useEffect(()=>{
    if (!getToken()) { setLoading(false); return; }
    fetch(`${API}/bom-revisions?limit=20`, {headers:{Authorization:`Bearer ${getToken()}`}})
      .then(r=>r.ok?r.json():null)
      .then(d=>{ if(d){ setData(d.data||d||[]); setTotal(d.total||(d.data||d||[]).length); } setLoading(false); })
      .catch(()=>setLoading(false));
  },[]);
  const filtered = data.filter(item=>JSON.stringify(item).toLowerCase().includes(search.toLowerCase()));
  const cols = filtered.length>0 ? Object.keys(filtered[0]).filter(k=>!['id','companyId','isActive','isTestData','createdBy','updatedBy','updatedAt'].includes(k)).slice(0,5) : [];
  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">🔄 BOM Revisions</h1><p className="text-gray-500 text-sm mt-1">{total} records</p></div>
        <div className="mb-4"><input className="border rounded-lg px-3 py-2 text-sm w-80" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
        <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
          {loading?<div className="text-center py-16 text-gray-400">Loading...</div>
          :filtered.length===0?<div className="text-center py-16"><div className="text-5xl mb-3">🔄</div><div className="text-gray-400">No records found.</div></div>:(
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>{cols.map(k=><th key={k} className="px-4 py-3 text-left">{k.replace(/([A-Z])/g,' $1').trim()}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((item,i)=>(
                  <tr key={i} className="hover:bg-gray-50">
                    {cols.map(k=><td key={k} className="px-4 py-3 text-gray-700">{String(item[k]??'—').substring(0,50)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
