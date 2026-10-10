'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const DOC_ICONS = { BOM: '🧬', PRODUCT: '📦', PURCHASE_ORDER: '🛒', SALES_ORDER: '📋', AP_BILL: '🧾', CREDIT_OVERRIDE: '💳', VOUCHER: '📒' };

// Routes a pending approval straight to the actual document's own page,
// where the Approve/Reject buttons now live (ApprovalTimeline). No
// duplicate approve/reject UI here - this is just an inbox that gets you
// to the right place fast.
function targetUrl(item) {
  if (item.documentType === 'BOM') return `/inventory/bom/${item.documentId}`;
  if (item.documentType === 'PRODUCT') return `/masters/products?viewApproval=${item.documentId}`;
  return null;
}

const POLL_INTERVAL_MS = 30000;

export default function MyApprovalsPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    // Polls instead of fetching once, so a new approval that arrives
    // while someone is already sitting on this page shows up on its own
    // - matching the same 30s cadence as the sidebar's badge count
    // (ApprovalsContext) - rather than requiring a manual page reload.
    async function load() {
      try {
        const res = await fetch(`${API}/workflows/my-approvals`, { headers: { Authorization: `Bearer ${getToken()}` } });
        if (cancelled) return;
        if (!res.ok) { setError('Could not load pending approvals'); setLoading(false); return; }
        setItems(await res.json());
        setError('');
      } catch {
        if (!cancelled) setError('Could not load pending approvals');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-lg font-semibold mb-1">My Approvals</h1>
        <p className="text-sm text-gray-500 mb-4">Everything currently waiting on your approval. Click one to open it and act.</p>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing pending your approval right now.</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border divide-y">
            {items.map(item => {
              const url = targetUrl(item);
              return (
                <div
                  key={item.id}
                  onClick={() => url && router.push(url)}
                  className={`p-4 flex items-center justify-between ${url ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{DOC_ICONS[item.documentType] || '📄'}</span>
                    <div>
                      <div className="font-mono text-sm text-indigo-600">{item.documentNumber}</div>
                      <div className="text-xs text-gray-400">{item.documentType.replace(/_/g, ' ')} · Submitted {fmtDate(item.createdAt)}</div>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Level {item.currentLevel}/{item.totalLevels}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
