'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  RECEIVED: 'bg-blue-100 text-blue-700',
  VERIFIED: 'bg-yellow-100 text-yellow-700',
  SURRENDERED: 'bg-green-100 text-green-700',
};

const TYPE_COLORS = {
  BL: 'bg-blue-100 text-blue-700',
  AWB: 'bg-sky-100 text-sky-700',
  SEAWAY_BILL: 'bg-teal-100 text-teal-700',
};

const DOC_TYPES = ['BL', 'AWB', 'SEAWAY_BILL'];

export default function BlAwbPage() {
  const [docs, setDocs] = useState([]);
  const [stats, setStats] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [docType, setDocType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ shipmentId: '', ipoId: '', documentType: 'BL', documentNumber: '', issueDate: '', placeOfIssue: '', shipperName: '', consigneeName: '', notifyParty: '', portOfLoading: '', portOfDischarge: '', descriptionOfGoods: '', freightTerms: 'PREPAID', numberOfOriginals: 3, originalsReceived: 3, notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (docType) params.set('documentType', docType);
    const [docRes, statsRes, shpRes] = await Promise.all([
      fetch(`${API}/shipping-documents?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/shipping-documents/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/shipments?limit=200`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (docRes.ok) { const d = await docRes.json(); setDocs(d.data); setTotalPages(d.totalPages); setTotal(d.total); }
    if (statsRes.ok) setStats(await statsRes.json());
    if (shpRes.ok) { const d = await shpRes.json(); setShipments(d.data); }
    setLoading(false);
  }, [page, search, status, docType]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function handleShipmentSelect(shipmentId) {
    const ship = shipments.find(s => s.id === shipmentId);
    setForm(f => ({
      ...f, shipmentId,
      ipoId: ship?.ipoId || '',
      portOfLoading: ship?.portOfLoading || f.portOfLoading,
      portOfDischarge: ship?.portOfDischarge || f.portOfDischarge,
      documentType: ship?.shipmentMode === 'AIR' ? 'AWB' : 'BL',
    }));
  }

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { ...form, numberOfOriginals: parseInt(form.numberOfOriginals) || undefined, originalsReceived: parseInt(form.originalsReceived) || undefined };
    if (body.issueDate) body.issueDate = new Date(body.issueDate).toISOString();
    ['placeOfIssue','shipperName','consigneeName','notifyParty','descriptionOfGoods','notes'].forEach(k => { if (!body[k]) delete body[k]; });
    const res = await fetch(`${API}/shipping-documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleAction(id, action) {
    await fetch(`${API}/shipping-documents/${id}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchAll();
  }

  const selectedShipment = shipments.find(s => s.id === form.shipmentId);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">BL / AWB Management</h1>
            <p className="text-gray-500 text-sm mt-1">Bill of Lading and Airway Bill document tracking</p>
          </div>
          <button onClick={() => { setForm({ shipmentId: '', ipoId: '', documentType: 'BL', documentNumber: '', issueDate: '', placeOfIssue: '', shipperName: '', consigneeName: '', notifyParty: '', portOfLoading: '', portOfDischarge: '', descriptionOfGoods: '', freightTerms: 'PREPAID', numberOfOriginals: 3, originalsReceived: 3, notes: '' }); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ Register BL/AWB</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Documents', value: stats.total, color: 'bg-gray-50' },
              { label: 'Received', value: stats.received, color: 'bg-blue-50' },
              { label: 'Verified', value: stats.verified, color: 'bg-yellow-50' },
              { label: 'Surrendered', value: stats.surrendered, color: 'bg-green-50' },
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
            <input className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" placeholder="Search document number, shipper..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={docType} onChange={e => { setDocType(e.target.value); setPage(1); }}>
              <option value="">All Types</option>
              {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} documents</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>{['Type', 'Document No.', 'Shipment', 'Vendor', 'Shipper', 'Port Loading', 'Port Discharge', 'Freight', 'Originals', 'Issue Date', 'Status', 'Actions'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={12} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : docs.length === 0 ? (
                  <tr><td colSpan={12} className="text-center py-10 text-gray-400">No shipping documents found</td></tr>
                ) : docs.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${TYPE_COLORS[doc.documentType]}`}>{doc.documentType}</span></td>
                    <td className="px-3 py-3 font-mono font-medium text-blue-600 text-xs">{doc.documentNumber}</td>
                    <td className="px-3 py-3"><Link href={`/import/shipments`} className="font-mono text-xs text-blue-500 hover:underline">{doc.shipment?.shipmentNumber}</Link></td>
                    <td className="px-3 py-3 text-xs text-gray-700">{doc.ipo?.vendor?.name}</td>
                    <td className="px-3 py-3 text-xs text-gray-600">{doc.shipperName || '—'}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{doc.portOfLoading || '—'}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{doc.portOfDischarge || '—'}</td>
                    <td className="px-3 py-3 text-xs"><span className={doc.freightTerms === 'PREPAID' ? 'text-green-600' : 'text-orange-600'}>{doc.freightTerms}</span></td>
                    <td className="px-3 py-3 text-xs text-gray-600">{doc.originalsReceived || 0}/{doc.numberOfOriginals || 0}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : '—'}</td>
                    <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[doc.status]}`}>{doc.status}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        {doc.status === 'RECEIVED' && <button onClick={() => handleAction(doc.id, 'verify')} className="text-yellow-600 hover:underline text-xs">Verify</button>}
                        {doc.status === 'VERIFIED' && <button onClick={() => handleAction(doc.id, 'surrender')} className="text-green-600 hover:underline text-xs">Surrender</button>}
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
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold">Register BL / AWB</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Shipment *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.shipmentId} onChange={e => handleShipmentSelect(e.target.value)}>
                      <option value="">— Select Shipment —</option>
                      {shipments.map(s => <option key={s.id} value={s.id}>{s.shipmentNumber} — {s.carrierName} ({s.status})</option>)}
                    </select>
                  </div>
                  {selectedShipment && (
                    <div className="col-span-2 bg-blue-50 rounded-lg p-3 text-xs text-blue-800 grid grid-cols-3 gap-2">
                      <div><div className="text-blue-400">Mode</div><div className="font-bold">{selectedShipment.shipmentMode}</div></div>
                      <div><div className="text-blue-400">Vessel</div><div className="font-bold">{selectedShipment.vesselName || selectedShipment.flightNumber || '—'}</div></div>
                      <div><div className="text-blue-400">Carrier</div><div className="font-bold">{selectedShipment.carrierName}</div></div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Document Type *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.documentType} onChange={e => setForm(f => ({ ...f, documentType: e.target.value }))}>
                      {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Document Number *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="COSU-BL-2026-001" value={form.documentNumber} onChange={e => setForm(f => ({ ...f, documentNumber: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Issue Date</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.issueDate} onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Place of Issue</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.placeOfIssue} onChange={e => setForm(f => ({ ...f, placeOfIssue: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Shipper Name</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.shipperName} onChange={e => setForm(f => ({ ...f, shipperName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Consignee Name</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.consigneeName} onChange={e => setForm(f => ({ ...f, consigneeName: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Notify Party</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.notifyParty} onChange={e => setForm(f => ({ ...f, notifyParty: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Port of Loading</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.portOfLoading} onChange={e => setForm(f => ({ ...f, portOfLoading: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Port of Discharge</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.portOfDischarge} onChange={e => setForm(f => ({ ...f, portOfDischarge: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Freight Terms</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.freightTerms} onChange={e => setForm(f => ({ ...f, freightTerms: e.target.value }))}>
                      <option value="PREPAID">PREPAID</option>
                      <option value="COLLECT">COLLECT</option>
                    </select>
                  </div>
                  {form.documentType === 'BL' && (
                    <>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">No. of Originals</label>
                        <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.numberOfOriginals} onChange={e => setForm(f => ({ ...f, numberOfOriginals: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Originals Received</label>
                        <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.originalsReceived} onChange={e => setForm(f => ({ ...f, originalsReceived: e.target.value }))} />
                      </div>
                    </>
                  )}
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Description of Goods</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.descriptionOfGoods} onChange={e => setForm(f => ({ ...f, descriptionOfGoods: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Registering...' : 'Register'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
