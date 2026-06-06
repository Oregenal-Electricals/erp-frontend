'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { Plus, Eye } from 'lucide-react';

const STATUS_STYLES = {
  PENDING:  'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  ISSUED:   'bg-purple-100 text-purple-700',
  RETURNED: 'bg-teal-100 text-teal-700',
  EXPIRED:  'bg-orange-100 text-orange-700',
  CLOSED:   'bg-green-100 text-green-700',
  CANCELLED:'bg-red-100 text-red-700',
};

const TYPE_STYLES = {
  RETURNABLE:     'bg-blue-50 text-blue-600',
  NON_RETURNABLE: 'bg-gray-100 text-gray-600',
};

export default function GatePassesPage() {
  const router = useRouter();
  const [passes, setPasses]   = useState([]);
  const [stats, setStats]     = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter]     = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)       params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter)   params.append('type', typeFilter);
      const [passesRes, statsRes] = await Promise.all([
        api.get(`/gate-passes?${params.toString()}`),
        api.get('/gate-passes/stats'),
      ]);
      setPasses(passesRes.data);
      setStats(statsRes.data);
    } finally { setLoading(false); }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <AppLayout>
      <PageHeader title="Gate Passes" subtitle="Material gate pass management"
        action={
          <button onClick={() => router.push('/gate/passes/create')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus size={16} /> New Pass
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total',      value: stats.total      ?? 0, color: 'text-gray-800'   },
          { label: 'Pending',    value: stats.pending    ?? 0, color: 'text-yellow-600' },
          { label: 'Issued',     value: stats.issued     ?? 0, color: 'text-purple-600' },
          { label: 'Returnable', value: stats.returnable ?? 0, color: 'text-blue-600'   },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input type="text" placeholder="Search pass#, carrier, item..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ color: '#111827', backgroundColor: '#ffffff' }}
          className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:border-blue-500" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          style={{ color: '#111827', backgroundColor: '#ffffff' }}
          className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
          <option value="">All Status</option>
          {['PENDING','APPROVED','ISSUED','RETURNED','CLOSED','CANCELLED'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          style={{ color: '#111827', backgroundColor: '#ffffff' }}
          className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
          <option value="">All Types</option>
          <option value="RETURNABLE">Returnable</option>
          <option value="NON_RETURNABLE">Non-Returnable</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : passes.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No gate passes found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Pass#','Type','Carrier','Item','Qty','Plant','Date','Status','Action'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {passes.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 font-mono text-xs text-blue-600 font-bold">{p.passNumber}</td>
                  <td className="px-3 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLES[p.type] || ''}`}>
                      {p.type === 'RETURNABLE' ? 'Returnable' : 'Non-Return'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-gray-900 text-xs">{p.carrierName}</p>
                    {p.carrierMobile && <p className="text-xs text-gray-400">{p.carrierMobile}</p>}
                  </td>
                  <td className="px-3 py-3 text-gray-600 text-xs max-w-xs">
                    <p className="truncate">{p.itemDescription}</p>
                  </td>
                  <td className="px-3 py-3 text-gray-600 text-xs">{p.quantity} {p.unit}</td>
                  <td className="px-3 py-3 text-gray-600 text-xs">{p.plant?.name}</td>
                  <td className="px-3 py-3 text-gray-500 text-xs">{formatDate(p.createdAt)}</td>
                  <td className="px-3 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[p.status] || ''}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => router.push(`/gate/passes/${p.id}`)}
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
