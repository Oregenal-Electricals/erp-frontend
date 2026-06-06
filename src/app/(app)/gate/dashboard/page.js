'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import {
  Users2, Truck, PackageCheck, PackageOpen, BadgeCheck,
  RefreshCw, AlertTriangle, TrendingUp, TrendingDown,
  CheckCircle, Clock, LogOut, Send,
} from 'lucide-react';

const TIMELINE_COLORS = {
  VISITOR: 'bg-blue-500',
  VEHICLE: 'bg-green-500',
  GIN:     'bg-purple-500',
  GOE:     'bg-orange-500',
  PASS:    'bg-teal-500',
};

const BADGE_STYLES = {
  CHECKED_IN:    'bg-green-100 text-green-700',
  INSIDE:        'bg-green-100 text-green-700',
  PENDING:       'bg-yellow-100 text-yellow-700',
  VERIFIED:      'bg-blue-100 text-blue-700',
  APPROVED:      'bg-blue-100 text-blue-700',
  ISSUED:        'bg-purple-100 text-purple-700',
  DISPATCHED:    'bg-orange-100 text-orange-700',
  IN:            'bg-green-100 text-green-700',
  OUT:           'bg-gray-100 text-gray-600',
};

export default function GateDashboardPage() {
  const router   = useRouter();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState('');
  const [exiting, setExiting]   = useState('');
  const [message, setMessage]   = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get('/gate-dashboard/summary');
      setData(d);
      setLastRefresh(new Date());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // auto-refresh every 60s
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleCheckOut = async (logId, name) => {
    setChecking(logId);
    try {
      await api.patch(`/visitor-logs/${logId}/checkout`, { remarks: 'Checked out from dashboard' });
      setMessage(`✅ ${name} checked out`);
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { setMessage(`❌ ${err.response?.data?.message || 'Failed'}`); }
    finally { setChecking(''); }
  };

  const handleVehicleExit = async (logId, vehicleNumber) => {
    setExiting(logId);
    try {
      await api.patch(`/vehicle-logs/${logId}/exit`, { remarks: 'Exited via dashboard' });
      setMessage(`✅ ${vehicleNumber} exit logged`);
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { setMessage(`❌ ${err.response?.data?.message || 'Failed'}`); }
    finally { setExiting(''); }
  };

  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
  const getDuration = (t) => { const m = Math.floor((Date.now() - new Date(t)) / 60000); return m < 60 ? `${m}m` : `${Math.floor(m/60)}h ${m%60}m`; };

  const s = data?.liveStats;

  const STAT_CARDS = s ? [
    {
      label: 'Visitors Inside',
      value: s.visitorsInside,
      sub: `${s.todayVisitors} today`,
      icon: Users2,
      color: 'bg-blue-500',
      trend: s.todayVisitors >= s.yesterdayVisitors ? 'up' : 'down',
    },
    {
      label: 'Vehicles Inside',
      value: s.vehiclesInside,
      sub: `${s.todayVehicles} today`,
      icon: Truck,
      color: 'bg-green-500',
      trend: s.todayVehicles >= s.yesterdayVehicles ? 'up' : 'down',
    },
    {
      label: 'Pending GINs',
      value: s.pendingGINs,
      sub: 'Awaiting verification',
      icon: PackageCheck,
      color: s.pendingGINs > 0 ? 'bg-yellow-500' : 'bg-gray-400',
      alert: s.pendingGINs > 0,
    },
    {
      label: 'Pending GOEs',
      value: s.pendingGOEs,
      sub: 'Awaiting approval',
      icon: PackageOpen,
      color: s.pendingGOEs > 0 ? 'bg-orange-500' : 'bg-gray-400',
      alert: s.pendingGOEs > 0,
    },
    {
      label: 'Active Passes',
      value: s.issuedPasses,
      sub: `${s.pendingPasses} pending`,
      icon: BadgeCheck,
      color: 'bg-purple-500',
    },
    {
      label: 'Overdue Returns',
      value: s.returnableOverdue,
      sub: 'Past return deadline',
      icon: AlertTriangle,
      color: s.returnableOverdue > 0 ? 'bg-red-500' : 'bg-gray-400',
      alert: s.returnableOverdue > 0,
    },
  ] : [];

  return (
    <AppLayout>
      <PageHeader
        title="Gate Security Dashboard"
        subtitle={lastRefresh ? `Last updated ${formatTime(lastRefresh)} · Auto-refresh every 60s` : 'Loading...'}
        action={
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-2 border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      />

      {message && <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-300 rounded-lg text-blue-700 text-sm font-medium">{message}</div>}

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* STAT CARDS */}
          <div className="grid grid-cols-6 gap-3 mb-6">
            {STAT_CARDS.map((card) => (
              <div key={card.label} className={`bg-white rounded-xl border-2 p-4 ${card.alert ? 'border-red-200' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className={`${card.color} p-2 rounded-lg`}>
                    <card.icon size={16} className="text-white" />
                  </div>
                  {card.trend && (
                    card.trend === 'up'
                      ? <TrendingUp size={14} className="text-green-500" />
                      : <TrendingDown size={14} className="text-red-500" />
                  )}
                  {card.alert && !card.trend && <AlertTriangle size={14} className="text-red-500" />}
                </div>
                <p className={`text-2xl font-bold ${card.alert && card.value > 0 ? 'text-red-600' : 'text-gray-900'}`}>{card.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* ACTIVE VISITORS */}
            <div className="col-span-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Users2 size={14} className="text-blue-600" />
                  Inside Now — {data?.activeVisitors?.length || 0}
                </h3>
                <button onClick={() => router.push('/gate/active')}
                  className="text-xs text-blue-600 hover:underline">View all</button>
              </div>
              <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                {data?.activeVisitors?.length === 0 ? (
                  <p className="p-4 text-xs text-gray-400 text-center">No visitors inside</p>
                ) : data?.activeVisitors?.map((log) => (
                  <div key={log.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{log.visitor?.firstName} {log.visitor?.lastName}</p>
                      <p className="text-xs text-gray-400">{log.visitor?.visitorCompany || 'Individual'} · {getDuration(log.checkInTime)}</p>
                    </div>
                    <button onClick={() => handleCheckOut(log.id, `${log.visitor?.firstName} ${log.visitor?.lastName}`)}
                      disabled={checking === log.id}
                      className="flex items-center gap-1 bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-medium hover:bg-red-200 disabled:opacity-50">
                      <LogOut size={10} />{checking === log.id ? '...' : 'Out'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ACTIVE VEHICLES */}
            <div className="col-span-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Truck size={14} className="text-green-600" />
                  Vehicles — {data?.activeVehicles?.length || 0}
                </h3>
                <button onClick={() => router.push('/gate/vehicles-active')}
                  className="text-xs text-blue-600 hover:underline">View all</button>
              </div>
              <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                {data?.activeVehicles?.length === 0 ? (
                  <p className="p-4 text-xs text-gray-400 text-center">No vehicles inside</p>
                ) : data?.activeVehicles?.map((log) => (
                  <div key={log.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-800 font-mono">{log.vehicle?.vehicleNumber}</p>
                      <p className="text-xs text-gray-400">{log.purpose} · {getDuration(log.entryTime)}</p>
                    </div>
                    <button onClick={() => handleVehicleExit(log.id, log.vehicle?.vehicleNumber)}
                      disabled={exiting === log.id}
                      className="flex items-center gap-1 bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-medium hover:bg-red-200 disabled:opacity-50">
                      <LogOut size={10} />{exiting === log.id ? '...' : 'Exit'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ACTIVITY TIMELINE */}
            <div className="col-span-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Clock size={14} className="text-gray-500" /> Today's Activity
                </h3>
              </div>
              <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                {data?.timeline?.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center">No activity today</p>
                ) : data?.timeline?.map((event, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${TIMELINE_COLORS[event.type] || 'bg-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 font-medium truncate">{event.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{formatTime(event.time)}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${BADGE_STYLES[event.badge] || 'bg-gray-100 text-gray-600'}`}>
                          {event.badge}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PENDING ACTIONS */}
          <div className="grid grid-cols-3 gap-4">
            {/* Pending GINs */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <PackageCheck size={14} className="text-purple-600" />
                  Pending GINs ({s?.pendingGINs || 0})
                </h3>
                <button onClick={() => router.push('/gate/inward?status=PENDING')}
                  className="text-xs text-blue-600 hover:underline">View all</button>
              </div>
              <div className="divide-y divide-gray-50">
                {data?.pendingGINList?.length === 0 ? (
                  <div className="p-4 flex items-center gap-2 text-green-600">
                    <CheckCircle size={14} /><span className="text-xs">All clear</span>
                  </div>
                ) : data?.pendingGINList?.map((gin) => (
                  <div key={gin.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono font-bold text-blue-600">{gin.ginNumber}</p>
                      <p className="text-xs text-gray-500">{gin.supplierName} · {gin.plant?.name}</p>
                    </div>
                    <button onClick={() => router.push(`/gate/inward/${gin.id}`)}
                      className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-medium hover:bg-purple-200">
                      Verify
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending GOEs */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <PackageOpen size={14} className="text-orange-600" />
                  Pending GOEs ({s?.pendingGOEs || 0})
                </h3>
                <button onClick={() => router.push('/gate/outward?status=PENDING')}
                  className="text-xs text-blue-600 hover:underline">View all</button>
              </div>
              <div className="divide-y divide-gray-50">
                {data?.pendingGOEList?.length === 0 ? (
                  <div className="p-4 flex items-center gap-2 text-green-600">
                    <CheckCircle size={14} /><span className="text-xs">All clear</span>
                  </div>
                ) : data?.pendingGOEList?.map((goe) => (
                  <div key={goe.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono font-bold text-blue-600">{goe.goeNumber}</p>
                      <p className="text-xs text-gray-500">{goe.customerName} · {goe.plant?.name}</p>
                    </div>
                    <button onClick={() => router.push(`/gate/outward/${goe.id}`)}
                      className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-medium hover:bg-orange-200">
                      Approve
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Passes */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <BadgeCheck size={14} className="text-teal-600" />
                  Pending Passes ({s?.pendingPasses || 0})
                </h3>
                <button onClick={() => router.push('/gate/passes?status=PENDING')}
                  className="text-xs text-blue-600 hover:underline">View all</button>
              </div>
              <div className="divide-y divide-gray-50">
                {data?.pendingPassList?.length === 0 ? (
                  <div className="p-4 flex items-center gap-2 text-green-600">
                    <CheckCircle size={14} /><span className="text-xs">All clear</span>
                  </div>
                ) : data?.pendingPassList?.map((pass) => (
                  <div key={pass.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono font-bold text-blue-600">{pass.passNumber}</p>
                      <p className="text-xs text-gray-500">
                        {pass.type === 'STAFF_EXIT'
                          ? `${pass.employee?.firstName || pass.carrierName} · Staff Exit`
                          : `${pass.carrierName} · ${pass.type}`}
                      </p>
                    </div>
                    <button onClick={() => router.push(`/gate/passes/${pass.id}`)}
                      className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded font-medium hover:bg-teal-200">
                      {pass.status === 'APPROVED' ? 'Issue' : 'Review'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
