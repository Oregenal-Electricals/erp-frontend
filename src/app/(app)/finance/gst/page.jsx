'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TABS = ['Dashboard','GSTR-1','GSTR-3B','Returns'];

function getPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
}

export default function GstPage() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [period, setPeriod] = useState(getPeriod());
  const [dashboard, setDashboard] = useState(null);
  const [gstr1, setGstr1] = useState(null);
  const [gstr3b, setGstr3b] = useState(null);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  async function fetchDashboard() {
    setLoading(true);
    const [dRes, rRes] = await Promise.all([
      fetch(`${API}/gst/dashboard?period=${period}`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/gst/returns`, {headers:{Authorization:`Bearer ${getToken()}`}}),
    ]);
    if (dRes.ok) setDashboard(await dRes.json());
    if (rRes.ok) setReturns(await rRes.json());
    setLoading(false);
  }

  async function fetchGstr1() {
    setLoading(true);
    const res = await fetch(`${API}/gst/gstr1?period=${period}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setGstr1(await res.json());
    setLoading(false);
  }

  async function fetchGstr3b() {
    setLoading(true);
    const res = await fetch(`${API}/gst/gstr3b?period=${period}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setGstr3b(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    if (!getToken()) return;
    if (activeTab==='Dashboard') fetchDashboard();
    else if (activeTab==='GSTR-1') fetchGstr1();
    else if (activeTab==='GSTR-3B') fetchGstr3b();
    else if (activeTab==='Returns') fetch(`${API}/gst/returns`,{headers:{Authorization:`Bearer ${getToken()}`}}).then(r=>r.ok&&r.json()).then(d=>d&&setReturns(d));
  }, [activeTab, period]);

  async function handleGenerate(returnType) {
    setGenerating(true);
    const res = await fetch(`${API}/gst/returns/generate`, {
      method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},
      body: JSON.stringify({ returnType, period }),
    });
    const data = await res.json();
    if (res.ok) { alert(`${returnType} for ${period} generated successfully`); fetchDashboard(); }
    else alert(data.message||'Failed');
    setGenerating(false);
  }

  async function handleFile(id, returnType) {
    if (!confirm(`File ${returnType} for ${period}? This cannot be undone.`)) return;
    const res = await fetch(`${API}/gst/returns/${id}/file`, {
      method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},
      body: JSON.stringify({ remarks:`Filed ${returnType} for ${period}` }),
    });
    if (res.ok) { alert('Return filed successfully'); fetchDashboard(); }
    else { const d = await res.json(); alert(d.message||'Failed'); }
  }

  const periodReturn = (type) => returns.find(r=>r.returnType===type && r.period===period);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">GST Management</h1>
            <p className="text-gray-500 text-sm mt-1">GSTR-1, GSTR-3B, Input Tax Credit and return filing</p>
          </div>
          <div className="flex items-center gap-3">
            <select className="border rounded-lg px-3 py-2 text-sm" value={period} onChange={e=>setPeriod(e.target.value)}>
              {Array.from({length:12},(_,i)=>{
                const d = new Date(); d.setMonth(d.getMonth()-i);
                const p = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
                return <option key={p} value={p}>{MONTHS[d.getMonth()]} {d.getFullYear()}</option>;
              })}
            </select>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b">
          {TABS.map(t=><button key={t} onClick={()=>setActiveTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab===t?'border-green-600 text-green-600':'border-transparent text-gray-500'}`}>{t}</button>)}
        </div>

        {activeTab==='Dashboard' && dashboard && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <div className="text-xs text-blue-600 font-semibold mb-2">OUTPUT GST (Sales)</div>
                <div className="text-2xl font-bold text-blue-700">{fmt(dashboard.sales.totalOutputGst)}</div>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Taxable Sales:</span><span>{fmt(dashboard.sales.totalSales)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">CGST:</span><span>{fmt(dashboard.sales.totalOutputCgst)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">SGST:</span><span>{fmt(dashboard.sales.totalOutputSgst)}</span></div>
                  <div className="flex justify-between text-xs text-blue-500"><span>Invoices:</span><span>{dashboard.sales.invoiceCount}</span></div>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
                <div className="text-xs text-orange-600 font-semibold mb-2">INPUT TAX CREDIT (Purchases)</div>
                <div className="text-2xl font-bold text-orange-700">{fmt(dashboard.purchases.totalInputGst)}</div>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Taxable Purchases:</span><span>{fmt(dashboard.purchases.totalPurchases)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">CGST Credit:</span><span>{fmt(dashboard.purchases.totalInputCgst)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">SGST Credit:</span><span>{fmt(dashboard.purchases.totalInputSgst)}</span></div>
                  <div className="flex justify-between text-xs text-orange-500"><span>Bills:</span><span>{dashboard.purchases.billCount}</span></div>
                </div>
              </div>

              <div className={`${dashboard.netGstLiability>0?'bg-red-50 border-red-200':'bg-green-50 border-green-200'} border rounded-xl p-5`}>
                <div className={`text-xs font-semibold mb-2 ${dashboard.netGstLiability>0?'text-red-600':'text-green-600'}`}>
                  {dashboard.netGstLiability>0?'NET GST PAYABLE':'INPUT CREDIT BALANCE'}
                </div>
                <div className={`text-2xl font-bold ${dashboard.netGstLiability>0?'text-red-700':'text-green-700'}`}>
                  {fmt(dashboard.netGstLiability>0?dashboard.netGstLiability:dashboard.inputCredit)}
                </div>
                <div className="mt-3 space-y-2">
                  {['GSTR1','GSTR3B'].map(type=>{
                    const ret = periodReturn(type);
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">{type}:</span>
                        {ret ? (
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${ret.status==='FILED'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{ret.status}</span>
                            {ret.status==='DRAFT' && <button onClick={()=>handleFile(ret.id,type)} className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">File</button>}
                          </div>
                        ) : (
                          <button onClick={()=>handleGenerate(type)} disabled={generating} className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded disabled:opacity-50">Generate</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-semibold text-gray-700 mb-4">6-Month GST Trend</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>{['Period','Sales','Output GST','Purchases','Input GST','Net Liability'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {dashboard.monthly.map(m=>(
                      <tr key={m.period} className={`hover:bg-gray-50 ${m.period===period?'bg-blue-50 font-medium':''}`}>
                        <td className="px-3 py-2 text-xs font-mono font-bold">{m.period}</td>
                        <td className="px-3 py-2 text-xs">{fmt(m.sales)}</td>
                        <td className="px-3 py-2 text-xs text-blue-600">{fmt(m.outputGst)}</td>
                        <td className="px-3 py-2 text-xs">{fmt(m.purchases)}</td>
                        <td className="px-3 py-2 text-xs text-orange-600">{fmt(m.inputGst)}</td>
                        <td className={`px-3 py-2 text-xs font-bold ${m.netLiability>0?'text-red-600':'text-green-600'}`}>{fmt(m.netLiability)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab==='GSTR-1' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">GSTR-1 — Sales Register ({period})</h2>
              <button onClick={()=>handleGenerate('GSTR1')} disabled={generating} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{generating?'Generating...':'Generate Return'}</button>
            </div>
            {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
            : gstr1 && (
              <>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    {label:'Total Invoices',value:gstr1.summary.totalInvoices},
                    {label:'Taxable Value',value:fmt(gstr1.summary.totalSales)},
                    {label:'Total GST',value:fmt(gstr1.summary.totalGst)},
                    {label:'Invoice Value',value:fmt(gstr1.summary.totalValue)},
                  ].map(s=>(
                    <div key={s.label} className="bg-blue-50 rounded-lg p-3 text-center">
                      <div className="font-bold text-blue-700">{s.value}</div>
                      <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Invoice No','Date','Customer','Taxable','CGST','SGST','Total','Status'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                    <tbody className="divide-y">
                      {gstr1.invoices.map(inv=>(
                        <tr key={inv.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-xs text-blue-600 font-bold">{inv.invoiceNumber}</td>
                          <td className="px-3 py-2 text-xs">{fmtDate(inv.invoiceDate)}</td>
                          <td className="px-3 py-2 text-xs">{inv.customerName}</td>
                          <td className="px-3 py-2 text-xs">{fmt(inv.subtotal)}</td>
                          <td className="px-3 py-2 text-xs">{fmt(inv.totalGst/2)}</td>
                          <td className="px-3 py-2 text-xs">{fmt(inv.totalGst/2)}</td>
                          <td className="px-3 py-2 text-xs font-bold">{fmt(inv.totalAmount)}</td>
                          <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${inv.status==='PAID'?'bg-green-100 text-green-700':'bg-blue-100 text-blue-700'}`}>{inv.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {gstr1.invoices.length===0 && <div className="text-center py-8 text-gray-400">No invoices for this period</div>}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab==='GSTR-3B' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">GSTR-3B — Summary Return ({period})</h2>
              <button onClick={()=>handleGenerate('GSTR3B')} disabled={generating} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{generating?'Generating...':'Generate Return'}</button>
            </div>
            {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
            : gstr3b && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                    <h3 className="font-bold text-blue-700 mb-3">3.1 Outward Supplies (Sales)</h3>
                    <table className="w-full text-sm">
                      <tbody className="space-y-2">
                        {[
                          {label:'Taxable Value',value:fmt(gstr3b.outwardSupplies.taxableValue)},
                          {label:'CGST',value:fmt(gstr3b.outwardSupplies.cgst)},
                          {label:'SGST',value:fmt(gstr3b.outwardSupplies.sgst)},
                          {label:'IGST',value:fmt(gstr3b.outwardSupplies.igst)},
                          {label:'Total Tax',value:fmt(gstr3b.outwardSupplies.totalTax)},
                        ].map(r=>(
                          <tr key={r.label} className="border-b">
                            <td className="py-2 text-gray-600">{r.label}</td>
                            <td className="py-2 font-bold text-right">{r.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
                    <h3 className="font-bold text-orange-700 mb-3">4. Input Tax Credit (Purchases)</h3>
                    <table className="w-full text-sm">
                      <tbody>
                        {[
                          {label:'Taxable Value',value:fmt(gstr3b.inputTaxCredit.taxableValue)},
                          {label:'CGST Credit',value:fmt(gstr3b.inputTaxCredit.cgst)},
                          {label:'SGST Credit',value:fmt(gstr3b.inputTaxCredit.sgst)},
                          {label:'IGST Credit',value:fmt(gstr3b.inputTaxCredit.igst)},
                          {label:'Total Credit',value:fmt(gstr3b.inputTaxCredit.totalCredit)},
                        ].map(r=>(
                          <tr key={r.label} className="border-b">
                            <td className="py-2 text-gray-600">{r.label}</td>
                            <td className="py-2 font-bold text-right">{r.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className={`rounded-xl p-6 text-center ${gstr3b.taxPayable>0?'bg-red-50 border border-red-200':'bg-green-50 border border-green-200'}`}>
                  <div className={`text-sm font-semibold mb-1 ${gstr3b.taxPayable>0?'text-red-600':'text-green-600'}`}>{gstr3b.taxPayable>0?'NET GST PAYABLE TO GOVERNMENT':'EXCESS INPUT CREDIT (CARRY FORWARD)'}</div>
                  <div className={`text-4xl font-bold ${gstr3b.taxPayable>0?'text-red-700':'text-green-700'}`}>{fmt(gstr3b.taxPayable>0?gstr3b.taxPayable:gstr3b.excessCredit)}</div>
                  <div className="text-xs text-gray-500 mt-2">Period: {gstr3b.period} | {fmtDate(gstr3b.fromDate)} to {fmtDate(gstr3b.toDate)}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab==='Returns' && (
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-bold text-gray-800">GST Return Filing History</h2>
              <div className="flex gap-2">
                <button onClick={()=>handleGenerate('GSTR1')} disabled={generating} className="px-3 py-1 text-xs bg-blue-600 text-white rounded disabled:opacity-50">Generate GSTR1</button>
                <button onClick={()=>handleGenerate('GSTR3B')} disabled={generating} className="px-3 py-1 text-xs bg-green-600 text-white rounded disabled:opacity-50">Generate GSTR3B</button>
              </div>
            </div>
            {returns.length===0 ? <div className="text-center py-10 text-gray-400">No returns generated yet</div>
            : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Return Type','Period','Net Liability','Status','Filed Date','Action'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {returns.map(r=>(
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-sm">{r.returnType}</td>
                      <td className="px-4 py-3 font-mono text-sm">{r.period}</td>
                      <td className={`px-4 py-3 font-bold ${r.netGstLiability>0?'text-red-600':'text-green-600'}`}>{fmt(r.netGstLiability)}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${r.status==='FILED'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{r.status}</span></td>
                      <td className="px-4 py-3 text-xs">{fmtDate(r.filedDate)}</td>
                      <td className="px-4 py-3">
                        {r.status==='DRAFT' && <button onClick={()=>handleFile(r.id,r.returnType)} className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">File Now</button>}
                        {r.status==='FILED' && <span className="text-xs text-green-600">✅ Filed</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
