'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmt = n => n ? `₹${Number(n).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '₹0';
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const TABS = ['Stock Register','GRN Register','Issue Register','Transfer Register','ABC Analysis'];
const ABC_COLORS = { A: 'bg-green-100 text-green-700', B: 'bg-yellow-100 text-yellow-700', C: 'bg-gray-100 text-gray-500' };

export default function InventoryReportsPage() {
  const [activeTab, setActiveTab] = useState('Stock Register');
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [warehouseId, setWarehouseId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [refType, setRefType] = useState('');

  useEffect(() => {
    fetch(`${API}/warehouses?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : {}).then(d => { const list = d.data || d; setWarehouses(Array.isArray(list) ? list : []); });
  }, []);

  async function fetchData() {
    setLoading(true); setData(null);
    const params = new URLSearchParams();
    if (warehouseId) params.set('warehouseId', warehouseId);
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (refType) params.set('referenceType', refType);

    const endpoints = {
      'Stock Register': 'stock-register',
      'GRN Register': 'grn-register',
      'Issue Register': 'issue-register',
      'Transfer Register': 'transfer-register',
      'ABC Analysis': 'abc-analysis',
    };
    const res = await fetch(`${API}/inventory-reports/${endpoints[activeTab]}?${params}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [activeTab, warehouseId]);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Inventory Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Stock register, GRN/Issue/Transfer registers and ABC analysis</p>
        </div>

        <div className="flex gap-2 mb-6 border-b overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => { setActiveTab(t); setData(null); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${activeTab===t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border p-4 mb-4 flex gap-3 flex-wrap items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Warehouse</label>
            <select className="border rounded-lg px-3 py-2 text-sm" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
              <option value="">All Warehouses</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          {['Stock Register'].includes(activeTab) && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Search</label>
              <input className="border rounded-lg px-3 py-2 text-sm w-48" placeholder="Item code or name..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          )}
          {['GRN Register','Issue Register','Transfer Register'].includes(activeTab) && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">From Date</label>
                <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={fromDate} onChange={e => setFromDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To Date</label>
                <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={toDate} onChange={e => setToDate(e.target.value)} />
              </div>
            </>
          )}
          {activeTab === 'GRN Register' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="">All</option>
                {['DRAFT','SUBMITTED','PARTIALLY_ACCEPTED','ACCEPTED'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}
          {activeTab === 'Issue Register' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Reference Type</label>
              <select className="border rounded-lg px-3 py-2 text-sm" value={refType} onChange={e => setRefType(e.target.value)}>
                <option value="">All</option>
                {['PRODUCTION','SALES','INTERNAL'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          )}
          <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Apply</button>
        </div>

        {loading && <div className="text-center py-12 text-gray-400">Generating report...</div>}

        {!loading && data && activeTab === 'Stock Register' && (
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b flex gap-6">
              <span className="font-semibold text-gray-700">Stock Register</span>
              <span className="text-sm text-gray-500">{data.totalItems} items</span>
              <span className="text-sm font-bold text-blue-700">{fmt(data.totalValue)}</span>
              <span className="text-sm text-gray-500">Total Qty: {data.totalQty?.toLocaleString()}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>{['#','Item Code','Item Name','Warehouse','Available Qty','Reserved','Unit Cost','Stock Value','% of Total'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {data.data.map((d, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-400">{i+1}</td>
                      <td className="px-3 py-2 font-mono text-xs text-blue-600 font-bold">{d.itemCode}</td>
                      <td className="px-3 py-2 text-xs">{d.itemName}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{d.warehouse}</td>
                      <td className="px-3 py-2 text-xs font-bold text-green-700">{d.availableQty?.toLocaleString()}</td>
                      <td className="px-3 py-2 text-xs text-gray-400">{d.reservedQty || 0}</td>
                      <td className="px-3 py-2 text-xs">{fmt(d.unitCost)}</td>
                      <td className="px-3 py-2 text-xs font-bold">{fmt(d.stockValue)}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{data.totalValue > 0 ? (d.stockValue/data.totalValue*100).toFixed(1) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-bold text-sm">
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-gray-700">TOTAL</td>
                    <td className="px-3 py-3 text-green-700">{data.totalQty?.toLocaleString()}</td>
                    <td></td><td></td>
                    <td className="px-3 py-3 text-blue-700">{fmt(data.totalValue)}</td>
                    <td className="px-3 py-3">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {!loading && data && activeTab === 'GRN Register' && (
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b flex gap-6">
              <span className="font-semibold text-gray-700">GRN Register</span>
              <span className="text-sm text-gray-500">{data.totalGrns} GRNs</span>
              <span className="text-sm font-bold text-blue-700">{fmt(data.totalValue)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>{['GRN No.','Type','Warehouse','Date','Items','Received','Accepted','Rejected','Value','Status'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {data.data.map((g, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs text-blue-600 font-bold">{g.grnNumber}</td>
                      <td className="px-3 py-2 text-xs">{g.grnType}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{g.warehouse}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{fmtDate(g.date)}</td>
                      <td className="px-3 py-2 text-xs">{g.totalItems}</td>
                      <td className="px-3 py-2 text-xs">{g.totalReceivedQty}</td>
                      <td className="px-3 py-2 text-xs font-bold text-green-600">{g.totalAcceptedQty}</td>
                      <td className="px-3 py-2 text-xs text-red-500">{g.totalRejectedQty}</td>
                      <td className="px-3 py-2 text-xs font-bold">{fmt(g.totalValue)}</td>
                      <td className="px-3 py-2"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">{g.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && data && activeTab === 'Issue Register' && (
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b flex gap-6">
              <span className="font-semibold text-gray-700">Issue Register</span>
              <span className="text-sm text-gray-500">{data.totalIssues} issues</span>
              <span className="text-sm text-gray-500">Total Qty: {data.totalQty?.toLocaleString()}</span>
              <span className="text-sm font-bold text-orange-600">{fmt(data.totalValue)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>{['Issue No.','Issued To','Type','Method','Warehouse','Date','Items','Qty','Value'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {data.data.map((iss, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs text-blue-600 font-bold">{iss.issueNumber}</td>
                      <td className="px-3 py-2 text-xs">{iss.issuedTo}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{iss.referenceType}</td>
                      <td className="px-3 py-2 text-xs"><span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs">{iss.issueMethod}</span></td>
                      <td className="px-3 py-2 text-xs text-gray-500">{iss.warehouse}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{fmtDate(iss.date)}</td>
                      <td className="px-3 py-2 text-xs">{iss.totalItems}</td>
                      <td className="px-3 py-2 text-xs font-bold text-orange-600">{iss.totalQty?.toLocaleString()}</td>
                      <td className="px-3 py-2 text-xs font-bold">{fmt(iss.totalValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && data && activeTab === 'Transfer Register' && (
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b flex gap-6">
              <span className="font-semibold text-gray-700">Transfer Register</span>
              <span className="text-sm text-gray-500">{data.totalTransfers} transfers</span>
              <span className="text-sm font-bold text-purple-600">{fmt(data.totalValue)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>{['Transfer No.','Type','From','To','Date','Items','Qty','Value'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {data.data.map((t, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs text-blue-600 font-bold">{t.transferNumber}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{t.transferType?.replace(/_/g,' ')}</td>
                      <td className="px-3 py-2 text-xs">{t.fromWarehouse}</td>
                      <td className="px-3 py-2 text-xs">{t.toWarehouse}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{fmtDate(t.date)}</td>
                      <td className="px-3 py-2 text-xs">{t.totalItems}</td>
                      <td className="px-3 py-2 text-xs font-bold text-purple-600">{t.totalQty?.toLocaleString()}</td>
                      <td className="px-3 py-2 text-xs font-bold">{fmt(t.totalValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && data && activeTab === 'ABC Analysis' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'A Items (Top 70% value)', value: data.aItems, color: 'bg-green-50 text-green-700', desc: 'Critical — tight control' },
                { label: 'B Items (Next 20% value)', value: data.bItems, color: 'bg-yellow-50 text-yellow-700', desc: 'Important — moderate control' },
                { label: 'C Items (Bottom 10% value)', value: data.cItems, color: 'bg-gray-50 text-gray-500', desc: 'Low priority — minimal control' },
              ].map(s => (
                <div key={s.label} className={`${s.color} rounded-xl p-4`}>
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-sm font-medium mt-1">{s.label}</div>
                  <div className="text-xs mt-1 opacity-70">{s.desc}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b font-semibold text-gray-700">ABC Classification — {data.totalItems} items</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>{['#','Class','Item Code','Item Name','Total Qty Issued','Consumption Value','Cumulative %'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.data.map((d, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs text-gray-400">{i+1}</td>
                        <td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs font-bold ${ABC_COLORS[d.abc]}`}>{d.abc}</span></td>
                        <td className="px-3 py-2 font-mono text-xs text-blue-600 font-bold">{d.itemCode}</td>
                        <td className="px-3 py-2 text-xs">{d.itemName}</td>
                        <td className="px-3 py-2 text-xs font-bold">{d.totalQty?.toLocaleString()}</td>
                        <td className="px-3 py-2 text-xs font-bold">{fmt(d.totalValue)}</td>
                        <td className="px-3 py-2 text-xs">{d.cumPercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!loading && !data && <div className="text-center py-12 text-gray-400">Click Apply to generate report</div>}
      </div>
    </AppLayout>
  );
}
