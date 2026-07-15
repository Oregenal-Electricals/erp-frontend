'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-yellow-100 text-yellow-700',
  FINALIZED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-600',
};

export default function VendorQuotationDetailPage() {
  const { id } = useParams();
  const [q, setQ] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({ unitPrice: '', quotedQty: '', discount: 0, taxRate: 18, deliveryDays: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchQ = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/vendor-quotations/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setQ(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchQ(); }, [fetchQ]);

  function openEdit(item) {
    setEditingItem(item);
    setItemForm({
      unitPrice: item.unitPrice || '',
      quotedQty: item.quotedQty || '',
      discount: item.discount || 0,
      taxRate: item.taxRate || 18,
      deliveryDays: item.deliveryDays || '',
      notes: item.notes || '',
    });
    setError('');
  }

  async function handleSaveItem() {
    setSaving(true); setError('');
    const body = {
      unitPrice: parseFloat(itemForm.unitPrice),
      quotedQty: parseFloat(itemForm.quotedQty),
      discount: parseFloat(itemForm.discount) || 0,
      taxRate: parseFloat(itemForm.taxRate) || 0,
    };
    if (itemForm.deliveryDays) body.deliveryDays = parseInt(itemForm.deliveryDays);
    if (itemForm.notes) body.notes = itemForm.notes;

    const res = await fetch(`${API}/vendor-quotations/${id}/items/${editingItem.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setEditingItem(null); fetchQ(); }
    else setError(data.message || 'Save failed');
    setSaving(false);
  }

  async function handleAction(action) {
    if (!confirm(`${action} this quotation?`)) return;
    const res = await fetch(`${API}/vendor-quotations/${id}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    const data = await res.json();
    if (res.ok) fetchQ();
    else setError(data.message || 'Action failed');
  }

  const calcPreview = () => {
    if (!itemForm.unitPrice || !itemForm.quotedQty) return null;
    const after = parseFloat(itemForm.unitPrice) * parseFloat(itemForm.quotedQty) * (1 - (parseFloat(itemForm.discount) || 0) / 100);
    return (after * (1 + (parseFloat(itemForm.taxRate) || 0) / 100)).toFixed(2);
  };

  if (loading) return <AppLayout><div className="p-6 text-gray-400">Loading...</div></AppLayout>;
  if (!q) return <AppLayout><div className="p-6 text-red-500">Quotation not found</div></AppLayout>;

  const isDraft = q.status === 'DRAFT';
  const totalAmt = q.items?.reduce((s, i) => s + (i.totalPrice || 0), 0) || 0;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/purchase/quotations" className="text-gray-400 hover:text-gray-600 text-sm">← Quotations</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-bold text-gray-900">{q.quotationNumber}</h1>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[q.status]}`}>{q.status}</span>
        </div>
        <p className="text-gray-500 text-sm mb-6">
          {q.vendor?.name} <span className="text-gray-300 mx-1">·</span>
          RFQ: <span className="font-mono">{q.rfq?.rfqNumber}</span>
        </p>

        {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm mb-4">{error}</div>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Valid Until', value: q.validUntil ? new Date(q.validUntil).toLocaleDateString() : '—' },
            { label: 'Delivery Days', value: `${q.deliveryDays} days` },
            { label: 'Payment Terms', value: q.paymentTerms || '—' },
            { label: 'Total Amount', value: totalAmt ? `₹${totalAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-lg border p-4">
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="text-lg font-bold text-gray-800 mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          {isDraft && q.items?.every(i => i.unitPrice > 0) && (
            <button onClick={() => handleAction('submit')} className="bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg text-sm hover:bg-yellow-600">Submit Quotation</button>
          )}
          {q.status === 'SUBMITTED' && (
            <button onClick={() => handleAction('finalize')} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">Finalize</button>
          )}
          {['DRAFT','SUBMITTED'].includes(q.status) && (
            <button onClick={() => handleAction('reject')} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600">Reject</button>
          )}
        </div>

        {isDraft && q.items?.some(i => i.unitPrice === 0) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700 mb-4">
            ⚠️ Enter unit prices for all items before submitting.
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-700">Quotation Items</h2>
            <p className="text-xs text-gray-400 mt-0.5">{isDraft ? 'Click Edit to enter pricing for each item' : 'Pricing locked after submission'}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>{['Item Code', 'Item Name', 'UOM', 'Req. Qty', 'Quoted Qty', 'Unit Price', 'Discount%', 'Tax%', 'Total Price', 'Delivery', 'Actions'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {q.items?.map(item => (
                  <tr key={item.id} className={`hover:bg-gray-50 ${item.unitPrice === 0 && isDraft ? 'bg-red-50' : ''}`}>
                    <td className="px-3 py-3 font-mono text-xs text-blue-600">{item.itemCode}</td>
                    <td className="px-3 py-3 font-medium text-gray-900">{item.itemName}</td>
                    <td className="px-3 py-3 text-gray-600">{item.uom}</td>
                    <td className="px-3 py-3 text-gray-600">{item.requiredQty?.toLocaleString()}</td>
                    <td className="px-3 py-3 font-medium">{item.quotedQty?.toLocaleString()}</td>
                    <td className="px-3 py-3 font-medium text-gray-800">{item.unitPrice ? `₹${item.unitPrice}` : <span className="text-red-400">Not set</span>}</td>
                    <td className="px-3 py-3 text-gray-600">{item.discount || 0}%</td>
                    <td className="px-3 py-3 text-gray-600">{item.taxRate || 0}%</td>
                    <td className="px-3 py-3 font-bold text-gray-900">{item.totalPrice ? `₹${item.totalPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}</td>
                    <td className="px-3 py-3 text-gray-600">{item.deliveryDays ? `${item.deliveryDays}d` : '—'}</td>
                    <td className="px-3 py-3">
                      {isDraft && <button onClick={() => openEdit(item)} className="text-blue-600 hover:underline text-xs">Edit</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
              {q.items?.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={8} className="px-3 py-3 text-right font-semibold text-gray-700">Total Quotation Value:</td>
                    <td className="px-3 py-3 font-bold text-gray-900">₹{totalAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {editingItem && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between">
                <div>
                  <h2 className="text-lg font-bold">Edit Pricing</h2>
                  <p className="text-sm text-gray-500">{editingItem.itemCode} — {editingItem.itemName}</p>
                </div>
                <button onClick={() => setEditingItem(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Unit Price (₹) *</label>
                    <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={itemForm.unitPrice} onChange={e => setItemForm(f => ({ ...f, unitPrice: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Quoted Qty</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={itemForm.quotedQty} onChange={e => setItemForm(f => ({ ...f, quotedQty: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Discount %</label>
                    <input type="number" step="0.1" className="w-full border rounded-lg px-3 py-2 text-sm" value={itemForm.discount} onChange={e => setItemForm(f => ({ ...f, discount: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Tax % (GST)</label>
                    <input type="number" step="0.1" className="w-full border rounded-lg px-3 py-2 text-sm" value={itemForm.taxRate} onChange={e => setItemForm(f => ({ ...f, taxRate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Item Delivery Days</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={itemForm.deliveryDays} onChange={e => setItemForm(f => ({ ...f, deliveryDays: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Notes</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={itemForm.notes} onChange={e => setItemForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
                {calcPreview() && (
                  <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
                    <span className="font-medium">Preview Total: </span>₹{parseFloat(calcPreview()).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    <div className="text-xs text-blue-600 mt-0.5">
                      {itemForm.quotedQty} × ₹{itemForm.unitPrice} × {100 - (parseFloat(itemForm.discount) || 0)}% × {100 + (parseFloat(itemForm.taxRate) || 0)}%
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setEditingItem(null)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={handleSaveItem} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save Pricing'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
