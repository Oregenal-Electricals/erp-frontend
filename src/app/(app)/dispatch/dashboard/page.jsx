'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
function authHeaders() { return { Authorization: `Bearer ${getToken()}` }; }

const CARDS = [
  { key: 'dispatchOrdersPending', label: 'Dispatch Orders Pending', color: 'bg-gray-50 text-gray-700' },
  { key: 'stockReservationPending', label: 'Stock Reservation Pending', color: 'bg-yellow-50 text-yellow-700' },
  { key: 'pickingPending', label: 'Picking Pending', color: 'bg-yellow-50 text-yellow-700' },
  { key: 'documentsPending', label: 'Documents Pending', color: 'bg-orange-50 text-orange-700' },
  { key: 'vehiclePending', label: 'Vehicle Pending', color: 'bg-orange-50 text-orange-700' },
  { key: 'loadingPending', label: 'Loading Pending', color: 'bg-blue-50 text-blue-700' },
  { key: 'readyForGateOut', label: 'Ready for Gate-Out', color: 'bg-green-50 text-green-700' },
  { key: 'gateOutPending', label: 'Gate-Out Pending', color: 'bg-blue-50 text-blue-700' },
  { key: 'partiallyDispatched', label: 'Partially Dispatched', color: 'bg-purple-50 text-purple-700' },
  { key: 'reconciliationExceptions', label: 'Reconciliation Exceptions', color: 'bg-red-50 text-red-700' },
];

export default function DispatchDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const res = await fetch(`${API}/dispatch-reconciliation/dashboard`, { headers: authHeaders() });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Could not load dashboard'); return; }
      setData(d);
    })();
  }, []);

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-lg font-semibold mb-4">Dispatch Dashboard</h1>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {!data ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {CARDS.map(c => (
              <div key={c.key} className={`rounded-lg p-4 ${c.color}`}>
                <div className="text-2xl font-semibold">{data[c.key] ?? 0}</div>
                <div className="text-xs mt-1">{c.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
