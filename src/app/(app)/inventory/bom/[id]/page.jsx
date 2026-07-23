'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import CustomFields from '@/components/custom-fields/CustomFields';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() {
  if (typeof window !== 'undefined') return localStorage.getItem('erp_token');
}

const STATUS_COLORS = {
  DRAFT: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  OBSOLETE: 'bg-gray-100 text-gray-500',
};

export default function BomDetailPage() {
  const { id } = useParams();
  const [bom, setBom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    sequence: 1, itemType: 'RAW_MATERIAL', itemCode: '', itemName: '',
    uom: 'PCS', quantity: '', wastagePercent: 0, unitCost: '', isCritical: false, notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchBom = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/boms/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setBom(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchBom(); }, [fetchBom]);

  function openAdd() {
    setEditItem(null);
    const nextSeq = bom?.items?.length ? Math.max(...bom.items.map(i => i.sequence)) + 1 : 1;
    setForm({ sequence: nextSeq, itemType: 'RAW_MATERIAL', itemCode: '', itemName: '', uom: 'PCS', quantity: '', wastagePercent: 0, unitCost: '', isCritical: false, notes: '' });
    setError(''); setShowModal(true);
  }

  function openEdit(item) {
    setEditItem(item);
    setForm({
      sequence: item.sequence, itemType: item.itemType, itemCode: item.itemCode,
      itemName: item.itemName, uom: item.uom, quantity: item.quantity,
      wastagePercent: item.wastagePercent || 0, unitCost: item.unitCost || '',
      isCritical: item.isCritical, notes: item.notes || ''
    });
    setError(''); setShowModal(true);
  }

  async function handleSave() {
    setSaving(true); setError('');
    const body = { ...form, quantity: parseFloat(form.quantity), wastagePercent: parseFloat(form.wastagePercent) || 0 };
    if (body.unitCost !== '') body.unitCost = parseFloat(body.unitCost); else delete body.unitCost;
    const url = editItem ? `${API}/boms/${id}/items/${editItem.id}` : `${API}/boms/${id}/items`;
    const method = editItem ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchBom(); }
    else setError(data.message || 'Save failed');
    setSaving(false);
  }

  async function handleRemoveItem(itemId) {
    if (!confirm('Remove this item?')) return;
    await fetch(`${API}/boms/${id}/items/${itemId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchBom();
  }

  async function handleApprove() {
    if (!confirm('Approve this BOM? Items cannot be modified after approval.')) return;
    await fetch(`${API}/boms/${id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchBom();
  }

  async function handleObsolete() {
    if (!confirm('Mark this BOM as obsolete?')) return;
    await fetch(`${API}/boms/${id}/obsolete`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchBom();
  }

  if (loading) return <AppLayout><div className="p-6 text-gray-400">Loading...</div></AppLayout>;
  if (!bom) return <AppLayout><div className="p-6 text-red-500">BOM not found</div></AppLayout>;

  const totalCost = bom.items?.reduce((s, i) => s + (i.totalCost || 0), 0) || 0;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/inventory/bom" className="text-gray-400 hover:text-gray-600 text-sm">← BOMs</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-bold text-gray-900">{bom.bomNumber}</h1>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[bom.status]}`}>{bom.status}</span>
        </div>
        <div className="text-gray-500 text-sm mb-6">{bom.product?.code} — {bom.product?.name} · Version {bom.version}</div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Items', value: bom.items?.length || 0 },
            { label: 'Total BOM Cost', value: totalCost ? `₹${totalCost.toFixed(2)}` : '—' },
            { label: 'Effective From', value: bom.effectiveFrom ? new Date(bom.effectiveFrom).toLocaleDateString() : '—' },
            { label: 'Approved At', value: bom.approvedAt ? new Date(bom.approvedAt).toLocaleDateString() : '—' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-lg border p-4">
              <div className="text-sm text-gray-500">{s.label}</div>
              <div className="text-xl font-bold text-gray-800 mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold text-gray-700">BOM Items</h2>
            <div className="flex gap-2">
              {bom.status === 'DRAFT' && (
                <>
                  <button onClick={openAdd} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm">+ Add Item</button>
                  <button onClick={handleApprove} className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 text-sm">Approve BOM</button>
                </>
              )}
              {bom.status === 'APPROVED' && (
                <button onClick={handleObsolete} className="bg-gray-500 text-white px-3 py-1.5 rounded-lg hover:bg-gray-600 text-sm">Mark Obsolete</button>
              )}
            </div>
          </div>

          {bom.status === 'DRAFT' && (
            <div className="px-4 py-2 bg-yellow-50 border-b text-xs text-yellow-700">
              ⚠️ DRAFT — Add all components before approving. Items cannot be modified after approval.
            </div>
          )}
          {bom.status === 'APPROVED' && (
            <div className="px-4 py-2 bg-green-50 border-b text-xs text-green-700">
              ✓ APPROVED — This BOM is locked. Clone to create a new version.
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>{['Seq', 'Type', 'Code', 'Name', 'UOM', 'Qty', 'Eff. Qty', 'Unit Cost', 'Total Cost', 'Actions'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {!bom.items || bom.items.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-10 text-gray-400">No items yet. Click "+ Add Item" to start.</td></tr>
                ) : bom.items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-gray-500">{item.sequence}</td>
                    <td className="px-3 py-3"><span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{item.itemType}</span></td>
                    <td className="px-3 py-3 font-mono text-blue-600">{item.itemCode}</td>
                    <td className="px-3 py-3 font-medium text-gray-900">{item.itemName}</td>
                    <td className="px-3 py-3 text-gray-600">{item.uom}</td>
                    <td className="px-3 py-3 text-gray-800">{item.quantity}</td>
                    <td className="px-3 py-3 text-gray-800 font-medium">{item.effectiveQty?.toFixed(3)}</td>
                    <td className="px-3 py-3 text-gray-600">{item.unitCost ? `₹${item.unitCost}` : '—'}</td>
                    <td className="px-3 py-3 font-medium text-gray-800">{item.totalCost ? `₹${item.totalCost.toFixed(2)}` : '—'}</td>
                    <td className="px-3 py-3">
                      {bom.status === 'DRAFT' && (
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(item)} className="text-blue-600 hover:underline text-xs">Edit</button>
                          <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:underline text-xs">Remove</button>
                        </div>
                      )}
                      {bom.status !== 'DRAFT' && <span className="text-xs text-gray-400">Locked</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              {bom.items && bom.items.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={9} className="px-3 py-3 text-right font-semibold text-gray-700">Total BOM Cost:</td>
                    <td className="px-3 py-3 font-bold text-gray-900">₹{totalCost.toFixed(2)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {bom && (
          <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <CustomFields module="BOM" recordId={bom.id} />
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-lg font-bold">{editItem ? 'Edit BOM Item' : 'Add BOM Item'}</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Sequence</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.sequence} onChange={e => setForm(f => ({ ...f, sequence: parseInt(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Item Type</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.itemType} onChange={e => setForm(f => ({ ...f, itemType: e.target.value }))}>
                      <option value="RAW_MATERIAL">Raw Material</option>
                      <option value="COMPONENT">Component</option>
                      <option value="SUB_ASSEMBLY">Sub Assembly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Item Code *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.itemCode} onChange={e => setForm(f => ({ ...f, itemCode: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">UOM *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.uom} onChange={e => setForm(f => ({ ...f, uom: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Item Name *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Quantity *</label>
                    <input type="number" step="0.001" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Wastage %</label>
                    <input type="number" step="0.1" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.wastagePercent} onChange={e => setForm(f => ({ ...f, wastagePercent: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Unit Cost (₹)</label>
                    <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.unitCost} onChange={e => setForm(f => ({ ...f, unitCost: e.target.value }))} />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input type="checkbox" id="isCritical" checked={form.isCritical} onChange={e => setForm(f => ({ ...f, isCritical: e.target.checked }))} />
                    <label htmlFor="isCritical" className="text-sm text-gray-600">Critical Component</label>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Notes</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                  {form.quantity && (
                    <div className="col-span-2 bg-blue-50 rounded p-3 text-xs text-blue-700">
                      Effective Qty = {(parseFloat(form.quantity) * (1 + (parseFloat(form.wastagePercent) || 0) / 100)).toFixed(3)} {form.uom}
                      {form.unitCost && ` · Total = ₹${(parseFloat(form.quantity) * (1 + (parseFloat(form.wastagePercent) || 0) / 100) * parseFloat(form.unitCost)).toFixed(2)}`}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : editItem ? 'Update Item' : 'Add Item'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
