'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { Plus, Eye } from 'lucide-react';
import { clsx } from 'clsx';

const STATUS_STYLES = {
  DRAFT:        'bg-gray-100 text-gray-600',
  SUBMITTED:    'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
  APPROVED:     'bg-green-100 text-green-700',
  REJECTED:     'bg-red-100 text-red-700',
  CANCELLED:    'bg-gray-100 text-gray-400',
};

const PRIORITY_STYLES = {
  LOW:    'bg-gray-100 text-gray-500',
  NORMAL: 'bg-blue-50 text-blue-600',
  HIGH:   'bg-orange-100 text-orange-600',
  URGENT: 'bg-red-100 text-red-600',
};

const TYPE_LABELS = {
  MASTER_DATA:   'Master Data',
  USER_ACCESS:   'User Access',
  PRICE_CHANGE:  'Price Change',
  CONFIG_CHANGE: 'Config Change',
  OTHER:         'Other',
};

export default function ChangeRequestsPage() {
  const router = useRouter();
  const [requests, setRequests]   = useState([]);
  const [stats, setStats]         = useState({});
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab === 'mine')    params.append('myRequests', 'true');
      if (activeTab === 'pending') params.append('pendingApproval', 'true');

      const [reqRes, statsRes] = await Promise.all([
        api.get(`/change-requests?${params.toString()}`),
        api.get('/change-requests/stats'),
      ]);
      setRequests(reqRes.data);
      setStats(statsRes.data);
    } finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <AppLayout>
      <PageHeader
        title="Change Requests"
        subtitle="Track and manage change requests"
        action={
          <button onClick={() => router.push('/change-requests/create')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus size={16} /> New Request
          </button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total',        value: stats.total        ?? 0, color: 'text-gray-800'  },
          { label: 'Pending',      value: stats.pendingApproval ?? 0, color: 'text-blue-600'  },
          { label: 'Approved',     value: stats.approved     ?? 0, color: 'text-green-600' },
          { label: 'Rejected',     value: stats.rejected     ?? 0, color: 'text-red-600'   },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { key: 'all',     label: 'All Requests' },
          { key: 'mine',    label: 'My Requests'  },
          { key: 'pending', label: 'Pending Approval' },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              activeTab === tab.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg font-medium">No requests found</p>
            <p className="text-sm mt-1">Create a new change request to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Request#','Title','Type','Priority','Requested By','Status','Date','Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-blue-600 font-bold">
                      {r.requestNumber}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 max-w-xs truncate">{r.title}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {TYPE_LABELS[r.type] || r.type}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[r.priority] || ''}`}>
                        {r.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.requestedBy?.firstName} {r.requestedBy?.lastName}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_STYLES[r.status] || ''}`}>
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => router.push(`/change-requests/${r.id}`)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
