'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
function authHeaders() { return { Authorization: `Bearer ${getToken()}` }; }

export default function PickingLoadingPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const res = await fetch(`${API}/dispatch-plans?status=APPROVED&limit=50`, { headers: authHeaders() });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Could not load queue'); setLoading(false); return; }
      setPlans(d.data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-lg font-semibold mb-1">Picking & Loading</h1>
        <p className="text-sm text-gray-500 mb-4">Approved Dispatch Plans ready to fulfill - reserve, pick, verify, pack, assign vehicle, load, confirm, and Gate-Out.</p>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : plans.length === 0 ? (
          <p className="text-sm text-gray-400">No approved plans waiting for fulfillment right now.</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border divide-y">
            {plans.map(p => (
              <div key={p.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <span className="font-mono text-sm text-indigo-600">{p.planNumber}</span>
                  <span className="text-sm text-gray-500 ml-2">{p.customerName}</span>
                </div>
                <Link href={`/sales/dispatch-fulfillment?planId=${p.id}`} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm">Fulfill</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
