'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { LogOut } from 'lucide-react';

const STATUS_STYLES = {
  INSIDE: 'bg-green-100 text-green-700',
  EXITED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-700',
};

const PURPOSE_LABELS = {
  INWARD: 'Material Inward',
  OUTWARD: 'Material Outward',
  INTERNAL: 'Internal Movement',
  SERVICE: 'Service',
  VISITOR: 'Visitor',
  OTHER: 'Other',
};

export default function VehicleDetailPage() {
  const router = useRouter();
  const { id } = useParams();

  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');
  const [exitingLogId, setExitingLogId] = useState(null);
  const [outWeight, setOutWeight] = useState('');
  const [exitRemarks, setExitRemarks] = useState('');

  const fetchVehicle = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/vehicles/${id}`);
      setVehicle(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load vehicle');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchVehicle(); }, [fetchVehicle]);

  const handleLogExit = async (logId) => {
    setSaving(logId);
    setError('');
    try {
      await api.patch(`/vehicle-logs/${logId}/exit`, {
        outWeight: outWeight ? Number(outWeight) : undefined,
        remarks: exitRemarks || undefined,
      });
      setExitingLogId(null); setOutWeight(''); setExitRemarks('');
      fetchVehicle();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to log exit');
    } finally { setSaving(''); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  if (loading) return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto"><div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div></div>
    </AppLayout>
  );

  const activeLog = vehicle?.logs?.find(l => l.status === 'INSIDE');

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader
          title={vehicle?.vehicleNumber || 'Vehicle'}
          subtitle={vehicle?.ownerName || vehicle?.vehicleType}
          action={<button onClick={() => router.push('/gate/vehicles')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">← Back</button>}
        />

        {error && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm">{error}</div>}

        <div className="grid grid-cols-3 gap-6">
          {/* Main - log history */}
          <div className="col-span-2 space-y-4">
            {activeLog && (
              <div className="bg-green-50 border-2 border-green-300 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-green-700">Currently Inside</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">{PURPOSE_LABELS[activeLog.purpose] || activeLog.purpose}</span>
                </div>
                <div className="text-xs text-green-700 mb-3">
                  Entered {formatDate(activeLog.entryTime)} · {activeLog.plant?.name}
                  {activeLog.driverName && ` · Driver: ${activeLog.driverName}`}
                </div>
                {exitingLogId !== activeLog.id ? (
                  <button onClick={() => setExitingLogId(activeLog.id)}
                    className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors">
                    <LogOut size={14} /> Log Exit
                  </button>
                ) : (
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Out Weight (optional)</label>
                    <input type="number" value={outWeight} onChange={e => setOutWeight(e.target.value)}
                      placeholder="e.g. 3200.5"
                      style={{ color: '#111827', backgroundColor: '#ffffff' }}
                      className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm mb-2" />
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks (optional)</label>
                    <input type="text" value={exitRemarks} onChange={e => setExitRemarks(e.target.value)}
                      style={{ color: '#111827', backgroundColor: '#ffffff' }}
                      className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm mb-3" />
                    <div className="flex gap-2">
                      <button onClick={() => handleLogExit(activeLog.id)}
                        disabled={!!saving}
                        className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-900 disabled:opacity-50">
                        {saving === activeLog.id ? 'Saving...' : 'Confirm Exit'}
                      </button>
                      <button onClick={() => setExitingLogId(null)} className="border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Log History</h3>
              {!vehicle?.logs || vehicle.logs.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No log entries recorded yet</div>
              ) : (
                <div className="divide-y">
                  {vehicle.logs.map(log => (
                    <div key={log.id} className="py-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800">{PURPOSE_LABELS[log.purpose] || log.purpose}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[log.status] || 'bg-gray-100 text-gray-600'}`}>
                          {log.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {log.plant?.name} {log.entryBy && `— Logged by ${log.entryBy.firstName} ${log.entryBy.lastName}`}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        In: {formatDate(log.entryTime)}{log.exitTime && ` · Out: ${formatDate(log.exitTime)}`}
                      </div>
                      {log.materialDescription && <div className="text-xs text-gray-400 mt-0.5">Material: {log.materialDescription}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - vehicle details */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Details</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-gray-400">Status</dt>
                  <dd className="mt-0.5">
                    {activeLog ? (
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700">Inside</span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-600">Outside</span>
                    )}
                  </dd>
                </div>
                <div><dt className="text-xs text-gray-400">Type</dt><dd className="text-sm text-gray-800 mt-0.5">{vehicle?.vehicleType || '—'}</dd></div>
                {vehicle?.ownerName && <div><dt className="text-xs text-gray-400">Owner</dt><dd className="text-sm text-gray-800 mt-0.5">{vehicle.ownerName}</dd></div>}
                {vehicle?.ownerMobile && <div><dt className="text-xs text-gray-400">Owner Mobile</dt><dd className="text-sm text-gray-800 mt-0.5">{vehicle.ownerMobile}</dd></div>}
                <div><dt className="text-xs text-gray-400">Company Vehicle</dt><dd className="text-sm text-gray-800 mt-0.5">{vehicle?.isCompanyVehicle ? 'Yes' : 'No'}</dd></div>
                <div><dt className="text-xs text-gray-400">Total Trips</dt><dd className="text-sm text-gray-800 mt-0.5">{vehicle?.logs?.length || 0}</dd></div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
