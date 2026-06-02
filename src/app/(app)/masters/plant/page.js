'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import api from '@/lib/api';
import { Plus, Pencil, ToggleLeft } from 'lucide-react';

export default function PlantListPage() {
  const router = useRouter();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPlants = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/masters/plants?includeInactive=true');
      setPlants(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlants();
  }, [fetchPlants]);

  const toggleStatus = async (id, name) => {
    if (!confirm(`Toggle status for "${name}"?`)) return;
    try {
      await api.patch(`/masters/plants/${id}/toggle-status`);
      fetchPlants();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Plant Name' },
    { key: 'plantType', label: 'Type' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    {
      key: 'company',
      label: 'Company',
      render: (row) => row.company?.name ?? '—',
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) => <StatusBadge active={row.isActive} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => router.push(`/masters/plant/${row.id}/edit`)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => toggleStatus(row.id, row.name)}
            className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
          >
            <ToggleLeft size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Plant Master"
        subtitle="Manufacturing plants and facilities"
        action={
          <button
            onClick={() => router.push('/masters/plant/create')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} /> Add Plant
          </button>
        }
      />
      <DataTable
        columns={columns}
        data={plants}
        loading={loading}
        emptyMessage="No plants found. Click 'Add Plant' to create one."
      />
    </AppLayout>
  );
}
