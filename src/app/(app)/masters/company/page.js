'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import api from '@/lib/api';
import { Plus, Pencil, ToggleLeft } from 'lucide-react';

export default function CompanyListPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/masters/companies?includeInactive=true');
      setCompanies(data);
    } catch (err) {
      setError('Failed to load companies');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const toggleStatus = async (id, name) => {
    if (!confirm(`Toggle status for "${name}"?`)) return;
    try {
      await api.patch(`/masters/companies/${id}/toggle-status`);
      fetchCompanies();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Company Name' },
    { key: 'gstin', label: 'GSTIN' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
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
            onClick={() => router.push(`/masters/company/${row.id}/edit`)}
            title="Edit"
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => toggleStatus(row.id, row.name)}
            title={row.isActive ? 'Deactivate' : 'Activate'}
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
        title="Company Master"
        subtitle="Manage your company profile and settings"
        action={
          <button
            onClick={() => router.push('/masters/company/create')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Add Company
          </button>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={companies}
        loading={loading}
        emptyMessage="No companies found. Click 'Add Company' to create one."
      />
    </AppLayout>
  );
}
