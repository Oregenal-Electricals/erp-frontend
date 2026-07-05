'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN')}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const STATUS_COLORS = { ACTIVE:'bg-green-100 text-green-700', INACTIVE:'bg-gray-100 text-gray-500', RESIGNED:'bg-orange-100 text-orange-700', TERMINATED:'bg-red-100 text-red-600' };
const EMP_TYPE_COLORS = { PERMANENT:'bg-blue-100 text-blue-700', CONTRACT:'bg-purple-100 text-purple-700', PROBATION:'bg-yellow-100 text-yellow-700', INTERN:'bg-gray-100 text-gray-600' };
const TABS = ['All Employees','Create Employee'];

export default function EmployeesPage() {
  const [activeTab, setActiveTab] = useState('All Employees');
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [viewDetail, setViewDetail] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    firstName:'', lastName:'', email:'', phone:'', dateOfBirth:'', dateOfJoining:'',
    departmentId:'', designationId:'', employmentType:'PERMANENT', gender:'MALE',
    panNumber:'', aadharNumber:'', pfNumber:'', esiNumber:'',
    basicSalary:'', hraAmount:'', conveyanceAmount:'', otherAllowances:'',
    bankAccountNumber:'', bankIfscCode:'', bankName:'',
    address:'', city:'', state:'', pincode:'',
    emergencyContact:'', emergencyPhone:'', remarks:''
  });

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ page, limit:20 });
    if (search) params.set('search', search);
    if (deptFilter) params.set('departmentId', deptFilter);
    if (statusFilter) params.set('status', statusFilter);
    const [eRes, dRes, dsRes, sRes] = await Promise.all([
      fetch(`${API}/employees?${params}`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/employees/departments`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/employees/designations`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/employees/stats`, {headers:{Authorization:`Bearer ${getToken()}`}}),
    ]);
    if (eRes.ok) { const d=await eRes.json(); setEmployees(d.data||[]); setTotal(d.total); setTotalPages(d.totalPages||1); }
    if (dRes.ok) setDepartments(await dRes.json());
    if (dsRes.ok) setDesignations(await dsRes.json());
    if (sRes.ok) setStats(await sRes.json());
    setLoading(false);
  }

  useEffect(()=>{ fetchAll(); },[page, search, deptFilter, statusFilter]);

  async function handleCreate() {
    setSaving(true); setError('');
    const body = {
      ...form,
      basicSalary:parseFloat(form.basicSalary)||0,
      hraAmount:parseFloat(form.hraAmount)||0,
      conveyanceAmount:parseFloat(form.conveyanceAmount)||0,
      otherAllowances:parseFloat(form.otherAllowances)||0,
      dateOfJoining:new Date(form.dateOfJoining).toISOString(),
    };
    if (form.dateOfBirth) body.dateOfBirth = new Date(form.dateOfBirth).toISOString();
    Object.keys(body).forEach(k => { if (body[k]==='') delete body[k]; });
    const res = await fetch(`${API}/employees`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    const data = await res.json();
    if (res.ok) { setActiveTab('All Employees'); fetchAll(); setForm({firstName:'',lastName:'',email:'',phone:'',dateOfBirth:'',dateOfJoining:'',departmentId:'',designationId:'',employmentType:'PERMANENT',gender:'MALE',panNumber:'',aadharNumber:'',pfNumber:'',esiNumber:'',basicSalary:'',hraAmount:'',conveyanceAmount:'',otherAllowances:'',bankAccountNumber:'',bankIfscCode:'',bankName:'',address:'',city:'',state:'',pincode:'',emergencyContact:'',emergencyPhone:'',remarks:''}); }
    else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    setSaving(false);
  }

  async function handleUpdate() {
    setSaving(true); setError('');
    const body = { ...editModal };
    if (body.basicSalary) body.basicSalary = parseFloat(body.basicSalary);
    if (body.hraAmount) body.hraAmount = parseFloat(body.hraAmount);
    if (body.conveyanceAmount) body.conveyanceAmount = parseFloat(body.conveyanceAmount);
    if (body.otherAllowances) body.otherAllowances = parseFloat(body.otherAllowances);
    const res = await fetch(`${API}/employees/${editModal.id}`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    const data = await res.json();
    if (res.ok) { setEditModal(null); fetchAll(); }
    else setError(data.message||'Failed');
    setSaving(false);
  }

  async function openDetail(id) {
    const res = await fetch(`${API}/employees/${id}`,{headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setViewDetail(await res.json());
  }

  const grossSalary = (parseFloat(form.basicSalary)||0)+(parseFloat(form.hraAmount)||0)+(parseFloat(form.conveyanceAmount)||0)+(parseFloat(form.otherAllowances)||0);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
            <p className="text-gray-500 text-sm mt-1">Employee records, departments and designations</p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            {[
              {label:'Total',value:stats.total,color:'bg-gray-50'},
              {label:'Active',value:stats.active,color:'bg-green-50'},
              {label:'On Probation',value:stats.onProbation,color:'bg-yellow-50'},
              {label:'Contract',value:stats.contract,color:'bg-purple-50'},
              {label:'Resigned',value:stats.resigned,color:'bg-orange-50'},
              {label:'Departments',value:stats.departments,color:'bg-blue-50'},
            ].map(s=>(
              <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-4 border-b">
          {TABS.map(t=><button key={t} onClick={()=>setActiveTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab===t?'border-indigo-600 text-indigo-600':'border-transparent text-gray-500'}`}>{t}</button>)}
        </div>

        {activeTab==='All Employees' && (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <input className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" placeholder="Search name, email, employee number..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
              <select className="border rounded-lg px-3 py-2 text-sm" value={deptFilter} onChange={e=>{setDeptFilter(e.target.value);setPage(1);}}>
                <option value="">All Departments</option>
                {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select className="border rounded-lg px-3 py-2 text-sm" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1);}}>
                <option value="">All Status</option>
                {['ACTIVE','INACTIVE','RESIGNED','TERMINATED'].map(s=><option key={s}>{s}</option>)}
              </select>
              <span className="text-sm text-gray-500 self-center">{total} employees</span>
            </div>

            <div className="bg-white rounded-xl shadow-sm border">
              {loading?<div className="text-center py-10 text-gray-400">Loading...</div>
              :employees.length===0?<div className="text-center py-10 text-gray-400">No employees found. Click "Create Employee" to add one.</div>
              :(
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Employee','Department','Designation','Type','Gross Salary','Joining Date','Status',''].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y">
                    {employees.map(e=>(
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">{e.firstName[0]}{e.lastName[0]}</div>
                            <div>
                              <div className="font-medium text-gray-800">{e.firstName} {e.lastName}</div>
                              <div className="text-xs text-gray-400 font-mono">{e.employeeNumber}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{e.department?.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{e.designation?.name} {e.designation?.grade&&<span className="text-xs bg-gray-100 px-1 rounded">{e.designation.grade}</span>}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${EMP_TYPE_COLORS[e.employmentType]}`}>{e.employmentType}</span></td>
                        <td className="px-4 py-3 font-medium text-green-600">{fmt(e.basicSalary+e.hraAmount+e.conveyanceAmount+e.otherAllowances)}</td>
                        <td className="px-4 py-3 text-xs">{fmtDate(e.dateOfJoining)}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[e.status]}`}>{e.status}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={()=>openDetail(e.id)} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">View</button>
                            <button onClick={()=>setEditModal({...e,departmentId:e.departmentId,designationId:e.designationId})} className="px-2 py-1 text-xs bg-indigo-600 text-white rounded">Edit</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {totalPages>1&&<div className="p-4 border-t flex justify-center gap-2"><button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button><span className="px-3 py-1 text-sm">{page}/{totalPages}</span><button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button></div>}
            </div>
          </div>
        )}

        {activeTab==='Create Employee' && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="font-bold text-gray-800 mb-6">New Employee</h2>
            {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm mb-4">{error}</div>}
            <div className="space-y-6">
              {/* Personal Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Personal Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><label className="block text-xs text-gray-500 mb-1">First Name *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.firstName} onChange={e=>setForm(f=>({...f,firstName:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Last Name *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.lastName} onChange={e=>setForm(f=>({...f,lastName:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Email *</label><input type="email" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Phone *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Date of Birth</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.dateOfBirth} onChange={e=>setForm(f=>({...f,dateOfBirth:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Date of Joining *</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.dateOfJoining} onChange={e=>setForm(f=>({...f,dateOfJoining:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Gender</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.gender} onChange={e=>setForm(f=>({...f,gender:e.target.value}))}>
                      {['MALE','FEMALE','OTHER'].map(g=><option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs text-gray-500 mb-1">Employment Type</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.employmentType} onChange={e=>setForm(f=>({...f,employmentType:e.target.value}))}>
                      {['PERMANENT','CONTRACT','PROBATION','INTERN'].map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Org Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Organization</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div><label className="block text-xs text-gray-500 mb-1">Department *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.departmentId} onChange={e=>setForm(f=>({...f,departmentId:e.target.value}))}>
                      <option value="">— Select —</option>
                      {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs text-gray-500 mb-1">Designation *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.designationId} onChange={e=>setForm(f=>({...f,designationId:e.target.value}))}>
                      <option value="">— Select —</option>
                      {designations.map(d=><option key={d.id} value={d.id}>{d.name} {d.grade?`(${d.grade})`:''}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs text-gray-500 mb-1">Reporting Manager</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.reportingManagerId||''} onChange={e=>setForm(f=>({...f,reportingManagerId:e.target.value}))}>
                      <option value="">— None —</option>
                      {employees.map(e=><option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeNumber})</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Salary */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Salary Structure</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div><label className="block text-xs text-gray-500 mb-1">Basic (₹)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.basicSalary} onChange={e=>setForm(f=>({...f,basicSalary:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">HRA (₹)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.hraAmount} onChange={e=>setForm(f=>({...f,hraAmount:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Conveyance (₹)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.conveyanceAmount} onChange={e=>setForm(f=>({...f,conveyanceAmount:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Other (₹)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.otherAllowances} onChange={e=>setForm(f=>({...f,otherAllowances:e.target.value}))} /></div>
                  <div className="bg-green-50 rounded-lg p-3 text-center"><div className="text-lg font-bold text-green-700">{fmt(grossSalary)}</div><div className="text-xs text-gray-400 mt-1">Gross/Month</div></div>
                </div>
              </div>

              {/* Statutory */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Statutory IDs</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><label className="block text-xs text-gray-500 mb-1">PAN Number</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase" value={form.panNumber} onChange={e=>setForm(f=>({...f,panNumber:e.target.value.toUpperCase()}))} placeholder="ABCPK1234E" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Aadhar Number</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.aadharNumber} onChange={e=>setForm(f=>({...f,aadharNumber:e.target.value}))} placeholder="1234 5678 9012" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">PF Number</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.pfNumber} onChange={e=>setForm(f=>({...f,pfNumber:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">ESI Number</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.esiNumber} onChange={e=>setForm(f=>({...f,esiNumber:e.target.value}))} /></div>
                </div>
              </div>

              {/* Bank */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Bank Details</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-xs text-gray-500 mb-1">Account Number</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.bankAccountNumber} onChange={e=>setForm(f=>({...f,bankAccountNumber:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">IFSC Code</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase" value={form.bankIfscCode} onChange={e=>setForm(f=>({...f,bankIfscCode:e.target.value.toUpperCase()}))} placeholder="HDFC0001234" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Bank Name</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.bankName} onChange={e=>setForm(f=>({...f,bankName:e.target.value}))} /></div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Address & Emergency</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Address</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">City</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">State</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.state} onChange={e=>setForm(f=>({...f,state:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Pincode</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.pincode} onChange={e=>setForm(f=>({...f,pincode:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Emergency Contact</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.emergencyContact} onChange={e=>setForm(f=>({...f,emergencyContact:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Emergency Phone</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.emergencyPhone} onChange={e=>setForm(f=>({...f,emergencyPhone:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Remarks</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))} /></div>
                </div>
              </div>

              <button onClick={handleCreate} disabled={saving||!form.firstName||!form.email||!form.departmentId||!form.designationId||!form.dateOfJoining} className="px-8 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving?'Creating...':'Create Employee'}</button>
            </div>
          </div>
        )}

        {/* VIEW DETAIL MODAL */}
        {viewDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg font-bold">{viewDetail.firstName[0]}{viewDetail.lastName[0]}</div>
                  <div>
                    <div className="font-bold text-gray-900 text-lg">{viewDetail.firstName} {viewDetail.lastName}</div>
                    <div className="font-mono text-xs text-gray-400">{viewDetail.employeeNumber}</div>
                  </div>
                </div>
                <button onClick={()=>setViewDetail(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${STATUS_COLORS[viewDetail.status]}`}>{viewDetail.status}</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${EMP_TYPE_COLORS[viewDetail.employmentType]}`}>{viewDetail.employmentType}</span>
                  <span className="px-2 py-1 rounded text-xs bg-indigo-100 text-indigo-700">{viewDetail.gender}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div className="space-y-2">
                    <div><span className="text-gray-500 text-xs">Department:</span><div className="font-medium">{viewDetail.department?.name}</div></div>
                    <div><span className="text-gray-500 text-xs">Designation:</span><div className="font-medium">{viewDetail.designation?.name}</div></div>
                    <div><span className="text-gray-500 text-xs">Email:</span><div className="font-medium text-xs">{viewDetail.email}</div></div>
                    <div><span className="text-gray-500 text-xs">Phone:</span><div className="font-medium">{viewDetail.phone}</div></div>
                  </div>
                  <div className="space-y-2">
                    <div><span className="text-gray-500 text-xs">Date of Joining:</span><div className="font-medium">{fmtDate(viewDetail.dateOfJoining)}</div></div>
                    <div><span className="text-gray-500 text-xs">Date of Birth:</span><div className="font-medium">{fmtDate(viewDetail.dateOfBirth)}</div></div>
                    <div><span className="text-gray-500 text-xs">PAN:</span><div className="font-mono font-medium">{viewDetail.panNumber||'—'}</div></div>
                    <div><span className="text-gray-500 text-xs">PF Number:</span><div className="font-mono font-medium">{viewDetail.pfNumber||'—'}</div></div>
                  </div>
                  <div className="space-y-2">
                    <div><span className="text-gray-500 text-xs">Basic Salary:</span><div className="font-bold text-green-600">{fmt(viewDetail.basicSalary)}</div></div>
                    <div><span className="text-gray-500 text-xs">HRA:</span><div className="font-medium">{fmt(viewDetail.hraAmount)}</div></div>
                    <div><span className="text-gray-500 text-xs">Conveyance:</span><div className="font-medium">{fmt(viewDetail.conveyanceAmount)}</div></div>
                    <div><span className="text-gray-500 text-xs">Gross/Month:</span><div className="font-bold text-blue-600">{fmt(viewDetail.basicSalary+viewDetail.hraAmount+viewDetail.conveyanceAmount+viewDetail.otherAllowances)}</div></div>
                  </div>
                </div>
                {(viewDetail.city||viewDetail.address) && (
                  <div className="p-3 bg-gray-50 rounded text-sm">
                    <span className="text-gray-500 text-xs block mb-1">Address:</span>
                    {viewDetail.address} {viewDetail.city&&`, ${viewDetail.city}`} {viewDetail.state&&`, ${viewDetail.state}`} {viewDetail.pincode&&`- ${viewDetail.pincode}`}
                  </div>
                )}
                {viewDetail.bankAccountNumber && (
                  <div className="p-3 bg-blue-50 rounded text-sm">
                    <span className="text-gray-500 text-xs block mb-1">Bank:</span>
                    {viewDetail.bankName} | A/C: ****{viewDetail.bankAccountNumber.slice(-4)} | IFSC: {viewDetail.bankIfscCode}
                  </div>
                )}
                {viewDetail.documents?.length > 0 && (
                  <div><div className="text-xs text-gray-500 mb-2">Documents ({viewDetail.documents.length})</div>
                    <div className="flex gap-2 flex-wrap">
                      {viewDetail.documents.map(d=><span key={d.id} className="px-2 py-1 bg-gray-100 rounded text-xs">📄 {d.documentType}: {d.fileName}</span>)}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={()=>{setEditModal({...viewDetail,departmentId:viewDetail.departmentId,designationId:viewDetail.designationId});setViewDetail(null);}} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Edit</button>
                <button onClick={()=>setViewDetail(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT MODAL */}
        {editModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="font-bold text-gray-800">Edit — {editModal.firstName} {editModal.lastName}</h2>
                <button onClick={()=>setEditModal(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-gray-500 mb-1">Department</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={editModal.departmentId} onChange={e=>setEditModal(m=>({...m,departmentId:e.target.value}))}>
                      {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs text-gray-500 mb-1">Designation</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={editModal.designationId} onChange={e=>setEditModal(m=>({...m,designationId:e.target.value}))}>
                      {designations.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs text-gray-500 mb-1">Status</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={editModal.status} onChange={e=>setEditModal(m=>({...m,status:e.target.value}))}>
                      {['ACTIVE','INACTIVE','RESIGNED','TERMINATED'].map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs text-gray-500 mb-1">Basic Salary (₹)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={editModal.basicSalary} onChange={e=>setEditModal(m=>({...m,basicSalary:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">HRA (₹)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={editModal.hraAmount} onChange={e=>setEditModal(m=>({...m,hraAmount:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Conveyance (₹)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={editModal.conveyanceAmount} onChange={e=>setEditModal(m=>({...m,conveyanceAmount:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Other Allowances (₹)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={editModal.otherAllowances} onChange={e=>setEditModal(m=>({...m,otherAllowances:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">City</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={editModal.city||''} onChange={e=>setEditModal(m=>({...m,city:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Remarks</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={editModal.remarks||''} onChange={e=>setEditModal(m=>({...m,remarks:e.target.value}))} /></div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={()=>setEditModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleUpdate} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Saving...':'Save Changes'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
