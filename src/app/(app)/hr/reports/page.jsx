'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const REPORTS = [
  {key:'headcount', label:'Headcount', icon:'👥', params:[]},
  {key:'attendance-summary', label:'Attendance Summary', icon:'📅', params:['month','year']},
  {key:'leave-utilization', label:'Leave Utilization', icon:'🌴', params:['year']},
  {key:'payroll-cost', label:'Payroll Cost', icon:'💰', params:['month','year']},
  {key:'attrition', label:'Attrition', icon:'📊', params:['year']},
  {key:'ot-report', label:'OT Report', icon:'⏰', params:['month','year']},
];

export default function HrReportsPage() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth()+1);
  const [year, setYear] = useState(now.getFullYear());

  async function fetchReport(report) {
    setLoading(true); setError(''); setData(null);
    const params = new URLSearchParams();
    if (report.params.includes('month')) params.set('month', month);
    if (report.params.includes('year')) params.set('year', year);
    const res = await fetch(`${API}/hr-reports/${report.key}?${params}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setData(await res.json());
    else { const d=await res.json(); setError(d.message||'Failed'); }
    setLoading(false);
  }

  function exportCsv() {
    if (!data) return;
    let rows = data.rows || data.byEmployee || data.entries || data.joinedEmployees || data.byDepartment || [];
    if (!rows.length) return;
    const headers = Object.keys(rows[0]).filter(k=>typeof rows[0][k]!=='object'&&!Array.isArray(rows[0][k]));
    const csv = [headers.join(','), ...rows.map(r=>headers.map(h=>JSON.stringify(r[h]||'')).join(','))].join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`${selectedReport.key}-${month||year}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">HR Reports</h1>
            <p className="text-gray-500 text-sm mt-1">Headcount, attendance, payroll cost, attrition and OT reports</p>
          </div>
          {data && <button onClick={exportCsv} className="px-4 py-2 border border-green-300 text-green-700 rounded-lg text-sm">⬇ Export CSV</button>}
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Report Selector */}
          <div className="col-span-12 md:col-span-3">
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b text-sm font-bold text-gray-700">Select Report</div>
              <div className="divide-y">
                {REPORTS.map(r=>(
                  <button key={r.key} onClick={()=>{setSelectedReport(r);setData(null);setError('');}} className={`w-full text-left p-4 hover:bg-gray-50 ${selectedReport?.key===r.key?'bg-indigo-50 border-r-4 border-indigo-600':''}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{r.icon}</span>
                      <span className={`text-sm font-medium ${selectedReport?.key===r.key?'text-indigo-700':'text-gray-700'}`}>{r.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Report Output */}
          <div className="col-span-12 md:col-span-9 space-y-4">
            {selectedReport ? (
              <>
                <div className="bg-white rounded-xl border shadow-sm p-4">
                  <div className="flex gap-3 items-end flex-wrap">
                    <h2 className="font-bold text-gray-800 mr-2">{selectedReport.icon} {selectedReport.label}</h2>
                    {selectedReport.params.includes('month') && (
                      <select className="border rounded-lg px-3 py-2 text-sm" value={month} onChange={e=>setMonth(Number(e.target.value))}>
                        {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
                      </select>
                    )}
                    {selectedReport.params.includes('year') && (
                      <input type="number" className="border rounded-lg px-3 py-2 text-sm w-24" value={year} onChange={e=>setYear(Number(e.target.value))} />
                    )}
                    <button onClick={()=>fetchReport(selectedReport)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">▶ Run</button>
                  </div>
                  {error && <div className="mt-3 bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                </div>

                {loading && <div className="text-center py-10 text-gray-400">Generating report...</div>}

                {data && !loading && (
                  <div className="space-y-4">
                    {/* Summary Cards */}
                    {data.summary && Object.keys(data.summary).length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(data.summary).map(([key, value]) => {
                          const isAmount = key.toLowerCase().includes('amount')||key.toLowerCase().includes('gross')||key.toLowerCase().includes('cost')||key.toLowerCase().includes('pay')||key.toLowerCase().includes('ot')&&key.toLowerCase().includes('amount');
                          const label = key.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase());
                          return (
                            <div key={key} className="bg-white rounded-xl border shadow-sm p-4 text-center">
                              <div className="text-xl font-bold text-gray-800">{isAmount?fmt(Number(value)):String(value)}</div>
                              <div className="text-xs text-gray-500 mt-1">{label}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* HEADCOUNT */}
                    {data.reportType==='HEADCOUNT' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border shadow-sm p-4">
                          <h3 className="font-bold text-gray-700 mb-3">By Department</h3>
                          <div className="space-y-2">{(data.byDepartment||[]).map((d,i)=>(
                            <div key={i} className="flex justify-between text-sm py-1 border-b last:border-0">
                              <span className="text-gray-600">{d.department}</span>
                              <span className="font-bold">{d.count}</span>
                            </div>
                          ))}</div>
                        </div>
                        <div className="bg-white rounded-xl border shadow-sm p-4">
                          <h3 className="font-bold text-gray-700 mb-3">By Employment Type</h3>
                          <div className="space-y-2">{(data.byEmploymentType||[]).map((t,i)=>(
                            <div key={i} className="flex justify-between text-sm py-1 border-b last:border-0">
                              <span className="text-gray-600">{t.type}</span>
                              <span className="font-bold">{t.count}</span>
                            </div>
                          ))}</div>
                        </div>
                        <div className="bg-white rounded-xl border shadow-sm p-4">
                          <h3 className="font-bold text-gray-700 mb-3">By Gender</h3>
                          <div className="space-y-2">{(data.byGender||[]).map((g,i)=>(
                            <div key={i} className="flex justify-between text-sm py-1 border-b last:border-0">
                              <span className="text-gray-600">{g.gender}</span>
                              <span className="font-bold">{g.count}</span>
                            </div>
                          ))}</div>
                        </div>
                      </div>
                    )}

                    {/* TABLE REPORTS */}
                    {['ATTENDANCE_SUMMARY','PAYROLL_COST','OT_REPORT'].includes(data.reportType) && (
                      <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
                        {data.reportType==='ATTENDANCE_SUMMARY' && (
                          <table className="w-full text-xs min-w-max">
                            <thead className="bg-gray-50 text-gray-500 uppercase sticky top-0">
                              <tr>{['Employee','Dept','Present','Absent','Half Day','Leave','Holiday','Week Off','Worked Hrs','OT Hrs','OT Amt'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                            </thead>
                            <tbody className="divide-y">
                              {(data.rows||[]).map((r,i)=>(
                                <tr key={i} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 whitespace-nowrap"><div className="font-medium">{r.employeeName}</div><div className="text-gray-400 font-mono">{r.employeeNumber}</div></td>
                                  <td className="px-3 py-2">{r.department}</td>
                                  <td className="px-3 py-2 text-center text-green-600 font-bold">{r.present}</td>
                                  <td className="px-3 py-2 text-center text-red-600">{r.absent}</td>
                                  <td className="px-3 py-2 text-center text-yellow-600">{r.halfDay}</td>
                                  <td className="px-3 py-2 text-center text-purple-600">{r.leave}</td>
                                  <td className="px-3 py-2 text-center text-blue-600">{r.holiday}</td>
                                  <td className="px-3 py-2 text-center text-gray-400">{r.weekOff}</td>
                                  <td className="px-3 py-2 text-center">{r.workedHours.toFixed(1)}h</td>
                                  <td className="px-3 py-2 text-center text-orange-600 font-bold">{r.totalOtHours.toFixed(1)}h</td>
                                  <td className="px-3 py-2 text-right text-green-600 font-bold">{fmt(r.totalOtAmount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        {data.reportType==='PAYROLL_COST' && (
                          <>
                            <table className="w-full text-xs min-w-max">
                              <thead className="bg-gray-50 text-gray-500 uppercase"><tr>{['Department','Headcount','Gross','PF','ESI','TDS','OT','Net Pay'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                              <tbody className="divide-y">
                                {(data.byDepartment||[]).map((d,i)=>(
                                  <tr key={i} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 font-medium">{d.department}</td>
                                    <td className="px-3 py-2 text-center">{d.headcount}</td>
                                    <td className="px-3 py-2">{fmt(d.totalGross)}</td>
                                    <td className="px-3 py-2 text-blue-600">{fmt(d.totalPf)}</td>
                                    <td className="px-3 py-2 text-purple-600">{fmt(d.totalEsi)}</td>
                                    <td className="px-3 py-2">{fmt(d.totalTds)}</td>
                                    <td className="px-3 py-2 text-orange-600">{fmt(d.totalOt)}</td>
                                    <td className="px-3 py-2 font-bold text-green-600">{fmt(d.totalNetPay)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </>
                        )}
                        {data.reportType==='OT_REPORT' && (
                          <table className="w-full text-xs min-w-max">
                            <thead className="bg-gray-50 text-gray-500 uppercase"><tr>{['Employee','Department','Designation','OT Days','OT Hours','OT Amount'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                            <tbody className="divide-y">
                              {(data.byEmployee||[]).map((e,i)=>(
                                <tr key={i} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 whitespace-nowrap"><div className="font-medium">{e.employeeName}</div><div className="text-gray-400 font-mono">{e.employeeNumber}</div></td>
                                  <td className="px-3 py-2">{e.department}</td>
                                  <td className="px-3 py-2">{e.designation}</td>
                                  <td className="px-3 py-2 text-center">{e.otDays}</td>
                                  <td className="px-3 py-2 text-center text-orange-600 font-bold">{e.totalOtHours.toFixed(1)}h</td>
                                  <td className="px-3 py-2 font-bold text-green-600">{fmt(e.totalOtAmount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}

                    {/* LEAVE UTILIZATION */}
                    {data.reportType==='LEAVE_UTILIZATION' && (
                      <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Leave Type','Code','Paid?','Allocated','Used','Pending','Available','Utilization %'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                          <tbody className="divide-y">
                            {(data.byType||[]).map((t,i)=>(
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium">{t.leaveType}</td>
                                <td className="px-4 py-3 font-mono text-xs">{t.code}</td>
                                <td className="px-4 py-3">{t.isPaid?'✅':'❌'}</td>
                                <td className="px-4 py-3">{t.totalAllocated}d</td>
                                <td className="px-4 py-3 text-red-600 font-medium">{t.totalUsed}d</td>
                                <td className="px-4 py-3 text-yellow-600">{t.totalPending}d</td>
                                <td className="px-4 py-3 text-green-600 font-bold">{t.totalAvailable}d</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{width:t.utilizationRate+'%'}}></div></div>
                                    <span className="text-xs font-bold">{t.utilizationRate}%</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* ATTRITION */}
                    {data.reportType==='ATTRITION' && (
                      <div className="space-y-4">
                        {data.joinedEmployees?.length>0&&(
                          <div className="bg-white rounded-xl border shadow-sm">
                            <div className="p-4 border-b"><h3 className="font-bold text-green-700">New Joiners ({data.joinedEmployees.length})</h3></div>
                            <table className="w-full text-sm"><thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Emp No','Name','Department','Designation','Joining Date','Type'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                            <tbody className="divide-y">{data.joinedEmployees.map((e,i)=><tr key={i} className="hover:bg-gray-50"><td className="px-3 py-2 font-mono text-xs">{e.employeeNumber}</td><td className="px-3 py-2 font-medium">{e.name}</td><td className="px-3 py-2 text-xs">{e.department}</td><td className="px-3 py-2 text-xs">{e.designation}</td><td className="px-3 py-2 text-xs">{fmtDate(e.dateOfJoining)}</td><td className="px-3 py-2"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{e.type}</span></td></tr>)}</tbody></table>
                          </div>
                        )}
                        {data.resignedEmployees?.length>0&&(
                          <div className="bg-white rounded-xl border shadow-sm">
                            <div className="p-4 border-b"><h3 className="font-bold text-red-700">Resigned ({data.resignedEmployees.length})</h3></div>
                            <table className="w-full text-sm"><thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Emp No','Name','Department','Last Day'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                            <tbody className="divide-y">{data.resignedEmployees.map((e,i)=><tr key={i} className="hover:bg-gray-50"><td className="px-3 py-2 font-mono text-xs">{e.employeeNumber}</td><td className="px-3 py-2 font-medium">{e.name}</td><td className="px-3 py-2 text-xs">{e.department}</td><td className="px-3 py-2 text-xs text-red-600">{fmtDate(e.dateOfLeaving)}</td></tr>)}</tbody></table>
                          </div>
                        )}
                        {!data.joinedEmployees?.length&&!data.resignedEmployees?.length&&(
                          <div className="bg-gray-50 rounded-xl p-10 text-center text-gray-400">No attrition events for {data.year}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl border shadow-sm p-16 text-center">
                <div className="text-5xl mb-4">📊</div>
                <div className="text-gray-500 font-medium">Select a report from the left panel</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
