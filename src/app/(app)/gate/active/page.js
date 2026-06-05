'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { RefreshCw, LogOut } from 'lucide-react';

export default function ActiveVisitorsPage() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState('');
  const [message, setMessage] = useState('');

  const fetchActive = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/visitor-logs/active');
      setLogs(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchActive(); }, []);

  const handleCheckOut = async (logId, name) => {
    if (!confirm(`Check out ${name}?`)) return;
    setChecking(logId);
    try {
      await api.patch(`/visitor-logs/${logId}/checkout`, { remarks: 'Checked out at gate' });
      setMessage(`✅ ${name} checked out successfully`);
      fetchActive();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || 'Failed'}`);
    } finally { setChecking(''); }
  };

  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
  const getDuration = (checkIn) => {
    const mins = Math.floor((Date.now() - new Date(checkIn)) / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <AppLayout>
      <PageHeader
        title="Active Visitors"
        subtitle={`${logs.length} visitors currently inside`}
        action={
          <button onClick={fetchActive}
            className="flex items-center gap-2 border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      {message && <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-300 rounded-lg text-blue-700 text-sm font-medium">{message}</div>}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg font-medium">No visitors inside</p>
            <p className="text-sm mt-1">All visitors have checked out</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Pass#','Visitor','Purpose','Plant','Check-in','Duration','Host','Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-blue-600 font-bold">{log.logNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{log.visitor?.firstName} {log.visitor?.lastName}</p>
                    <p className="text-xs text-gray-400">{log.visitor?.mobile}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs">
                    <p className="truncate">{log.purpose}</p>
                    {log.vehicleNumber && <p className="text-xs text-gray-400">{log.vehicleNumber}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{log.plant?.name}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{formatTime(log.checkInTime)}</td>
                  <td className="px-4 py-3">
                    <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      {getDuration(log.checkInTime)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {log.hostEmployee ? `${log.hostEmployee.firstName} ${log.hostEmployee.lastName}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleCheckOut(log.id, `${log.visitor?.firstName} ${log.visitor?.lastName}`)}
                      disabled={checking === log.id}
                      className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                      <LogOut size={12} />
                      {checking === log.id ? 'Out...' : 'Check Out'}
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
