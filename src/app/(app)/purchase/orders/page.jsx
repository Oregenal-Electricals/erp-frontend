'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import DocumentAttachments from '@/components/shared/DocumentAttachments';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

  async function downloadExcel(endpoint, filename) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=filename+'.xlsx'; a.click();
      URL.revokeObjectURL(url);
    }
  }


const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  APPROVED: 'bg-blue-100 text-blue-700',
  SENT: 'bg-purple-100 text-purple-700',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-700',
  CLOSED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState([]);
  const [stats, setStats] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ vendorId: '', deliveryDate: '', deliveryAddress: '', paymentTerms: '', notes: '' });
  const [poItems, setPoItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [vendorSearch, setVendorSearch] = useState('');
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [newVendorForm, setNewVendorForm] = useState({ code: '', name: '' });
  const [addingVendor, setAddingVendor] = useState(false);
  const [addVendorError, setAddVendorError] = useState('');

  const [showAddRmModal, setShowAddRmModal] = useState(false);
  const [newRmForm, setNewRmForm] = useState({ code: '', name: '' });
  const [addingRm, setAddingRm] = useState(false);
  const [addRmError, setAddRmError] = useState('');
  const [activeRowIdx, setActiveRowIdx] = useState(null);

  function addPoItemRow() {
    setPoItems(prev => [...prev, { itemCode: '', itemName: '', uom: 'PCS', orderedQty: '', unitPrice: '', taxRate: 18, _search: '', _showDropdown: false }]);
  }
  function updatePoItemRow(idx, field, value) {
    setPoItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }
  function removePoItemRow(idx) {
    setPoItems(prev => prev.filter((_, i) => i !== idx));
  }
  function selectRmForRow(idx, rm) {
    setPoItems(prev => prev.map((it, i) => i === idx ? { ...it, itemCode: rm.code, itemName: rm.name, uom: rm.uom?.code || it.uom, _search: `${rm.code} — ${rm.name}`, _showDropdown: false } : it));
  }

  const fetchStats = useCallback(async () => {
    const res = await fetch(`${API}/purchase-orders/stats`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setStats(await res.json());
  }, []);

  const fetchPos = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const res = await fetch(`${API}/purchase-orders?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) { const d = await res.json(); setPos(d.data); setTotalPages(d.totalPages); setTotal(d.total); }
    setLoading(false);
  }, [page, search, status]);

  const fetchVendors = useCallback(async () => {
    const res = await fetch(`${API}/vendors?limit=200&isActive=true`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) { const d = await res.json(); setVendors(d.data || []); }
  }, []);

  const fetchRawMaterials = useCallback(async () => {
    const res = await fetch(`${API}/raw-materials?limit=300&isActive=true`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) { const d = await res.json(); setRawMaterials(d.data || []); }
  }, []);

  useEffect(() => { fetchStats(); fetchVendors(); fetchRawMaterials(); }, [fetchStats, fetchVendors, fetchRawMaterials]);
  useEffect(() => { fetchPos(); }, [fetchPos]);

  async function handleCreate() {
    if (!form.vendorId) { setError('Select a vendor'); return; }
    if (!form.deliveryDate) { setError('Set a delivery date'); return; }
    const validItems = poItems.filter(it => it.itemCode && it.itemName && it.orderedQty && it.unitPrice);
    if (poItems.length > 0 && validItems.length !== poItems.length) {
      setError('Every item row needs a code, name, quantity, and unit price - remove any incomplete rows');
      return;
    }
    setSaving(true); setError('');
    const body = {
      ...form,
      deliveryDate: new Date(form.deliveryDate).toISOString(),
      items: validItems.map(it => ({
        itemCode: it.itemCode, itemName: it.itemName, uom: it.uom,
        orderedQty: parseFloat(it.orderedQty), unitPrice: parseFloat(it.unitPrice), taxRate: parseFloat(it.taxRate) || 0,
      })),
    };
    if (!body.deliveryAddress) delete body.deliveryAddress;
    if (!body.paymentTerms) delete body.paymentTerms;
    if (!body.notes) delete body.notes;
    const res = await fetch(`${API}/purchase-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); window.location.href = `/purchase/orders/${data.id}`; }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleAddVendor() {
    if (!newVendorForm.code.trim() || !newVendorForm.name.trim()) {
      setAddVendorError('Code and Name are required');
      return;
    }
    setAddingVendor(true); setAddVendorError('');
    const res = await fetch(`${API}/vendors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(newVendorForm),
    });
    const data = await res.json();
    if (res.ok) {
      setVendors(prev => [...prev, data]);
      setForm(f => ({ ...f, vendorId: data.id }));
      setVendorSearch(`${data.code} — ${data.name}`);
      setShowAddVendorModal(false);
      setNewVendorForm({ code: '', name: '' });
    } else {
      setAddVendorError(data.message || 'Failed to create vendor');
    }
    setAddingVendor(false);
  }

  async function handleAddRm() {
    if (!newRmForm.code.trim() || !newRmForm.name.trim()) {
      setAddRmError('Code and Name are required');
      return;
    }
    setAddingRm(true); setAddRmError('');
    const res = await fetch(`${API}/raw-materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(newRmForm),
    });
    const data = await res.json();
    if (res.ok) {
      setRawMaterials(prev => [...prev, data]);
      if (activeRowIdx !== null) selectRmForRow(activeRowIdx, data);
      setShowAddRmModal(false);
      setNewRmForm({ code: '', name: '' });
      setActiveRowIdx(null);
    } else {
      setAddRmError(data.message || 'Failed to create raw material');
    }
    setAddingRm(false);
  }

  async function handleAction(id, action) {
    await fetch(`${API}/purchase-orders/${id}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchPos(); fetchStats();
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
            <p className="text-gray-500 text-sm mt-1">Legally binding purchase documents — prices frozen after approval</p>
          </div>
          <button onClick={() => { setForm({ vendorId: '', deliveryDate: '', deliveryAddress: '', paymentTerms: '', notes: '' }); setPoItems([]); setVendorSearch(''); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New PO</button>
          <button onClick={()=>downloadExcel('/excel/purchase-orders','Purchase Orders')} className="px-3 py-2 text-sm border border-green-300 text-green-700 rounded-lg hover:bg-green-50">⬇ Excel</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Total POs', value: stats.total, color: 'bg-gray-50' },
              { label: 'Draft', value: stats.draft, color: 'bg-gray-100' },
              { label: 'Approved', value: stats.approved, color: 'bg-blue-50' },
              { label: 'Sent', value: stats.sent, color: 'bg-purple-50' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                <div className="text-2xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {stats && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-4 mb-6 text-white flex justify-between items-center">
            <div>
              <div className="text-sm opacity-80">Total PO Value</div>
              <div className="text-3xl font-bold">₹{stats.totalValue?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="text-right text-sm opacity-80">
              <div>{stats.partiallyReceived} partially received</div>
              <div>{stats.closed} closed</div>
              <div>{stats.cancelled} cancelled</div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b flex gap-3 flex-wrap">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" placeholder="Search PO number, vendor..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {['DRAFT','APPROVED','SENT','PARTIALLY_RECEIVED','CLOSED','CANCELLED'].map(s => <option key={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} POs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>{['PO No.', 'Vendor', 'PO Date', 'Delivery Date', 'Items', 'Subtotal', 'Tax', 'Total', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={10} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : pos.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-10 text-gray-400">No purchase orders found</td></tr>
                ) : pos.map(po => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-blue-600">{po.poNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{po.vendor?.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{po.vendor?.code}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{new Date(po.poDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(po.deliveryDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-600">{po._count?.items || 0}</td>
                    <td className="px-4 py-3 text-gray-700">₹{po.subtotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className="px-4 py-3 text-gray-600">₹{po.totalTax?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">₹{po.totalAmount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[po.status]}`}>{po.status}</span>
                      {po.status === 'DRAFT' && po.priceApprovalReason && (
                        <span className="ml-2 text-xs text-amber-600" title={po.priceApprovalReason}>⚠ price check</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link href={`/purchase/orders/${po.id}`} className="text-blue-600 hover:underline text-xs">View</Link>
                        {po.status === 'DRAFT' && <button onClick={() => handleAction(po.id, 'approve')} className="text-blue-600 hover:underline text-xs">Approve</button>}
                        {po.status === 'APPROVED' && <button onClick={() => handleAction(po.id, 'send')} className="text-purple-600 hover:underline text-xs">Send</button>}
                        {['DRAFT','APPROVED'].includes(po.status) && <button onClick={() => handleAction(po.id, 'cancel')} className="text-red-500 hover:underline text-xs">Cancel</button>}
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
              <span className="px-3 py-1 text-sm">{page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-lg font-bold">New Purchase Order</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 relative">
                    <label className="block text-sm text-gray-600 mb-1">Vendor *</label>
                    <input
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="Search by code or name..."
                      value={vendorSearch}
                      onChange={(e) => { setVendorSearch(e.target.value); setForm((f) => ({ ...f, vendorId: '' })); setShowVendorDropdown(true); }}
                      onFocus={() => setShowVendorDropdown(true)}
                      onBlur={() => setTimeout(() => setShowVendorDropdown(false), 150)}
                    />
                    {showVendorDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        {vendors
                          .filter((v) => !vendorSearch || `${v.code} ${v.name}`.toLowerCase().includes(vendorSearch.toLowerCase()))
                          .slice(0, 30)
                          .map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => { setForm((f) => ({ ...f, vendorId: v.id })); setVendorSearch(`${v.code} — ${v.name}`); setShowVendorDropdown(false); }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-b-0"
                            >
                              <span className="font-mono text-blue-600">{v.code}</span> — {v.name}
                            </button>
                          ))}
                        {vendors.filter((v) => !vendorSearch || `${v.code} ${v.name}`.toLowerCase().includes(vendorSearch.toLowerCase())).length === 0 && (
                          <div className="px-3 py-2 text-sm text-gray-400">No matching vendors</div>
                        )}
                        <button
                          type="button"
                          onClick={() => { setShowVendorDropdown(false); setNewVendorForm((f) => ({ ...f, code: '', name: vendorSearch && !form.vendorId ? vendorSearch : '' })); setShowAddVendorModal(true); }}
                          className="w-full text-left px-3 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 border-t"
                        >
                          + Add New Vendor
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Delivery Date *</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.deliveryDate} onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Payment Terms</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))}>
                      <option value="">— Select —</option>
                      {['NET_30','NET_45','NET_60','ADVANCE','COD'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Delivery Address</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.deliveryAddress} onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Line Items</label>
                    <button type="button" onClick={addPoItemRow} className="text-sm text-blue-600 hover:underline font-medium">+ Add Row</button>
                  </div>
                  {poItems.length === 0 && (
                    <div className="text-sm text-gray-400 border border-dashed rounded-lg p-4 text-center">No items yet - click &quot;+ Add Row&quot;</div>
                  )}
                  <div className="space-y-3">
                    {poItems.map((item, idx) => (
                      <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                        <div className="relative mb-2">
                          <input
                            className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                            placeholder="Search raw material by code or name..."
                            value={item._search}
                            onChange={(e) => { updatePoItemRow(idx, '_search', e.target.value); updatePoItemRow(idx, 'itemCode', ''); updatePoItemRow(idx, '_showDropdown', true); }}
                            onFocus={() => updatePoItemRow(idx, '_showDropdown', true)}
                            onBlur={() => setTimeout(() => updatePoItemRow(idx, '_showDropdown', false), 150)}
                          />
                          {item._showDropdown && (
                            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {rawMaterials
                                .filter((rm) => !item._search || `${rm.code} ${rm.name}`.toLowerCase().includes(item._search.toLowerCase()))
                                .slice(0, 20)
                                .map((rm) => (
                                  <button
                                    key={rm.id}
                                    type="button"
                                    onClick={() => selectRmForRow(idx, rm)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-b-0"
                                  >
                                    <span className="font-mono text-blue-600">{rm.code}</span> — {rm.name}
                                  </button>
                                ))}
                              {rawMaterials.filter((rm) => !item._search || `${rm.code} ${rm.name}`.toLowerCase().includes(item._search.toLowerCase())).length === 0 && (
                                <div className="px-3 py-2 text-sm text-gray-400">No matching raw materials</div>
                              )}
                              <button
                                type="button"
                                onClick={() => { updatePoItemRow(idx, '_showDropdown', false); setActiveRowIdx(idx); setNewRmForm({ code: '', name: item._search || '' }); setShowAddRmModal(true); }}
                                className="w-full text-left px-3 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 border-t"
                              >
                                + Add New Raw Material
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          <input className="border rounded px-2 py-1.5 text-sm bg-white" placeholder="Qty" type="number" value={item.orderedQty} onChange={(e) => updatePoItemRow(idx, 'orderedQty', e.target.value)} />
                          <input className="border rounded px-2 py-1.5 text-sm bg-white" placeholder="UOM" value={item.uom} onChange={(e) => updatePoItemRow(idx, 'uom', e.target.value)} />
                          <input className="border rounded px-2 py-1.5 text-sm bg-white" placeholder="Unit Price" type="number" value={item.unitPrice} onChange={(e) => updatePoItemRow(idx, 'unitPrice', e.target.value)} />
                          <input className="border rounded px-2 py-1.5 text-sm bg-white" placeholder="Tax %" type="number" value={item.taxRate} onChange={(e) => updatePoItemRow(idx, 'taxRate', e.target.value)} />
                          <button type="button" onClick={() => removePoItemRow(idx)} className="text-red-500 hover:text-red-700 text-sm">✕ Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-yellow-50 rounded p-3 text-xs text-yellow-700">
                  ⚠️ You can also add more items later from the PO detail page. Prices are frozen after approval.
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Creating...' : 'Create PO'}</button>
              </div>
            </div>
          </div>
        )}

        {showAddVendorModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-lg font-bold">Add New Vendor</h2>
                <button onClick={() => setShowAddVendorModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {addVendorError && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">{addVendorError}</div>}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Code *</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={newVendorForm.code} onChange={(e) => setNewVendorForm((f) => ({ ...f, code: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Name *</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={newVendorForm.name} onChange={(e) => setNewVendorForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <p className="text-xs text-gray-400">Other details (GSTIN, address, payment terms, etc.) can be filled in later from Masters → Vendors.</p>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowAddVendorModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleAddVendor} disabled={addingVendor} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{addingVendor ? 'Creating...' : 'Create & Select'}</button>
              </div>
            </div>
          </div>
        )}

        {showAddRmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-lg font-bold">Add New Raw Material</h2>
                <button onClick={() => { setShowAddRmModal(false); setActiveRowIdx(null); }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {addRmError && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">{addRmError}</div>}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Code *</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={newRmForm.code} onChange={(e) => setNewRmForm((f) => ({ ...f, code: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Name *</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={newRmForm.name} onChange={(e) => setNewRmForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <p className="text-xs text-gray-400">Other details (category, UOM, HSN, etc.) can be filled in later from Inventory → Items.</p>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => { setShowAddRmModal(false); setActiveRowIdx(null); }} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleAddRm} disabled={addingRm} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{addingRm ? 'Creating...' : 'Create & Select'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
