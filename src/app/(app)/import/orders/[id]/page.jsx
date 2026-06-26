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
  PROFORMA_RECEIVED: 'bg-yellow-100 text-yellow-700',
  LC_OPENED: 'bg-orange-100 text-orange-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  CUSTOMS_CLEARED: 'bg-teal-100 text-teal-700',
  CLOSED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

const STATUS_FLOW = {
  APPROVED: 'SENT',
  SENT: 'PROFORMA_RECEIVED',
  PROFORMA_RECEIVED: 'LC_OPENED',
  LC_OPENED: 'SHIPPED',
  SHIPPED: 'CUSTOMS_CLEARED',
  CUSTOMS_CLEARED: 'CLOSED',
};

export default function ImportOrderDetailPage() {
  const { id } = useParams();
  const [ipo, setIpo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemForm, setItemForm] = useState({ itemCode: '', itemName: '', uom: 'PCS', orderedQty: '', unitPriceForeign: '', discount: 0, taxRate: 18, bcdRate: 10, hsnCode: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchIpo = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/import-orders/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setIpo(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchIpo(); }, [fetchIpo]);

  async function handleAction(action) {
    const res = await fetch(`${API}/import-orders/${id}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    const data = await res.json();
    if (res.ok) fetchIpo();
    else setError(data.message || 'Action failed');
  }

  async function handleNextStatus() {
    const next = STATUS_FLOW[ipo?.status];
    if (!next) return;
    await handleAction(`status/${next}`);
  }

  async function handleAddItem() {
    setSaving(true); setError('');
    const body = { ...itemForm, orderedQty: parseFloat(itemForm.orderedQty), unitPriceForeign: parseFloat(itemForm.unitPriceForeign), discount: parseFloat(itemForm.discount) || 0, taxRate: parseFloat(itemForm.taxRate) || 0, bcdRate: parseFloat(itemForm.bcdRate) || 0 };
    if (!body.hsnCode) delete body.hsnCode;
    const res = await fetch(`${API}/import-orders/${id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowItemModal(false); fetchIpo(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  const previewItem = () => {
    if (!itemForm.unitPriceForeign || !itemForm.orderedQty || !ipo) return null;
    const foreignTotal = parseFloat(itemForm.unitPriceForeign) * parseFloat(itemForm.orderedQty) * (1 - (parseFloat(itemForm.discount) || 0) / 100);
    const inrBase = foreignTotal * ipo.exchangeRate;
    const bcd = inrBase * (parseFloat(itemForm.bcdRate) || 0) / 100;
    const igst = (inrBase + bcd) * (parseFloat(itemForm.taxRate) || 0) / 100;
    return { foreignTotal: foreignTotal.toFixed(2), inrBase: inrBase.toFixed(2), bcd: bcd.toFixed(2), igst: igst.toFixed(2), total: (inrBase + bcd + igst).toFixed(2) };
  };

  if (loading) return <AppLayout><div className="p-6 text-gray-400">Loading...</div></AppLayout>;
  if (!ipo) return <AppLayout><div className="p-6 text-red-500">Import PO not found</div></AppLayout>;

  const preview = previewItem();
  const isDraft = ipo.status === 'DRAFT';
  const nextStatus = STATUS_FLOW[ipo.status];

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/import/orders" className="text-gray-400 hover:text-gray-600 text-sm">← Import Orders</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-bold text-gray-900">{ipo.ipoNumber}</h1>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[ipo.status]}`}>{ipo.status?.replace(/_/g, ' ')}</span>
        </div>
        <p className="text-gray-500 text-sm mb-6">{ipo.vendor?.name} <span className="text-gray-300 mx-1">·</span> {ipo.vendor?.code}</p>

        {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm mb-4">{error}</div>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Currency', value: ipo.currency },
            { label: 'Exchange Rate', value: `₹${ipo.exchangeRate}` },
            { label: 'Incoterms', value: ipo.incoterms },
            { label: 'Payment Mode', value: ipo.paymentMode },
            { label: 'Port of Loading', value: ipo.portOfLoading || '—' },
            { label: 'Port of Discharge', value: ipo.portOfDischarge || '—' },
            { label: 'Delivery Date', value: new Date(ipo.deliveryDate).toLocaleDateString() },
            { label: 'Payment Terms', value: ipo.paymentTerms || '—' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-lg border p-3">
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="font-semibold text-gray-800 mt-0.5">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-xs text-gray-500 mb-1">Foreign Value</div>
            <div className="text-2xl font-bold text-gray-800">{ipo.currency} {ipo.subtotalForeign?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-xs text-gray-500 mb-1">Total Tax (BCD + IGST)</div>
            <div className="text-2xl font-bold text-orange-600">₹{ipo.totalTax?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          </div>
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-4 text-center text-white">
            <div className="text-xs opacity-80 mb-1">Total Amount (INR)</div>
            <div className="text-2xl font-bold">₹{ipo.totalAmount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {isDraft && ipo.items?.length > 0 && (
            <button onClick={() => handleAction('approve')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Approve IPO</button>
          )}
          {nextStatus && (
            <button onClick={handleNextStatus} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700">→ Mark as {nextStatus.replace(/_/g, ' ')}</button>
          )}
          {['DRAFT', 'APPROVED'].includes(ipo.status) && (
            <button onClick={() => handleAction('cancel')} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600">Cancel IPO</button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold text-gray-700">IPO Line Items</h2>
            {isDraft && <button onClick={() => { setItemForm({ itemCode: '', itemName: '', uom: 'PCS', orderedQty: '', unitPriceForeign: '', discount: 0, taxRate: 18, bcdRate: 10, hsnCode: '' }); setError(''); setShowItemModal(true); }} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm">+ Add Item</button>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>{['Code', 'Item Name', 'HSN', 'UOM', 'Qty', `Unit (${ipo.currency})`, 'Disc%', 'BCD%', 'IGST%', `Total (${ipo.currency})`, 'Total (₹)'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {!ipo.items?.length ? (
                  <tr><td colSpan={11} className="text-center py-8 text-gray-400">No items. Click "+ Add Item".</td></tr>
                ) : ipo.items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs text-blue-600">{item.itemCode}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{item.itemName}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-500">{item.hsnCode || '—'}</td>
                    <td className="px-3 py-2">{item.uom}</td>
                    <td className="px-3 py-2 font-medium">{item.orderedQty?.toLocaleString()}</td>
                    <td className="px-3 py-2">{item.unitPriceForeign}</td>
                    <td className="px-3 py-2 text-gray-500">{item.discount || 0}%</td>
                    <td className="px-3 py-2 text-gray-500">{item.bcdRate || 0}%</td>
                    <td className="px-3 py-2 text-gray-500">{item.igstRate || 0}%</td>
                    <td className="px-3 py-2 font-medium">{item.totalForeign?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 font-bold">₹{item.totalInr?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showItemModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold">Add IPO Item</h2>
                <button onClick={() => setShowItemModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
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
                    <label className="block text-sm text-gray-600 mb-1">Qty *</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={itemForm.orderedQty} onChange={e => setItemForm(f => ({ ...f, orderedQty: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Unit Price ({ipo.currency}) *</label>
                    <input type="number" step="0.001" className="w-full border rounded-lg px-3 py-2 text-sm" value={itemForm.unitPriceForeign} onChange={e => setItemForm(f => ({ ...f, unitPriceForeign: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Discount %</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={itemForm.discount} onChange={e => setItemForm(f => ({ ...f, discount: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">BCD Rate %</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={itemForm.bcdRate} onChange={e => setItemForm(f => ({ ...f, bcdRate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">IGST Rate %</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={itemForm.taxRate} onChange={e => setItemForm(f => ({ ...f, taxRate: e.target.value }))}>
                      {[0,5,12,18,28].map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">HSN Code</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={itemForm.hsnCode} onChange={e => setItemForm(f => ({ ...f, hsnCode: e.target.value }))} />
                  </div>
                  {preview && (
                    <div className="col-span-2 bg-blue-50 rounded-lg p-3 text-xs text-blue-800">
                      <div className="grid grid-cols-3 gap-2">
                        <div><div className="text-blue-400">Foreign</div><div className="font-bold">{ipo.currency} {preview.foreignTotal}</div></div>
                        <div><div className="text-blue-400">BCD</div><div className="font-bold">₹{preview.bcd}</div></div>
                        <div><div className="text-blue-400">IGST</div><div className="font-bold">₹{preview.igst}</div></div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-blue-200 font-bold text-sm">Total INR: ₹{parseFloat(preview.total).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowItemModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={handleAddItem} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Adding...' : 'Add Item'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
