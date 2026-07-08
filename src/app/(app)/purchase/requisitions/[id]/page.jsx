'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() {
  if (typeof window !== 'undefined') return localStorage.getItem('erp_token');
}

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  PO_RAISED: 'bg-blue-100 text-blue-700',
};

const PRIORITY_COLORS = {
  LOW: 'bg-gray-100 text-gray-500',
  NORMAL: 'bg-blue-100 text-blue-600',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

export default function PurchaseRequisitionDetailPage() {
  const { id } = useParams();
  const [pr, setPr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [itemForm, setItemForm] = useState({ itemCode: '', itemName: '', uom: 'PCS', requiredQty: '', estimatedUnitPrice: '', hsnCode: '', notes: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchPr = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/purchase-requisitions/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setPr(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchPr(); }, [fetchPr]);

  const isDraft = pr?.status === 'DRAFT';

  async function handleAddItem() {
    setSaving(true); setError('');
    const body = { ...itemForm, requiredQty: parseFloat(itemForm.requiredQty) };
    if (body.estimatedUnitPrice) body.estimatedUnitPrice = parseFloat(body.estimatedUnitPrice); else delete body.estimatedUnitPrice;
    if (!body.hsnCode) delete body.hsnCode;
    if (!body.notes) delete body.notes;
    const res = await fetch(`${API}/purchase-requisitions/${id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowItemModal(false); fetchPr(); setItemForm({ itemCode: '', itemName: '', uom: 'PCS', requiredQty: '', estimatedUnitPrice: '', hsnCode: '', notes: '' }); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleRemoveItem(itemId) {
    if (!confirm('Remove this item?')) return;
    await fetch(`${API}/purchase-requisitions/${id}/items/${itemId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchPr();
  }

  async function handleSubmit() {
    if (!confirm('Submit this PR for approval?')) return;
    await fetch(`${API}/purchase-requisitions/${id}/submit`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchPr();
  }

  async function handleApprove() {
    if (!confirm('Approve this PR?')) return;
    await fetch(`${API}/purchase-requisitions/${id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchPr();
  }

  async function handleReject() {
    if (!rejectReason.trim()) { setError('Rejection reason required'); return; }
    setSaving(true);
    await fetch(`${API}/purchase-requisitions/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ rejectionReason: rejectReason }),
    });
    setShowRejectModal(false); fetchPr(); setSaving(false);
  }

  if (loading) return <AppLayout><div className="p-6 text-gray-400">Loading...</div></AppLayout>;
  if (!pr) return <AppLayout><div className="p-6 text-red-500">PR not found</div></AppLayout>;

  const totalEst = pr.items?.reduce((s, i) => s + (i.estimatedTotal || 0), 0) || 0;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/purchase/requisitions" className="text-gray-400 hover:text-gray-600 text-sm">← Purchase Requisitions</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-bold text-gray-900">{pr.prNumber}</h1>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[pr.status]}`}>{pr.status}</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[pr.priority]}`}>{pr.priority}</span>
        </div>
        <p className="text-gray-600 text-sm mb-6">{pr.title}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Department', value: pr.department || '—' },
            { label: 'Required By', value: pr.requiredDate ? new Date(pr.requiredDate).toLocaleDateString() : '—' },
            { label: 'Items', value: pr.items?.length || 0 },
            { label: 'Est. Total', value: totalEst ? `₹${totalEst.toLocaleString()}` : '—' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-lg border p-4">
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="text-lg font-bold text-gray-800 mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        {pr.rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-sm text-red-700">
            <strong>Rejection Reason:</strong> {pr.rejectionReason}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold text-gray-700">PR Items</h2>
            <div className="flex gap-2">
              {isDraft && <button onClick={() => setShowItemModal(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm">+ Add Item</button>}
              {isDraft && pr.items?.length > 0 && <button onClick={handleSubmit} className="bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-sm">Submit for Approval</button>}
              {pr.status === 'SUBMITTED' && (
                <>
                  <button onClick={handleApprove} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm">Approve</button>
                  <button onClick={() => setShowRejectModal(true)} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm">Reject</button>
                </>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>{['Seq', 'Item Code', 'Item Name', 'UOM', 'Req. Qty', 'Unit Price', 'Est. Total', 'HSN', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {!pr.items || pr.items.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-10 text-gray-400">No items yet. Click "+ Add Item" to start.</td></tr>
                ) : pr.items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{item.sequence}</td>
                    <td className="px-4 py-3 font-mono text-blue-600">{item.itemCode}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.itemName}</td>
                    <td className="px-4 py-3 text-gray-600">{item.uom}</td>
                    <td className="px-4 py-3 font-medium">{item.requiredQty.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{item.estimatedUnitPrice ? `₹${item.estimatedUnitPrice}` : '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{item.estimatedTotal ? `₹${item.estimatedTotal.toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.hsnCode || '—'}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{item.status}</span></td>
                    <td className="px-4 py-3">
                      {isDraft && <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:underline text-xs">Remove</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
              {pr.items?.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-right font-semibold text-gray-700">Estimated Total:</td>
                    <td className="px-4 py-3 font-bold text-gray-900">₹{totalEst.toLocaleString()}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {showItemModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-lg font-bold">Add PR Item</h2>
                <button onClick={() => setShowItemModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Item Code *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={itemForm.itemCode} onChange={e => setItemForm(f => ({ ...f, itemCode: e.target.value }))} />
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
                    <label className="block text-sm text-gray-600 mb-1">Required Qty *</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={itemForm.requiredQty} onChange={e => setItemForm(f => ({ ...f, requiredQty: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Est. Unit Price (₹)</label>
                    <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={itemForm.estimatedUnitPrice} onChange={e => setItemForm(f => ({ ...f, estimatedUnitPrice: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">HSN Code</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={itemForm.hsnCode} onChange={e => setItemForm(f => ({ ...f, hsnCode: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Notes</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={itemForm.notes} onChange={e => setItemForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                  {itemForm.requiredQty && itemForm.estimatedUnitPrice && (
                    <div className="col-span-2 bg-blue-50 rounded p-3 text-xs text-blue-700">
                      Est. Total = ₹{(parseFloat(itemForm.requiredQty) * parseFloat(itemForm.estimatedUnitPrice)).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowItemModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleAddItem} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Adding...' : 'Add Item'}</button>
              </div>
            </div>
          </div>
        )}

        {showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-lg font-bold text-red-600">Reject PR</h2>
                <button onClick={() => setShowRejectModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div className="p-6">
                {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm mb-3">{error}</div>}
                <label className="block text-sm text-gray-600 mb-2">Rejection Reason *</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={4} placeholder="Enter reason for rejection..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={handleReject} disabled={saving} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50">{saving ? 'Rejecting...' : 'Reject PR'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
