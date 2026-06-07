'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { Plus, Eye } from 'lucide-react';

const TYPE_COLORS = {
  RAW_MATERIAL: 'bg-blue-100 text-blue-700',
  FINISHED_GOOD: 'bg-green-100 text-green-700',
  WIP: 'bg-yellow-100 text-yellow-700',
  SPARE_PART: 'bg-orange-100 text-orange-700',
  SCRAP: 'bg-red-100 text-red-700',
  GENERAL: 'bg-gray-100 text-gray-600',
};

export default function WarehousesPage() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState([]);
  const [stats, setStats]           = useState({});
  const [loading, setLoading]       = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [whRes, statsRes] = await Promise.all([
        api.get('/warehouses'),
        api.get('/warehouses/stats'),
      ]);
      setWarehouses(whRes.data);
      setStats(statsRes.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <AppLayout>
      <PageHeader title="Warehouse Management" subtitle="Multi-level storage locations"
        action={
          <button onClick={() => router.push('/inventory/warehouses/create')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus size={16} /> New Warehouse
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Warehouses', value: stats.totalWarehouses ?? 0, color: 'text-blue-600'   },
          { label: 'Zones',      value: stats.totalZones      ?? 0, color: 'text-green-600'  },
          { label: 'Racks',      value: stats.totalRacks      ?? 0, color: 'text-purple-600' },
          { label: 'Bins',       value: stats.totalBins       ?? 0, color: 'text-orange-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : warehouses.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No warehouses found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Code','Name','Type','Plant','Zones','Default','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {warehouses.map((wh) => (
                <tr key={wh.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-bold text-blue-600 text-xs">{wh.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{wh.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[wh.type] || ''}`}>
                      {wh.type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{wh.plant?.name}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{wh._count?.zones || 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    {wh.isDefault && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Default</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${wh.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {wh.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => router.push(`/inventory/warehouses/${wh.id}`)}
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
