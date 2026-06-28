'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmt = n => n ? `₹${Number(n).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '₹0';

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ISSUED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

export default function StockIssuesPage() {
  const [issues, setIssues] = useState([]);
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
  const [form, setForm] = useState({ warehouseId: '', issuedTo: '', referenceType: 'PRODUCTION', issueMethod: 'FIFO', remarks: '' });
  const [issueItems, setIssueItems] = useState([]);
  const [fifoPlan, setFifoPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const [issRes, statsRes, whRes, balRes] = await Promise.all([
      fetch(`${API}/stock-issues?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/stock-issues/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/warehouses?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/stock-ledger/balance?limit=200`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (issRes.ok) { const d = await issRes.json(); setIssues(d.data); setTotalPages(d.totalPages); setTotal(d.total); }
    if (statsRes.ok) setStats(await statsRes.json());
    if (whRes.ok) { const d = await whRes.json(); setWarehouses(d.data || d); }
    if (balRes.ok) { const d = await balRes.json(); setStockBalance(d.data || []); }
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handlePreviewFifo(idx) {
    const item = issueItems[idx];
    if (!item.itemCode || !item.requestedQty || !form.warehouseId) return;
    const params = new URLSearchParams({ warehouseId: form.warehouseId, itemCode: item.itemCode, qty: item.requestedQty, method: form.issueMethod });
    const res = await fetch(`${API}/stock-issues/fifo-plan?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setFifoPlan({ idx, data: await res.json() });
    else setFifoPlan(null);
  }

  async function handleCreate() {
    setSaving(true); setError('');
    const validItems = issueItems.filter(i => i.itemCode && parseFloat(i.requestedQty) > 0);
    if (validItems.length === 0) { setError('Add at least one item'); setSaving(false); return; }
    const body = { ...form, items: validItems.map(i => ({ ...i, requestedQty: parseFloat(i.requestedQty) })) };
    if (!body.remarks) delete body.remarks;
    if (!body.referenceId) delete body.referenceId;
    const res = await fetch(`${API}/stock-issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    setSaving(false);
  }

  async function handleConfirm(id) {
    const res = await fetch(`${API}/stock-issues/${id}/confirm`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) fetchAll();
    else { const d = await res.json(); alert(d.message); }
  }

  async function handleExpand(id) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    const res = await fetch(`${API}/stock-issues/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const data = await res.json();
      setIssues(prev => prev.map(i => i.id === id ? { ...i, items: data.items } : i));
    }
  }

  const whStock = stockBalance.filter(b => b.warehouseId === form.warehouseId);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock Issues (FIFO/FEFO)</h1>
            <p className="text-gray-500 text-sm mt-1">Issue materials using FIFO or FEFO batch allocation engine</p>
          </div>
          <button onClick={() => { setForm({ warehouseId: '', issuedTo: '', referenceType: 'PRODUCTION', issueMethod: 'FIFO', remarks: '' }); setIssueItems([]); setFifoPlan(null); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New Issue</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Issues', value: stats.total, color: 'bg-gray-50' },
              { label: 'Draft', value: stats.draft, color: 'bg-yellow-50' },
              { label: 'Issued', value: stats.issued, color: 'bg-green-50' },
              { label: 'Total Qty Issued', value: stats.totalQtyIssued?.toLocaleString(), color: 'bg-blue-50' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b flex gap-3">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search issue number, issued to..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} issues</span>
          </div>

          <div className="space-y-0">
            {loading ? (
              <div className="text-center py-10 text-gray-400">Loading...</div>
            ) : issues.length === 0 ? (
              <div className="text-center py-10 text-gray-400">No stock issues found</div>
            ) : issues.map(iss => (
              <div key={iss.id} className="border-b last:border-b-0">
                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => handleExpand(iss.id)}>
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-blue-600">{iss.issueNumber}</span>
                    <span className="text-sm text-gray-700">{iss.issuedTo}</span>
                    <span className="text-xs text-gray-400">{iss.warehouse?.name}</span>
                    <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium">{iss.issueMethod}</span>
                    <span className="text-xs text-gray-400">{iss.referenceType}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[iss.status]}`}>{iss.status}</span>
                    <span className="text-xs text-gray-400">{iss._count?.items || iss.items?.length || 0} items</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {iss.status === 'DRAFT' && (
                      <button onClick={e => { e.stopPropagation(); handleConfirm(iss.id); }} className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Confirm Issue</button>
                    )}
                    <span className="text-gray-400 text-xs">{expandedId === iss.id ? '▲' : '▼'}</span>
                  </div>
                </div>
                {expandedId === iss.id && iss.items && (
                  <div className="px-4 pb-4 bg-green-50 border-t">
                    <table className="w-full text-xs mt-3">
                      <thead className="bg-white text-gray-500 uppercase">
                        <tr>{['Item Code','Item Name','Batch','UOM','Requested','Issued','Unit Cost','Total Value'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-green-100">
                        {iss.items.map(item => (
                          <tr key={item.id} className="bg-white">
                            <td className="px-3 py-2 font-mono text-blue-600">{item.itemCode}</td>
                            <td className="px-3 py-2">{item.itemName}</td>
                            <td className="px-3 py-2 font-mono text-xs text-gray-500">{item.batch?.batchNumber || '—'}</td>
                            <td className="px-3 py-2 text-gray-500">{item.uom}</td>
                            <td className="px-3 py-2">{item.requestedQty}</td>
                            <td className="px-3 py-2 font-bold text-green-700">{item.issuedQty}</td>
                            <td className="px-3 py-2">{fmt(item.unitCost)}</td>
                            <td className="px-3 py-2 font-bold">{fmt(item.issuedQty * item.unitCost)}</td>
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
                <h2 className="text-lg font-bold">New Stock Issue</h2>
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
                    <label className="block text-sm text-gray-600 mb-1">Issue Method</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.issueMethod} onChange={e => setForm(f => ({ ...f, issueMethod: e.target.value }))}>
                      <option value="FIFO">FIFO (First In First Out)</option>
                      <option value="FEFO">FEFO (First Expired First Out)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Reference Type</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.referenceType} onChange={e => setForm(f => ({ ...f, referenceType: e.target.value }))}>
                      <option value="PRODUCTION">Production</option>
                      <option value="SALES">Sales</option>
                      <option value="INTERNAL">Internal</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="block text-sm text-gray-600 mb-1">Issued To *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Production Line 1, Department name..." value={form.issuedTo} onChange={e => setForm(f => ({ ...f, issuedTo: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-gray-700 text-sm">Items to Issue</h3>
                    <button onClick={() => setIssueItems(prev => [...prev, { itemCode: '', itemName: '', uom: 'PCS', requestedQty: '' }])} className="text-xs text-blue-600 hover:underline">+ Add Item</button>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>{['Item','Item Name','UOM','Requested Qty','FIFO Preview',''].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y">
                        {issueItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-2 py-2">
                              <select className="w-full border rounded px-2 py-1 text-xs" value={item.itemCode} onChange={e => {
                                const bal = whStock.find(b => b.itemCode === e.target.value);
                                setIssueItems(prev => prev.map((it,i) => i===idx ? { ...it, itemCode: e.target.value, itemName: bal?.itemName||it.itemName, uom: bal?.uom||'PCS' } : it));
                              }}>
                                <option value="">— Select Item —</option>
                                {whStock.map(b => <option key={b.id} value={b.itemCode}>{b.itemCode} (avail:{b.availableQty})</option>)}
                              </select>
                            </td>
                            <td className="px-2 py-2 text-xs text-gray-600">{item.itemName || '—'}</td>
                            <td className="px-2 py-2 text-xs text-gray-500">{item.uom}</td>
                            <td className="px-2 py-2">
                              <input type="number" className="w-20 border rounded px-2 py-1 text-xs" value={item.requestedQty} onChange={e => setIssueItems(prev => prev.map((it,i) => i===idx ? { ...it, requestedQty: e.target.value } : it))} />
                            </td>
                            <td className="px-2 py-2">
                              <button onClick={() => handlePreviewFifo(idx)} className="text-xs text-blue-500 hover:underline">Preview</button>
                              {fifoPlan?.idx === idx && (
                                <div className="text-xs text-green-600 mt-1">
                                  {fifoPlan.data.allocation.map(a => `${a.batchNumber}:${a.toIssueQty}`).join(', ')}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              <button onClick={() => setIssueItems(prev => prev.filter((_,i) => i!==idx))} className="text-red-400 text-xs">✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {issueItems.length === 0 && <div className="text-center py-4 text-xs text-gray-400">No items added</div>}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Creating...' : 'Create Issue'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
