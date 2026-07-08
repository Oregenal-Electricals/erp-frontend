'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  RECEIVED: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-600',
};

export default function ProformaInvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [ipos, setIpos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(null);
  const [selectedIpo, setSelectedIpo] = useState(null);
  const [form, setForm] = useState({ ipoId: '', vendorPiNumber: '', validUntil: '', bankName: '', bankAddress: '', swiftCode: '', notes: '' });
  const [items, setItems] = useState([{ itemCode: '', itemName: '', uom: 'PCS', qty: '', unitPriceForeign: '' }]);
  const [rejectReason, setRejectReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const [invRes, statsRes, ipoRes] = await Promise.all([
      fetch(`${API}/proforma-invoices?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/proforma-invoices/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/import-orders?limit=200`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (invRes.ok) { const d = await invRes.json(); setInvoices(d.data); setTotalPages(d.totalPages); setTotal(d.total); }
    if (statsRes.ok) setStats(await statsRes.json());
    if (ipoRes.ok) { const d = await ipoRes.json(); setIpos(d.data.filter(i => ['SENT', 'PROFORMA_RECEIVED'].includes(i.status))); }
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function handleIpoSelect(ipoId) {
    const ipo = ipos.find(i => i.id === ipoId);
    setSelectedIpo(ipo);
    setForm(f => ({ ...f, ipoId }));
  }

  async function handleCreate() {
    setSaving(true); setError('');
    const body = {
      ...form,
      validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : undefined,
      items: items.filter(i => i.itemCode && i.qty && i.unitPriceForeign).map(i => ({
        ...i, qty: parseFloat(i.qty), unitPriceForeign: parseFloat(i.unitPriceForeign)
      })),
    };
    if (!body.bankName) delete body.bankName;
    if (!body.swiftCode) delete body.swiftCode;
    if (!body.vendorPiNumber) delete body.vendorPiNumber;
    const res = await fetch(`${API}/proforma-invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleAccept(id) {
    await fetch(`${API}/proforma-invoices/${id}/accept`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchAll();
  }

  async function handleReject() {
    if (!rejectReason.trim()) { setError('Reason required'); return; }
    setSaving(true);
    await fetch(`${API}/proforma-invoices/${showRejectModal}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ rejectionReason: rejectReason }),
    });
    setShowRejectModal(null); setRejectReason(''); fetchAll(); setSaving(false);
  }

  function addItem() { setItems(prev => [...prev, { itemCode: '', itemName: '', uom: 'PCS', qty: '', unitPriceForeign: '' }]); }
  function updateItem(idx, field, val) { setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item)); }
  function removeItem(idx) { setItems(prev => prev.filter((_, i) => i !== idx)); }

  const previewTotal = items.reduce((s, i) => {
    if (i.qty && i.unitPriceForeign) return s + parseFloat(i.qty) * parseFloat(i.unitPriceForeign);
    return s;
  }, 0);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Proforma Invoices</h1>
            <p className="text-gray-500 text-sm mt-1">Vendor pre-shipment invoices for LC/TT processing</p>
          </div>
          <button onClick={() => { setForm({ ipoId: '', vendorPiNumber: '', validUntil: '', bankName: '', bankAddress: '', swiftCode: '', notes: '' }); setItems([{ itemCode: '', itemName: '', uom: 'PCS', qty: '', unitPriceForeign: '' }]); setSelectedIpo(null); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ Register PI</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total PIs', value: stats.total, color: 'bg-gray-50' },
              { label: 'Pending Review', value: stats.received, color: 'bg-blue-50' },
              { label: 'Accepted', value: stats.accepted, color: 'bg-green-50' },
              { label: 'Total Value (INR)', value: `₹${(stats.totalValueInr||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`, color: 'bg-purple-50' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b flex gap-3 flex-wrap">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" placeholder="Search PI number..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} PIs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>{['PI No.', 'Vendor PI No.', 'Import PO', 'Vendor', 'Currency', 'Foreign Value', 'INR Value', 'Bank / SWIFT', 'Valid Until', 'Status', 'Actions'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={11} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-10 text-gray-400">No proforma invoices found</td></tr>
                ) : invoices.map(pi => (
                  <tr key={pi.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 font-mono font-medium text-blue-600 text-xs">{pi.piNumber}</td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-600">{pi.vendorPiNumber || '—'}</td>
                    <td className="px-3 py-3">
                      <Link href={`/import/orders/${pi.ipoId}`} className="font-mono text-xs text-blue-500 hover:underline">{pi.ipo?.ipoNumber}</Link>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-700">{pi.ipo?.vendor?.name}</td>
                    <td className="px-3 py-3 font-bold text-gray-700">{pi.currency}</td>
                    <td className="px-3 py-3 font-medium">${pi.subtotalForeign?.toLocaleString(undefined,{maximumFractionDigits:2})}</td>
                    <td className="px-3 py-3 font-bold text-gray-900">₹{pi.totalAmount?.toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{pi.bankName || '—'}{pi.swiftCode && ` / ${pi.swiftCode}`}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{pi.validUntil ? new Date(pi.validUntil).toLocaleDateString() : '—'}</td>
                    <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[pi.status]}`}>{pi.status}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        {pi.status === 'RECEIVED' && <button onClick={() => handleAccept(pi.id)} className="text-green-600 hover:underline text-xs">Accept</button>}
                        {pi.status === 'RECEIVED' && <button onClick={() => { setShowRejectModal(pi.id); setRejectReason(''); setError(''); }} className="text-red-500 hover:underline text-xs">Reject</button>}
                      </div>
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
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white z-10">
                <h2 className="text-lg font-bold">Register Proforma Invoice</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Import PO *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.ipoId} onChange={e => handleIpoSelect(e.target.value)}>
                      <option value="">— Select SENT Import PO —</option>
                      {ipos.map(i => <option key={i.id} value={i.id}>{i.ipoNumber} — {i.vendor?.name} ({i.currency})</option>)}
                    </select>
                  </div>
                  {selectedIpo && (
                    <div className="col-span-2 bg-blue-50 rounded-lg p-3 text-xs text-blue-800 grid grid-cols-3 gap-2">
                      <div><div className="text-blue-400">Currency</div><div className="font-bold">{selectedIpo.currency}</div></div>
                      <div><div className="text-blue-400">Exchange Rate</div><div className="font-bold">₹{selectedIpo.exchangeRate}</div></div>
                      <div><div className="text-blue-400">Incoterms</div><div className="font-bold">{selectedIpo.incoterms}</div></div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Vendor PI Number</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.vendorPiNumber} onChange={e => setForm(f => ({ ...f, vendorPiNumber: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Valid Until</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Bank Name</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Bank of China" value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">SWIFT Code</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="e.g. BKCHCNBJ" value={form.swiftCode} onChange={e => setForm(f => ({ ...f, swiftCode: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-700 text-sm">Line Items</h3>
                    <button onClick={addItem} className="text-blue-600 text-xs hover:underline">+ Add Item</button>
                  </div>
                  <div className="space-y-3">
                    {items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-5 gap-2 items-end border rounded-lg p-3 bg-gray-50">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Item Code</label>
                          <input className="w-full border rounded px-2 py-1.5 text-xs font-mono" value={item.itemCode} onChange={e => updateItem(idx, 'itemCode', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Item Name</label>
                          <input className="w-full border rounded px-2 py-1.5 text-xs" value={item.itemName} onChange={e => updateItem(idx, 'itemName', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Qty</label>
                          <input type="number" className="w-full border rounded px-2 py-1.5 text-xs" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Unit Price ({selectedIpo?.currency || 'USD'})</label>
                          <input type="number" step="0.001" className="w-full border rounded px-2 py-1.5 text-xs" value={item.unitPriceForeign} onChange={e => updateItem(idx, 'unitPriceForeign', e.target.value)} />
                        </div>
                        <div className="flex items-end">
                          {items.length > 1 && <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-xs mb-0.5">✕ Remove</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {previewTotal > 0 && selectedIpo && (
                    <div className="mt-3 bg-green-50 rounded-lg p-3 text-sm flex justify-between">
                      <span className="text-green-700">Total Foreign: <strong>{selectedIpo.currency} {previewTotal.toLocaleString(undefined,{maximumFractionDigits:2})}</strong></span>
                      <span className="text-green-700">Total INR: <strong>₹{(previewTotal * selectedIpo.exchangeRate).toLocaleString('en-IN',{maximumFractionDigits:0})}</strong></span>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Registering...' : 'Register PI'}</button>
              </div>
            </div>
          </div>
        )}

        {showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b">
                <h2 className="text-lg font-bold text-red-600">Reject Proforma Invoice</h2>
              </div>
              <div className="p-6">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm mb-3">{error}</div>}
                <label className="block text-sm text-gray-600 mb-2">Rejection Reason *</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowRejectModal(null)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={handleReject} disabled={saving} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50">{saving ? 'Rejecting...' : 'Reject'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
