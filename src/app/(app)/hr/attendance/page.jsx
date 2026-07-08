'use client';
// xlsx loaded dynamically
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}) : '—';
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : '—';
const STATUS_COLORS = { PRESENT:'bg-green-100 text-green-700', ABSENT:'bg-red-100 text-red-600', HALF_DAY:'bg-yellow-100 text-yellow-700', HOLIDAY:'bg-blue-100 text-blue-700', WEEK_OFF:'bg-gray-100 text-gray-500', LEAVE:'bg-purple-100 text-purple-700' };
const TABS = ['Daily View','Mark Attendance','Bulk Mark','Shifts','Bulk Upload'];

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState('Daily View');
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadRows, setUploadRows] = useState([]);
  const [uploadImporting, setUploadImporting] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [error, setError] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [shiftModal, setShiftModal] = useState(false);
  const [editShift, setEditShift] = useState(null);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth()+1);
  const [year, setYear] = useState(now.getFullYear());
  const [empFilter, setEmpFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [markForm, setMarkForm] = useState({
    employeeId:'', attendanceDate:now.toISOString().split('T')[0],
    shiftId:'', checkIn:'', checkOut:'',
    lunchOut:'', lunchIn:'', status:'PRESENT',
    isHoliday:false, remarks:''
  });

  const [shiftForm, setShiftForm] = useState({
    code:'', name:'', startTime:'', endTime:'',
    shiftHours:8, lunchStartTime:'', lunchEndTime:'',
    lunchMinutes:30, weeklyOff:'SUNDAY',
    otMultiplier:1.5, holidayMultiplier:2.0
  });

  const [bulkDate, setBulkDate] = useState(now.toISOString().split('T')[0]);
  const [bulkShiftId, setBulkShiftId] = useState('');
  const [bulkRecords, setBulkRecords] = useState([]);

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({month, year, limit:100});
    if (empFilter) params.set('employeeId', empFilter);
    if (statusFilter) params.set('status', statusFilter);
    const [aRes, eRes, sRes, stRes] = await Promise.all([
      fetch(`${API}/attendance?${params}`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/employees?limit=200`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/attendance/shifts`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/attendance/stats?month=${month}&year=${year}`, {headers:{Authorization:`Bearer ${getToken()}`}}),
    ]);
    if (aRes.ok) { const d=await aRes.json(); setAttendance(d.data||[]); }
    if (eRes.ok) { const d=await eRes.json(); setEmployees(d.data||[]); }
    if (sRes.ok) setShifts(await sRes.json());
    if (stRes.ok) setStats(await stRes.json());
    setLoading(false);
  }

  useEffect(()=>{ fetchAll(); },[month, year, empFilter, statusFilter]);

  useEffect(()=>{
    if (employees.length>0) {
      setBulkRecords(employees.map(e=>({
        employeeId:e.id, employeeNumber:e.employeeNumber,
        name:`${e.firstName} ${e.lastName}`,
        checkIn:'', checkOut:'', lunchOut:'', lunchIn:'',
        status:'PRESENT', isHoliday:false, remarks:''
      })));
    }
  },[employees.length]);

  async function handleMark() {
    setSaving(true); setError('');
    const body = {...markForm};
    if (!body.shiftId) delete body.shiftId;
    if (!body.checkIn) delete body.checkIn;
    if (!body.checkOut) delete body.checkOut;
    if (!body.lunchOut) delete body.lunchOut;
    if (!body.lunchIn) delete body.lunchIn;
    if (!body.remarks) delete body.remarks;
    const res = await fetch(`${API}/attendance`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    const data = await res.json();
    if (res.ok) { setError(''); alert(`Marked! Worked: ${data.workedHours}h | OT: ${data.otHours}h | OT Amt: ${fmt(data.otAmount)}`); fetchAll(); }
    else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    setSaving(false);
  }

  async function handleBulkMark() {
    setSaving(true); setError('');
    const records = bulkRecords.map(r=>({
      employeeId:r.employeeId,
      checkIn:r.checkIn||undefined, checkOut:r.checkOut||undefined,
      lunchOut:r.lunchOut||undefined, lunchIn:r.lunchIn||undefined,
      status:r.status, isHoliday:r.isHoliday, remarks:r.remarks||undefined,
    }));
    const res = await fetch(`${API}/attendance/bulk`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify({attendanceDate:bulkDate,shiftId:bulkShiftId||undefined,records})});
    const data = await res.json();
    if (res.ok) { alert(`Bulk done: ${data.success}/${data.total} success, ${data.failed} failed`); fetchAll(); }
    else setError(data.message||'Failed');
    setSaving(false);
  }

  async function handleUpdateAtt() {
    setSaving(true); setError('');
    const body = {...editModal};
    ['id','employee','shift','companyId','attendanceDate','employeeId','createdAt','updatedAt','createdBy','updatedBy','markedBy','grossWorkedMinutes','netWorkedMinutes','netWorkedRounded','workedHours','otHours','otRate','otAmount','lunchMinutes','isActive','isTestData'].forEach(k=>delete body[k]);
    if (body.checkIn) body.checkIn = new Date(body.checkIn).toTimeString().slice(0,5);
    if (body.checkOut) body.checkOut = new Date(body.checkOut).toTimeString().slice(0,5);
    if (body.lunchOut) body.lunchOut = new Date(body.lunchOut).toTimeString().slice(0,5);
    if (body.lunchIn) body.lunchIn = new Date(body.lunchIn).toTimeString().slice(0,5);
    const res = await fetch(`${API}/attendance/${editModal.id}`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    const data = await res.json();
    if (res.ok) { setEditModal(null); fetchAll(); }
    else setError(data.message||'Failed');
    setSaving(false);
  }

  async function handleShiftSave() {
    setSaving(true); setError('');
    const url = editShift ? `${API}/attendance/shifts/${editShift.id}` : `${API}/attendance/shifts`;
    const method = editShift ? 'PUT' : 'POST';
    const res = await fetch(url,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify({...shiftForm,shiftHours:parseFloat(shiftForm.shiftHours),lunchMinutes:parseFloat(shiftForm.lunchMinutes),otMultiplier:parseFloat(shiftForm.otMultiplier),holidayMultiplier:parseFloat(shiftForm.holidayMultiplier)})});
    const data = await res.json();
    if (res.ok) { setShiftModal(false); setEditShift(null); fetchAll(); }
    else setError(data.message||'Failed');
    setSaving(false);
  }

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
            <p className="text-gray-500 text-sm mt-1">Daily attendance, overtime and shift management</p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              {label:'Present',value:stats.present,color:'bg-green-50 text-green-700'},
              {label:'Absent',value:stats.absent,color:'bg-red-50 text-red-700'},
              {label:'On Leave',value:stats.onLeave,color:'bg-purple-50 text-purple-700'},
              {label:'Total OT Hours',value:(stats.totalOtHours||0).toFixed(1)+'h',color:'bg-orange-50 text-orange-700'},
            ].map(s=>(
              <div key={s.label} className={`${s.color} rounded-xl p-4 text-center border`}>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-4 border-b">
          {TABS.map(t=><button key={t} onClick={()=>{setActiveTab(t);setError('');}} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab===t?'border-indigo-600 text-indigo-600':'border-transparent text-gray-500'}`}>{t}</button>)}
        </div>

        {activeTab==='Daily View' && (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap items-center">
              <select className="border rounded-lg px-3 py-2 text-sm" value={month} onChange={e=>setMonth(Number(e.target.value))}>
                {months.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
              </select>
              <select className="border rounded-lg px-3 py-2 text-sm" value={year} onChange={e=>setYear(Number(e.target.value))}>
                {[2024,2025,2026,2027].map(y=><option key={y}>{y}</option>)}
              </select>
              <select className="border rounded-lg px-3 py-2 text-sm" value={empFilter} onChange={e=>setEmpFilter(e.target.value)}>
                <option value="">All Employees</option>
                {employees.map(e=><option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeNumber})</option>)}
              </select>
              <select className="border rounded-lg px-3 py-2 text-sm" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                <option value="">All Status</option>
                {['PRESENT','ABSENT','HALF_DAY','HOLIDAY','WEEK_OFF','LEAVE'].map(s=><option key={s}>{s}</option>)}
              </select>
              <span className="text-sm text-gray-500">{attendance.length} records</span>
            </div>
            <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
              {loading?<div className="text-center py-10 text-gray-400">Loading...</div>
              :attendance.length===0?<div className="text-center py-10 text-gray-400">No records for this period.</div>:(
                <table className="w-full text-sm min-w-max">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>{['Date','Employee','Shift','Check In','Check Out','Lunch','Worked','OT Hrs','OT Amt','Status',''].map(h=><th key={h} className="px-3 py-3 text-left whitespace-nowrap">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {attendance.map(a=>(
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs whitespace-nowrap">{fmtDate(a.attendanceDate)}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{a.employee?.firstName} {a.employee?.lastName}</div>
                          <div className="text-xs text-gray-400 font-mono">{a.employee?.employeeNumber}</div>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">{a.shift?.name||'—'}</td>
                        <td className="px-3 py-2 text-xs font-mono">{fmtTime(a.checkIn)}</td>
                        <td className="px-3 py-2 text-xs font-mono">{fmtTime(a.checkOut)}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{a.lunchMinutes>0?`${a.lunchMinutes}min`:'—'}</td>
                        <td className="px-3 py-2 font-medium">{a.workedHours>0?`${a.workedHours}h`:'—'}</td>
                        <td className="px-3 py-2">{a.otHours>0?<span className="text-orange-600 font-bold">{a.otHours}h</span>:<span className="text-gray-400">—</span>}</td>
                        <td className="px-3 py-2">{a.otAmount>0?<span className="text-green-600 font-bold">{fmt(a.otAmount)}</span>:<span className="text-gray-400">—</span>}</td>
                        <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[a.status]}`}>{a.status}</span></td>
                        <td className="px-3 py-2"><button onClick={()=>setEditModal(a)} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">Edit</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab==='Mark Attendance' && (
          <div className="bg-white rounded-xl border shadow-sm p-6 max-w-2xl">
            <h2 className="font-bold text-gray-800 mb-4">Mark Individual Attendance</h2>
            {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm mb-4">{error}</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-gray-500 mb-1">Employee *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={markForm.employeeId} onChange={e=>setMarkForm(f=>({...f,employeeId:e.target.value}))}>
                    <option value="">— Select —</option>
                    {employees.map(e=><option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeNumber})</option>)}
                  </select>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Date *</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={markForm.attendanceDate} onChange={e=>setMarkForm(f=>({...f,attendanceDate:e.target.value}))} />
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Shift</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={markForm.shiftId} onChange={e=>setMarkForm(f=>({...f,shiftId:e.target.value}))}>
                    <option value="">— Select Shift —</option>
                    {shifts.map(s=><option key={s.id} value={s.id}>{s.name} ({s.startTime}-{s.endTime}, {s.shiftHours}h net)</option>)}
                  </select>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Status *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={markForm.status} onChange={e=>setMarkForm(f=>({...f,status:e.target.value}))}>
                    {['PRESENT','ABSENT','HALF_DAY','HOLIDAY','WEEK_OFF','LEAVE'].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {(markForm.status==='PRESENT'||markForm.status==='HALF_DAY') && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-gray-600 uppercase">Time Entry (Manager enters actual times)</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs text-gray-500 mb-1">Check In</label><input type="time" className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={markForm.checkIn} onChange={e=>setMarkForm(f=>({...f,checkIn:e.target.value}))} /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Check Out</label><input type="time" className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={markForm.checkOut} onChange={e=>setMarkForm(f=>({...f,checkOut:e.target.value}))} /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Lunch Out</label><input type="time" className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={markForm.lunchOut} onChange={e=>setMarkForm(f=>({...f,lunchOut:e.target.value}))} /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Lunch In</label><input type="time" className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={markForm.lunchIn} onChange={e=>setMarkForm(f=>({...f,lunchIn:e.target.value}))} /></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="isHoliday" checked={markForm.isHoliday} onChange={e=>setMarkForm(f=>({...f,isHoliday:e.target.checked}))} />
                    <label htmlFor="isHoliday" className="text-sm text-gray-600">Holiday / Sunday (holiday OT rate applies)</label>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                    <strong>OT Rule:</strong> Checkout rounded to nearest 30-min block. Lunch deducted before OT calc. OT = worked hours - shift hours ({markForm.shiftId?shifts.find(s=>s.id===markForm.shiftId)?.shiftHours||8:8}h net).
                  </div>
                </div>
              )}
              <div><label className="block text-xs text-gray-500 mb-1">Remarks</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={markForm.remarks} onChange={e=>setMarkForm(f=>({...f,remarks:e.target.value}))} />
              </div>
              <button onClick={handleMark} disabled={saving||!markForm.employeeId||!markForm.attendanceDate} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving?'Saving...':'Mark Attendance'}</button>
            </div>
          </div>
        )}

        {activeTab==='Bulk Mark' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <div className="flex gap-4 items-end flex-wrap">
                <div><label className="block text-xs text-gray-500 mb-1">Date *</label><input type="date" className="border rounded-lg px-3 py-2 text-sm" value={bulkDate} onChange={e=>setBulkDate(e.target.value)} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Shift (apply to all)</label>
                  <select className="border rounded-lg px-3 py-2 text-sm" value={bulkShiftId} onChange={e=>setBulkShiftId(e.target.value)}>
                    <option value="">— None —</option>
                    {shifts.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>setBulkRecords(r=>r.map(rec=>({...rec,status:'PRESENT'})))} className="px-3 py-2 text-xs bg-green-600 text-white rounded-lg">All Present</button>
                  <button onClick={()=>setBulkRecords(r=>r.map(rec=>({...rec,status:'WEEK_OFF'})))} className="px-3 py-2 text-xs bg-gray-500 text-white rounded-lg">All Week Off</button>
                  <button onClick={()=>setBulkRecords(r=>r.map(rec=>({...rec,status:'HOLIDAY'})))} className="px-3 py-2 text-xs bg-blue-500 text-white rounded-lg">All Holiday</button>
                </div>
                <button onClick={handleBulkMark} disabled={saving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Saving...':'Submit Bulk'}</button>
              </div>
              {error&&<div className="mt-3 bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
            </div>
            <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
              <table className="w-full text-xs min-w-max">
                <thead className="bg-gray-50 text-gray-500 uppercase">
                  <tr>{['Employee','Check In','Check Out','Lunch Out','Lunch In','Status','Holiday?','Remarks'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {bulkRecords.map((rec,i)=>(
                    <tr key={rec.employeeId} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap"><div className="font-medium">{rec.name}</div><div className="text-gray-400 font-mono">{rec.employeeNumber}</div></td>
                      <td className="px-2 py-1"><input type="time" className="border rounded px-2 py-1 text-xs font-mono w-28" value={rec.checkIn} onChange={e=>setBulkRecords(r=>r.map((row,j)=>i===j?{...row,checkIn:e.target.value}:row))} /></td>
                      <td className="px-2 py-1"><input type="time" className="border rounded px-2 py-1 text-xs font-mono w-28" value={rec.checkOut} onChange={e=>setBulkRecords(r=>r.map((row,j)=>i===j?{...row,checkOut:e.target.value}:row))} /></td>
                      <td className="px-2 py-1"><input type="time" className="border rounded px-2 py-1 text-xs font-mono w-28" value={rec.lunchOut} onChange={e=>setBulkRecords(r=>r.map((row,j)=>i===j?{...row,lunchOut:e.target.value}:row))} /></td>
                      <td className="px-2 py-1"><input type="time" className="border rounded px-2 py-1 text-xs font-mono w-28" value={rec.lunchIn} onChange={e=>setBulkRecords(r=>r.map((row,j)=>i===j?{...row,lunchIn:e.target.value}:row))} /></td>
                      <td className="px-2 py-1"><select className="border rounded px-2 py-1 text-xs" value={rec.status} onChange={e=>setBulkRecords(r=>r.map((row,j)=>i===j?{...row,status:e.target.value}:row))}>{['PRESENT','ABSENT','HALF_DAY','HOLIDAY','WEEK_OFF','LEAVE'].map(s=><option key={s}>{s}</option>)}</select></td>
                      <td className="px-2 py-1 text-center"><input type="checkbox" checked={rec.isHoliday} onChange={e=>setBulkRecords(r=>r.map((row,j)=>i===j?{...row,isHoliday:e.target.checked}:row))} /></td>
                      <td className="px-2 py-1"><input className="border rounded px-2 py-1 text-xs w-24" value={rec.remarks} onChange={e=>setBulkRecords(r=>r.map((row,j)=>i===j?{...row,remarks:e.target.value}:row))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab==='Shifts' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-orange-600">⚠ Shift configuration is Admin only. Lunch time changes apply to future attendance only.</p>
              <button onClick={()=>{setShiftForm({code:'',name:'',startTime:'',endTime:'',shiftHours:8,lunchStartTime:'',lunchEndTime:'',lunchMinutes:30,weeklyOff:'SUNDAY',otMultiplier:1.5,holidayMultiplier:2.0});setEditShift(null);setError('');setShiftModal(true);}} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">+ New Shift</button>
            </div>
            <div className="bg-white rounded-xl border shadow-sm">
              {shifts.length===0?<div className="text-center py-10 text-gray-400">No shifts configured.</div>:(
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>{['Code','Name','Timing','Net Hours','Lunch Config','Weekly Off','OT Rate','Holiday Rate',''].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {shifts.map(s=>(
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono font-bold text-indigo-600">{s.code}</td>
                        <td className="px-4 py-3 font-medium">{s.name}</td>
                        <td className="px-4 py-3 font-mono text-sm">{s.startTime} — {s.endTime}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-bold">{s.shiftHours}h net</span></td>
                        <td className="px-4 py-3 text-xs text-gray-500">{s.lunchStartTime&&s.lunchEndTime?`${s.lunchStartTime}-${s.lunchEndTime} (${s.lunchMinutes}min)`:'None'}</td>
                        <td className="px-4 py-3 text-xs">{s.weeklyOff}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs">{s.otMultiplier}×</span></td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs">{s.holidayMultiplier}×</span></td>
                        <td className="px-4 py-3"><button onClick={()=>{setShiftForm({code:s.code,name:s.name,startTime:s.startTime,endTime:s.endTime,shiftHours:s.shiftHours,lunchStartTime:s.lunchStartTime||'',lunchEndTime:s.lunchEndTime||'',lunchMinutes:s.lunchMinutes,weeklyOff:s.weeklyOff,otMultiplier:s.otMultiplier,holidayMultiplier:s.holidayMultiplier});setEditShift(s);setError('');setShiftModal(true);}} className="px-3 py-1 text-xs border rounded hover:bg-gray-50">Edit</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {editModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-5 border-b flex justify-between">
                <h2 className="font-bold text-gray-800">Edit — {editModal.employee?.firstName} {fmtDate(editModal.attendanceDate)}</h2>
                <button onClick={()=>setEditModal(null)} className="text-gray-400">✕</button>
              </div>
              <div className="p-5 space-y-4">
                {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">Status</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={editModal.status} onChange={e=>setEditModal(m=>({...m,status:e.target.value}))}>
                      {['PRESENT','ABSENT','HALF_DAY','HOLIDAY','WEEK_OFF','LEAVE'].map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs text-gray-500 mb-1">Shift</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={editModal.shiftId||''} onChange={e=>setEditModal(m=>({...m,shiftId:e.target.value}))}>
                      <option value="">— None —</option>
                      {shifts.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs text-gray-500 mb-1">Check In</label><input type="time" className="w-full border rounded-lg px-3 py-2 text-sm font-mono" defaultValue={editModal.checkIn?new Date(editModal.checkIn).toTimeString().slice(0,5):''} onChange={e=>setEditModal(m=>({...m,checkIn:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Check Out</label><input type="time" className="w-full border rounded-lg px-3 py-2 text-sm font-mono" defaultValue={editModal.checkOut?new Date(editModal.checkOut).toTimeString().slice(0,5):''} onChange={e=>setEditModal(m=>({...m,checkOut:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Lunch Out</label><input type="time" className="w-full border rounded-lg px-3 py-2 text-sm font-mono" defaultValue={editModal.lunchOut?new Date(editModal.lunchOut).toTimeString().slice(0,5):''} onChange={e=>setEditModal(m=>({...m,lunchOut:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Lunch In</label><input type="time" className="w-full border rounded-lg px-3 py-2 text-sm font-mono" defaultValue={editModal.lunchIn?new Date(editModal.lunchIn).toTimeString().slice(0,5):''} onChange={e=>setEditModal(m=>({...m,lunchIn:e.target.value}))} /></div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={editModal.isHoliday} onChange={e=>setEditModal(m=>({...m,isHoliday:e.target.checked}))} />
                  <label className="text-sm text-gray-600">Holiday (holiday OT rate)</label>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Remarks</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={editModal.remarks||''} onChange={e=>setEditModal(m=>({...m,remarks:e.target.value}))} /></div>
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                <button onClick={()=>setEditModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleUpdateAtt} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Saving...':'Save'}</button>
              </div>
            </div>
          </div>
        )}

        {shiftModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-5 border-b flex justify-between">
                <div>
                  <h2 className="font-bold text-gray-800">{editShift?'Edit':'New'} Shift</h2>
                  <p className="text-xs text-orange-600 mt-0.5">Admin only — lunch changes apply to future attendance</p>
                </div>
                <button onClick={()=>setShiftModal(false)} className="text-gray-400">✕</button>
              </div>
              <div className="p-5 space-y-3">
                {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">Code *</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase" value={shiftForm.code} onChange={e=>setShiftForm(f=>({...f,code:e.target.value.toUpperCase()}))} disabled={!!editShift} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Name *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={shiftForm.name} onChange={e=>setShiftForm(f=>({...f,name:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Start Time</label><input type="time" className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={shiftForm.startTime} onChange={e=>setShiftForm(f=>({...f,startTime:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">End Time (incl. lunch)</label><input type="time" className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={shiftForm.endTime} onChange={e=>setShiftForm(f=>({...f,endTime:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Net Shift Hours *</label><input type="number" step="0.5" min="1" max="24" className="w-full border rounded-lg px-3 py-2 text-sm" value={shiftForm.shiftHours} onChange={e=>setShiftForm(f=>({...f,shiftHours:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Weekly Off</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={shiftForm.weeklyOff} onChange={e=>setShiftForm(f=>({...f,weeklyOff:e.target.value}))}>
                      {['SUNDAY','SATURDAY','NONE'].map(d=><option key={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-3">
                  <div className="text-xs font-semibold text-orange-700">🕐 Lunch Config (Admin Only)</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="block text-xs text-gray-500 mb-1">Lunch Out</label><input type="time" className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={shiftForm.lunchStartTime} onChange={e=>setShiftForm(f=>({...f,lunchStartTime:e.target.value}))} /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Lunch In</label><input type="time" className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={shiftForm.lunchEndTime} onChange={e=>setShiftForm(f=>({...f,lunchEndTime:e.target.value}))} /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Minutes</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={shiftForm.lunchMinutes} onChange={e=>setShiftForm(f=>({...f,lunchMinutes:e.target.value}))} /></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">OT Multiplier (weekday)</label><input type="number" step="0.5" className="w-full border rounded-lg px-3 py-2 text-sm" value={shiftForm.otMultiplier} onChange={e=>setShiftForm(f=>({...f,otMultiplier:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Holiday Multiplier</label><input type="number" step="0.5" className="w-full border rounded-lg px-3 py-2 text-sm" value={shiftForm.holidayMultiplier} onChange={e=>setShiftForm(f=>({...f,holidayMultiplier:e.target.value}))} /></div>
                </div>
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                <button onClick={()=>setShiftModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleShiftSave} disabled={saving||!shiftForm.code||!shiftForm.name} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Saving...':'Save Shift'}</button>
              </div>
            </div>
          </div>
        )}

        {/* BULK UPLOAD TAB */}
        {activeTab==='Bulk Upload' && (
          <div className="space-y-6">
            {/* Info Banner */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <h3 className="font-bold text-indigo-800 mb-1">📎 Bulk Attendance Upload</h3>
              <p className="text-xs text-indigo-600">Supports CSV, Excel (.xlsx) and PDF (text-based) files</p>
              <div className="mt-2 font-mono text-xs bg-white rounded p-2 text-gray-600">
                Required columns: <span className="font-bold text-indigo-700">employeeNumber, date, status, inTime, outTime, remarks</span><br/>
                Status values: PRESENT | ABSENT | HALF_DAY | LEAVE | HOLIDAY | WEEK_OFF
              </div>
            </div>

            {/* Template Download */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-bold text-gray-700 mb-3">Step 1: Download Template</h3>
              <div className="flex gap-3">
                <button
                  onClick={()=>{
                    const sample = 'employeeNumber,date,status,inTime,outTime,remarks\nEMP-001,2026-07-08,PRESENT,09:00,18:00,\nEMP-002,2026-07-08,PRESENT,09:15,18:00,Late arrival\nEMP-003,2026-07-08,ABSENT,,,Sick leave\nEMP-004,2026-07-08,HALF_DAY,09:00,13:00,\nEMP-005,2026-07-08,LEAVE,,,Annual leave\nEMP-006,2026-07-08,WEEK_OFF,,,Sunday';
                    const blob = new Blob([sample],{type:'text/csv'});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href=url; a.download='attendance-template.csv'; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium"
                >⬇ CSV Template</button>
                <button
                  onClick={async()=>{
                    const XLSX = await import('xlsx');
                    const wb = XLSX.utils.book_new();
                    const data = [
                      ['employeeNumber','date','status','inTime','outTime','remarks'],
                      ['EMP-001','2026-07-08','PRESENT','09:00','18:00',''],
                      ['EMP-002','2026-07-08','PRESENT','09:15','18:00','Late arrival'],
                      ['EMP-003','2026-07-08','ABSENT','','','Sick leave'],
                      ['EMP-004','2026-07-08','HALF_DAY','09:00','13:00',''],
                      ['EMP-005','2026-07-08','LEAVE','','','Annual leave'],
                    ];
                    const ws = XLSX.utils.aoa_to_sheet(data);
                    ws['!cols'] = [{wch:15},{wch:12},{wch:12},{wch:10},{wch:10},{wch:20}];
                    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
                    XLSX.writeFile(wb, 'attendance-template.xlsx');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                >⬇ Excel Template</button>
              </div>
            </div>

            {/* Upload */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-bold text-gray-700 mb-3">Step 2: Upload File</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* File Upload */}
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Upload File (CSV / Excel / PDF)</label>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.pdf"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    onChange={async(e)=>{
                      const file = e.target.files[0];
                      if (!file) return;
                      setUploadRows([]); setUploadResults(null); setUploadError('');
                      try {
                        let rows = [];
                        if (file.name.endsWith('.csv')) {
                          const text = await file.text();
                          const lines = text.trim().split('\n').filter(l=>l.trim());
                          const headers = lines[0].split(',').map(h=>h.trim());
                          rows = lines.slice(1).map(l=>{
                            const vals = l.split(',').map(v=>v.trim());
                            const obj = {};
                            headers.forEach((h,i)=>obj[h]=vals[i]||'');
                            return obj;
                          });
                        } else if (file.name.endsWith('.xlsx')||file.name.endsWith('.xls')) {
                          const XLSX = await import('xlsx');
                          const buf = await file.arrayBuffer();
                          const wb = XLSX.read(buf);
                          const ws = wb.Sheets[wb.SheetNames[0]];
                          const data = XLSX.utils.sheet_to_json(ws, {defval:''});
                          rows = data.map(r=>({
                            employeeNumber: String(r.employeeNumber||r['Employee Number']||r['Emp No']||'').trim(),
                            date: String(r.date||r['Date']||'').trim(),
                            status: String(r.status||r['Status']||'PRESENT').trim().toUpperCase(),
                            inTime: String(r.inTime||r['In Time']||r['Check In']||'').trim(),
                            outTime: String(r.outTime||r['Out Time']||r['Check Out']||'').trim(),
                            remarks: String(r.remarks||r['Remarks']||'').trim(),
                          }));
                        } else if (file.name.endsWith('.pdf')) {
                          setUploadError('PDF import: Please ensure your PDF has text data. Scanned PDFs are not supported. Use CSV or Excel for best results.');
                          return;
                        }
                        rows = rows.filter(r=>r.employeeNumber&&r.date);
                        setUploadRows(rows);
                      } catch(err) {
                        setUploadError('Error reading file: '+err.message);
                      }
                    }}
                  />
                </div>

                {/* Paste CSV */}
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Or Paste CSV Data</label>
                  <textarea
                    className="w-full border rounded-lg px-3 py-2 text-xs font-mono h-28"
                    placeholder={'employeeNumber,date,status,inTime,outTime,remarks\nEMP-001,2026-07-08,PRESENT,09:00,18:00,'}
                    onChange={e=>{
                      const text = e.target.value.trim();
                      setUploadResults(null); setUploadError('');
                      if (!text) { setUploadRows([]); return; }
                      const lines = text.split('\n').filter(l=>l.trim());
                      if (lines.length<2) { setUploadRows([]); return; }
                      const headers = lines[0].split(',').map(h=>h.trim());
                      const rows = lines.slice(1).map(l=>{
                        const vals = l.split(',').map(v=>v.trim());
                        const obj = {};
                        headers.forEach((h,i)=>obj[h]=vals[i]||'');
                        return obj;
                      }).filter(r=>r.employeeNumber&&r.date);
                      setUploadRows(rows);
                    }}
                  />
                </div>
              </div>

              {uploadError&&<div className="mt-3 bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{uploadError}</div>}
            </div>

            {/* Preview */}
            {uploadRows.length>0&&(
              <div className="bg-white rounded-xl border shadow-sm">
                <div className="p-4 border-b flex justify-between items-center">
                  <h3 className="font-bold text-gray-700">Step 3: Preview & Import ({uploadRows.length} records)</h3>
                  <button
                    onClick={async()=>{
                      setUploadImporting(true); setUploadResults(null);
                      const empRes = await fetch(`${API}/employees?limit=200`,{headers:{Authorization:`Bearer ${getToken()}`}});
                      const empData = await empRes.json();
                      const empMap = {};
                      (empData.data||[]).forEach(e=>{ empMap[e.employeeNumber]=e.id; });

                      let success=0, failed=0, errors=[];
                      for (const row of uploadRows) {
                        const empId = empMap[row.employeeNumber];
                        if (!empId) { failed++; errors.push(`${row.employeeNumber}: Employee not found`); continue; }
                        try {
                          const body = {
                            employeeId:empId,
                            date:row.date,
                            status:row.status||'PRESENT',
                            checkIn:row.inTime?`${row.date}T${row.inTime}:00`:undefined,
                            checkOut:row.outTime?`${row.date}T${row.outTime}:00`:undefined,
                            remarks:row.remarks||undefined,
                          };
                          const res = await fetch(`${API}/attendance`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
                          if (res.ok) success++;
                          else { const d=await res.json(); failed++; errors.push(`${row.employeeNumber} ${row.date}: ${Array.isArray(d.message)?d.message.join(', '):d.message}`); }
                        } catch(err) { failed++; errors.push(`${row.employeeNumber}: ${err.message}`); }
                      }
                      setUploadResults({total:uploadRows.length,success,failed,errors});
                      setUploadImporting(false);
                      if (success>0) fetchAll();
                    }}
                    disabled={uploadImporting}
                    className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {uploadImporting?'Importing...':'🚀 Import All'}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500 uppercase">
                      <tr><th className="px-3 py-2 text-left">Emp No</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">In Time</th><th className="px-3 py-2 text-left">Out Time</th><th className="px-3 py-2 text-left">Remarks</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {uploadRows.slice(0,15).map((row,i)=>(
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono font-bold text-indigo-600">{row.employeeNumber}</td>
                          <td className="px-3 py-2">{row.date}</td>
                          <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[row.status]||'bg-gray-100'}`}>{row.status}</span></td>
                          <td className="px-3 py-2">{row.inTime||'—'}</td>
                          <td className="px-3 py-2">{row.outTime||'—'}</td>
                          <td className="px-3 py-2 text-gray-500">{row.remarks||'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {uploadRows.length>15&&<div className="px-4 py-2 text-xs text-gray-400">...and {uploadRows.length-15} more rows</div>}
                </div>
              </div>
            )}

            {/* Results */}
            {uploadResults&&(
              <div className={`rounded-xl border p-5 ${uploadResults.failed===0?'bg-green-50 border-green-200':'bg-yellow-50 border-yellow-200'}`}>
                <h3 className="font-bold text-gray-800 mb-3">Import Results</h3>
                <div className="grid grid-cols-3 gap-4 mb-3 text-center">
                  <div><div className="text-2xl font-bold text-gray-800">{uploadResults.total}</div><div className="text-xs text-gray-500">Total</div></div>
                  <div><div className="text-2xl font-bold text-green-600">{uploadResults.success}</div><div className="text-xs text-gray-500">Imported</div></div>
                  <div><div className="text-2xl font-bold text-red-600">{uploadResults.failed}</div><div className="text-xs text-gray-500">Failed</div></div>
                </div>
                {uploadResults.errors.length>0&&(
                  <div className="bg-red-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {uploadResults.errors.map((e,i)=><div key={i} className="text-xs text-red-600 py-0.5">{i+1}. {e}</div>)}
                  </div>
                )}
                {uploadResults.failed===0&&<div className="text-green-600 font-bold text-center text-sm">✅ All attendance records imported successfully!</div>}
              </div>
            )}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
