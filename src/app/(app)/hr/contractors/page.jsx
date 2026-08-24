'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

export default function ContractorsPage() {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const res = await fetch(`${API}/contractors?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setContractors(await res.json());
    setLoading(false);
  }, [search]);
  useEffect(() => { load(); }, [load]);

  function openNew() {
    setForm({ name: '', contactPerson: '', phone: '', email: '', address: '', defaultHourlyRate: '' });
    setEditing('new');
    setError('');
  }

  function openEdit(c) {
    setForm({
      name: c.name, contactPerson: c.contactPerson || '', phone: c.phone || '',
      email: c.email || '', address: c.address || '', defaultHourlyRate: c.defaultHourlyRate ?? '',
    });
    setEditing(c);
    setError('');
  }

  async function save() {
    if (!form.name.trim()) { setError('Give the contractor a name'); return; }
    setSaving(true); setError('');
    const isNew = editing === 'new';
    const url = isNew ? `${API}/contractors` : `${API}/contractors/${editing.id}`;
    const res = await fetch(url, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({
        name: form.name,
        contactPerson: form.contactPerson || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        defaultHourlyRate: form.defaultHourlyRate === '' ? undefined : parseFloat(form.defaultHourlyRate),
      }),
    });
    const data = await res.json();
    if (res.ok) { setEditing(null); setForm(null); load(); }
    else setError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed to save contractor');
    setSaving(false);
  }

  async function remove(c) {
    if (!confirm(`Remove ${c.name}?`)) return;
    const res = await fetch(`${API}/contractors/${c.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
    const data = await res.json();
    if (res.ok) load();
    else alert(data.message || 'Failed to remove');
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contractors</h1>
            <p className="text-gray-500 text-sm mt-1">Manage contractors your contract manpower is linked to, for costing</p>
          </div>
          <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ New Contractor</button>
        </div>

        <div className="bg-white rounded-xl border p-3 mb-4">
          <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Search contractors..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {error && !editing && <div className="mb-4 bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}

        <div className="bg-white rounded-xl border">
          {loading ? (
            <div className="text-center py-10 text-gray-400">Loading...</div>
          ) : contractors.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No contractors yet — add your first one</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>{['Name', 'Contact', 'Phone', 'Default Rate/hr', 'Employees', 'Action'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {contractors.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600">{c.contactPerson || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.defaultHourlyRate != null ? `₹${c.defaultHourlyRate}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{c._count?.employees ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button onClick={() => openEdit(c)} className="text-blue-600 hover:underline text-xs">Edit</button>
                        <button onClick={() => remove(c)} className="text-red-500 hover:underline text-xs">Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {editing && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b">
                <h2 className="font-bold text-gray-800">{editing === 'new' ? 'New Contractor' : `Edit — ${editing.name}`}</h2>
              </div>
              <div className="p-5 space-y-3">
                {error && <div className="mb-1 bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Name</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Contact Person</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Phone</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Email</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Address</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Default Hourly Rate (₹) — used for costing when a worker doesn&apos;t have their own rate</label>
                  <input type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.defaultHourlyRate} onChange={e => setForm(f => ({ ...f, defaultHourlyRate: e.target.value }))} />
                </div>
              </div>
              <div className="p-5 border-t flex justify-end gap-3">
                <button onClick={() => { setEditing(null); setForm(null); setError(''); }} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
