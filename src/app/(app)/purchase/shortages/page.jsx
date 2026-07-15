'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
function fmt(n) { return new Intl.NumberFormat('en-IN').format(n || 0); }

export default function MaterialShortagesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});

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
          <div className="bg-white rounded-xl border shadow-sm p-5 flex gap-8 mb-6">
            <div>
              <div className="text-2xl font-bold text-red-600">{data.totalItemsShort}</div>
              <div className="text-xs text-gray-400">Items Short</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-700">{data.totalShortageRecords}</div>
              <div className="text-xs text-gray-400">Shortage Records</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  {['Item Code', 'Item Name', 'Total Shortage', 'UOM', 'Orders Affected', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.data.map((item) => (
                  <>
                    <tr key={item.itemCode} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => toggle(item.itemCode)}>
                      <td className="px-4 py-3 font-mono text-gray-700">{item.itemCode}</td>
                      <td className="px-4 py-3 text-gray-600">{item.itemName}</td>
                      <td className="px-4 py-3 font-bold text-red-600">{fmt(item.totalShortageQty)}</td>
                      <td className="px-4 py-3 text-gray-500">{item.uom}</td>
                      <td className="px-4 py-3 text-gray-500">{item.affectedOrders.length} order(s)</td>
                      <td className="px-4 py-3 text-indigo-600 text-xs">{expanded[item.itemCode] ? '▲ Hide' : '▼ Details'}</td>
                    </tr>
                    {expanded[item.itemCode] && (
                      <tr key={`${item.itemCode}-detail`} className="bg-gray-50 border-b">
                        <td colSpan={6} className="px-6 py-3">
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
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppLayout>
  );
}
