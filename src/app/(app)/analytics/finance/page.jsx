'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;
const fmtPct = n => `${Number(n||0).toFixed(1)}%`;

function KpiCard({ label, value, sub, color='bg-blue-50', textColor='text-blue-700' }) {
  return (
    <div className={`${color} rounded-xl p-5 border`}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function PLChart({ data }) {
  const maxVal = Math.max(...data.map(d=>Math.max(d.revenue||0, d.expense||0)), 1);
  return (
    <div className="flex items-end gap-1 h-36">
      {data.map((d,i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div className="w-full flex gap-0.5 items-end" style={{height:'100%'}}>
            <div className="flex-1 bg-blue-400 rounded-t transition-all" style={{height:`${Math.max(2,(d.revenue||0)/maxVal*100)}%`}} title={`Rev: ${fmt(d.revenue)}`}></div>
            <div className="flex-1 bg-red-300 rounded-t transition-all" style={{height:`${Math.max(2,(d.expense||0)/maxVal*100)}%`}} title={`Exp: ${fmt(d.expense)}`}></div>
            <div className={`flex-1 ${(d.profit||0)>=0?'bg-green-400':'bg-red-500'} rounded-t transition-all`} style={{height:`${Math.max(2,Math.abs(d.profit||0)/maxVal*100)}%`}} title={`P/L: ${fmt(d.profit)}`}></div>
          </div>
          <div className="text-xs text-gray-400 truncate w-full text-center">{d.month}</div>
        </div>
      ))}
    </div>
  );
}

function AgingBar({ data, title, color='bg-blue-500' }) {
  const total = Object.values(data).reduce((s,v)=>s+(v||0),0);
  if (!total) return (
    <div>
      <h4 className="font-semibold text-gray-700 text-sm mb-2">{title}</h4>
      <div className="text-center py-4 text-gray-400 text-sm">✅ No outstanding</div>
    </div>
  );
  return (
    <div>
      <h4 className="font-semibold text-gray-700 text-sm mb-3">{title} — Total: {fmt(total)}</h4>
      <div className="space-y-2">
        {[
          {label:'Current',key:'current',color:'bg-green-400'},
          {label:'1-30 days',key:'days1_30',color:'bg-yellow-400'},
          {label:'31-60 days',key:'days31_60',color:'bg-orange-400'},
          {label:'61-90 days',key:'days61_90',color:'bg-red-400'},
          {label:'90+ days',key:'over90',color:'bg-red-700'},
        ].map(a=>{
          const val = data[a.key]||0;
          const pct = total>0?Math.round(val/total*100):0;
          return val>0?(
            <div key={a.label} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-20">{a.label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-4">
                <div className={`${a.color} h-4 rounded-full`} style={{width:`${pct}%`}}></div>
              </div>
              <span className="text-xs font-bold w-24 text-right">{fmt(val)}</span>
              <span className="text-xs text-gray-400 w-8">{pct}%</span>
            </div>
          ):null;
        })}
      </div>
    </div>
  );
}

export default function FinanceAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const res = await fetch(`${API}/analytics/finance-deep`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(()=>{ fetchData(); }, []);

  const currentMonthPL = data?.plTrend?.[data.plTrend.length-1];

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Finance Analytics</h1>
            <p className="text-gray-500 text-sm mt-1">P&L trends, AR/AP aging, GST and cash flow analysis</p>
          </div>
          <button onClick={fetchData} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">↻ Refresh</button>
        </div>

        {loading ? <div className="text-center py-16 text-gray-400">Loading analytics...</div> : !data ? <div className="text-center py-16 text-gray-400">No data</div> : (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Total Revenue" value={fmt(data.kpis?.totalRevenue)} sub="All invoices" color="bg-blue-50" textColor="text-blue-700" />
              <KpiCard label="Gross Profit" value={fmt(data.kpis?.grossProfit)} sub={fmtPct(data.kpis?.profitMargin)+' margin'} color={data.kpis?.grossProfit>=0?'bg-green-50':'bg-red-50'} textColor={data.kpis?.grossProfit>=0?'text-green-700':'text-red-700'} />
              <KpiCard label="Bank Balance" value={fmt(data.kpis?.bankBalance)} sub="All bank accounts" color="bg-teal-50" textColor="text-teal-700" />
              <KpiCard label="Net GST Payable" value={fmt(data.kpis?.netGst)} sub={`Out: ${fmt(data.kpis?.outputGst)} In: ${fmt(data.kpis?.inputGst)}`} color="bg-purple-50" textColor="text-purple-700" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="AR Outstanding" value={fmt(data.kpis?.arOutstanding)} sub={`${data.kpis?.arCount} invoices`} color={data.kpis?.arOutstanding>0?'bg-orange-50':'bg-green-50'} textColor={data.kpis?.arOutstanding>0?'text-orange-700':'text-green-700'} />
              <KpiCard label="AP Outstanding" value={fmt(data.kpis?.apOutstanding)} sub={`${data.kpis?.apCount} bills`} color={data.kpis?.apOutstanding>0?'bg-red-50':'bg-green-50'} textColor={data.kpis?.apOutstanding>0?'text-red-700':'text-green-700'} />
              <KpiCard label="Total Vouchers" value={data.kpis?.totalVouchers} sub={`${data.kpis?.postedVouchers} posted`} color="bg-indigo-50" textColor="text-indigo-700" />
              <div className="bg-gray-50 rounded-xl p-5 border">
                <div className="text-xs text-gray-500 mb-1">This Month P&L</div>
                <div className={`text-2xl font-bold ${(currentMonthPL?.profit||0)>=0?'text-green-700':'text-red-700'}`}>{fmt(currentMonthPL?.profit||0)}</div>
                <div className="text-xs text-gray-400 mt-1">Rev: {fmt(currentMonthPL?.revenue||0)} · Exp: {fmt(currentMonthPL?.expense||0)}</div>
              </div>
            </div>

            {/* P&L Trend */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-700">P&L Trend (12 Months)</h3>
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-400 rounded"></span>Revenue</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-300 rounded"></span>Expense</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-400 rounded"></span>Profit</span>
                </div>
              </div>
              <PLChart data={data.plTrend||[]} />
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                <div className="bg-blue-50 rounded-lg p-2">
                  <div className="text-sm font-bold text-blue-700">{fmt(data.kpis?.totalRevenue)}</div>
                  <div className="text-xs text-gray-400">Total Revenue</div>
                </div>
                <div className="bg-red-50 rounded-lg p-2">
                  <div className="text-sm font-bold text-red-700">{fmt(data.kpis?.totalExpense)}</div>
                  <div className="text-xs text-gray-400">Total Expense</div>
                </div>
                <div className={`${data.kpis?.grossProfit>=0?'bg-green-50':'bg-red-50'} rounded-lg p-2`}>
                  <div className={`text-sm font-bold ${data.kpis?.grossProfit>=0?'text-green-700':'text-red-700'}`}>{fmt(data.kpis?.grossProfit)}</div>
                  <div className="text-xs text-gray-400">Net Profit ({fmtPct(data.kpis?.profitMargin)})</div>
                </div>
              </div>
            </div>

            {/* AR & AP Aging */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <AgingBar data={data.arAging||{}} title="AR Aging (Receivables)" color="bg-blue-400" />
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <AgingBar data={data.apAging||{}} title="AP Aging (Payables)" color="bg-red-400" />
              </div>
            </div>

            {/* GST Summary */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-bold text-gray-700 mb-4">GST Summary (Current Month)</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-blue-700">{fmt(data.kpis?.outputGst)}</div>
                  <div className="text-xs text-gray-500 mt-1">Output GST (Sales)</div>
                </div>
                <div className="bg-orange-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-orange-700">{fmt(data.kpis?.inputGst)}</div>
                  <div className="text-xs text-gray-500 mt-1">Input GST (Purchase)</div>
                </div>
                <div className={`${data.kpis?.netGst>0?'bg-red-50':'bg-green-50'} rounded-xl p-4`}>
                  <div className={`text-2xl font-bold ${data.kpis?.netGst>0?'text-red-700':'text-green-700'}`}>{fmt(data.kpis?.netGst)}</div>
                  <div className="text-xs text-gray-500 mt-1">Net GST Payable</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
