'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';
const fmt = n => Number(n||0).toLocaleString('en-IN');

const TABS = ['KPI Summary','NCR Report','CAPA Report','OQC Report','Supplier Report','Complaint Report'];
const SEV_COLORS = { MINOR:'bg-gray-100 text-gray-600', MAJOR:'bg-orange-100 text-orange-700', CRITICAL:'bg-red-100 text-red-700' };
const STATUS_COLORS_NCR = { OPEN:'bg-blue-100 text-blue-700', ROOT_CAUSE_PENDING:'bg-yellow-100 text-yellow-700', CAPA_PENDING:'bg-orange-100 text-orange-700', VERIFICATION_PENDING:'bg-purple-100 text-purple-700', CLOSED:'bg-green-100 text-green-700' };
const AVL_COLORS = { APPROVED:'bg-green-100 text-green-700', PROBATION:'bg-yellow-100 text-yellow-700', BLACKLISTED:'bg-red-100 text-red-700' };

export default function QualityReportsPage() {
  const [activeTab, setActiveTab] = useState('KPI Summary');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const endpoints = {
    'KPI Summary': 'kpi-summary',
    'NCR Report': 'ncr-report',
    'CAPA Report': 'capa-report',
    'OQC Report': 'oqc-report',
    'Supplier Report': 'supplier-report',
    'Complaint Report': 'complaint-report',
  };

  async function fetchData() {
    setLoading(true); setData(null);
    const params = new URLSearchParams();
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    const res = await fetch(`${API}/quality-reports/${endpoints[activeTab]}?${params}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [activeTab]);

  const KpiCard = ({label, value, sub, color='text-gray-800'}) => (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Quality Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Formal quality management reports for management review and compliance</p>
        </div>

        <div className="flex gap-2 mb-6 border-b overflow-x-auto">
          {TABS.map(t=>(
            <button key={t} onClick={()=>{setActiveTab(t);setData(null);}}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${activeTab===t?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {activeTab !== 'KPI Summary' && activeTab !== 'Supplier Report' && (
          <div className="bg-white rounded-xl border p-4 mb-4 flex gap-3 flex-wrap items-end">
            <div><label className="block text-xs text-gray-500 mb-1">From Date</label><input type="date" className="border rounded-lg px-3 py-2 text-sm" value={fromDate} onChange={e=>setFromDate(e.target.value)} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">To Date</label><input type="date" className="border rounded-lg px-3 py-2 text-sm" value={toDate} onChange={e=>setToDate(e.target.value)} /></div>
            <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Apply</button>
          </div>
        )}

        {loading && <div className="text-center py-12 text-gray-400">Generating report...</div>}

        {!loading && data && activeTab === 'KPI Summary' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <KpiCard label="NCR Closure Rate" value={`${data.ncr.closureRate}%`} sub={`${data.ncr.closed}/${data.ncr.total} closed`} color={data.ncr.closureRate>=80?'text-green-600':'text-orange-600'} />
              <KpiCard label="CAPA Effectiveness" value={`${data.capa.effectivenessRate}%`} sub={`${data.capa.overdue} overdue`} color={data.capa.effectivenessRate>=80?'text-green-600':'text-orange-600'} />
              <KpiCard label="OQC Pass Rate" value={`${data.oqc.passRate}%`} sub={`${fmt(data.oqc.totalSampled)} sampled`} color={data.oqc.passRate>=95?'text-green-600':data.oqc.passRate>=80?'text-yellow-600':'text-red-600'} />
              <KpiCard label="Complaint Closure" value={`${data.complaints.closureRate}%`} sub={`${data.complaints.closed}/${data.complaints.total} closed`} color={data.complaints.closureRate>=80?'text-green-600':'text-orange-600'} />
              <KpiCard label="Avg Supplier Score" value={data.supplier.avgScore} sub={`${data.supplier.blacklisted} blacklisted`} color={data.supplier.avgScore>=90?'text-green-600':data.supplier.avgScore>=75?'text-yellow-600':'text-red-600'} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Total NCRs" value={data.ncr.total} sub={`${data.ncr.open} open`} />
              <KpiCard label="Total CAPAs" value={data.capa.total} sub={`${data.capa.verified} verified`} />
              <KpiCard label="Total Complaints" value={data.complaints.total} sub={`${data.complaints.closed} closed`} />
              <KpiCard label="Suppliers Rated" value={data.supplier.totalRated} sub={`avg score: ${data.supplier.avgScore}`} />
            </div>
            <div className="bg-white rounded-xl border p-4 text-xs text-gray-400 text-right">Generated: {fmtDate(data.generatedAt)}</div>
          </div>
        )}

        {!loading && data && activeTab === 'NCR Report' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center"><div className="text-xl font-bold">{data.total}</div><div className="text-xs text-gray-500">Total NCRs</div></div>
              <div className="bg-orange-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-orange-600">{data.byStatus.find(s=>s.label!=='CLOSED')?.count||0}</div><div className="text-xs text-gray-500">Open</div></div>
              <div className="bg-green-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-green-600">{data.byStatus.find(s=>s.label==='CLOSED')?.count||0}</div><div className="text-xs text-gray-500">Closed</div></div>
              <div className="bg-blue-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-blue-600">{data.avgClosingDays}d</div><div className="text-xs text-gray-500">Avg Close Time</div></div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>{['NCR No.','Source','Severity','Status','Qty','Aging (days)','Closed Days','CAPAs'].map(h=><th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {data.data.map((n,i)=>(
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs text-red-600 font-bold">{n.ncrNumber}</td>
                      <td className="px-3 py-2 text-xs">{n.source}</td>
                      <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${SEV_COLORS[n.severity]}`}>{n.severity}</span></td>
                      <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS_NCR[n.status]}`}>{n.status?.replace(/_/g,' ')}</span></td>
                      <td className="px-3 py-2 text-xs">{n.qtyAffected}</td>
                      <td className={`px-3 py-2 text-xs font-bold ${n.agingDays>30?'text-red-600':n.agingDays>14?'text-orange-500':'text-gray-600'}`}>{n.agingDays}d</td>
                      <td className="px-3 py-2 text-xs text-green-600">{n.closedDays !== null ? `${n.closedDays}d` : '—'}</td>
                      <td className="px-3 py-2 text-xs">{n.verifiedCapas}/{n.totalCapas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && data && activeTab === 'CAPA Report' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[{label:'Total CAPAs',value:data.total},{label:'Completion Rate',value:data.completionRate+'%'},{label:'Overdue',value:data.overdueCount},{label:'Avg Days to Close',value:data.avgCompletionDays+'d'}].map(s=>(
                <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center"><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-gray-500">{s.label}</div></div>
              ))}
            </div>
            <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['CAPA No.','NCR','Assigned To','Due Date','Status','Days to Close','Overdue'].map(h=><th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {data.data.map((c,i)=>(
                    <tr key={i} className={`hover:bg-gray-50 ${c.isOverdue?'bg-red-50':''}`}>
                      <td className="px-3 py-2 font-mono text-xs text-orange-600 font-bold">{c.capaNumber}</td>
                      <td className="px-3 py-2 font-mono text-xs text-red-500">{c.ncr?.ncrNumber}</td>
                      <td className="px-3 py-2 text-xs">{c.assignedTo||'—'}</td>
                      <td className="px-3 py-2 text-xs">{fmtDate(c.dueDate)}</td>
                      <td className="px-3 py-2 text-xs"><span className={`px-2 py-0.5 rounded ${c.status==='VERIFIED'?'bg-green-100 text-green-700':c.status==='COMPLETED'?'bg-blue-100 text-blue-700':'bg-yellow-100 text-yellow-700'}`}>{c.status}</span></td>
                      <td className="px-3 py-2 text-xs">{c.daysToComplete !== null ? `${c.daysToComplete}d` : '—'}</td>
                      <td className="px-3 py-2 text-xs">{c.isOverdue?'⚠ YES':'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && data && activeTab === 'OQC Report' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[{label:'Inspections',value:data.total},{label:'Overall Pass Rate',value:data.overallPassRate+'%'},{label:'Total Sampled',value:fmt(data.totalSampled)},{label:'Total Failed',value:fmt(data.totalFailed)}].map(s=>(
                <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center"><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-gray-500">{s.label}</div></div>
              ))}
            </div>
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b font-semibold text-gray-700 text-sm">By Product</div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Item Code','Item Name','Inspections','Sampled','Passed','Failed','Pass Rate'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {data.byItem.map((b,i)=>(
                    <tr key={i}><td className="px-3 py-2 font-mono text-xs text-blue-600">{b.itemCode}</td><td className="px-3 py-2 text-xs">{b.itemName}</td><td className="px-3 py-2 text-xs">{b.inspections}</td><td className="px-3 py-2 text-xs">{b.sampled}</td><td className="px-3 py-2 text-xs text-green-600 font-bold">{b.passed}</td><td className="px-3 py-2 text-xs text-red-500">{b.failed}</td><td className={`px-3 py-2 text-xs font-bold ${b.passRate>=95?'text-green-600':b.passRate>=80?'text-yellow-600':'text-red-600'}`}>{b.passRate}%</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && data && activeTab === 'Supplier Report' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[{label:'Ratings',value:data.totalRatings},{label:'Avg Score',value:data.avgScore},{label:'Blacklisted',value:data.blacklisted},{label:'On Probation',value:data.probation}].map(s=>(
                <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center"><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-gray-500">{s.label}</div></div>
              ))}
            </div>
            <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Vendor','Period','Received','Rejected','Defect Rate','OTD%','Score','Grade','AVL Status'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {data.ratings.map((r,i)=>(
                    <tr key={i}><td className="px-3 py-2 text-xs font-medium">{r.vendor?.name}</td><td className="px-3 py-2 font-mono text-xs">{r.period}</td><td className="px-3 py-2 text-xs">{r.totalReceived}</td><td className="px-3 py-2 text-xs text-red-500">{r.totalRejected}</td><td className="px-3 py-2 text-xs font-bold">{r.defectRate}%</td><td className="px-3 py-2 text-xs">{r.onTimeDelivery}%</td><td className="px-3 py-2 text-xs font-bold">{r.qualityScore}</td><td className={`px-3 py-2 text-lg font-bold ${r.rating==='A'?'text-green-600':r.rating==='B'?'text-blue-600':r.rating==='C'?'text-yellow-600':'text-red-600'}`}>{r.rating}</td><td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${AVL_COLORS[r.avlStatus]}`}>{r.avlStatus}</span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && data && activeTab === 'Complaint Report' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[{label:'Total',value:data.total},{label:'Closure Rate',value:data.closureRate+'%'},{label:'Avg Response',value:data.avgResponseDays+'d'},{label:'Closed',value:data.data.filter(d=>d.status==='CLOSED').length}].map(s=>(
                <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center"><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-gray-500">{s.label}</div></div>
              ))}
            </div>
            <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['CC No.','Customer','Type','Severity','Qty','Status','Response Days','Closed'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {data.data.map((c,i)=>(
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs text-red-600 font-bold">{c.complaintNumber}</td>
                      <td className="px-3 py-2 text-xs font-medium">{c.customerName}</td>
                      <td className="px-3 py-2 text-xs">{c.complaintType?.replace(/_/g,' ')}</td>
                      <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${SEV_COLORS[c.severity]}`}>{c.severity}</span></td>
                      <td className="px-3 py-2 text-xs">{c.qtyAffected}</td>
                      <td className="px-3 py-2 text-xs"><span className={`px-2 py-0.5 rounded ${c.status==='CLOSED'?'bg-green-100 text-green-700':'bg-blue-100 text-blue-700'}`}>{c.status}</span></td>
                      <td className="px-3 py-2 text-xs">{c.responseDays !== null ? `${c.responseDays}d` : '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{fmtDate(c.closedDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && !data && <div className="text-center py-12 text-gray-400">Select a report tab to view data</div>}
      </div>
    </AppLayout>
  );
}
