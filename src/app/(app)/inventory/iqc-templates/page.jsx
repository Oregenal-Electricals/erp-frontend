'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const CATEGORIES = ['Critical', 'Major', 'Minor'];
const emptyParam = (sNo) => ({ sNo, category: 'Major', parameterName: '', specification: '' });

export default function IqcTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rawMaterials, setRawMaterials] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [cloneSource, setCloneSource] = useState(null);
  const [cloneName, setCloneName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const res = await fetch(`${API}/iqc/templates?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setTemplates(await res.json());
    setLoading(false);
  }, [search]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch(`${API}/raw-materials?limit=500`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : { data: [] })
      .then(d => setRawMaterials(d.data || []))
      .catch(() => {});
  }, []);

  function openNew() {
    setForm({ name: '', docCode: '', revision: '', rawMaterialId: '', parameters: [emptyParam(1)] });
    setEditing('new');
    setError('');
  }

  async function openEdit(id) {
    const res = await fetch(`${API}/iqc/templates/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const t = await res.json();
      setForm({
        id: t.id, name: t.name, docCode: t.docCode || '', revision: t.revision || '',
        rawMaterialId: t.rawMaterialId || '',
        parameters: (t.parameters || []).map(p => ({ sNo: p.sNo, category: p.category, parameterName: p.parameterName, specification: p.specification })),
      });
      setEditing(t);
      setError('');
    }
  }

  function addParamRow() {
    setForm(f => ({ ...f, parameters: [...f.parameters, emptyParam(f.parameters.length + 1)] }));
  }
  function removeParamRow(idx) {
    setForm(f => ({ ...f, parameters: f.parameters.filter((_, i) => i !== idx).map((p, i) => ({ ...p, sNo: i + 1 })) }));
  }
  function updateParam(idx, field, value) {
    setForm(f => ({ ...f, parameters: f.parameters.map((p, i) => i === idx ? { ...p, [field]: value } : p) }));
  }

  async function save() {
    if (!form.name.trim()) { setError('Give the template a name'); return; }
    if (form.parameters.some(p => !p.parameterName.trim() || !p.specification.trim())) {
      setError('Every row needs a parameter name and a specification');
      return;
    }
    setSaving(true); setError('');
    const isNew = editing === 'new';
    const url = isNew ? `${API}/iqc/templates` : `${API}/iqc/templates/${form.id}`;
    const res = await fetch(url, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({
        name: form.name, docCode: form.docCode || undefined, revision: form.revision || undefined,
        rawMaterialId: form.rawMaterialId || undefined,
        parameters: form.parameters,
      }),
    });
    const data = await res.json();
    if (res.ok) { setEditing(null); setForm(null); load(); }
    else setError(data.message || 'Failed to save template');
    setSaving(false);
  }

  async function submitClone() {
    if (!cloneName.trim()) { setError('Give the new template a name'); return; }
    setSaving(true); setError('');
    const res = await fetch(`${API}/iqc/templates/${cloneSource.id}/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ name: cloneName }),
    });
    const data = await res.json();
    if (res.ok) { setCloneSource(null); setCloneName(''); load(); }
    else setError(data.message || 'Failed to clone template');
    setSaving(false);
  }

  if (form) {
    return (
      <AppLayout>
        <div className="p-6 max-w-5xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{editing === 'new' ? 'New Check Sheet Template' : `Edit — ${editing.name}`}</h1>
              <p className="text-gray-500 text-sm mt-1">Add or remove specifications to match this material&apos;s check sheet</p>
            </div>
            <button onClick={() => { setEditing(null); setForm(null); }} className="text-sm text-gray-500 hover:underline">Cancel</button>
          </div>
          {error && <div className="mb-4 bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}

          <div className="bg-white rounded-xl border p-5 mb-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Template Name *</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 9W Inverter Bulb Heat Sink" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Linked Raw Material (optional)</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.rawMaterialId} onChange={e => setForm(f => ({ ...f, rawMaterialId: e.target.value }))}>
                  <option value="">— Not linked —</option>
                  {rawMaterials.map(rm => <option key={rm.id} value={rm.id}>{rm.code} — {rm.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Doc Code</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.docCode} onChange={e => setForm(f => ({ ...f, docCode: e.target.value }))} placeholder="e.g. ORG/IQC/CH03-1" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Revision</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.revision} onChange={e => setForm(f => ({ ...f, revision: e.target.value }))} placeholder="e.g. 01/08.08.2022" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Parameters</h2>
              <button onClick={addParamRow} className="text-sm text-blue-600 hover:underline">+ Add Row</button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>{['S.No', 'Category', 'Parameter', 'Specification', ''].map(h => <th key={h} className="text-left px-3 py-2">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {form.parameters.map((p, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-gray-500 w-12">{p.sNo}</td>
                    <td className="px-3 py-2 w-32">
                      <select className="w-full border rounded px-2 py-1 text-sm" value={p.category} onChange={e => updateParam(idx, 'category', e.target.value)}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input className="w-full border rounded px-2 py-1 text-sm" value={p.parameterName} onChange={e => updateParam(idx, 'parameterName', e.target.value)} placeholder="e.g. Outer Dia." />
                    </td>
                    <td className="px-3 py-2">
                      <input className="w-full border rounded px-2 py-1 text-sm" value={p.specification} onChange={e => updateParam(idx, 'specification', e.target.value)} placeholder="e.g. 65±0.5MM" />
                    </td>
                    <td className="px-3 py-2 w-12">
                      {form.parameters.length > 1 && (
                        <button onClick={() => removeParamRow(idx)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button onClick={() => { setEditing(null); setForm(null); }} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
            <button onClick={save} disabled={saving} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">IQC Check Sheet Templates</h1>
            <p className="text-gray-500 text-sm mt-1">One reusable checklist per material — add or remove specifications as needed</p>
          </div>
          <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ New Template</button>
        </div>

        <div className="bg-white rounded-xl border p-3 mb-4">
          <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {error && !cloneSource && <div className="mb-4 bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}

        <div className="bg-white rounded-xl border">
          {loading ? (
            <div className="text-center py-10 text-gray-400">Loading...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No templates yet — create your first one</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>{['Name', 'Linked Material', 'Doc Code', 'Parameters', 'Action'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {templates.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{t.name}</td>
                    <td className="px-4 py-3 text-gray-600">{t.rawMaterial ? `${t.rawMaterial.code} — ${t.rawMaterial.name}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{t.docCode || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{t._count?.parameters ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button onClick={() => openEdit(t.id)} className="text-blue-600 hover:underline text-xs">Edit</button>
                        <button onClick={() => { setCloneSource(t); setCloneName(`${t.name} (copy)`); setError(''); }} className="text-gray-600 hover:underline text-xs">Use as Default Sample</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {cloneSource && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b">
                <h2 className="font-bold text-gray-800">New template from &ldquo;{cloneSource.name}&rdquo;</h2>
                <p className="text-xs text-gray-500 mt-1">Starts with the same parameters — edit the specifications that differ for the new material</p>
              </div>
              <div className="p-5">
                {error && <div className="mb-3 bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <label className="block text-xs text-gray-500 mb-1">New Template Name</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={cloneName} onChange={e => setCloneName(e.target.value)} autoFocus />
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                <button onClick={() => { setCloneSource(null); setError(''); }} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={submitClone} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Creating...' : 'Create & Edit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
