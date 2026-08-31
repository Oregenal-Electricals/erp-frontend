'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const BADGE_COLORS = {
  blue: 'bg-blue-100 text-blue-700', green: 'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700', orange: 'bg-orange-100 text-orange-700',
  teal: 'bg-teal-100 text-teal-700',
};

function StatCard({ label, value, tone = 'default', note }) {
  const tones = {
    default: 'bg-gray-50 text-gray-800',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
  };
  return (
    <div className={`rounded-lg p-4 text-center ${tones[tone] || tones.default}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
      {note && <div className="text-[10px] text-gray-400 mt-0.5">{note}</div>}
    </div>
  );
}

export default function GateDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/gate-dashboard/summary`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const s = data?.liveStats || {};

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🚪 Main Gate Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Live view of who and what is at the gate right now</p>
          </div>
          <button onClick={load} className="text-xs text-blue-600 hover:underline">Refresh</button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : !data ? (
          <div className="text-center py-16 text-gray-400">Could not load dashboard</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <StatCard label="People Inside" value={s.peopleInside ?? 0} tone="blue" note="Present today" />
              <StatCard label="Visitors Inside" value={s.visitorsInside ?? 0} tone="blue" />
              <StatCard label="Contract Labour Inside" value={s.contractLabourInside ?? 0} tone="blue" />
              <StatCard label="Vehicles Inside" value={s.vehiclesInside ?? 0} tone="green" />
              <StatCard label="Visitor Vehicles Outside" value={s.visitorVehiclesOutside ?? 0} note="Exited today" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <StatCard label="Waiting Vehicles" value={s.waitingVehicles ?? 0} note="Coming soon" />
              <StatCard label="Pending Approvals" value={s.pendingApprovals ?? 0} tone={s.pendingApprovals > 0 ? 'amber' : 'default'} />
              <StatCard label="RGP Overdue" value={s.returnableOverdue ?? 0} tone={s.returnableOverdue > 0 ? 'red' : 'default'} />
              <StatCard label="Today's Gate Entries" value={(s.todayVisitors ?? 0) + (s.todayVehicles ?? 0)} />
              <StatCard label="Today's Dispatches" value={s.todayDispatches ?? 0} tone="green" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl border shadow-sm">
                <div className="p-4 border-b font-semibold text-gray-800">Visitors Currently Inside</div>
                <div className="divide-y max-h-80 overflow-y-auto">
                  {(data.activeVisitors || []).length === 0 ? (
                    <div className="p-4 text-center text-gray-400 text-sm">None currently inside</div>
                  ) : data.activeVisitors.map(v => (
                    <div key={v.id} className="p-3 text-sm flex justify-between">
                      <span>{v.visitor?.firstName} {v.visitor?.lastName} <span className="text-gray-400">— {v.visitor?.visitorCompany || 'Individual'}</span></span>
                      <span className="text-xs text-gray-400">{new Date(v.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border shadow-sm">
                <div className="p-4 border-b font-semibold text-gray-800">Vehicles Currently Inside</div>
                <div className="divide-y max-h-80 overflow-y-auto">
                  {(data.activeVehicles || []).length === 0 ? (
                    <div className="p-4 text-center text-gray-400 text-sm">None currently inside</div>
                  ) : data.activeVehicles.map(v => (
                    <div key={v.id} className="p-3 text-sm flex justify-between">
                      <span className="font-mono">{v.vehicle?.vehicleNumber}</span>
                      <span className="text-xs text-gray-400">{new Date(v.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b font-semibold text-gray-800">Today&apos;s Activity</div>
              <div className="divide-y max-h-96 overflow-y-auto">
                {(data.timeline || []).length === 0 ? (
                  <div className="p-4 text-center text-gray-400 text-sm">No activity yet today</div>
                ) : data.timeline.map((t, i) => (
                  <div key={i} className="p-3 flex items-center justify-between text-sm">
                    <span className="text-gray-700">{t.title}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${BADGE_COLORS[t.color] || 'bg-gray-100 text-gray-600'}`}>{t.badge}</span>
                      <span className="text-xs text-gray-400">{new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
