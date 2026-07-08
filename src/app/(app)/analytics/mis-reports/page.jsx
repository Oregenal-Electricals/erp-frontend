'use client';
import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtNum = n => Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});

const REPORTS = [
  { key:'sales-summary', label:'Sales Summary', icon:'📋', desc:'Sales orders, invoices and revenue by period', params:['period'] },
  { key:'purchase-summary', label:'Purchase Summary', icon:'🛒', desc:'Purchase orders, bills and spend by period', params:['period'] },
  { key:'stock-position', label:'Stock Position', icon:'📦', desc:'Current stock levels across all warehouses', params:[] },
  { key:'outstanding-ar', label:'Outstanding AR', icon:'💰', desc:'Unpaid customer invoices and aging', params:['customerName'] },
  { key:'outstanding-ap', label:'Outstanding AP', icon:'🧾', desc:'Unpaid vendor bills and aging', params:['vendorName'] },
  { key:'ncr-summary', label:'NCR Summary', icon:'🔍', desc:'Non-conformance reports by period', params:['period'] },
  { key:'production-summary', label:'Production Summary', icon:'⚙️', desc:'Work order completion and output by period', params:['period'] },
  { key:'gst-summary', label:'GST Summary', icon:'📊', desc:'GST input vs output and net liability', params:['period'] },
];

const PERIOD_OPTIONS = [
  {value:'1',label:'This Month'},
  {value:'3',label:'Last 3 Months'},
  {value:'6',label:'Last 6 Months'},
  {value:'12',label:'Last 12 Months'},
];

function SummaryCard({ label, value, color='bg-gray-50' }) {
  return (
    <div className={`${color} rounded-lg p-3 text-center`}>
      <div className="text-sm font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

export default function MisReportsPage() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [params, setParams] = useState({ period:'3', customerName:'', vendorName:'', fromDate:'', toDate:'' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function runReport() {
    if (!selectedReport) return;
    setLoading(true); setError(''); setData(null);
    const q = new URLSearchParams();
    if (params.period) q.set('period', params.period);
    if (params.customerName) q.set('customerName', params.customerName);
    if (params.vendorName) q.set('vendorName', params.vendorName);
    if (params.fromDate) q.set('fromDate', params.fromDate);
    if (params.toDate) q.set('toDate', params.toDate);
    const res = await fetch(`${API}/mis-reports/${selectedReport.key}?${q}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setData(await res.json());
    else { const d=await res.json(); setError(d.message||'Failed'); }
    setLoading(false);
  }

  async function exportExcel() {
    if (!data) return;
    const rows = getRows();
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r=>headers.map(h=>JSON.stringify(r[h]||'')).join(','))].join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`${selectedReport.key}-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function getRows() {
    if (!data) return [];
    if (data.items) return data.items;
    if (data.salesOrders) return [...(data.salesOrders||[]), ...(data.invoices||[])];
    if (data.purchaseOrders) return [...(data.purchaseOrders||[]), ...(data.bills||[])];
    if (data.salesData) return [...(data.salesData||[]), ...(data.purchaseData||[])];
    return [];
  }

  function renderSummary() {
    if (!data?.summary) return null;
    const s = data.summary;
    const cards = [];
    Object.entries(s).forEach(([k,v]) => {
      if (typeof v === 'object') return;
      const isAmount = k.toLowerCase().includes('amount')||k.toLowerCase().includes('revenue')||k.toLowerCase().includes('spend')||k.toLowerCase().includes('gst')||k.toLowerCase().includes('value')||k.toLowerCase().includes('outstanding')||k.toLowerCase().includes('profit')||k.toLowerCase().includes('credit')||k.toLowerCase().includes('payable');
      const label = k.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase());
      cards.push({label, value: isAmount?fmt(v):fmtNum(v), color: k.includes('outstanding')||k.includes('overdue')?'bg-orange-50':k.includes('revenue')||k.includes('passed')||k.includes('completed')?'bg-green-50':'bg-blue-50'});
    });
    return cards;
  }

  function renderTable() {
    const rows = getRows();
    if (!rows.length) return <div className="text-center py-8 text-gray-400">No records found</div>;
    const keys = Object.keys(rows[0]).filter(k => typeof rows[0][k] !== 'object');
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>{keys.map(k=><th key={k} className="px-3 py-2 text-left text-gray-500 uppercase font-semibold whitespace-nowrap">{k.replace(/([A-Z])/g,' $1')}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row,i)=>(
              <tr key={i} className="hover:bg-gray-50">
                {keys.map(k=>{
                  const val = row[k];
                  const isAmount = k.toLowerCase().includes('amount')||k.toLowerCase().includes('revenue')||k.toLowerCase().includes('price')||k.toLowerCase().includes('cost')||k.toLowerCase().includes('gst')||k.toLowerCase().includes('value')||k.toLowerCase().includes('outstanding');
                  const isDate = k.toLowerCase().includes('date')||k.toLowerCase().includes('at');
                  const isStatus = k==='status'||k==='severity'||k==='source';
                  return (
                    <td key={k} className="px-3 py-2 whitespace-nowrap">
                      {isDate ? fmtDate(val)
                      : isAmount ? <span className="font-medium text-blue-600">{fmt(val)}</span>
                      : isStatus ? <span className="px-2 py-0.5 rounded text-xs bg-gray-100 font-medium">{val}</span>
                      : typeof val==='boolean' ? (val?'✅':'❌')
                      : String(val||'—')}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const summaryCards = renderSummary();

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">MIS Report Builder</h1>
            <p className="text-gray-500 text-sm mt-1">Select a report, set filters and run — export to CSV/Excel</p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Report Selector */}
          <div className="col-span-12 md:col-span-4">
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b"><h2 className="font-bold text-gray-700 text-sm">Available Reports</h2></div>
              <div className="divide-y">
                {REPORTS.map(r=>(
                  <button key={r.key} onClick={()=>{setSelectedReport(r);setData(null);setError('');}} className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${selectedReport?.key===r.key?'bg-indigo-50 border-r-4 border-indigo-600':''}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{r.icon}</span>
                      <div>
                        <div className={`text-sm font-semibold ${selectedReport?.key===r.key?'text-indigo-700':'text-gray-800'}`}>{r.label}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{r.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Report Config + Output */}
          <div className="col-span-12 md:col-span-8 space-y-4">
            {selectedReport ? (
              <>
                {/* Filters */}
                <div className="bg-white rounded-xl border shadow-sm p-5">
                  <h2 className="font-bold text-gray-700 mb-4">{selectedReport.icon} {selectedReport.label}</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedReport.params.includes('period') && (
                      <div className="col-span-2 md:col-span-1">
                        <label className="block text-xs text-gray-500 mb-1">Period</label>
                        <select className="w-full border rounded-lg px-3 py-2 text-sm" value={params.period} onChange={e=>setParams(p=>({...p,period:e.target.value}))}>
                          {PERIOD_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    )}
                    {selectedReport.params.includes('customerName') && (
                      <div className="col-span-2 md:col-span-1">
                        <label className="block text-xs text-gray-500 mb-1">Customer Name (optional)</label>
                        <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Filter by customer..." value={params.customerName} onChange={e=>setParams(p=>({...p,customerName:e.target.value}))} />
                      </div>
                    )}
                    {selectedReport.params.includes('vendorName') && (
                      <div className="col-span-2 md:col-span-1">
                        <label className="block text-xs text-gray-500 mb-1">Vendor Name (optional)</label>
                        <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Filter by vendor..." value={params.vendorName} onChange={e=>setParams(p=>({...p,vendorName:e.target.value}))} />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">From Date (optional)</label>
                      <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={params.fromDate} onChange={e=>setParams(p=>({...p,fromDate:e.target.value}))} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">To Date (optional)</label>
                      <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={params.toDate} onChange={e=>setParams(p=>({...p,toDate:e.target.value}))} />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={runReport} disabled={loading} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{loading?'Running...':'▶ Run Report'}</button>
                    {data && <button onClick={exportExcel} className="px-4 py-2 border border-green-300 text-green-700 rounded-lg text-sm hover:bg-green-50">⬇ Export CSV</button>}
                  </div>
                  {error && <div className="mt-3 bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                </div>

                {/* Results */}
                {data && (
                  <div className="bg-white rounded-xl border shadow-sm">
                    <div className="p-4 border-b flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-gray-700">{selectedReport.label} Results</h3>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {data.period && `Period: ${fmtDate(data.period.from)} to ${fmtDate(data.period.to)}`}
                          {data.asOf && `As of: ${fmtDate(data.asOf)}`}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{getRows().length} records</span>
                    </div>

                    {summaryCards?.length > 0 && (
                      <div className="p-4 border-b">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {summaryCards.map((c,i)=><SummaryCard key={i} label={c.label} value={c.value} color={c.color} />)}
                        </div>
                      </div>
                    )}

                    <div className="max-h-96 overflow-y-auto">
                      {renderTable()}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl border shadow-sm p-16 text-center">
                <div className="text-5xl mb-4">📊</div>
                <div className="text-gray-500 font-medium">Select a report from the left</div>
                <div className="text-gray-400 text-sm mt-2">Choose any of the 8 pre-built MIS reports to get started</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
