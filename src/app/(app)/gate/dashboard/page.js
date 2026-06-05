'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { Users2, UserCheck, UserX, AlertTriangle, RefreshCw } from 'lucide-react';

export default function GateDashboardPage() {
  const [stats, setStats]     = useState(null);
  const [active, setActive]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, activeRes] = await Promise.all([
        api.get('/visitors/stats'),
        api.get('/visitor-logs/active'),
      ]);
      setStats(statsRes.data);
      setActive(activeRes.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

  const CARDS = stats ? [
    { label: 'Total Visitors',    value: stats.totalVisitors, icon: Users2,    color: 'bg-blue-500'   },
    { label: 'Currently Inside',  value: stats.activeNow,     icon: UserCheck, color: 'bg-green-500'  },
    { label: 'Today Check-ins',   value: stats.todayIn,       icon: UserCheck, color: 'bg-purple-500' },
    { label: 'Today Check-outs',  value: stats.todayOut,      icon: UserX,     color: 'bg-orange-500' },
    { label: 'Total Visits',      value: stats.totalLogs,     icon: Users2,    color: 'bg-teal-500'   },
    { label: 'Blacklisted',       value: stats.blacklisted,   icon: AlertTriangle, color: 'bg-red-500' },
  ] : [];

  return (
    <AppLayout>
      <PageHeader title="Gate Security Dashboard"
        subtitle="Real-time visitor monitoring"
        action={
          <button onClick={fetchData}
            className="flex items-center gap-2 border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {CARDS.map((card) => (
              <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
                <div className={`${card.color} p-3 rounded-xl`}>
                  <card.icon size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-700">
                Currently Inside — <span className="text-green-600">{active.length} visitors</span>
              </h3>
            </div>
            {active.length === 0 ? (
              <div className="p-10 text-center text-gray-400">No visitors currently inside</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Pass#','Visitor','Company','Purpose','Plant','Check-in','Expected Out'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {active.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-blue-600 font-bold">{log.logNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{log.visitor?.firstName} {log.visitor?.lastName}</p>
                        <p className="text-xs text-gray-400">{log.visitor?.mobile}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{log.visitor?.visitorCompany || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{log.purpose}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{log.plant?.name}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{formatTime(log.checkInTime)}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{formatTime(log.expectedOutTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </AppLayout>
  );
}
