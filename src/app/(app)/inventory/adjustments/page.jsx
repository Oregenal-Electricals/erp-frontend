'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmt = n => n ? `₹${Number(n).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '₹0';

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  APPROVED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};
const TYPE_COLORS = {
  INCREASE: 'bg-green-100 text-green-700',
  DECREASE: 'bg-red-100 text-red-600',
  RECOUNT: 'bg-blue-100 text-blue-700',
};
const REASONS = ['DAMAGE','EXPIRY','THEFT','FOUND','OPENING','AUDIT','OTHER'];
const ADJ_TYPES = ['INCREASE','DECREASE','RECOUNT'];

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState([]);
  const [stats, setStats] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [stockBalance, setStockBalance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({ warehouseId: '', adjustmentType: 'DECREASE', reason: 'DAMAGE', remarks: '' });
  const [adjItems, setAdjItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const [adjRes, statsRes, whRes, balRes] = await Promise.all([
      fetch(`${API}/stock-adjustments?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/stock-adjustments/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/warehouses?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/stock-ledger/balance?limit=200`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (adjRes.ok) { const d = await adjRes.json(); setAdjustments(d.data); setTotalPages(d.totalPages); setTotal(d.total); }
    if (statsRes.ok) setStats(await statsRes.json());
    if (whRes.ok) { const d = await whRes.json(); setWarehouses(d.data || d); }
    if (balRes.ok) { const d = await balRes.json(); setStockBalance(d.data || []); }
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const whStock = stockBalance.filter(b => b.warehouseId === form.warehouseId);

  function calcAdjQty(item) {
    const sys = parseFloat(item.systemQty) || 0;
    const phy = parseFloat(item.physicalQty) || 0;
    if (form.adjustmentType === 'INCREASE') return phy - sys;
    if (form.adjustmentType === 'DECREASE') return sys - phy;
    return phy - sys; // RECOUNT
  }

  async function handleCreate() {
    setSaving(true); setError('');
    const validItems = adjItems.filter(i => i.itemCode && (parseFloat(i.physicalQty) >= 0));
    if (validItems.length === 0) { setError('Add at least one item'); setSaving(false); return; }
    const body = {
      ...form,
      items: validItems.map(i => ({
        itemCode: i.itemCode, itemName: i.itemName, uom: i.uom,
        systemQty: parseFloat(i.systemQty) || 0,
        physicalQty: parseFloat(i.physicalQty) || 0,
        unitCost: parseFloat(i.unitCost) || 0,
      })),
    };
    if (!body.remarks) delete body.remarks;
    const res = await fetch(`${API}/stock-adjustments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    setSaving(false);
  }

  async function handleAction(id, action) {
    const res = await fetch(`${API}/stock-adjustments/${id}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) fetchAll();
    else { const d = await res.json(); alert(d.message); }
  }

  async function handleExpand(id) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    const res = await fetch(`${API}/stock-adjustments/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const data = await res.json();
      setAdjustments(prev => prev.map(a => a.id === id ? { ...a, items: data.items } : a));
    }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock Adjustment</h1>
            <p className="text-gray-500 text-sm mt-1">Correct inventory discrepancies — damage, theft, audit, opening stock</p>
          </div>
          <button onClick={() => { setForm({ warehouseId: '', adjustmentType: 'DECREASE', reason: 'DAMAGE', remarks: '' }); setAdjItems([]); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New Adjustment</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Total', value: stats.total, color: 'bg-gray-50' },
              { label: 'Draft', value: stats.draft, color: 'bg-yellow-50' },
              { label: 'Approved', value: stats.approved, color: 'bg-green-50' },
              { label: 'Cancelled', value: stats.cancelled, color: 'bg-red-50' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {stats?.byReason?.length > 0 && (
          <div className="bg-white rounded-xl border p-4 mb-6 flex gap-3 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 self-center">APPROVED BY REASON:</span>
            {stats.byReason.map(r => (
              <div key={r.reason} className="px-3 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700">{r.reason}: {r._count}</div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b flex gap-3">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search adjustment number..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} adjustments</span>
          </div>

          <div className="space-y-0">
            {loading ? (
              <div className="text-center py-10 text-gray-400">Loading...</div>
            ) : adjustments.length === 0 ? (
              <div className="text-center py-10 text-gray-400">No adjustments found</div>
            ) : adjustments.map(adj => (
              <div key={adj.id} className="border-b last:border-b-0">
                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => handleExpand(adj.id)}>
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-blue-600">{adj.adjustmentNumber}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${TYPE_COLORS[adj.adjustmentType]}`}>{adj.adjustmentType}</span>
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">{adj.reason}</span>
                    <span className="text-xs text-gray-500">{adj.warehouse?.name}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[adj.status]}`}>{adj.status}</span>
                    <span className="text-xs text-gray-400">{adj._count?.items || adj.items?.length || 0} items</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {adj.status === 'DRAFT' && (
                      <>
                        <button onClick={e => { e.stopPropagation(); handleAction(adj.id, 'approve'); }} className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Approve</button>
                        <button onClick={e => { e.stopPropagation(); handleAction(adj.id, 'cancel'); }} className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">Cancel</button>
                      </>
                    )}
                    <span className="text-gray-400 text-xs">{expandedId === adj.id ? '▲' : '▼'}</span>
                  </div>
                </div>
                {expandedId === adj.id && adj.items && (
                  <div className="px-4 pb-4 bg-yellow-50 border-t">
                    <table className="w-full text-xs mt-3">
                      <thead className="bg-white text-gray-500 uppercase">
                        <tr>{['Item Code','Item Name','UOM','System Qty','Physical Qty','Adjustment','Unit Cost','Value Impact'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-yellow-100">
                        {adj.items.map(item => (
                          <tr key={item.id} className="bg-white">
                            <td className="px-3 py-2 font-mono text-blue-600">{item.itemCode}</td>
                            <td className="px-3 py-2">{item.itemName}</td>
                            <td className="px-3 py-2 text-gray-500">{item.uom}</td>
                            <td className="px-3 py-2">{item.systemQty}</td>
                            <td className="px-3 py-2">{item.physicalQty}</td>
                            <td className={`px-3 py-2 font-bold ${item.adjustmentQty > 0 ? 'text-green-600' : item.adjustmentQty < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                              {item.adjustmentQty > 0 ? '+' : ''}{item.adjustmentQty}
                            </td>
                            <td className="px-3 py-2">{fmt(item.unitCost)}</td>
                            <td className={`px-3 py-2 font-bold ${item.adjustmentQty > 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(Math.abs(item.adjustmentQty) * item.unitCost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold">New Stock Adjustment</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Warehouse *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.warehouseId} onChange={e => setForm(f => ({ ...f, warehouseId: e.target.value }))}>
                      <option value="">— Select —</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Adjustment Type *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.adjustmentType} onChange={e => setForm(f => ({ ...f, adjustmentType: e.target.value }))}>
                      {ADJ_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Reason *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}>
                      {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="block text-sm text-gray-600 mb-1">Remarks</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-gray-700 text-sm">Items</h3>
                    <button onClick={() => setAdjItems(prev => [...prev, { itemCode: '', itemName: '', uom: 'PCS', systemQty: '', physicalQty: '', unitCost: 0 }])} className="text-xs text-blue-600 hover:underline">+ Add Item</button>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>{['Item','System Qty','Physical Qty','Adjustment',''].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y">
                        {adjItems.map((item, idx) => {
                          const adjQty = calcAdjQty(item);
                          return (
                            <tr key={idx}>
                              <td className="px-2 py-2">
                                <select className="w-full border rounded px-2 py-1 text-xs" value={item.itemCode} onChange={e => {
                                  const bal = whStock.find(b => b.itemCode === e.target.value);
                                  setAdjItems(prev => prev.map((it,i) => i===idx ? { ...it, itemCode: e.target.value, itemName: bal?.itemName||it.itemName, uom: bal?.uom||'PCS', systemQty: bal?.availableQty||0, unitCost: bal?.unitCost||0 } : it));
                                }}>
                                  <option value="">— Select Item —</option>
                                  {whStock.map(b => <option key={b.id} value={b.itemCode}>{b.itemCode} (sys:{b.availableQty})</option>)}
                                </select>
                                <div className="text-xs text-gray-400 mt-1">{item.itemName}</div>
                              </td>
                              <td className="px-2 py-2">
                                <input type="number" className="w-20 border rounded px-2 py-1 text-xs" value={item.systemQty} onChange={e => setAdjItems(prev => prev.map((it,i) => i===idx ? { ...it, systemQty: e.target.value } : it))} />
                              </td>
                              <td className="px-2 py-2">
                                <input type="number" className="w-20 border rounded px-2 py-1 text-xs" value={item.physicalQty} onChange={e => setAdjItems(prev => prev.map((it,i) => i===idx ? { ...it, physicalQty: e.target.value } : it))} />
                              </td>
                              <td className={`px-2 py-2 font-bold text-sm ${adjQty > 0 ? 'text-green-600' : adjQty < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                {adjQty > 0 ? '+' : ''}{adjQty || 0}
                              </td>
                              <td className="px-2 py-2">
                                <button onClick={() => setAdjItems(prev => prev.filter((_,i) => i!==idx))} className="text-red-400 text-xs">✕</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {adjItems.length === 0 && <div className="text-center py-4 text-xs text-gray-400">No items added</div>}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Creating...' : 'Create Adjustment'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
