'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { Plus, ChevronRight, ChevronDown } from 'lucide-react';

export default function WarehouseDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [wh, setWh]           = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [saving, setSaving]   = useState('');
  const [expandedZone, setExpandedZone] = useState(null);
  const [expandedRack, setExpandedRack] = useState(null);

  // Forms
  const [zoneForm, setZoneForm] = useState({ code: '', name: '', temperature: 'AMBIENT', isHazmat: false });
  const [rackForm, setRackForm] = useState({ zoneId: '', code: '', name: '', maxWeight: '' });
  const [binForm,  setBinForm]  = useState({ rackId: '', code: '', name: '', binType: 'STORAGE', maxQty: '' });

  const fetchWh = async () => {
    setLoading(true);
    try { const { data } = await api.get(`/warehouses/${id}`); setWh(data); }
    catch (err) { setError('Failed to load warehouse'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchWh(); }, [id]);

  const addZone = async () => {
    if (!zoneForm.code || !zoneForm.name) { setError('Zone code and name required'); return; }
    setSaving('zone'); setError('');
    try {
      await api.post('/warehouses/zones', { ...zoneForm, warehouseId: id });
      setZoneForm({ code: '', name: '', temperature: 'AMBIENT', isHazmat: false });
      fetchWh();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setSaving(''); }
  };

  const addRack = async (zoneId) => {
    if (!rackForm.code || !rackForm.name) { setError('Rack code and name required'); return; }
    setSaving('rack'); setError('');
    try {
      const payload = { ...rackForm, zoneId };
      if (payload.maxWeight) payload.maxWeight = parseFloat(payload.maxWeight); else delete payload.maxWeight;
      await api.post('/warehouses/racks', payload);
      setRackForm({ zoneId: '', code: '', name: '', maxWeight: '' });
      fetchWh();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setSaving(''); }
  };

  const addBin = async (rackId) => {
    if (!binForm.code || !binForm.name) { setError('Bin code and name required'); return; }
    setSaving('bin'); setError('');
    try {
      const payload = { ...binForm, rackId };
      if (payload.maxQty) payload.maxQty = parseFloat(payload.maxQty); else delete payload.maxQty;
      await api.post('/warehouses/bins', payload);
      setBinForm({ rackId: '', code: '', name: '', binType: 'STORAGE', maxQty: '' });
      fetchWh();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setSaving(''); }
  };

  const inputSm = "border-2 border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500";

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div></AppLayout>;

  return (
    <AppLayout>
      <PageHeader
        title={wh?.code}
        subtitle={`${wh?.name} · ${wh?.type?.replace(/_/g, ' ')} · ${wh?.plant?.name}`}
        action={<button onClick={() => router.push('/inventory/warehouses')} className="border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">← Back</button>}
      />

      {error && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm">{error}</div>}

      <div className="grid grid-cols-3 gap-6">
        {/* Zone/Rack/Bin Tree */}
        <div className="col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700">Storage Locations</h3>
            <span className="text-xs text-gray-400">{wh?.zones?.length || 0} zones</span>
          </div>

          {wh?.zones?.map((zone) => (
            <div key={zone.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Zone Header */}
              <button onClick={() => setExpandedZone(expandedZone === zone.id ? null : zone.id)}
                className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors">
                <div className="flex items-center gap-3">
                  {expandedZone === zone.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span className="font-mono font-bold text-blue-700 text-sm">{zone.code}</span>
                  <span className="text-sm text-gray-700">{zone.name}</span>
                  {zone.temperature && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">{zone.temperature}</span>}
                  {zone.isHazmat && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">HAZMAT</span>}
                </div>
                <span className="text-xs text-gray-400">{zone._count?.racks || 0} racks</span>
              </button>

              {expandedZone === zone.id && (
                <div className="p-4 space-y-3">
                  {zone.racks?.map((rack) => (
                    <div key={rack.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button onClick={() => setExpandedRack(expandedRack === rack.id ? null : rack.id)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-2">
                          {expandedRack === rack.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          <span className="font-mono font-bold text-purple-600 text-xs">{rack.code}</span>
                          <span className="text-xs text-gray-700">{rack.name}</span>
                          {rack.maxWeight && <span className="text-xs text-gray-400">max {rack.maxWeight}kg</span>}
                        </div>
                        <span className="text-xs text-gray-400">{rack._count?.bins || 0} bins</span>
                      </button>

                      {expandedRack === rack.id && (
                        <div className="p-3">
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            {rack.bins?.map((bin) => (
                              <div key={bin.id} className={`p-2 rounded-lg border text-center ${bin.binType === 'STORAGE' ? 'bg-green-50 border-green-200' : bin.binType === 'QUARANTINE' ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
                                <p className="font-mono font-bold text-xs text-gray-800">{bin.code}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{bin.binType}</p>
                                {bin.maxQty && <p className="text-xs text-gray-400">max {bin.maxQty}</p>}
                              </div>
                            ))}
                          </div>
                          {/* Add Bin */}
                          <div className="flex gap-2 pt-2 border-t border-gray-100">
                            <input type="text" placeholder="Code" value={binForm.rackId === rack.id ? binForm.code : ''}
                              onChange={(e) => setBinForm(p => ({ ...p, code: e.target.value, rackId: rack.id }))}
                              style={{ color: '#111827', backgroundColor: '#ffffff' }} className={`w-20 ${inputSm}`} />
                            <input type="text" placeholder="Name" value={binForm.rackId === rack.id ? binForm.name : ''}
                              onChange={(e) => setBinForm(p => ({ ...p, name: e.target.value, rackId: rack.id }))}
                              style={{ color: '#111827', backgroundColor: '#ffffff' }} className={`flex-1 ${inputSm}`} />
                            <select value={binForm.rackId === rack.id ? binForm.binType : 'STORAGE'}
                              onChange={(e) => setBinForm(p => ({ ...p, binType: e.target.value, rackId: rack.id }))}
                              style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputSm}>
                              {['STORAGE','STAGING','QUARANTINE','REJECTION'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <button onClick={() => addBin(rack.id)} disabled={saving === 'bin'}
                              className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50">
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add Rack */}
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <input type="text" placeholder="Rack Code" value={rackForm.zoneId === zone.id ? rackForm.code : ''}
                      onChange={(e) => setRackForm(p => ({ ...p, code: e.target.value, zoneId: zone.id }))}
                      style={{ color: '#111827', backgroundColor: '#ffffff' }} className={`w-28 ${inputSm}`} />
                    <input type="text" placeholder="Rack Name" value={rackForm.zoneId === zone.id ? rackForm.name : ''}
                      onChange={(e) => setRackForm(p => ({ ...p, name: e.target.value, zoneId: zone.id }))}
                      style={{ color: '#111827', backgroundColor: '#ffffff' }} className={`flex-1 ${inputSm}`} />
                    <input type="number" placeholder="Max kg" value={rackForm.zoneId === zone.id ? rackForm.maxWeight : ''}
                      onChange={(e) => setRackForm(p => ({ ...p, maxWeight: e.target.value, zoneId: zone.id }))}
                      style={{ color: '#111827', backgroundColor: '#ffffff' }} className={`w-20 ${inputSm}`} />
                    <button onClick={() => addRack(zone.id)} disabled={saving === 'rack'}
                      className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-700 disabled:opacity-50">
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add Zone */}
          <div className="bg-white rounded-xl border-2 border-dashed border-blue-300 p-4">
            <h4 className="text-xs font-bold text-gray-600 mb-3">Add Zone</h4>
            <div className="flex gap-2">
              <input type="text" placeholder="Code (ZONE-A)" value={zoneForm.code}
                onChange={(e) => setZoneForm(p => ({ ...p, code: e.target.value }))}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={`w-28 ${inputSm}`} />
              <input type="text" placeholder="Name" value={zoneForm.name}
                onChange={(e) => setZoneForm(p => ({ ...p, name: e.target.value }))}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={`flex-1 ${inputSm}`} />
              <select value={zoneForm.temperature}
                onChange={(e) => setZoneForm(p => ({ ...p, temperature: e.target.value }))}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputSm}>
                {['AMBIENT','COLD','FROZEN'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button onClick={addZone} disabled={saving === 'zone'}
                className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50">
                <Plus size={12} /> {saving === 'zone' ? '...' : 'Add'}
              </button>
            </div>
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 h-fit">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Warehouse Info</h3>
          <dl className="space-y-3">
            <div><dt className="text-xs text-gray-400">Code</dt><dd className="text-sm font-mono font-bold text-blue-600 mt-0.5">{wh?.code}</dd></div>
            <div><dt className="text-xs text-gray-400">Type</dt><dd className="text-sm text-gray-800 mt-0.5">{wh?.type?.replace(/_/g, ' ')}</dd></div>
            <div><dt className="text-xs text-gray-400">Plant</dt><dd className="text-sm text-gray-800 mt-0.5">{wh?.plant?.name}</dd></div>
            {wh?.capacity && <div><dt className="text-xs text-gray-400">Capacity</dt><dd className="text-sm text-gray-800 mt-0.5">{wh.capacity} sq.ft</dd></div>}
            {wh?.address && <div><dt className="text-xs text-gray-400">Address</dt><dd className="text-sm text-gray-600 mt-0.5">{wh.address}</dd></div>}
            <div><dt className="text-xs text-gray-400">Default</dt><dd className="mt-0.5">{wh?.isDefault ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Yes</span> : <span className="text-xs text-gray-400">No</span>}</dd></div>
            <div className="pt-3 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-blue-50 rounded-lg p-2"><p className="text-lg font-bold text-blue-600">{wh?.zones?.length || 0}</p><p className="text-xs text-gray-500">Zones</p></div>
                <div className="bg-purple-50 rounded-lg p-2"><p className="text-lg font-bold text-purple-600">{wh?.zones?.reduce((a, z) => a + (z.racks?.length || 0), 0)}</p><p className="text-xs text-gray-500">Racks</p></div>
              </div>
            </div>
          </dl>
        </div>
      </div>
    </AppLayout>
  );
}
