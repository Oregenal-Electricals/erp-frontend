'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import api from '@/lib/api';
import { Plus, Star, Lock } from 'lucide-react';
import { clsx } from 'clsx';

const STATUS_STYLES = {
  CURRENT: 'bg-green-100 text-green-700',
  OPEN: 'bg-blue-100 text-blue-700',
  CLOSED: 'bg-gray-100 text-gray-500',
};

function FYStatusBadge({ status }) {
  return (
    <span
      className={clsx(
        'text-xs px-2.5 py-0.5 rounded-full font-medium',
        STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-500',
      )}
    >
      {status}
    </span>
  );
}

export default function FinancialYearPage() {
  const router = useRouter();
  const [fys, setFys] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFYs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/masters/financial-years');
      setFys(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFYs();
  }, [fetchFYs]);

  const setCurrent = async (id, label) => {
    if (!confirm(`Set "${label}" as the current financial year?`)) return;
    try {
      await api.patch(`/masters/financial-years/${id}/set-current`);
      fetchFYs();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  const closeFY = async (id, label) => {
    if (!confirm(`Close financial year "${label}"? This cannot be undone.`))
      return;
    try {
      await api.patch(`/masters/financial-years/${id}/close`);
      fetchFYs();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '—';

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'label', label: 'Financial Year' },
    {
      key: 'startDate',
      label: 'Start Date',
      render: (r) => formatDate(r.startDate),
    },
    { key: 'endDate', label: 'End Date', render: (r) => formatDate(r.endDate) },
    { key: 'company', label: 'Company', render: (r) => r.company?.name ?? '—' },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <FYStatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex items-center gap-1">
          {r.status === 'OPEN' && (
            <button
              onClick={() => setCurrent(r.id, r.label)}
              title="Set as Current"
              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            >
              <Star size={14} />
            </button>
          )}
          {r.status !== 'CLOSED' && (
            <button
              onClick={() => closeFY(r.id, r.label)}
              title="Close Financial Year"
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Lock size={14} />
            </button>
          )}
          {r.status === 'CLOSED' && (
            <span className="text-xs text-gray-400 px-2">Closed</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Financial Years"
        subtitle="Manage accounting periods"
        action={
          <button
            onClick={() => router.push('/masters/financial-year/create')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} /> Add Financial Year
          </button>
        }
      />
      <DataTable
        columns={columns}
        data={fys}
        loading={loading}
        emptyMessage="No financial years found."
      />
    </AppLayout>
  );
}
