'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import ShiftBoardSection from './ShiftBoardSection';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';

const STATUS_COLORS = { DRAFT: 'bg-gray-100 text-gray-600', CONFIRMED: 'bg-green-100 text-green-700' };
const SHIFT_COLORS = { MORNING: 'bg-yellow-100 text-yellow-700', EVENING: 'bg-blue-100 text-blue-700', NIGHT: 'bg-purple-100 text-purple-700' };
const WO_STATUS_COLORS = { DRAFT:'bg-gray-100 text-gray-500', RELEASED:'bg-blue-100 text-blue-700', IN_PROGRESS:'bg-yellow-100 text-yellow-700', COMPLETED:'bg-green-100 text-green-700' };
// ProductionEntryService.create() already snapshots a targetQty (from the
// product's standard productivity rate x manpower x period duration) and
// an achievementPercent on every entry - this just surfaces what was
// already being computed and returned, closing the "Target" half of
// "Hourly Target/Actual production self-entry": without this, the page
// only ever showed Actual.
const achColor = pct => pct == null ? 'text-gray-400' : pct >= 100 ? 'text-green-600' : pct >= 80 ? 'text-yellow-600' : 'text-red-600';
// manpowerAllotted is the Plant Head's approved allocation; manpowerQty is
// what the supervisor actually had this entry - they can differ (people
// pulled to another line) and that gap matters for efficiency costing, so
// show both rather than just the one figure.
const manpowerColor = (used, allotted) => allotted == null || used == null ? 'text-gray-500' : used < allotted ? 'text-amber-600' : used > allotted ? 'text-blue-600' : 'text-gray-700';

export default function ProductionRecordingPage() {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [wos, setWos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showProgress, setShowProgress] = useState(null);
  const [progress, setProgress] = useState(null);

  async function fetchAll() {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    try {
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const [entRes, statsRes, woRes] = await Promise.all([
      fetch(`${API}/production-entries?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/production-entries/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/work-orders?limit=50`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (entRes.ok) { const d = await entRes.json(); setEntries(d.data); setTotal(d.total); setTotalPages(d.totalPages); }
    if (statsRes.ok) setStats(await statsRes.json());
    if (woRes.ok) { const d = await woRes.json(); setWos((d.data||[]).filter(w => ['IN_PROGRESS','RELEASED'].includes(w.status))); }
    } catch {
    // A network hiccup on any one of these must not leave the page
    // stuck on "Loading..." forever (same failure mode fixed for CAPA).
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, [page, search, status]);

  async function handleConfirm(id) {
    const res = await fetch(`${API}/production-entries/${id}/confirm`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) fetchAll();
    else { const d = await res.json(); alert(d.message); }
  }

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

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
            {[
              { label: 'Total Entries', value: stats.total, color: 'bg-gray-50' },
              { label: 'Draft', value: stats.draft, color: 'bg-yellow-50' },
              { label: 'Confirmed', value: stats.confirmed, color: 'bg-green-50' },
              { label: 'Good Qty', value: stats.totalGoodQty?.toLocaleString(), color: 'bg-blue-50' },
              { label: 'Scrap Qty', value: stats.totalScrapQty?.toLocaleString(), color: 'bg-red-50' },
              { label: 'Total Output', value: stats.totalQty?.toLocaleString(), color: 'bg-purple-50' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-3 text-center`}>
                <div className="text-lg font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

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

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex gap-3">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search entry number..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="CONFIRMED">Confirmed</option>
            </select>
            <span className="text-sm text-gray-500 self-center">{total} entries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>{['Entry No.','Work Order','Product','Date','Shift','Operator','Machine','Manpower','Target','Good Qty','Scrap','Achievement','Status','Action'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {loading ? <tr><td colSpan={14} className="text-center py-10 text-gray-400">Loading...</td></tr>
                : entries.length === 0 ? <tr><td colSpan={14} className="text-center py-10 text-gray-400">No production entries</td></tr>
                : entries.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs text-blue-600 font-bold">{e.entryNumber}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600">{e.workOrder?.woNumber}</td>
                    <td className="px-3 py-2 text-xs">{e.workOrder?.productName}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{fmtDate(e.entryDate)}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-1 rounded text-xs font-medium ${SHIFT_COLORS[e.shift]}`}>{e.shift}</span></td>
                    <td className="px-3 py-2 text-xs text-gray-600">{e.operatorName||'—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{e.machineName||'—'}</td>
                    <td className={`px-3 py-2 text-xs font-medium ${manpowerColor(e.manpowerQty, e.manpowerAllotted)}`} title="Used / Allotted (by Plant Head)">
                      {e.manpowerQty ?? '—'}{e.manpowerAllotted != null && e.manpowerAllotted !== e.manpowerQty ? ` / ${e.manpowerAllotted}` : ''}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">{e.targetQty != null ? e.targetQty : 'No rate set'}</td>
                    <td className="px-3 py-2 text-xs font-bold text-green-700">{e.goodQty}</td>
                    <td className="px-3 py-2 text-xs font-bold text-red-500">{e.scrapQty}</td>
                    <td className={`px-3 py-2 text-xs font-bold ${achColor(e.achievementPercent)}`}>{e.achievementPercent != null ? `${e.achievementPercent}%` : '—'}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[e.status]}`}>{e.status}</span></td>
                    <td className="px-3 py-2">
                      {e.status === 'DRAFT' && <button onClick={() => handleConfirm(e.id)} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Confirm</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="p-4 border-t flex justify-center gap-2">
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button>
              <span className="px-3 py-1 text-sm">{page} of {totalPages}</span>
              <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </div>

        <ShiftBoardSection />
      </div>
    </AppLayout>
  );
}
