'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { Plus, Eye } from 'lucide-react';
import { clsx } from 'clsx';

const STATUS_STYLES = {
  PENDING:       'bg-yellow-100 text-yellow-700',
  VERIFIED:      'bg-blue-100 text-blue-700',
  SENT_TO_STORES:'bg-purple-100 text-purple-700',
  COMPLETED:     'bg-green-100 text-green-700',
  REJECTED:      'bg-red-100 text-red-700',
};

export default function GateInwardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState([]);
  const [stats, setStats]     = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)       params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      const [entriesRes, statsRes] = await Promise.all([
        api.get(`/gate-inward?${params.toString()}`),
        api.get('/gate-inward/stats'),
      ]);
      setEntries(entriesRes.data);
      setStats(statsRes.data);
    } finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <AppLayout>
      <PageHeader title="Gate Inward" subtitle="Goods received at gate"
        action={
          <button onClick={() => router.push('/gate/inward/create')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus size={16} /> New GIN
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Total',         value: stats.total         ?? 0, color: 'text-gray-800'   },
          { label: 'Pending',       value: stats.pending       ?? 0, color: 'text-yellow-600' },
          { label: 'Verified',      value: stats.verified      ?? 0, color: 'text-blue-600'   },
          { label: 'Sent to Stores',value: stats.sentToStores  ?? 0, color: 'text-purple-600' },
          { label: 'Completed',     value: stats.completed     ?? 0, color: 'text-green-600'  },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input type="text" placeholder="Search GIN#, supplier, PO, material..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ color: '#111827', backgroundColor: '#ffffff' }}
          className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:border-blue-500" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          style={{ color: '#111827', backgroundColor: '#ffffff' }}
          className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
          <option value="">All Status</option>
          {['PENDING','VERIFIED','SENT_TO_STORES','COMPLETED','REJECTED'].map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No gate inward entries found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['GIN#','Supplier','Material','Qty','PO#','Plant','Date','Status','Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-blue-600 font-bold">{e.ginNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{e.supplierName}</p>
                    {e.supplierMobile && <p className="text-xs text-gray-400">{e.supplierMobile}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs">
                    <p className="truncate text-xs">{e.materialDescription}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{e.quantity} {e.unit}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{e.poNumber || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{e.plant?.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(e.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[e.status] || ''}`}>
                      {e.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => router.push(`/gate/inward/${e.id}`)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}
