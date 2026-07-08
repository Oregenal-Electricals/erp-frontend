'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() {
  if (typeof window !== 'undefined') return localStorage.getItem('erp_token');
}

export default function PriceHistoryPage() {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isApproved, setIsApproved] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchStats = useCallback(async () => {
    const res = await fetch(`${API}/price-history/stats`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setStats(await res.json());
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (isApproved !== '') params.set('isApproved', isApproved);
    const res = await fetch(`${API}/price-history/search?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const d = await res.json();
      setRecords(d.data);
      setTotalPages(d.totalPages);
      setTotal(d.total);
    }
    setLoading(false);
  }, [page, search, isApproved]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  function isExpired(validTo) {
    if (!validTo) return false;
    return new Date(validTo) < new Date();
  }

  function isEffective(validFrom, validTo) {
    const now = new Date();
    const from = new Date(validFrom);
    if (from > now) return false;
    if (validTo && new Date(validTo) < now) return false;
    return true;
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Price History</h1>
          <p className="text-gray-500 text-sm mt-1">Complete audit trail of all price entries — read only</p>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Total Entries', value: stats.total, color: 'bg-gray-50' },
              { label: 'Approved', value: stats.approved, color: 'bg-green-50' },
              { label: 'Active', value: stats.active, color: 'bg-blue-50' },
              { label: 'Expired', value: stats.expired, color: 'bg-red-50' },
              { label: 'Pending', value: stats.pending, color: 'bg-yellow-50' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                <div className="text-2xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b flex gap-3 flex-wrap items-center">
            <input
              className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48"
              placeholder="Search item code or name..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            <select className="border rounded-lg px-3 py-2 text-sm" value={isApproved} onChange={e => { setIsApproved(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="true">Approved</option>
              <option value="false">Pending</option>
            </select>
            <span className="text-sm text-gray-500">{total} entries</span>
            <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded border border-yellow-200">🔒 Read Only</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  {['Item Code', 'Item Name', 'Type', 'Price List', 'List Type', 'Price', 'Currency', 'Valid From', 'Valid To', 'Approval', 'Effective'].map(h => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={11} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-10 text-gray-400">No price history found</td></tr>
                ) : records.map(r => (
                  <tr key={r.id} className={`hover:bg-gray-50 ${isExpired(r.validTo) ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 font-mono font-medium text-blue-600">{r.itemCode}</td>
                    <td className="px-4 py-3 text-gray-900">{r.itemName}</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">{r.itemType}</span></td>
                    <td className="px-4 py-3 text-gray-600">{r.priceList?.code || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.priceList?.listType === 'SALES' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {r.priceList?.listType || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">₹{r.price?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{r.priceList?.currency || 'INR'}</td>
                    <td className="px-4 py-3 text-gray-600">{r.validFrom ? new Date(r.validFrom).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.validTo ? (
                        <span className={isExpired(r.validTo) ? 'text-red-500' : ''}>
                          {new Date(r.validTo).toLocaleDateString()}
                        </span>
                      ) : 'No Expiry'}
                    </td>
                    <td className="px-4 py-3">
                      {r.isApproved
                        ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">✓ Approved</span>
                        : <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>}
                    </td>
                    <td className="px-4 py-3">
                      {isEffective(r.validFrom, r.validTo) && r.isApproved
                        ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">● Active</span>
                        : isExpired(r.validTo)
                          ? <span className="px-2 py-1 rounded-full text-xs text-gray-400">Expired</span>
                          : <span className="px-2 py-1 rounded-full text-xs text-gray-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t flex justify-center gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button>
              <span className="px-3 py-1 text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
