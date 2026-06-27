'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }

const STATUS_COLORS = {
  QUARANTINED: 'bg-red-100 text-red-700',
  PARTIALLY_DISPOSITIONED: 'bg-yellow-100 text-yellow-700',
  CLOSED: 'bg-gray-100 text-gray-600',
};

const DISP_COLORS = {
  PENDING: 'bg-orange-100 text-orange-700',
  RTV: 'bg-blue-100 text-blue-700',
  SCRAPPED: 'bg-gray-100 text-gray-500',
  REWORK: 'bg-purple-100 text-purple-700',
  ACCEPTED: 'bg-green-100 text-green-700',
};

const DISPOSITIONS = ['RTV', 'SCRAPPED', 'REWORK', 'ACCEPTED'];

export default function RejectedStockPage() {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [approvedIqcs, setApprovedIqcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [showDisposeModal, setShowDisposeModal] = useState(null);
  const [disposeForm, setDisposeForm] = useState({ disposition: 'RTV', dispositionNotes: '', dispositionBy: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [createMsg, setCreateMsg] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const [recRes, statsRes, iqcRes] = await Promise.all([
      fetch(`${API}/rejected-stock?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/rejected-stock/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/iqc?status=APPROVED&limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (recRes.ok) { const d = await recRes.json(); setRecords(d.data); setTotalPages(d.totalPages); setTotal(d.total); }
    if (statsRes.ok) setStats(await statsRes.json());
    if (iqcRes.ok) { const d = await iqcRes.json(); setApprovedIqcs(d.data?.filter(i => i._count?.items > 0) || []); }
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleCreateFromIqc(iqcId) {
    setSaving(true); setCreateMsg('');
    const res = await fetch(`${API}/rejected-stock/from-iqc/${iqcId}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    const data = await res.json();
    if (res.ok) { setCreateMsg(`Created ${data.rejectionNumber}`); fetchAll(); }
    else setCreateMsg(data.message || 'Failed');
    setSaving(false);
  }

  async function handleDispose(recId, itemId) {
    setSaving(true); setError('');
    const res = await fetch(`${API}/rejected-stock/${recId}/items/${itemId}/dispose`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(disposeForm),
    });
    const data = await res.json();
    if (res.ok) {
      setShowDisposeModal(null);
      // Update expanded record
      setRecords(prev => prev.map(r => r.id === recId ? { ...r, items: data.items, status: data.status } : r));
      fetchAll();
    } else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleClose(id) {
    const res = await fetch(`${API}/rejected-stock/${id}/close`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) fetchAll();
    else { const d = await res.json(); alert(d.message); }
  }

  async function handleExpand(id) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    const res = await fetch(`${API}/rejected-stock/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const data = await res.json();
      setRecords(prev => prev.map(r => r.id === id ? { ...r, items: data.items } : r));
    }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rejected Stock</h1>
            <p className="text-gray-500 text-sm mt-1">Quarantine, disposition and RTV management for IQC rejected goods</p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Records', value: stats.total, color: 'bg-gray-50' },
              { label: 'Quarantined', value: stats.quarantined, color: 'bg-red-50' },
              { label: 'Closed', value: stats.closed, color: 'bg-green-50' },
              { label: 'Total Rejected Qty', value: stats.totalRejectedQty, color: 'bg-orange-50' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {approvedIqcs.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-sm font-semibold text-red-800 mb-2">⚠️ IQC Approved with rejections — Create quarantine records</div>
            {createMsg && <div className="text-xs text-green-600 mb-2">{createMsg}</div>}
            <div className="space-y-2">
              {approvedIqcs.map(iqc => (
                <div key={iqc.id} className="flex items-center justify-between bg-white rounded p-3 border">
                  <div>
                    <span className="font-mono text-sm font-bold text-blue-600">{iqc.iqcNumber}</span>
                    <span className="ml-3 text-xs text-gray-500">GRN: {iqc.grn?.grnNumber}</span>
                  </div>
                  <button onClick={() => handleCreateFromIqc(iqc.id)} disabled={saving} className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
                    Create Quarantine Record
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats?.byDisposition?.length > 0 && (
          <div className="bg-white rounded-xl border p-4 mb-6 flex gap-4 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 self-center">DISPOSITION SUMMARY:</span>
            {stats.byDisposition.map(d => (
              <div key={d.disposition} className={`px-3 py-2 rounded-lg text-xs font-medium ${DISP_COLORS[d.disposition]}`}>
                {d.disposition}: {d._count} items · qty={d._sum.rejectedQty}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b flex gap-3">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search rejection number..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} records</span>
          </div>

          <div className="space-y-0">
            {loading ? (
              <div className="text-center py-10 text-gray-400">Loading...</div>
            ) : records.length === 0 ? (
              <div className="text-center py-10 text-gray-400">No rejected stock records</div>
            ) : records.map(rec => (
              <div key={rec.id} className="border-b last:border-b-0">
                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => handleExpand(rec.id)}>
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-red-600">{rec.rejectionNumber}</span>
                    <span className="font-mono text-xs text-gray-400">IQC: {rec.iqc?.iqcNumber}</span>
                    <span className="font-mono text-xs text-gray-400">GRN: {rec.grn?.grnNumber}</span>
                    <span className="text-xs text-gray-500">{rec.warehouse?.name}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[rec.status]}`}>{rec.status?.replace(/_/g,' ')}</span>
                    <span className="text-xs text-gray-500">{rec._count?.items || rec.items?.length || 0} items · qty={rec.totalRejectedQty}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {rec.status !== 'CLOSED' && (
                      <button onClick={e => { e.stopPropagation(); handleClose(rec.id); }} className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700">Close</button>
                    )}
                    <span className="text-gray-400 text-xs">{expandedId === rec.id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {expandedId === rec.id && rec.items && (
                  <div className="px-4 pb-4 bg-red-50 border-t">
                    <table className="w-full text-xs mt-3">
                      <thead className="bg-white text-gray-500 uppercase">
                        <tr>{['Item Code','Item Name','UOM','Rejected Qty','Reason','Disposition','Action'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-red-100">
                        {rec.items.map(item => (
                          <tr key={item.id} className="bg-white">
                            <td className="px-3 py-2 font-mono text-red-600">{item.itemCode}</td>
                            <td className="px-3 py-2">{item.itemName}</td>
                            <td className="px-3 py-2 text-gray-500">{item.uom}</td>
                            <td className="px-3 py-2 font-bold text-red-600">{item.rejectedQty}</td>
                            <td className="px-3 py-2 text-gray-600">{item.rejectionReason || '—'}</td>
                            <td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs font-medium ${DISP_COLORS[item.disposition]}`}>{item.disposition}</span></td>
                            <td className="px-3 py-2">
                              {item.disposition === 'PENDING' && rec.status !== 'CLOSED' && (
                                <button onClick={() => { setShowDisposeModal({ recId: rec.id, itemId: item.id }); setDisposeForm({ disposition: 'RTV', dispositionNotes: '', dispositionBy: '' }); setError(''); }} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Dispose</button>
                              )}
                              {item.disposition !== 'PENDING' && (
                                <span className="text-xs text-gray-400">{item.dispositionBy || '—'}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {showDisposeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold text-red-700">Disposition Decision</h2>
                <button onClick={() => setShowDisposeModal(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Disposition *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {DISPOSITIONS.map(d => (
                      <button key={d} onClick={() => setDisposeForm(f => ({ ...f, disposition: d }))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border-2 ${disposeForm.disposition === d ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        {d === 'RTV' ? 'Return to Vendor' : d === 'SCRAPPED' ? 'Scrap' : d === 'REWORK' ? 'Rework' : 'Accept (Deviation)'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Disposition By</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Name of approver" value={disposeForm.dispositionBy} onChange={e => setDisposeForm(f => ({ ...f, dispositionBy: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Notes</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={disposeForm.dispositionNotes} onChange={e => setDisposeForm(f => ({ ...f, dispositionNotes: e.target.value }))} />
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowDisposeModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={() => handleDispose(showDisposeModal.recId, showDisposeModal.itemId)} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Confirm Disposition'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
