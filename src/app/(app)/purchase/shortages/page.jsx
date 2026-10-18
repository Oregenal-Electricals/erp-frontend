'use client';
import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
function fmt(n) { return new Intl.NumberFormat('en-IN').format(n || 0); }

export default function MaterialShortagesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});
  const [selected, setSelected] = useState({}); // { itemCode: qty }
  const [showModal, setShowModal] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState({ vendorId: '', deliveryDate: '' });
  const [items, setItems] = useState([]); // [{ itemCode, itemName, uom, qty, unitPrice }]
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // --- Vendor searchable combobox state ---
  const [vendorQuery, setVendorQuery] = useState('');
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [showNewVendorForm, setShowNewVendorForm] = useState(false);
  const [newVendorCode, setNewVendorCode] = useState('');
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorError, setNewVendorError] = useState('');
  const [newVendorSaving, setNewVendorSaving] = useState(false);
  const vendorBoxRef = useRef(null);

  const fetchVendors = useCallback(async () => {
    const res = await fetch(`${API}/vendors?limit=200&isActive=true`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) { const d = await res.json(); setVendors(d.data || []); }
  }, []);
  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  // Close the vendor dropdown when clicking outside it
  useEffect(() => {
    function handleClickOutside(e) {
      if (vendorBoxRef.current && !vendorBoxRef.current.contains(e.target)) {
        setVendorDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredVendors = vendorQuery.trim()
    ? vendors.filter(v =>
        v.name.toLowerCase().includes(vendorQuery.trim().toLowerCase()) ||
        (v.code || '').toLowerCase().includes(vendorQuery.trim().toLowerCase())
      )
    : vendors;

  function selectVendor(v) {
    setForm(f => ({ ...f, vendorId: v.id }));
    setVendorQuery(v.name);
    setVendorDropdownOpen(false);
    setShowNewVendorForm(false);
  }

  function openNewVendorForm() {
    setNewVendorName(vendorQuery.trim());
    setNewVendorCode('');
    setNewVendorError('');
    setShowNewVendorForm(true);
  }

  async function handleCreateVendor() {
    setNewVendorError('');
    if (!newVendorCode.trim() || !newVendorName.trim()) {
      setNewVendorError('Vendor Code and Name are both required.');
      return;
    }
    setNewVendorSaving(true);
    try {
      const res = await fetch(`${API}/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ code: newVendorCode.trim(), name: newVendorName.trim() }),
      });
      const created = await res.json();
      if (!res.ok) {
        setNewVendorError(created.message || 'Failed to create vendor.');
        setNewVendorSaving(false);
        return;
      }
      setVendors(prev => [created, ...prev]);
      setForm(f => ({ ...f, vendorId: created.id }));
      setVendorQuery(created.name);
      setShowNewVendorForm(false);
      setVendorDropdownOpen(false);
      setNewVendorSaving(false);
    } catch (e) {
      setNewVendorError('Something went wrong creating the vendor.');
      setNewVendorSaving(false);
    }
  }

  function toggleSelect(item, checked) {
    setSelected(prev => {
      const next = { ...prev };
      if (checked) next[item.itemCode] = item.totalShortageQty;
      else delete next[item.itemCode];
      return next;
    });
  }

  function openCreatePo() {
    const selectedItems = data.data.filter(d => selected[d.itemCode] !== undefined);
    setItems(selectedItems.map(d => ({ itemCode: d.itemCode, itemName: d.itemName, uom: d.uom, qty: selected[d.itemCode], unitPrice: '' })));
    setForm({ vendorId: '', deliveryDate: '' });
    setVendorQuery('');
    setVendorDropdownOpen(false);
    setShowNewVendorForm(false);
    setModalError('');
    setShowModal(true);
  }

  async function handleCreatePo() {
    setModalError('');
    if (!form.vendorId || !form.deliveryDate) { setModalError('Vendor and Delivery Date are required.'); return; }
    if (items.some(i => !i.unitPrice || Number(i.unitPrice) <= 0)) { setModalError('Enter a unit price for every item.'); return; }
    setSaving(true);
    try {
      const poRes = await fetch(`${API}/purchase-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ vendorId: form.vendorId, deliveryDate: new Date(form.deliveryDate).toISOString() }),
      });
      const po = await poRes.json();
      if (!poRes.ok) { setModalError(po.message || 'Failed to create PO'); setSaving(false); return; }

      for (const item of items) {
        await fetch(`${API}/purchase-orders/${po.id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({
            itemCode: item.itemCode, itemName: item.itemName, uom: item.uom,
            orderedQty: Number(item.qty), unitPrice: Number(item.unitPrice),
            discount: 0, taxRate: 18,
          }),
        });
      }

      await fetch(`${API}/customer-po/shortages/mark-raised`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ itemCodes: items.map(i => i.itemCode), poId: po.id }),
      });

      window.location.href = `/purchase/orders/${po.id}`;
    } catch (e) {
      setModalError('Something went wrong creating the PO.');
      setSaving(false);
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/customer-po/shortages/open`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) { const d = await res.json(); setError(d.message || 'Failed to load shortages'); setLoading(false); return; }
      setData(await res.json());
    } catch (e) {
      setError('Failed to load shortages - please try again.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function toggle(itemCode) {
    setExpanded(prev => ({ ...prev, [itemCode]: !prev[itemCode] }));
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Material Shortages</h1>
        <p className="text-gray-500 text-sm mt-1">Everything currently outstanding across all open Customer POs, grouped by item - what Purchase needs to buy, and how much.</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm font-medium">{error}</div>}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : !data || data.totalItemsShort === 0 ? (
        <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-600 font-medium">No open material shortages right now.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border shadow-sm p-5 flex gap-8 mb-6 items-center">
            <div>
              <div className="text-2xl font-bold text-red-600">{data.totalItemsShort}</div>
              <div className="text-xs text-gray-400">Items Short</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-700">{data.totalShortageRecords}</div>
              <div className="text-xs text-gray-400">Shortage Records</div>
            </div>
            <div className="flex-1" />
            {Object.keys(selected).length > 0 && (
              <button onClick={openCreatePo} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm">
                + Create PO from Selected ({Object.keys(selected).length})
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  {['', 'Item Code', 'Item Name', 'Total Shortage', 'UOM', 'Orders Affected', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.data.map((item) => (
                  <Fragment key={item.itemCode}>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selected[item.itemCode] !== undefined} onChange={e => toggleSelect(item, e.target.checked)} />
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-700 cursor-pointer" onClick={() => toggle(item.itemCode)}>{item.itemCode}</td>
                      <td className="px-4 py-3 text-gray-600 cursor-pointer" onClick={() => toggle(item.itemCode)}>{item.itemName}</td>
                      <td className="px-4 py-3 font-bold text-red-600 cursor-pointer" onClick={() => toggle(item.itemCode)}>{fmt(item.totalShortageQty)}</td>
                      <td className="px-4 py-3 text-gray-500 cursor-pointer" onClick={() => toggle(item.itemCode)}>{item.uom}</td>
                      <td className="px-4 py-3 text-gray-500 cursor-pointer" onClick={() => toggle(item.itemCode)}>{item.affectedOrders.length} order(s)</td>
                      <td className="px-4 py-3 text-indigo-600 text-xs cursor-pointer" onClick={() => toggle(item.itemCode)}>{expanded[item.itemCode] ? '▲ Hide' : '▼ Details'}</td>
                    </tr>
                    {expanded[item.itemCode] && (
                      <tr className="bg-gray-50 border-b">
                        <td colSpan={7} className="px-6 py-3">
                          <table className="w-full text-xs">
                            <thead className="text-gray-400">
                              <tr>{['CPO Number', 'Customer', 'Delivery Date', 'Shortage Qty'].map(h => <th key={h} className="text-left py-1 pr-4">{h}</th>)}</tr>
                            </thead>
                            <tbody>
                              {item.affectedOrders.map((o) => (
                                <tr key={o.shortageId} className="text-gray-600">
                                  <td className="py-1 pr-4 font-mono">{o.cpoNumber}</td>
                                  <td className="py-1 pr-4">{o.customerName}</td>
                                  <td className="py-1 pr-4">{o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : '-'}</td>
                                  <td className="py-1 pr-4 font-semibold">{fmt(o.shortageQty)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">Create Purchase Order from Shortage</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {modalError && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">{modalError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div ref={vendorBoxRef} className="relative">
                  <label className="block text-sm text-gray-600 mb-1">Vendor *</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Type to search vendor..."
                    value={vendorQuery}
                    onFocus={() => setVendorDropdownOpen(true)}
                    onChange={e => {
                      setVendorQuery(e.target.value);
                      setVendorDropdownOpen(true);
                      setShowNewVendorForm(false);
                      if (form.vendorId) setForm(f => ({ ...f, vendorId: '' }));
                    }}
                  />
                  {vendorDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                      {!showNewVendorForm ? (
                        <>
                          {filteredVendors.length > 0 ? (
                            filteredVendors.map(v => (
                              <div
                                key={v.id}
                                className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                                onClick={() => selectVendor(v)}
                              >
                                <span className="font-medium">{v.name}</span>
                                <span className="text-gray-400 ml-2 text-xs font-mono">{v.code}</span>
                              </div>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-400">No vendor found.</div>
                          )}
                          <div
                            className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 cursor-pointer border-t font-medium"
                            onClick={openNewVendorForm}
                          >
                            + Add New Vendor{vendorQuery.trim() ? ` "${vendorQuery.trim()}"` : ''}
                          </div>
                        </>
                      ) : (
                        <div className="p-3 space-y-2">
                          <div className="text-xs font-semibold text-gray-500 mb-1">Create New Vendor</div>
                          {newVendorError && <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{newVendorError}</div>}
                          <div>
                            <label className="block text-xs text-gray-500 mb-0.5">Vendor Code *</label>
                            <input
                              type="text"
                              className="w-full border rounded px-2 py-1.5 text-sm"
                              value={newVendorCode}
                              onChange={e => setNewVendorCode(e.target.value)}
                              placeholder="e.g. VEND001"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-0.5">Vendor Name *</label>
                            <input
                              type="text"
                              className="w-full border rounded px-2 py-1.5 text-sm"
                              value={newVendorName}
                              onChange={e => setNewVendorName(e.target.value)}
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setShowNewVendorForm(false)}
                              className="px-3 py-1.5 text-xs border rounded text-gray-600 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleCreateVendor}
                              disabled={newVendorSaving}
                              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              {newVendorSaving ? 'Saving...' : 'Save Vendor'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Delivery Date *</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.deliveryDate} onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">Items (auto-filled from selected shortages)</label>
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>{['Item Code', 'Item Name', 'UOM', 'Qty', 'Unit Price'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.itemCode} className="border-t">
                        <td className="px-3 py-2 font-mono">{item.itemCode}</td>
                        <td className="px-3 py-2">{item.itemName}</td>
                        <td className="px-3 py-2">{item.uom}</td>
                        <td className="px-3 py-2">
                          <input type="number" className="w-24 border rounded px-2 py-1" value={item.qty}
                            onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, qty: e.target.value } : it))} />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" step="0.01" placeholder="0.00" className="w-24 border rounded px-2 py-1" value={item.unitPrice}
                            onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, unitPrice: e.target.value } : it))} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreatePo} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Creating...' : 'Create Purchase Order'}</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
