'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }
const fmt = n => n ? `₹${Number(n).toLocaleString('en-IN',{maximumFractionDigits:0})}` : '₹0';
const fmtDate = d => d ? new Date(d).toLocaleString('en-IN',{dateStyle:'short',timeStyle:'short'}) : '—';

const TX_COLORS = {
  IQC_ACCEPT: 'text-green-600 bg-green-50', IQC_REJECT: 'text-red-500 bg-red-50',
  ISSUE: 'text-orange-600 bg-orange-50', TRANSFER_IN: 'text-blue-600 bg-blue-50',
  TRANSFER_OUT: 'text-purple-600 bg-purple-50', ADJUSTMENT: 'text-yellow-600 bg-yellow-50',
};

export default function InventoryDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [activity, setActivity] = useState([]);
  const [topItems, setTopItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const h = { Authorization: `Bearer ${getToken()}` };
    const [ov, al, act, top] = await Promise.all([
      fetch(`${API}/inventory-dashboard/overview`, {headers:h}).then(r=>r.ok?r.json():null),
      fetch(`${API}/inventory-dashboard/alerts`, {headers:h}).then(r=>r.ok?r.json():null),
      fetch(`${API}/inventory-dashboard/activity`, {headers:h}).then(r=>r.ok?r.json():[]),
      fetch(`${API}/inventory-dashboard/top-items`, {headers:h}).then(r=>r.ok?r.json():null),
    ]);
    setOverview(ov); setAlerts(al); setActivity(act || []); setTopItems(top);
    setLastRefresh(new Date()); setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  const totalAlerts = alerts ? (alerts.lowStock?.length||0) + (alerts.expiringBatches?.length||0) + (alerts.expiredBatches||0) + (alerts.pendingGrns?.length||0) + (alerts.pendingIqc?.length||0) + (alerts.quarantinedBatches||0) : 0;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Dashboard</h1>
            <p className="text-gray-400 text-xs mt-1">Last refreshed: {lastRefresh.toLocaleTimeString()}</p>
          </div>
          <button onClick={fetchAll} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2">
            <span>↻</span> Refresh
          </button>
        </div>

        {loading && <div className="text-center py-20 text-gray-400">Loading dashboard...</div>}

        {!loading && overview && (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Stock Value', value: fmt(overview.totalStockValue), sub: `${overview.totalItems} SKUs`, color: 'bg-blue-600', textColor: 'text-white' },
                { label: 'Active Batches', value: overview.totalBatches, sub: `${overview.totalWarehouses} warehouses`, color: 'bg-green-600', textColor: 'text-white' },
                { label: 'Today Receipts', value: overview.today?.receipts, sub: `Month: ${overview.month?.receipts?.toLocaleString()} units`, color: 'bg-purple-600', textColor: 'text-white' },
                { label: 'Today Issues', value: overview.today?.issues, sub: `Month: ${overview.month?.issues?.toLocaleString()} units`, color: 'bg-orange-500', textColor: 'text-white' },
              ].map(k => (
                <div key={k.label} className={`${k.color} rounded-xl p-5`}>
                  <div className={`text-2xl font-bold ${k.textColor}`}>{k.value}</div>
                  <div className={`text-sm font-medium ${k.textColor} mt-1 opacity-90`}>{k.label}</div>
                  <div className={`text-xs ${k.textColor} mt-1 opacity-70`}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Pending Actions */}
            {(overview.pendingGrns > 0 || overview.pendingIqc > 0 || overview.pendingPutaway > 0) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                <div className="text-sm font-semibold text-yellow-800 mb-3">⚡ Pending Actions</div>
                <div className="flex gap-4 flex-wrap">
                  {overview.pendingGrns > 0 && <a href="/inventory/grn" className="px-4 py-2 bg-white rounded-lg border border-yellow-300 text-sm text-yellow-700 hover:bg-yellow-50"><span className="font-bold">{overview.pendingGrns}</span> GRNs pending</a>}
                  {overview.pendingIqc > 0 && <a href="/inventory/iqc" className="px-4 py-2 bg-white rounded-lg border border-yellow-300 text-sm text-yellow-700 hover:bg-yellow-50"><span className="font-bold">{overview.pendingIqc}</span> IQC pending</a>}
                  {overview.pendingPutaway > 0 && <a href="/inventory/putaway" className="px-4 py-2 bg-white rounded-lg border border-yellow-300 text-sm text-yellow-700 hover:bg-yellow-50"><span className="font-bold">{overview.pendingPutaway}</span> Putaway in progress</a>}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Alerts */}
              <div className="bg-white rounded-xl border shadow-sm">
                <div className="p-4 border-b flex justify-between">
                  <span className="font-semibold text-gray-700">Alerts</span>
                  {totalAlerts > 0 && <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold">{totalAlerts}</span>}
                </div>
                <div className="p-4 space-y-3">
                  {alerts?.lowStock?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-red-600 mb-2">🔴 LOW STOCK ({alerts.lowStock.length} items)</div>
                      {alerts.lowStock.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs py-1 border-b border-gray-50">
                          <span className="font-mono text-blue-600">{item.itemCode}</span>
                          <span className="font-bold text-red-500">{item.availableQty} remaining</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {alerts?.expiringBatches?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-orange-600 mb-2">🟠 EXPIRING IN 30 DAYS ({alerts.expiringBatches.length})</div>
                      {alerts.expiringBatches.map((b, i) => (
                        <div key={i} className="flex justify-between text-xs py-1 border-b border-gray-50">
                          <span className="font-mono text-blue-600">{b.batchNumber}</span>
                          <span className="text-orange-500">{new Date(b.expiryDate).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {alerts?.expiredBatches > 0 && (
                    <div className="flex justify-between items-center p-2 bg-red-50 rounded-lg">
                      <span className="text-xs text-red-700">Expired batches in system</span>
                      <span className="text-sm font-bold text-red-600">{alerts.expiredBatches}</span>
                    </div>
                  )}
                  {alerts?.quarantinedBatches > 0 && (
                    <div className="flex justify-between items-center p-2 bg-orange-50 rounded-lg">
                      <span className="text-xs text-orange-700">Quarantined batches</span>
                      <span className="text-sm font-bold text-orange-600">{alerts.quarantinedBatches}</span>
                    </div>
                  )}
                  {totalAlerts === 0 && (
                    <div className="text-center py-6 text-green-600 text-sm">✅ No alerts — all good!</div>
                  )}
                </div>
              </div>

              {/* Top Items by Value */}
              <div className="bg-white rounded-xl border shadow-sm">
                <div className="p-4 border-b flex justify-between">
                  <span className="font-semibold text-gray-700">Top Items by Value</span>
                  <span className="text-xs text-gray-400">{fmt(topItems?.totalValue)}</span>
                </div>
                <div className="p-4 space-y-2">
                  {topItems?.data?.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 w-4">{i+1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-mono text-blue-600 font-bold">{item.itemCode}</span>
                          <span className="font-bold">{fmt(item.stockValue)}</span>
                        </div>
                        <div className="mt-1 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${topItems.totalValue > 0 ? (item.stockValue/topItems.totalValue*100) : 0}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!topItems?.data || topItems.data.length === 0) && (
                    <div className="text-center py-6 text-gray-400 text-sm">No stock data yet</div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b flex justify-between">
                <span className="font-semibold text-gray-700">Recent Activity</span>
                <a href="/inventory/reports" className="text-xs text-blue-600 hover:underline">View all →</a>
              </div>
              <div className="divide-y">
                {activity.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">No recent activity</div>}
                {activity.map(m => (
                  <div key={m.id} className="p-3 flex items-center gap-4 hover:bg-gray-50">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${TX_COLORS[m.transactionType] || 'text-gray-600 bg-gray-100'}`}>{m.transactionType?.replace(/_/g,' ')}</span>
                    <span className="font-mono text-xs text-blue-600 font-bold">{m.itemCode}</span>
                    <span className="text-xs text-gray-600 flex-1">{m.itemName}</span>
                    <span className="text-xs text-gray-400">{m.warehouse?.name}</span>
                    {m.inQty > 0 && <span className="text-xs font-bold text-green-600">+{m.inQty}</span>}
                    {m.outQty > 0 && <span className="text-xs font-bold text-red-500">-{m.outQty}</span>}
                    <span className="text-xs text-gray-400">{fmtDate(m.transactionDate)}</span>
                    {m.referenceNumber && <span className="font-mono text-xs text-gray-300">{m.referenceNumber}</span>}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
