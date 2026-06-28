'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmt = n => n ? `₹${Number(n).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '₹0';
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';
const fmtDateTime = d => d ? new Date(d).toLocaleString('en-IN') : '—';

const TX_COLORS = {
  IQC_ACCEPT: 'text-green-600', IQC_REJECT: 'text-red-500',
  ISSUE: 'text-orange-600', TRANSFER_IN: 'text-blue-600',
  TRANSFER_OUT: 'text-purple-600', ADJUSTMENT: 'text-yellow-600',
  OPENING: 'text-gray-600',
};

const TABS = ['Ledger','Balance Summary','Item Card','Batch Movements','Consumption'];

export default function StockReportsPage() {
  const [activeTab, setActiveTab] = useState('Ledger');
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  // Filters
  const [warehouseId, setWarehouseId] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [txType, setTxType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch(`${API}/warehouses?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : {}).then(d => { const list = d.data || d; setWarehouses(Array.isArray(list) ? list : []); });
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true); setData(null);
    const params = new URLSearchParams({ page, limit: 50 });
    if (warehouseId) params.set('warehouseId', warehouseId);
    if (itemCode) params.set('itemCode', itemCode);
    if (txType) params.set('transactionType', txType);
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    if (search) params.set('search', search);

    let url = '';
    if (activeTab === 'Ledger') url = `${API}/stock-reports/ledger?${params}`;
    else if (activeTab === 'Balance Summary') url = `${API}/stock-reports/balance-summary?${params}`;
    else if (activeTab === 'Item Card') { if (!itemCode) { setLoading(false); return; } url = `${API}/stock-reports/item-card/${itemCode}?${params}`; }
    else if (activeTab === 'Batch Movements') url = `${API}/stock-reports/batch-movements?${params}`;
    else if (activeTab === 'Consumption') url = `${API}/stock-reports/consumption?${params}`;

    const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [activeTab, warehouseId, itemCode, txType, fromDate, toDate, search, page]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const TX_TYPES = ['IQC_ACCEPT','IQC_REJECT','ISSUE','TRANSFER_IN','TRANSFER_OUT','ADJUSTMENT','OPENING'];

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Stock Ledger Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Movement history, balance summary, item cards and consumption analysis</p>
        </div>

        <div className="flex gap-2 mb-6 border-b">
          {TABS.map(t => (
            <button key={t} onClick={() => { setActiveTab(t); setPage(1); setData(null); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab===t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border p-4 mb-4 flex gap-3 flex-wrap">
          <select className="border rounded-lg px-3 py-2 text-sm" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
            <option value="">All Warehouses</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          {['Ledger','Item Card','Batch Movements','Consumption'].includes(activeTab) && (
            <input className="border rounded-lg px-3 py-2 text-sm w-40" placeholder="Item Code" value={itemCode} onChange={e => setItemCode(e.target.value)} />
          )}
          {activeTab === 'Ledger' && (
            <select className="border rounded-lg px-3 py-2 text-sm" value={txType} onChange={e => setTxType(e.target.value)}>
              <option value="">All Types</option>
              {TX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          {['Ledger','Item Card','Consumption'].includes(activeTab) && (
            <>
              <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={fromDate} onChange={e => setFromDate(e.target.value)} />
              <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={toDate} onChange={e => setToDate(e.target.value)} />
            </>
          )}
          {activeTab === 'Balance Summary' && (
            <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search item code or name..." value={search} onChange={e => setSearch(e.target.value)} />
          )}
          <button onClick={fetchReport} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Apply</button>
        </div>

        {loading && <div className="text-center py-12 text-gray-400">Loading report...</div>}

        {!loading && data && activeTab === 'Ledger' && (
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b flex justify-between">
              <span className="font-semibold text-gray-700">Stock Ledger — {data.total} movements</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>{['Date','Type','Item Code','Item Name','Warehouse','IN Qty','OUT Qty','Balance','Unit Cost','Reference','Remarks'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {data.data.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-500">{fmtDateTime(m.transactionDate)}</td>
                      <td className={`px-3 py-2 text-xs font-medium ${TX_COLORS[m.transactionType] || 'text-gray-600'}`}>{m.transactionType?.replace(/_/g,' ')}</td>
                      <td className="px-3 py-2 font-mono text-xs text-blue-600">{m.itemCode}</td>
                      <td className="px-3 py-2 text-xs">{m.itemName}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{m.warehouse?.name}</td>
                      <td className="px-3 py-2 text-xs font-bold text-green-600">{m.inQty > 0 ? '+'+m.inQty : '—'}</td>
                      <td className="px-3 py-2 text-xs font-bold text-red-500">{m.outQty > 0 ? '-'+m.outQty : '—'}</td>
                      <td className="px-3 py-2 text-xs font-bold">{m.balanceQty}</td>
                      <td className="px-3 py-2 text-xs">{fmt(m.unitCost)}</td>
                      <td className="px-3 py-2 text-xs font-mono text-gray-500">{m.referenceNumber || '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-400">{m.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.totalPages > 1 && (
              <div className="p-4 border-t flex justify-center gap-2">
                <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button>
                <span className="px-3 py-1 text-sm">{page} of {data.totalPages}</span>
                <button disabled={page===data.totalPages} onClick={() => setPage(p=>p+1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
              </div>
            )}
          </div>
        )}

        {!loading && data && activeTab === 'Balance Summary' && (
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b flex gap-6">
              <div className="text-center"><div className="text-xl font-bold text-gray-800">{data.totalItems}</div><div className="text-xs text-gray-500">Total Items</div></div>
              <div className="text-center"><div className="text-xl font-bold text-green-600">{fmt(data.totalValue)}</div><div className="text-xs text-gray-500">Total Value</div></div>
              <div className="text-center"><div className="text-xl font-bold text-red-500">{data.lowStockItems}</div><div className="text-xs text-gray-500">Low Stock (≤10)</div></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>{['Item Code','Item Name','Warehouse','Available Qty','Reserved','UOM','Unit Cost','Stock Value'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {data.data.map(b => (
                    <tr key={b.id} className={`hover:bg-gray-50 ${b.availableQty <= 10 ? 'bg-red-50' : ''}`}>
                      <td className="px-3 py-2 font-mono text-xs text-blue-600">{b.itemCode}</td>
                      <td className="px-3 py-2 text-xs">{b.itemName}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{b.warehouse?.name}</td>
                      <td className={`px-3 py-2 text-xs font-bold ${b.availableQty <= 10 ? 'text-red-600' : 'text-green-700'}`}>{b.availableQty}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{b.reservedQty || 0}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{b.uom}</td>
                      <td className="px-3 py-2 text-xs">{fmt(b.unitCost)}</td>
                      <td className="px-3 py-2 text-xs font-bold">{fmt(b.availableQty * b.unitCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && data && activeTab === 'Item Card' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Total IN', value: data.summary?.totalIn, color: 'bg-green-50 text-green-700' },
                { label: 'Total OUT', value: data.summary?.totalOut, color: 'bg-red-50 text-red-600' },
                { label: 'Net Movement', value: data.summary?.netMovement, color: 'bg-blue-50 text-blue-700' },
                { label: 'Current Balance', value: data.summary?.currentBalance, color: 'bg-gray-50 text-gray-700' },
              ].map(s => (
                <div key={s.label} className={`${s.color} rounded-xl p-4 text-center`}>
                  <div className="text-xl font-bold">{s.value}</div>
                  <div className="text-xs mt-1 opacity-70">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b font-semibold text-gray-700">Movement History — {data.itemCode}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>{['Date','Type','Warehouse','IN','OUT','Running Balance','Reference'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.movements.map(m => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs text-gray-500">{fmtDate(m.transactionDate)}</td>
                        <td className={`px-3 py-2 text-xs font-medium ${TX_COLORS[m.transactionType] || 'text-gray-600'}`}>{m.transactionType?.replace(/_/g,' ')}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{m.warehouse?.name}</td>
                        <td className="px-3 py-2 text-xs font-bold text-green-600">{m.inQty > 0 ? '+'+m.inQty : '—'}</td>
                        <td className="px-3 py-2 text-xs font-bold text-red-500">{m.outQty > 0 ? '-'+m.outQty : '—'}</td>
                        <td className="px-3 py-2 text-xs font-bold">{m.runningBalance}</td>
                        <td className="px-3 py-2 text-xs font-mono text-gray-500">{m.referenceNumber || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!loading && data && activeTab === 'Batch Movements' && (
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b font-semibold text-gray-700">Batch Movements — {data.total} batches</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>{['Batch No.','Lot No.','Item Code','Item Name','Warehouse','Received','Expiry','Original','Available','Status'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {data.data.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs text-blue-600">{b.batchNumber}</td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-500">{b.lotNumber || '—'}</td>
                      <td className="px-3 py-2 font-mono text-xs">{b.itemCode}</td>
                      <td className="px-3 py-2 text-xs">{b.itemName}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{b.warehouse?.name}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{fmtDate(b.receivedDate)}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{fmtDate(b.expiryDate)}</td>
                      <td className="px-3 py-2 text-xs">{b.originalQty}</td>
                      <td className="px-3 py-2 text-xs font-bold text-green-700">{b.availableQty}</td>
                      <td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs font-medium ${b.status==='ACTIVE' ? 'bg-green-100 text-green-700' : b.status==='EXPIRED' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>{b.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && data && activeTab === 'Consumption' && (
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b flex gap-6">
              <div><span className="font-semibold text-gray-700">Consumption Report</span></div>
              <div className="text-center"><div className="text-lg font-bold text-orange-600">{data.totalItems}</div><div className="text-xs text-gray-500">Items Consumed</div></div>
              <div className="text-center"><div className="text-lg font-bold text-red-600">{fmt(data.totalValue)}</div><div className="text-xs text-gray-500">Total Value</div></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>{['Item Code','Item Name','Issues','Total Qty Issued','Total Value'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {data.data.map((c,i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs text-blue-600">{c.itemCode}</td>
                      <td className="px-3 py-2 text-xs">{c.itemName}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{c.transactions}</td>
                      <td className="px-3 py-2 font-bold text-orange-600">{c.totalQty?.toLocaleString()}</td>
                      <td className="px-3 py-2 font-bold">{fmt(c.totalValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && !data && activeTab === 'Item Card' && (
          <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-12 text-center text-gray-400">
            Enter an item code above and click Apply to view item card
          </div>
        )}
      </div>
    </AppLayout>
  );
}
