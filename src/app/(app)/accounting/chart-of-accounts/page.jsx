'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }

const TYPE_COLORS = {
  ASSET:'bg-blue-100 text-blue-700',
  LIABILITY:'bg-red-100 text-red-600',
  EQUITY:'bg-purple-100 text-purple-700',
  REVENUE:'bg-green-100 text-green-700',
  EXPENSE:'bg-orange-100 text-orange-700'
};

const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('Accounts');
  const [typeFilter, setTypeFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [search, setSearch] = useState('');
  const [accountModal, setAccountModal] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [groupModal, setGroupModal] = useState(false);

  const [accForm, setAccForm] = useState({
    code:'', name:'', groupId:'', description:'',
    openingBalance:0, openingBalanceType:'DEBIT',
    isBankAccount:false, isCashAccount:false,
    bankName:'', bankAccountNumber:'', bankIfscCode:''
  });

  const [grpForm, setGrpForm] = useState({
    code:'', name:'', type:'ASSET', nature:'DEBIT', description:''
  });

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({limit:200});
    if (typeFilter) params.set('type', typeFilter);
    if (groupFilter) params.set('groupId', groupFilter);
    if (search) params.set('search', search);
    const [aRes, gRes, sRes] = await Promise.all([
      fetch(`${API}/accounting/accounts?${params}`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/accounting/groups`, {headers:{Authorization:`Bearer ${getToken()}`}}),
      fetch(`${API}/accounting/stats`, {headers:{Authorization:`Bearer ${getToken()}`}}),
    ]);
    if (aRes.ok) { const d=await aRes.json(); setAccounts(d.data||[]); }
    if (gRes.ok) setGroups(await gRes.json());
    if (sRes.ok) setStats(await sRes.json());
    setLoading(false);
  }

  useEffect(()=>{ fetchAll(); },[typeFilter, groupFilter, search]);

  async function handleSeedCoa() {
    if (!confirm('Seed default Indian Chart of Accounts? This will create 12 groups and 55 standard accounts.')) return;
    setSaving(true);
    const res = await fetch(`${API}/accounting/seed-coa`,{method:'POST',headers:{Authorization:`Bearer ${getToken()}`}});
    const data = await res.json();
    if (res.ok) { alert(data.message); fetchAll(); }
    else setError(data.message||'Failed');
    setSaving(false);
  }

  async function handleSaveAccount() {
    setSaving(true); setError('');
    const url = editAccount ? `${API}/accounting/accounts/${editAccount.id}` : `${API}/accounting/accounts`;
    const method = editAccount ? 'PUT' : 'POST';
    const body = {...accForm, openingBalance:parseFloat(accForm.openingBalance)||0};
    if (!body.description) delete body.description;
    if (!body.bankName) delete body.bankName;
    if (!body.bankAccountNumber) delete body.bankAccountNumber;
    if (!body.bankIfscCode) delete body.bankIfscCode;
    const res = await fetch(url,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(body)});
    const data = await res.json();
    if (res.ok) { setAccountModal(false); setEditAccount(null); fetchAll(); }
    else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    setSaving(false);
  }

  async function handleSaveGroup() {
    setSaving(true); setError('');
    const res = await fetch(`${API}/accounting/groups`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify(grpForm)});
    const data = await res.json();
    if (res.ok) { setGroupModal(false); fetchAll(); }
    else setError(data.message||'Failed');
    setSaving(false);
  }

  const groupedAccounts = groups.map(g=>({
    ...g,
    accounts: accounts.filter(a=>a.groupId===g.id)
  })).filter(g=>g.accounts.length>0 || activeTab==='Groups');

  const TABS = ['Accounts','Groups','Create Account','Create Group'];

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
            <p className="text-gray-500 text-sm mt-1">Account groups, heads and opening balances</p>
          </div>
          {stats && !stats.isSeeded && (
            <button onClick={handleSeedCoa} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium">
              🌱 Seed Default Indian COA
            </button>
          )}
        </div>

        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            {[
              {label:'Total Groups',value:stats.totalGroups,color:'bg-gray-50'},
              {label:'Total Accounts',value:stats.totalAccounts,color:'bg-blue-50'},
              ...(stats.byType||[]).map(t=>({label:t.type,value:t._count.id,color:TYPE_COLORS[t.type]?.replace('text-','bg-').replace('-700','-50')||'bg-gray-50'}))
            ].map((s,i)=>(
              <div key={i} className={`${s.color} rounded-xl p-3 text-center border`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-4 border-b overflow-x-auto">
          {TABS.map(t=><button key={t} onClick={()=>{setActiveTab(t);setError('');}} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${activeTab===t?'border-indigo-600 text-indigo-600':'border-transparent text-gray-500'}`}>{t}</button>)}
        </div>

        {/* ACCOUNTS */}
        {activeTab==='Accounts' && (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap items-center">
              <input className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" placeholder="Search account name or code..." value={search} onChange={e=>{setSearch(e.target.value);}} />
              <select className="border rounded-lg px-3 py-2 text-sm" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
                <option value="">All Types</option>
                {['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE'].map(t=><option key={t}>{t}</option>)}
              </select>
              <select className="border rounded-lg px-3 py-2 text-sm" value={groupFilter} onChange={e=>setGroupFilter(e.target.value)}>
                <option value="">All Groups</option>
                {groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <button onClick={()=>{setAccForm({code:'',name:'',groupId:'',description:'',openingBalance:0,openingBalanceType:'DEBIT',isBankAccount:false,isCashAccount:false,bankName:'',bankAccountNumber:'',bankIfscCode:''});setEditAccount(null);setError('');setAccountModal(true);}} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">+ New Account</button>
              <span className="text-sm text-gray-500">{accounts.length} accounts</span>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
              {loading?<div className="text-center py-10 text-gray-400">Loading...</div>
              :accounts.length===0?<div className="text-center py-10 text-gray-400">No accounts found. {!stats?.isSeeded&&'Click "Seed Default Indian COA" to get started.'}</div>:(
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0">
                    <tr>{['Code','Account Name','Group','Type','Nature','Opening Bal','Current Bal','Flags',''].map(h=><th key={h} className="px-3 py-3 text-left whitespace-nowrap">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {accounts.map(a=>(
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono font-bold text-indigo-600">{a.code}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-800">{a.name}</div>
                          {a.description&&<div className="text-xs text-gray-400">{a.description}</div>}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">{a.group?.name}</td>
                        <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-bold ${TYPE_COLORS[a.type]}`}>{a.type}</span></td>
                        <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${a.nature==='DEBIT'?'bg-blue-50 text-blue-600':'bg-green-50 text-green-600'}`}>{a.nature}</span></td>
                        <td className="px-3 py-2 font-mono text-sm">{fmt(a.openingBalance)} {a.openingBalance>0&&<span className="text-xs text-gray-400">{a.openingBalanceType}</span>}</td>
                        <td className="px-3 py-2 font-mono text-sm font-bold">{fmt(a.currentBalance)}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            {a.isBankAccount&&<span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Bank</span>}
                            {a.isCashAccount&&<span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">Cash</span>}
                            {a.isSystemAccount&&<span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">Sys</span>}
                            {a.gstApplicable&&<span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">GST</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <button onClick={()=>{setAccForm({code:a.code,name:a.name,groupId:a.groupId,description:a.description||'',openingBalance:a.openingBalance,openingBalanceType:a.openingBalanceType,isBankAccount:a.isBankAccount,isCashAccount:a.isCashAccount,bankName:a.bankName||'',bankAccountNumber:a.bankAccountNumber||'',bankIfscCode:a.bankIfscCode||''});setEditAccount(a);setError('');setAccountModal(true);}} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* GROUPS */}
        {activeTab==='Groups' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={()=>{setGrpForm({code:'',name:'',type:'ASSET',nature:'DEBIT',description:''});setError('');setGroupModal(true);}} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">+ New Group</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE'].map(type=>{
                const typeGroups = groups.filter(g=>g.type===type);
                if (!typeGroups.length) return null;
                return (
                  <div key={type} className="bg-white rounded-xl border shadow-sm">
                    <div className={`p-4 border-b flex items-center gap-2`}>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${TYPE_COLORS[type]}`}>{type}</span>
                      <span className="font-bold text-gray-700">{typeGroups.length} groups</span>
                    </div>
                    <div className="divide-y">
                      {typeGroups.map(g=>(
                        <div key={g.id} className="p-4 flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-indigo-600 text-sm">{g.code}</span>
                              <span className="font-medium text-gray-800">{g.name}</span>
                              {g.isSystemGroup&&<span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">System</span>}
                            </div>
                            {g.parentGroup&&<div className="text-xs text-gray-400 mt-0.5">Parent: {g.parentGroup.name}</div>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-bold">{g._count?.accounts||0} accounts</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${g.nature==='DEBIT'?'bg-blue-50 text-blue-600':'bg-green-50 text-green-600'}`}>{g.nature}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CREATE ACCOUNT */}
        {activeTab==='Create Account' && (
          <div className="bg-white rounded-xl border shadow-sm p-6 max-w-2xl">
            <h2 className="font-bold text-gray-800 mb-4">New Account Head</h2>
            {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm mb-4">{error}</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-gray-500 mb-1">Account Code *</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={accForm.code} onChange={e=>setAccForm(f=>({...f,code:e.target.value}))} placeholder="5111" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Account Name *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={accForm.name} onChange={e=>setAccForm(f=>({...f,name:e.target.value}))} /></div>
                <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Account Group *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={accForm.groupId} onChange={e=>setAccForm(f=>({...f,groupId:e.target.value}))}>
                    <option value="">— Select Group —</option>
                    {['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE'].map(type=>(
                      <optgroup key={type} label={type}>
                        {groups.filter(g=>g.type===type).map(g=><option key={g.id} value={g.id}>{g.name} ({g.code})</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Opening Balance (₹)</label><input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={accForm.openingBalance} onChange={e=>setAccForm(f=>({...f,openingBalance:e.target.value}))} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Opening Balance Type</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={accForm.openingBalanceType} onChange={e=>setAccForm(f=>({...f,openingBalanceType:e.target.value}))}>
                    <option>DEBIT</option><option>CREDIT</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Description</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={accForm.description} onChange={e=>setAccForm(f=>({...f,description:e.target.value}))} /></div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={accForm.isBankAccount} onChange={e=>setAccForm(f=>({...f,isBankAccount:e.target.checked}))} />Bank Account</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={accForm.isCashAccount} onChange={e=>setAccForm(f=>({...f,isCashAccount:e.target.checked}))} />Cash Account</label>
              </div>
              {accForm.isBankAccount && (
                <div className="grid grid-cols-3 gap-3 bg-blue-50 p-3 rounded-lg">
                  <div><label className="block text-xs text-gray-500 mb-1">Bank Name</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={accForm.bankName} onChange={e=>setAccForm(f=>({...f,bankName:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Account Number</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={accForm.bankAccountNumber} onChange={e=>setAccForm(f=>({...f,bankAccountNumber:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">IFSC Code</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase" value={accForm.bankIfscCode} onChange={e=>setAccForm(f=>({...f,bankIfscCode:e.target.value.toUpperCase()}))} /></div>
                </div>
              )}
              <button onClick={handleSaveAccount} disabled={saving||!accForm.code||!accForm.name||!accForm.groupId} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving?'Saving...':'Create Account'}</button>
            </div>
          </div>
        )}

        {/* CREATE GROUP */}
        {activeTab==='Create Group' && (
          <div className="bg-white rounded-xl border shadow-sm p-6 max-w-lg">
            <h2 className="font-bold text-gray-800 mb-4">New Account Group</h2>
            {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm mb-4">{error}</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-gray-500 mb-1">Code *</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase" value={grpForm.code} onChange={e=>setGrpForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="PREPAID" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Name *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={grpForm.name} onChange={e=>setGrpForm(f=>({...f,name:e.target.value}))} placeholder="Prepaid Expenses" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Type *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={grpForm.type} onChange={e=>setGrpForm(f=>({...f,type:e.target.value,nature:e.target.value==='ASSET'||e.target.value==='EXPENSE'?'DEBIT':'CREDIT'}))}>
                    {['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Nature *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={grpForm.nature} onChange={e=>setGrpForm(f=>({...f,nature:e.target.value}))}>
                    <option>DEBIT</option><option>CREDIT</option>
                  </select>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Parent Group</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={grpForm.parentGroupId||''} onChange={e=>setGrpForm(f=>({...f,parentGroupId:e.target.value}))}>
                    <option value="">— None (Top Level) —</option>
                    {groups.filter(g=>g.type===grpForm.type).map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Description</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={grpForm.description} onChange={e=>setGrpForm(f=>({...f,description:e.target.value}))} /></div>
              <button onClick={handleSaveGroup} disabled={saving||!grpForm.code||!grpForm.name} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving?'Saving...':'Create Group'}</button>
            </div>
          </div>
        )}

        {/* EDIT ACCOUNT MODAL */}
        {accountModal && editAccount && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-5 border-b flex justify-between">
                <h2 className="font-bold text-gray-800">Edit Account — {editAccount.code}</h2>
                <button onClick={()=>setAccountModal(false)} className="text-gray-400">✕</button>
              </div>
              <div className="p-5 space-y-3">
                {error&&<div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div><label className="block text-xs text-gray-500 mb-1">Name</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={accForm.name} onChange={e=>setAccForm(f=>({...f,name:e.target.value}))} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Description</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={accForm.description} onChange={e=>setAccForm(f=>({...f,description:e.target.value}))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">Opening Balance (₹)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={accForm.openingBalance} onChange={e=>setAccForm(f=>({...f,openingBalance:e.target.value}))} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Balance Type</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={accForm.openingBalanceType} onChange={e=>setAccForm(f=>({...f,openingBalanceType:e.target.value}))}><option>DEBIT</option><option>CREDIT</option></select></div>
                </div>
                {accForm.isBankAccount && (
                  <div className="grid grid-cols-3 gap-2 bg-blue-50 p-3 rounded-lg">
                    <div><label className="block text-xs text-gray-500 mb-1">Bank Name</label><input className="w-full border rounded-lg px-2 py-1.5 text-xs" value={accForm.bankName} onChange={e=>setAccForm(f=>({...f,bankName:e.target.value}))} /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Account No</label><input className="w-full border rounded-lg px-2 py-1.5 text-xs font-mono" value={accForm.bankAccountNumber} onChange={e=>setAccForm(f=>({...f,bankAccountNumber:e.target.value}))} /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">IFSC</label><input className="w-full border rounded-lg px-2 py-1.5 text-xs font-mono" value={accForm.bankIfscCode} onChange={e=>setAccForm(f=>({...f,bankIfscCode:e.target.value}))} /></div>
                  </div>
                )}
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                <button onClick={()=>setAccountModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleSaveAccount} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Saving...':'Save'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
