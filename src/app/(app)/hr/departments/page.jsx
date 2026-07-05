'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showDesigModal, setShowDesigModal] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [editDesig, setEditDesig] = useState(null);
  const [deptForm, setDeptForm] = useState({code:'',name:'',description:''});
  const [desigForm, setDesigForm] = useState({code:'',name:'',grade:'',description:''});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('Departments');

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const [dRes, dsRes] = await Promise.all([
      fetch(`${API}/employees/departments`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/employees/designations`, {headers:{Authorization:`Bearer ${getToken()}`}}),
    ]);
    if (dRes.ok) setDepartments(await dRes.json());
    if (dsRes.ok) setDesignations(await dsRes.json());
    setLoading(false);
  }

  useEffect(()=>{ fetchAll(); },[]);

  async function handleDeptSave() {
    setSaving(true); setError('');
    const url = editDept ? `${API}/employees/departments/${editDept.id}` : `${API}/employees/departments`;
    const method = editDept ? 'PUT' : 'POST';
    const res = await fetch(url,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(deptForm)});
    const data = await res.json();
    if (res.ok) { setShowDeptModal(false); setEditDept(null); setDeptForm({code:'',name:'',description:''}); fetchAll(); }
    else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    setSaving(false);
  }

  async function handleDesigSave() {
    setSaving(true); setError('');
    const url = editDesig ? `${API}/employees/designations/${editDesig.id}` : `${API}/employees/designations`;
    const method = editDesig ? 'PUT' : 'POST';
    const res = await fetch(url,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(desigForm)});
    const data = await res.json();
    if (res.ok) { setShowDesigModal(false); setEditDesig(null); setDesigForm({code:'',name:'',grade:'',description:''}); fetchAll(); }
    else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    setSaving(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Departments & Designations</h1>
            <p className="text-gray-500 text-sm mt-1">Manage organizational structure</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b">
          {['Departments','Designations'].map(t=>(
            <button key={t} onClick={()=>setActiveTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab===t?'border-indigo-600 text-indigo-600':'border-transparent text-gray-500'}`}>{t}</button>
          ))}
        </div>

        {activeTab==='Departments' && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={()=>{setDeptForm({code:'',name:'',description:''});setEditDept(null);setError('');setShowDeptModal(true);}} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">+ New Department</button>
            </div>
            <div className="bg-white rounded-xl border shadow-sm">
              {loading?<div className="text-center py-10 text-gray-400">Loading...</div>:
              departments.length===0?<div className="text-center py-10 text-gray-400">No departments yet.</div>:(
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>{['Code','Name','Description','Employees',''].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {departments.map(d=>(
                      <tr key={d.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono font-bold text-indigo-600">{d.code}</td>
                        <td className="px-4 py-3 font-medium">{d.name}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{d.description||'—'}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-bold">{d._count?.employees||0}</span></td>
                        <td className="px-4 py-3">
                          <button onClick={()=>{setDeptForm({code:d.code,name:d.name,description:d.description||''});setEditDept(d);setError('');setShowDeptModal(true);}} className="px-3 py-1 text-xs border rounded hover:bg-gray-50">Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab==='Designations' && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={()=>{setDesigForm({code:'',name:'',grade:'',description:''});setEditDesig(null);setError('');setShowDesigModal(true);}} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">+ New Designation</button>
            </div>
            <div className="bg-white rounded-xl border shadow-sm">
              {loading?<div className="text-center py-10 text-gray-400">Loading...</div>:
              designations.length===0?<div className="text-center py-10 text-gray-400">No designations yet.</div>:(
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>{['Code','Name','Grade','Description','Employees',''].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {designations.map(d=>(
                      <tr key={d.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono font-bold text-purple-600">{d.code}</td>
                        <td className="px-4 py-3 font-medium">{d.name}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-bold">{d.grade||'—'}</span></td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{d.description||'—'}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-bold">{d._count?.employees||0}</span></td>
                        <td className="px-4 py-3">
                          <button onClick={()=>{setDesigForm({code:d.code,name:d.name,grade:d.grade||'',description:d.description||''});setEditDesig(d);setError('');setShowDesigModal(true);}} className="px-3 py-1 text-xs border rounded hover:bg-gray-50">Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* DEPT MODAL */}
        {showDeptModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b flex justify-between">
                <h2 className="font-bold text-gray-800">{editDept?'Edit':'New'} Department</h2>
                <button onClick={()=>setShowDeptModal(false)} className="text-gray-400">✕</button>
              </div>
              <div className="p-5 space-y-4">
                {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div><label className="block text-xs text-gray-500 mb-1">Code *</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase" value={deptForm.code} onChange={e=>setDeptForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="PROD" disabled={!!editDept} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Name *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={deptForm.name} onChange={e=>setDeptForm(f=>({...f,name:e.target.value}))} placeholder="Production" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Description</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={deptForm.description} onChange={e=>setDeptForm(f=>({...f,description:e.target.value}))} /></div>
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                <button onClick={()=>setShowDeptModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleDeptSave} disabled={saving||!deptForm.code||!deptForm.name} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Saving...':'Save'}</button>
              </div>
            </div>
          </div>
        )}

        {/* DESIG MODAL */}
        {showDesigModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b flex justify-between">
                <h2 className="font-bold text-gray-800">{editDesig?'Edit':'New'} Designation</h2>
                <button onClick={()=>setShowDesigModal(false)} className="text-gray-400">✕</button>
              </div>
              <div className="p-5 space-y-4">
                {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div><label className="block text-xs text-gray-500 mb-1">Code *</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase" value={desigForm.code} onChange={e=>setDesigForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="MGR" disabled={!!editDesig} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Name *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={desigForm.name} onChange={e=>setDesigForm(f=>({...f,name:e.target.value}))} placeholder="Manager" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Grade</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={desigForm.grade} onChange={e=>setDesigForm(f=>({...f,grade:e.target.value}))}>
                    <option value="">— Select Grade —</option>
                    {['A','B','C','D','E'].map(g=><option key={g} value={g}>Grade {g}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Description</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={desigForm.description} onChange={e=>setDesigForm(f=>({...f,description:e.target.value}))} /></div>
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                <button onClick={()=>setShowDesigModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleDesigSave} disabled={saving||!desigForm.code||!desigForm.name} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Saving...':'Save'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
