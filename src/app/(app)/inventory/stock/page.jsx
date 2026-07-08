'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmt = n => n ? `₹${Number(n).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '₹0';
const fmtQty = n => Number(n || 0).toLocaleString(undefined,{maximumFractionDigits:2});

const TXN_COLORS = {
  IQC_ACCEPT: 'bg-green-100 text-green-700',
  IQC_REJECT: 'bg-red-100 text-red-600',
  ISSUE: 'bg-orange-100 text-orange-700',
  TRANSFER_IN: 'bg-blue-100 text-blue-700',
  TRANSFER_OUT: 'bg-purple-100 text-purple-700',
  ADJUSTMENT: 'bg-gray-100 text-gray-600',
  GRN_RECEIPT: 'bg-teal-100 text-teal-700',
};

export default function StockPage() {
  const [tab, setTab] = useState('balance');
  const [balance, setBalance] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [stats, setStats] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [txnType, setTxnType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemLedger, setItemLedger] = useState([]);
  const [approvedIqcs, setApprovedIqcs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [receiveMsg, setReceiveMsg] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const balParams = new URLSearchParams({ page, limit: 50 });
    if (search) balParams.set('search', search);
    if (warehouseId) balParams.set('warehouseId', warehouseId);
    const ledParams = new URLSearchParams({ page, limit: 20 });
    if (warehouseId) ledParams.set('warehouseId', warehouseId);
    if (txnType) ledParams.set('transactionType', txnType);

    const [balRes, ledRes, statsRes, whRes, iqcRes] = await Promise.all([
      fetch(`${API}/stock-ledger/balance?${balParams}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/stock-ledger?${ledParams}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/stock-ledger/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/warehouses?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/iqc?status=APPROVED&limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (balRes.ok) { const d = await balRes.json(); setBalance(d.data); if (tab==='balance') { setTotalPages(d.totalPages); setTotal(d.total); } }
    if (ledRes.ok) { const d = await ledRes.json(); setLedger(d.data); if (tab==='ledger') { setTotalPages(d.totalPages); setTotal(d.total); } }
    if (statsRes.ok) setStats(await statsRes.json());
    if (whRes.ok) { const d = await whRes.json(); setWarehouses(d.data || d); }
    if (iqcRes.ok) { const d = await iqcRes.json(); setApprovedIqcs(d.data || []); }
    setLoading(false);
  }, [page, search, warehouseId, txnType, tab]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleReceive(iqcId) {
    setSaving(true); setReceiveMsg('');
    const res = await fetch(`${API}/stock-ledger/receive/${iqcId}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    const data = await res.json();
    if (res.ok) { setReceiveMsg(data.message); fetchAll(); }
    else setReceiveMsg(data.message || 'Failed');
    setSaving(false);
  }

  async function handleItemClick(itemCode) {
    setSelectedItem(itemCode);
    const res = await fetch(`${API}/stock-ledger/item/${itemCode}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setItemLedger(await res.json());
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock Ledger</h1>
            <p className="text-gray-500 text-sm mt-1">Real-time inventory balance and movement history</p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Items In Stock', value: stats.totalItems, color: 'bg-blue-50' },
              { label: 'Total Movements', value: stats.totalMovements, color: 'bg-gray-50' },
              { label: 'Total Inventory Value', value: fmt(stats.totalValue), color: 'bg-green-50' },
              { label: 'IQC Ready to Receive', value: approvedIqcs.length, color: 'bg-yellow-50' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {approvedIqcs.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="text-sm font-semibold text-yellow-800 mb-3">📦 IQC Approved — Ready to receive into stock</div>
            {receiveMsg && <div className="text-xs text-green-600 mb-2">{receiveMsg}</div>}
            <div className="space-y-2">
              {approvedIqcs.map(iqc => (
                <div key={iqc.id} className="flex items-center justify-between bg-white rounded p-3 border">
                  <div>
                    <span className="font-mono text-sm font-bold text-blue-600">{iqc.iqcNumber}</span>
                    <span className="ml-3 text-xs text-gray-500">GRN: {iqc.grn?.grnNumber} · {iqc.grn?.warehouse?.name}</span>
                    <span className="ml-3 text-xs text-gray-400">{iqc._count?.items} items</span>
                  </div>
                  <button onClick={() => handleReceive(iqc.id)} disabled={saving} className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                    {saving ? 'Receiving...' : 'Receive Stock'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b flex">
            {['balance', 'ledger'].map(t => (
              <button key={t} onClick={() => { setTab(t); setPage(1); }} className={`px-6 py-3 text-sm font-medium capitalize ${tab===t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>{t === 'balance' ? 'Stock Balance' : 'Movement Ledger'}</button>
            ))}
          </div>

          <div className="p-4 border-b flex gap-3 flex-wrap">
            {tab === 'balance' && <input className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" placeholder="Search item code or name..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />}
            {tab === 'ledger' && (
              <select className="border rounded-lg px-3 py-2 text-sm" value={txnType} onChange={e => { setTxnType(e.target.value); setPage(1); }}>
                <option value="">All Types</option>
                {Object.keys(TXN_COLORS).map(t => <option key={t}>{t}</option>)}
              </select>
            )}
            <select className="border rounded-lg px-3 py-2 text-sm" value={warehouseId} onChange={e => { setWarehouseId(e.target.value); setPage(1); }}>
              <option value="">All Warehouses</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} {tab === 'balance' ? 'items' : 'entries'}</span>
          </div>

          {tab === 'balance' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                  <tr>{['Item Code','Item Name','Warehouse','Available Qty','Reserved','In QC','Unit Cost','Total Value','Last Updated'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={9} className="text-center py-10 text-gray-400">Loading...</td></tr>
                  ) : balance.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-10 text-gray-400">No stock found</td></tr>
                  ) : balance.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleItemClick(b.itemCode)}>
                      <td className="px-4 py-3 font-mono font-bold text-blue-600">{b.itemCode}</td>
                      <td className="px-4 py-3 text-gray-800">{b.itemName}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{b.warehouse?.name}</td>
                      <td className="px-4 py-3 font-bold text-green-700">{fmtQty(b.availableQty)}</td>
                      <td className="px-4 py-3 text-orange-600">{fmtQty(b.reservedQty)}</td>
                      <td className="px-4 py-3 text-yellow-600">{fmtQty(b.inQcQty)}</td>
                      <td className="px-4 py-3">{fmt(b.unitCost)}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{fmt(b.totalValue)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{new Date(b.lastUpdated).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'ledger' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                  <tr>{['Date','Type','Item Code','Warehouse','Reference','In Qty','Out Qty','Balance','Unit Cost','Total Cost'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={10} className="text-center py-10 text-gray-400">Loading...</td></tr>
                  ) : ledger.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-10 text-gray-400">No movements found</td></tr>
                  ) : ledger.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs text-gray-500">{new Date(l.transactionDate || l.createdAt).toLocaleDateString()}</td>
                      <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${TXN_COLORS[l.transactionType] || 'bg-gray-100 text-gray-600'}`}>{l.transactionType?.replace(/_/g,' ')}</span></td>
                      <td className="px-3 py-3 font-mono text-blue-600 text-xs">{l.itemCode}</td>
                      <td className="px-3 py-3 text-xs text-gray-500">{l.warehouse?.name}</td>
                      <td className="px-3 py-3 font-mono text-xs text-gray-500">{l.referenceNumber || '—'}</td>
                      <td className="px-3 py-3 text-green-600 font-medium">{l.inQty > 0 ? fmtQty(l.inQty) : '—'}</td>
                      <td className="px-3 py-3 text-red-500 font-medium">{l.outQty > 0 ? fmtQty(l.outQty) : '—'}</td>
                      <td className="px-3 py-3 font-bold">{fmtQty(l.balanceQty)}</td>
                      <td className="px-3 py-3 text-xs">{fmt(l.unitCost)}</td>
                      <td className="px-3 py-3 text-xs">{fmt(l.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="p-4 border-t flex justify-center gap-2">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button>
              <span className="px-3 py-1 text-sm">{page} of {totalPages}</span>
              <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </div>

        {selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold">Item Ledger — <span className="font-mono text-blue-600">{selectedItem}</span></h2>
                <button onClick={() => setSelectedItem(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>{['Date','Type','Reference','In','Out','Balance','Cost/Unit'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {itemLedger.map(l => (
                      <tr key={l.id}>
                        <td className="px-3 py-2 text-xs text-gray-500">{new Date(l.createdAt).toLocaleDateString()}</td>
                        <td className="px-3 py-2"><span className={`px-2 py-1 rounded text-xs ${TXN_COLORS[l.transactionType]}`}>{l.transactionType?.replace(/_/g,' ')}</span></td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-400">{l.referenceNumber || '—'}</td>
                        <td className="px-3 py-2 text-green-600">{l.inQty > 0 ? fmtQty(l.inQty) : '—'}</td>
                        <td className="px-3 py-2 text-red-500">{l.outQty > 0 ? fmtQty(l.outQty) : '—'}</td>
                        <td className="px-3 py-2 font-bold">{fmtQty(l.balanceQty)}</td>
                        <td className="px-3 py-2 text-xs">{fmt(l.unitCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
