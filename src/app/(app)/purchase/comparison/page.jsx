'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }

const RANK_COLORS = {
  1: 'bg-green-100 text-green-800 border-green-300',
  2: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  3: 'bg-orange-100 text-orange-800 border-orange-300',
};

const RANK_LABELS = { 1: 'L1', 2: 'L2', 3: 'L3' };

export default function QuotationComparisonPage() {
  const [rfqs, setRfqs] = useState([]);
  const [selectedRfqId, setSelectedRfqId] = useState('');
  const [matrix, setMatrix] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingSelections, setPendingSelections] = useState({});
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchRfqs = useCallback(async () => {
    const res = await fetch(`${API}/rfqs?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) { const d = await res.json(); setRfqs(d.data || []); }
  }, []);

  useEffect(() => { fetchRfqs(); }, [fetchRfqs]);

  async function loadMatrix(rfqId) {
    setLoading(true); setError(''); setMatrix(null); setSummary(null); setPendingSelections({});
    const [mRes, sRes] = await Promise.all([
      fetch(`${API}/quotation-comparison/${rfqId}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/quotation-comparison/${rfqId}/summary`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (mRes.ok) setMatrix(await mRes.json());
    else setError('Failed to load comparison matrix');
    if (sRes.ok) setSummary(await sRes.json());
    setLoading(false);
  }

  function handleSelectVendor(rfqItemId, vendor) {
    setPendingSelections(prev => ({
      ...prev,
      [rfqItemId]: {
        rfqItemId,
        selectedVendorId: vendor.vendorId,
        selectedQuotationId: vendor.quotationId,
        selectedItemId: vendor.quotationItemId,
        selectionReason: `L${vendor.rank} - ${vendor.vendorName}`,
      }
    }));
  }

  async function saveSelections() {
    const selections = Object.values(pendingSelections);
    if (selections.length === 0) return;
    setSaving(true); setError('');
    const res = await fetch(`${API}/quotation-comparison/${selectedRfqId}/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ selections }),
    });
    const data = await res.json();
    if (res.ok) {
      setSuccessMsg(data.message);
      setPendingSelections({});
      setTimeout(() => setSuccessMsg(''), 3000);
      loadMatrix(selectedRfqId);
    } else setError(data.message || 'Save failed');
    setSaving(false);
  }

  const pendingCount = Object.keys(pendingSelections).length;

  return (
    <AppLayout>
      <div className="p-6 max-w-full mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Quotation Comparison</h1>
          <p className="text-gray-500 text-sm mt-1">L1/L2/L3 analysis — compare vendor quotes side by side</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">Select RFQ</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={selectedRfqId}
              onChange={e => { setSelectedRfqId(e.target.value); if (e.target.value) loadMatrix(e.target.value); }}>
              <option value="">— Select an RFQ to compare —</option>
              {rfqs.map(r => <option key={r.id} value={r.id}>{r.rfqNumber} — {r.title} ({r.status})</option>)}
            </select>
          </div>
          {matrix && (
            <div className="text-sm text-gray-500">
              <span className="font-medium">{matrix.totalQuotations}</span> quotations ·
              <span className="font-medium ml-1">{matrix.totalItems}</span> items
            </div>
          )}
        </div>

        {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm mb-4">{error}</div>}
        {successMsg && <div className="bg-green-50 text-green-700 px-4 py-2 rounded text-sm mb-4">✅ {successMsg}</div>}

        {loading && <div className="text-center py-20 text-gray-400">Loading comparison matrix...</div>}

        {matrix && !loading && (
          <>
            {matrix.totalQuotations === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center text-yellow-700">
                No finalized quotations found for this RFQ. Finalize vendor quotations first.
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-x-auto">
                  <div className="p-4 border-b">
                    <h2 className="font-semibold text-gray-700">Price Comparison Matrix</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Green = L1 (lowest), Yellow = L2, Orange = L3. Click a price cell to select that vendor for the item.</p>
                  </div>
                  <table className="w-full text-sm min-w-max">
                    <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left sticky left-0 bg-gray-50 z-10 min-w-48">Item</th>
                        <th className="px-3 py-3 text-center">Req. Qty</th>
                        {matrix.quotations.map(q => (
                          <th key={q.id} className="px-4 py-3 text-center min-w-36">
                            <div className="font-semibold">{q.vendorName}</div>
                            <div className="text-xs font-normal text-gray-400 font-mono">{q.quotationNumber}</div>
                            <div className="text-xs font-normal text-gray-400">{q.deliveryDays}d delivery</div>
                          </th>
                        ))}
                        <th className="px-4 py-3 text-left">Selected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {matrix.matrix.map(row => {
                        const pending = pendingSelections[row.rfqItemId];
                        return (
                          <tr key={row.rfqItemId} className="hover:bg-gray-50">
                            <td className="px-4 py-3 sticky left-0 bg-white z-10">
                              <div className="font-mono text-xs text-blue-600">{row.itemCode}</div>
                              <div className="font-medium text-gray-900">{row.itemName}</div>
                            </td>
                            <td className="px-3 py-3 text-center text-gray-600">{row.requiredQty?.toLocaleString()} {row.uom}</td>
                            {matrix.quotations.map(q => {
                              const vData = row.vendors.find(v => v.quotationId === q.id);
                              const isPending = pending?.selectedQuotationId === q.id;
                              const isSelected = !pending && row.selectedQuotationId === q.id;
                              return (
                                <td key={q.id} className="px-4 py-3 text-center">
                                  {vData?.hasQuote ? (
                                    <button
                                      onClick={() => handleSelectVendor(row.rfqItemId, vData)}
                                      className={`w-full rounded-lg border px-2 py-2 transition-all ${
                                        isPending ? 'ring-2 ring-blue-500 border-blue-300 bg-blue-50' :
                                        isSelected ? 'ring-2 ring-green-500 border-green-300 bg-green-50' :
                                        vData.rank && vData.rank <= 3 ? RANK_COLORS[vData.rank] :
                                        'bg-gray-50 border-gray-200'
                                      }`}
                                    >
                                      {vData.rank && vData.rank <= 3 && (
                                        <div className="text-xs font-bold mb-0.5">{RANK_LABELS[vData.rank]}</div>
                                      )}
                                      <div className="font-bold text-gray-900">₹{vData.unitPrice?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                                      <div className="text-xs text-gray-500">Total: ₹{vData.totalPrice?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                                      {vData.discount > 0 && <div className="text-xs text-green-600">{vData.discount}% off</div>}
                                      {vData.taxRate > 0 && <div className="text-xs text-gray-400">+{vData.taxRate}% GST</div>}
                                    </button>
                                  ) : (
                                    <div className="text-gray-300 text-xs">No quote</div>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-4 py-3">
                              {pending ? (
                                <div className="text-xs text-blue-600 font-medium">
                                  {matrix.quotations.find(q => q.id === pending.selectedQuotationId)?.vendorName} (pending)
                                </div>
                              ) : row.selectedVendorId ? (
                                <div className="text-xs text-green-600 font-medium">
                                  ✓ {matrix.quotations.find(q => q.id === row.selectedQuotationId)?.vendorName}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-300">Not selected</div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {pendingCount > 0 && (
                  <div className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-xl shadow-xl p-4 flex items-center gap-4 z-50">
                    <div>
                      <div className="font-semibold">{pendingCount} item(s) selected</div>
                      <div className="text-xs text-blue-200">Click Save to confirm selections</div>
                    </div>
                    <button onClick={saveSelections} disabled={saving} className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-50 disabled:opacity-50">
                      {saving ? 'Saving...' : 'Save Selections'}
                    </button>
                  </div>
                )}

                {summary && summary.vendorSummary.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="p-4 border-b">
                      <h2 className="font-semibold text-gray-700">Selection Summary</h2>
                      <p className="text-xs text-gray-400 mt-0.5">{summary.totalSelections} items selected across {summary.vendorSummary.length} vendor(s)</p>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {summary.vendorSummary.map(vs => (
                        <div key={vs.vendorId} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="font-semibold text-gray-800">{vs.vendorName}</div>
                              <div className="text-xs text-gray-400 font-mono">{vs.vendorCode} · {vs.quotationNumber}</div>
                            </div>
                            <div className="text-xs text-gray-500">{vs.deliveryDays}d · {vs.paymentTerms || '—'}</div>
                          </div>
                          <div className="space-y-1">
                            {vs.items.map(item => (
                              <div key={item.rfqItemId} className="flex justify-between text-xs">
                                <span className="text-gray-600">{item.itemCode} — {item.itemName}</span>
                                <span className="text-gray-500">{item.requiredQty} {item.uom}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t">
                            <span className="text-xs text-green-600 font-medium">{vs.items.length} item(s) assigned to this vendor</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
