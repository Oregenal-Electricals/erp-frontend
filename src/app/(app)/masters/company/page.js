'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '@/lib/permissions';
import api from '@/lib/api';
import { Plus, Pencil, ToggleLeft } from 'lucide-react';

export default function CompanyListPage() {
  const router = useRouter();
  const { can, loaded } = usePermissions();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/masters/companies?includeInactive=true');
      setCompanies(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const toggleStatus = async (id, name) => {
    if (!confirm(`Toggle status for "${name}"?`)) return;
    try {
      await api.patch(`/masters/companies/${id}/toggle-status`);
      fetchCompanies();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  const columns = [
    { key: 'code',  label: 'Code' },
    { key: 'name',  label: 'Company Name' },
    { key: 'gstin', label: 'GSTIN' },
    { key: 'city',  label: 'City' },
    { key: 'state', label: 'State' },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) => <StatusBadge active={row.isActive} />,
    },
    // Only show actions column if user has edit permission
    ...(loaded && can(Permission.COMPANY_EDIT) ? [{
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => router.push(`/masters/company/${row.id}/edit`)}
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
    }] : []),
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Company Master"
        subtitle="Manage your company profile"
        action={
          loaded && can(Permission.COMPANY_CREATE) ? (
            <button
              onClick={() => router.push('/masters/company/create')}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} /> Add Company
            </button>
          ) : null
        }
      />
      <DataTable
        columns={columns}
        data={companies}
        loading={loading}
        emptyMessage="No companies found."
      />
    </AppLayout>
  );
}
