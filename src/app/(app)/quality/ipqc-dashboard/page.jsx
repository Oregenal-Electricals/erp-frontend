'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
function authHeaders() { return { Authorization: `Bearer ${getToken()}` }; }

export default function IpqcDashboardPage() {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [sRes, pRes] = await Promise.all([
        fetch(`${API}/production-qc/stats`, { headers: authHeaders() }),
        fetch(`${API}/production-qc?status=PENDING&limit=8`, { headers: authHeaders() }),
      ]);
      if (sRes.ok) setStats(await sRes.json());
      if (pRes.ok) { const d = await pRes.json(); setPending(d.data || []); }
      setLoading(false);
    })();
  }, []);

  const cards = stats ? [
    { label: 'Pending Inspection', value: stats.pending, color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Completed', value: stats.completed, color: 'bg-blue-50 text-blue-700' },
    { label: 'Pass Rate %', value: `${stats.passRate ?? 0}%`, color: 'bg-green-50 text-green-700' },
    { label: 'Failed', value: stats.failed, color: 'bg-red-50 text-red-700' },
  ] : [];

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-lg font-semibold mb-1">IPQC Dashboard</h1>
        <p className="text-sm text-gray-500 mb-4">In-Process Quality Control - work orders awaiting and under inspection.</p>
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {cards.map(c => (
                <div key={c.label} className={`rounded-lg p-4 ${c.color}`}>
                  <div className="text-2xl font-semibold">{c.value ?? 0}</div>
                  <div className="text-xs mt-1">{c.label}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-700">Pending IPQC Inspections</h2>
              <Link href="/production/ipqc" className="text-xs text-indigo-600">View all →</Link>
            </div>
            {pending.length === 0 ? (
              <p className="text-sm text-gray-400">Nothing pending right now.</p>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border divide-y">
                {pending.map(q => (
                  <Link key={q.id} href={`/production/ipqc?id=${q.id}`} className="p-3 flex items-center justify-between text-sm hover:bg-gray-50">
                    <span className="font-mono text-indigo-600">{q.qcNumber}</span>
                    <span className="text-gray-500">{q.workOrder?.woNumber}</span>
                    <span className="text-gray-400 text-xs">{q.workOrder?.productName}</span>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
