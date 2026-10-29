'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

export default function ShortageVerificationPage() {
  const [rows, setRows] = useState([]);
  const [totalPending, setTotalPending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifyModal, setVerifyModal] = useState(null); // the shortage row being verified
  const [verifiedQty, setVerifiedQty] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch(`${API}/customer-po/shortages/pending-verification`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) {
        const d = await res.json();
        setRows(d.data || []);
        setTotalPending(d.totalPending || 0);
      } else {
        // Don't let a permission error or server failure render as "queue
        // is empty" - that's actively misleading (looks like nothing to
        // do, when actually the page couldn't load anything).
        const d = await res.json().catch(() => null);
        setRows([]);
        setLoadError(d?.message || `Could not load the verification queue (${res.status})`);
      }
    } catch {
      setRows([]);
      setLoadError('Could not reach the server - check your connection and retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function openVerify(row) {
    setVerifyModal(row);
    setVerifiedQty(String(row.shortageQty));
    setReason('');
    setError('');
  }

  const qtyChanged = verifyModal && Number(verifiedQty) !== verifyModal.shortageQty;

  async function handleConfirmVerify() {
    if (!verifyModal) return;
    const qty = Number(verifiedQty);
    if (Number.isNaN(qty) || qty < 0) { setError('Enter a valid, non-negative quantity'); return; }
    if (qtyChanged && !reason.trim()) { setError('A reason is required when the confirmed quantity differs from the system-calculated shortage'); return; }

    setSaving(true); setError('');
    const res = await fetch(`${API}/customer-po/shortages/${verifyModal.id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ verifiedQty: qty, reason: qtyChanged ? reason.trim() : undefined }),
    });
    const data = await res.json();
    if (res.ok) {
      setVerifyModal(null);
      fetchAll();
    } else {
      setError(data.message || 'Failed to verify shortage');
    }
    setSaving(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shortage Verification</h1>
            <p className="text-gray-500 text-sm mt-1">
              Confirm or correct the system-calculated shortage against actual physical stock before it reaches Purchase.
            </p>
          </div>
          <div className="bg-orange-50 rounded-lg px-4 py-2 text-center">
            <div className="text-xl font-bold text-orange-700">{totalPending === null ? '—' : totalPending}</div>
            <div className="text-xs text-orange-600">Awaiting Verification</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {loading ? (
            <div className="text-center py-10 text-gray-400">Loading...</div>
          ) : loadError ? (
            <div className="text-center py-10 text-red-500">
              {loadError}
              <div className="mt-3">
                <button onClick={fetchAll} className="px-3 py-1.5 text-xs font-medium border border-red-300 text-red-600 rounded hover:bg-red-50">
                  Retry
                </button>
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-10 text-gray-400">No shortages awaiting verification — Purchase&apos;s queue is current.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  {['CPO', 'Customer', 'Item Code', 'Item Name', 'Required', 'Available', 'System Shortage', 'Raised', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-blue-600 text-xs">{row.customerPo?.cpoNumber}</td>
                    <td className="px-4 py-3 text-gray-700">{row.customerPo?.customerName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.itemCode}</td>
                    <td className="px-4 py-3">{row.itemName}</td>
                    <td className="px-4 py-3 text-gray-500">{row.requiredQty} {row.uom}</td>
                    <td className="px-4 py-3 text-gray-500">{row.availableQty} {row.uom}</td>
                    <td className="px-4 py-3 font-bold text-orange-600">{row.shortageQty} {row.uom}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openVerify(row)} className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700">
                        Verify
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {verifyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Verify Shortage</h2>
                <p className="text-xs text-gray-500 mt-1">{verifyModal.itemCode} — {verifyModal.itemName}</p>
              </div>
              <button onClick={() => setVerifyModal(null)} className="text-gray-400 text-xl leading-none">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded p-3">
                  <div className="text-xs text-gray-400">Required</div>
                  <div className="font-medium">{verifyModal.requiredQty} {verifyModal.uom}</div>
                </div>
                <div className="bg-gray-50 rounded p-3">
                  <div className="text-xs text-gray-400">Available (system)</div>
                  <div className="font-medium">{verifyModal.availableQty} {verifyModal.uom}</div>
                </div>
              </div>

              <div className="bg-orange-50 rounded p-3">
                <div className="text-xs text-orange-600">System-calculated shortage</div>
                <div className="font-bold text-orange-700">{verifyModal.shortageQty} {verifyModal.uom}</div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Confirmed shortage quantity *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={verifiedQty}
                    onChange={e => setVerifiedQty(e.target.value)}
                  />
                  <span className="text-sm text-gray-500 w-14">{verifyModal.uom}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Leave as-is to confirm the system figure is accurate, or correct it to the real physical shortage.
                </p>
              </div>

              {qtyChanged && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Reason for correction * <span className="text-gray-400 font-normal">(why wasn&apos;t system stock already correct?)</span>
                  </label>
                  <textarea
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    rows={3}
                    placeholder="e.g. Found 15 more units on the mezzanine rack not yet entered in the system"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setVerifyModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleConfirmVerify} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
                {saving ? 'Saving...' : qtyChanged ? 'Confirm Corrected Quantity' : 'Confirm as Accurate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
