'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}) : '—';
const STATUS_COLORS = { PRESENT:'bg-green-100 text-green-700', ABSENT:'bg-red-100 text-red-600', HALF_DAY:'bg-yellow-100 text-yellow-700', HOLIDAY:'bg-blue-100 text-blue-700', WEEK_OFF:'bg-gray-100 text-gray-500', LEAVE:'bg-purple-100 text-purple-700' };
const TABS = ['My Profile','My Attendance','My Leave','My Payslips','Apply Leave'];

export default function MyProfilePage() {
  const [activeTab, setActiveTab] = useState('My Profile');
  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth()+1);
  const [year, setYear] = useState(now.getFullYear());

  const [applyForm, setApplyForm] = useState({leaveTypeId:'',fromDate:'',toDate:'',reason:'',remarks:''});

  async function fetchEmployee() {
    const res = await fetch(`${API}/employees/me`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) { const d=await res.json(); setEmployee(d); return d; }
    return null;
  }

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const emp = await fetchEmployee();
    if (!emp) { setLoading(false); return; }

    const now = new Date();
    const [attRes, balRes, ltRes, leavesRes, payRes] = await Promise.all([
      fetch(`${API}/attendance?employeeId=${emp.id}&month=${month}&year=${year}&limit=50`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/leave/balance/${emp.id}?year=${now.getFullYear()}`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/leave/types`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/leave?employeeId=${emp.id}&limit=20`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/salary-slip/history/${emp.id}`, {headers:{Authorization:`Bearer ${getToken()}`}}),
    ]);
    if (attRes.ok) { const d=await attRes.json(); setAttendance(d.data||[]); }
    if (balRes.ok) setLeaveBalances(await balRes.json());
    if (ltRes.ok) setLeaveTypes(await ltRes.json());
    if (leavesRes.ok) { const d=await leavesRes.json(); setMyLeaves(d.data||[]); }
    if (payRes.ok) setPayslips(await payRes.json());
    setLoading(false);
  }

  useEffect(()=>{ fetchAll(); },[month, year]);

  async function handleApply() {
    setSaving(true); setError('');
    const res = await fetch(`${API}/leave/apply`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(applyForm)});
    const data = await res.json();
    if (res.ok) { setActiveTab('My Leave'); setApplyForm({leaveTypeId:'',fromDate:'',toDate:'',reason:'',remarks:''}); fetchAll(); }
    else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    setSaving(false);
  }

  async function downloadSlip(empId, month, year) {
    const res = await fetch(`${API}/salary-slip/download/${empId}?month=${month}&year=${year}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=`salary-slip-${month}-${year}.pdf`; a.click();
      URL.revokeObjectURL(url);
    }
  }

  const days = applyForm.fromDate && applyForm.toDate ?
    Math.max(1, Math.floor((new Date(applyForm.toDate)-new Date(applyForm.fromDate))/86400000)+1) : 0;

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  if (loading) return <AppLayout><div className="p-6 text-center text-gray-400">Loading your profile...</div></AppLayout>;

  if (!employee) return (
    <AppLayout>
      <div className="p-6 max-w-lg mx-auto text-center">
        <div className="text-5xl mb-4">👤</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Employee Record Not Linked</h2>
        <p className="text-gray-500 text-sm">Your user account is not linked to an employee record. Please contact HR to set up your employee profile.</p>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-6 mb-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-2xl font-bold">
              {employee.firstName[0]}{employee.lastName[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{employee.firstName} {employee.lastName}</h1>
              <div className="text-blue-200 text-sm mt-1">{employee.employeeNumber} · {employee.department?.name} · {employee.designation?.name}</div>
              <div className="flex gap-3 mt-2">
                <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded text-xs">{employee.employmentType}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${employee.status==='ACTIVE'?'bg-green-500':'bg-gray-500'}`}>{employee.status}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-4 border-b overflow-x-auto">
          {TABS.map(t=><button key={t} onClick={()=>{setActiveTab(t);setError('');}} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${activeTab===t?'border-indigo-600 text-indigo-600':'border-transparent text-gray-500'}`}>{t}</button>)}
        </div>

        {/* MY PROFILE */}
        {activeTab==='My Profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-bold text-gray-700 mb-4">Personal Information</h3>
              <div className="space-y-3 text-sm">
                {[
                  ['Email',employee.email],
                  ['Phone',employee.phone],
                  ['Date of Birth',fmtDate(employee.dateOfBirth)],
                  ['Date of Joining',fmtDate(employee.dateOfJoining)],
                  ['Gender',employee.gender],
                  ['Address',`${employee.address||''} ${employee.city||''} ${employee.state||''}`],
                  ['Emergency Contact',`${employee.emergencyContact||'—'} (${employee.emergencyPhone||'—'})`],
                ].map(([label,value])=>(
                  <div key={label} className="flex justify-between py-2 border-b last:border-0">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-800 text-right max-w-48">{value||'—'}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-bold text-gray-700 mb-4">Salary Structure</h3>
                <div className="space-y-2 text-sm">
                  {[
                    ['Basic Salary',fmt(employee.basicSalary)],
                    ['HRA',fmt(employee.hraAmount)],
                    ['Conveyance',fmt(employee.conveyanceAmount)],
                    ['Other Allowances',fmt(employee.otherAllowances)],
                  ].map(([label,value])=>(
                    <div key={label} className="flex justify-between py-1.5 border-b last:border-0">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 bg-green-50 rounded-lg px-3 mt-2">
                    <span className="font-bold text-gray-700">Gross/Month</span>
                    <span className="font-bold text-green-600 text-lg">{fmt(employee.basicSalary+employee.hraAmount+employee.conveyanceAmount+employee.otherAllowances)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-bold text-gray-700 mb-3">Statutory IDs</h3>
                <div className="space-y-2 text-sm">
                  {[
                    ['PAN',employee.panNumber],
                    ['PF Number',employee.pfNumber],
                    ['ESI Number',employee.esiNumber],
                    ['Bank',employee.bankName],
                    ['Account',employee.bankAccountNumber?'****'+employee.bankAccountNumber.slice(-4):'—'],
                    ['IFSC',employee.bankIfscCode],
                  ].map(([label,value])=>(
                    <div key={label} className="flex justify-between py-1 border-b last:border-0">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-mono text-gray-700">{value||'—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MY ATTENDANCE */}
        {activeTab==='My Attendance' && (
          <div className="space-y-4">
            <div className="flex gap-3 items-center flex-wrap">
              <select className="border rounded-lg px-3 py-2 text-sm" value={month} onChange={e=>setMonth(Number(e.target.value))}>
                {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
              </select>
              <select className="border rounded-lg px-3 py-2 text-sm" value={year} onChange={e=>setYear(Number(e.target.value))}>
                {[2024,2025,2026,2027].map(y=><option key={y}>{y}</option>)}
              </select>
              <span className="text-sm text-gray-500">{attendance.length} records</span>
            </div>
            {attendance.length>0 && (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                {[
                  {label:'Present',count:attendance.filter(a=>a.status==='PRESENT').length,color:'bg-green-50 text-green-700'},
                  {label:'Absent',count:attendance.filter(a=>a.status==='ABSENT').length,color:'bg-red-50 text-red-700'},
                  {label:'Half Day',count:attendance.filter(a=>a.status==='HALF_DAY').length,color:'bg-yellow-50 text-yellow-700'},
                  {label:'Leave',count:attendance.filter(a=>a.status==='LEAVE').length,color:'bg-purple-50 text-purple-700'},
                  {label:'OT Hours',count:attendance.reduce((s,a)=>s+a.otHours,0).toFixed(1)+'h',color:'bg-orange-50 text-orange-700'},
                  {label:'OT Amount',count:fmt(attendance.reduce((s,a)=>s+a.otAmount,0)),color:'bg-blue-50 text-blue-700'},
                ].map(s=>(
                  <div key={s.label} className={`${s.color} rounded-xl p-3 text-center border`}>
                    <div className="text-lg font-bold">{s.count}</div>
                    <div className="text-xs mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
              {attendance.length===0?<div className="text-center py-10 text-gray-400">No attendance records for this period.</div>:(
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>{['Date','Shift','Check In','Check Out','Lunch','Worked','OT','OT Amt','Status'].map(h=><th key={h} className="px-3 py-3 text-left whitespace-nowrap">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {attendance.map(a=>(
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs">{fmtDate(a.attendanceDate)}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{a.shift?.name||'—'}</td>
                        <td className="px-3 py-2 text-xs font-mono">{fmtTime(a.checkIn)}</td>
                        <td className="px-3 py-2 text-xs font-mono">{fmtTime(a.checkOut)}</td>
                        <td className="px-3 py-2 text-xs">{a.lunchMinutes>0?a.lunchMinutes+'min':'—'}</td>
                        <td className="px-3 py-2 font-medium">{a.workedHours>0?a.workedHours+'h':'—'}</td>
                        <td className="px-3 py-2">{a.otHours>0?<span className="text-orange-600 font-bold">{a.otHours}h</span>:'—'}</td>
                        <td className="px-3 py-2">{a.otAmount>0?<span className="text-green-600 font-bold">{fmt(a.otAmount)}</span>:'—'}</td>
                        <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[a.status]}`}>{a.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* MY LEAVE */}
        {activeTab==='My Leave' && (
          <div className="space-y-6">
            {/* Leave Balances */}
            {leaveBalances.length>0 && (
              <div>
                <h3 className="font-bold text-gray-700 mb-3">Leave Balance — {now.getFullYear()}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {leaveBalances.map(b=>(
                    <div key={b.id} className="bg-white rounded-xl border shadow-sm p-4">
                      <div className="font-bold text-gray-800">{b.leaveType?.name}</div>
                      <div className="text-xs text-gray-400 mb-3">{b.leaveType?.code} · {b.leaveType?.isPaid?'Paid':'Unpaid'}</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-gray-500">Allocated</span><span>{b.allocated}d</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Used</span><span className="text-red-600">{b.used}d</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Pending</span><span className="text-yellow-600">{b.pending}d</span></div>
                        <div className="flex justify-between border-t pt-1"><span className="font-bold">Available</span><span className="text-green-600 font-bold text-lg">{b.available}d</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Leave History */}
            <div>
              <h3 className="font-bold text-gray-700 mb-3">My Leave Applications</h3>
              <div className="bg-white rounded-xl border shadow-sm">
                {myLeaves.length===0?<div className="text-center py-8 text-gray-400">No leave applications yet.</div>:(
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>{['App No','Type','From','To','Days','Status','Applied On'].map(h=><th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y">
                      {myLeaves.map(l=>(
                        <tr key={l.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-xs text-blue-600">{l.applicationNumber}</td>
                          <td className="px-3 py-2"><span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">{l.leaveType?.code}</span></td>
                          <td className="px-3 py-2 text-xs">{fmtDate(l.fromDate)}</td>
                          <td className="px-3 py-2 text-xs">{fmtDate(l.toDate)}</td>
                          <td className="px-3 py-2 font-bold text-center">{l.days}</td>
                          <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${l.status==='APPROVED'?'bg-green-100 text-green-700':l.status==='PENDING'?'bg-yellow-100 text-yellow-700':l.status==='REJECTED'?'bg-red-100 text-red-600':'bg-gray-100 text-gray-500'}`}>{l.status}</span></td>
                          <td className="px-3 py-2 text-xs text-gray-400">{fmtDate(l.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MY PAYSLIPS */}
        {activeTab==='My Payslips' && (
          <div className="bg-white rounded-xl border shadow-sm">
            {payslips.length===0?<div className="text-center py-10 text-gray-400">No salary slips available yet.</div>:(
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>{['Month','Gross','Net Pay','Status',''].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {payslips.map((p,i)=>(
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{MONTHS[p.month-1]} {p.year}</td>
                      <td className="px-4 py-3 text-gray-600">{fmt(p.grossEarnings)}</td>
                      <td className="px-4 py-3 font-bold text-green-600">{fmt(p.netPay)}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${p.status==='PAID'?'bg-green-100 text-green-700':p.status==='APPROVED'?'bg-blue-100 text-blue-700':'bg-yellow-100 text-yellow-700'}`}>{p.status}</span></td>
                      <td className="px-4 py-3">
                        <button onClick={()=>downloadSlip(employee.id,p.month,p.year)} className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg">⬇ Download PDF</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* APPLY LEAVE */}
        {activeTab==='Apply Leave' && (
          <div className="bg-white rounded-xl border shadow-sm p-6 max-w-lg">
            <h2 className="font-bold text-gray-800 mb-4">Apply for Leave</h2>
            {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm mb-4">{error}</div>}
            <div className="space-y-4">
              <div><label className="block text-xs text-gray-500 mb-1">Leave Type *</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={applyForm.leaveTypeId} onChange={e=>setApplyForm(f=>({...f,leaveTypeId:e.target.value}))}>
                  <option value="">— Select —</option>
                  {leaveTypes.map(t=>{
                    const bal = leaveBalances.find(b=>b.leaveTypeId===t.id);
                    return <option key={t.id} value={t.id}>{t.name} (Available: {bal?.available||0}d)</option>;
                  })}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-gray-500 mb-1">From *</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={applyForm.fromDate} onChange={e=>setApplyForm(f=>({...f,fromDate:e.target.value}))} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">To *</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={applyForm.toDate} onChange={e=>setApplyForm(f=>({...f,toDate:e.target.value}))} /></div>
              </div>
              {days>0&&<div className="bg-blue-50 rounded-lg px-3 py-2 text-sm text-blue-700">📅 {days} day{days>1?'s':''} requested</div>}
              <div><label className="block text-xs text-gray-500 mb-1">Reason *</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={applyForm.reason} onChange={e=>setApplyForm(f=>({...f,reason:e.target.value}))} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Remarks</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={applyForm.remarks} onChange={e=>setApplyForm(f=>({...f,remarks:e.target.value}))} /></div>
              <button onClick={handleApply} disabled={saving||!applyForm.leaveTypeId||!applyForm.fromDate||!applyForm.toDate||!applyForm.reason} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving?'Submitting...':'Submit Leave Application'}</button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
