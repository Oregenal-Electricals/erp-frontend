'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const STATUS_COLORS = {
  PENDING: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
};

export default function IqcPage() {
  const [inspections, setInspections] = useState([]);
  const [stats, setStats] = useState(null);
  const [pendingGrns, setPendingGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInspectModal, setShowInspectModal] = useState(null);
  const [createForm, setCreateForm] = useState({ grnId: '', inspectedBy: '', remarks: '' });
  const [inspectItems, setInspectItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [viewDetail, setViewDetail] = useState(null);
  async function handleView(id) {
    const res = await fetch(`${API}/iqc/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setViewDetail(await res.json());
  }

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const [iqcRes, statsRes, grnRes] = await Promise.all([
      fetch(`${API}/iqc?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/iqc/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/grn?status=IQC_PENDING&limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (iqcRes.ok) { const d = await iqcRes.json(); setInspections(d.data); setTotalPages(d.totalPages); setTotal(d.total); }
    if (statsRes.ok) setStats(await statsRes.json());
    if (grnRes.ok) { const d = await grnRes.json(); setPendingGrns(d.data || []); }
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { ...createForm };
    if (!body.inspectedBy) delete body.inspectedBy;
    if (!body.remarks) delete body.remarks;
    const res = await fetch(`${API}/iqc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      setShowCreateModal(false);
      setShowInspectModal(data.id);
      setInspectItems(data.items.map(i => ({ ...i })));
      fetchAll();
    } else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleOpenInspect(id) {
    const res = await fetch(`${API}/iqc/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const data = await res.json();
      setInspectItems(data.items.map(i => ({ ...i })));
      setShowInspectModal(id);
    }
  }

  async function handleUpdateItems() {
    setSaving(true); setError('');
    const res = await fetch(`${API}/iqc/${showInspectModal}/items`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ items: inspectItems.map(i => ({ id: i.id, acceptedQty: parseFloat(i.acceptedQty)||0, rejectedQty: parseFloat(i.rejectedQty)||0, rejectionReason: i.rejectionReason })) }),
    });
    const data = await res.json();
    if (res.ok) { setInspectItems(data.items); setError(''); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleApprove() {
    setSaving(true); setError('');
    // Save items first
    await handleUpdateItems();
    const res = await fetch(`${API}/iqc/${showInspectModal}/approve`, {
      method: 'POST', headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();
    if (res.ok) { setShowInspectModal(null); fetchAll(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">IQC — Incoming Quality Control</h1>
            <p className="text-gray-500 text-sm mt-1">Inspect received goods and record accepted / rejected quantities</p>
          </div>
          <button onClick={() => { setCreateForm({ grnId: '', inspectedBy: '', remarks: '' }); setError(''); setShowCreateModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ Start Inspection</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total', value: stats.total, color: 'bg-gray-50' },
              { label: 'In Progress', value: stats.inProgress, color: 'bg-yellow-50' },
              { label: 'Approved', value: stats.approved, color: 'bg-green-50' },
              { label: 'Pending GRNs', value: pendingGrns.length, color: 'bg-orange-50' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {pendingGrns.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
            <div className="text-sm font-semibold text-yellow-800 mb-2">⏳ {pendingGrns.length} GRN(s) waiting for IQC inspection</div>
            <div className="flex flex-wrap gap-2">
              {pendingGrns.map(g => (
                <span key={g.id} className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-mono">{g.grnNumber} — {g.po?.vendor?.name || g.ipo?.vendor?.name}</span>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b flex gap-3">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Search IQC number..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} inspections</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>{['IQC No.', 'GRN', 'Warehouse', 'Inspected By', 'Date', 'Items', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : inspections.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400">No IQC inspections found</td></tr>
                ) : inspections.map(insp => (
                  <tr key={insp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-bold text-blue-600">{insp.iqcNumber}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{insp.grn?.grnNumber}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{insp.grn?.warehouse?.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{insp.inspectedBy || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(insp.inspectionDate || insp.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center text-xs">{insp._count?.items}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[insp.status]}`}>{insp.status?.replace(/_/g,' ')}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleView(insp.id)} className="text-gray-600 hover:underline text-xs">View</button>
                        {insp.status !== 'APPROVED' && (
                          <button onClick={() => handleOpenInspect(insp.id)} className="text-blue-600 hover:underline text-xs">Inspect</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold">Start IQC Inspection</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">GRN (IQC Pending) *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={createForm.grnId} onChange={e => setCreateForm(f => ({ ...f, grnId: e.target.value }))}>
                    <option value="">— Select GRN —</option>
                    {pendingGrns.map(g => <option key={g.id} value={g.id}>{g.grnNumber} — {g.po?.vendor?.name || g.ipo?.vendor?.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Inspected By</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="QC Inspector name" value={createForm.inspectedBy} onChange={e => setCreateForm(f => ({ ...f, inspectedBy: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Remarks</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={createForm.remarks} onChange={e => setCreateForm(f => ({ ...f, remarks: e.target.value }))} />
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Starting...' : 'Start Inspection'}</button>
              </div>
            </div>
          </div>
        )}

        {showInspectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold">IQC Inspection — Enter Results</h2>
                <button onClick={() => setShowInspectModal(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm mb-4">{error}</div>}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <tr>{['Item Code','Item Name','UOM','Received','Accepted Qty','Rejected Qty','Rejection Reason'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y">
                      {inspectItems.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="px-3 py-3 font-mono text-blue-600 text-xs">{item.itemCode}</td>
                          <td className="px-3 py-3 text-xs">{item.itemName}</td>
                          <td className="px-3 py-3 text-xs text-gray-500">{item.uom}</td>
                          <td className="px-3 py-3 font-medium">{item.receivedQty}</td>
                          <td className="px-3 py-3">
                            <input type="number" step="0.01" min="0" max={item.receivedQty}
                              className="w-24 border rounded px-2 py-1 text-sm text-green-700 font-medium"
                              value={item.acceptedQty}
                              onChange={e => { const v = parseFloat(e.target.value)||0; setInspectItems(prev => prev.map((it,i) => i===idx ? {...it, acceptedQty: v, rejectedQty: Math.max(0, it.receivedQty - v)} : it)); }} />
                          </td>
                          <td className="px-3 py-3">
                            <input type="number" step="0.01" min="0" max={item.receivedQty}
                              className="w-24 border rounded px-2 py-1 text-sm text-red-600 font-medium"
                              value={item.rejectedQty}
                              onChange={e => { const v = parseFloat(e.target.value)||0; setInspectItems(prev => prev.map((it,i) => i===idx ? {...it, rejectedQty: v} : it)); }} />
                          </td>
                          <td className="px-3 py-3">
                            <input className="w-full border rounded px-2 py-1 text-xs" placeholder="Reason for rejection..."
                              value={item.rejectionReason || ''}
                              onChange={e => setInspectItems(prev => prev.map((it,i) => i===idx ? {...it, rejectionReason: e.target.value} : it))} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm flex gap-6">
                  <div>Total Received: <strong>{inspectItems.reduce((s,i) => s+(parseFloat(i.receivedQty)||0),0)}</strong></div>
                  <div className="text-green-600">Total Accepted: <strong>{inspectItems.reduce((s,i) => s+(parseFloat(i.acceptedQty)||0),0)}</strong></div>
                  <div className="text-red-500">Total Rejected: <strong>{inspectItems.reduce((s,i) => s+(parseFloat(i.rejectedQty)||0),0)}</strong></div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={() => setShowInspectModal(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleUpdateItems} disabled={saving} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm disabled:opacity-50">Save Draft</button>
                <button onClick={handleApprove} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Approving...' : 'Approve & Close IQC'}</button>
              </div>
            </div>
          </div>
        )}

        {viewDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
                <div>
                  <h2 className="text-lg font-bold">{viewDetail.iqcNumber}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">GRN {viewDetail.grn?.grnNumber} · {viewDetail.grn?.warehouse?.name}</p>
                </div>
                <button onClick={() => setViewDetail(null)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex gap-6 text-sm">
                  <div><span className="text-gray-500">Status:</span> <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[viewDetail.status]}`}>{viewDetail.status?.replace(/_/g,' ')}</span></div>
                  <div><span className="text-gray-500">Inspected By:</span> {viewDetail.inspectedBy || '—'}</div>
                  <div><span className="text-gray-500">Date:</span> {new Date(viewDetail.inspectionDate || viewDetail.createdAt).toLocaleDateString()}</div>
                </div>
                {viewDetail.remarks && <div className="text-sm"><span className="text-gray-500">Remarks:</span> {viewDetail.remarks}</div>}
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>{['Item Code','Item Name','UOM','Received','Accepted','Rejected','Reason'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {(viewDetail.items || []).map(item => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 font-mono text-xs text-blue-600">{item.itemCode}</td>
                        <td className="px-3 py-2 text-xs">{item.itemName}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{item.uom}</td>
                        <td className="px-3 py-2 text-xs">{item.receivedQty}</td>
                        <td className="px-3 py-2 text-xs text-green-600 font-medium">{item.acceptedQty}</td>
                        <td className="px-3 py-2 text-xs text-red-500 font-medium">{item.rejectedQty}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{item.rejectionReason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-3 bg-gray-50 rounded-lg text-sm flex gap-6">
                  <div>Total Received: <strong>{(viewDetail.items || []).reduce((s,i) => s+(i.receivedQty||0),0)}</strong></div>
                  <div className="text-green-600">Total Accepted: <strong>{(viewDetail.items || []).reduce((s,i) => s+(i.acceptedQty||0),0)}</strong></div>
                  <div className="text-red-500">Total Rejected: <strong>{(viewDetail.items || []).reduce((s,i) => s+(i.rejectedQty||0),0)}</strong></div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end sticky bottom-0 bg-white">
                <button onClick={() => setViewDetail(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
