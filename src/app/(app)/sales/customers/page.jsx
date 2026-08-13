'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const BLANK_ADDRESS = { addressType: 'DELIVERY', addressLine: '', city: '', state: '', pincode: '', isDefault: false };
const BLANK_CONTACT = { name: '', designation: '', phone: '', email: '', isPrimary: false };
const BLANK_GST = { gstNumber: '', branchLabel: '' };
const BLANK_FORM = { code: '', name: '', email: '', phone: '', addresses: [{ ...BLANK_ADDRESS }], contacts: [{ ...BLANK_CONTACT }], gstNumbers: [{ ...BLANK_GST }] };

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewDetail, setViewDetail] = useState(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function fetchAll() {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    const [cRes, sRes] = await Promise.all([
      fetch(`${API}/customers?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/customers/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (cRes.ok) { const d = await cRes.json(); setCustomers(d.data); setTotalPages(d.totalPages); setTotal(d.total); }
    if (sRes.ok) setStats(await sRes.json());
    setLoading(false);
  }
  useEffect(() => { fetchAll(); }, [page, search]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...BLANK_FORM, addresses: [{ ...BLANK_ADDRESS }], contacts: [{ ...BLANK_CONTACT }], gstNumbers: [{ ...BLANK_GST }] });
    setError('');
    setShowModal(true);
  }

  async function openEdit(id) {
    const res = await fetch(`${API}/customers/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) return;
    const c = await res.json();
    setEditingId(id);
    setForm({
      code: c.code, name: c.name, email: c.email || '', phone: c.phone || '',
      addresses: c.addresses?.length ? c.addresses.map(a => ({ ...a })) : [{ ...BLANK_ADDRESS }],
      contacts: c.contacts?.length ? c.contacts.map(x => ({ ...x })) : [{ ...BLANK_CONTACT }],
      gstNumbers: c.gstNumbers?.length ? c.gstNumbers.map(g => ({ ...g })) : [{ ...BLANK_GST }],
    });
    setError('');
    setShowModal(true);
  }

  async function openView(id) {
    const res = await fetch(`${API}/customers/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setViewDetail(await res.json());
  }

  function updateSubField(listKey, i, key, val) {
    setForm(f => { const list = [...f[listKey]]; list[i] = { ...list[i], [key]: val }; return { ...f, [listKey]: list }; });
  }
  function addSub(listKey, blank) { setForm(f => ({ ...f, [listKey]: [...f[listKey], { ...blank }] })); }
  function removeSub(listKey, i) { setForm(f => ({ ...f, [listKey]: f[listKey].filter((_, idx) => idx !== i) })); }

  async function handleSave() {
    setSaving(true); setError('');
    const body = {
      code: form.code, name: form.name, email: form.email, phone: form.phone,
      addresses: form.addresses.filter(a => a.addressLine).map(a => ({
        id: a.id, addressType: a.addressType, addressLine: a.addressLine,
        city: a.city, state: a.state, pincode: a.pincode, isDefault: a.isDefault,
      })),
      contacts: form.contacts.filter(c => c.name).map(c => ({
        id: c.id, name: c.name, designation: c.designation, phone: c.phone,
        email: c.email, isPrimary: c.isPrimary,
      })),
      gstNumbers: form.gstNumbers.filter(g => g.gstNumber).map(g => ({
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
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this customer?')) return;
    const res = await fetch(`${API}/customers/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) fetchAll();
    else { const d = await res.json(); alert(d.message || 'Failed to delete'); }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-gray-500 text-sm mt-1">Customer master — addresses, contacts, and GST numbers</p>
          </div>
          <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New Customer</button>
        </div>

        {stats && (
          <div className="grid grid-cols-1 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-xl font-bold text-gray-800">{stats.total}</div>
              <div className="text-xs text-gray-500 mt-1">Total Customers</div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex gap-3">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search code or name..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <span className="text-sm text-gray-500 self-center">{total} customers</span>
          </div>
          <div className="divide-y">
            {loading ? <div className="text-center py-10 text-gray-400">Loading...</div>
            : customers.length === 0 ? <div className="text-center py-10 text-gray-400">No customers yet</div>
            : customers.map(c => (
              <div key={c.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold text-blue-600">{c.code}</span>
                  <span className="font-medium text-gray-800">{c.name}</span>
                  <span className="text-xs text-gray-400">{c.email}</span>
                  <span className="text-xs text-gray-400">{c.phone}</span>
                  <span className="text-xs text-gray-500">{c._count?.addresses || 0} address(es) · {c._count?.contacts || 0} contact(s) · {c._count?.gstNumbers || 0} GST(s)</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => openView(c.id)} className="text-gray-600 hover:underline text-xs">View</button>
                  <button onClick={() => openEdit(c.id)} className="text-blue-600 hover:underline text-xs">Edit</button>
                  <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:underline text-xs">Delete</button>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="p-4 border-t flex justify-center gap-2">
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button>
              <span className="px-3 py-1 text-sm">{page} of {totalPages}</span>
              <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold">{editingId ? 'Edit Customer' : 'New Customer'}</h2>
                <button onClick={()=>setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-6">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Customer Code *</label>
                    <input disabled={!!editingId} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50" value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value}))} placeholder="CUST-001" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Customer Name *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Email</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Phone</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-semibold text-gray-700">Addresses</label>
                    <button onClick={()=>addSub('addresses',BLANK_ADDRESS)} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded border border-indigo-200">+ Add Address</button>
                  </div>
                  <div className="space-y-2">
                    {form.addresses.map((a,i)=>(
                      <div key={i} className="border rounded-lg p-3 grid grid-cols-6 gap-2 items-end">
                        <select className="border rounded px-2 py-1.5 text-xs col-span-1" value={a.addressType} onChange={e=>updateSubField('addresses',i,'addressType',e.target.value)}>
                          <option value="DELIVERY">Delivery</option>
                          <option value="BILLING">Billing</option>
                          <option value="BOTH">Both</option>
                        </select>
                        <input className="border rounded px-2 py-1.5 text-xs col-span-2" placeholder="Address line" value={a.addressLine} onChange={e=>updateSubField('addresses',i,'addressLine',e.target.value)} />
                        <input className="border rounded px-2 py-1.5 text-xs" placeholder="City" value={a.city} onChange={e=>updateSubField('addresses',i,'city',e.target.value)} />
                        <input className="border rounded px-2 py-1.5 text-xs" placeholder="State" value={a.state} onChange={e=>updateSubField('addresses',i,'state',e.target.value)} />
                        <input className="border rounded px-2 py-1.5 text-xs" placeholder="Pincode" value={a.pincode} onChange={e=>updateSubField('addresses',i,'pincode',e.target.value)} />
                        {form.addresses.length>1 && <button onClick={()=>removeSub('addresses',i)} className="text-red-400 hover:text-red-600 text-sm col-span-6 text-left">Remove</button>}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-semibold text-gray-700">Contact Persons</label>
                    <button onClick={()=>addSub('contacts',BLANK_CONTACT)} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded border border-indigo-200">+ Add Contact</button>
                  </div>
                  <div className="space-y-2">
                    {form.contacts.map((c,i)=>(
                      <div key={i} className="border rounded-lg p-3 grid grid-cols-4 gap-2 items-end">
                        <input className="border rounded px-2 py-1.5 text-xs" placeholder="Name" value={c.name} onChange={e=>updateSubField('contacts',i,'name',e.target.value)} />
                        <input className="border rounded px-2 py-1.5 text-xs" placeholder="Designation" value={c.designation} onChange={e=>updateSubField('contacts',i,'designation',e.target.value)} />
                        <input className="border rounded px-2 py-1.5 text-xs" placeholder="Phone" value={c.phone} onChange={e=>updateSubField('contacts',i,'phone',e.target.value)} />
                        <input className="border rounded px-2 py-1.5 text-xs" placeholder="Email" value={c.email} onChange={e=>updateSubField('contacts',i,'email',e.target.value)} />
                        {form.contacts.length>1 && <button onClick={()=>removeSub('contacts',i)} className="text-red-400 hover:text-red-600 text-sm col-span-4 text-left">Remove</button>}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-semibold text-gray-700">GST Numbers</label>
                    <button onClick={()=>addSub('gstNumbers',BLANK_GST)} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded border border-indigo-200">+ Add GST</button>
                  </div>
                  <div className="space-y-2">
                    {form.gstNumbers.map((g,i)=>(
                      <div key={i} className="border rounded-lg p-3 grid grid-cols-3 gap-2 items-end">
                        <input className="border rounded px-2 py-1.5 text-xs col-span-2" placeholder="GST Number" value={g.gstNumber} onChange={e=>updateSubField('gstNumbers',i,'gstNumber',e.target.value)} />
                        <input className="border rounded px-2 py-1.5 text-xs" placeholder="Branch label (optional)" value={g.branchLabel} onChange={e=>updateSubField('gstNumbers',i,'branchLabel',e.target.value)} />
                        {form.gstNumbers.length>1 && <button onClick={()=>removeSub('gstNumbers',i)} className="text-red-400 hover:text-red-600 text-sm col-span-3 text-left">Remove</button>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={()=>setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleSave} disabled={saving || !form.code || !form.name} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving?'Saving...':'Save Customer'}</button>
              </div>
            </div>
          </div>
        )}

        {viewDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold">{viewDetail.name} <span className="text-gray-400 font-mono text-sm ml-2">{viewDetail.code}</span></h2>
                <button onClick={()=>setViewDetail(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4 text-sm">
                <div className="flex gap-6"><span className="text-gray-500">Email:</span> {viewDetail.email || '—'} <span className="text-gray-500 ml-4">Phone:</span> {viewDetail.phone || '—'}</div>
                <div>
                  <div className="font-semibold text-gray-700 mb-1">Addresses</div>
                  {viewDetail.addresses?.length ? viewDetail.addresses.map(a=>(
                    <div key={a.id} className="text-xs bg-gray-50 rounded p-2 mb-1">{a.addressType}: {a.addressLine}, {a.city}, {a.state} {a.pincode}</div>
                  )) : <div className="text-xs text-gray-400">None</div>}
                </div>
                <div>
                  <div className="font-semibold text-gray-700 mb-1">Contacts</div>
                  {viewDetail.contacts?.length ? viewDetail.contacts.map(c=>(
                    <div key={c.id} className="text-xs bg-gray-50 rounded p-2 mb-1">{c.name} {c.designation && `(${c.designation})`} — {c.phone} {c.email}</div>
                  )) : <div className="text-xs text-gray-400">None</div>}
                </div>
                <div>
                  <div className="font-semibold text-gray-700 mb-1">GST Numbers</div>
                  {viewDetail.gstNumbers?.length ? viewDetail.gstNumbers.map(g=>(
                    <div key={g.id} className="text-xs bg-gray-50 rounded p-2 mb-1">{g.gstNumber} {g.branchLabel && `(${g.branchLabel})`}</div>
                  )) : <div className="text-xs text-gray-400">None</div>}
                </div>
              </div>
              <div className="p-6 border-t flex justify-end sticky bottom-0 bg-white">
                <button onClick={()=>setViewDetail(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
