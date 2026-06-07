'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() {
  if (typeof window !== 'undefined') return localStorage.getItem('accessToken');
}

const ITEM_TYPES = ['PRODUCT', 'RAW_MATERIAL', 'ITEM'];

export default function PriceListDetailPage() {
  const { id } = useParams();
  const [priceList, setPriceList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ itemType: 'PRODUCT', itemId: '', itemCode: '', itemName: '', uom: '', price: '', minQty: '', validFrom: new Date().toISOString().split('T')[0], validTo: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/price-lists/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setPriceList(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  function openAdd() {
    setForm({ itemType: 'PRODUCT', itemId: '', itemCode: '', itemName: '', uom: '', price: '', minQty: '', validFrom: new Date().toISOString().split('T')[0], validTo: '' });
    setError(''); setShowModal(true);
  }

  async function handleSave() {
    setSaving(true); setError('');
    const body = { ...form, price: parseFloat(form.price) };
    if (body.minQty) body.minQty = parseFloat(body.minQty); else delete body.minQty;
    if (!body.validTo) delete body.validTo;
    if (!body.itemId) delete body.itemId;
    const res = await fetch(`${API}/price-lists/${id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchDetail(); }
    else setError(data.message || 'Save failed');
    setSaving(false);
  }

  async function handleApprove(itemId) {
    if (!confirm('Approve this price? Once approved it cannot be modified.')) return;
    await fetch(`${API}/price-lists/${id}/items/${itemId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    fetchDetail();
  }

  async function handleRemove(itemId) {
    if (!confirm('Remove this price item?')) return;
    await fetch(`${API}/price-lists/${id}/items/${itemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    fetchDetail();
  }

  if (loading) return <AppLayout><div className="p-6 text-gray-400">Loading...</div></AppLayout>;
  if (!priceList) return <AppLayout><div className="p-6 text-red-500">Price list not found</div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/masters/price-lists" className="text-gray-400 hover:text-gray-600 text-sm">← Price Lists</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-bold text-gray-900">{priceList.name}</h1>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priceList.listType === 'SALES' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{priceList.listType}</span>
          {priceList.isDefault && <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Default</span>}
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Code', value: priceList.code },
            { label: 'Currency', value: priceList.currency },
            { label: 'Total Items', value: priceList.items?.length || 0 },
            { label: 'Approved', value: priceList.items?.filter(i => i.isApproved).length || 0 },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-lg border p-4">
              <div className="text-sm text-gray-500">{s.label}</div>
              <div className="text-xl font-bold text-gray-800 mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold text-gray-700">Price Items</h2>
            <button onClick={openAdd} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium">+ Add Price</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>{['Item Code', 'Item Name', 'Type', 'UOM', 'Price', 'Min Qty', 'Valid From', 'Valid To', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {!priceList.items || priceList.items.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-10 text-gray-400">No price items yet. Click "+ Add Price" to add.</td></tr>
                ) : priceList.items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-blue-600">{item.itemCode}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.itemName}</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">{item.itemType}</span></td>
                    <td className="px-4 py-3 text-gray-600">{item.uom || '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">₹{item.price?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{item.minQty || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{item.validFrom ? new Date(item.validFrom).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{item.validTo ? new Date(item.validTo).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      {item.isApproved
                        ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">✓ Approved</span>
                        : <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {!item.isApproved && (
                          <>
                            <button onClick={() => handleApprove(item.id)} className="text-green-600 hover:underline text-xs">Approve</button>
                            <button onClick={() => handleRemove(item.id)} className="text-red-500 hover:underline text-xs">Remove</button>
                          </>
                        )}
                        {item.isApproved && <span className="text-xs text-gray-400">Locked</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-lg font-bold">Add Price Item</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">{error}</div>}
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-yellow-700">
                  ⚠️ Once approved, this price cannot be modified. Price freeze is enforced.
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Item Type</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.itemType} onChange={e => setForm(f => ({ ...f, itemType: e.target.value }))}>
                      {ITEM_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Item Code *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.itemCode} onChange={e => setForm(f => ({ ...f, itemCode: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Item Name *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Price *</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">UOM</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.uom} onChange={e => setForm(f => ({ ...f, uom: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Min Qty</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.minQty} onChange={e => setForm(f => ({ ...f, minQty: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Valid From</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.validFrom} onChange={e => setForm(f => ({ ...f, validFrom: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Valid To (optional)</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.validTo} onChange={e => setForm(f => ({ ...f, validTo: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Add Price'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
