'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmt = n => n ? `₹${Number(n).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '₹0';

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  IQC_PENDING: 'bg-yellow-100 text-yellow-700',
  PARTIALLY_ACCEPTED: 'bg-orange-100 text-orange-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-blue-100 text-blue-700',
};

const TYPE_COLORS = {
  DOMESTIC: 'bg-purple-100 text-purple-700',
  IMPORT: 'bg-blue-100 text-blue-700',
};

export default function GrnPage() {
  const [grns, setGrns] = useState([]);
  const [stats, setStats] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [pos, setPos] = useState([]);
  const [ipos, setIpos] = useState([]);
  const [landedCosts, setLandedCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [grnType, setGrnType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({ grnType: 'IMPORT', poId: '', ipoId: '', landedCostId: '', warehouseId: '', vehicleNumber: '', dcNumber: '', invoiceNumber: '', invoiceDate: '', remarks: '' });
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (grnType) params.set('grnType', grnType);
    const [grnRes, statsRes, whRes, poRes, ipoRes] = await Promise.all([
      fetch(`${API}/grn?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/grn/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/warehouses?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/purchase-orders?status=APPROVED&limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/import-orders?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (grnRes.ok) { const d = await grnRes.json(); setGrns(d.data); setTotalPages(d.totalPages); setTotal(d.total); }
    if (statsRes.ok) setStats(await statsRes.json());
    if (whRes.ok) { const d = await whRes.json(); setWarehouses(d.data || d); }
    if (poRes.ok) { const d = await poRes.json(); setPos(d.data || []); }
    if (ipoRes.ok) { const d = await ipoRes.json(); setIpos(d.data?.filter(i => ['CUSTOMS_CLEARED','SHIPPED'].includes(i.status)) || []); }
    setLoading(false);
  }, [page, search, status, grnType]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleSourceSelect(type, id) {
    if (!id) { setItems([]); return; }
    setForm(f => ({ ...f, [type === 'IMPORT' ? 'ipoId' : 'poId']: id }));

    if (type === 'IMPORT') {
      const [ipoRes, lcRes] = await Promise.all([
        fetch(`${API}/import-orders/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${API}/landed-costs/ipo/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      ]);
      if (ipoRes.ok) {
        const ipo = await ipoRes.json();
        let lcItems = {};
        if (lcRes.ok) {
          const lcs = await lcRes.json();
          const lc = lcs[0];
          if (lc) {
            setForm(f => ({ ...f, landedCostId: lc.id }));
            lc.items?.forEach(i => { lcItems[i.ipoItemId] = i.landedCostPerUnit; });
          }
        }
        setItems((ipo.items || []).map(item => ({
          ipoItemId: item.id,
          itemCode: item.itemCode,
          itemName: item.itemName,
          uom: item.uom,
          orderedQty: item.orderedQty,
          previouslyReceived: 0,
          receivedQty: item.orderedQty,
          unitPrice: item.unitPriceInr || item.unitPriceForeign,
          landedCostPerUnit: lcItems[item.id] || 0,
          totalValue: item.orderedQty * (item.unitPriceInr || item.unitPriceForeign),
        })));
      }
    } else {
      const res = await fetch(`${API}/purchase-orders/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) {
        const po = await res.json();
        setItems((po.items || []).map(item => ({
          poItemId: item.id,
          itemCode: item.itemCode,
          itemName: item.itemName,
          uom: item.uom,
          orderedQty: item.orderedQty,
          previouslyReceived: 0,
          receivedQty: item.orderedQty,
          unitPrice: item.unitPrice,
          landedCostPerUnit: 0,
          totalValue: item.orderedQty * item.unitPrice,
        })));
      }
    }
  }

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { ...form, items: items.map(i => ({ ...i })) };
    if (!body.poId) delete body.poId;
    if (!body.ipoId) delete body.ipoId;
    if (!body.landedCostId) delete body.landedCostId;
    if (!body.vehicleNumber) delete body.vehicleNumber;
    if (!body.dcNumber) delete body.dcNumber;
    if (!body.invoiceNumber) delete body.invoiceNumber;
    if (!body.invoiceDate) delete body.invoiceDate;
    else body.invoiceDate = new Date(body.invoiceDate).toISOString();
    if (!body.remarks) delete body.remarks;
    const res = await fetch(`${API}/grn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Failed');
    setSaving(false);
  }

  async function handleSubmit(id) {
    await fetch(`${API}/grn/${id}/submit`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchAll();
  }

  const totalGrnValue = items.reduce((s, i) => s + (parseFloat(i.receivedQty) * parseFloat(i.unitPrice) || 0), 0);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Goods Receipt Note (GRN)</h1>
            <p className="text-gray-500 text-sm mt-1">Record physical receipt of goods against PO or Import PO</p>
          </div>
          <button onClick={() => { setForm({ grnType: 'IMPORT', poId: '', ipoId: '', landedCostId: '', warehouseId: '', vehicleNumber: '', dcNumber: '', invoiceNumber: '', invoiceDate: '', remarks: '' }); setItems([]); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New GRN</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total GRNs', value: stats.total, color: 'bg-gray-50' },
              { label: 'IQC Pending', value: stats.iqcPending, color: 'bg-yellow-50' },
              { label: 'Accepted', value: stats.accepted, color: 'bg-green-50' },
              { label: 'Total Value', value: fmt(stats.totalValue), color: 'bg-blue-50' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b flex gap-3 flex-wrap">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" placeholder="Search GRN number, invoice, DC..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={grnType} onChange={e => { setGrnType(e.target.value); setPage(1); }}>
              <option value="">All Types</option>
              <option value="DOMESTIC">Domestic</option>
              <option value="IMPORT">Import</option>
            </select>
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} GRNs</span>
          </div>

          <div className="space-y-0">
            {loading ? (
              <div className="text-center py-10 text-gray-400">Loading...</div>
            ) : grns.length === 0 ? (
              <div className="text-center py-10 text-gray-400">No GRNs found</div>
            ) : grns.map(grn => (
              <div key={grn.id} className="border-b last:border-b-0">
                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => setExpandedId(expandedId === grn.id ? null : grn.id)}>
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-blue-600">{grn.grnNumber}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${TYPE_COLORS[grn.grnType]}`}>{grn.grnType}</span>
                    <span className="text-gray-600 text-sm">{grn.po?.vendor?.name || grn.ipo?.vendor?.name}</span>
                    <span className="font-mono text-xs text-gray-400">{grn.po?.poNumber || grn.ipo?.ipoNumber}</span>
                    <span className="text-xs text-gray-400">{grn.warehouse?.name}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[grn.status]}`}>{grn.status?.replace(/_/g,' ')}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-gray-400">{grn._count?.items} items · {new Date(grn.receivedDate || grn.createdAt).toLocaleDateString()}</div>
                    </div>
                    {grn.status === 'DRAFT' && (
                      <button onClick={e => { e.stopPropagation(); handleSubmit(grn.id); }} className="px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600">Submit for IQC</button>
                    )}
                    <span className="text-gray-400 text-xs">{expandedId === grn.id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {expandedId === grn.id && (
                  <div className="px-4 pb-4 bg-gray-50 border-t">
                    <div className="grid grid-cols-4 gap-3 py-3 text-xs text-gray-600 mb-3">
                      {grn.dcNumber && <div><span className="font-medium">DC:</span> {grn.dcNumber}</div>}
                      {grn.invoiceNumber && <div><span className="font-medium">Invoice:</span> {grn.invoiceNumber}</div>}
                      {grn.vehicleNumber && <div><span className="font-medium">Vehicle:</span> {grn.vehicleNumber}</div>}
                      <div><span className="font-medium">Received:</span> {new Date(grn.receivedDate || grn.createdAt).toLocaleDateString()}</div>
                    </div>
                    <table className="w-full text-xs">
                      <thead className="bg-white text-gray-500 uppercase">
                        <tr>{['Item Code','Item Name','UOM','Ordered','Received','Accepted','Rejected','Unit Price','LC/Unit','Total Value'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {grn.items?.map(item => (
                          <tr key={item.id} className="bg-white">
                            <td className="px-3 py-2 font-mono text-blue-600">{item.itemCode}</td>
                            <td className="px-3 py-2">{item.itemName}</td>
                            <td className="px-3 py-2 text-gray-500">{item.uom}</td>
                            <td className="px-3 py-2">{item.orderedQty}</td>
                            <td className="px-3 py-2 font-medium">{item.receivedQty}</td>
                            <td className="px-3 py-2 text-green-600">{item.acceptedQty}</td>
                            <td className="px-3 py-2 text-red-500">{item.rejectedQty}</td>
                            <td className="px-3 py-2">{fmt(item.unitPrice)}</td>
                            <td className="px-3 py-2 text-orange-600">{item.landedCostPerUnit ? fmt(item.landedCostPerUnit) : '—'}</td>
                            <td className="px-3 py-2 font-bold">{fmt(item.totalValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="p-4 border-t flex justify-center gap-2">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button>
              <span className="px-3 py-1 text-sm">{page} of {totalPages}</span>
              <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white z-10">
                <h2 className="text-lg font-bold">New Goods Receipt Note</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">GRN Type *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.grnType} onChange={e => { setForm(f => ({ ...f, grnType: e.target.value, poId: '', ipoId: '', landedCostId: '' })); setItems([]); }}>
                      <option value="IMPORT">Import</option>
                      <option value="DOMESTIC">Domestic</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">{form.grnType === 'IMPORT' ? 'Import PO' : 'Purchase Order'} *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.grnType === 'IMPORT' ? form.ipoId : form.poId} onChange={e => handleSourceSelect(form.grnType, e.target.value)}>
                      <option value="">— Select —</option>
                      {form.grnType === 'IMPORT'
                        ? ipos.map(i => <option key={i.id} value={i.id}>{i.ipoNumber} — {i.vendor?.name}</option>)
                        : pos.map(p => <option key={p.id} value={p.id}>{p.poNumber} — {p.vendor?.name}</option>)
                      }
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Warehouse *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.warehouseId} onChange={e => setForm(f => ({ ...f, warehouseId: e.target.value }))}>
                      <option value="">— Select Warehouse —</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Vehicle Number</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.vehicleNumber} onChange={e => setForm(f => ({ ...f, vehicleNumber: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">DC Number</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.dcNumber} onChange={e => setForm(f => ({ ...f, dcNumber: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Invoice Number</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.invoiceNumber} onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))} />
                  </div>
                </div>

                {items.length > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-gray-700">Items to Receive</h3>
                      <span className="text-sm text-gray-500">Total: <strong>{fmt(totalGrnValue)}</strong></span>
                    </div>
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 text-gray-500 uppercase">
                          <tr>{['Item Code','Item Name','UOM','Ordered','Received Qty','Unit Price','LC/Unit','Total'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {items.map((item, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 font-mono text-blue-600">{item.itemCode}</td>
                              <td className="px-3 py-2">{item.itemName}</td>
                              <td className="px-3 py-2 text-gray-500">{item.uom}</td>
                              <td className="px-3 py-2">{item.orderedQty}</td>
                              <td className="px-3 py-2">
                                <input type="number" className="w-20 border rounded px-2 py-1 text-xs" value={item.receivedQty}
                                  onChange={e => { const v = parseFloat(e.target.value)||0; setItems(prev => prev.map((it,i) => i===idx ? {...it, receivedQty: v, totalValue: v*it.unitPrice} : it)); }} />
                              </td>
                              <td className="px-3 py-2">{fmt(item.unitPrice)}</td>
                              <td className="px-3 py-2 text-orange-600">{item.landedCostPerUnit ? fmt(item.landedCostPerUnit) : '—'}</td>
                              <td className="px-3 py-2 font-bold">{fmt(item.receivedQty * item.unitPrice)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={handleCreate} disabled={saving || items.length === 0} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Creating...' : 'Create GRN'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
