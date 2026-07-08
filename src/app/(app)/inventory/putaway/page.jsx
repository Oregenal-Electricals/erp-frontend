'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmt = n => n ? `₹${Number(n).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '₹0';

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
};

const BIN_STATUS_COLORS = {
  EMPTY: 'bg-green-100 text-green-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  FULL: 'bg-red-100 text-red-600',
  RESERVED: 'bg-blue-100 text-blue-700',
  BLOCKED: 'bg-gray-200 text-gray-500',
};

export default function PutawayPage() {
  const [putaways, setPutaways] = useState([]);
  const [stats, setStats] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [acceptedGrns, setAcceptedGrns] = useState([]);
  const [emptyBins, setEmptyBins] = useState([]);
  const [stockBalance, setStockBalance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({ grnId: '', iqcId: '', warehouseId: '' });
  const [putawayItems, setPutawayItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const [putRes, statsRes, whRes, grnRes, balRes] = await Promise.all([
      fetch(`${API}/stock-putaway?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/stock-putaway/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/warehouses?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/grn?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/stock-ledger/balance?limit=200`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (putRes.ok) { const d = await putRes.json(); setPutaways(d.data); setTotalPages(d.totalPages); setTotal(d.total); }
    if (statsRes.ok) setStats(await statsRes.json());
    if (whRes.ok) { const d = await whRes.json(); setWarehouses(d.data || d); }
    if (grnRes.ok) { const d = await grnRes.json(); setAcceptedGrns(d.data?.filter(g => ['ACCEPTED','PARTIALLY_ACCEPTED'].includes(g.status)) || []); }
    if (balRes.ok) { const d = await balRes.json(); setStockBalance(d.data || []); }
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleGrnSelect(grnId) {
    setForm(f => ({ ...f, grnId, iqcId: '' }));
    if (!grnId) return;
    const res = await fetch(`${API}/iqc/grn/${grnId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const data = await res.json();
      if (data[0]) setForm(f => ({ ...f, grnId, iqcId: data[0].id }));
    }
  }

  async function handleWhSelect(warehouseId) {
    setForm(f => ({ ...f, warehouseId }));
    if (!warehouseId) return;
    const res = await fetch(`${API}/rack-bin/bins/empty/${warehouseId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setEmptyBins(await res.json());
    // Initialize putaway items from stock balance
    setPutawayItems(stockBalance.filter(b => b.warehouseId === warehouseId || true).slice(0,5).map(b => ({
      binId: '', itemCode: b.itemCode, itemName: b.itemName, uom: b.uom || 'PCS',
      qty: '', unitCost: b.unitCost,
    })));
  }

  async function handleCreate() {
    setSaving(true); setError('');
    const validItems = putawayItems.filter(i => i.binId && parseFloat(i.qty) > 0);
    if (validItems.length === 0) { setError('Add at least one item with bin and qty'); setSaving(false); return; }
    const body = {
      grnId: form.grnId, iqcId: form.iqcId || undefined,
      warehouseId: form.warehouseId,
      items: validItems.map(i => ({ ...i, qty: parseFloat(i.qty), unitCost: parseFloat(i.unitCost) || 0 })),
    };
    if (!body.iqcId) delete body.iqcId;
    const res = await fetch(`${API}/stock-putaway`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleComplete(id) {
    const res = await fetch(`${API}/stock-putaway/${id}/complete`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) fetchAll();
    else { const d = await res.json(); alert(d.message); }
  }

  async function handleExpand(id) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    const res = await fetch(`${API}/stock-putaway/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const data = await res.json();
      setPutaways(prev => prev.map(p => p.id === id ? { ...p, items: data.items } : p));
    }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock Putaway</h1>
            <p className="text-gray-500 text-sm mt-1">Assign accepted stock to specific rack/bin locations</p>
          </div>
          <button onClick={() => { setForm({ grnId: '', iqcId: '', warehouseId: '' }); setPutawayItems([]); setEmptyBins([]); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New Putaway</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total', value: stats.total, color: 'bg-gray-50' },
              { label: 'In Progress', value: stats.inProgress, color: 'bg-yellow-50' },
              { label: 'Completed', value: stats.completed, color: 'bg-green-50' },
              { label: 'Total Qty Putaway', value: stats.totalQtyPutaway?.toLocaleString(), color: 'bg-blue-50' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {acceptedGrns.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-sm text-blue-800">
            📦 <strong>{acceptedGrns.length}</strong> GRN(s) ready for putaway: {acceptedGrns.map(g => g.grnNumber).join(', ')}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b flex gap-3">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search putaway number..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} putaways</span>
          </div>

          <div className="space-y-0">
            {loading ? (
              <div className="text-center py-10 text-gray-400">Loading...</div>
            ) : putaways.length === 0 ? (
              <div className="text-center py-10 text-gray-400">No putaway records found</div>
            ) : putaways.map(p => (
              <div key={p.id} className="border-b last:border-b-0">
                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => handleExpand(p.id)}>
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-blue-600">{p.putawayNumber}</span>
                    <span className="font-mono text-xs text-gray-400">{p.grn?.grnNumber}</span>
                    <span className="text-xs text-gray-500">{p.warehouse?.name}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>{p.status?.replace(/_/g,' ')}</span>
                    <span className="text-xs text-gray-400">{p._count?.items || p.items?.length || 0} items</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {p.status === 'IN_PROGRESS' && (
                      <button onClick={e => { e.stopPropagation(); handleComplete(p.id); }} className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Complete</button>
                    )}
                    <span className="text-gray-400 text-xs">{expandedId === p.id ? '▲' : '▼'}</span>
                  </div>
                </div>
                {expandedId === p.id && p.items && (
                  <div className="px-4 pb-4 bg-blue-50 border-t">
                    <table className="w-full text-xs mt-3">
                      <thead className="bg-white text-gray-500 uppercase">
                        <tr>{['Item Code','Item Name','Bin','Bin Status','Qty','Unit Cost','Total Value'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-blue-100">
                        {p.items.map(item => (
                          <tr key={item.id} className="bg-white">
                            <td className="px-3 py-2 font-mono text-blue-600">{item.itemCode}</td>
                            <td className="px-3 py-2">{item.itemName}</td>
                            <td className="px-3 py-2 font-mono font-bold">{item.bin?.code || '—'}</td>
                            <td className="px-3 py-2"><span className={`px-2 py-1 rounded text-xs ${BIN_STATUS_COLORS[item.bin?.status]}`}>{item.bin?.status}</span></td>
                            <td className="px-3 py-2 font-bold">{item.qty} {item.uom}</td>
                            <td className="px-3 py-2">{fmt(item.unitCost)}</td>
                            <td className="px-3 py-2 font-bold">{fmt(item.qty * item.unitCost)}</td>
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
                <h2 className="text-lg font-bold">New Stock Putaway</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">GRN (Accepted) *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.grnId} onChange={e => handleGrnSelect(e.target.value)}>
                      <option value="">— Select GRN —</option>
                      {acceptedGrns.map(g => <option key={g.id} value={g.id}>{g.grnNumber} ({g.status})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Warehouse *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.warehouseId} onChange={e => handleWhSelect(e.target.value)}>
                      <option value="">— Select Warehouse —</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>

                {form.warehouseId && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-gray-700 text-sm">Assign Items to Bins</h3>
                      <button onClick={() => setPutawayItems(prev => [...prev, { binId: '', itemCode: '', itemName: '', uom: 'PCS', qty: '', unitCost: 0 }])} className="text-xs text-blue-600 hover:underline">+ Add Row</button>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                          <tr>{['Item Code','Item Name','UOM','Qty','Bin Location',''].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y">
                          {putawayItems.map((item, idx) => (
                            <tr key={idx}>
                              <td className="px-2 py-2">
                                <select className="w-full border rounded px-2 py-1 text-xs" value={item.itemCode} onChange={e => {
                                  const bal = stockBalance.find(b => b.itemCode === e.target.value);
                                  setPutawayItems(prev => prev.map((it,i) => i===idx ? { ...it, itemCode: e.target.value, itemName: bal?.itemName||it.itemName, uom: bal?.uom||'PCS', unitCost: bal?.unitCost||0 } : it));
                                }}>
                                  <option value="">— Select —</option>
                                  {stockBalance.map(b => <option key={b.id} value={b.itemCode}>{b.itemCode} (qty:{b.availableQty})</option>)}
                                </select>
                              </td>
                              <td className="px-2 py-2 text-xs text-gray-600">{item.itemName || '—'}</td>
                              <td className="px-2 py-2 text-xs text-gray-500">{item.uom}</td>
                              <td className="px-2 py-2">
                                <input type="number" className="w-20 border rounded px-2 py-1 text-xs" placeholder="Qty" value={item.qty} onChange={e => setPutawayItems(prev => prev.map((it,i) => i===idx ? { ...it, qty: e.target.value } : it))} />
                              </td>
                              <td className="px-2 py-2">
                                <select className="w-full border rounded px-2 py-1 text-xs" value={item.binId} onChange={e => setPutawayItems(prev => prev.map((it,i) => i===idx ? { ...it, binId: e.target.value } : it))}>
                                  <option value="">— Select Bin —</option>
                                  {emptyBins.map(b => <option key={b.id} value={b.id}>{b.code} ({b.rack?.code})</option>)}
                                </select>
                              </td>
                              <td className="px-2 py-2">
                                <button onClick={() => setPutawayItems(prev => prev.filter((_,i) => i!==idx))} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {putawayItems.length === 0 && <div className="text-center py-4 text-xs text-gray-400">No items added yet</div>}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Creating...' : 'Create Putaway'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
