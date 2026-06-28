'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmt = n => n ? `₹${Number(n).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '₹0';
const fmtDate = d => d ? new Date(d).toLocaleDateString() : '—';

const STATUS_COLORS = {
  ACTIVE: 'bg-green-100 text-green-700',
  EXHAUSTED: 'bg-gray-100 text-gray-500',
  EXPIRED: 'bg-red-100 text-red-600',
  QUARANTINED: 'bg-orange-100 text-orange-700',
};

export default function BatchesPage() {
  const [batches, setBatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [acceptedGrns, setAcceptedGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ itemCode: '', itemName: '', uom: 'PCS', warehouseId: '', lotNumber: '', mfgDate: '', expiryDate: '', originalQty: '', unitCost: '', remarks: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [createMsg, setCreateMsg] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const [batRes, statsRes, whRes, grnRes] = await Promise.all([
      fetch(`${API}/stock-batches?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/stock-batches/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/warehouses?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/grn?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (batRes.ok) { const d = await batRes.json(); setBatches(d.data); setTotalPages(d.totalPages); setTotal(d.total); }
    if (statsRes.ok) setStats(await statsRes.json());
    if (whRes.ok) { const d = await whRes.json(); setWarehouses(d.data || d); }
    if (grnRes.ok) { const d = await grnRes.json(); setAcceptedGrns(d.data?.filter(g => ['ACCEPTED','PARTIALLY_ACCEPTED'].includes(g.status)) || []); }
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleCreateFromGrn(grnId) {
    setSaving(true); setCreateMsg('');
    const res = await fetch(`${API}/stock-batches/from-grn/${grnId}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    const data = await res.json();
    if (res.ok) { setCreateMsg(`Created ${data.created} batch(es) from GRN`); fetchAll(); }
    else setCreateMsg(data.message || 'Failed');
    setSaving(false);
  }

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { ...form, originalQty: parseFloat(form.originalQty), unitCost: parseFloat(form.unitCost)||0 };
    if (body.mfgDate) body.mfgDate = new Date(body.mfgDate).toISOString();
    else delete body.mfgDate;
    if (body.expiryDate) body.expiryDate = new Date(body.expiryDate).toISOString();
    else delete body.expiryDate;
    if (!body.lotNumber) delete body.lotNumber;
    if (!body.remarks) delete body.remarks;
    const res = await fetch(`${API}/stock-batches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleQuarantine(id) {
    const res = await fetch(`${API}/stock-batches/${id}/quarantine`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) fetchAll();
    else { const d = await res.json(); alert(d.message); }
  }

  const isExpiringSoon = (b) => b.expiryDate && new Date(b.expiryDate) <= new Date(Date.now() + 30*24*60*60*1000) && b.status === 'ACTIVE';

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Batch & Lot Management</h1>
            <p className="text-gray-500 text-sm mt-1">Track stock batches for FIFO, expiry and quality traceability</p>
          </div>
          <button onClick={() => { setForm({ itemCode: '', itemName: '', uom: 'PCS', warehouseId: '', lotNumber: '', mfgDate: '', expiryDate: '', originalQty: '', unitCost: '', remarks: '' }); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New Batch</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Active Batches', value: stats.active, color: 'bg-green-50' },
              { label: 'Expiring in 30d', value: stats.expiringIn30, color: stats.expiringIn30 > 0 ? 'bg-orange-50' : 'bg-gray-50' },
              { label: 'Quarantined', value: stats.quarantined, color: 'bg-orange-50' },
              { label: 'Total Active Qty', value: stats.totalActiveBatchQty?.toLocaleString(), color: 'bg-blue-50' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {acceptedGrns.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="text-sm font-semibold text-green-800 mb-2">📦 Auto-create batches from accepted GRNs</div>
            {createMsg && <div className="text-xs text-blue-600 mb-2">{createMsg}</div>}
            <div className="flex flex-wrap gap-2">
              {acceptedGrns.map(g => (
                <button key={g.id} onClick={() => handleCreateFromGrn(g.id)} disabled={saving} className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                  Create from {g.grnNumber}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b flex gap-3 flex-wrap">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" placeholder="Search batch no, lot no, item code..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} batches</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>{['Batch No.','Lot No.','Item Code','Item Name','Warehouse','MFG Date','Expiry Date','Original Qty','Available','Unit Cost','Status','Actions'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={12} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : batches.length === 0 ? (
                  <tr><td colSpan={12} className="text-center py-10 text-gray-400">No batches found</td></tr>
                ) : batches.map(b => (
                  <tr key={b.id} className={`hover:bg-gray-50 ${isExpiringSoon(b) ? 'bg-orange-50' : ''}`}>
                    <td className="px-3 py-3 font-mono font-bold text-blue-600 text-xs">{b.batchNumber}</td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-500">{b.lotNumber || '—'}</td>
                    <td className="px-3 py-3 font-mono text-xs text-blue-500">{b.itemCode}</td>
                    <td className="px-3 py-3 text-xs text-gray-700">{b.itemName}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{b.warehouse?.name}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{fmtDate(b.mfgDate)}</td>
                    <td className={`px-3 py-3 text-xs font-medium ${isExpiringSoon(b) ? 'text-orange-600' : 'text-gray-500'}`}>
                      {fmtDate(b.expiryDate)} {isExpiringSoon(b) ? '⚠️' : ''}
                    </td>
                    <td className="px-3 py-3 text-xs">{b.originalQty?.toLocaleString()} {b.uom}</td>
                    <td className="px-3 py-3 font-bold text-green-700">{b.availableQty?.toLocaleString()} {b.uom}</td>
                    <td className="px-3 py-3 text-xs">{fmt(b.unitCost)}</td>
                    <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[b.status]}`}>{b.status}</span></td>
                    <td className="px-3 py-3">
                      {b.status === 'ACTIVE' && (
                        <button onClick={() => handleQuarantine(b.id)} className="text-orange-500 hover:underline text-xs">Quarantine</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="p-4 border-t flex justify-center gap-2">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button>
              <span className="px-3 py-1 text-sm">{page} of {totalPages}</span>
              <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold">New Batch / Lot</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Item Code *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.itemCode} onChange={e => setForm(f => ({ ...f, itemCode: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Item Name *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">UOM</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.uom} onChange={e => setForm(f => ({ ...f, uom: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Warehouse *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.warehouseId} onChange={e => setForm(f => ({ ...f, warehouseId: e.target.value }))}>
                      <option value="">— Select —</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Vendor Lot Number</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="LOT-VND-2026-001" value={form.lotNumber} onChange={e => setForm(f => ({ ...f, lotNumber: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Manufacturing Date</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.mfgDate} onChange={e => setForm(f => ({ ...f, mfgDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Expiry Date</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Quantity *</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.originalQty} onChange={e => setForm(f => ({ ...f, originalQty: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Unit Cost (₹)</label>
                    <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.unitCost} onChange={e => setForm(f => ({ ...f, unitCost: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Remarks</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Creating...' : 'Create Batch'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
