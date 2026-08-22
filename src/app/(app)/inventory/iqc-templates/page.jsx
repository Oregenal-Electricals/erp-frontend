'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const CATEGORIES = ['Critical', 'Major', 'Minor'];
const CATEGORY_COLORS = {
  Critical: 'text-red-700',
  Major: 'text-amber-700',
  Minor: 'text-gray-600',
};
const emptyParam = (sNo) => ({ sNo, category: 'Major', parameterName: '', specification: '' });

export default function IqcTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [cloneSource, setCloneSource] = useState(null);
  const [cloneName, setCloneName] = useState('');

  const [materialSuggestions, setMaterialSuggestions] = useState([]);
  const [showMaterialSuggestions, setShowMaterialSuggestions] = useState(false);

  const [importPreview, setImportPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

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
    if (!form?.name || form.name.length < 2) { setMaterialSuggestions([]); return; }
    const t = setTimeout(() => {
      fetch(`${API}/raw-materials?search=${encodeURIComponent(form.name)}&limit=8`, { headers: { Authorization: `Bearer ${getToken()}` } })
        .then(r => r.ok ? r.json() : { data: [] })
        .then(d => setMaterialSuggestions(d.data || []))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [form]);

  function openNew() {
    setForm({ name: '', parameters: [emptyParam(1), emptyParam(2), emptyParam(3)] });
    setEditing('new');
    setError('');
  }

  async function openEdit(id) {
    const res = await fetch(`${API}/iqc/templates/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const t = await res.json();
      setForm({
        id: t.id, name: t.name,
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
        name: form.name,
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

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setImportResult(null);
    const formData = new FormData();
    formData.append('file', file);
    setImporting(true);
    const res = await fetch(`${API}/iqc/templates/import/parse`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    const data = await res.json();
    setImporting(false);
    if (res.ok) setImportPreview(data);
    else setError(data.message || 'Failed to parse the file');
    e.target.value = '';
  }

  async function confirmBulkImport() {
    setImporting(true); setError('');
    const res = await fetch(`${API}/iqc/templates/import/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ templates: importPreview }),
    });
    const data = await res.json();
    setImporting(false);
    if (res.ok) { setImportResult(data); setImportPreview(null); load(); }
    else setError(data.message || 'Import failed');
  }

  if (form) {
    return (
      <AppLayout>
        <div className="p-6 max-w-6xl mx-auto">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">
              {editing === 'new' ? 'New Check Sheet Template' : `Edit — ${editing.name}`}
              {editing !== 'new' && <span className="ml-2 text-sm font-normal text-gray-400">(v{editing.version} — saving will create v{editing.version + 1})</span>}
            </h1>
            <div className="flex gap-3">
              <button onClick={() => { setEditing(null); setForm(null); }} className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-white hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-1.5 bg-green-700 text-white rounded text-sm hover:bg-green-800 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
          {error && <div className="mb-3 bg-red-50 text-red-600 px-3 py-2 rounded text-sm border border-red-200">{error}</div>}

          <div className="bg-white border-2 border-gray-400 shadow-sm font-mono text-xs">
            <div className="border-b-2 border-gray-400 p-3 bg-gray-50">
              <div className="text-sm font-bold text-gray-800 tracking-wide">OREGENAL ELECTRICALS INDIA PVT. LTD., MANESAR GURGAON</div>
              <div className="flex items-center gap-2 mt-2 relative">
                <span className="text-gray-500">IQC INSPECTION OF</span>
                <div className="flex-1 relative">
                  <input
                    className="w-full border border-gray-300 px-2 py-1 bg-white font-bold text-gray-900 focus:outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                    value={form.name}
                    disabled={editing !== 'new'}
                    onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setShowMaterialSuggestions(true); }}
                    onFocus={() => setShowMaterialSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowMaterialSuggestions(false), 150)}
                    placeholder="Type to search materials, or type a new name" />
                  {editing !== 'new' && (
                    <p className="text-xs text-gray-400 mt-1 font-sans">Name is locked after the first save — only the checklist content can change on later versions.</p>
                  )}
                  {editing === 'new' && showMaterialSuggestions && materialSuggestions.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-300 shadow-md max-h-48 overflow-y-auto font-sans">
                      {materialSuggestions.map(rm => (
                        <div key={rm.id}
                          onClick={() => { setForm(f => ({ ...f, name: rm.name })); setShowMaterialSuggestions(false); }}
                          className="px-2 py-1.5 cursor-pointer hover:bg-blue-50 text-gray-800">
                          <span className="font-mono text-blue-600">{rm.code}</span> — {rm.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-x-6 gap-y-1 mt-3 pt-3 border-t border-gray-300 text-gray-400">
                <div>MRIR No. (GRN): <span className="italic">auto-fetched at inspection</span></div>
                <div>Supplier: <span className="italic">auto-fetched at inspection</span></div>
                <div>Lot Quantity: <span className="italic">auto-fetched at inspection</span></div>
                <div>Sample Size: <span className="italic">entered at inspection</span></div>
                <div>Inspection Date: <span className="italic">auto-fetched at inspection</span></div>
              </div>
            </div>

            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-400 px-2 py-1.5 text-gray-700 w-10">S.No</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-gray-700 w-28">Category</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-gray-700">Parameters to be Checked</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-gray-700 w-80">Specifications</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-gray-700 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {form.parameters.map((p, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="border border-gray-300 text-center text-gray-500 align-top py-1">{p.sNo}</td>
                    <td className="border border-gray-300 p-0 align-top">
                      <select
                        className={`w-full h-full px-2 py-1.5 bg-transparent focus:outline-none focus:bg-blue-50 font-bold ${CATEGORY_COLORS[p.category]}`}
                        value={p.category} onChange={e => updateParam(idx, 'category', e.target.value)}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="border border-gray-300 p-0 align-top">
                      <input
                        className="w-full px-2 py-1.5 bg-transparent focus:outline-none focus:bg-blue-50"
                        value={p.parameterName} onChange={e => updateParam(idx, 'parameterName', e.target.value)}
                        placeholder="e.g. Outer Dia." />
                    </td>
                    <td className="border border-gray-300 p-0 align-top">
                      <input
                        className="w-full px-2 py-1.5 bg-transparent focus:outline-none focus:bg-blue-50"
                        value={p.specification} onChange={e => updateParam(idx, 'specification', e.target.value)}
                        placeholder="e.g. 65±0.5MM" />
                    </td>
                    <td className="border border-gray-300 text-center align-top py-1">
                      {form.parameters.length > 1 && (
                        <button onClick={() => removeParamRow(idx)} className="text-red-500 hover:text-red-700 font-bold px-1">✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={addParamRow} className="w-full border border-t-0 border-gray-300 py-2 text-gray-500 hover:bg-gray-50 hover:text-blue-600">
              + Add Row
            </button>

            <div className="border-t-2 border-gray-400 p-3 bg-gray-50 flex justify-between text-gray-500">
              <span>Prepd. By: _______________________</span>
              <span>Checked By: _______________________</span>
            </div>
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
          <div className="flex gap-3">
            <label className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 cursor-pointer">
              {importing ? 'Reading file...' : 'Import from Excel'}
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} disabled={importing} />
            </label>
            <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ New Template</button>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-3 mb-4">
          <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {error && !cloneSource && !importPreview && <div className="mb-4 bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}

        {importResult && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
            <div className="font-bold text-green-800 mb-1">Import complete</div>
            <div className="text-green-700">{importResult.createdCount} template(s) created.</div>
            {importResult.skippedCount > 0 && (
              <details className="mt-2">
                <summary className="text-amber-700 cursor-pointer">{importResult.skippedCount} sheet(s) skipped — click to see why</summary>
                <ul className="mt-1 space-y-0.5 text-gray-600">
                  {importResult.skipped.map((s, i) => <li key={i}>• {s.sheetName}: {s.reason}</li>)}
                </ul>
              </details>
            )}
            <button onClick={() => setImportResult(null)} className="mt-2 text-xs text-gray-500 hover:underline">Dismiss</button>
          </div>
        )}

        <div className="bg-white rounded-xl border">
          {loading ? (
            <div className="text-center py-10 text-gray-400">Loading...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No templates yet — create your first one, or import from Excel</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>{['Name', 'Parameters', 'Action'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {templates.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {t.name} <span className="text-xs font-normal text-gray-400">v{t.version}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{t._count?.parameters ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button onClick={() => openEdit(t.id)} className="text-blue-600 hover:underline text-xs">View</button>
                        <button onClick={() => { setCloneSource(t); setCloneName(`${t.name} (copy)`); setError(''); }} className="text-gray-600 hover:underline text-xs">Clone</button>
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

        {importPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
              <div className="p-5 border-b">
                <h2 className="font-bold text-gray-800">Review before importing — {importPreview.length} sheet(s) found</h2>
                <p className="text-xs text-gray-500 mt-1">Each sheet becomes one template. Sheets with errors will be skipped.</p>
              </div>
              <div className="p-5 overflow-y-auto flex-1">
                {error && <div className="mb-3 bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>{['Sheet', 'Template Name', 'Parameters', 'Status'].map(h => <th key={h} className="text-left px-3 py-2">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {importPreview.map((t, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-500 text-xs">{t.sheetName}</td>
                        <td className="px-3 py-2 font-medium text-gray-800">{t.name}</td>
                        <td className="px-3 py-2 text-gray-600">{t.parameters.length}</td>
                        <td className="px-3 py-2">
                          {t.error ? (
                            <span className="text-red-600 text-xs">{t.error}</span>
                          ) : (
                            <span className="text-green-600 text-xs">Ready</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                <button onClick={() => { setImportPreview(null); setError(''); }} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={confirmBulkImport} disabled={importing} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {importing ? 'Importing...' : `Import ${importPreview.filter(t => !t.error).length} Template(s)`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
