'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  RELEASED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

export default function ProductionRoutingPage() {
  const [routings, setRoutings] = useState([]);
  const [products, setProducts] = useState([]);
  const [boms, setBoms] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ finalProductId: '', routingName: '', stages: [{ stageName: '', bomId: '', warehouseId: '' }] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [startForm, setStartForm] = useState({ routingId: '', plannedQty: '', warehouseId: '' });
  const [startResult, setStartResult] = useState(null);
  const [starting, setStarting] = useState(false);

  const [chainView, setChainView] = useState(null);
  const [chainWos, setChainWos] = useState(null);

  async function fetchAll() {
    setLoading(true);
    const [rRes, pRes, bRes, wRes] = await Promise.all([
      fetch(`${API}/routing`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/products?limit=200`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/bom?limit=200`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/warehouses?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (rRes.ok) setRoutings(await rRes.json());
    if (pRes.ok) { const d = await pRes.json(); setProducts(d.data || d || []); }
    if (bRes.ok) { const d = await bRes.json(); setBoms(d.data || []); }
    if (wRes.ok) { const d = await wRes.json(); setWarehouses(d.data || d || []); }
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  function addStage() {
    setForm(f => ({ ...f, stages: [...f.stages, { stageName: '', bomId: '', warehouseId: '' }] }));
  }
  function removeStage(i) {
    setForm(f => ({ ...f, stages: f.stages.filter((_, idx) => idx !== i) }));
  }
  function updateStage(i, field, value) {
    setForm(f => ({ ...f, stages: f.stages.map((s, idx) => idx === i ? { ...s, [field]: value } : s) }));
  }

  async function handleCreateRouting() {
    setSaving(true); setError('');
    const body = {
      finalProductId: form.finalProductId,
      routingName: form.routingName,
      stages: form.stages.map(s => ({ stageName: s.stageName, bomId: s.bomId, warehouseId: s.warehouseId || undefined })),
    };
    const res = await fetch(`${API}/routing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      setShowCreate(false);
      setForm({ finalProductId: '', routingName: '', stages: [{ stageName: '', bomId: '', warehouseId: '' }] });
      fetchAll();
    } else {
      setError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed to create routing');
    }
    setSaving(false);
  }

  async function handleStartProduction() {
    setStarting(true); setStartResult(null);
    const res = await fetch(`${API}/routing/start-production`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({
        routingId: startForm.routingId,
        plannedQty: parseFloat(startForm.plannedQty),
        warehouseId: startForm.warehouseId,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setStartResult(data);
      setStartForm({ routingId: '', plannedQty: '', warehouseId: '' });
    } else {
      alert(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed to start production');
    }
    setStarting(false);
  }

  async function viewChain(routingGroupId) {
    if (chainView === routingGroupId) { setChainView(null); setChainWos(null); return; }
    setChainView(routingGroupId);
    const res = await fetch(`${API}/routing/chain/${routingGroupId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setChainWos(await res.json());
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Production Routing</h1>
            <p className="text-gray-500 text-sm mt-1">Define multi-stage production chains (e.g. SMT -&gt; MI -&gt; Assembly -&gt; Packing) and start production against them</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New Routing</button>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-4 mb-6">
          <h2 className="font-semibold text-gray-700 mb-3">Start Production</h2>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-xs text-gray-500 mb-1">Routing</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={startForm.routingId} onChange={e=>setStartForm(f=>({...f,routingId:e.target.value}))}>
                <option value="">— Select Routing —</option>
                {routings.map(r => <option key={r.id} value={r.id}>{r.routingName} — {r.finalProduct?.name} ({r.stages?.length || 0} stages)</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Planned Qty</label>
              <input type="number" className="w-32 border rounded-lg px-3 py-2 text-sm" value={startForm.plannedQty} onChange={e=>setStartForm(f=>({...f,plannedQty:e.target.value}))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Warehouse</label>
              <select className="border rounded-lg px-3 py-2 text-sm" value={startForm.warehouseId} onChange={e=>setStartForm(f=>({...f,warehouseId:e.target.value}))}>
                <option value="">— Select —</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <button onClick={handleStartProduction} disabled={starting || !startForm.routingId || !startForm.plannedQty || !startForm.warehouseId} className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
              {starting ? 'Starting...' : 'Start Production'}
            </button>
          </div>

          {startResult && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="text-sm font-semibold text-green-700 mb-2">✅ Production chain started — {startResult.stages.length} stage Work Orders created</div>
              <table className="w-full text-xs">
                <thead className="text-green-600 uppercase"><tr>{['Stage','WO Number','Status'].map(h=><th key={h} className="text-left px-2 py-1">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-green-100">
                  {startResult.stages.map(s => (
                    <tr key={s.woId} className="bg-white">
                      <td className="px-2 py-1">{s.sequence}. {s.stageName}</td>
                      <td className="px-2 py-1 font-mono font-bold">{s.woNumber}</td>
                      <td className="px-2 py-1 text-gray-500">{s.sequence === 1 ? 'Released (material reserved)' : 'Waiting on previous stage'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-xs text-green-600 mt-2">Only Stage 1 is releasable right away. Each later stage auto-releases the moment the stage before it gets a confirmed FG Receipt.</div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b font-semibold text-gray-700">Defined Routings</div>
          <div className="divide-y">
            {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
            : routings.length === 0 ? <div className="text-center py-10 text-gray-400">No routings defined yet</div>
            : routings.map(r => (
              <div key={r.id} className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-semibold text-gray-800">{r.routingName}</span>
                  <span className="text-sm text-gray-500">{r.finalProduct?.name} ({r.finalProduct?.code})</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {r.stages?.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <span className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs">
                        <span className="font-bold">{s.sequence}. {s.stageName}</span>
                        <span className="text-gray-400"> — BOM {s.bom?.bomNumber}</span>
                      </span>
                      {i < r.stages.length - 1 && <span className="text-gray-300">→</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {chainWos && (
          <div className="bg-white rounded-xl border shadow-sm mt-6">
            <div className="p-4 border-b font-semibold text-gray-700">Chain: {chainView}</div>
            <div className="divide-y">
              {chainWos.map(wo => (
                <div key={wo.id} className="p-4 flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center bg-blue-600 text-white rounded-full text-xs font-bold">{wo.stageSequence}</span>
                  <span className="font-mono font-bold text-blue-600">{wo.woNumber}</span>
                  <span className="text-gray-700">{wo.productName}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[wo.status]}`}>{wo.status?.replace(/_/g,' ')}</span>
                  <span className="text-xs text-gray-400">{wo.plannedQty} planned / {wo.completedQty} completed</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold">New Production Routing</h2>
                <button onClick={()=>setShowCreate(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Final Product *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.finalProductId} onChange={e=>setForm(f=>({...f,finalProductId:e.target.value}))}>
                    <option value="">— Select Product —</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Routing Name *</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Standard 4-Stage Assembly" value={form.routingName} onChange={e=>setForm(f=>({...f,routingName:e.target.value}))} />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">Stages (in order — Stage 1 runs first)</label>
                  <div className="space-y-3">
                    {form.stages.map((s, i) => (
                      <div key={i} className="border rounded-lg p-3 flex gap-2 items-end">
                        <span className="w-6 h-6 flex items-center justify-center bg-blue-600 text-white rounded-full text-xs font-bold mb-2">{i+1}</span>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Stage Name</label>
                          <input className="w-full border rounded px-2 py-1.5 text-sm" placeholder="e.g. SMT" value={s.stageName} onChange={e=>updateStage(i,'stageName',e.target.value)} />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">BOM for this stage</label>
                          <select className="w-full border rounded px-2 py-1.5 text-sm" value={s.bomId} onChange={e=>updateStage(i,'bomId',e.target.value)}>
                            <option value="">— Select BOM —</option>
                            {boms.map(b => <option key={b.id} value={b.id}>{b.bomNumber} — {b.product?.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Warehouse (optional)</label>
                          <select className="border rounded px-2 py-1.5 text-sm" value={s.warehouseId} onChange={e=>updateStage(i,'warehouseId',e.target.value)}>
                            <option value="">Use default</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                          </select>
                        </div>
                        {form.stages.length > 1 && (
                          <button onClick={()=>removeStage(i)} className="text-red-400 hover:text-red-600 text-lg mb-1">×</button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={addStage} className="mt-2 text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-100">+ Add Stage</button>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={()=>setShowCreate(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreateRouting} disabled={saving || !form.finalProductId || !form.routingName} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Creating...':'Create Routing'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
