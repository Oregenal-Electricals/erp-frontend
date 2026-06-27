'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }

const STATUS_COLORS = {
  BOOKED: 'bg-gray-100 text-gray-600',
  DEPARTED: 'bg-blue-100 text-blue-700',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-700',
  ARRIVED: 'bg-yellow-100 text-yellow-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

const MODE_COLORS = {
  SEA: 'bg-blue-100 text-blue-700',
  AIR: 'bg-sky-100 text-sky-700',
  ROAD: 'bg-orange-100 text-orange-700',
  COURIER: 'bg-purple-100 text-purple-700',
};

const MODE_ICONS = { SEA: '🚢', AIR: '✈️', ROAD: '🚛', COURIER: '📦' };
const MODES = ['SEA', 'AIR', 'ROAD', 'COURIER'];
const CONTAINER_TYPES = ['20GP', '40GP', '40HC', '20RF', '40RF'];

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState([]);
  const [stats, setStats] = useState(null);
  const [ipos, setIpos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showContainerModal, setShowContainerModal] = useState(null);
  const [form, setForm] = useState({ ipoId: '', shipmentMode: 'SEA', carrierName: '', vesselName: '', voyageNumber: '', flightNumber: '', blNumber: '', awbNumber: '', portOfLoading: '', portOfDischarge: '', etd: '', eta: '', totalPackages: '', totalWeight: '', totalVolume: '', notes: '' });
  const [containerForm, setContainerForm] = useState({ containerNumber: '', containerType: '20GP', sealNumber: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (modeFilter) params.set('shipmentMode', modeFilter);
    const [shpRes, statsRes, ipoRes] = await Promise.all([
      fetch(`${API}/shipments?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/shipments/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/import-orders?limit=200`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (shpRes.ok) { const d = await shpRes.json(); setShipments(d.data); setTotalPages(d.totalPages); setTotal(d.total); }
    if (statsRes.ok) setStats(await statsRes.json());
    if (ipoRes.ok) { const d = await ipoRes.json(); setIpos(d.data.filter(i => ['LC_OPENED','PROFORMA_RECEIVED','SHIPPED'].includes(i.status))); }
    setLoading(false);
  }, [page, search, status, modeFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { ...form };
    if (body.etd) body.etd = new Date(body.etd).toISOString();
    if (body.eta) body.eta = new Date(body.eta).toISOString();
    if (body.totalPackages) body.totalPackages = parseInt(body.totalPackages);
    if (body.totalWeight) body.totalWeight = parseFloat(body.totalWeight);
    if (body.totalVolume) body.totalVolume = parseFloat(body.totalVolume);
    ['vesselName','voyageNumber','flightNumber','blNumber','awbNumber','portOfLoading','portOfDischarge','notes'].forEach(k => { if (!body[k]) delete body[k]; });
    const res = await fetch(`${API}/shipments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleAddContainer() {
    setSaving(true); setError('');
    const res = await fetch(`${API}/shipments/${showContainerModal}/containers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(containerForm),
    });
    const data = await res.json();
    if (res.ok) { setShowContainerModal(null); fetchAll(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleAction(id, action) {
    await fetch(`${API}/shipments/${id}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchAll();
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shipment Tracking</h1>
            <p className="text-gray-500 text-sm mt-1">Track international shipments from origin to destination</p>
          </div>
          <button onClick={() => { setForm({ ipoId: '', shipmentMode: 'SEA', carrierName: '', vesselName: '', voyageNumber: '', flightNumber: '', blNumber: '', awbNumber: '', portOfLoading: '', portOfDischarge: '', etd: '', eta: '', totalPackages: '', totalWeight: '', totalVolume: '', notes: '' }); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New Shipment</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Total', value: stats.total, color: 'bg-gray-50' },
              { label: 'In Transit', value: stats.booked + stats.departed, color: 'bg-blue-50' },
              { label: 'Arrived', value: stats.arrived, color: 'bg-yellow-50' },
              { label: 'Delivered', value: stats.delivered, color: 'bg-green-50' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {stats?.byMode?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex gap-4 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 self-center">BY MODE:</span>
            {stats.byMode.map(m => (
              <div key={m.shipmentMode} className={`px-3 py-2 rounded-lg text-xs font-medium ${MODE_COLORS[m.shipmentMode]}`}>
                {MODE_ICONS[m.shipmentMode]} {m.shipmentMode}: {m._count}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b flex gap-3 flex-wrap">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" placeholder="Search SHP number, vessel, BL..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={modeFilter} onChange={e => { setModeFilter(e.target.value); setPage(1); }}>
              <option value="">All Modes</option>
              {MODES.map(m => <option key={m}>{m}</option>)}
            </select>
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} shipments</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>{['Shipment No.', 'Mode', 'IPO', 'Vendor', 'Carrier', 'Vessel/Flight', 'Port Loading', 'Port Discharge', 'ETD', 'ETA', 'Containers', 'Status', 'Actions'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={13} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : shipments.length === 0 ? (
                  <tr><td colSpan={13} className="text-center py-10 text-gray-400">No shipments found</td></tr>
                ) : shipments.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 font-mono font-medium text-blue-600 text-xs">{s.shipmentNumber}</td>
                    <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${MODE_COLORS[s.shipmentMode]}`}>{MODE_ICONS[s.shipmentMode]} {s.shipmentMode}</span></td>
                    <td className="px-3 py-3"><Link href={`/import/orders/${s.ipoId}`} className="font-mono text-xs text-blue-500 hover:underline">{s.ipo?.ipoNumber}</Link></td>
                    <td className="px-3 py-3 text-xs text-gray-700">{s.ipo?.vendor?.name}</td>
                    <td className="px-3 py-3 text-xs text-gray-600">{s.carrierName}</td>
                    <td className="px-3 py-3 text-xs text-gray-600">{s.vesselName || s.flightNumber || '—'}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{s.portOfLoading || '—'}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{s.portOfDischarge || '—'}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{s.etd ? new Date(s.etd).toLocaleDateString() : '—'}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{s.eta ? new Date(s.eta).toLocaleDateString() : '—'}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs text-gray-600">{s._count?.containers || 0}</span>
                      {s.shipmentMode === 'SEA' && !['DELIVERED','CANCELLED'].includes(s.status) && (
                        <button onClick={() => { setShowContainerModal(s.id); setContainerForm({ containerNumber: '', containerType: '20GP', sealNumber: '' }); setError(''); }} className="ml-1 text-blue-400 hover:text-blue-600 text-xs">+</button>
                      )}
                    </td>
                    <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[s.status]}`}>{s.status}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        {s.status === 'BOOKED' && <button onClick={() => handleAction(s.id, 'depart')} className="text-blue-600 hover:underline text-xs">Depart</button>}
                        {['DEPARTED','IN_TRANSIT'].includes(s.status) && <button onClick={() => handleAction(s.id, 'arrive')} className="text-yellow-600 hover:underline text-xs">Arrive</button>}
                        {s.status === 'ARRIVED' && <button onClick={() => handleAction(s.id, 'deliver')} className="text-green-600 hover:underline text-xs">Deliver</button>}
                        {!['DELIVERED','CANCELLED'].includes(s.status) && <button onClick={() => handleAction(s.id, 'cancel')} className="text-red-400 hover:underline text-xs">Cancel</button>}
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
                <h2 className="text-lg font-bold">New Shipment</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Import PO *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.ipoId} onChange={e => setForm(f => ({ ...f, ipoId: e.target.value }))}>
                      <option value="">— Select Import PO (LC Opened) —</option>
                      {ipos.map(i => <option key={i.id} value={i.id}>{i.ipoNumber} — {i.vendor?.name} ({i.status})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Shipment Mode *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.shipmentMode} onChange={e => setForm(f => ({ ...f, shipmentMode: e.target.value }))}>
                      {MODES.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Carrier Name *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="COSCO Shipping / Air China..." value={form.carrierName} onChange={e => setForm(f => ({ ...f, carrierName: e.target.value }))} />
                  </div>
                  {form.shipmentMode === 'SEA' && (
                    <>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Vessel Name</label>
                        <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.vesselName} onChange={e => setForm(f => ({ ...f, vesselName: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Voyage Number</label>
                        <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.voyageNumber} onChange={e => setForm(f => ({ ...f, voyageNumber: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">BL Number</label>
                        <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.blNumber} onChange={e => setForm(f => ({ ...f, blNumber: e.target.value }))} />
                      </div>
                    </>
                  )}
                  {form.shipmentMode === 'AIR' && (
                    <>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Flight Number</label>
                        <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.flightNumber} onChange={e => setForm(f => ({ ...f, flightNumber: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">AWB Number</label>
                        <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.awbNumber} onChange={e => setForm(f => ({ ...f, awbNumber: e.target.value }))} />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Port of Loading</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Shanghai, Shenzhen..." value={form.portOfLoading} onChange={e => setForm(f => ({ ...f, portOfLoading: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Port of Discharge</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Chennai, Mumbai..." value={form.portOfDischarge} onChange={e => setForm(f => ({ ...f, portOfDischarge: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">ETD</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.etd} onChange={e => setForm(f => ({ ...f, etd: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">ETA</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.eta} onChange={e => setForm(f => ({ ...f, eta: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Total Packages</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.totalPackages} onChange={e => setForm(f => ({ ...f, totalPackages: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Total Weight (kg)</label>
                    <input type="number" step="0.1" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.totalWeight} onChange={e => setForm(f => ({ ...f, totalWeight: e.target.value }))} />
                  </div>
                  {form.shipmentMode === 'SEA' && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Total Volume (CBM)</label>
                      <input type="number" step="0.1" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.totalVolume} onChange={e => setForm(f => ({ ...f, totalVolume: e.target.value }))} />
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Creating...' : 'Create Shipment'}</button>
              </div>
            </div>
          </div>
        )}

        {showContainerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold">Add Container</h2>
                <button onClick={() => setShowContainerModal(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Container Number *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="CSCU1234567" value={containerForm.containerNumber} onChange={e => setContainerForm(f => ({ ...f, containerNumber: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Container Type</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={containerForm.containerType} onChange={e => setContainerForm(f => ({ ...f, containerType: e.target.value }))}>
                      {CONTAINER_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Seal Number</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={containerForm.sealNumber} onChange={e => setContainerForm(f => ({ ...f, sealNumber: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowContainerModal(null)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={handleAddContainer} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Adding...' : 'Add Container'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
