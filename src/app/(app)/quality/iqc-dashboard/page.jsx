'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
function authHeaders() { return { Authorization: `Bearer ${getToken()}` }; }

export default function IqcDashboardPage() {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [sRes, pRes] = await Promise.all([
        fetch(`${API}/iqc/stats`, { headers: authHeaders() }),
        fetch(`${API}/iqc?status=PENDING&limit=8`, { headers: authHeaders() }),
      ]);
      if (sRes.ok) setStats(await sRes.json());
      if (pRes.ok) { const d = await pRes.json(); setPending(d.data || []); }
      setLoading(false);
    })();
  }, []);

  const cards = stats ? [
    { label: 'Pending Inspection', value: stats.pending, color: 'bg-yellow-50 text-yellow-700' },
    { label: 'In Progress', value: stats.inProgress, color: 'bg-blue-50 text-blue-700' },
    { label: 'Approved', value: stats.approved, color: 'bg-green-50 text-green-700' },
    { label: 'Total IQC Records', value: stats.total, color: 'bg-gray-50 text-gray-700' },
  ] : [];

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-lg font-semibold mb-1">IQC Dashboard</h1>
        <p className="text-sm text-gray-500 mb-4">Incoming Quality Control - material awaiting and under inspection.</p>
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
              <h2 className="text-sm font-semibold text-gray-700">Pending IQC Inspections</h2>
              <Link href="/inventory/iqc" className="text-xs text-indigo-600">View all →</Link>
            </div>
            {pending.length === 0 ? (
              <p className="text-sm text-gray-400">Nothing pending right now.</p>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border divide-y">
                {pending.map(i => (
                  <Link key={i.id} href={`/inventory/iqc?id=${i.id}`} className="p-3 flex items-center justify-between text-sm hover:bg-gray-50">
                    <span className="font-mono text-indigo-600">{i.iqcNumber}</span>
                    <span className="text-gray-500">{i.grn?.grnNumber}</span>
                    <span className="text-gray-400 text-xs">{i.grn?.warehouse?.name}</span>
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
