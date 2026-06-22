'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() {
  if (typeof window !== 'undefined') return localStorage.getItem('accessToken');
}

const MODULES = ['BOM', 'VENDOR', 'PRODUCT', 'RAW_MATERIAL', 'ITEM', 'PRICE_LIST'];
const FIELD_TYPES = ['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'DROPDOWN'];
const MODULE_LABELS = { BOM: 'BOM Management', VENDOR: 'Vendor Master', PRODUCT: 'Product Master', RAW_MATERIAL: 'Raw Material Master', ITEM: 'Item Master', PRICE_LIST: 'Price List' };

export default function CustomFieldsSettingsPage() {
  const [allFields, setAllFields] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedModule, setSelectedModule] = useState('BOM');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editField, setEditField] = useState(null);
  const [form, setForm] = useState({ module: 'BOM', fieldKey: '', fieldLabel: '', fieldType: 'TEXT', options: '', placeholder: '', defaultValue: '', isRequired: false, sortOrder: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [allRes, statsRes] = await Promise.all([
      fetch(`${API}/custom-fields/definitions/all`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/custom-fields/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (allRes.ok) setAllFields(await allRes.json());
    if (statsRes.ok) setStats(await statsRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const moduleFields = allFields.filter(f => f.module === selectedModule);

  function openCreate() {
    setEditField(null);
    setForm({ module: selectedModule, fieldKey: '', fieldLabel: '', fieldType: 'TEXT', options: '', placeholder: '', defaultValue: '', isRequired: false, sortOrder: moduleFields.length });
    setError(''); setShowModal(true);
  }

  function openEdit(f) {
    setEditField(f);
    setForm({ module: f.module, fieldKey: f.fieldKey, fieldLabel: f.fieldLabel, fieldType: f.fieldType, options: Array.isArray(f.options) ? f.options.join(', ') : '', placeholder: f.placeholder || '', defaultValue: f.defaultValue || '', isRequired: f.isRequired, sortOrder: f.sortOrder });
    setError(''); setShowModal(true);
  }

  async function handleSave() {
    setSaving(true); setError('');
    const body = { ...form };
    if (body.fieldType === 'DROPDOWN' && body.options) {
      body.options = body.options.split(',').map(o => o.trim()).filter(Boolean);
    } else {
      delete body.options;
    }
    if (!body.placeholder) delete body.placeholder;
    if (!body.defaultValue) delete body.defaultValue;

    const url = editField ? `${API}/custom-fields/definitions/${editField.id}` : `${API}/custom-fields/definitions`;
    const method = editField ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(data.message || 'Save failed');
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Deactivate this custom field? Existing values will be preserved.')) return;
    await fetch(`${API}/custom-fields/definitions/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchAll();
  }

  const typeColors = { TEXT: 'bg-blue-100 text-blue-700', NUMBER: 'bg-green-100 text-green-700', DATE: 'bg-purple-100 text-purple-700', BOOLEAN: 'bg-yellow-100 text-yellow-700', DROPDOWN: 'bg-orange-100 text-orange-700' };

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Custom Fields</h1>
          <p className="text-gray-500 text-sm mt-1">Add custom fields to any module — no code required</p>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-800">{stats.totalFields}</div>
              <div className="text-xs text-gray-500 mt-1">Total Fields</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-800">{stats.activeFields}</div>
              <div className="text-xs text-gray-500 mt-1">Active Fields</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-800">{Object.keys(stats.byModule || {}).length}</div>
              <div className="text-xs text-gray-500 mt-1">Modules Configured</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-800">{stats.totalValues}</div>
              <div className="text-xs text-gray-500 mt-1">Values Stored</div>
            </div>
          </div>
        )}

        <div className="flex gap-6">
          <div className="w-48 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-3 border-b bg-gray-50">
                <span className="text-xs font-semibold text-gray-500 uppercase">Modules</span>
              </div>
              {MODULES.map(m => (
                <button key={m} onClick={() => setSelectedModule(m)}
                  className={`w-full text-left px-4 py-3 text-sm border-b last:border-0 flex justify-between items-center ${selectedModule === m ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                  <span>{MODULE_LABELS[m]}</span>
                  {stats?.byModule?.[m] && <span className="text-xs bg-blue-100 text-blue-600 px-1.5 rounded-full">{stats.byModule[m]}</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b flex justify-between items-center">
                <div>
                  <h2 className="font-semibold text-gray-800">{MODULE_LABELS[selectedModule]}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{moduleFields.length} custom fields defined</p>
                </div>
                <button onClick={openCreate} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium">+ Add Field</button>
              </div>

              {loading ? (
                <div className="p-10 text-center text-gray-400">Loading...</div>
              ) : moduleFields.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="text-gray-400 mb-2">No custom fields for {MODULE_LABELS[selectedModule]} yet</div>
                  <button onClick={openCreate} className="text-blue-600 hover:underline text-sm">+ Add your first custom field</button>
                </div>
              ) : (
                <div className="divide-y">
                  {moduleFields.sort((a,b) => a.sortOrder - b.sortOrder).map(field => (
                    <div key={field.id} className={`p-4 flex items-center justify-between ${!field.isActive ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-6 text-center text-gray-400 text-xs font-mono">{field.sortOrder}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800">{field.fieldLabel}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[field.fieldType] || 'bg-gray-100'}`}>{field.fieldType}</span>
                            {field.isRequired && <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600">Required</span>}
                            {!field.isActive && <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">Inactive</span>}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Key: <code className="font-mono bg-gray-100 px-1 rounded">{field.fieldKey}</code>
                            {field.placeholder && ` · Placeholder: "${field.placeholder}"`}
                            {field.fieldType === 'DROPDOWN' && Array.isArray(field.options) && ` · Options: ${field.options.join(', ')}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(field)} className="text-blue-600 hover:underline text-xs">Edit</button>
                        {field.isActive && <button onClick={() => handleDelete(field.id)} className="text-red-500 hover:underline text-xs">Deactivate</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
              <strong>How it works:</strong> Fields you add here automatically appear in the {MODULE_LABELS[selectedModule]} create/edit forms. 
              Users fill them in and values are saved per record. No code changes needed.
            </div>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-lg font-bold">{editField ? 'Edit Custom Field' : 'Add Custom Field'}</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Field Label *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Drawing Reference" value={form.fieldLabel}
                      onChange={e => {
                        const label = e.target.value;
                        const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
                        setForm(f => ({ ...f, fieldLabel: label, fieldKey: editField ? f.fieldKey : key }));
                      }} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Field Key *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="drawing_reference" value={form.fieldKey}
                      onChange={e => setForm(f => ({ ...f, fieldKey: e.target.value }))} disabled={!!editField} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Field Type</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.fieldType} onChange={e => setForm(f => ({ ...f, fieldType: e.target.value }))}>
                      {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Sort Order</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} />
                  </div>
                  {form.fieldType === 'DROPDOWN' && (
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-600 mb-1">Options (comma separated)</label>
                      <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Option 1, Option 2, Option 3" value={form.options}
                        onChange={e => setForm(f => ({ ...f, options: e.target.value }))} />
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Placeholder Text</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Hint text shown in the field" value={form.placeholder}
                      onChange={e => setForm(f => ({ ...f, placeholder: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Default Value</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.defaultValue}
                      onChange={e => setForm(f => ({ ...f, defaultValue: e.target.value }))} />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input type="checkbox" id="isRequired" checked={form.isRequired} onChange={e => setForm(f => ({ ...f, isRequired: e.target.checked }))} />
                    <label htmlFor="isRequired" className="text-sm text-gray-600">Required field</label>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                  <strong>Preview:</strong> This field will appear as a <strong>{form.fieldType}</strong> input
                  labeled <strong>"{form.fieldLabel || 'Field Label'}"</strong> in all {MODULE_LABELS[selectedModule]} forms.
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving...' : editField ? 'Update Field' : 'Add Field'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
