'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmt = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;

const TYPE_COLORS = { ASSET:'bg-blue-100 text-blue-700', LIABILITY:'bg-red-100 text-red-700', EQUITY:'bg-purple-100 text-purple-700', INCOME:'bg-green-100 text-green-700', EXPENSE:'bg-orange-100 text-orange-700' };
const TYPES = ['ASSET','LIABILITY','EQUITY','INCOME','EXPENSE'];
const SUBTYPES = ['BANK','CASH','DEBTOR','CREDITOR','GST','STOCK','FIXED_ASSET','REVENUE','COGS','OPEX','OTHER'];

function AccountTreeNode({ account, depth=0 }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = account.children?.length > 0;
  return (
    <div>
      <div className={`flex items-center justify-between py-2 px-3 hover:bg-gray-50 ${depth>0?'border-l-2 border-gray-100':''}` } style={{paddingLeft: `${12 + depth*16}px`}}>
        <div className="flex items-center gap-3">
          {hasChildren && <button onClick={()=>setExpanded(!expanded)} className="text-gray-400 w-4 text-xs">{expanded?'▼':'▶'}</button>}
          {!hasChildren && <span className="w-4"></span>}
          <span className="font-mono text-xs text-gray-500 w-12">{account.accountCode}</span>
          <span className="text-sm text-gray-800">{account.accountName}</span>
          {account.isSystemAccount && <span className="text-xs bg-gray-100 text-gray-400 px-1 rounded">SYS</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[account.accountType]}`}>{account.accountType}</span>
          {account.accountSubType && <span className="text-xs text-gray-400">{account.accountSubType}</span>}
          <span className={`text-sm font-bold ${account.currentBalance >= 0?'text-gray-700':'text-red-600'}`}>{fmt(account.currentBalance)}</span>
        </div>
      </div>
      {expanded && hasChildren && account.children.map(child => <AccountTreeNode key={child.id} account={child} depth={depth+1} />)}
    </div>
  );
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [tree, setTree] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [viewMode, setViewMode] = useState('tree');
  const [showModal, setShowModal] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [form, setForm] = useState({ accountCode:'', accountName:'', accountType:'ASSET', accountSubType:'OTHER', parentId:'', openingBalance:0, description:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (typeFilter) params.set('accountType', typeFilter);
    const [aRes, tRes, sRes] = await Promise.all([
      fetch(`${API}/accounts?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/accounts/tree`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/accounts/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (aRes.ok) { const d = await aRes.json(); setAccounts(d.data||[]); }
    if (tRes.ok) setTree(await tRes.json());
    if (sRes.ok) setStats(await sRes.json());
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, [search, typeFilter]);

  async function handleSeed() {
    setSeeding(true);
    const res = await fetch(`${API}/accounts/seed`, { method:'POST', headers:{Authorization:`Bearer ${getToken()}`} });
    const d = await res.json();
    alert(d.message);
    fetchAll();
    setSeeding(false);
  }

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { ...form, openingBalance: parseFloat(form.openingBalance)||0 };
    if (!body.parentId) delete body.parentId;
    if (!body.description) delete body.description;
    const res = await fetch(`${API}/accounts`, {
      method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(Array.isArray(data.message)?data.message.join(', '):data.message||'Failed');
    setSaving(false);
  }

  // Calculate totals by type
  const totalByType = (type) => accounts.filter(a=>a.accountType===type && !a.parentId).reduce((s,a)=>s+a.currentBalance,0);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
            <p className="text-gray-500 text-sm mt-1">Hierarchical ledger accounts — foundation of double-entry accounting</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSeed} disabled={seeding} className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">{seeding?'Seeding...':'Seed Defaults'}</button>
            <button onClick={()=>{setForm({accountCode:'',accountName:'',accountType:'ASSET',accountSubType:'OTHER',parentId:'',openingBalance:0,description:''});setError('');setShowModal(true);}} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm">+ New Account</button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            {[
              {label:'Total',value:stats.total,color:'bg-gray-50'},
              {label:'Assets',value:stats.assets,color:'bg-blue-50'},
              {label:'Liabilities',value:stats.liabilities,color:'bg-red-50'},
              {label:'Equity',value:stats.equity,color:'bg-purple-50'},
              {label:'Income',value:stats.income,color:'bg-green-50'},
              {label:'Expenses',value:stats.expense,color:'bg-orange-50'},
            ].map(s=>(
              <div key={s.label} className={`${s.color} rounded-lg p-3 text-center`}>
                <div className="text-lg font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex gap-3 flex-wrap items-center">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search code or name..." value={search} onChange={e=>setSearch(e.target.value)} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
            <div className="flex rounded-lg border overflow-hidden">
              <button onClick={()=>setViewMode('tree')} className={`px-3 py-2 text-sm ${viewMode==='tree'?'bg-blue-600 text-white':'hover:bg-gray-50'}`}>🌳 Tree</button>
              <button onClick={()=>setViewMode('flat')} className={`px-3 py-2 text-sm ${viewMode==='flat'?'bg-blue-600 text-white':'hover:bg-gray-50'}`}>📋 Flat</button>
            </div>
          </div>

          {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
          : viewMode==='tree' ? (
            <div className="divide-y">
              {tree.length===0 ? <div className="text-center py-10 text-gray-400">No accounts yet. Click "Seed Defaults" to create standard accounts.</div>
              : tree.map(root => <AccountTreeNode key={root.id} account={root} depth={0} />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>{['Code','Account Name','Type','Sub Type','Parent','Balance','System'].map(h=><th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {accounts.map(a=>(
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs font-bold text-blue-600">{a.accountCode}</td>
                      <td className="px-3 py-2 text-sm">{a.accountName}</td>
                      <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${TYPE_COLORS[a.accountType]}`}>{a.accountType}</span></td>
                      <td className="px-3 py-2 text-xs text-gray-500">{a.accountSubType||'—'}</td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-400">{a.parent?.accountCode||'—'}</td>
                      <td className="px-3 py-2 text-sm font-bold">{fmt(a.currentBalance)}</td>
                      <td className="px-3 py-2 text-xs">{a.isSystemAccount?'✅':'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold">New Account</h2>
                <button onClick={()=>setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm text-gray-600 mb-1">Account Code *</label><input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="6008" value={form.accountCode} onChange={e=>setForm(f=>({...f,accountCode:e.target.value}))} /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">Account Type *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.accountType} onChange={e=>setForm(f=>({...f,accountType:e.target.value}))}>
                      {TYPES.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2"><label className="block text-sm text-gray-600 mb-1">Account Name *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.accountName} onChange={e=>setForm(f=>({...f,accountName:e.target.value}))} /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">Sub Type</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.accountSubType} onChange={e=>setForm(f=>({...f,accountSubType:e.target.value}))}>
                      {SUBTYPES.map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-sm text-gray-600 mb-1">Opening Balance (₹)</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.openingBalance} onChange={e=>setForm(f=>({...f,openingBalance:e.target.value}))} /></div>
                  <div className="col-span-2"><label className="block text-sm text-gray-600 mb-1">Parent Account</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.parentId} onChange={e=>setForm(f=>({...f,parentId:e.target.value}))}>
                      <option value="">— No Parent (Root Account) —</option>
                      {accounts.filter(a=>a.accountType===form.accountType).map(a=><option key={a.id} value={a.id}>{a.accountCode} — {a.accountName}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2"><label className="block text-sm text-gray-600 mb-1">Description</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} /></div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={()=>setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Creating...':'Create Account'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
