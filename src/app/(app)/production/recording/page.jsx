'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import ShiftBoardSection from './ShiftBoardSection';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const WO_STATUS_COLORS = { DRAFT:'bg-gray-100 text-gray-500', RELEASED:'bg-blue-100 text-blue-700', IN_PROGRESS:'bg-yellow-100 text-yellow-700', COMPLETED:'bg-green-100 text-green-700' };

// Rahul's call (2026-10-31): the old generic entries list/search/stats on
// this page was a second, disconnected-looking "entry system" sitting above
// Shift Board, even though Shift Board is now this page's only real way to
// put numbers in. That whole list/stats block is gone - Shift Board itself
// now shows today's saved entries and lets you Confirm them (see
// ShiftBoardSection.jsx). The one thing worth keeping up here is this
// Work Order progress panel: it's genuinely useful context *before* you
// link a Shift Board line to a Work Order (which one is already how far
// along), not a second copy of the same ledger.
export default function ProductionRecordingPage() {
  const [wos, setWos] = useState([]);
  const [showProgress, setShowProgress] = useState(null);
  const [progress, setProgress] = useState(null);

  async function fetchWos() {
    if (!getToken()) return;
    const res = await fetch(`${API}/work-orders?limit=50`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) { const d = await res.json(); setWos((d.data||[]).filter(w => ['IN_PROGRESS','RELEASED'].includes(w.status))); }
  }

  useEffect(() => { fetchWos(); }, []);

  async function handleViewProgress(woId) {
    setShowProgress(woId); setProgress(null);
    const res = await fetch(`${API}/production-entries/wo-progress/${woId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setProgress(await res.json());
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Production Recording</h1>
            <p className="text-gray-500 text-sm mt-1">Record daily/shift production output against work orders</p>
          </div>
        </div>

        {wos.length > 0 && (
          <div className="bg-white rounded-xl border p-4 mb-4">
            <div className="text-xs font-semibold text-gray-500 mb-2">ACTIVE WORK ORDERS — Click to view progress</div>
            <div className="flex gap-2 flex-wrap">
              {wos.map(wo => (
                <button key={wo.id} onClick={() => handleViewProgress(wo.id)}
                  className={`px-3 py-2 rounded-lg text-xs border ${showProgress===wo.id ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}>
                  <span className="font-mono font-bold">{wo.woNumber}</span>
                  <span className="ml-2 text-gray-400">{wo.productName}</span>
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${WO_STATUS_COLORS[wo.status]}`}>{wo.status?.replace(/_/g,' ')}</span>
                  <span className="ml-2">{Math.round(wo.completedQty/wo.plannedQty*100)}%</span>
                </button>
              ))}
            </div>
            {showProgress && progress && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4 mb-3">
                  <span className="font-bold">{progress.workOrder?.woNumber}</span>
                  <span className="text-gray-600">{progress.workOrder?.productName}</span>
                  <span className="font-bold text-blue-700">{progress.summary.completionPercent}% Complete</span>
                </div>
                <div className="bg-gray-200 rounded-full h-4 mb-3">
                  <div className={`h-4 rounded-full ${progress.summary.completionPercent>=100 ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(100,progress.summary.completionPercent)}%` }}></div>
                </div>
                <div className="grid grid-cols-4 gap-3 text-center text-xs">
                  {[
                    { label: 'Planned', value: progress.summary.plannedQty },
                    { label: 'Good Output', value: progress.summary.confirmedGoodQty },
                    { label: 'Scrap', value: progress.summary.confirmedScrapQty },
                    { label: 'Remaining', value: progress.summary.pendingQty },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded p-2">
                      <div className="font-bold text-gray-800">{s.value}</div>
                      <div className="text-gray-500">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <ShiftBoardSection onEntryCreated={fetchWos} />
      </div>
    </AppLayout>
  );
}
