'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { getUser, hasRole } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const PRIORITY_SETTER_ROLES = ['PLANNING_MANAGER', 'PLANT_HEAD', 'UNIT_HEAD', 'CORPORATE_ADMIN', 'SUPER_ADMIN', 'ADMIN'];

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  RELEASED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};
const PRIORITY_COLORS = {
  LOW: 'bg-gray-100 text-gray-500',
  MEDIUM: 'bg-blue-50 text-blue-600',
  HIGH: 'bg-orange-100 text-orange-600',
  URGENT: 'bg-red-100 text-red-700',
};

export default function WorkOrdersPage() {
  const [user] = useState(() => getUser());
  const canSetPriority = hasRole(user, ...PRIORITY_SETTER_ROLES);

  const [wos, setWos] = useState([]);
  const [stats, setStats] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [boms, setBoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [reservationsByWo, setReservationsByWo] = useState({});
  const [releaseSummary, setReleaseSummary] = useState(null);
  const [form, setForm] = useState({ productCode:'', productName:'', uom:'PCS', bomId:'', warehouseId:'', plannedQty:'', plannedStartDate:'', plannedEndDate:'', priority:'MEDIUM', remarks:'' });
  const [completeModal, setCompleteModal] = useState(null);
  const [completeForm, setCompleteForm] = useState({ completedQty:'', rejectedQty:'0' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchAll() {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const [woRes, statsRes, whRes, bomRes] = await Promise.all([
      fetch(`${API}/work-orders?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/work-orders/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/warehouses?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/bom?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (woRes.ok) { const d = await woRes.json(); setWos(d.data); setTotalPages(d.totalPages); setTotal(d.total); }
    if (statsRes.ok) setStats(await statsRes.json());
    if (whRes.ok) { const d = await whRes.json(); setWarehouses(d.data || d); }
    if (bomRes.ok) { const d = await bomRes.json(); setBoms(d.data || []); }
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, [page, search, status]);

  function handleBomSelect(bomId) {
    const bom = boms.find(b => b.id === bomId);
    setForm(f => ({
      ...f,
      bomId,
      productCode: bom?.product?.code || f.productCode,
      productName: bom?.product?.name || f.productName,
      uom: bom?.product?.uom?.code || f.uom,
    }));
  }

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { ...form, plannedQty: parseFloat(form.plannedQty) };
    if (!body.bomId) delete body.bomId;
    if (!body.remarks) delete body.remarks;
    const res = await fetch(`${API}/work-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    setSaving(false);
  }

  async function handleAction(id, action, body = {}) {
    const res = await fetch(`${API}/work-orders/${id}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      if (action === 'release' && Array.isArray(data.materialReservations)) {
        setReleaseSummary({ woNumber: data.woNumber, lines: data.materialReservations });
      }
      fetchAll();
    } else {
      const d = await res.json();
      alert(d.message);
    }
  }

  async function handleComplete() {
    setSaving(true);
    await handleAction(completeModal, 'complete', { completedQty: parseFloat(completeForm.completedQty), rejectedQty: parseFloat(completeForm.rejectedQty) || 0 });
    setCompleteModal(null); setSaving(false);
  }

  async function handleExpand(id) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    const [woRes, resRes] = await Promise.all([
      fetch(`${API}/work-orders/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/work-orders/${id}/reservations`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (woRes.ok) {
      const data = await woRes.json();
      setWos(prev => prev.map(w => w.id === id ? { ...w, bom: data.bom } : w));
    }
    if (resRes.ok) {
      const reservations = await resRes.json();
      setReservationsByWo(prev => ({ ...prev, [id]: reservations }));
    }
  }

  const progressPct = wo => wo.plannedQty > 0 ? Math.min(100, Math.round(wo.completedQty / wo.plannedQty * 100)) : 0;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
            <p className="text-gray-500 text-sm mt-1">Plan, release and track production work orders</p>
          </div>
          <button onClick={() => { setForm({ productCode:'', productName:'', uom:'PCS', bomId:'', warehouseId:'', plannedQty:'', plannedStartDate:'', plannedEndDate:'', priority:'MEDIUM', remarks:'' }); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New Work Order</button>
        </div>

        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            {[
              { label: 'Draft', value: stats.draft, color: 'bg-gray-50' },
              { label: 'Released', value: stats.released, color: 'bg-blue-50' },
              { label: 'In Progress', value: stats.inProgress, color: 'bg-yellow-50' },
              { label: 'Completed', value: stats.completed, color: 'bg-green-50' },
              { label: 'Planned Qty', value: stats.totalPlanned?.toLocaleString(), color: 'bg-purple-50' },
              { label: 'Completed Qty', value: stats.totalCompleted?.toLocaleString(), color: 'bg-teal-50' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-3 text-center`}>
                <div className="text-lg font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {releaseSummary && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="text-sm font-semibold text-blue-800">Material reserved for {releaseSummary.woNumber}</div>
              <button onClick={()=>setReleaseSummary(null)} className="text-blue-400 hover:text-blue-600 text-sm">✕</button>
            </div>
            <table className="w-full text-xs mt-2">
              <thead className="text-blue-500 uppercase"><tr>{['Item','Required','Reserved','Shortfall'].map(h=><th key={h} className="text-left px-2 py-1">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-blue-100">
                {releaseSummary.lines.map((l,i) => (
                  <tr key={i}>
                    <td className="px-2 py-1 font-mono">{l.itemCode} — {l.itemName}</td>
                    <td className="px-2 py-1">{l.requiredQty}</td>
                    <td className="px-2 py-1 text-green-700 font-medium">{l.reservedQty}</td>
                    <td className="px-2 py-1">{l.shortfallQty > 0 ? <span className="text-red-600 font-bold">{l.shortfallQty}</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex gap-3">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search WO number, product..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} orders</span>
          </div>

          <div className="divide-y">
            {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
            : wos.length === 0 ? <div className="text-center py-10 text-gray-400">No work orders found</div>
            : wos.map(wo => (
              <div key={wo.id} className="p-4">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => handleExpand(wo.id)}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono font-bold text-blue-600">{wo.woNumber}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${PRIORITY_COLORS[wo.priority]}`}>{wo.priority}</span>
                    <span className="font-medium text-gray-800">{wo.productCode}</span>
                    <span className="text-sm text-gray-500">{wo.productName}</span>
                    <span className="text-xs text-gray-400">{wo.warehouse?.name}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[wo.status]}`}>{wo.status?.replace(/_/g,' ')}</span>
                    <span className="text-xs text-gray-500">{wo.plannedQty?.toLocaleString()} {wo.uom}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {wo.status === 'DRAFT' && <button onClick={e=>{e.stopPropagation();handleAction(wo.id,'release')}} className="px-2 py-1 text-xs bg-blue-600 text-white rounded">Release</button>}
                    {wo.status === 'RELEASED' && <button onClick={e=>{e.stopPropagation();handleAction(wo.id,'start')}} className="px-2 py-1 text-xs bg-yellow-500 text-gray-900 rounded">Start</button>}
                    {wo.status === 'IN_PROGRESS' && <button onClick={e=>{e.stopPropagation();setCompleteModal(wo.id);setCompleteForm({completedQty:wo.plannedQty,rejectedQty:'0'})}} className="px-2 py-1 text-xs bg-green-600 text-white rounded">Complete</button>}
                    {['DRAFT','RELEASED'].includes(wo.status) && <button onClick={e=>{e.stopPropagation();handleAction(wo.id,'cancel')}} className="px-2 py-1 text-xs bg-red-500 text-white rounded">Cancel</button>}
                    <span className="text-gray-400 text-xs">{expandedId===wo.id?'▲':'▼'}</span>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-4">
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${wo.status==='COMPLETED'?'bg-green-500':'bg-blue-500'}`} style={{ width: `${progressPct(wo)}%`}}></div>
                  </div>
                  <span className="text-xs text-gray-500">{progressPct(wo)}% ({wo.completedQty}/{wo.plannedQty})</span>
                  <span className="text-xs text-gray-400">{fmtDate(wo.plannedStartDate)} → {fmtDate(wo.plannedEndDate)}</span>
                </div>

                {expandedId===wo.id && (
                  <div className="mt-3 space-y-3">
                    {wo.bom && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-xs font-semibold text-gray-500 mb-2">BOM: {wo.bom.bomNumber} (v{wo.bom.version}) — {wo.bom.items?.length || 0} components</div>
                        {wo.bom.items?.length > 0 && (
                          <table className="w-full text-xs">
                            <thead className="text-gray-400 uppercase">
                              <tr>{['Seq','Item Code','Item Name','UOM','Qty/Unit','Wastage%','Gross Qty'].map(h=><th key={h} className="text-left px-2 py-1">{h}</th>)}</tr>
                            </thead>
                            <tbody className="divide-y divide-blue-100">
                              {wo.bom.items.map(item => (
                                <tr key={item.id} className="bg-white">
                                  <td className="px-2 py-1 text-gray-400">{item.sequence}</td>
                                  <td className="px-2 py-1 font-mono text-blue-600">{item.itemCode}</td>
                                  <td className="px-2 py-1">{item.itemName}</td>
                                  <td className="px-2 py-1 text-gray-500">{item.uom}</td>
                                  <td className="px-2 py-1 font-bold">{item.quantity}</td>
                                  <td className="px-2 py-1 text-orange-500">{item.wastagePercent}%</td>
                                  <td className="px-2 py-1 font-bold text-blue-700">{item.effectiveQty}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                    {reservationsByWo[wo.id] && (
                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="text-xs font-semibold text-gray-500 mb-2">Material Reservations</div>
                        {reservationsByWo[wo.id].length === 0 ? (
                          <div className="text-xs text-gray-400">No reservations yet — release this Work Order to reserve material.</div>
                        ) : (
                          <table className="w-full text-xs">
                            <thead className="text-gray-400 uppercase"><tr>{['Item','Reserved Qty','Status','Note'].map(h=><th key={h} className="text-left px-2 py-1">{h}</th>)}</tr></thead>
                            <tbody className="divide-y divide-green-100">
                              {reservationsByWo[wo.id].map(r => (
                                <tr key={r.id} className="bg-white">
                                  <td className="px-2 py-1 font-mono">{r.itemCode} — {r.itemName}</td>
                                  <td className="px-2 py-1 font-bold">{r.reservedQty}</td>
                                  <td className="px-2 py-1"><span className={`px-2 py-0.5 rounded text-xs ${r.status==='ACTIVE'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{r.status}</span></td>
                                  <td className="px-2 py-1 text-gray-400">{r.releasedReason || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t flex justify-center gap-2">
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button>
              <span className="px-3 py-1 text-sm">{page} of {totalPages}</span>
              <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold">New Work Order</h2>
                <button onClick={()=>setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">BOM (pick this first)</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.bomId} onChange={e=>handleBomSelect(e.target.value)}>
                      <option value="">— No BOM —</option>
                      {boms.map(b=><option key={b.id} value={b.id}>{b.bomNumber} — {b.product?.name || b.itemCode}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Output Warehouse *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.warehouseId} onChange={e=>setForm(f=>({...f,warehouseId:e.target.value}))}>
                      <option value="">— Select —</option>
                      {warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Product Code *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono bg-gray-50" value={form.productCode} onChange={e=>setForm(f=>({...f,productCode:e.target.value}))} placeholder="Auto-fills from BOM" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Product Name *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50" value={form.productName} onChange={e=>setForm(f=>({...f,productName:e.target.value}))} placeholder="Auto-fills from BOM" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">UOM</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50" value={form.uom} onChange={e=>setForm(f=>({...f,uom:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Planned Qty *</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.plannedQty} onChange={e=>setForm(f=>({...f,plannedQty:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Start Date *</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.plannedStartDate} onChange={e=>setForm(f=>({...f,plannedStartDate:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">End Date *</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.plannedEndDate} onChange={e=>setForm(f=>({...f,plannedEndDate:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Priority</label>
                    {canSetPriority ? (
                      <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>
                        {['LOW','MEDIUM','HIGH','URGENT'].map(p=><option key={p}>{p}</option>)}
                      </select>
                    ) : (
                      <div>
                        <div className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500">{form.priority}</div>
                        <div className="text-xs text-gray-400 mt-1">Only Planning Manager and above can set priority</div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Remarks</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))} />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={()=>setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Creating...':'Create Work Order'}</button>
              </div>
            </div>
          </div>
        )}

        {completeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold text-green-700">Complete Work Order</h2>
                <button onClick={()=>setCompleteModal(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Completed Qty *</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={completeForm.completedQty} onChange={e=>setCompleteForm(f=>({...f,completedQty:e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Rejected Qty</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={completeForm.rejectedQty} onChange={e=>setCompleteForm(f=>({...f,rejectedQty:e.target.value}))} />
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={()=>setCompleteModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleComplete} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Completing...':'Mark Complete'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
