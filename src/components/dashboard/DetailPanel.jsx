'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import DataTable from '@/components/common/DataTable';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() {
  if (typeof window !== 'undefined') return localStorage.getItem('erp_token');
}

// Renders the real, live records behind a dashboard widget, reusing each
// module's own list endpoint (never a second copy of that module's query
// logic). One or more `sources` can be tabbed (e.g. Quality has NCR + CAPA).
// Each source: { key, label, url, shape: 'wrapped' | 'bare', columns, link }
export default function DetailPanel({ sources }) {
  const [active, setActive] = useState(sources[0]?.key);
  const [rowsByKey, setRowsByKey] = useState({});
  const [loadingKey, setLoadingKey] = useState(null);

  const current = sources.find((s) => s.key === active) || sources[0];

  useEffect(() => {
    if (!current || rowsByKey[current.key] !== undefined) return;
    setLoadingKey(current.key);
    fetch(`${API}${current.url}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const rows = current.shape === 'bare' ? (Array.isArray(d) ? d : []) : d?.data || [];
        setRowsByKey((prev) => ({ ...prev, [current.key]: rows }));
      })
      .catch(() => setRowsByKey((prev) => ({ ...prev, [current.key]: [] })))
      .finally(() => setLoadingKey(null));
  }, [current, rowsByKey]);

  if (!current) return null;

  return (
    <div className="border-t border-gray-100 pt-4 mt-4">
      {sources.length > 1 && (
        <div className="flex gap-1 mb-3">
          {sources.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setActive(s.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                active === s.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
      <DataTable
        columns={current.columns}
        data={rowsByKey[current.key] || []}
        loading={loadingKey === current.key}
        emptyMessage="Nothing here right now"
      />
      <Link
        href={current.link}
        className="inline-block mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
      >
        Open {current.label} →
      </Link>
    </div>
  );
}
