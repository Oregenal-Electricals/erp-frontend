'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmtDate = d => d ? new Date(d).toLocaleString('en-IN') : '—';

const STATUS_COLORS = {
  ONLINE:'bg-green-100 text-green-700', RUNNING:'bg-blue-100 text-blue-700',
  IDLE:'bg-yellow-100 text-yellow-700', OFFLINE:'bg-gray-100 text-gray-500',
  ERROR:'bg-red-100 text-red-700', MAINTENANCE:'bg-orange-100 text-orange-700'
};
const SEVERITY_COLORS = {
  INFO:'bg-blue-100 text-blue-700', WARNING:'bg-yellow-100 text-yellow-700', CRITICAL:'bg-red-100 text-red-700'
};

const TABS = ['Dashboard','Machines','Alerts','AI Insights','Predictive','Add Machine'];

export default function IotPage() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [machines, setMachines] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [insights, setInsights] = useState(null);
  const [predictive, setPredictive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [machineDetail, setMachineDetail] = useState(null);

  const [form, setForm] = useState({
    machineCode:'', machineName:'', machineType:'GENERAL',
    location:'', manufacturer:'', modelNumber:'', ipAddress:''
  });

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const [dRes, mRes, aRes] = await Promise.all([
      fetch(`${API}/iot/dashboard`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/iot/machines`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/iot/alerts?status=OPEN`, {headers:{Authorization:`Bearer ${getToken()}`}}),
    ]);
    if (dRes.ok) setDashboard(await dRes.json());
    if (mRes.ok) setMachines(await mRes.json());
    if (aRes.ok) setAlerts(await aRes.json());
    setLoading(false);
  }

  async function fetchInsights() {
    const res = await fetch(`${API}/iot/ai-insights`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setInsights(await res.json());
  }

  async function fetchPredictive() {
    const res = await fetch(`${API}/iot/predictive`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setPredictive(await res.json());
  }

  async function fetchMachineDetail(id) {
    const res = await fetch(`${API}/iot/machines/${id}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) setMachineDetail(await res.json());
  }

  useEffect(()=>{ fetchAll(); },[]);
  useEffect(()=>{ if (activeTab==='AI Insights') fetchInsights(); },[activeTab]);
  useEffect(()=>{ if (activeTab==='Predictive') fetchPredictive(); },[activeTab]);
  useEffect(()=>{ if (selectedMachine) fetchMachineDetail(selectedMachine.id); },[selectedMachine]);

  async function handleCreateMachine() {
    setSaving(true); setError('');
    const res = await fetch(`${API}/iot/machines`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(form)});
    const data = await res.json();
    if (res.ok) { fetchAll(); setActiveTab('Machines'); setForm({machineCode:'',machineName:'',machineType:'GENERAL',location:'',manufacturer:'',modelNumber:'',ipAddress:''}); }
    else setError(data.message||'Failed');
    setSaving(false);
  }

  async function handleResolveAlert(id) {
    await fetch(`${API}/iot/alerts/${id}`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify({status:'RESOLVED'})});
    fetchAll();
  }

  async function handleStatusUpdate(id, status) {
    await fetch(`${API}/iot/machines/${id}/status`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify({status})});
    fetchAll();
    if (selectedMachine?.id===id) fetchMachineDetail(id);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Industry 4.0 — IoT & AI</h1>
          <p className="text-gray-500 text-sm mt-1">Machine connectivity, real-time monitoring, AI insights and predictive analytics</p>
        </div>

        <div className="flex gap-2 mb-4 border-b overflow-x-auto">
          {TABS.map(t=><button key={t} onClick={()=>{setActiveTab(t);setError('');}} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${activeTab===t?'border-indigo-600 text-indigo-600':'border-transparent text-gray-500'}`}>{t}</button>)}
        </div>

        {/* DASHBOARD */}
        {activeTab==='Dashboard' && (
          <div className="space-y-6">
            {dashboard && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  {label:'Total Machines',value:dashboard.totalMachines,color:'bg-gray-50'},
                  {label:'Online',value:dashboard.onlineMachines,color:'bg-green-50'},
                  {label:'Running',value:dashboard.runningMachines,color:'bg-blue-50'},
                  {label:'Offline',value:dashboard.offlineMachines,color:'bg-red-50'},
                  {label:'Open Alerts',value:dashboard.openAlerts,color:dashboard.criticalAlerts>0?'bg-red-100':'bg-yellow-50'},
                ].map(s=>(
                  <div key={s.label} className={`${s.color} rounded-xl p-4 text-center border`}>
                    <div className="text-2xl font-bold text-gray-800">{s.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Machine Status Board */}
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b font-bold text-gray-700">Machine Status Board</div>
              {loading?<div className="text-center py-8 text-gray-400">Loading...</div>
              :machines.length===0?<div className="text-center py-8 text-gray-400">No machines registered. Add machines first.</div>:(
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                  {machines.map(m=>(
                    <div key={m.id} className="border rounded-xl p-4 cursor-pointer hover:shadow-md" onClick={()=>{setSelectedMachine(m);setActiveTab('Machines');}}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-mono font-bold text-sm text-indigo-600">{m.machineCode}</div>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${STATUS_COLORS[m.status]}`}>{m.status}</span>
                      </div>
                      <div className="font-medium text-gray-800 text-sm">{m.machineName}</div>
                      <div className="text-xs text-gray-400 mt-1">{m.machineType} · {m.location||'—'}</div>
                      {m.lastPingAt&&<div className="text-xs text-gray-300 mt-2">Last: {fmtDate(m.lastPingAt)}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Alerts */}
            {alerts.length>0&&(
              <div className="bg-white rounded-xl border shadow-sm">
                <div className="p-4 border-b font-bold text-gray-700">Open Alerts ({alerts.length})</div>
                <div className="divide-y">
                  {alerts.slice(0,5).map(a=>(
                    <div key={a.id} className="p-4 flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${SEVERITY_COLORS[a.severity]}`}>{a.severity}</span>
                          <span className="text-sm font-medium text-gray-800">{a.machine?.machineName}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{a.message}</div>
                      </div>
                      <button onClick={()=>handleResolveAlert(a.id)} className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg">Resolve</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MACHINES */}
        {activeTab==='Machines' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-4">
              <div className="bg-white rounded-xl border shadow-sm">
                <div className="p-4 border-b font-bold text-gray-700">All Machines</div>
                {machines.length===0?<div className="text-center py-8 text-gray-400">No machines found.</div>:(
                  <div className="divide-y">
                    {machines.map(m=>(
                      <div key={m.id} onClick={()=>setSelectedMachine(m)} className={`p-4 cursor-pointer hover:bg-gray-50 ${selectedMachine?.id===m.id?'bg-indigo-50 border-r-4 border-indigo-600':''}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-mono font-bold text-sm text-indigo-600">{m.machineCode}</div>
                            <div className="font-medium text-gray-800">{m.machineName}</div>
                            <div className="text-xs text-gray-400">{m.machineType}</div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${STATUS_COLORS[m.status]}`}>{m.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-12 md:col-span-8">
              {!selectedMachine?<div className="bg-white rounded-xl border shadow-sm p-16 text-center"><div className="text-5xl mb-4">🏭</div><div className="text-gray-400">Select a machine to view details</div></div>
              :machineDetail?(
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border shadow-sm p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="font-bold text-gray-800 text-lg">{machineDetail.machineName}</h2>
                        <div className="font-mono text-xs text-gray-400">{machineDetail.machineCode}</div>
                        <span className={`mt-2 inline-block px-2 py-0.5 rounded text-xs font-bold ${STATUS_COLORS[machineDetail.status]}`}>{machineDetail.status}</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {['ONLINE','RUNNING','IDLE','OFFLINE','MAINTENANCE'].map(s=>(
                          <button key={s} onClick={()=>handleStatusUpdate(machineDetail.id,s)} className={`px-2 py-1 text-xs rounded border ${machineDetail.status===s?'bg-indigo-600 text-white':'hover:bg-gray-50'}`}>{s}</button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                      {[
                        ['Type',machineDetail.machineType],
                        ['Location',machineDetail.location||'—'],
                        ['Manufacturer',machineDetail.manufacturer||'—'],
                        ['Model',machineDetail.modelNumber||'—'],
                        ['IP Address',machineDetail.ipAddress||'—'],
                        ['Last Ping',fmtDate(machineDetail.lastPingAt)],
                      ].map(([l,v])=>(
                        <div key={l}><span className="text-gray-400 text-xs">{l}:</span><div className="font-medium">{v}</div></div>
                      ))}
                    </div>
                  </div>

                  {machineDetail.openAlerts?.length>0&&(
                    <div className="bg-white rounded-xl border shadow-sm">
                      <div className="p-4 border-b font-bold text-red-600">Open Alerts ({machineDetail.openAlerts.length})</div>
                      <div className="divide-y">
                        {machineDetail.openAlerts.map(a=>(
                          <div key={a.id} className="p-4 flex justify-between items-center">
                            <div>
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${SEVERITY_COLORS[a.severity]}`}>{a.severity}</span>
                              <div className="text-sm text-gray-700 mt-1">{a.message}</div>
                            </div>
                            <button onClick={()=>handleResolveAlert(a.id)} className="px-3 py-1 text-xs bg-green-600 text-white rounded">Resolve</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {machineDetail.latestReadings?.length>0&&(
                    <div className="bg-white rounded-xl border shadow-sm">
                      <div className="p-4 border-b font-bold text-gray-700">Latest Readings</div>
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Type','Value','Unit','Time'].map(h=><th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
                        <tbody className="divide-y">
                          {machineDetail.latestReadings.slice(0,10).map((r,i)=>(
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-2"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{r.readingType}</span></td>
                              <td className="px-4 py-2 font-bold">{r.value}</td>
                              <td className="px-4 py-2 text-gray-400">{r.unit||'—'}</td>
                              <td className="px-4 py-2 text-xs text-gray-400">{fmtDate(r.recordedAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ):<div className="text-center py-10 text-gray-400">Loading...</div>}
            </div>
          </div>
        )}

        {/* ALERTS */}
        {activeTab==='Alerts' && (
          <div className="bg-white rounded-xl border shadow-sm">
            {alerts.length===0?<div className="text-center py-10 text-gray-400">No open alerts.</div>:(
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Machine','Alert Type','Severity','Message','Time',''].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {alerts.map((a,i)=>(
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2"><div className="font-medium">{a.machine?.machineName}</div><div className="font-mono text-xs text-gray-400">{a.machine?.machineCode}</div></td>
                      <td className="px-4 py-2 text-xs">{a.alertType}</td>
                      <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs font-bold ${SEVERITY_COLORS[a.severity]}`}>{a.severity}</span></td>
                      <td className="px-4 py-2 text-sm text-gray-600">{a.message}</td>
                      <td className="px-4 py-2 text-xs text-gray-400">{fmtDate(a.createdAt)}</td>
                      <td className="px-4 py-2"><button onClick={()=>handleResolveAlert(a.id)} className="px-2 py-1 text-xs bg-green-600 text-white rounded">Resolve</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* AI INSIGHTS */}
        {activeTab==='AI Insights' && (
          <div className="space-y-4">
            {!insights?<div className="text-center py-10 text-gray-400">Loading AI insights...</div>:(
              insights.insights.map((insight,i)=>(
                <div key={i} className="bg-white rounded-xl border shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-bold">{insight.category}</span>
                    <h3 className="font-bold text-gray-800">{insight.title}</h3>
                  </div>
                  {Array.isArray(insight.data)?(
                    <div className="space-y-2">
                      {insight.data.map((d,j)=>(
                        <div key={j} className="flex justify-between py-2 border-b last:border-0 text-sm">
                          <span className="text-gray-600">{d.name||d.employeeName||d.id}</span>
                          <span className="font-bold text-gray-800">{d.otHours?d.otHours+'h':(d.quantity||'—')}</span>
                        </div>
                      ))}
                    </div>
                  ):(
                    <div className="grid grid-cols-3 gap-4 text-center">
                      {Object.entries(insight.data).map(([k,v])=>(
                        <div key={k} className="bg-gray-50 rounded-lg p-3">
                          <div className="font-bold text-gray-800">{String(v)}</div>
                          <div className="text-xs text-gray-400 mt-1">{k}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* PREDICTIVE */}
        {activeTab==='Predictive' && (
          <div className="space-y-4">
            {!predictive?<div className="text-center py-10 text-gray-400">Loading predictive analytics...</div>
            :predictive.predictions.length===0?<div className="text-center py-10 text-gray-400">No machines registered for predictive analysis.</div>:(
              <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
                <div className="p-4 border-b"><h3 className="font-bold text-gray-700">Machine Health Predictions</h3><p className="text-xs text-gray-400 mt-1">Generated: {fmtDate(predictive.generatedAt)}</p></div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{['Machine','Maintenance Due','Downtime Risk','Recommendation'].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead>
                  <tbody className="divide-y">
                    {predictive.predictions.map((p,i)=>(
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2"><div className="font-medium">{p.machineName}</div><div className="font-mono text-xs text-gray-400">{p.machineCode}</div></td>
                        <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs font-bold ${p.maintenanceDue==='IMMEDIATE'?'bg-red-100 text-red-700':p.maintenanceDue==='SOON'?'bg-yellow-100 text-yellow-700':'bg-green-100 text-green-700'}`}>{p.maintenanceDue}</span></td>
                        <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs ${p.predictedDowntime==='HIGH RISK'?'bg-red-100 text-red-700':'bg-green-100 text-green-700'}`}>{p.predictedDowntime}</span></td>
                        <td className="px-4 py-2 text-sm text-gray-600">{p.recommendation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ADD MACHINE */}
        {activeTab==='Add Machine' && (
          <div className="bg-white rounded-xl border shadow-sm p-6 max-w-2xl">
            <h2 className="font-bold text-gray-800 mb-4">Register New Machine</h2>
            {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm mb-4">{error}</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-gray-500 mb-1">Machine Code *</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase" value={form.machineCode} onChange={e=>setForm(f=>({...f,machineCode:e.target.value.toUpperCase()}))} placeholder="MCH-001" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Machine Name *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.machineName} onChange={e=>setForm(f=>({...f,machineName:e.target.value}))} placeholder="SMT Line 1" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Machine Type</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.machineType} onChange={e=>setForm(f=>({...f,machineType:e.target.value}))}>
                    {['CNC','SMT','ASSEMBLY','TESTING','CONVEYOR','INJECTION','WELDING','GENERAL'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Location</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="Floor 1, Line A" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Manufacturer</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.manufacturer} onChange={e=>setForm(f=>({...f,manufacturer:e.target.value}))} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Model Number</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.modelNumber} onChange={e=>setForm(f=>({...f,modelNumber:e.target.value}))} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">IP Address</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.ipAddress} onChange={e=>setForm(f=>({...f,ipAddress:e.target.value}))} placeholder="192.168.1.100" /></div>
              </div>
              <button onClick={handleCreateMachine} disabled={saving||!form.machineCode||!form.machineName} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving?'Registering...':'Register Machine'}</button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
