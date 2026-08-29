'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmt = n => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';

function StatCard({ label, value, tone = 'default' }) {
  const tones = {
    default: 'bg-gray-50 text-gray-800',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
  };
  return (
    <div className={`rounded-xl p-5 border text-center ${tones[tone]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-1 opacity-70">{label}</div>
    </div>
  );
}

export default function InventoryDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [activity, setActivity] = useState([]);
  const [topItems, setTopItems] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    const headers = { Authorization: `Bearer ${getToken()}` };
    try {
      const [ov, al, ac, ti] = await Promise.all([
        fetch(`${API}/inventory-dashboard/overview`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${API}/inventory-dashboard/alerts`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${API}/inventory-dashboard/activity`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`${API}/inventory-dashboard/top-items`, { headers }).then(r => r.ok ? r.json() : null),
      ]);
      setOverview(ov); setAlerts(al); setActivity(ac || []); setTopItems(ti);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Real-time inventory metrics and stock levels</p>
          </div>
          <button onClick={load} className="text-xs text-blue-600 hover:underline">Refresh</button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading dashboard...</div>
        ) : !overview ? (
          <div className="bg-white rounded-xl border shadow-sm p-16 text-center">
            <div className="text-5xl mb-4">📦</div>
            <div className="text-gray-400">Could not load inventory dashboard data.</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="SKUs In Stock" value={overview.totalItems ?? 0} tone="blue" />
              <StatCard label="Total Stock Value" value={fmt(overview.totalStockValue)} tone="green" />
              <StatCard label="Warehouses" value={overview.totalWarehouses ?? 0} />
              <StatCard label="Active Batches" value={overview.totalBatches ?? 0} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Pending GRNs" value={overview.pendingGrns ?? 0} tone={overview.pendingGrns > 0 ? 'amber' : 'default'} />
              <StatCard label="Pending IQC" value={overview.pendingIqc ?? 0} tone={overview.pendingIqc > 0 ? 'amber' : 'default'} />
              <StatCard label="Pending Putaway" value={overview.pendingPutaway ?? 0} tone={overview.pendingPutaway > 0 ? 'amber' : 'default'} />
              <StatCard label="Today's Movements" value={(overview.today?.receipts ?? 0) + (overview.today?.issues ?? 0) + (overview.today?.transfers ?? 0)} />
            </div>

            {/* Alerts */}
            {alerts && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border shadow-sm p-5">
                  <h3 className="font-bold text-gray-700 mb-3">Low Stock Items</h3>
                  {(!alerts.lowStock || alerts.lowStock.length === 0) ? (
                    <div className="text-sm text-gray-400 text-center py-4">No low stock items</div>
                  ) : (
                    <div className="divide-y">
                      {alerts.lowStock.map((it, i) => (
                        <div key={i} className="py-2 flex justify-between text-sm">
                          <span className="text-gray-700">{it.itemName}</span>
                          <span className="font-medium text-red-600">{it.availableQty}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border shadow-sm p-5">
                  <h3 className="font-bold text-gray-700 mb-3">Expiring Batches (30 days)</h3>
                  {(!alerts.expiringBatches || alerts.expiringBatches.length === 0) ? (
                    <div className="text-sm text-gray-400 text-center py-4">None expiring soon</div>
                  ) : (
                    <div className="divide-y">
                      {alerts.expiringBatches.map((b, i) => (
                        <div key={i} className="py-2 flex justify-between text-sm">
                          <span className="text-gray-700">{b.itemName} <span className="text-gray-400 text-xs">({b.batchNumber})</span></span>
                          <span className="font-medium text-amber-600">{fmtDate(b.expiryDate)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {alerts && (alerts.expiredBatches > 0 || alerts.quarantinedBatches > 0) && (
              <div className="grid grid-cols-2 gap-4">
                <StatCard label="Expired Batches" value={alerts.expiredBatches} tone="red" />
                <StatCard label="Quarantined Batches" value={alerts.quarantinedBatches} tone="red" />
              </div>
            )}

            {/* Top items by value */}
            {topItems?.data?.length > 0 && (
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-bold text-gray-700 mb-3">Top Items by Stock Value</h3>
                <div className="divide-y">
                  {topItems.data.map((it, i) => (
                    <div key={i} className="py-2 flex justify-between items-center text-sm">
                      <span className="text-gray-700">{it.itemName} <span className="text-gray-400 text-xs">— {it.warehouse?.name}</span></span>
                      <span className="font-bold text-green-600">{fmt(it.stockValue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent activity */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-bold text-gray-700 mb-3">Recent Stock Movements</h3>
              {activity.length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-4">No recent activity</div>
              ) : (
                <div className="divide-y">
                  {activity.map((m, i) => (
                    <div key={i} className="py-2 flex items-center justify-between text-sm">
                      <span className="text-gray-700">{m.itemName} <span className="text-gray-400 text-xs">— {m.warehouse?.name}</span></span>
                      <span className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{m.transactionType}</span>
                        <span className="text-xs text-gray-400">{fmtDate(m.transactionDate)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
