'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const TABS = [
  { key: 'gate-types', label: 'Gate Types', fields: ['code', 'name', 'description'] },
  { key: 'gates', label: 'Gates', fields: ['code', 'name'], extra: true },
  { key: 'parking-areas', label: 'Parking Areas', fields: ['code', 'name', 'areaType'], extra: true },
  { key: 'parking-slots', label: 'Parking Slots', fields: ['slotCode', 'vehicleType'], extra: true },
  { key: 'visit-purposes', label: 'Visit Purposes', fields: ['code', 'name'] },
  { key: 'pass-types', label: 'Gate Pass Types', fields: ['code', 'name', 'mapsToType'] },
  { key: 'security-reasons', label: 'Security Reasons', fields: ['code', 'name', 'category'] },
];

export default function GateMastersPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].key);
  const [items, setItems] = useState([]);
  const [plants, setPlants] = useState([]);
  const [parkingAreas, setParkingAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const tab = TABS.find(t => t.key === activeTab);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await fetch(`${API}/gate-masters/${activeTab}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setItems(await res.json());
    else setItems([]);
    setLoading(false);
  }, [activeTab]);

  useEffect(() => { load(); setForm({}); }, [load]);

  useEffect(() => {
    fetch(`${API}/masters/plants?limit=50`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : { data: [] }).then(d => setPlants(d.data || d || []));
  }, []);

  useEffect(() => {
    if (activeTab !== 'parking-slots') return;
    fetch(`${API}/gate-masters/parking-areas`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : []).then(setParkingAreas);
  }, [activeTab]);

  async function save() {
    setSaving(true); setError('');
    const res = await fetch(`${API}/gate-masters/${activeTab}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) { setForm({}); load(); }
    else setError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed to save');
    setSaving(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Main Gate Masters</h1>
          <p className="text-gray-500 text-sm mt-1">Gate types, gates, parking, visit purposes, pass types, and security reasons</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-4 border-b">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-3 py-2 text-sm border-b-2 -mb-px ${activeTab === t.key ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">New {tab.label.replace(/s$/, '')}</h2>
          {error && <div className="mb-3 p-2 bg-red-50 text-red-600 rounded text-sm">{error}</div>}
          <div className="grid grid-cols-3 gap-3">
            {activeTab === 'gates' && (
              <select className="border rounded-lg px-3 py-2 text-sm" value={form.plantId || ''} onChange={e => setForm(f => ({ ...f, plantId: e.target.value }))}>
                <option value="">— Plant —</option>
                {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            {activeTab === 'parking-areas' && (
              <select className="border rounded-lg px-3 py-2 text-sm" value={form.plantId || ''} onChange={e => setForm(f => ({ ...f, plantId: e.target.value }))}>
                <option value="">— Plant —</option>
                {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            {activeTab === 'parking-slots' && (
              <select className="border rounded-lg px-3 py-2 text-sm" value={form.parkingAreaId || ''} onChange={e => setForm(f => ({ ...f, parkingAreaId: e.target.value }))}>
                <option value="">— Parking Area —</option>
                {parkingAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}
            {tab.fields.map(field => (
              <input key={field} placeholder={field.replace(/([A-Z])/g, ' $1').trim()}
                className="border rounded-lg px-3 py-2 text-sm"
                value={form[field] || ''}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
            ))}
            {activeTab === 'parking-areas' && (
              <input type="number" min="0" placeholder="Total Slots" className="border rounded-lg px-3 py-2 text-sm"
                value={form.totalSlots || ''} onChange={e => setForm(f => ({ ...f, totalSlots: parseInt(e.target.value) || 0 }))} />
            )}
          </div>
          <button onClick={save} disabled={saving} className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Add'}
          </button>
        </div>

        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b font-semibold text-gray-800">{tab.label}</div>
          {loading ? (
            <div className="text-center py-10 text-gray-400 text-sm">Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No {tab.label.toLowerCase()} yet</div>
          ) : (
            <div className="divide-y">
              {items.map(item => (
                <div key={item.id} className="p-4 flex items-center justify-between text-sm">
                  <span>
                    <span className="font-mono text-xs text-gray-400 mr-2">{item.code || item.slotCode}</span>
                    <span className="font-medium text-gray-800">{item.name || item.slotCode}</span>
                    {item.areaType && <span className="ml-2 text-gray-500">({item.areaType})</span>}
                    {item.mapsToType && <span className="ml-2 text-gray-500">→ {item.mapsToType}</span>}
                    {item.gateType?.name && <span className="ml-2 text-gray-500">({item.gateType.name})</span>}
                    {item.plant?.name && <span className="ml-2 text-gray-400">— {item.plant.name}</span>}
                  </span>
                  <span className="text-xs text-gray-400">{item.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
