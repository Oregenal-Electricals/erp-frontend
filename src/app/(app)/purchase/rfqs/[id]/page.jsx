'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-100 text-blue-700',
  CLOSED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

export default function RfqDetailPage() {
  const { id } = useParams();
  const [rfq, setRfq] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchRfq = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/rfqs/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setRfq(await res.json());
    setLoading(false);
  }, [id]);

  const fetchVendors = useCallback(async () => {
    const res = await fetch(`${API}/vendors?limit=200&isActive=true`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) { const d = await res.json(); setVendors(d.data || []); }
  }, []);

  useEffect(() => { fetchRfq(); fetchVendors(); }, [fetchRfq, fetchVendors]);

  async function handleAction(action) {
    if (!confirm(`${action} this RFQ?`)) return;
    const res = await fetch(`${API}/rfqs/${id}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    const data = await res.json();
    if (res.ok) fetchRfq();
    else setError(data.message || 'Action failed');
  }

  async function handleAddVendor() {
    if (!selectedVendorId) return;
    setSaving(true);
    const res = await fetch(`${API}/rfqs/${id}/vendors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ vendorId: selectedVendorId }),
    });
    const data = await res.json();
    if (res.ok) { setShowVendorModal(false); setSelectedVendorId(''); fetchRfq(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleRemoveVendor(vendorId) {
    if (!confirm('Remove this vendor from RFQ?')) return;
    await fetch(`${API}/rfqs/${id}/vendors/${vendorId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchRfq();
  }

  if (loading) return <AppLayout><div className="p-6 text-gray-400">Loading...</div></AppLayout>;
  if (!rfq) return <AppLayout><div className="p-6 text-red-500">RFQ not found</div></AppLayout>;

  const isDraft = rfq.status === 'DRAFT';
  const existingVendorIds = rfq.vendors?.map(v => v.vendorId) || [];
  const availableVendors = vendors.filter(v => !existingVendorIds.includes(v.id));

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/purchase/rfqs" className="text-gray-400 hover:text-gray-600 text-sm">← RFQs</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-bold text-gray-900">{rfq.rfqNumber}</h1>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[rfq.status]}`}>{rfq.status}</span>
        </div>
        <p className="text-gray-600 text-sm mb-1">{rfq.title}</p>
        <p className="text-gray-400 text-xs mb-6">PR Ref: <span className="font-mono">{rfq.pr?.prNumber}</span></p>

        {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm mb-4">{error}</div>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Response Deadline', value: rfq.responseDeadline ? new Date(rfq.responseDeadline).toLocaleDateString() : '—' },
            { label: 'Payment Terms', value: rfq.paymentTerms || '—' },
            { label: 'Delivery Location', value: rfq.deliveryLocation || '—' },
            { label: 'Vendors Invited', value: rfq.vendors?.length || 0 },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-lg border p-4">
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="text-base font-bold text-gray-800 mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          {isDraft && rfq.vendors?.length > 0 && rfq.items?.length > 0 && (
            <button onClick={() => handleAction('send')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Send to Vendors</button>
          )}
          {rfq.status === 'SENT' && (
            <button onClick={() => handleAction('close')} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">Close RFQ</button>
          )}
          {['DRAFT','SENT'].includes(rfq.status) && (
            <button onClick={() => handleAction('cancel')} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600">Cancel</button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-semibold text-gray-700">Vendors ({rfq.vendors?.length || 0})</h2>
              {isDraft && availableVendors.length > 0 && (
                <button onClick={() => setShowVendorModal(true)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs">+ Add Vendor</button>
              )}
            </div>
            <div className="divide-y">
              {!rfq.vendors?.length ? (
                <div className="p-6 text-center text-gray-400 text-sm">No vendors added yet</div>
              ) : rfq.vendors.map(rv => (
                <div key={rv.id} className="p-4 flex justify-between items-center">
                  <div>
                    <div className="font-medium text-gray-800">{rv.vendor?.name}</div>
                    <div className="text-xs text-gray-500 font-mono">{rv.vendor?.code}</div>
                    {rv.vendor?.email && <div className="text-xs text-gray-400">{rv.vendor.email}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${rv.status === 'QUOTED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{rv.status}</span>
                    {isDraft && <button onClick={() => handleRemoveVendor(rv.vendorId)} className="text-red-400 hover:text-red-600 text-xs">✕</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-700">RFQ Items ({rfq.items?.length || 0})</h2>
              <p className="text-xs text-gray-400 mt-0.5">Auto-populated from PR items</p>
            </div>
            <div className="divide-y">
              {!rfq.items?.length ? (
                <div className="p-6 text-center text-gray-400 text-sm">No items</div>
              ) : rfq.items.map(item => (
                <div key={item.id} className="p-4">
                  <div className="flex justify-between">
                    <div>
                      <span className="font-mono text-xs text-blue-600">{item.itemCode}</span>
                      <div className="font-medium text-gray-800">{item.itemName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-800">{item.requiredQty?.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">{item.uom}</div>
                    </div>
                  </div>
                  {item.notes && <div className="text-xs text-gray-500 mt-1">{item.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {showVendorModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold">Add Vendor to RFQ</h2>
                <button onClick={() => setShowVendorModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6">
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={selectedVendorId} onChange={e => setSelectedVendorId(e.target.value)}>
                  <option value="">— Select Vendor —</option>
                  {availableVendors.map(v => <option key={v.id} value={v.id}>{v.code} — {v.name}</option>)}
                </select>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowVendorModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleAddVendor} disabled={saving || !selectedVendorId} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Adding...' : 'Add Vendor'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
