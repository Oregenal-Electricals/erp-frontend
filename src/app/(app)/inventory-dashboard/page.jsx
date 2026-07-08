'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;
export default function InventoryDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    if (!getToken()) { setLoading(false); return; }
    fetch(`${API}/inventory-dashboard`, {headers:{Authorization:`Bearer ${getToken()}`}})
      .then(r=>r.ok?r.json():null).then(d=>{ setData(d); setLoading(false); })
      .catch(()=>setLoading(false));
  },[]);
  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Inventory Dashboard</h1><p className="text-gray-500 text-sm mt-1">Real-time inventory metrics and stock levels</p></div>
        {loading?<div className="text-center py-20 text-gray-400">Loading dashboard...</div>:
        data?(
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {label:'Total SKUs',value:data.totalItems||0,color:'bg-blue-50 text-blue-700'},
                {label:'Total Stock Value',value:fmt(data.totalValue||0),color:'bg-green-50 text-green-700'},
                {label:'Low Stock Items',value:data.lowStockCount||0,color:'bg-red-50 text-red-700'},
                {label:'Categories',value:data.categories||0,color:'bg-purple-50 text-purple-700'},
              ].map(s=>(
                <div key={s.label} className={`${s.color} rounded-xl p-5 border text-center`}>
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-xs mt-1 opacity-70">{s.label}</div>
                </div>
              ))}
            </div>
            {data.stockByCategory&&(
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-bold text-gray-700 mb-4">Stock by Category</h3>
                <div className="space-y-2">
                  {data.stockByCategory.map((c,i)=>(
                    <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                      <span className="text-gray-600">{c.category}</span>
                      <div className="flex gap-4 text-sm">
                        <span className="text-gray-500">{c.count} items</span>
                        <span className="font-bold text-green-600">{fmt(c.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ):(
          <div className="bg-white rounded-xl border shadow-sm p-16 text-center">
            <div className="text-5xl mb-4">📦</div>
            <div className="text-gray-400">Inventory data will appear here once stock is recorded.</div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
