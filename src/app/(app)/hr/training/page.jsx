'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';

const CAT_COLORS = { SAFETY:'bg-red-100 text-red-700', TECHNICAL:'bg-blue-100 text-blue-700', SOFT_SKILLS:'bg-purple-100 text-purple-700', COMPLIANCE:'bg-orange-100 text-orange-700', INDUCTION:'bg-green-100 text-green-700' };
const STATUS_COLORS = { SCHEDULED:'bg-yellow-100 text-yellow-700', ONGOING:'bg-blue-100 text-blue-700', COMPLETED:'bg-green-100 text-green-700', CANCELLED:'bg-red-100 text-red-600' };
const ENROLL_COLORS = { ENROLLED:'bg-blue-100 text-blue-700', ATTENDED:'bg-yellow-100 text-yellow-700', COMPLETED:'bg-green-100 text-green-700', FAILED:'bg-red-100 text-red-600', CANCELLED:'bg-gray-100 text-gray-500' };
const TABS = ['Sessions','Programs','Create Session','Create Program'];

export default function TrainingPage() {
  const [activeTab, setActiveTab] = useState('Sessions');
  const [sessions, setSessions] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [enrollModal, setEnrollModal] = useState(null);
  const [selectedEmps, setSelectedEmps] = useState([]);
  const [completeModal, setCompleteModal] = useState(null);
  const [completeForm, setCompleteForm] = useState({score:'',passed:true,remarks:''});
  const [programModal, setProgramModal] = useState(null);

  const [sessionForm, setSessionForm] = useState({
    trainingProgramId:'', title:'', startDate:'', endDate:'',
    venue:'', trainer:'', maxParticipants:20, remarks:''
  });
  const [progForm, setProgForm] = useState({
    code:'', name:'', category:'TECHNICAL', description:'',
    durationHours:8, isMandatory:false, validityMonths:'', targetDepartment:''
  });

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const [sRes, pRes, eRes, stRes] = await Promise.all([
      fetch(`${API}/training/sessions?limit=50`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/training/programs`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/employees?limit=200`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/training/stats`, {headers:{Authorization:`Bearer ${getToken()}`}}),
    ]);
    if (sRes.ok) { const d=await sRes.json(); setSessions(d.data||[]); }
    if (pRes.ok) setPrograms(await pRes.json());
    if (eRes.ok) { const d=await eRes.json(); setEmployees(d.data||[]); }
    if (stRes.ok) setStats(await stRes.json());
    setLoading(false);
  }

  async function fetchSessionDetail(id) {
    const res = await fetch(`${API}/training/sessions/${id}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setSessionDetail(await res.json());
  }

  useEffect(()=>{ fetchAll(); },[]);
  useEffect(()=>{ if (selectedSession) fetchSessionDetail(selectedSession.id); },[selectedSession]);

  async function handleCreateSession() {
    setSaving(true); setError('');
    const body = {...sessionForm, maxParticipants:parseInt(sessionForm.maxParticipants)};
    if (!body.venue) delete body.venue;
    if (!body.trainer) delete body.trainer;
    if (!body.remarks) delete body.remarks;
    const res = await fetch(`${API}/training/sessions`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    const data = await res.json();
    if (res.ok) { fetchAll(); setActiveTab('Sessions'); setSessionForm({trainingProgramId:'',title:'',startDate:'',endDate:'',venue:'',trainer:'',maxParticipants:20,remarks:''}); }
    else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    setSaving(false);
  }

  async function handleCreateProgram() {
    setSaving(true); setError('');
    const body = {...progForm, durationHours:parseFloat(progForm.durationHours)||8};
    if (progForm.validityMonths) body.validityMonths = parseInt(progForm.validityMonths);
    else delete body.validityMonths;
    if (!body.targetDepartment) delete body.targetDepartment;
    if (!body.description) delete body.description;
    const res = await fetch(`${API}/training/programs`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    const data = await res.json();
    if (res.ok) { fetchAll(); setActiveTab('Programs'); setProgForm({code:'',name:'',category:'TECHNICAL',description:'',durationHours:8,isMandatory:false,validityMonths:'',targetDepartment:''}); }
    else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    setSaving(false);
  }

  async function handleEnroll() {
    setSaving(true); setError('');
    const res = await fetch(`${API}/training/enroll`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify({sessionId:enrollModal.id,employeeIds:selectedEmps})});
    const data = await res.json();
    if (res.ok) { setEnrollModal(null); setSelectedEmps([]); fetchSessionDetail(enrollModal.id); }
    else setError(data.message||'Failed');
    setSaving(false);
  }

  async function handleMarkAllAttendance(attended) {
    if (!sessionDetail) return;
    const records = sessionDetail.enrollments.filter(e=>e.status==='ENROLLED'||e.status==='ATTENDED').map(e=>({enrollmentId:e.id,attended}));
    if (!records.length) return;
    await fetch(`${API}/training/sessions/${sessionDetail.id}/attendance`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify({records})});
    fetchSessionDetail(sessionDetail.id);
  }

  async function handleComplete() {
    setSaving(true); setError('');
    const body = {score:parseFloat(completeForm.score)||undefined, passed:completeForm.passed, remarks:completeForm.remarks||undefined};
    const res = await fetch(`${API}/training/enrollments/${completeModal.id}/complete`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    const data = await res.json();
    if (res.ok) { setCompleteModal(null); fetchSessionDetail(sessionDetail.id); }
    else setError(data.message||'Failed');
    setSaving(false);
  }

  async function handleCompleteSession(id) {
    if (!confirm('Mark this session as COMPLETED?')) return;
    await fetch(`${API}/training/sessions/${id}/complete`,{method:'PUT',headers:{Authorization:`Bearer ${getToken()}`}});
    fetchAll();
    if (sessionDetail?.id===id) fetchSessionDetail(id);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Training Management</h1>
            <p className="text-gray-500 text-sm mt-1">Programs, sessions, enrollment and certification</p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            {[
              {label:'Programs',value:stats.programs,color:'bg-blue-50'},
              {label:'Sessions',value:stats.sessions,color:'bg-indigo-50'},
              {label:'Enrollments',value:stats.enrollments,color:'bg-gray-50'},
              {label:'Completed',value:stats.completed,color:'bg-green-50'},
              {label:'Upcoming',value:stats.upcoming,color:'bg-yellow-50'},
              {label:'Completion %',value:stats.completionRate+'%',color:'bg-purple-50'},
            ].map(s=>(
              <div key={s.label} className={`${s.color} rounded-xl p-3 text-center border`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-4 border-b overflow-x-auto">
          {TABS.map(t=><button key={t} onClick={()=>{setActiveTab(t);setError('');setSelectedSession(null);setSessionDetail(null);}} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${activeTab===t?'border-indigo-600 text-indigo-600':'border-transparent text-gray-500'}`}>{t}</button>)}
        </div>

        {/* SESSIONS */}
        {activeTab==='Sessions' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-5">
              <div className="bg-white rounded-xl border shadow-sm">
                {loading?<div className="text-center py-10 text-gray-400">Loading...</div>
                :sessions.length===0?<div className="text-center py-10 text-gray-400">No sessions. Create one first.</div>:(
                  <div className="divide-y">
                    {sessions.map(s=>(
                      <div key={s.id} onClick={()=>setSelectedSession(s)} className={`p-4 cursor-pointer hover:bg-gray-50 ${selectedSession?.id===s.id?'bg-indigo-50 border-r-4 border-indigo-600':''}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-800">{s.title}</div>
                            <div className="text-xs text-gray-400 font-mono mt-0.5">{s.sessionNumber}</div>
                            <div className="text-xs text-gray-500 mt-1">{s.trainingProgram?.name}</div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[s.status]}`}>{s.status}</span>
                        </div>
                        <div className="flex gap-3 mt-2 text-xs text-gray-400">
                          <span>📅 {fmtDate(s.startDate)}</span>
                          <span>👥 {s._count.enrollments}/{s.maxParticipants}</span>
                          {s.trainer&&<span>🎓 {s.trainer}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SESSION DETAIL */}
            <div className="col-span-12 md:col-span-7">
              {!selectedSession ? (
                <div className="bg-white rounded-xl border shadow-sm p-16 text-center">
                  <div className="text-5xl mb-4">🎓</div>
                  <div className="text-gray-400">Select a session to view details</div>
                </div>
              ) : sessionDetail ? (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border shadow-sm p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="font-bold text-gray-800 text-lg">{sessionDetail.title}</h2>
                        <div className="font-mono text-xs text-gray-400">{sessionDetail.sessionNumber}</div>
                        <div className="flex gap-2 mt-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${STATUS_COLORS[sessionDetail.status]}`}>{sessionDetail.status}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${CAT_COLORS[sessionDetail.trainingProgram?.category]}`}>{sessionDetail.trainingProgram?.category}</span>
                          {sessionDetail.trainingProgram?.isMandatory&&<span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">MANDATORY</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {sessionDetail.status!=='COMPLETED'&&sessionDetail.status!=='CANCELLED'&&(
                          <>
                            <button onClick={()=>{setEnrollModal(sessionDetail);setSelectedEmps([]);setError('');}} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs">+ Enroll</button>
                            <button onClick={()=>handleCompleteSession(sessionDetail.id)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs">✓ Complete</button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      {[
                        ['Program',sessionDetail.trainingProgram?.name],
                        ['Venue',sessionDetail.venue||'—'],
                        ['Trainer',sessionDetail.trainer||'—'],
                        ['Start',fmtDate(sessionDetail.startDate)],
                        ['End',fmtDate(sessionDetail.endDate)],
                        ['Duration',sessionDetail.trainingProgram?.durationHours+'h'],
                      ].map(([l,v])=>(
                        <div key={l}><span className="text-gray-500 text-xs">{l}:</span><div className="font-medium">{v}</div></div>
                      ))}
                    </div>
                  </div>

                  {/* Enrollments */}
                  <div className="bg-white rounded-xl border shadow-sm">
                    <div className="p-4 border-b flex justify-between items-center">
                      <h3 className="font-bold text-gray-700">Participants ({sessionDetail.enrollments?.length}/{sessionDetail.maxParticipants})</h3>
                      {sessionDetail.status!=='COMPLETED'&&(
                        <div className="flex gap-2">
                          <button onClick={()=>handleMarkAllAttendance(true)} className="px-3 py-1 text-xs bg-green-600 text-white rounded">All Present</button>
                          <button onClick={()=>handleMarkAllAttendance(false)} className="px-3 py-1 text-xs bg-gray-400 text-white rounded">All Absent</button>
                        </div>
                      )}
                    </div>
                    {sessionDetail.enrollments?.length===0?<div className="text-center py-8 text-gray-400">No participants enrolled yet.</div>:(
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                          <tr>{['Employee','Dept','Status','Score','Certificate',''].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y">
                          {sessionDetail.enrollments.map(e=>(
                            <tr key={e.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2"><div className="font-medium">{e.employee?.firstName} {e.employee?.lastName}</div><div className="text-xs text-gray-400 font-mono">{e.employee?.employeeNumber}</div></td>
                              <td className="px-3 py-2 text-xs">{e.employee?.department?.name}</td>
                              <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${ENROLL_COLORS[e.status]}`}>{e.status}</span></td>
                              <td className="px-3 py-2">{e.score!=null?e.score+'%':'—'}</td>
                              <td className="px-3 py-2 text-xs font-mono">{e.certificateNumber||'—'}</td>
                              <td className="px-3 py-2">
                                {['ATTENDED','ENROLLED'].includes(e.status)&&sessionDetail.status!=='CANCELLED'&&(
                                  <button onClick={()=>{setCompleteModal(e);setCompleteForm({score:'',passed:true,remarks:''}); setError('');}} className="px-2 py-1 text-xs bg-indigo-600 text-white rounded">Complete</button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              ) : <div className="text-center py-10 text-gray-400">Loading...</div>}
            </div>
          </div>
        )}

        {/* PROGRAMS */}
        {activeTab==='Programs' && (
          <div className="bg-white rounded-xl border shadow-sm">
            {programs.length===0?<div className="text-center py-10 text-gray-400">No programs. Create one first.</div>:(
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>{['Code','Name','Category','Duration','Mandatory','Validity','Sessions'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {programs.map(p=>(
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600">{p.code}</td>
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-bold ${CAT_COLORS[p.category]}`}>{p.category}</span></td>
                      <td className="px-4 py-3">{p.durationHours}h</td>
                      <td className="px-4 py-3">{p.isMandatory?<span className="text-red-600 font-bold">Yes</span>:<span className="text-gray-400">No</span>}</td>
                      <td className="px-4 py-3 text-xs">{p.validityMonths?p.validityMonths+' months':'No expiry'}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-bold">{p._count?.sessions||0}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* CREATE SESSION */}
        {activeTab==='Create Session' && (
          <div className="bg-white rounded-xl border shadow-sm p-6 max-w-2xl">
            <h2 className="font-bold text-gray-800 mb-4">Schedule Training Session</h2>
            {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm mb-4">{error}</div>}
            <div className="space-y-4">
              <div><label className="block text-xs text-gray-500 mb-1">Training Program *</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={sessionForm.trainingProgramId} onChange={e=>setSessionForm(f=>({...f,trainingProgramId:e.target.value}))}>
                  <option value="">— Select Program —</option>
                  {programs.map(p=><option key={p.id} value={p.id}>{p.name} ({p.category}, {p.durationHours}h)</option>)}
                </select>
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Session Title *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={sessionForm.title} onChange={e=>setSessionForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Safety Training Batch 1 - July 2026" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-gray-500 mb-1">Start Date *</label><input type="datetime-local" className="w-full border rounded-lg px-3 py-2 text-sm" value={sessionForm.startDate} onChange={e=>setSessionForm(f=>({...f,startDate:e.target.value}))} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">End Date *</label><input type="datetime-local" className="w-full border rounded-lg px-3 py-2 text-sm" value={sessionForm.endDate} onChange={e=>setSessionForm(f=>({...f,endDate:e.target.value}))} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Venue</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={sessionForm.venue} onChange={e=>setSessionForm(f=>({...f,venue:e.target.value}))} placeholder="Training Hall A" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Trainer</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={sessionForm.trainer} onChange={e=>setSessionForm(f=>({...f,trainer:e.target.value}))} placeholder="Trainer name" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Max Participants</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={sessionForm.maxParticipants} onChange={e=>setSessionForm(f=>({...f,maxParticipants:e.target.value}))} /></div>
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Remarks</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={sessionForm.remarks} onChange={e=>setSessionForm(f=>({...f,remarks:e.target.value}))} /></div>
              <button onClick={handleCreateSession} disabled={saving||!sessionForm.trainingProgramId||!sessionForm.title||!sessionForm.startDate||!sessionForm.endDate} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving?'Scheduling...':'Schedule Session'}</button>
            </div>
          </div>
        )}

        {/* CREATE PROGRAM */}
        {activeTab==='Create Program' && (
          <div className="bg-white rounded-xl border shadow-sm p-6 max-w-2xl">
            <h2 className="font-bold text-gray-800 mb-4">Create Training Program</h2>
            {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm mb-4">{error}</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-gray-500 mb-1">Code *</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase" value={progForm.code} onChange={e=>setProgForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="TRG-001" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Name *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={progForm.name} onChange={e=>setProgForm(f=>({...f,name:e.target.value}))} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Category</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={progForm.category} onChange={e=>setProgForm(f=>({...f,category:e.target.value}))}>
                    {['SAFETY','TECHNICAL','SOFT_SKILLS','COMPLIANCE','INDUCTION'].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Duration (hours)</label><input type="number" step="0.5" className="w-full border rounded-lg px-3 py-2 text-sm" value={progForm.durationHours} onChange={e=>setProgForm(f=>({...f,durationHours:e.target.value}))} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Validity (months)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={progForm.validityMonths} onChange={e=>setProgForm(f=>({...f,validityMonths:e.target.value}))} placeholder="Leave blank if no expiry" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Target Department</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={progForm.targetDepartment} onChange={e=>setProgForm(f=>({...f,targetDepartment:e.target.value}))} /></div>
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Description</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={progForm.description} onChange={e=>setProgForm(f=>({...f,description:e.target.value}))} /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={progForm.isMandatory} onChange={e=>setProgForm(f=>({...f,isMandatory:e.target.checked}))} />Mandatory for all applicable employees</label>
              <button onClick={handleCreateProgram} disabled={saving||!progForm.code||!progForm.name} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving?'Creating...':'Create Program'}</button>
            </div>
          </div>
        )}

        {/* ENROLL MODAL */}
        {enrollModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-screen overflow-y-auto">
              <div className="p-5 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="font-bold text-gray-800">Enroll Employees — {enrollModal.sessionNumber}</h2>
                <button onClick={()=>setEnrollModal(null)} className="text-gray-400">✕</button>
              </div>
              <div className="p-5">
                {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm mb-3">{error}</div>}
                <div className="text-xs text-gray-500 mb-3">Select employees to enroll ({selectedEmps.length} selected)</div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {employees.map(e=>{
                    const alreadyEnrolled = sessionDetail?.enrollments?.find(en=>en.employeeId===e.id);
                    return (
                      <label key={e.id} className={`flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer ${alreadyEnrolled?'opacity-40':''}`}>
                        <input type="checkbox" disabled={!!alreadyEnrolled} checked={selectedEmps.includes(e.id)||!!alreadyEnrolled} onChange={ev=>{
                          if (ev.target.checked) setSelectedEmps(s=>[...s,e.id]);
                          else setSelectedEmps(s=>s.filter(id=>id!==e.id));
                        }} />
                        <div>
                          <div className="text-sm font-medium">{e.firstName} {e.lastName}</div>
                          <div className="text-xs text-gray-400">{e.employeeNumber} · {e.department?.name}</div>
                        </div>
                        {alreadyEnrolled&&<span className="ml-auto text-xs text-green-600">Enrolled</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="p-5 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={()=>setEnrollModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleEnroll} disabled={saving||selectedEmps.length===0} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Enrolling...':'Enroll Selected'}</button>
              </div>
            </div>
          </div>
        )}

        {/* COMPLETE MODAL */}
        {completeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b flex justify-between">
                <h2 className="font-bold text-gray-800">Complete Training — {completeModal.employee?.firstName}</h2>
                <button onClick={()=>setCompleteModal(null)} className="text-gray-400">✕</button>
              </div>
              <div className="p-5 space-y-4">
                {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div><label className="block text-xs text-gray-500 mb-1">Score (%)</label><input type="number" min="0" max="100" className="w-full border rounded-lg px-3 py-2 text-sm" value={completeForm.score} onChange={e=>setCompleteForm(f=>({...f,score:e.target.value}))} placeholder="0-100" /></div>
                <div className="flex gap-3">
                  <button onClick={()=>setCompleteForm(f=>({...f,passed:true}))} className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 ${completeForm.passed?'border-green-500 bg-green-50 text-green-700':'border-gray-200 text-gray-500'}`}>✅ Passed</button>
                  <button onClick={()=>setCompleteForm(f=>({...f,passed:false}))} className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 ${!completeForm.passed?'border-red-500 bg-red-50 text-red-700':'border-gray-200 text-gray-500'}`}>❌ Failed</button>
                </div>
                {completeForm.passed&&<div className="bg-green-50 rounded-lg p-3 text-xs text-green-700">Certificate will be auto-generated on save</div>}
                <div><label className="block text-xs text-gray-500 mb-1">Remarks</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={completeForm.remarks} onChange={e=>setCompleteForm(f=>({...f,remarks:e.target.value}))} /></div>
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                <button onClick={()=>setCompleteModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleComplete} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Saving...':'Save Result'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
