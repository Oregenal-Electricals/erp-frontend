'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { Plus, Eye } from 'lucide-react';

const TYPE_COLORS = {
  TRUCK: 'bg-blue-100 text-blue-700', TEMPO: 'bg-green-100 text-green-700',
  CAR: 'bg-purple-100 text-purple-700', TWO_WHEELER: 'bg-orange-100 text-orange-700',
  CONTAINER: 'bg-red-100 text-red-700', TANKER: 'bg-teal-100 text-teal-700',
  OTHER: 'bg-gray-100 text-gray-600',
};

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const params = search ? `?search=${search}` : '';
      const { data } = await api.get(`/vehicles${params}`);
      setVehicles(data);
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  return (
    <AppLayout>
      <PageHeader title="Vehicle Master" subtitle="Registered vehicles"
        action={
          <button onClick={() => router.push('/gate/vehicles/create')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus size={16} /> Register Vehicle
          </button>
        }
      />
      <div className="mb-4">
        <input type="text" placeholder="Search vehicle number, owner..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ color: '#111827', backgroundColor: '#ffffff' }}
          className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:border-blue-500" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : vehicles.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No vehicles found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Vehicle No','Type','Owner','Mobile','Company Vehicle','Total Trips','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-bold text-gray-900">{v.vehicleNumber}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[v.vehicleType] || ''}`}>
                      {v.vehicleType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{v.ownerName || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{v.ownerMobile || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {v.isCompanyVehicle
                      ? <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Yes</span>
                      : <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">No</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{v._count?.logs || 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => router.push(`/gate/vehicles/${v.id}`)}
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
