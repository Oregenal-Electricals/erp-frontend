'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const BIN_STATUS_COLORS = {
  EMPTY: 'bg-green-100 text-green-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  FULL: 'bg-red-100 text-red-600',
  RESERVED: 'bg-blue-100 text-blue-700',
  BLOCKED: 'bg-gray-200 text-gray-500',
};

export default function RackBinPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWh, setSelectedWh] = useState('');
  const [stats, setStats] = useState(null);
  const [zones, setZones] = useState([]);
  const [racks, setRacks] = useState([]);
  const [bins, setBins] = useState([]);
  const [selectedRack, setSelectedRack] = useState(null);
  const [tab, setTab] = useState('zones');
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showRackModal, setShowRackModal] = useState(false);
  const [showBinModal, setShowBinModal] = useState(false);
  const [zoneForm, setZoneForm] = useState({ code: '', name: '', description: '' });
  const [rackForm, setRackForm] = useState({ zoneId: '', code: '', name: '', description: '' });
  const [binForm, setBinForm] = useState({ rackId: '', prefix: '', count: 10, maxQty: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/warehouses?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json()).then(d => { const list = d.data || d; setWarehouses(list); if (list[0]) setSelectedWh(list[0].id); });
  }, []);

  const fetchWarehouseData = useCallback(async () => {
    if (!selectedWh) return;
    const [statsRes, zonesRes, racksRes] = await Promise.all([
      fetch(`${API}/rack-bin/stats/${selectedWh}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/rack-bin/zones/${selectedWh}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/rack-bin/racks/${selectedWh}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (statsRes.ok) setStats(await statsRes.json());
    if (zonesRes.ok) setZones(await zonesRes.json());
    if (racksRes.ok) setRacks(await racksRes.json());
  }, [selectedWh]);

  useEffect(() => { fetchWarehouseData(); }, [fetchWarehouseData]);

  async function handleSelectRack(rack) {
    setSelectedRack(rack);
    const res = await fetch(`${API}/rack-bin/bins/rack/${rack.id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setBins(await res.json());
  }

  async function handleCreateZone() {
    setSaving(true); setError('');
    const res = await fetch(`${API}/rack-bin/zones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ ...zoneForm, warehouseId: selectedWh }),
    });
    const data = await res.json();
    if (res.ok) { setShowZoneModal(false); fetchWarehouseData(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleCreateRack() {
    setSaving(true); setError('');
    const body = { ...rackForm, warehouseId: selectedWh };
    if (!body.zoneId) delete body.zoneId;
    const res = await fetch(`${API}/rack-bin/racks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowRackModal(false); fetchWarehouseData(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleBulkCreateBins() {
    setSaving(true); setError('');
    const res = await fetch(`${API}/rack-bin/bins/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ warehouseId: selectedWh, rackId: binForm.rackId, count: parseInt(binForm.count), prefix: binForm.prefix, maxQty: parseFloat(binForm.maxQty) || undefined }),
    });
    const data = await res.json();
    if (res.ok) { setShowBinModal(false); if (selectedRack?.id === binForm.rackId) handleSelectRack(selectedRack); fetchWarehouseData(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  const selectedWhObj = warehouses.find(w => w.id === selectedWh);
  const utilColor = stats?.utilization > 80 ? 'text-red-600' : stats?.utilization > 50 ? 'text-yellow-600' : 'text-green-600';

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rack & Bin Management</h1>
            <p className="text-gray-500 text-sm mt-1">Manage warehouse zones, racks and storage bins</p>
          </div>
          <select className="border rounded-lg px-3 py-2 text-sm" value={selectedWh} onChange={e => setSelectedWh(e.target.value)}>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Zones', value: stats.totalZones, color: 'bg-blue-50' },
              { label: 'Racks', value: stats.totalRacks, color: 'bg-purple-50' },
              { label: 'Total Bins', value: stats.totalBins, color: 'bg-gray-50' },
              { label: 'Utilization', value: `${stats.utilization}%`, color: 'bg-green-50', valueColor: utilColor },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                <div className={`text-xl font-bold ${s.valueColor || 'text-gray-800'}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {stats && (
          <div className="bg-white rounded-xl border p-4 mb-6">
            <div className="text-xs font-semibold text-gray-500 mb-2">BIN STATUS OVERVIEW</div>
            <div className="flex gap-4 text-xs">
              <span className="text-green-600">Empty: <strong>{stats.emptyBins}</strong></span>
              <span className="text-yellow-600">Partial: <strong>{stats.partialBins}</strong></span>
              <span className="text-red-600">Full: <strong>{stats.fullBins}</strong></span>
            </div>
            {stats.totalBins > 0 && (
              <div className="mt-2 bg-gray-100 rounded-full h-3 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 to-red-400 rounded-full" style={{ width: `${stats.utilization}%` }}></div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-4">
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b flex justify-between items-center">
                <div className="flex gap-2">
                  {['zones', 'racks'].map(t => (
                    <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 text-xs rounded font-medium capitalize ${tab===t ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>{t}</button>
                  ))}
                </div>
                <button onClick={() => { if (tab==='zones') { setZoneForm({ code:'', name:'', description:'' }); setError(''); setShowZoneModal(true); } else { setRackForm({ zoneId:'', code:'', name:'', description:'' }); setError(''); setShowRackModal(true); } }} className="text-xs text-blue-600 hover:underline">+ Add</button>
              </div>
              <div className="divide-y max-h-96 overflow-y-auto">
                {tab === 'zones' ? zones.map(z => (
                  <div key={z.id} className="p-3 hover:bg-gray-50">
                    <div className="flex justify-between">
                      <span className="font-mono text-sm font-bold text-blue-600">{z.code}</span>
                      <span className="text-xs text-gray-400">{z._count?.racks} racks</span>
                    </div>
                    <div className="text-xs text-gray-600">{z.name}</div>
                  </div>
                )) : racks.map(r => (
                  <div key={r.id} onClick={() => handleSelectRack(r)} className={`p-3 cursor-pointer hover:bg-blue-50 ${selectedRack?.id === r.id ? 'bg-blue-50 border-l-2 border-blue-600' : ''}`}>
                    <div className="flex justify-between">
                      <span className="font-mono text-sm font-bold text-blue-600">{r.code}</span>
                      <span className="text-xs text-gray-400">{r._count?.bins || r.totalBins} bins</span>
                    </div>
                    <div className="text-xs text-gray-600">{r.name}</div>
                    {r.zone && <div className="text-xs text-gray-400 mt-1">Zone: {r.zone.code}</div>}
                  </div>
                ))}
                {tab === 'zones' && zones.length === 0 && <div className="p-4 text-xs text-gray-400 text-center">No zones yet</div>}
                {tab === 'racks' && racks.length === 0 && <div className="p-4 text-xs text-gray-400 text-center">No racks yet</div>}
              </div>
            </div>
          </div>

          <div className="flex-1">
            {selectedRack ? (
              <div className="bg-white rounded-xl border shadow-sm">
                <div className="p-4 border-b flex justify-between items-center">
                  <div>
                    <span className="font-mono font-bold text-blue-600">{selectedRack.code}</span>
                    <span className="ml-2 text-sm text-gray-600">{selectedRack.name}</span>
                    <span className="ml-2 text-xs text-gray-400">{bins.length} bins</span>
                  </div>
                  <button onClick={() => { setBinForm({ rackId: selectedRack.id, prefix: selectedRack.code+'-01', count: 5, maxQty: '' }); setError(''); setShowBinModal(true); }} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">+ Add Bins</button>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                    {bins.map(bin => (
                      <div key={bin.id} className={`p-2 rounded-lg border text-center ${BIN_STATUS_COLORS[bin.status]} border-current border-opacity-30`}>
                        <div className="font-mono text-xs font-bold">{bin.code}</div>
                        <div className="text-xs mt-1">{bin.status}</div>
                        {bin.itemCode && <div className="text-xs opacity-70 truncate">{bin.itemCode}</div>}
                        {bin.currentQty > 0 && <div className="text-xs font-medium">{bin.currentQty}</div>}
                      </div>
                    ))}
                    {bins.length === 0 && <div className="col-span-6 py-8 text-center text-gray-400 text-sm">No bins in this rack. Add bins to get started.</div>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center h-64">
                <div className="text-center text-gray-400">
                  <div className="text-4xl mb-2">📦</div>
                  <div className="text-sm">Select a rack to view bins</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {showZoneModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold">New Zone — {selectedWhObj?.name}</h2>
                <button onClick={() => setShowZoneModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Zone Code *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase" placeholder="RM, FG, QC..." value={zoneForm.code} onChange={e => setZoneForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Zone Name *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Raw Material Zone" value={zoneForm.name} onChange={e => setZoneForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Description</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={zoneForm.description} onChange={e => setZoneForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowZoneModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreateZone} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Creating...' : 'Create Zone'}</button>
              </div>
            </div>
          </div>
        )}

        {showRackModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold">New Rack — {selectedWhObj?.name}</h2>
                <button onClick={() => setShowRackModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Zone (optional)</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={rackForm.zoneId} onChange={e => setRackForm(f => ({ ...f, zoneId: e.target.value }))}>
                      <option value="">— No Zone —</option>
                      {zones.map(z => <option key={z.id} value={z.id}>{z.code} — {z.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Rack Code *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="RACK-B" value={rackForm.code} onChange={e => setRackForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Rack Name *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Rack B" value={rackForm.name} onChange={e => setRackForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowRackModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreateRack} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Creating...' : 'Create Rack'}</button>
              </div>
            </div>
          </div>
        )}

        {showBinModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold">Add Bins — {selectedRack?.name}</h2>
                <button onClick={() => setShowBinModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                  Bins will be created as: <strong>{binForm.prefix}-01</strong>, <strong>{binForm.prefix}-02</strong>, ...
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Bin Prefix *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="A-01" value={binForm.prefix} onChange={e => setBinForm(f => ({ ...f, prefix: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Number of Bins *</label>
                    <input type="number" min="1" max="100" className="w-full border rounded-lg px-3 py-2 text-sm" value={binForm.count} onChange={e => setBinForm(f => ({ ...f, count: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Max Qty per Bin</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Leave empty for unlimited" value={binForm.maxQty} onChange={e => setBinForm(f => ({ ...f, maxQty: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowBinModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleBulkCreateBins} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Creating...' : `Create ${binForm.count} Bins`}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
