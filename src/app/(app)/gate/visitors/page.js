'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { Plus, Eye, UserX } from 'lucide-react';

export default function VisitorsPage() {
  const router = useRouter();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  const fetchVisitors = useCallback(async () => {
    setLoading(true);
    try {
      const params = search ? `?search=${search}` : '';
      const { data } = await api.get(`/visitors${params}`);
      setVisitors(data);
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchVisitors(); }, [fetchVisitors]);

  return (
    <AppLayout>
      <PageHeader title="Visitor Master" subtitle="Registered visitors database"
        action={
          <button onClick={() => router.push('/gate/visitors/create')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus size={16} /> Register Visitor
          </button>
        }
      />

      <div className="mb-4">
        <input type="text" placeholder="Search name, mobile, ID, company..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ color: '#111827', backgroundColor: '#ffffff' }}
          className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:border-blue-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : visitors.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No visitors found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Name','Mobile','Company','ID Proof','Total Visits','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visitors.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{v.firstName} {v.lastName}</p>
                    {v.designation && <p className="text-xs text-gray-400">{v.designation}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{v.mobile}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{v.visitorCompany || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {v.idProofType?.replace(/_/g, ' ')} ···{v.idProofNumber?.slice(-4)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      {v._count?.logs || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {v.isBlacklisted ? (
                      <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">Blacklisted</span>
                    ) : (
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => router.push(`/gate/visitors/${v.id}`)}
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
