'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { Plus, Eye, ToggleLeft, ToggleRight } from 'lucide-react';

const TYPE_COLORS = {
  RAW_MATERIAL:    'bg-blue-100 text-blue-700',
  SEMI_FINISHED:   'bg-purple-100 text-purple-700',
  FINISHED_GOOD:   'bg-green-100 text-green-700',
  CONSUMABLE:      'bg-yellow-100 text-yellow-700',
  PACKAGING:       'bg-orange-100 text-orange-700',
  SPARE_PART:      'bg-red-100 text-red-700',
  TOOL:            'bg-gray-100 text-gray-700',
  SERVICE:         'bg-teal-100 text-teal-700',
};

const ITEM_TYPES = ['RAW_MATERIAL','SEMI_FINISHED','FINISHED_GOOD','CONSUMABLE','PACKAGING','SPARE_PART','TOOL','SERVICE'];

export default function ItemsPage() {
  const router = useRouter();
  const [items, setItems]     = useState([]);
  const [stats, setStats]     = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)     params.append('search', search);
      if (typeFilter) params.append('itemType', typeFilter);
      const [itemsRes, statsRes] = await Promise.all([
        api.get(`/items?${params}`),
        api.get('/items/stats'),
      ]);
      setItems(itemsRes.data);
      setStats(statsRes.data);
    } finally { setLoading(false); }
  }, [search, typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggle = async (id) => {
    await api.patch(`/items/${id}/toggle`);
    fetchData();
  };

  return (
    <AppLayout>
      <PageHeader title="Item Master" subtitle="All items, components and products"
        action={
          <button onClick={() => router.push('/inventory/items/create')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus size={16} /> New Item
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Items', value: stats.total  ?? 0, color: 'text-gray-800'  },
          { label: 'Active',      value: stats.active ?? 0, color: 'text-green-600' },
          { label: 'Raw Material',value: stats.byType?.find(t => t.itemType === 'RAW_MATERIAL')?._count?.id ?? 0, color: 'text-blue-600' },
          { label: 'Finished',    value: stats.byType?.find(t => t.itemType === 'FINISHED_GOOD')?._count?.id ?? 0, color: 'text-purple-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input type="text" placeholder="Search code, name, HSN, barcode..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ color: '#111827', backgroundColor: '#ffffff' }}
          className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:border-blue-500" />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          style={{ color: '#111827', backgroundColor: '#ffffff' }}
          className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
          <option value="">All Types</option>
          {ITEM_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No items found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Code','Name','Type','UOM','HSN','GST%','Rate','Reorder','Status','Actions'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 font-mono text-xs font-bold text-blue-600">{item.itemCode}</td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-gray-900 text-xs">{item.itemName}</p>
                    {item.shortName && <p className="text-xs text-gray-400">{item.shortName}</p>}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[item.itemType] || ''}`}>
                      {item.itemType.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-600 text-xs">{item.uom?.code}</td>
                  <td className="px-3 py-3 text-gray-500 text-xs font-mono">{item.hsnCode || '—'}</td>
                  <td className="px-3 py-3 text-gray-600 text-xs">{item.gstRate}%</td>
                  <td className="px-3 py-3 text-gray-600 text-xs">
                    {item.purchaseRate ? `₹${item.purchaseRate}` : '—'}
                  </td>
                  <td className="px-3 py-3 text-gray-600 text-xs">
                    {item.reorderLevel ? `${item.reorderLevel} ${item.uom?.code}` : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 flex items-center gap-1">
                    <button onClick={() => router.push(`/inventory/items/${item.id}`)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Eye size={13} />
                    </button>
                    <button onClick={() => handleToggle(item.id)}
                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                      {item.status === 'ACTIVE' ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
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
