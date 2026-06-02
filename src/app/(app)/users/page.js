'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import api from '@/lib/api';
import { Plus, Pencil, ToggleLeft, KeyRound, LockOpen } from 'lucide-react';

const ROLE_COLORS = {
  SUPER_ADMIN:      'bg-red-100 text-red-700',
  CORPORATE_ADMIN:  'bg-orange-100 text-orange-700',
  PLANT_HEAD:       'bg-purple-100 text-purple-700',
  FINANCE_MANAGER:  'bg-blue-100 text-blue-700',
  VIEWER:           'bg-gray-100 text-gray-600',
};

function RoleBadge({ role }) {
  const style = ROLE_COLORS[role] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style}`}>
      {role?.replace(/_/g, ' ')}
    </span>
  );
}

const ROLES = [
  'SUPER_ADMIN','CORPORATE_ADMIN','PLANT_HEAD','UNIT_HEAD',
  'PRODUCTION_HEAD','PLANNING_MANAGER','PURCHASE_MANAGER',
  'STORE_MANAGER','QC_MANAGER','FINANCE_MANAGER','HR_MANAGER',
  'SUPERVISOR','OPERATOR','VIEWER',
];

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [roleFilter, setRoleFilter]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)       params.append('search', search);
      if (roleFilter)   params.append('role', roleFilter);
      if (statusFilter) params.append('isActive', statusFilter);
      const { data } = await api.get(`/users?${params.toString()}`);
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleStatus = async (id, name, isActive) => {
    if (!confirm(`${isActive ? 'Deactivate' : 'Activate'} user "${name}"?`)) return;
    try {
      await api.patch(`/users/${id}/toggle-status`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  const unlockUser = async (id, name) => {
    if (!confirm(`Unlock account for "${name}"?`)) return;
    try {
      await api.patch(`/users/${id}/unlock`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Never';

  const columns = [
    { key: 'employeeCode', label: 'Emp Code', render: (r) => r.employeeCode || '—' },
    {
      key: 'name', label: 'Name',
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900">{r.firstName} {r.lastName}</p>
          <p className="text-xs text-gray-400">{r.email}</p>
        </div>
      ),
    },
    { key: 'role', label: 'Role', render: (r) => <RoleBadge role={r.role} /> },
    { key: 'company', label: 'Company', render: (r) => r.company?.name || '—' },
    {
      key: 'isLocked', label: 'Lock',
      render: (r) => r.isLocked
        ? <span className="text-xs text-red-600 font-medium">🔒 Locked</span>
        : <span className="text-xs text-gray-400">—</span>,
    },
    { key: 'lastLoginAt', label: 'Last Login', render: (r) => formatDate(r.lastLoginAt) },
    { key: 'isActive', label: 'Status', render: (r) => <StatusBadge active={r.isActive} /> },
    {
      key: 'actions', label: 'Actions',
      render: (r) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => router.push(`/users/${r.id}/edit`)}
            title="Edit"
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => router.push(`/users/${r.id}/reset-password`)}
            title="Reset Password"
            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          >
            <KeyRound size={14} />
          </button>
          {r.isLocked && (
            <button
              onClick={() => unlockUser(r.id, `${r.firstName} ${r.lastName}`)}
              title="Unlock Account"
              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            >
              <LockOpen size={14} />
            </button>
          )}
          <button
            onClick={() => toggleStatus(r.id, `${r.firstName} ${r.lastName}`, r.isActive)}
            title={r.isActive ? 'Deactivate' : 'Activate'}
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
        title="User Management"
        subtitle="Manage system users and their roles"
        action={
          <button
            onClick={() => router.push('/users/create')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} /> Add User
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search name, email, code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ color: '#111827', backgroundColor: '#ffffff' }}
          className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:border-blue-500"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ color: '#111827', backgroundColor: '#ffffff' }}
          className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ color: '#111827', backgroundColor: '#ffffff' }}
          className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        {(search || roleFilter || statusFilter) && (
          <button
            onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter(''); }}
            className="text-sm text-gray-500 hover:text-red-600 px-3 py-2 rounded-lg border-2 border-gray-200 hover:border-red-200 transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage="No users found."
      />
    </AppLayout>
  );
}
