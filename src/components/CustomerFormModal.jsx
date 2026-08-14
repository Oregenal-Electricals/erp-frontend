'use client';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const BLANK_ADDRESS = { addressType: 'DELIVERY', addressLine: '', city: '', state: '', pincode: '', isDefault: false };
const BLANK_CONTACT = { name: '', designation: '', phone: '', email: '', isPrimary: false };
const BLANK_GST = { gstNumber: '', branchLabel: '' };
const BLANK_FORM = { code: '', name: '', email: '', phone: '', addresses: [{ ...BLANK_ADDRESS }], contacts: [{ ...BLANK_CONTACT }], gstNumbers: [{ ...BLANK_GST }] };

/**
 * Shared Customer create/edit modal - used by the Customers master page
 * AND the Customer PO form's inline "+ Add new customer" flow, so both
 * places create the exact same, fully-featured Customer record (address,
 * contacts, GST) rather than the PO form having its own stripped-down
 * quick-create with fewer fields.
 *
 * Props:
 *   open        - whether to render the modal
 *   editingId   - customer id to edit, or null/undefined to create new
 *   initialName - prefills the Name field when creating (e.g. what the
 *                 user already typed on the Customer PO form)
 *   onClose()   - called on Cancel/X
 *   onSaved(customer) - called with the saved customer record on success,
 *                 right before the modal closes itself
 */
export default function CustomerFormModal({ open, editingId, initialName, onClose, onSaved }) {
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (editingId) {
      setLoadingEdit(true);
      fetch(`${API}/customers/${editingId}`, { headers: { Authorization: `Bearer ${getToken()}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((c) => {
          if (!c) return;
          setForm({
            code: c.code, name: c.name, email: c.email || '', phone: c.phone || '',
            addresses: c.addresses?.length ? c.addresses.map((a) => ({ ...a })) : [{ ...BLANK_ADDRESS }],
            contacts: c.contacts?.length ? c.contacts.map((x) => ({ ...x })) : [{ ...BLANK_CONTACT }],
            gstNumbers: c.gstNumbers?.length ? c.gstNumbers.map((g) => ({ ...g })) : [{ ...BLANK_GST }],
          });
        })
        .finally(() => setLoadingEdit(false));
    } else {
      setForm({ ...BLANK_FORM, name: initialName || '', addresses: [{ ...BLANK_ADDRESS }], contacts: [{ ...BLANK_CONTACT }], gstNumbers: [{ ...BLANK_GST }] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingId]);

  function updateSubField(listKey, i, key, val) {
    setForm((f) => { const list = [...f[listKey]]; list[i] = { ...list[i], [key]: val }; return { ...f, [listKey]: list }; });
  }
  function addSub(listKey, blank) { setForm((f) => ({ ...f, [listKey]: [...f[listKey], { ...blank }] })); }
  function removeSub(listKey, i) { setForm((f) => ({ ...f, [listKey]: f[listKey].filter((_, idx) => idx !== i) })); }

  async function handleSave() {
    setSaving(true); setError('');
    const body = {
      code: form.code, name: form.name, email: form.email, phone: form.phone,
      addresses: form.addresses.filter((a) => a.addressLine).map((a) => ({
        id: a.id, addressType: a.addressType, addressLine: a.addressLine,
        city: a.city, state: a.state, pincode: a.pincode, isDefault: a.isDefault,
      })),
      contacts: form.contacts.filter((c) => c.name).map((c) => ({
        id: c.id, name: c.name, designation: c.designation, phone: c.phone,
        email: c.email, isPrimary: c.isPrimary,
      })),
      gstNumbers: form.gstNumbers.filter((g) => g.gstNumber).map((g) => ({
        id: g.id, gstNumber: g.gstNumber, branchLabel: g.branchLabel,
      })),
    };
    const url = editingId ? `${API}/customers/${editingId}` : `${API}/customers`;
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      onSaved?.(data);
      onClose?.();
    } else {
      setError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    }
    setSaving(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-screen overflow-y-auto">
        <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
          <h2 className="text-lg font-bold">{editingId ? 'Edit Customer' : 'New Customer'}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>
        <div className="p-6 space-y-6">
          {loadingEdit && <div className="text-sm text-gray-400">Loading...</div>}
          {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Customer Code *</label>
              <input disabled={!!editingId} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="CUST-001" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Customer Name *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Phone</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-gray-700">Addresses</label>
              <button onClick={() => addSub('addresses', BLANK_ADDRESS)} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded border border-indigo-200">+ Add Address</button>
            </div>
            <div className="space-y-2">
              {form.addresses.map((a, i) => (
                <div key={i} className="border rounded-lg p-3 grid grid-cols-6 gap-2 items-end">
                  <select className="border rounded px-2 py-1.5 text-xs col-span-1" value={a.addressType} onChange={(e) => updateSubField('addresses', i, 'addressType', e.target.value)}>
                    <option value="DELIVERY">Delivery</option>
                    <option value="BILLING">Billing</option>
                    <option value="BOTH">Both</option>
                  </select>
                  <input className="border rounded px-2 py-1.5 text-xs col-span-2" placeholder="Address line" value={a.addressLine} onChange={(e) => updateSubField('addresses', i, 'addressLine', e.target.value)} />
                  <input className="border rounded px-2 py-1.5 text-xs" placeholder="City" value={a.city} onChange={(e) => updateSubField('addresses', i, 'city', e.target.value)} />
                  <input className="border rounded px-2 py-1.5 text-xs" placeholder="State" value={a.state} onChange={(e) => updateSubField('addresses', i, 'state', e.target.value)} />
                  <input className="border rounded px-2 py-1.5 text-xs" placeholder="Pincode" value={a.pincode} onChange={(e) => updateSubField('addresses', i, 'pincode', e.target.value)} />
                  {form.addresses.length > 1 && <button onClick={() => removeSub('addresses', i)} className="text-red-400 hover:text-red-600 text-sm col-span-6 text-left">Remove</button>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-gray-700">Contact Persons</label>
              <button onClick={() => addSub('contacts', BLANK_CONTACT)} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded border border-indigo-200">+ Add Contact</button>
            </div>
            <div className="space-y-2">
              {form.contacts.map((c, i) => (
                <div key={i} className="border rounded-lg p-3 grid grid-cols-4 gap-2 items-end">
                  <input className="border rounded px-2 py-1.5 text-xs" placeholder="Name" value={c.name} onChange={(e) => updateSubField('contacts', i, 'name', e.target.value)} />
                  <input className="border rounded px-2 py-1.5 text-xs" placeholder="Designation" value={c.designation} onChange={(e) => updateSubField('contacts', i, 'designation', e.target.value)} />
                  <input className="border rounded px-2 py-1.5 text-xs" placeholder="Phone" value={c.phone} onChange={(e) => updateSubField('contacts', i, 'phone', e.target.value)} />
                  <input className="border rounded px-2 py-1.5 text-xs" placeholder="Email" value={c.email} onChange={(e) => updateSubField('contacts', i, 'email', e.target.value)} />
                  {form.contacts.length > 1 && <button onClick={() => removeSub('contacts', i)} className="text-red-400 hover:text-red-600 text-sm col-span-4 text-left">Remove</button>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-gray-700">GST Numbers</label>
              <button onClick={() => addSub('gstNumbers', BLANK_GST)} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded border border-indigo-200">+ Add GST</button>
            </div>
            <div className="space-y-2">
              {form.gstNumbers.map((g, i) => (
                <div key={i} className="border rounded-lg p-3 grid grid-cols-3 gap-2 items-end">
                  <input className="border rounded px-2 py-1.5 text-xs col-span-2" placeholder="GST Number" value={g.gstNumber} onChange={(e) => updateSubField('gstNumbers', i, 'gstNumber', e.target.value)} />
                  <input className="border rounded px-2 py-1.5 text-xs" placeholder="Branch label (optional)" value={g.branchLabel} onChange={(e) => updateSubField('gstNumbers', i, 'branchLabel', e.target.value)} />
                  {form.gstNumbers.length > 1 && <button onClick={() => removeSub('gstNumbers', i)} className="text-red-400 hover:text-red-600 text-sm col-span-3 text-left">Remove</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.code || !form.name} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save Customer'}</button>
        </div>
      </div>
    </div>
  );
}
