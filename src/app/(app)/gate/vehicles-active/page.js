'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { RefreshCw, LogOut } from 'lucide-react';

export default function ActiveVehiclesPage() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [exiting, setExiting] = useState('');
  const [outWeight, setOutWeight] = useState({});
  const [message, setMessage] = useState('');

  const fetchActive = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/vehicle-logs/active');
      setLogs(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchActive(); }, []);

  const handleExit = async (logId, vehicleNumber) => {
    if (!confirm(`Log exit for ${vehicleNumber}?`)) return;
    setExiting(logId);
    try {
      const payload = { remarks: 'Exited at gate' };
      if (outWeight[logId]) payload.outWeight = parseFloat(outWeight[logId]);
      await api.patch(`/vehicle-logs/${logId}/exit`, payload);
      setMessage(`✅ ${vehicleNumber} exit logged`);
      fetchActive();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || 'Failed'}`);
    } finally { setExiting(''); }
  };

  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
  const getDuration = (t) => { const m = Math.floor((Date.now() - new Date(t)) / 60000); return m < 60 ? `${m}m` : `${Math.floor(m/60)}h ${m%60}m`; };

  return (
    <AppLayout>
      <PageHeader title="Active Vehicles" subtitle={`${logs.length} vehicles inside`}
        action={<button onClick={fetchActive} className="flex items-center gap-2 border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"><RefreshCw size={14} /> Refresh</button>}
      />
      {message && <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-300 rounded-lg text-blue-700 text-sm font-medium">{message}</div>}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No vehicles currently inside</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Log#','Vehicle','Driver','Purpose','Plant','IN Weight','Duration','OUT Weight','Action'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 font-mono text-xs text-blue-600 font-bold">{log.logNumber}</td>
                  <td className="px-3 py-3">
                    <p className="font-bold text-gray-900 font-mono">{log.vehicle?.vehicleNumber}</p>
                    <p className="text-xs text-gray-400">{log.vehicle?.vehicleType}</p>
                  </td>
                  <td className="px-3 py-3 text-gray-600 text-xs">{log.driverName}</td>
                  <td className="px-3 py-3">
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{log.purpose}</span>
                  </td>
                  <td className="px-3 py-3 text-gray-600 text-xs">{log.plant?.name}</td>
                  <td className="px-3 py-3 text-gray-600 text-xs">{log.inWeight ? `${log.inWeight} kg` : '—'}</td>
                  <td className="px-3 py-3">
                    <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">{getDuration(log.entryTime)}</span>
                  </td>
                  <td className="px-3 py-3">
                    <input type="number" placeholder="kg"
                      value={outWeight[log.id] || ''}
                      onChange={(e) => setOutWeight(p => ({ ...p, [log.id]: e.target.value }))}
                      style={{ color: '#111827', backgroundColor: '#ffffff' }}
                      className="w-20 border-2 border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500" />
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => handleExit(log.id, log.vehicle?.vehicleNumber)}
                      disabled={exiting === log.id}
                      className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                      <LogOut size={12} />{exiting === log.id ? 'Exiting...' : 'Exit'}
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
