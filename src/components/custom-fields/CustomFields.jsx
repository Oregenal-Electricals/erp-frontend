'use client';
import { useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() {
  if (typeof window !== 'undefined') return localStorage.getItem('accessToken');
}

export default function CustomFields({ module, recordId, readOnly = false, onSave = null }) {
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchFields = useCallback(async () => {
    if (!module) return;
    const url = recordId
      ? `${API}/custom-fields/values/${module}/${recordId}`
      : `${API}/custom-fields/definitions?module=${module}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const data = await res.json();
      setFields(data);
      if (recordId) {
        const vals = {};
        data.forEach(f => { vals[f.fieldKey] = f.value || f.defaultValue || ''; });
        setValues(vals);
      } else {
        const vals = {};
        data.forEach(f => { vals[f.fieldKey] = f.defaultValue || ''; });
        setValues(vals);
      }
    }
  }, [module, recordId]);

  useEffect(() => { fetchFields(); }, [fetchFields]);

  async function handleSave() {
    if (!recordId) {
      if (onSave) onSave(values);
      return;
    }
    setSaving(true);
    const res = await fetch(`${API}/custom-fields/values/${module}/${recordId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ values }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (onSave) onSave(values);
    }
    setSaving(false);
  }

  function renderField(field) {
    const val = values[field.fieldKey] || '';
    const commonClass = "w-full border rounded-lg px-3 py-2 text-sm " + (readOnly ? "bg-gray-50 text-gray-600" : "");

    switch (field.fieldType) {
      case 'TEXT':
        return <input className={commonClass} value={val} placeholder={field.placeholder || ''} readOnly={readOnly}
          onChange={e => setValues(v => ({ ...v, [field.fieldKey]: e.target.value }))} />;
      case 'NUMBER':
        return <input type="number" className={commonClass} value={val} placeholder={field.placeholder || ''} readOnly={readOnly}
          onChange={e => setValues(v => ({ ...v, [field.fieldKey]: e.target.value }))} />;
      case 'DATE':
        return <input type="date" className={commonClass} value={val} readOnly={readOnly}
          onChange={e => setValues(v => ({ ...v, [field.fieldKey]: e.target.value }))} />;
      case 'BOOLEAN':
        return (
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={val === 'true'} disabled={readOnly}
              onChange={e => setValues(v => ({ ...v, [field.fieldKey]: e.target.checked ? 'true' : 'false' }))} />
            <span className="text-sm text-gray-600">{val === 'true' ? 'Yes' : 'No'}</span>
          </div>
        );
      case 'DROPDOWN':
        const options = Array.isArray(field.options) ? field.options : [];
        if (readOnly) return <span className="text-sm text-gray-700">{val || '—'}</span>;
        return (
          <select className={commonClass} value={val}
            onChange={e => setValues(v => ({ ...v, [field.fieldKey]: e.target.value }))}>
            <option value="">— Select —</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        );
      default:
        return <input className={commonClass} value={val} readOnly={readOnly}
          onChange={e => setValues(v => ({ ...v, [field.fieldKey]: e.target.value }))} />;
    }
  }

  if (fields.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Custom Fields
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {fields.map(field => (
          <div key={field.fieldKey} className={field.fieldType === 'TEXT' && field.fieldLabel.length > 20 ? 'col-span-2' : ''}>
            <label className="block text-sm text-gray-600 mb-1">
              {field.fieldLabel}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderField(field)}
          </div>
        ))}
      </div>
      {!readOnly && recordId && (
        <div className="mt-3 flex items-center gap-3">
          <button onClick={handleSave} disabled={saving}
            className="px-3 py-1.5 bg-gray-700 text-white rounded text-xs hover:bg-gray-800 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Custom Fields'}
          </button>
          {saved && <span className="text-xs text-green-600">✓ Saved</span>}
        </div>
      )}
    </div>
  );
}
