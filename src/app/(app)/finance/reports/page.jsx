'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';
const fmtPct = n => `${Number(n||0).toFixed(2)}%`;
const TABS = ['Summary','Trial Balance','P&L Statement','Balance Sheet','Cash Flow'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
}

function SectionHeader({ title, total, color='text-gray-800' }) {
  return (
    <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded font-semibold text-sm mt-3">
      <span>{title}</span>
      <span className={color}>{fmt(total)}</span>
    </div>
  );
}

function AccountRow({ code, name, amount, subType, indent=0 }) {
  return (
    <div className="flex justify-between items-center py-1.5 px-3 hover:bg-gray-50 text-sm" style={{paddingLeft:`${12+indent*16}px`}}>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-gray-400 w-12">{code}</span>
        <span className="text-gray-700">{name}</span>
        {subType && <span className="text-xs bg-gray-100 text-gray-400 px-1 rounded">{subType}</span>}
      </div>
      <span className="font-medium">{fmt(amount)}</span>
    </div>
  );
}

export default function FinancialReportsPage() {
  const [activeTab, setActiveTab] = useState('Summary');
  const [period, setPeriod] = useState(getPeriod());
  const [summary, setSummary] = useState(null);
  const [trialBalance, setTrialBalance] = useState(null);
  const [pl, setPl] = useState(null);
  const [bs, setBs] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);
  const [loading, setLoading] = useState(false);

  async function fetchReport(tab, p) {
    if (!getToken()) return;
    setLoading(true);
    const q = `?period=${p}`;
    try {
      if (tab==='Summary') {
        const r = await fetch(`${API}/financial-reports/summary`, {headers:{Authorization:`Bearer ${getToken()}`}});
        if (r.ok) setSummary(await r.json());
      } else if (tab==='Trial Balance') {
        const r = await fetch(`${API}/financial-reports/trial-balance${q}`, {headers:{Authorization:`Bearer ${getToken()}`}});
        if (r.ok) setTrialBalance(await r.json());
      } else if (tab==='P&L Statement') {
        const r = await fetch(`${API}/financial-reports/profit-and-loss${q}`, {headers:{Authorization:`Bearer ${getToken()}`}});
        if (r.ok) setPl(await r.json());
      } else if (tab==='Balance Sheet') {
        const r = await fetch(`${API}/financial-reports/balance-sheet${q}`, {headers:{Authorization:`Bearer ${getToken()}`}});
        if (r.ok) setBs(await r.json());
      } else if (tab==='Cash Flow') {
        const r = await fetch(`${API}/financial-reports/cash-flow${q}`, {headers:{Authorization:`Bearer ${getToken()}`}});
        if (r.ok) setCashFlow(await r.json());
      }
    } catch(e) {}
    setLoading(false);
  }

  useEffect(() => { fetchReport(activeTab, period); }, [activeTab, period]);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
            <p className="text-gray-500 text-sm mt-1">Trial Balance, P&L, Balance Sheet and Cash Flow</p>
          </div>
          <select className="border rounded-lg px-3 py-2 text-sm" value={period} onChange={e=>setPeriod(e.target.value)}>
            {Array.from({length:12},(_,i)=>{
              const d=new Date(); d.setMonth(d.getMonth()-i);
              const p=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
              return <option key={p} value={p}>{MONTHS[d.getMonth()]} {d.getFullYear()}</option>;
            })}
          </select>
        </div>

        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
          {TABS.map(t=><button key={t} onClick={()=>setActiveTab(t)} className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${activeTab===t?'bg-white shadow text-indigo-600':'text-gray-500 hover:text-gray-700'}`}>{t}</button>)}
        </div>

        {loading && <div className="text-center py-16 text-gray-400">Computing report...</div>}

        {/* SUMMARY */}
        {!loading && activeTab==='Summary' && summary && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {label:'Revenue',value:fmt(summary.revenue),sub:'This month',color:'bg-blue-50 border-blue-200',tc:'text-blue-700'},
                {label:'Gross Profit',value:fmt(summary.grossProfit),sub:fmtPct(summary.grossMarginPct)+' margin',color:'bg-green-50 border-green-200',tc:'text-green-700'},
                {label:'Net Profit',value:fmt(summary.netProfit),sub:fmtPct(summary.netMarginPct)+' margin',color:summary.netProfit>=0?'bg-green-50 border-green-200':'bg-red-50 border-red-200',tc:summary.netProfit>=0?'text-green-700':'text-red-700'},
                {label:'Cash Balance',value:fmt(summary.cashBalance),sub:'Bank accounts',color:'bg-teal-50 border-teal-200',tc:'text-teal-700'},
              ].map(s=>(
                <div key={s.label} className={`${s.color} border rounded-xl p-5`}>
                  <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                  <div className={`text-2xl font-bold ${s.tc}`}>{s.value}</div>
                  <div className="text-xs text-gray-400 mt-1">{s.sub}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {label:'Total Assets',value:fmt(summary.totalAssets),color:'bg-gray-50'},
                {label:'Total Liabilities',value:fmt(summary.totalLiabilities),color:'bg-gray-50'},
                {label:'AR Outstanding',value:fmt(summary.arOutstanding),sub:summary.arCount+' invoices',color:summary.arOutstanding>0?'bg-orange-50':'bg-gray-50'},
                {label:'AP Outstanding',value:fmt(summary.apOutstanding),sub:summary.apCount+' bills',color:summary.apOutstanding>0?'bg-red-50':'bg-gray-50'},
              ].map(s=>(
                <div key={s.label} className={`${s.color} rounded-xl p-4 text-center`}>
                  <div className="text-base font-bold text-gray-800">{s.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                  {s.sub && <div className="text-xs text-gray-400">{s.sub}</div>}
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-bold text-gray-700 mb-3">Quick Actions</h3>
              <div className="flex gap-3">
                {['Trial Balance','P&L Statement','Balance Sheet','Cash Flow'].map(t=>(
                  <button key={t} onClick={()=>setActiveTab(t)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 text-indigo-600 border-indigo-200">{t} →</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TRIAL BALANCE */}
        {!loading && activeTab==='Trial Balance' && trialBalance && (
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <h2 className="font-bold text-gray-800">Trial Balance</h2>
                <div className="text-xs text-gray-500">{fmtDate(trialBalance.fromDate)} to {fmtDate(trialBalance.toDate)}</div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${trialBalance.isBalanced?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{trialBalance.isBalanced?'✅ Balanced':'⚠ UNBALANCED'}</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Code','Account','Type','Period Debit','Period Credit','Closing Balance'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                {trialBalance.rows.map((r,i)=>(
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs text-blue-600">{r.accountCode}</td>
                    <td className="px-4 py-2 text-sm">{r.accountName}</td>
                    <td className="px-4 py-2"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{r.accountType}</span></td>
                    <td className="px-4 py-2 text-sm text-red-600">{r.periodDebit>0?fmt(r.periodDebit):'-'}</td>
                    <td className="px-4 py-2 text-sm text-green-600">{r.periodCredit>0?fmt(r.periodCredit):'-'}</td>
                    <td className="px-4 py-2 text-sm font-bold">{fmt(r.closingBalance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold border-t-2">
                <tr>
                  <td className="px-4 py-3" colSpan={3}>TOTAL</td>
                  <td className="px-4 py-3 text-red-600">{fmt(trialBalance.totalDebit)}</td>
                  <td className="px-4 py-3 text-green-600">{fmt(trialBalance.totalCredit)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* P&L */}
        {!loading && activeTab==='P&L Statement' && pl && (
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b">
              <h2 className="font-bold text-gray-800">Profit & Loss Statement</h2>
              <div className="text-xs text-gray-500">{fmtDate(pl.fromDate)} to {fmtDate(pl.toDate)}</div>
            </div>
            <div className="p-6 max-w-2xl">
              <SectionHeader title="Revenue" total={pl.totalIncome} color="text-blue-700" />
              {pl.income.map((a,i)=><AccountRow key={i} code={a.accountCode} name={a.accountName} amount={a.amount} indent={1} />)}

              <SectionHeader title="Cost of Goods Sold" total={pl.totalCogs} color="text-orange-600" />
              {pl.cogs.map((a,i)=><AccountRow key={i} code={a.accountCode} name={a.accountName} amount={a.amount} indent={1} />)}

              <div className="flex justify-between items-center py-3 px-3 bg-blue-50 rounded font-bold text-sm mt-2">
                <span>Gross Profit</span>
                <div className="text-right">
                  <span className={pl.grossProfit>=0?'text-green-700':'text-red-700'}>{fmt(pl.grossProfit)}</span>
                  <span className="text-xs text-gray-400 ml-2">({fmtPct(pl.grossMarginPct)})</span>
                </div>
              </div>

              {pl.opex.length > 0 && <>
                <SectionHeader title="Operating Expenses" total={pl.totalOpex} color="text-red-600" />
                {pl.opex.map((a,i)=><AccountRow key={i} code={a.accountCode} name={a.accountName} amount={a.amount} indent={1} />)}
              </>}

              <div className={`flex justify-between items-center py-4 px-3 rounded font-bold text-base mt-3 border-t-2 ${pl.netProfit>=0?'bg-green-50':'bg-red-50'}`}>
                <span>NET {pl.netProfit>=0?'PROFIT':'LOSS'}</span>
                <div className="text-right">
                  <span className={pl.netProfit>=0?'text-green-700':'text-red-700'}>{fmt(Math.abs(pl.netProfit))}</span>
                  <span className="text-xs text-gray-400 ml-2">({fmtPct(pl.netMarginPct)})</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BALANCE SHEET */}
        {!loading && activeTab==='Balance Sheet' && bs && (
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b flex justify-between">
              <div>
                <h2 className="font-bold text-gray-800">Balance Sheet</h2>
                <div className="text-xs text-gray-500">As of {fmtDate(bs.asOf)}</div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${bs.isBalanced?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{bs.isBalanced?'✅ Balanced':'⚠ CHECK'}</span>
            </div>
            <div className="grid grid-cols-2 gap-0 divide-x">
              <div className="p-6">
                <div className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Assets</div>
                <SectionHeader title="All Assets" total={bs.assets.total} color="text-blue-700" />
                {bs.assets.items.filter(a=>a.balance!==0).map((a,i)=><AccountRow key={i} code={a.accountCode} name={a.accountName} amount={a.balance} subType={a.accountSubType} indent={1} />)}
                <div className="flex justify-between items-center py-3 px-3 bg-blue-100 rounded font-bold text-sm mt-3">
                  <span>TOTAL ASSETS</span>
                  <span className="text-blue-800">{fmt(bs.assets.total)}</span>
                </div>
              </div>
              <div className="p-6">
                <div className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Liabilities & Equity</div>
                <SectionHeader title="Liabilities" total={bs.liabilities.total} color="text-red-600" />
                {bs.liabilities.items.filter(a=>a.balance!==0).map((a,i)=><AccountRow key={i} code={a.accountCode} name={a.accountName} amount={a.balance} subType={a.accountSubType} indent={1} />)}
                <SectionHeader title="Equity" total={bs.equity.total + bs.equity.retainedEarnings} color="text-purple-700" />
                {bs.equity.items.map((a,i)=><AccountRow key={i} code={a.accountCode} name={a.accountName} amount={a.balance} indent={1} />)}
                <AccountRow code="RE" name="Retained Earnings (Current Period)" amount={bs.equity.retainedEarnings} indent={1} />
                <div className="flex justify-between items-center py-3 px-3 bg-purple-50 rounded font-bold text-sm mt-3">
                  <span>TOTAL LIABILITIES + EQUITY</span>
                  <span className="text-purple-800">{fmt(bs.totalLiabilitiesAndEquity)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CASH FLOW */}
        {!loading && activeTab==='Cash Flow' && cashFlow && (
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b">
              <h2 className="font-bold text-gray-800">Cash Flow Statement</h2>
              <div className="text-xs text-gray-500">{fmtDate(cashFlow.fromDate)} to {fmtDate(cashFlow.toDate)}</div>
            </div>
            <div className="p-6 max-w-3xl">
              <div className="flex justify-between py-3 px-4 bg-gray-50 rounded font-semibold text-sm mb-4">
                <span>Opening Bank Balance</span>
                <span className="font-bold">{fmt(cashFlow.openingBalance)}</span>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center py-2 px-4 bg-green-50 rounded font-semibold text-sm text-green-700 mb-2">
                  <span>Cash Receipts (+)</span>
                  <span>{fmt(cashFlow.totalReceipts)}</span>
                </div>
                {cashFlow.receipts.map((r,i)=>(
                  <div key={i} className="flex justify-between items-center py-1.5 px-6 text-sm hover:bg-gray-50 border-b">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-blue-600">{r.voucherNumber}</span>
                      <span className="text-gray-600">{r.party||r.voucherType}</span>
                      <span className="text-xs text-gray-400">{fmtDate(r.date)}</span>
                    </div>
                    <span className="text-green-600 font-medium">+{fmt(r.amount)}</span>
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center py-2 px-4 bg-red-50 rounded font-semibold text-sm text-red-600 mb-2">
                  <span>Cash Payments (-)</span>
                  <span>{fmt(cashFlow.totalPayments)}</span>
                </div>
                {cashFlow.payments.map((p,i)=>(
                  <div key={i} className="flex justify-between items-center py-1.5 px-6 text-sm hover:bg-gray-50 border-b">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-blue-600">{p.voucherNumber}</span>
                      <span className="text-gray-600">{p.party||p.voucherType}</span>
                      <span className="text-xs text-gray-400">{fmtDate(p.date)}</span>
                    </div>
                    <span className="text-red-600 font-medium">-{fmt(p.amount)}</span>
                  </div>
                ))}
              </div>

              <div className={`flex justify-between py-3 px-4 rounded font-semibold text-sm mb-2 ${cashFlow.netCashFlow>=0?'bg-green-50 text-green-700':'bg-red-50 text-red-600'}`}>
                <span>Net Cash Flow</span>
                <span className="font-bold">{cashFlow.netCashFlow>=0?'+':''}{fmt(cashFlow.netCashFlow)}</span>
              </div>
              <div className="flex justify-between py-4 px-4 bg-teal-50 rounded font-bold text-base">
                <span>Closing Bank Balance</span>
                <span className="text-teal-700">{fmt(cashFlow.closingBalance)}</span>
              </div>

              {cashFlow.bankAccounts?.length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
                  <div className="font-semibold mb-1">Bank Accounts:</div>
                  {cashFlow.bankAccounts.map((b,i)=>(
                    <div key={i} className="flex justify-between"><span>{b.name}</span><span className="font-bold">{fmt(b.balance)}</span></div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
