'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import api from '@/lib/api';
import { Plus, Pencil, ToggleLeft } from 'lucide-react';

export default function UnitListPage() {
  const router = useRouter();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/masters/units?includeInactive=true');
      setUnits(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const toggleStatus = async (id, name) => {
    if (!confirm(`Toggle status for "${name}"?`)) return;
    try {
      await api.patch(`/masters/units/${id}/toggle-status`);
      fetchUnits();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Unit Name' },
    { key: 'unitType', label: 'Type' },
    { key: 'plant', label: 'Plant', render: (r) => r.plant?.name ?? '—' },
    {
      key: 'isActive',
      label: 'Status',
      render: (r) => <StatusBadge active={r.isActive} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => router.push(`/masters/unit/${r.id}/edit`)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => toggleStatus(r.id, r.name)}
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
        title="Unit Master"
        subtitle="Production units and lines"
        action={
          <button
            onClick={() => router.push('/masters/unit/create')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} /> Add Unit
          </button>
        }
      />
      <DataTable
        columns={columns}
        data={units}
        loading={loading}
        emptyMessage="No units found. Click 'Add Unit' to create one."
      />
    </AppLayout>
  );
}
