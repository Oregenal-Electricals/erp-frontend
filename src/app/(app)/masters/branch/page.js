'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import api from '@/lib/api';
import { Plus, Pencil, ToggleLeft } from 'lucide-react';

export default function BranchListPage() {
  const router = useRouter();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/masters/branches?includeInactive=true');
      setBranches(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const toggleStatus = async (id, name) => {
    if (!confirm(`Toggle status for "${name}"?`)) return;
    try {
      await api.patch(`/masters/branches/${id}/toggle-status`);
      fetchBranches();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Branch Name' },
    { key: 'branchType', label: 'Type' },
    { key: 'city', label: 'City' },
    { key: 'gstin', label: 'GSTIN' },
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
            onClick={() => router.push(`/masters/branch/${r.id}/edit`)}
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
        title="Branch Master"
        subtitle="Sales and office branches"
        action={
          <button
            onClick={() => router.push('/masters/branch/create')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} /> Add Branch
          </button>
        }
      />
      <DataTable
        columns={columns}
        data={branches}
        loading={loading}
        emptyMessage="No branches found."
      />
    </AppLayout>
  );
}
