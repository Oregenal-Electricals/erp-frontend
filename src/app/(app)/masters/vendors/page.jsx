'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import CustomFields from '@/components/custom-fields/CustomFields';

const API = process.env.NEXT_PUBLIC_API_URL;

function getToken() {
  if (typeof window !== 'undefined') return localStorage.getItem('erp_token');
}

const VENDOR_TYPES = ['SUPPLIER', 'CONTRACTOR', 'SERVICE_PROVIDER', 'TRANSPORTER'];

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [vendorType, setVendorType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editVendor, setEditVendor] = useState(null);
  const [form, setForm] = useState({
    code: '', name: '', legalName: '', vendorType: 'SUPPLIER',
    gstin: '', pan: '', msmeNumber: '', isMsme: false,
    email: '', phone: '', alternatePhone: '', website: '',
    addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', country: 'India',
    bankName: '', bankBranch: '', accountNumber: '', ifscCode: '',
    paymentTerms: 'NET_30', creditLimit: '', currency: 'INR',
    tdsApplicable: false, tdsSection: '', rating: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    const res = await fetch(`${API}/vendors/stats`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setStats(await res.json());
  }, []);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (vendorType) params.set('vendorType', vendorType);
    const res = await fetch(`${API}/vendors?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const d = await res.json();
      setVendors(d.data);
      setTotalPages(d.totalPages);
      setTotal(d.total);
    }
    setLoading(false);
  }, [page, search, vendorType]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  function openCreate() {
    setEditVendor(null);
    setForm({
      code: '', name: '', legalName: '', vendorType: 'SUPPLIER',
      gstin: '', pan: '', msmeNumber: '', isMsme: false,
      email: '', phone: '', alternatePhone: '', website: '',
      addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', country: 'India',
      bankName: '', bankBranch: '', accountNumber: '', ifscCode: '',
      paymentTerms: 'NET_30', creditLimit: '', currency: 'INR',
      tdsApplicable: false, tdsSection: '', rating: '', notes: '',
    });
    setError('');
    setShowModal(true);
  }

  function openEdit(v) {
    setEditVendor(v);
    setForm({
      code: v.code, name: v.name, legalName: v.legalName || '', vendorType: v.vendorType,
      gstin: v.gstin || '', pan: v.pan || '', msmeNumber: v.msmeNumber || '', isMsme: v.isMsme,
      email: v.email || '', phone: v.phone || '', alternatePhone: v.alternatePhone || '', website: v.website || '',
      addressLine1: v.addressLine1 || '', addressLine2: v.addressLine2 || '',
      city: v.city || '', state: v.state || '', pincode: v.pincode || '', country: v.country || 'India',
      bankName: v.bankName || '', bankBranch: v.bankBranch || '',
      accountNumber: v.accountNumber || '', ifscCode: v.ifscCode || '',
      paymentTerms: v.paymentTerms || 'NET_30', creditLimit: v.creditLimit || '',
      currency: v.currency || 'INR', tdsApplicable: v.tdsApplicable, tdsSection: v.tdsSection || '',
      rating: v.rating || '', notes: v.notes || '',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true); setError('');
    const body = { ...form };
    if (body.creditLimit) body.creditLimit = parseFloat(body.creditLimit);
    if (body.rating) body.rating = parseInt(body.rating);
    else delete body.rating;
    const url = editVendor ? `${API}/vendors/${editVendor.id}` : `${API}/vendors`;
    const method = editVendor ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      setShowModal(false);
      fetchVendors(); fetchStats();
    } else {
      setError(data.message || 'Save failed');
    }
    setSaving(false);
  }

  async function handleDeactivate(id) {
    if (!confirm('Deactivate this vendor?')) return;
    await fetch(`${API}/vendors/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    fetchVendors(); fetchStats();
  }

  const typeColor = { SUPPLIER: 'bg-blue-100 text-blue-700', CONTRACTOR: 'bg-purple-100 text-purple-700', SERVICE_PROVIDER: 'bg-green-100 text-green-700', TRANSPORTER: 'bg-orange-100 text-orange-700' };

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Master</h1>
          <p className="text-gray-500 text-sm mt-1">Manage suppliers, contractors and service providers</p>
        </div>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ Add Vendor</button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'bg-gray-50' },
            { label: 'Active', value: stats.active, color: 'bg-green-50' },
            { label: 'Suppliers', value: stats.suppliers, color: 'bg-blue-50' },
            { label: 'Contractors', value: stats.contractors, color: 'bg-purple-50' },
            { label: 'MSME', value: stats.msme, color: 'bg-yellow-50' },
          ].map(s => (
            <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
              <div className="text-2xl font-bold text-gray-800">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b flex gap-3 flex-wrap">
          <input
            className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48"
            placeholder="Search name, code, GSTIN, phone..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <select className="border rounded-lg px-3 py-2 text-sm" value={vendorType} onChange={e => { setVendorType(e.target.value); setPage(1); }}>
            <option value="">All Types</option>
            {VENDOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className="text-sm text-gray-500 self-center">{total} vendors</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                {['Code', 'Name', 'Type', 'GSTIN', 'Phone', 'City', 'Payment Terms', 'Rating', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={10} className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : vendors.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-gray-400">No vendors found</td></tr>
              ) : vendors.map(v => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-blue-600">{v.code}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{v.name}</div>
                    {v.isMsme && <span className="text-xs bg-yellow-100 text-yellow-700 px-1 rounded">MSME</span>}
                  </td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColor[v.vendorType] || 'bg-gray-100 text-gray-600'}`}>{v.vendorType}</span></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{v.gstin || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{v.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{v.city || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{v.paymentTerms || '—'}</td>
                  <td className="px-4 py-3">{v.rating ? '⭐'.repeat(v.rating) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${v.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {v.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(v)} className="text-blue-600 hover:underline text-xs">Edit</button>
                      {v.isActive && <button onClick={() => handleDeactivate(v.id)} className="text-red-500 hover:underline text-xs">Deactivate</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t flex justify-center gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button>
            <span className="px-3 py-1 text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-lg font-bold">{editVendor ? 'Edit Vendor' : 'Add Vendor'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-6">
              {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">{error}</div>}

              <div>
                <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Basic Info</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Code *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} disabled={!!editVendor} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Vendor Type</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.vendorType} onChange={e => setForm(f => ({ ...f, vendorType: e.target.value }))}>
                      {VENDOR_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Name *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Legal Name</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.legalName} onChange={e => setForm(f => ({ ...f, legalName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">GSTIN</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.gstin} onChange={e => setForm(f => ({ ...f, gstin: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">PAN</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.pan} onChange={e => setForm(f => ({ ...f, pan: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">MSME Number</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.msmeNumber} onChange={e => setForm(f => ({ ...f, msmeNumber: e.target.value }))} />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input type="checkbox" id="isMsme" checked={form.isMsme} onChange={e => setForm(f => ({ ...f, isMsme: e.target.checked }))} />
                    <label htmlFor="isMsme" className="text-sm text-gray-600">MSME Registered</label>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Email</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Phone</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Alternate Phone</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.alternatePhone} onChange={e => setForm(f => ({ ...f, alternatePhone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Website</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Address</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Address Line 1</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.addressLine1} onChange={e => setForm(f => ({ ...f, addressLine1: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Address Line 2</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.addressLine2} onChange={e => setForm(f => ({ ...f, addressLine2: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">City</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">State</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Pincode</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Country</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Bank & Payment</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Bank Name</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Branch</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.bankBranch} onChange={e => setForm(f => ({ ...f, bankBranch: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Account Number</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">IFSC Code</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.ifscCode} onChange={e => setForm(f => ({ ...f, ifscCode: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Payment Terms</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))}>
                      {['IMMEDIATE', 'NET_15', 'NET_30', 'NET_45', 'NET_60', 'NET_90'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Credit Limit (₹)</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.creditLimit} onChange={e => setForm(f => ({ ...f, creditLimit: e.target.value }))} />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input type="checkbox" id="tds" checked={form.tdsApplicable} onChange={e => setForm(f => ({ ...f, tdsApplicable: e.target.checked }))} />
                    <label htmlFor="tds" className="text-sm text-gray-600">TDS Applicable</label>
                  </div>
                  {form.tdsApplicable && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">TDS Section</label>
                      <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.tdsSection} onChange={e => setForm(f => ({ ...f, tdsSection: e.target.value }))} />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Other</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Rating (1-5)</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))}>
                      <option value="">No Rating</option>
                      {[1,2,3,4,5].map(r => <option key={r} value={r}>{'⭐'.repeat(r)} ({r})</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Notes</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>
            {editVendor && (
              <div className="px-6 pb-2">
                <CustomFields module="VENDOR" recordId={editVendor.id} />
              </div>
            )}
            <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : editVendor ? 'Update Vendor' : 'Create Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AppLayout>
  );
}
