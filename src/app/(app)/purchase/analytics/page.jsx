'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmt = (n) => n ? `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹0';

const STATUS_COLORS = {
  DRAFT: '#9CA3AF', APPROVED: '#3B82F6', SENT: '#8B5CF6',
  PARTIALLY_RECEIVED: '#F59E0B', CLOSED: '#10B981', CANCELLED: '#EF4444',
};

export default function PurchaseAnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [poStatus, setPoStatus] = useState([]);
  const [rfqConv, setRfqConv] = useState(null);
  const [topItems, setTopItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${getToken()}` };
    const [ovRes, vRes, mRes, sRes, rRes, iRes] = await Promise.all([
      fetch(`${API}/purchase-analytics/overview`, { headers }),
      fetch(`${API}/purchase-analytics/spend-by-vendor`, { headers }),
      fetch(`${API}/purchase-analytics/spend-by-month`, { headers }),
      fetch(`${API}/purchase-analytics/po-status`, { headers }),
      fetch(`${API}/purchase-analytics/rfq-conversion`, { headers }),
      fetch(`${API}/purchase-analytics/top-items`, { headers }),
    ]);
    if (ovRes.ok) setOverview(await ovRes.json());
    if (vRes.ok) setVendors(await vRes.json());
    if (mRes.ok) setMonthly(await mRes.json());
    if (sRes.ok) setPoStatus(await sRes.json());
    if (rRes.ok) setRfqConv(await rRes.json());
    if (iRes.ok) setTopItems(await iRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const maxMonthly = Math.max(...monthly.map(m => m.amount), 1);
  const maxVendor = Math.max(...vendors.map(v => v.totalSpend), 1);
  const maxItem = Math.max(...topItems.map(i => i.totalSpend), 1);
  const totalPoCount = poStatus.reduce((s, p) => s + p.count, 0);

  if (loading) return <AppLayout><div className="p-6 text-gray-400 text-center">Loading analytics...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Analytics</h1>
            <p className="text-gray-500 text-sm mt-1">Procurement performance overview — current year</p>
          </div>
          <button onClick={fetchAll} className="px-3 py-1.5 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">↻ Refresh</button>
        </div>

        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total PO Value', value: fmt(overview.totalPoValue), sub: `${overview.totalPos} POs`, color: 'bg-blue-600' },
              { label: 'This Month', value: fmt(overview.monthlyPoValue), sub: 'Current month', color: 'bg-purple-600' },
              { label: 'This Year', value: fmt(overview.yearlyPoValue), sub: 'Jan–Dec', color: 'bg-green-600' },
              { label: 'Pending PRs', value: overview.pendingPrs, sub: 'Awaiting approval', color: 'bg-yellow-500' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className={`inline-block w-2 h-2 rounded-full ${k.color} mb-2`}></div>
                <div className="text-2xl font-bold text-gray-900">{k.value}</div>
                <div className="text-sm text-gray-500 mt-1">{k.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{k.sub}</div>
              </div>
            ))}
          </div>
        )}

        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Pending POs', value: overview.pendingPos, color: 'text-yellow-600' },
              { label: 'Sent POs', value: overview.sentPos, color: 'text-purple-600' },
              { label: 'Total RFQs', value: overview.totalRfqs, color: 'text-blue-600' },
              { label: 'Amendments', value: overview.totalAmendments, color: 'text-orange-600' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                <div className={`text-3xl font-bold ${k.color}`}>{k.value}</div>
                <div className="text-sm text-gray-500">{k.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-700 mb-4">Monthly Spend (₹) — {new Date().getFullYear()}</h2>
            <div className="space-y-2">
              {monthly.map(m => (
                <div key={m.month} className="flex items-center gap-3">
                  <div className="w-8 text-xs text-gray-500 text-right">{m.month}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
                    <div
                      className="bg-blue-500 h-6 rounded-full transition-all"
                      style={{ width: `${Math.max((m.amount / maxMonthly) * 100, m.amount > 0 ? 2 : 0)}%` }}
                    ></div>
                    {m.amount > 0 && (
                      <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-white">{fmt(m.amount)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-700 mb-4">PO Status Distribution</h2>
            {poStatus.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No PO data yet</div>
            ) : (
              <div className="space-y-3">
                {poStatus.map(s => (
                  <div key={s.status} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-sm flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[s.status] || '#9CA3AF' }}></div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{s.status}</span>
                        <span className="font-medium text-gray-900">{s.count} ({Math.round(s.count/totalPoCount*100)}%)</span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${(s.count/totalPoCount)*100}%`, backgroundColor: STATUS_COLORS[s.status] || '#9CA3AF' }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-700 mb-4">Top Vendors by Spend</h2>
            {vendors.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No vendor spend data</div>
            ) : (
              <div className="space-y-3">
                {vendors.slice(0,8).map((v, i) => (
                  <div key={v.vendorId} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold flex-shrink-0">{i+1}</div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 truncate">{v.vendorName}</span>
                        <span className="font-medium text-gray-900 ml-2 flex-shrink-0">{fmt(v.totalSpend)}</span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${(v.totalSpend/maxVendor)*100}%` }}></div>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{v.poCount} PO(s)</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-700 mb-4">Top Items by Spend</h2>
            {topItems.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No item spend data</div>
            ) : (
              <div className="space-y-3">
                {topItems.slice(0,8).map((item, i) => (
                  <div key={item.itemCode} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-bold flex-shrink-0">{i+1}</div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 truncate">{item.itemName}</span>
                        <span className="font-medium text-gray-900 ml-2 flex-shrink-0">{fmt(item.totalSpend)}</span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${(item.totalSpend/maxItem)*100}%` }}></div>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{item.itemCode} · {item.totalQty?.toLocaleString()} {item.uom}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {rfqConv && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-700 mb-4">RFQ → PO Conversion</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total RFQs', value: rfqConv.totalRfqs },
                { label: 'Closed RFQs', value: rfqConv.closedRfqs },
                { label: 'POs from RFQ', value: rfqConv.posWithRfq },
                { label: 'Conversion Rate', value: `${rfqConv.conversionRate}%` },
              ].map(k => (
                <div key={k.label} className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-800">{k.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{k.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
              <strong>{rfqConv.rfqUtilization}%</strong> of all POs were raised through formal RFQ process.
              {rfqConv.rfqUtilization < 50 && ' Consider increasing RFQ usage for better vendor competition.'}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
