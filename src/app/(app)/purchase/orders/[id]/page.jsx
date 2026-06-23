'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  APPROVED: 'bg-blue-100 text-blue-700',
  SENT: 'bg-purple-100 text-purple-700',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-700',
  CLOSED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

export default function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [itemForm, setItemForm] = useState({ itemCode: '', itemName: '', uom: 'PCS', orderedQty: '', unitPrice: '', discount: 0, taxRate: 18, hsnCode: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchPo = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/purchase-orders/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setPo(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchPo(); }, [fetchPo]);

  const isDraft = po?.status === 'DRAFT';

  function openAddItem() {
    setEditItem(null);
    setItemForm({ itemCode: '', itemName: '', uom: 'PCS', orderedQty: '', unitPrice: '', discount: 0, taxRate: 18, hsnCode: '' });
    setError(''); setShowItemModal(true);
  }

  function openEditItem(item) {
    setEditItem(item);
    setItemForm({ itemCode: item.itemCode, itemName: item.itemName, uom: item.uom, orderedQty: item.orderedQty, unitPrice: item.unitPrice, discount: item.discount || 0, taxRate: item.taxRate || 18, hsnCode: item.hsnCode || '' });
    setError(''); setShowItemModal(true);
  }

  async function handleSaveItem() {
    setSaving(true); setError('');
    const body = { ...itemForm, orderedQty: parseFloat(itemForm.orderedQty), unitPrice: parseFloat(itemForm.unitPrice), discount: parseFloat(itemForm.discount) || 0, taxRate: parseFloat(itemForm.taxRate) || 0 };
    if (!body.hsnCode) delete body.hsnCode;
    const url = editItem ? `${API}/purchase-orders/${id}/items/${editItem.id}` : `${API}/purchase-orders/${id}/items`;
    const method = editItem ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) { setShowItemModal(false); fetchPo(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleRemoveItem(itemId) {
    if (!confirm('Remove this item?')) return;
    await fetch(`${API}/purchase-orders/${id}/items/${itemId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchPo();
  }

  async function handleAction(action) {
    const confirmMsg = action === 'approve' ? 'Approve this PO? Prices will be FROZEN and cannot be changed.' : `${action} this PO?`;
    if (!confirm(confirmMsg)) return;
    const res = await fetch(`${API}/purchase-orders/${id}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    const data = await res.json();
    if (res.ok) fetchPo();
    else setError(data.message || 'Action failed');
  }

  const calcPreview = () => {
    if (!itemForm.unitPrice || !itemForm.orderedQty) return null;
    const after = parseFloat(itemForm.unitPrice) * parseFloat(itemForm.orderedQty) * (1 - (parseFloat(itemForm.discount) || 0) / 100);
    const tax = after * (parseFloat(itemForm.taxRate) || 0) / 100;
    return { subtotal: after.toFixed(2), tax: tax.toFixed(2), total: (after + tax).toFixed(2) };
  };

  if (loading) return <AppLayout><div className="p-6 text-gray-400">Loading...</div></AppLayout>;
  if (!po) return <AppLayout><div className="p-6 text-red-500">PO not found</div></AppLayout>;

  const preview = calcPreview();

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/purchase/orders" className="text-gray-400 hover:text-gray-600 text-sm">← Purchase Orders</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-bold text-gray-900">{po.poNumber}</h1>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[po.status]}`}>{po.status}</span>
        </div>
        <p className="text-gray-500 text-sm mb-6">{po.vendor?.name} <span className="text-gray-300 mx-1">·</span> {po.vendor?.code}</p>

        {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm mb-4">{error}</div>}

        {po.status === 'APPROVED' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 mb-4">
            🔒 PO is APPROVED — prices are frozen and cannot be modified.
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'PO Date', value: new Date(po.poDate).toLocaleDateString() },
            { label: 'Delivery Date', value: new Date(po.deliveryDate).toLocaleDateString() },
            { label: 'Payment Terms', value: po.paymentTerms || '—' },
            { label: 'Currency', value: po.currency },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-lg border p-4">
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="font-bold text-gray-800 mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          {isDraft && po.items?.length > 0 && (
            <button onClick={() => handleAction('approve')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Approve PO</button>
          )}
          {po.status === 'APPROVED' && (
            <button onClick={() => handleAction('send')} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700">Send to Vendor</button>
          )}
          {['DRAFT','APPROVED'].includes(po.status) && (
            <button onClick={() => handleAction('cancel')} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600">Cancel PO</button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold text-gray-700">PO Line Items</h2>
            {isDraft && (
              <button onClick={openAddItem} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm">+ Add Item</button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>{['Seq', 'Code', 'Item Name', 'HSN', 'UOM', 'Qty', 'Unit Price', 'Disc%', 'Tax%', 'Tax Amt', 'Total', 'Status', 'Actions'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {!po.items?.length ? (
                  <tr><td colSpan={13} className="text-center py-10 text-gray-400">No items yet. Click "+ Add Item" to begin.</td></tr>
                ) : po.items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-gray-500">{item.sequence}</td>
                    <td className="px-3 py-3 font-mono text-xs text-blue-600">{item.itemCode}</td>
                    <td className="px-3 py-3 font-medium text-gray-900">{item.itemName}</td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-500">{item.hsnCode || '—'}</td>
                    <td className="px-3 py-3 text-gray-600">{item.uom}</td>
                    <td className="px-3 py-3 font-medium">{item.orderedQty?.toLocaleString()}</td>
                    <td className="px-3 py-3 font-medium">₹{item.unitPrice}</td>
                    <td className="px-3 py-3 text-gray-600">{item.discount || 0}%</td>
                    <td className="px-3 py-3 text-gray-600">{item.taxRate || 0}%</td>
                    <td className="px-3 py-3 text-gray-600">₹{item.taxAmount?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-3 font-bold text-gray-900">₹{item.totalPrice?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-3"><span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{item.status}</span></td>
                    <td className="px-3 py-3">
                      {isDraft && (
                        <div className="flex gap-2">
                          <button onClick={() => openEditItem(item)} className="text-blue-600 hover:underline text-xs">Edit</button>
                          <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:underline text-xs">Remove</button>
                        </div>
                      )}
                      {!isDraft && <span className="text-xs text-gray-300">Locked</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              {po.items?.length > 0 && (
                <tfoot className="bg-gray-50 text-sm">
                  <tr>
                    <td colSpan={9} className="px-3 py-3 text-right font-medium text-gray-600">Subtotal:</td>
                    <td colSpan={2} className="px-3 py-3 font-medium">₹{po.subtotal?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    <td colSpan={2}></td>
                  </tr>
                  <tr>
                    <td colSpan={9} className="px-3 py-2 text-right text-gray-600">Total Tax:</td>
                    <td colSpan={2} className="px-3 py-2 text-gray-700">₹{po.totalTax?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    <td colSpan={2}></td>
                  </tr>
                  <tr className="border-t-2">
                    <td colSpan={9} className="px-3 py-3 text-right font-bold text-gray-800">Total Amount:</td>
                    <td colSpan={2} className="px-3 py-3 font-bold text-lg text-gray-900">₹{po.totalAmount?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {showItemModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold">{editItem ? 'Edit PO Item' : 'Add PO Item'}</h2>
                <button onClick={() => setShowItemModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Item Code *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={itemForm.itemCode} onChange={e => setItemForm(f => ({ ...f, itemCode: e.target.value }))} disabled={!!editItem} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">UOM *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={itemForm.uom} onChange={e => setItemForm(f => ({ ...f, uom: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Item Name *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={itemForm.itemName} onChange={e => setItemForm(f => ({ ...f, itemName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Qty *</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={itemForm.orderedQty} onChange={e => setItemForm(f => ({ ...f, orderedQty: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Unit Price (₹) *</label>
                    <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={itemForm.unitPrice} onChange={e => setItemForm(f => ({ ...f, unitPrice: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Discount %</label>
                    <input type="number" step="0.1" className="w-full border rounded-lg px-3 py-2 text-sm" value={itemForm.discount} onChange={e => setItemForm(f => ({ ...f, discount: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">GST Rate %</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={itemForm.taxRate} onChange={e => setItemForm(f => ({ ...f, taxRate: e.target.value }))}>
                      {[0,5,12,18,28].map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">HSN Code</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={itemForm.hsnCode} onChange={e => setItemForm(f => ({ ...f, hsnCode: e.target.value }))} />
                  </div>
                  {preview && (
                    <div className="col-span-2 bg-blue-50 rounded-lg p-3 text-xs text-blue-800 grid grid-cols-3 gap-2">
                      <div><div className="text-blue-400">Subtotal</div><div className="font-bold">₹{parseFloat(preview.subtotal).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div></div>
                      <div><div className="text-blue-400">Tax</div><div className="font-bold">₹{parseFloat(preview.tax).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div></div>
                      <div><div className="text-blue-400">Total</div><div className="font-bold text-base">₹{parseFloat(preview.total).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div></div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowItemModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={handleSaveItem} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : editItem ? 'Update Item' : 'Add Item'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
